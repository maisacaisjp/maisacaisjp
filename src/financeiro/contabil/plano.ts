// Plano de contas simplificado (ITG 1000, microempresa / EPP) e o mapa que liga
// cada categoria do gestor a uma conta. É isto que deixa a escrituração mapeada:
// todo gasto que entra no gestor sabe se vai para o DRE, para o balanço ou se é só controle.
import { hojeSP, inicioSemana } from './datas';
import type { Contabil, Obrigacao } from '../types';

export type Natureza = 'ativo' | 'passivo' | 'pl' | 'receita' | 'deducao' | 'custo' | 'despesa' | 'controle';
export type GrupoDre = 'deducoes' | 'cmv' | 'vendas' | 'pessoal' | 'ocupacao' | 'admin' | 'manutencao' | 'outras' | 'depreciacao' | 'financeiras';

export interface Conta {
  codigo: string;
  nome: string;
  natureza: Natureza;
  grupo?: GrupoDre;
  calculada?: boolean; // vem de cálculo do sistema, não de lançamento
}

export const PLANO: Conta[] = [
  { codigo: '1.1.01', nome: 'Caixa (dinheiro na loja)', natureza: 'ativo' },
  { codigo: '1.1.02', nome: 'Bancos e conta PIX', natureza: 'ativo' },
  { codigo: '1.1.03', nome: 'Cartões e aplicativos a receber', natureza: 'ativo' },
  { codigo: '1.1.04', nome: 'Estoque de insumos e embalagens', natureza: 'ativo' },
  { codigo: '1.2.01', nome: 'Imobilizado (máquinas, móveis, equipamentos, veículos)', natureza: 'ativo' },
  { codigo: '1.2.02', nome: '(−) Depreciação acumulada', natureza: 'ativo', calculada: true },
  { codigo: '2.1.01', nome: 'Fornecedores a pagar', natureza: 'passivo' },
  { codigo: '2.1.02', nome: 'Salários e encargos a pagar', natureza: 'passivo' },
  { codigo: '2.1.03', nome: 'Impostos a recolher (DAS)', natureza: 'passivo' },
  { codigo: '2.1.04', nome: 'Empréstimos e financiamentos (curto prazo)', natureza: 'passivo' },
  { codigo: '2.1.05', nome: 'Outras contas a pagar', natureza: 'passivo' },
  { codigo: '2.2.01', nome: 'Empréstimos e financiamentos (longo prazo)', natureza: 'passivo' },
  { codigo: '2.3.01', nome: 'Capital social', natureza: 'pl' },
  { codigo: '2.3.02', nome: 'Lucros ou prejuízos acumulados', natureza: 'pl', calculada: true },
  { codigo: '2.3.03', nome: '(−) Retiradas e distribuição de lucros', natureza: 'pl' },
  { codigo: '3.1.01', nome: 'Vendas de produtos (balcão, delivery, retirada)', natureza: 'receita', calculada: true },
  { codigo: '4.1.01', nome: 'Simples Nacional / DAS sobre vendas', natureza: 'deducao', grupo: 'deducoes', calculada: true },
  { codigo: '5.1.01', nome: 'CMV: insumos e embalagens consumidos', natureza: 'custo', grupo: 'cmv', calculada: true },
  { codigo: '6.1.01', nome: 'Taxas de cartão e aplicativos', natureza: 'despesa', grupo: 'vendas' },
  { codigo: '6.1.02', nome: 'Entregas (motoboy, combustível)', natureza: 'despesa', grupo: 'vendas' },
  { codigo: '6.1.03', nome: 'Marketing e anúncios', natureza: 'despesa', grupo: 'vendas' },
  { codigo: '6.2.01', nome: 'Salários, diárias e freelancers', natureza: 'despesa', grupo: 'pessoal' },
  { codigo: '6.2.02', nome: 'Encargos (INSS, FGTS, 13º, férias)', natureza: 'despesa', grupo: 'pessoal' },
  { codigo: '6.2.03', nome: 'Pró-labore', natureza: 'despesa', grupo: 'pessoal' },
  { codigo: '6.3.01', nome: 'Aluguel e condomínio', natureza: 'despesa', grupo: 'ocupacao' },
  { codigo: '6.3.02', nome: 'Energia, água, gás e internet', natureza: 'despesa', grupo: 'ocupacao' },
  { codigo: '6.4.01', nome: 'Contador, sistemas e serviços', natureza: 'despesa', grupo: 'admin' },
  { codigo: '6.4.02', nome: 'Taxas, alvarás e licenças', natureza: 'despesa', grupo: 'admin' },
  { codigo: '6.4.03', nome: 'Limpeza e material de uso', natureza: 'despesa', grupo: 'admin' },
  { codigo: '6.5.01', nome: 'Manutenção e reparos', natureza: 'despesa', grupo: 'manutencao' },
  { codigo: '6.6.01', nome: 'Depreciação', natureza: 'despesa', grupo: 'depreciacao', calculada: true },
  { codigo: '6.7.01', nome: 'Juros e tarifas bancárias', natureza: 'despesa', grupo: 'financeiras' },
  { codigo: '6.9.01', nome: 'Outras despesas', natureza: 'despesa', grupo: 'outras' },
  { codigo: '9.0.01', nome: 'Pagamento de custo fixo já cadastrado (só controle)', natureza: 'controle' },
];

