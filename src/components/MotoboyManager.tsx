import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bike, Plus, Trash2, Edit2, Phone, DollarSign, 
  Calendar, CheckCircle2, Clock, AlertTriangle, 
  Copy, Check, Send, ChevronRight, RefreshCw, X,
  UserCheck, UserX, ArrowRightLeft, MapPin, Receipt
} from 'lucide-react';
import { brl } from '../utils/formatacao';

export interface Motoboy {
  id: string;
  name: string;
  phone: string;
  pix_key?: string;
  default_fee: number;
  active: boolean;
  created_at?: string;
}

interface OrderDelivery {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_zone: string;
  payment_method: string;
  total_amount: number;
  change_for?: string;
  motoboy_id?: string;
  motoboy_name?: string;
  motoboy_fee?: number;
  created_at: string;
  status: string;
}

export default function MotoboyManager() {
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'acerto' | 'cadastro'>('acerto');
  
  // Modal de cadastro
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPix, setFormPix] = useState('');
  const [formFee, setFormFee] = useState('6.00');
  const [saving, setSaving] = useState(false);

  // Filtros de acerto
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMotoboyId, setSelectedMotoboyId] = useState<string>('todos');
  const [orders, setOrders] = useState<OrderDelivery[]>([]);
  const [copiedText, setCopiedText] = useState(false);

  // Carregar motoboys
  const fetchMotoboys = async () => {
    try {
      const { data, error } = await supabase
        .from('motoboys')
        .select('*')
        .order('name');
      if (!error && data) {
        setMotoboys(data);
      }
    } catch (e) {
      console.error('Erro ao buscar motoboys:', e);
    } finally {
      setLoading(false);
    }
  };

  // Carregar pedidos do dia selecionado
  const fetchOrders = async () => {
    try {
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, delivery_address, delivery_zone, payment_method, total_amount, change_for, motoboy_id, motoboy_name, motoboy_fee, created_at, status')
        .ilike('order_type', '%deliver%')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
    } catch (e) {
      console.error('Erro ao buscar pedidos para acerto:', e);
    }
  };

  useEffect(() => {
    fetchMotoboys();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  // Salvar/Editar Motoboy
  const handleSaveMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.replace(/\D/g, ''),
        pix_key: formPix.trim() || null,
        default_fee: parseFloat(formFee.replace(',', '.')) || 6.00,
        active: true
      };

      if (editingId) {
        await supabase.from('motoboys').update(payload).eq('id', editingId);
      } else {
        await supabase.from('motoboys').insert([payload]);
      }

      setShowModal(false);
      setEditingId(null);
      setFormName('');
      setFormPhone('');
      setFormPix('');
      setFormFee('6.00');
      await fetchMotoboys();
    } catch (e) {
      console.error('Erro ao salvar motoboy:', e);
    } finally {
      setSaving(false);
    }
  };

  // Alternar ativo/inativo
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('motoboys').update({ active: !currentStatus }).eq('id', id);
      setMotoboys(prev => prev.map(m => m.id === id ? { ...m, active: !currentStatus } : m));
    } catch (e) {
      console.error('Erro ao alternar status do motoboy:', e);
    }
  };

  // Deletar motoboy
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o entregador ${name}?`)) return;
    try {
      await supabase.from('motoboys').delete().eq('id', id);
      setMotoboys(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Erro ao remover motoboy:', e);
    }
  };

  const openEdit = (m: Motoboy) => {
    setEditingId(m.id);
    setFormName(m.name);
    setFormPhone(m.phone);
    setFormPix(m.pix_key || '');
    setFormFee(String(m.default_fee || 6.00));
    setShowModal(true);
  };

  // Pedidos filtrados para o acerto
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedMotoboyId === 'todos') return true;
      if (selectedMotoboyId === 'sem_motoboy') return !o.motoboy_id;
      return o.motoboy_id === selectedMotoboyId;
    });
  }, [orders, selectedMotoboyId]);

  // Cálculos de acerto
  const settlementStats = useMemo(() => {
    const entregasValidas = filteredOrders.filter(o => o.status !== 'Cancelado');
    const totalEntregas = entregasValidas.length;
    
    // Total de taxas a pagar ao motoboy
    const totalTaxas = entregasValidas.reduce((acc, o) => {
      const fee = Number(o.motoboy_fee || 6.00);
      return acc + fee;
    }, 0);

    // Total em dinheiro recebido pelo motoboy de clientes
    const totalDinheiro = entregasValidas.reduce((acc, o) => {
      const isDinheiro = String(o.payment_method || '').toLowerCase().includes('dinheiro') || String(o.payment_method || '').toLowerCase().includes('cash');
      return acc + (isDinheiro ? Number(o.total_amount || 0) : 0);
    }, 0);

    // Saldo:
    // Se dinheiro > taxas: motoboy deve devolver a diferença para a loja
    // Se taxas > dinheiro: loja deve pagar a diferença para o motoboy
    const saldo = totalDinheiro - totalTaxas;

    return {
      totalEntregas,
      totalTaxas,
      totalDinheiro,
      saldo,
      deveDevolverLoja: saldo > 0,
      lojaDevePagar: saldo < 0,
      valorDiferenca: Math.abs(saldo)
    };
  }, [filteredOrders]);

  // Gerar texto do comprovante para WhatsApp
  const generateSettlementText = () => {
    const motoboy = motoboys.find(m => m.id === selectedMotoboyId);
    const nomeMotoboy = motoboy ? motoboy.name : 'Todos os Entregadores';
    const dataFmt = selectedDate.split('-').reverse().join('/');

    let txt = `🛵 *ACERTO DE ENTREGAS — MAIS AÇAÍ SJP*\n`;
    txt += `👤 Entregador: *${nomeMotoboy}*\n`;
    txt += `📅 Data: *${dataFmt}*\n`;
    txt += `-----------------------------------------\n`;
    txt += `📦 Total de Corridas: *${settlementStats.totalEntregas} entregas*\n`;
    txt += `💰 Total de Taxas a Receber: *${brl(settlementStats.totalTaxas)}*\n`;
    txt += `💵 Total Recebido em Dinheiro: *${brl(settlementStats.totalDinheiro)}*\n`;
    txt += `-----------------------------------------\n`;

    if (settlementStats.deveDevolverLoja) {
      txt += `⚠️ *SALDO DO ACERTO:*\n`;
      txt += `👉 *Repasse para a Loja: ${brl(settlementStats.valorDiferenca)}*\n`;
      txt += `(Recebido em Dinheiro: ${brl(settlementStats.totalDinheiro)} - Suas Taxas: ${brl(settlementStats.totalTaxas)})\n`;
      txt += `\nChave PIX da Loja: 41997349076 (Michele Alvarez)`;
    } else if (settlementStats.lojaDevePagar) {
      txt += `✅ *SALDO DO ACERTO:*\n`;
      txt += `👉 *Loja paga para você: ${brl(settlementStats.valorDiferenca)}*\n`;
      if (motoboy?.pix_key) {
        txt += `Sua chave PIX: ${motoboy.pix_key}\n`;
      }
    } else {
      txt += `✅ *SALDO DO ACERTO: ZERADO*\n(Taxas igualaram exatamente o dinheiro recebido)\n`;
    }

    txt += `\nObrigado pelo trabalho de hoje! 🚀`;
    return txt;
  };

  const copyToClipboard = () => {
    const txt = generateSettlementText();
    navigator.clipboard.writeText(txt);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const sendToWhatsApp = () => {
    const motoboy = motoboys.find(m => m.id === selectedMotoboyId);
    if (!motoboy || !motoboy.phone) {
      alert('Selecione um entregador específico com telefone cadastrado para enviar direto!');
      return;
    }
    const txt = generateSettlementText();
    const phone = motoboy.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#4d0471]/10 flex items-center justify-center text-[#4d0471]">
              <Bike size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900 tracking-tight">Logística & Entregadores Sob Demanda</h1>
              <p className="text-xs font-semibold text-stone-500">Gestão de motoboys parceiros, taxas e fechamento diário de caixa</p>
            </div>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('acerto')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'acerto'
                ? 'bg-[#4d0471] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            📊 Acerto de Caixa
          </button>
          <button
            onClick={() => setActiveSubTab('cadastro')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'cadastro'
                ? 'bg-[#4d0471] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            🏍️ Entregadores ({motoboys.length})
          </button>
          {activeSubTab === 'cadastro' && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormName('');
                setFormPhone('');
                setFormPix('');
                setFormFee('6.00');
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#fdde58] text-[#4d0471] hover:brightness-95 shadow-xs"
            >
              <Plus size={16} />
              Novo Entregador
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: ACERTO DE CAIXA */}
      {activeSubTab === 'acerto' && (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700">
                <Calendar size={16} className="text-[#4d0471]" />
                <span>Data:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-stone-900 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700">
                <Bike size={16} className="text-[#4d0471]" />
                <span>Entregador:</span>
                <select
                  value={selectedMotoboyId}
                  onChange={(e) => setSelectedMotoboyId(e.target.value)}
                  className="bg-transparent font-bold text-stone-900 outline-none cursor-pointer"
                >
                  <option value="todos">Todos os Entregadores</option>
                  <option value="sem_motoboy">⚠️ Sem motoboy atribuído</option>
                  {motoboys.map(m => (
                    <option key={m.id} value={m.id}>{m.name} {!m.active ? '(Inativo)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                disabled={settlementStats.totalEntregas === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-all"
              >
                {copiedText ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copiedText ? 'Copiado!' : 'Copiar Acerto'}
              </button>

              {selectedMotoboyId !== 'todos' && selectedMotoboyId !== 'sem_motoboy' && (
                <button
                  onClick={sendToWhatsApp}
                  disabled={settlementStats.totalEntregas === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:brightness-95 disabled:opacity-50 transition-all shadow-xs"
                >
                  <Send size={15} />
                  Enviar no WhatsApp
                </button>
              )}
            </div>
          </div>

          {/* Cards de Métricas do Acerto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold">Total de Corridas</span>
                <Bike size={18} className="text-[#4d0471]" />
              </div>
              <p className="text-2xl font-black text-stone-900">{settlementStats.totalEntregas}</p>
              <p className="text-[11px] font-semibold text-stone-400 mt-1">entregas finalizadas na data</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold">Taxas de Entrega</span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-stone-900">{brl(settlementStats.totalTaxas)}</p>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1">a pagar ao entregador</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold">Recebido em Dinheiro</span>
                <Receipt size={18} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-stone-900">{brl(settlementStats.totalDinheiro)}</p>
              <p className="text-[11px] font-semibold text-amber-600 mt-1">cobrado pelo motoboy</p>
            </div>

            {/* Saldo de Fechamento */}
            <div className={`p-5 rounded-2xl border shadow-xs ${
              settlementStats.deveDevolverLoja 
                ? 'bg-amber-50/70 border-amber-200' 
                : settlementStats.lojaDevePagar 
                  ? 'bg-indigo-50/70 border-indigo-200' 
                  : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-700">Balanço do Acerto</span>
                <ArrowRightLeft size={18} className={
                  settlementStats.deveDevolverLoja ? 'text-amber-700' : 'text-indigo-700'
                } />
              </div>
              <p className={`text-2xl font-black ${
                settlementStats.deveDevolverLoja 
                  ? 'text-amber-800' 
                  : settlementStats.lojaDevePagar 
                    ? 'text-indigo-800' 
                    : 'text-emerald-800'
              }`}>
                {brl(settlementStats.valorDiferenca)}
              </p>
              <p className="text-[11px] font-bold mt-1">
                {settlementStats.deveDevolverLoja && '⚠️ Motoboy repassa à loja'}
                {settlementStats.lojaDevePagar && '👉 Loja paga ao motoboy'}
                {!settlementStats.deveDevolverLoja && !settlementStats.lojaDevePagar && '✅ Acerto 100% Zerado'}
              </p>
            </div>
          </div>

          {/* Tabela de Pedidos da Entrega */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Corridas do Dia ({filteredOrders.length})</h2>
              <span className="text-xs font-semibold text-stone-400">São José dos Pinhais</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-stone-400">
                <Bike size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold">Nenhuma entrega encontrada para esta data ou filtro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Pedido</th>
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Cliente / Bairro</th>
                      <th className="py-3 px-4">Entregador</th>
                      <th className="py-3 px-4">Pagamento</th>
                      <th className="py-3 px-4 text-right">Dinheiro Cobrado</th>
                      <th className="py-3 px-4 text-right">Taxa da Corrida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map(o => {
                      const isDinheiro = String(o.payment_method || '').toLowerCase().includes('dinheiro');
                      const fee = Number(o.motoboy_fee || 6.00);

                      return (
                        <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">#{o.id}</td>
                          <td className="py-3 px-4 text-stone-500 font-medium">
                            {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-stone-900">{o.customer_name || 'Cliente'}</p>
                            <p className="text-stone-400 text-[11px] truncate max-w-xs flex items-center gap-1">
                              <MapPin size={11} className="shrink-0 text-stone-400" />
                              {o.delivery_zone || o.delivery_address || 'Entrega'}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                              {o.motoboy_name || 'Não atribuído'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-700">
                            {o.payment_method}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {isDinheiro ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {brl(o.total_amount)}
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {brl(fee)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CADASTRO DE ENTREGADORES */}
      {activeSubTab === 'cadastro' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {motoboys.map(m => (
            <div key={m.id} className={`bg-white p-5 rounded-2xl border transition-all ${
              m.active ? 'border-stone-200 shadow-xs' : 'border-stone-200/60 opacity-60 bg-stone-50'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    m.active ? 'bg-[#4d0471] text-white' : 'bg-stone-200 text-stone-500'
                  }`}>
                    <Bike size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{m.name}</h3>
                    <p className="text-xs font-semibold text-stone-500 flex items-center gap-1 mt-0.5">
                      <Phone size={12} />
                      {m.phone}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleActive(m.id, m.active)}
                  title={m.active ? 'Desativar motoboy hoje' : 'Ativar motoboy hoje'}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    m.active 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  {m.active ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Taxa Padrão:</span>
                  <span className="font-bold text-emerald-700 font-mono">{brl(m.default_fee)}/corrida</span>
                </div>
                {m.pix_key && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Chave PIX:</span>
                    <span className="font-mono text-stone-700 font-medium truncate max-w-[150px]">{m.pix_key}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-stone-100">
                <a
                  href={`https://wa.me/55${m.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-stone-600 hover:text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Chamar no WhatsApp"
                >
                  <Send size={15} />
                </a>
                <button
                  onClick={() => openEdit(m)}
                  className="p-2 text-stone-600 hover:text-[#4d0471] hover:bg-[#4d0471]/10 rounded-lg transition-colors"
                  title="Editar dados"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir entregador"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {motoboys.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-stone-200">
              <Bike size={42} className="mx-auto mb-3 text-stone-300" />
              <h3 className="font-bold text-stone-800 text-sm">Nenhum motoboy cadastrado ainda</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Cadastre seus entregadores parceiros para atribuir corridas com 1 clique e fazer o acerto diário automático.
              </p>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormName('');
                  setFormPhone('');
                  setFormPix('');
                  setFormFee('6.00');
                  setShowModal(true);
                }}
                className="mt-4 px-4 py-2 bg-[#4d0471] text-white rounded-xl text-xs font-bold hover:bg-[#3b0357] transition-colors"
              >
                + Cadastrar Primeiro Entregador
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-100">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Bike size={20} className="text-[#4d0471]" />
                <h3 className="font-bold text-stone-900 text-base">
                  {editingId ? 'Editar Entregador' : 'Novo Entregador Sob Demanda'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMotoboy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold outline-none focus:border-[#4d0471]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp / Celular *</label>
                  <input
                    type="text"
                    required
                    placeholder="(41) 99999-9999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold outline-none focus:border-[#4d0471]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Taxa por Corrida (R$)</label>
                  <input
                    type="text"
                    placeholder="6.00"
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold outline-none focus:border-[#4d0471]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Chave PIX (para acerto)</label>
                <input
                  type="text"
                  placeholder="CPF, Celular, E-mail ou Chave Aleatória"
                  value={formPix}
                  onChange={(e) => setFormPix(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold outline-none focus:border-[#4d0471]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#4d0471] text-white hover:bg-[#3b0357] shadow-xs"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Entregador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

