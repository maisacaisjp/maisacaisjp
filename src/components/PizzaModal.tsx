import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { CartItem, ProductSize, SIZE_LABELS } from '../types';
import { X, Check, Minus, Plus } from 'lucide-react';
import { useExtras } from '../hooks/useExtras';
import { useCremes } from '../hooks/useCremes';
import { hapticLight } from '../utils/haptics';
import { getSizeOptions, SIZE_DESCRIPTIONS } from '../utils/produto';
import { regrasDoProduto, textoEscolhas, escolhaPendente, escolhasIniciais } from '../data/variacoes';
import { findImageForProduct } from '../utils/imageResolver';
import { brl, nomeBonito, limparDescricao } from '../utils/formatacao';
import VariacoesProduto, { CabecalhoGrupo } from './VariacoesProduto';

interface PizzaModalProps {
  item: MenuItem | null;
  pausedItems?: string[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem, openCart?: boolean) => void;
  initialSize: 'P' | 'M' | 'G';
  allMenuItems: MenuItem[];
}

function fotoDoProduto(item: MenuItem): string {
  let src = item.imageUrl ? item.imageUrl.replace(/^\//, '') : '';
  if (src === 'none') return '';
  if (!src) src = (findImageForProduct(item) || '').replace(/^\//, '');
  if (!src) return '';
  return src.startsWith('http') ? src : `/${src}`;
}

// Montagem do produto no cardápio do cliente: tamanho → sabores → adicionais → observação.
export default function PizzaModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  initialSize,
  pausedItems = [],
}: PizzaModalProps) {
  const extrasList = useExtras();
  useCremes(); // sabores do gestor: re-renderiza quando um sabor é pausado ou ativado
  const [selectedSize, setSelectedSize] = useState<ProductSize>(initialSize);
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [escolhas, setEscolhas] = useState<Record<string, string[]>>({});
  const [avisoEscolha, setAvisoEscolha] = useState('');
  const [grupoPendente, setGrupoPendente] = useState<string | null>(null);
  const [fotoOk, setFotoOk] = useState(true);
  const [barraTopo, setBarraTopo] = useState(false);
  const corpoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      // Abre no tamanho inicial (550ml); se o produto não tiver, no primeiro tamanho que estiver ativo
      const opts = getSizeOptions(item).filter(o => !pausedItems.includes(`${item.id}-${o.pauseKey}`));
      const inicial = opts.find(o => o.size === initialSize) || opts[0];
      setSelectedSize(inicial ? inicial.size : initialSize);
      setSelectedExtras([]);
      setQuantity(1);
      setNotes('');
      setEscolhas(escolhasIniciais(regrasDoProduto(item).escolhas));
      setAvisoEscolha('');
      setGrupoPendente(null);
      setFotoOk(true);
      setBarraTopo(false);
      corpoRef.current?.scrollTo({ top: 0 });
    }
  }, [isOpen, item, initialSize]);

  // ESC fecha e a página de trás não rola enquanto o modal está aberto
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflowAntes;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const sizeOptions = getSizeOptions(item);
  const hasSizes = sizeOptions.length > 0;
  const regras = regrasDoProduto(item);
  const podeAdicionais = regras.adicionais !== null;

  const selectedOption = sizeOptions.find(o => o.size === selectedSize);
  const basePrice = selectedOption ? selectedOption.price : (item.priceSingle || item.priceG || item.priceM || item.priceP || 0);
  const extrasTotalPrice = podeAdicionais ? selectedExtras.reduce((sum, extra) => sum + extra.price, 0) : 0;
  const currentPrice = basePrice + extrasTotalPrice;
  const pendente = escolhaPendente(regras.escolhas, escolhas);
  const menorPreco = hasSizes ? Math.min(...sizeOptions.map(o => o.price)) : basePrice;

  const foto = fotoDoProduto(item);
  const nome = nomeBonito(item.name);
  const descricao = limparDescricao(item.ingredients);

  const handleAdd = () => {
    if (pendente) {
      setAvisoEscolha(`Escolha ${pendente.min === 1 ? 'pelo menos 1 opção' : `pelo menos ${pendente.min} opções`} em "${pendente.titulo}".`);
      setGrupoPendente(pendente.rotulo);
      document.getElementById(`grupo-${pendente.rotulo}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // As escolhas (creme, sabor) vão nas observações do item, antes do que o cliente escreveu
    const obs = [textoEscolhas(regras.escolhas, escolhas), notes.trim()].filter(Boolean).join(' | ');
    onAddToCart({
      id: crypto.randomUUID(),
      menuItem: item,
      quantity,
      size: hasSizes ? selectedSize : undefined,
      extras: podeAdicionais ? selectedExtras : [],
      priceCalculated: currentPrice,
      notes: obs || undefined,
    }, false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="produto-titulo"
    >
      <div className="absolute inset-0 bg-stone-950/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />

      <div className="relative w-full sm:max-w-[520px] h-[94dvh] sm:h-auto sm:max-h-[88vh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-sheet-in sm:animate-pop-in">
        {/* Fechar (sempre visível) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-3 z-30 w-10 h-10 rounded-full bg-white/95 text-stone-700 shadow-md ring-1 ring-black/5 flex items-center justify-center hover:bg-white hover:text-stone-900 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Barra com o nome do produto, aparece ao rolar */}
        <div
          aria-hidden={!barraTopo}
          className={`absolute top-0 inset-x-0 z-20 h-14 pl-5 pr-16 flex items-center bg-white/95 backdrop-blur border-b border-stone-100 transition-opacity duration-200 ${barraTopo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <span className="font-display text-[16px] font-bold text-stone-900 truncate">{nome}</span>
        </div>

        <div
          ref={corpoRef}
          onScroll={(e) => {
            const limiar = foto && fotoOk ? 190 : 24;
            const mostrar = e.currentTarget.scrollTop > limiar;
            if (mostrar !== barraTopo) setBarraTopo(mostrar);
          }}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {/* Foto */}
          {foto && fotoOk ? (
            <div className="relative h-[230px] sm:h-[260px] bg-brand-900 overflow-hidden">
              <img src={foto} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70" />
              <img
                src={foto}
                alt={nome}
                onError={() => setFotoOk(false)}
                className="relative h-full mx-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
              />
              <span className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/70" aria-hidden="true" />
            </div>
          ) : (
            <div className="h-14" />
          )}

          {/* Nome e descrição */}
          <div className="px-5 pt-5 pb-4">
            <h2 id="produto-titulo" className="font-display text-[22px] sm:text-[24px] font-extrabold leading-tight tracking-tight text-stone-900 pr-10">
              {nome}
            </h2>
            {descricao && <p className="mt-2 text-[14px] leading-relaxed text-stone-600">{descricao}</p>}
            <p className="mt-3 text-[13px] text-stone-500">
              {hasSizes && sizeOptions.length > 1 ? 'a partir de ' : ''}
              <span className="font-display text-[17px] font-bold text-stone-900 tabular-nums">{brl(menorPreco)}</span>
            </p>
          </div>

          {/* Tamanho */}
          {hasSizes && (
            <section>
              <CabecalhoGrupo titulo="Escolha o tamanho" subtitulo="Escolha 1 opção" obrigatorio completo={!!selectedOption} />
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {sizeOptions.map(opt => {
                  const paused = pausedItems.includes(`${item.id}-${opt.pauseKey}`);
                  const selected = selectedSize === opt.size;
                  return (
                    <button
                      key={opt.size}
                      type="button"
                      onClick={() => { hapticLight(); setSelectedSize(opt.size); }}
                      disabled={paused}
                      aria-pressed={selected}
                      className={`relative text-left rounded-2xl px-3.5 py-3 min-h-[76px] transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${
                        paused
                          ? 'bg-stone-50 ring-1 ring-stone-200 opacity-60'
                          : selected
                            ? 'bg-brand-50 ring-2 ring-brand-700'
                            : 'bg-white ring-1 ring-stone-200 hover:ring-stone-300'
                      }`}
                    >
                      <span className="block font-display text-[15px] font-bold text-stone-900 leading-tight pr-5">
                        {opt.size === 'Super Big' ? 'Pote 1 Litro' : SIZE_LABELS[opt.size]}
                      </span>
                      <span className="block text-[12px] text-stone-500 mt-0.5">
                        {paused ? 'Esgotado' : SIZE_DESCRIPTIONS[opt.size] || (opt.size === 'Super Big' ? 'Recheado' : '')}
                      </span>
                      <span className={`block mt-1.5 text-[14px] font-semibold tabular-nums ${selected ? 'text-brand-700' : 'text-stone-800'}`}>
                        {brl(opt.price)}
                      </span>
                      {selected && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sabores (casadinho) e adicionais */}
          <VariacoesProduto
            regras={regras}
            extrasList={extrasList || []}
            escolhas={escolhas}
            onEscolhasChange={(v) => { setEscolhas(v); setAvisoEscolha(''); setGrupoPendente(null); }}
            extras={selectedExtras}
            onExtrasChange={setSelectedExtras}
            grupoPendente={grupoPendente}
          />

          {/* Observação */}
          <section>
            <CabecalhoGrupo titulo="Alguma observação?" subtitulo="Opcional" />
            <div className="px-5 py-4">
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder={podeAdicionais ? 'Ex.: sem granola, leite condensado no fundo...' : 'Ex.: bem gelado, sem canudo...'}
                className="w-full p-3.5 text-[16px] leading-relaxed bg-stone-50 rounded-2xl ring-1 ring-stone-200 focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition resize-none placeholder:text-stone-400"
              />
              <p className="mt-1.5 text-right text-[12px] text-stone-400 tabular-nums">{notes.length}/250</p>
            </div>
          </section>
        </div>

        {/* Rodapé fixo: quantidade + adicionar */}
        <div className="shrink-0 border-t border-stone-100 bg-white px-4 pt-3 pb-safe">
          {avisoEscolha && (
            <p role="alert" className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-900 text-[13px] font-medium animate-fade-in">
              {avisoEscolha}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center h-[52px] rounded-2xl ring-1 ring-stone-200 bg-white">
              <button
                type="button"
                onClick={() => { hapticLight(); setQuantity(Math.max(1, quantity - 1)); }}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="w-11 h-full flex items-center justify-center text-brand-700 disabled:text-stone-300 cursor-pointer disabled:cursor-default"
              >
                <Minus className="w-[18px] h-[18px]" strokeWidth={2.5} />
              </button>
              <span className="w-7 text-center font-display text-[17px] font-bold tabular-nums text-stone-900" aria-live="polite">{quantity}</span>
              <button
                type="button"
                onClick={() => { hapticLight(); setQuantity(quantity + 1); }}
                aria-label="Aumentar quantidade"
                className="w-11 h-full flex items-center justify-center text-brand-700 cursor-pointer"
              >
                <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 h-[52px] rounded-2xl bg-brand-700 hover:bg-brand-800 active:scale-[0.99] text-white px-5 flex items-center justify-between gap-3 shadow-[0_8px_20px_rgba(77,4,113,0.28)] transition cursor-pointer"
            >
              <span className="text-[15px] font-semibold">Adicionar</span>
              <span className="font-display text-[16px] font-bold tabular-nums">{brl(currentPrice * quantity)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
