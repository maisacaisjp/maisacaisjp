import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChefHat, Clock, AlertTriangle, CheckCircle2, 
  Bike, ShoppingBag, Maximize2, Minimize2, RefreshCw, 
  Volume2, VolumeX, Sparkles, Filter
} from 'lucide-react';

interface KdsItem {
  name: string;
  quantity?: number;
  notes?: string;
  extras?: { name: string; price?: number }[];
  category?: string;
}

interface KdsOrder {
  id: number;
  customer_name: string;
  order_type: string;
  status: string;
  delivery_zone?: string;
  delivery_address?: string;
  notes?: string;
  items: KdsItem[];
  created_at: string;
  motoboy_name?: string;
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filterType, setFilterType] = useState<'todos' | 'delivery' | 'takeaway'>('todos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Atualizar timer a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Carregar pedidos ativos
  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, order_type, status, delivery_zone, delivery_address, notes, items, created_at, motoboy_name')
        .not('status', 'in', '("Finalizado","Cancelado","Entregue")')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setOrders(data);
      }
    } catch (e) {
      console.error('Erro ao buscar pedidos KDS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    const sub = supabase
      .channel('kds-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchActiveOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  // Avançar status do pedido
  const advanceStatus = async (order: KdsOrder) => {
    let nextStatus = 'Em preparo';
    if (order.status === 'Pendente' || order.status === 'Recebido') {
      nextStatus = 'Em preparo';
    } else if (order.status === 'Em preparo') {
      const isDelivery = String(order.order_type || '').toLowerCase().includes('deliver');
      nextStatus = isDelivery ? 'Pronto para entrega' : 'Pronto para retirada';
    } else {
      nextStatus = 'Finalizado';
    }

    try {
      await supabase.from('orders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
    } catch (e) {
      console.error('Erro ao atualizar status KDS:', e);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Filtragem
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const isDel = String(o.order_type || '').toLowerCase().includes('deliver');
      if (filterType === 'delivery') return isDel;
      if (filterType === 'takeaway') return !isDel;
      return true;
    });
  }, [orders, filterType]);

  // Tempo decorrido em minutos
  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((currentTime - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-stone-950 p-6 overflow-y-auto text-white' : ''}`}>
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${
        isFullscreen ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4d0471] text-white flex items-center justify-center font-bold">
            <ChefHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-black tracking-tight ${isFullscreen ? 'text-white' : 'text-stone-900'}`}>
                KDS — Montagem & Produção de Açaí
              </h1>
              <span className="bg-[#fdde58] text-[#4d0471] font-mono font-black text-xs px-2 py-0.5 rounded-full">
                {orders.length} na fila
              </span>
            </div>
            <p className={`text-xs font-semibold ${isFullscreen ? 'text-stone-400' : 'text-stone-500'}`}>
              Tela de bancada com contagem de tempo e porcionamento
            </p>
          </div>
        </div>

        {/* Controles de visualização */}
        <div className="flex items-center gap-2">
          {/* Filtros */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'todos' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('delivery')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'delivery' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
            >
              Delivery 🛵
            </button>
            <button
              onClick={() => setFilterType('takeaway')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'takeaway' ? 'bg-[#4d0471] text-white shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
            >
              Balcão 🛍️
            </button>
          </div>

          <button
            onClick={fetchActiveOrders}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Atualizar agora"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
          </button>
        </div>
      </div>

      {/* Grid de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className={`p-16 text-center rounded-2xl border ${
          isFullscreen ? 'bg-stone-900 border-stone-800 text-stone-500' : 'bg-white border-stone-200 text-stone-400'
        }`}>
          <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
          <h2 className="text-base font-bold">Cozinha livre! Nenhum pedido na fila no momento.</h2>
          <p className="text-xs font-medium mt-1">Os novos pedidos que entrarem no site ou WhatsApp aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map(order => {
            const minutes = getElapsedMinutes(order.created_at);
            const isDelivery = String(order.order_type || '').toLowerCase().includes('deliver');
            
            // Cor do card conforme urgência de tempo
            let urgencyBorder = 'border-emerald-500';
            let urgencyBg = isFullscreen ? 'bg-stone-900' : 'bg-white';
            let urgencyBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            
            if (minutes >= 20) {
              urgencyBorder = 'border-rose-500';
              urgencyBadge = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
            } else if (minutes >= 10) {
              urgencyBorder = 'border-amber-500';
              urgencyBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            }

            return (
              <div 
                key={order.id} 
                className={`rounded-2xl border-2 flex flex-col justify-between overflow-hidden shadow-xs transition-all ${urgencyBorder} ${urgencyBg}`}
              >
                {/* Top Card Info */}
                <div>
                  <div className="p-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black font-mono text-[#4d0471] dark:text-[#fdde58]">
                        #{order.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isDelivery ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {isDelivery ? <Bike size={11} /> : <ShoppingBag size={11} />}
                        {isDelivery ? 'Delivery' : 'Balcão'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-black font-mono ${urgencyBadge}`}>
                      <Clock size={12} />
                      {minutes} min
                    </div>
                  </div>

                  {/* Nome do Cliente & Bairro */}
                  <div className="px-3.5 py-2 bg-stone-50/80 dark:bg-stone-800/50 flex items-center justify-between text-xs font-semibold">
                    <span className="truncate font-bold text-stone-900 dark:text-stone-100 max-w-[170px]">
                      {order.customer_name || 'Cliente'}
                    </span>
                    {order.delivery_zone && (
                      <span className="text-stone-500 dark:text-stone-400 text-[11px] truncate max-w-[120px]">
                        📍 {order.delivery_zone}
                      </span>
                    )}
                  </div>

                  {/* Itens do Pedido (Em destaque gigante para montagem) */}
                  <div className="p-3.5 space-y-3">
                    {(order.items || []).map((item, idx) => {
                      return (
                        <div key={idx} className="pb-2.5 border-b border-stone-100 dark:border-stone-800 last:border-none last:pb-0">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#4d0471] text-[#fdde58] font-mono font-black text-xs flex items-center justify-center shrink-0">
                              {item.quantity || 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-stone-900 dark:text-stone-100 leading-tight">
                                {item.name}
                              </p>

                              {/* Base / Casadinho */}
                              {item.notes && (
                                <p className="text-xs font-bold text-[#4d0471] dark:text-[#fdde58] bg-[#4d0471]/5 dark:bg-[#4d0471]/20 px-2 py-0.5 rounded-md mt-1 inline-block">
                                  🍨 {item.notes}
                                </p>
                              )}

                              {/* Extras / Adicionais */}
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.extras.map((ex, exIdx) => (
                                    <span key={exIdx} className="text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                                      + {ex.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Observações gerais */}
                    {order.notes && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        ⚠️ Obs: {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Ação / Próximo Status */}
                <div className="p-3 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => advanceStatus(order)}
                    className="w-full py-2.5 rounded-xl font-black text-xs text-white bg-[#4d0471] hover:bg-[#3b0357] shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 size={16} />
                    {order.status === 'Em preparo' 
                      ? (isDelivery ? 'Pronto p/ Entrega 🛵' : 'Pronto p/ Retirada 🛍️') 
                      : order.status === 'Pendente' || order.status === 'Recebido' 
                        ? 'Iniciar Preparo 🍧' 
                        : 'Finalizar Pedido ✅'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

