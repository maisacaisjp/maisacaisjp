import React, { useState, useEffect } from 'react';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { CartItem, ProductSize, SIZE_LABELS } from '../types';
import { X, Check, ShoppingBag } from 'lucide-react';
import { useExtras } from '../hooks/useExtras';
import { hapticLight } from '../utils/haptics';
import { getSizeOptions, SIZE_DESCRIPTIONS } from '../utils/produto';
import { regrasDoProduto, textoEscolhas, escolhaPendente } from '../data/variacoes';
import VariacoesProduto from './VariacoesProduto';

interface PizzaModalProps {
  item: MenuItem | null;
  pausedItems?: string[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem, openCart?: boolean) => void;
  initialSize: 'P' | 'M' | 'G';
  allMenuItems: MenuItem[];
}

export default function PizzaModal({ 
  item, 
  isOpen, 
  onClose, 
  onAddToCart, 
  initialSize, 
  pausedItems = [], 
  allMenuItems = [] 
}: PizzaModalProps) {
  const extrasList = useExtras();
  const [selectedSize, setSelectedSize] = useState<ProductSize>(initialSize);
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [escolhas, setEscolhas] = useState<Record<string, string[]>>({});
  const [avisoEscolha, setAvisoEscolha] = useState('');

  useEffect(() => {
    if (isOpen && item) {
       // Abre no tamanho inicial (550ml); se o produto não tiver, no primeiro tamanho que estiver ativo
       const opts = getSizeOptions(item).filter(o => !pausedItems.includes(`${item.id}-${o.pauseKey}`));
       const inicial = opts.find(o => o.size === initialSize) || opts[0];
       setSelectedSize(inicial ? inicial.size : initialSize);
       setSelectedExtras([]);
       setQuantity(1);
       setNotes('');
       setEscolhas({});
       setAvisoEscolha('');
    }
  }, [isOpen, item, initialSize]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const sizeOptions = getSizeOptions(item);
  const hasSizes = sizeOptions.length > 0;
  const regras = regrasDoProduto(item);
  const podeAdicionais = regras.adicionais !== null;

  // Preço base conforme o tamanho selecionado
  const selectedOption = sizeOptions.find(o => o.size === selectedSize);
  const basePrice = selectedOption ? selectedOption.price : (item.priceSingle || item.priceG || item.priceM || item.priceP || 0);

  const extrasTotalPrice = podeAdicionais ? selectedExtras.reduce((sum, extra) => sum + extra.price, 0) : 0;
  const currentPrice = basePrice + extrasTotalPrice;
  const pendente = escolhaPendente(regras.escolhas, escolhas);

  const handleAdd = (openCart: boolean) => {
    if (pendente) {
      setAvisoEscolha(`${pendente.titulo}: escolha ${pendente.min === 1 ? 'pelo menos 1 opção' : `pelo menos ${pendente.min}`}.`);
      return;
    }
    // As escolhas (creme, sabor) vão nas observações do item, antes do que o cliente escreveu
    const obs = [textoEscolhas(regras.escolhas, escolhas), notes.trim()].filter(Boolean).join(' | ');
    onAddToCart({
      id: crypto.randomUUID(),
      menuItem: item,
      quantity: quantity,
      size: hasSizes ? selectedSize : undefined,
      extras: podeAdicionais ? selectedExtras : [],
      priceCalculated: currentPrice,
      notes: obs || undefined
    }, openCart);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#1a1a1a] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="font-bold text-lg text-stone-900">{item.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto">
           {item.ingredients && (
             <p className="text-gray-600 text-sm mb-4 leading-relaxed bg-purple-50/60 p-3 rounded-lg border border-purple-100">
               {item.ingredients}
             </p>
           )}

           {/* Seleção de Tamanhos (Copos) */}
           {hasSizes && (
             <div className="mb-6">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Escolha o Tamanho:</h4>
                <div className="flex flex-col gap-2.5">
                   {sizeOptions.map(opt => {
                     const paused = Boolean(pausedItems?.includes(`${item.id}-${opt.pauseKey}`));
                     const selected = selectedSize === opt.size;
                     return (
                       <button
                         key={opt.size}
                         type="button"
                         onClick={() => { hapticLight(); setSelectedSize(opt.size); }}
                         disabled={paused}
                         className={`p-3 rounded-xl border-2 text-left transition-all ${paused ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selected ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                       >
                          <div className="flex justify-between items-center">
                             <span className="font-bold text-sm text-stone-900">
                               {SIZE_LABELS[opt.size]}
                               {SIZE_DESCRIPTIONS[opt.size] && <span className="ml-1.5 text-xs font-medium text-gray-500">{SIZE_DESCRIPTIONS[opt.size]}</span>}
                             </span>
                             <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                             </div>
                          </div>
                          <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {opt.price.toFixed(2).replace('.', ',')}</span>
                       </button>
                     );
                   })}
                </div>
             </div>
           )}

           {/* Creme gelado / sabor e adicionais, com as regras do Multipedidos */}
           <VariacoesProduto
             regras={regras}
             extrasList={extrasList || []}
             escolhas={escolhas}
             onEscolhasChange={(v) => { setEscolhas(v); setAvisoEscolha(''); }}
             extras={selectedExtras}
             onExtrasChange={setSelectedExtras}
           />

           {/* Campo de Observações */}
           <div className="mb-6">
             <div className="flex justify-between items-center mb-2">
               <label htmlFor="order-notes" className="font-bold text-sm uppercase tracking-wide text-gray-800">
                 Observações do Pedido
               </label>
               <span className="text-xs text-gray-400">{notes.length}/250</span>
             </div>
             <textarea
               id="order-notes"
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               maxLength={250}
               rows={3}
               placeholder={podeAdicionais ? "Ex.: Sem granola, pouco leite condensado, caprichar no leite em pó..." : "Ex.: Bem gelado, sem canudo..."}
               className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:border-[#4d0471] focus:outline-none transition-colors resize-none placeholder:text-gray-400"
             />
           </div>

           {/* Seletor de Quantidade e Total */}
           <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div className="flex items-center gap-4">
               <button 
                 type="button"
                 onClick={() => {
                   hapticLight();
                   setQuantity(Math.max(1, quantity - 1));
                 }}
                 className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#4d0471] font-bold text-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
               >
                 -
               </button>
               <span className="font-bold text-xl w-6 text-center text-gray-800">{quantity}</span>
               <button 
                 type="button"
                 onClick={() => {
                   hapticLight();
                   setQuantity(quantity + 1);
                 }}
                 className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#4d0471] font-bold text-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
               >
                 +
               </button>
             </div>
             <div className="text-right">
               <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Total</div>
               <div className="text-[#4d0471] font-bold text-2xl">
                 R$ {((currentPrice || 0) * quantity).toFixed(2).replace('.', ',')}
               </div>
             </div>
           </div>

           {avisoEscolha && (
             <p className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium">
               {avisoEscolha}
             </p>
           )}

           {/* Botões de Ação */}
           <div className="flex flex-col gap-2.5">
             <button 
               type="button"
               onClick={() => handleAdd(true)}
               className="w-full bg-[#4d0471] hover:bg-[#3b0257] text-white font-bold py-3.5 px-4 rounded-xl transition-transform active:scale-[0.98] shadow-md flex justify-center items-center gap-2 cursor-pointer"
             >
               <ShoppingBag className="w-5 h-5" />
               Adicionar e ver pedido
             </button>
             <button 
               type="button"
               onClick={() => handleAdd(false)}
               className="w-full bg-white text-[#4d0471] border-2 border-[#4d0471] hover:bg-purple-50 font-bold py-3 px-4 rounded-xl transition-transform active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer"
             >
               Adicionar e continuar comprando
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
