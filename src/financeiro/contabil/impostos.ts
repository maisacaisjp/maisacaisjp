// Imposto sobre o faturamento.
// Simples Nacional, Anexo I (comércio; é onde se enquadram lanchonetes e açaiterias, CNAE 5611-2):
// alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12,
// onde RBT12 = receita bruta dos 12 meses anteriores ao mês de apuração.
import { diasNoMes, somarMeses } from './datas';
import type { ConfigImposto } from '../types';

export const FAIXAS_ANEXO_I: Array<{ ate: number; nominal: number; deduzir: number }> = [
  { ate: 180_000, nominal: 0.04, deduzir: 0 },
  { ate: 360_000, nominal: 0.073, deduzir: 5_940 },
  { ate: 720_000, nominal: 0.095, deduzir: 13_860 },
  { ate: 1_800_000, nominal: 0.107, deduzir: 22_500 },
  { ate: 3_600_000, nominal: 0.143, deduzir: 87_300 },
  { ate: 4_800_000, nominal: 0.19, deduzir: 378_000 },
];

export const LIMITE_MEI = 81_000;
export const SUBLIMITE_SIMPLES = 3_600_000;
export const LIMITE_SIMPLES = 4_800_000;

export function aliquotaSimples(rbt12: number) {
  if (rbt12 <= 0) return { efetiva: FAIXAS_ANEXO_I[0].nominal, faixa: 1 };
  const i = FAIXAS_ANEXO_I.findIndex((f) => rbt12 <= f.ate);
  const idx = i === -1 ? FAIXAS_ANEXO_I.length - 1 : i;
  const f = FAIXAS_ANEXO_I[idx];
  return { efetiva: (rbt12 * f.nominal - f.deduzir) / rbt12, faixa: idx + 1 };
}

export type FatMes = (mes: string) => number;

export function rbt12(mes: string, fat: FatMes) {
  let soma = 0;
  let meses = 0;
  for (let i = 1; i <= 12; i++) {
    const v = fat(somarMeses(mes, -i));
    soma += v;
    if (v > 0) meses++;
  }
  return { valor: soma, mesesComDado: meses };
}

export interface ApuracaoMes {
  mes: string;
  regime: ConfigImposto['regime'];
  rbt12: number;
  mesesComDado: number;
  faixa: number | null;
  aliquota: number; // fração; no MEI é 0 (valor fixo)
  fonte: 'tabela' | 'manual' | 'fixo';
}

export function apurarMes(mes: string, cfg: ConfigImposto, fat: FatMes): ApuracaoMes {
  const r = rbt12(mes, fat);
  if (cfg.regime === 'mei') return { mes, regime: 'mei', rbt12: r.valor, mesesComDado: r.mesesComDado, faixa: null, aliquota: 0, fonte: 'fixo' };
  if (cfg.regime === 'manual' || (cfg.aliquotaManual !== null && cfg.aliquotaManual !== undefined && cfg.aliquotaManual > 0)) {
    return { mes, regime: cfg.regime, rbt12: r.valor, mesesComDado: r.mesesComDado, faixa: null, aliquota: (cfg.aliquotaManual ?? 0) / 100, fonte: 'manual' };
  }
  const a = aliquotaSimples(r.valor);
  return { mes, regime: 'simples', rbt12: r.valor, mesesComDado: r.mesesComDado, faixa: a.faixa, aliquota: a.efetiva, fonte: 'tabela' };
}

// Imposto de um período a partir do faturamento por dia (e de meses inteiros sem detalhe diário, como o histórico)
export function impostoPeriodo(porDia: Record<string, number>, dias: string[], cfg: ConfigImposto, fat: FatMes, porMesExtra: Record<string, number> = {}) {
  const cache = new Map<string, ApuracaoMes>();
  const apur = (mes: string) => {
    if (!cache.has(mes)) cache.set(mes, apurarMes(mes, cfg, fat));
    return cache.get(mes)!;
  };
  let total = 0;
  if (cfg.regime === 'mei') {
    for (const d of dias) total += cfg.dasMei / diasNoMes(d.slice(0, 7));
    return { total, apuracoes: [] as ApuracaoMes[] };
  }
  for (const [dia, v] of Object.entries(porDia)) total += v * apur(dia.slice(0, 7)).aliquota;
  for (const [mes, v] of Object.entries(porMesExtra)) total += v * apur(mes).aliquota;
  return { total, apuracoes: [...cache.values()].sort((a, b) => a.mes.localeCompare(b.mes)) };
}
