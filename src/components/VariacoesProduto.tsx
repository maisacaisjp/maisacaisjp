import { Check, Minus, Plus } from 'lucide-react';
import type { ExtraIngredient } from '../data/menu';
import type { GrupoEscolha, RegrasProduto } from '../data/variacoes';
import { hapticLight } from '../utils/haptics';

// Escolhas (creme gelado, sabor do milkshake) e adicionais com quantidade,
// com as mesmas regras do Multipedidos. Usado no cardápio do cliente e no PDV.

interface Props {
  regras: RegrasProduto;
  extrasList: ExtraIngredient[];
  escolhas: Record<string, string[]>;
  onEscolhasChange: (v: Record<string, string[]>) => void;
  extras: ExtraIngredient[];
  onExtrasChange: (v: ExtraIngredient[]) => void;
  /** Layout menor, para o PDV. */
  compacto?: boolean;
}

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

export default function VariacoesProduto({
  regras, extrasList, escolhas, onEscolhasChange, extras, onExtrasChange, compacto = false,
}: Props) {
  const tituloCls = compacto
    ? 'text-xs font-bold text-stone-700 uppercase tracking-wide'
    : 'font-bold text-sm uppercase tracking-wide text-gray-800';

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

  return (
    <>
      {regras.escolhas.map(g => {
        const sel = escolhas[g.rotulo] || [];
        const obrigatorio = g.min > 0;
        return (
          <div key={g.rotulo} className={compacto ? 'pt-3 border-t border-stone-100' : 'mb-6'}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={tituloCls}>{g.titulo}:</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${obrigatorio && sel.length < g.min ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                {g.max === 1 ? 'Escolha 1' : `Escolha de ${g.min} a ${g.max}`}{obrigatorio ? ' • obrigatório' : ''} ({sel.length}/{g.max})
              </span>
            </div>
            <div className={compacto ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-2'}>
              {g.opcoes.map(o => {
                const marcado = sel.includes(o.id);
                const bloqueado = !o.disponivel || (!marcado && g.max > 1 && sel.length >= g.max);
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!o.disponivel}
                    onClick={() => !bloqueado && toggleEscolha(g, o.id)}
                    className={`${compacto ? 'p-2 text-xs rounded-lg border' : 'p-3 text-sm rounded-lg border-2'} text-left flex items-center justify-between gap-2 transition-colors ${
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
        <div className={compacto ? 'pt-3 border-t border-stone-100' : 'mb-6'}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={tituloCls}>Adicionais (opcional):</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalAdicionais >= regraAd.max ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
              Até {regraAd.max} ({totalAdicionais}/{regraAd.max})
            </span>
          </div>
          <div className={compacto ? 'grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1' : 'flex flex-col gap-2'}>
            {extrasList.map(extra => {
              const q = qtdDe(extra.id);
              const podeMais = totalAdicionais < regraAd.max && q < regraAd.maxPorItem;
              return (
                <div
                  key={extra.id}
                  className={`${compacto ? 'p-1.5 rounded-lg border text-xs' : 'p-3 rounded-lg border-2 text-sm'} flex items-center justify-between gap-2 transition-colors ${q > 0 ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 bg-white'}`}
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
                          className={`${compacto ? 'w-6 h-6' : 'w-8 h-8'} rounded-full border border-gray-300 bg-white text-[#4d0471] flex items-center justify-center cursor-pointer hover:bg-gray-100`}
                        >
                          <Minus size={compacto ? 12 : 14} />
                        </button>
                        <span className="w-4 text-center font-bold text-stone-900">{q}</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => mudarQtd(extra, 1)}
                      disabled={!podeMais}
                      aria-label={`Adicionar ${extra.name}`}
                      className={`${compacto ? 'w-6 h-6' : 'w-8 h-8'} rounded-full flex items-center justify-center ${podeMais ? 'bg-[#4d0471] text-white cursor-pointer hover:bg-[#3b0257]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      <Plus size={compacto ? 12 : 14} />
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
