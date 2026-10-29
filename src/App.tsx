

// Commit trigger - updated
import { supabase } from "./lib/supabase";
import React, { useState, useEffect, useMemo } from "react";
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
import { Search, Plus, ShoppingBag, X, Instagram, MapPin, ChevronDown, ArrowUp } from "lucide-react";
import Cart from "./components/Cart";
import MenuItemCard from "./components/MenuItemCard";
import PizzaModal from "./components/PizzaModal";
import Footer from "./components/Footer";
import PromoModal from "./components/PromoModal";
import MenuDoDiaModal from "./components/MenuDoDiaModal";


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
function App() {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();
  const businessStatus = useBusinessHours();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("tradicionais");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('page_view');
  }, []);



  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isMenuDoDiaOpen, setIsMenuDoDiaOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [pausedItemsLoaded, setPausedItemsLoaded] = useState(false);
  const [hasOpenedPromoAutomatically, setHasOpenedPromoAutomatically] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);

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

    const existingIndex = cart.findIndex(
      (item) =>
        item.menuItem.id === newItem.menuItem.id && item.size === newItem.size,
    );
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += newItem.quantity;
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

  if (!businessStatus.loading && businessStatus.subscriptionStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cardápio Indisponível</h1>
          <p className="text-gray-600 mb-6 font-medium">
            Nosso cardápio digital está temporariamente fora do ar. Por favor, tente novamente mais tarde ou faça seu pedido diretamente pelo nosso WhatsApp.
          </p>
          <a
            href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#20bd5a] transition-colors shadow-lg active:scale-95"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a] scroll-smooth pb-20 lg:pb-0">
      {/* Navbar Topo */}
      {/* iFood Style Header */}
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:gap-0 md:flex-row md:items-center justify-between">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="font-bold text-2xl drop-shadow-sm text-[#6a2092] flex items-center gap-1.5">
                Mais Açaí <span className="text-xl">💜</span>
              </div>
              {!businessStatus.loading && (
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  businessStatus.isOpen 
                    ? "bg-purple-50 text-purple-800 border-purple-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    businessStatus.isOpen ? "bg-purple-600 animate-pulse" : "bg-rose-500"
                  }`} />
                  <span>{businessStatus.isOpen ? "Aberto • 45-75 min" : "Fechado"}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsPromoOpen(true)}
              className="md:hidden font-bold text-[#6a2092] transition-colors text-xs border border-[#6a2092] rounded-full px-2.5 py-1 hover:bg-[#6a2092] hover:text-white"
            >
              COMBOS ESPECIAIS
            </button>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-full md:w-[350px] relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Busque seu açaí, combo, milkshake..."
                 className="w-full bg-gray-100 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#6a2092]/40 outline-none transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button
              onClick={() => setIsPromoOpen(true)}
              className="hidden md:block font-bold text-[#6a2092] transition-colors text-sm hover:underline"
            >
              COMBOS ESPECIAIS
            </button>
          </div>
        </div>
      </header>

      {!businessStatus.loading && !businessStatus.isOpen && (
        <div className="bg-[#4d0471] text-white text-center py-2 px-4 text-sm font-semibold">
          🔴 Estamos fechados no momento{businessStatus.todayLabel ? ` — hoje funcionamos das ${businessStatus.todayLabel}` : ''}. Você pode navegar no cardápio, mas o pedido só pode ser finalizado durante o horário de funcionamento.
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative h-[220px] md:h-[280px] w-full bg-[#1c0524] max-w-7xl mx-auto md:mt-4 md:rounded-2xl overflow-hidden shadow-sm">
        <img
          src="/capa.png"
          className="w-full h-full object-cover opacity-90"
          alt="Mais Açaí Capa Oficial"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>
        <div className="absolute bottom-6 left-6 md:left-12 flex items-center gap-4">
          <div className="w-24 h-24 bg-[#1c0524] rounded-full border-4 border-white flex items-center justify-center text-white scale-110 shadow-xl overflow-hidden drop-shadow-2xl relative group">
            <img
              src="/logo.png"
              alt="Mais Açaí - Desde 2016"
              className="w-full h-full object-cover absolute inset-0 z-20"
            />
          </div>
          <div className="text-white drop-shadow-md hidden sm:block">
            <h1 className="text-2xl font-black leading-tight">Mais Açaí</h1>
            <p className="text-xs text-purple-200 font-medium">Desde 2016 • São José dos Pinhais / PR</p>
          </div>
        </div>
      </div>

      {/* Categories Bar Sticky */}
      <div 
        id="categories-bar"
        className="bg-white border-b border-gray-200 sticky top-[108px] md:top-[64px] z-30 shadow-xs relative"
      >
        <div 
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="max-w-7xl mx-auto flex overflow-x-auto custom-scrollbar gap-1 px-2.5 py-1.5 items-center"
        >
          {currentCategoriesUI.map((cat) => {
            const shortLabel = cat.label
              .replace(/^OS\s+MAIS\s+PEDIDOS/i, 'MAIS PEDIDOS')
              .replace(/^PIZZAS\s+/i, '')
              .replace(/^ESFIHAS\s+SALGADAS\s+/i, 'ESF. ')
              .replace(/^ESFIHAS\s+/i, 'ESF. ');

            return (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              onClick={(e) => {
                if (cat.id === "menu-do-dia") {
                  e.preventDefault();
                  setIsMenuDoDiaOpen(true);
                  return;
                }
                hapticLight();
                setActiveCategory(cat.id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) {
                  e.preventDefault();
                  const yOffset = -140; // compensate for sticky header
                  const y =
                    el.getBoundingClientRect().top +
                    window.pageYOffset +
                    yOffset;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className={`py-0.5 md:py-1 px-2 md:px-2.5 rounded-full text-[10px] md:text-[11px] whitespace-nowrap font-bold tracking-tight transition-all duration-150 active:scale-95 active:opacity-70 cursor-pointer border ${
                activeCategory === cat.id
                  ? "bg-[#4d0471] text-white border-[#4d0471] shadow-2xs"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900"
              } ${cat.id === "promocoes" && activeCategory !== cat.id ? "animate-pulse text-[#4d0471] border-[#4d0471]" : ""}`}
              title={cat.label}
            >
              {shortLabel}
            </a>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 flex flex-col lg:flex-row gap-8">
        {/* Left Column - Main Content */}
        <div className="w-full lg:flex-1 min-w-0">
          {/* Products Grids */}
          <div className="space-y-10 md:space-y-12 pb-12 lg:pb-24">
            {currentCategoriesUI.map((cat) => {
              if (cat.id === "menu-do-dia") return null;
              
              const items = itemsByCategory[cat.id];
              if (items.length === 0) return null;

              return (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
                    <>
                      <h2 className="text-[26px] font-extrabold text-[#1a1a1a] mb-1">
                        {cat.label}
                      </h2>
                      <p className="text-gray-500 mb-6 text-[15px] font-medium">
                        {cat.sub}
                      </p>
                    </>

                  <div
                    className={
                      cat.id === "promocoes"
                        ? "flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory"
                        : "grid gap-4 grid-cols-1 sm:grid-cols-2"
                    }
                  >
                    {items.map((item) => {
                      const cacheKey = item.id + (item.isMaisPedido ? "-mp" : "");
                      const failedImage = failedImages[cacheKey] || false;
                      return (
                        <div 
                          key={cacheKey}
                          className={cat.id === "promocoes" ? "flex-none w-[280px] snap-center" : ""}
                        >
                          <MenuItemCard
                            item={item}
                            catId={cat.id}
                            failedImage={failedImage}
                            onClick={() => handleSelectItem(item)}
                            onZoom={(src) => setZoomedImage(src)}
                            onImageError={() =>
                              setFailedImages((prev) => ({ ...prev, [cacheKey]: true }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.values(itemsByCategory).every(
              (arr: any) => arr.length === 0,
            ) && (
              <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  Nenhum produto encontrado na pesquisa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Desktop Cart integration */}
        <div className="w-full lg:w-[380px] xl:w-[400px] lg:shrink-0 relative">
          <Cart
            items={cart}
            onUpdateQuantity={(id, delta) => {
              const updatedCart = cart.map((c) =>
                c.id === id
                  ? { ...c, quantity: Math.max(1, c.quantity + delta) }
                  : c
              );
              saveCart(updatedCart);
            }}
            onRemoveItem={(id) => saveCart(cart.filter((c) => c.id !== id))}
            onClearCart={() => saveCart([])}
            onAddToCart={handleAddToCart}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />
        </div>
      </div>

      <Footer />

      {/* Floating Action Buttons */}

      {/* Mobile view cart toggle - Only visible when items are in cart */}
      {totalCartQty > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden z-40 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.12)] transition-all animate-in slide-in-from-bottom duration-200">
          <button
            onClick={() => {
              hapticMedium();
              setIsCartOpen(true);
            }}
            className="w-full bg-[#4d0471] text-white font-extrabold text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-between shadow-xl active:scale-[0.98] transition-all hover:bg-[#380252]"
          >
            <div className="flex items-center gap-2">
              <div className={`relative transition-transform duration-300 ${cartBounce ? 'scale-125 rotate-6' : 'scale-100'}`}>
                <ShoppingBag className="w-5 h-5 text-[#fdde58]" />
                <span className="absolute -top-1.5 -right-2 bg-[#fdde58] text-[#1a1a1a] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartQty}
                </span>
              </div>
              <span className="ml-1">Ver Sacola</span>
            </div>
            <span className="bg-white/20 px-2.5 py-1 rounded-lg text-sm tracking-wide font-black">
              R$ {totalCartPrice.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Scroll to Top Floating Button */}
      {showScrollTop && (
        <button
          onClick={() => {
            hapticLight();
            const el = document.getElementById("categories-bar");
            if (el) {
              const yOffset = -120;
              const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="fixed bottom-24 lg:bottom-8 left-4 sm:left-6 w-12 h-12 bg-white/95 backdrop-blur-md text-[#4d0471] rounded-full flex items-center justify-center shadow-lg border border-stone-200 hover:bg-[#4d0471] hover:text-white transition-all active:scale-95 z-30 group"
          title="Voltar ao topo do cardápio"
          aria-label="Voltar ao topo do cardápio"
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 lg:bottom-8 right-6 w-[60px] h-[60px] bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-30 group"
      >
        <span className="absolute inset-0 rounded-full border-[3px] border-[#25D366] animate-ping opacity-30"></span>
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="w-[34px] h-[34px] ml-0.5 mt-0.5 drop-shadow-sm"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>

      {/* Pizza configuration modal */}
      <PizzaModal
        pausedItems={pausedItems}
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSize="G"
        onAddToCart={handleAddToCart}
        allMenuItems={menuItems}
      />
      {/* Menu do Dia Modal */}
      <MenuDoDiaModal
        isOpen={isMenuDoDiaOpen}
        onClose={() => setIsMenuDoDiaOpen(false)}
        onSelectItem={handleSelectItem}
        menuItems={menuItems}
      />
      {/* Promoções Modal */}
      <PromoModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
      />
      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full flex justify-center items-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
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
