import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { useExtras } from '../hooks/useExtras';
import { useCremes } from '../hooks/useCremes';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { findImageForProduct } from '../utils/imageResolver';
import { aceitaAdicionais, agruparExtras, nomeExtraAgrupado } from '../utils/produto';
import { regrasDoProduto, textoEscolhas, escolhaPendente, escolhasIniciais } from '../data/variacoes';
import VariacoesProduto from './VariacoesProduto';
import { formatSplitPayment } from '../utils/paymentAndOrderHelper';
import {
  getCashbackConfig, getCustomerCashbackInfo, applyOrderCashback, cleanCustomerPhone, dataCurta,
  DEFAULT_CASHBACK_PERCENT, DEFAULT_CASHBACK_VALIDADE_DIAS, type CashbackConfig, type CashbackInfo
} from '../utils/cashback';
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
  /** Creme gelado / sabor escolhido, por grupo (ex.: { Creme: ['cr-58542'] }). */
  escolhas?: Record<string, string[]>;
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

  // 1L (priceSuperBig)
  if (item.priceSuperBig !== undefined && item.priceSuperBig !== null && item.priceSuperBig > 0) {
    options.push({ size: '1L', label: 'Pote 1L', price: item.priceSuperBig });
  }

  // 2L (price2L)
  if (item.price2L !== undefined && item.price2L !== null && item.price2L > 0) {
    options.push({ size: '2L', label: '2L', price: item.price2L });
  }

  return options;
};

// Abre a tela de tamanho/adicionais: produto com mais de um tamanho ou que aceita adicionais (açaí e kits).
// Bebidas e milkshakes de tamanho único entram direto no pedido.
export const isItemCustomizable = (item: MenuItem | null | undefined): boolean => {
  if (!item) return false;
  const regras = regrasDoProduto(item);
  return getAcaiSizesForItem(item).length > 1 || regras.adicionais !== null || regras.escolhas.length > 0;
};

type PDVPaymentMethod = 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro';
const PDV_PAYMENT_METHODS: PDVPaymentMethod[] = ['PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'];

interface SplitPart {
  id: string;
  method: PDVPaymentMethod;
  amount: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const parseValor = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

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
  useCremes(); // sabores do gestor: re-renderiza quando um sabor é pausado ou ativado
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
  const [paymentMethod, setPaymentMethod] = useState<PDVPaymentMethod>('PIX');
  const [cashAmountGiven, setCashAmountGiven] = useState<string>('');
  // Pagamento dividido (ex.: R$ 50 no dinheiro + R$ 30 no PIX)
  const [splitMode, setSplitMode] = useState(false);
  const [splitParts, setSplitParts] = useState<SplitPart[]>([]);

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
  const [customEscolhas, setCustomEscolhas] = useState<Record<string, string[]>>({});
  const [customAviso, setCustomAviso] = useState('');
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  // Observações Gerais do Pedido
  const [orderNotes, setOrderNotes] = useState('');

  // Cashback do cliente (mesma regra do cardápio online)
  const [cashbackConfig, setCashbackConfig] = useState<CashbackConfig>({
    enabled: true, percent: DEFAULT_CASHBACK_PERCENT, validadeDias: DEFAULT_CASHBACK_VALIDADE_DIAS
  });
  const [cashbackInfo, setCashbackInfo] = useState<CashbackInfo | null>(null);
  const [loadingCashback, setLoadingCashback] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const phoneDigits = cleanCustomerPhone(customerPhone);
  const telefoneValido = phoneDigits.length >= 10;

  useEffect(() => {
    if (isOpen) getCashbackConfig().then(setCashbackConfig);
  }, [isOpen]);

  // Consulta o saldo quando o telefone tem DDD + número
  useEffect(() => {
    if (!isOpen || !telefoneValido) {
      setCashbackInfo(null);
      setUseCashback(false);
      return;
    }
    let atual = true;
    setLoadingCashback(true);
    const t = setTimeout(async () => {
      const info = await getCustomerCashbackInfo(phoneDigits);
      if (atual) {
        setCashbackInfo(info);
        if (info.saldo <= 0) setUseCashback(false);
        setLoadingCashback(false);
      }
    }, 350);
    return () => {
      atual = false;
      clearTimeout(t);
    };
  }, [isOpen, phoneDigits, telefoneValido]);

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

