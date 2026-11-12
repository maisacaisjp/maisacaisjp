// Cruza os pedidos do gestor com as fichas técnicas para estimar o CMV real.
// Cada item é dividido em produto principal + adicionais escolhidos, e cada parte procura a sua ficha.
import { custoFicha, custoBase, custoUnitRef, unidadeRef } from './calc';
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
  entregasComValor: number; // entregas com o valor do parceiro lançado no pedido
  custoEntregasLancado: number; // soma dos valores pagos aos entregadores
  faturamento: number;
  receitaItens: number;
  receitaComFicha: number;
  custoComFicha: number;
  produtos: VendaProduto[];
  porDia: Record<string, number>;
}

// Tamanho escrito no fim do nome do item, entre parênteses.
// Pedidos antigos: (P) (M) (G). Cardápio e PDV atuais: (330ml) (440ml) (550ml) (770ml) (Pote Recheado 1 Litro) (2 Litros) / (1L) (2L).
type TamPedido = 'P' | 'M' | 'G' | '770' | 'POTE' | '2L' | null;
const RE_TAM = /\(\s*(Pq|P|Md|M|Gr|G|330\s*ml|440\s*ml|550\s*ml|770\s*ml|Pote Recheado 1 Litro|1\s*L(?:itro)?|2\s*L(?:itros)?)\s*\)\s*$/i;

const semColchetes = (s: string) => s.replace(/\[[^\]]*\]/g, '').trim();

function tamanhoDo(it: ItemPedido): TamPedido {
  const n = semColchetes(it.name).match(RE_TAM);
  if (!n) return null;
  const s = n[1].toLowerCase().replace(/\s+/g, '');
  if (s === 'pq' || s === 'p' || s === '330ml') return 'P';
  if (s === 'md' || s === 'm' || s === '440ml') return 'M';
  if (s === 'gr' || s === 'g' || s === '550ml') return 'G';
  if (s === '770ml') return '770';
  if (s.startsWith('2l')) return '2L';
  return 'POTE';
}

const limparNome = (s: string) => semColchetes(s).replace(RE_TAM, '').trim();

// Nome da ficha de tamanho único do combo no 770ml e no Pote Recheado 1L (criadas pelo SQL das fichas)
const SUFIXO_FICHA: Partial<Record<NonNullable<TamPedido>, string>> = { '770': ' — 770ML', POTE: ' — POTE RECHEADO 1 LITRO' };
const ROTULO_PEDIDO: Partial<Record<NonNullable<TamPedido>, string>> = { '770': ' (770ml)', POTE: ' (Pote 1L)', '2L': ' (2 Litros)' };

// Custo de um adicional avulso no tamanho do copo: o que é por peso cresce com o fator;
// o que é por unidade (chocolates) vai na mesma quantidade em todos os tamanhos.
function custoAdicional(f: Ficha, fator: number, d: Dados) {
  const recheio = f.recheio.reduce((s, it) => s + it.qtd * custoUnitRef(it, d) * (unidadeRef(it, d) === 'un' ? 1 : fator), 0);
  return custoBase(f.baseIds.U, d) + recheio;
}

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
  const r: ResumoVendas = { pedidos: pedidos.length, entregas: 0, entregasComValor: 0, custoEntregasLancado: 0, faturamento: 0, receitaItens: 0, receitaComFicha: 0, custoComFicha: 0, produtos: [], porDia: {} };

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
    if (/deliver|entrega/i.test(ped.order_type || '')) {
      r.entregas++;
      const fee = Number(ped.motoboy_fee) || 0;
      if (fee > 0) {
        r.entregasComValor++;
        r.custoEntregasLancado += fee;
      }
    }
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
      const prod = (it.id && cardapio.find((m) => m.id === it.id)) || prodPorNome.get(norm(nome));
      const nomeProd = prod?.name ?? nome;
      let ficha: Ficha | undefined;
      let tam: Tamanho;
      if (t === '770' || t === 'POTE' || t === '2L') {
        // Combo no 770ml / Pote 1L: tem ficha própria; o que vende sem ficha nesse tamanho fica como "sem ficha"
        const sufixo = SUFIXO_FICHA[t];
        ficha = sufixo ? fichaPorNome.get(`p|${norm(nomeProd + sufixo)}`) : undefined;
        if (!ficha) {
          const f = (prod && fichaPorProduto.get(prod.id)) || fichaPorNome.get(`p|${norm(nomeProd)}`);
          if (f && f.tipo !== 'copo') ficha = f; // produto de tamanho único (ex.: "AÇAÍ 770ML")
        }
        tam = 'U';
      } else {
        ficha = (prod && fichaPorProduto.get(prod.id)) || fichaPorNome.get(`p|${norm(nomeProd)}`);
        const tCopo: Tamanho = t === 'P' || t === 'M' || t === 'G' ? t : 'U';
        tam = ficha ? (ficha.tipo === 'copo' ? (tCopo === 'U' ? 'G' : tCopo) : 'U') : tCopo;
      }
      const rotulo = (t && ROTULO_PEDIDO[t]) || '';
      somar(
        { chave: `${prod?.id ?? norm(nome)}|${tam}${rotulo}`, nome: nomeProd + rotulo, produtoId: prod?.id, categoria: prod?.category ?? it.category ?? '', tamanho: tam, adicional: false, fichaId: ficha?.id },
        q, base * q, ficha ? custoFicha(ficha, tam, d).total * q : null,
      );

      // Adicionais escolhidos (Base = 330ml: 440ml +20%, 550ml +40%, 770ml +60%, Pote 1L Recheado +100%; chocolates por unidade não mudam)
      const eh770 = t === '770' || prod?.id === 'acai-1371861' || /770\s*ml/i.test(nome);
      const ehPote = t === 'POTE' || t === '2L' || prod?.id === 'acai-1371862' || prod?.id === 'acai-1371863' || /\b(1|2)\s*l(itro|itros)?\b/i.test(nome);
      const eh550 = t === 'G' || prod?.id === 'acai-1371860' || /550\s*ml/i.test(nome);
      const eh440 = t === 'M' || prod?.id === 'acai-1371859' || /440\s*ml/i.test(nome);
      const fatorAdicional = ehPote
        ? (d.config.fator1L || 2)
        : eh770
          ? (d.config.fator770 || 1.6)
          : eh550
            ? (d.config.fatorG || 1.4)
            : eh440
              ? (d.config.fatorM || 1.2)
              : (d.config.fatorP || 1);

      for (const e of extras) {
        const adic = (e.id && adicionais.find((a) => a.id === e.id)) || adicPorNome.get(norm(e.name ?? ''));
        const idExtra = adic ? `extra:${adic.id}` : undefined;
        const fichaAd = (idExtra && fichaPorProduto.get(idExtra)) || fichaPorNome.get(`a|${norm(adic?.name ?? e.name ?? '')}`);
        const nomeAd = adic?.name ?? e.name ?? 'Adicional';
        somar(
          { chave: `${idExtra ?? norm(nomeAd)}|A`, nome: nomeAd, produtoId: idExtra, categoria: 'Adicionais', tamanho: 'U', adicional: true, fichaId: fichaAd?.id },
          q, (Number(e.price) || 0) * q, fichaAd ? custoAdicional(fichaAd, fatorAdicional, d) * q : null,
        );
      }
    }
  }
  r.produtos = [...mapa.values()].sort((a, b) => b.receita - a.receita);
  return r;
}
