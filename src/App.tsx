

// Commit trigger - updated
import { supabase } from "./lib/supabase";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMenu } from "./hooks/useMenu";
import { useBusinessHours } from "./hooks/useBusinessHours";
import {
  MenuItem,
  menuPizzas,
  menuEsfihas,
  menuBordas,
  menuBebidas,
  menuDoDia,
  RESTAURANT_WHATSAPP_PHONE,
} from "./data/menu";
import { CartItem } from "./types";
import { playVictorySound } from "./utils/sound";
import { getStoreDate } from "./utils/date";
import { hapticLight, hapticMedium, hapticSuccess } from "./utils/haptics";
import { Search, ShoppingBag, X, MapPin, ArrowUp, Clock, Bike, Check, ChevronRight, Receipt, Star } from "lucide-react";
import { brl, nomeBonito, tituloCategoria } from "./utils/formatacao";
import Cart from "./components/Cart";
import MenuItemCard from "./components/MenuItemCard";
import PizzaModal from "./components/PizzaModal";
import Footer from "./components/Footer";
import PromoModal from "./components/PromoModal";
import MenuDoDiaModal from "./components/MenuDoDiaModal";
import GhostCursor from "./components/GhostCursor";
import ContaCliente from "./components/ContaCliente";
import PublicReviewsModal from "./components/PublicReviewsModal";
import { useExtras } from "./hooks/useExtras";
import { montarItensParaRepetir } from "./utils/repetirPedido";
import { PedidoCliente, ultimoPedido, esquecerUltimoPedido, rotuloStatus, STATUS_FINAIS, ehDeHoje } from "./utils/contaCliente";


export const categoriesUI = [
  {
    id: "mais-vendidos",
    label: "MAIS VENDIDOS 🔥",
    sub: "Os queridinhos dos nossos clientes",
    group: ["mais-vendidos"],
  },
  {
    id: "novidades",
    label: "NOVIDADES ✨",
    sub: "Lançamentos e criações exclusivas",
    group: ["novidades"],
  },
  {
    id: "monte-do-seu-jeito",
    label: "MONTE DO SEU JEITO 🍧",
    sub: "Escolha o tamanho e monte com seus acompanhamentos",
    group: ["monte-do-seu-jeito"],
  },
  {
    id: "combos-especiais",
    label: "COMBOS ESPECIAIS 💜",
    sub: "Combinações prontas irresistíveis",
    group: ["combos-especiais"],
  },
  {
    id: "kits-promocionais",
    label: "KITS PROMOCIONAIS 📦",
    sub: "Kits 1 Litro, 2 Litros e Festa",
    group: ["kits-promocionais"],
  },
  {
    id: "milkshakes",
    label: "MILKSHAKES 🥤",
    sub: "Cremosos, refrescantes e cheios de sabor",
    group: ["milkshakes"],
  },
  {
    id: "bebidas",
    label: "BEBIDAS DIVERSAS 🧃",
    sub: "Sucos naturais de açaí e bebidas",
    group: ["bebidas"],
  },
];

import { useAnalytics } from './hooks/useAnalytics';

