import { AlertTriangle, Copy, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ROTULO_TAMANHO, custoFicha, pendenciasFicha, tamanhoRef, tamanhosDa } from '../calc';
import { brl, norm, pct, uid } from '../format';
import { ReceitaEditor } from '../ReceitaEditor';
import { useDados } from '../store';
import type { AdicionalCardapio, Ficha, ProdutoCardapio } from '../types';
import { Btn, Card, Num, Sel, Selo, Txt, Vazio, tomCmv } from '../ui';
import { Paginacao, useListaQueCabe } from '../../components/admin/ui';

const ehCopo = (p: ProdutoCardapio) => Boolean(p.price_p || p.price_m || p.price_g);

export function precosDoCardapio(p: ProdutoCardapio, tipo: Ficha['tipo']): Ficha['precos'] {
  if (tipo === 'copo') return { P: p.price_p ?? undefined, M: p.price_m ?? undefined, G: p.price_g ?? undefined };
  return { U: p.price_single ?? undefined };
}

export function novaFichaDe(p: ProdutoCardapio | null, bases: { id: string }[]): Ficha {
  const tipo: Ficha['tipo'] = p && ehCopo(p) ? 'copo' : 'unico';
  const tem = (id: string) => bases.some((b) => b.id === id);
  const baseIds: Ficha['baseIds'] =
    tipo === 'copo'
      ? { P: tem('base-p') ? 'base-p' : undefined, M: tem('base-m') ? 'base-m' : undefined, G: tem('base-g') ? 'base-g' : undefined }
      : {};
  return {
    id: uid(),
    nome: p?.name ?? 'Nova ficha',
    produtoId: p?.id,
    categoria: p?.category ?? 'outros',
    tipo,
    baseIds,
    recheio: [],
    precos: p ? precosDoCardapio(p, tipo) : {},
  };
}

export function novaFichaDeAdicional(a: AdicionalCardapio): Ficha {
  return { id: uid(), nome: a.name, produtoId: `extra:${a.id}`, categoria: 'Adicionais', tipo: 'adicional', baseIds: {}, recheio: [], precos: { U: Number(a.price) || 0 } };
}

type Grupo = 'todas' | 'combos' | 'adicionais' | 'outros';
const GRUPOS: Array<{ id: Grupo; rotulo: string }> = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'combos', rotulo: 'Combos' },
  { id: 'adicionais', rotulo: 'Adicionais' },
  { id: 'outros', rotulo: 'Outros' },
];

