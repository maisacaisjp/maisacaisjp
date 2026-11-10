import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  Bike,
  UtensilsCrossed,
  Calendar,
  Layers,
  Download,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  DADOS_HISTORICOS_TOTAL,
  DADOS_HISTORICOS_ANOS,
  DADOS_HISTORICOS_SEMESTRES,
  SemestreHistorico
} from '../data/historicalSalesData';

interface HistoricalSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncFinanceiro?: () => void;
}

const formatBRL = (val: number) => {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatNum = (val: number) => {
  return val.toLocaleString('pt-BR');
};

const PIE_COLORS = ['#6a2092', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const HistoricalSalesModal: React.FC<HistoricalSalesModalProps> = ({
  isOpen,
  onClose,
  onSyncFinanceiro
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'canais' | 'pagamentos' | 'tabela'>('geral');
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [syncFeedback, setSyncFeedback] = useState(false);

  // Filtragem de semestres por ano
  const filteredSemestres = useMemo(() => {
    if (selectedYear === 'todos') return DADOS_HISTORICOS_SEMESTRES;
    return DADOS_HISTORICOS_SEMESTRES.filter((s) => s.ano === Number(selectedYear));
  }, [selectedYear]);

  // Dados para o gráfico de evolução anual
  const dadosGraficoAnos = useMemo(() => {
    return DADOS_HISTORICOS_ANOS.map((a) => ({
      name: `${a.ano}`,
      faturamento: a.faturamento.total,
      pedidos: a.pedidos.total,
      ticket: a.ticketMedio,
      entrega: a.faturamento.entrega,
      mesas: a.faturamento.mesas,
      balcao: a.faturamento.balcao
    }));
  }, []);

  // Dados para o gráfico de evolução semestral
  const dadosGraficoSemestres = useMemo(() => {
    return filteredSemestres.map((s) => ({
      name: s.labelCurto,
      faturamento: s.faturamento.total,
      pedidos: s.pedidos.total,
      ticket: s.ticketMedio,
      entrega: s.faturamento.entrega,
      mesas: s.faturamento.mesas,
      balcao: s.faturamento.balcao
    }));
  }, [filteredSemestres]);

  // Canais
  const dadosCanais = useMemo(() => {
    const total = DADOS_HISTORICOS_TOTAL.faturamentoTotal;
    const canais = DADOS_HISTORICOS_TOTAL.canais;
    return [
      {
        name: 'Mesas (Salão)',
        valor: canais.mesas.faturamento,
        pedidos: canais.mesas.pedidos,
        pct: (canais.mesas.faturamento / total) * 100,
        color: '#6a2092',
        icon: UtensilsCrossed
      },
      {
        name: 'Balcão (Retirada)',
        valor: canais.balcao.faturamento,
        pedidos: canais.balcao.pedidos,
        pct: (canais.balcao.faturamento / total) * 100,
        color: '#3b82f6',
        icon: Store
      },
      {
        name: 'Entrega (Delivery)',
        valor: canais.entrega.faturamento,
        pedidos: canais.entrega.pedidos,
        pct: (canais.entrega.faturamento / total) * 100,
        color: '#10b981',
        icon: Bike
      }
    ];
  }, []);

  // Formas de Pagamento
  const dadosPagamentos = useMemo(() => {
    const total = DADOS_HISTORICOS_TOTAL.faturamentoTotal;
    const pags = DADOS_HISTORICOS_TOTAL.pagamentos;
    return [
      {
        name: 'Cartão (Débito/Crédito)',
        valor: pags.cartao,
        pct: (pags.cartao / total) * 100,
        color: '#6a2092',
        icon: CreditCard
      },
      {
        name: 'Dinheiro em Espécie',
        valor: pags.dinheiro,
        pct: (pags.dinheiro / total) * 100,
        color: '#10b981',
        icon: Banknote
      },
      {
        name: 'PIX',
        valor: pags.pix,
        pct: (pags.pix / total) * 100,
        color: '#06b6d4',
        icon: QrCode
      },
      {
        name: 'Voucher & Online (PicPay)',
        valor: pags.outros,
        pct: (pags.outros / total) * 100,
        color: '#f59e0b',
        icon: Layers
      }
    ];
  }, []);

  const handleExportCSV = () => {
    const headers = [
      'Semestre',
      'Inicio',
      'Fim',
      'Pedidos Total',
      'Pedidos Entrega',
      'Pedidos Mesas',
      'Pedidos Balcao',
      'Faturamento Total (R$)',
      'Faturamento Entrega (R$)',
      'Faturamento Mesas (R$)',
      'Faturamento Balcao (R$)',
      'Cartao (R$)',
      'Dinheiro (R$)',
      'PIX (R$)',
      'Ticket Medio (R$)'
    ];

    const rows = DADOS_HISTORICOS_SEMESTRES.map((s) => [
      `"${s.label}"`,
      `"${s.inicio}"`,
      `"${s.fim}"`,
      s.pedidos.total,
      s.pedidos.entrega,
      s.pedidos.mesas,
      s.pedidos.balcao,
      s.faturamento.total.toFixed(2),
      s.faturamento.entrega.toFixed(2),
      s.faturamento.mesas.toFixed(2),
      s.faturamento.balcao.toFixed(2),
      s.pagamentos.cartao.toFixed(2),
      s.pagamentos.dinheiro.toFixed(2),
      s.pagamentos.pix.toFixed(2),
      s.ticketMedio.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_historico_mais_acai_2020_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncClick = () => {
    if (onSyncFinanceiro) {
      onSyncFinanceiro();
      setSyncFeedback(true);
      setTimeout(() => setSyncFeedback(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#4d0471] to-[#6a2092] text-white p-4 sm:p-5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <Calendar className="text-amber-300" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Histórico Consolidado de Vendas</h2>
                <span className="bg-amber-400 text-stone-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                  2020 a 2026
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                12 semestres consolidados • 30.235 pedidos • R$ 1.173.253,59 faturados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Baixar planilha CSV"
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Abas & Filtros */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-xl">
            <button
              onClick={() => setActiveTab('geral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'geral' ? 'bg-white text-[#4d0471] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 size={14} />
              Visão Anual
            </button>
            <button
              onClick={() => setActiveTab('canais')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'canais' ? 'bg-white text-[#4d0471] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <PieChartIcon size={14} />
              Canais de Venda
            </button>
            <button
              onClick={() => setActiveTab('pagamentos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pagamentos' ? 'bg-white text-[#4d0471] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard size={14} />
              Formas de Pagamento
            </button>
            <button
              onClick={() => setActiveTab('tabela')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tabela' ? 'bg-white text-[#4d0471] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers size={14} />
              Semestres Detalhados
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500 font-medium">Filtrar Ano:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-2.5 py-1.5 font-medium shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#6a2092]"
            >
              <option value="todos">Todos os Anos (2020 a 2026)</option>
              {DADOS_HISTORICOS_ANOS.map((a) => (
                <option key={a.ano} value={a.ano}>
                  Ano {a.ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Cards de Métricas Principais (Sempre visíveis no topo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-[#4d0471]/5 to-purple-50 border border-[#4d0471]/20 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4d0471] uppercase tracking-wider">Faturamento Total</span>
                <div className="w-7 h-7 rounded-lg bg-[#4d0471] text-white flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-stone-900 mt-2">
                {formatBRL(DADOS_HISTORICOS_TOTAL.faturamentoTotal)}
              </p>
              <span className="text-[11px] text-stone-500 mt-0.5 block">Histórico de 2020 até 09/11/2026</span>
            </div>

            <div className="bg-gradient-to-br from-blue-500/5 to-blue-50 border border-blue-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total de Pedidos</span>
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-stone-900 mt-2">
                {formatNum(DADOS_HISTORICOS_TOTAL.pedidosTotal)}
              </p>
              <span className="text-[11px] text-stone-500 mt-0.5 block">Atendimentos registrados</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ticket Médio Geral</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-stone-900 mt-2">
                {formatBRL(DADOS_HISTORICOS_TOTAL.ticketMedioGeral)}
              </p>
              <span className="text-[11px] text-stone-500 mt-0.5 block">Média por pedido</span>
            </div>

            <div className="bg-gradient-to-br from-amber-500/5 to-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Módulo Financeiro</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-2">
                {syncFeedback ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                    <CheckCircle2 size={14} /> Sincronizado com Sucesso!
                  </div>
                ) : (
                  <button
                    onClick={handleSyncClick}
                    className="w-full text-xs font-bold bg-[#6a2092] hover:bg-[#521872] text-white py-1.5 px-3 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Layers size={13} />
                    Sincronizar no Financeiro
                  </button>
                )}
                <span className="text-[10px] text-stone-500 block mt-1">Gera os lançamentos na aba Histórico</span>
              </div>
            </div>
          </div>

          {/* TAB 1: VISÃO GERAL & GRÁFICO ANUAL */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <BarChart3 size={16} className="text-[#6a2092]" />
                      Evolução de Faturamento por Ano (2020 a 2026)
                    </h3>
                    <p className="text-xs text-stone-500">Valores faturados anualmente consolidados</p>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoAnos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatBRL(Number(val)), 'Faturamento']}
                        labelFormatter={(label) => `Ano ${label}`}
                      />
                      <Bar dataKey="faturamento" fill="#6a2092" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabela dos Anos */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Resumo Consolidado Ano a Ano</span>
                  <span className="text-stone-400 font-normal">7 anos analisados</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50/50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="p-3">Ano</th>
                        <th className="p-3">Pedidos</th>
                        <th className="p-3">Salão (Mesas)</th>
                        <th className="p-3">Balcão</th>
                        <th className="p-3">Entrega</th>
                        <th className="p-3">Faturamento Total</th>
                        <th className="p-3 text-right">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {DADOS_HISTORICOS_ANOS.map((a) => (
                        <tr key={a.ano} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-3 font-bold text-stone-900">{a.ano}</td>
                          <td className="p-3 font-mono text-stone-700">{formatNum(a.pedidos.total)}</td>
                          <td className="p-3 text-stone-600 font-mono">{formatBRL(a.faturamento.mesas)}</td>
                          <td className="p-3 text-stone-600 font-mono">{formatBRL(a.faturamento.balcao)}</td>
                          <td className="p-3 text-stone-600 font-mono">{formatBRL(a.faturamento.entrega)}</td>
                          <td className="p-3 font-bold text-[#4d0471] font-mono">{formatBRL(a.faturamento.total)}</td>
                          <td className="p-3 text-right font-mono text-stone-800">{formatBRL(a.ticketMedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CANAIS DE VENDA */}
          {activeTab === 'canais' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dadosCanais.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.name} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                          style={{ backgroundColor: c.color }}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">{c.name}</h4>
                          <p className="text-lg font-black text-stone-900">{formatBRL(c.valor)}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                        <span>{formatNum(c.pedidos)} pedidos</span>
                        <span className="font-bold font-mono" style={{ color: c.color }}>
                          {c.pct.toFixed(1)}% do faturamento
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gráfico de Barras Empilhadas por Canal por Ano */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
                  <Layers size={16} className="text-[#6a2092]" />
                  Distribuição de Canais por Ano (Mesas vs Balcão vs Entrega)
                </h3>
                <p className="text-xs text-stone-500 mb-4">Veja a evolução dos pedidos presenciais versus delivery</p>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoAnos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val: any) => formatBRL(Number(val))} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="mesas" name="Mesas (Salão)" fill="#6a2092" stackId="a" />
                      <Bar dataKey="balcao" name="Balcão" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="entrega" name="Entrega" fill="#10b981" stackId="a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMAS DE PAGAMENTO */}
          {activeTab === 'pagamentos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dadosPagamentos.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.name} className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: p.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <h4 className="text-xs font-bold text-stone-700">{p.name}</h4>
                      </div>
                      <p className="text-lg font-black text-stone-900 mt-2">{formatBRL(p.valor)}</p>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                        />
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono mt-1 block">
                        {p.pct.toFixed(1)}% do faturamento
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Informação sobre a evolução do PIX */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-xs text-cyan-900 flex items-start gap-3">
                <QrCode size={22} className="text-cyan-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-cyan-950">Curiosidade & Crescimento do PIX</h5>
                  <p className="mt-0.5 leading-relaxed text-cyan-800">
                    Em 2020 e 2021 o PIX representava menos de 1% das transações (R$ 1.458 em todo o 1º sem/2021). A
                    partir de 2023 o PIX saltou para mais de R$ 30.000 anuais, chegando a R$ 46.219 faturados em 2025!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEMESTRES DETALHADOS (TABELA COMPLETA) */}
          {activeTab === 'tabela' && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-700 flex items-center justify-between">
                <span>Relatórios Semestrais Individuais ({filteredSemestres.length} períodos)</span>
                <span className="text-[11px] text-stone-400 font-normal">Originalmente extraídos do POS anterior</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50/50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Semestre</th>
                      <th className="p-3">Período</th>
                      <th className="p-3">Pedidos</th>
                      <th className="p-3">Mesas</th>
                      <th className="p-3">Balcão</th>
                      <th className="p-3">Entrega</th>
                      <th className="p-3">Cartão</th>
                      <th className="p-3">Dinheiro</th>
                      <th className="p-3">PIX</th>
                      <th className="p-3 font-bold text-stone-900">Total Faturado</th>
                      <th className="p-3 text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredSemestres.map((s) => (
                      <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="p-3 font-bold text-[#4d0471] whitespace-nowrap">{s.label}</td>
                        <td className="p-3 text-stone-500 text-[11px] whitespace-nowrap font-mono">{s.inicio} a {s.fim}</td>
                        <td className="p-3 font-mono font-medium text-stone-800">{formatNum(s.pedidos.total)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.faturamento.mesas)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.faturamento.balcao)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.faturamento.entrega)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.pagamentos.cartao)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.pagamentos.dinheiro)}</td>
                        <td className="p-3 font-mono text-stone-600">{formatBRL(s.pagamentos.pix)}</td>
                        <td className="p-3 font-mono font-bold text-[#4d0471] whitespace-nowrap">
                          {formatBRL(s.faturamento.total)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-stone-800">
                          {formatBRL(s.ticketMedio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="bg-stone-50 border-t border-stone-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Dados preservados com segurança na nuvem e no sistema da Mais Açaí</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalSalesModal;

