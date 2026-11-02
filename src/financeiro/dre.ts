import { CATEGORIAS_LANC } from './constantes';
import type { Dados } from './types';
import type { ResumoVendas } from './vendas';

export interface Dre {
  faturamento: number;
  cobertura: number; // fração da receita de itens que tem ficha
  cmvMedido: number; // custo só dos itens com ficha
  cmvPct: number; // CMV / receita, medido nos itens com ficha
  cmvEstimado: number; // CMV% aplicado a toda a receita de itens
  taxas: number;
  entregas: number;
  margemContribuicao: number;
  fixos: number;
  outrasDespesas: number;
  resultado: number;
  pontoEquilibrio: number; // faturamento necessário para resultado 0
  comprasInsumos: number;
}

export function calcularDre(mes: string, r: ResumoVendas, d: Dados): Dre {
  const cfg = d.config;
  const cobertura = r.receitaItens ? r.receitaComFicha / r.receitaItens : 0;
  const cmvPct = r.receitaComFicha ? r.custoComFicha / r.receitaComFicha : 0;
  const cmvEstimado = cmvPct * r.receitaItens;
  const taxas = (r.faturamento * cfg.taxaPagamento) / 100;
  const entregas = r.entregas * cfg.custoPorEntrega;
  const margemContribuicao = r.faturamento - cmvEstimado - taxas - entregas;
  const fixos = d.custosFixos.filter((c) => c.ativo).reduce((s, c) => s + c.valor, 0);
  const doMes = d.lancamentos.filter((l) => l.data.startsWith(mes));
  const entra = new Set(CATEGORIAS_LANC.filter((c) => c.noResultado).map((c) => c.nome));
  const outrasDespesas = doMes.filter((l) => entra.has(l.categoria)).reduce((s, l) => s + l.valor, 0);
  const comprasInsumos = doMes.filter((l) => l.categoria === 'Compra de insumos' || l.categoria === 'Embalagens').reduce((s, l) => s + l.valor, 0);
  const mcPct = r.faturamento ? margemContribuicao / r.faturamento : 0;
  return {
    faturamento: r.faturamento,
    cobertura,
    cmvMedido: r.custoComFicha,
    cmvPct,
    cmvEstimado,
    taxas,
    entregas,
    margemContribuicao,
    fixos,
    outrasDespesas,
    resultado: margemContribuicao - fixos - outrasDespesas,
    pontoEquilibrio: mcPct > 0 ? (fixos + outrasDespesas) / mcPct : NaN,
    comprasInsumos,
  };
}
