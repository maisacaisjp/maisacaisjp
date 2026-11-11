import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from '../lib/supabase';
import { CartItem, SIZE_LABELS } from "../types";
import { agruparExtras, nomeExtraAgrupado } from "../utils/produto";
import { brl, nomeBonito } from "../utils/formatacao";
import { guardarUltimoPedido } from "../utils/contaCliente";
import { hapticLight, hapticMedium, hapticSuccess } from "../utils/haptics";
import {
  RESTAURANT_WHATSAPP_PHONE,
  ALL_MENU_ITEMS,
  NEIGHBORHOOD_DELIVERY_FEES,
} from "../data/menu";
import { useBusinessHours } from '../hooks/useBusinessHours';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Check, 
  MapPin, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Clock, 
  AlertCircle,
  Phone,
  User,
  FileText,
  Sparkles,
  Bike,
  Store,
  CheckCircle2,
  MessageCircle,
  CreditCard,
  Banknote
} from "lucide-react";
import { useAnalytics } from '../hooks/useAnalytics';
import { getCashbackConfig, getCustomerCashbackInfo, dataCurta, DEFAULT_CASHBACK_PERCENT } from '../utils/cashback';
import PixPaymentCard from './PixPaymentCard';
import { PIX_CONFIG_PADRAO } from '../utils/pix';

