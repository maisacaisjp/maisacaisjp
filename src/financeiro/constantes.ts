import type { Config, Dados } from './types';

export const CATEGORIAS_INSUMO = ['Açaí e polpas', 'Frutas', 'Cremes e mousses', 'Complementos', 'Caldas e coberturas', 'Laticínios', 'Bebidas', 'Embalagens', 'Outros'];

export const CATEGORIAS_FIXO = ['Pessoal', 'Aluguel e ocupação', 'Energia, água e internet', 'Veículos e entregas', 'Serviços e sistemas', 'Marketing', 'Limpeza', 'Outros'];

// Categorias que NÃO entram como "outras despesas" no resultado, para não contar duas vezes:
// insumos/embalagens já estão no CMV das fichas; custo fixo já vem do cadastro; retirada e investimento não são despesa do mês.
export const CATEGORIAS_LANC: Array<{ nome: string; noResultado: boolean; dica: string }> = [
  { nome: 'Compra de insumos', noResultado: false, dica: 'Já está no CMV pelas fichas. Serve para comparar compra real × consumo teórico.' },
  { nome: 'Embalagens', noResultado: false, dica: 'Já está no CMV pelas fichas (copos, tampas, colheres, potes).' },
  { nome: 'Pagamento de custo fixo', noResultado: false, dica: 'Já conta pelo cadastro de custos fixos. Lance para controlar o que foi pago.' },
  { nome: 'Manutenção', noResultado: true, dica: 'Entra no resultado do mês.' },
  { nome: 'Impostos e taxas', noResultado: true, dica: 'Entra no resultado do mês (DAS, alvarás, taxas).' },
  { nome: 'Marketing extra', noResultado: true, dica: 'Entra no resultado do mês (impulsionamento, panfletos).' },
  { nome: 'Outras despesas', noResultado: true, dica: 'Entra no resultado do mês.' },
  { nome: 'Equipamentos / investimento', noResultado: false, dica: 'Investimento: não entra no resultado do mês.' },
  { nome: 'Retirada do sócio', noResultado: false, dica: 'Não é despesa da açaiteria: fica só no controle de caixa.' },
];

export const PAGAMENTOS = ['PIX', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'];

export const CONFIG_PADRAO: Config = {
  // Proporção das fichas técnicas pesadas no Multipedidos (04/11/2026): 100 g no 330ml vira 120 / 140 / 160 g e 200 g no pote.
  // Chocolates por unidade (Kit Kat, Bis, Kinder, Bueno, Sonho de Valsa, Ouro Branco) não mudam com o tamanho.
  fatorP: 1, // 330ml = porção base (100%)
  fatorM: 1.2, // 440ml = +20%
  fatorG: 1.4, // 550ml = +40%
  fator770: 1.6, // 770ml = +60%
  fator1L: 2, // Pote Recheado 1L = o dobro do 330ml
  cmvMeta: 32,
  taxaPagamento: 2,
  custoPorEntrega: 0.66,
  diasTrabalhados: 30,
};

// Começa vazio: só as três bases de copo, para as fichas de combo já se ligarem a elas.
export function dadosIniciais(): Dados {
  return {
    versao: 1,
    insumos: [],
    preparos: [],
    bases: [
      { id: 'base-p', nome: 'Base copo 330ml', itens: [] },
      { id: 'base-m', nome: 'Base copo 440ml', itens: [] },
      { id: 'base-g', nome: 'Base copo 550ml', itens: [] },
    ],
    fichas: [],
    custosFixos: [],
    lancamentos: [],
    historico: [],
    config: { ...CONFIG_PADRAO },
  };
}

// Completa dados salvos (ou de backup) com o que faltar
export function migrar(bruto: unknown): Dados {
  const ini = dadosIniciais();
  const d = (bruto ?? {}) as Partial<Dados>;
  return {
    versao: 1,
    insumos: Array.isArray(d.insumos) ? d.insumos : ini.insumos,
    preparos: Array.isArray(d.preparos) ? d.preparos : ini.preparos,
    bases: Array.isArray(d.bases) ? d.bases : ini.bases,
    fichas: Array.isArray(d.fichas) ? d.fichas : ini.fichas,
    custosFixos: Array.isArray(d.custosFixos) ? d.custosFixos : ini.custosFixos,
    lancamentos: Array.isArray(d.lancamentos) ? d.lancamentos : ini.lancamentos,
    historico: Array.isArray(d.historico) ? d.historico : ini.historico,
    config: { ...CONFIG_PADRAO, ...(d.config ?? {}) },
  };
}
