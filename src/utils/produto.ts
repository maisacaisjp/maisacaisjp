import type { MenuItem, ExtraIngredient } from '../data/menu';
import type { ProductSize } from '../types';
import { regrasDoProduto } from '../data/variacoes';

// Bebidas, milkshakes e os próprios adicionais não levam adicionais.
// Açaí (monte do seu jeito, combos, mais vendidos, novidades) e kits levam.
export function aceitaAdicionais(item: Pick<MenuItem, 'id' | 'category'> | null | undefined): boolean {
  return regrasDoProduto(item).adicionais !== null;
}

// Adicional escolhido mais de uma vez fica repetido na lista (o preço soma certo em todo o sistema).
// Para mostrar, agrupa: "2x MORANGO".
export function agruparExtras(extras: ExtraIngredient[] | undefined): Array<{ extra: ExtraIngredient; qtd: number }> {
  const out: Array<{ extra: ExtraIngredient; qtd: number }> = [];
  (extras || []).forEach(e => {
    const ja = out.find(o => o.extra.id === e.id);
    if (ja) ja.qtd += 1;
    else out.push({ extra: e, qtd: 1 });
  });
  return out;
}

export const nomeExtraAgrupado = (g: { extra: ExtraIngredient; qtd: number }) =>
  g.qtd > 1 ? `${g.qtd}x ${g.extra.name}` : g.extra.name;

// Texto curto de cada tamanho, como no Multipedidos
export const SIZE_DESCRIPTIONS: Partial<Record<ProductSize, string>> = {
  P: 'Pequeno',
  M: 'Médio',
  G: 'Grande',
  Big: 'Gigante',
};

export interface SizeOption {
  size: ProductSize;
  price: number;
  /** Sufixo usado em paused_items para pausar só esse tamanho (ex.: acai-54163-Big). */
  pauseKey: string;
}

const valido = (n: number | null | undefined): n is number => typeof n === 'number' && !isNaN(n) && n > 0;

/**
 * Tamanhos do produto com preço cadastrado, na ordem do menor para o maior:
 * 330ml (priceP), 440ml (priceM), 550ml (priceG), 770ml (priceBig), 1 Litro (priceSuperBig) e 2 Litros (price2L).
 * Tamanho sem preço não aparece.
 */
export function getSizeOptions(item: MenuItem | null | undefined): SizeOption[] {
  if (!item) return [];
  const out: SizeOption[] = [];
  // 330ml: sem preço próprio, segue a regra antiga de R$ 2 a menos que o 440ml
  const p330 = valido(item.priceP) ? item.priceP : valido(item.priceM) ? Math.max(item.priceM - 2, 0) : undefined;
  if (valido(p330)) out.push({ size: 'P', price: p330, pauseKey: 'P' });
  if (valido(item.priceM)) out.push({ size: 'M', price: item.priceM, pauseKey: 'M' });
  if (valido(item.priceG)) out.push({ size: 'G', price: item.priceG, pauseKey: 'G' });
  if (valido(item.priceBig)) out.push({ size: 'Big', price: item.priceBig, pauseKey: 'Big' });
  if (valido(item.priceSuperBig)) out.push({ size: 'Super Big', price: item.priceSuperBig, pauseKey: 'SuperBig' });
  if (valido(item.price2L)) out.push({ size: '2L', price: item.price2L, pauseKey: '2L' });
  return out;
}