const ENDERECO_LOJA = "Rua Almirante Alexandrino, 909, sala 02 – Parque da Fonte";
const MAPA_LOJA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Rua Almirante Alexandrino, 909, São José dos Pinhais - PR")}`;

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onAddToCart: (item: CartItem) => void;
  isOpen: boolean; // Used for mobile modal
  onClose: () => void; // Used for mobile modal
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
  isOpen,
  onClose,
}: CartProps) {
  const { trackEvent } = useAnalytics();

  // Navigation Steps: 'items' (Meu Pedido) | 'checkout' (Dados de Entrega & Pagamento)
  const [currentStep, setCurrentStep] = useState<'items' | 'checkout'>('items');
  const [showNifInput, setShowNifInput] = useState(false);

  // Dismiss on ESC when mobile cart drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Form State
  const [name, setName] = useState("");
  const [telefone, setTelefone] = useState("");
  const [morada, setMorada] = useState("");
  const [zona, setZona] = useState("");
  const [nif, setNif] = useState("");
  const [orderType, setOrderType] = useState<"Delivery" | "Takeaway">("Delivery");
  const [pagamento, setPagamento] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");

  const [hasShownParty, setHasShownParty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [valorPedido, setValorPedido] = useState(0); // total do pedido enviado (para o PIX da tela de sucesso)
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  const [savedTrackingCode, setSavedTrackingCode] = useState<string | null>(null);
  const [hasClickedWhatsapp, setHasClickedWhatsapp] = useState(false);

  const [zonesFees, setZonesFees] = useState<Record<string, number>>(NEIGHBORHOOD_DELIVERY_FEES || {});
  const [minDeliveryOrder, setMinDeliveryOrder] = useState(30);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('45 a 75 min');
  const [pickupTimeEstimate, setPickupTimeEstimate] = useState('20 a 30 min');

  // Cashback States
  const [cashbackConfig, setCashbackConfig] = useState<{ enabled: boolean; percent: number }>({
    enabled: true,
    percent: DEFAULT_CASHBACK_PERCENT
  });
  const [customerCashbackBalance, setCustomerCashbackBalance] = useState<number>(0);
  const [useCashback, setUseCashback] = useState(false);
  const [loadingCashback, setLoadingCashback] = useState(false);
  const [cashbackVence, setCashbackVence] = useState<{ data: string; valor: number } | null>(null);

  useEffect(() => {
    getCashbackConfig().then(cfg => setCashbackConfig(cfg));
  }, []);

  useEffect(() => {
    const clean = (telefone || '').replace(/\D/g, '');
    if (clean.length < 10) {
      setCustomerCashbackBalance(0);
      setCashbackVence(null);
      setUseCashback(false);
      return;
    }
    let isCurrent = true;
    setLoadingCashback(true);
    const timer = setTimeout(async () => {
      const info = await getCustomerCashbackInfo(clean);
      if (isCurrent) {
        setCustomerCashbackBalance(info.saldo);
        setCashbackVence(info.proximoVencimento ? { data: info.proximoVencimento, valor: info.valorProximoVencimento } : null);
        setLoadingCashback(false);
      }
    }, 350);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [telefone]);

  // Load saved customer checkout details from localStorage (Memory for fast re-orders)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customer_checkout_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.telefone) setTelefone(parsed.telefone);
        if (parsed.morada) setMorada(parsed.morada);
        if (parsed.zona) setZona(parsed.zona);
        if (parsed.nif) {
          setNif(parsed.nif);
          setShowNifInput(true);
        }
        if (parsed.orderType) setOrderType(parsed.orderType);
        if (parsed.pagamento) setPagamento(parsed.pagamento);
      }
    } catch (e) {
      console.warn('[Cart] Error reading localStorage customer data', e);
    }
  }, []);

  // Save changes to localStorage
  const saveCustomerData = (updates: Partial<{
    name: string;
    telefone: string;
    morada: string;
    zona: string;
    nif: string;
    orderType: "Delivery" | "Takeaway";
    pagamento: string;
  }>) => {
    try {
      const current = {
        name,
        telefone,
        morada,
        zona,
        nif,
        orderType,
        pagamento,
        ...updates
      };
      localStorage.setItem('customer_checkout_data', JSON.stringify(current));
    } catch (e) {
      // ignore
    }
  };

  // Reset to step 1 if cart becomes empty
  useEffect(() => {
    if (items.length === 0 && currentStep === 'checkout') {
      setCurrentStep('items');
    }
  }, [items.length, currentStep]);

  useEffect(() => {
    const loadDeliverySettings = async () => {
      try {
        const { data: zones, error: zonesError } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('sort_order');
        if (zonesError) throw zonesError;
        if (zones && zones.length > 0) {
          const map: Record<string, number> = {};
          zones.forEach((z: any) => { map[z.name] = Number(z.fee); });
          setZonesFees(map);
        }

        const { data: settingsRows, error: settingsError } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['delivery_min_order', 'delivery_time_estimate', 'pickup_time_estimate']);
        if (settingsError) throw settingsError;
        settingsRows?.forEach((row: any) => {
          if (row.key === 'delivery_min_order') setMinDeliveryOrder(Number(row.value));
          if (row.key === 'delivery_time_estimate') setDeliveryTimeEstimate(row.value);
          if (row.key === 'pickup_time_estimate') setPickupTimeEstimate(row.value);
        });
      } catch (err) {
        console.warn('[Cart] Não foi possível carregar zonas/configurações do Supabase, usando valores padrão.', err);
      }
    };
    loadDeliverySettings();
  }, []);

  const subtotal = items.reduce(
    (acc, item) => acc + item.priceCalculated * item.quantity,
    0,
  );
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  let deliveryFee = 0;
  if (orderType === "Delivery") {
    deliveryFee = zonesFees[zona] !== undefined ? zonesFees[zona] : (NEIGHBORHOOD_DELIVERY_FEES[zona] || 0);
  }

  const rawTotal = subtotal + deliveryFee;
  const cashbackDiscount = (cashbackConfig.enabled && useCashback && customerCashbackBalance > 0)
    ? Math.min(customerCashbackBalance, rawTotal)
    : 0;
  const total = Math.max(0, Number((rawTotal - cashbackDiscount).toFixed(2)));
  const earnedCashback = cashbackConfig.enabled
    ? Number((Math.max(0, subtotal - cashbackDiscount) * (cashbackConfig.percent / 100)).toFixed(2))
    : 0;
  const businessStatus = useBusinessHours();

  const handleCheckout = async () => {
    trackEvent('initiate_checkout', { total_value: total, item_count: items.length });
    setFormError(null);
    const errors: string[] = [];

    if (!businessStatus.isOpen) {
      errors.push("Estamos fechados no momento. Poderá finalizar o pedido durante o nosso horário de funcionamento.");
    }

    if (orderType === "Delivery" && subtotal < minDeliveryOrder) {
      errors.push(`O valor mínimo para entrega é de R$${minDeliveryOrder.toFixed(2)}.`);
    }
    if (!name.trim()) {
      errors.push("Por favor, preencha o seu nome.");
    }
    if (orderType === "Delivery") {
      if (!morada.trim()) {
        errors.push("Por favor, preencha a endereço de entrega.");
      }
      if (!zona.trim()) {
        errors.push("Por favor, selecione a zona/freguesia de entrega.");
      }
    }

    if (errors.length > 0) {
      setFormError(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);
    const orderNumber = Math.floor(1000 + Math.random() * 9000);

    let newOrderId = null;
    let trackingCode: string | null = null;
    let orderSavedSuccessfully = false;
    let erroServidor: string | null = null;
    // Valores confirmados pelo servidor (taxa do bairro e saldo de cashback conferidos lá)
    let totalFinal = total;
    let taxaFinal = deliveryFee;
    let descontoFinal = cashbackDiscount;
    let ganhoFinal = earnedCashback;
    let saldoFinal = Math.max(0, customerCashbackBalance - cashbackDiscount + earnedCashback);
    try {
      const resp = await fetch('/.netlify/functions/pedido-criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: telefone,
          order_type: orderType,
          payment_method: pagamento,
          delivery_address: orderType === 'Delivery' ? morada : null,
          delivery_zone: orderType === 'Delivery' ? zona : null,
          change_for: pagamento === 'Dinheiro' ? trocoPara : null,
          nif: nif.trim() ? nif : null,
          taxa_entrega: deliveryFee,
          usar_cashback: cashbackDiscount > 0,
          items: items.map(item => {
            let itemName = item.menuItem.name;
            if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
              itemName = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
            }
            if (item.size) {
              const sizeMap: Record<string, string> = {
                'P': '330ml',
                'M': '440ml',
                'G': '550ml',
                'Big': '770ml',
                'Super Big': 'Pote Recheado 1 Litro',
                '2L': '2 Litros'
              };
              itemName += ` (${sizeMap[item.size] || item.size})`;
            }
            const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
            return {
              name: itemName,
              category: item.menuItem.category,
              quantity: item.quantity,
              priceCalculated: item.priceCalculated,
              basePrice: item.priceCalculated - extrasTotalPrice,
              extras: item.extras || [],
              notes: item.notes || ""
            };
          })
        }),
      });
      const r = await resp.json().catch(() => null);
      if (!resp.ok || !r?.ok) {
        erroServidor = r?.erro || null;
        throw new Error(r?.erro || `pedido-criar respondeu ${resp.status}`);
      }

      newOrderId = r.id;
      setSavedOrderId(newOrderId);
      setSavedTrackingCode(r.tracking_code);
      trackingCode = r.tracking_code || null;
      orderSavedSuccessfully = true;
      totalFinal = Number(r.total);
      taxaFinal = Number(r.taxa_entrega);
      descontoFinal = Number(r.cashback_usado);
      ganhoFinal = Number(r.cashback_ganho);
      saldoFinal = Number(r.saldo_cashback);
      if (descontoFinal > 0 || ganhoFinal > 0) {
        setCustomerCashbackBalance(saldoFinal);
        setUseCashback(false);
      }
      // Aviso "seu pedido está em preparo" no topo do cardápio, mesmo se o cliente fechar e voltar
      if (trackingCode) {
        guardarUltimoPedido({ codigo: trackingCode, id: newOrderId, criadoEm: new Date().toISOString() });
        window.dispatchEvent(new Event('maisacai:pedido-enviado'));
      }
    } catch (err) {
      console.error("Error saving order:", err);
    } finally {
      setIsSubmitting(false);
    }

    if (!orderSavedSuccessfully) {
      setFormError(erroServidor || "Não foi possível registrar o seu pedido agora. Verifique a conexão e tente novamente.");
      return;
    }

    let text = `-----------------------------------\n`;
    text += `           MAIS AÇAÍ\n`;
    text += `-----------------------------------\n`;
    text += `Pedido Nº: ${newOrderId || orderNumber}\n`;
    text += `Tipo: ${orderType === "Delivery" ? "Entrega" : "Retirada"}\n\n`;

    text += `[CLIENTE]\n`;
    text += `Nome: ${name}\n`;
    text += `Telefone: ${telefone}\n`;
    if (nif.trim()) {
      text += `CPF: ${nif}\n`;
    }
    text += `\n`;

    if (orderType === "Delivery") {
      text += `[ENDEREÇO DE ENTREGA]\n`;
      text += `Endereço: ${morada}\n`;
      text += `Complemento: ${zona}\n`;
      text += `-----------------------------------\n`;
      text += `🛵 Tempo est. de entrega:\n   ${deliveryTimeEstimate}\n`;
    } else {
      text += `-----------------------------------\n`;
      text += `⏱️ Tempo est. de prep:\n   ${pickupTimeEstimate}\n`;
    }

    const orderDateObj = new Date();
    const dateStr = orderDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const timeStr = orderDateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    text += `-----------------------------------\n`;
    text += `[ITENS DO PEDIDO]\n`;
    text += `Data: ${dateStr} Hora: ${timeStr}\n\n`;

    const sortedItems = [...items].sort((a, b) => {
      const catA = (a.menuItem.category || "").toLowerCase();
      const catB = (b.menuItem.category || "").toLowerCase();
      const getWeight = (cat: string) => {
        if (cat.includes('copo') || cat.includes('barca') || cat.includes('fondue')) return 1;
        if (cat.includes('milk') || cat.includes('shake')) return 2;
        if (cat.includes('bebida')) return 3;
        return 4;
      };
      return getWeight(catA) - getWeight(catB);
    });

    sortedItems.forEach((item) => {
      let desc = item.menuItem.name;
      if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
        desc = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
      }
      if (item.size) {
        const sizeMap: Record<string, string> = {
          'P': '330ml',
          'M': '440ml',
          'G': '550ml',
          'Big': '770ml',
          'Super Big': 'Pote Recheado 1 Litro',
          '2L': '2 Litros'
        };
        desc += ` (${sizeMap[item.size] || item.size})`;
      }
      
      const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
      const basePrice = item.priceCalculated - extrasTotalPrice;
      const priceStr = `R$ ${(basePrice * item.quantity).toFixed(2)}`;
      text += `*${item.quantity}x* ${desc} (${priceStr})\n`;
      
      if (item.extras && item.extras.length > 0) {
        agruparExtras(item.extras).forEach((g) => {
          text += `   + ${nomeExtraAgrupado(g)} (+ R$ ${(g.extra.price * g.qtd * item.quantity).toFixed(2)})\n`;
        });
        text += `   *Subtotal item: R$ ${(item.priceCalculated * item.quantity).toFixed(2)}*\n`;
      }
      if (item.notes) {
        text += `   📝 Obs: ${item.notes}\n`;
      }
      text += `\n`;
    });

    text += `-----------------------------------\n`;
    text += `*Subtotal: R$ ${subtotal.toFixed(2)}*\n`;
    if (orderType === "Delivery") {
      text += `Taxa Entrega (${zona || 'SJP'}): R$ ${taxaFinal.toFixed(2)}\n`;
    }
    if (descontoFinal > 0) {
      text += `Desconto Cashback: -R$ ${descontoFinal.toFixed(2)}\n`;
    }
    text += `*TOTAL: R$ ${totalFinal.toFixed(2)}*\n`;

    if (cashbackConfig.enabled) {
      text += `-----------------------------------\n`;
      text += `🎁 FIDELIDADE & CASHBACK (${cashbackConfig.percent}%)\n`;
      if (descontoFinal > 0) {
        text += `Desconto Cashback Utilizado: -R$ ${descontoFinal.toFixed(2)}\n`;
      }
      text += `Cashback Ganho Hoje: +R$ ${ganhoFinal.toFixed(2)}\n`;
      const nextBal = saldoFinal;
      text += `Saldo Disponível Próximo Pedido: R$ ${nextBal.toFixed(2)}\n`;
    }

    const baseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
      ? window.location.origin
      : 'https://maisacaisjpoficial.netlify.app';
    const trackingUrl = `${baseUrl}/conta`;

    text += `-----------------------------------\n`;
    text += `[PAGAMENTO]\n`;
    text += `Forma: ${pagamento}\n`;
    if (pagamento === "Dinheiro" && trocoPara) {
      text += `Troco para: R$ ${trocoPara}\n`;
    }
    if (pagamento.includes("Cartão") && orderType === "Delivery") {
      text += `(Levar maquininha de cartão)\n`;
    }
    if (pagamento === "PIX") {
      // O código Copia e Cola fica só na tela de pedido enviado (com QR Code), não no resumo do WhatsApp
      text += `\n🔑 *DADOS PARA PAGAMENTO PIX:*\n`;
      text += `• Chave (Celular): *${PIX_CONFIG_PADRAO.telefoneFormatado}*\n`;
      text += `• Conta: *Mais Açaí* (${PIX_CONFIG_PADRAO.banco})\n`;
      text += `• Na confirmação pode aparecer *${PIX_CONFIG_PADRAO.nomesNaConfirmacao}*: é a mesma conta da loja\n`;
      text += `• Valor: *R$ ${totalFinal.toFixed(2)}*\n`;
    }
    text += `-----------------------------------`;
    if (trackingUrl) {
      text += `\n\n📍 *ACOMPANHE SEU PEDIDO EM MEUS PEDIDOS:*\n${trackingUrl}\n`;
    }

    const encoded = encodeURIComponent(text);
    const wappUrl = `https://wa.me/${RESTAURANT_WHATSAPP_PHONE}?text=${encoded}`;

    trackEvent('purchase', { total_value: totalFinal, order_id: newOrderId || orderNumber });
    
    // Dispara comemoração e haptic feedback
    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (_) {}
    hapticSuccess();

    setWhatsappUrl(wappUrl);
    setValorPedido(totalFinal); // guarda antes de esvaziar a sacola (senão o PIX sai com R$ 0,00)
    setHasClickedWhatsapp(false);
    setIsSuccess(true);
    onClearCart();
  };

  // SUCCESS SCREEN
  if (isSuccess) {
    const isPix = pagamento === "PIX";

    const sucesso = (
      <div className="flex flex-col items-center text-center px-5 py-7 sm:px-6 sm:py-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="w-8 h-8 text-leaf" strokeWidth={2.5} />
        </div>

        {savedOrderId && (
          <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-brand-50 text-brand-800 border border-brand-200/80 mb-2">
            Pedido #{savedOrderId}
          </span>
        )}

        <h2 className="font-display text-[22px] font-extrabold text-stone-900 leading-tight">
          Pedido Finalizado!
        </h2>

        <p className="text-stone-500 text-[14px] mt-1.5 max-w-sm">
          {isPix
            ? "Efetue o pagamento via PIX abaixo e clique no botão verde para enviar o pedido para o nosso WhatsApp."
            : "Seu pedido foi registrado! Agora clique no botão verde abaixo para enviar os dados para a loja pelo WhatsApp."}
        </p>

        {/* Quando for PIX: Mostra Card Completo com QR Code e Copia e Cola */}
        {isPix && (
          <div className="w-full text-left mt-4 mb-2">
            <PixPaymentCard
              valor={valorPedido}
              identificador={savedTrackingCode || String(savedOrderId || '')}
              className="w-full"
            />
          </div>
        )}

        {/* Quando for Outra Forma (Cartão de Crédito, Débito ou Dinheiro): Mostra resumo do pagamento */}
        {!isPix && (
          <div className="w-full max-w-sm bg-stone-50 rounded-2xl ring-1 ring-stone-200/80 p-4 text-left mt-4 mb-2 space-y-2.5">
            <div className="flex justify-between items-center text-[14px]">
              <span className="text-stone-500 font-medium">Pagamento selecionado:</span>
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                {pagamento.includes("Cartão") ? (
                  <CreditCard className="w-4 h-4 text-brand-700" />
                ) : (
                  <Banknote className="w-4 h-4 text-leaf" />
                )}
                {pagamento}
              </span>
            </div>

            {pagamento === "Dinheiro" && trocoPara && (
              <div className="flex justify-between items-center text-[13px] text-stone-600 border-t border-stone-200/70 pt-2">
                <span>Troco para:</span>
                <span className="font-semibold text-stone-900">R$ {trocoPara}</span>
              </div>
            )}

            {pagamento.includes("Cartão") && orderType === "Delivery" && (
              <div className="text-[12px] text-stone-500 italic border-t border-stone-200/70 pt-1.5">
                Levar maquininha de cartão na entrega.
              </div>
            )}

            <div className="flex justify-between items-center text-[15px] border-t border-stone-200 pt-2.5">
              <span className="font-semibold text-stone-700">Total a pagar:</span>
              <span className="font-extrabold text-brand-800 text-[18px] tabular-nums">
                {brl(valorPedido)}
              </span>
            </div>
          </div>
        )}

        {/* O ÚLTIMO BOTÃO: ENVIAR PARA O WHATSAPP */}
        <div className="w-full max-w-sm mx-auto flex flex-col gap-2 mt-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setHasClickedWhatsapp(true);
              hapticLight();
            }}
            className="w-full h-14 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2.5 shadow-[0_8px_20px_rgba(37,211,102,0.32)] transition cursor-pointer active:scale-[0.99]"
          >
            <MessageCircle className="w-6 h-6 fill-current shrink-0" />
            <span>{hasClickedWhatsapp ? "Reenviar para o WhatsApp" : "Enviar Pedido para o WhatsApp"}</span>
          </a>

          <p className="text-[12px] text-stone-500 text-center leading-tight">
            {isPix
              ? "⚠️ Envie a mensagem no WhatsApp para a loja confirmar e iniciar o preparo!"
              : "⚠️ Clique acima para abrir a conversa com o pedido pronto para envio!"}
          </p>

          {savedOrderId && (
            <a
              href="/conta"
              className="w-full h-11 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-[14px] rounded-xl ring-1 ring-stone-200 flex items-center justify-center gap-2 transition cursor-pointer mt-3"
            >
              Acompanhar em Meus Pedidos
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setCurrentStep("items");
              setHasClickedWhatsapp(false);
              onClose();
            }}
            className="h-10 text-[14px] text-stone-500 hover:text-stone-900 font-medium cursor-pointer"
          >
            Voltar ao cardápio
          </button>
        </div>
      </div>
    );

    return (
      <>
        <div className="hidden lg:block sticky top-[76px] w-full">
          <div className="bg-white rounded-3xl ring-1 ring-stone-200/80 shadow-[0_10px_30px_rgba(38,1,58,0.06)] max-h-[calc(100vh-92px)] overflow-y-auto overscroll-contain">{sucesso}</div>
        </div>

        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-[55] flex flex-col justify-end">
            <div className="absolute inset-0 bg-stone-950/55 animate-fade-in" onClick={onClose} />
            <div className="relative bg-white w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] shadow-2xl pb-safe animate-sheet-in">{sucesso}</div>
          </div>
        )}
      </>
    );
  }

  const PAGAMENTOS: { valor: string; rotulo: string }[] = [
    { valor: "PIX", rotulo: "PIX" },
    { valor: "Cartão de Crédito", rotulo: "Crédito" },
    { valor: "Cartão de Débito", rotulo: "Débito" },
    { valor: "Dinheiro", rotulo: "Dinheiro" },
  ];

  const campoCls =
    "w-full h-12 bg-white rounded-xl px-3.5 text-[16px] text-stone-900 placeholder:text-stone-400 ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-600 outline-none transition-shadow";
  const rotuloCls = "flex items-center gap-1.5 text-[13px] font-semibold text-stone-700 mb-1.5";
  const opcaoCls = (ativo: boolean) =>
    `h-11 px-1 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
      ativo ? "bg-brand-50 text-brand-800 ring-2 ring-brand-700" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300"
    }`;

  // CONTEÚDO DA SACOLA (desktop: coluna; celular: folha de baixo)
  const CartContent = (
    <div className="flex flex-col w-full">
      {/* CABEÇALHO */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-3.5 pb-3 border-b border-stone-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {currentStep === 'checkout' && (
              <button
                type="button"
                onClick={() => setCurrentStep('items')}
                aria-label="Voltar para os itens"
                className="-ml-2 w-9 h-9 rounded-full text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-display text-[18px] font-extrabold text-stone-900">
              {currentStep === 'items' ? 'Sua sacola' : 'Finalizar pedido'}
            </h2>
            {currentStep === 'items' && totalItemCount > 0 && (
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-brand-50 text-brand-700 text-[12px] font-bold flex items-center justify-center tabular-nums">
                {totalItemCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && currentStep === 'items' && (
              <button
                onClick={onClearCart}
                className="h-9 px-2.5 text-[13px] text-stone-500 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar sacola"
              className="lg:hidden w-9 h-9 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Etapas */}
        {items.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Etapas do pedido">
            {[
              { id: 'items' as const, rotulo: '1. Itens' },
              { id: 'checkout' as const, rotulo: '2. Entrega ou retirada' },
            ].map((e) => {
              const ativo = currentStep === e.id;
              const feito = e.id === 'items' && currentStep === 'checkout';
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setCurrentStep(e.id)}
                  aria-current={ativo ? 'step' : undefined}
                  className="text-left cursor-pointer group"
                >
                  <span className={`block h-1 rounded-full transition-colors ${ativo || feito ? 'bg-brand-700' : 'bg-stone-200 group-hover:bg-stone-300'}`} />
                  <span className={`block mt-1.5 text-[12px] font-semibold ${ativo ? 'text-brand-700' : 'text-stone-400'}`}>{e.rotulo}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SACOLA VAZIA */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6 text-brand-500" />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px]">Sua sacola está vazia</h3>
          <p className="text-stone-500 text-[14px] max-w-[240px] mt-1">
            Escolha um açaí ou combo no cardápio para começar.
          </p>
          <button
            onClick={onClose}
            className="lg:hidden mt-5 h-11 px-5 bg-brand-700 text-white text-[14px] font-semibold rounded-xl hover:bg-brand-800 transition-colors cursor-pointer"
          >
            Ver cardápio
          </button>
        </div>
      ) : (
        <>
          {/* ===================== ETAPA 1: ITENS ===================== */}
          {currentStep === 'items' && (
            <div className="animate-fade-in">
              <ul className="px-5 divide-y divide-stone-100">
                {items.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-stone-900 leading-snug">
                          {item.isHalfAndHalf && item.halfAndHalfFlavor
                            ? `1/2 ${nomeBonito(item.menuItem.name)} + 1/2 ${nomeBonito(item.halfAndHalfFlavor.name)}`
                            : nomeBonito(item.menuItem.name)}
                        </p>
                        {item.size && (
                          <span className="inline-block mt-1 text-[12px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            {SIZE_LABELS[item.size] || item.size}
                          </span>
                        )}
                        {item.extras && item.extras.length > 0 && (
                          <p className="text-[13px] text-stone-500 mt-1.5 leading-relaxed">
                            {agruparExtras(item.extras).map((g) => `+ ${nomeExtraAgrupado(g)}`).join(' · ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[13px] text-stone-600 mt-1.5 leading-relaxed bg-amber-50 rounded-lg px-2.5 py-1.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-display font-bold text-stone-900 shrink-0 text-[15px] tabular-nums">
                        {brl(item.priceCalculated * item.quantity)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center h-10 rounded-full ring-1 ring-stone-200 bg-white">
                        <button
                          onClick={() => (item.quantity > 1 ? onUpdateQuantity(item.id, -1) : onRemoveItem(item.id))}
                          aria-label={item.quantity > 1 ? 'Diminuir quantidade' : 'Remover item'}
                          className="w-10 h-10 rounded-full text-brand-700 hover:bg-brand-50 flex items-center justify-center cursor-pointer"
                        >
                          {item.quantity > 1 ? <Minus className="w-4 h-4" strokeWidth={2.5} /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <span className="w-6 text-center font-display text-[15px] font-bold text-stone-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          aria-label="Aumentar quantidade"
                          className="w-10 h-10 rounded-full text-brand-700 hover:bg-brand-50 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      {item.quantity > 1 && (
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="h-9 px-2 text-[13px] text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Sugestão de bebida */}
              {(() => {
                const hasBebida = items.some((i) => i.menuItem.category === "bebidas");
                if (hasBebida) return null;
                const sug = ALL_MENU_ITEMS.find((m) => m.id === "b-1");
                if (!sug) return null;
                return (
                  <div className="mx-5 mb-4 bg-stone-50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-[14px] text-stone-600 min-w-0">
                      Que tal uma <strong className="text-stone-900 font-semibold">{nomeBonito(sug.name)}</strong> por {brl(sug.priceSingle || 0)}?
                    </span>
                    <button
                      onClick={() =>
                        onAddToCart({
                          id: Date.now().toString(),
                          menuItem: sug,
                          quantity: 1,
                          priceCalculated: sug.priceSingle || 0,
                        })
                      }
                      className="h-9 px-3 text-[13px] bg-white ring-1 ring-stone-200 text-brand-700 font-semibold rounded-xl hover:ring-brand-300 transition shrink-0 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                );
              })()}

              {/* Rodapé fixo da etapa 1 */}
              <div className="sticky bottom-0 bg-white border-t border-stone-100 px-5 pt-3 pb-4 lg:pb-5">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[14px] text-stone-500">Subtotal</span>
                  <span className="font-display text-[20px] font-extrabold text-stone-900 tabular-nums">{brl(subtotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setCurrentStep('checkout');
                  }}
                  disabled={!businessStatus.isOpen}
                  className={`w-full h-[52px] rounded-2xl font-semibold text-[15px] transition flex justify-center items-center gap-2 cursor-pointer ${
                    !businessStatus.isOpen
                      ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                      : 'bg-brand-700 hover:bg-brand-800 active:scale-[0.99] text-white shadow-[0_8px_20px_rgba(77,4,113,0.25)]'
                  }`}
                >
                  {!businessStatus.isOpen ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Loja fechada no momento</span>
                    </>
                  ) : (
                    <>
                      <span>Continuar para entrega ou retirada</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ===================== ETAPA 2: ENTREGA E PAGAMENTO ===================== */}
          {currentStep === 'checkout' && (
            <div className="animate-fade-in">
              <div className="px-5 pt-3.5 pb-4 space-y-3.5">
                {/* Entrega ou retirada */}
                <fieldset>
                  <legend className={rotuloCls}>Como você quer receber?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { valor: "Delivery", titulo: "Entrega", Icone: Bike, tempo: deliveryTimeEstimate, info: "Taxa por bairro" },
                      { valor: "Takeaway", titulo: "Retirada", Icone: Store, tempo: pickupTimeEstimate, info: "Sem taxa" },
                    ] as const).map(({ valor, titulo, Icone, tempo, info }) => {
                      const ativo = orderType === valor;
                      return (
                        <button
                          key={valor}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => {
                            setOrderType(valor);
                            saveCustomerData({ orderType: valor });
                            setFormError(null);
                          }}
                          className={`flex items-center gap-2.5 text-left rounded-2xl px-3 py-2.5 transition-all cursor-pointer ${
                            ativo ? "bg-brand-50 ring-2 ring-brand-700" : "bg-white ring-1 ring-stone-200 hover:ring-stone-300"
                          }`}
                        >
                          <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${ativo ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-600"}`}>
                            <Icone className="w-[18px] h-[18px]" />
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block font-display text-[15px] font-bold text-stone-900">{titulo}</span>
                            <span className="block mt-0.5 text-[12px] text-stone-500">{tempo}</span>
                            <span className={`block text-[12px] font-semibold ${valor === "Takeaway" ? "text-leaf" : "text-stone-500"}`}>{info}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {orderType === "Takeaway" && (
                    <div className="mt-2 rounded-xl bg-stone-50 px-3 py-2.5 flex items-start gap-2 text-[13px] leading-snug animate-fade-in">
                      <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-px" />
                      <p className="min-w-0 text-stone-600">
                        <span className="font-semibold text-stone-900">Retire em: </span>
                        {ENDERECO_LOJA} ·{" "}
                        <a href={MAPA_LOJA} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline-offset-2 hover:underline whitespace-nowrap">
                          Ver no mapa
                        </a>
                      </p>
                    </div>
                  )}
                </fieldset>

                {/* Nome e WhatsApp */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="ck-nome" className={rotuloCls}>
                      <User className="w-4 h-4 text-brand-600" /> Nome
                    </label>
                    <input
                      id="ck-nome"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        saveCustomerData({ name: e.target.value });
                      }}
                      className={campoCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ck-tel" className={rotuloCls}>
                      <Phone className="w-4 h-4 text-brand-600" /> WhatsApp
                    </label>
                    <input
                      id="ck-tel"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(41) 90000-0000"
                      value={telefone}
                      onChange={(e) => {
                        setTelefone(e.target.value);
                        saveCustomerData({ telefone: e.target.value });
                      }}
                      className={campoCls}
                    />
                  </div>
                </div>

                {/* Endereço e bairro */}
                {orderType === "Delivery" && (
                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="ck-end" className={rotuloCls}>
                        <MapPin className="w-4 h-4 text-brand-600" /> Endereço
                      </label>
                      <input
                        id="ck-end"
                        type="text"
                        autoComplete="street-address"
                        placeholder="Rua, número, complemento"
                        value={morada}
                        onChange={(e) => {
                          setMorada(e.target.value);
                          saveCustomerData({ morada: e.target.value });
                        }}
                        className={campoCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="ck-bairro" className={rotuloCls}>Bairro (São José dos Pinhais)</label>
                      <select
                        id="ck-bairro"
                        value={zona}
                        onChange={(e) => {
                          setZona(e.target.value);
                          saveCustomerData({ zona: e.target.value });
                        }}
                        className={`${campoCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2378716c%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_14px_center] pr-10`}
                      >
                        <option value="">Selecione o bairro</option>
                        {Object.keys(zonesFees).map((z) => (
                          <option key={z} value={z}>
                            {z} ({zonesFees[z] === 0 ? "entrega grátis" : `+ ${brl(zonesFees[z])}`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Pagamento */}
                <fieldset>
                  <legend className={rotuloCls}>Forma de pagamento</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {PAGAMENTOS.map((p) => (
                      <button
                        key={p.valor}
                        type="button"
                        onClick={() => {
                          setPagamento(p.valor as typeof pagamento);
                          saveCustomerData({ pagamento: p.valor });
                        }}
                        className={opcaoCls(pagamento === p.valor)}
                      >
                        {p.rotulo}
                      </button>
                    ))}
                  </div>

                  {pagamento === "PIX" && (
                    <p className="mt-2 text-[13px] text-brand-700 bg-brand-50 rounded-xl px-3 py-2">
                      O código PIX com o valor final aparece assim que você enviar o pedido.
                    </p>
                  )}

                  {(pagamento === "Cartão de Crédito" || pagamento === "Cartão de Débito") && (
                    <p className="mt-2 text-[13px] text-brand-700 bg-brand-50 rounded-xl px-3 py-2">
                      {orderType === "Delivery" ? "Levamos a maquininha até você." : "Pague com cartão na hora da retirada."}
                    </p>
                  )}

                  {pagamento === "Dinheiro" && (
                    <div className="mt-3">
                      <label htmlFor="ck-troco" className={rotuloCls}>Troco para quanto?</label>
                      <input
                        id="ck-troco"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Ex.: 50"
                        value={trocoPara}
                        onChange={(e) => setTrocoPara(e.target.value)}
                        className={`${campoCls} max-w-[180px]`}
                      />
                    </div>
                  )}
                </fieldset>

                {/* CPF na nota */}
                <div>
                  {!showNifInput && !nif ? (
                    <button
                      type="button"
                      onClick={() => setShowNifInput(true)}
                      className="h-8 text-[13px] text-stone-500 hover:text-brand-700 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Adicionar CPF na nota (opcional)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="CPF na nota"
                        placeholder="CPF na nota (opcional)"
                        value={nif}
                        onChange={(e) => {
                          setNif(e.target.value);
                          saveCustomerData({ nif: e.target.value });
                        }}
                        className={campoCls}
                      />
                      <button
                        type="button"
                        aria-label="Remover CPF"
                        onClick={() => {
                          setNif("");
                          setShowNifInput(false);
                          saveCustomerData({ nif: "" });
                        }}
                        className="w-12 h-12 shrink-0 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Cashback */}
                {cashbackConfig.enabled && (
                  <div className="space-y-2">
                    {customerCashbackBalance > 0 && (
                      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gold text-stone-900 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[14px] font-semibold text-stone-900 block">Cashback disponível</span>
                              <span className="text-[13px] text-amber-900 block tabular-nums">
                                Saldo: <strong>{brl(customerCashbackBalance)}</strong>
                              </span>
                              {cashbackVence && (
                                <span className="text-[12px] text-amber-800 block">
                                  {brl(cashbackVence.valor)} vence em {dataCurta(cashbackVence.data)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseCashback(!useCashback)}
                            aria-pressed={useCashback}
                            className={`h-10 px-3.5 rounded-xl text-[13px] font-semibold transition cursor-pointer shrink-0 ${
                              useCashback ? 'bg-stone-900 text-white' : 'bg-white text-stone-900 ring-1 ring-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            {useCashback ? 'Aplicado ✓' : 'Usar saldo'}
                          </button>
                        </div>
                      </div>
                    )}

                    {earnedCashback > 0 && (
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-amber-50/60 rounded-xl text-[13px] text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          Você ganha neste pedido ({cashbackConfig.percent}%)
                        </span>
                        <span className="font-bold tabular-nums">+ {brl(earnedCashback)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rodapé fixo da etapa 2 */}
              <div className="sticky bottom-0 bg-white border-t border-stone-100 px-5 pt-2.5 pb-4 lg:pb-5">
                {formError && (
                  <div role="alert" className="mb-2.5 bg-red-50 ring-1 ring-red-200 text-red-700 px-3 py-2.5 rounded-xl text-[13px] font-medium whitespace-pre-line flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{formError}</div>
                  </div>
                )}

                <p className="text-[12px] text-stone-500 leading-snug tabular-nums">
                  Subtotal {brl(subtotal)} ·{" "}
                  {orderType !== "Delivery" ? (
                    <span className="text-leaf font-semibold">retirada sem taxa</span>
                  ) : !zona ? (
                    <span>entrega: escolha o bairro</span>
                  ) : deliveryFee === 0 ? (
                    <span className="text-leaf font-semibold">entrega grátis</span>
                  ) : (
                    <span>entrega {brl(deliveryFee)}</span>
                  )}
                  {cashbackDiscount > 0 && (
                    <span className="text-leaf font-semibold"> · cashback − {brl(cashbackDiscount)}</span>
                  )}
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="shrink-0">
                    <span className="block text-[12px] font-medium text-stone-500 leading-none">Total</span>
                    <span className="block mt-1 font-display text-[22px] font-extrabold text-stone-900 tabular-nums leading-none">{brl(total)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isSubmitting || !businessStatus.isOpen}
                    className={`flex-1 min-w-0 h-[52px] px-3 rounded-2xl font-bold text-[16px] transition flex justify-center items-center gap-2 cursor-pointer ${
                      isSubmitting || !businessStatus.isOpen
                        ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                        : 'bg-brand-700 hover:bg-brand-800 active:scale-[0.99] text-white shadow-[0_8px_20px_rgba(77,4,113,0.25)]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Finalizando...</span>
                      </>
                    ) : !businessStatus.isOpen ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Loja fechada</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-brand-200" />
                        <span>Finalizar Pedido</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: coluna fixa ao lado do cardápio */}
      <div className="hidden lg:block sticky top-[76px] w-full">
        <div className="bg-white rounded-3xl ring-1 ring-stone-200/80 shadow-[0_10px_30px_rgba(38,1,58,0.06)] max-h-[calc(100vh-92px)] overflow-y-auto overscroll-contain custom-scrollbar">
          {CartContent}
        </div>
      </div>

      {/* Celular: folha de baixo */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[55] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Sacola">
          <div className="absolute inset-0 bg-stone-950/55 animate-fade-in" onClick={onClose} />
          <div className="relative bg-white w-full max-h-[94dvh] rounded-t-[28px] overflow-y-auto overscroll-contain shadow-2xl pb-[env(safe-area-inset-bottom)] animate-sheet-in">
            <span className="block mx-auto mt-2 w-10 h-1 rounded-full bg-stone-200" aria-hidden="true" />
            {CartContent}
          </div>
        </div>
      )}
    </>
  );
}