export const CONTA = new Map(PLANO.map((c) => [c.codigo, c]));
export const nomeConta = (codigo: string) => CONTA.get(codigo)?.nome ?? codigo;

// Contas em que um gasto pode ser classificado (as calculadas vêm do sistema)
export const CONTAS_GASTO = PLANO.filter((c) => !c.calculada && c.natureza !== 'receita' && c.codigo !== '2.3.01');
export const CONTAS_FIXO = PLANO.filter((c) => !c.calculada && c.natureza === 'despesa');

export const NATUREZA_ROTULO: Record<Natureza, string> = {
  ativo: 'Ativo', passivo: 'Passivo', pl: 'Patrimônio líquido', receita: 'Receita', deducao: 'Dedução da receita',
  custo: 'Custo', despesa: 'Despesa', controle: 'Só controle',
};

export const GRUPO_ROTULO: Record<GrupoDre, string> = {
  deducoes: 'Impostos sobre vendas', cmv: 'CMV', vendas: 'Despesas com vendas', pessoal: 'Pessoal', ocupacao: 'Ocupação',
  admin: 'Administrativas', manutencao: 'Manutenção', outras: 'Outras despesas', depreciacao: 'Depreciação', financeiras: 'Despesas financeiras',
};

// Categorias padrão da aba Despesas do caixa (ExpensesManager)
export const CATEGORIAS_DESPESA_CAIXA = [
  'Fornecedores & Insumos', 'Salários & Equipe', 'Água, Luz, Gás & Net', 'Aluguel / Renda', 'Embalagens & Descartáveis',
  'Marketing & Anúncios', 'Manutenção & Equipamentos', 'Impostos & Taxas', 'Outros Gastos',
];

// Mapa padrão. Pagamentos de custo fixo e compras de insumo ficam fora do resultado
// porque já entram pelo cadastro de custos fixos e pelo CMV das fichas.
export const MAPA_PADRAO: Record<string, string> = {
  'lanc:Compra de insumos': '1.1.04',
  'lanc:Embalagens': '1.1.04',
  'lanc:Pagamento de custo fixo': '9.0.01',
  'lanc:Manutenção': '6.5.01',
  'lanc:Impostos e taxas': '6.4.02',
  'lanc:Pagamento do DAS': '2.1.03',
  'lanc:Juros e tarifas bancárias': '6.7.01',
  'lanc:Marketing extra': '6.1.03',
  'lanc:Outras despesas': '6.9.01',
  'lanc:Equipamentos / investimento': '1.2.01',
  'lanc:Retirada do sócio': '2.3.03',
  'desp:Fornecedores & Insumos': '1.1.04',
  'desp:Salários & Equipe': '9.0.01',
  'desp:Água, Luz, Gás & Net': '9.0.01',
  'desp:Aluguel / Renda': '9.0.01',
  'desp:Embalagens & Descartáveis': '1.1.04',
  'desp:Marketing & Anúncios': '6.1.03',
  'desp:Manutenção & Equipamentos': '6.5.01',
  'desp:Impostos & Taxas': '2.1.03',
  'desp:Outros Gastos': '6.9.01',
  'fixo:Pessoal': '6.2.01',
  'fixo:Aluguel e ocupação': '6.3.01',
  'fixo:Energia, água e internet': '6.3.02',
  'fixo:Veículos e entregas': '6.1.02',
  'fixo:Serviços e sistemas': '6.4.01',
  'fixo:Marketing': '6.1.03',
  'fixo:Limpeza': '6.4.03',
  'fixo:Outros': '6.9.01',
};

