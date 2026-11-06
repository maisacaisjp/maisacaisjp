// Agenda contábil: calcula o vencimento de cada obrigação e o que está atrasado, vence hoje ou está chegando.
import { ajustarVencimento, dataNoMes, diferencaDias, enesimoDiaUtil, hojeSP, inicioSemana, somarDias, somarMeses } from './datas';
import type { Contabil, Obrigacao } from '../types';

export type StatusOcorrencia = 'atrasada' | 'hoje' | 'proxima' | 'futura' | 'feita';

export interface Ocorrencia {
  obrigacao: Obrigacao;
  periodo: string; // segunda-feira da semana, yyyy-mm ou yyyy
  chave: string;
  vencimento: string;
  status: StatusOcorrencia;
  diasPara: number; // negativo = atrasada
  feitaEm?: string;
}

function vencimento(o: Obrigacao, periodo: string) {
  if (o.frequencia === 'semanal') return somarDias(periodo, Math.min(Math.max(o.dia, 1), 7) - 1);
  if (o.frequencia === 'mensal') return o.diaUtil ? enesimoDiaUtil(periodo, o.dia) : ajustarVencimento(dataNoMes(periodo, o.dia), o.ajuste);
  const mes = `${periodo}-${String(o.mes ?? 12).padStart(2, '0')}`;
  return ajustarVencimento(dataNoMes(mes, o.dia), o.ajuste);
}

function periodos(o: Obrigacao, hoje: string) {
  if (o.frequencia === 'semanal') {
    const s = inicioSemana(hoje);
    return [somarDias(s, -7), s, somarDias(s, 7)];
  }
  if (o.frequencia === 'mensal') {
    const m = hoje.slice(0, 7);
    return [somarMeses(m, -1), m, somarMeses(m, 1)];
  }
  const a = Number(hoje.slice(0, 4));
  return [String(a - 1), String(a), String(a + 1)];
}

export function aplica(o: Obrigacao, c: Contabil) {
  if (!o.ativo) return false;
  if (o.condicao === 'funcionarios') return c.temFuncionarios;
  if (o.condicao === 'simples') return c.imposto.regime !== 'mei';
  if (o.condicao === 'mei') return c.imposto.regime === 'mei';
  return true;
}

// Olha o período anterior, o atual e o próximo. O que venceu antes de inicioAgenda não é cobrado.
export function ocorrencias(c: Contabil, hoje = hojeSP(), horizonte = 45): Ocorrencia[] {
  const lista: Ocorrencia[] = [];
  for (const o of c.obrigacoes) {
    if (!aplica(o, c)) continue;
    for (const periodo of periodos(o, hoje)) {
      const venc = vencimento(o, periodo);
      const diasPara = diferencaDias(venc, hoje);
      const chave = `${o.id}|${periodo}`;
      const feitaEm = c.concluidas[chave];
      if (diasPara > horizonte) continue;
      if (!feitaEm && venc < c.inicioAgenda) continue;
      const status: StatusOcorrencia = feitaEm ? 'feita' : diasPara < 0 ? 'atrasada' : diasPara === 0 ? 'hoje' : diasPara <= o.antecedencia ? 'proxima' : 'futura';
      lista.push({ obrigacao: o, periodo, chave, vencimento: venc, status, diasPara, feitaEm });
    }
  }
  return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export const precisaAtencao = (o: Ocorrencia) => o.status === 'atrasada' || o.status === 'hoje' || o.status === 'proxima';

export function rotuloPeriodo(o: Ocorrencia) {
  if (o.obrigacao.frequencia === 'semanal') return `semana de ${o.periodo.slice(8)}/${o.periodo.slice(5, 7)}`;
  if (o.obrigacao.frequencia === 'mensal') return `${o.periodo.slice(5)}/${o.periodo.slice(0, 4)}`;
  return o.periodo;
}

export function textoPrazo(o: Ocorrencia) {
  if (o.status === 'feita') return 'feita';
  if (o.diasPara < 0) return `atrasada há ${-o.diasPara} dia${o.diasPara === -1 ? '' : 's'}`;
  if (o.diasPara === 0) return 'vence hoje';
  if (o.diasPara === 1) return 'vence amanhã';
  return `vence em ${o.diasPara} dias`;
}
