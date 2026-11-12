// Leitura do banco para a parte contábil: pedidos, despesas do caixa e faturamento por mês (para a RBT12).
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { lerPedidos } from '../store';
import { diaSP, somarMeses } from './datas';
import type { FatMes } from './impostos';
import type { DespesaCaixa, FaturamentoMes, Pedido } from '../types';

const inicioDia = (d: string) => `${d}T00:00:00-03:00`;

export async function lerDespesas(de: string, ate: string): Promise<DespesaCaixa[]> {
  const todas: DespesaCaixa[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('expenses')
      .select('id,description,amount,category,payment_method,created_at')
      .gte('created_at', inicioDia(de))
      .lt('created_at', inicioDia(ate))
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    todas.push(...((data ?? []) as DespesaCaixa[]));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

interface Estado {
  pedidos: Pedido[];
  despesas: DespesaCaixa[];
  fatSistema: Record<string, number>;
  carregando: boolean;
  erro: string | null;
  erroDespesas: string | null;
}

// Pedidos com itens e despesas do caixa no intervalo [de, ate), e o faturamento mensal
// dos 12 meses anteriores ao início (base da RBT12 do Simples).
export function usePeriodoContabil(de: string, ate: string) {
  const [estado, setEstado] = useState<Estado>({ pedidos: [], despesas: [], fatSistema: {}, carregando: true, erro: null, erroDespesas: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    const mesIni = somarMeses(de.slice(0, 7), -12);
    Promise.all([
      lerPedidos(inicioDia(de), inicioDia(ate), 'id,status,order_type,total_amount,created_at,items,motoboy_fee'),
      lerPedidos(`${mesIni}-01T00:00:00-03:00`, inicioDia(ate), 'total_amount,created_at,status'),
      lerDespesas(de, ate).then((d) => ({ d, erro: null as string | null })).catch((e) => ({ d: [] as DespesaCaixa[], erro: String(e.message ?? e) })),
    ])
      .then(([pedidos, totais, desp]) => {
        if (!vivo) return;
        const fatSistema: Record<string, number> = {};
        for (const p of totais) {
          const mes = diaSP(p.created_at).slice(0, 7);
          fatSistema[mes] = (fatSistema[mes] ?? 0) + (Number(p.total_amount) || 0);
        }
        setEstado({ pedidos, despesas: desp.d, fatSistema, carregando: false, erro: null, erroDespesas: desp.erro });
      })
      .catch((e) => vivo && setEstado((s) => ({ ...s, carregando: false, erro: String(e.message ?? e) })));
    return () => {
      vivo = false;
    };
  }, [de, ate, versao]);

  return { ...estado, recarregar: () => setVersao((v) => v + 1) };
}

// Faturamento do mês para a RBT12: o informado no Histórico; sem ele, o do sistema (mesma regra da aba Histórico)
export function useFatMes(historico: FaturamentoMes[], fatSistema: Record<string, number>): FatMes {
  return useMemo(() => {
    const hist = new Map(historico.map((h) => [h.mes, h.faturamento]));
    return (mes: string) => hist.get(mes) || fatSistema[mes] || 0;
  }, [historico, fatSistema]);
}

export function filtrarPedidos(pedidos: Pedido[], de: string, ate: string) {
  return pedidos.filter((p) => {
    const d = diaSP(p.created_at);
    return d >= de && d < ate;
  });
}

// Só os totais por mês (leve): de deMes até ateMes inclusive, mais os 12 meses anteriores para a RBT12
export function useFatSistema(deMes: string, ateMes: string) {
  const [estado, setEstado] = useState<{ fatSistema: Record<string, number>; carregando: boolean; erro: string | null }>({ fatSistema: {}, carregando: true, erro: null });
  useEffect(() => {
    let vivo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    lerPedidos(`${somarMeses(deMes, -12)}-01T00:00:00-03:00`, `${somarMeses(ateMes, 1)}-01T00:00:00-03:00`, 'total_amount,created_at,status')
      .then((lista) => {
        if (!vivo) return;
        const acc: Record<string, number> = {};
        for (const p of lista) {
          const mes = diaSP(p.created_at).slice(0, 7);
          acc[mes] = (acc[mes] ?? 0) + (Number(p.total_amount) || 0);
        }
        setEstado({ fatSistema: acc, carregando: false, erro: null });
      })
      .catch((e) => vivo && setEstado({ fatSistema: {}, carregando: false, erro: String(e.message ?? e) }));
    return () => {
      vivo = false;
    };
  }, [deMes, ateMes]);
  return estado;
}
