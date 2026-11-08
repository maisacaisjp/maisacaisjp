import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Save, Printer, Bell, BellOff, Volume2, 
  Clock, Truck, Building2, Key, FileSpreadsheet, 
  Sparkles, Check, CheckCircle2, 
  Sliders, AlertCircle, Trash2, Upload,
  Shield, CheckCheck, RefreshCw, Image as ImageIcon,
  BotMessageSquare, Send, Bike
} from 'lucide-react';

import { getCashbackConfig, saveCashbackConfig, DEFAULT_CASHBACK_PERCENT, DEFAULT_CASHBACK_VALIDADE_DIAS } from '../utils/cashback';
import CoverCropManager from './CoverCropManager';
import { brl } from '../utils/formatacao';

interface SettingsManagerProps {
  onTestPrint?: (order: any) => void;
  autoPrint?: boolean;
  onToggleAutoPrint?: () => void;
  onExportCSV?: () => void;
  onChangePassword?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onTestSound?: () => void;
}

type SettingsTab = 'empresa' | 'capa' | 'horarios' | 'impressao' | 'entregas' | 'cashback' | 'automacoes' | 'notificacoes' | 'seguranca';

export default function SettingsManager({ 
  onTestPrint, 
  autoPrint, 
  onToggleAutoPrint, 
  onExportCSV, 
  onChangePassword,
  soundEnabled = true,
  onToggleSound,
  onTestSound
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  const showSavedFeedback = (msg = "Alterações salvas com sucesso!") => {
    setSavedStatus(msg);
    setTimeout(() => setSavedStatus(null), 3000);
  };

  // ────────────────── ESTADO: EMPRESA & IDENTIDADE ──────────────────
  const [companyInfo, setCompanyInfo] = useState({ name: "Mais Açaí", nif: '', address: '' });
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['company_name', 'company_nif', 'company_address']);
      const info = { name: "Mais Açaí", nif: '', address: '' };
      data?.forEach((row: any) => {
        if (row.key === 'company_name') info.name = row.value;
        if (row.key === 'company_nif') info.nif = row.value;
        if (row.key === 'company_address') info.address = row.value;
      });
      setCompanyInfo(info);
    }
    loadCompany();
  }, []);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    await supabase.from('settings').upsert([
      { key: 'company_name', value: companyInfo.name, updated_at: new Date().toISOString() },
      { key: 'company_nif', value: companyInfo.nif, updated_at: new Date().toISOString() },
      { key: 'company_address', value: companyInfo.address, updated_at: new Date().toISOString() },
    ]);
    setSavingCompany(false);
    showSavedFeedback("Dados da empresa atualizados!");
  };

  // ────────────────── ESTADO: LOGO COM PREVIEW VISUAL ──────────────────
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [uploadingAdminLogo, setUploadingAdminLogo] = useState(false);

  useEffect(() => {
    async function loadAdminLogo() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    }
    loadAdminLogo();
  }, []);

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAdminLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-logo-${Date.now()}.${fileExt}`;
      const filePath = `admin/logo/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cardapio-maisacai').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('cardapio-maisacai').getPublicUrl(filePath);
      const newUrl = data.publicUrl;
      setAdminLogoUrl(newUrl);
      await supabase.from('settings').upsert({ key: 'admin_logo_url', value: newUrl, updated_at: new Date().toISOString() });
      showSavedFeedback("Logo da loja atualizada!");
    } catch (error: any) {
      console.error(error);
      alert("Erro no upload da logo: " + error.message);
    } finally {
      setUploadingAdminLogo(false);
    }
  };

  const handleRemoveAdminLogo = async () => {
    setAdminLogoUrl('');
    await supabase.from('settings').upsert({ key: 'admin_logo_url', value: '', updated_at: new Date().toISOString() });
    showSavedFeedback("Logo removida.");
  };

  // ────────────────── ESTADO: HORÁRIOS DE FUNCIONAMENTO ──────────────────
  const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const [hours, setHours] = useState<any[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    async function loadHours() {
      const { data } = await supabase.from('business_hours').select('*').order('day_of_week');
      if (data) setHours(data);
    }
    loadHours();
  }, []);

  const updateDay = (dayOfWeek: number, field: string, value: any) => {
    setHours(prev => prev.map(h => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    const { error } = await supabase.from('business_hours').upsert(hours, { onConflict: 'day_of_week' });
    setSavingHours(false);
    if (error) alert("Erro ao salvar horários: " + error.message);
    else showSavedFeedback("Grade de horários salva com sucesso!");
  };

  // ────────────────── ESTADO: IMPRESSÃO & COMANDAS ──────────────────
  const [printDelay, setPrintDelay] = useState('200');
  const [savingPrint, setSavingPrint] = useState(false);

  useEffect(() => {
    async function loadPrintDelay() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'print_delay_ms').maybeSingle();
      if (data?.value) setPrintDelay(String(data.value));
    }
    loadPrintDelay();
  }, []);

  const handleSavePrintDelay = async () => {
    setSavingPrint(true);
    await supabase.from('settings').upsert({ key: 'print_delay_ms', value: printDelay, updated_at: new Date().toISOString() });
    setSavingPrint(false);
    showSavedFeedback("Parâmetros de impressão salvos!");
  };

  const handleTestPrint = () => {
    if (onTestPrint) {
      onTestPrint({
        id: 'TESTE',
        customerName: 'Cliente de Teste',
        orderType: 'Delivery',
        paymentMethod: 'Dinheiro',
        totalAmount: 20.90,
        createdAt: new Date().toISOString(),
        items: [
          { name: '1 - Margherita (Gr)', quantity: 1, priceCalculated: 18.90, basePrice: 18.90, extras: [] },
          { name: 'Coca Cola (Lata)', quantity: 1, priceCalculated: 2.00, basePrice: 2.00, extras: [] }
        ]
      });
    }
  };

  // ────────────────── ESTADO: ENTREGAS & PRAZOS ──────────────────
  const [deliveryTime, setDeliveryTime] = useState('40 a 50 min');
  const [pickupTime, setPickupTime] = useState('25 a 35 min');
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    async function loadTimes() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['delivery_time_estimate', 'pickup_time_estimate']);
      data?.forEach((row: any) => {
        if (row.key === 'delivery_time_estimate') setDeliveryTime(row.value);
        if (row.key === 'pickup_time_estimate') setPickupTime(row.value);
      });
    }
    loadTimes();
  }, []);

  const handleSaveTimes = async () => {
    setSavingTimes(true);
    await supabase.from('settings').upsert([
      { key: 'delivery_time_estimate', value: deliveryTime, updated_at: new Date().toISOString() },
      { key: 'pickup_time_estimate', value: pickupTime, updated_at: new Date().toISOString() },
    ]);
    setSavingTimes(false);
    showSavedFeedback("Estimativas de prazos salvas com sucesso!");
  };

  // ────────────────── ESTADO: FIDELIDADE & CASHBACK ──────────────────
  const [cashbackEnabled, setCashbackEnabled] = useState(true);
  const [cashbackPercent, setCashbackPercent] = useState(String(DEFAULT_CASHBACK_PERCENT));
  const [cashbackValidade, setCashbackValidade] = useState(String(DEFAULT_CASHBACK_VALIDADE_DIAS));
  const [savingCashback, setSavingCashback] = useState(false);

  useEffect(() => {
    async function loadCashback() {
      const cfg = await getCashbackConfig();
      setCashbackEnabled(cfg.enabled);
      setCashbackPercent(String(cfg.percent));
      setCashbackValidade(String(cfg.validadeDias));
    }
    loadCashback();
  }, []);

  const handleSaveCashback = async () => {
    setSavingCashback(true);
    const num = parseFloat(cashbackPercent);
    const validPercent = isNaN(num) || num < 0 ? DEFAULT_CASHBACK_PERCENT : num;
    const dias = parseInt(cashbackValidade, 10);
    const validDias = isNaN(dias) || dias < 1 ? DEFAULT_CASHBACK_VALIDADE_DIAS : dias;
    const ok = await saveCashbackConfig(cashbackEnabled, validPercent, validDias);
    setSavingCashback(false);
    if (ok) {
      showSavedFeedback("Regras de Cashback salvas com sucesso!");
    } else {
      alert("Erro ao salvar regras de Cashback.");
    }
  };

  // ────────────────── ESTADO: AUTOMAÇÕES WHATSAPP & MOTOBOY ──────────────────
  const [waStatusPedidos, setWaStatusPedidos] = useState(false);
  const [waPosVendaAvaliacao, setWaPosVendaAvaliacao] = useState(false);
  const [waCampanhaReativacao, setWaCampanhaReativacao] = useState(false);
  const [motoboyDefaultFee, setMotoboyDefaultFee] = useState('6.00');
  const [savingAutomacoes, setSavingAutomacoes] = useState(false);

  useEffect(() => {
    async function loadAutomacoes() {
      const { data } = await supabase.from('settings').select('key, value').in('key', [
        'whatsapp_status_pedidos',
        'whatsapp_pos_venda_avaliacao',
        'whatsapp_campanha_reativacao',
        'motoboy_default_fee'
      ]);
      data?.forEach((row: any) => {
        if (row.key === 'whatsapp_status_pedidos') setWaStatusPedidos(row.value === 'true');
        if (row.key === 'whatsapp_pos_venda_avaliacao') setWaPosVendaAvaliacao(row.value === 'true');
        if (row.key === 'whatsapp_campanha_reativacao') setWaCampanhaReativacao(row.value === 'true');
        if (row.key === 'motoboy_default_fee') setMotoboyDefaultFee(row.value || '6.00');
      });
    }
    loadAutomacoes();
  }, []);

  const handleSaveAutomacoes = async (status = waStatusPedidos, posVenda = waPosVendaAvaliacao, reativacao = waCampanhaReativacao, fee = motoboyDefaultFee) => {
    setSavingAutomacoes(true);
    await supabase.from('settings').upsert([
      { key: 'whatsapp_status_pedidos', value: String(status), updated_at: new Date().toISOString() },
      { key: 'whatsapp_pos_venda_avaliacao', value: String(posVenda), updated_at: new Date().toISOString() },
      { key: 'whatsapp_campanha_reativacao', value: String(reativacao), updated_at: new Date().toISOString() },
      { key: 'motoboy_default_fee', value: String(fee), updated_at: new Date().toISOString() },
    ]);
    setSavingAutomacoes(false);
    showSavedFeedback("Automações e taxa salvas com sucesso!");
  };

  // Categorias do menu lateral de navegação
  const navItems = [
    { id: 'empresa' as SettingsTab, label: 'Empresa & Marca', icon: Building2, desc: 'Nome, CNPJ, endereço e logo' },
    { id: 'capa' as SettingsTab, label: 'Capa do Cardápio', icon: ImageIcon, desc: 'Banner e enquadramento da foto' },
    { id: 'horarios' as SettingsTab, label: 'Horários de Funcionamento', icon: Clock, desc: 'Turnos e dias operacionais' },
    { id: 'impressao' as SettingsTab, label: 'Impressão Térmica', icon: Printer, desc: 'Auto-impressão e atrasos' },
    { id: 'entregas' as SettingsTab, label: 'Entregas & Prazos', icon: Truck, desc: 'Tempo estimado de espera e entrega' },
    { id: 'cashback' as SettingsTab, label: 'Fidelidade & Cashback', icon: Sparkles, desc: '% de bônus por compra do cliente' },
    { id: 'automacoes' as SettingsTab, label: 'Automações WhatsApp', icon: BotMessageSquare, desc: 'Avisos de saída, pós-venda e reativação' },
    { id: 'notificacoes' as SettingsTab, label: 'Notificações & Som', icon: Bell, desc: 'Alertas sonoros de novos pedidos' },
    { id: 'seguranca' as SettingsTab, label: 'Segurança & Backup', icon: Key, desc: 'Troca de senha e exportação CSV' },
  ];

  return (
    <div className="pb-8 font-sans">
      
      {savedStatus && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white shadow-2xl text-[13px] font-semibold">
            <CheckCheck size={15} className="text-emerald-400" />
            <span>{savedStatus}</span>
          </div>
        )}

      {/* ────────────────── LAYOUT EM 2 COLUNAS: ABAS LATERAIS + CONTEÚDO ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Coluna Esquerda: Navegação Lateral Fixa */}
        <aside className="md:col-span-4 lg:col-span-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#6a2092] text-white shadow-xs' 
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate leading-tight">{item.label}</span>
                  <span className={`text-[10px] block truncate leading-tight mt-0.5 ${isActive ? 'text-white/70' : 'text-stone-400'}`}>{item.desc}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Coluna Direita: Conteúdo com Largura Máxima (~650px) para Leitura Confortável */}
        <main className="md:col-span-8 lg:col-span-9">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] overflow-hidden">
            
            {/* ═══════════ 1. EMPRESA & MARCA ═══════════ */}
            {activeTab === 'empresa' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Empresa & Identidade Visual</h2>
                    <p className="text-xs text-stone-500">Dados impressos nas comandas térmicas e a logo oficial do painel.</p>
                  </div>
                </div>

                {/* Logo e capa lado a lado em tela larga */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                {/* Área de Logo com Drop/Preview Redondo */}
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-2">Logo do Painel de Controle</label>
                  <div className="h-[calc(100%-1.75rem)] p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-black border-2 border-stone-300 flex items-center justify-center p-1 shadow-xs shrink-0">
                      {adminLogoUrl ? (
                        <img src={adminLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Building2 size={24} className="text-stone-500" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <p className="text-xs font-bold text-stone-900">
                        {adminLogoUrl ? 'Logo Atual Ativa' : 'Nenhuma logo configurada'}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Formato quadrado recomendado (PNG ou JPG). Aparece no topo do menu lateral.</p>
                      
                      <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <label className="px-3 py-1.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold text-xs rounded-lg border border-[#521872] cursor-pointer shadow-xs transition-all flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>{uploadingAdminLogo ? 'Enviando...' : 'Fazer Upload de Logo'}</span>
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            onChange={handleAdminLogoUpload}
                            disabled={uploadingAdminLogo}
                            className="hidden" 
                          />
                        </label>
                        {adminLogoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAdminLogo}
                            className="px-3 py-1.5 text-xs text-stone-600 hover:text-rose-600 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Atalho para Capa do Cardápio */}
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-2">Capa do Cardápio Digital (Banner)</label>
                  <div className="h-[calc(100%-1.75rem)] p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6a2092] flex items-center justify-center shrink-0">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900">Personalizar e Enquadrar Capa</p>
                        <p className="text-[11px] text-stone-500">Mude a foto de abertura do cardápio e arraste para posicionar no tamanho exato.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('capa')}
                      className="px-4 py-2 bg-[#6a2092] hover:bg-[#521872] text-white font-bold text-xs rounded-lg transition-all shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                    >
                      <ImageIcon size={13} />
                      <span>Enquadrar Capa</span>
                    </button>
                  </div>
                </div>
                </div>

                {/* Formulário de Dados da Empresa */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">Nome do Estabelecimento</label>
                    <input 
                      type="text" 
                      value={companyInfo.name} 
                      onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})} 
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/20 outline-none transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">CNPJ</label>
                      <input 
                        type="text" 
                        value={companyInfo.nif} 
                        onChange={e => setCompanyInfo({...companyInfo, nif: e.target.value})} 
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-semibold text-stone-900 focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/20 outline-none transition-all" 
                        placeholder="Ex: 00.000.000/0001-00"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Endereço</label>
                      <input 
                        type="text" 
                        value={companyInfo.address} 
                        onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})} 
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/20 outline-none transition-all" 
                        placeholder="Ex: Rua das Flores, 41"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button 
                    onClick={handleSaveCompany} 
                    disabled={savingCompany}
                    className="px-5 py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#521872] cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ CAPA DO CARDÁPIO DIGITAL (ENQUADRAMENTO) ═══════════ */}
            {activeTab === 'capa' && (
              <CoverCropManager onSuccess={showSavedFeedback} />
            )}

            {/* ═══════════ 2. HORÁRIOS DE FUNCIONAMENTO ═══════════ */}
            {activeTab === 'horarios' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Horários de Funcionamento</h2>
                    <p className="text-xs text-stone-500">Defina os dias e turnos em que a loja aceita pedidos online.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                  {hours.map((h) => (
                    <div 
                      key={h.day_of_week} 
                      className={`px-3 py-2 min-h-11 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        h.is_closed ? 'bg-stone-50/80' : 'bg-white hover:bg-brand-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-3 w-40">
                        <span className="text-xs font-bold text-stone-900">{DAY_NAMES[h.day_of_week]}</span>
                      </div>

                      {/* Controle Unificado: Toggle Moderno iOS/Linear */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateDay(h.day_of_week, 'is_closed', !h.is_closed)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            !h.is_closed ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                          role="switch"
                          aria-checked={!h.is_closed}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              !h.is_closed ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-[11px] font-mono text-stone-500 w-16">
                          {!h.is_closed ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>

                      {!h.is_closed ? (
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <input
                            type="time"
                            value={h.opens_at ? h.opens_at.slice(0,5) : ''}
                            onChange={(e) => updateDay(h.day_of_week, 'opens_at', e.target.value)}
                            className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-[#6a2092]"
                          />
                          <span className="text-stone-300">→</span>
                          <input
                            type="time"
                            value={h.closes_at ? h.closes_at.slice(0,5) : ''}
                            onChange={(e) => updateDay(h.day_of_week, 'closes_at', e.target.value)}
                            className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-[#6a2092]"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-400 italic">Folga semanal</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button 
                    onClick={handleSaveHours} 
                    disabled={savingHours}
                    className="px-5 py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#521872] cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingHours ? 'Salvando...' : 'Salvar Grade de Horários'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 3. IMPRESSÃO TÉRMICA ═══════════ */}
            {activeTab === 'impressao' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <Printer size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Impressão Térmica & Comandas</h2>
                    <p className="text-xs text-stone-500">Configurações para impressoras de 80mm ou 58mm (balcão e cozinha).</p>
                  </div>
                </div>

                {/* Toggle Padronizado de Auto-Impressão */}
                {onToggleAutoPrint && (
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Auto-Imprimir Comandas</span>
                      <span className="text-[11px] text-stone-500">Imprime o comprovante no momento em que o pedido é aceito.</span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleAutoPrint}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        autoPrint ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      role="switch"
                      aria-checked={autoPrint}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoPrint ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Atraso antes do envio à impressora (ms)</label>
                  <p className="text-[11px] text-stone-500 mb-2">Permite que imagens e layout do cupom terminem de renderizar no navegador.</p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      value={printDelay}
                      onChange={e => setPrintDelay(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-[#6a2092] outline-none"
                    />
                    <span className="text-xs font-mono text-stone-500">ms</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <button 
                    onClick={handleTestPrint} 
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-stone-200"
                  >
                    <Printer size={14} />
                    <span>Imprimir Cupom de Teste</span>
                  </button>

                  <button 
                    onClick={handleSavePrintDelay} 
                    disabled={savingPrint}
                    className="px-5 py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#521872] cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingPrint ? 'Salvando...' : 'Salvar Impressão'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 4. ENTREGAS & PRAZOS ═══════════ */}
            {activeTab === 'entregas' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Prazos de Entrega & Retirada</h2>
                    <p className="text-xs text-stone-500">Estimativas informadas diretamente aos clientes no cardápio online.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Tempo Estimado de Entrega</label>
                      <input 
                        type="text" 
                        value={deliveryTime} 
                        onChange={e => setDeliveryTime(e.target.value)} 
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-[#6a2092] outline-none" 
                        placeholder="Ex: 40 a 50 min"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Tempo Estimado para Retirada</label>
                      <input 
                        type="text" 
                        value={pickupTime} 
                        onChange={e => setPickupTime(e.target.value)} 
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-[#6a2092] outline-none" 
                        placeholder="Ex: 20 a 30 min"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button 
                    onClick={handleSaveTimes} 
                    disabled={savingTimes}
                    className="px-5 py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#521872] cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingTimes ? 'Salvando...' : 'Salvar Prazos'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 5. FIDELIDADE & CASHBACK ═══════════ */}
            {activeTab === 'cashback' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Programa de Cashback & Fidelidade</h2>
                    <p className="text-xs text-stone-500">Incentive a recorrência creditando uma porcentagem de cada compra para o cliente usar no próximo pedido.</p>
                  </div>
                </div>

                {/* Ativação do Programa */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCashbackEnabled(!cashbackEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        cashbackEnabled ? 'bg-amber-600' : 'bg-stone-300'
                      }`}
                      role="switch"
                      aria-checked={cashbackEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          cashbackEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        {cashbackEnabled ? 'Cashback Ativado' : 'Cashback Pausado'}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {cashbackEnabled ? 'Clientes acumulam saldo automaticamente a cada pedido concluído.' : 'Nenhum cashback será acumulado ou exibido no cardápio.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configuração da Porcentagem */}
                <div className={`space-y-4 transition-opacity ${cashbackEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  {/* Porcentagem e validade lado a lado */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-stone-800 block mb-1">
                      Porcentagem de Cashback por Compra (%)
                    </label>
                    <p className="text-[11px] text-stone-500 mb-3">
                      Defina a porcentagem do valor dos itens que retorna como crédito para o cliente.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {['3', '5', '7', '10', '15'].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCashbackPercent(pct)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            cashbackPercent === pct
                              ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {pct}% {pct === '5' && '(Recomendado)'}
                        </button>
                      ))}
                    </div>

                    <div className="max-w-xs relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={cashbackPercent}
                        onChange={(e) => setCashbackPercent(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-[#6a2092] outline-none pr-8"
                        placeholder="Ex: 5"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">%</span>
                    </div>
                  </div>

                  {/* Validade de cada crédito */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700">Validade do cashback (dias)</label>
                    <p className="text-[11px] text-stone-500">
                      Cada compra gera um crédito que vence depois desses dias. Ao usar o saldo, o sistema gasta primeiro o crédito que vence antes.
                    </p>
                    <div className="max-w-xs relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={cashbackValidade}
                        onChange={(e) => setCashbackValidade(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-[#6a2092] outline-none pr-12"
                        placeholder="Ex: 60"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">dias</span>
                    </div>
                  </div>
                  </div>

                  {/* Simulador de Exemplo */}
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>💡 Simulação em Tempo Real:</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Um cliente que fizer um pedido de <strong>R$ 30,00</strong> acumulará <strong>{brl(Number(((30 * (parseFloat(cashbackPercent) || 0)) / 100)))}</strong> de crédito para abater em compras futuras, válido por <strong>{parseInt(cashbackValidade, 10) || DEFAULT_CASHBACK_VALIDADE_DIAS} dias</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={handleSaveCashback}
                    disabled={savingCashback}
                    className="px-5 py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#521872] cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingCashback ? 'Salvando...' : 'Salvar Regras de Cashback'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ AUTOMAÇÕES WHATSAPP & MOTOBOY ═══════════ */}
            {activeTab === 'automacoes' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-[#4d0471]/10 text-[#4d0471] flex items-center justify-center border border-[#4d0471]/20">
                    <BotMessageSquare size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Automações Ativas de WhatsApp</h2>
                    <p className="text-xs text-stone-500">Controle mensagens automáticas de saída, pós-venda, avaliações e retenção.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Switch 1: Status de Entrega */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !waStatusPedidos;
                          setWaStatusPedidos(next);
                          handleSaveAutomacoes(next, waPosVendaAvaliacao, waCampanhaReativacao);
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-0.5 ${
                          waStatusPedidos ? 'bg-[#4d0471]' : 'bg-stone-300'
                        }`}
                        role="switch"
                        aria-checked={waStatusPedidos}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            waStatusPedidos ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">Aviso de Saída para Entrega</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            waStatusPedidos ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {waStatusPedidos ? 'Ativado' : 'Desligado (Padrão)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Envia uma mensagem no WhatsApp do cliente assim que o pedido for despachado com o motoboy.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Switch 2: Pós-Venda & Avaliação */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !waPosVendaAvaliacao;
                          setWaPosVendaAvaliacao(next);
                          handleSaveAutomacoes(waStatusPedidos, next, waCampanhaReativacao);
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-0.5 ${
                          waPosVendaAvaliacao ? 'bg-[#4d0471]' : 'bg-stone-300'
                        }`}
                        role="switch"
                        aria-checked={waPosVendaAvaliacao}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            waPosVendaAvaliacao ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">Pesquisa de Pós-Venda & Avaliação</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            waPosVendaAvaliacao ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {waPosVendaAvaliacao ? 'Ativado' : 'Desligado (Padrão)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Envia mensagem 40 minutos após a entrega perguntando se o açaí estava perfeito e com link para avaliar no site.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Switch 3: Reativação com Cupom */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !waCampanhaReativacao;
                          setWaCampanhaReativacao(next);
                          handleSaveAutomacoes(waStatusPedidos, waPosVendaAvaliacao, next);
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-0.5 ${
                          waCampanhaReativacao ? 'bg-[#4d0471]' : 'bg-stone-300'
                        }`}
                        role="switch"
                        aria-checked={waCampanhaReativacao}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            waCampanhaReativacao ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">Campanha de Reativação de Clientes Sumidos</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            waCampanhaReativacao ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {waCampanhaReativacao ? 'Ativado' : 'Desligado (Padrão)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Dispara mensagem com cupom de desconto para clientes que não realizam pedidos há mais de 20 dias.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campo Taxa Padrão Motoboy Sob Demanda */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Bike size={16} className="text-[#4d0471]" />
                      <span className="text-xs font-bold text-stone-900">Taxa Padrão por Corrida do Motoboy (Sob Demanda)</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3">
                      Valor padrão pago por corrida para entregadores freelancers em São José dos Pinhais (usado no cálculo de acerto de diária).
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="relative w-40">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400">R$</span>
                        <input
                          type="text"
                          value={motoboyDefaultFee}
                          onChange={(e) => setMotoboyDefaultFee(e.target.value)}
                          placeholder="6.00"
                          className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-[#4d0471]"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveAutomacoes(waStatusPedidos, waPosVendaAvaliacao, waCampanhaReativacao, motoboyDefaultFee)}
                        disabled={savingAutomacoes}
                        className="px-4 py-2 bg-[#4d0471] hover:bg-[#3b0357] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                      >
                        {savingAutomacoes ? 'Salvando...' : 'Salvar Taxa'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ 6. NOTIFICAÇÕES & SOM ═══════════ */}
            {activeTab === 'notificacoes' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Notificações & Alerta Sonoro</h2>
                    <p className="text-xs text-stone-500">Aviso sonoro no balcão e na cozinha ao entrar um pedido novo.</p>
                  </div>
                </div>

                {/* Toggle Padronizado de Som */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onToggleSound}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        soundEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      role="switch"
                      aria-checked={soundEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          soundEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        {soundEnabled ? <><Bell size={13} className="text-emerald-600" /> Alerta Sonoro Ativo</> : <><BellOff size={13} className="text-stone-400" /> Som Mudo</>}
                      </span>
                      <span className="text-[11px] text-stone-500">Toca repetidamente até o operador abrir a comanda.</span>
                    </div>
                  </div>

                  {onTestSound && (
                    <button
                      type="button"
                      onClick={onTestSound}
                      className="px-3.5 py-2 bg-[#6a2092] hover:bg-[#521872] text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <Volume2 size={14} />
                      <span>Testar Toque</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════ 6. SEGURANÇA & BACKUP ═══════════ */}
            {activeTab === 'seguranca' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200">
                    <Key size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Segurança & Exportação de Dados</h2>
                    <p className="text-xs text-stone-500">Credenciais administrativas e exportação contábil para planilhas.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block mb-1">Senha de Administrador</span>
                      <span className="text-[11px] text-stone-500">Altere a senha mestre de acesso a este painel.</span>
                    </div>
                    <button 
                      onClick={onChangePassword} 
                      className="mt-4 w-full py-2.5 bg-[#6a2092] hover:bg-[#521872] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Key size={13} />
                      <span>Alterar Senha</span>
                    </button>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block mb-1">Planilha de Pedidos</span>
                      <span className="text-[11px] text-stone-500">Baixe o histórico com clientes, totais e pagamentos.</span>
                    </div>
                    <button 
                      onClick={onExportCSV} 
                      className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Exportar CSV Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
