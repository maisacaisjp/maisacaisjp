import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExtraIngredient, acaiExtras } from '../data/menu';

export function useExtras() {
  const [extras, setExtras] = useState<ExtraIngredient[]>(acaiExtras);

  const loadExtras = async () => {
    try {
      const [extrasRes, pausedRes] = await Promise.all([
        supabase
          .from('extras')
          .select('id, name, price, is_active')
          .order('sort_order'),
        supabase
          .from('paused_items')
          .select('id')
      ]);

      if (extrasRes.error) throw extrasRes.error;

      const pausedIds = new Set((pausedRes.data || []).map((p: any) => p.id));

      if (extrasRes.data && extrasRes.data.length > 0) {
        const activeExtras = extrasRes.data
          .filter((e: any) => e.is_active !== false && !pausedIds.has(e.id))
          .map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price) }));
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
