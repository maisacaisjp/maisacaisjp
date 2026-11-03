import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { useExtras } from '../hooks/useExtras';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { findImageForProduct } from '../utils/imageResolver';
import { 
  X, ArrowLeft, Search, Plus, Minus, Trash2, ShoppingBag, 
  DollarSign, CreditCard, Smartphone, Check, 
  Percent, ArrowRight, User, Phone, MapPin, 
  Tag, Utensils, Bike, Store, AlertCircle, 
  RotateCcw, Sparkles, ChevronRight, Hash, Edit2, ChevronDown, FileText,
  Flame, Coffee, Wine, Layers, Heart
} from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  onOrderCreated: (order: any) => void;
}

export type AcaiSize = '330ml' | '440ml' | '550ml' | '770ml' | '1L' | '2L';

export interface PDVCartItem {
  id: string;
  menuItem: MenuItem;
  size?: AcaiSize;
  selectedExtras?: ExtraIngredient[];
  quantity: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface AcaiSizeOption {
  size: AcaiSize;
  label: string;
  price: number;
}

/**
 * Mapeia os preços do produto para os tamanhos oficiais da Mais Açaí:
 * 330ml (priceP), 440ml (priceM), 550ml (priceG), 770ml (priceBig), 1L (priceSuperBig) e 2L.
 */
export const getAcaiSizesForItem = (item: MenuItem | null | undefined): AcaiSizeOption[] => {
  if (!item) return [];
  const options: AcaiSizeOption[] = [];

  // 330ml (priceP ou derivado de priceM - 2)
  const p330 = item.priceP !== undefined && item.priceP !== null && item.priceP > 0
    ? item.priceP 
    : (item.priceM !== undefined && item.priceM !== null && item.priceM > 0 ? Math.max(item.priceM - 2, 0) : undefined);
  if (p330 !== undefined && p330 > 0) {
    options.push({ size: '330ml', label: '330ml', price: p330 });
  }

  // 440ml (priceM)
  if (item.priceM !== undefined && item.priceM !== null && item.priceM > 0) {
    options.push({ size: '440ml', label: '440ml', price: item.priceM });
  }

  // 550ml (priceG)
  if (item.priceG !== undefined && item.priceG !== null && item.priceG > 0) {
    options.push({ size: '550ml', label: '550ml', price: item.priceG });
  }

  // 770ml (priceBig)
  if (item.priceBig !== undefined && item.priceBig !== null && item.priceBig > 0) {
    options.push({ size: '770ml', label: '770ml', price: item.priceBig });
  }

  // 1L (priceSuperBig ou detectado pelo nome)
  if (item.priceSuperBig !== undefined && item.priceSuperBig !== null && item.priceSuperBig > 0) {
    options.push({ size: '1L', label: '1L', price: item.priceSuperBig });
  }

  return options;
};

export const isItemCustomizable = (item: MenuItem | null | undefined): boolean => {
  if (!item) return false;
  const sizes = getAcaiSizesForItem(item);
  return sizes.length > 0;
};

// Componente para resolver imagens do PDV
const PDVProductImage = ({ product, className }: { product: MenuItem; className?: string }) => {
  const [imgAttempt, setImgAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];

  let photoSrc = product.imageUrl ? product.imageUrl.replace(/^\//, '') : '';
  if (photoSrc === 'none') {
    photoSrc = '';
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(product);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  const getDisplaySrc = () => {
    if (!photoSrc) return '';
    if (photoSrc.startsWith('http') || photoSrc.startsWith('data:')) return imgAttempt > 0 ? '' : photoSrc;
    let base = photoSrc;
    if (imgAttempt > 0) {
      base = base.replace(/\.(png|jpe?g|webp)$/i, '');
      return `/${base}${exts[imgAttempt - 1]}`;
    }
    return `/${base}`;
  };

  const currentSrc = getDisplaySrc();

  if (!currentSrc || failed) {
    return <Utensils size={22} className="text-gray-300 drop-shadow-2xs" />;
  }

  return (
    <img
      src={currentSrc}
      alt={product.name}
      className={className}
      onError={() => {
        if (imgAttempt < exts.length) {
          setImgAttempt(prev => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

// Ordem exata de categorias idêntica ao front-end do cardápio digital
const FRONTEND_CATEGORIES_PRESETS = [
  { id: 'all', name: 'Todos os Itens', icon: 'Grid' },
  { id: 'mais-vendidos', name: 'Mais Vendidos 🔥', icon: 'Flame' },
  { id: 'novidades', name: 'Novidades ✨', icon: 'Sparkles' },
  { id: 'monte-do-seu-jeito', name: 'Monte do seu jeito 🍧', icon: 'Layers' },
  { id: 'combos-especiais', name: 'Combos Especiais 💜', icon: 'Heart' },
  { id: 'kits-promocionais', name: 'Kits Promocionais 📦', icon: 'Tag' },
  { id: 'milkshakes', name: 'Milkshakes 🥤', icon: 'Coffee' },
  { id: 'bebidas', name: 'Bebidas Diversas 🧃', icon: 'Wine' },
  { id: 'adicionais', name: 'Adicionais & Toppings 🍫', icon: 'Plus' }
];

export default function PDVModal({
  isOpen,
  onClose,
  activeSessionId,
  onOrderCreated
}: PDVModalProps) {
  const { menuItems, categories, loading: menuLoading, refresh: refreshMenu } = useMenu();
  const availableExtras = useExtras();

  // Sincroniza cardápio ao abrir o PDV
  useEffect(() => {
    if (isOpen) {
      refreshMenu?.();
    }
  }, [isOpen]);

  // Order Details States
  const [orderType, setOrderType] = useState<'retirada' | 'mesa' | 'entrega'>('retirada');
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('PIX');
  const [cashAmountGiven, setCashAmountGiven] = useState<string>('');

  // Search & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Pricing
  const [cart, setCart] = useState<PDVCartItem[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'discount' | 'surcharge'>('none');
  const [adjustmentMode, setAdjustmentMode] = useState<'fixed' | 'percent'>('fixed');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');

  // Zones & Settings
  const [zones, setZones] = useState<{ name: string; fee: number }[]>([]);
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  // Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customizer Modal State (Açaí e Acompanhamentos)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState<AcaiSize>('440ml');
  const [customExtras, setCustomExtras] = useState<ExtraIngredient[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  // Observações Gerais do Pedido
  const [orderNotes, setOrderNotes] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carrega taxas de entrega do Supabase
  useEffect(() => {
    async function loadZones() {
      try {
        const { data, error } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('fee', { ascending: true });

        if (!error && data) {
          setZones(data.map((z: any) => ({ name: z.name, fee: Number(z.fee) || 0 })));
          if (data.length > 0) {
            setDeliveryZone(data[0].name);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar zonas de entrega:', err);
      }
    }

    if (isOpen) {
      loadZones();
    }
  }, [isOpen]);

  // Click outside to close delivery zone dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (customizingItem) {
          setCustomizingItem(null);
        } else {
          onClose();
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, customizingItem, onClose]);

  // Lista de Categorias do PDV ordenada exatamente como o cardápio digital
  const displayCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    (menuItems || []).forEach(i => {
      const cat = i.category || 'sem_categoria';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const result: Array<{ id: string; name: string; count: number }> = [
      { id: 'all', name: 'Todos os Itens', count: (menuItems || []).length }
    ];

    FRONTEND_CATEGORIES_PRESETS.forEach(preset => {
      if (preset.id === 'all') return;
      const count = counts[preset.id] || 0;
      if (count > 0 || preset.id === 'mais-vendidos' || preset.id === 'adicionais') {
        result.push({
          id: preset.id,
          name: preset.name,
          count
        });
      }
    });

    // Acrescenta quaisquer outras categorias existentes no banco que não estejam no preset
    (categories || []).forEach(c => {
      if (!result.some(r => r.id === c.id) && c.id !== 'bordas' && (counts[c.id] || 0) > 0) {
        result.push({
          id: c.id,
          name: c.name,
          count: counts[c.id] || 0
        });
      }
    });

    return result;
  }, [menuItems, categories]);

  // Produtos filtrados e ordenados
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return (menuItems || []).filter(item => {
      // Ignora resquícios de bordas
      if (item.category === 'bordas' || item.id.startsWith('bd-')) return false;

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.ingredients && item.ingredients.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cálculos do Carrinho
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (orderType !== 'entrega') return 0;
    const found = zones.find(z => z.name === deliveryZone);
    return found ? found.fee : 0;
  }, [orderType, deliveryZone, zones]);

  const adjustmentAmount = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const val = parseFloat(adjustmentValue) || 0;
    if (val <= 0) return 0;

    if (adjustmentMode === 'percent') {
      const calc = (subtotal * val) / 100;
      return adjustmentType === 'discount' ? -calc : calc;
    }
    return adjustmentType === 'discount' ? -val : val;
  }, [adjustmentType, adjustmentMode, adjustmentValue, subtotal]);

  const totalAmount = useMemo(() => {
    const finalVal = subtotal + deliveryFee + adjustmentAmount;
    return Math.max(0, finalVal);
  }, [subtotal, deliveryFee, adjustmentAmount]);

  const calculatedChange = useMemo(() => {
    if (paymentMethod !== 'Dinheiro') return 0;
    const given = parseFloat(cashAmountGiven) || 0;
    if (given <= totalAmount) return 0;
    return given - totalAmount;
  }, [paymentMethod, cashAmountGiven, totalAmount]);

  // Preço dinâmico da personalização no modal
  const currentPreviewPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const sizes = getAcaiSizesForItem(customizingItem);

    let base = 0;
    if (sizes.length > 0) {
      const opt = sizes.find(s => s.size === customSize) || sizes[0];
      base = opt ? opt.price : 0;
    } else {
      base = customizingItem.priceSingle || 0;
    }

    const extrasTotal = customExtras.reduce((sum, e) => sum + (e.price || 0), 0);
    return base + extrasTotal;
  }, [customizingItem, customSize, customExtras]);

  // Abre personalização para edição de item já no carrinho
  const handleEditCartItem = (idx: number) => {
    const item = cart[idx];
    if (!item) return;

    setEditingCartIndex(idx);
    setCustomizingItem(item.menuItem);
    setCustomSize(item.size || '440ml');
    setCustomExtras(item.selectedExtras || []);
    setCustomNotes(item.notes || '');
  };

  // Clique no produto do catálogo
  const handleProductClick = (item: MenuItem) => {
    setEditingCartIndex(null);

    const sizes = getAcaiSizesForItem(item);
    const hasMultipleSizes = sizes.length > 1;

    // Se tiver mais de 1 tamanho, abre o modal de seleção de tamanho
    if (hasMultipleSizes) {
      setCustomizingItem(item);
      // Padrão selecionado: 440ml se existir, senão o primeiro disponível
      const defaultSize = sizes.find(s => s.size === '440ml') ? '440ml' : sizes[0].size;
      setCustomSize(defaultSize);
      setCustomExtras([]);
      setCustomNotes('');
    } else {
      // Preço direto para produtos de tamanho único ou com apenas 1 tamanho fixo
      const unitPrice = sizes.length === 1 
        ? sizes[0].price 
        : (item.priceSingle || item.priceP || item.priceM || item.priceG || 0);

      addToCart({
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        size: sizes.length === 1 ? sizes[0].size : undefined,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
    }
  };

  // Adiciona item ao carrinho
  const addToCart = (newItem: PDVCartItem) => {
    setCart(prev => {
      // Verifica se já existe um item idêntico (mesmo produto, tamanho, adicionais e notas)
      const existingIdx = prev.findIndex(item => {
        const sameProduct = item.menuItem.id === newItem.menuItem.id;
        const sameSize = item.size === newItem.size;
        const sameNotes = (item.notes || '') === (newItem.notes || '');
        const sameExtras = JSON.stringify(item.selectedExtras || []) === JSON.stringify(newItem.selectedExtras || []);
        return sameProduct && sameSize && sameNotes && sameExtras;
      });

      if (existingIdx >= 0) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + newItem.quantity;
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty
        };
        return updated;
      }

      return [newItem, ...prev];
    });
  };

  // Confirmação do modal de personalização
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    const sizes = getAcaiSizesForItem(customizingItem);
    const hasMultipleSizes = sizes.length > 0;
    const opt = sizes.find(s => s.size === customSize) || (sizes.length > 0 ? sizes[0] : null);

    const basePrice = opt ? opt.price : (customizingItem.priceSingle || 0);
    const extrasPrice = customExtras.reduce((sum, e) => sum + (e.price || 0), 0);
    const unitPrice = basePrice + extrasPrice;
    const finalNotes = customNotes.trim();

    if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < cart.length) {
      setCart(prev => {
        const updated = [...prev];
        const existing = updated[editingCartIndex];
        const qty = existing.quantity;
        updated[editingCartIndex] = {
          ...existing,
          menuItem: customizingItem,
          size: hasMultipleSizes ? (opt?.size || customSize) : undefined,
          selectedExtras: customExtras.length > 0 ? customExtras : undefined,
          notes: finalNotes || undefined,
          unitPrice,
          totalPrice: unitPrice * qty
        };
        return updated;
      });
      setEditingCartIndex(null);
    } else {
      addToCart({
        id: `${customizingItem.id}-${Date.now()}`,
        menuItem: customizingItem,
        size: hasMultipleSizes ? (opt?.size || customSize) : undefined,
        selectedExtras: customExtras.length > 0 ? customExtras : undefined,
        notes: finalNotes || undefined,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
    }

    setCustomizingItem(null);
  };

  const updateCartQuantity = (idx: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[idx];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }

      updated[idx] = {
        ...item,
        quantity: newQty,
        totalPrice: item.unitPrice * newQty
      };
      return updated;
    });
  };

  const removeCartItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
    if (editingCartIndex === idx) {
      setEditingCartIndex(null);
      setCustomizingItem(null);
    }
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Tem certeza que deseja limpar todo o carrinho?')) {
      setCart([]);
      setEditingCartIndex(null);
      setCustomizingItem(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerNif('');
      setTableNumber('');
      setDeliveryAddress('');
      setDeliveryReference('');
      setOrderNotes('');
      setAdjustmentType('none');
      setAdjustmentValue('');
    }
  };

  // Alterna extra no modal de customização
  const handleToggleExtra = (extra: ExtraIngredient) => {
    setCustomExtras(prev => {
      const exists = prev.some(e => e.id === extra.id);
      if (exists) {
        return prev.filter(e => e.id !== extra.id);
      }
      return [...prev, extra];
    });
  };

  // Finalização do Pedido
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('O carrinho está vazio.');
      return;
    }

    if (orderType === 'retirada' && !customerName.trim()) {
      setErrorMessage('Informe o nome do cliente para retirada.');
      return;
    }

    if (orderType === 'mesa' && !tableNumber.trim()) {
      setErrorMessage('Informe o número da mesa ou comanda.');
      return;
    }

    if (orderType === 'entrega' && (!customerName.trim() || !deliveryAddress.trim())) {
      setErrorMessage('Para entrega, informe o nome e o endereço completo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Monta os itens estruturados do pedido
      const formattedItems = cart.map(item => {
        let name = item.menuItem.name;
        if (item.size) {
          name += ` (${item.size})`;
        }

        return {
          id: item.menuItem.id,
          name,
          category: item.menuItem.category,
          quantity: item.quantity,
          size: item.size || null,
          unitPrice: item.unitPrice,
          priceCalculated: item.unitPrice,
          totalPrice: item.totalPrice,
          extras: item.selectedExtras ? item.selectedExtras.map(e => ({ id: e.id, name: e.name, price: e.price })) : [],
          notes: item.notes || null
        };
      });

      const orderPayload: any = {
        customer_name: customerName.trim() || (orderType === 'mesa' ? `Mesa ${tableNumber}` : 'Cliente Balcão'),
        customer_phone: customerPhone.trim() || null,
        customer_nif: customerNif.trim() || null,
        order_type: orderType,
        table_number: orderType === 'mesa' ? tableNumber.trim() : null,
        delivery_address: orderType === 'entrega' ? deliveryAddress.trim() : null,
        delivery_reference: orderType === 'entrega' ? deliveryReference.trim() : null,
        delivery_fee: deliveryFee,
        items: formattedItems,
        total_amount: totalAmount,
        status: 'concluido',
        payment_method: paymentMethod,
        notes: orderNotes.trim() ? orderNotes.trim() : null,
        cash_session_id: activeSessionId || null,
        created_at: new Date().toISOString()
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      onOrderCreated(newOrder);
      onClose();
    } catch (err: any) {
      console.error('Erro ao finalizar pedido no PDV:', err);
      setErrorMessage(err.message || 'Erro ao gravar o pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-white w-full h-full sm:h-[96vh] sm:w-[98vw] sm:max-w-[1440px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        
        {/* ────────────────── HEADER SUPERIOR DO PDV ────────────────── */}
        <header className="h-12 bg-gradient-to-r from-[#4d0471] via-[#5c0887] to-[#6a2092] text-white px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shadow-inner">
              <Store size={18} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-tight">PDV Balcão & Salão</h1>
                <span className="bg-amber-400 text-stone-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                  Mais Açaí
                </span>
              </div>
            </div>
          </div>

          {/* Campo de Busca Rápida (F2) */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-3 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar no cardápio... (F2)"
              className="w-full h-8 pl-8 pr-7 bg-white text-stone-900 text-xs rounded-full border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-300 transition-all font-medium placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeSessionId ? (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
                ● Caixa Aberto
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-200 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
                Caixa Fechado
              </span>
            )}

            <button
              onClick={() => {
                if (cart.length > 0 && !window.confirm('Deseja descartar o pedido atual e voltar ao Gestor?')) {
                  return;
                }
                onClose();
              }}
              className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
        </header>

        {/* ────────────────── CORPO PRINCIPAL DO PDV ────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* COLUNA ESQUERDA: NAVEGAÇÃO DE CATEGORIAS + GRADE DE PRODUTOS */}
          <div className="flex-1 flex flex-col min-w-0 bg-stone-50">
            
            {/* BARRA DE CATEGORIAS (Ordem idêntica ao front-end do cardápio) */}
            <nav className="w-full bg-white border-b border-stone-200 flex flex-wrap items-center shrink-0 px-3 py-2 gap-1.5 shadow-2xs z-10">
              {displayCategories.map(cat => {
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#4d0471] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200/60'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'
                      }`}>
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* GRADE DE PRODUTOS */}
            <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
              {menuLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400">
                  <div className="w-8 h-8 border-3 border-[#4d0471] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wide">Carregando Cardápio...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400">
                  <Search size={36} className="mb-2 opacity-30" />
                  <p className="text-sm font-bold text-stone-600">Nenhum item encontrado</p>
                  <p className="text-xs text-stone-400">Tente buscar por outro termo ou selecione outra categoria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                  {filteredProducts.map(product => {
                    const sizes = getAcaiSizesForItem(product);
                    const hasMultipleSizes = sizes.length > 1;
                    const displayPrice = sizes.length > 0 ? sizes[0].price : (product.priceSingle || 0);

                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="group bg-white rounded-xl p-2.5 flex flex-col text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md shadow-xs cursor-pointer active:scale-95 border border-stone-200 relative select-none"
                      >
                        {/* Imagem do Produto */}
                        <div className="w-full aspect-square bg-stone-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center relative shadow-inner">
                          <PDVProductImage
                            product={product}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Badge de tamanhos oficiais em ml (sem P, M, G ou pizzaria) */}
                          {hasMultipleSizes && (
                            <span className="absolute top-1.5 right-1.5 bg-[#4d0471]/90 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs backdrop-blur-2xs">
                              {sizes.map(s => s.label).join(' · ')}
                            </span>
                          )}
                        </div>

                        {/* Nome & Ingredientes */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-bold text-xs text-stone-900 leading-tight mb-0.5 group-hover:text-[#4d0471] transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          {product.ingredients && (
                            <p className="text-[10px] text-stone-400 leading-tight line-clamp-1 mb-2">
                              {product.ingredients}
                            </p>
                          )}

                          <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between">
                            <div>
                              {hasMultipleSizes && (
                                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wide block">
                                  A partir de
                                </span>
                              )}
                              <span className="font-black text-sm text-[#4d0471] font-mono leading-none">
                                R$ {displayPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#4d0471] text-white flex items-center justify-center shadow-xs group-hover:bg-[#6a2092] transition-colors shrink-0">
                              <Plus size={14} className="stroke-[2.5]" />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          {/* COLUNA DIREITA: CARRINHO & FINALIZAÇÃO (CHECKOUT) */}
          <aside className="w-full lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col shrink-0 shadow-lg z-20 overflow-hidden">
            
            {/* Tipo de Pedido (Retirada, Mesa, Entrega) */}
            <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 shrink-0">
              <div className="grid grid-cols-3 gap-1 bg-stone-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOrderType('retirada')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    orderType === 'retirada' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Store size={12} /> Balcão
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('mesa')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    orderType === 'mesa' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Utensils size={12} /> Salão
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('entrega')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    orderType === 'entrega' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Bike size={12} /> Delivery
                </button>
              </div>

              {/* Campos dinâmicos conforme tipo */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nome do Cliente *"
                    className="h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                  />
                  {orderType === 'mesa' ? (
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      placeholder="Nº Mesa / Comanda *"
                      className="h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Telefone (WhatsApp)"
                      className="h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                    />
                  )}
                </div>

                {orderType === 'entrega' && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder="Endereço (rua, número, bairro) *"
                      className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                    />

                    {zones.length > 0 && (
                      <div ref={zoneDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                          className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 flex items-center justify-between cursor-pointer"
                        >
                          <span>{deliveryZone ? `Taxa: ${deliveryZone} (R$ ${deliveryFee.toFixed(2)})` : 'Selecione a Taxa de Entrega'}</span>
                          <ChevronDown size={14} className="text-stone-400" />
                        </button>
                        {isZoneDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                            {zones.map(z => (
                              <button
                                key={z.name}
                                type="button"
                                onClick={() => {
                                  setDeliveryZone(z.name);
                                  setIsZoneDropdownOpen(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-purple-50 cursor-pointer"
                              >
                                <span>{z.name}</span>
                                <span className="font-mono font-bold text-[#4d0471]">
                                  {z.fee === 0 ? 'Grátis' : `R$ ${z.fee.toFixed(2)}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ITENS NO CARRINHO */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 pb-1 border-b border-stone-100">
                <span>Itens no Pedido ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-stone-400">
                  <ShoppingBag size={24} className="mb-2 opacity-30 text-[#4d0471]" />
                  <p className="text-xs font-bold text-stone-600">Nenhum item selecionado</p>
                  <p className="text-[11px] text-stone-400 text-center mt-0.5">
                    Toque nos copos ou produtos da lista para adicionar.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((item, idx) => {
                    const isCustomizable = isItemCustomizable(item.menuItem);
                    const isBeingEdited = editingCartIndex === idx;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg p-2 border transition-all ${
                          isBeingEdited
                            ? 'bg-purple-50 border-[#4d0471] ring-1 ring-[#4d0471]'
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-stone-900">
                                {item.quantity}x
                              </span>
                              <h4
                                onClick={() => isCustomizable && handleEditCartItem(idx)}
                                className={`font-bold text-xs text-stone-900 truncate ${
                                  isCustomizable ? 'hover:text-[#4d0471] cursor-pointer' : ''
                                }`}
                              >
                                {item.menuItem.name}
                              </h4>
                            </div>

                            {/* Detalhe do tamanho oficial (330ml, 440ml, 550ml, etc.) */}
                            {item.size && (
                              <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#4d0471]/10 text-[#4d0471]">
                                Copo {item.size}
                              </span>
                            )}

                            {/* Adicionais selecionados */}
                            {item.selectedExtras && item.selectedExtras.length > 0 && (
                              <div className="text-[10px] text-stone-500 mt-1 pl-1 border-l-2 border-purple-300">
                                {item.selectedExtras.map(e => (
                                  <div key={e.id}>+ {e.name} (R$ {e.price.toFixed(2)})</div>
                                ))}
                              </div>
                            )}

                            {/* Observação do item */}
                            {item.notes && (
                              <p className="text-[10px] text-stone-500 italic mt-0.5">
                                Obs: {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="font-mono font-black text-xs text-stone-900">
                              R$ {item.totalPrice.toFixed(2)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateCartQuantity(idx, -1)}
                                className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                              >
                                <Minus size={10} />
                              </button>
                              <button
                                onClick={() => updateCartQuantity(idx, 1)}
                                className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                onClick={() => removeCartItem(idx)}
                                className="w-5 h-5 rounded bg-white border border-stone-200 text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer ml-1"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FORMA DE PAGAMENTO & FECHAMENTO */}
            <div className="p-3 bg-stone-50 border-t border-stone-200 space-y-2 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {(['PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer text-left truncate ${
                        paymentMethod === method
                          ? 'bg-[#4d0471] text-white border-[#4d0471] shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Se for dinheiro, exibe campo de troco */}
              {paymentMethod === 'Dinheiro' && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div>
                    <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Valor Pago (R$)</label>
                    <input
                      type="number"
                      value={cashAmountGiven}
                      onChange={e => setCashAmountGiven(e.target.value)}
                      placeholder="Ex: 50.00"
                      className="w-full h-7 px-2 bg-white border border-stone-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Troco Calculado</label>
                    <div className="h-7 px-2 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono font-bold text-emerald-800 flex items-center">
                      R$ {calculatedChange.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Totais */}
              <div className="pt-2 border-t border-stone-200 space-y-1 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>Taxa de Entrega</span>
                    <span className="font-mono">+ R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-stone-900 pt-1 border-t border-stone-200">
                  <span>Total</span>
                  <span className="text-[#4d0471] font-mono">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botão Finalizar Pedido */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Gravando Pedido...</span>
                ) : (
                  <>
                    <Check size={16} className="stroke-[3]" />
                    <span>Concluir Venda • R$ {totalAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>

        {/* ────────────────── MODAL DE TAMANHO & ACOMPANHAMENTOS DO AÇAÍ ────────────────── */}
        {customizingItem && (() => {
          const sizes = getAcaiSizesForItem(customizingItem);

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Cabeçalho do Item */}
                <div className="p-4 bg-gradient-to-r from-[#4d0471] to-[#6a2092] text-white flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-base font-bold">{customizingItem.name}</h3>
                    <p className="text-xs text-white/80 mt-0.5 line-clamp-1">{customizingItem.ingredients || 'Personalize seu açaí'}</p>
                  </div>
                  <button
                    onClick={() => setCustomizingItem(null)}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* SELEÇÃO DE TAMANHO DO COPO */}
                  {sizes.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                        Escolha o Tamanho:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {sizes.map(opt => {
                          const isSelected = customSize === opt.size;
                          return (
                            <button
                              key={opt.size}
                              type="button"
                              onClick={() => setCustomSize(opt.size)}
                              className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-50 border-[#4d0471] text-[#4d0471] shadow-xs ring-1 ring-[#4d0471]'
                                  : 'bg-white border-stone-200 text-stone-700 hover:border-purple-200 hover:bg-stone-50'
                              }`}
                            >
                              <span className="text-sm font-black font-mono">{opt.label}</span>
                              <span className="text-xs font-bold text-[#4d0471]">
                                R$ {opt.price.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ADICIONAIS & TOPPINGS EXTRAS */}
                  {availableExtras && availableExtras.length > 0 && (
                    <div className="pt-3 border-t border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                          Adicionais & Toppings Extras:
                        </label>
                        {customExtras.length > 0 && (
                          <span className="text-[11px] font-bold text-[#4d0471] bg-purple-50 px-2 py-0.5 rounded-full">
                            {customExtras.length} selecionado{customExtras.length > 1 ? 's' : ''} (+ R$ {customExtras.reduce((s, e) => s + e.price, 0).toFixed(2)})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {availableExtras.map(extra => {
                          const isSelected = customExtras.some(e => e.id === extra.id);
                          return (
                            <button
                              key={extra.id}
                              type="button"
                              onClick={() => handleToggleExtra(extra)}
                              className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-50 border-[#4d0471] text-[#4d0471] font-bold shadow-2xs'
                                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              <span className="truncate pr-1">{extra.name}</span>
                              <span className="font-mono text-[11px] text-[#4d0471] shrink-0 font-bold">
                                +R${extra.price.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* OBSERVAÇÃO DO ITEM */}
                  <div className="pt-3 border-t border-stone-100">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                      Observações do Copo:
                    </label>
                    <textarea
                      value={customNotes}
                      onChange={e => setCustomNotes(e.target.value)}
                      placeholder="Ex: Leite condensado no fundo, pouco xarope..."
                      rows={2}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                    />
                  </div>
                </div>

                {/* Rodapé de Confirmação */}
                <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Total do Item</span>
                    <span className="text-base font-black text-[#4d0471] font-mono">
                      R$ {currentPreviewPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomizingItem(null)}
                      className="px-3 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCustomization}
                      className="px-4 py-2 rounded-lg bg-[#4d0471] hover:bg-[#6a2092] text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} className="stroke-[3]" />
                      <span>{editingCartIndex !== null ? 'Salvar Alterações' : 'Adicionar ao Pedido'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
