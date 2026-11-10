import React, { useState, useEffect, useRef } from "react";
import Comanda, { ComandaTexto } from "../components/Comanda";
import {
  X, TrendingUp, TrendingDown, Filter, Layers, RefreshCw, ChevronDown, Key,
  DollarSign,
  ShoppingBag,
  Bike,
  Store,
  Users,
  User,
  IceCream,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Lock,
  Printer,
  Menu,
  LogOut,
  LayoutDashboard,
  FolderTree,
  Package,
  UtensilsCrossed,
  Settings,
  BarChart3,
  Edit3,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  FileText,
  Check,
  Search,
  Shield,
  Megaphone,
  Wallet,
  BotMessageSquare,
  MapPin,
  RotateCcw,
  Edit2,
  Clock,
  ArrowRight,
  Phone,
  Flame,
  LayoutGrid,
  Columns3,
  List,
  CheckCircle2,
  Star,
  ChefHat
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ALL_MENU_ITEMS, MenuItem } from "../data/menu";
import { useMenu } from "../hooks/useMenu";
import { supabase } from '../lib/supabase';
import { normalizeOrderType, isOrderActive, normalizePaymentMethod, paymentParts, detailPaymentMethod } from '../utils/paymentAndOrderHelper';
import { formatItemNameForPrint, getItemNameTextForPrint } from '../utils/printHelpers';
import { motion } from 'framer-motion';
import MenuManager from '../components/MenuManager';
import CategoryManager from '../components/CategoryManager';
import RecipeManager from '../components/RecipeManager';
import FinanceiroManager from '../components/FinanceiroManager';
import { BannerContabil, useAlertasContabeis } from '../components/AlertasContabeis';
import { SalesFunnelManager } from '../components/SalesFunnelManager';
import CashSessionDetailsModal from '../components/reports/CashSessionDetailsModal';
import PeriodFilterCompact from '../components/PeriodFilterCompact';
import ExpensesManager from '../components/ExpensesManager';
import PDVModal from '../components/PDVModal';
import SettingsManager from '../components/SettingsManager';
import CustomersManager from '../components/CustomersManager';
import CaixaManager from '../components/CaixaManager';
import UsersManager from '../components/UsersManager';
import BannerManager from '../components/BannerManager';
import ReviewsManager from '../components/ReviewsManager';
import AgentManager from '../components/AgentManager';
import MotoboyManager from '../components/MotoboyManager';
import KitchenDisplay from '../components/KitchenDisplay';
import HistoricalSalesModal from '../components/HistoricalSalesModal';

import { startOfDay, endOfDay } from 'date-fns';
import { brl, nomeBonito } from '../utils/formatacao';
import PaletaComandos, { ComandoPaleta } from '../components/PaletaComandos';
import { Paginacao, useLinhasQueCabem } from '../components/admin/ui';



const safeGetDate = (dStr: any): Date | null => {
  if (!dStr) return null;
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

const formatCurrency = (val: any): string => {
  const num = typeof val === 'number' ? val : Number(val) || 0;
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
};

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

const CHART_COLORS = ["#6a2092", "#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];


const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playChime = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle'; // Softer, more bell-like
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const t = ctx.currentTime;
    // Turu-turu! (Sequence of notes)
    playChime(t, 1318.51, 0.15); // E6
    playChime(t + 0.15, 1046.50, 0.2); // C6
    
    playChime(t + 0.4, 1318.51, 0.15); // E6
    playChime(t + 0.55, 1046.50, 0.4); // C6
  } catch (e) {
    console.log("Audio play failed", e);
  }
};

