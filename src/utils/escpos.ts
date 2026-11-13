// Comanda em ESC/POS para a Bematech MP-4200 TH (modo ESC/POS, papel 80 mm, 42 colunas — medido no papel).
// Sai direto na impressora pela ponte de impressão, com negrito, letra grande, faixa preta
// e corte do papel, no estilo da comanda do iFood / 99Food.
import { calcularComanda } from '../components/Comanda';

const COLUNAS = 42;
const ESC = 0x1b;
const GS = 0x1d;

// Página de código 850 (ESC t 2): cobre os acentos do português.
const CP850: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ä: 0x84, à: 0x85, ç: 0x87, ê: 0x88, ë: 0x89, è: 0x8a,
  ï: 0x8b, î: 0x8c, ì: 0x8d, Ä: 0x8e, É: 0x90, ô: 0x93, ö: 0x94, ò: 0x95, û: 0x96, ù: 0x97,
  Ö: 0x99, Ü: 0x9a, á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, ª: 0xa6, º: 0xa7,
  Á: 0xb5, Â: 0xb6, À: 0xb7, ã: 0xc6, Ã: 0xc7, Ê: 0xd2, Ë: 0xd3, È: 0xd4, Í: 0xd6, Î: 0xd7,
  Ó: 0xe0, Ô: 0xe2, Ò: 0xe3, õ: 0xe4, Õ: 0xe5, Ú: 0xe9, Û: 0xea, Ù: 0xeb, '°': 0xf8,
};

function codificar(texto: string): number[] {
  const out: number[] = [];
  for (const ch of String(texto ?? '')) {
    const c = ch.charCodeAt(0);
    if (c >= 0x20 && c <= 0x7e) out.push(c);
    else if (CP850[ch] !== undefined) out.push(CP850[ch]);
    else if (ch === '\n') out.push(0x0a);
    else {
      const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (base && base.charCodeAt(0) >= 0x20 && base.charCodeAt(0) <= 0x7e) out.push(base.charCodeAt(0));
    }
  }
  return out;
}

const brl = (v: number) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');

function telefone(t: string) {
  const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

const dataHora = (iso: string) =>
  new Date(iso)
    .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(',', ' às');

/** Quebra o texto em linhas de até `largura` caracteres (a primeira e as seguintes podem ter limites diferentes). */
function quebrar(texto: string, largura: number, larguraSeguintes = largura): string[] {
  const palavras = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let atual = '';
  for (let p of palavras) {
    const lim = out.length ? larguraSeguintes : largura;
    while (p.length > lim && !atual) {
      out.push(p.slice(0, lim));
      p = p.slice(lim);
    }
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length > (out.length ? larguraSeguintes : largura) && atual) {
      out.push(atual);
      atual = p;
    } else atual = tentativa;
  }
  if (atual) out.push(atual);
  return out.length ? out : [''];
}

