// Visão gerencial (margem de contribuição) do mês, montada a partir do DRE contábil
// para que o Painel e a aba Contábil mostrem sempre o mesmo resultado.
import type { DreContabil } from './contabil/dreContabil';

export interface Dre {
  faturamento: number;
  impostos: number;
  cobertura: number; // fração da receita de itens que tem ficha
  cmvPct: number; // CMV / receita, medido nos itens com ficha
  cmvEstimado: number; // CMV% aplicado a toda a receita de itens
  taxas: number;
  entregas: number;
  margemContribuicao: number;
  fixos: number;
  outrasDespesas: number; // lançamentos e despesas do caixa que entram no resultado
  depreciacao: number;
  resultado: number;
  pontoEquilibrio: number; // faturamento necessário para resultado 0
  comprasInsumos: number;
}

export function calcularDre(dc: DreContabil): Dre {
  const itens = Object.values(dc.grupos).flatMap((g) => g.itens);
  const soma = (f: (i: (typeof itens)[number]) => boolean) => itens.filter(f).reduce((s, i) => s + i.valor, 0);
  const taxas = soma((i) => i.origem === 'Parâmetro' && i.conta === '6.1.01');
  const entregas = soma((i) => i.origem === 'Parâmetro' && i.conta === '6.1.02');
  const fixos = soma((i) => i.origem === 'Custo fixo');
  const depreciacao = dc.grupos.depreciacao.total;
  const outrasDespesas = soma((i) => i.origem === 'Lançamento' || i.origem === 'Despesa do caixa');
  const margemContribuicao = dc.receita - dc.impostos - dc.cmv - taxas - entregas;
  const mcPct = dc.receita ? margemContribuicao / dc.receita : 0;
  return {
    faturamento: dc.receita,
    impostos: dc.impostos,
    cobertura: dc.cobertura,
    cmvPct: dc.cmvPct,
    cmvEstimado: dc.cmv,
    taxas,
    entregas,
    margemContribuicao,
    fixos,
    outrasDespesas,
    depreciacao,
    resultado: dc.resultado,
    pontoEquilibrio: mcPct > 0 ? (fixos + outrasDespesas + depreciacao) / mcPct : NaN,
    comprasInsumos: dc.compras,
  };
}
