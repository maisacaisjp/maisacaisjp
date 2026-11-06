import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Megaphone, Image as ImageIcon, Sparkles, CheckCircle2, MessageCircle } from 'lucide-react';

export default function BannerManager() {
  const [feedback, setFeedback] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [promoConfig, setPromoConfig] = useState({
    active: false,
    image_url: '',
    title: '🎉 Bem-vindo(a) ao Mais Açaí!',
    message: 'Obrigado pela visita! 💜\nSou a Bia, do Mais Açaí SJP.\nQuer pedir ou tirar uma dúvida? É só chamar no WhatsApp!',
    button_text: 'Falar no WhatsApp'
  });

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('menu_items').select('*').eq('id', 'system_config_promo').single();
      if (data && data.ingredients) {
        try {
          const parsed = JSON.parse(data.ingredients);
          setPromoConfig(parsed);
        } catch (e) {
          console.error("Error parsing promo config", e);
        }
      }
    }
    loadSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `maisacai/promocoes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cardapio-maisacai')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('cardapio-maisacai')
        .getPublicUrl(filePath);

      setPromoConfig(prev => ({ ...prev, image_url: data.publicUrl }));
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload da imagem: " + error.message);
    } finally {
      setUploadingImage(false);
      setTimeout(() => setFeedback(""), 4000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando promoção...");
    
    const dbItem = {
      id: 'system_config_promo',
      name: 'Configurações de Promoção',
      category: 'system_config',
      ingredients: JSON.stringify(promoConfig),
    };

    await supabase.from('categories').upsert({ id: 'system_config', name: 'Configurações do Sistema', order_index: 99 }, { onConflict: 'id' });
    const { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    if (error) setFeedback("Erro: " + error.message);
    else setFeedback("Pop-up promocional salvo com sucesso!");
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-xl text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
            <form onSubmit={handleSave} className="space-y-4">
              {/* Liga/desliga o pop-up */}
              <div className={`px-4 py-3 rounded-xl border transition-all ${promoConfig.active ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAF9] border-[#E7E5E1]'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="promo-active"
                    checked={promoConfig.active}
                    onChange={e => setPromoConfig({...promoConfig, active: e.target.checked})}
                    className="w-5 h-5 accent-[#6a2092] rounded border-[#E7E5E1] cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[14px] text-[#1C1917] block">Exibir este pop-up na entrada do site</span>
                    <span className="text-[13px] text-[#78716C]">Todo cliente que abrir o cardápio verá este aviso.</span>
                  </div>
                </label>
              </div>

              {/* Título e texto do botão lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-stone-500">Título da promoção ou aviso</label>
                  <input
                    type="text"
                    value={promoConfig.title}
                    onChange={e => setPromoConfig({...promoConfig, title: e.target.value})}
                    placeholder="Ex: Promoção de Terça-feira!"
                    className="w-full h-10 px-3 bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl text-[14px] text-[#1C1917] font-semibold focus:outline-none focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-stone-500">Texto do botão (WhatsApp)</label>
                  <input
                    type="text"
                    value={promoConfig.button_text}
                    onChange={e => setPromoConfig({...promoConfig, button_text: e.target.value})}
                    placeholder="Vazio = sem botão"
                    className="w-full h-10 px-3 bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl text-[14px] text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/15"
                  />
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-stone-500">Mensagem</label>
                <textarea
                  rows={3}
                  value={promoConfig.message}
                  onChange={e => setPromoConfig({...promoConfig, message: e.target.value})}
                  placeholder="Escreva os detalhes da promoção ou mensagem..."
                  className="w-full px-3 py-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl text-[14px] text-[#1C1917] resize-none focus:outline-none focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/15"
                />
              </div>

              {/* Imagem: link ou arquivo, na mesma linha */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-stone-500">Imagem (opcional): cole um link ou envie do computador</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={promoConfig.image_url}
                    onChange={e => setPromoConfig({...promoConfig, image_url: e.target.value})}
                    className="w-full h-10 px-3 bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl text-[14px] text-[#1C1917] focus:outline-none focus:bg-white focus:border-[#6a2092] focus:ring-2 focus:ring-[#6a2092]/15"
                    placeholder="https://..."
                  />
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      aria-label="Enviar imagem do computador"
                      className="block w-full h-10 text-[13px] text-[#78716C]
                        file:mr-3 file:h-full file:px-3
                        file:rounded-lg file:border-0
                        file:text-[13px] file:font-semibold
                        file:bg-[#6a2092]/10 file:text-[#6a2092]
                        hover:file:bg-[#6a2092]/20
                        cursor-pointer border border-[#E7E5E1] rounded-xl p-1 bg-white"
                    />
                    {uploadingImage && <p className="text-xs text-[#78716C] mt-1 font-medium">Enviando imagem...</p>}
                  </div>
                </div>
              </div>

              {/* Salvar */}
              <button
                type="submit"
                className="w-full h-11 bg-[#6a2092] hover:bg-[#521872] text-white rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Save size={17} /> Salvar promoção
              </button>
            </form>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#6a2092]" /> Como o cliente vê
              </h3>
              <span className={`h-7 px-2.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 border ${promoConfig.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${promoConfig.active ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                {promoConfig.active ? 'Ativo na loja' : 'Desativado'}
              </span>
            </div>

            {/* Mobile / Screen Mockup Frame */}
            <div className="bg-[#1C1917] p-4 rounded-2xl shadow-inner border border-gray-800 relative">
              <div className="bg-[#FAFAF9] rounded-xl overflow-hidden shadow-2xl border border-gray-200">
                {promoConfig.image_url ? (
                  <div className="w-full h-44 bg-gray-100 overflow-hidden relative">
                    <img 
                      src={promoConfig.image_url.startsWith('http') ? promoConfig.image_url : (promoConfig.image_url.startsWith('/') ? promoConfig.image_url : '/' + promoConfig.image_url)} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-[#FAFAF9] border-b border-[#E7E5E1] flex flex-col items-center justify-center text-[#A8A29E]">
                    <ImageIcon size={28} />
                    <span className="text-[11px] mt-1 font-medium">Sem imagem configurada</span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <h4 className="font-extrabold text-base text-[#1C1917] leading-snug">
                    {promoConfig.title || 'Título do Pop-up'}
                  </h4>

                  <p className="text-xs text-[#78716C] whitespace-pre-line leading-relaxed">
                    {promoConfig.message || 'Sua mensagem aparecerá aqui...'}
                  </p>

                  {promoConfig.button_text && (
                    <button type="button" className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm">
                      <MessageCircle size={15} />
                      {promoConfig.button_text}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-[#6a2092] font-extrabold uppercase tracking-wider">
                  {promoConfig.active ? '● Visível para os clientes' : '○ Oculto no site'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
