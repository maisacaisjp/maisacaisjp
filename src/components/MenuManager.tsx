import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem, ALL_MENU_ITEMS } from '../data/menu';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Search, ChevronDown, Check } from 'lucide-react';
import { CATEGORIA_CREMES, CREMES_GELADOS } from '../data/variacoes';
import { getSizeOptions } from '../utils/produto';
import { nomeBonito, tituloCategoria } from '../utils/formatacao';
import { ChipFiltro, Paginacao, useLinhasQueCabem, usePaginacao } from './admin/ui';

// Rótulo curto de cada tamanho para os botões de pausa
const ROTULO_TAMANHO: Record<string, string> = { P: '330ml', M: '440ml', G: '550ml', Big: '770ml', 'Super Big': '1 Litro', '2L': '2 Litros' };
const ROTULO_CURTO: Record<string, string> = { P: '330', M: '440', G: '550', Big: '770', 'Super Big': '1L', '2L': '2L' };
// Coluna do banco com o preço de cada tamanho (edição rápida na lista)
const CAMPO_PRECO: Record<string, string> = { P: 'price_p', M: 'price_m', G: 'price_g', Big: 'price_big', 'Super Big': 'price_super_big', '2L': 'price_2l' };

// Linha do banco (snake_case) -> formato usado por getSizeOptions
const tamanhosDoItem = (item: any) =>
  getSizeOptions({
    id: item.id,
    name: item.name,
    category: item.category,
    priceSingle: item.price_single ?? undefined,
    priceP: item.price_p ?? undefined,
    priceM: item.price_m ?? undefined,
    priceG: item.price_g ?? undefined,
    priceBig: item.price_big ?? undefined,
    priceSuperBig: item.price_super_big ?? undefined,
    price2L: item.price_2l ?? undefined,
  } as any);

/**
 * Cria a categoria CREMES com os sabores (uma única vez).
 * A categoria entra primeiro (os produtos dependem dela no banco). Se os sabores falharem,
 * a categoria é removida para tentar de novo no próximo acesso.
 */
async function garantirCremes(): Promise<boolean> {
  const { data: cat, error: catErr } = await supabase.from('categories').select('id').eq('id', CATEGORIA_CREMES);
  if (catErr || (cat && cat.length > 0)) return false;

  const { error: novaCatErr } = await supabase
    .from('categories')
    .upsert({ id: CATEGORIA_CREMES, name: 'CREMES', order_index: 10, is_active: true }, { onConflict: 'id', ignoreDuplicates: true });
  if (novaCatErr) throw novaCatErr;

  const sabores = CREMES_GELADOS.opcoes.map((o, i) => ({
    id: o.id,
    name: o.nome,
    ingredients: 'Sabor de creme: aparece na escolha do copo e dos combos (casadinho até 2).',
    category: CATEGORIA_CREMES,
    price_single: 0,
    is_active: true,
    sort_order: i + 1,
    is_bestseller: false,
  }));
  const { error: itensErr } = await supabase.from('menu_items').upsert(sabores, { onConflict: 'id', ignoreDuplicates: true });
  if (itensErr) {
    const { data: criados } = await supabase.from('menu_items').select('id').eq('category', CATEGORIA_CREMES);
    if (!criados || criados.length === 0) await supabase.from('categories').delete().eq('id', CATEGORIA_CREMES);
    throw itensErr;
  }

  // Sabores que estão indisponíveis entram pausados
  const pausados = CREMES_GELADOS.opcoes.filter(o => !o.disponivel).map(o => ({ id: o.id }));
  if (pausados.length) await supabase.from('paused_items').upsert(pausados, { onConflict: 'id' });
  return true;
}

