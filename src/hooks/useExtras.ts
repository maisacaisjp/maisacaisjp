import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExtraIngredient, acaiExtras } from '../data/menu';

export function useExtras() {
  const [extras, setExtras] = useState<ExtraIngredient[]>(acaiExtras);

  const loadExtras = async () => {
    try {
      const [extrasRes, pausedRes, fotosRes] = await Promise.all([
        supabase
          .from('extras')
          .select('id, name, price, is_active')
          .order('sort_order'),
        supabase
          .from('paused_items')
          .select('id'),
        // Fotos dos adicionais: o gestor salva no cadastro de produtos (categoria adicionais), com o mesmo código
        supabase
          .from('menu_items')
          .select('id, name, image_url')
          .eq('category', 'adicionais')
          .not('image_url', 'is', null)
      ]);

      if (extrasRes.error) throw extrasRes.error;

      const pausedIds = new Set((pausedRes.data || []).map((p: any) => p.id));
      const nomeChave = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      const fotoPorId = new Map<string, string>();
      const fotoPorNome = new Map<string, string>();
      for (const f of fotosRes.data || []) {
        if (!f.image_url) continue;
        fotoPorId.set(String(f.id), f.image_url);
        fotoPorNome.set(nomeChave(f.name), f.image_url);
      }

      if (extrasRes.data && extrasRes.data.length > 0) {
        const activeExtras = extrasRes.data
          .filter((e: any) => e.is_active !== false && !pausedIds.has(e.id))
          .map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price), imageUrl: fotoPorId.get(String(e.id)) || fotoPorNome.get(nomeChave(e.name)) || undefined }));
        setExtras(activeExtras);
      } else {
        // Fallback filtrando os pausados
        setExtras(acaiExtras.filter(e => !pausedIds.has(e.id)));
      }
    } catch (err) {
      console.warn('[useExtras] Não foi possível carregar adicionais do Supabase, usando lista padrão.', err);
      setExtras(acaiExtras);
    }
  };

  useEffect(() => {
    loadExtras();
    const channelId = `public:extras-paused-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras' }, () => loadExtras())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paused_items' }, () => loadExtras())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return extras;
}
