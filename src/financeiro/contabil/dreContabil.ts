// DRE contábil de qualquer período (semana, mês, ano), no regime de competência.
//
// Receita bruta (pedidos do gestor)
// (−) Impostos sobre vendas (Simples/DAS calculado)            = Receita líquida
// (−) CMV (fichas técnicas × vendas)                           = Lucro bruto
// (−) Despesas com vendas, pessoal, ocupação, administrativas,
//     manutenção e outras (custos fixos proporcionais aos dias
//     + lançamentos + despesas do caixa, conforme o plano)     = Resultado operacional (EBITDA)
// (−) Depreciação e despesas financeiras                       = Lucro líquido
import { contaDe, CONTA, type GrupoDre } from './plano';
import { diaSP, diasNoMes, hojeSP, listaDias } from './datas';
import { impostoPeriodo, type ApuracaoMes, type FatMes } from './impostos';
import { depreciacaoPeriodo } from './imobilizado';
import type { Dados, DespesaCaixa } from '../types';
import type { ResumoVendas } from '../vendas';

export interface ItemDre {
  origem: 'Parâmetro' | 'Custo fixo' | 'Lançamento' | 'Despesa do caixa' | 'Imobilizado';
  nome: string;
  valor: number;
  conta: string;
}

export const GRUPOS_OPERACIONAIS: GrupoDre[] = ['vendas', 'pessoal', 'ocupacao', 'admin', 'manutencao', 'outras'];
export const GRUPOS_ABAIXO: GrupoDre[] = ['depreciacao', 'financeiras'];

export interface DreContabil {
  de: string;
  ate: string; // exclusivo
  dias: number;
  pedidos: number;
  receita: number;
  receitaHistorico: number; // meses sem pedidos no sistema, vindos do histórico
  impostos: number;
  apuracoes: ApuracaoMes[];
  receitaLiquida: number;
  cmv: number;
  cmvPct: number;
  cobertura: number;
  lucroBruto: number;
  grupos: Record<GrupoDre, { total: number; itens: ItemDre[] }>;
  despesasOperacionais: number;
  ebitda: number;
  resultado: number;
  // Fora do resultado (balanço / controle)
  compras: number;
  investimentos: number;
  retiradas: number;
  pagamentosDas: number;
  controleFixos: number;
}

const vazioGrupos = () =>
  Object.fromEntries((['deducoes', 'cmv', ...GRUPOS_OPERACIONAIS, ...GRUPOS_ABAIXO] as GrupoDre[]).map((g) => [g, { total: 0, itens: [] as ItemDre[] }])) as DreContabil['grupos'];

export interface EntradaDre {
  de: string;
  ate: string;
  resumo: ResumoVendas;
  despesas: DespesaCaixa[];
  dados: Dados;
  fat: FatMes;
  receitaHistorico?: Record<string, number>; // por mês
}

export function calcularDreContabil({ de, ate, resumo, despesas, dados, fat, receitaHistorico = {} }: EntradaDre): DreContabil {
  const c = dados.contabil;
  const cfg = dados.config;
  // Dias futuros não geram custo fixo, depreciação nem DAS-MEI (semana ou ano em andamento)
  const hoje = hojeSP();
  const dias = listaDias(de, ate).filter((d) => d <= hoje);
  const grupos = vazioGrupos();
  const add = (conta: string, item: Omit<ItemDre, 'conta'>) => {
    const g = CONTA.get(conta)?.grupo;
    if (!g || item.valor === 0) return false;
    grupos[g].total += item.valor;
    grupos[g].itens.push({ ...item, conta });
    return true;
  };

  const extraHist = Object.values(receitaHistorico).reduce((s, v) => s + v, 0);
  const receita = resumo.faturamento + extraHist;

  // Impostos sobre vendas
  const imp = impostoPeriodo(resumo.porDia, dias, c.imposto, fat, receitaHistorico);
  grupos.deducoes.total = imp.total;

  // CMV: % medido nas vendas com ficha, aplicado a toda a receita de itens; no histórico, usa o mesmo % (ou a meta)
  const cobertura = resumo.receitaItens ? resumo.receitaComFicha / resumo.receitaItens : 0;
  const cmvPctMedido = resumo.receitaComFicha ? resumo.custoComFicha / resumo.receitaComFicha : 0;
  const cmvPctRef = cmvPctMedido || cfg.cmvMeta / 100;
  const cmv = cmvPctMedido * resumo.receitaItens + cmvPctRef * extraHist;
  grupos.cmv.total = cmv;

  // Parâmetros variáveis
  add('6.1.01', { origem: 'Parâmetro', nome: `Taxas de pagamento (${cfg.taxaPagamento}% do faturamento)`, valor: (receita * cfg.taxaPagamento) / 100 });
  add('6.1.02', { origem: 'Parâmetro', nome: `Custo por entrega (${resumo.entregas} × R$ ${cfg.custoPorEntrega.toFixed(2).replace('.', ',')})`, valor: resumo.entregas * cfg.custoPorEntrega });

  // Custos fixos: valor mensal proporcional aos dias do período
  const fracaoMeses = dias.reduce((s, d) => s + 1 / diasNoMes(d.slice(0, 7)), 0);
  for (const cf of dados.custosFixos.filter((x) => x.ativo)) {
    add(contaDe(c, 'fixo', cf.categoria), { origem: 'Custo fixo', nome: cf.nome, valor: cf.valor * fracaoMeses });
  }

  // Lançamentos e despesas do caixa, conforme o mapa de contas
  let compras = 0, investimentos = 0, retiradas = 0, pagamentosDas = 0, controleFixos = 0;
  const foraDoResultado = (conta: string, v: number) => {
    if (conta === '1.1.04') compras += v;
    else if (conta === '1.2.01') investimentos += v;
    else if (conta === '2.3.03') retiradas += v;
    else if (conta === '2.1.03') pagamentosDas += v;
    else if (conta === '9.0.01') controleFixos += v;
  };
  for (const l of dados.lancamentos) {
    if (l.data < de || l.data >= ate) continue;
    const conta = contaDe(c, 'lanc', l.categoria);
    if (!add(conta, { origem: 'Lançamento', nome: `${l.descricao} (${l.categoria})`, valor: l.valor })) foraDoResultado(conta, l.valor);
  }
  for (const e of despesas) {
    const dia = diaSP(e.created_at);
    if (dia < de || dia >= ate) continue;
    const v = Number(e.amount) || 0;
    const conta = contaDe(c, 'desp', e.category || 'Outros Gastos');
    if (!add(conta, { origem: 'Despesa do caixa', nome: `${e.description} (${e.category})`, valor: v })) foraDoResultado(conta, v);
  }

  // Depreciação do imobilizado
  for (const it of depreciacaoPeriodo(c.bens, dias)) add('6.6.01', { origem: 'Imobilizado', nome: it.nome, valor: it.valor });

  for (const g of Object.values(grupos)) g.itens.sort((a, b) => b.valor - a.valor);

  const receitaLiquida = receita - imp.total;
  const lucroBruto = receitaLiquida - cmv;
  const despesasOperacionais = GRUPOS_OPERACIONAIS.reduce((s, g) => s + grupos[g].total, 0);
  const ebitda = lucroBruto - despesasOperacionais;
  const resultado = ebitda - GRUPOS_ABAIXO.reduce((s, g) => s + grupos[g].total, 0);

  return {
    de, ate, dias: dias.length, pedidos: resumo.pedidos, receita, receitaHistorico: extraHist,
    impostos: imp.total, apuracoes: imp.apuracoes, receitaLiquida,
    cmv, cmvPct: cmvPctMedido, cobertura, lucroBruto,
    grupos, despesasOperacionais, ebitda, resultado,
    compras, investimentos, retiradas, pagamentosDas, controleFixos,
  };
}