class Cupom {
  b: number[] = [];
  raw(...bytes: number[]) { this.b.push(...bytes); return this; }
  txt(t: string) { this.b.push(...codificar(t)); return this; }
  nl(n = 1) { for (let i = 0; i < n; i++) this.b.push(0x0a); return this; }
  alinhar(a: 'esq' | 'centro' | 'dir') { return this.raw(ESC, 0x61, a === 'esq' ? 0 : a === 'centro' ? 1 : 2); }
  negrito(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  invertido(on: boolean) { return this.raw(GS, 0x42, on ? 1 : 0); }
  /** largura e altura: 1 = normal, 2 = dobro */
  tamanho(l: 1 | 2, a: 1 | 2) { return this.raw(GS, 0x21, ((l - 1) << 4) | (a - 1)); }
  normal() { return this.tamanho(1, 1).negrito(false).invertido(false).alinhar('esq'); }
  linha(ch = '-') { return this.txt(ch.repeat(COLUNAS)).nl(); }
  /** Texto à esquerda e valor à direita na mesma linha (cols = colunas disponíveis no tamanho atual). */
  par(esq: string, dir: string, cols = COLUNAS, recuo = '') {
    const partes = quebrar(esq, cols - dir.length - 1 - recuo.length, cols - recuo.length - 2);
    partes.forEach((p, i) => {
      if (i === 0) this.txt((recuo + p).padEnd(cols - dir.length) + dir).nl();
      else this.txt(recuo + '  ' + p).nl();
    });
    return this;
  }
  /** Texto com quebra automática por palavra, deixando 2 colunas de folga na borda direita. */
  texto(t: string, recuo = '', recuoSeguintes = recuo) {
    const max = COLUNAS - 2;
    quebrar(t, max - recuo.length, max - recuoSeguintes.length).forEach((l, i) => this.txt((i ? recuoSeguintes : recuo) + l).nl());
    return this;
  }
}

/** Monta os bytes ESC/POS da comanda do pedido. */
export function comandaEscPos(pedido: any): Uint8Array {
  const c = calcularComanda(pedido);
  const p = new Cupom();

  p.raw(ESC, 0x40); // reinicia a impressora
  p.raw(ESC, 0x74, 2); // página de código 850
  p.raw(ESC, 0x33, 30); // espaçamento entre linhas mais justo

  // Cabeçalho: loja, número do pedido grande, tipo em faixa preta
  p.alinhar('centro').negrito(true).txt('MAIS AÇAÍ SJP').nl();
  p.negrito(false).linha('=');
  p.tamanho(2, 2).negrito(true).txt(`PEDIDO #${pedido.id}`).nl();
  p.tamanho(2, 1).invertido(true).txt(`  ${c.tipo}  `).invertido(false).nl();
  p.tamanho(1, 1).negrito(false);
  if (pedido.createdAt) p.txt(dataHora(pedido.createdAt)).nl();
  p.alinhar('esq').linha();

  // Cliente e endereço
  p.txt('CLIENTE').nl();
  p.tamanho(1, 1).negrito(true).texto(String(pedido.customerName || 'Cliente').toUpperCase());
  p.tamanho(1, 1).negrito(false);
  if (pedido.customerPhone) p.txt(`Tel: ${telefone(pedido.customerPhone)}`).nl();
  if (c.entrega && (pedido.deliveryAddress || pedido.deliveryZone)) {
    p.nl().txt('ENTREGAR EM').nl();
    if (pedido.deliveryAddress) p.negrito(true).tamanho(1, 1).texto(String(pedido.deliveryAddress).toUpperCase()).tamanho(1, 1).negrito(false);
    if (pedido.deliveryZone) p.texto(`Bairro: ${pedido.deliveryZone}`);
  }
  p.linha();

  // Itens
  p.negrito(true).par(`ITENS (${c.qtdItens})`, 'VALOR').negrito(false);
  c.itens.forEach((item: any, idx: number) => {
    const qtd = Number(item.quantity || 1);
    const extras: any[] = Array.isArray(item.extras) ? item.extras : [];
    const somaExtras = extras.reduce((s, e) => s + Number(e.price || 0) * Number(e.quantity || 1), 0);
    const base = item.basePrice !== undefined ? Number(item.basePrice) : Number(item.priceCalculated || 0) - somaExtras;
    if (idx) p.nl();
    p.negrito(true).tamanho(1, 1).par(`${qtd}x ${String(item.name || '').trim().toUpperCase()}`, brl(base * qtd)).tamanho(1, 1).negrito(false);
    extras.forEach((e) => {
      const valor = Number(e.price) ? brl(Number(e.price) * Number(e.quantity || 1) * qtd) : '';
      p.par(`+ ${Number(e.quantity) > 1 ? `${e.quantity}x ` : ''}${e.name}`, valor, COLUNAS, '   ');
    });
    const notas = String(item.notes || '').trim();
    if (notas) {
      if (/^creme:/i.test(notas)) p.texto(notas, '   ', '   ');
      else p.negrito(true).texto(`>> OBS: ${notas.toUpperCase()}`, '   ', '      ').negrito(false);
    }
  });
  p.linha();

  // Totais
  p.par('Subtotal', brl(c.subtotal));
  if (c.entrega) p.par('Taxa de entrega', c.taxaEntrega > 0 ? brl(c.taxaEntrega) : 'Grátis');
  if (c.adicional > 0) p.par(`Acréscimo${pedido.editReason ? ` (${pedido.editReason})` : ''}`, '+ ' + brl(c.adicional));
  if (c.desconto > 0) p.par('Desconto', '- ' + brl(c.desconto));
  if (c.descontoCashback > 0) p.par('Cashback usado', '- ' + brl(c.descontoCashback));
  p.linha('=');
  p.tamanho(2, 2).negrito(true).par('TOTAL', brl(c.total), COLUNAS / 2).tamanho(1, 1).negrito(false);
  p.linha('=');

  // Pagamento
  p.txt('PAGAMENTO').nl();
  p.tamanho(1, 1).negrito(true).texto(String(pedido.paymentMethod || 'Não informado').toUpperCase()).tamanho(1, 1);
  if (c.troco > 0) {
    p.invertido(true).txt(` TROCO PARA ${brl(c.troco)} `).invertido(false).nl();
    if (c.troco > c.total) p.txt(`Levar ${brl(c.troco - c.total)} de troco`).nl();
  }
  p.negrito(false);
  if (pedido.nif) p.txt(`CPF na nota: ${pedido.nif}`).nl();

  if (c.observacao) {
    p.linha();
    p.txt('OBSERVAÇÕES DO PEDIDO').nl();
    p.negrito(true).tamanho(1, 1).texto(c.observacao.toUpperCase()).tamanho(1, 1).negrito(false);
  }
  p.linha();
  p.alinhar('centro').txt('Obrigado pela preferência!').nl();

  p.normal().nl(4);
  p.raw(GS, 0x56, 66, 0); // avança e corta o papel
  return new Uint8Array(p.b);
}