export default function Fichas() {
  const { dados, atualizar, cardapio, adicionais, cardapioErro, fichaSel, setFichaSel } = useDados();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<Grupo>('todas');

  const fichas = useMemo(
    () =>
      dados.fichas
        .filter((f) => !busca || norm(f.nome).includes(norm(busca)))
        .filter((f) => grupo === 'todas' || (grupo === 'combos' ? f.tipo === 'copo' : grupo === 'adicionais' ? f.tipo === 'adicional' : f.tipo === 'unico'))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { numeric: true })),
    [dados.fichas, busca, grupo],
  );
  // Lista da esquerda: só as fichas que cabem na tela, com páginas
  const pagLista = useListaQueCabe(fichas, 34, { reserva: 210, resetar: [busca, grupo] });
  const sel = dados.fichas.find((f) => f.id === fichaSel) ?? null;
  useEffect(() => {
    if (!sel && dados.fichas.length) setFichaSel(dados.fichas[0].id);
  }, [sel, dados.fichas, setFichaSel]);

  const comFicha = new Set(dados.fichas.map((f) => f.produtoId).filter(Boolean));
  const produtosSemFicha = cardapio.filter((p) => !comFicha.has(p.id));
  const adicionaisSemFicha = adicionais.filter((a) => !comFicha.has(`extra:${a.id}`));
  const total = cardapio.length + adicionais.length;

  const criar = (f: Ficha) => {
    atualizar((d) => ({ ...d, fichas: [...d.fichas, f] }));
    setFichaSel(f.id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit">
        <div className="mb-3 space-y-2">
          <h2 className="text-sm font-bold text-stone-900">
            Fichas <span className="text-xs font-normal text-stone-500">({dados.fichas.length}{total ? ` de ${total} itens` : ''})</span>
          </h2>
          <label className="relative block">
            <Search size={14} className="absolute left-2 top-2.5 text-stone-400" />
            <Txt value={busca} onChange={setBusca} placeholder="Buscar ficha" className="pl-7" />
          </label>
          <div className="flex flex-wrap gap-1 text-xs">
            {GRUPOS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGrupo(g.id)}
                className={`cursor-pointer rounded-full px-2.5 py-1 ${grupo === g.id ? 'bg-[#6a2092] font-semibold text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {g.rotulo}
              </button>
            ))}
          </div>
        </div>
        <ul ref={pagLista.ref} className="space-y-0.5">
          {pagLista.itens.map((f) => {
            const t = tamanhoRef(f);
            const c = custoFicha(f, t, dados).total;
            const preco = f.precos[t] ?? 0;
            const cmv = preco ? c / preco : NaN;
            const pend = pendenciasFicha(f, dados).length;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setFichaSel(f.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 h-8 text-left text-[13px] ${f.id === fichaSel ? 'bg-[#f5eefa] font-semibold text-[#4d0471]' : 'hover:bg-stone-50'}`}
                >
                  <span className="truncate">{f.nome}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {pend > 0 && <span title={`${pend} pendência(s)`}><AlertTriangle size={13} className="text-amber-500" /></span>}
                    <Selo tom={tomCmv(cmv, dados.config.cmvMeta)}>{pct(cmv)}</Selo>
                  </span>
                </button>
              </li>
            );
          })}
          {!fichas.length && <li className="py-4 text-center text-sm text-stone-400">{dados.fichas.length ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha ainda'}</li>}
        </ul>
        {fichas.length > 0 && <Paginacao {...pagLista.paginacao} rotulo="fichas" compacto className="mt-2" />}
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          <div className="text-xs font-medium text-stone-500">Nova ficha a partir do cardápio</div>
          {cardapioErro ? (
            <p className="text-xs text-rose-600">Não consegui ler o cardápio: {cardapioErro}</p>
          ) : (
            <select
              className="fin-campo"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith('extra:')) {
                  const a = adicionais.find((x) => `extra:${x.id}` === v);
                  if (a) criar(novaFichaDeAdicional(a));
                } else {
                  const p = cardapio.find((x) => x.id === v);
                  if (p) criar(novaFichaDe(p, dados.bases));
                }
              }}
            >
              <option value="">Escolher item sem ficha ({produtosSemFicha.length + adicionaisSemFicha.length})</option>
              {produtosSemFicha.length > 0 && (
                <optgroup label="Produtos">
                  {produtosSemFicha.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              {adicionaisSemFicha.length > 0 && (
                <optgroup label="Adicionais">
                  {adicionaisSemFicha.map((a) => <option key={a.id} value={`extra:${a.id}`}>{a.name}</option>)}
                </optgroup>
              )}
            </select>
          )}
          <Btn variante="neutro" className="w-full justify-center" onClick={() => criar(novaFichaDe(null, dados.bases))}><Plus size={14} /> Ficha avulsa</Btn>
        </div>
      </Card>

      {sel ? <EditorFicha key={sel.id} ficha={sel} /> : <Vazio>Escolha ou crie uma ficha.</Vazio>}
    </div>
  );
}

