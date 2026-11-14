// Valor pago ao entregador parceiro (iFood, Uber, motoboy...) em cada pedido de entrega.
// Grava em orders.motoboy_fee; o Financeiro soma esses valores como custo de entrega do mês.
import { useEffect, useState } from 'react';
import { Bike, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CampoEntregaParceiro({ pedidoId, valor, onSalvo, compacto = false }: {
  pedidoId: number | string;
  valor: number | null | undefined;
  onSalvo: (v: number) => void;
  compacto?: boolean;
}) {
  const inicial = Number(valor) > 0 ? Number(valor).toFixed(2).replace('.', ',') : '';
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');
  useEffect(() => setTexto(inicial), [inicial]);

  const salvar = async () => {
    const v = Math.round((Number(texto.replace(/\s/g, '').replace(',', '.')) || 0) * 100) / 100;
    if (v < 0 || v > 500) { setEstado('erro'); return; }
    if (v === (Number(valor) || 0)) return;
    setEstado('salvando');
    const { error } = await supabase.from('orders').update({ motoboy_fee: v }).eq('id', pedidoId);
    if (error) { console.error('[entrega parceiro]', error.message); setEstado('erro'); return; }
    onSalvo(v);
    setEstado('salvo');
    setTimeout(() => setEstado('parado'), 1500);
  };

  const pendente = !(Number(valor) > 0);
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 shadow-2xs transition-colors cursor-text ${
        compacto ? 'h-6 text-[10.5px]' : 'h-7 text-xs'
      } ${
        estado === 'erro'
          ? 'border-rose-300 bg-rose-50 text-rose-800'
          : pendente
          ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/70'
          : 'border-purple-200 bg-purple-50 text-purple-950 hover:bg-purple-100/70'
      }`}
      title="Valor pago à empresa parceira / motoboy nesta corrida. Esse custo é subtraído do faturamento na contabilidade."
      onClick={(e) => e.stopPropagation()}
    >
      <Bike size={compacto ? 11 : 12} className={pendente ? 'text-amber-600 shrink-0' : 'text-purple-700 shrink-0'} />
      <span className="font-semibold text-stone-600 whitespace-nowrap">Pago Entrega R$</span>
      <input
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setEstado('parado'); }}
        onBlur={salvar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="0,00"
        className={`${compacto ? 'w-11' : 'w-13'} bg-transparent font-mono font-black text-stone-900 outline-none placeholder:text-amber-500/70`}
        aria-label="Valor pago à empresa parceira de entrega"
      />
      {estado === 'salvando' && <span className="text-stone-400">…</span>}
      {estado === 'salvo' && <Check size={12} className="text-emerald-600" />}
      {estado === 'erro' && <span className="text-rose-600 font-semibold">erro</span>}
    </label>
  );
}