export default // App principal
function App({ abrirConta = false }: { abrirConta?: boolean }) {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();
  const businessStatus = useBusinessHours();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ key: number; nome: string; titulo?: string; aviso?: string } | null>(null);
  // Área do cliente ("Meus pedidos") e pedido em andamento feito neste aparelho
  const [contaAberta, setContaAberta] = useState(abrirConta);
  const [pedidoAtivo, setPedidoAtivo] = useState<{ codigo: string; id: number; status: string; tipo: string } | null>(null);
  const extrasAtuais = useExtras();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Enquanto a página rola por clique numa aba, o scrollspy não troca a aba ativa
  const scrollLockRef = useRef(false);
  
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('page_view');
  }, []);



  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isMenuDoDiaOpen, setIsMenuDoDiaOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [storeRating, setStoreRating] = useState('');
  const [reviewsCount, setReviewsCount] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [pausedItemsLoaded, setPausedItemsLoaded] = useState(false);
  const [hasOpenedPromoAutomatically, setHasOpenedPromoAutomatically] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>('/capa.png');

  // Carrega resumo das avaliações públicas da loja
  useEffect(() => {
    async function loadRatingSummary() {
      try {
        const { data } = await supabase
          .from('order_reviews')
          .select('rating')
          .eq('is_public', true);
        if (data && data.length > 0) {
          const avg = (data.reduce((a, b) => a + (b.rating || 5), 0) / data.length).toFixed(1);
          setStoreRating(avg);
          setReviewsCount(data.length);
        }
      } catch (err) {
        console.warn('Aviso ao carregar resumo de avaliações:', err);
      }
    }
    loadRatingSummary();
  }, []);

  // Histórico de navegação do navegador e botão "Voltar" do celular
  // Evita que o usuário saia do cardápio digital quando estiver navegando/selecionando produto
  useEffect(() => {
    const handlePopState = () => {
      if (isReviewsOpen) {
        setIsReviewsOpen(false);
        return;
      }
      if (zoomedImage) {
        setZoomedImage(null);
        return;
      }
      if (isModalOpen) {
        setIsModalOpen(false);
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        return;
      }
      if (contaAberta) {
        setContaAberta(false);
        return;
      }
      if (isPromoOpen) {
        setIsPromoOpen(false);
        return;
      }
      if (isMenuDoDiaOpen) {
        setIsMenuDoDiaOpen(false);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isReviewsOpen, zoomedImage, isModalOpen, isCartOpen, contaAberta, isPromoOpen, isMenuDoDiaOpen]);

  useEffect(() => {
    const loadCover = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'store_cover_url')
          .maybeSingle();
        if (data && data.value) {
          setCoverUrl(data.value);
        }
      } catch (err) {
        console.warn('Erro ao carregar capa da loja:', err);
      }
    };
    loadCover();

    const channelId = `public:settings-cover-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
        if ((payload.new as any)?.key === 'store_cover_url') {
          setCoverUrl((payload.new as any).value || '/capa.png');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dismiss zoomed image on ESC
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  useEffect(() => {
    if (!menuLoading && pausedItemsLoaded && menuItems.length > 0 && !hasOpenedPromoAutomatically) {
      const todayDayOfWeek = new Date().getDay();
      const todaysPromos = menuItems.filter(i => 
        (i.category === 'promocoes' || (i as any).groupOverride === 'promocoes') && 
        i.dayOfWeek === todayDayOfWeek &&
        !pausedItems.includes(i.id)
      );
      if (todaysPromos.length > 0) {
        setIsMenuDoDiaOpen(true);
      }
      setHasOpenedPromoAutomatically(true);
    }
  }, [menuLoading, pausedItemsLoaded, menuItems, pausedItems, hasOpenedPromoAutomatically]);

  // Tempo de entrega cadastrado no gestor (o mesmo que aparece no checkout)
  const [tempoEntrega, setTempoEntrega] = useState("45 a 75 min");
  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'delivery_time_estimate')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setTempoEntrega(String(data.value));
      });
  }, []);

  useEffect(() => {
    const fetchPausedItems = async () => {
      try {
        const { data, error } = await supabase.from('paused_items').select('id');
        if (error) throw error;
        if (data) {
          setPausedItems(data.map(item => item.id));
        }
      } catch (err) {
        console.error("Failed to fetch paused items", err);
      } finally {
        setPausedItemsLoaded(true);
      }
    };
    fetchPausedItems();

    const channel = supabase.channel('public:paused_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paused_items' }, payload => {
        fetchPausedItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("maisacaisjp-cart") || localStorage.getItem("pizzeria-cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("maisacaisjp-cart", JSON.stringify(newCart));
  };

  const handleAddToCart = (newItem: CartItem, openCart: boolean = true) => {
    trackEvent('add_to_cart', { 
      item_id: newItem.menuItem.id, 
      item_name: newItem.menuItem.name, 
      price: newItem.priceCalculated 
    });
    
    hapticMedium();

    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);
    setToast({ key: Date.now(), nome: nomeBonito(newItem.menuItem.name) });

    // Só soma na mesma linha se for o mesmo produto, tamanho, adicionais e observação.
    // Dois copos de 550ml com adicionais diferentes ficam em linhas separadas.
    const extrasKey = (i: CartItem) => (i.extras || []).map(e => e.id).sort().join(',');
    const existingIndex = cart.findIndex(
      (item) =>
        item.menuItem.id === newItem.menuItem.id &&
        item.size === newItem.size &&
        extrasKey(item) === extrasKey(newItem) &&
        (item.notes || '') === (newItem.notes || ''),
    );
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + newItem.quantity,
      };
      saveCart(updatedCart);
    } else {
      saveCart([...cart, newItem]);
    }
    // Mobile open cart automatically after adding if requested
    if (openCart && window.innerWidth < 1024) {
      setIsCartOpen(true);
    }
  };

  // Create 'Mais Pedidos' items — agora vem do banco (campo is_bestseller),
  // não mais de uma lista fixa no código.
  const maisPedidosIds = useMemo(
    () => menuItems.filter((item: any) => item.isBestseller).map((item) => item.id),
    [menuItems]
  );

  // Aggregated array of all items
  const allItems = useMemo(() => {
    const baseItems = menuItems.filter(item => !pausedItems.includes(item.id));


    const maisPedidosItems = baseItems
      .filter((item) => maisPedidosIds.includes(item.id))
      .map((item) => ({
        ...item,
        isMaisPedido: true,
        groupOverride: "mais-pedidos",
      }));

    return [...maisPedidosItems, ...baseItems];
  }, [pausedItems, maisPedidosIds]);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    try {
      window.history.pushState({ modal: 'produto' }, '');
    } catch {
      // fallback
    }
  };

  const handleCloseItemModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'produto') {
      window.history.back();
    }
  };

  const handleOpenReviews = () => {
    hapticLight();
    setIsReviewsOpen(true);
    try {
      window.history.pushState({ modal: 'avaliacoes' }, '');
    } catch {
      // fallback
    }
  };

  const handleCloseReviews = () => {
    setIsReviewsOpen(false);
    if (window.history.state?.modal === 'avaliacoes') {
      window.history.back();
    }
  };

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCalculated * item.quantity, 0),
    [cart]
  );

  // Grouping for render (Memoized for performance)
  const currentCategoriesUI = useMemo(() => {
    if (usingFallback || !dbCategories || dbCategories.length === 0) {
       return categoriesUI; // Use os hardcoded se o banco não estiver disponível
    }

    const tabsMap: Record<string, { id: string; label: string; sub: string; group: string[]; order: number }> = {};
    dbCategories.forEach((cat: any) => {
      // Adicionais e bordas são complementos de montagem nos modais, não categorias de vitrine direta
      if (cat.id === 'adicionais' || cat.id === 'adicionais-extras' || cat.id === 'bordas') return;

      const tabId = cat.display_group || cat.id;
      if (!tabsMap[tabId]) {
        tabsMap[tabId] = {
          id: tabId,
          label: cat.display_label || cat.name.toUpperCase(),
          sub: cat.display_sub || "",
          group: [],
          order: cat.order_index ?? 999,
        };
      }
      tabsMap[tabId].group.push(cat.id);
    });

    const dbTabs = Object.values(tabsMap);

    const hasBestsellers = menuItems.some((item: any) => item.isBestseller);
    const allTabs = hasBestsellers && !tabsMap['mais-pedidos']
      ? [...dbTabs, { id: "mais-pedidos", label: "OS MAIS PEDIDOS 🔥", sub: "Os queridinhos dos nossos clientes", group: ["mais-pedidos"], order: 0 }]
      : dbTabs;

    return allTabs.sort((a, b) => a.order - b.order);
  }, [dbCategories, usingFallback, menuItems]);

  const itemsByCategory = useMemo(() => {
    const map: Record<
      string,
      (MenuItem & { isMaisPedido?: boolean; groupOverride?: string })[]
    > = {};
    currentCategoriesUI.forEach((cat) => {
      let matchingItems = allItems.filter((item) => {
        const itemExt = item as MenuItem & {
          isMaisPedido?: boolean;
          groupOverride?: string;
        };
        if (itemExt.groupOverride) {
          return cat.group.includes(itemExt.groupOverride);
        }
        // Se a pizza está nos 'mais pedidos' (sem ser o override em si), não mostrar na aba original
        if (maisPedidosIds.includes(item.id)) {
          return false;
        }
        
        let isMatch = cat.group.includes(item.category);
        
        return isMatch;
      }) as (MenuItem & { isMaisPedido?: boolean; groupOverride?: string })[];
      
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        matchingItems = matchingItems.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.ingredients && item.ingredients.toLowerCase().includes(term)),
        );
      }
      map[cat.id] = matchingItems;
    });
    return map;
  }, [allItems, searchTerm, currentCategoriesUI]); // Re-calculate only when these change

  // Subtítulo da seção: o do banco; se vier vazio, o texto padrão da categoria
  const subPadrao = (id: string, sub: string) =>
    sub || categoriesUI.find((c) => c.id === id)?.sub || (id === "mais-pedidos" ? "Os queridinhos dos nossos clientes" : "");

  // Só aparecem abas de categorias que têm produto (evita "Mais pedidos" e "Mais vendidos" repetidos)
  const visibleCategories = useMemo(
    () => currentCategoriesUI.filter((cat) => cat.id !== "menu-do-dia" && (itemsByCategory[cat.id] || []).length > 0),
    [currentCategoriesUI, itemsByCategory]
  );
  const totalResultados = useMemo(
    () => visibleCategories.reduce((n, c) => n + (itemsByCategory[c.id] || []).length, 0),
    [visibleCategories, itemsByCategory]
  );

  // Rola a barra de abas até a aba ativa (sem mexer na rolagem da página)
  const centralizarAba = useCallback((id: string) => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    if (!bar || !tab) return;
    bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: "smooth" });
  }, []);

  // Scrollspy: a aba ativa acompanha a seção que está na tela
  useEffect(() => {
    if (searchTerm.trim() || visibleCategories.length === 0) return;
    const handle = () => {
      if (scrollLockRef.current) return;
      const barra = document.getElementById("categories-bar");
      const limite = (barra?.getBoundingClientRect().bottom || 0) + 24;
      let atual = visibleCategories[0].id;
      for (const cat of visibleCategories) {
        const el = document.getElementById(`cat-${cat.id}`);
        if (el && el.getBoundingClientRect().top <= limite) atual = cat.id;
      }
      setActiveCategory((prev) => (prev === atual ? prev : atual));
    };
    window.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, [visibleCategories, searchTerm]);

  useEffect(() => {
    if (activeCategory) centralizarAba(activeCategory);
  }, [activeCategory, centralizarAba]);

  // Pedido em andamento feito neste aparelho: aviso no topo até ser finalizado
  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const verificar = async () => {
      const ultimo = ultimoPedido();
      if (!ultimo || !ehDeHoje(ultimo.criadoEm)) {
        if (ultimo) esquecerUltimoPedido();
        setPedidoAtivo(null);
        return;
      }
      try {
        const { data } = await supabase.rpc('get_order_by_tracking_code', { p_code: ultimo.codigo });
        const o = Array.isArray(data) ? data[0] : null;
        if (!ativo) return;
        if (!o || STATUS_FINAIS.includes(o.status)) {
          esquecerUltimoPedido();
          setPedidoAtivo(null);
          return;
        }
        setPedidoAtivo({ codigo: ultimo.codigo, id: o.id, status: o.status, tipo: o.order_type });
      } catch {
        // sem conexão: tenta de novo no próximo ciclo
      }
      if (ativo) timer = setTimeout(verificar, 20000);
    };
    verificar();
    const aoVoltar = () => document.visibilityState === 'visible' && verificar();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('maisacai:pedido-enviado', verificar);
    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('maisacai:pedido-enviado', verificar);
    };
  }, []);

  // Aviso "Adicionado à sacola" some sozinho
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.aviso ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 30);
  }, [searchOpen]);

  const irParaCategoria = (id: string) => {
    hapticLight();
    setActiveCategory(id);
    const el = document.getElementById(`cat-${id}`);
    const barra = document.getElementById("categories-bar");
    if (!el) return;
    const offset = (barra?.offsetHeight || 60) + 12;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    scrollLockRef.current = true;
    window.scrollTo({ top: y, behavior: "smooth" });
    setTimeout(() => { scrollLockRef.current = false; }, 900);
  };

  const fecharBusca = () => {
    setSearchTerm("");
    setSearchOpen(false);
  };

  const repetirPedido = (pedido: PedidoCliente) => {
    const { itens, foraDoCardapio } = montarItensParaRepetir(pedido, { menuItems, extras: extrasAtuais, pausedItems });
    if (itens.length === 0) {
      setContaAberta(false);
      setToast({ key: Date.now(), titulo: 'Não foi possível repetir', nome: `Pedido #${pedido.id}`, aviso: 'Os itens desse pedido não estão disponíveis hoje.' });
      return;
    }
    hapticMedium();
    saveCart([...cart, ...itens]);
    setContaAberta(false);
    const qtd = itens.reduce((s, i) => s + i.quantity, 0);
    setToast({
      key: Date.now(),
      nome: `${qtd} ${qtd === 1 ? 'item' : 'itens'} do pedido #${pedido.id}`,
      aviso: foraDoCardapio.length ? `Ficou de fora (em falta hoje): ${foraDoCardapio.map(n => nomeBonito(n)).join(', ')}.` : undefined,
    });
  };

  const abrirSacola = () => {
    hapticMedium();
    setToast(null);
    setIsCartOpen(true);
  };

  // Preloader com identidade visual oficial Mais Açaí (Desde 2016)
  if (menuLoading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#3b0764] via-[#4d0471] to-[#26013a] flex flex-col items-center justify-center p-6 text-white text-center select-none animate-fade-in">
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-[#fdde58]/25 blur-xl animate-pulse" />
          <img
            src="/logo.png"
            alt="Mais Açaí"
            className="relative w-28 h-28 rounded-full shadow-2xl ring-4 ring-[#fdde58]/40 object-cover bg-white"
          />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          Mais Açaí
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fdde58]/15 border border-[#fdde58]/35 shadow-xs mb-6">
          <span className="w-2 h-2 rounded-full bg-[#fdde58] animate-ping" />
          <span className="text-[#fdde58] text-xs sm:text-sm font-bold tracking-wide uppercase">
            Desde 2016 · A primeira loja de açaí
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-white/80 text-xs font-semibold">
          <div className="w-4 h-4 border-2 border-[#fdde58] border-t-transparent rounded-full animate-spin" />
          <span>Carregando cardápio...</span>
        </div>
      </div>
    );
  }

  if (!businessStatus.loading && businessStatus.subscriptionStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl ring-1 ring-stone-200 max-w-md w-full text-center">
          <img src="/logo.png" alt="Mais Açaí" className="w-20 h-20 rounded-full mx-auto mb-5 ring-4 ring-brand-50" />
          <h1 className="font-display text-2xl font-bold text-stone-900 mb-3">Cardápio indisponível</h1>
          <p className="text-stone-600 mb-6 leading-relaxed">
            Nosso cardápio digital está temporariamente fora do ar. Faça seu pedido pelo WhatsApp.
          </p>
          <a
            href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center h-12 px-6 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1fbe5b] transition-colors"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const aberto = businessStatus.isOpen;
  const carregandoStatus = businessStatus.loading;
  const temSacola = totalCartQty > 0;
  const tabAtiva = activeCategory || visibleCategories[0]?.id;

  return (
    <div className="min-h-screen bg-page font-sans text-stone-900">
      <GhostCursor />

      {/* ============ CAPA + LOJA ============ */}
      <header className="relative">
        <div className="relative h-[168px] sm:h-[220px] lg:h-[260px] w-full max-w-6xl mx-auto lg:mt-4 lg:rounded-3xl overflow-hidden bg-brand-900">
          <img src={coverUrl || "/capa.png"} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-brand-900/10 to-transparent" />
          <button
            type="button"
            onClick={() => { hapticLight(); setContaAberta(true); }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-10 px-3.5 rounded-full bg-white/90 backdrop-blur text-[13px] font-semibold text-stone-800 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-brand-700" />
            Meus pedidos
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="relative -mt-14 sm:-mt-16 bg-white rounded-3xl ring-1 ring-stone-200/80 shadow-[0_10px_30px_rgba(38,1,58,0.08)] p-4 sm:p-5">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <img
                src="/logo.png"
                alt="Logo Mais Açaí"
                className="w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white shadow-md -mt-10 sm:-mt-12 shrink-0 bg-brand-900"
              />
              <div className="min-w-0">
                <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold leading-tight tracking-tight text-stone-900">
                  Mais Açaí
                </h1>
                <p className="text-[13px] text-stone-500 truncate">Açaí, combos e milkshakes<span className="hidden sm:inline"> · desde 2016</span></p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] font-medium">
              {/* Avaliações Multipedidos Style */}
              {reviewsCount > 0 && <button
                type="button"
                onClick={handleOpenReviews}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Ver avaliações dos clientes"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="font-black font-mono text-[13px]">{storeRating}</span>
                <span className="text-[11.5px] text-amber-800/80">({reviewsCount})</span>
              </button>}

              {!carregandoStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full ${
                    aberto ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${aberto ? "bg-leaf" : "bg-rose-500"}`} />
                  {aberto ? "Aberto agora" : "Fechado agora"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-100 text-stone-700">
                <Clock className="w-3.5 h-3.5" /> {tempoEntrega}
              </span>
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-100 text-stone-700">
                <Bike className="w-3.5 h-3.5" /> Delivery e retirada
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-100 text-stone-700">
                <MapPin className="w-3.5 h-3.5" /> São José dos Pinhais
              </span>
            </div>

            {pedidoAtivo && (
              <a
                href={`/track/${pedidoAtivo.codigo}`}
                className="mt-3 flex items-center gap-3 rounded-2xl bg-brand-900 text-white px-3.5 py-3 hover:bg-brand-800 transition"
              >
                <span className="relative flex w-2.5 h-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-gold" />
                </span>
                <span className="flex-1 min-w-0 leading-tight">
                  <span className="block text-[12px] text-white/60">Seu pedido #{pedidoAtivo.id}</span>
                  <span className="block font-display text-[15px] font-bold">{rotuloStatus(pedidoAtivo.status, pedidoAtivo.tipo)}</span>
                </span>
                <span className="text-[13px] font-semibold text-gold flex items-center gap-0.5 shrink-0">
                  Acompanhar <ChevronRight className="w-4 h-4" />
                </span>
              </a>
            )}

            {!carregandoStatus && !aberto && (
              <p className="mt-3 text-[13px] leading-relaxed text-stone-600 bg-amber-50 ring-1 ring-amber-200/70 rounded-xl px-3 py-2.5">
                <strong className="font-semibold text-stone-900">
                  {businessStatus.todayLabel ? `Hoje abrimos das ${businessStatus.todayLabel}.` : "Hoje não abrimos."}
                </strong>{" "}
                Você pode montar seu pedido agora e enviar quando a loja abrir.
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ============ BARRA DE CATEGORIAS + BUSCA (fixa no topo) ============ */}
      <nav
        id="categories-bar"
        aria-label="Categorias do cardápio"
        className="sticky top-0 z-40 mt-4 bg-page/90 backdrop-blur-xl border-b border-stone-200/70"
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="h-[60px] flex items-center gap-2">
            {searchOpen ? (
              <div className="flex-1 flex items-center gap-2 animate-fade-in">
                <div className="relative flex-1">
                  <Search className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    placeholder="Buscar açaí, combo, milkshake..."
                    aria-label="Buscar no cardápio"
                    className="w-full h-11 bg-white rounded-xl pl-10 pr-3 text-[16px] text-stone-900 placeholder:text-stone-400 ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-600 outline-none transition-shadow"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      const topoBarra = document.getElementById("categories-bar")?.offsetTop || 0;
                      if (window.scrollY > topoBarra) window.scrollTo({ top: topoBarra });
                    }}
                    onKeyDown={(e) => e.key === "Escape" && fecharBusca()}
                  />
                </div>
                <button
                  type="button"
                  onClick={fecharBusca}
                  className="h-11 px-3 rounded-xl text-[14px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { hapticLight(); setSearchOpen(true); }}
                  aria-label="Buscar no cardápio"
                  className="w-11 h-11 shrink-0 rounded-xl bg-white ring-1 ring-stone-200 text-stone-700 flex items-center justify-center hover:ring-brand-300 hover:text-brand-700 transition cursor-pointer"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
                <div
                  ref={tabsRef}
                  onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
                  className="relative flex-1 min-w-0 flex items-center gap-1 overflow-x-auto hide-scrollbar px-1 [mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-28px),transparent)]"
                >
                  {visibleCategories.map((cat) => {
                    const ativo = tabAtiva === cat.id;
                    return (
                      <a
                        key={cat.id}
                        data-tab={cat.id}
                        href={`#cat-${cat.id}`}
                        aria-current={ativo ? "true" : undefined}
                        onClick={(e) => { e.preventDefault(); irParaCategoria(cat.id); }}
                        className={`h-10 px-4 shrink-0 inline-flex items-center rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                          ativo
                            ? "bg-brand-700 text-white shadow-[0_4px_12px_rgba(77,4,113,0.25)]"
                            : "text-stone-600 hover:text-stone-900 hover:bg-white"
                        }`}
                      >
                        {tituloCategoria(cat.label).replace(/^Os mais pedidos$/i, "Mais pedidos")}
                      </a>
                    );
                  })}
                  <span className="w-4 shrink-0" aria-hidden="true" />
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ============ CARDÁPIO + SACOLA ============ */}
      <main className={`max-w-6xl mx-auto px-4 lg:px-6 pt-5 lg:pt-6 ${temSacola ? "pb-28" : "pb-12"} lg:pb-16 flex flex-col lg:flex-row lg:items-start gap-7 lg:gap-8`}>
        <div className="w-full lg:flex-1 min-w-0">
          {searchTerm.trim() && (
            <p className="mb-4 text-[14px] text-stone-500" aria-live="polite">
              {totalResultados === 0
                ? <>Nada encontrado para <strong className="text-stone-900">“{searchTerm}”</strong>.</>
                : <>{totalResultados} {totalResultados === 1 ? "resultado" : "resultados"} para <strong className="text-stone-900">“{searchTerm}”</strong></>}
            </p>
          )}

          <div className="space-y-10 lg:space-y-12">
            {visibleCategories.map((cat) => {
              const items = itemsByCategory[cat.id];
              const destaque = cat.id === "mais-pedidos" && !searchTerm.trim();
              const sub = subPadrao(cat.id, cat.sub);

              return (
                <section key={cat.id} id={`cat-${cat.id}`} aria-labelledby={`titulo-${cat.id}`} className="scroll-mt-[84px]">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 id={`titulo-${cat.id}`} className="font-display text-[21px] sm:text-[24px] font-extrabold tracking-tight text-stone-900 leading-tight">
                        {tituloCategoria(cat.label)}
                      </h2>
                      {sub && <p className="mt-1 text-[14px] text-stone-500">{sub}</p>}
                    </div>
                    <span className="shrink-0 text-[12px] font-medium text-stone-400 tabular-nums pb-0.5">
                      {items.length} {items.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  <div
                    className={
                      destaque
                        ? "-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-1 scroll-px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible"
                        : "grid gap-3 grid-cols-1 md:grid-cols-2 md:gap-4"
                    }
                  >
                    {items.map((item) => {
                      const cacheKey = item.id + (item.isMaisPedido ? "-mp" : "");
                      return (
                        <div key={cacheKey} className={destaque ? "w-[46%] min-w-[156px] max-w-[200px] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:max-w-none" : ""}>
                          <MenuItemCard
                            item={item}
                            catId={cat.id}
                            variante={destaque ? "destaque" : "lista"}
                            failedImage={failedImages[cacheKey] || false}
                            onClick={() => handleSelectItem(item)}
                            onZoom={(src) => setZoomedImage(src)}
                            onImageError={() => setFailedImages((prev) => ({ ...prev, [cacheKey]: true }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {visibleCategories.length === 0 && (
              <div className="text-center py-16 px-6 bg-white rounded-3xl ring-1 ring-stone-200/80">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <p className="font-display font-bold text-stone-900">
                  {menuLoading ? "Carregando o cardápio..." : "Nenhum produto encontrado"}
                </p>
                {!menuLoading && searchTerm.trim() && (
                  <button type="button" onClick={fecharBusca} className="mt-3 text-[14px] font-semibold text-brand-700 hover:underline cursor-pointer">
                    Limpar busca
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sacola: coluna fixa no desktop, folha de baixo no celular */}
        <aside className="w-full lg:w-[380px] xl:w-[400px] lg:shrink-0 lg:self-stretch" aria-label="Sacola">
          <Cart
            items={cart}
            onUpdateQuantity={(id, delta) => {
              const updatedCart = cart.map((c) =>
                c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
              );
              saveCart(updatedCart);
            }}
            onRemoveItem={(id) => saveCart(cart.filter((c) => c.id !== id))}
            onClearCart={() => saveCart([])}
            onAddToCart={handleAddToCart}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />
        </aside>
      </main>

      <Footer />

      {/* ============ BARRA DA SACOLA (celular) ============ */}
      {temSacola && !isCartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden px-4 pt-3 pb-safe bg-gradient-to-t from-page via-page/95 to-page/0 animate-toast-in">
          <button
            type="button"
            onClick={abrirSacola}
            className="w-full h-14 bg-brand-700 hover:bg-brand-800 active:scale-[0.99] text-white rounded-2xl pl-3 pr-4 flex items-center justify-between shadow-[0_10px_30px_rgba(77,4,113,0.35)] transition cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <span className={`relative w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center transition-transform duration-300 ${cartBounce ? "scale-110" : ""}`}>
                <ShoppingBag className="w-[18px] h-[18px]" />
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gold text-stone-900 text-[11px] font-bold flex items-center justify-center tabular-nums">
                  {totalCartQty}
                </span>
              </span>
              <span className="text-[15px] font-semibold">Ver sacola</span>
            </span>
            <span className="font-display text-[16px] font-bold tabular-nums">{brl(totalCartPrice)}</span>
          </button>
        </div>
      )}

      <ContaCliente isOpen={contaAberta} onClose={() => setContaAberta(false)} onRepetir={repetirPedido} />

      {/* Aviso: item adicionado */}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className={`fixed z-50 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[380px] lg:bottom-6 ${temSacola ? "bottom-[92px]" : "bottom-6"}`}
        >
          <div className="flex items-center gap-3 bg-stone-900 text-white rounded-2xl pl-3 pr-2 py-2 shadow-2xl animate-toast-in">
            <span className="w-7 h-7 rounded-full bg-leaf flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
            <span className="flex-1 min-w-0 text-[14px] leading-snug">
              <span className="block text-white/60 text-[12px]">{toast.titulo || 'Adicionado à sacola'}</span>
              <span className="block font-semibold truncate">{toast.nome}</span>
              {toast.aviso && <span className="block mt-0.5 text-[12px] text-amber-300 leading-snug">{toast.aviso}</span>}
            </span>
            <button
              type="button"
              onClick={abrirSacola}
              className="lg:hidden h-9 px-3 rounded-xl text-[13px] font-semibold text-gold hover:bg-white/10 inline-flex items-center gap-0.5 cursor-pointer"
            >
              Ver <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Voltar ao topo (desktop) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="hidden lg:flex fixed bottom-6 left-6 w-11 h-11 bg-white text-stone-700 rounded-full items-center justify-center shadow-lg ring-1 ring-stone-200 hover:text-brand-700 transition z-30 cursor-pointer"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* WhatsApp */}
      <a
        href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com a loja no WhatsApp"
        className={`fixed right-4 lg:right-6 lg:bottom-6 ${temSacola ? "bottom-[92px]" : "bottom-5"} ${toast || isCartOpen ? "max-lg:opacity-0 max-lg:pointer-events-none" : ""} w-[52px] h-[52px] bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(37,211,102,0.4)] hover:scale-105 transition z-30`}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>

      {/* Montagem do produto */}
      <PizzaModal
        pausedItems={pausedItems}
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseItemModal}
        initialSize="G"
        onAddToCart={handleAddToCart}
        allMenuItems={menuItems}
      />
      <PublicReviewsModal isOpen={isReviewsOpen} onClose={handleCloseReviews} />
      <MenuDoDiaModal
        isOpen={isMenuDoDiaOpen}
        onClose={() => setIsMenuDoDiaOpen(false)}
        onSelectItem={handleSelectItem}
        menuItems={menuItems}
      />
      <PromoModal isOpen={isPromoOpen} onClose={() => setIsPromoOpen(false)} />

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full flex justify-center items-center">
            <button
              onClick={() => setZoomedImage(null)}
              aria-label="Fechar"
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={zoomedImage}
              alt="Produto em destaque"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
