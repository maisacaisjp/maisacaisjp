import type { MenuItem, ExtraIngredient } from '../data/menu';
import { CartItem, ProductSize, SIZE_LABELS } from '../types';
import { getSizeOptions } from './produto';
import { regrasDoProduto } from '../data/variacoes';
import type { PedidoCliente } from './contaCliente';

// "Pedir de novo": remonta os itens de um pedido antigo com os preços de hoje.
// Fica de fora o que não existe mais ou está pausado (produto, tamanho, adicional ou sabor).

const normal = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

// No pedido o tamanho vai no fim do nome: "COMBO NINHO (440ml)"
const TAMANHO_PELO_ROTULO: Record<string, ProductSize> = Object.fromEntries(
  (Object.entries(SIZE_LABELS) as [ProductSize, string][]).map(([k, v]) => [normal(v), k])
);

function separarTamanho(nome: string): { base: string; size?: ProductSize } {
  const m = nome.match(/^(.*)\s\(([^()]+)\)$/);
  if (m && TAMANHO_PELO_ROTULO[normal(m[2])]) return { base: m[1], size: TAMANHO_PELO_ROTULO[normal(m[2])] };
  return { base: nome };
}

/** Sabores escolhidos que estão nas observações ("Creme: AÇAÍ NATURAL + PITAYA | sem granola"). */
function saboresDasObservacoes(notes: string, rotulo: string): string[] {
  const parte = notes.split(' | ').find(p => p.startsWith(`${rotulo}: `));
  return parte ? parte.slice(rotulo.length + 2).split(' + ').map(s => s.trim()).filter(Boolean) : [];
}

export interface ResultadoRepeticao {
  itens: CartItem[];
  foraDoCardapio: string[];
}

export function montarItensParaRepetir(
  pedido: PedidoCliente,
  ctx: { menuItems: MenuItem[]; extras: ExtraIngredient[]; pausedItems: string[] }
): ResultadoRepeticao {
  const itens: CartItem[] = [];
  const foraDoCardapio: string[] = [];

  (pedido.items || []).forEach((it, i) => {
    const nomeOriginal = String(it.name || '');
    // Meio a meio (legado de pizzaria) não volta
    if (nomeOriginal.startsWith('1/2 ')) {
      foraDoCardapio.push(nomeOriginal);
      return;
    }

    const { base, size } = separarTamanho(nomeOriginal);
    const produto = ctx.menuItems.find(m => normal(m.name) === normal(base));
    if (!produto || ctx.pausedItems.includes(produto.id)) {
      foraDoCardapio.push(base);
      return;
    }

    // Preço do tamanho hoje (ou preço único)
    let precoBase = produto.priceSingle || 0;
    const tamanhos = getSizeOptions(produto);
    if (size) {
      const t = tamanhos.find(o => o.size === size);
      if (!t || ctx.pausedItems.includes(`${produto.id}-${t.pauseKey}`)) {
        foraDoCardapio.push(nomeOriginal);
        return;
      }
      precoBase = t.price;
    } else if (tamanhos.length > 1) {
      // Pedido antigo sem tamanho de um produto que hoje tem tamanhos: o cliente escolhe de novo
      foraDoCardapio.push(base);
      return;
    }

    // Sabores (creme) ainda disponíveis?
    const notes = String(it.notes || '');
    const regras = regrasDoProduto(produto);
    const saborEmFalta = regras.escolhas.some(g => {
      const disponiveis = new Set(g.opcoes.map(o => normal(o.nome)));
      return saboresDasObservacoes(notes, g.rotulo).some(n => !disponiveis.has(normal(n)));
    });
    if (saborEmFalta) {
      foraDoCardapio.push(base);
      return;
    }

    // Adicionais com o preço de hoje; o que saiu do cardápio fica de fora (o item continua)
    const extras: ExtraIngredient[] = [];
    if (regras.adicionais) {
      (it.extras || []).forEach(e => {
        const atual = ctx.extras.find(x => x.id === e.id);
        if (atual) extras.push({ id: atual.id, name: atual.name, price: atual.price }); // sem a foto
      });
    }
    const removidos = (it.extras || []).length - extras.length;
    if (regras.adicionais && removidos > 0) foraDoCardapio.push(`${removidos} adicional(is) de ${base}`);

    itens.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      menuItem: produto,
      size,
      quantity: Math.max(1, Number(it.quantity) || 1),
      extras,
      notes: notes || undefined,
      priceCalculated: precoBase + extras.reduce((s, e) => s + e.price, 0),
    });
  });

  return { itens, foraDoCardapio };
}
