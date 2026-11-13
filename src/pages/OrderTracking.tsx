import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { ArrowLeft, Check, MessageCircle, Receipt, Star } from 'lucide-react';
import { formatItemNameForPrint } from '../utils/printHelpers';
import { brl } from '../utils/formatacao';
import { etapasDoPedido, normalizarStatus, rotuloStatus, textoDoStatus } from '../utils/contaCliente';
import { RESTAURANT_WHATSAPP_PHONE } from '../data/menu';
import OrderReviewModal from '../components/OrderReviewModal';

export default function OrderTracking() {
  const { code } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      try {
        const { data, error } = await supabase.rpc('get_order_by_tracking_code', { p_code: code });
        if (error) throw error;
        if (!isMounted) return;
        if (data && data.length > 0) {
          const o = data[0];
          setOrder({
            id: o.id,
            customerName: o.customer_name,
            orderType: o.order_type,
            paymentMethod: o.payment_method,
            status: o.status,
            totalAmount: o.total_amount,
            items: o.items,
            createdAt: o.created_at
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch order', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-brand-700 border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-[22px] font-extrabold text-stone-900">Pedido não encontrado</h1>
        <p className="mt-1 text-[14px] text-stone-500 max-w-xs">Confira o link ou veja todos os seus pedidos entrando com seu WhatsApp.</p>
        <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
          <Link to="/conta" className="h-12 rounded-2xl bg-brand-700 text-white font-semibold text-[15px] flex items-center justify-center">Ver meus pedidos</Link>
          <Link to="/" className="h-11 rounded-2xl text-stone-600 font-medium text-[14px] flex items-center justify-center">Voltar ao cardápio</Link>
        </div>
      </div>
    );
  }

  const cancelado = order.status === 'Cancelado';
  const etapas = etapasDoPedido(order.orderType);
  const atual = Math.max(0, etapas.indexOf(normalizarStatus(order.status)));
  const finalizado = order.status === 'Finalizado';
  const msgLoja = encodeURIComponent(`Olá! Quero falar sobre o meu pedido #${order.id}.`);

  return (
    <div className="min-h-screen bg-page font-sans">
      <div className="max-w-md mx-auto px-4 py-5 sm:py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-[14px] font-medium text-stone-600 hover:text-stone-900">
          <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
        </Link>

        {/* Status */}
        <section className={`mt-2 rounded-3xl p-5 shadow-[0_12px_30px_rgba(38,1,58,0.18)] ${cancelado ? 'bg-rose-700' : 'bg-brand-900'} text-white`}>
          <div className="flex items-center justify-between gap-3 text-[12px] font-semibold uppercase tracking-wide text-white/60">
            <span>Pedido #{order.id}</span>
            <span>{order.orderType === 'Delivery' ? 'Entrega' : 'Retirada'}</span>
          </div>
          <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{rotuloStatus(order.status, order.orderType)}</h1>
          <p className="mt-1 text-[15px] text-white/80">{textoDoStatus(order.status, order.orderType)}</p>

          {!cancelado && (
            <ol className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }} aria-label="Andamento do pedido">
              {etapas.map((et, i) => (
                <li key={et}>
                  <span className={`block h-1.5 rounded-full transition-colors ${i <= atual ? 'bg-gold' : 'bg-white/20'}`} />
                  <span className={`mt-1.5 flex items-center gap-1 text-[12px] font-medium leading-tight ${i <= atual ? 'text-white' : 'text-white/50'}`}>
                    {(i < atual || finalizado) && <Check className="w-3 h-3 shrink-0" strokeWidth={3} />}
                    {rotuloStatus(et, order.orderType)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {!finalizado && !cancelado && (
            <p className="mt-4 text-[12px] text-white/50">Esta página atualiza sozinha.</p>
          )}
        </section>

        {/* Avaliação do Pedido (estilo Multipedidos) */}
        {finalizado && (
          <section className="mt-4 bg-gradient-to-br from-amber-50 to-purple-50 rounded-3xl p-5 ring-1 ring-amber-200/70 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center shadow-xs shrink-0">
                <Star className="w-6 h-6 fill-stone-900" />
              </div>
              <div>
                <h3 className="font-display text-[16px] font-bold text-stone-900 leading-tight">
                  Como estava o seu açaí?
                </h3>
                <p className="text-[13px] text-stone-600 mt-0.5">
                  Sua avaliação ajuda a Mais Açaí e outros clientes!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="mt-3.5 w-full h-11 rounded-2xl bg-[#4d0471] hover:bg-[#6a2092] text-white font-bold text-[13.5px] flex items-center justify-center gap-2 transition shadow-md cursor-pointer active:scale-[0.99]"
            >
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>Avaliar este pedido agora</span>
            </button>
          </section>
        )}

        <OrderReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          orderId={order.id}
          trackingCode={code}
          customerName={order.customerName}
        />

        {/* Resumo */}
        <section className="mt-4 bg-white rounded-3xl ring-1 ring-stone-200/80 p-5">
          <h2 className="font-display text-[16px] font-bold text-stone-900">Resumo do pedido</h2>
          <ul className="mt-3 space-y-2.5">
            {order.items.map((item: any, i: number) => (
              <li key={i} className="flex justify-between gap-3 text-[14px]">
                <span className="text-stone-700 min-w-0">
                  <strong className="font-semibold text-stone-900">{item.quantity}x</strong> {formatItemNameForPrint(item)}
                  {item.notes && <span className="block text-[12px] text-stone-500 mt-0.5">{item.notes}</span>}
                </span>
                <span className="font-medium text-stone-900 tabular-nums shrink-0">{brl(item.priceCalculated * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-baseline">
            <span className="text-[15px] font-semibold text-stone-900">Total</span>
            <span className="font-display text-[22px] font-extrabold text-stone-900 tabular-nums">{brl(Number(order.totalAmount))}</span>
          </div>
          <p className="mt-1 text-[13px] text-stone-500 text-right">Pagamento: {order.paymentMethod}</p>
        </section>

        {/* Ações */}
        <div className="mt-4 grid gap-2">
          <a
            href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}?text=${msgLoja}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-5 h-5" /> Falar com a loja
          </a>
          <Link to="/conta" className="h-12 rounded-2xl bg-white ring-1 ring-stone-200 text-brand-700 font-semibold text-[15px] flex items-center justify-center gap-2 hover:ring-brand-300 transition">
            <Receipt className="w-5 h-5" /> Ver todos os meus pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
