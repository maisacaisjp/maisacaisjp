import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { custoItens, custoUnitPreparo } from '../calc';
import { brl, uid } from '../format';
import { ReceitaEditor } from '../ReceitaEditor';
import { useDados } from '../store';
import type { Base, Preparo } from '../types';
import { Btn, Card, Num, Txt, Vazio } from '../ui';

// Bases por tamanho e preparos: lista à esquerda, editor do item escolhido à direita (cabe na tela).
export default function Preparos() {
  const { dados, atualizar } = useDados();
  const [sel, setSel] = useState<string>(() => dados.bases[0]?.id ?? dados.preparos[0]?.id ?? '');
  const mudarPreparo = (id: string, patch: Partial<Preparo>) =>
    atualizar((d) => ({ ...d, preparos: d.preparos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const mudarBase = (id: string, patch: Partial<Base>) =>
    atualizar((d) => ({ ...d, bases: d.bases.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const base = dados.bases.find((b) => b.id === sel);
  const preparo = !base ? dados.preparos.find((p) => p.id === sel) : undefined;
  const escolhido = base ?? preparo ?? dados.bases[0];
  const ehBase = !!dados.bases.find((b) => b.id === escolhido?.id);

  const item = (id: string, nome: string, valor: string) => (
    <li key={id}>
      <button
        type="button"
        onClick={() => setSel(id)}
        aria-current={escolhido?.id === id ? 'true' : undefined}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 h-9 text-left text-[13px] transition-colors cursor-pointer ${
          escolhido?.id === id ? 'bg-[#f5eefa] text-[#3b0257] font-semibold' : 'text-stone-700 hover:bg-stone-50'
        }`}
      >
        <span className="truncate">{nome}</span>
        <span className="fin-num shrink-0 text-stone-500">{valor}</span>
      </button>
    </li>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
      <Card>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-sm font-bold text-stone-900">Bases por tamanho</h2>
          <button
            type="button"
            className="text-[12px] font-semibold text-[#6a2092] hover:underline cursor-pointer flex items-center gap-1"
            onClick={() => {
              const id = uid();
              atualizar((d) => ({ ...d, bases: [...d.bases, { id, nome: 'Nova base', itens: [] }] }));
              setSel(id);
            }}
          >
            <Plus size={13} /> Nova
          </button>
        </div>
        <p className="text-[12px] text-stone-500 mb-2 adm-compactavel-esconder">Copo, tampa, colher e açaí de cada tamanho. Mudou aqui, todos os combos daquele tamanho se atualizam.</p>
        <ul className="space-y-0.5">{dados.bases.map((b) => item(b.id, b.nome, brl(custoItens(b.itens, dados))))}</ul>

        <div className="flex items-center justify-between gap-2 mt-4 mb-1 pt-3 border-t border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">Preparos</h2>
          <button
            type="button"
            className="text-[12px] font-semibold text-[#6a2092] hover:underline cursor-pointer flex items-center gap-1"
            onClick={() => {
              const id = uid();
              atualizar((d) => ({ ...d, preparos: [...d.preparos, { id, nome: 'Novo preparo', itens: [], rendimento: 1000 }] }));
              setSel(id);
            }}
          >
            <Plus size={13} /> Novo
          </button>
        </div>
        <p className="text-[12px] text-stone-500 mb-2 adm-compactavel-esconder">Receitas feitas na loja (mousse, danoninho caseiro, calda). O custo sai por kg pronto.</p>
        {dados.preparos.length === 0 ? (
          <p className="text-[13px] text-stone-400 px-2.5 py-1">Nenhum preparo ainda.</p>
        ) : (
          <ul className="space-y-0.5">{dados.preparos.map((p) => item(p.id, p.nome, `${brl(custoUnitPreparo(p.id, dados) * 1000)}/kg`))}</ul>
        )}
      </Card>

      {!escolhido ? (
        <Vazio>Crie uma base ou um preparo para começar.</Vazio>
      ) : ehBase ? (
        <Card key={escolhido.id}>
          <div className="mb-3 flex items-end gap-3">
            <label className="flex-1 text-xs text-stone-500">Nome da base<Txt value={escolhido.nome} onChange={(v) => mudarBase(escolhido.id, { nome: v })} className="mt-1 font-semibold" /></label>
            <button
              type="button"
              className="mb-2 cursor-pointer text-stone-400 hover:text-rose-600"
              title="Excluir base"
              onClick={() => confirm(`Excluir "${escolhido.nome}"? Fichas que usam esta base ficarão com pendência.`) && atualizar((d) => ({ ...d, bases: d.bases.filter((x) => x.id !== escolhido.id) }))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <ReceitaEditor itens={(escolhido as Base).itens} onChange={(itens) => mudarBase(escolhido.id, { itens })} />
          <div className="mt-3 rounded-lg bg-[#f7f2fb] px-3 py-2 text-sm text-stone-700">Custo da base: <b>{brl(custoItens((escolhido as Base).itens, dados))}</b></div>
          {(escolhido as Base).obs && <p className="mt-2 text-xs text-amber-700">{(escolhido as Base).obs}</p>}
        </Card>
      ) : (
        (() => {
          const p = escolhido as Preparo;
          const total = custoItens(p.itens, dados);
          return (
            <Card key={p.id}>
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <label className="min-w-48 flex-1 text-xs text-stone-500">Nome do preparo<Txt value={p.nome} onChange={(v) => mudarPreparo(p.id, { nome: v })} className="mt-1 font-semibold" /></label>
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
        })()
      )}
    </div>
  );
}
