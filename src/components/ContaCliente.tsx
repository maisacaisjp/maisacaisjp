import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, MessageCircle, RotateCcw, ChevronRight, Sparkles, LogOut, ShoppingBag, Check } from 'lucide-react';
import { brl, nomeBonito } from '../utils/formatacao';
import {
  PedidoCliente,
  sessaoAtual,
  celularLocal,
  formatarCelular,
  enviarCodigo,
  validarCodigo,
  carregarMeusPedidos,
  sairDaConta,
  STATUS_FINAIS,
  etapasDoPedido,
  rotuloStatus,
  textoDoStatus,
  ehDeHoje,
} from '../utils/contaCliente';
import { getCashbackConfig, getCustomerCashbackInfo, dataCurta } from '../utils/cashback';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRepetir: (pedido: PedidoCliente) => void;
}

type Etapa = 'telefone' | 'codigo' | 'conta';

const corDoStatus = (status: string) =>
  status === 'Cancelado'
    ? 'bg-rose-50 text-rose-700'
    : status === 'Finalizado'
      ? 'bg-stone-100 text-stone-600'
      : status === 'Saiu para Entrega'
        ? 'bg-sky-50 text-sky-700'
        : 'bg-amber-50 text-amber-800';

function quando(iso: string) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  if (ehDeHoje(iso)) return `Hoje, ${hora}`;
  const dia = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' });
  return `${dia} · ${hora}`;
}

// "COMBO NINHO MORANGO (440ml)" -> "Combo Ninho Morango (440ml)"
const nomeDoItem = (nome: string) => {
  const m = nome.match(/^(.*)\s\(([^()]+)\)$/);
  return m ? `${nomeBonito(m[1])} (${m[2]})` : nomeBonito(nome);
};

const resumoItens = (p: PedidoCliente) =>
  (p.items || []).map(i => `${i.quantity}x ${nomeDoItem(String(i.name || ''))}`).join(', ');

