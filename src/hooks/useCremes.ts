import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIA_CREMES, DESTAQUES_SABORES, definirCremes, OpcaoVariacao } from '../data/variacoes';

/**
 * Sabores (cremes) cadastrados em Produtos > CREMES, com a pausa do gestor aplicada.
 * Atualiza ao vivo quando um sabor é pausado, ativado, criado ou renomeado.
 * Quem usa regrasDoProduto só precisa chamar este hook para re-renderizar.
 */
export function useCremes(): OpcaoVariacao[] | null {
  const [cremes, setCremes] = useState<OpcaoVariacao[] | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const [itensRes, pausadosRes] = await Promise.all([
          supabase
            .from('menu_items')
            .select('id, name, is_active, sort_order')
            .eq('category', CATEGORIA_CREMES)
            .order('sort_order'),
          supabase.from('paused_items').select('id'),
        ]);
        if (itensRes.error) throw itensRes.error;
        const pausados = new Set((pausadosRes.data || []).map((p: any) => p.id));
        const lista: OpcaoVariacao[] = (itensRes.data || []).map((it: any) => ({
          id: it.id,
          nome: it.name,
          disponivel: it.is_active !== false && !pausados.has(it.id),
          destaque: DESTAQUES_SABORES[it.id],
        }));
        if (!ativo) return;
        definirCremes(lista);
        setCremes(lista.length ? lista : null);
      } catch (err) {
        console.warn('[useCremes] Não foi possível carregar os sabores, usando a lista padrão.', err);
      }
    };

    carregar();
    const canal = supabase
      .channel(`public:cremes-${Math.random().toString(36).slice(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paused_items' }, () => carregar())
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  return cremes;
}