// Linhas para exibir/exportar o DRE
export interface LinhaDre {
  id: string;
  rotulo: string;
  tipo: 'receita' | 'menos' | 'total' | 'resultado';
  valor: (d: DreContabil) => number;
  grupo?: GrupoDre;
}

export const LINHAS_DRE: LinhaDre[] = [
  { id: 'receita', rotulo: 'Receita bruta de vendas', tipo: 'receita', valor: (d) => d.receita },
  { id: 'impostos', rotulo: 'Impostos sobre vendas (Simples/DAS)', tipo: 'menos', valor: (d) => d.impostos, grupo: 'deducoes' },
  { id: 'rl', rotulo: 'Receita líquida', tipo: 'total', valor: (d) => d.receitaLiquida },
  { id: 'cmv', rotulo: 'CMV (insumos e embalagens)', tipo: 'menos', valor: (d) => d.cmv, grupo: 'cmv' },
  { id: 'lb', rotulo: 'Lucro bruto', tipo: 'total', valor: (d) => d.lucroBruto },
  { id: 'vendas', rotulo: 'Despesas com vendas', tipo: 'menos', valor: (d) => d.grupos.vendas.total, grupo: 'vendas' },
  { id: 'pessoal', rotulo: 'Pessoal', tipo: 'menos', valor: (d) => d.grupos.pessoal.total, grupo: 'pessoal' },
  { id: 'ocupacao', rotulo: 'Ocupação (aluguel, energia, água)', tipo: 'menos', valor: (d) => d.grupos.ocupacao.total, grupo: 'ocupacao' },
  { id: 'admin', rotulo: 'Administrativas', tipo: 'menos', valor: (d) => d.grupos.admin.total, grupo: 'admin' },
  { id: 'manutencao', rotulo: 'Manutenção', tipo: 'menos', valor: (d) => d.grupos.manutencao.total, grupo: 'manutencao' },
  { id: 'outras', rotulo: 'Outras despesas', tipo: 'menos', valor: (d) => d.grupos.outras.total, grupo: 'outras' },
  { id: 'ebitda', rotulo: 'Resultado operacional (EBITDA)', tipo: 'total', valor: (d) => d.ebitda },
  { id: 'depreciacao', rotulo: 'Depreciação', tipo: 'menos', valor: (d) => d.grupos.depreciacao.total, grupo: 'depreciacao' },
  { id: 'financeiras', rotulo: 'Despesas financeiras', tipo: 'menos', valor: (d) => d.grupos.financeiras.total, grupo: 'financeiras' },
  { id: 'resultado', rotulo: 'Lucro líquido do período', tipo: 'resultado', valor: (d) => d.resultado },
];

export function baixarCsv(nome: string, linhas: Array<Array<string | number>>) {
  const fmt = (v: string | number) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${v.replace(/"/g, '""')}"`);
  const texto = '﻿' + linhas.map((l) => l.map(fmt).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}
