import React, { useState } from 'react';
import { Copy, Check, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { gerarPixCopiaECola, gerarQrCodePixUrl, PIX_CONFIG_PADRAO } from '../utils/pix';
import { brl } from '../utils/formatacao';
import { hapticLight } from '../utils/haptics';

interface PixPaymentCardProps {
  valor: number;
  identificador?: string;
  className?: string;
  mostrarQrCode?: boolean;
}

export default function PixPaymentCard({
  valor,
  identificador = '***',
  className = '',
  mostrarQrCode = true,
}: PixPaymentCardProps) {
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);
  const [copiadoChave, setCopiadoChave] = useState(false);

  const pixPayload = gerarPixCopiaECola({
    valor,
    identificador,
  });

  const qrUrl = gerarQrCodePixUrl(pixPayload, 260);

  const copiarCodigo = async () => {
    hapticLight();
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopiadoCodigo(true);
      setTimeout(() => setCopiadoCodigo(false), 2500);
    } catch {
      // fallback
    }
  };

  const copiarChave = async () => {
    hapticLight();
    try {
      await navigator.clipboard.writeText(PIX_CONFIG_PADRAO.chave);
      setCopiadoChave(true);
      setTimeout(() => setCopiadoChave(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className={`bg-white rounded-3xl ring-1 ring-stone-200/90 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-bold text-stone-900 leading-tight">Pagamento via PIX</h3>
            <p className="text-[12px] text-stone-500">Aprovação rápida e automática</p>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-medium text-stone-500">Valor a pagar</span>
          <span className="font-display text-[18px] font-extrabold text-brand-900 tabular-nums">{brl(valor)}</span>
        </div>
      </div>

      {mostrarQrCode && (
        <div className="mt-4 flex flex-col items-center">
          <div className="relative p-3 bg-white rounded-2xl ring-2 ring-stone-100 shadow-xs">
            <img
              src={qrUrl}
              alt="QR Code PIX"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              loading="eager"
            />
          </div>
          <p className="mt-2 text-[12px] text-stone-500 text-center">
            Aponte a câmera do celular ou o app do seu banco para escanear
          </p>
        </div>
      )}

      {/* Botão Copia e Cola Principal */}
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={copiarCodigo}
          className={`w-full h-12 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
            copiadoCodigo
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-700 hover:bg-brand-800 text-white active:scale-[0.99]'
          }`}
        >
          {copiadoCodigo ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Código PIX Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Código PIX (Copia e Cola)</span>
            </>
          )}
        </button>

        {/* Chave de celular alternativa */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[12px]">
          <div className="min-w-0">
            <span className="block text-stone-500 text-[11px]">Chave Telefone:</span>
            <span className="font-bold text-stone-900 tabular-nums">{PIX_CONFIG_PADRAO.telefoneFormatado}</span>
            <span className="block text-[11px] text-stone-500 truncate">{PIX_CONFIG_PADRAO.beneficiario} · Mais Açaí</span>
          </div>
          <button
            type="button"
            onClick={copiarChave}
            className="h-8 px-2.5 rounded-lg bg-white ring-1 ring-stone-200 text-stone-700 font-semibold hover:bg-stone-100 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiadoChave ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiadoChave ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400 justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Pagamento seguro direto para {PIX_CONFIG_PADRAO.beneficiario}</span>
      </div>
    </div>
  );
}

