// ==============================================================================
// VARIAÇÕES DOS PRODUTOS — IGUAIS AO CARDÁPIO DO MULTIPEDIDOS (conferido em 03/11/2026)
// Grupos de lá: "ESCOLHA O CREME GELADO" (Monte do seu jeito), "ADICIONAIS"
// (combos, kits e monte) e "Escolha o sabor do Milkshake" (Leve 2 MilkShakes).
// ==============================================================================

import type { MenuItem } from './menu';

export interface OpcaoVariacao {
  id: string;
  nome: string;
  disponivel: boolean;
  destaque?: string;
}

export interface GrupoEscolha {
  titulo: string;
  /** Prefixo que vai nas observações do item (ex.: "Creme: AÇAÍ NATURAL + PITAYA"). */
  rotulo: string;
  min: number;
  max: number;
  opcoes: OpcaoVariacao[];
}

export interface RegrasAdicionais {
  /** Total de adicionais no item. */
  max: number;
  /** Máximo do mesmo adicional. */
  maxPorItem: number;
}

export interface RegrasProduto {
  escolhas: GrupoEscolha[];
  adicionais: RegrasAdicionais | null;
}

// Grupo "ESCOLHA O CREME GELADO": escolha de 1 a 2, sem custo
export const CREMES_GELADOS: GrupoEscolha = {
  titulo: 'Escolha o creme gelado',
  rotulo: 'Creme',
  min: 1,
  max: 2,
  opcoes: [
    { id: 'cr-58542', nome: 'AÇAÍ NATURAL', disponivel: true, destaque: 'O mais pedido!' },
    { id: 'cr-58543', nome: 'AÇAÍ SABOR BANANA', disponivel: true },
    { id: 'cr-58544', nome: 'AÇAÍ SABOR MORANGO', disponivel: true },
    { id: 'cr-58547', nome: 'CUPUAÇU NATURAL', disponivel: true, destaque: 'O mais pedido!' },
    { id: 'cr-58549', nome: 'CUPUAÇU CREMOSO', disponivel: false, destaque: 'Mais adocicado.' },
    { id: 'cr-58546', nome: 'CAFÉ E CACAU', disponivel: true },
    { id: 'cr-619708', nome: 'CREME DE PAÇOCA', disponivel: true },
    { id: 'cr-58552', nome: 'PITAYA', disponivel: true },
    { id: 'cr-58553', nome: 'TAPIOCA COM COCO', disponivel: true },
  ],
};

// Grupo "Escolha o sabor do Milkshake": obrigatório, 1 sabor
export const SABORES_MILKSHAKE: GrupoEscolha = {
  titulo: 'Escolha o sabor do Milkshake',
  rotulo: 'Sabor',
  min: 1,
  max: 1,
  opcoes: [
    'Açaí', 'Cupuaçu', 'Chocolate', 'Morango', 'Paçoca', 'Leite Ninho', 'Ovomaltine',
    'Nutella', 'Ninho com Nutella', 'Ninho com Morango', 'Doce de Leite com Paçoca',
  ].map((nome, i) => ({ id: `ms-${i + 1}`, nome, disponivel: true })),
};

// Kits com até 10 adicionais (igual ao Monte do seu jeito). O Kit Festa vai até 5, como os combos.
const KITS_10_ADICIONAIS = ['acai-56853', 'acai-92071']; // KIT 1 LITRO, KIT 2 LITROS
const LEVE_2_MILKSHAKES = 'acai-1422806';

const SEM_ADICIONAIS = ['bebidas', 'milkshakes', 'adicionais'];

export function regrasDoProduto(item: Pick<MenuItem, 'id' | 'category'> | null | undefined): RegrasProduto {
  if (!item) return { escolhas: [], adicionais: null };

  if (item.id === LEVE_2_MILKSHAKES) return { escolhas: [SABORES_MILKSHAKE], adicionais: null };
  if (item.id.startsWith('ex-') || SEM_ADICIONAIS.includes(item.category)) return { escolhas: [], adicionais: null };

  if (item.category === 'monte-do-seu-jeito') {
    return { escolhas: [CREMES_GELADOS], adicionais: { max: 10, maxPorItem: 5 } };
  }
  if (KITS_10_ADICIONAIS.includes(item.id)) {
    return { escolhas: [], adicionais: { max: 10, maxPorItem: 5 } };
  }
  // Combos, mais vendidos, novidades e Kit Festa
  return { escolhas: [], adicionais: { max: 5, maxPorItem: 5 } };
}

/** Texto das escolhas para as observações do item: "Creme: AÇAÍ NATURAL + PITAYA". */
export function textoEscolhas(grupos: GrupoEscolha[], selecionadas: Record<string, string[]>): string {
  return grupos
    .map(g => {
      const nomes = (selecionadas[g.rotulo] || [])
        .map(id => g.opcoes.find(o => o.id === id)?.nome)
        .filter(Boolean);
      return nomes.length ? `${g.rotulo}: ${nomes.join(' + ')}` : '';
    })
    .filter(Boolean)
    .join(' | ');
}

/** Primeiro grupo que ainda não tem o mínimo de escolhas, para avisar o cliente. */
export function escolhaPendente(grupos: GrupoEscolha[], selecionadas: Record<string, string[]>): GrupoEscolha | null {
  return grupos.find(g => (selecionadas[g.rotulo] || []).length < g.min) || null;
}
