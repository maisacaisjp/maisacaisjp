import { Check, Minus, Plus } from 'lucide-react';
import type { ExtraIngredient } from '../data/menu';
import type { GrupoEscolha, RegrasProduto } from '../data/variacoes';
import { hapticLight } from '../utils/haptics';
import { brl as brlCliente } from '../utils/formatacao';

// Escolhas (creme gelado, sabor do milkshake) e adicionais com quantidade,
// com as mesmas regras do Multipedidos. Usado no cardápio do cliente e no PDV (compacto).

interface Props {
  regras: RegrasProduto;
  extrasList: ExtraIngredient[];
  escolhas: Record<string, string[]>;
  onEscolhasChange: (v: Record<string, string[]>) => void;
  extras: ExtraIngredient[];
  onExtrasChange: (v: ExtraIngredient[]) => void;
  /** Layout menor, para o PDV. */
  compacto?: boolean;
  /** Grupo obrigatório que o cliente ainda não escolheu (fica destacado). */
  grupoPendente?: string | null;
}

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

/** Faixa de título de cada etapa do produto no cardápio do cliente. */
export function CabecalhoGrupo({
  titulo, subtitulo, obrigatorio = false, completo = false, contador, alerta = false,
}: {
  titulo: string;
  subtitulo?: string;
  obrigatorio?: boolean;
  completo?: boolean;
  contador?: string;
  alerta?: boolean;
}) {
  return (
    <div className={`sticky top-14 z-10 px-5 py-3 flex items-center justify-between gap-3 transition-colors ${alerta ? 'bg-amber-50' : 'bg-stone-100'}`}>
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold text-stone-900 leading-tight">{titulo}</h3>
        {(subtitulo || contador) && (
          <p className={`text-[12.5px] mt-0.5 ${alerta ? 'text-amber-800 font-medium' : 'text-stone-500'}`}>
            {subtitulo}{subtitulo && contador ? ' · ' : ''}{contador}
          </p>
        )}
      </div>
      {obrigatorio && (
        completo ? (
          <span className="shrink-0 w-6 h-6 rounded-full bg-leaf text-white flex items-center justify-center" aria-label="Escolhido">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        ) : (
          <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${alerta ? 'bg-amber-500 text-white' : 'bg-stone-800 text-white'}`}>
            Obrigatório
          </span>
        )
      )}
    </div>
  );
}

export default function VariacoesProduto({
  regras, extrasList, escolhas, onEscolhasChange, extras, onExtrasChange, compacto = false, grupoPendente = null,
}: Props) {
  const toggleEscolha = (g: GrupoEscolha, id: string) => {
    hapticLight();
    const atual = escolhas[g.rotulo] || [];
    let novo: string[];
    if (atual.includes(id)) novo = atual.filter(x => x !== id);
    else if (g.max === 1) novo = [id];
    else if (atual.length >= g.max) return;
    else novo = [...atual, id];
    onEscolhasChange({ ...escolhas, [g.rotulo]: novo });
  };

  const qtdDe = (id: string) => extras.filter(e => e.id === id).length;
  const totalAdicionais = extras.length;
  const regraAd = regras.adicionais;

  const mudarQtd = (extra: ExtraIngredient, delta: number) => {
    if (!regraAd) return;
    hapticLight();
    if (delta > 0) {
      if (totalAdicionais >= regraAd.max || qtdDe(extra.id) >= regraAd.maxPorItem) return;
      onExtrasChange([...extras, extra]);
    } else {
      const idx = extras.map(e => e.id).lastIndexOf(extra.id);
      if (idx < 0) return;
      onExtrasChange(extras.filter((_, i) => i !== idx));
    }
  };

  // ==========================================================================
  // Cardápio do cliente
  // ==========================================================================
  if (!compacto) {
    return (
      <>
        {regras.escolhas.map(g => {
          const sel = escolhas[g.rotulo] || [];
          const obrigatorio = g.min > 0;
          const alerta = grupoPendente === g.rotulo && sel.length < g.min;
          const regra = g.max === 1 ? 'Escolha 1 opção' : g.min > 0 ? `Escolha de ${g.min} a ${g.max}` : `Escolha até ${g.max}`;
          return (
            <section key={g.rotulo} id={`grupo-${g.rotulo}`} className="scroll-mt-14">
              <CabecalhoGrupo
                titulo={g.titulo}
                subtitulo={regra}
                contador={g.max > 1 ? `${sel.length}/${g.max}` : undefined}
                obrigatorio={obrigatorio}
                completo={sel.length >= g.min}
                alerta={alerta}
              />
              <div className="px-5 py-4">
                {g.dica && (
                  <p className="mb-3 flex items-start gap-2 text-[13px] leading-snug text-brand-700 bg-brand-50 rounded-xl px-3 py-2.5">
                    <span aria-hidden="true">💜</span>
                    <span>{g.dica}</span>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {g.opcoes.map(o => {
                    const marcado = sel.includes(o.id);
                    const cheio = !marcado && g.max > 1 && sel.length >= g.max;
                    const bloqueado = !o.disponivel || cheio;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={!o.disponivel}
                        aria-pressed={marcado}
                        onClick={() => !bloqueado && toggleEscolha(g, o.id)}
                        className={`relative text-left rounded-2xl px-3.5 py-3 min-h-[60px] flex items-center gap-2.5 transition-all duration-150 ${
                          !o.disponivel
                            ? 'bg-stone-50 ring-1 ring-stone-200 opacity-55 cursor-not-allowed'
                            : marcado
                              ? 'bg-brand-50 ring-2 ring-brand-700 cursor-pointer'
                              : cheio
                                ? 'bg-white ring-1 ring-stone-200 opacity-50 cursor-not-allowed'
                                : 'bg-white ring-1 ring-stone-200 hover:ring-stone-300 cursor-pointer'
                        }`}
                      >
                        <span className={`shrink-0 w-5 h-5 flex items-center justify-center border-2 transition-colors ${g.max === 1 ? 'rounded-full' : 'rounded-md'} ${marcado ? 'bg-brand-700 border-brand-700' : 'border-stone-300 bg-white'}`}>
                          {marcado && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-semibold text-stone-900 leading-snug">
                            {o.nome.charAt(0) + o.nome.slice(1).toLowerCase()}
                          </span>
                          {!o.disponivel ? (
                            <span className="block text-[11.5px] text-stone-500 mt-0.5">Indisponível</span>
                          ) : o.destaque ? (
                            <span className="block text-[11.5px] text-brand-600 mt-0.5">{o.destaque}</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        {regraAd && extrasList.length > 0 && (
          <section>
            <CabecalhoGrupo
              titulo="Adicionais"
              subtitulo={`Opcional · até ${regraAd.max}`}
              contador={`${totalAdicionais}/${regraAd.max}`}
            />
            <ul className="px-5 divide-y divide-stone-100">
              {extrasList.map(extra => {
                const q = qtdDe(extra.id);
                const podeMais = totalAdicionais < regraAd.max && q < regraAd.maxPorItem;
                return (
                  <li key={extra.id} className="flex items-center justify-between gap-3 py-3 min-h-[64px]">
                    <button
                      type="button"
                      onClick={() => podeMais && mudarQtd(extra, 1)}
                      className={`min-w-0 flex-1 text-left ${podeMais ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`block text-[14px] leading-snug ${q > 0 ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
                        {extra.name.charAt(0) + extra.name.slice(1).toLowerCase()}
                      </span>
                      <span className="block text-[13px] text-stone-500 mt-0.5 tabular-nums">+ {brlCliente(extra.price)}</span>
                    </button>
                    <div className={`flex items-center shrink-0 rounded-full transition-colors ${q > 0 ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}>
                      {q > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => mudarQtd(extra, -1)}
                            aria-label={`Tirar ${extra.name}`}
                            className="w-10 h-10 rounded-full text-brand-700 flex items-center justify-center hover:bg-brand-100 cursor-pointer"
                          >
                            <Minus className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                          <span className="w-5 text-center font-display text-[15px] font-bold text-stone-900 tabular-nums">{q}</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => mudarQtd(extra, 1)}
                        disabled={!podeMais}
                        aria-label={`Adicionar ${extra.name}`}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                          podeMais
                            ? q > 0
                              ? 'text-brand-700 hover:bg-brand-100 cursor-pointer'
                              : 'bg-white ring-1 ring-stone-200 text-brand-700 hover:ring-brand-300 cursor-pointer'
                            : 'text-stone-300 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </>
    );
  }

  // ==========================================================================
  // PDV (compacto) — layout original, sem mudança
  // ==========================================================================
  const tituloCls = 'text-xs font-bold text-stone-700 uppercase tracking-wide';

  return (
    <>
      {regras.escolhas.map(g => {
        const sel = escolhas[g.rotulo] || [];
        const obrigatorio = g.min > 0;
        return (
          <div key={g.rotulo} className="pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className={tituloCls}>{g.titulo}:</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${obrigatorio && sel.length < g.min ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                {g.max === 1 ? 'Escolha 1' : `Escolha de ${g.min} a ${g.max}`}{obrigatorio ? ' • obrigatório' : ''} ({sel.length}/{g.max})
              </span>
            </div>
            {g.dica && <p className="text-[10px] text-[#4d0471] font-medium -mt-1 mb-2">{g.dica}</p>}
            <div className="grid grid-cols-2 gap-1.5">
              {g.opcoes.map(o => {
                const marcado = sel.includes(o.id);
                const bloqueado = !o.disponivel || (!marcado && g.max > 1 && sel.length >= g.max);
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!o.disponivel}
                    onClick={() => !bloqueado && toggleEscolha(g, o.id)}
                    className={`p-2 text-xs rounded-lg border text-left flex items-center justify-between gap-2 transition-colors ${
                      !o.disponivel
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                        : marcado
                          ? 'border-[#4d0471] bg-[#4d0471]/5 cursor-pointer'
                          : bloqueado
                            ? 'border-gray-200 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 cursor-pointer bg-white'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-stone-900 block truncate">{o.nome}</span>
                      {!o.disponivel ? (
                        <span className="text-[10px] text-gray-500">Indisponível</span>
                      ) : o.destaque ? (
                        <span className="text-[10px] text-[#4d0471]">{o.destaque}</span>
                      ) : null}
                    </span>
                    <span className={`w-4 h-4 shrink-0 border flex items-center justify-center ${g.max === 1 ? 'rounded-full' : 'rounded'} ${marcado ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                      {marcado && <Check className="w-3 h-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {regraAd && extrasList.length > 0 && (
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className={tituloCls}>Adicionais (opcional):</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalAdicionais >= regraAd.max ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
              Até {regraAd.max} ({totalAdicionais}/{regraAd.max})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {extrasList.map(extra => {
              const q = qtdDe(extra.id);
              const podeMais = totalAdicionais < regraAd.max && q < regraAd.maxPorItem;
              return (
                <div
                  key={extra.id}
                  className={`p-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${q > 0 ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() => podeMais && mudarQtd(extra, 1)}
                    className={`min-w-0 text-left flex-1 ${podeMais ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="font-medium text-stone-900 block truncate">{extra.name}</span>
                    <span className="text-[#4d0471] font-bold">+ {brl(extra.price)}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {q > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => mudarQtd(extra, -1)}
                          aria-label={`Tirar ${extra.name}`}
                          className="w-6 h-6 rounded-full border border-gray-300 bg-white text-[#4d0471] flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-4 text-center font-bold text-stone-900">{q}</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => mudarQtd(extra, 1)}
                      disabled={!podeMais}
                      aria-label={`Adicionar ${extra.name}`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${podeMais ? 'bg-[#4d0471] text-white cursor-pointer hover:bg-[#3b0257]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
