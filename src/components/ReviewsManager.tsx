import React, { useEffect, useState } from 'react';
import {
  Star,
  Search,
  Filter,
  MessageSquare,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Send,
  Sparkles,
  Heart,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { brl } from '../utils/formatacao';

export interface AdminReview {
  id: string;
  order_id: number | null;
  tracking_code: string | null;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  tags: string[];
  comment: string | null;
  store_reply: string | null;
  replied_at: string | null;
  is_public: boolean;
  created_at: string;
}

const TEMPLATES_RESPOSTA = [
  'Muito obrigado pelo carinho e pela preferência! Ficamos muito felizes que você gostou! 💜🍨',
  'Que alegria saber que você teve uma ótima experiência! Nossa equipe prepara tudo com muito amor! 🌟',
  'Agradecemos imensamente a sua avaliação! Esperamos você de novo em breve! 💜',
  'Pedimos sinceras desculpas pelo ocorrido. Já alinhamos com a equipe e entraremos em contato para resolver! 🙏',
];

export default function ReviewsManager() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [replyFilter, setReplyFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Erro ao carregar avaliações no gestor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
      : '5.0';
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fiveStarPercent = totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 100;
  const pendingRepliesCount = reviews.filter(r => !r.store_reply).length;

  const togglePublic = async (review: AdminReview) => {
    try {
      const updated = !review.is_public;
      const { error } = await supabase
        .from('order_reviews')
        .update({ is_public: updated })
        .eq('id', review.id);

      if (error) throw error;
      setReviews(prev =>
        prev.map(r => (r.id === review.id ? { ...r, is_public: updated } : r))
      );
    } catch (err) {
      console.error('Erro ao alternar visibilidade da avaliação:', err);
    }
  };

  const handleSaveReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSavingReply(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('order_reviews')
        .update({
          store_reply: replyText.trim(),
          replied_at: now,
        })
        .eq('id', reviewId);

      if (error) throw error;
      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId
            ? { ...r, store_reply: replyText.trim(), replied_at: now }
            : r
        )
      );
      setReplyingToId(null);
      setReplyText('');
    } catch (err) {
      console.error('Erro ao salvar resposta:', err);
    } finally {
      setSavingReply(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta avaliação?')) return;
    try {
      const { error } = await supabase.from('order_reviews').delete().eq('id', id);
      if (error) throw error;
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Erro ao excluir avaliação:', err);
    }
  };

  const filtered = reviews.filter(r => {
    if (starFilter !== 'all' && r.rating !== starFilter) return false;
    if (replyFilter === 'pending' && r.store_reply) return false;
    if (replyFilter === 'replied' && !r.store_reply) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (r.customer_name || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const code = (r.tracking_code || '').toLowerCase();
      const phone = (r.customer_phone || '').toLowerCase();
      if (!name.includes(q) && !comment.includes(q) && !code.includes(q) && !phone.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4.5 rounded-2xl ring-1 ring-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Média Geral</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-[#4d0471] mt-0.5 flex items-center gap-1.5">
              <span>{avgRating}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl ring-1 ring-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Total de Avaliações</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-stone-900 mt-0.5">
              {totalReviews}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#4d0471] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl ring-1 ring-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">5 Estrelas</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">
              {fiveStarPercent}%
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl ring-1 ring-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Aguardando Resposta</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-amber-600 mt-0.5">
              {pendingRepliesCount}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl ring-1 ring-stone-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, comentário, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4d0471]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Star Filter */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStarFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                starFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todas
            </button>
            {[5, 4, 3, 2, 1].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(s)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-0.5 ${
                  starFilter === s
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>{s}</span>
                <Star className="w-3 h-3 fill-current" />
              </button>
            ))}
          </div>

          {/* Reply Filter */}
          <select
            value={replyFilter}
            onChange={e => setReplyFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl border border-stone-200 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4d0471]"
          >
            <option value="all">Todas as respostas</option>
            <option value="pending">Aguardando resposta</option>
            <option value="replied">Já respondidas</option>
          </select>

          <button
            type="button"
            onClick={loadReviews}
            className="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center transition cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-[#4d0471] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold">Carregando avaliações...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 p-12 text-center text-stone-500">
          <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="font-bold text-stone-700">Nenhuma avaliação encontrada</p>
          <p className="text-xs text-stone-400 mt-0.5">Tente ajustar os filtros ou aguarde novas avaliações de clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map(review => {
            const dateStr = new Date(review.created_at).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isReplying = replyingToId === review.id;

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl ring-1 ring-stone-200/80 p-4.5 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                {/* Header: User, Stars, Date, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#4d0471]/10 text-[#4d0471] font-bold text-sm flex items-center justify-center">
                      {review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 leading-tight">
                          {review.customer_name || 'Cliente'}
                        </span>
                        {review.customer_phone && (
                          <span className="text-xs text-stone-400 font-mono">
                            {review.customer_phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-stone-400">{dateStr}</span>
                        {review.tracking_code && (
                          <a
                            href={`/track/${review.tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#4d0471] hover:underline flex items-center gap-0.5"
                          >
                            <span>Pedido #{review.order_id || review.tracking_code.slice(0, 6)}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-full text-amber-500">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200 fill-stone-100'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-bold text-amber-800 font-mono">
                        {review.rating}.0
                      </span>
                    </div>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => togglePublic(review)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        review.is_public
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                      title={review.is_public ? 'Visível no cardápio' : 'Oculto do cardápio'}
                    >
                      {review.is_public ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pública</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Oculta</span>
                        </>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="w-8 h-8 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                      title="Excluir avaliação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-[#4d0471] ring-1 ring-purple-200/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-stone-800 leading-relaxed bg-stone-50/70 p-3 rounded-xl border border-stone-100">
                    "{review.comment}"
                  </p>
                )}

                {/* Store Reply View or Form */}
                {review.store_reply ? (
                  <div className="p-3 rounded-xl bg-purple-50/80 border-l-4 border-[#4d0471] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 font-bold text-[#4d0471]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sua resposta da Mais Açaí</span>
                        {review.replied_at && (
                          <span className="text-[10px] text-stone-400 font-normal ml-1">
                            · {new Date(review.replied_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(review.id);
                          setReplyText(review.store_reply || '');
                        }}
                        className="text-[11px] font-semibold text-[#4d0471] hover:underline cursor-pointer"
                      >
                        Editar resposta
                      </button>
                    </div>
                    <p className="text-stone-700 leading-relaxed">{review.store_reply}</p>
                  </div>
                ) : isReplying ? null : (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(review.id);
                        setReplyText('');
                      }}
                      className="text-xs font-bold text-[#4d0471] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Responder esta avaliação</span>
                    </button>
                  </div>
                )}

                {/* Replying Input Form */}
                {isReplying && (
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        Responder como Mais Açaí:
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Quick Templates */}
                    <div className="flex flex-wrap gap-1">
                      {TEMPLATES_RESPOSTA.map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyText(tpl)}
                          className="text-[11px] text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          {tpl.slice(0, 36)}...
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Escreva sua resposta para o cliente..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl bg-white border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#4d0471]"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-200 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingReply || !replyText.trim()}
                        onClick={() => handleSaveReply(review.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#4d0471] hover:bg-[#6a2092] text-white flex items-center gap-1 transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {savingReply ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Salvar resposta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

