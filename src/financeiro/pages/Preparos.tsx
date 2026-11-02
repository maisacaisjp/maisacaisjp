import { Plus, Trash2 } from 'lucide-react';
import { custoItens, custoUnitPreparo } from '../calc';
import { brl, uid } from '../format';
import { ReceitaEditor } from '../ReceitaEditor';
import { useDados } from '../store';
import type { Base, Preparo } from '../types';
import { Btn, Card, Num, Txt, Vazio } from '../ui';

export default function Preparos() {
  const { dados, atualizar } = useDados();
  const mudarPreparo = (id: string, patch: Partial<Preparo>) =>
    atualizar((d) => ({ ...d, preparos: d.preparos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const mudarBase = (id: string, patch: Partial<Base>) =>
    atualizar((d) => ({ ...d, bases: d.bases.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-stone-900">Bases por tamanho</h1>
            <p className="text-xs text-stone-500">O que todo copo daquele tamanho leva: copo, tampa, colher e a porção de açaí. Mudou o preço do copo 550? Muda aqui e todos os combos 550 se atualizam.</p>
          </div>
          <Btn onClick={() => atualizar((d) => ({ ...d, bases: [...d.bases, { id: uid(), nome: 'Nova base', itens: [] }] }))}>
            <Plus size={14} /> Nova base
          </Btn>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dados.bases.map((b) => (
            <Card key={b.id}>
              <div className="mb-3 flex items-end gap-3">
                <label className="flex-1 text-xs text-stone-500">Nome<Txt value={b.nome} onChange={(v) => mudarBase(b.id, { nome: v })} className="mt-1 font-semibold" /></label>
                <button
                  type="button"
                  className="mb-2 cursor-pointer text-stone-400 hover:text-rose-600"
                  title="Excluir base"
                  onClick={() => confirm(`Excluir "${b.nome}"? Fichas que usam esta base ficarão com pendência.`) && atualizar((d) => ({ ...d, bases: d.bases.filter((x) => x.id !== b.id) }))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <ReceitaEditor itens={b.itens} onChange={(itens) => mudarBase(b.id, { itens })} />
              <div className="mt-3 rounded-lg bg-[#f7f2fb] px-3 py-2 text-sm text-stone-700">Custo da base: <b>{brl(custoItens(b.itens, dados))}</b></div>
              {b.obs && <p className="mt-2 text-xs text-amber-700">{b.obs}</p>}
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-stone-900">Preparos</h1>
            <p className="text-xs text-stone-500">Receitas feitas na loja e usadas em várias fichas: mousse de ninho, danoninho caseiro, calda de morango. O custo sai por kg pronto.</p>
          </div>
          <Btn onClick={() => atualizar((d) => ({ ...d, preparos: [...d.preparos, { id: uid(), nome: 'Novo preparo', itens: [], rendimento: 1000 }] }))}>
            <Plus size={14} /> Novo preparo
          </Btn>
        </div>
        {dados.preparos.length === 0 ? (
          <Vazio>Nenhum preparo ainda.</Vazio>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dados.preparos.map((p) => {
              const total = custoItens(p.itens, dados);
              return (
                <Card key={p.id}>
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <label className="min-w-48 flex-1 text-xs text-stone-500">Nome<Txt value={p.nome} onChange={(v) => mudarPreparo(p.id, { nome: v })} className="mt-1 font-semibold" /></label>
                    <label className="w-32 text-xs text-stone-500">Rende (g prontos)<Num value={p.rendimento} onChange={(v) => mudarPreparo(p.id, { rendimento: v })} className="mt-1" /></label>
                    <button
                      type="button"
                      className="mb-2 cursor-pointer text-stone-400 hover:text-rose-600"
                      title="Excluir preparo"
                      onClick={() => confirm(`Excluir "${p.nome}"? Fichas que usam este preparo ficarão com pendência.`) && atualizar((d) => ({ ...d, preparos: d.preparos.filter((x) => x.id !== p.id) }))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <ReceitaEditor itens={p.itens} onChange={(itens) => mudarPreparo(p.id, { itens })} excluirPreparo={p.id} />
                  <div className="mt-3 flex flex-wrap justify-between gap-2 rounded-lg bg-[#f7f2fb] px-3 py-2 text-sm text-stone-700">
                    <span>Custo da receita: <b>{brl(total)}</b></span>
                    <span>Custo por kg pronto: <b>{brl(custoUnitPreparo(p.id, dados) * 1000)}</b></span>
                  </div>
                  {p.obs && <p className="mt-2 text-xs text-amber-700">{p.obs}</p>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
