// Envia a comanda para a ponte de impressão local (impressora/ponte.mjs), que imprime direto na Bematech.
import { comandaEscPos } from './escpos';

const PONTE = 'http://127.0.0.1:9123';

function base64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Imprime o pedido pela ponte. Devolve true se saiu na impressora. */
export async function imprimirNaPonte(pedido: any): Promise<boolean> {
  try {
    const r = await fetch(`${PONTE}/imprimir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dados: base64(comandaEscPos(pedido)), pedido: pedido?.id }),
      signal: AbortSignal.timeout(15000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export type StatusPonte = { ponte: boolean; online?: boolean; papel?: string };

export async function statusPonte(): Promise<StatusPonte> {
  try {
    const r = await fetch(`${PONTE}/status`, { signal: AbortSignal.timeout(4000) });
    const s = await r.json();
    return { ponte: true, online: !!s.online, papel: s.papel };
  } catch {
    return { ponte: false };
  }
}

