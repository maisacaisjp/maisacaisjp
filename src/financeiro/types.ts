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
  recheio: ItemReceita[]; // complementos (no copo, quantidades do G)
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
}