export default function AdminDashboard() {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();


  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);
  const [storeStatus, setStoreStatus] = useState<'open'|'paused'|'closed'>('open');
  const [pausedUntil, setPausedUntil] = useState<string|null>(null);
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [overviewViewMode, setOverviewViewMode] = useState<'cockpit' | 'grid'>('cockpit');
  const [overviewChartTab, setOverviewChartTab] = useState<'faturamento' | 'categorias' | 'produtos' | 'pagamentos'>('faturamento');
  const [isOverviewChartDropdownOpen, setIsOverviewChartDropdownOpen] = useState(false);
  const overviewChartDropdownRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    'visao-geral': { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho do seu negócio em tempo real.' },
    'pedidos': { title: 'Pedidos', subtitle: 'Gerencie e acompanhe os pedidos em tempo real.' },
    'cozinha-kds': { title: 'Cozinha & KDS', subtitle: 'Tela de bancada com contagem de tempo e montagem de açaí.' },
    'motoboys': { title: 'Logística & Entregadores', subtitle: 'Gestão de motoboys sob demanda e acerto diário de corridas.' },
    'caixa': { title: 'Caixa', subtitle: 'Abertura, fechamento e conferência do turno.' },
    'gestao-cardapio': { title: 'Produtos', subtitle: 'Gerencie o cardápio, preços e fotos.' },
    'categorias': { title: 'Categorias', subtitle: 'Organize as categorias do cardápio.' },
    'fichas-tecnicas': { title: 'Ficha Técnica & CMV', subtitle: 'Gestão de insumos, custo de produção e margem real por produto.' },
    'relatorios': { title: 'Relatórios', subtitle: 'Vendas, ticket médio e produtos mais vendidos.' },
    'clientes': { title: 'Clientes', subtitle: 'Histórico e cadastro de clientes.' },
    'avaliacoes': { title: 'Avaliações de Clientes', subtitle: 'Gestão de notas, comentários, elogios e respostas públicas.' },
    'financeiro': { title: 'Financeiro', subtitle: 'Fichas técnicas, custos, despesas e resultado do mês.' },
    'configuracoes': { title: 'Configurações', subtitle: 'Horário, impressão, logo e dados da empresa.' },
    'banner-promocional': { title: 'Banner Promocional', subtitle: 'Configure o pop-up de aviso ou promoção exibido no cardápio.' },
    'agente-ia': { title: 'Agente IA', subtitle: 'Configurações e controles da sua atendente virtual.' },
    'usuarios': { title: 'Usuários & Permissões', subtitle: 'Gerencie os acessos da sua equipe.' },
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [perfilLido, setPerfilLido] = useState(false);
  const isOwner = userRole === 'owner';

  // Sem perfil cadastrado = sem acesso (antes, quem não tinha perfil virava dono)
  const hasPermission = (permKey: string): boolean => {
    if (userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [ticketMedioTab, setTicketMedioTab] = useState<'todos' | 'mesa' | 'retirada' | 'entrega'>('todos');
  const [reportModal, setReportModal] = useState<{isOpen: boolean, type: string, title: string}>({isOpen: false, type: '', title: ''});
  const [allCashSessions, setAllCashSessions] = useState<any[]>([]);
  const [filteredCashSessions, setFilteredCashSessions] = useState<any[]>([]);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any>(null);
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // Modelo da comanda neste computador: "texto" para o driver Generic / Text Only, "formatado" para o driver da impressora
  const [modoImpressora, setModoImpressora] = useState<'texto' | 'formatado'>(() => {
    try { return localStorage.getItem('modoImpressora') === 'formatado' ? 'formatado' : 'texto'; } catch { return 'texto'; }
  });
  const trocarModoImpressora = (m: 'texto' | 'formatado') => {
    setModoImpressora(m);
    try { localStorage.setItem('modoImpressora', m); } catch {}
  };
  const [cardapioSearchTerm, setCardapioSearchTerm] = useState("");
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("autoPrint") === "true");
  const autoPrintRef = useRef(autoPrint);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  const toggleSound = () => setSoundEnabled(prev => !prev);
  const [lastSeenOrderId, setLastSeenOrderId] = useState<number | null>(null);
  const lastSeenOrderIdRef = useRef(lastSeenOrderId);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [ordersViewMode, setOrdersViewMode] = useState<'cards' | 'table' | 'kanban'>('table');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'todos' | 'Pendente' | 'Em Preparo' | 'Saiu para Entrega' | 'Finalizado' | 'Cancelado'>('todos');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');

  const getElapsedTime = (createdAt: string | Date) => {
    if (!createdAt) return { text: '', minutes: 0, urgency: 'normal' };
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return { text: '', minutes: 0, urgency: 'normal' };
    const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMinutes < 1) return { text: 'Agora mesmo', minutes: 0, urgency: 'normal' };
    if (diffMinutes < 60) {
      const urgency = diffMinutes >= 35 ? 'danger' : diffMinutes >= 20 ? 'warning' : 'normal';
      return { text: `há ${diffMinutes} min`, minutes: diffMinutes, urgency };
    }
    const diffHours = Math.floor(diffMinutes / 60);
    return { text: `há ${diffHours}h`, minutes: diffMinutes, urgency: diffMinutes >= 60 ? 'danger' : 'normal' };
  };

  const handleSaveOrderEdit = async (updatedOrder: any) => {
    // 1. Atualização Otimista Imediata no Estado React (Gestor, Comanda e Gráficos atualizam sem recarregar página)
    const normPm = (updatedOrder.payment_method || updatedOrder.paymentMethod || 'Dinheiro').toString().trim();
    const normalizedPaymentMethod = (normPm.toLowerCase() === 'mbway' || normPm.toLowerCase() === 'mb way') ? 'PIX' : normPm;

    const formattedUpdatedOrder = {
      ...updatedOrder,
      customerName: updatedOrder.customer_name || updatedOrder.customerName,
      customerPhone: updatedOrder.customer_phone || updatedOrder.customerPhone,
      orderType: updatedOrder.order_type || updatedOrder.orderType,
      paymentMethod: normalizedPaymentMethod,
      payment_method: normalizedPaymentMethod,
      deliveryAddress: updatedOrder.delivery_address || updatedOrder.deliveryAddress || '',
      delivery_address: updatedOrder.delivery_address || updatedOrder.deliveryAddress || '',
      deliveryZone: updatedOrder.delivery_zone || updatedOrder.deliveryZone || '',
      delivery_zone: updatedOrder.delivery_zone || updatedOrder.deliveryZone || '',
      items: updatedOrder.items,
      discountAmount: Number(updatedOrder.discount_amount ?? updatedOrder.discountAmount ?? 0),
      discount_amount: Number(updatedOrder.discount_amount ?? updatedOrder.discountAmount ?? 0),
      additionalAmount: Number(updatedOrder.additional_amount ?? updatedOrder.additionalAmount ?? 0),
      additional_amount: Number(updatedOrder.additional_amount ?? updatedOrder.additionalAmount ?? 0),
      totalAmount: Number(updatedOrder.total_amount ?? updatedOrder.totalAmount ?? 0),
      total_amount: Number(updatedOrder.total_amount ?? updatedOrder.totalAmount ?? 0),
      editReason: updatedOrder.edit_reason || updatedOrder.editReason || '',
      edit_reason: updatedOrder.edit_reason || updatedOrder.editReason || '',
      isEdited: true,
      is_edited: true,
      updatedAt: new Date().toISOString()
    };

    // Atualiza allOrders
    setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o));

    // Atualiza filteredOrders
    setFilteredOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o));

    // Atualiza dashboardData (recentOrders, KPIs e gráfico de formas de pagamento)
    setDashboardData((prev: any) => {
      if (!prev) return prev;
      const updatedRecent = (prev.recentOrders || []).map((o: any) => 
        o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o
      );
      
      // Recalcular distribuição de formas de pagamento em tempo real
      const pmCounts: Record<string, { count: number, revenue: number }> = {};
      let totalFat = 0;
      updatedRecent.forEach((o: any) => {
        if (o.status !== 'Cancelado' && o.status !== 'cancelado') {
          const amt = Number(o.totalAmount || o.total_amount || 0);
          // Pagamento dividido: cada parte conta na sua forma
          paymentParts(o.paymentMethod || o.payment_method, amt).forEach(part => {
            const pm = detailPaymentMethod(part.method);
            if (!pmCounts[pm]) {
              pmCounts[pm] = { count: 0, revenue: 0 };
            }
            pmCounts[pm].count += 1;
            pmCounts[pm].revenue += part.amount;
          });
          totalFat += amt;
        }
      });
      const newPaymentMethodsData = Object.entries(pmCounts)
        .filter(([_, data]) => data.count > 0 || data.revenue > 0)
        .map(([name, data]) => ({ name, value: Number(data.revenue.toFixed(2)), count: data.count }))
        .sort((a, b) => b.value - a.value);

      return {
        ...prev,
        recentOrders: updatedRecent,
        paymentMethodsData: newPaymentMethodsData,
        faturamentoBruto: totalFat > 0 ? totalFat : prev.faturamentoBruto,
        faturamento: totalFat > 0 ? totalFat : prev.faturamento
      };
    });

    // Se a comanda / talão estiver com esse pedido aberto ou em cache, atualiza imediatamente
    setPrintOrder((prev: any) => {
      if (prev && prev.id === updatedOrder.id) {
        return { ...prev, ...formattedUpdatedOrder };
      }
      return prev;
    });

    setEditingOrder(null);

    try {
      const { error } = await supabase.from('orders').update({
        customer_name: formattedUpdatedOrder.customerName,
        customer_phone: formattedUpdatedOrder.customerPhone,
        order_type: formattedUpdatedOrder.orderType,
        payment_method: formattedUpdatedOrder.paymentMethod,
        delivery_address: formattedUpdatedOrder.deliveryAddress,
        delivery_zone: formattedUpdatedOrder.deliveryZone,
        items: formattedUpdatedOrder.items,
        discount_amount: formattedUpdatedOrder.discountAmount,
        additional_amount: formattedUpdatedOrder.additionalAmount,
        total_amount: formattedUpdatedOrder.totalAmount,
        edit_reason: formattedUpdatedOrder.editReason,
        is_edited: true,
        updated_at: formattedUpdatedOrder.updatedAt
      }).eq('id', updatedOrder.id);

      if (error) throw error;
      fetchDashboardData(true);
    } catch (err: any) {
      console.error('Erro ao atualizar pedido:', err);
      alert('Erro ao sincronizar atualização no banco: ' + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: any) => {
    if (!window.confirm(`Tem certeza de que deseja APAGAR/EXCLUIR permanentemente o Pedido #${orderId}?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
      alert(`Pedido #${orderId} excluído com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro ao excluir pedido: ' + err.message);
    }
  };

  const fetchDashboardData = async (isBackground = false, overrideFilter?: string) => {
    try {
      const filter = overrideFilter || dateFilterRef.current || 'hoje';
      const { data: activeSessionData } = await supabase.from('cash_sessions').select('id').eq('status', 'aberto').limit(1).maybeSingle();
      const activeSessionId = activeSessionData?.id || null;
      
      const { data: dbExpenses, error: expensesError } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (expensesError) console.error(expensesError);
      setExpenses(dbExpenses || []);
      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const allDbOrders = (dbOrders || []).map(o => ({
        id: o.id,
        customerName: o.customer_name || 'Cliente Sem Nome',
        customerPhone: o.customer_phone || '',
        orderType: o.order_type || 'balcao',
        paymentMethod: o.payment_method || 'Outros',
        status: o.status || 'Pendente',
        totalAmount: Number(o.total_amount) || 0,
        deliveryAddress: o.delivery_address || '',
        deliveryZone: o.delivery_zone || '',
        changeFor: o.change_for || '',
        nif: o.nif || '',
        items: o.items,
        isEdited: o.is_edited,
        discountAmount: Number(o.discount_amount) || 0,
        additionalAmount: Number(o.additional_amount) || 0,
        editReason: o.edit_reason || '',
        notes: o.notes || '',
        updatedAt: o.updated_at,
        createdAt: o.created_at,
        cashSessionId: o.cash_session_id
      }));
      setAllOrders(allDbOrders);

      const now = new Date();
      let allOrdersAgg = allDbOrders;
      
      const safeGetTime = (dStr: any) => {
        if (!dStr) return null;
        try {
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? null : d;
        } catch(e) {
          return null;
        }
      };

      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === todayStr;
        });
      } else if (filter === 'ontem') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === yesterdayStr;
        });
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= sevenDaysAgo;
        });
      } else if (filter === '30dias') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= thirtyDaysAgo;
        });
      } else if (filter === 'mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'mes_passado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
      } else if (filter === 'todos') {
        allOrdersAgg = allDbOrders;
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(`${startStr}T00:00:00`);
          const end = new Date(`${endStr}T23:59:59`);
          allOrdersAgg = allDbOrders.filter(o => {
            const d = safeGetTime(o.createdAt);
            if (!d) return false;
            return d >= start && d <= end;
          });
        }
      }

      setFilteredOrders(allOrdersAgg);

      // Fetch and enrich Cash Sessions
      const { data: dbCashSessions, error: cashSessionsError } = await supabase.from('cash_sessions').select('*').order('closed_at', { ascending: false });
      if (cashSessionsError) console.error(cashSessionsError);
      
      const allCashAgg = dbCashSessions || [];
      const enrichedCashSessions = allCashAgg.map(session => {
        let total_faturado = 0;
        const sessionOpenedAt = session.opened_at ? new Date(session.opened_at).getTime() : null;
        const sessionClosedAt = session.closed_at ? new Date(session.closed_at).getTime() : Date.now();
        allDbOrders?.forEach(o => {
          if (o.status === 'Cancelado' || o.status === 'cancelado') return;
          // Match by cashSessionId first, then fall back to date range
          const matchById = o.cashSessionId && o.cashSessionId === session.id;
          const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : null;
          const matchByDate = !matchById && sessionOpenedAt && orderTime && orderTime >= sessionOpenedAt && orderTime <= sessionClosedAt;
          if (matchById || matchByDate) {
            total_faturado += Number(o.totalAmount || 0);
          }
        });
        return {
          ...session,
          total_faturado
        };
      });
      setAllCashSessions(enrichedCashSessions);

      // Filter Cash Sessions
      let filteredCashAgg = enrichedCashSessions;
      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && s.closed_at.split('T')[0] === todayStr);
      } else if (filter === 'ontem') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && s.closed_at.split('T')[0] === yesterdayStr);
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && new Date(s.closed_at) >= sevenDaysAgo);
      } else if (filter === '30dias') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && new Date(s.closed_at) >= thirtyDaysAgo);
      } else if (filter === 'mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredCashAgg = enrichedCashSessions.filter(s => {
          if (!s.closed_at) return false;
          const d = new Date(s.closed_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'mes_passado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        filteredCashAgg = enrichedCashSessions.filter(s => {
          if (!s.closed_at) return false;
          const d = new Date(s.closed_at);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(`${startStr}T00:00:00`);
          const end = new Date(`${endStr}T23:59:59`);
          filteredCashAgg = enrichedCashSessions.filter(s => {
            if (!s.closed_at) return false;
            const d = new Date(s.closed_at);
            return d >= start && d <= end;
          });
        }
      }
      setFilteredCashSessions(filteredCashAgg);

      let faturamentoBruto = 0;
      let totalPedidos = allOrdersAgg.length;
      let faturamentoNumerario = 0;
      let faturamentoPIX = 0;
      let faturamentoCartao = 0;
      const paymentMethodCounts: Record<string, { count: number, revenue: number }> = {};
      
      const itemCounts: Record<string, {qty: number, revenue: number}> = {};
      const categoryCounts: Record<string, {qty: number, revenue: number}> = {};
      
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const daysCounts: Record<string, {orders: number, revenue: number}> = {};
      dayNames.forEach(d => daysCounts[d] = { orders: 0, revenue: 0 });
      
      allOrdersAgg.forEach(order => {
        const amt = Number(order.totalAmount) || 0;
        faturamentoBruto += amt;
        // Pagamento dividido: cada parte conta na sua forma
        paymentParts(order.paymentMethod || (order as any).payment_method, amt).forEach(part => {
          const pm = detailPaymentMethod(part.method);
          if (!paymentMethodCounts[pm]) {
            paymentMethodCounts[pm] = { count: 0, revenue: 0 };
          }
          paymentMethodCounts[pm].count += 1;
          paymentMethodCounts[pm].revenue += part.amount;
          if (pm === 'Dinheiro') faturamentoNumerario += part.amount;
          else if (pm === 'PIX') faturamentoPIX += part.amount;
          else if (pm.includes('Cartão')) faturamentoCartao += part.amount;
        });

        const d = safeGetTime(order.createdAt);
        if (d) {
          const dayName = dayNames[d.getDay()];
          if (daysCounts[dayName]) {
            daysCounts[dayName].orders += 1;
            daysCounts[dayName].revenue += amt;
          }
        }

        if (order.items) {
          const itemsList = safeParseItems(order.items);
          itemsList.forEach(item => {
            const displayName = getItemNameTextForPrint(item);
            if (!itemCounts[displayName]) {
              itemCounts[displayName] = { qty: 0, revenue: 0 };
            }
            itemCounts[displayName].qty += (Number(item.quantity) || 1);
            itemCounts[displayName].revenue += (Number(item.priceCalculated || item.price || item.basePrice) || 0) * (Number(item.quantity) || 1);

            const cat = item.category || 'outros';
            if (!categoryCounts[cat]) {
              categoryCounts[cat] = { qty: 0, revenue: 0 };
            }
            categoryCounts[cat].qty += (Number(item.quantity) || 1);
            categoryCounts[cat].revenue += (Number(item.priceCalculated || item.price || item.basePrice) || 0) * (Number(item.quantity) || 1);

          });
        }
      });

      const formatCategoryLabel = (cat: string): string => {
        if (!cat) return 'Outros';
        const c = cat.toLowerCase().trim();
        if (c === 'novidades') return 'Novidades';
        if (c === 'mais-vendidos') return 'Mais Vendidos';
        if (c === 'copos') return 'Copos de Açaí';
        if (c === 'combos') return 'Combos de Açaí';
        if (c === 'milk-shakes' || c === 'milkshakes') return 'Milkshakes';
        if (c === 'barcas') return 'Barcas de Açaí';
        if (c === 'fondue') return 'Fondue de Açaí';
        if (c === 'bebidas') return 'Bebidas';
        if (c === 'adicionais' || c === 'extras') return 'Adicionais & Toppings';
        if (c === 'promocoes' || c === 'promoções') return 'Promoções';
        return cat.charAt(0).toUpperCase() + cat.slice(1);
      };

      const weekDayDefs = [
        { name: 'Segunda', shortName: 'Seg', dayIndex: 1 },
        { name: 'Terça', shortName: 'Ter', dayIndex: 2 },
        { name: 'Quarta', shortName: 'Qua', dayIndex: 3 },
        { name: 'Quinta', shortName: 'Qui', dayIndex: 4 },
        { name: 'Sexta', shortName: 'Sex', dayIndex: 5 },
        { name: 'Sábado', shortName: 'Sáb', dayIndex: 6 },
        { name: 'Domingo', shortName: 'Dom', dayIndex: 0 },
      ];

      // Janela dos 7 dias mais recentes terminando hoje
      const recentDayMap: Record<number, { dateStr: string, displayDate: string, orders: number, revenue: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayIdx = d.getDay();
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        recentDayMap[dayIdx] = {
          dateStr,
          displayDate,
          orders: 0,
          revenue: 0
        };
      }

      // Calcula APENAS o faturamento de cada dia específico recente (não a soma de todas as segundas da história)
      allDbOrders.forEach(order => {
        if (order.status === 'Cancelado' || order.status === 'cancelado') return;
        const d = safeGetTime(order.createdAt);
        if (!d) return;
        const orderDateStr = d.toISOString().split('T')[0];
        const dayIdx = d.getDay();
        if (recentDayMap[dayIdx] && recentDayMap[dayIdx].dateStr === orderDateStr) {
          const amt = Number(order.totalAmount) || 0;
          recentDayMap[dayIdx].orders += 1;
          recentDayMap[dayIdx].revenue += amt;
        }
      });

      const weeklyDailySalesData = weekDayDefs.map(def => {
        const item = recentDayMap[def.dayIndex] || { dateStr: '', displayDate: '', orders: 0, revenue: 0 };
        return {
          name: def.name,
          shortName: def.shortName,
          date: item.displayDate,
          fullName: `${def.name} (${item.displayDate})`,
          orders: item.orders,
          revenue: Number(item.revenue.toFixed(2))
        };
      });

      const popularItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const salesByCategory = Object.entries(categoryCounts)
        .map(([name, data]) => ({ 
          name: formatCategoryLabel(name), 
          rawCategory: name,
          value: Number(data.revenue.toFixed(2)), 
          qty: data.qty 
        }))
        .sort((a, b) => b.value - a.value);

      const orderVolumeData = weeklyDailySalesData;
      const allDaysVolumeData = weeklyDailySalesData;

      
      const uniqueCustomers = new Set(allOrdersAgg.map(o => o.customerName)).size;
      const ticketMedio = totalPedidos > 0 ? (faturamentoBruto / totalPedidos) : 0;
      
      const paymentMethodsData = Object.entries(paymentMethodCounts)
        .filter(([_, data]) => data.count > 0 || data.revenue > 0)
        .map(([name, data]) => ({ 
          name, 
          value: Number(data.revenue.toFixed(2)),
          count: data.count
        }))
        .sort((a, b) => b.value - a.value);

      const pendingOrders = allOrdersAgg.filter(o => o.status === 'Pendente');

      const data = {
        status: "ok",
        activeSessionId,
        totalOrders: totalPedidos,
        totalRevenue: faturamentoBruto,
        faturamento: faturamentoBruto,
        faturamentoBruto: faturamentoBruto,
        ticketMedio,
        uniqueCustomers,
        paymentMethodsData,
        faturamentoNumerario,
        faturamentoPIX,
        pendingOrders: pendingOrders.length,
        recentOrders: allDbOrders.filter(o => {
          // Se houver sessão de caixa aberta e o pedido pertencer a ela
          if (activeSessionId && o.cashSessionId === activeSessionId) return true;
          // Pedidos não finalizados/não cancelados sempre aparecem para a cozinha/gestão
          const isPendingOrActive = o.status !== 'Finalizado' && o.status !== 'Cancelado';
          if (isPendingOrActive) return true;
          // Pedidos do dia atual (mesmo que sem sessão aberta vinculada)
          const orderDate = safeGetTime(o.createdAt);
          const todayStr = now.toISOString().split('T')[0];
          return orderDate && orderDate.toISOString().split('T')[0] === todayStr;
        }),
        popularItems,
        popularPizzas: popularItems,
        chartData: {
          salesByCategory,
          orderVolumeData,
          allDaysVolumeData
        }
      };

      setDashboardData(data);
      setFilteredOrders(allOrdersAgg);
      if (data.recentOrders && data.recentOrders.length > 0) {
        const latestOrder = data.recentOrders[0];
        
        if (lastSeenOrderIdRef.current !== null && latestOrder.id > lastSeenOrderIdRef.current) {
          if (soundEnabledRef.current) {
            playNotificationSound();
          }
          if (autoPrintRef.current) {
            const visto = lastSeenOrderIdRef.current;
            const novos = data.recentOrders
              .filter((o: any) => Number(o.id) > visto && o.status !== 'Cancelado')
              .sort((a: any, b: any) => Number(a.id) - Number(b.id));
            enfileirarImpressao(novos);
          }
        }
        if (lastSeenOrderIdRef.current === null || latestOrder.id > lastSeenOrderIdRef.current) {
          setLastSeenOrderId(latestOrder.id);
          lastSeenOrderIdRef.current = latestOrder.id;
        }
      }
      
      const { data: dbPaused, error: pausedError } = await supabase.from('paused_items').select('id');
      if (pausedError) throw pausedError;
      if (dbPaused) {
        setPausedItems(dbPaused.map(pi => pi.id));
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };


  const toggleAutoPrint = () => {
    const newVal = !autoPrint;
    setAutoPrint(newVal);
    autoPrintRef.current = newVal;
    localStorage.setItem("autoPrint", String(newVal));
  };

  const handlePrintOrder = async (order: any) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    window.print();
  };

  // Impressão automática: cada pedido novo vai para a fila e sai sozinho na impressora padrão.
  // Sem a janela de confirmação, o Chrome precisa estar aberto com --kiosk-printing.
  const filaImpressao = useRef<any[]>([]);
  const imprimindo = useRef(false);
  const jaImpressos = useRef<Set<string>>(new Set());
  const atrasoImpressao = useRef(300);
  useEffect(() => {
    if (!isAuthenticated) return;
    supabase.from('settings').select('value').eq('key', 'print_delay_ms').maybeSingle().then(({ data }) => {
      const n = Number(data?.value);
      if (Number.isFinite(n) && n >= 0 && n <= 5000) atrasoImpressao.current = n;
    });
  }, [isAuthenticated]);

  const processarFilaImpressao = async () => {
    if (imprimindo.current) return;
    imprimindo.current = true;
    try {
      while (filaImpressao.current.length) {
        const pedido = filaImpressao.current.shift();
        setShowPrintPreview(false);
        setPrintOrder(pedido);
        // espera a comanda aparecer na página antes de mandar imprimir
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, Math.max(150, atrasoImpressao.current))));
        window.print();
        await new Promise(r => setTimeout(r, 400));
      }
    } finally {
      imprimindo.current = false;
      setPrintOrder(null);
    }
  };

  const enfileirarImpressao = (pedidos: any[]) => {
    for (const p of pedidos) {
      const chave = String(p.id);
      if (jaImpressos.current.has(chave)) continue;
      jaImpressos.current.add(chave);
      filaImpressao.current.push(p);
    }
    processarFilaImpressao();
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setPrintOrder(null);
  };

  // Dismiss on ESC for AdminDashboard modals and mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPrintPreview) {
          setShowPrintPreview(false);
          setPrintOrder(null);
        } else if (reportModal.isOpen) {
          setReportModal({ isOpen: false, type: '', title: '' });
        } else if (isPasswordModalOpen) {
          setIsPasswordModalOpen(false);
        } else if (selectedSessionForDetails) {
          setSelectedSessionForDetails(null);
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintPreview, reportModal.isOpen, isPasswordModalOpen, selectedSessionForDetails, isMobileMenuOpen]);

  const [activeTab, setActiveTab] = useState("visao-geral");
  // Lista de pedidos: quantas linhas cabem na tela (o resto vai para as próximas páginas)
  const pedidosListaRef = useRef<HTMLDivElement>(null);
  const pedidosPorPagina = useLinhasQueCabem(pedidosListaRef, 57, { reserva: 128, min: 3, deps: [activeTab, ordersViewMode, ordersStatusFilter] });
  const [pedidosPagina, setPedidosPagina] = useState(1);
  // Comandas (cards grandes): fileiras que cabem na tela × colunas da grade
  const comandasRef = useRef<HTMLDivElement>(null);
  const fileirasComandas = useLinhasQueCabem(comandasRef, 432, { reserva: 64, min: 1, max: 6, deps: [activeTab, ordersViewMode, ordersStatusFilter] });
  useEffect(() => setPedidosPagina(1), [ordersStatusFilter, ordersSearchTerm, ordersViewMode]);
  // Alertas da agenda contábil (Financeiro → Contábil), só para o dono
  const alertasContabeis = useAlertasContabeis(isAuthenticated && isOwner, activeTab);
  const [entradaFinanceiro, setEntradaFinanceiro] = useState<{ chave: number; contabil: boolean }>({ chave: 0, contabil: false });
  const abrirAgendaContabil = () => {
    setEntradaFinanceiro({ chave: Date.now(), contabil: true });
    setActiveTab('financeiro');
    setIsMobileMenuOpen(false);
  };
  const [showPDVModal, setShowPDVModal] = useState(false);
  const [showHistoricalSalesModal, setShowHistoricalSalesModal] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [refreshCaixaSignal, setRefreshCaixaSignal] = useState(0);

  const [dateFilter, setDateFilter] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const dateFilterRef = useRef(dateFilter);
  const customStartDateRef = useRef(customStartDate);
  const customEndDateRef = useRef(customEndDate);
  useEffect(() => {
    dateFilterRef.current = dateFilter;
    customStartDateRef.current = customStartDate;
    customEndDateRef.current = customEndDate;
  }, [dateFilter, customStartDate, customEndDate]);

  
  
  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('role, permissions').eq('id', userId).maybeSingle();
      setUserRole(data?.role || null);
      if (data?.permissions && typeof data.permissions === 'object') {
        setUserPermissions(data.permissions);
      } else {
        setUserPermissions({});
      }
      setPerfilLido(true);
    };

    // CÓDIGO DE PURGE AUTOMÁTICO REMOVIDO PARA EVITAR EXCLUSÃO DE DADOS DE PRODUÇÃO

    const sessionTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      clearTimeout(sessionTimeout);
      console.warn("Erro ao obter sessão:", err);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(sessionTimeout);
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserPermissions({});
        setPerfilLido(false);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(sessionTimeout);
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!userRole || userRole === 'owner') return;

    const tabPermissionMap: Record<string, string> = {
      'visao-geral': 'ver_relatorios',
      'pedidos': 'ver_pedidos',
      'caixa': 'gerenciar_caixa',
      'gestao-cardapio': 'gerenciar_produtos',
      'categorias': 'gerenciar_categorias',
      'fichas-tecnicas': 'gerenciar_produtos',
      'relatorios': 'ver_relatorios',
      'clientes': 'ver_clientes',
      'avaliacoes': 'ver_clientes',
      'financeiro': 'acesso_financeiro_dono',
      'configuracoes': 'gerenciar_configuracoes',
      'usuarios': 'gerenciar_usuarios',
    };

    const requiredPerm = tabPermissionMap[activeTab];
    if (requiredPerm && !userPermissions[requiredPerm]) {
      if (userPermissions['ver_pedidos']) setActiveTab('pedidos');
      else if (userPermissions['gerenciar_caixa']) setActiveTab('caixa');
      else if (userPermissions['gerenciar_produtos']) setActiveTab('gestao-cardapio');
      else setActiveTab('pedidos');
    }
  }, [userRole, userPermissions, activeTab]);

  useEffect(() => {
    const loadStoreStatus = async () => {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['manual_store_closed', 'store_status', 'paused_until']);
      const getVal = (k: string) => data?.find(d => d.key === k)?.value;
      
      setManualClosed(getVal('manual_store_closed') === true);
      setStoreStatus(getVal('store_status') || 'open');
      setPausedUntil(getVal('paused_until') || null);
    };
    loadStoreStatus();
  }, []);

  useEffect(() => {
    const loadAdminLogo = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    };
    loadAdminLogo();
  }, []);

  const handleStoreAction = async (action: 'open' | 'pause_30m' | 'pause_1h' | 'pause_2h' | 'close') => {
    setShowStoreMenu(false);
    
    if (action === 'open' && !dashboardData?.activeSessionId) {
      alert("⚠️ Você precisa ABRIR O CAIXA primeiro (na aba 'Caixa') antes de abrir a loja para receber pedidos.");
      setActiveTab('caixa');
      return;
    }

    let newStatus = 'open';
    let newPausedUntil = null;
    let newManualClosed = false;

    if (action.startsWith('pause_')) {
      newStatus = 'paused';
      const now = new Date();
      if (action === 'pause_30m') now.setMinutes(now.getMinutes() + 30);
      else if (action === 'pause_1h') now.setHours(now.getHours() + 1);
      else if (action === 'pause_2h') now.setHours(now.getHours() + 2);
      newPausedUntil = now.toISOString();
    } else if (action === 'close') {
      newStatus = 'closed';
      newManualClosed = true;
      setActiveTab('caixa'); // Redireciona para o caixa no fim do dia
    }

    setStoreStatus(newStatus as 'open'|'paused'|'closed');
    setPausedUntil(newPausedUntil);
    setManualClosed(newManualClosed);

    await supabase.from('settings').upsert([
      { key: 'store_status', value: newStatus, updated_at: new Date().toISOString() },
      { key: 'paused_until', value: newPausedUntil || '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: newManualClosed, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });
  };
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchDashboardData();
  }, [isAuthenticated, dateFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    // Supabase Realtime para sincronização instantânea de pedidos entre telas e abas
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDashboardData(true);
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordChangeMessage("Senha alterada com sucesso!");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordChangeMessage("");
      }, 2000);
    } catch (err: any) {
      setPasswordChangeMessage("Erro ao alterar a senha: " + err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const trimmedUser = username.trim().toLowerCase();
      const pass = password.trim();

      let email = trimmedUser;
      if (trimmedUser === 'admin' || trimmedUser === 'maisacai') {
        email = 'admin@maisacai.com';
      } else if (!email.includes('@')) {
        email = email + '@maisacai.com';
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      if (error) throw error;
      // isAuthenticated, userRole e isLoading são atualizados automaticamente
      // pelo listener onAuthStateChange configurado acima.
    } catch (err) {
      console.error(err);
      setLoginError("Credenciais inválidas ou erro de conexão");
      setIsLoading(false);
    }
  };

  const togglePauseCategory = async (categoryGroup: string[], isPaused: boolean) => {
    try {
      const itemsInCategory = menuItems.filter(item => categoryGroup.includes(item.category));
      const itemIds = itemsInCategory.map(i => i.id);
            
      if (!isPaused) {
        const toInsert = itemIds.map(id => ({ id, paused_at: new Date().toISOString() }));
        const { error } = await supabase.from('paused_items').upsert(toInsert, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('paused_items').delete().in('id', itemIds);
        if (error) throw error;
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle category pause status", err);
      alert("Erro ao pausar categoria: " + err.message);
    }
  };

  const togglePauseItem = async (itemId: string) => {
    try {
      const isPaused = pausedItems.includes(itemId);
      if (isPaused) {
        const { error } = await supabase.from('paused_items').delete().eq('id', itemId);
        if (error) throw error;
        await supabase.from('extras').update({ is_active: true }).eq('id', itemId);
      } else {
        const { error } = await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
        if (error) throw error;
        await supabase.from('extras').update({ is_active: false }).eq('id', itemId);
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle item pause status", err);
      alert("Erro ao pausar item: " + err.message);
    }
  };


  const handleExportCSV = () => {
    if (!allOrders || allOrders.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }
    const orders = allOrders;
    
    const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Pagamento', 'Total', 'Status'];
    const rows = orders.map((o: any) => [
      o.id,
      (safeGetDate(o.createdAt) || new Date()).toLocaleString('pt-BR').replace(/,/g, ''),
      `"${o.customerName || ''}"`,
      o.customerPhone || '',
      o.orderType,
      o.paymentMethod,
      (Number(o.totalAmount) || 0).toFixed(2),
      o.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Menu lateral (mesmas permissões de antes, agrupado por tarefa) ──────────
  const pedidosNovos = (dashboardData?.recentOrders || []).filter((o: any) => o.status === 'Pendente').length;
  const verCardapio = hasPermission('gerenciar_produtos') || hasPermission('gerenciar_categorias');
  const gruposMenu: { titulo: string; itens: { id: string; rotulo: string; Icone: any; mostrar: boolean; badge?: number; palavras?: string }[] }[] = [
    {
      titulo: 'Operação',
      itens: [
        { id: 'visao-geral', rotulo: 'Visão geral', Icone: LayoutDashboard, mostrar: hasPermission('ver_relatorios'), palavras: 'inicio dashboard resumo' },
        { id: 'pedidos', rotulo: 'Pedidos', Icone: ShoppingBag, mostrar: hasPermission('ver_pedidos'), badge: pedidosNovos, palavras: 'comandas delivery' },
        { id: 'cozinha-kds', rotulo: 'Cozinha (KDS)', Icone: ChefHat, mostrar: hasPermission('ver_pedidos'), palavras: 'kds bancada producao preparo montagem tempo' },
        { id: 'motoboys', rotulo: 'Motoboys & Entregas', Icone: Bike, mostrar: hasPermission('ver_pedidos'), palavras: 'entregador motoboy acerto corrida rota frete' },
        { id: 'caixa', rotulo: 'Caixa', Icone: CreditCard, mostrar: hasPermission('gerenciar_caixa'), palavras: 'abrir fechar turno sangria' },
        { id: 'despesas', rotulo: 'Despesas', Icone: TrendingDown, mostrar: hasPermission('gerenciar_caixa'), palavras: 'gastos contas' },
      ],
    },
    {
      titulo: 'Clientes e vendas',
      itens: [
        { id: 'clientes', rotulo: 'Clientes', Icone: Users, mostrar: hasPermission('ver_clientes'), palavras: 'cashback fidelidade' },
        { id: 'avaliacoes', rotulo: 'Avaliações', Icone: Star, mostrar: hasPermission('ver_clientes'), palavras: 'estrelas notas comentarios nps feedback' },
        { id: 'relatorios', rotulo: 'Relatórios', Icone: BarChart3, mostrar: hasPermission('ver_relatorios'), palavras: 'vendas faturamento' },
        { id: 'funil', rotulo: 'Funil de vendas', Icone: Filter, mostrar: hasPermission('ver_relatorios'), palavras: 'acessos conversao' },
      ],
    },
    {
      titulo: 'Cardápio',
      itens: [
        { id: 'gestao-cardapio', rotulo: 'Produtos', Icone: Package, mostrar: hasPermission('gerenciar_produtos'), palavras: 'pausar preco sabores cremes' },
        { id: 'categorias', rotulo: 'Categorias', Icone: FolderTree, mostrar: hasPermission('gerenciar_categorias') },
        { id: 'fichas-tecnicas', rotulo: 'Ficha técnica e CMV', Icone: Layers, mostrar: hasPermission('gerenciar_produtos'), palavras: 'insumos custo' },
        { id: 'banner-promocional', rotulo: 'Banner promocional', Icone: Megaphone, mostrar: verCardapio, palavras: 'promocao popup' },
      ],
    },
    {
      titulo: 'Gestão',
      itens: [
        { id: 'financeiro', rotulo: 'Financeiro', Icone: Wallet, mostrar: isOwner, badge: alertasContabeis.length, palavras: 'dre contabil custos' },
        { id: 'configuracoes', rotulo: 'Configurações', Icone: Settings, mostrar: hasPermission('gerenciar_configuracoes'), palavras: 'horario impressora entrega' },
        { id: 'agente-ia', rotulo: 'Agente IA', Icone: BotMessageSquare, mostrar: hasPermission('gerenciar_configuracoes'), palavras: 'whatsapp robo atendimento' },
        { id: 'usuarios', rotulo: 'Usuários e acesso', Icone: Shield, mostrar: hasPermission('gerenciar_usuarios'), palavras: 'funcionarios senha permissoes' },
      ],
    },
  ];
  const itensMenu = gruposMenu.flatMap(g => g.itens.filter(i => i.mostrar).map(i => ({ ...i, grupo: g.titulo })));
  const atalhoDoItem = (id: string) => {
    const n = itensMenu.findIndex(i => i.id === id);
    return n >= 0 && n < 9 ? `Alt ${n + 1}` : undefined;
  };

  const [paletaAberta, setPaletaAberta] = useState(false);
  const podePDV = hasPermission('ver_pedidos');
  const comandosPaleta: ComandoPaleta[] = [
    ...(podePDV ? [{ id: 'acao-pdv', rotulo: 'Nova venda no balcão (PDV)', grupo: 'Ações', Icone: Plus, atalho: 'F2', palavras: 'pedido venda balcao', acao: () => setShowPDVModal(true) }] : []),
    ...itensMenu.map(i => ({ id: `ir-${i.id}`, rotulo: i.rotulo, grupo: i.grupo, Icone: i.Icone, atalho: atalhoDoItem(i.id), palavras: i.palavras, acao: () => setActiveTab(i.id) })),
    { id: 'acao-sair', rotulo: 'Sair do sistema', grupo: 'Conta', Icone: LogOut, palavras: 'logout', acao: () => handleLogout() },
  ];

  // Estado mais recente para os atalhos de teclado (sem recriar o listener)
  const atalhosRef = useRef({ itensMenu, podePDV });
  atalhosRef.current = { itensMenu, podePDV };

  // Visual do gestor (classe usada no index.css) só enquanto o gestor está aberto
  useEffect(() => {
    document.documentElement.classList.add('admin-ui');
    return () => document.documentElement.classList.remove('admin-ui');
  }, []);

  // Atalhos: Ctrl+K paleta · F2 nova venda · / buscar na tela · Alt+1…9 telas
  useEffect(() => {
    if (!isAuthenticated) return;
    const digitando = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      const { itensMenu: itens, podePDV: pdv } = atalhosRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletaAberta(v => !v);
        return;
      }
      if (e.key === 'F2' && pdv) {
        e.preventDefault();
        setShowPDVModal(true);
        return;
      }
      if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
        const item = itens[Number(e.key) - 1];
        if (item) {
          e.preventDefault();
          setActiveTab(item.id);
        }
        return;
      }
      if (e.key === '/' && !digitando(e.target) && !e.ctrlKey && !e.metaKey) {
        const campo = document.querySelector<HTMLInputElement>('main input[type="search"], main input[placeholder*="Buscar"], main input[placeholder*="buscar"]');
        if (campo) {
          e.preventDefault();
          campo.focus();
          campo.select();
        }
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDashboardData(null);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
    } catch (err) {
      console.error("Failed to update status", err);
      console.error("Failed to update status", err);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f7f2fb] text-[#6a2092] font-medium">Carregando...</div>;
  }

  if (isAuthenticated && perfilLido && !userRole) {
    return (
      <div className="min-h-screen bg-[#f7f2fb] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#ece1f5] w-full max-w-md text-center">
          <h1 className="text-xl font-black text-[#4d0471] mb-2">Acesso ainda não liberado</h1>
          <p className="text-sm text-stone-600 mb-6">Este login não tem perfil de acesso no gestor. Peça ao responsável pela loja para liberar o seu usuário em Usuários e acesso.</p>
          <button onClick={handleLogout} className="w-full rounded-xl bg-[#6a2092] px-4 py-3 text-sm font-bold text-white hover:bg-[#5a1a7d]">Sair</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f7f2fb] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#ece1f5] w-full max-w-md">
          <div className="flex justify-center mb-5">
            <img src="/logo.png" alt="Mais Açaí" className="w-20 h-20 rounded-full object-cover border border-[#ece1f5] shadow-xs" />
          </div>
          <h1 className="text-2xl font-black text-center text-[#4d0471] mb-1">Gestor Mais Açaí</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Entre com seu usuário e senha.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#6a2092]/20 focus:border-transparent outline-none transition-all"
                placeholder="Ex: admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#6a2092]/20 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
            
            <button
              type="submit"
              className="w-full bg-[#6a2092] text-white font-bold py-3 rounded-xl hover:bg-[#521872] transition-colors mt-2"
            >
              Entrar no Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

    const categoriesUI = [
    {
      id: "promocoes",
      label: "PROMOÇÕES DO DIA",
      group: ["promocoes"],
    },
    {
      id: "tradicionais",
      label: "TRADICIONAIS",
      group: ["tradicionais"],
    },
    {
      id: "especiais",
      label: "ESPECIAIS",
      group: ["especiais"],
    },
    {
      id: "gourmet",
      label: "GOURMET",
      group: ["gourmet"],
    },
    {
      id: "vegetarianas",
      label: "VEGETARIANA",
      group: ["vegetarianas"],
    },
    {
      id: "doces",
      label: "DOCES",
      group: ["doces"],
    },
    {
      id: "esfihas",
      label: "ESFIHAS",
      group: [
        "esfihas-salgadas-tradicionais",
        "esfihas-salgadas-especiais",
        "esfihas-doces",
      ],
    },
    {
      id: "bebidas",
      label: "BEBIDAS",
      group: ["bebidas"],
    },
    {
      id: "cafe",
      label: "CAFÉ ☕",
      group: ["cafe"],
    },
    {
      id: "bordas",
      label: "BORDAS",
      group: ["bordas"],
    }
  ];

    const currentCategoriesUI = dbCategories && dbCategories.length > 0 && !usingFallback 
    ? dbCategories.map(cat => ({
       id: cat.id,
       label: cat.name.toUpperCase(),
       sub: "",
       group: [cat.id]
    }))
    : categoriesUI;

    if (!currentCategoriesUI.find(cat => cat.id === 'bordas')) {
      currentCategoriesUI.push({
        id: "bordas",
        label: "BORDAS 🧀",
        group: ["bordas"]
      } as any);
    }
  const itemsByCategory: Record<string, any[]> = {};
  currentCategoriesUI.forEach(cat => {
    itemsByCategory[cat.id] = menuItems.filter(item => cat.group.includes(item.category));
  });

  const { totalRevenue: faturamentoBruto = 0, totalOrders: totalPedidos = 0, ticketMedio = 0, uniqueCustomers = 0, paymentMethodsData = [], chartData = {} } = dashboardData || {};
  const salesData = chartData.allDaysVolumeData || [];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-[#2d0a42] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40 md:hidden w-full no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-white/10 text-white/75 hover:bg-white/10 transition-colors border border-white/10"
            aria-label="Abrir Menu Admin"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight leading-none">Mais Açaí</h2>
            <span className="text-[10px] text-white/60 font-mono uppercase tracking-wider">
              {activeTab === 'visao-geral' && 'Visão Geral'}
              {activeTab === 'pedidos' && 'Pedidos'}
              {activeTab === 'cozinha-kds' && 'Cozinha (KDS)'}
              {activeTab === 'motoboys' && 'Motoboys & Entregas'}
              {activeTab === 'caixa' && 'Caixa'}
              {activeTab === 'despesas' && 'Despesas'}
              {activeTab === 'relatorios' && 'Relatórios'}
              {activeTab === 'funil' && 'Funil de vendas'}
              {activeTab === 'clientes' && 'Clientes'}
              {activeTab === 'gestao-cardapio' && 'Produtos'}
              {activeTab === 'categorias' && 'Categorias'}
              {activeTab === 'fichas-tecnicas' && 'Ficha Técnica & CMV'}
              {activeTab === 'financeiro' && 'Financeiro'}
              {activeTab === 'banner-promocional' && 'Banner promocional'}
              {activeTab === 'configuracoes' && 'Configurações'}
              {activeTab === 'usuarios' && 'Usuários'}
              {activeTab === 'agente-ia' && 'Agente IA'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono font-semibold text-white/75">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              checked={autoPrint}
              onChange={toggleAutoPrint}
            />
            <span className="hidden sm:inline">Auto-Imprimir</span>
            <Printer size={14} className="sm:hidden text-white/60" />
          </label>
        </div>
      </header>

      {/* Mobile Sidebar Modal Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative bg-[#2d0a42] w-72 max-w-[85vw] h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Mais Açaí</h2>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider font-mono mt-0.5">Açaí · Desde 2016</p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("visao-geral"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'visao-geral' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                  >
                    Visão Geral
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab("pedidos"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'pedidos' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                >
                  Pedidos
                </button>
                <button 
                  onClick={() => { setActiveTab("cozinha-kds"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'cozinha-kds' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                >
                  Cozinha (KDS)
                </button>
                <button 
                  onClick={() => { setActiveTab("motoboys"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'motoboys' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                >
                  Motoboys & Entregas
                </button>
                <button 
                  onClick={() => { setActiveTab("caixa"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'caixa' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                >
                  Caixa
                </button>
                <button 
                  onClick={() => { setActiveTab("despesas"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'despesas' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                >
                  Despesas
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'relatorios' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                  >
                    Relatórios
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("funil"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'funil' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                  >
                    Funil de Vendas
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'clientes' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                  >
                    Clientes
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => { setActiveTab("financeiro"); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'financeiro' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                  >
                    Financeiro
                    {alertasContabeis.length > 0 && <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-bold leading-4 text-[#3d0a5c]" title="Obrigações contábeis pendentes">{alertasContabeis.length}</span>}
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => { setShowHistoricalSalesModal(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-colors text-amber-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Calendar size={14} className="text-amber-400" />
                      Histórico 2020-2026
                    </span>
                    <span className="text-[9px] font-black uppercase bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                      POS
                    </span>
                  </button>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <p className="px-3 text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider mb-1">Cardápio</p>
                    <button 
                      onClick={() => { setActiveTab("gestao-cardapio"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'gestao-cardapio' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                    >
                      Produtos
                    </button>
                    <button 
                      onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'categorias' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                    >
                      Categorias
                    </button>
                    {hasPermission('gerenciar_produtos') && (
                      <button
                        onClick={() => { setActiveTab("fichas-tecnicas"); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'fichas-tecnicas' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                      >
                        Ficha Técnica & CMV
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveTab("banner-promocional"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'banner-promocional' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                    >
                      Banner Promocional
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <p className="px-3 text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider mb-1">Sistema</p>
                    <button 
                      onClick={() => { setActiveTab("configuracoes"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'configuracoes' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                    >
                      Configurações
                    </button>
                    <button 
                      onClick={() => { setActiveTab("usuarios"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'usuarios' ? 'bg-white text-[#4d0471] font-bold shadow-xs' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                    >
                      Usuários
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-1.5 font-mono text-xs">
              <button
                onClick={() => { setIsPasswordModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-white/80 hover:bg-white/10 transition-colors"
              >
                <Key size={15} /> Alterar Senha
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-rose-300 hover:bg-white/10 transition-colors"
              >
                <LogOut size={15} /> Sair do Painel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans no-print">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2a0a3f] text-white/80 flex-col hidden md:flex sticky top-0 h-screen overflow-hidden shrink-0 select-none">
        {/* Marca */}
        <div className="px-4 pt-4 pb-3 [@media(max-height:820px)]:pt-3 [@media(max-height:820px)]:pb-2 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 [@media(max-height:820px)]:w-9 [@media(max-height:820px)]:h-9 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-sm">
            <img src={adminLogoUrl || "/logo.png"} alt="Mais Açaí" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[16px] font-extrabold text-white leading-tight truncate">Mais Açaí</p>
            <p className="text-[12px] text-white/50 leading-tight mt-0.5">Gestor da loja</p>
          </div>
        </div>

        {/* Status da loja */}
        <div className="px-3 pb-2 relative shrink-0">
          <button
            onClick={() => setShowStoreMenu(!showStoreMenu)}
            className={`w-full h-9 px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-semibold transition-colors cursor-pointer border ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-500/10 text-rose-200 border-rose-400/30 hover:bg-rose-500/20' :
              storeStatus === 'paused' ? 'bg-amber-500/10 text-amber-200 border-amber-400/30 hover:bg-amber-500/20' :
              'bg-emerald-500/10 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-400' :
              storeStatus === 'paused' ? 'bg-amber-400' :
              'bg-emerald-400'
            } animate-pulse`} />
            {storeStatus === 'closed' || manualClosed ? 'Loja fechada' :
             storeStatus === 'paused' ? 'Loja pausada' : 'Loja aberta'}
            <ChevronDown size={16} className="ml-auto opacity-60" />
          </button>

          {showStoreMenu && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden py-1.5 text-stone-700">
              {(storeStatus === 'closed' || manualClosed || storeStatus === 'paused') ? (
                <button
                  onClick={() => handleStoreAction('open')}
                  className="w-full text-left h-10 px-3.5 text-[14px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  Abrir loja agora
                </button>
              ) : (
                <>
                  <p className="px-3.5 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Pausa temporária</p>
                  <button onClick={() => handleStoreAction('pause_30m')} className="w-full text-left h-9 px-3.5 text-[14px] hover:bg-stone-50 transition-colors cursor-pointer">Pausar por 30 min</button>
                  <button onClick={() => handleStoreAction('pause_1h')} className="w-full text-left h-9 px-3.5 text-[14px] hover:bg-stone-50 transition-colors cursor-pointer">Pausar por 1 hora</button>
                  <button onClick={() => handleStoreAction('pause_2h')} className="w-full text-left h-9 px-3.5 text-[14px] hover:bg-stone-50 transition-colors cursor-pointer">Pausar por 2 horas</button>
                  <div className="my-1.5 border-t border-stone-100" />
                  <button
                    onClick={() => handleStoreAction('close')}
                    className="w-full text-left h-10 px-3.5 text-[14px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Encerrar o dia (caixa)
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Buscar ou ir para (Ctrl+K) */}
        <div className="px-3 pb-3 [@media(max-height:820px)]:pb-2 shrink-0">
          <button
            onClick={() => setPaletaAberta(true)}
            className="w-full h-9 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white/80 text-[13px] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Search size={16} />
            Buscar ou ir para…
            <kbd className="ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-white/10 text-white/60">Ctrl K</kbd>
          </button>
        </div>

        {/* Menu */}
        <nav className="adm-nav flex-1 overflow-y-auto px-3 pb-2 space-y-3 [@media(max-height:820px)]:space-y-2" aria-label="Menu do gestor">
          {gruposMenu.map(g => {
            const visiveis = g.itens.filter(i => i.mostrar);
            if (visiveis.length === 0) return null;
            return (
              <div key={g.titulo}>
                <p className="px-3 mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 [@media(max-height:720px)]:hidden">{g.titulo}</p>
                <div className="space-y-px">
                  {visiveis.map(i => {
                    const ativo = activeTab === i.id;
                    const atalho = atalhoDoItem(i.id);
                    return (
                      <button
                        key={i.id}
                        onClick={() => setActiveTab(i.id)}
                        title={atalho ? `${i.rotulo} (${atalho.replace(' ', '+')})` : i.rotulo}
                        aria-current={ativo ? 'page' : undefined}
                        className={`group w-full h-9 [@media(max-height:820px)]:h-8 px-3 rounded-lg flex items-center gap-3 text-[14px] [@media(max-height:820px)]:text-[13px] transition-colors cursor-pointer ${
                          ativo ? 'bg-white text-[#3b0257] font-semibold shadow-sm' : 'text-white/75 font-medium hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <i.Icone size={18} className={ativo ? 'text-[#6a2092]' : 'text-white/50 group-hover:text-white/80'} />
                        <span className="truncate">{i.rotulo}</span>
                        {i.badge ? (
                          <span className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${i.id === 'pedidos' ? 'bg-[#fdde58] text-[#2a0a3f]' : 'bg-amber-400 text-[#2a0a3f]'}`}>
                            {i.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-2 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full h-9 [@media(max-height:820px)]:h-8 px-3 rounded-lg flex items-center gap-3 text-[14px] font-medium text-white/60 hover:text-rose-200 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Sair do sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 px-4 md:px-8 min-h-[100dvh] relative overflow-y-auto ${
        ['despesas', 'relatorios', 'caixa', 'funil', 'visao-geral', 'pedidos'].includes(activeTab) 
          ? 'pt-4 pb-4 flex flex-col' 
          : activeTab === 'agente-ia'
            ? 'pt-2 md:pt-3 pb-4'
            : 'pt-2 md:pt-4 pb-8'
      }`}>
        {activeTab !== 'financeiro' && alertasContabeis.length > 0 && (
          <div className="max-w-7xl mx-auto w-full mb-3">
            <BannerContabil lista={alertasContabeis} onAbrir={abrirAgendaContabil} />
          </div>
        )}

        <div className={`max-w-7xl mx-auto w-full ${
          ['despesas', 'relatorios', 'caixa', 'funil', 'visao-geral', 'pedidos'].includes(activeTab) 
            ? 'flex-1 flex flex-col min-h-0' 
            : activeTab === 'agente-ia'
              ? 'space-y-3'
              : 'space-y-4'
        }`}>


          {/* Header Section (Only for Non-Cockpit Views) */}
          {!['despesas', 'relatorios', 'funil', 'visao-geral', 'pedidos', 'agente-ia'].includes(activeTab) && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-1">
              <h1 className="font-display text-[24px] font-extrabold tracking-tight text-stone-900 leading-tight">
                {PAGE_TITLES[activeTab]?.title || 'Painel'}
              </h1>
              <p className="text-[14px] text-stone-500">
                {PAGE_TITLES[activeTab]?.subtitle || ''}
              </p>
            </div>
          )}

        {autoPrint && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Impressão Automática Ativada!</p>
              <p>Cada pedido novo sai sozinho na impressora padrão do computador. Deixe esta aba do gestor aberta. Para não aparecer a janela de confirmação, abra o gestor pelo atalho do Chrome com <b>--kiosk-printing</b> (térmica 80mm como impressora padrão do Windows).</p>
            </div>
          </div>
        )}
        
        
        {activeTab === "usuarios" && hasPermission('gerenciar_usuarios') && (
          <div className="mt-1">
            <UsersManager />
          </div>
        )}

        {activeTab === "categorias" && hasPermission('gerenciar_categorias') && (
          <div className="mt-1">
            <CategoryManager />
          </div>
        )}

        {activeTab === "fichas-tecnicas" && hasPermission('gerenciar_produtos') && (
          <div className="mt-1">
            <RecipeManager menuItems={menuItems} />
          </div>
        )}

        {activeTab === "financeiro" && isOwner && (
          <div className="mt-1">
            <FinanceiroManager
              key={entradaFinanceiro.chave}
              abaInicial={entradaFinanceiro.contabil ? 'contabil' : undefined}
              secaoInicial={entradaFinanceiro.contabil ? 'obrigacoes' : undefined}
            />
          </div>
        )}

        {activeTab === "clientes" && hasPermission('ver_clientes') && (
          <div className="mt-1">
            <CustomersManager />
          </div>
        )}

        {activeTab === "avaliacoes" && hasPermission('ver_clientes') && (
          <div className="mt-1">
            <ReviewsManager />
          </div>
        )}

        {/* FUNIL DE VENDAS */}
        {activeTab === "funil" && (
          <div className="mt-1">
            <SalesFunnelManager onNavigateToTab={(t) => setActiveTab(t)} />
          </div>
        )}

        {/* COZINHA KDS */}
        {activeTab === "cozinha-kds" && hasPermission('ver_pedidos') && (
          <div className="mt-1">
            <KitchenDisplay />
          </div>
        )}

        {/* MOTOBOYS & ENTREGAS */}
        {activeTab === "motoboys" && hasPermission('ver_pedidos') && (
          <div className="mt-1">
            <MotoboyManager />
          </div>
        )}

        {/* DESPESAS */}
        {activeTab === "despesas" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <ExpensesManager 
              expenses={expenses}
              onExpenseChange={fetchDashboardData}
            />
          </div>
        )}

        {activeTab === "caixa" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <CaixaManager />
          </div>
        )}

        
        {activeTab === "configuracoes" && hasPermission('gerenciar_configuracoes') && (
          <div className="mt-1">
            <SettingsManager 
              onTestPrint={handlePrintOrder}
              autoPrint={autoPrint}
              onToggleAutoPrint={toggleAutoPrint}
              onExportCSV={handleExportCSV}
              onChangePassword={() => setIsPasswordModalOpen(true)}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onTestSound={playNotificationSound}
            />
          </div>
        )}

        {activeTab === "gestao-cardapio" && hasPermission('gerenciar_produtos') && (
          <div className="mt-1">
             <MenuManager />
          </div>
        )}

        {activeTab === "banner-promocional" && (
          <div className="mt-1">
            <BannerManager />
          </div>
        )}
  
        {/* Agente IA Tab */}
        {activeTab === "agente-ia" && hasPermission('gerenciar_configuracoes') && (
          <div className="mt-1">
            <AgentManager />
          </div>
        )}

        {/* Visão Geral Tab */}
        {activeTab === "visao-geral" && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">

            {/* Filtro de Período - Visão Geral */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-3 py-2 shadow-2xs gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono font-bold text-stone-700 uppercase tracking-wider">
                  Visão Geral
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {/* Toggle cockpit / grade */}
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                  <button
                    onClick={() => setOverviewViewMode('cockpit')}
                    title="Modo Cockpit"
                    className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      overviewViewMode === 'cockpit'
                        ? 'bg-[#6a2092] text-white shadow-xs border border-[#521872]'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Layers size={10} />
                    Cockpit
                  </button>
                  <button
                    onClick={() => setOverviewViewMode('grid')}
                    title="Modo Grade"
                    className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      overviewViewMode === 'grid'
                        ? 'bg-[#6a2092] text-white shadow-xs border border-[#521872]'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <BarChart3 size={10} />
                    Grade
                  </button>
                </div>
                <PeriodFilterCompact
                  value={dateFilter as any}
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onChange={(res) => {
                    setDateFilter(res.period);
                    dateFilterRef.current = res.period;
                    if (res.startDate) {
                      setCustomStartDate(res.startDate);
                      customStartDateRef.current = res.startDate;
                    }
                    if (res.endDate) {
                      setCustomEndDate(res.endDate);
                      customEndDateRef.current = res.endDate;
                    }
                    fetchDashboardData(false, res.period);
                  }}
                  align="right"
                />
                <button
                  onClick={() => setShowHistoricalSalesModal(true)}
                  className="h-7 px-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#4d0471] transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-[11px] font-mono font-bold"
                  title="Acessar Histórico Completo de Vendas de 2020 a 2026"
                >
                  <Calendar size={12} className="text-[#6a2092]" />
                  <span>Histórico 2020-2026</span>
                </button>
                <button
                  onClick={() => fetchDashboardData()}
                  className="h-7 px-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-mono font-medium"
                  title="Atualizar dados"
                >
                  <RefreshCw size={11} className={isLoading ? 'animate-spin text-rose-600' : 'text-stone-400'} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* KPIs Grid - Compacto em 1 linha */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <KpiCard
                title="Faturamento Bruto"
                value={brl(faturamentoBruto)}
                icon={<DollarSign size={13} strokeWidth={1.5} className="text-emerald-600" />}
                trend={(dashboardData?.revenueChangePercent ?? 0) >= 0 ? `+${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.revenueChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.revenue) || []}
                sparklineColor="#15803D"
              />
              <KpiCard
                title="Ticket Médio"
                value={brl(ticketMedio)}
                icon={<CreditCard size={13} strokeWidth={1.5} className="text-stone-700" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#1D4ED8"
              />
              <KpiCard
                title="Total de Pedidos"
                value={totalPedidos.toString()}
                icon={<ShoppingBag size={13} strokeWidth={1.5} className="text-purple-600" />}
                trend={(dashboardData?.ordersChangePercent ?? 0) >= 0 ? `+${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.ordersChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#7C3AED"
              />
              <KpiCard
                title="Novos Clientes"
                value={uniqueCustomers.toString()}
                icon={<Users size={13} strokeWidth={1.5} className="text-orange-600" />}
                trend="0%"
                trendUp={true}
                description="No período"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#B45309"
              />
            </div>

            {/* MODO COCKPIT (PRIMEIRO PLANO - SEM SCROLL) */}
            {overviewViewMode === 'cockpit' ? (
              <div className="flex-1 min-h-[340px] grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                {/* Coluna Principal: Gráfico Interativo com Dropdown de Métricas (cresce até o fim da tela) */}
                <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#6a2092]/10 border border-[#6a2092] flex items-center justify-center text-stone-900 shrink-0">
                        <Activity size={14} className="text-stone-900" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                          {overviewChartTab === 'faturamento' && 'Faturamento por Dia'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos Mais Vendidos'}
                          {overviewChartTab === 'pagamentos' && 'Distribuição por Método de Pagamento'}
                        </h2>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {overviewChartTab === 'faturamento' && 'Vendas diárias da semana (Segunda a Domingo)'}
                          {overviewChartTab === 'categorias' && 'Distribuição de receita por linha de produtos'}
                          {overviewChartTab === 'produtos' && 'Ranking dos itens com maior saída'}
                          {overviewChartTab === 'pagamentos' && 'Valores totais agrupados por forma de pagamento'}
                        </p>
                      </div>
                    </div>

                    {/* Seletor Compacto do Gráfico */}
                    <div className="relative shrink-0" ref={overviewChartDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsOverviewChartDropdownOpen(!isOverviewChartDropdownOpen)}
                        className="h-8 px-3 bg-white border border-stone-200 hover:border-stone-300 rounded-full text-xs font-semibold text-stone-800 flex items-center gap-2 shadow-2xs transition-all cursor-pointer select-none active:scale-[0.98]"
                      >
                        <span className="text-xs shrink-0">
                          {overviewChartTab === 'faturamento' && '📈'}
                          {overviewChartTab === 'categorias' && '🏷️'}
                          {overviewChartTab === 'produtos' && '🏆'}
                          {overviewChartTab === 'pagamentos' && '💳'}
                        </span>
                        <span className="font-sans text-xs font-bold text-stone-900 truncate">
                          {overviewChartTab === 'faturamento' && 'Faturamento por Dia'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos'}
                          {overviewChartTab === 'pagamentos' && 'Formas de Pagamento'}
                        </span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 shrink-0 ${isOverviewChartDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOverviewChartDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-stone-200 shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-0.5">
                            Métricas do Gráfico
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('faturamento'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'faturamento' ? 'bg-[#6a2092] text-white font-bold border border-[#521872]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📈</span>
                              <span>Faturamento por Dia</span>
                            </div>
                            {overviewChartTab === 'faturamento' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('categorias'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'categorias' ? 'bg-[#6a2092] text-white font-bold border border-[#521872]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏷️</span>
                              <span>Vendas por Categoria</span>
                            </div>
                            {overviewChartTab === 'categorias' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('produtos'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'produtos' ? 'bg-[#6a2092] text-white font-bold border border-[#521872]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏆</span>
                              <span>Top 5 Produtos</span>
                            </div>
                            {overviewChartTab === 'produtos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('pagamentos'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'pagamentos' ? 'bg-[#6a2092] text-white font-bold border border-[#521872]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>💳</span>
                              <span>Formas de Pagamento</span>
                            </div>
                            {overviewChartTab === 'pagamentos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área do Gráfico Calibrada para Primeiro Plano (sem scroll) */}
                  <div className="flex-1 min-h-[220px] w-full pt-1">
                    {overviewChartTab === 'faturamento' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }} 
                            dy={5}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}
                            tickFormatter={(value) => brl(value).replace(",00", "")}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                            formatter={(value: any, _name: any, item: any) => [
                              `${brl(Number(value))}${item?.payload?.orders !== undefined ? ` (${item.payload.orders} pedidos)` : ''}`,
                              'Vendas do Dia'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#6a2092"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={44}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {overviewChartTab === 'categorias' && (() => {
                      const categories = dashboardData?.chartData?.salesByCategory || [];
                      if (categories.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            Nenhum dado de categoria ainda
                          </div>
                        );
                      }
                      const maxValue = Math.max(...categories.map((c: any) => c.value || 1), 1);
                      return (
                        <div className="h-full flex flex-col justify-between py-1 px-1">
                          {categories.slice(0, 5).map((cat: any, index: number) => {
                            const pct = Math.min(100, Math.max(6, (cat.value / maxValue) * 100));
                            const color = CHART_COLORS[index % CHART_COLORS.length];
                            return (
                              <div key={`overview-cat-${index}`} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                      style={{ backgroundColor: color }}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="text-stone-800 font-bold text-[11px] sm:text-xs leading-snug">
                                      {cat.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                    {cat.qty !== undefined && cat.qty > 0 && (
                                      <span className="font-bold text-stone-900 tabular-nums">{cat.qty} un.</span>
                                    )}
                                    <span className="text-stone-500 font-bold tabular-nums">{brl(Number((cat.value || 0)))}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {overviewChartTab === 'produtos' && (() => {
                      const items = dashboardData?.popularItems || [];
                      if (items.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            Nenhum dado de produto ainda
                          </div>
                        );
                      }
                      const maxQty = Math.max(...items.map((i: any) => i.qty || 1), 1);
                      return (
                        <div className="h-full flex flex-col justify-between py-1 px-1">
                          {items.slice(0, 5).map((item: any, index: number) => {
                            const pct = Math.min(100, Math.max(6, (item.qty / maxQty) * 100));
                            const color = CHART_COLORS[index % CHART_COLORS.length];
                            return (
                              <div key={`overview-item-${index}`} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                      style={{ backgroundColor: color }}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="text-stone-800 font-medium text-[11px] sm:text-xs leading-snug">
                                      {formatItemNameForPrint({ name: item.name })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                    <span className="font-bold text-stone-900 tabular-nums">{item.qty} un.</span>
                                    <span className="text-stone-400 font-medium tabular-nums">{brl(Number((item.revenue || 0)))}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {overviewChartTab === 'pagamentos' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 12, right: 20, left: -5, bottom: 4 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fontWeight: 700, fill: '#3f3f46', fontFamily: 'Inter, system-ui, sans-serif' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any, _name: any, item: any) => [
                              `${brl(Number(value) || 0)}${item?.payload?.count !== undefined ? ` (${item.payload.count} pedidos)` : ''}`,
                              'Total'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Coluna Lateral: Resumo Compacto de Categorias e Favoritos dos Clientes */}
                <div className="flex flex-col gap-3 min-h-0">
                  {/* Top Categorias */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-100">
                      <div>
                        <h2 className="text-[14px] font-semibold text-stone-900 leading-tight">Categorias em destaque</h2>
                        <p className="text-[12px] text-stone-500">Mais vendidas no período</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                        <TrendingUp size={12} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                        <div className="text-center text-stone-400 text-[13px] py-2">Sem vendas no período.</div>
                      ) : (() => {
                        const cats = [...(dashboardData?.chartData?.salesByCategory || [])].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 4);
                        const maior = Math.max(...cats.map((c: any) => Number(c.value) || 0), 1);
                        return cats.map((cat: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center gap-2 text-[13px]">
                              <span className="text-stone-700 capitalize truncate">{String(cat.name || '').replace(/-/g, ' ')}</span>
                              <span className="font-semibold tabular-nums text-stone-900 shrink-0">{brl(Number((Number(cat.value) || 0)))}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(6, ((Number(cat.value) || 0) / maior) * 100)}%` }} />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Favoritos dos Clientes */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-100">
                      <div>
                        <h2 className="text-[14px] font-semibold text-stone-900 leading-tight">Favoritos dos clientes</h2>
                        <p className="text-[12px] text-stone-500">Mais pedidos no período</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                        <IceCream size={12} />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-around gap-1.5">
                      {(!(dashboardData?.popularItems || [])?.length) ? (
                        <div className="text-center text-stone-400 text-[13px] py-2">Nenhum item ainda.</div>
                      ) : (
                        (dashboardData?.popularItems || []).slice(0, 5).map((product: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-2 text-[13px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0 ${index === 0 ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
                                {index + 1}
                              </span>
                              <span className="font-medium text-stone-900 truncate" title={product.name}>
                                {formatItemNameForPrint({ name: product.name })}
                              </span>
                            </div>
                            <span className="font-semibold tabular-nums text-stone-900 shrink-0">
                              {brl(Number((Number(product.revenue) || 0)))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO GRADE COMPLETA (TODOS OS GRÁFICOS EXPANDIDOS) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Faturamento por Dia</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Vendas diárias da semana (Segunda a Domingo)</p>
                      </div>
                      <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                        <Activity size={16} className="text-stone-600" />
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }} tickFormatter={(value) => brl(value).replace(",00", "")} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                            formatter={(value: any, _name: any, item: any) => [
                              `${brl(Number(value))}${item?.payload?.orders !== undefined ? ` (${item.payload.orders} pedidos)` : ''}`,
                              'Vendas do Dia'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="revenue" fill="#6a2092" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Categorias em Destaque</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais vendidas</p>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                          <TrendingUp size={16} className="text-stone-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Sem dados.</div>
                        ) : (
                          [...(dashboardData?.chartData?.salesByCategory || [])].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 3).map((cat: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center gap-2">
                              <span className="text-xs font-mono text-stone-600 capitalize leading-snug">{String(cat.name || '').replace('-', ' ')}</span>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 shrink-0">{brl(Number((Number(cat.value) || 0)))}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Favoritos dos Clientes</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais pedidos</p>
                        </div>
                        <div className="p-1.5 bg-purple-50 rounded border border-purple-200">
                          <IceCream size={16} className="text-purple-700" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.popularItems || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Nenhum item registrado.</div>
                        ) : (
                          (dashboardData?.popularItems || []).slice(0, 3).map((product: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-[10px] font-mono font-bold text-stone-600 border border-stone-200 shrink-0">{index + 1}</span>
                                <span className="text-xs font-semibold text-stone-900 leading-snug" title={product.name}>{formatItemNameForPrint({ name: product.name })}</span>
                              </div>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 shrink-0">{brl(Number((Number(product.revenue) || 0)))}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Vendas por Categoria</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por receita</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      {(() => {
                        const categories = dashboardData?.chartData?.salesByCategory || [];
                        if (categories.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                              Nenhum dado de categoria ainda
                            </div>
                          );
                        }
                        const maxValue = Math.max(...categories.map((c: any) => c.value || 1), 1);
                        return (
                          <div className="h-full flex flex-col justify-between py-1 px-1">
                            {categories.slice(0, 5).map((cat: any, index: number) => {
                              const pct = Math.min(100, Math.max(6, (cat.value / maxValue) * 100));
                              const color = CHART_COLORS[index % CHART_COLORS.length];
                              return (
                                <div key={`exp-cat-${index}`} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        {index + 1}
                                      </span>
                                      <span className="text-stone-800 font-bold text-[11px] sm:text-xs leading-snug">
                                        {cat.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                      {cat.qty !== undefined && cat.qty > 0 && (
                                        <span className="font-bold text-stone-900 tabular-nums">{cat.qty} un.</span>
                                      )}
                                      <span className="text-stone-500 font-bold tabular-nums">{brl(Number((cat.value || 0)))}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%`, backgroundColor: color }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Top 5 Produtos</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Por volume de vendas</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      {(() => {
                        const items = dashboardData?.popularItems || [];
                        if (items.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                              Nenhum dado de produto ainda
                            </div>
                          );
                        }
                        const maxQty = Math.max(...items.map((i: any) => i.qty || 1), 1);
                        return (
                          <div className="h-full flex flex-col justify-between py-1 px-1">
                            {items.slice(0, 5).map((item: any, index: number) => {
                              const pct = Math.min(100, Math.max(6, (item.qty / maxQty) * 100));
                              const color = CHART_COLORS[index % CHART_COLORS.length];
                              return (
                                <div key={`exp-item-${index}`} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        {index + 1}
                                      </span>
                                      <span className="text-stone-800 font-medium text-[11px] sm:text-xs leading-snug">
                                        {formatItemNameForPrint({ name: item.name })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                      <span className="font-bold text-stone-900 tabular-nums">{item.qty} un.</span>
                                      <span className="text-stone-400 font-medium tabular-nums">{brl(Number((item.revenue || 0)))}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%`, backgroundColor: color }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Formas de Pagamento</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por método</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 12, right: 20, left: -5, bottom: 4 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fontWeight: 700, fill: '#3f3f46', fontFamily: 'Inter, system-ui, sans-serif' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any, _name: any, item: any) => [
                              `${brl(Number(value) || 0)}${item?.payload?.count !== undefined ? ` (${item.payload.count} pedidos)` : ''}`,
                              'Total'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pedidos Tab */}
        {activeTab === "pedidos" && (
          <div className="mt-1 space-y-3">
            {(() => {
              const allRecent = dashboardData?.recentOrders || [];
              const searchLower = ordersSearchTerm.toLowerCase().trim();

              const filteredList = allRecent.filter((o: any) => {
                if (ordersStatusFilter !== 'todos' && o.status !== ordersStatusFilter) {
                  return false;
                }
                if (searchLower) {
                  const idMatch = o.id?.toString().includes(searchLower);
                  const nameMatch = (o.customerName || '').toLowerCase().includes(searchLower);
                  const phoneMatch = (o.customerPhone || '').toLowerCase().includes(searchLower);
                  const addrMatch = (o.deliveryAddress || '').toLowerCase().includes(searchLower);
                  const nifMatch = (o.nif || '').toLowerCase().includes(searchLower);
                  const notesMatch = (o.notes || '').toLowerCase().includes(searchLower);
                  return idMatch || nameMatch || phoneMatch || addrMatch || nifMatch || notesMatch;
                }
                return true;
              });

              const countAll = allRecent.length;
              const countPendente = allRecent.filter((o: any) => o.status === 'Pendente').length;
              const countPreparo = allRecent.filter((o: any) => o.status === 'Em Preparo').length;
              const countEntrega = allRecent.filter((o: any) => o.status === 'Saiu para Entrega').length;
              const countFinalizado = allRecent.filter((o: any) => o.status === 'Finalizado').length;
              const countCancelado = allRecent.filter((o: any) => o.status === 'Cancelado').length;
              const countAtivos = countPendente + countPreparo + countEntrega;

              const filtrosStatus = [
                { id: 'todos', rotulo: 'Todos', n: countAll, cor: '' },
                { id: 'Pendente', rotulo: 'Pendentes', n: countPendente, cor: 'bg-amber-400' },
                { id: 'Em Preparo', rotulo: 'Em preparo', n: countPreparo, cor: 'bg-violet-500' },
                { id: 'Saiu para Entrega', rotulo: 'Em rota', n: countEntrega, cor: 'bg-sky-500' },
                { id: 'Finalizado', rotulo: 'Concluídos', n: countFinalizado, cor: 'bg-emerald-500' },
                { id: 'Cancelado', rotulo: 'Cancelados', n: countCancelado, cor: 'bg-rose-500' },
              ] as const;
              const COR_STATUS: Record<string, string> = {
                Pendente: 'bg-amber-50 text-amber-800 border-amber-200',
                'Em Preparo': 'bg-violet-50 text-violet-800 border-violet-200',
                'Saiu para Entrega': 'bg-sky-50 text-sky-800 border-sky-200',
                Finalizado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                Cancelado: 'bg-rose-50 text-rose-700 border-rose-200',
              };
              const totalPagPedidos = Math.max(1, Math.ceil(filteredList.length / pedidosPorPagina));
              const pagPedidos = Math.min(pedidosPagina, totalPagPedidos);
              const inicioPedidos = (pagPedidos - 1) * pedidosPorPagina;
              const pedidosDaPagina = filteredList.slice(inicioPedidos, inicioPedidos + pedidosPorPagina);
              const colunasComandas = typeof window !== 'undefined' ? (window.innerWidth >= 1280 ? 3 : window.innerWidth >= 768 ? 2 : 1) : 3;
              const porPaginaComandas = Math.max(1, fileirasComandas * colunasComandas);
              const totalPagComandas = Math.max(1, Math.ceil(filteredList.length / porPaginaComandas));
              const pagComandas = Math.min(pedidosPagina, totalPagComandas);
              const inicioComandas = (pagComandas - 1) * porPaginaComandas;
              const comandasDaPagina = filteredList.slice(inicioComandas, inicioComandas + porPaginaComandas);
              const modos = [
                { id: 'table', rotulo: 'Lista', Icone: List },
                { id: 'cards', rotulo: 'Comandas', Icone: LayoutGrid },
                { id: 'kanban', rotulo: 'Quadro', Icone: Columns3 },
              ] as const;

              return (
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] space-y-3">
                  {/* Topo: título, situação da cozinha, modo de visão e PDV */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="font-display text-[22px] font-extrabold tracking-tight text-stone-900 leading-none">Pedidos</h2>
                    {countAtivos > 0 ? (
                      <span className="h-7 px-2.5 rounded-full bg-amber-100 text-amber-900 text-[13px] font-semibold inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {countAtivos} em andamento
                      </span>
                    ) : (
                      <span className="h-7 px-2.5 rounded-full bg-emerald-50 text-emerald-700 text-[13px] font-semibold inline-flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Cozinha em dia
                      </span>
                    )}
                    <span className="text-[13px] text-stone-500">
                      <span className="font-semibold text-stone-800 tabular-nums">{countAll}</span> no período
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex items-center bg-stone-100 rounded-xl p-1" role="tablist" aria-label="Modo de visualização">
                        {modos.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            role="tab"
                            aria-selected={ordersViewMode === m.id}
                            onClick={() => setOrdersViewMode(m.id)}
                            className={`h-8 px-3 rounded-lg text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              ordersViewMode === m.id ? 'bg-white text-brand-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            <m.Icone size={15} />
                            <span>{m.rotulo}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowPDVModal(true)}
                        className="h-10 pl-3.5 pr-2.5 flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-[14px] font-semibold shadow-sm transition-colors cursor-pointer"
                        title="Nova venda no balcão (F2)"
                      >
                        <Plus size={16} className="stroke-[2.5]" />
                        <span>Nova venda</span>
                        <kbd className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-white/15 text-white/80">F2</kbd>
                      </button>
                    </div>
                  </div>

                  {/* Pedidos novos: aviso numa linha só */}
                  {countPendente > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 pl-3 pr-2 py-2">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <p className="text-[14px] text-amber-950">
                        <span className="font-semibold">
                          {countPendente === 1 ? '1 pedido novo aguardando confirmação' : `${countPendente} pedidos novos aguardando confirmação`}
                        </span>
                        <span className="text-amber-800 hidden md:inline"> · confirme para começar a montar os copos</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setOrdersStatusFilter('Pendente');
                          setOrdersViewMode('cards');
                        }}
                        className="ml-auto shrink-0 h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[13px] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        Atender agora <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* Filtros por status e busca */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {filtrosStatus.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setOrdersStatusFilter(f.id)}
                          aria-pressed={ordersStatusFilter === f.id}
                          className={`h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
                            ordersStatusFilter === f.id
                              ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300 hover:text-brand-700'
                          }`}
                        >
                          {f.cor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.cor}`} />}
                          {f.rotulo}
                          <span className={`text-[12px] tabular-nums ${ordersStatusFilter === f.id ? 'text-white/70' : 'text-stone-400'}`}>{f.n}</span>
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full md:w-72 md:ml-auto">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input
                        type="text"
                        value={ordersSearchTerm}
                        onChange={(e) => setOrdersSearchTerm(e.target.value)}
                        placeholder="Buscar nº, cliente ou telefone"
                        className="w-full h-9 pl-9 pr-8 bg-stone-50/70 border border-stone-200 rounded-xl text-[14px] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition"
                      />
                      {ordersSearchTerm && (
                        <button
                          onClick={() => setOrdersSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                          aria-label="Limpar busca"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estado Vazio */}
                  {filteredList.length === 0 && (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                      <ShoppingBag size={36} className="mb-2 opacity-40 text-stone-500" />
                      <p className="font-bold text-stone-700 text-sm">Nenhum pedido encontrado</p>
                      <p className="text-stone-500 font-mono text-xs mt-0.5 max-w-sm">
                        {ordersSearchTerm || ordersStatusFilter !== 'todos'
                          ? 'Tente ajustar os filtros ou o termo de busca para visualizar os pedidos.'
                          : 'Aguardando novos pedidos entrarem pelo cardápio digital ou balcão.'}
                      </p>
                      {(ordersSearchTerm || ordersStatusFilter !== 'todos') && (
                        <button
                          onClick={() => { setOrdersSearchTerm(''); setOrdersStatusFilter('todos'); }}
                          className="mt-3 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-mono font-bold transition-colors cursor-pointer border border-stone-200"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  )}

                  {/* VISUALIZAÇÃO EM CARDS (COMANDA OPERACIONAL DE ALTA USABILIDADE) */}
                  {ordersViewMode === 'cards' && filteredList.length > 0 && (
                    <div>
                    <div ref={comandasRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1 [@media(max-height:780px)]:max-h-[calc(100dvh-340px)] [@media(max-height:780px)]:overflow-y-auto [@media(max-height:780px)]:pr-1 adm-rolagem">
                      {comandasDaPagina.map((order: any) => {
                        const dataCriacao = order.createdAt || order.created_at;
                        const elapsed = getElapsedTime(dataCriacao);
                        const isDelivery = order.orderType === 'entrega' || order.orderType === 'Delivery';
                        const items = safeParseItems(order.items);
                        const isPending = order.status === 'Pendente';
                        const isInPrep = order.status === 'Em Preparo';
                        const isInRoute = order.status === 'Saiu para Entrega';
                        const isDone = order.status === 'Finalizado';
                        const isCanceled = order.status === 'Cancelado';

                        // Cores de status de alta legibilidade para operação de cozinha/balcão
                        const statusColor = isPending
                          ? 'border-t-amber-400'
                          : isInPrep
                          ? 'border-t-amber-500'
                          : isInRoute
                          ? 'border-t-sky-500'
                          : isDone
                          ? 'border-t-emerald-500'
                          : 'border-t-rose-400';

                        return (
                          <div
                            key={order.id}
                            className={`bg-white rounded-xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden border-t-4 ${statusColor}`}
                          >
                            {/* Topo da Comanda: ID, Tipo de Pedido, Horário e Valor */}
                            <div className="p-3.5 pb-3 border-b border-stone-100 bg-stone-50/40 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
                                    #{order.id}
                                  </span>

                                  {/* Badge Tipo: Entrega vs Balcão */}
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                      isDelivery
                                        ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                        : 'bg-stone-100 text-stone-800 border border-stone-200'
                                    }`}
                                  >
                                    {isDelivery ? <Bike size={12} className="text-sky-600" /> : <Store size={12} className="text-stone-600" />}
                                    <span>{isDelivery ? 'Entrega' : 'Balcão'}</span>
                                  </span>

                                  {/* Badge Editado */}
                                  {(order.isEdited || order.is_edited) && (
                                    <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      EDITADO
                                    </span>
                                  )}
                                </div>

                                {/* Valor Total em Destaque */}
                                <div className="text-right">
                                  <span className="font-mono font-black text-lg text-stone-900 tabular-nums">
                                    {brl(Number(Number(order.totalAmount || 0)))}
                                  </span>
                                </div>
                              </div>

                              {/* Linha de Horário, Tempo Decorrido e Status */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                                  <Clock size={12} className="text-stone-400" />
                                  <span className="font-bold text-stone-700">
                                    {new Date(dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {order.status !== 'Finalizado' && order.status !== 'Cancelado' && elapsed.text && (
                                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                      {elapsed.text}
                                    </span>
                                  )}
                                </div>

                                {/* Tag de Status */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : isInPrep
                                      ? 'bg-[#6a2092] text-white border-[#6a2092]'
                                      : isInRoute
                                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                                      : isDone
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isPending
                                        ? 'bg-amber-500'
                                        : isInPrep
                                        ? 'bg-[#6a2092]'
                                        : isInRoute
                                        ? 'bg-sky-500'
                                        : isDone
                                        ? 'bg-emerald-600'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>{order.status}</span>
                                </span>
                              </div>
                            </div>

                            {/* Informações do Cliente e Pagamento */}
                            <div className="p-3.5 py-2.5 space-y-2 border-b border-stone-100">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-stone-900 text-sm truncate">{order.customerName}</span>
                                {order.customerPhone && (
                                  <a
                                    href={`tel:${order.customerPhone}`}
                                    className="text-stone-700 hover:text-stone-950 font-mono font-bold text-xs flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-200 transition-colors"
                                    title="Ligar para cliente"
                                  >
                                    <Phone size={11} className="text-stone-500" />
                                    <span>{order.customerPhone}</span>
                                  </a>
                                )}
                              </div>

                              {/* Endereço de Entrega Resumido & Limpo */}
                              {isDelivery && order.deliveryAddress && (
                                <div className="flex items-start gap-1.5 text-xs text-stone-700 bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                                  <MapPin size={13} className="text-sky-600 shrink-0 mt-0.5" />
                                  <div className="leading-snug">
                                    <span className="font-medium text-stone-800">{order.deliveryAddress}</span>
                                    {order.deliveryZone && (
                                      <span className="block text-[11px] font-bold text-sky-800 mt-0.5">
                                        Zona: {order.deliveryZone}
                                      </span>
                                    )}
                                    {(order as any).motoboy_name && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200 mt-1">
                                        <Bike size={12} className="text-purple-700" />
                                        Entregador: {(order as any).motoboy_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Pagamento e Troco */}
                              <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5 text-stone-600 font-mono">
                                  <CreditCard size={12} className="text-stone-400" />
                                  <span className="font-bold text-stone-800">{order.paymentMethod || 'Dinheiro'}</span>
                                  {order.nif && (
                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-1 rounded border border-stone-200">
                                      NIF: {order.nif}
                                    </span>
                                  )}
                                </div>

                                {order.changeFor && Number(order.changeFor) > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                    Troco p/ {brl(Number(Number(order.changeFor)))}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Comanda de Produção: Lista dos Itens com Alta Clareza */}
                            <div className="p-3.5 py-2.5 flex-1">
                              <div className="space-y-2">
                                {items.map((item: any, idx: number) => {
                                  const qty = item.quantity || item.qty || 1;
                                  const hasMultipleFlavors = (item.flavors && item.flavors.length > 0) || item.isMultiFlavor || item.type === 'pizza';
                                  const flavors = item.flavors || [];
                                  const itemPrice = Number(item.price || 0) * qty;

                                  return (
                                    <div key={idx} className="border-b border-stone-100 last:border-b-0 pb-1.5 last:pb-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                          {/* Quantidade em Destaque Real de Cozinha */}
                                          <span className="font-mono font-black text-white bg-[#6a2092] px-1.5 py-0.5 rounded text-xs shrink-0 border border-[#521872] shadow-2xs">
                                            {qty}x
                                          </span>
                                          <div className="min-w-0">
                                            <div className="font-black text-stone-900 text-xs sm:text-sm leading-snug">
                                              {item.name || 'Produto'}
                                            </div>

                                            {/* Sabores Meio a Meio */}
                                            {hasMultipleFlavors && flavors.length > 0 && (
                                              <div className="mt-1 space-y-0.5">
                                                {flavors.map((fl: any, fIdx: number) => {
                                                  const fraction = flavors.length === 2 ? '1/2' : flavors.length === 3 ? '1/3' : flavors.length === 4 ? '1/4' : '1/1';
                                                  const flName = typeof fl === 'string' ? fl : fl.name;
                                                  return (
                                                    <div key={fIdx} className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                                                      <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-800 px-1 rounded border border-stone-200">
                                                        {fraction}
                                                      </span>
                                                      <span className="truncate">{flName}</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* Borda Recheada */}
                                            {(item.crust || item.borda) && (
                                              <div className="text-[11px] text-amber-900 font-bold mt-0.5 flex items-center gap-1">
                                                <span>🧀 Borda:</span>
                                                <span>{item.crust || item.borda}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Preço só é exibido se for maior que 0 (evita R$ 0.00 confuso de IA) */}
                                        {itemPrice > 0 && (
                                          <span className="font-mono text-stone-700 text-xs font-bold tabular-nums shrink-0">
                                            {brl(Number(itemPrice))}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Observação Geral com Alerta em Destaque */}
                              {order.notes && order.notes.trim() && (
                                <div className="mt-2.5 bg-amber-50 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-950 flex items-start gap-1.5">
                                  <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                                  <span className="break-words leading-tight">
                                    Obs: {order.notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rodapé do Card: Ações Operacionais */}
                            <div className="p-3 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                              {/* Botão de Avanço Rápido */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'Em Preparo')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#6a2092] hover:bg-[#521872] active:bg-[#4d0471] text-white font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-[#521872]"
                                >
                                  <Flame size={14} />
                                  <span>INICIAR PREPARO</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}

                              {isInPrep && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, isDelivery ? 'Saiu para Entrega' : 'Finalizado')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#6a2092] hover:bg-[#521872] active:bg-[#4d0471] text-white font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-stone-800"
                                >
                                  {isDelivery ? <Bike size={14} /> : <Check size={14} />}
                                  <span>{isDelivery ? 'DESPACHAR (MOTOBOY)' : 'FINALIZAR PEDIDO'}</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}

                              {isInRoute && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'Finalizado')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#6a2092] hover:bg-[#521872] active:bg-[#3b0257] text-white font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-stone-800"
                                >
                                  <Check size={14} className="text-white" />
                                  <span>CONCLUIR ENTREGA</span>
                                </button>
                              )}

                              {isDone && (
                                <div className="text-center py-1.5 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                                  ✓ PEDIDO CONCLUÍDO
                                </div>
                              )}

                              {isCanceled && (
                                <div className="text-center py-1.5 text-xs font-mono font-bold text-rose-800 bg-rose-50 rounded-lg border border-rose-200">
                                  ✕ PEDIDO CANCELADO
                                </div>
                              )}

                              {/* Linha de Atalhos: Mudar Status + Imprimir + Editar + Cancelar + Excluir */}
                              <div className="flex items-center justify-between gap-1 pt-1">
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className="text-[11px] font-mono font-bold px-2 py-1 bg-white rounded border border-stone-200 text-stone-800 cursor-pointer outline-none hover:bg-stone-50 transition-colors"
                                  title="Mudar status manualmente"
                                >
                                  <option value="Pendente">Pendente</option>
                                  <option value="Em Preparo">Em Preparo</option>
                                  <option value="Saiu para Entrega">Saiu para Entrega</option>
                                  <option value="Finalizado">Finalizado</option>
                                  <option value="Cancelado">Cancelado</option>
                                </select>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handlePrintOrder(order)}
                                    className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                    title="Imprimir Talão Térmico"
                                  >
                                    <Printer size={13} />
                                  </button>

                                  <button
                                    onClick={() => setEditingOrder(order)}
                                    className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                    title="Editar Pedido"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {order.status !== 'Finalizado' && order.status !== 'Cancelado' && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Deseja realmente CANCELAR o Pedido #${order.id}?`)) {
                                          updateOrderStatus(order.id, 'Cancelado');
                                        }
                                      }}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                      title="Cancelar Pedido"
                                    >
                                      <X size={13} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Paginacao
                      className="mt-3 rounded-xl border border-stone-200/80"
                      pagina={pagComandas}
                      totalPaginas={totalPagComandas}
                      inicio={inicioComandas}
                      mostrando={comandasDaPagina.length}
                      total={filteredList.length}
                      onIr={(p) => setPedidosPagina(Math.max(1, Math.min(totalPagComandas, p)))}
                      rotulo={filteredList.length === 1 ? 'pedido' : 'pedidos'}
                    />
                    </div>
                  )}

                  {/* VISUALIZAÇÃO EM QUADRO (ESTEIRA KANBAN POR STATUS) */}
                  {ordersViewMode === 'kanban' && filteredList.length > 0 && (() => {
                    const colunas = [
                      {
                        id: 'Pendente',
                        titulo: 'Pendentes',
                        corBorda: 'border-t-amber-400',
                        bgHeader: 'bg-amber-50/80',
                        textCor: 'text-amber-950',
                        badgeBg: 'bg-amber-200 text-amber-900',
                        pedidos: filteredList.filter((o: any) => o.status === 'Pendente'),
                      },
                      {
                        id: 'Em Preparo',
                        titulo: 'Em Preparo',
                        corBorda: 'border-t-[#6a2092]',
                        bgHeader: 'bg-purple-50/80',
                        textCor: 'text-purple-950',
                        badgeBg: 'bg-purple-200 text-purple-900',
                        pedidos: filteredList.filter((o: any) => o.status === 'Em Preparo'),
                      },
                      {
                        id: 'Saiu para Entrega',
                        titulo: 'Em Rota / Balcão',
                        corBorda: 'border-t-sky-500',
                        bgHeader: 'bg-sky-50/80',
                        textCor: 'text-sky-950',
                        badgeBg: 'bg-sky-200 text-sky-900',
                        pedidos: filteredList.filter((o: any) => o.status === 'Saiu para Entrega'),
                      },
                      {
                        id: 'Finalizado',
                        titulo: 'Concluídos',
                        corBorda: 'border-t-emerald-500',
                        bgHeader: 'bg-emerald-50/80',
                        textCor: 'text-emerald-950',
                        badgeBg: 'bg-emerald-200 text-emerald-900',
                        pedidos: filteredList.filter((o: any) => o.status === 'Finalizado'),
                      },
                    ];

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                        {colunas.map(col => (
                          <div
                            key={col.id}
                            className="bg-stone-50/60 rounded-xl border border-stone-200 flex flex-col h-[calc(100dvh-330px)] min-h-[360px] overflow-hidden"
                          >
                            {/* Cabeçalho da Coluna */}
                            <div className={`p-3 border-b border-stone-200 border-t-4 ${col.corBorda} ${col.bgHeader} flex items-center justify-between`}>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-black text-xs uppercase tracking-wider ${col.textCor}`}>
                                  {col.titulo}
                                </span>
                              </div>
                              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                                {col.pedidos.length}
                              </span>
                            </div>

                            {/* Lista de Comandas na Coluna */}
                            <div className="p-2.5 flex-1 min-h-0 overflow-y-auto space-y-2.5 adm-rolagem">
                              {col.pedidos.length === 0 ? (
                                <div className="py-12 text-center text-stone-400 text-xs font-mono">
                                  Nenhum pedido nesta etapa
                                </div>
                              ) : (
                                col.pedidos.map((order: any) => {
                                  const dataCriacao = order.createdAt || order.created_at;
                                  const elapsed = getElapsedTime(dataCriacao);
                                  const isDelivery = order.orderType === 'entrega' || order.orderType === 'Delivery' || order.order_type === 'entrega' || order.order_type === 'Delivery';
                                  const items = safeParseItems(order.items);
                                  const isPending = order.status === 'Pendente';
                                  const isInPrep = order.status === 'Em Preparo';
                                  const isInRoute = order.status === 'Saiu para Entrega';
                                  const isAtivo = order.status !== 'Finalizado' && order.status !== 'Cancelado';
                                  const nomeCliente = order.customerName || order.customer_name || 'Cliente';
                                  const valorTotal = order.totalAmount ?? order.total_amount ?? 0;

                                  return (
                                    <div
                                      key={order.id}
                                      className={`bg-white rounded-lg border border-stone-200 shadow-2xs hover:shadow-sm transition-all p-3 space-y-2 ${
                                        elapsed.urgency === 'danger' && isAtivo ? 'ring-2 ring-rose-400/80 animate-pulse' : ''
                                      }`}
                                    >
                                      {/* Topo: ID, Tipo e Valor */}
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-black text-xs text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                                            #{order.id}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                              isDelivery
                                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                                : 'bg-stone-100 text-stone-800 border border-stone-200'
                                            }`}
                                          >
                                            {isDelivery ? <Bike size={10} className="text-sky-600" /> : <Store size={10} className="text-stone-600" />}
                                            <span>{isDelivery ? 'Entrega' : 'Balcão'}</span>
                                          </span>
                                        </div>
                                        <span className="font-mono font-black text-sm text-stone-900 tabular-nums">
                                          {brl(Number(valorTotal))}
                                        </span>
                                      </div>

                                      {/* Cliente e Horário */}
                                      <div className="text-xs">
                                        <p className="font-black text-stone-900 truncate">{nomeCliente}</p>
                                        <div className="flex items-center justify-between gap-1 text-[11px] text-stone-500 font-mono mt-0.5">
                                          <span>
                                            {new Date(dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                          {isAtivo && elapsed.text && (
                                            <span
                                              className={`font-bold px-1.5 py-0.2 rounded ${
                                                elapsed.urgency === 'danger'
                                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                                                  : elapsed.urgency === 'warning'
                                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                  : 'bg-emerald-50 text-emerald-800'
                                              }`}
                                            >
                                              {elapsed.text}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Resumo dos Itens (até 3) */}
                                      <div className="text-[11px] font-mono text-stone-700 bg-stone-50 p-2 rounded border border-stone-100 space-y-1">
                                        {items.slice(0, 3).map((it: any, iIdx: number) => {
                                          const qty = it.quantity || it.qty || 1;
                                          return (
                                            <div key={iIdx} className="truncate">
                                              <span className="font-bold text-stone-900">{qty}x</span> {formatItemNameForPrint(it)}
                                            </div>
                                          );
                                        })}
                                        {items.length > 3 && (
                                          <div className="text-[10px] text-stone-400 font-bold">
                                            + {items.length - 3} outro(s) item(ns)
                                          </div>
                                        )}
                                      </div>

                                      {/* Ação Rápida de Avanço na Esteira */}
                                      <div className="pt-1">
                                        {isPending && (
                                          <button
                                            type="button"
                                            onClick={() => updateOrderStatus(order.id, 'Em Preparo')}
                                            className="w-full py-1.5 px-2 bg-[#6a2092] hover:bg-[#521872] active:bg-[#4d0471] text-white text-[11px] font-mono font-black rounded-md flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                          >
                                            <Flame size={12} />
                                            <span>PREPARAR</span>
                                            <ArrowRight size={12} />
                                          </button>
                                        )}
                                        {isInPrep && (
                                          <button
                                            type="button"
                                            onClick={() => updateOrderStatus(order.id, isDelivery ? 'Saiu para Entrega' : 'Finalizado')}
                                            className="w-full py-1.5 px-2 bg-[#6a2092] hover:bg-[#521872] active:bg-[#4d0471] text-white text-[11px] font-mono font-black rounded-md flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                          >
                                            {isDelivery ? <Bike size={12} /> : <Check size={12} />}
                                            <span>{isDelivery ? 'DESPACHAR' : 'CONCLUIR'}</span>
                                            <ArrowRight size={12} />
                                          </button>
                                        )}
                                        {isInRoute && (
                                          <button
                                            type="button"
                                            onClick={() => updateOrderStatus(order.id, 'Finalizado')}
                                            className="w-full py-1.5 px-2 bg-[#6a2092] hover:bg-[#521872] text-white text-[11px] font-mono font-black rounded-md flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                          >
                                            <Check size={12} />
                                            <span>CONCLUIR</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* VISUALIZAÇÃO EM TABELA (LIMPA, SEM ENDEREÇOS POLUINDO A PÁGINA PRINCIPAL) */}
                  {ordersViewMode === 'table' && filteredList.length > 0 && (
                    <div className="rounded-xl border border-stone-200/80 overflow-hidden">
                      <div ref={pedidosListaRef} className="overflow-x-auto">
                      <table className="w-full table-fixed text-left">
                        <colgroup>
                          <col className="w-[124px]" />
                          <col />
                          <col className="w-[118px]" />
                          <col className="w-[19%]" />
                          <col className="w-[100px]" />
                          <col className="w-[178px]" />
                          <col className="w-[230px]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-50/60">
                            <th className="h-9 pl-4 pr-3 font-semibold">Pedido</th>
                            <th className="h-9 px-3 font-semibold">Cliente</th>
                            <th className="h-9 px-3 font-semibold">Tipo</th>
                            <th className="h-9 px-3 font-semibold">Pagamento</th>
                            <th className="h-9 px-3 font-semibold text-right">Valor</th>
                            <th className="h-9 px-3 font-semibold">Status</th>
                            <th className="h-9 pl-3 pr-4 font-semibold text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="text-[13px] divide-y divide-stone-100">
                          {pedidosDaPagina.map((order: any) => {
                            const dataCriacao = order.createdAt || order.created_at;
                            const elapsed = getElapsedTime(dataCriacao);
                            const isDelivery = order.orderType === 'entrega' || order.orderType === 'Delivery';
                            const isRetirada = order.orderType === 'retirada';
                            const ativo = order.status !== 'Finalizado' && order.status !== 'Cancelado';
                            const corEspera = elapsed.urgency === 'danger' ? 'text-rose-600 font-semibold' : elapsed.urgency === 'warning' ? 'text-amber-600 font-semibold' : 'text-stone-400';

                            return (
                              <tr key={order.id} className={`h-14 transition-colors ${order.status === 'Pendente' ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-brand-50/40'}`}>
                                <td className="pl-4 pr-3 py-2 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-stone-900 tabular-nums text-[14px]">#{order.id}</span>
                                    {(order.isEdited || order.is_edited) && (
                                      <span className="text-[11px] font-semibold px-1.5 rounded bg-amber-100 text-amber-900">editado</span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-stone-500 tabular-nums">
                                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {ativo && elapsed.text && <span className={corEspera}> · {elapsed.text}</span>}
                                  </div>
                                </td>

                                <td className="px-3 py-2">
                                  <div className="font-semibold text-stone-900 text-[14px] truncate">{order.customerName}</div>
                                  <div className="flex items-center gap-2 text-[12px] text-stone-500">
                                    {order.customerPhone && (
                                      <a href={`tel:${order.customerPhone}`} className="hover:text-brand-700 tabular-nums transition-colors">
                                        {order.customerPhone}
                                      </a>
                                    )}
                                    {order.nif && <span className="px-1 bg-stone-100 rounded text-[11px] font-semibold">CPF {order.nif}</span>}
                                  </div>
                                </td>

                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    title={isDelivery && order.deliveryAddress ? `Endereço: ${order.deliveryAddress}` : undefined}
                                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-semibold ${
                                      isDelivery ? 'bg-sky-50 text-sky-800' : isRetirada ? 'bg-brand-50 text-brand-800' : 'bg-stone-100 text-stone-700'
                                    }`}
                                  >
                                    {isDelivery ? <Bike size={13} /> : <Store size={13} />}
                                    {isDelivery ? 'Entrega' : isRetirada ? 'Retirada' : 'Balcão'}
                                  </span>
                                </td>

                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate text-stone-700" title={order.paymentMethod || 'Dinheiro'}>
                                      {order.paymentMethod || 'Dinheiro'}
                                    </span>
                                    {order.changeFor && Number(order.changeFor) > 0 && (
                                      <span className="shrink-0 text-[11px] font-semibold text-amber-800 bg-amber-50 px-1.5 rounded border border-amber-200 whitespace-nowrap">
                                        troco p/ {brl(Number(order.changeFor))}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-2 text-right font-bold tabular-nums text-stone-900 text-[14px] whitespace-nowrap">
                                  {brl(Number(Number(order.totalAmount || 0)))}
                                </td>

                                <td className="px-3 py-2">
                                  <select
                                    value={order.status}
                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                    className={`w-full h-8 pl-2.5 pr-7 rounded-lg text-[13px] font-semibold border cursor-pointer outline-none transition-colors ${COR_STATUS[order.status] || 'bg-white text-stone-800 border-stone-200'}`}
                                    title="Alterar status"
                                  >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Preparo">Em preparo</option>
                                    <option value="Saiu para Entrega">Em rota</option>
                                    <option value="Finalizado">Finalizado</option>
                                    <option value="Cancelado">Cancelado</option>
                                  </select>
                                </td>

                                <td className="pl-3 pr-4 py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    {order.status === 'Pendente' && (
                                      <button
                                        onClick={() => updateOrderStatus(order.id, 'Em Preparo')}
                                        className="h-8 px-3 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                                        title="Iniciar preparo"
                                      >
                                        Preparar
                                      </button>
                                    )}
                                    {order.status === 'Em Preparo' && (
                                      <button
                                        onClick={() => updateOrderStatus(order.id, isDelivery ? 'Saiu para Entrega' : 'Finalizado')}
                                        className="h-8 px-3 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                                        title={isDelivery ? 'Despachar para o motoboy' : 'Finalizar pedido'}
                                      >
                                        {isDelivery ? 'Despachar' : 'Finalizar'}
                                      </button>
                                    )}
                                    {order.status === 'Saiu para Entrega' && (
                                      <button
                                        onClick={() => updateOrderStatus(order.id, 'Finalizado')}
                                        className="h-8 px-3 rounded-lg bg-[#6a2092] hover:bg-[#521872] text-white text-[13px] font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                                        title="Concluir pedido"
                                      >
                                        Concluir
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handlePrintOrder(order)}
                                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                      title="Imprimir comanda"
                                    >
                                      <Printer size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingOrder(order)}
                                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                      title="Editar pedido"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    {ativo && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Deseja cancelar o Pedido #${order.id}?`)) {
                                            updateOrderStatus(order.id, 'Cancelado');
                                          }
                                        }}
                                        className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Cancelar pedido"
                                      >
                                        <X size={16} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Excluir pedido"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                      <Paginacao
                        pagina={pagPedidos}
                        totalPaginas={totalPagPedidos}
                        inicio={inicioPedidos}
                        mostrando={pedidosDaPagina.length}
                        total={filteredList.length}
                        onIr={(p) => setPedidosPagina(Math.max(1, Math.min(totalPagPedidos, p)))}
                        rotulo={filteredList.length === 1 ? 'pedido' : 'pedidos'}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Relatórios Tab: 6 painéis que ocupam a tela; o clique abre o relatório completo */}
        {activeTab === "relatorios" && (() => {
          const pedidosPeriodo: any[] = filteredOrders || [];
          const validos = pedidosPeriodo.filter((o: any) => o.status !== 'Cancelado' && o.status !== 'cancelado');
          const cancelados = pedidosPeriodo.filter((o: any) => o.status === 'Cancelado' || o.status === 'cancelado');
          const valorCancelado = cancelados.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
          const extrasMap: Record<string, { qtd: number; valor: number }> = {};
          validos.forEach((o: any) => (Array.isArray(o.items) ? o.items : []).forEach((it: any) => (it?.extras || []).forEach((e: any) => {
            const nome = String(e?.name || 'Adicional');
            const q = Number(it.quantity) || 1;
            if (!extrasMap[nome]) extrasMap[nome] = { qtd: 0, valor: 0 };
            extrasMap[nome].qtd += q;
            extrasMap[nome].valor += (Number(e?.price) || 0) * q;
          })));
          const topExtras = Object.entries(extrasMap).sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 8);
          const topItens = (dashboardData?.popularItems || []).slice(0, 8);
          const pagamentos = [...(paymentMethodsData || [])].sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 4);
          const totalPagamentos = pagamentos.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0) || 1;
          const serie = (chartData?.orderVolumeData || []).map((d: any) => Number(d.revenue) || 0);
          const canal = (tipos: string[]) => {
            const lista = validos.filter((o: any) => tipos.includes(String(o.orderType || '').toLowerCase()));
            const total = lista.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
            return { n: lista.length, media: lista.length ? total / lista.length : 0 };
          };
          const canais = [
            { rotulo: 'Entrega', ...canal(['entrega', 'delivery']) },
            { rotulo: 'Retirada', ...canal(['retirada', 'takeaway']) },
            { rotulo: 'Balcão', ...canal(['balcao', 'balcão', 'mesa']) },
          ];
          return (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h1 className="font-display text-[24px] font-extrabold tracking-tight text-stone-900 leading-tight">Relatórios</h1>
                <p className="text-[14px] text-stone-500">Toque num card para abrir o relatório completo.</p>
              </div>
              <div className="flex items-center gap-2">
                <PeriodFilterCompact
                  value={dateFilter as any}
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onChange={(res) => {
                    setDateFilter(res.period);
                    dateFilterRef.current = res.period;
                    if (res.startDate) {
                      setCustomStartDate(res.startDate);
                      customStartDateRef.current = res.startDate;
                    }
                    if (res.endDate) {
                      setCustomEndDate(res.endDate);
                      customEndDateRef.current = res.endDate;
                    }
                    fetchDashboardData(false, res.period);
                  }}
                  align="right"
                />
                <button
                  onClick={() => fetchDashboardData()}
                  className="h-9 px-3 rounded-xl border border-stone-200 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5 text-[13px] font-semibold"
                  title="Recarregar dados"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin text-brand-600' : 'text-stone-400'} />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-3 min-h-0">
              <PainelRelatorio
                titulo="Faturamento"
                Icone={DollarSign}
                destaque={brl(faturamentoBruto)}
                legenda={`${totalPedidos} ${totalPedidos === 1 ? 'pedido' : 'pedidos'} no período`}
                onAbrir={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Composição do Faturamento'})}
              >
                <MiniBarras valores={serie} />
              </PainelRelatorio>

              <PainelRelatorio
                titulo="Ticket médio"
                Icone={TrendingUp}
                destaque={brl(ticketMedio)}
                legenda="média por pedido, por canal"
                onAbrir={() => setReportModal({isOpen: true, type: 'ticket_medio', title: 'Cálculo e Análise do Ticket Médio'})}
              >
                <div className="grid grid-cols-3 gap-2">
                  {canais.map(c => (
                    <div key={c.rotulo} className="rounded-xl bg-stone-50 px-3 py-2">
                      <p className="text-[12px] text-stone-500">{c.rotulo}</p>
                      <p className="text-[15px] font-bold tabular-nums text-stone-900 whitespace-nowrap">{c.n ? brl(c.media) : '—'}</p>
                      <p className="text-[11px] text-stone-400 tabular-nums">{c.n} {c.n === 1 ? 'pedido' : 'pedidos'}</p>
                    </div>
                  ))}
                </div>
              </PainelRelatorio>

              <PainelRelatorio
                titulo="Produtos mais vendidos"
                Icone={Package}
                onAbrir={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})}
              >
                <ListaRanking
                  vazio="Sem vendas no período."
                  itens={topItens.map((i: any) => ({ nome: formatItemNameForPrint({ name: i.name }), detalhe: `${i.qty} un.`, valor: brl(Number(i.revenue) || 0) }))}
                />
              </PainelRelatorio>

              <PainelRelatorio
                titulo="Adicionais"
                Icone={UtensilsCrossed}
                onAbrir={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Adicionais'})}
              >
                <ListaRanking
                  vazio="Nenhum adicional vendido no período."
                  itens={topExtras.map(([nome, v]) => ({ nome: nomeBonito(nome), detalhe: `${v.qtd} un.`, valor: brl(v.valor) }))}
                />
              </PainelRelatorio>

              <PainelRelatorio
                titulo="Formas de pagamento"
                Icone={CreditCard}
                onAbrir={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})}
              >
                {pagamentos.length === 0 ? (
                  <p className="text-[13px] text-stone-400">Sem pagamentos no período.</p>
                ) : (
                  <div className="space-y-2.5">
                    {pagamentos.map((p: any, i: number) => {
                      const pct = Math.round(((Number(p.value) || 0) / totalPagamentos) * 100);
                      return (
                        <div key={p.name} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="text-stone-700 truncate">{p.name}</span>
                            <span className="tabular-nums whitespace-nowrap"><span className="font-semibold text-stone-900">{brl(Number(p.value) || 0)}</span> <span className="text-stone-400">· {pct}%</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, backgroundColor: ['#6a2092', '#8a3fb5', '#c49ce0', '#dec4ee'][i] || '#dec4ee' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </PainelRelatorio>

              <PainelRelatorio
                titulo="Cancelamentos"
                Icone={AlertCircle}
                destaque={String(cancelados.length)}
                legenda={cancelados.length ? `${brl(valorCancelado)} em pedidos cancelados` : 'nenhum pedido cancelado'}
                tom={cancelados.length ? 'alerta' : 'neutro'}
                onAbrir={() => setReportModal({isOpen: true, type: 'cancelamentos', title: 'Pedidos Cancelados'})}
              >
                {cancelados.length > 0 && (
                  <p className="text-[13px] text-stone-500">
                    {Math.round((cancelados.length / Math.max(1, pedidosPeriodo.length)) * 100)}% dos pedidos do período
                  </p>
                )}
              </PainelRelatorio>
            </div>
          </div>
          );
        })()}

      </div>
      </main>
    </div>
    
      {/* Modal Histórico Consolidado 2020 a 2026 */}
      <HistoricalSalesModal
        isOpen={showHistoricalSalesModal}
        onClose={() => setShowHistoricalSalesModal(false)}
      />

      <PaletaComandos aberto={paletaAberta} onFechar={() => setPaletaAberta(false)} comandos={comandosPaleta} />

      {/* PDV Modal */}
      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={(order) => {
          fetchDashboardData();
        }}
      />

      {isPasswordModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsPasswordModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key size={24} className="text-[#6a2092]" />
              Alterar Senha
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6a2092]/20 focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6a2092]/20 focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              
              {passwordChangeMessage && (
                <div className={`p-3 rounded-lg text-sm ${passwordChangeMessage.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {passwordChangeMessage}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-[#6a2092] text-white font-bold rounded-xl hover:bg-[#521872] transition-colors"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup para Relatórios */}
      {reportModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-stone-900 leading-tight">
                    {reportModal.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">Relatório analítico do sistema</p>
                </div>
              </div>
              <button
                onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
                className="p-2 text-stone-400 hover:text-stone-700 bg-white hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                let filteredReportOrders = filteredOrders && filteredOrders.length > 0 ? filteredOrders : (allOrders.length > 0 && dateFilter === 'todos' ? allOrders : (filteredOrders || []));
                if (reportModal.type === 'vendas_mes') {
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()) : false;
                  });
                } else if (reportModal.type === 'vendas_7dias') {
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.getTime() >= (new Date().getTime() - 7 * 24 * 60 * 60 * 1000)) : false;
                  });
                } else if (reportModal.type === 'fluxo_caixa') {
                  const todayStr = new Date().toISOString().split('T')[0];
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.toISOString().split('T')[0] === todayStr) : false;
                  });
                } else if (reportModal.type === 'cancelamentos') {
                  filteredReportOrders = (filteredOrders || allOrders).filter(o => o.status === 'Cancelado' || o.status === 'cancelado');
                }
                
                if (reportModal.type === 'faturamento') {
                  const formatCurrency = (val: any) => brl(Number(val) || 0);
                  const formatDateTime = (val: any) => {
                    if (!val) return 'Ativo';
                    const d = new Date(val);
                    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
                  };

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Faturamento Acumulado (Período):</span>
                        <span className="font-black text-xl font-mono text-emerald-700">
                          {formatCurrency(dashboardData?.faturamentoBruto ?? 0)}
                        </span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Sessão (Abertura)</th>
                              <th className="py-3 px-4">Fechamento</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Faturamento</th>
                              <th className="py-3 px-4 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {filteredCashSessions.map((sess, idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 text-stone-900">{formatDateTime(sess.opened_at)}</td>
                                <td className="py-3 px-4 text-stone-600">{formatDateTime(sess.closed_at)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${sess.status === 'aberto' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                                    {sess.status === 'aberto' ? 'Aberto' : 'Fechado'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                  {formatCurrency(sess.total_faturado)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedSessionForDetails(sess)}
                                    className="px-3 py-1.5 bg-[#6a2092] text-white hover:bg-[#521872] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                                  >
                                    Ver Detalhes
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredCashSessions.length === 0 && (
                              <tr><td colSpan={5} className="py-8 text-center text-stone-400 font-medium">Nenhum fechamento de caixa encontrado no período.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                if (reportModal.type === 'produtos' || reportModal.type === 'complementos') {
                  const counts: Record<string, { qty: number, rev: number }> = {};
                  filteredReportOrders.forEach(o => {
                    if (o.status === 'Cancelado' || o.status === 'cancelado') return;
                    const items = safeParseItems(o.items);
                    items.forEach((it: any) => {
                      if (reportModal.type === 'produtos') {
                         counts[it.name] = counts[it.name] || {qty: 0, rev: 0};
                         counts[it.name].qty += Number(it.quantity || 1);
                         counts[it.name].rev += (Number(it.priceCalculated || it.price || 0)) * Number(it.quantity || 1);
                      } else {
                         if (it.extras) {
                           it.extras.forEach((ext: any) => {
                              counts[ext.name] = counts[ext.name] || {qty: 0, rev: 0};
                              counts[ext.name].qty += Number(it.quantity || 1);
                              counts[ext.name].rev += Number(ext.price || 0) * Number(it.quantity || 1);
                           });
                         }
                      }
                    });
                  });
                  const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                  const totalRev = sorted.reduce((acc, curr) => acc + curr[1].rev, 0);

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Faturamento Acumulado dos Itens:</span>
                        <span className="font-black text-xl font-mono text-emerald-700">{brl(Number(totalRev))}</span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Item / Produto</th>
                              <th className="py-3 px-4 text-center">Quantidade Vendida</th>
                              <th className="py-3 px-4 text-right">Faturamento Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {sorted.map(([name, data], idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-stone-900">{name}</td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-stone-600">{data.qty} uni</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{brl(Number(data.rev))}</td>
                              </tr>
                            ))}
                            {sorted.length === 0 && (
                              <tr><td colSpan={3} className="py-8 text-center text-stone-400 font-medium">Nenhum dado encontrado para o período.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                } else if (reportModal.type === 'ticket_medio') {
                  const baseOrders = (filteredOrders && filteredOrders.length > 0) ? filteredOrders : allOrders;
                  const activeOrders = baseOrders.filter(o => isOrderActive(o));

                  const mesaOrders = activeOrders.filter(o => normalizeOrderType(o.orderType || o.order_type) === 'mesa');
                  const retiradaOrders = activeOrders.filter(o => ['retirada', 'balcao'].includes(normalizeOrderType(o.orderType || o.order_type)));
                  const entregaOrders = activeOrders.filter(o => normalizeOrderType(o.orderType || o.order_type) === 'entrega');

                  const mesaRev = mesaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const retiradaRev = retiradaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const entregaRev = entregaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const totalRev = activeOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

                  const mesaTicket = mesaOrders.length > 0 ? mesaRev / mesaOrders.length : 0;
                  const retiradaTicket = retiradaOrders.length > 0 ? retiradaRev / retiradaOrders.length : 0;
                  const entregaTicket = entregaOrders.length > 0 ? entregaRev / entregaOrders.length : 0;
                  const totalTicket = activeOrders.length > 0 ? totalRev / activeOrders.length : 0;

                  let currentTabOrders = activeOrders;
                  let currentTabName = 'Todas as Operações';
                  let currentTabTicket = totalTicket;
                  let currentTabRev = totalRev;

                  if (ticketMedioTab === 'mesa') {
                    currentTabOrders = mesaOrders;
                    currentTabName = 'Mesa';
                    currentTabTicket = mesaTicket;
                    currentTabRev = mesaRev;
                  } else if (ticketMedioTab === 'retirada') {
                    currentTabOrders = retiradaOrders;
                    currentTabName = 'Retirada';
                    currentTabTicket = retiradaTicket;
                    currentTabRev = retiradaRev;
                  } else if (ticketMedioTab === 'entrega') {
                    currentTabOrders = entregaOrders;
                    currentTabName = 'Entregas';
                    currentTabTicket = entregaTicket;
                    currentTabRev = entregaRev;
                  }

                  const segments = [
                    { id: 'todos', label: 'Geral', icon: TrendingUp, count: activeOrders.length, ticket: totalTicket, rev: totalRev },
                    { id: 'mesa', label: 'Mesa', icon: UtensilsCrossed, count: mesaOrders.length, ticket: mesaTicket, rev: mesaRev },
                    { id: 'retirada', label: 'Retirada', icon: ShoppingBag, count: retiradaOrders.length, ticket: retiradaTicket, rev: retiradaRev },
                    { id: 'entrega', label: 'Entregas', icon: Bike, count: entregaOrders.length, ticket: entregaTicket, rev: entregaRev },
                  ];

                  return (
                    <div className="space-y-3.5">
                      {/* Segmented Cards Minimalistas - Atuam como Filtro e Indicadores */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {segments.map((seg) => {
                          const IconComp = seg.icon;
                          const isSelected = ticketMedioTab === seg.id;
                          return (
                            <button
                              key={seg.id}
                              type="button"
                              onClick={() => setTicketMedioTab(seg.id as any)}
                              className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#6a2092] text-white border-[#6a2092] shadow-sm'
                                  : 'bg-white text-stone-900 border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <IconComp size={12} className={isSelected ? 'text-stone-300' : 'text-stone-500'} />
                                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                                    {seg.label}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                                  isSelected ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  {seg.count} {seg.count === 1 ? 'ped' : 'peds'}
                                </span>
                              </div>

                              <div className="mt-1.5">
                                <div className={`text-xl font-black font-mono tracking-tight leading-none ${
                                  isSelected ? 'text-white' : 'text-stone-900'
                                }`}>
                                  {brl(Number(seg.ticket))}
                                </div>
                                <div className={`text-[10.5px] font-mono mt-1 ${
                                  isSelected ? 'text-stone-400' : 'text-stone-500'
                                }`}>
                                  Total: {brl(Number(seg.rev))}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Barra de Informação Direta & Objetiva */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 px-1 text-[11px] text-stone-500 font-mono">
                        <div>
                          Mostrando pedidos de: <strong className="text-stone-900 font-bold">{currentTabName}</strong> ({currentTabOrders.length})
                        </div>
                        <div className="text-stone-400 text-[10px]">
                          Fórmula: Total ({brl(Number(currentTabRev))}) ÷ {currentTabOrders.length || 0} pedidos = <span className="text-stone-800 font-bold">{brl(Number(currentTabTicket))}</span>
                        </div>
                      </div>

                      {/* Tabela Limpa e Direta de Pedidos */}
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-50 border-b border-stone-200 text-[10.5px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                              <th className="py-2.5 px-3.5">Pedido</th>
                              <th className="py-2.5 px-3.5">Hora</th>
                              <th className="py-2.5 px-3.5">Cliente</th>
                              <th className="py-2.5 px-3.5">Operação</th>
                              <th className="py-2.5 px-3.5">Pagamento</th>
                              <th className="py-2.5 px-3.5 text-right">Valor</th>
                              <th className="py-2.5 px-3.5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-xs">
                            {currentTabOrders.map(o => {
                              const oType = normalizeOrderType(o.orderType || o.order_type);
                              return (
                                <tr key={o.id} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2 px-3.5 font-mono font-bold text-stone-900">#{o.id}</td>
                                  <td className="py-2 px-3.5 font-mono text-stone-600 text-[11px]">
                                    {new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="py-2 px-3.5 font-medium text-stone-800">{o.customerName}</td>
                                  <td className="py-2 px-3.5">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                                      {oType === 'mesa' ? 'Mesa' : oType === 'retirada' || oType === 'balcao' ? 'Retirada' : 'Entrega'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3.5 font-mono text-stone-600 text-[11px]">{o.paymentMethod}</td>
                                  <td className="py-2 px-3.5 text-right font-mono font-bold text-stone-900">{brl(Number(Number(o.totalAmount || 0)))}</td>
                                  <td className="py-2 px-3.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReportModal({isOpen: false, type: '', title: ''});
                                        setEditingOrder(o);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                                    >
                                      Detalhes
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {currentTabOrders.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-stone-400 font-medium">
                                  Nenhum pedido de {currentTabName} encontrado no período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                } else if (reportModal.type === 'pagamentos') {
                   const counts: Record<string, { count: number, rev: number }> = {};
                   filteredReportOrders.forEach(o => {
                      if (o.status === 'Cancelado' || o.status === 'cancelado') return;
                      const pm = o.paymentMethod || 'Outros';
                      counts[pm] = counts[pm] || {count: 0, rev: 0};
                      counts[pm].count++;
                      counts[pm].rev += Number(o.totalAmount || 0);
                   });
                   const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                   const totalRev = sorted.reduce((acc, curr) => acc + curr[1].rev, 0);

                   return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Total Geral em Pagamentos:</span>
                        <span className="font-black text-xl font-mono text-emerald-700">{brl(Number(totalRev))}</span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Forma de Pagamento</th>
                              <th className="py-3 px-4 text-center">Nº de Pedidos</th>
                              <th className="py-3 px-4 text-right">Total Recebido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {sorted.map(([pm, data], idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-stone-900">{pm}</td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-stone-600">{data.count} pedidos</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{brl(Number(data.rev))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                   );
                }
                
                // Modal Padrão: Lista de Pedidos (Faturamento / Vendas 7 Dias / Vendas Mês / Fluxo de Caixa / Cancelamentos)
                const totalPeriodo = filteredReportOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <span className="font-bold text-stone-700 text-sm">Total de Pedidos no Período ({filteredReportOrders.length}):</span>
                      <span className="font-black text-xl font-mono text-emerald-700">{brl(Number(totalPeriodo))}</span>
                    </div>
                    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                            <th className="py-3 px-4">Pedido</th>
                            <th className="py-3 px-4">Data e Hora</th>
                            <th className="py-3 px-4">Cliente</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Valor Total</th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-sm">
                          {filteredReportOrders.map(o => (
                            <tr key={o.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-stone-900">#{o.id}</td>
                              <td className="py-3 px-4 text-xs font-medium text-stone-600">
                                {new Date(o.createdAt).toLocaleString('pt-BR')}
                              </td>
                              <td className="py-3 px-4 font-semibold text-stone-800">{o.customerName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                                  o.status === 'Concluído' || o.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' :
                                  o.status === 'Cancelado' || o.status === 'cancelado' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{brl(Number(Number(o.totalAmount || 0)))}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setReportModal({isOpen: false, type: '', title: ''});
                                      setEditingOrder(o);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Pedido"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPrintOrder(o);
                                      setShowPrintPreview(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
                                    title="Imprimir Talão"
                                  >
                                    Imprimir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredReportOrders.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-stone-400 font-medium">Nenhum pedido encontrado para este relatório.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
                className="px-5 py-2 bg-[#6a2092] hover:bg-[#521872] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printOrder && (
        <div 
          className="no-print" 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={handleClosePrintPreview}
        >
          <div 
            style={{ backgroundColor: '#fff', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', width: '340px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}><Printer size={18} /> Pré-visualização do Talão</span>
              <button onClick={handleClosePrintPreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            {/* Receipt Content */}
            <div style={{ padding: '10px 8px', flexGrow: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', fontSize: '12px' }}>
                {([['texto', 'Somente texto (driver atual)'], ['formatado', 'Driver Bematech (formatado)']] as const).map(([m, rotulo]) => (
                  <button key={m} type="button" onClick={() => trocarModoImpressora(m)}
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', border: modoImpressora === m ? '2px solid #6a2092' : '1px solid #d1d5db', background: modoImpressora === m ? '#f5edfb' : '#fff', fontWeight: 700, cursor: 'pointer', color: '#111' }}>
                    {rotulo}
                  </button>
                ))}
              </div>
              <div style={{ width: '72mm', margin: '0 auto' }}>
                {modoImpressora === 'texto' ? <ComandaTexto pedido={printOrder} /> : <Comanda pedido={printOrder} />}
              </div>
            </div>
            {/* Modal Actions */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={handleConfirmPrint}
                style={{ flex: 1, backgroundColor: '#6a2092', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Imprimir
              </button>
              <button
                onClick={handleClosePrintPreview}
                style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                <X size={16} /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden receipt for actual printing */}
      {printOrder && (
        <div className="print-only">
          {modoImpressora === 'texto' ? <ComandaTexto pedido={printOrder} /> : <Comanda pedido={printOrder} />}
        </div>
      )}
    {editingOrder && (
      <EditOrderModal
        order={editingOrder}
        menuItems={menuItems && menuItems.length > 0 ? menuItems : ALL_MENU_ITEMS}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveOrderEdit}
      />
    )}

    {selectedSessionForDetails && (
      <CashSessionDetailsModal
        session={selectedSessionForDetails}
        onClose={() => setSelectedSessionForDetails(null)}
      />
    )}
    </>
  );
}

function EditOrderModal({ order, menuItems, onClose, onSave }: { order: any, menuItems: any[], onClose: () => void, onSave: (updatedOrder: any) => Promise<void> }) {
  const rawCustomerName = (order.customerName || order.customer_name || '').toString();
  const nifMatch = rawCustomerName.match(/\(NIF:\s*([^)]+)\)/i);
  const initialNif = (order.nif || (nifMatch ? nifMatch[1] : '')).toString().trim();
  const cleanName = rawCustomerName.replace(/\s*\(NIF:\s*[^)]+\)/i, '').trim();

  const [customerName, setCustomerName] = useState(cleanName);
  const [customerNif, setCustomerNif] = useState(initialNif);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || order.customer_phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || order.delivery_address || '');
  const [deliveryZone, setDeliveryZone] = useState(order.deliveryZone || order.delivery_zone || '');
  const initialPm = (order.paymentMethod || (order as any).payment_method || 'Dinheiro').toString().trim();
  const [paymentMethod, setPaymentMethod] = useState(initialPm.toLowerCase() === 'mbway' ? 'PIX' : initialPm);
  const [orderType, setOrderType] = useState(order.orderType || order.order_type || 'balcao');
  const [items, setItems] = useState<any[]>(() => {
    let raw = order.items;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (Array.isArray(raw)) return JSON.parse(JSON.stringify(raw));
    return [];
  });

  const [discountAmount, setDiscountAmount] = useState<number>(order.discountAmount || order.discount_amount || 0);
  const [additionalAmount, setAdditionalAmount] = useState<number>(order.additionalAmount || order.additional_amount || 0);
  const [cashProvided, setCashProvided] = useState<number>(order.cashProvided || order.cash_provided || 0);
  const [editReason, setEditReason] = useState(order.editReason || order.edit_reason || '');
  
  const [selectedProductSearch, setSelectedProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customAdditionalFlavors, setCustomAdditionalFlavors] = useState<{ id: string; search: string }[]>([]);
  const [selectedSize, setSelectedSize] = useState('priceSingle');
  const [saving, setSaving] = useState(false);

  const subtotal = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const price = Number(item.priceCalculated ?? item.basePrice ?? item.price ?? 0);
      const qty = Number(item.quantity || 1);
      return acc + (price * qty);
    }, 0);
  }, [items]);

  const finalTotal = React.useMemo(() => {
    const tot = subtotal + Number(additionalAmount || 0) - Number(discountAmount || 0);
    return Math.max(0, tot);
  }, [subtotal, additionalAmount, discountAmount]);

  const calculatedChange = React.useMemo(() => {
    if (paymentMethod !== 'Dinheiro' || !cashProvided || cashProvided <= 0) return 0;
    return Math.max(0, cashProvided - finalTotal);
  }, [paymentMethod, cashProvided, finalTotal]);

  // Smart Search & Editing States (CRM Pattern)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'acai' | 'combos' | 'bebidas' | 'outros'>('all');
  const [searchingFlavorSlot, setSearchingFlavorSlot] = useState<number | null>(null);
  const [flavorSearchQuery, setFlavorSearchQuery] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const productSearchContainerRef = useRef<HTMLDivElement>(null);
  const flavorSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchingFlavorSlot !== null) {
      const timer = setTimeout(() => {
        flavorSearchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [searchingFlavorSlot]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productSearchContainerRef.current && !productSearchContainerRef.current.contains(e.target as Node)) {
        setIsProductSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dismiss on ESC inside OrderEditorModal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchingFlavorSlot !== null) {
          setSearchingFlavorSlot(null);
          setFlavorSearchQuery('');
        } else if (isProductSearchOpen) {
          setIsProductSearchOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchingFlavorSlot, isProductSearchOpen, onClose]);

  const isAcaiWithSize = (m: any) => {
    if (!m) return false;
    const cat = (m.category || '').toLowerCase();
    return (
      Boolean(m.priceP || m.priceM || m.priceG || m.priceBig || m.priceSuperBig) ||
      cat.includes('copo') ||
      cat.includes('combo') ||
      cat.includes('monte') ||
      cat.includes('barca') ||
      cat.includes('fondue')
    );
  };
  const isPizzaItem = isAcaiWithSize;

  const isBebidaItem = (m: any) => {
    if (!m) return false;
    const cat = (m.category || '').toLowerCase();
    return cat.includes('bebida') || cat.includes('refrigerante') || cat.includes('suco') || cat.includes('agua');
  };

  const pizzasList = React.useMemo(() => {
    return menuItems.filter(isAcaiWithSize);
  }, [menuItems]);

  const selectedBaseMenuItem = React.useMemo(() => {
    return menuItems.find(m => m.id === selectedProductId) || null;
  }, [menuItems, selectedProductId]);

  const isCurrentSelectionPizza = React.useMemo(() => {
    return isPizzaItem(selectedBaseMenuItem) || ['priceP', 'priceM', 'priceG', 'priceBig', 'priceSuperBig'].includes(selectedSize);
  }, [selectedBaseMenuItem, selectedSize]);

  const maxAdditionalFlavors = React.useMemo(() => {
    if (selectedSize === 'priceSuperBig') return 3;
    if (selectedSize === 'priceBig') return 2;
    if (selectedSize === 'priceG') return 1;
    return 0;
  }, [selectedSize]);

  const totalFlavors = 1 + customAdditionalFlavors.length;

  const getPizzaPriceForSize = (item: any, sizeKey: string) => {
    if (!item) return 0;
    if (sizeKey === 'priceP') return item.priceP || (item.priceM ? item.priceM - 2 : 0) || item.priceSingle || 0;
    if (sizeKey === 'priceM') return item.priceM || item.priceSingle || 0;
    if (sizeKey === 'priceG') return item.priceG || item.priceM || item.priceSingle || 0;
    if (sizeKey === 'priceBig') return item.priceBig || item.priceG || item.priceSingle || 0;
    if (sizeKey === 'priceSuperBig') return item.priceSuperBig || item.priceBig || item.priceG || item.priceSingle || 0;
    return item.priceSingle || item.price || 0;
  };

  const handleSelectSize = (sizeKey: string) => {
    setSelectedSize(sizeKey);
    let maxAdd = 0;
    if (sizeKey === 'priceSuperBig') maxAdd = 3;
    else if (sizeKey === 'priceBig') maxAdd = 2;
    else if (sizeKey === 'priceG') maxAdd = 1;

    if (customAdditionalFlavors.length > maxAdd) {
      setCustomAdditionalFlavors(prev => prev.slice(0, maxAdd));
    }
  };

  const handleSelectProduct = (m: any) => {
    setSelectedProductId(m.id);
    setSelectedProductSearch(m.name);
    setIsProductSearchOpen(false);

    if (isPizzaItem(m)) {
      if (selectedSize === 'priceSingle') {
        setSelectedSize(m.priceG ? 'priceG' : m.priceM ? 'priceM' : 'priceP');
      }
    } else {
      setSelectedSize('priceSingle');
      setCustomAdditionalFlavors([]);
    }
    setSearchingFlavorSlot(null);
  };

  const handleStartEditItem = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    setEditingItemIndex(idx);

    const sz = (item.size || '').toLowerCase();
    let sizeKey = 'priceSingle';
    if (sz.includes('super big') || sz.includes('4 sab')) sizeKey = 'priceSuperBig';
    else if (sz.includes('big') || sz.includes('3 sab')) sizeKey = 'priceBig';
    else if (sz.includes('grande') || sz.includes('(g)') || sz === 'g' || sz.includes('2 sab')) sizeKey = 'priceG';
    else if (sz.includes('média') || sz.includes('media') || sz.includes('(m)') || sz === 'm') sizeKey = 'priceM';
    else if (sz.includes('pequena') || sz.includes('(p)') || sz === 'p') sizeKey = 'priceP';

    setSelectedSize(sizeKey);

    let baseItem = item.menuItem;
    const rawName = item.name || '';
    const extraFlavorsFound: { id: string; search: string }[] = [];

    if (!baseItem) {
      if (rawName.includes('+')) {
        const parts = rawName.split('+').map((p: string) => p.replace(/1\/\d+/g, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/^pizza\s+/i, '').replace(/^esfi(?:ha|rra)\s+/i, '').trim());
        if (parts[0]) {
          baseItem = menuItems.find(m => m.name.toLowerCase().includes(parts[0].toLowerCase()) || parts[0].toLowerCase().includes(m.name.toLowerCase()));
        }
        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
          const pName = parts[pIdx];
          const matchExtra = menuItems.find(m => m.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(m.name.toLowerCase()));
          if (matchExtra) {
            extraFlavorsFound.push({ id: matchExtra.id, search: matchExtra.name });
          } else if (pName) {
            extraFlavorsFound.push({ id: `custom-${pIdx}`, search: pName });
          }
        }
      } else {
        const cleanName = rawName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/^pizza\s+/i, '').replace(/^esfi(?:ha|rra)\s+/i, '').trim();
        baseItem = menuItems.find(m => m.name.toLowerCase().includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(m.name.toLowerCase()));
      }
    } else {
      if (item.additionalFlavors && Array.isArray(item.additionalFlavors)) {
        item.additionalFlavors.forEach((af: any) => {
          extraFlavorsFound.push({ id: af.id || af.name, search: af.name });
        });
      } else if (item.secondFlavor) {
        extraFlavorsFound.push({ id: item.secondFlavor.id || item.secondFlavor.name, search: item.secondFlavor.name });
      }
    }

    if (baseItem) {
      setSelectedProductId(baseItem.id);
      setSelectedProductSearch(baseItem.name);
    } else {
      setSelectedProductId(item.id || 'custom');
      setSelectedProductSearch(rawName);
    }

    setCustomAdditionalFlavors(extraFlavorsFound);
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setSelectedProductId('');
    setSelectedProductSearch('');
    setCustomAdditionalFlavors([]);
    setSelectedSize('priceSingle');
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  const getFractionText = (slotIndex: number, total: number) => {
    if (total === 1) return '1/1 Único';
    if (total === 2) return `${slotIndex + 1}/2 Metade`;
    if (total === 3) return `${slotIndex + 1}/3 Terço`;
    if (total === 4) return `${slotIndex + 1}/4 Quarto`;
    return `${slotIndex + 1}º Sabor`;
  };

  const handleAddItem = () => {
    if (!selectedProductId && !selectedProductSearch.trim()) return;
    const menuItem = menuItems.find(m => m.id === selectedProductId) || {
      id: selectedProductId || `custom-${Date.now()}`,
      name: selectedProductSearch.trim(),
      priceSingle: 0
    };

    const extraFlavors = customAdditionalFlavors
      .filter(f => f.id || f.search)
      .map(f => menuItems.find(m => m.id === f.id) || { id: f.id, name: f.search, priceSingle: 0 });

    const totalFlavors = 1 + extraFlavors.length;

    let price = getPizzaPriceForSize(menuItem, selectedSize);
    let sizeName = 'Único';
    if (selectedSize === 'priceP') { price = getPizzaPriceForSize(menuItem, 'priceP'); sizeName = 'Pequena (P)'; }
    else if (selectedSize === 'priceM') { price = getPizzaPriceForSize(menuItem, 'priceM'); sizeName = 'Média (M)'; }
    else if (selectedSize === 'priceG') {
      const allPricesG = [getPizzaPriceForSize(menuItem, 'priceG'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceG'))];
      price = Math.max(...allPricesG) || price;
      sizeName = 'Grande (G)';
    } else if (selectedSize === 'priceBig') {
      const allPricesBig = [getPizzaPriceForSize(menuItem, 'priceBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceBig'))];
      price = Math.max(...allPricesBig) || price;
      sizeName = 'Big';
    } else if (selectedSize === 'priceSuperBig') {
      const allPricesSB = [getPizzaPriceForSize(menuItem, 'priceSuperBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceSuperBig'))];
      price = Math.max(...allPricesSB) || price;
      sizeName = 'Super Big';
    }

    let itemName = menuItem.name;
    if (extraFlavors.length > 0) {
      const fraction = `1/${totalFlavors}`;
      const allNames = [menuItem, ...extraFlavors].map(f => `${fraction} ${f.name}`);
      itemName = allNames.join(' + ');
    }

    const newItem = {
      menuItem: menuItem,
      name: itemName,
      quantity: editingItemIndex !== null ? (items[editingItemIndex]?.quantity || 1) : 1,
      size: sizeName,
      priceCalculated: price,
      basePrice: price,
      price: price,
      additionalFlavors: extraFlavors
    };

    if (editingItemIndex !== null) {
      setItems(prev => {
        const copy = [...prev];
        copy[editingItemIndex] = {
          ...copy[editingItemIndex],
          ...newItem,
          quantity: copy[editingItemIndex].quantity || 1
        };
        return copy;
      });
      setEditingItemIndex(null);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setSelectedProductId('');
    setSelectedProductSearch('');
    setCustomAdditionalFlavors([]);
    setSelectedSize('priceSingle');
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setItems(prev => {
      const updated = [...prev];
      const newQty = (updated[index].quantity || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalCustomerName = customerNif.trim() 
      ? `${customerName.trim()} (NIF: ${customerNif.trim()})`
      : customerName.trim();

    const updatedPayload = {
      ...order,
      customer_name: finalCustomerName,
      customerName: finalCustomerName,
      nif: customerNif.trim() || null,
      customer_phone: customerPhone,
      order_type: orderType,
      payment_method: paymentMethod,
      delivery_address: deliveryAddress,
      deliveryAddress: deliveryAddress,
      delivery_zone: deliveryZone,
      deliveryZone: deliveryZone,
      items: items,
      discount_amount: Number(discountAmount) || 0,
      additional_amount: Number(additionalAmount) || 0,
      discountAmount: Number(discountAmount) || 0,
      additionalAmount: Number(additionalAmount) || 0,
      total_amount: finalTotal,
      totalAmount: finalTotal,
      cash_provided: Number(cashProvided) || 0,
      cashProvided: Number(cashProvided) || 0,
      edit_reason: editReason,
      editReason: editReason,
      is_edited: true,
      isEdited: true
    };
    await onSave(updatedPayload);
    setSaving(false);
  };

  const filteredMenuItems = React.useMemo(() => {
    const q = selectedProductSearch.toLowerCase().trim();
    return menuItems.filter(m => {
      if (categoryFilter === 'acai' && !(m.category?.includes('copo') || m.category?.includes('acai') || m.category === 'mais-vendidos')) return false;
      if (categoryFilter === 'combos' && !(m.category?.includes('combo') || m.category === 'novidades')) return false;
      if (categoryFilter === 'bebidas' && !isBebidaItem(m)) return false;
      if (categoryFilter === 'outros' && (m.category?.includes('copo') || m.category?.includes('acai') || m.category?.includes('combo') || isBebidaItem(m))) return false;

      if (!q) return true;
      return m.name.toLowerCase().includes(q) || (m.ingredients && m.ingredients.toLowerCase().includes(q));
    });
  }, [menuItems, selectedProductSearch, categoryFilter, selectedSize]);

  const filteredSlotPizzas = React.useMemo(() => {
    const q = flavorSearchQuery.toLowerCase().trim();
    return pizzasList.filter(p => {
      if (p.id === selectedProductId) return false;
      const isAlreadyChosen = customAdditionalFlavors.some((f, idx) => idx !== searchingFlavorSlot && f.id === p.id);
      if (isAlreadyChosen) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.ingredients && p.ingredients.toLowerCase().includes(q));
    });
  }, [pizzasList, selectedProductId, customAdditionalFlavors, searchingFlavorSlot, flavorSearchQuery]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-stone-100 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Premium com Identidade Mais Açaí */}
        <div className="px-5 py-3.5 bg-white border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6a2092] text-white flex items-center justify-center shadow-xs">
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight text-stone-900 tracking-tight font-sans">
                  Editar Pedido #{order.id}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#6a2092] border border-purple-200">
                  {orderType === 'entrega' || orderType === 'Delivery' ? '🛵 Entrega' : orderType === 'retirada' ? '🛍️ Retirada' : '🍽️ Mesa'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                  {paymentMethod}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium leading-none mt-1">
                Altere produtos, complementos, valores e forma de pagamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Atual:</span>
              <span className="text-sm font-black text-[#6a2092] font-mono leading-none">{brl(Number(finalTotal))}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form Body com Grid de 2 Colunas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col justify-between min-h-0">
          <div className="flex-1 overflow-y-auto p-4 adm-rolagem space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* ───────────────────────────────────────────────────
                  COLUNA ESQUERDA (7 COLS): ITENS DO PEDIDO & BUSCA
              ───────────────────────────────────────────────────── */}
              <div className="lg:col-span-7 space-y-3.5">
                
                {/* 1. Lista de Itens Atuais */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Itens do Pedido
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6a2092] text-white">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-600">
                      Subtotal: <strong className="text-stone-900">{brl(Number(subtotal))}</strong>
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto adm-rolagem pr-1 space-y-1.5">
                    {items.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400">
                        Nenhum item no pedido. Adicione itens abaixo.
                      </div>
                    ) : (
                      items.map((item, idx) => {
                        const price = Number(item.priceCalculated || item.price || 0);
                        const qty = Number(item.quantity || 1);
                        const isBeingEdited = editingItemIndex === idx;

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                              isBeingEdited
                                ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300 shadow-2xs'
                                : 'border-stone-200 bg-stone-50/70 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-900 truncate">
                                {formatItemNameForPrint(item)}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                                {item.size && (
                                  <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[9px] border border-purple-200">
                                    {item.size}
                                  </span>
                                )}
                                <span>{brl(Number(price))} un.</span>
                              </div>
                            </div>

                            {/* Qty Controls com Stepper Bonito */}
                            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-stone-200 shadow-2xs shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, -1)}
                                className="w-5 h-5 rounded-md bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Diminuir"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-black text-stone-900 font-mono">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, 1)}
                                className="w-5 h-5 rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>

                            <div className="font-bold text-xs text-stone-900 w-16 text-right font-mono shrink-0">
                              {brl(Number(price * qty))}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditItem(idx)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isBeingEdited
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-stone-400 hover:text-amber-700 hover:bg-amber-50'
                                }`}
                                title="Editar item"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBeingEdited) handleCancelEdit();
                                  handleRemoveItem(idx);
                                }}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remover item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Adicionar / Editar Item (CRM Style) */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={14} className="text-[#6a2092]" />
                      {editingItemIndex !== null ? `Alterar Item #${editingItemIndex + 1}` : 'Adicionar Produto ao Pedido'}
                    </h4>
                    {editingItemIndex !== null && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'acai', label: '🍧 Açaís' },
                      { id: 'combos', label: '🍨 Combos' },
                      { id: 'bebidas', label: '🥤 Bebidas' },
                      { id: 'outros', label: '✨ Outros' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(cat.id as any)}
                        className={`h-7 px-3 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                          categoryFilter === cat.id
                            ? 'bg-[#6a2092] text-white border-[#6a2092] shadow-xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Smart Product Search Combobox */}
                  <div ref={productSearchContainerRef} className="relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={selectedProductSearch}
                        onFocus={() => setIsProductSearchOpen(true)}
                        onChange={(e) => {
                          setSelectedProductSearch(e.target.value);
                          setIsProductSearchOpen(true);
                          if (!e.target.value) {
                            setSelectedProductId('');
                          }
                        }}
                        placeholder={categoryFilter === 'acai' ? "Buscar açaí por sabor ou tamanho..." : "Pesquisar produto no cardápio..."}
                        className="w-full pl-8 pr-8 py-2 bg-stone-50 focus:bg-white rounded-xl border border-stone-200 focus:border-[#6a2092] text-xs font-bold text-stone-900 outline-none transition-all shadow-2xs"
                      />
                      {selectedProductSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductSearch('');
                            setSelectedProductId('');
                            setIsProductSearchOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Autocomplete dropdown */}
                    {isProductSearchOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-300 rounded-xl shadow-xl z-40 max-h-52 overflow-y-auto divide-y divide-stone-100 adm-rolagem">
                        {filteredMenuItems.length === 0 ? (
                          <div className="p-3 text-center text-xs text-stone-400">
                            Nenhum produto encontrado.
                          </div>
                        ) : (
                          filteredMenuItems.map(m => {
                            const isP = isPizzaItem(m);
                            const displayPrice = isP
                              ? (m.priceG || m.priceM || m.priceSingle || 0)
                              : (m.priceSingle || m.price || 0);
                            return (
                              <div
                                key={m.id}
                                onClick={() => handleSelectProduct(m)}
                                className={`p-2.5 text-xs cursor-pointer flex items-center justify-between hover:bg-purple-50/50 transition-colors ${
                                  selectedProductId === m.id ? 'bg-purple-50 font-bold text-[#6a2092]' : 'text-stone-900'
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-bold truncate flex items-center gap-1.5">
                                    <span>{m.name}</span>
                                  </div>
                                  {m.ingredients && (
                                    <div className="text-[10px] text-stone-400 truncate">{m.ingredients}</div>
                                  )}
                                </div>
                                <span className="text-xs font-mono font-bold text-stone-700 shrink-0">
                                  {isP ? `a partir de ${brl(displayPrice)}` : brl(displayPrice)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Size Selection */}
                  {isCurrentSelectionPizza ? (
                    <div className="space-y-1.5 pt-1.5 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Selecione o Tamanho
                        </label>
                        <span className="text-[10px] font-bold text-[#6a2092] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {selectedSize === 'priceSuperBig' ? '1 Litro' : selectedSize === 'priceBig' ? '770ml' : selectedSize === 'priceG' ? '550ml' : selectedSize === 'priceM' ? '440ml' : '330ml'}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { key: 'priceP', label: '330ml', sub: 'P' },
                          { key: 'priceM', label: '440ml', sub: 'M' },
                          { key: 'priceG', label: '550ml', sub: 'G' },
                          { key: 'priceBig', label: '770ml', sub: 'Big' },
                          { key: 'priceSuperBig', label: '1 Litro', sub: 'Super' }
                        ].map(sz => {
                          const isSelected = selectedSize === sz.key;
                          const szPrice = selectedBaseMenuItem ? getPizzaPriceForSize(selectedBaseMenuItem, sz.key) : 0;
                          return (
                            <button
                              key={sz.key}
                              type="button"
                              onClick={() => handleSelectSize(sz.key)}
                              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border text-center ${
                                isSelected
                                  ? 'bg-[#6a2092] text-white font-black border-[#521872] shadow-xs'
                                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold border-stone-200'
                              }`}
                            >
                              <span className="text-xs leading-tight">{sz.label}</span>
                              <span className="text-[9px] opacity-75 leading-tight">{sz.sub}</span>
                              {szPrice > 0 && (
                                <span className={`text-[9px] font-mono mt-0.5 leading-none ${isSelected ? 'text-white' : 'text-stone-900 font-bold'}`}>
                                  {brl(szPrice)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    selectedProductId && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 rounded-xl text-xs font-bold text-stone-700 border border-stone-200">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">Item Individual</span>
                        <span className="font-mono text-stone-900">
                          {brl(Number((selectedBaseMenuItem?.priceSingle || selectedBaseMenuItem?.price || 0)))}
                        </span>
                      </div>
                    )
                  )}

                  {/* Multi-Flavor Selector */}
                  {isCurrentSelectionPizza && ['priceG', 'priceBig', 'priceSuperBig'].includes(selectedSize) && selectedProductId && (
                    <div className="space-y-1.5 pt-1.5 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Sabores Escolhidos ({totalFlavors} de {maxAdditionalFlavors + 1})
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">
                          Cálculo pelo maior valor
                        </span>
                      </div>

                      {/* 1º Sabor (Base) */}
                      <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-[#6a2092] border border-purple-200 shrink-0">
                            {getFractionText(0, totalFlavors)}
                          </span>
                          <span className="font-bold text-stone-900 truncate">
                            {selectedBaseMenuItem?.name || selectedProductSearch}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-stone-600 shrink-0">
                          {brl(Number(getPizzaPriceForSize(selectedBaseMenuItem, selectedSize)))}
                        </span>
                      </div>

                      {/* Sabores Adicionais */}
                      {customAdditionalFlavors.map((flavor, idx) => {
                        const matchingItem = menuItems.find(m => m.id === flavor.id);
                        const sPrice = matchingItem ? getPizzaPriceForSize(matchingItem, selectedSize) : 0;
                        const isSearchingThis = searchingFlavorSlot === idx;

                        if (isSearchingThis) {
                          return (
                            <div key={idx} className="p-2.5 bg-purple-50/70 border-2 border-[#6a2092] rounded-xl space-y-1.5 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#6a2092] flex items-center gap-1">
                                  <Search size={12} />
                                  Trocar {idx + 2}º Sabor:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setSearchingFlavorSlot(null); setFlavorSearchQuery(''); }}
                                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                                >
                                  Cancelar ✕
                                </button>
                              </div>
                              <input
                                ref={flavorSearchInputRef}
                                type="text"
                                value={flavorSearchQuery}
                                onChange={e => setFlavorSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && filteredSlotPizzas.length > 0) {
                                    e.preventDefault();
                                    const chosen = filteredSlotPizzas[0];
                                    const next = [...customAdditionalFlavors];
                                    next[idx] = { id: chosen.id, search: chosen.name };
                                    setCustomAdditionalFlavors(next);
                                    setSearchingFlavorSlot(null);
                                    setFlavorSearchQuery('');
                                  } else if (e.key === 'Escape') {
                                    setSearchingFlavorSlot(null);
                                  }
                                }}
                                placeholder="Digite o nome do sabor..."
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092]"
                              />
                              <div className="max-h-32 overflow-y-auto divide-y divide-stone-100 bg-white rounded-lg border border-stone-200 adm-rolagem">
                                {filteredSlotPizzas.length === 0 ? (
                                  <div className="p-2 text-center text-xs text-stone-400">Nenhum produto encontrado.</div>
                                ) : (
                                  filteredSlotPizzas.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        const next = [...customAdditionalFlavors];
                                        next[idx] = { id: p.id, search: p.name };
                                        setCustomAdditionalFlavors(next);
                                        setSearchingFlavorSlot(null);
                                        setFlavorSearchQuery('');
                                      }}
                                      className="p-2 text-xs font-bold text-stone-800 hover:bg-purple-50 cursor-pointer flex justify-between items-center"
                                    >
                                      <span className="truncate">{p.name}</span>
                                      <span className="text-[11px] font-mono text-stone-500 shrink-0">
                                        {brl(Number(getPizzaPriceForSize(p, selectedSize)))}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-[#6a2092] border border-purple-200 shrink-0">
                                {getFractionText(idx + 1, totalFlavors)}
                              </span>
                              <span className="font-bold text-stone-900 truncate">
                                {flavor.search || flavor.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {sPrice > 0 && (
                                <span className="text-[11px] font-mono font-bold text-stone-600 mr-1">
                                  {brl(Number(sPrice))}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchingFlavorSlot(idx);
                                  setFlavorSearchQuery('');
                                }}
                                className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Trocar este sabor"
                              >
                                <RotateCcw size={11} />
                                <span>Trocar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomAdditionalFlavors(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors text-xs font-bold"
                                title="Remover sabor"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Slot para adicionar sabor */}
                      {searchingFlavorSlot === customAdditionalFlavors.length && (
                        <div className="p-2.5 bg-purple-50/70 border-2 border-[#6a2092] rounded-xl space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#6a2092] flex items-center gap-1">
                              <Search size={12} />
                              Adicionar {customAdditionalFlavors.length + 2}º Sabor:
                            </span>
                            <button
                              type="button"
                              onClick={() => { setSearchingFlavorSlot(null); setFlavorSearchQuery(''); }}
                              className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                            >
                              Cancelar ✕
                            </button>
                          </div>
                          <input
                            ref={flavorSearchInputRef}
                            type="text"
                            value={flavorSearchQuery}
                            onChange={e => setFlavorSearchQuery(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && filteredSlotPizzas.length > 0) {
                                e.preventDefault();
                                const chosen = filteredSlotPizzas[0];
                                setCustomAdditionalFlavors(prev => [...prev, { id: chosen.id, search: chosen.name }]);
                                setSearchingFlavorSlot(null);
                                setFlavorSearchQuery('');
                              } else if (e.key === 'Escape') {
                                setSearchingFlavorSlot(null);
                              }
                            }}
                            placeholder="Digite o nome do sabor..."
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092]"
                          />
                          <div className="max-h-32 overflow-y-auto divide-y divide-stone-100 bg-white rounded-lg border border-stone-200 adm-rolagem">
                            {filteredSlotPizzas.length === 0 ? (
                              <div className="p-2 text-center text-xs text-stone-400">Nenhum produto encontrado.</div>
                            ) : (
                              filteredSlotPizzas.map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setCustomAdditionalFlavors(prev => [...prev, { id: p.id, search: p.name }]);
                                    setSearchingFlavorSlot(null);
                                    setFlavorSearchQuery('');
                                  }}
                                  className="p-2 text-xs font-bold text-stone-800 hover:bg-purple-50 cursor-pointer flex justify-between items-center"
                                >
                                  <span className="truncate">{p.name}</span>
                                  <span className="text-[11px] font-mono text-stone-500 shrink-0">
                                    {brl(Number(getPizzaPriceForSize(p, selectedSize)))}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Botão para abrir o combobox de sabor adicional */}
                      {searchingFlavorSlot === null && customAdditionalFlavors.length < maxAdditionalFlavors && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchingFlavorSlot(customAdditionalFlavors.length);
                            setFlavorSearchQuery('');
                          }}
                          className="w-full py-2 px-3 border border-dashed border-[#6a2092]/40 hover:border-[#6a2092] bg-purple-50/50 hover:bg-purple-50 text-[#6a2092] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} className="stroke-[2.5]" />
                          <span>
                            + Adicionar {customAdditionalFlavors.length === 0 ? (selectedSize === 'priceG' ? '2º Sabor (Meio a Meio)' : '2º Sabor') : `${customAdditionalFlavors.length + 2}º Sabor`}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Botão de Incluir / Salvar Item */}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId && !selectedProductSearch.trim()}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                      editingItemIndex !== null
                        ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                        : 'bg-[#6a2092] hover:bg-[#521872] text-white'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Check size={16} className="stroke-[2.5]" />
                    <span>{editingItemIndex !== null ? 'Salvar Alteração no Item' : '+ Incluir no Pedido'}</span>
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────
                  COLUNA DIREITA (5 COLS): CLIENTE, ENTREGA & AJUSTES
              ───────────────────────────────────────────────────── */}
              <div className="lg:col-span-5 space-y-3.5">
                
                {/* 1. Dados do Cliente & Entrega */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-stone-100">
                    <User size={14} className="text-[#6a2092]" />
                    Cliente & Entrega
                  </h4>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase">Nome do Cliente</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase">Telefone / WhatsApp</label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase">CPF (Opcional)</label>
                        <input
                          type="text"
                          value={customerNif}
                          onChange={(e) => setCustomerNif(e.target.value)}
                          placeholder="123.456.789-00"
                          className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase">Tipo</label>
                        <select
                          value={orderType}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="w-full px-2 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors cursor-pointer"
                        >
                          <option value="entrega">Entrega</option>
                          <option value="retirada">Retirada</option>
                          <option value="mesa">Balcão/Mesa</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase">Pagamento</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-2 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors cursor-pointer"
                        >
                          <option value="PIX">PIX</option>
                          <option value="Cartão de Crédito">Crédito</option>
                          <option value="Cartão de Débito">Débito</option>
                          <option value="Dinheiro">Dinheiro</option>
                        </select>
                      </div>
                    </div>

                    {(orderType === 'entrega' || orderType === 'Delivery') && (
                      <div className="pt-2 border-t border-stone-100 space-y-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                            <MapPin size={11} className="text-[#6a2092]" /> Endereço de Entrega
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-medium text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors"
                            placeholder="Rua, número, complemento, bairro..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase">
                            Zona / Bairro de Entrega
                          </label>
                          <input
                            type="text"
                            value={deliveryZone}
                            onChange={(e) => setDeliveryZone(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors"
                            placeholder="Ex: Centro, Afonso Pena..."
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Dinheiro' && (
                      <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase">Troco Para (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cashProvided || ''}
                            onChange={(e) => setCashProvided(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#6a2092] focus:bg-white transition-colors"
                            placeholder="50,00"
                          />
                        </div>
                        <div className="flex flex-col justify-center bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">Troco a Devolver:</span>
                          <span className="text-sm font-black text-emerald-700 font-mono">{brl(Number(calculatedChange))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Ajustes Financeiros */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-stone-100">
                    <DollarSign size={14} className="text-[#6a2092]" />
                    Ajustes Financeiros
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-emerald-700 uppercase">
                        Desconto (- R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-2.5 py-1.5 bg-emerald-50/40 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-amber-700 uppercase">
                        Taxa Extra / Entrega (+ R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={additionalAmount || ''}
                        onChange={(e) => setAdditionalAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full px-2.5 py-1.5 bg-amber-50/40 rounded-lg border border-amber-200 text-xs font-bold text-amber-900 outline-none focus:border-[#6a2092] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase">
                      Obs. Taxa / Motivo do Ajuste (Sai no Talão)
                    </label>
                    <input
                      type="text"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Ex: Embalagem térmica, taxa motoboy..."
                      className="w-full px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-medium text-stone-900 outline-none focus:border-[#6a2092] transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Resumo da Conta */}
                <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-stone-600">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono font-bold text-stone-800">{brl(Number(subtotal))}</span>
                  </div>
                  {Number(additionalAmount) > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-800">
                      <span>(+) Taxa extra / entrega:</span>
                      <span className="font-mono font-bold">+{brl(Number(additionalAmount))}</span>
                    </div>
                  )}
                  {Number(discountAmount) > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-800">
                      <span>(-) Desconto concedido:</span>
                      <span className="font-mono font-bold">-{brl(Number(discountAmount))}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-purple-200 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Total Recalculado:</span>
                    <span className="text-xl font-black text-[#6a2092] font-mono leading-none">{brl(Number(finalTotal))}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Rodapé Premium Fixo com Ações */}
          <div className="px-5 py-3 bg-white border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-stone-500">
              <span className="font-bold text-stone-800">{items.length} {items.length === 1 ? 'item' : 'itens'}</span> no pedido · <span className="font-bold text-stone-800">{paymentMethod}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-xl font-extrabold text-xs bg-[#6a2092] hover:bg-[#521872] text-white shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={15} className="stroke-[2.5]" />
                <span>{saving ? 'Salvando Pedido...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SparklineData {
  data: number[];
  color: string;
}

function Sparkline({ data, color }: SparklineData) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 36;
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const path = `M${points}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-[100px] h-[36px]">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={path}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="transition-all duration-300"
      />
      <path
        d={path}
        stroke="url(#sparkline-gradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.5}
      />
    </svg>
  );
}

function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  description,
  sparklineData,
  sparklineColor = "#18181B"
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
  trendUp: boolean; 
  description: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">{title}</span>
        <div className="p-1.5 bg-stone-50 rounded-lg border border-stone-200 text-stone-500 group-hover:border-stone-300 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-2xl sm:text-[1.6rem] font-black font-mono tabular-nums text-stone-900 tracking-tight leading-none mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
          trendUp ? 'text-emerald-600' : 'text-rose-500'
        }`}>
          {trendUp ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
          {trend}
        </span>
        <span className="text-[10px] font-mono text-stone-400">{description}</span>
      </div>
    </div>
  );
}

// Painel de relatório (aba Relatórios): número principal + resumo; o clique abre o relatório completo
function PainelRelatorio({
  titulo,
  Icone,
  destaque,
  legenda,
  onAbrir,
  tom = 'neutro',
  children,
}: {
  titulo: string;
  Icone: any;
  destaque?: string;
  legenda?: string;
  onAbrir: () => void;
  tom?: 'neutro' | 'alerta';
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onAbrir}
      className="group text-left bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] hover:border-brand-300 hover:shadow-[0_8px_24px_-12px_rgba(59,2,87,0.25)] transition-all cursor-pointer p-4 flex flex-col gap-3 min-h-[180px]"
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tom === 'alerta' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'}`}>
          <Icone size={18} />
        </span>
        <span className="text-[14px] font-semibold text-stone-900">{titulo}</span>
        <span className="ml-auto text-[13px] font-semibold text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Abrir <ArrowRight size={14} />
        </span>
      </div>
      {destaque !== undefined && (
        <div>
          <p className={`font-display text-[28px] font-extrabold tracking-tight tabular-nums leading-none ${tom === 'alerta' ? 'text-rose-600' : 'text-stone-900'}`}>{destaque}</p>
          {legenda && <p className="text-[13px] text-stone-500 mt-1">{legenda}</p>}
        </div>
      )}
      {children && <div className="flex-1 flex flex-col min-h-0">{children}</div>}
    </button>
  );
}

// Barras pequenas do faturamento por dia (sem eixo; o detalhe fica no relatório completo)
function MiniBarras({ valores }: { valores: number[] }) {
  if (!valores.length) return <p className="text-[13px] text-stone-400">Sem vendas no período.</p>;
  const maior = Math.max(...valores, 1);
  return (
    <div className="flex-1 min-h-16 flex items-end gap-1.5">
      {valores.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-md bg-brand-100 group-hover:bg-brand-200 transition-colors relative" style={{ height: `${Math.max(6, (v / maior) * 100)}%` }}>
          {v === maior && <span className="absolute inset-0 rounded-t-md bg-brand-600" />}
        </div>
      ))}
    </div>
  );
}

// Ranking curto (top 4) usado em Produtos e Adicionais
function ListaRanking({ itens, vazio }: { itens: { nome: string; detalhe: string; valor: string }[]; vazio: string }) {
  if (!itens.length) return <p className="text-[13px] text-stone-400">{vazio}</p>;
  return (
    <ol className="space-y-2.5">
      {itens.map((i, n) => (
        <li key={n} className="flex items-center gap-2 text-[13px]">
          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0 ${n === 0 ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-500'}`}>{n + 1}</span>
          <span className="text-stone-800 truncate flex-1">{i.nome}</span>
          <span className="text-stone-400 tabular-nums whitespace-nowrap">{i.detalhe}</span>
          <span className="font-semibold text-stone-900 tabular-nums whitespace-nowrap w-[76px] text-right">{i.valor}</span>
        </li>
      ))}
    </ol>
  );
}

function ReportCard({ 
  title, 
  value, 
  icon, 
  iconBg = 'bg-stone-100 text-stone-700 border-stone-200/80',
  onClick,
  subtitle,
  customDelay = 0
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  iconBg?: string;
  onClick: () => void;
  subtitle?: string;
  customDelay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: customDelay, 
        ease: [0.2, 0, 0, 1] 
      }}
      whileHover={{ y: -1.5, transition: { duration: 0.15, ease: [0.2, 0, 0, 1] } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
      onClick={onClick}
      className="bg-white px-3 py-2 rounded-xl border border-stone-200/90 hover:border-amber-400/80 hover:bg-amber-50/15 transition-all cursor-pointer flex items-center justify-between text-left w-full group shadow-2xs hover:shadow-xs relative h-[52px]"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 truncate leading-tight">{title}</p>
          {value ? (
            <p className="text-sm font-black font-mono tabular-nums text-stone-900 tracking-tight leading-tight mt-0.5 truncate">{value}</p>
          ) : (
            <p className="text-[10.5px] font-medium text-stone-600 truncate leading-tight mt-0.5">{subtitle || 'Ver detalhes'}</p>
          )}
        </div>
      </div>
      <ArrowDownRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all shrink-0" />
    </motion.button>
  );
}
