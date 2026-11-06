import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, Printer, BarChart3, ArrowDownCircle, ArrowUpCircle, AlertCircle, Search, ShoppingBag, Banknote, Smartphone, Wallet, CreditCard, Trash2 } from 'lucide-react';
import CashSessionDetailsModal from './reports/CashSessionDetailsModal';
import { normalizePaymentMethod, normalizeOrderType, isOrderActive, paymentParts } from '../utils/paymentAndOrderHelper';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';
import { brl } from '../utils/formatacao';
import { Paginacao, useLinhasQueCabem, usePaginacao } from './admin/ui';

interface CaixaManagerProps {
  refreshSignal?: number;
}

export default function CaixaManager({ refreshSignal }: CaixaManagerProps = {}) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('0.00');
  const [isOpening, setIsOpening] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  const [summary, setSummary] = useState({ numerario: 0, mbway: 0, cartao: 0, outros: 0, total: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<PeriodFilterOption>('todos');
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  // Histórico: só as linhas que cabem na tela; o resto vai para as próximas páginas
  const historicoRef = useRef<HTMLDivElement>(null);
  const linhasHistorico = useLinhasQueCabem(historicoRef, 45, { reserva: 112, min: 3, deps: [history.length] });
  const paginaHistorico = usePaginacao(history, linhasHistorico, [historyPeriod, historyStart, historyEnd]);
  const [closedResult, setClosedResult] = useState<any>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any>(null);

  // Estados de Movimentações
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState('');

  const totalSangrias = movements.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0);
  const totalSuprimentos = movements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0);
  const currentExpected = session ? Number(session.opening_amount) + summary.numerario + totalSuprimentos - totalSangrias : 0;

  // Dismiss on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMovementModal) setShowMovementModal(false);
        else if (showCloseModal) setShowCloseModal(false);
        else if (showOpenModal) setShowOpenModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMovementModal, showCloseModal, showOpenModal]);

  const loadSession = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data || null);
    setLoading(false);
  };

  const loadHistory = async () => {
    let query = supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'fechado')
      .order('closed_at', { ascending: false });

    const now = new Date();
    if (historyPeriod === 'hoje') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'ontem') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      query = query.gte('closed_at', s.toISOString()).lte('closed_at', e.toISOString());
    } else if (historyPeriod === '7dias') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      s.setHours(0, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === '30dias') {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      s.setHours(0, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'mes') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'customizado' && historyStart && historyEnd) {
      query = query.gte('closed_at', historyStart + 'T00:00:00').lte('closed_at', historyEnd + 'T23:59:59.999');
    } else {
      query = query.limit(20);
    }

    const { data: sessionsData } = await query;
      
    if (!sessionsData) {
      setHistory([]);
      return;
    }

    const enrichedHistory = await Promise.all(sessionsData.map(async (session) => {
      let total_suprimentos = 0;
      let total_sangrias = 0;

      // Buscar movimentações
      try {
        const { data: movs } = await supabase
          .from('cash_movements')
          .select('type, amount')
          .eq('session_id', session.id);
        
        let movementsList = movs || [];
        if (!movs || movs.length === 0) {
          const { data: settingRow } = await supabase
            .from('settings')
            .select('value')
            .eq('key', `cash_movements_${session.id}`)
            .maybeSingle();
          if (settingRow?.value) {
            try { movementsList = JSON.parse(settingRow.value); } catch(e) {}
          }
        }

        movementsList.forEach((m: any) => {
          if (m.type === 'suprimento') total_suprimentos += Number(m.amount);
          if (m.type === 'sangria') total_sangrias += Number(m.amount);
        });
      } catch (e) {}

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString());
        
      let total_faturado = 0;
      (orders || []).forEach(o => {
        if (isOrderActive(o)) {
          total_faturado += Number(o.total_amount || 0);
        }
      });

      return {
        ...session,
        total_suprimentos,
        total_sangrias,
        total_faturado
      };
    }));

    setHistory(enrichedHistory);
  };

  useEffect(() => {
    loadSession();
    loadHistory();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [historyPeriod, historyStart, historyEnd]);

  const loadMovements = useCallback(async () => {
    if (!session?.id) return;
    let movList: any[] = [];
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        movList = data;
      } else {
        // Fallback resiliente caso a tabela ainda não exista no schema cache de produção
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `cash_movements_${session.id}`)
          .maybeSingle();
        if (settingRow?.value) {
          try {
            movList = JSON.parse(settingRow.value);
          } catch(e) {}
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar movimentações:", e);
    }
    setMovements(movList);
  }, [session?.id]);

  const loadSummary = useCallback(async () => {
    if (!session?.opened_at) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_method, total_amount, status')
        .gte('created_at', session.opened_at);

      if (error) throw error;

      let numerario = 0;
      let mbway = 0;
      let cartao = 0;
      let outros = 0;
      let validCount = 0;

      (data || []).forEach((o: any) => {
        if (!isOrderActive(o)) return; // Exclui pedidos cancelados
        const amt = Number(o.total_amount || 0);
        validCount++;
        // Pagamento dividido soma cada parte na sua forma
        paymentParts(o.payment_method, amt).forEach(part => {
          const norm = normalizePaymentMethod(part.method);
          if (norm === 'Dinheiro') numerario += part.amount;
          else if (norm === 'PIX') mbway += part.amount;
          else if (norm === 'Cartão') cartao += part.amount;
          else outros += part.amount;
        });
      });

      setSummary({
        numerario,
        mbway,
        cartao,
        outros,
        total: numerario + mbway + cartao + outros,
        count: validCount
      });
    } catch (err) {
      console.error("Erro ao carregar resumo de vendas do caixa:", err);
    }
  }, [session?.opened_at]);

  useEffect(() => {
    loadSummary();
    loadMovements();
  }, [session, refreshSignal, loadSummary, loadMovements]);

  // Realtime listener para atualização imediata das vendas e movimentações
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`caixa-live-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadSummary();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, () => {
        loadMovements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload: any) => {
        if (payload?.new?.key === `cash_movements_${session.id}`) {
          loadMovements();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, loadSummary, loadMovements]);

  const handleOpen = async () => {
    setIsOpening(true);
    try {
      const amount = parseFloat(openingAmount) || 0;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('cash_sessions').insert([{
        opening_amount: amount,
        opened_by: userData.user?.id,
        status: 'aberto'
      }]).select().single();
      if (!error && data) {
        // Ao abrir o caixa, também abre a loja automaticamente
        try {
          await supabase.from('settings').upsert([
            { key: 'store_status', value: 'open', updated_at: new Date().toISOString() },
            { key: 'manual_store_closed', value: false, updated_at: new Date().toISOString() },
            { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
          ], { onConflict: 'key' });
        } catch (e) {
          console.error("Erro ao atualizar status da loja:", e);
        }
        setSession(data);
        setOpeningAmount('0.00');
        setClosedResult(null);
        setShowOpenModal(false);
      } else if (error) {
        console.error("Erro ao abrir caixa:", error);
        alert("Erro ao abrir caixa: " + error.message);
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('TEM CERTEZA QUE DESEJA EXCLUIR ESTE FECHAMENTO DE CAIXA? Esta ação é irreversível e removerá todas as movimentações associadas a ele.')) {
      try {
        const { error } = await supabase.from('cash_sessions').delete().eq('id', id);
        if (error) throw error;
        setHistory(prev => prev.filter(h => h.id !== id));
      } catch (error: any) {
        console.error('Erro ao excluir sessão:', error);
        alert('Erro ao excluir fechamento: ' + error.message);
      }
    }
  };

  const handleRegisterMovement = async () => {
    setMovementError('');
    const amount = parseFloat(movementAmount);
    if (!amount || amount <= 0) {
      setMovementError('O valor deve ser maior que zero.');
      return;
    }
    
    setIsSubmittingMovement(true);
    const { data: userData } = await supabase.auth.getUser();
    const newMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      session_id: session.id,
      type: movementType,
      amount: amount,
      reason: movementReason || null,
      created_by: userData.user?.id || null,
      created_at: new Date().toISOString()
    };

    let registeredOk = false;

    try {
      const { error } = await supabase.from('cash_movements').insert([newMovement]);
      if (!error) {
        registeredOk = true;
      } else {
        console.warn("Fallback de registro de movimentação ativado (settings):", error.message);
        // Fallback resiliente e seguro na tabela settings para não bloquear o operador
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `cash_movements_${session.id}`)
          .maybeSingle();

        let currentList: any[] = [];
        try {
          if (settingRow?.value) currentList = JSON.parse(settingRow.value);
        } catch(e) {}
        currentList.unshift(newMovement);

        const { error: setErr } = await supabase.from('settings').upsert({
          key: `cash_movements_${session.id}`,
          value: JSON.stringify(currentList),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (!setErr) {
          registeredOk = true;
        } else {
          throw setErr;
        }
      }
    } catch (err: any) {
      setMovementError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setIsSubmittingMovement(false);
    }

    if (registeredOk) {
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementReason('');
      await loadMovements();
    }
  };

  const handleClose = async () => {
    const counted = parseFloat(closingAmount) || 0;
    const expected = currentExpected;
    const difference = counted - expected;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('cash_sessions').update({
      status: 'fechado',
      closed_at: new Date().toISOString(),
      closed_by: userData.user?.id,
      closing_counted_amount: counted,
      expected_amount: expected,
      difference: difference
    }).eq('id', session.id);

    // Automagicamente fechar a loja
    await supabase.from('settings').upsert([
      { key: 'store_status', value: 'closed', updated_at: new Date().toISOString() },
      { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: true, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });

    if (!error) {
      // Buscar dados detalhados para o relatório impresso/visual
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', session.opened_at);

      const itemsSummary: Record<string, { qty: number; total: number }> = {};
      const paySummary: Record<string, number> = {};
      let totalVendas = 0;
      let entregaCount = 0;
      let retiradaCount = 0;
      let validOrdersCount = 0;

      (orders || []).forEach((o: any) => {
        if (!isOrderActive(o)) return; // Exclui cancelados
        validOrdersCount++;
        const amt = Number(o.total_amount || 0);
        totalVendas += amt;
        paymentParts(o.payment_method, amt).forEach(part => {
          const pm = normalizePaymentMethod(part.method);
          paySummary[pm] = (paySummary[pm] || 0) + part.amount;
        });

        const oType = normalizeOrderType(o.order_type);
        if (oType === 'retirada' || oType === 'balcao') {
          retiradaCount++;
        } else {
          entregaCount++;
        }

        let rawItems = o.items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        if (Array.isArray(rawItems)) {
          rawItems.forEach((it: any) => {
            const name = it.name || 'Item';
            const qty = Number(it.quantity || 1);
            const price = Number(it.priceCalculated || it.price || 0) * qty;
            if (!itemsSummary[name]) itemsSummary[name] = { qty: 0, total: 0 };
            itemsSummary[name].qty += qty;
            itemsSummary[name].total += price;
          });
        }
      });

      const reportData = {
        openedAt: session.opened_at,
        closedAt: new Date().toISOString(),
        openingAmount: session.opening_amount,
        expected,
        counted,
        difference,
        ordersCount: (orders || []).length,
        totalVendas,
        paySummary,
        itemsSummary,
        entregaCount,
        retiradaCount,
        totalSangrias,
        totalSuprimentos
      };

      setClosedResult(reportData);
      setSession(null);
      setClosingAmount('');
      setShowCloseModal(false);
      loadHistory();
    }
  };

  const handlePrintReport = (report: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsRows = Object.entries(report.itemsSummary || {})
      .map(([name, val]: any) => `<tr><td style="padding:2px 0;">${val.qty}x ${name}</td><td style="text-align:right;padding:2px 0;">R$ ${val.total.toFixed(2)}</td></tr>`)
      .join('');

    const payRows = Object.entries(report.paySummary || {})
      .map(([pm, val]: any) => `<div style="display:flex;justify-between:space-between;margin-bottom:2px;"><span>${pm}:</span><span>R$ ${val.toFixed(2)}</span></div>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Fechamento de Caixa</title>
          <style>
            :root { --print-text: #0f172a; --print-success: #047857; --print-danger: #be123c; }
            body { font-family: monospace; font-size: 13px; width: 280px; margin: 0 auto; padding: 10px; color: var(--print-text); }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
            p { margin: 2px 0; }
            .line { border-bottom: 1px dashed var(--print-text); margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>MAIS AÇAÍ</h2>
          <p style="text-align:center;font-weight:bold;">RELATÓRIO DE FECHAMENTO DE CAIXA</p>
          <div class="line"></div>
          <p><b>Abertura:</b> ${new Date(report.openedAt).toLocaleString('pt-BR')}</p>
          <p><b>Fechamento:</b> ${new Date(report.closedAt).toLocaleString('pt-BR')}</p>
          <div class="line"></div>
          
          <div class="row"><span>Fundo Inicial:</span><span class="bold">R$ ${Number(report.openingAmount).toFixed(2)}</span></div>
          <div class="row"><span>Total Pedidos:</span><span class="bold">${report.ordersCount} (${report.entregaCount} Entregas / ${report.retiradaCount} Retiradas)</span></div>
          <div class="row"><span>Total Vendas:</span><span class="bold">R$ ${Number(report.totalVendas).toFixed(2)}</span></div>
          ${report.totalSuprimentos > 0 ? `<div class="row"><span>Suprimentos (+):</span><span class="bold" style="color:var(--print-success);">R$ ${Number(report.totalSuprimentos).toFixed(2)}</span></div>` : ''}
          ${report.totalSangrias > 0 ? `<div class="row"><span>Sangrias (-):</span><span class="bold" style="color:var(--print-danger);">R$ ${Number(report.totalSangrias).toFixed(2)}</span></div>` : ''}
          
          <div class="line"></div>
          <p class="bold">FORMAS DE PAGAMENTO:</p>
          ${payRows}
          
          <div class="line"></div>
          <div class="row"><span>Esperado em Dinheiro:</span><span class="bold">R$ ${Number(report.expected).toFixed(2)}</span></div>
          <div class="row"><span>Informado no Caixa:</span><span class="bold">R$ ${Number(report.counted).toFixed(2)}</span></div>
          <div class="row"><span>Diferença:</span><span class="bold">${Number(report.difference) >= 0 ? '+' : ''} R$ ${Number(report.difference).toFixed(2)}</span></div>
          

          
          <div class="line"></div>
          <p style="text-align:center;margin-top:15px;">--- FIM DO RELATÓRIO ---</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-mono text-xs">Carregando dados do caixa...</div>;

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Barra Operacional Superior Compacta (Status e Ações Rápidas) */}
      {!session ? (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04)] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-[18px] font-bold text-stone-900 leading-tight">Caixa fechado</h3>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">Sem turno aberto</span>
                </div>
                <p className="text-[14px] text-stone-500 mt-1">Informe o fundo de troco inicial para abrir o turno e começar a vender.</p>
              </div>
            </div>

            <button
              onClick={() => setShowOpenModal(true)}
              className="h-11 px-5 rounded-xl bg-[#6a2092] hover:bg-[#521872] active:scale-[0.98] text-white font-semibold text-[14px] transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 shadow-[0_6px_16px_rgba(106,32,146,0.25)]"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir caixa</span>
            </button>
          </div>

          {closedResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <h4 className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  Resumo do Último Fechamento
                </h4>
                <button
                  onClick={() => handlePrintReport(closedResult)}
                  className="px-2.5 py-1 bg-[#6a2092] hover:bg-[#521872] text-white rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Talão
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wide block">Fundo Inicial</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-slate-900 mt-0.5 block">{brl(Number(Number(closedResult.openingAmount || 0)))}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase tracking-wider block">Esperado</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-slate-900 mt-0.5 block">{brl(Number(Number(closedResult.expected)))}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase tracking-wider block">Informado</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-slate-900 mt-0.5 block">{brl(Number(Number(closedResult.counted)))}</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${closedResult.difference >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider block ${closedResult.difference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Diferença</span>
                  <span className={`font-bold font-mono tabular-nums text-sm mt-0.5 block ${closedResult.difference >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {closedResult.difference >= 0 ? '+' : ''} {brl(Number(Number(closedResult.difference)))}
                  </span>
                </div>
              </div>

              {closedResult.paySummary && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase tracking-wider block">Discriminação por Pagamento</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(closedResult.paySummary).map(([pm, val]: any) => (
                      <div key={pm} className="bg-slate-50 p-2 rounded border border-slate-200/80">
                        <span className="text-slate-500 font-mono block text-[10px]">{pm}</span>
                        <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block">{brl(Number(val))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Barra Operacional Sessão em Andamento */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04)] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-[18px] font-bold text-stone-900 leading-tight">Caixa aberto</h3>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Turno em andamento
                  </span>
                </div>
                <p className="text-[14px] text-stone-500 mt-1">
                  Aberto às <span className="text-stone-900 font-semibold">{new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> · Fundo inicial: <span className="text-stone-900 font-semibold">{brl(Number(Number(session.opening_amount)))}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto self-end md:self-auto">
              <button
                onClick={() => {
                  setMovementType('sangria');
                  setShowMovementModal(true);
                }}
                className="h-11 px-4 rounded-xl bg-white ring-1 ring-stone-200 hover:ring-rose-300 hover:bg-rose-50 text-stone-800 font-semibold text-[14px] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                Sangria
              </button>
              <button
                onClick={() => {
                  setMovementType('suprimento');
                  setShowMovementModal(true);
                }}
                className="h-11 px-4 rounded-xl bg-white ring-1 ring-stone-200 hover:ring-emerald-300 hover:bg-emerald-50 text-stone-800 font-semibold text-[14px] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                Suprimento
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                className="h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[14px] transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ml-auto md:ml-0"
              >
                <Lock className="w-4 h-4" />
                Fechar caixa
              </button>
            </div>
          </div>

          {/* 2. Indicadores Financeiros em Primeiro Plano (5 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wide">Pedidos</span>
                <div className="w-5 h-5 rounded-md bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                  <ShoppingBag size={11} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 tracking-tight mt-0.5">{summary.count}</p>
            </div>

            <div className="bg-white border border-slate-200/90 p-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Dinheiro</span>
                <div className="w-5 h-5 rounded-md bg-emerald-50/50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Banknote size={11} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-0.5">{brl(Number(summary.numerario))}</p>
            </div>

            <div className="bg-white border border-slate-200/90 p-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">PIX</span>
                <div className="w-5 h-5 rounded-md bg-blue-50/50 text-blue-500 flex items-center justify-center shrink-0">
                  <Smartphone size={11} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-0.5">{brl(Number(summary.mbway))}</p>
            </div>

            <div className="bg-white border border-slate-200/90 p-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Cartão</span>
                <div className="w-5 h-5 rounded-md bg-purple-50/50 text-purple-500 flex items-center justify-center shrink-0">
                  <CreditCard size={11} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-0.5">{brl(Number(summary.cartao))}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xs text-white flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-medium uppercase tracking-wide text-[#e9d5f7]/80">
                  Gaveta (Esperado)
                </span>
                <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 text-[#e9d5f7] flex items-center justify-center shrink-0">
                  <Wallet size={11} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums text-[#e9d5f7] tracking-tight mt-0.5">
                {brl(Number(currentExpected))}
              </p>
            </div>
          </div>

          {/* 3. Movimentações Registradas no Turno */}
          {movements.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-semibold text-xs text-slate-600 uppercase font-mono tracking-wide">Movimentações no Turno</h4>
                <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                {movements.map((mov) => (
                  <div key={mov.id} className="p-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border shrink-0 ${mov.type === 'sangria' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {mov.type}
                      </span>
                      <div className="text-xs">
                        <span className="font-mono text-slate-500">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {mov.reason && (
                          <span className="text-slate-800 font-medium ml-2 text-[11px]">
                            — {mov.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`font-mono font-bold tabular-nums text-xs sm:text-right ${mov.type === 'sangria' ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {mov.type === 'sangria' ? '-' : '+'} {brl(Number(Number(mov.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-[15px] text-stone-900">Fechamentos anteriores</h3>
            <span className="text-[13px] text-stone-500">turnos arquivados e balanço de cada dia</span>
          </div>
          <PeriodFilterCompact
            value={historyPeriod}
            startDate={historyStart}
            endDate={historyEnd}
            onChange={(res) => {
              setHistoryPeriod(res.period);
              if (res.startDate !== undefined) setHistoryStart(res.startDate);
              if (res.endDate !== undefined) setHistoryEnd(res.endDate);
            }}
          />
        </div>
        <div ref={historicoRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 text-[11px] uppercase tracking-wider text-stone-400 font-semibold bg-stone-50/60">
                <th className="h-9 pl-4 pr-3 font-semibold">Dia</th>
                <th className="h-9 px-3 font-semibold text-right">Fundo inicial</th>
                <th className="h-9 px-3 font-semibold text-right">Suprimento</th>
                <th className="h-9 px-3 font-semibold text-right">Sangria</th>
                <th className="h-9 px-3 font-semibold text-right">Faturado</th>
                <th className="h-9 pl-3 pr-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[13px] divide-y divide-stone-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                paginaHistorico.itens.map((h) => {
                  const sup = Number(h.total_suprimentos || 0);
                  const sang = Number(h.total_sangrias || 0);
                  const dia = h.opened_at ? new Date(h.opened_at) : null;
                  return (
                    <tr key={h.id} className="h-11 hover:bg-brand-50/40 transition-colors">
                      <td className="pl-4 pr-3 tabular-nums whitespace-nowrap">
                        {dia ? (
                          <>
                            <span className="font-semibold text-stone-800">{dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <span className="text-stone-400 ml-1.5">{dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 text-right tabular-nums whitespace-nowrap text-stone-600">{brl(Number(h.opening_amount || 0))}</td>
                      <td className={`px-3 text-right tabular-nums whitespace-nowrap ${sup > 0 ? 'text-emerald-700 font-semibold' : 'text-stone-300'}`}>{sup > 0 ? `+ ${brl(sup)}` : '—'}</td>
                      <td className={`px-3 text-right tabular-nums whitespace-nowrap ${sang > 0 ? 'text-rose-600 font-semibold' : 'text-stone-300'}`}>{sang > 0 ? `− ${brl(sang)}` : '—'}</td>
                      <td className="px-3 text-right tabular-nums whitespace-nowrap font-bold text-stone-900 text-[14px]">{brl(Number(h.total_faturado || 0))}</td>
                      <td className="pl-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedSessionForDetails(h)}
                            className="h-8 px-2.5 rounded-lg text-[13px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            title="Ver detalhes do fechamento"
                          >
                            <Search className="w-4 h-4" /> Detalhes
                          </button>
                          <button
                            onClick={() => handleDeleteSession(h.id)}
                            className="w-8 h-8 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Excluir fechamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={paginaHistorico.pagina}
          totalPaginas={paginaHistorico.totalPaginas}
          inicio={paginaHistorico.inicio}
          mostrando={paginaHistorico.itens.length}
          total={history.length}
          onIr={paginaHistorico.irPara}
          rotulo={history.length === 1 ? 'fechamento' : 'fechamentos'}
        />
      </div>

      {/* Modal de Fechamento de Caixa */}
      {showCloseModal && session && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowCloseModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Fechamento e Conferência de Caixa
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Validação física da gaveta de dinheiro</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Fundo Inicial de Abertura</span>
                  <span className="font-bold text-slate-900">{brl(Number(Number(session.opening_amount)))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>(+) Vendas em Dinheiro</span>
                  <span className="font-bold text-slate-900">+ {brl(Number(summary.numerario))}</span>
                </div>
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Suprimentos de Caixa</span>
                    <span className="font-bold">+ {brl(Number(totalSuprimentos))}</span>
                  </div>
                )}
                {totalSangrias > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Sangrias Realizadas</span>
                    <span className="font-bold">- {brl(Number(totalSangrias))}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>(=) Esperado em Dinheiro</span>
                  <span className="text-base">{brl(Number(currentExpected))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="closingAmountInput" className="block text-[11px] font-bold font-mono text-slate-600 uppercase tracking-wider">
                  Valor Contado Fisicamente (R$)
                </label>
                <div className="relative">
                  <input
                    id="closingAmountInput"
                    type="number"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-3xl font-mono font-bold py-3 bg-white border-2 border-slate-300 rounded-lg focus:border-[#6a2092] focus:ring-1 focus:ring-[#6a2092]/20 focus:outline-none transition-colors tracking-tight text-slate-900"
                    autoFocus
                  />
                </div>
              </div>

              {closingAmount !== '' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center font-mono">
                  <span className="text-xs text-slate-600 font-semibold">Diferença de Caixa:</span>
                  <span className={`text-base font-bold tabular-nums ${(Number(closingAmount) - currentExpected) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(Number(closingAmount) - currentExpected) >= 0 ? '+' : ''}
                    {brl(Number((Number(closingAmount) - currentExpected)))}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={closingAmount === ''}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovementModal && session && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowMovementModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 tracking-tight">
                  {movementType === 'sangria' ? (
                    <ArrowDownCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  {movementType === 'sangria' ? 'Registrar Sangria (Retirada)' : 'Registrar Suprimento (Entrada)'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {movementType === 'sangria' ? 'Saída de dinheiro físico da gaveta' : 'Reforço de dinheiro físico na gaveta'}
                </p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {movementError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex gap-2 text-xs font-mono text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{movementError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="movementAmountInput" className="block text-[11px] font-bold font-mono text-slate-600 uppercase tracking-wider">
                  Valor da Movimentação (R$) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold text-base">R$</span>
                  <input
                    id="movementAmountInput"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-mono font-bold pl-8 pr-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-[#6a2092] focus:ring-1 focus:ring-[#6a2092]/20 focus:outline-none transition-colors tracking-tight text-slate-900 placeholder-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="movementReasonInput" className="block text-[11px] font-bold font-mono text-slate-600 uppercase tracking-wider">
                  Motivo / Justificativa (Opcional)
                </label>
                <input
                  id="movementReasonInput"
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Pagamento fornecedor hortifrúti' : 'Ex: Troco inicial extra'}
                  className="w-full text-xs font-sans py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:border-[#6a2092] focus:ring-1 focus:ring-[#6a2092]/20 focus:outline-none transition-colors placeholder-slate-400"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setMovementError('');
                }}
                disabled={isSubmittingMovement}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={movementAmount === '' || parseFloat(movementAmount) <= 0 || isSubmittingMovement}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer ${movementType === 'sangria' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
              >
                {isSubmittingMovement ? 'Gravando...' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSessionForDetails && (
        <CashSessionDetailsModal 
          session={selectedSessionForDetails} 
          onClose={() => setSelectedSessionForDetails(null)} 
        />
      )}

      {/* Modal de Abertura de Caixa */}
      {showOpenModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowOpenModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Unlock className="w-4 h-4 text-[#e9d5f7]" />
                  Abertura de Caixa
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Informe o valor em dinheiro na gaveta</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="openingAmountInput" className="block text-[11px] font-bold font-mono text-slate-600 uppercase tracking-wider">
                  Fundo de Troco (R$)
                </label>
                <div className="relative">
                  <input
                    id="openingAmountInput"
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-3xl font-mono font-bold py-3 bg-white border-2 border-slate-300 rounded-lg focus:border-[#6a2092] focus:ring-1 focus:ring-[#6a2092]/20 focus:outline-none transition-colors tracking-tight text-slate-900"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5">
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpen}
                disabled={isOpening || (openingAmount !== '' && parseFloat(openingAmount) < 0)}
                className="flex-1 px-4 py-2.5 bg-[#6a2092] hover:bg-[#f3ce37] text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs font-mono tracking-wide border border-[#6a2092]/30"
              >
                {isOpening ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Abrindo...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
