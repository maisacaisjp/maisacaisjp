export type Unidade = 'g' | 'ml' | 'un';
// P = copo 330ml, M = 440ml, G = 550ml, U = tamanho único (copos avulsos, kits, milkshakes, bebidas, adicionais)
export type Tamanho = 'P' | 'M' | 'G' | 'U';

export interface Insumo {
  id: string;
  nome: string;
  categoria: string;
  unidade: Unidade;
  qtdEmbalagem: number; // quanto vem na embalagem, na unidade do insumo
  precoEmbalagem: number; // R$ pagos pela embalagem
  perda: number; // % perdida no preparo
  semCusto?: boolean; // ex.: água, não conta como pendência
  fornecedor?: string;
  obs?: string;
  atualizadoEm?: string;
}

// Linha de receita: usa um insumo ou um preparo.
// qtd = quantidade base no copo P (330ml) ou quantidade única; qtdM/qtdG/qtdP = valor manual, null = calculado pelo fator.
export interface ItemReceita {
  id: string;
  tipo: 'insumo' | 'preparo';
  refId: string;
  qtd: number;
  qtdP?: number | null;
  qtdM?: number | null;
  qtdG?: number | null;
}

export interface Preparo {
  id: string;
  nome: string;
  itens: ItemReceita[];
  rendimento: number; // gramas (ou ml) prontos que a receita rende
  obs?: string;
}

// O que todo copo daquele tamanho leva: copo, tampa, colher, açaí base
export interface Base {
  id: string;
  nome: string;
  itens: ItemReceita[];
  obs?: string;
}

export interface Ficha {
  id: string;
  nome: string;
  produtoId?: string; // id do menu_items, ou "extra:<id>" para adicionais
  categoria: string;
  tipo: 'copo' | 'unico' | 'adicional';
  baseIds: Partial<Record<Tamanho, string>>;
  recheio: ItemReceita[]; // complementos (no copo, qtd = 330ml; qtdM/qtdG = 440/550 quando pesados)
  precos: Partial<Record<Tamanho, number>>;
  obs?: string;
}

export interface CustoFixo {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  ativo: boolean;
  aConfirmar?: boolean;
  obs?: string;
}

export interface Lancamento {
  id: string;
  data: string; // yyyy-mm-dd
  descricao: string;
  categoria: string;
  valor: number;
  pagamento: string;
  fornecedor?: string;
}

// Faturamento de meses anteriores ao sistema (histórico dos últimos anos)
export interface FaturamentoMes {
  mes: string; // yyyy-mm
  faturamento: number;
  pedidos?: number | null;
  obs?: string;
}

export interface Config {
  fatorP: number;
  fatorM: number;
  fatorG: number;
  fator770: number;
  fator1L: number;
  cmvMeta: number; // %
  taxaPagamento: number; // % sobre o faturamento
  custoPorEntrega: number; // R$ variável por entrega
  diasTrabalhados: number;
}

// ─── Contábil ────────────────────────────────────────────────────────────────
export type Regime = 'simples' | 'mei' | 'manual';

export interface ConfigImposto {
  regime: Regime;
  aliquotaManual: number | null; // %; no Simples, se preenchida substitui a calculada pela RBT12
  dasMei: number; // R$ por mês (MEI)
}

// Bem do imobilizado (máquina de açaí, freezer, balcão, moto...)
export interface Bem {
  id: string;
  nome: string;
  categoria: string;
  dataAquisicao: string; // yyyy-mm-dd
  valor: number;
  vidaUtilAnos: number;
  baixadoEm?: string; // vendido ou descartado
  lancamentoId?: string; // lançamento de origem (Equipamentos / investimento)
  obs?: string;
}

export type Frequencia = 'semanal' | 'mensal' | 'anual';

export interface Obrigacao {
  id: string;
  nome: string;
  descricao?: string;
  frequencia: Frequencia;
  dia: number; // semanal: 1 = segunda ... 7 = domingo; mensal/anual: dia do mês (ou n-ésimo dia útil)
  mes?: number; // anual
  diaUtil?: boolean; // mensal: "5º dia útil"
  ajuste?: 'antecipa' | 'posterga'; // vencimento no fim de semana
  antecedencia: number; // dias de aviso antes do vencimento
  responsavel: 'loja' | 'contador';
  condicao?: 'simples' | 'mei' | 'funcionarios';
  ativo: boolean;
  destino?: SecaoContabil | 'lancamentos';
  personalizada?: boolean;
}

export type SecaoContabil = 'dre' | 'balanco' | 'impostos' | 'obrigacoes' | 'imobilizado' | 'escrituracao';

export interface BalancoAno {
  caixa: number;
  bancos: number;
  cartoesReceber: number;
  estoque: number;
  outrosAtivos: number;
  fornecedores: number;
  salariosPagar: number;
  impostosRecolher: number;
  emprestimosCP: number;
  outrasContasPagar: number;
  emprestimosLP: number;
  capitalSocial: number;
  lucrosAnteriores: number | null; // null = usa o fechamento do ano anterior
  resultadoManual: number | null; // null = usa o DRE anual calculado
  retiradasManual: number | null; // null = soma das retiradas lançadas
  obs?: string;
  fechadoEm?: string;
  lucrosFinais?: number; // gravado ao fechar: vira o saldo inicial do ano seguinte
}

export interface Contabil {
  imposto: ConfigImposto;
  temFuncionarios: boolean;
  bens: Bem[];
  obrigacoes: Obrigacao[];
  concluidas: Record<string, string>; // "<obrigacao>|<período>" → data em que foi feita
  mapa: Record<string, string>; // "lanc:<cat>" | "desp:<cat>" | "fixo:<cat>" → código da conta
  balancos: Record<string, BalancoAno>; // por ano
  inicioAgenda: string; // yyyy-mm-dd: vencimentos anteriores não são cobrados
}

export interface Dados {
  versao: 1;
  insumos: Insumo[];
  preparos: Preparo[];
  bases: Base[];
  fichas: Ficha[];
  custosFixos: CustoFixo[];
  lancamentos: Lancamento[];
  historico: FaturamentoMes[];
  config: Config;
  contabil: Contabil;
}

// Gasto registrado na aba Despesas do gestor (tabela expenses)
export interface DespesaCaixa {
  id: number | string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  created_at: string;
}

// Somente leitura, vindo do gestor
export interface ProdutoCardapio {
  id: string;
  name: string;
  category: string;
  price_single: number | null;
  price_p: number | null;
  price_m: number | null;
  price_g: number | null;
  is_active: boolean | null;
}

export interface AdicionalCardapio {
  id: string;
  name: string;
  price: number;
  is_active: boolean | null;
}

export interface ItemPedido {
  id?: string; // o PDV grava o id do produto
  name: string;
  category?: string;
  quantity: number;
  priceCalculated?: number;
  basePrice?: number;
  extras?: Array<{ id?: string; name?: string; price?: number }>;
}

export interface Pedido {
  id: number;
  status: string;
  order_type: string;
  total_amount: number;
  created_at: string;
  items: ItemPedido[] | null;
  motoboy_fee?: number | null; // valor pago ao entregador parceiro (lançado no pedido)
}
