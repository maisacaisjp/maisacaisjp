import type { Config, Dados, Ficha, Insumo, ItemReceita, Tamanho } from './types';

export function custoUnitInsumo(i: Insumo) {
  if (!i.qtdEmbalagem || i.qtdEmbalagem <= 0) return 0;
  const perda = Math.min(Math.max(i.perda || 0, 0), 95);
  return i.precoEmbalagem / i.qtdEmbalagem / (1 - perda / 100);
}

// Custo por grama (ou ml) de um preparo (mousse de ninho, creme de cupuaçu, calda caseira...)
export function custoUnitPreparo(id: string, d: Dados, prof = 0): number {
  const p = d.preparos.find((x) => x.id === id);
  if (!p || !p.rendimento || prof > 5) return 0;
  const total = p.itens.reduce((s, it) => s + it.qtd * custoUnitRef(it, d, prof + 1), 0);
  return total / p.rendimento;
}

export function custoUnitRef(it: Pick<ItemReceita, 'tipo' | 'refId'>, d: Dados, prof = 0) {
  if (it.tipo === 'preparo') return custoUnitPreparo(it.refId, d, prof);
  const ins = d.insumos.find((x) => x.id === it.refId);
  return ins ? custoUnitInsumo(ins) : 0;
}

export function nomeRef(it: Pick<ItemReceita, 'tipo' | 'refId'>, d: Dados) {
  if (it.tipo === 'preparo') return d.preparos.find((x) => x.id === it.refId)?.nome ?? '(preparo removido)';
  return d.insumos.find((x) => x.id === it.refId)?.nome ?? '(insumo removido)';
}

export function unidadeRef(it: Pick<ItemReceita, 'tipo' | 'refId'>, d: Dados) {
  if (it.tipo === 'preparo') return 'g';
  return d.insumos.find((x) => x.id === it.refId)?.unidade ?? 'g';
}

export function qtdNoTamanho(it: ItemReceita, t: Tamanho, cfg: Config) {
  if (t === 'M') return it.qtdM ?? it.qtd * cfg.fatorM;
  if (t === 'P') return it.qtdP ?? it.qtd * cfg.fatorP;
  return it.qtd;
}

export const TAMANHOS_COPO: Tamanho[] = ['P', 'M', 'G'];
export const ROTULO_TAMANHO: Record<Tamanho, string> = { P: '330ml', M: '440ml', G: '550ml', U: 'Único' };

export const tamanhosDa = (f: Pick<Ficha, 'tipo'>): Tamanho[] => (f.tipo === 'copo' ? TAMANHOS_COPO : ['U']);

// Tamanho de referência da ficha (o copo G para combos)
export const tamanhoRef = (f: Pick<Ficha, 'tipo'>): Tamanho => (f.tipo === 'copo' ? 'G' : 'U');

export function custoItens(itens: ItemReceita[], d: Dados) {
  return itens.reduce((s, it) => s + it.qtd * custoUnitRef(it, d), 0);
}

export function custoBase(baseId: string | undefined, d: Dados) {
  const b = baseId ? d.bases.find((x) => x.id === baseId) : undefined;
  return b ? custoItens(b.itens, d) : 0;
}

export function custoRecheio(f: Ficha, t: Tamanho, d: Dados) {
  return f.recheio.reduce((s, it) => s + qtdNoTamanho(it, t, d.config) * custoUnitRef(it, d), 0);
}

export function custoFicha(f: Ficha, t: Tamanho, d: Dados) {
  const base = custoBase(f.baseIds[t], d);
  const recheio = custoRecheio(f, t, d);
  return { base, recheio, total: base + recheio };
}

export function pendenciaItem(it: ItemReceita, d: Dados): string | null {
  if (it.tipo === 'insumo') {
    const ins = d.insumos.find((x) => x.id === it.refId);
    if (!ins) return 'insumo removido';
    if (!ins.semCusto && (!ins.precoEmbalagem || !ins.qtdEmbalagem)) return `${ins.nome} sem preço`;
  } else {
    const p = d.preparos.find((x) => x.id === it.refId);
    if (!p) return 'preparo removido';
    for (const sub of p.itens) {
      const pend = pendenciaItem(sub, d);
      if (pend) return `${p.nome}: ${pend}`;
    }
  }
  if (!it.qtd) return `${nomeRef(it, d)} sem quantidade`;
  return null;
}

export function pendenciasFicha(f: Ficha, d: Dados) {
  const lista = new Set<string>();
  for (const t of tamanhosDa(f)) {
    const baseId = f.baseIds[t];
    if (f.tipo === 'copo' && !baseId) lista.add(`sem base no copo ${ROTULO_TAMANHO[t]}`);
    const b = baseId ? d.bases.find((x) => x.id === baseId) : undefined;
    if (baseId && !b) lista.add(`base do ${ROTULO_TAMANHO[t]} removida`);
    if (b && !b.itens.length) lista.add(`${b.nome} vazia`);
    b?.itens.forEach((it) => {
      const p = pendenciaItem(it, d);
      if (p) lista.add(`${b.nome}: ${p}`);
    });
    if (!f.precos[t]) lista.add(`sem preço de venda (${ROTULO_TAMANHO[t]})`);
  }
  if (!f.recheio.length && !(f.tipo !== 'copo' && f.baseIds.U)) lista.add('composição vazia');
  f.recheio.forEach((it) => {
    const p = pendenciaItem(it, d);
    if (p) lista.add(p);
  });
  return [...lista];
}

export function usoDoInsumo(id: string, d: Dados) {
  const usa = (itens: ItemReceita[]) => itens.some((it) => it.tipo === 'insumo' && it.refId === id);
  return [
    ...d.preparos.filter((p) => usa(p.itens)).map((p) => p.nome),
    ...d.bases.filter((b) => usa(b.itens)).map((b) => b.nome),
    ...d.fichas.filter((f) => usa(f.recheio)).map((f) => f.nome),
  ];
}
