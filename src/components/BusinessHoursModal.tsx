import React from 'react';
import { Clock, X, MapPin, CheckCircle2, AlertCircle, Bike, Store } from 'lucide-react';
import { BusinessHoursStatus } from '../hooks/useBusinessHours';

interface BusinessHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessStatus: BusinessHoursStatus;
  deliveryEnabled?: boolean;
}

export default function BusinessHoursModal({ isOpen, onClose, businessStatus, deliveryEnabled = true }: BusinessHoursModalProps) {
  if (!isOpen) return null;

  const aberto = businessStatus.isOpen;
  const schedule = businessStatus.weeklySchedule || [];

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in ring-1 ring-stone-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 shadow-2xs">
              <Clock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-display font-bold text-stone-900 text-[15px] leading-tight">
                Horários de Atendimento
              </h3>
              <p className="text-[11.5px] text-stone-500 font-sans">
                {deliveryEnabled ? 'Mais Açaí SJP · Delivery e Retirada' : 'Mais Açaí SJP · Retirada (Entregas via Apps)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content (Sem barra de rolagem) */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Status Atual Banner */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 ${
              aberto
                ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-900'
                : 'bg-rose-50/90 border-rose-200/80 text-rose-900'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                aberto ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {aberto ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] flex items-center gap-1.5 leading-none">
                <span>{aberto ? 'Loja Aberta Agora' : 'Loja Fechada no Momento'}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    aberto ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-[11.5px] opacity-80 leading-tight mt-1">
                {aberto
                  ? businessStatus.todayLabel
                    ? `Hoje funcionamos das ${businessStatus.todayLabel}.`
                    : 'Aproveite e monte o seu pedido!'
                  : 'Confira abaixo os horários semanais de atendimento.'}
              </p>
            </div>
          </div>

          {/* Tabela de Dias da Semana */}
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden bg-white">
            {schedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`flex items-center justify-between px-3 py-1.5 text-[12.5px] transition-colors ${
                  day.isToday
                    ? 'bg-brand-50/70 font-semibold text-brand-950'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={day.isToday ? 'font-bold text-brand-950' : 'text-stone-800'}>
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 bg-brand-600 text-white rounded tracking-wider">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono text-[12px] tabular-nums ${
                      day.isClosed
                        ? 'text-rose-600 font-semibold'
                        : day.isToday
                        ? 'text-brand-900 font-bold'
                        : 'text-stone-800 font-medium'
                    }`}
                  >
                    {day.timeRangeLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Informações adicionais de atendimento */}
          {deliveryEnabled ? (
            <div className="flex items-center justify-around gap-2 py-0.5 text-[11.5px] text-stone-600">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Bike className="w-3.5 h-3.5 text-brand-600" /> Entrega Delivery
              </span>
              <span className="text-stone-300">•</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Store className="w-3.5 h-3.5 text-brand-600" /> Retirada no Balcão
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] flex items-center gap-2">
              <Bike className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Entregas hoje somente <b>iFood e 99Food</b>. Pelo cardápio, apenas <b>Retirada</b>.</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
            <MapPin className="w-3 h-3 text-stone-400" />
            <span>São José dos Pinhais - PR</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-semibold text-[13px] shadow-sm transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