export function contaDe(c: Contabil, tipo: 'lanc' | 'desp' | 'fixo', categoria: string): string {
  const chave = `${tipo}:${categoria}`;
  return c.mapa[chave] ?? MAPA_PADRAO[chave] ?? '6.9.01';
}

export const CATEGORIAS_BEM: Array<{ nome: string; vida: number }> = [
  { nome: 'Máquinas e equipamentos', vida: 10 },
  { nome: 'Freezers e refrigeração', vida: 10 },
  { nome: 'Móveis e utensílios', vida: 10 },
  { nome: 'Computadores e periféricos', vida: 5 },
  { nome: 'Veículos e motos', vida: 5 },
  { nome: 'Instalações e reformas', vida: 10 },
];

// Agenda padrão. Datas conforme a legislação vigente em 2026; o contador pode ajustar na tela.
export const OBRIGACOES_PADRAO: Obrigacao[] = [
  { id: 'ficha-semanal', nome: 'Ficha semanal: lançar compras, notas e despesas da semana', descricao: 'Confira se toda compra e despesa da semana passada está em Lançamentos ou na aba Despesas.', frequencia: 'semanal', dia: 1, antecedencia: 0, responsavel: 'loja', ativo: true, destino: 'lancamentos' },
  { id: 'dre-semanal', nome: 'Fechar e revisar o DRE da semana', descricao: 'Abra o DRE semanal, compare com as semanas anteriores e anote o que fugiu do normal.', frequencia: 'semanal', dia: 1, antecedencia: 0, responsavel: 'loja', ativo: true, destino: 'dre' },
  { id: 'conciliacao', nome: 'Conciliação bancária e de cartões do mês', descricao: 'Bata o extrato do banco e da maquininha com as vendas e os lançamentos.', frequencia: 'mensal', dia: 5, ajuste: 'posterga', antecedencia: 2, responsavel: 'loja', ativo: true },
  { id: 'docs-contador', nome: 'Enviar documentos do mês ao contador', descricao: 'Notas de compra, extratos, comprovantes de despesas e folha.', frequencia: 'mensal', dia: 5, ajuste: 'posterga', antecedencia: 2, responsavel: 'loja', ativo: true, destino: 'escrituracao' },
  { id: 'salarios', nome: 'Pagar salários', descricao: 'Até o 5º dia útil do mês.', frequencia: 'mensal', dia: 5, diaUtil: true, antecedencia: 2, responsavel: 'loja', condicao: 'funcionarios', ativo: true },
  { id: 'fechamento-mes', nome: 'Fechar o mês: DRE mensal e revisão das fichas', descricao: 'Confira o resultado do mês no Painel e os custos fixos a confirmar.', frequencia: 'mensal', dia: 10, ajuste: 'posterga', antecedencia: 2, responsavel: 'loja', ativo: true },
  { id: 'esocial', nome: 'eSocial e DCTFWeb da folha', descricao: 'Envio dos eventos da folha do mês anterior.', frequencia: 'mensal', dia: 15, ajuste: 'antecipa', antecedencia: 3, responsavel: 'contador', condicao: 'funcionarios', ativo: true },
  { id: 'pgdas', nome: 'PGDAS-D: apurar e declarar o Simples do mês anterior', frequencia: 'mensal', dia: 20, ajuste: 'antecipa', antecedencia: 5, responsavel: 'contador', condicao: 'simples', ativo: true, destino: 'impostos' },
  { id: 'das', nome: 'Pagar o DAS do Simples Nacional', descricao: 'Lance o pagamento em Lançamentos → "Pagamento do DAS".', frequencia: 'mensal', dia: 20, ajuste: 'antecipa', antecedencia: 3, responsavel: 'loja', condicao: 'simples', ativo: true, destino: 'impostos' },
  { id: 'das-mei', nome: 'Pagar o DAS-MEI', frequencia: 'mensal', dia: 20, ajuste: 'antecipa', antecedencia: 3, responsavel: 'loja', condicao: 'mei', ativo: true, destino: 'impostos' },
  { id: 'fgts', nome: 'Recolher FGTS (FGTS Digital)', frequencia: 'mensal', dia: 20, ajuste: 'antecipa', antecedencia: 3, responsavel: 'loja', condicao: 'funcionarios', ativo: true },
  { id: 'inss', nome: 'Recolher INSS da folha (DARF da DCTFWeb)', frequencia: 'mensal', dia: 20, ajuste: 'antecipa', antecedencia: 3, responsavel: 'loja', condicao: 'funcionarios', ativo: true },
  { id: 'inventario-mes', nome: 'Contagem de estoque do fim do mês', descricao: 'Conte açaí, polpas, complementos e embalagens. O valor vai para o balanço.', frequencia: 'mensal', dia: 31, antecedencia: 1, responsavel: 'loja', ativo: true },
  { id: 'informe-rend', nome: 'Entregar informe de rendimentos aos funcionários', frequencia: 'anual', mes: 2, dia: 28, ajuste: 'antecipa', antecedencia: 15, responsavel: 'contador', condicao: 'funcionarios', ativo: true },
  { id: 'enviar-balanco', nome: 'Enviar balanço e DRE do ano ao contador', frequencia: 'anual', mes: 2, dia: 15, ajuste: 'posterga', antecedencia: 15, responsavel: 'loja', ativo: true, destino: 'balanco' },
  { id: 'defis', nome: 'DEFIS: declaração anual do Simples Nacional', frequencia: 'anual', mes: 3, dia: 31, ajuste: 'antecipa', antecedencia: 20, responsavel: 'contador', condicao: 'simples', ativo: true },
  { id: 'dasn-simei', nome: 'DASN-SIMEI: declaração anual do MEI', frequencia: 'anual', mes: 5, dia: 31, ajuste: 'antecipa', antecedencia: 20, responsavel: 'loja', condicao: 'mei', ativo: true },
  { id: 'irpf', nome: 'IRPF do sócio (pró-labore e lucros distribuídos)', descricao: 'Confira a data exata do ano na Receita Federal.', frequencia: 'anual', mes: 5, dia: 29, ajuste: 'antecipa', antecedencia: 20, responsavel: 'contador', ativo: true },
  { id: 'decimo-1', nome: '13º salário: 1ª parcela', frequencia: 'anual', mes: 11, dia: 30, ajuste: 'antecipa', antecedencia: 10, responsavel: 'loja', condicao: 'funcionarios', ativo: true },
  { id: 'decimo-2', nome: '13º salário: 2ª parcela', frequencia: 'anual', mes: 12, dia: 20, ajuste: 'antecipa', antecedencia: 10, responsavel: 'loja', condicao: 'funcionarios', ativo: true },
  { id: 'inventario-ano', nome: 'Inventário de 31/12 e fechamento do balanço anual', descricao: 'Contagem de estoque, saldo de caixa e bancos, contas a pagar e a receber em 31/12.', frequencia: 'anual', mes: 12, dia: 31, antecedencia: 7, responsavel: 'loja', ativo: true, destino: 'balanco' },
  { id: 'alvara', nome: 'Renovar alvará e licença sanitária', descricao: 'Ajuste a data conforme o vencimento do seu alvará.', frequencia: 'anual', mes: 1, dia: 31, antecedencia: 30, responsavel: 'loja', ativo: true },
];

