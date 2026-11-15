import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStoreDate } from '../utils/date';

export interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
  isToday: boolean;
  timeRangeLabel: string;
}

export interface BusinessHoursStatus {
  isOpen: boolean;
  loading: boolean;
  todayLabel: string;
  reason: 'loading' | 'closed_today' | 'outside_hours' | 'open' | 'manual_closed' | 'paused' | 'blocked';
  subscriptionStatus: string;
  weeklySchedule: DaySchedule[];
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function useBusinessHours(): BusinessHoursStatus {
  const [status, setStatus] = useState<BusinessHoursStatus>({
    isOpen: true,
    loading: true,
    todayLabel: '',
    reason: 'loading',
    subscriptionStatus: 'active',
    weeklySchedule: [],
  });

  const checkStatus = async () => {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['manual_store_closed', 'store_status', 'paused_until', 'subscription_status']);

      const getSetting = (k: string) => settingsData?.find(s => s.key === k)?.value;
      
      const manualClosed = getSetting('manual_store_closed') === true;
      const storeStatus = getSetting('store_status');
      const pausedUntil = getSetting('paused_until');
      const subscriptionStatus = getSetting('subscription_status') || 'active';

      // Dia e hora oficiais da loja (São José dos Pinhais / PR)
      const now = getStoreDate();
      const currentDayOfWeek = isNaN(now.getDay()) ? 0 : now.getDay();

      const { data, error } = await supabase.from('business_hours').select('*').order('day_of_week');
      if (error) throw error;

      // Monta escala semanal amigável (ordem de exibição: Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
      const weekOrder = [1, 2, 3, 4, 5, 6, 0];
      const weeklySchedule: DaySchedule[] = weekOrder.map((dow) => {
        const item = data?.find((d: any) => d.day_of_week === dow);
        const dayName = DAY_NAMES[dow] || `Dia ${dow}`;
        const isClosed = !item || item.is_closed || !item.opens_at || !item.closes_at;
        const opensAt = item?.opens_at ? item.opens_at.slice(0, 5) : '';
        const closesAt = item?.closes_at ? item.closes_at.slice(0, 5) : '';
        const timeRangeLabel = isClosed ? 'Fechado' : `${opensAt} às ${closesAt}`;
        return {
          dayOfWeek: dow,
          dayName,
          opensAt,
          closesAt,
          isClosed,
          isToday: dow === currentDayOfWeek,
          timeRangeLabel,
        };
      });

      if (subscriptionStatus === 'blocked') {
        setStatus({ isOpen: false, loading: false, todayLabel: '', reason: 'blocked', subscriptionStatus, weeklySchedule });
        return;
      }

      if (manualClosed || storeStatus === 'closed') {
        setStatus({ isOpen: false, loading: false, todayLabel: '', reason: 'manual_closed', subscriptionStatus, weeklySchedule });
        return;
      }

      if (storeStatus === 'paused' && pausedUntil) {
        const pauseEnd = new Date(pausedUntil);
        if (new Date() < pauseEnd) {
           const timeStr = pauseEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
           setStatus({ isOpen: false, loading: false, todayLabel: `Volta às ${timeStr}`, reason: 'paused', subscriptionStatus, weeklySchedule });
           return;
        }
      }

      if (!data || data.length === 0) {
        setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open', subscriptionStatus, weeklySchedule });
        return;
      }

      const today = data.find((d: any) => d.day_of_week === currentDayOfWeek);

      if (!today || today.is_closed || !today.opens_at || !today.closes_at || typeof today.opens_at !== 'string' || typeof today.closes_at !== 'string') {
        setStatus({
          isOpen: false,
          loading: false,
          todayLabel: DAY_NAMES[currentDayOfWeek] || 'Fechado',
          reason: 'closed_today',
          subscriptionStatus,
          weeklySchedule
        });
        return;
      }

      const openParts = today.opens_at.split(':').map(Number);
      const closeParts = today.closes_at.split(':').map(Number);
      const openH = openParts[0] || 0;
      const openM = openParts[1] || 0;
      const closeH = closeParts[0] || 0;
      const closeM = closeParts[1] || 0;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + openM;
      // Fechar às 00:00 = fim do dia (24:00)
      const closeMinutes = closeH * 60 + closeM === 0 ? 24 * 60 : closeH * 60 + closeM;

      // Horário que passa da meia-noite (ex.: 18:00 às 02:00): aberto depois de abrir OU antes de fechar
      const isOpen = closeMinutes > openMinutes
        ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
        : nowMinutes >= openMinutes || nowMinutes < closeMinutes;

      setStatus({
        isOpen,
        loading: false,
        todayLabel: `${today.opens_at.slice(0,5)} às ${today.closes_at.slice(0,5)}`,
        reason: isOpen ? 'open' : 'outside_hours',
        subscriptionStatus,
        weeklySchedule
      });
    } catch (err) {
      console.warn('[useBusinessHours] Não foi possível verificar o horário, assumindo loja aberta.', err);
      setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open', subscriptionStatus: 'active', weeklySchedule: [] });
    }
  };

  useEffect(() => {
    checkStatus();

    // 1) Na hora: escuta mudanças de horário e de abrir/fechar/pausar a loja feitas no gestor
    const canal = supabase
      .channel(`public:horario-loja-${Math.random().toString(36).slice(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_hours' }, () => checkStatus())
      // só as chaves de status da loja (a tabela settings também guarda o cashback de cada cliente)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.store_status' }, () => checkStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.manual_store_closed' }, () => checkStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.paused_until' }, () => checkStatus())
      .subscribe();

    // 2) Reserva: confere a cada 10 s e assim que o cliente volta para a aba do cardápio
    const interval = setInterval(checkStatus, 10000);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') checkStatus();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(canal);
    };
  }, []);

  return status;
}