export default function ContaCliente({ isOpen, onClose, onRepetir }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(() => (sessaoAtual() ? 'conta' : 'telefone'));
  const [telefone, setTelefone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoCliente[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cashback, setCashback] = useState<{ saldo: number; vence: string | null; valorVence: number } | null>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  // Abre já com o WhatsApp usado no último pedido
  useEffect(() => {
    if (!isOpen) return;
    setErro(null);
    const s = sessaoAtual();
    setEtapa(s ? 'conta' : etapa === 'codigo' ? 'codigo' : 'telefone');
    if (!telefone) {
      try {
        const salvo = JSON.parse(localStorage.getItem('customer_checkout_data') || '{}');
        if (salvo.telefone) setTelefone(formatarCelular(celularLocal(salvo.telefone) || String(salvo.telefone)));
      } catch {
        // sem dados salvos
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Trava a rolagem do fundo e fecha no ESC
  useEffect(() => {
    if (!isOpen) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', esc);
    };
  }, [isOpen, onClose]);

  // Contagem para reenviar o código
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const atualizar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const lista = await carregarMeusPedidos();
      if (lista === null) {
        setEtapa('telefone');
        setPedidos(null);
        return;
      }
      setPedidos(lista);
    } catch {
      if (!silencioso) setErro('Não foi possível carregar seus pedidos. Tente de novo.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  // Carrega pedidos e cashback ao entrar
  useEffect(() => {
    if (!isOpen || etapa !== 'conta') return;
    atualizar();
    const s = sessaoAtual();
    if (s) {
      getCashbackConfig().then(cfg => {
        if (!cfg.enabled) return;
        getCustomerCashbackInfo(s.telefone).then(info =>
          setCashback({ saldo: info.saldo, vence: info.proximoVencimento, valorVence: info.valorProximoVencimento })
        );
      });
    }
  }, [isOpen, etapa, atualizar]);

  // Pedido em andamento: atualiza o status a cada 15 s
  const ativos = (pedidos || []).filter(p => ehDeHoje(p.created_at) && !STATUS_FINAIS.includes(p.status));
  useEffect(() => {
    if (!isOpen || etapa !== 'conta' || ativos.length === 0) return;
    const t = setInterval(() => atualizar(true), 15000);
    return () => clearInterval(t);
  }, [isOpen, etapa, ativos.length, atualizar]);

  const pedirCodigo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cel = celularLocal(telefone);
    if (!cel) {
      setErro('Digite o WhatsApp com DDD. Ex.: (41) 99999-9999');
      return;
    }
    setErro(null);
    setEnviando(true);
    const r = await enviarCodigo(cel);
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro || 'Não foi possível enviar o código.');
      return;
    }
    setCodigo('');
    setEtapa('codigo');
    setEspera(60);
    setTimeout(() => codigoRef.current?.focus(), 60);
  };

  const confirmar = async (valor = codigo) => {
    if (valor.length !== 6 || enviando) return;
    setErro(null);
    setEnviando(true);
    const r = await validarCodigo(celularLocal(telefone), valor);
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro || 'Código incorreto.');
      setCodigo('');
      codigoRef.current?.focus();
      return;
    }
    setEtapa('conta');
  };

  const sair = async () => {
    await sairDaConta();
    setPedidos(null);
    setCashback(null);
    setEtapa('telefone');
  };

  if (!isOpen) return null;

  const sessao = sessaoAtual();
  const nome = (pedidos || []).find(p => p.customer_name)?.customer_name?.split(' ')[0];
  const historico = (pedidos || []).filter(p => !ativos.includes(p));

  // ─── Conteúdo de cada etapa ───
  let corpo: React.ReactNode;

  if (etapa === 'telefone') {
    corpo = (
      <form onSubmit={pedirCodigo} className="px-5 pt-2 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="mt-4 font-display text-[22px] font-extrabold text-stone-900 leading-tight">Meus pedidos</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
          Acompanhe o pedido de hoje, veja seu histórico e seu cashback. Enviamos um código no seu WhatsApp para confirmar que é você.
        </p>
        <label htmlFor="conta-tel" className="block mt-5 text-[13px] font-semibold text-stone-700 mb-1.5">Seu WhatsApp</label>
        <input
          id="conta-tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(41) 99999-9999"
          value={telefone}
          onChange={e => setTelefone(formatarCelular(e.target.value))}
          className="w-full h-12 bg-white rounded-xl px-3.5 text-[16px] text-stone-900 placeholder:text-stone-400 ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-600 outline-none tabular-nums"
        />
        {erro && <p role="alert" className="mt-2 text-[13px] font-medium text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-4 w-full h-[52px] rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-60 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {enviando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MessageCircle className="w-5 h-5" />}
          {enviando ? 'Enviando...' : 'Receber código no WhatsApp'}
        </button>
      </form>
    );
  } else if (etapa === 'codigo') {
    corpo = (
      <form
        onSubmit={e => {
          e.preventDefault();
          confirmar();
        }}
        className="px-5 pt-2 pb-6"
      >
        <h2 className="font-display text-[22px] font-extrabold text-stone-900 leading-tight">Digite o código</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-stone-500">
          Enviamos um código de 6 números para o WhatsApp <strong className="text-stone-800 font-semibold">{telefone}</strong>.
        </p>
        <input
          ref={codigoRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Código de 6 números"
          maxLength={6}
          value={codigo}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCodigo(v);
            if (v.length === 6) confirmar(v);
          }}
          className="mt-5 w-full h-16 bg-white rounded-2xl text-center font-display text-[30px] font-bold tracking-[0.5em] pl-[0.5em] text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-600 outline-none tabular-nums"
        />
        {erro && <p role="alert" className="mt-2 text-[13px] font-medium text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={codigo.length !== 6 || enviando}
          className="mt-4 w-full h-[52px] rounded-2xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-100 disabled:text-stone-400 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {enviando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {enviando ? 'Confirmando...' : 'Entrar'}
        </button>
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <button type="button" onClick={() => { setEtapa('telefone'); setErro(null); }} className="h-9 font-medium text-stone-500 hover:text-stone-900 cursor-pointer">
            Trocar número
          </button>
          <button
            type="button"
            disabled={espera > 0 || enviando}
            onClick={() => pedirCodigo()}
            className="h-9 font-semibold text-brand-700 disabled:text-stone-400 cursor-pointer disabled:cursor-default tabular-nums"
          >
            {espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar código'}
          </button>
        </div>
      </form>
    );
  } else {
    corpo = (
      <div className="pb-6">
        <div className="px-5 pt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-extrabold text-stone-900 leading-tight">{nome ? `Olá, ${nomeBonito(nome)}` : 'Meus pedidos'}</h2>
            <p className="text-[13px] text-stone-500 tabular-nums">{sessao ? formatarCelular(sessao.telefone) : ''}</p>
          </div>
          <button onClick={sair} className="h-9 px-2.5 -mr-2 rounded-lg text-[13px] font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer shrink-0">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        {cashback && cashback.saldo > 0 && (
          <div className="mx-5 mt-4 bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold text-stone-900 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-amber-900">Seu cashback</p>
              <p className="font-display text-[20px] font-extrabold text-stone-900 leading-tight tabular-nums">{brl(cashback.saldo)}</p>
              {cashback.vence && (
                <p className="text-[12px] text-amber-800">{brl(cashback.valorVence)} vence em {dataCurta(cashback.vence)} · use no próximo pedido</p>
              )}
            </div>
          </div>
        )}

        {carregando && !pedidos && (
          <div className="px-5 mt-5 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-stone-100 animate-pulse" />)}
          </div>
        )}

        {erro && <p role="alert" className="mx-5 mt-4 text-[13px] font-medium text-red-600">{erro}</p>}

        {/* Pedido em andamento */}
        {ativos.map(p => {
          const etapas = etapasDoPedido(p.order_type);
          const atual = Math.max(0, etapas.indexOf(p.status));
          return (
            <section key={p.id} className="mx-5 mt-5 rounded-2xl bg-brand-900 text-white p-4 shadow-[0_12px_30px_rgba(38,1,58,0.25)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-white/60">Pedido de hoje · #{p.id}</span>
                <span className="text-[12px] text-white/60">{quando(p.created_at).replace('Hoje, ', '')}</span>
              </div>
              <p className="mt-2 font-display text-[22px] font-extrabold leading-tight">{rotuloStatus(p.status, p.order_type)}</p>
              <p className="mt-0.5 text-[14px] text-white/75">{textoDoStatus(p.status, p.order_type)}</p>
              <ol className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }} aria-label="Andamento do pedido">
                {etapas.map((et, i) => (
                  <li key={et}>
                    <span className={`block h-1.5 rounded-full ${i <= atual ? 'bg-gold' : 'bg-white/20'}`} />
                    <span className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${i <= atual ? 'text-white' : 'text-white/50'}`}>
                      {i < atual && <Check className="w-3 h-3" strokeWidth={3} />}
                      {rotuloStatus(et, p.order_type)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] text-white/75 line-clamp-2">{resumoItens(p)}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-display text-[18px] font-bold tabular-nums">{brl(Number(p.total_amount))}</span>
                <a
                  href={`/track/${p.tracking_code}`}
                  className="h-10 px-3.5 rounded-xl bg-white text-brand-800 text-[13px] font-semibold flex items-center gap-1 hover:bg-white/90 transition"
                >
                  Detalhes <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </section>
          );
        })}

        {/* Histórico */}
        {pedidos && (
          <section className="mt-6">
            <h3 className="px-5 font-display text-[16px] font-bold text-stone-900">
              {historico.length > 0 ? 'Pedidos anteriores' : ativos.length === 0 ? 'Nenhum pedido ainda' : ''}
            </h3>
            {historico.length === 0 && ativos.length === 0 && (
              <p className="px-5 mt-1 text-[14px] text-stone-500">Ainda não encontramos pedidos feitos com este WhatsApp.</p>
            )}
            <ul className="mt-2 px-5 divide-y divide-stone-100">
              {historico.map(p => (
                <li key={p.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-stone-500 tabular-nums">{quando(p.created_at)} · #{p.id}</span>
                    <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${corDoStatus(p.status)}`}>{rotuloStatus(p.status, p.order_type)}</span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-snug text-stone-800 line-clamp-2">{resumoItens(p)}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="font-display text-[16px] font-bold text-stone-900 tabular-nums">{brl(Number(p.total_amount))}</span>
                    <button
                      onClick={() => onRepetir(p)}
                      className="h-10 px-3.5 rounded-xl ring-1 ring-stone-200 bg-white text-brand-700 text-[13px] font-semibold flex items-center gap-1.5 hover:ring-brand-300 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> Pedir de novo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Meus pedidos">
      <div className="absolute inset-0 bg-stone-950/55 animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px] max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-y-auto overscroll-contain animate-sheet-in sm:animate-pop-in pb-safe">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur flex items-center justify-between px-3 pt-3 pb-1">
          {etapa === 'codigo' ? (
            <button onClick={() => { setEtapa('telefone'); setErro(null); }} aria-label="Voltar" className="w-10 h-10 rounded-full text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="sm:hidden mx-auto w-10 h-1.5 rounded-full bg-stone-200" />
          )}
          <button onClick={onClose} aria-label="Fechar" className="w-10 h-10 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center cursor-pointer ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>
        {corpo}
      </div>
    </div>
  );
}
