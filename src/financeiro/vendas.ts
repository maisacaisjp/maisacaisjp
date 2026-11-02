// Cruza os pedidos do gestor com as fichas técnicas para estimar o CMV real.
// Cada item é dividido em produto principal + adicionais escolhidos, e cada parte procura a sua ficha.
import { custoFicha } from './calc';
import { norm } from './format';
import type { AdicionalCardapio, Dados, Ficha, ItemPedido, Pedido, ProdutoCardapio, Tamanho } from './types';

export interface VendaProduto {
  chave: string;
  nome: string;
  produtoId?: string; // id do cardápio, ou "extra:<id>" para adicionais
  categoria: string;
  tamanho: Tamanho;
  adicional: boolean;
  qtd: number;
  receita: number;
  custo: number | null; // null = sem ficha
  fichaId?: string;
}

export interface ResumoVendas {
  pedidos: number;
  entregas: number;
  faturamento: number;
  receitaItens: number;
  receitaComFicha: number;
  custoComFicha: number;
  produtos: VendaProduto[];
  porDia: Record<string, number>;
}

const TAM_NOME: Record<string, Tamanho> = { pq: 'P', p: 'P', md: 'M', m: 'M', gr: 'G', g: 'G' };

const semColchetes = (s: string) => s.replace(/\[[^\]]*\]/g, '').trim();

function tamanhoDo(it: ItemPedido): Tamanho {
  const n = semColchetes(it.name).match(/\((Pq|P|Md|M|Gr|G)\)\s*$/i);
  return n ? TAM_NOME[n[1].toLowerCase()] : 'U';
}

const limparNome = (s: string) => semColchetes(s).replace(/\((Pq|P|Md|M|Gr|G)\)\s*$/i, '').trim();

export function analisarVendas(pedidos: Pedido[], cardapio: ProdutoCardapio[], adicionais: AdicionalCardapio[], d: Dados): ResumoVendas {
  const prodPorNome = new Map(cardapio.map((m) => [norm(m.name), m]));
  const adicPorNome = new Map(adicionais.map((a) => [norm(a.name), a]));
  const fichaPorProduto = new Map<string, Ficha>();
  const fichaPorNome = new Map<string, Ficha>();
  d.fichas.forEach((f) => {
    if (f.produtoId) fichaPorProduto.set(f.produtoId, f);
    fichaPorNome.set(`${f.tipo === 'adicional' ? 'a' : 'p'}|${norm(f.nome)}`, f);
  });

  const mapa = new Map<string, VendaProduto>();
  const r: ResumoVendas = { pedidos: pedidos.length, entregas: 0, faturamento: 0, receitaItens: 0, receitaComFicha: 0, custoComFicha: 0, produtos: [], porDia: {} };

  const somar = (v: Omit<VendaProduto, 'qtd' | 'receita' | 'custo'>, qtd: number, receita: number, custo: number | null) => {
    const atual = mapa.get(v.chave) ?? { ...v, qtd: 0, receita: 0, custo: custo === null ? null : 0 };
    atual.qtd += qtd;
    atual.receita += receita;
    if (atual.custo !== null && custo !== null) atual.custo += custo;
    mapa.set(v.chave, atual);
    r.receitaItens += receita;
    if (custo !== null) {
      r.receitaComFicha += receita;
      r.custoComFicha += custo;
    }
  };

  for (const ped of pedidos) {
    r.faturamento += Number(ped.total_amount) || 0;
    if (/deliver|entrega/i.test(ped.order_type || '')) r.entregas++;
    const dia = new Date(ped.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    r.porDia[dia] = (r.porDia[dia] || 0) + (Number(ped.total_amount) || 0);

    for (const it of ped.items ?? []) {
      const q = it.quantity || 1;
      const extras = it.extras ?? [];
      const totalExtras = extras.reduce((s, e) => s + (Number(e.price) || 0), 0);
      const unit = Number(it.priceCalculated ?? 0) || 0;
      const base = it.basePrice !== undefined ? Number(it.basePrice) || 0 : Math.max(0, unit - totalExtras);

      // Produto principal
      const t = tamanhoDo(it);
      const nome = limparNome(it.name);
      const prod = prodPorNome.get(norm(nome));
      const ficha = (prod && fichaPorProduto.get(prod.id)) || fichaPorNome.get(`p|${norm(prod?.name ?? nome)}`);
      const tam: Tamanho = ficha ? (ficha.tipo === 'copo' ? (t === 'U' ? 'G' : t) : 'U') : t;
      somar(
        { chave: `${prod?.id ?? norm(nome)}|${tam}`, nome: prod?.name ?? nome, produtoId: prod?.id, categoria: prod?.category ?? it.category ?? '', tamanho: tam, adicional: false, fichaId: ficha?.id },
        q, base * q, ficha ? custoFicha(ficha, tam, d).total * q : null,
      );

      // Adicionais escolhidos
      for (const e of extras) {
        const adic = (e.id && adicionais.find((a) => a.id === e.id)) || adicPorNome.get(norm(e.name ?? ''));
        const idExtra = adic ? `extra:${adic.id}` : undefined;
        const fichaAd = (idExtra && fichaPorProduto.get(idExtra)) || fichaPorNome.get(`a|${norm(adic?.name ?? e.name ?? '')}`);
        const nomeAd = adic?.name ?? e.name ?? 'Adicional';
        somar(
          { chave: `${idExtra ?? norm(nomeAd)}|A`, nome: nomeAd, produtoId: idExtra, categoria: 'Adicionais', tamanho: 'U', adicional: true, fichaId: fichaAd?.id },
          q, (Number(e.price) || 0) * q, fichaAd ? custoFicha(fichaAd, 'U', d).total * q : null,
        );
      }
    }
  }
  r.produtos = [...mapa.values()].sort((a, b) => b.receita - a.receita);
  return r;
}
