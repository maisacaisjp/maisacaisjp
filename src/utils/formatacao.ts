// Formatação usada no cardápio do cliente (só exibição).
// O nome original do produto continua indo para a sacola, o WhatsApp e o PDV.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** R$ 34,00 (com espaço não-quebrável para nunca separar o R$ do valor) */
export const brl = (n: number | null | undefined) => moeda.format(Number(n) || 0).replace(/\s/g, '\u00a0');

const MINUSCULAS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'ao', 'em', 'no', 'na', 'sem', 'a', 'o']);

/**
 * "COMBO NINHO COM MORANGO" → "Combo Ninho com Morango"; "330ML - COPO PEQUENO" → "330ml – Copo Pequeno".
 * Nome que já tem minúsculas fica como foi cadastrado.
 */
export function nomeBonito(nome: string | null | undefined): string {
  if (!nome) return '';
  const texto = nome.trim();
  if (texto !== texto.toUpperCase()) return texto;
  return texto
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => {
      if (/^\s+$/.test(p)) return p;
      if (p === '-') return '–';
      if (/^\d+(ml|g|kg)$/.test(p)) return p;
      if (/^\d+l$/.test(p)) return p.toUpperCase();
      if (i > 0 && MINUSCULAS.has(p)) return p;
      return p
        .split('-')
        .map(s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s))
        .join('-');
    })
    .join('');
}

/** Tira aspas soltas do cadastro e deixa a descrição dos kits em lista corrida. */
export function limparDescricao(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .replace(/^[\s"“”']+|[\s"“”']+$/g, '')
    .replace(/^Descri[cç][aã]o do kit:\s*/i, '')
    .replace(/\s*-(?=\d)/g, ' · ')
    .replace(/^·\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** "OS MAIS PEDIDOS 🔥" → "Os mais pedidos" */
export function tituloCategoria(label: string | null | undefined): string {
  if (!label) return '';
  const semEmoji = label.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
  if (semEmoji !== semEmoji.toUpperCase()) return semEmoji;
  const minus = semEmoji.toLowerCase();
  return minus.charAt(0).toUpperCase() + minus.slice(1);
}