function EditorFicha({ ficha }: { ficha: Ficha }) {
  const { dados, atualizar, cardapio, adicionais, setFichaSel } = useDados();
  const mudar = (patch: Partial<Ficha>) => atualizar((d) => ({ ...d, fichas: d.fichas.map((x) => (x.id === ficha.id ? { ...x, ...patch } : x)) }));
  const tams = tamanhosDa(ficha);
  const produto = cardapio.find((p) => p.id === ficha.produtoId);
  const adicional = adicionais.find((a) => `extra:${a.id}` === ficha.produtoId);
  const pend = pendenciasFicha(ficha, dados);
  const meta = dados.config.cmvMeta / 100;
  const opcoesBase = [{ value: '', label: '— sem base —' }, ...dados.bases.map((b) => ({ value: b.id, label: b.nome }))];
  const precosAtuais: Ficha['precos'] | null = produto ? precosDoCardapio(produto, ficha.tipo) : adicional ? { U: Number(adicional.price) || 0 } : null;
  const precoDiferente = precosAtuais && tams.some((t) => (precosAtuais[t] ?? 0) !== (ficha.precos[t] ?? 0));

  return (
    <div className="min-w-0 space-y-3">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_240px_170px]">
          <label className="text-xs text-stone-500">Nome<Txt value={ficha.nome} onChange={(v) => mudar({ nome: v })} className="mt-1 text-base font-semibold" /></label>
          <label className="text-xs text-stone-500">
            Item do cardápio
            <select
              className="fin-campo mt-1"
              value={ficha.produtoId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return mudar({ produtoId: undefined });
                if (v.startsWith('extra:')) {
                  const a = adicionais.find((x) => `extra:${x.id}` === v);
                  return mudar({ produtoId: v, tipo: 'adicional', categoria: 'Adicionais', precos: { U: Number(a?.price) || 0 } });
                }
                const p = cardapio.find((x) => x.id === v);
                if (p) mudar({ produtoId: v, categoria: p.category, precos: precosDoCardapio(p, ficha.tipo) });
              }}
            >
              <option value="">— não vinculado —</option>
              <optgroup label="Produtos">{cardapio.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
              <optgroup label="Adicionais">{adicionais.map((a) => <option key={a.id} value={`extra:${a.id}`}>{a.name}</option>)}</optgroup>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Tipo
            <Sel
              className="mt-1"
              value={ficha.tipo}
              onChange={(v) => {
                const tipo = v as Ficha['tipo'];
                mudar({ tipo, ...(produto ? { precos: precosDoCardapio(produto, tipo) } : {}) });
              }}
              opcoes={[
                { value: 'copo', label: 'Combo (330/440/550ml)' },
                { value: 'unico', label: 'Tamanho único' },
                { value: 'adicional', label: 'Adicional' },
              ]}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ficha.obs !== undefined ? (
            <label className="flex-1 min-w-56">
              <span className="sr-only">Observações</span>
              <Txt value={ficha.obs} onChange={(v) => mudar({ obs: v })} placeholder="Observações da ficha" />
            </label>
          ) : (
            <Btn variante="link" onClick={() => mudar({ obs: '' })}>+ adicionar observação</Btn>
          )}
          <Btn
            variante="neutro"
            onClick={() => {
              const copia: Ficha = { ...structuredClone(ficha), id: uid(), nome: `${ficha.nome} (cópia)`, produtoId: undefined };
              copia.recheio = copia.recheio.map((it) => ({ ...it, id: uid() }));
              atualizar((d) => ({ ...d, fichas: [...d.fichas, copia] }));
              setFichaSel(copia.id);
            }}
          >
            <Copy size={14} /> Duplicar
          </Btn>
          <Btn
            variante="perigo"
            onClick={() => {
              if (!confirm(`Excluir a ficha "${ficha.nome}"?`)) return;
              atualizar((d) => ({ ...d, fichas: d.fichas.filter((x) => x.id !== ficha.id) }));
              setFichaSel(null);
            }}
          >
            <Trash2 size={14} /> Excluir
          </Btn>
        </div>
      </Card>

      <Card
        titulo="Custo e preço por tamanho"
        acoes={precoDiferente && precosAtuais ? (
          <Btn variante="neutro" onClick={() => mudar({ precos: precosAtuais })}><RefreshCw size={13} /> Usar preços atuais do cardápio</Btn>
        ) : undefined}
      >
        <div className={`grid gap-3 ${tams.length > 1 ? 'md:grid-cols-3' : 'md:max-w-sm'}`}>
          {tams.map((t) => {
            const c = custoFicha(ficha, t, dados);
            const preco = ficha.precos[t] ?? 0;
            const cmv = preco ? c.total / preco : NaN;
            return (
              <div key={t} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#4d0471]">{t === 'U' ? 'Tamanho único' : `Copo ${ROTULO_TAMANHO[t]}`}</span>
                  <Selo tom={tomCmv(cmv, dados.config.cmvMeta)}>CMV {pct(cmv)}</Selo>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <label className="block text-[11px] text-stone-500">Preço (R$)<Num value={preco} onChange={(v) => mudar({ precos: { ...ficha.precos, [t]: v } })} className="mt-0.5" /></label>
                  <label className="block text-[11px] text-stone-500">Base do copo<Sel value={ficha.baseIds[t] ?? ''} onChange={(v) => mudar({ baseIds: { ...ficha.baseIds, [t]: v || undefined } })} opcoes={opcoesBase} className="mt-0.5" /></label>
                </div>
                <dl className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between text-stone-500"><dt>Base + complementos</dt><dd className="tabular-nums">{brl(c.base)} + {brl(c.recheio)}</dd></div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold text-stone-900"><dt>Custo total</dt><dd className="tabular-nums">{brl(c.total)}</dd></div>
                  <div className="flex justify-between font-semibold text-emerald-700"><dt>Lucro bruto</dt><dd className="tabular-nums">{preco ? brl(preco - c.total) : '—'}</dd></div>
                  <div className="flex justify-between text-stone-500" title={`Preço para o CMV ficar em ${dados.config.cmvMeta}%`}><dt>Preço p/ CMV {dados.config.cmvMeta}%</dt><dd className="tabular-nums">{brl(c.total / meta)}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-stone-400 adm-compactavel-esconder">CMV = custo dos ingredientes e embalagens ÷ preço de venda. Meta: até {dados.config.cmvMeta}% (verde). Lucro bruto ainda não desconta custos fixos.</p>
      </Card>

      <Card titulo={ficha.tipo === 'copo' ? 'Complementos (quantidades por copo)' : 'Composição'}>
        <ReceitaEditor itens={ficha.recheio} onChange={(recheio) => mudar({ recheio })} porTamanho={ficha.tipo === 'copo'} />
      </Card>

      {pend.length > 0 && (
        <Card titulo="O que falta conferir">
          <ul className="flex flex-wrap gap-1.5">
            {pend.map((p) => <li key={p}><Selo tom="alerta">{p}</Selo></li>)}
          </ul>
        </Card>
      )}
      {produto && ehCopo(produto) && ficha.tipo !== 'copo' && <p className="text-xs text-amber-700">Este produto tem preços por tamanho no cardápio, mas a ficha está como tamanho único.</p>}
    </div>
  );
}
