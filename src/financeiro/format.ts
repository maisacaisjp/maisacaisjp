export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (v: number) =>
  Number.isFinite(v) ? `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—';

export const num = (v: number, casas = 0) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const hoje = () => {
  const d = new Date();
  return `${mesAtual()}-${String(d.getDate()).padStart(2, '0')}`;
};

export const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Preço por kg / L / unidade, para exibição
export const sufixoUnidade = (u: string) => (u === 'g' ? '/kg' : u === 'ml' ? '/L' : '/un');
export const fatorExibicao = (u: string) => (u === 'un' ? 1 : 1000);
