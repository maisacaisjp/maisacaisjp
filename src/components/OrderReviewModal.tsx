import React, { useState } from 'react';
import { Star, X, Check, Heart, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
  trackingCode?: string;
  customerName?: string;
  customerPhone?: string;
  onReviewSubmitted?: (review: any) => void;
}

const SENTIMENT_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Muito Ruim 😞', color: 'text-rose-600' },
  2: { text: 'Ruim 😕', color: 'text-amber-600' },
  3: { text: 'Bom 🙂', color: 'text-yellow-600' },
  4: { text: 'Muito Bom! 😊', color: 'text-emerald-600' },
  5: { text: 'Excelente! Adorei! 💜🌟', color: 'text-[#4d0471]' },
};

const POSITIVE_TAGS = [
  '🍨 Açaí no ponto certo',
  '⚡ Entrega super rápida',
  '📦 Muito bem embalado',
  '🍓 Generoso nos adicionais',
  '💜 Atendimento impecável',
  '😋 Cremoso e saboroso',
  '🌡️ Chegou bem geladinho',
];

const NEGATIVE_TAGS = [
  '⏱️ Atrasou a entrega',
  '⚠️ Faltou adicional/item',
  '🍦 Chegou derretido',
  '📦 Embalagem danificada',
  '🥣 Textura não agradou',
];

export default function OrderReviewModal({
  isOpen,
  onClose,
  orderId,
  trackingCode,
  customerName = '',
  customerPhone = '',
  onReviewSubmitted,
}: OrderReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [nome, setNome] = useState(customerName);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveRating = hoverRating || rating;
  const availableTags = currentActiveRating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;

  const toggleTag = (tag: string) => {
    hapticLight();
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setErrorMsg('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        order_id: orderId || null,
        tracking_code: trackingCode || null,
        customer_name: (nome || customerName || 'Cliente').trim(),
        customer_phone: customerPhone || null,
        rating,
        tags: selectedTags,
        comment: comment.trim() || null,
        is_public: true,
      };

      const { data, error } = await supabase
        .from('order_reviews')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setSubmitted(true);
      hapticSuccess();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4d0471', '#fdde58', '#22c55e', '#a855f7'],
      });

      if (onReviewSubmitted && data) {
        onReviewSubmitted(data);
      }

      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2400);
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
      setErrorMsg('Não foi possível enviar a avaliação agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden animate-pop-in text-stone-900 ring-1 ring-stone-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="font-display text-2xl font-black text-stone-900">
              Avaliação enviada!
            </h3>
            <p className="mt-2 text-stone-600 text-sm max-w-xs">
              Muito obrigado pela sua avaliação! Seu feedback ajuda a Mais Açaí a ficar cada vez melhor. 💜
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#4d0471]/10 text-[#4d0471] flex items-center justify-center">
                <Star className="w-4 h-4 fill-[#4d0471]" />
              </div>
              <span className="text-xs font-bold text-[#4d0471] uppercase tracking-wider">
                Avaliação do Pedido
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-black text-stone-900 leading-tight">
              Como foi sua experiência?
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {orderId ? `Pedido #${orderId}` : 'Conte-nos o que achou do seu açaí!'}
            </p>

            {/* Estrelas interativas */}
            <div className="mt-5 flex flex-col items-center">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = (hoverRating !== null ? hoverRating : rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setRating(star);
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 sm:p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-hidden"
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                          isActive
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-stone-200 fill-stone-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Rótulo de Sentimento */}
              <p
                className={`mt-2 font-display text-sm font-bold transition-all ${
                  SENTIMENT_LABELS[currentActiveRating]?.color || 'text-stone-700'
                }`}
              >
                {SENTIMENT_LABELS[currentActiveRating]?.text}
              </p>
            </div>

            {/* Tags de elogios / destaques */}
            <div className="mt-5">
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                {currentActiveRating >= 4 ? 'O que mais gostou?' : 'O que podemos melhorar?'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map(tag => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#4d0471] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nome (se não tiver) */}
            {!customerName && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Seu nome (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Mariana"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4d0471]"
                />
              </div>
            )}

            {/* Campo de comentário */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Comentário ou sugestão (opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ex.: O açaí estava perfeito, cremoso e chegou bem rápido!"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={400}
                className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4d0471] resize-none"
              />
              <span className="text-[10px] text-stone-400 block text-right mt-0.5">
                {comment.length}/400
              </span>
            </div>

            {errorMsg && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{errorMsg}</p>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full h-12 rounded-2xl bg-[#4d0471] hover:bg-[#6a2092] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando avaliação...</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Enviar Avaliação</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