  // Desconto ou acréscimo sobre os produtos (a taxa de entrega fica de fora da porcentagem).
  // O desconto nunca passa do subtotal.
  const adjustmentAmount = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const val = parseValor(adjustmentValue);
    if (val <= 0) return 0;

    let calc = adjustmentMode === 'percent' ? (subtotal * val) / 100 : val;
    if (adjustmentType === 'discount') calc = Math.min(calc, subtotal);
    calc = round2(calc);
    return adjustmentType === 'discount' ? -calc : calc;
  }, [adjustmentType, adjustmentMode, adjustmentValue, subtotal]);

  // Saldo de cashback usado nesta venda (nunca passa do valor a pagar)
  const cashbackUsed = useMemo(() => {
    if (!cashbackConfig.enabled || !useCashback || !cashbackInfo || cashbackInfo.saldo <= 0) return 0;
    return round2(Math.min(cashbackInfo.saldo, Math.max(0, subtotal + deliveryFee + adjustmentAmount)));
  }, [cashbackConfig.enabled, useCashback, cashbackInfo, subtotal, deliveryFee, adjustmentAmount]);

  const totalAmount = useMemo(() => {
    const finalVal = subtotal + deliveryFee + adjustmentAmount - cashbackUsed;
    return round2(Math.max(0, finalVal));
  }, [subtotal, deliveryFee, adjustmentAmount, cashbackUsed]);

  // Cashback ganho: % sobre os produtos (sem taxa de entrega), depois de desconto e do saldo usado
  const cashbackEarned = useMemo(() => {
    if (!cashbackConfig.enabled || !telefoneValido) return 0;
    return round2(Math.max(0, subtotal + adjustmentAmount - cashbackUsed) * (cashbackConfig.percent / 100));
  }, [cashbackConfig, telefoneValido, subtotal, adjustmentAmount, cashbackUsed]);

  // Pagamento dividido: quanto já foi distribuído e quanto falta
  const splitSum = useMemo(
    () => round2(splitParts.reduce((s, p) => s + parseValor(p.amount), 0)),
    [splitParts]
  );
  const splitRemaining = round2(totalAmount - splitSum);

  // Parte paga em dinheiro: o total (pagamento único) ou a soma das partes em dinheiro
  const cashPortion = useMemo(() => {
    if (splitMode) {
      return round2(splitParts.filter(p => p.method === 'Dinheiro').reduce((s, p) => s + parseValor(p.amount), 0));
    }
    return paymentMethod === 'Dinheiro' ? totalAmount : 0;
  }, [splitMode, splitParts, paymentMethod, totalAmount]);

  const calculatedChange = useMemo(() => {
    if (cashPortion <= 0) return 0;
    const given = parseValor(cashAmountGiven);
    if (given <= cashPortion) return 0;
    return round2(given - cashPortion);
  }, [cashPortion, cashAmountGiven]);

  const startSplit = () => {
    setSplitMode(true);
    setSplitParts([
      { id: `sp-${Date.now()}-1`, method: 'Dinheiro', amount: '' },
      { id: `sp-${Date.now()}-2`, method: 'PIX', amount: '' }
    ]);
  };

  const cancelSplit = () => {
    setSplitMode(false);
    setSplitParts([]);
  };

  const updateSplitPart = (id: string, patch: Partial<SplitPart>) => {
    setSplitParts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  // Coloca nesta parte o valor que ainda falta
  const fillSplitRemaining = (id: string) => {
    setSplitParts(prev => {
      const outras = round2(prev.filter(p => p.id !== id).reduce((s, p) => s + parseValor(p.amount), 0));
      const resto = round2(Math.max(0, totalAmount - outras));
      return prev.map(p => (p.id === id ? { ...p, amount: resto > 0 ? resto.toFixed(2) : '' } : p));
    });
  };

  const addSplitPart = () => {
    const usados = new Set(splitParts.map(p => p.method));
    const proximo = PDV_PAYMENT_METHODS.find(m => !usados.has(m)) || 'PIX';
    setSplitParts(prev => [
      ...prev,
      { id: `sp-${Date.now()}`, method: proximo, amount: splitRemaining > 0 ? splitRemaining.toFixed(2) : '' }
    ]);
  };

  const removeSplitPart = (id: string) => {
    setSplitParts(prev => (prev.length <= 2 ? prev : prev.filter(p => p.id !== id)));
  };

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
    setCustomEscolhas(item.escolhas || {});
    setCustomAviso('');
    setCustomNotes(item.notes || '');
  };

  // Clique no produto do catálogo
  const handleProductClick = (item: MenuItem) => {
    setEditingCartIndex(null);

    const sizes = getAcaiSizesForItem(item);

    // Açaí e kits abrem a tela de tamanho + adicionais; bebidas de tamanho único entram direto
    if (isItemCustomizable(item)) {
      setCustomizingItem(item);
      // Padrão selecionado: 440ml se existir, senão o primeiro disponível
      const defaultSize: AcaiSize = sizes.find(s => s.size === '440ml') ? '440ml' : (sizes[0]?.size || '440ml');
      setCustomSize(defaultSize);
      setCustomExtras([]);
      setCustomEscolhas(escolhasIniciais(regrasDoProduto(item).escolhas));
      setCustomAviso('');
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
        const sameEscolhas = JSON.stringify(item.escolhas || {}) === JSON.stringify(newItem.escolhas || {});
        return sameProduct && sameSize && sameNotes && sameExtras && sameEscolhas;
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

    const regras = regrasDoProduto(customizingItem);
    const pendente = escolhaPendente(regras.escolhas, customEscolhas);
    if (pendente) {
      setCustomAviso(`${pendente.titulo}: escolha pelo menos ${pendente.min}.`);
      return;
    }
    const escolhasValidas = regras.escolhas.length > 0 ? customEscolhas : undefined;

    const basePrice = opt ? opt.price : (customizingItem.priceSingle || 0);
    const extrasValidos = aceitaAdicionais(customizingItem) ? customExtras : [];
    const extrasPrice = extrasValidos.reduce((sum, e) => sum + (e.price || 0), 0);
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
          selectedExtras: extrasValidos.length > 0 ? extrasValidos : undefined,
          escolhas: escolhasValidas,
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
        selectedExtras: extrasValidos.length > 0 ? extrasValidos : undefined,
        escolhas: escolhasValidas,
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

  // Zera o pedido para o próximo atendimento
  const resetOrder = () => {
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
    setAdjustmentMode('fixed');
    setAdjustmentValue('');
    setPaymentMethod('PIX');
    setCashAmountGiven('');
    setSplitMode(false);
    setSplitParts([]);
    setUseCashback(false);
    setCashbackInfo(null);
    setErrorMessage(null);
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Tem certeza que deseja limpar todo o carrinho?')) {
      resetOrder();
    }
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

    // Forma de pagamento: única ou dividida
    let paymentMethodToSave: string = paymentMethod;
    if (splitMode) {
      const partes = splitParts
        .map(p => ({ method: p.method, amount: round2(parseValor(p.amount)) }))
        .filter(p => p.amount > 0);
      if (partes.length === 0) {
        setErrorMessage('Informe os valores de cada forma de pagamento.');
        return;
      }
      if (Math.abs(splitRemaining) >= 0.01) {
        setErrorMessage(
          splitRemaining > 0
            ? `Faltam ${brl(splitRemaining)} para fechar o pagamento dividido.`
            : `O pagamento dividido passou ${brl(-splitRemaining)} do total.`
        );
        return;
      }
      // Junta partes repetidas da mesma forma (ex.: duas linhas de PIX)
      const somadas: { method: string; amount: number }[] = [];
      partes.forEach(p => {
        const ja = somadas.find(s => s.method === p.method);
        if (ja) ja.amount = round2(ja.amount + p.amount);
        else somadas.push({ ...p });
      });
      paymentMethodToSave = formatSplitPayment(somadas);
    }

    if (cashPortion > 0 && cashAmountGiven && parseValor(cashAmountGiven) < cashPortion) {
      setErrorMessage(`O valor recebido em dinheiro é menor que ${brl(cashPortion)}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Monta os itens estruturados do pedido
      const formattedItems = cart.map(item => {
        let name = item.menuItem.name;
        if (item.size) {
          name += ` (${item.size === '1L' ? 'Pote Recheado 1 Litro' : item.size})`;
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
          notes: [textoEscolhas(regrasDoProduto(item.menuItem).escolhas, item.escolhas || {}), item.notes || '']
            .filter(Boolean)
            .join(' | ') || null
        };
      });

      // A tabela orders não tem colunas de mesa, referência, taxa de entrega nem desconto:
      // esses dados vão nas observações, no mesmo padrão do desconto de cashback do cardápio.
      const notesParts: string[] = [];
      if (orderType === 'mesa' && tableNumber.trim()) notesParts.push(`Mesa/Comanda: ${tableNumber.trim()}`);
      if (orderType === 'entrega' && deliveryReference.trim()) notesParts.push(`Referência: ${deliveryReference.trim()}`);
      if (orderType === 'entrega' && deliveryFee > 0) notesParts.push(`[Taxa de entrega: ${brl(deliveryFee)}]`);
      if (adjustmentAmount !== 0) {
        const rotulo = adjustmentType === 'discount' ? 'Desconto' : 'Acréscimo';
        const pct = adjustmentMode === 'percent' ? ` ${parseValor(adjustmentValue)}%` : '';
        notesParts.push(`[${rotulo}${pct}: ${adjustmentAmount < 0 ? '-' : '+'}${brl(Math.abs(adjustmentAmount))}]`);
      }
      if (cashbackUsed > 0) notesParts.push(`[Desconto Cashback: R$ ${cashbackUsed.toFixed(2)}]`);
      if (calculatedChange > 0) notesParts.push(`[Troco: ${brl(calculatedChange)}]`);
      if (orderNotes.trim()) notesParts.push(orderNotes.trim());

      const orderPayload: any = {
        customer_name: customerName.trim() || (orderType === 'mesa' ? `Mesa ${tableNumber}` : 'Cliente Balcão'),
        // Só números, igual ao cardápio online: liga o pedido ao cliente e ao cashback
        customer_phone: phoneDigits || null,
        nif: customerNif.trim() || null,
        order_type: orderType,
        delivery_address: orderType === 'entrega' ? deliveryAddress.trim() : null,
        delivery_zone: orderType === 'entrega' ? (deliveryZone || null) : null,
        change_for: cashPortion > 0 && cashAmountGiven ? parseValor(cashAmountGiven).toFixed(2) : null,
        items: formattedItems,
        total_amount: totalAmount,
        status: 'Finalizado',
        payment_method: paymentMethodToSave,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : null,
        cash_session_id: activeSessionId || null,
        created_at: new Date().toISOString()
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      if (telefoneValido && (cashbackEarned > 0 || cashbackUsed > 0)) {
        try {
          await applyOrderCashback(phoneDigits, cashbackEarned, cashbackUsed, newOrder?.id);
        } catch (cbErr) {
          console.warn('[PDV] Pedido gravado, mas o cashback não foi atualizado:', cbErr);
        }
      }

      onOrderCreated(newOrder);
      resetOrder();
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
                                {item.size === '1L' ? 'Pote Recheado 1L' : `Copo ${item.size}`}
                              </span>
                            )}

                            {/* Adicionais selecionados */}
                            {item.selectedExtras && item.selectedExtras.length > 0 && (
                              <div className="text-[10px] text-stone-500 mt-1 pl-1 border-l-2 border-purple-300">
                                {agruparExtras(item.selectedExtras).map(g => (
                                  <div key={g.extra.id}>+ {nomeExtraAgrupado(g)} (R$ {(g.extra.price * g.qtd).toFixed(2)})</div>
                                ))}
                              </div>
                            )}

                            {/* Creme gelado / sabor */}
                            {item.escolhas && textoEscolhas(regrasDoProduto(item.menuItem).escolhas, item.escolhas) && (
                              <p className="text-[10px] text-[#4d0471] font-bold mt-0.5">
                                {textoEscolhas(regrasDoProduto(item.menuItem).escolhas, item.escolhas)}
                              </p>
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
            <div className="p-3 bg-stone-50 border-t border-stone-200 space-y-2 shrink-0 max-h-[60vh] overflow-y-auto">
              {/* DESCONTO OU ACRÉSCIMO */}
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Desconto / Acréscimo
                </label>
                <div className="grid grid-cols-3 gap-1 bg-stone-200/80 p-0.5 rounded-lg">
                  {([
                    { id: 'none', label: 'Nenhum' },
                    { id: 'discount', label: 'Desconto' },
                    { id: 'surcharge', label: 'Acréscimo' }
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setAdjustmentType(opt.id);
                        if (opt.id === 'none') setAdjustmentValue('');
                      }}
                      className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        adjustmentType === opt.id
                          ? opt.id === 'discount'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : opt.id === 'surcharge'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-white text-stone-800 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {adjustmentType !== 'none' && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex bg-stone-200/80 p-0.5 rounded-lg shrink-0">
                      {([
                        { id: 'fixed', label: 'R$' },
                        { id: 'percent', label: '%' }
                      ] as const).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAdjustmentMode(m.id)}
                          className={`w-9 py-1 rounded-md text-[11px] font-black cursor-pointer ${
                            adjustmentMode === m.id ? 'bg-[#4d0471] text-white' : 'text-stone-600'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={adjustmentMode === 'percent' && adjustmentType === 'discount' ? 100 : undefined}
                      value={adjustmentValue}
                      onChange={e => setAdjustmentValue(e.target.value)}
                      placeholder={adjustmentMode === 'percent' ? 'Ex: 10' : 'Ex: 5,00'}
                      className="flex-1 min-w-0 h-7 px-2 bg-white border border-stone-300 rounded text-xs font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                    />
                    <span className={`text-xs font-mono font-black shrink-0 ${adjustmentAmount < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {adjustmentAmount === 0 ? '' : `${adjustmentAmount < 0 ? '-' : '+'} ${brl(Math.abs(adjustmentAmount))}`}
                    </span>
                  </div>
                )}
              </div>

              {/* CASHBACK DO CLIENTE */}
              {cashbackConfig.enabled && telefoneValido && (
                <div className="pt-2 border-t border-stone-200">
                  {loadingCashback ? (
                    <p className="text-[11px] text-stone-400">Consultando cashback...</p>
                  ) : (
                    <div className="space-y-1">
                      {cashbackInfo && cashbackInfo.saldo > 0 ? (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-stone-900 block">
                              Cashback: R$ {cashbackInfo.saldo.toFixed(2)}
                            </span>
                            {cashbackInfo.proximoVencimento && (
                              <span className="text-[10px] text-amber-800 block">
                                R$ {cashbackInfo.valorProximoVencimento.toFixed(2)} vence em {dataCurta(cashbackInfo.proximoVencimento)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseCashback(v => !v)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer shrink-0 ${
                              useCashback
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            {useCashback ? '✓ Usando saldo' : 'Usar saldo'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-500">Cliente sem saldo de cashback.</p>
                      )}
                      {cashbackEarned > 0 && (
                        <p className="text-[11px] text-amber-700 font-bold">
                          + R$ {cashbackEarned.toFixed(2)} de cashback nesta venda ({cashbackConfig.percent}%)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FORMA DE PAGAMENTO */}
              <div className="pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Forma de Pagamento
                  </label>
                  <button
                    type="button"
                    onClick={() => (splitMode ? cancelSplit() : startSplit())}
                    className="text-[10px] font-bold text-[#4d0471] hover:underline cursor-pointer"
                  >
                    {splitMode ? 'Voltar para uma forma' : 'Dividir pagamento'}
                  </button>
                </div>

                {!splitMode ? (
                  <div className="grid grid-cols-2 gap-1">
                    {PDV_PAYMENT_METHODS.map(method => (
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
                ) : (
                  <div className="space-y-1.5">
                    {splitParts.map((part, i) => (
                      <div key={part.id} className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-stone-400 w-3 shrink-0">{i + 1}</span>
                        <select
                          value={part.method}
                          onChange={e => updateSplitPart(part.id, { method: e.target.value as PDVPaymentMethod })}
                          className="h-7 px-1 bg-white border border-stone-300 rounded text-[11px] font-bold text-stone-800 cursor-pointer min-w-0 flex-1"
                        >
                          {PDV_PAYMENT_METHODS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={part.amount}
                          onChange={e => updateSplitPart(part.id, { amount: e.target.value })}
                          placeholder="0,00"
                          className="w-20 h-7 px-1.5 bg-white border border-stone-300 rounded text-xs font-mono font-bold shrink-0 focus:outline-hidden focus:ring-1 focus:ring-[#4d0471]"
                        />
                        <button
                          type="button"
                          onClick={() => fillSplitRemaining(part.id)}
                          title="Colocar aqui o valor que falta"
                          className="h-7 px-1.5 rounded border border-stone-300 bg-white text-[10px] font-bold text-[#4d0471] hover:bg-purple-50 cursor-pointer shrink-0"
                        >
                          Resto
                        </button>
                        {splitParts.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeSplitPart(part.id)}
                            title="Remover"
                            className="w-6 h-7 rounded border border-stone-200 bg-white text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={addSplitPart}
                        className="text-[11px] font-bold text-[#4d0471] hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus size={11} /> Outra forma
                      </button>
                      <span
                        className={`text-[11px] font-bold font-mono ${
                          Math.abs(splitRemaining) < 0.01
                            ? 'text-emerald-700'
                            : splitRemaining > 0
                              ? 'text-amber-700'
                              : 'text-red-600'
                        }`}
                      >
                        {Math.abs(splitRemaining) < 0.01
                          ? '✓ Pagamento fechado'
                          : splitRemaining > 0
                            ? `Falta ${brl(splitRemaining)}`
                            : `Passou ${brl(-splitRemaining)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Troco: aparece quando alguma parte é em dinheiro */}
              {cashPortion > 0 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div>
                    <label className="text-[10px] text-stone-500 font-bold block mb-0.5">
                      {splitMode ? `Recebido em dinheiro (de ${brl(cashPortion)})` : 'Valor Pago (R$)'}
                    </label>
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
                {adjustmentAmount !== 0 && (
                  <div className={`flex justify-between ${adjustmentAmount < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                    <span>
                      {adjustmentAmount < 0 ? 'Desconto' : 'Acréscimo'}
                      {adjustmentMode === 'percent' ? ` (${parseValor(adjustmentValue)}%)` : ''}
                    </span>
                    <span className="font-mono">{adjustmentAmount < 0 ? '-' : '+'} R$ {Math.abs(adjustmentAmount).toFixed(2)}</span>
                  </div>
                )}
                {cashbackUsed > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Cashback usado</span>
                    <span className="font-mono">- R$ {cashbackUsed.toFixed(2)}</span>
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

                  {/* CREME GELADO / SABOR E ADICIONAIS (mesmas regras do Multipedidos) */}
                  <VariacoesProduto
                    compacto
                    regras={regrasDoProduto(customizingItem)}
                    extrasList={availableExtras || []}
                    escolhas={customEscolhas}
                    onEscolhasChange={(v) => { setCustomEscolhas(v); setCustomAviso(''); }}
                    extras={customExtras}
                    onExtrasChange={setCustomExtras}
                  />

                  {customAviso && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                      {customAviso}
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