export default function MenuManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState("");
  const [pausedItems, setPausedItems] = useState<string[]>([]);

  // Category dropdown combobox state
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dismiss on ESC
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCatDropdownOpen) {
          setIsCatDropdownOpen(false);
        } else {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isCatDropdownOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout ao carregar dados do banco")), 15000));
      const [catsResult, itemsResult, pausedResult] = await Promise.race([
        Promise.all([
          supabase.from('categories').select('*').neq('id', 'system_config').order('order_index'),
          supabase.from('menu_items').select('*').neq('category', 'system_config').order('id'),
          supabase.from('paused_items').select('id')
        ]),
        timeout
      ]) as [any, any, any];

      const [cats, menuItems, paused] = catsResult && itemsResult ? [catsResult.data, itemsResult.data, pausedResult.data] : [null, null, null];

      if (catsResult.error) console.error("Erro ao carregar categorias:", catsResult.error);
      if (itemsResult.error) console.error("Erro ao carregar produtos:", itemsResult.error);
      if (cats) setCategories(cats);
      if (menuItems) setItems(menuItems);
      if (paused) setPausedItems(paused.map((p: any) => p.id));
    } catch (err: any) {
      console.error("Falha ao carregar cardápio:", err);
      setFeedback("Erro ao carregar produtos: " + (err?.message || String(err)) + ". Verifique sua conexão e tente novamente.");
      setTimeout(() => setFeedback(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check and create 'mais-pedidos' category if missing
    supabase.from('categories').select('id').eq('id', 'mais-pedidos').then(({data}) => {
      if (!data || data.length === 0) {
        supabase.from('categories').insert({id: 'mais-pedidos', name: 'OS MAIS PEDIDOS 🔥', order_index: 2}).then(() => {
          loadData();
        });
      }
    });
    garantirCremes()
      .then(criou => {
        if (criou) {
          setFeedback("Categoria CREMES criada com os sabores.");
          setTimeout(() => setFeedback(""), 4000);
          loadData();
        }
      })
      .catch(err => console.error("Erro ao criar a categoria CREMES:", err));
    loadData();
  }, []);

  const handleMigrate = async () => {
    setFeedback("Iniciando migração... Por favor aguarde.");
    
    // Insert categories first
    const predefinedCategories = [
      { id: 'promocoes', name: 'PROMOÇÃO DO DIA', order_index: 1 },
      { id: 'mais-pedidos', name: 'OS MAIS PEDIDOS 🔥', order_index: 2 },
      { id: 'pizzas', name: 'Pizzas', order_index: 3 },
      { id: 'esfihas-salgadas-tradicionais', name: 'Esfihas Salgadas Tradicionais', order_index: 4 },
      { id: 'esfihas-salgadas-especiais', name: 'Esfihas Salgadas Especiais', order_index: 5 },
      { id: 'esfihas-doces', name: 'Esfihas Doces', order_index: 6 },
      { id: 'bebidas', name: 'Bebidas', order_index: 7 },
      { id: 'bordas', name: 'Bordas', order_index: 8 }
    ];

    for (const cat of predefinedCategories) {
      await supabase.from('categories').upsert(cat, { onConflict: 'id' });
    }

    // Insert items
    for (const item of ALL_MENU_ITEMS) {
      // mapping some specific categories that were grouped in menu.ts
      let catId = item.category;
      if (item.category === 'tradicionais' || item.category === 'especiais' || item.category === 'gourmet' || item.category === 'doces') {
        catId = 'pizzas'; 
      }
      
      let finalImg = item.imageUrl === 'none' ? null : item.imageUrl;
      if (finalImg && finalImg.startsWith('/')) {
        /* no op */
      } else if (finalImg && !finalImg.startsWith('http')) {
        /* no op */
      }

      const dbItem = {
        id: item.id,
        name: item.name,
        ingredients: item.ingredients || '',
        category: item.category,
        price_single: item.priceSingle || null,
        price_p: item.priceP || null,
        price_m: item.priceM || null,
        price_g: item.priceG || null,
        image_url: finalImg,
        day_of_week: item.dayOfWeek || null
      };
      
      // Ensure category exists
      const catExists = predefinedCategories.find(c => c.id === item.category) || ['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category);
      if (['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category)) {
          await supabase.from('categories').upsert({ id: item.category, name: 'Pizzas ' + item.category, order_index: 3 }, { onConflict: 'id' });
      }

      await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    }
    
    setFeedback("Migração concluída com sucesso!");
    loadData();
  };


  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `maisacai/produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cardapio-maisacai')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('cardapio-maisacai')
        .getPublicUrl(filePath);

      setEditingItem({ ...editingItem, image_url: data.publicUrl });
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload (certifique-se de que criou um bucket 'cardapio-maisacai' público no Supabase): " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    
    let finalImageUrl = editingItem.image_url || null;
    if (finalImageUrl && !finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('/')) {
      // É só um nome de arquivo solto (veio do Storage do Supabase), então montamos a URL pública.
      finalImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/cardapio-maisacai/${finalImageUrl}`;
    }

    const hasMultipleSizes = ['combos-especiais', 'mais-vendidos', 'novidades', 'monte-do-seu-jeito', 'pizzas', 'tradicionais', 'especiais'].includes(editingItem.category) ||
      Boolean(editingItem.price_p || editingItem.price_m || editingItem.price_g || editingItem.price_big || editingItem.price_super_big || editingItem.price_2l);

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseFloat(String(val).replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    };

    const dbItem: any = {
      id: editingItem.id || `item-${Date.now()}`,
      name: editingItem.name,
      ingredients: editingItem.ingredients,
      category: editingItem.category,
      price_single: parseNum(editingItem.price_single),
      price_p: hasMultipleSizes ? parseNum(editingItem.price_p) : null,
      price_m: hasMultipleSizes ? parseNum(editingItem.price_m) : null,
      price_g: hasMultipleSizes ? parseNum(editingItem.price_g) : null,
      image_url: finalImageUrl,
      day_of_week: editingItem.day_of_week || null,
      is_active: editingItem.is_active !== undefined ? editingItem.is_active : true,
      is_bestseller: editingItem.is_bestseller !== undefined ? editingItem.is_bestseller : false
    };

    // Apenas tenta enviar tamanhos extras se preenchidos em pizzas
    if (hasMultipleSizes) {
      const pBig = parseNum(editingItem.price_big);
      const pSuperBig = parseNum(editingItem.price_super_big);
      if (pBig !== null) dbItem.price_big = pBig;
      if (pSuperBig !== null) dbItem.price_super_big = pSuperBig;
      const p2l = parseNum(editingItem.price_2l);
      if (p2l !== null) dbItem.price_2l = p2l;
    }

    let { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    // Antes de rodar o SQL da coluna price_2l: salva os outros tamanhos e avisa.
    let aviso2L = '';
    if (error && error.message.includes('price_2l')) {
      delete dbItem.price_2l;
      aviso2L = ' (2 Litros não salvo: rode o SQL PRECOS_770ML_POTE_1L_COMBOS.sql no Supabase)';
      const retry2l = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
      error = retry2l.error;
    }

    // Auto-recuperação: se as colunas price_big/price_super_big não existirem no schema cache do Supabase,
    // remove esses campos extras e salva perfeitamente sem travar o gestor.
    if (error && (error.message.includes('price_big') || error.message.includes('price_super_big'))) {
      delete dbItem.price_big;
      delete dbItem.price_super_big;
      const retryResult = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
      error = retryResult.error;
    }
    
    if (error) {
      setFeedback("Erro ao salvar: " + error.message);
    } else {
      // Sincroniza com a tabela 'extras' caso seja um adicional ou comece com 'ex-'
      if (editingItem.category === 'adicionais' || dbItem.id.startsWith('ex-')) {
        await supabase.from('extras').upsert({
          id: dbItem.id,
          name: dbItem.name,
          price: parseNum(editingItem.price_single) || 0,
          is_active: !pausedItems.includes(dbItem.id)
        }, { onConflict: 'id' });
      }

      setFeedback("Salvo com sucesso!" + aviso2L);
      setIsModalOpen(false);
      loadData();
    }
    
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      await supabase.from('menu_items').delete().eq('id', id);
      await supabase.from('extras').delete().eq('id', id);
      await supabase.from('paused_items').delete().eq('id', id);
      loadData();
    }
  };

  const togglePauseItem = async (itemId: string) => {
    const isPaused = pausedItems.includes(itemId);
    try {
      if (isPaused) {
        setPausedItems(prev => prev.filter(id => id !== itemId));
        await supabase.from('paused_items').delete().eq('id', itemId);
        await supabase.from('extras').update({ is_active: true }).eq('id', itemId);
      } else {
        setPausedItems(prev => [...prev, itemId]);
        await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
        await supabase.from('extras').update({ is_active: false }).eq('id', itemId);
      }
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  // Pausar ou ativar todos os produtos de uma categoria (vinha do antigo Cardápio Digital)
  const togglePauseCategory = async (categoryId: string, allPaused: boolean) => {
    const ids = items.filter(i => i.category === categoryId).map(i => i.id);
    if (ids.length === 0) return;
    try {
      if (allPaused) {
        setPausedItems(prev => prev.filter(id => !ids.includes(id)));
        const { error } = await supabase.from('paused_items').delete().in('id', ids);
        if (error) throw error;
        await supabase.from('extras').update({ is_active: true }).in('id', ids);
      } else {
        setPausedItems(prev => Array.from(new Set([...prev, ...ids])));
        const agora = new Date().toISOString();
        const { error } = await supabase.from('paused_items').upsert(ids.map(id => ({ id, paused_at: agora })), { onConflict: 'id' });
        if (error) throw error;
        await supabase.from('extras').update({ is_active: false }).in('id', ids);
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro ao pausar categoria: " + (e?.message || e));
      loadData();
    }
  };

  const handleQuickPriceEdit = async (itemId: string, field: string, value: string) => {
    const numVal = parseFloat(value.replace(',', '.'));
    if(isNaN(numVal)) return;

    try {
      // Optimistic UI update
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: numVal } : item));
      const { error } = await supabase.from('menu_items').update({ [field]: numVal }).eq('id', itemId);
      if(error) throw error;
      if (field === 'price_single' || itemId.startsWith('ex-')) {
        await supabase.from('extras').update({ price: numVal }).eq('id', itemId);
      }
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  const openNewModal = () => {
    const defaultCat = activeCategory !== 'all' ? activeCategory : (categories[0]?.id || '');
    const isExtra = defaultCat === 'adicionais';
    setEditingItem({
      id: isExtra ? `ex-${Date.now()}` : `item-${Date.now()}`,
      name: '',
      ingredients: isExtra ? 'Adicional para copos de açaí e combos' : '',
      category: defaultCat,
      price_single: '',
      price_p: '',
      price_m: '',
      price_g: '',
      price_big: '',
      price_super_big: '',
      price_2l: '',
      image_url: '',
      is_bestseller: false
    });
    setIsCatDropdownOpen(false);
    setIsModalOpen(true);
  };

  const listaRef = useRef<HTMLDivElement>(null);
  const porPagina = useLinhasQueCabem(listaRef, 57, { reserva: 130, min: 3, deps: [loading, activeCategory] });

  const filteredItems = (activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory))
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(i.id).toLowerCase().includes(searchTerm.toLowerCase()) || (i.ingredients && i.ingredients.toLowerCase().includes(searchTerm.toLowerCase())));
  const paginacao = usePaginacao(filteredItems, porPagina, [activeCategory, searchTerm]);

  if (loading) return <div className="p-8 text-center text-stone-500">Carregando produtos…</div>;

  const itensDaCategoria = activeCategory === 'all' ? [] : items.filter(i => i.category === activeCategory);
  const categoriaToda = itensDaCategoria.length > 0 && itensDaCategoria.every(i => pausedItems.includes(i.id));
  const totalPausados = items.filter(i => pausedItems.includes(i.id)).length;
  const contarCategoria = (id: string) => items.filter(i => i.category === id).length;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)]">
      {/* Barra de ferramentas: busca, resumo e ação principal */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-stone-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produto, sabor ou código"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-stone-200 bg-stone-50/60 text-[14px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition"
            />
          </div>
          <p className="text-[13px] text-stone-500">
            <span className="font-semibold text-stone-800 tabular-nums">{items.length}</span> produtos
            {totalPausados > 0 && (
              <> · <span className="font-semibold text-rose-600 tabular-nums">{totalPausados}</span> pausados</>
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {items.length === 0 && (
              <button onClick={handleMigrate} className="h-10 px-4 bg-amber-600 text-white rounded-xl font-semibold text-[14px] hover:bg-amber-700 transition-colors cursor-pointer">
                Puxar cardápio inicial
              </button>
            )}
            <button onClick={openNewModal} className="h-10 px-4 bg-brand-700 text-white font-semibold rounded-xl text-[14px] hover:bg-brand-800 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus size={16} /> Novo produto
            </button>
          </div>
        </div>

        {/* Categorias (quebram linha em vez de esconder) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ChipFiltro ativo={activeCategory === 'all'} onClick={() => setActiveCategory('all')} contador={items.length}>Todos</ChipFiltro>
          {categories.map(cat => (
            <ChipFiltro key={cat.id} ativo={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)} contador={contarCategoria(cat.id)}>
              {tituloCategoria(cat.name)}
            </ChipFiltro>
          ))}
        </div>

        {activeCategory !== 'all' && itensDaCategoria.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-[13px] text-stone-600">
              <span className="font-semibold text-stone-900">{tituloCategoria(categories.find(c => c.id === activeCategory)?.name || activeCategory)}</span>
              {' · '}{itensDaCategoria.length} {itensDaCategoria.length === 1 ? 'produto' : 'produtos'}
              {activeCategory === CATEGORIA_CREMES && (
                <span className="text-stone-500"> · sabores do copo e dos combos: pausou aqui, some do cardápio e do PDV na hora.</span>
              )}
            </p>
            <button
              onClick={() => togglePauseCategory(activeCategory, categoriaToda)}
              className={`h-8 px-3 rounded-lg font-semibold text-[13px] transition-colors cursor-pointer ${categoriaToda ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'}`}
            >
              {categoriaToda ? 'Ativar categoria inteira' : 'Pausar categoria inteira'}
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 text-[13px] font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Lista (edição rápida): cabe na tela, o resto vai para as próximas páginas */}
      <div ref={listaRef} className="overflow-x-auto">
        <table className="w-full table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[34%]" />
            <col />
            <col className="w-[136px]" />
            <col className="w-[92px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              <th className="h-9 pl-4 pr-3 font-semibold">Produto</th>
              <th className="h-9 px-3 font-semibold">Preço por tamanho <span className="normal-case tracking-normal font-normal">· toque no tamanho para pausar só ele</span></th>
              <th className="h-9 px-3 font-semibold">Disponível</th>
              <th className="h-9 pl-3 pr-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginacao.itens.map(item => {
              const isPaused = pausedItems.includes(item.id);
              const tamanhos = tamanhosDoItem(item);
              const precoUnico = item.price_single !== null && item.price_single !== undefined && item.price_single !== '';
              const imagem = item.image_url ? (item.image_url.startsWith('http') || item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url) : '';
              return (
                <tr key={item.id} className={`h-14 transition-colors ${isPaused ? 'bg-stone-50/70' : 'hover:bg-brand-50/40'}`}>
                  <td className="pl-4 pr-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-stone-200/70 ${isPaused ? 'opacity-50 grayscale' : ''}`}>
                        {imagem ? <img src={imagem} alt="" loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-stone-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[14px] font-semibold truncate ${isPaused ? 'text-stone-500' : 'text-stone-900'}`} title={item.name}>{nomeBonito(item.name)}</p>
                        <p className="text-[12px] text-stone-500 truncate">{tituloCategoria(categories.find(c => c.id === item.category)?.name || item.category)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {item.category === CATEGORIA_CREMES ? (
                      <span className="text-[13px] text-stone-500">Sabor · sem custo</span>
                    ) : tamanhos.length < 2 && (precoUnico || tamanhos.length === 0) ? (
                      <label className="inline-flex items-center h-8 rounded-lg border border-stone-200 bg-white overflow-hidden focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15">
                        <span className="h-full px-2 flex items-center text-[12px] font-semibold text-stone-400 border-r border-stone-200 bg-stone-50">R$</span>
                        <input
                          key={`${item.id}-single-${item.price_single}`}
                          type="text"
                          inputMode="decimal"
                          defaultValue={item.price_single !== null && item.price_single !== undefined ? String(item.price_single).replace('.', ',') : ''}
                          onBlur={(e) => handleQuickPriceEdit(item.id, 'price_single', e.target.value)}
                          className="w-16 h-full px-2 text-[13px] font-semibold text-stone-900 tabular-nums text-right outline-none"
                          aria-label={`Preço de ${item.name}`}
                        />
                      </label>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tamanhos.map(t => {
                          const campo = CAMPO_PRECO[t.size];
                          const chave = `${item.id}-${t.pauseKey}`;
                          const pausado = pausedItems.includes(chave);
                          const valorCampo = item[campo];
                          return (
                            <div key={chave} className={`inline-flex items-center h-8 rounded-lg border overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-brand-600/15 ${pausado ? 'border-rose-200 bg-rose-50/60' : 'border-stone-200 bg-white focus-within:border-brand-600'}`}>
                              {tamanhos.length > 1 ? (
                                <button
                                  onClick={() => togglePauseItem(chave)}
                                  title={pausado ? `Ativar ${ROTULO_TAMANHO[t.size] || t.size}` : `Pausar só o ${ROTULO_TAMANHO[t.size] || t.size}`}
                                  className={`h-full px-2 text-[12px] font-semibold border-r transition-colors cursor-pointer ${pausado ? 'text-rose-600 line-through border-rose-200' : 'text-stone-500 border-stone-200 bg-stone-50 hover:text-brand-700 hover:bg-brand-50'}`}
                                >
                                  {ROTULO_CURTO[t.size] || t.size}
                                </button>
                              ) : (
                                <span className="h-full px-2 flex items-center text-[12px] font-semibold text-stone-500 border-r border-stone-200 bg-stone-50">{ROTULO_CURTO[t.size] || t.size}</span>
                              )}
                              <input
                                key={`${item.id}-${campo}-${valorCampo}`}
                                type="text"
                                inputMode="decimal"
                                defaultValue={valorCampo !== null && valorCampo !== undefined ? String(valorCampo).replace('.', ',') : ''}
                                placeholder={String(t.price).replace('.', ',')}
                                onBlur={(e) => campo && e.target.value && handleQuickPriceEdit(item.id, campo, e.target.value)}
                                className={`w-12 h-full px-1.5 text-[13px] font-semibold tabular-nums text-right outline-none bg-transparent ${pausado ? 'text-rose-400' : 'text-stone-900'}`}
                                aria-label={`Preço ${ROTULO_TAMANHO[t.size] || t.size} de ${item.name}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => togglePauseItem(item.id)}
                      className="inline-flex items-center gap-2 cursor-pointer"
                      aria-pressed={!isPaused}
                      title={isPaused ? 'Ativar no cardápio' : 'Pausar no cardápio'}
                    >
                      <span className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${!isPaused ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                        <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition-transform ${!isPaused ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </span>
                      <span className={`text-[13px] font-semibold ${isPaused ? 'text-rose-600' : 'text-emerald-700'}`}>{isPaused ? 'Pausado' : 'Ativo'}</span>
                    </button>
                  </td>
                  <td className="pl-3 pr-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Editar produto">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length > 0 && filteredItems.length === 0 && (
          <div className="py-12 text-center text-[14px] text-stone-500">Nenhum produto encontrado para “{searchTerm}”.</div>
        )}
        {items.length === 0 && (
          <div className="text-center py-12 text-[14px] text-stone-500">
            Nenhum produto cadastrado no banco de dados ainda.<br />
            Clique em “Puxar cardápio inicial” para importar os dados do código.
          </div>
        )}
      </div>

      <Paginacao
        pagina={paginacao.pagina}
        totalPaginas={paginacao.totalPaginas}
        inicio={paginacao.inicio}
        mostrando={paginacao.itens.length}
        total={filteredItems.length}
        onIr={paginacao.irPara}
        rotulo={filteredItems.length === 1 ? 'produto' : 'produtos'}
      />

      {/* Editor Modal */}
      {isModalOpen && editingItem && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-stone-50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-stone-950 p-4 sm:p-5 flex justify-between items-center z-10 border-b border-stone-800">
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                {editingItem.id.startsWith('item-') && !editingItem.name ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-white bg-stone-900 hover:bg-rose-600 rounded-md transition-colors border border-stone-800 hover:border-rose-500">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-3 sm:p-4 space-y-2.5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Nome do Produto</label>
                  <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" placeholder="Ex: 61 - Bacon" />
                </div>

                <div ref={catDropdownRef} className="space-y-1 md:col-span-1 relative">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Categoria</label>
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-bold text-stone-900 flex items-center justify-between hover:bg-stone-100/70 cursor-pointer transition-colors shadow-2xs"
                  >
                    <span className="truncate">
                      {categories.find(c => c.id === editingItem.category)?.name || editingItem.category || 'Selecione...'}
                    </span>
                    <ChevronDown size={14} className={`text-stone-400 shrink-0 ml-1 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCatDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 py-1 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {categories.map(c => {
                        const isSelected = editingItem.category === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditingItem({ ...editingItem, category: c.id });
                              setIsCatDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-50 text-amber-950 font-black' : 'text-stone-800 hover:bg-stone-50 font-bold'
                            }`}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check size={12} className="text-amber-700" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Ingredientes / Descrição</label>
                <textarea rows={1} value={editingItem.ingredients} onChange={e => setEditingItem({...editingItem, ingredients: e.target.value})} className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors resize-y min-h-[40px]" placeholder="Lista de ingredientes..."></textarea>
              </div>

              
              <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-md border border-stone-200">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Imagem do Produto (URL ou Upload)</label>
                
                {editingItem.image_url && (
                  <div className="w-full h-20 rounded-md overflow-hidden border border-stone-200 bg-white mb-1.5 flex items-center justify-center p-1 relative shadow-sm">
                    <img 
                      src={editingItem.image_url.startsWith('http') ? editingItem.image_url : (editingItem.image_url.startsWith('/') ? editingItem.image_url : '/' + editingItem.image_url)} 
                      alt="Preview proporcional" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <input type="text" value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors" placeholder="URL da imagem (Ex: /pizza.png)" />
                </div>

                <div className="pt-2 border-t border-stone-200 mt-2 flex items-center justify-between">
                  <span className="block text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Enviar do PC:</span>
                  <label className="cursor-pointer bg-[#6a2092] hover:bg-[#521872] text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors shadow-sm">
                    {uploadingImage ? 'Enviando...' : 'Escolher Arquivo'}
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-2.5">
                {(() => {
                  const hasMultipleSizes = ['combos-especiais', 'mais-vendidos', 'novidades', 'monte-do-seu-jeito', 'pizzas', 'tradicionais', 'especiais'].includes(editingItem.category) ||
      Boolean(editingItem.price_p || editingItem.price_m || editingItem.price_g || editingItem.price_big || editingItem.price_super_big || editingItem.price_2l);

                  if (hasMultipleSizes) {
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1">
                            🍧 Preços por Tamanho do Copo / Açaí
                          </h3>
                          <span className="text-[9.5px] font-mono text-stone-400">Preencha os tamanhos (330ml a 2L). Tamanho vazio não aparece no cardápio.</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">330ml</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_p ?? ''} onChange={e => setEditingItem({...editingItem, price_p: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">440ml</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_m ?? ''} onChange={e => setEditingItem({...editingItem, price_m: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-300 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-amber-900 uppercase">550ml *</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-amber-700">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_g ?? ''} onChange={e => setEditingItem({...editingItem, price_g: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-amber-400 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">770ml</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_big ?? ''} onChange={e => setEditingItem({...editingItem, price_big: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">Pote Recheado 1L</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_super_big ?? ''} onChange={e => setEditingItem({...editingItem, price_super_big: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">2 Litros (2L)</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_2l ?? ''} onChange={e => setEditingItem({...editingItem, price_2l: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-[#6a2092] outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                          Preço do Produto (R$)
                        </label>
                        <span className="text-[9.5px] font-mono text-emerald-700">Valor único para venda individual</span>
                      </div>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-700 text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingItem.price_single ?? ''}
                          onChange={e => setEditingItem({...editingItem, price_single: e.target.value})}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-black font-mono text-emerald-950 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200 outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-stone-100">
                <label className="flex items-center gap-2 text-xs text-[#1C1917] font-bold cursor-pointer">
                  <input type="checkbox" checked={editingItem.is_bestseller || false} onChange={e => setEditingItem({...editingItem, is_bestseller: e.target.checked})} className="w-4 h-4 accent-[#6a2092] rounded cursor-pointer" />
                  🌟 Destaque
                </label>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200">
                    Cancelar
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-md font-bold text-xs bg-[#6a2092] hover:bg-[#521872] text-white shadow-sm transition-all active:translate-y-px cursor-pointer flex items-center gap-1.5 border border-[#521872]">
                    <Save size={14} /> Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
