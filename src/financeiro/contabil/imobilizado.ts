// Depreciação linear: valor ÷ (vida útil × 12) por mês, proporcional aos dias.
import { diasNoMes, diferencaDias, somarDias } from './datas';
import type { Bem } from '../types';

export const depMensal = (b: Bem) => (b.vidaUtilAnos > 0 ? b.valor / (b.vidaUtilAnos * 12) : 0);

// Último dia em que o bem ainda deprecia
const fimDepreciacao = (b: Bem) => {
  const [a, m, d] = b.dataAquisicao.split('-').map(Number);
  const fim = `${a + Math.max(0, Math.round(b.vidaUtilAnos))}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return b.baixadoEm && b.baixadoEm < fim ? b.baixadoEm : fim;
};

export function depreciacaoPeriodo(bens: Bem[], dias: string[]) {
  return bens
    .map((b) => {
      const fim = fimDepreciacao(b);
      const mensal = depMensal(b);
      let valor = 0;
      for (const d of dias) if (d >= b.dataAquisicao && d < fim) valor += mensal / diasNoMes(d.slice(0, 7));
      return { nome: b.nome, valor };
    })
    .filter((x) => x.valor > 0);
}

// Depreciação acumulada até a data (inclusive), limitada ao valor do bem
export function depreciacaoAcumulada(b: Bem, ate: string) {
  if (ate < b.dataAquisicao) return 0;
  const fim = fimDepreciacao(b);
  const limite = ate < fim ? somarDias(ate, 1) : fim;
  const meses = diferencaDias(limite, b.dataAquisicao) / 30.4375;
  return Math.min(b.valor, Math.max(0, meses * depMensal(b)));
}

// Situação do imobilizado numa data (ex.: 31/12 para o balanço)
export function imobilizadoEm(bens: Bem[], data: string) {
  const ativos = bens.filter((b) => b.dataAquisicao <= data && (!b.baixadoEm || b.baixadoEm > data));
  const custo = ativos.reduce((s, b) => s + b.valor, 0);
  const depreciacao = ativos.reduce((s, b) => s + depreciacaoAcumulada(b, data), 0);
  return { custo, depreciacao, liquido: custo - depreciacao, bens: ativos.length };
}
