import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExtraIngredient, acaiExtras } from '../data/menu';

export function useExtras() {
  const [extras, setExtras] = useState<ExtraIngredient[]>(acaiExtras);

  const loadExtras = async () => {
    try {
      const { data, error } = await supabase
        .from('extras')
        .select('id, name, price')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      if (data && data.length > 0) {
        setExtras(data.map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price) })));
      }
    } catch (err) {
      console.warn('[useExtras] Não foi possível carregar adicionais do Supabase, usando lista padrão.', err);
      setExtras(acaiExtras);
    }
  };

  useEffect(() => {
    loadExtras();
    const channel = supabase
      .channel('public:extras-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras' }, () => loadExtras())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return extras;
}
