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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 ${compacto ? 'h-7 text-[11px]' : 'h-8 text-xs'} ${
        estado === 'erro' ? 'border-rose-300 bg-rose-50' : pendente ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'
      }`}
      title="Quanto a loja pagou ao entregador parceiro nesta entrega. Entra como custo no Financeiro."
      onClick={(e) => e.stopPropagation()}
    >
      <Bike size={compacto ? 11 : 13} className={pendente ? 'text-amber-600' : 'text-stone-500'} />
      <span className="font-semibold text-stone-600 whitespace-nowrap">Entrega R$</span>
      <input
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setEstado('parado'); }}
        onBlur={salvar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="0,00"
        className={`${compacto ? 'w-12' : 'w-14'} bg-transparent font-mono font-bold text-stone-900 outline-none placeholder:text-amber-500/70`}
        aria-label="Valor pago ao entregador parceiro"
      />
      {estado === 'salvando' && <span className="text-stone-400">…</span>}
      {estado === 'salvo' && <Check size={13} className="text-emerald-600" />}
      {estado === 'erro' && <span className="text-rose-600 font-semibold">erro</span>}
    </label>
  );
}
