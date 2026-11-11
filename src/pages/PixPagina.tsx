import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import PixPaymentCard from '../components/PixPaymentCard';
import { PIX_CONFIG_PADRAO, copiarTexto } from '../utils/pix';

// Página aberta pelo link do resumo do WhatsApp: o cliente copia a chave PIX
// (ou o código Copia e Cola com o valor do pedido) quando ainda não pagou.
export default function PixPagina() {
  const params = new URLSearchParams(window.location.search);
  const valor = Number(String(params.get('v') || '').replace(',', '.'));
  const pedido = (params.get('p') || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 25);
  const temValor = Number.isFinite(valor) && valor > 0 && valor < 100000;
  const [copiou, setCopiou] = useState(false);

  const copiarChave = async () => {
    if (await copiarTexto(PIX_CONFIG_PADRAO.chave)) {
      setCopiou(true);
      setTimeout(() => setCopiou(false), 2500);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-50 px-4 py-8 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <img src="/logo.png" alt="Mais Açaí" className="w-16 h-16 mx-auto rounded-2xl object-cover" />
          <h1 className="mt-3 text-xl font-bold text-stone-900">Pagamento PIX</h1>
          {pedido && <p className="text-[13px] text-stone-500">Pedido {pedido}</p>}
        </div>

        <div className="bg-white rounded-3xl ring-1 ring-stone-200 p-5">
          <p className="text-[12px] text-stone-500">Chave PIX (celular)</p>
          <p className="mt-1 text-2xl font-bold text-stone-900 tabular-nums">{PIX_CONFIG_PADRAO.telefoneFormatado}</p>
          <p className="mt-2 text-[13px] text-stone-600">
            Beneficiário: <strong>{PIX_CONFIG_PADRAO.nomesNaConfirmacao}</strong>
            <br />
            Banco: <strong>{PIX_CONFIG_PADRAO.banco}</strong>
          </p>
          <button
            type="button"
            onClick={copiarChave}
            className={`mt-4 w-full h-12 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition cursor-pointer ${
              copiou ? 'bg-emerald-600 text-white' : 'bg-brand-700 hover:bg-brand-800 text-white'
            }`}
          >
            {copiou ? <><Check className="w-5 h-5" /> Chave copiada!</> : <><Copy className="w-5 h-5" /> Copiar chave PIX</>}
          </button>
        </div>

        {temValor && <PixPaymentCard valor={valor} identificador={pedido || '***'} />}

        <p className="text-center text-[12px] text-stone-500">Depois de pagar, envie o comprovante no WhatsApp da loja.</p>
      </div>
    </div>
  );
}
