import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, Search, ShoppingBag, 
  User, CreditCard, Calendar, ChevronDown, 
  Printer, Receipt, Clock, Bike, UtensilsCrossed,
  Layers, CheckCircle2, Wallet, DollarSign,
  TrendingUp, ArrowLeftRight, Sparkles, Filter, MapPin,
  Banknote, Smartphone
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePaymentMethod, normalizeOrderType, isOrderActive, paymentParts, paymentLabel } from '../../utils/paymentAndOrderHelper';
import { formatItemNameForPrint } from '../../utils/printHelpers';

interface CashSessionDetailsModalProps {
  session: any;
  onClose: () => void;
}

const safeParseItems = (items: any): any[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

export default function CashSessionDetailsModal({ session, onClose }: CashSessionDetailsModalProps) {
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balanco' | 'pedidos'>('balanco');
  const [expandedOrderId, setExpandedOrderId] = useState<any | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'todos' | 'entrega' | 'mesa' | 'retirada'>('todos');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);

  useEffect(() => {
    if (session?.id) {
      loadSessionDetails(session.id);
    }
  }, [session]);

  // Dismiss on ESC (closes submodal receipt first if open, or modal itself)
  useEffect(() => {
    if (!session) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReceiptOrder) {
          setSelectedReceiptOrder(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, selectedReceiptOrder, onClose]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);

    // 1. Busca por cash_session_id
    const { data: ordersBySession } = await supabase
      .from('orders')
      .select('*')
      .eq('cash_session_id', sessionId);

    // 2. Busca por intervalo temporal da sessão
    let ordersByTime: any[] = [];
    if (session.opened_at) {
      const { data: timeOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString());
      ordersByTime = timeOrders || [];
    }

    // 3. Mescla e deduplica pedidos
    const ordersMap = new Map();
    (ordersBySession || []).forEach(o => ordersMap.set(o.id, o));
    (ordersByTime || []).forEach(o => ordersMap.set(o.id, o));

    const combinedOrders = Array.from(ordersMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let movementsData: any[] = [];
    try {
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionId);
      if (!error && movements) {
        movementsData = movements;
      } else {
        throw error;
      }
    } catch (e) {
      const { data: setRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `cash_movements_${sessionId}`)
        .maybeSingle();
      if (setRow?.value) {
        try { movementsData = JSON.parse(setRow.value); } catch(err) { movementsData = []; }
      }
    }

    setSessionDetails({
      orders: combinedOrders.filter(isOrderActive),
      movements: movementsData || []
    });
    setLoading(false);
  };

  const toggleExpandOrder = (orderId: any) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  // Cálculos Consolidados do Caixa
  const summary = useMemo(() => {
    const orders = sessionDetails?.orders || [];
    const movements = sessionDetails?.movements || [];

    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);

    // Canais
    const entregaOrders = orders.filter((o: any) => normalizeOrderType(o.order_type || o.orderType) === 'entrega');
    const mesaOrders = orders.filter((o: any) => normalizeOrderType(o.order_type || o.orderType) === 'mesa');
    const retiradaOrders = orders.filter((o: any) => ['retirada', 'balcao'].includes(normalizeOrderType(o.order_type || o.orderType)));

    const entregaTotal = entregaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
    const mesaTotal = mesaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
    const retiradaTotal = retiradaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);

    // Pagamentos
    const paymentTotals: Record<string, number> = {};
    orders.forEach((o: any) => {
      // Pagamento dividido soma cada parte na sua forma
      paymentParts(o.payment_method || o.paymentMethod, Number(o.total_amount || o.totalAmount || 0)).forEach(part => {
        const pm = normalizePaymentMethod(part.method);
        paymentTotals[pm] = (paymentTotals[pm] || 0) + part.amount;
      });
    });

    const totalDinheiro = paymentTotals['Dinheiro'] || 0;

    // Movimentações manuais
    const suprimentosTotal = movements
      .filter((m: any) => m.type === 'suprimento')
      .reduce((a: number, m: any) => a + Number(m.amount || 0), 0);

    const sangriasTotal = movements
      .filter((m: any) => m.type === 'sangria')
      .reduce((a: number, m: any) => a + Number(m.amount || 0), 0);

    // Conferência física
    const fundoInicial = Number(session.opening_amount || 0);
    const expectedCash = fundoInicial + totalDinheiro + suprimentosTotal - sangriasTotal;
    const countedCash = Number(session.closing_counted_amount || 0);
    const difference = Number(session.difference_amount || 0);

    // Duração da sessão
    let durationText = 'Em andamento';
    if (session.opened_at) {
      const end = session.closed_at ? new Date(session.closed_at) : new Date();
      const diffMins = differenceInMinutes(end, new Date(session.opened_at));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      durationText = `${hours}h ${mins}m`;
    }

    return {
      totalOrdersCount,
      totalRevenue,
      entrega: { count: entregaOrders.length, total: entregaTotal, orders: entregaOrders },
      mesa: { count: mesaOrders.length, total: mesaTotal, orders: mesaOrders },
      retirada: { count: retiradaOrders.length, total: retiradaTotal, orders: retiradaOrders },
      paymentTotals,
      totalDinheiro,
      suprimentosTotal,
      sangriasTotal,
      netManualMovements: suprimentosTotal - sangriasTotal,
      fundoInicial,
      expectedCash,
      countedCash,
      difference,
      durationText
    };
  }, [sessionDetails, session]);

  // Filtragem dos pedidos da sessão
  const filteredOrders = useMemo(() => {
    if (!sessionDetails?.orders) return [];
    return sessionDetails.orders.filter((order: any) => {
      // Filtro por tipo
      if (orderTypeFilter !== 'todos') {
        const normType = normalizeOrderType(order.order_type || order.orderType);
        if (orderTypeFilter === 'entrega' && normType !== 'entrega') return false;
        if (orderTypeFilter === 'mesa' && normType !== 'mesa') return false;
        if (orderTypeFilter === 'retirada' && !['retirada', 'balcao'].includes(normType)) return false;
      }

      // Filtro de busca textual
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase().trim();
        const idMatch = String(order.id).toLowerCase().includes(query);
        const nameMatch = (order.customer_name || order.customerName || '').toLowerCase().includes(query);
        const phoneMatch = (order.customer_phone || order.customerPhone || '').toLowerCase().includes(query);
        const addressMatch = (order.delivery_address || order.deliveryAddress || '').toLowerCase().includes(query);
        const paymentMatch = (order.payment_method || order.paymentMethod || '').toLowerCase().includes(query);
        
        const items = safeParseItems(order.items);
        const itemMatch = items.some((it: any) => (it.name || '').toLowerCase().includes(query));

        if (!idMatch && !nameMatch && !phoneMatch && !addressMatch && !paymentMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sessionDetails?.orders, orderTypeFilter, orderSearch]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
  }, [filteredOrders]);

  if (!session) return null;

  const brl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const nomeBonito = (n: any) =>
    String(n || '').trim().toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_m: string, e: string, l: string) => e + l.toUpperCase())
      .replace(/\s(D[aeo]s?|E)\s/g, (m: string) => m.toLowerCase());
  const foneBonito = (t: any) => {
    const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return String(t || '');
  };
  const fechado = session.status === 'fechado';
  const diferenca = summary.difference;
  const exata = Math.abs(diferenca) < 0.005;
  const ticketMedio = summary.totalOrdersCount > 0 ? summary.totalRevenue / summary.totalOrdersCount : 0;
  const abertura = session.opened_at ? new Date(session.opened_at) : null;
  const fechamento = session.closed_at ? new Date(session.closed_at) : null;

  const corPagamento = (pm: string) => {
    const p = pm.toLowerCase();
    if (p.includes('dinheiro')) return 'bg-emerald-500';
    if (p.includes('pix')) return 'bg-sky-500';
    if (p.includes('créd') || p.includes('cred')) return 'bg-violet-500';
    if (p.includes('déb') || p.includes('deb')) return 'bg-indigo-400';
    return 'bg-stone-400';
  };

  const pagamentosPorCanal = (orders: any[]) =>
    Object.entries(
      orders.reduce((acc: Record<string, number>, o: any) => {
        paymentParts(o.payment_method || o.paymentMethod, Number(o.total_amount || o.totalAmount || 0)).forEach((part) => {
          const pm = normalizePaymentMethod(part.method);
          acc[pm] = (acc[pm] || 0) + part.amount;
        });
        return acc;
      }, {})
    )
      .map(([pm, val]) => `${pm} ${brl(Number(val))}`)
      .join(' · ');

  const canais = [
    { chave: 'entrega', nome: 'Entrega', icone: <Bike size={16} />, cor: 'text-sky-700 bg-sky-50', barra: 'bg-sky-500', dados: summary.entrega },
    { chave: 'retirada', nome: 'Retirada / balcão', icone: <ShoppingBag size={16} />, cor: 'text-brand-700 bg-brand-50', barra: 'bg-brand-500', dados: summary.retirada },
    { chave: 'mesa', nome: 'Mesa', icone: <UtensilsCrossed size={16} />, cor: 'text-emerald-700 bg-emerald-50', barra: 'bg-emerald-500', dados: summary.mesa },
  ];

  const pagamentos = Object.entries(summary.paymentTotals as Record<string, number>).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-50 rounded-none sm:rounded-2xl w-full h-full sm:h-[90vh] sm:max-w-[1240px] flex flex-col shadow-2xl border-0 sm:border border-stone-200 relative overflow-hidden">

        {/* CABEÇALHO */}
        <div className="px-5 sm:px-7 py-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-stone-900 text-lg sm:text-xl tracking-tight">Fechamento de caixa</h2>
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${fechado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${fechado ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                {fechado ? 'Fechado' : 'Em aberto'}
              </span>
            </div>
            {abertura && (
              <p className="mt-1 text-[13px] text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> {format(abertura, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                <span className="text-stone-300">•</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock size={13} /> {format(abertura, 'HH:mm')} {fechamento ? `até ${format(fechamento, 'HH:mm')}` : 'até agora'}
                </span>
                <span className="text-stone-300">•</span>
                <span className="tabular-nums">{summary.durationText}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <div className="flex bg-stone-100 rounded-xl p-1 flex-1 sm:flex-none">
              <button
                onClick={() => setActiveTab('balanco')}
                className={`flex-1 sm:flex-none px-4 h-9 text-[13px] font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'balanco' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Resumo
              </button>
              <button
                onClick={() => setActiveTab('pedidos')}
                className={`flex-1 sm:flex-none px-4 h-9 text-[13px] font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-2 ${activeTab === 'pedidos' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Pedidos
                <span className={`min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full text-[11px] ${activeTab === 'pedidos' ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                  {summary.totalOrdersCount}
                </span>
              </button>
            </div>
            <button onClick={onClose} title="Fechar (Esc)" className="w-10 h-10 shrink-0 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-stone-500">
              <div className="w-8 h-8 border-2 border-stone-200 border-t-brand-600 rounded-full animate-spin mb-4" />
              <p className="text-sm">Carregando o fechamento...</p>
            </div>
          ) : activeTab === 'balanco' ? (

            /* ===================== ABA RESUMO ===================== */
            <div className="p-5 sm:p-7 space-y-6">

              {/* Números principais */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-5">
                  <p className="text-[13px] font-medium text-stone-500">Faturamento</p>
                  <p className="mt-2 text-2xl sm:text-[28px] font-bold text-stone-900 tabular-nums leading-none">{brl(summary.totalRevenue)}</p>
                  <p className="mt-2 text-[12px] text-stone-400">Total vendido no turno</p>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5">
                  <p className="text-[13px] font-medium text-stone-500">Pedidos</p>
                  <p className="mt-2 text-2xl sm:text-[28px] font-bold text-stone-900 tabular-nums leading-none">{summary.totalOrdersCount}</p>
                  <p className="mt-2 text-[12px] text-stone-400 tabular-nums">Ticket médio {brl(ticketMedio)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5">
                  <p className="text-[13px] font-medium text-stone-500">Dinheiro na gaveta</p>
                  <p className="mt-2 text-2xl sm:text-[28px] font-bold text-stone-900 tabular-nums leading-none">{brl(summary.expectedCash)}</p>
                  <p className="mt-2 text-[12px] text-stone-400">Esperado no fechamento</p>
                </div>
                <div className={`rounded-2xl border p-5 ${!fechado ? 'bg-white border-stone-200' : exata ? 'bg-emerald-50 border-emerald-200' : diferenca < 0 ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-[13px] font-medium ${!fechado ? 'text-stone-500' : exata ? 'text-emerald-700' : diferenca < 0 ? 'text-rose-700' : 'text-amber-700'}`}>Conferência</p>
                  {fechado ? (
                    <>
                      <p className={`mt-2 text-2xl sm:text-[28px] font-bold tabular-nums leading-none ${exata ? 'text-emerald-700' : diferenca < 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                        {exata ? 'Bateu' : diferenca < 0 ? `Falta ${brl(Math.abs(diferenca))}` : `Sobra ${brl(diferenca)}`}
                      </p>
                      <p className={`mt-2 text-[12px] tabular-nums ${exata ? 'text-emerald-700/70' : diferenca < 0 ? 'text-rose-700/70' : 'text-amber-700/70'}`}>Contado {brl(summary.countedCash)}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-xl font-bold text-stone-400 leading-none">Caixa aberto</p>
                      <p className="mt-2 text-[12px] text-stone-400">Conferido ao fechar</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                {/* Coluna esquerda: canais e pagamentos */}
                <div className="lg:col-span-3 space-y-6">

                  <section className="bg-white rounded-2xl border border-stone-200">
                    <header className="px-5 pt-5 pb-3">
                      <h3 className="text-[15px] font-semibold text-stone-900">Vendas por canal</h3>
                    </header>
                    <div className="px-5 pb-2 divide-y divide-stone-100">
                      {canais.map((c) => {
                        const pct = summary.totalRevenue > 0 ? (c.dados.total / summary.totalRevenue) * 100 : 0;
                        const vazio = c.dados.count === 0;
                        return (
                          <div key={c.chave} className={`py-4 flex items-center gap-4 ${vazio ? 'opacity-50' : ''}`}>
                            <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${c.cor}`}>{c.icone}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[14px] font-semibold text-stone-900">{c.nome}</span>
                                <span className="text-[15px] font-bold text-stone-900 tabular-nums whitespace-nowrap">{brl(c.dados.total)}</span>
                              </div>
                              <div className="mt-2 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.barra}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-3 text-[12px] text-stone-500">
                                <span>{c.dados.count} {c.dados.count === 1 ? 'pedido' : 'pedidos'}</span>
                                {!vazio && <span className="truncate tabular-nums">{pagamentosPorCanal(c.dados.orders)}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl border border-stone-200">
                    <header className="px-5 pt-5 pb-3">
                      <h3 className="text-[15px] font-semibold text-stone-900">Formas de pagamento</h3>
                    </header>
                    <div className="px-5 pb-5 space-y-4">
                      {pagamentos.length === 0 ? (
                        <p className="text-[13px] text-stone-400 py-2">Nenhum recebimento neste turno.</p>
                      ) : (
                        pagamentos.map(([pm, val]) => {
                          const pct = summary.totalRevenue > 0 ? (val / summary.totalRevenue) * 100 : 0;
                          return (
                            <div key={pm}>
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="inline-flex items-center gap-2 text-[14px] font-medium text-stone-800">
                                  <span className={`w-2.5 h-2.5 rounded-full ${corPagamento(pm)}`} /> {pm}
                                </span>
                                <span className="text-[14px] tabular-nums whitespace-nowrap">
                                  <span className="text-stone-400 mr-3">{pct.toFixed(0)}%</span>
                                  <span className="font-bold text-stone-900">{brl(val)}</span>
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${corPagamento(pm)}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>

                {/* Coluna direita: conferência da gaveta e movimentações */}
                <div className="lg:col-span-2 space-y-6">

                  <section className="bg-white rounded-2xl border border-stone-200">
                    <header className="px-5 pt-5 pb-3 flex items-center gap-2">
                      <Wallet size={17} className="text-brand-600" />
                      <h3 className="text-[15px] font-semibold text-stone-900">Conferência da gaveta</h3>
                    </header>
                    <dl className="px-5 text-[14px]">
                      <div className="flex justify-between py-3 border-b border-stone-100">
                        <dt className="text-stone-600">Fundo de abertura</dt>
                        <dd className="tabular-nums text-stone-900">{brl(summary.fundoInicial)}</dd>
                      </div>
                      <div className="flex justify-between py-3 border-b border-stone-100">
                        <dt className="text-stone-600">Vendas em dinheiro</dt>
                        <dd className="tabular-nums text-emerald-700">+ {brl(summary.totalDinheiro)}</dd>
                      </div>
                      <div className="flex justify-between py-3 border-b border-stone-100">
                        <dt className="text-stone-600">Suprimentos</dt>
                        <dd className="tabular-nums text-emerald-700">+ {brl(summary.suprimentosTotal)}</dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-stone-600">Sangrias</dt>
                        <dd className="tabular-nums text-rose-700">− {brl(summary.sangriasTotal)}</dd>
                      </div>
                    </dl>
                    <div className="mx-5 mb-5 mt-1 rounded-xl bg-stone-50 border border-stone-200 divide-y divide-stone-200">
                      <div className="flex justify-between items-center px-4 py-3.5">
                        <span className="text-[14px] font-semibold text-stone-900">Saldo esperado</span>
                        <span className="text-[17px] font-bold text-stone-900 tabular-nums">{brl(summary.expectedCash)}</span>
                      </div>
                      {fechado && (
                        <>
                          <div className="flex justify-between items-center px-4 py-3.5">
                            <span className="text-[14px] text-stone-600">Valor contado</span>
                            <span className="text-[15px] font-semibold text-stone-900 tabular-nums">{brl(summary.countedCash)}</span>
                          </div>
                          <div className="flex justify-between items-center px-4 py-3.5">
                            <span className="text-[14px] text-stone-600">Diferença</span>
                            <span className={`text-[15px] font-bold tabular-nums ${exata ? 'text-emerald-700' : diferenca < 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                              {exata ? 'R$ 0,00 · bateu' : `${diferenca > 0 ? '+ ' : '− '}${brl(Math.abs(diferenca))}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl border border-stone-200">
                    <header className="px-5 pt-5 pb-3 flex items-center gap-2">
                      <ArrowLeftRight size={17} className="text-stone-500" />
                      <h3 className="text-[15px] font-semibold text-stone-900">Movimentações avulsas</h3>
                    </header>
                    <div className="px-5 pb-5">
                      {sessionDetails?.movements && sessionDetails.movements.length > 0 ? (
                        <ul className="divide-y divide-stone-100">
                          {sessionDetails.movements.map((m: any, idx: number) => {
                            const entrada = m.type === 'suprimento';
                            return (
                              <li key={idx} className="py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-medium text-stone-800">{entrada ? 'Suprimento' : 'Sangria'}</p>
                                  {m.notes && <p className="mt-0.5 text-[12px] text-stone-500 truncate">{m.notes}</p>}
                                </div>
                                <span className={`text-[14px] font-semibold tabular-nums whitespace-nowrap ${entrada ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {entrada ? '+ ' : '− '}{brl(Number(m.amount || 0))}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-[13px] text-stone-400">Nenhum suprimento ou sangria neste turno.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>

          ) : (

            /* ===================== ABA PEDIDOS ===================== */
            <div className="p-5 sm:p-7 space-y-4">

              {/* Filtros e busca */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="inline-flex bg-white p-1 rounded-xl border border-stone-200 overflow-x-auto">
                  {([
                    ['todos', 'Todos', sessionDetails?.orders?.length || 0, null],
                    ['entrega', 'Entrega', summary.entrega.count, <Bike size={14} key="b" />],
                    ['retirada', 'Retirada', summary.retirada.count, <ShoppingBag size={14} key="s" />],
                    ['mesa', 'Mesa', summary.mesa.count, <UtensilsCrossed size={14} key="u" />],
                  ] as const).map(([chave, nome, qtd, icone]) => (
                    <button
                      key={chave}
                      onClick={() => setOrderTypeFilter(chave as any)}
                      className={`px-3.5 h-9 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                        orderTypeFilter === chave ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {icone} {nome} <span className={orderTypeFilter === chave ? 'text-white/60' : 'text-stone-400'}>{qtd}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Buscar cliente, nº ou item"
                      className="w-full h-11 pl-9 pr-9 text-[14px] bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 text-stone-800 placeholder-stone-400 transition-all"
                    />
                    {orderSearch && (
                      <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="hidden lg:block text-right shrink-0">
                    <p className="text-[11px] text-stone-400 leading-none">Total filtrado</p>
                    <p className="mt-1 text-[15px] font-bold text-stone-900 tabular-nums leading-none">{brl(totalFilteredRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Lista de pedidos */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Filter className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="font-semibold text-stone-700">Nenhum pedido encontrado</p>
                    <p className="text-[13px] text-stone-400">Troque o filtro de canal ou o texto da busca.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {filteredOrders.map((order: any) => {
                      const isExpanded = expandedOrderId === order.id;
                      const normType = normalizeOrderType(order.order_type || order.orderType);
                      const normPayment = paymentLabel(order.payment_method || order.paymentMethod);
                      const items = safeParseItems(order.items);
                      const totalAmt = Number(order.total_amount || order.totalAmount || 0);
                      const orderDate = new Date(order.created_at || order.createdAt);
                      const troco = Number(order.change_for || order.changeFor || 0);

                      return (
                        <div key={order.id} className={isExpanded ? 'bg-stone-50/70' : 'hover:bg-stone-50/60 transition-colors'}>
                          <div onClick={() => toggleExpandOrder(order.id)} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 cursor-pointer select-none">
                            <div className="w-20 shrink-0">
                              <p className="font-bold text-[15px] text-stone-900 tabular-nums leading-none">#{order.id}</p>
                              <p className="mt-1.5 text-[12px] text-stone-500 tabular-nums leading-none">{format(orderDate, 'HH:mm')}</p>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[14px] text-stone-900 truncate leading-tight">{nomeBonito(order.customer_name || order.customerName) || 'Cliente balcão'}</p>
                              <p className="mt-1 text-[12px] text-stone-500 truncate">
                                {items.length > 0 ? items.map((it: any) => `${it.quantity || 1}x ${it.name}`).join(', ') : 'Nenhum item registrado'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                              <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-semibold ${
                                normType === 'entrega' ? 'bg-sky-50 text-sky-800' : normType === 'mesa' ? 'bg-emerald-50 text-emerald-800' : 'bg-brand-50 text-brand-800'
                              }`}>
                                {normType === 'entrega' ? <Bike size={13} /> : normType === 'mesa' ? <UtensilsCrossed size={13} /> : <ShoppingBag size={13} />}
                                {normType === 'entrega' ? 'Entrega' : normType === 'mesa' ? 'Mesa' : 'Retirada'}
                              </span>
                              <span className="w-28 text-[13px] text-stone-600 truncate">{normPayment}</span>
                              <span className="w-24 text-right font-bold text-[15px] text-stone-900 tabular-nums">{brl(totalAmt)}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedReceiptOrder(order); }}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                  title="Ver cupom / imprimir"
                                >
                                  <Receipt size={16} />
                                </button>
                                <span className={`w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 transition-transform ${isExpanded ? 'rotate-180 text-stone-900' : ''}`}>
                                  <ChevronDown size={18} />
                                </span>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5 animate-in fade-in duration-150">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3 text-[13px]">
                                  <p className="flex items-center gap-2 text-[12px] font-semibold text-stone-500 uppercase tracking-wide"><User size={14} /> Cliente</p>
                                  <div>
                                    <p className="font-semibold text-stone-900">{nomeBonito(order.customer_name || order.customerName) || 'Não informado'}</p>
                                    <p className="mt-0.5 text-stone-500 tabular-nums">{foneBonito(order.customer_phone || order.customerPhone) || 'Sem telefone'}</p>
                                    {order.nif && <p className="mt-0.5 text-stone-500 tabular-nums">CPF {order.nif}</p>}
                                  </div>
                                  {(order.delivery_address || order.deliveryAddress) && (
                                    <div className="pt-3 border-t border-stone-100">
                                      <p className="flex items-center gap-1.5 text-[12px] text-stone-500"><MapPin size={13} /> Entrega</p>
                                      <p className="mt-1 text-stone-800">{order.delivery_address || order.deliveryAddress}</p>
                                      {(order.delivery_zone || order.deliveryZone) && <p className="mt-0.5 text-stone-500">Bairro: {order.delivery_zone || order.deliveryZone}</p>}
                                    </div>
                                  )}
                                </div>

                                <div className="md:col-span-2 bg-white rounded-xl border border-stone-200 overflow-hidden">
                                  <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                                    <p className="text-[12px] font-semibold text-stone-500 uppercase tracking-wide">Itens ({items.length})</p>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceiptOrder(order)}
                                      className="h-8 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Printer size={14} /> Ver / imprimir
                                    </button>
                                  </div>
                                  <ul className="divide-y divide-stone-100">
                                    {items.map((item: any, idx: number) => {
                                      const qty = Number(item.quantity || 1);
                                      const unitPrice = Number(item.priceCalculated || item.price || item.basePrice || 0);
                                      const extras = Array.isArray(item.extras) ? item.extras : [];
                                      return (
                                        <li key={idx} className="px-4 py-3 flex items-start gap-3 text-[13px]">
                                          <span className="w-8 shrink-0 font-bold text-stone-900 tabular-nums">{qty}x</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-stone-900">{formatItemNameForPrint(item)}</p>
                                            {extras.length > 0 && (
                                              <p className="mt-1 text-[12px] text-stone-500">
                                                {extras.map((ext: any) => `+ ${ext.name}${Number(ext.price) ? ` (${brl(Number(ext.price))})` : ''}`).join(' · ')}
                                              </p>
                                            )}
                                            {item.notes && <p className="mt-1 text-[12px] text-amber-700">Obs: {item.notes}</p>}
                                          </div>
                                          <span className="font-semibold text-stone-900 tabular-nums whitespace-nowrap">{brl(unitPrice * qty)}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                                    <span className="text-stone-600">
                                      {normPayment}
                                      {troco > 0 && <span className="text-stone-400"> · troco para {brl(troco)}</span>}
                                      <span className="text-stone-400"> · {format(orderDate, "dd/MM/yyyy 'às' HH:mm")}</span>
                                    </span>
                                    <span className="font-bold text-stone-900 tabular-nums text-[15px]">Total {brl(totalAmt)}</span>
                                  </div>
                                </div>
                              </div>

                              {order.notes && (
                                <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px]">
                                  <strong>Observação do pedido:</strong> {order.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-stone-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <p className="text-[13px] text-stone-500">
            {summary.totalOrdersCount} {summary.totalOrdersCount === 1 ? 'pedido' : 'pedidos'} · {brl(summary.totalRevenue)}
          </p>
          <button
            onClick={onClose}
            className="h-10 px-5 bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL POPUP: TALÃO / CUPOM TÉRMICO (80MM STYLE) */}
      {/* ========================================================= */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-300">
            
            <div className="p-4 border-b border-stone-200 bg-stone-950 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2 font-mono">
                <Receipt size={16} className="text-amber-400" /> Cupom do Pedido #{selectedReceiptOrder.id}
              </span>
              <button 
                onClick={() => setSelectedReceiptOrder(null)} 
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Cupom Térmico */}
            <div className="p-5 overflow-y-auto bg-white font-mono text-stone-950 space-y-3 print-receipt-content">
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <h2 className="text-lg font-black tracking-tight uppercase">Mais Açaí</h2>
                <p className="text-[10px] text-stone-500 mt-0.5">Açaí · Delivery SJP</p>
                <div className="mt-1 text-[11px] font-bold text-stone-800">
                  {format(new Date(selectedReceiptOrder.created_at || selectedReceiptOrder.createdAt), "dd/MM/yyyy HH:mm:ss")}
                </div>
              </div>

              {/* Faixa Tipo + ID */}
              <div className="bg-stone-900 text-white p-2 rounded flex justify-between items-center text-xs font-black">
                <span>{normalizeOrderType(selectedReceiptOrder.order_type || selectedReceiptOrder.orderType).toUpperCase()}</span>
                <span>#{selectedReceiptOrder.id}</span>
              </div>

              {/* Dados do Cliente */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-stone-300 pb-2">
                <div><strong>Cliente:</strong> {selectedReceiptOrder.customer_name || selectedReceiptOrder.customerName || 'Balcão'}</div>
                {(selectedReceiptOrder.customer_phone || selectedReceiptOrder.customerPhone) && (
                  <div><strong>Tel:</strong> {selectedReceiptOrder.customer_phone || selectedReceiptOrder.customerPhone}</div>
                )}
                {(selectedReceiptOrder.nif) && (
                  <div><strong>NIF:</strong> {selectedReceiptOrder.nif}</div>
                )}
                {(selectedReceiptOrder.delivery_address || selectedReceiptOrder.deliveryAddress) && (
                  <div className="pt-1">
                    <strong>Endereço:</strong> {selectedReceiptOrder.delivery_address || selectedReceiptOrder.deliveryAddress}
                    {(selectedReceiptOrder.delivery_zone || selectedReceiptOrder.deliveryZone) && (
                      <span className="block text-[10px] text-stone-500">Zona: {selectedReceiptOrder.delivery_zone || selectedReceiptOrder.deliveryZone}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Itens */}
              <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                <div className="font-bold text-[11px] uppercase tracking-wider text-stone-500">Itens:</div>
                {safeParseItems(selectedReceiptOrder.items).map((it: any, i: number) => {
                  const qty = Number(it.quantity || 1);
                  const price = Number(it.priceCalculated || it.price || it.basePrice || 0);
                  const extras = Array.isArray(it.extras) ? it.extras : [];

                  return (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between items-start">
                        <span><strong className="font-black">{qty}x </strong><span className="font-normal">{formatItemNameForPrint(it)}</span></span>
                        <span className="font-bold tabular-nums">R$ {(price * qty).toFixed(2)}</span>
                      </div>
                      {extras.length > 0 && (
                        <div className="pl-3 text-[10px] text-stone-600">
                          {extras.map((ex: any, ei: number) => (
                            <div key={ei}>+ {ex.name} (R$ {Number(ex.price || 0).toFixed(2)})</div>
                          ))}
                        </div>
                      )}
                      {it.notes && (
                        <div className="pl-3 text-[10px] text-amber-800 italic">Obs: {it.notes}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total e Forma de Pagamento */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold">{paymentLabel(selectedReceiptOrder.payment_method || selectedReceiptOrder.paymentMethod)}</span>
                </div>
                {(selectedReceiptOrder.change_for || selectedReceiptOrder.changeFor) && (
                  <div className="flex justify-between text-stone-600">
                    <span>Troco para:</span>
                    <span className="font-bold">R$ {Number(selectedReceiptOrder.change_for || selectedReceiptOrder.changeFor).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span className="text-stone-950">R$ {Number(selectedReceiptOrder.total_amount || selectedReceiptOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Ações do Cupom */}
            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2 font-mono">
              <button
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={13} /> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
