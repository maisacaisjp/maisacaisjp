import React, { useState, useEffect } from 'react';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { CartItem } from '../types';
import { X, Check, ShoppingBag } from 'lucide-react';
import { useExtras } from '../hooks/useExtras';
import { hapticLight } from '../utils/haptics';

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
  const [selectedSize, setSelectedSize] = useState<'P' | 'M' | 'G' | 'Big' | 'Super Big'>(initialSize);
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    if (isOpen && item) {
       setSelectedSize(item.priceM === undefined ? 'G' : initialSize);
       setSelectedExtras([]);
       setQuantity(1);
       setNotes('');
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

  const hasSizes = Boolean(item.priceP || item.priceM || item.priceG || item.priceBig || item.priceSuperBig);
  const calculatedPriceP = item.priceP || (item.priceM ? Math.max(item.priceM - 2, 0) : undefined);
  
  // Calcular preço base conforme o tamanho selecionado
  let basePrice = item.priceSingle || item.priceG || item.priceM || item.priceP || 0;
  if (selectedSize === 'P' && calculatedPriceP !== undefined) basePrice = calculatedPriceP;
  else if (selectedSize === 'M' && item.priceM !== undefined) basePrice = item.priceM;
  else if (selectedSize === 'G' && item.priceG !== undefined) basePrice = item.priceG;
  else if (selectedSize === 'Big' && item.priceBig !== undefined) basePrice = item.priceBig;
  else if (selectedSize === 'Super Big' && item.priceSuperBig !== undefined) basePrice = item.priceSuperBig;

  const extrasTotalPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  const currentPrice = basePrice + extrasTotalPrice;

  const handleToggleExtra = (extra: ExtraIngredient) => {
    hapticLight();
    setSelectedExtras(prev => {
      const exists = prev.some(e => e.id === extra.id);
      if (exists) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  };

  const handleAdd = (openCart: boolean) => {
    onAddToCart({
      id: crypto.randomUUID(),
      menuItem: item,
      quantity: quantity,
      size: hasSizes ? (selectedSize as any) : undefined,
      extras: selectedExtras,
      priceCalculated: currentPrice,
      notes: notes.trim() ? notes.trim() : undefined
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
                   {calculatedPriceP !== undefined && (
                     <button 
                       type="button"
                       onClick={() => { hapticLight(); setSelectedSize('P'); }}
                       disabled={pausedItems?.includes(`${item?.id}-P`)}
                       className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-P`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'P' ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-900">Pequeno (330ml)</span>
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'P' ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                              {selectedSize === 'P' && <Check className="w-3 h-3 text-white" />}
                           </div>
                        </div>
                        <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {calculatedPriceP.toFixed(2).replace('.', ',')}</span>
                     </button>
                   )}

                   {item.priceM !== undefined && (
                     <button 
                       type="button"
                       onClick={() => { hapticLight(); setSelectedSize('M'); }}
                       disabled={pausedItems?.includes(`${item?.id}-M`)}
                       className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-M`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'M' ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-900">Médio (440ml)</span>
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'M' ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                              {selectedSize === 'M' && <Check className="w-3 h-3 text-white" />}
                           </div>
                        </div>
                        <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {item.priceM.toFixed(2).replace('.', ',')}</span>
                     </button>
                   )}

                   {item.priceG !== undefined && (
                     <button 
                       type="button"
                       onClick={() => { hapticLight(); setSelectedSize('G'); }}
                       disabled={pausedItems?.includes(`${item?.id}-G`)}
                       className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-G`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'G' ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-900">Grande (550ml)</span>
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'G' ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                              {selectedSize === 'G' && <Check className="w-3 h-3 text-white" />}
                           </div>
                        </div>
                        <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {item.priceG.toFixed(2).replace('.', ',')}</span>
                     </button>
                   )}

                   {item.priceBig !== undefined && (
                     <button 
                       type="button"
                       onClick={() => { hapticLight(); setSelectedSize('Big'); }}
                       disabled={pausedItems?.includes(`${item?.id}-Big`)}
                       className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-Big`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'Big' ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-900">Super (770ml)</span>
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'Big' ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                              {selectedSize === 'Big' && <Check className="w-3 h-3 text-white" />}
                           </div>
                        </div>
                        <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {item.priceBig.toFixed(2).replace('.', ',')}</span>
                     </button>
                   )}

                   {item.priceSuperBig !== undefined && (
                     <button 
                       type="button"
                       onClick={() => { hapticLight(); setSelectedSize('Super Big'); }}
                       disabled={pausedItems?.includes(`${item?.id}-SuperBig`)}
                       className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-SuperBig`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'Super Big' ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-900">Família (1 Litro)</span>
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'Super Big' ? 'border-[#4d0471] bg-[#4d0471]' : 'border-gray-300'}`}>
                              {selectedSize === 'Super Big' && <Check className="w-3 h-3 text-white" />}
                           </div>
                        </div>
                        <span className="text-[#4d0471] font-bold mt-1 block text-base">R$ {item.priceSuperBig.toFixed(2).replace('.', ',')}</span>
                     </button>
                   )}
                </div>
             </div>
           )}

           {/* Seleção de Adicionais Extras */}
           {extrasList && extrasList.length > 0 && (
             <div className="mb-6">
               <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Adicionais Extras (Opcional):</h4>
               <div className="flex flex-col gap-2">
                 {extrasList.map((extra) => {
                   const isSelected = selectedExtras.some(e => e.id === extra.id);
                   return (
                     <label 
                       key={extra.id} 
                       className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#4d0471] bg-[#4d0471]/5' : 'border-gray-200 hover:border-gray-300'}`}
                     >
                       <div className="flex items-center gap-3 pr-4">
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={() => handleToggleExtra(extra)}
                           className="w-5 h-5 accent-[#4d0471] rounded flex-shrink-0"
                         />
                         <span className="font-medium text-sm text-stone-900">{extra.name}</span>
                       </div>
                       <span className="text-[#4d0471] font-bold text-sm whitespace-nowrap flex-shrink-0">
                         + R$ {extra.price.toFixed(2).replace('.', ',')}
                       </span>
                     </label>
                   );
                 })}
               </div>
             </div>
           )}

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
               placeholder="Ex.: Sem granola, pouco leite condensado, caprichar no leite em pó..."
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
