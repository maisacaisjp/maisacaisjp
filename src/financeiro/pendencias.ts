// Resumo de tudo que impede as fichas técnicas de fecharem 100% (custo real em todas).
// Junta as pendências de todas as fichas por insumo, base e preparo, para resolver na ordem certa.
import { ROTULO_TAMANHO, tamanhosDa } from './calc';
import { norm } from './format';
import type { AdicionalCardapio, Dados, Ficha, ItemReceita, ProdutoCardapio } from './types';

export interface InsumoPendente { id: string; nome: string; fichas: string[] }
export interface PreparoPendente { id: string; nome: string; motivo: string; fichas: string[] }
export interface BasePendente { id: string; nome: string; motivo: string; fichas: string[] }
export interface FichaPendente { id: string; nome: string; motivos: string[] }

export interface ResumoPendencias {
  insumosSemPreco: InsumoPendente[];
  preparos: PreparoPendente[];
  bases: BasePendente[];
  fichas: FichaPendente[];
  produtosSemFicha: Array<{ id: string; nome: string }>;
  fichasOk: number;
  totalFichas: number;
}

const semPreco = (d: Dados, id: string) => {
  const i = d.insumos.find((x) => x.id === id);
  return !!i && !i.semCusto && (!i.precoEmbalagem || !i.qtdEmbalagem);
};

export function resumirPendencias(d: Dados, cardapio: ProdutoCardapio[], adicionais: AdicionalCardapio[]): ResumoPendencias {
  const insumos = new Map<string, Set<string>>();
  const preparos = new Map<string, { motivo: string; fichas: Set<string> }>();
  const bases = new Map<string, { motivo: string; fichas: Set<string> }>();
  const fichas: FichaPendente[] = [];
  let fichasOk = 0;

  const marcar = <T extends { fichas: Set<string> }>(m: Map<string, T>, id: string, novo: () => T, ficha: string) => {
    if (!m.has(id)) m.set(id, novo());
    m.get(id)!.fichas.add(ficha);
  };

  // Percorre itens (e preparos dentro de preparos) anotando o que falta
  const varrer = (itens: ItemReceita[], ficha: string, motivos: Set<string>, prof = 0) => {
    if (prof > 5) return;
    for (const it of itens) {
      if (it.tipo === 'insumo') {
        const ins = d.insumos.find((x) => x.id === it.refId);
        if (!ins) motivos.add('usa um insumo que foi excluído');
        else if (semPreco(d, ins.id)) {
          if (!insumos.has(ins.id)) insumos.set(ins.id, new Set());
          insumos.get(ins.id)!.add(ficha);
          motivos.add(`${ins.nome} sem preço`);
        }
      } else {
        const p = d.preparos.find((x) => x.id === it.refId);
        if (!p) { motivos.add('usa uma base caseira que foi excluída'); continue; }
        if (!p.itens.length) { marcar(preparos, p.id, () => ({ motivo: 'sem ingredientes', fichas: new Set() }), ficha); motivos.add(`${p.nome} sem ingredientes`); }
        if (!p.rendimento) { marcar(preparos, p.id, () => ({ motivo: 'sem rendimento (quanto a receita rende)', fichas: new Set() }), ficha); motivos.add(`${p.nome} sem rendimento`); }
        varrer(p.itens, ficha, motivos, prof + 1);
      }
      if (!it.qtd) motivos.add('item sem quantidade');
    }
  };

  for (const f of d.fichas) {
    const motivos = new Set<string>();
    for (const t of tamanhosDa(f)) {
      const baseId = f.baseIds[t];
      if (f.tipo === 'copo' && !baseId) motivos.add(`sem base no copo ${ROTULO_TAMANHO[t]}`);
      const b = baseId ? d.bases.find((x) => x.id === baseId) : undefined;
      if (baseId && !b) motivos.add(`base do ${ROTULO_TAMANHO[t]} foi excluída`);
      if (b) {
        if (!b.itens.length) { marcar(bases, b.id, () => ({ motivo: 'vazia', fichas: new Set() }), f.nome); motivos.add(`${b.nome} vazia`); }
        varrer(b.itens, f.nome, motivos);
      }
      if (!f.precos[t]) motivos.add(`sem preço de venda (${ROTULO_TAMANHO[t]})`);
    }
    if (!f.recheio.length && !(f.tipo !== 'copo' && f.baseIds.U)) motivos.add('composição vazia (nenhum ingrediente)');
    varrer(f.recheio, f.nome, motivos);
    if (motivos.size) fichas.push({ id: f.id, nome: f.nome, motivos: [...motivos] });
    else fichasOk++;
  }

  const ordenar = <T extends { fichas: string[]; nome: string }>(l: T[]) => l.sort((a, b) => b.fichas.length - a.fichas.length || a.nome.localeCompare(b.nome, 'pt'));
  const comFicha = new Set(d.fichas.map((f: Ficha) => f.produtoId).filter(Boolean));
  // O mesmo adicional pode existir em duas tabelas (produtos e adicionais): ficha com o mesmo nome também vale
  const nomeFicha = new Set(d.fichas.map((f: Ficha) => norm(f.nome)));
  const temFicha = (id: string, nome: string) => comFicha.has(id) || nomeFicha.has(norm(nome));

  return {
    insumosSemPreco: ordenar([...insumos].map(([id, s]) => ({ id, nome: d.insumos.find((x) => x.id === id)?.nome ?? id, fichas: [...s] }))),
    preparos: ordenar([...preparos].map(([id, v]) => ({ id, nome: d.preparos.find((x) => x.id === id)?.nome ?? id, motivo: v.motivo, fichas: [...v.fichas] }))),
    bases: ordenar([...bases].map(([id, v]) => ({ id, nome: d.bases.find((x) => x.id === id)?.nome ?? id, motivo: v.motivo, fichas: [...v.fichas] }))),
    fichas: fichas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { numeric: true })),
    // Só o que é vendido: ativo e com preço. Sabores de creme e opções de escolha (sem preço próprio) não precisam de ficha.
    produtosSemFicha: [
      ...cardapio
        .filter((p) => p.is_active !== false && Boolean(p.price_single || p.price_p || p.price_m || p.price_g))
        .filter((p) => !temFicha(p.id, p.name))
        .map((p) => ({ id: p.id, nome: p.name })),
      ...adicionais
        .filter((a) => a.is_active !== false && Number(a.price) > 0)
        .filter((a) => !temFicha(`extra:${a.id}`, a.name))
        .map((a) => ({ id: `extra:${a.id}`, nome: `${a.name} (adicional)` })),
    ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
    fichasOk,
    totalFichas: d.fichas.length,
  };
}
