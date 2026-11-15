import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Gera um ID de sessão persistente na aba para agrupar as ações do cliente no funil
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export function useAnalytics() {
  const [sessionId] = useState(getSessionId());

  const trackEvent = async (eventName: string, eventData: any = {}) => {
    try {
      const path = window.location.pathname;
      // Não contabiliza acessos do próprio painel administrativo no funil de clientes
      if (path.startsWith('/admin')) return;

      const row = {
        event_name: eventName,
        session_id: sessionId,
        path: path,
        event_data: eventData,
        payload: {
          session_id: sessionId,
          path: path,
          ...eventData,
        },
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('analytics_events').insert([row]);
      if (error) {
        console.warn('[Analytics] Falha ao registrar evento:', error.message);
      }
    } catch (err) {
      console.warn('[Analytics] Erro:', err);
    }
  };

  return { trackEvent };
}
