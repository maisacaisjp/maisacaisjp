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

  const preenchido = Number(valor) > 0;
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-all cursor-text select-none ${
        compacto ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2 text-xs'
      } ${
        estado === 'erro'
          ? 'border-rose-300 bg-rose-50 text-rose-800'
          : preenchido
          ? 'border-purple-200/90 bg-purple-50/70 text-purple-900 shadow-2xs hover:bg-purple-100/80 hover:border-purple-300'
          : 'border-stone-200 bg-stone-50/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
      }`}
      title="Valor pago à empresa parceira / motoboy nesta corrida. Deduzido automaticamente da contabilidade líquida."
      onClick={(e) => e.stopPropagation()}
    >
      <Bike size={compacto ? 11 : 12} className={preenchido ? 'text-purple-600 shrink-0' : 'text-stone-400 shrink-0'} />
      <span className="font-medium text-stone-600 whitespace-nowrap text-[11px]">Moto R$</span>
      <input
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setEstado('parado'); }}
        onBlur={salvar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="0,00"
        className={`${compacto ? 'w-10' : 'w-12'} bg-transparent font-mono font-bold text-stone-900 outline-none placeholder:text-stone-400 text-right`}
        aria-label="Valor pago ao motoboy ou parceiro de entrega"
      />
      {estado === 'salvando' && <span className="text-stone-400 text-[10px]">…</span>}
      {estado === 'salvo' && <Check size={11} className="text-emerald-600 shrink-0" />}
      {estado === 'erro' && <span className="text-rose-600 font-bold text-[10px]">erro</span>}
    </label>
  );
}