export function contabilInicial(): Contabil {
  return {
    imposto: { regime: 'simples', aliquotaManual: null, dasMei: 82.05 },
    temFuncionarios: true,
    bens: [],
    obrigacoes: OBRIGACOES_PADRAO.map((o) => ({ ...o })),
    concluidas: {},
    mapa: {},
    balancos: {},
    inicioAgenda: inicioSemana(hojeSP()), // já cobra as fichas desta semana
  };
}

export function migrarContabil(bruto: unknown): Contabil {
  const ini = contabilInicial();
  const c = (bruto ?? {}) as Partial<Contabil>;
  const salvas = Array.isArray(c.obrigacoes) ? c.obrigacoes : [];
  const ids = new Set(salvas.map((o) => o.id));
  return {
    imposto: { ...ini.imposto, ...(c.imposto ?? {}) },
    temFuncionarios: typeof c.temFuncionarios === 'boolean' ? c.temFuncionarios : ini.temFuncionarios,
    bens: Array.isArray(c.bens) ? c.bens : [],
    // Obrigações novas da agenda padrão aparecem para quem já tinha a lista salva
    obrigacoes: [...salvas, ...ini.obrigacoes.filter((o) => !ids.has(o.id))],
    concluidas: c.concluidas && typeof c.concluidas === 'object' ? c.concluidas : {},
    mapa: c.mapa && typeof c.mapa === 'object' ? c.mapa : {},
    balancos: c.balancos && typeof c.balancos === 'object' ? c.balancos : {},
    inicioAgenda: typeof c.inicioAgenda === 'string' ? c.inicioAgenda : ini.inicioAgenda,
  };
}
