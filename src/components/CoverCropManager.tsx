import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Upload, Move, ZoomIn, ZoomOut, RotateCcw, 
  Check, Save, Image as ImageIcon, Sparkles, 
  Eye, RefreshCw, AlertCircle, Trash2 
} from 'lucide-react';

interface CoverCropManagerProps {
  onSuccess?: (msg: string) => void;
}

export default function CoverCropManager({ onSuccess }: CoverCropManagerProps) {
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string>('/capa.png');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  // Estados de manipulação da foto
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega configuração atual do Supabase
  useEffect(() => {
    async function loadCurrentCover() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['store_cover_url', 'store_cover_settings']);

        const coverUrlRow = data?.find(d => d.key === 'store_cover_url');
        const coverSettingsRow = data?.find(d => d.key === 'store_cover_settings');

        if (coverUrlRow?.value) {
          setCurrentCoverUrl(coverUrlRow.value);
        }

        // Se houver foto original salva e parâmetros de enquadramento
        if (coverSettingsRow?.value) {
          try {
            const parsed = typeof coverSettingsRow.value === 'string' 
              ? JSON.parse(coverSettingsRow.value) 
              : coverSettingsRow.value;
            if (parsed.originalImage) {
              setSelectedImage(parsed.originalImage);
              setZoom(parsed.zoom || 1);
              setPan({ x: parsed.panX || 0, y: parsed.panY || 0 });
            }
          } catch (e) {
            console.error('Erro ao restaurar configurações de capa:', e);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar capa:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCurrentCover();
  }, []);

  // Manipulador de upload de arquivo local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // Drag and Move com Mouse ou Touch
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!selectedImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Zoom via Scroll Wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (!selectedImage) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  // Reset de enquadramento
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Gerar o corte em Canvas de alta definição (1200 x 350) e salvar no Supabase
  const handleSaveCrop = async () => {
    if (!selectedImage || !imageRef.current || !containerRef.current) return;

    try {
      setSaving(true);
      setFeedback('Processando e enquadrando imagem em alta definição...');

      const targetWidth = 1200;
      const targetHeight = 350;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Falha ao inicializar o processador de imagem Canvas');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = selectedImage;
      });

      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleToCanvas = targetWidth / containerRect.width;

      // Calcular dimensões base ajustadas
      // Na visualização CSS:
      // A imagem é renderizada com tamanho intrínseco vezes zoom e transladada
      const displayedWidth = img.naturalWidth * (containerRect.width / img.naturalWidth) * zoom;
      const displayedHeight = img.naturalHeight * (containerRect.width / img.naturalWidth) * zoom;

      // Preenche fundo com cor padrão da marca caso haja bordas
      ctx.fillStyle = '#1c0524';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Renderiza com interpolação de alta qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Posicionamento no canvas
      const drawX = pan.x * scaleToCanvas;
      const drawY = pan.y * scaleToCanvas;
      const drawW = displayedWidth * scaleToCanvas;
      const drawH = displayedHeight * scaleToCanvas;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Converte para WebP de alta qualidade ou PNG
      let finalDataUrl = canvas.toDataURL('image/webp', 0.92);
      if (!finalDataUrl.startsWith('data:image/webp')) {
        finalDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      }

      // Salva no Supabase Settings
      const { error: err1 } = await supabase.from('settings').upsert({
        key: 'store_cover_url',
        value: finalDataUrl,
        updated_at: new Date().toISOString()
      });

      if (err1) throw err1;

      // Salva as configurações de ajuste
      const cropSettings = {
        zoom,
        panX: pan.x,
        panY: pan.y,
        originalImage: selectedImage.length < 500000 ? selectedImage : null
      };

      await supabase.from('settings').upsert({
        key: 'store_cover_settings',
        value: JSON.stringify(cropSettings),
        updated_at: new Date().toISOString()
      });

      setCurrentCoverUrl(finalDataUrl);
      setFeedback('Capa do cardápio atualizada com sucesso!');
      onSuccess?.('Capa do cardápio atualizada com sucesso!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar capa:', err);
      alert('Erro ao salvar capa: ' + (err.message || String(err)));
      setFeedback('Erro ao salvar capa.');
    } finally {
      setSaving(false);
    }
  };

  // Restaurar capa padrão oficial
  const handleRestoreDefault = async () => {
    if (!window.confirm('Deseja realmente restaurar a foto da capa padrão original do Mais Açaí?')) {
      return;
    }

    try {
      setSaving(true);
      await supabase.from('settings').upsert([
        { key: 'store_cover_url', value: '/capa.png', updated_at: new Date().toISOString() },
        { key: 'store_cover_settings', value: '', updated_at: new Date().toISOString() }
      ]);
      setCurrentCoverUrl('/capa.png');
      setSelectedImage(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      onSuccess?.('Capa padrão restaurada com sucesso!');
      setFeedback('Capa padrão restaurada com sucesso!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao restaurar capa padrão: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-stone-500">
        Carregando configurações da capa...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <ImageIcon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">Capa do Cardápio Digital (Banner Principal)</h2>
            <p className="text-xs text-stone-500">Personalize a imagem de abertura da sua loja. Você pode mover e dar zoom para enquadrar perfeitamente.</p>
          </div>
        </div>

        {feedback && (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg animate-in fade-in">
            <Check size={14} className="text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Seletor de Arquivo e Ações Iniciais */}
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-stone-800">Foto da Capa do Cardápio</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Proporção ideal: <strong>1200 x 350 px</strong> (panorâmica). Aceita PNG, JPG ou WEBP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#6a2092] hover:bg-[#521872] text-white font-bold text-xs rounded-xl border border-[#521872] cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
          >
            <Upload size={14} />
            <span>{selectedImage ? 'Escolher Outra Foto' : 'Selecionar Nova Foto'}</span>
          </button>

          {currentCoverUrl && currentCoverUrl !== '/capa.png' && (
            <button
              type="button"
              onClick={handleRestoreDefault}
              disabled={saving}
              className="px-3 py-2 text-xs text-stone-600 hover:text-rose-600 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer border border-stone-200 font-semibold"
            >
              Restaurar Padrão
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE ENQUADRAMENTO INTERATIVO COM DRAG & ZOOM */}
      {selectedImage ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Move size={14} className="text-[#6a2092]" />
              Área de Enquadramento: <i>Clique e arraste para posicionar</i>
            </span>
            <div className="flex items-center gap-2 text-[11px] text-stone-500">
              <span>Use a roda do mouse ou o controle abaixo para dar zoom</span>
            </div>
          </div>

          {/* Janela de Corte (Proporção Exata do Banner 1200x350) */}
          <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className={`relative w-full aspect-[1200/350] bg-[#1c0524] rounded-2xl overflow-hidden border-2 shadow-inner select-none touch-none ${
              isDragging ? 'cursor-grabbing border-[#6a2092]' : 'cursor-grab border-stone-300 hover:border-[#6a2092]'
            }`}
          >
            {/* Imagem Móvel com Transform */}
            <img 
              ref={imageRef}
              src={selectedImage}
              alt="Enquadramento da Capa"
              draggable={false}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                maxWidth: '100%',
                display: 'block'
              }}
              className="pointer-events-none select-none max-w-none"
            />

            {/* Linhas Guia da Regra dos Terços (Visíveis para ajudar no enquadramento) */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-b border-white/60"></div>
              <div className="border-r border-white/60"></div>
              <div className="border-r border-white/60"></div>
              <div></div>
            </div>

            {/* Degradê Inferior igual ao do cardápio real */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none"></div>

            {/* Badge de Dica Flutuante */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none border border-white/10 flex items-center gap-1.5 shadow-sm">
              <Move size={11} />
              <span>Arraste para mover</span>
            </div>
          </div>

          {/* Barra de Ferramentas de Zoom & Ajustes */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-4">
            {/* Controle de Zoom */}
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer shadow-2xs"
                title="Diminuir Zoom"
              >
                <ZoomOut size={15} />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input 
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#6a2092]"
                />
                <span className="text-xs font-mono font-bold text-stone-700 w-12 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3, Number((prev + 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer shadow-2xs"
                title="Aumentar Zoom"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Botões de Ação de Enquadramento */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCcw size={13} />
                <span>Centralizar</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5 border border-emerald-700"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Salvar e Aplicar Capa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MOCKUP / PRÉ-VISUALIZAÇÃO DE COMO FICA NO CARDÁPIO REAL */}
      <div className="pt-4 border-t border-stone-100">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={15} className="text-[#6a2092]" />
          <h3 className="text-xs font-bold text-stone-800">
            Pré-visualização: Como o cliente vê no Cardápio Digital
          </h3>
        </div>

        <div className="relative w-full aspect-[1200/350] bg-[#1c0524] rounded-2xl overflow-hidden shadow-md border border-stone-200">
          <img 
            src={currentCoverUrl || '/capa.png'} 
            alt="Capa Ativa" 
            className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none"></div>

          {/* Logo redonda e informações da loja sobrepostas exatamente como no App.tsx */}
          <div className="absolute bottom-4 left-4 sm:left-8 flex items-center gap-3 select-none pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1c0524] rounded-full border-2 sm:border-4 border-white flex items-center justify-center shadow-xl overflow-hidden shrink-0">
              <img 
                src="/logo.png" 
                alt="Mais Açaí" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-white drop-shadow-md">
              <h1 className="text-base sm:text-xl font-black leading-tight flex items-center gap-1.5">
                Mais Açaí <span className="text-xs sm:text-sm">💜</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-purple-200 font-medium">Desde 2016 • São José dos Pinhais / PR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

