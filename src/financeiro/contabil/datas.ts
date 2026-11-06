// Datas como texto "yyyy-mm-dd" (dia civil de São José dos Pinhais), com contas em UTC para não sofrer com fuso.
const DIA = 86_400_000;

const paraData = (s: string) => new Date(`${s}T00:00:00Z`);
const paraTexto = (d: Date) => d.toISOString().slice(0, 10);

export const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const diaSP = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export const somarDias = (s: string, n: number) => paraTexto(new Date(paraData(s).getTime() + n * DIA));
export const diferencaDias = (a: string, b: string) => Math.round((paraData(a).getTime() - paraData(b).getTime()) / DIA);
export const diaSemana = (s: string) => paraData(s).getUTCDay(); // 0 = domingo
export const inicioSemana = (s: string) => somarDias(s, -((diaSemana(s) + 6) % 7)); // segunda-feira

export const diasNoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

export const somarMeses = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return paraTexto(d).slice(0, 7);
};

export const dataNoMes = (mes: string, dia: number) => `${mes}-${String(Math.min(dia, diasNoMes(mes))).padStart(2, '0')}`;

export function listaDias(de: string, ateExclusivo: string) {
  const r: string[] = [];
  for (let d = de; d < ateExclusivo; d = somarDias(d, 1)) r.push(d);
  return r;
}

export function listaMeses(de: string, ateInclusivo: string) {
  const r: string[] = [];
  for (let m = de; m <= ateInclusivo; m = somarMeses(m, 1)) r.push(m);
  return r;
}

const fimDeSemana = (s: string) => diaSemana(s) === 0 || diaSemana(s) === 6;

// Vencimento no sábado/domingo: antecipa para sexta ou posterga para segunda (feriados não são considerados)
export function ajustarVencimento(s: string, ajuste?: 'antecipa' | 'posterga') {
  if (!ajuste) return s;
  let d = s;
  while (fimDeSemana(d)) d = somarDias(d, ajuste === 'antecipa' ? -1 : 1);
  return d;
}

export function enesimoDiaUtil(mes: string, n: number) {
  let d = `${mes}-01`;
  let conta = 0;
  for (;;) {
    if (!fimDeSemana(d)) conta++;
    if (conta >= n) return d;
    d = somarDias(d, 1);
  }
}

export const curta = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export const longa = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
export const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
