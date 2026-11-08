import React, { useEffect, useState } from 'react';
import { Star, X, CheckCircle2, MessageCircle, Heart, Sparkles, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PublicReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface OrderReview {
  id: string;
  customer_name: string;
  rating: number;
  tags?: string[];
  comment?: string | null;
  store_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
}

export default function PublicReviewsModal({ isOpen, onClose }: PublicReviewsModalProps) {
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!isOpen) return;

    async function loadReviews() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('order_reviews')
          .select('id, customer_name, rating, tags, comment, store_reply, replied_at, created_at')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.warn('Erro ao carregar avaliações públicas:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [isOpen]);

  if (!isOpen) return null;

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
      : '5.0';

  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, r.rating || 5));
    counts[star] = (counts[star] || 0) + 1;
  });

  const filteredReviews =
    filterRating === 'all'
      ? reviews
      : reviews.filter(r => r.rating === filterRating);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in ring-1 ring-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#4d0471] text-amber-300 flex items-center justify-center shadow-xs">
              <Star className="w-5 h-5 fill-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-stone-900 leading-tight">
                Avaliações da Loja
              </h2>
              <p className="text-xs text-stone-500">Mais Açaí · São José dos Pinhais</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Resumo com média e barras */}
          <div className="bg-gradient-to-br from-purple-50/70 to-amber-50/40 rounded-2xl p-4.5 ring-1 ring-[#4d0471]/10 flex flex-col sm:flex-row items-center gap-5">
            <div className="flex flex-col items-center shrink-0">
              <span className="font-display text-4xl sm:text-5xl font-black text-[#4d0471]">
                {averageRating}
              </span>
              <div className="flex items-center gap-1 my-1 text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-stone-600">
                {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>

            {/* Barras de distribuição */}
            <div className="w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = counts[stars] || 0;
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="w-4 font-bold">{stars}★</span>
                    <div className="flex-1 h-2 rounded-full bg-stone-200/80 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-stone-500 font-mono text-[11px]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtros rápidos por estrelas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilterRating('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                filterRating === 'all'
                  ? 'bg-[#4d0471] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todas ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map(stars => (
              <button
                key={stars}
                type="button"
                onClick={() => setFilterRating(stars)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  filterRating === stars
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{stars}</span>
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] opacity-75">({counts[stars] || 0})</span>
              </button>
            ))}
          </div>

          {/* Lista de avaliações */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400">
              <div className="w-6 h-6 border-2 border-[#4d0471] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs">Carregando avaliações...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-10 text-center text-stone-400">
              <p className="text-sm font-semibold">Nenhuma avaliação com esse filtro ainda.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReviews.map(review => {
                const dataFormatada = new Date(review.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={review.id}
                    className="p-4 rounded-2xl bg-white border border-stone-100 shadow-2xs space-y-2 hover:border-purple-200 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#4d0471]/10 text-[#4d0471] font-bold text-xs flex items-center justify-center">
                          {review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-stone-900 block leading-tight">
                            {review.customer_name || 'Cliente Mais Açaí'}
                          </span>
                          <span className="text-[10px] text-stone-400">{dataFormatada}</span>
                        </div>
                      </div>

                      {/* Estrelas */}
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating ? 'fill-amber-400' : 'text-stone-200 fill-stone-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {review.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-[#4d0471] border border-purple-100/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comentário */}
                    {review.comment && (
                      <p className="text-xs text-stone-700 leading-relaxed pt-0.5">
                        "{review.comment}"
                      </p>
                    )}

                    {/* Resposta da Loja */}
                    {review.store_reply && (
                      <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border-l-3 border-[#4d0471] text-xs">
                        <div className="flex items-center gap-1 font-bold text-[#4d0471] text-[11px] mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Resposta da Mais Açaí</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed text-[11px]">
                          {review.store_reply}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <span>Mais Açaí · Desde 2016</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#4d0471] hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

