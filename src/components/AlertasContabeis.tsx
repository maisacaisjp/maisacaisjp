// Alerta de fichas e obrigações contábeis no topo do gestor (só para o dono).
// Lê a agenda salva no Financeiro (tabela financeiro_maisacai) sem abrir o módulo inteiro.
import { BellRing, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { migrarContabil } from '../financeiro/contabil/plano';
import { hojeSP, longa } from '../financeiro/contabil/datas';
import { ocorrencias, precisaAtencao, textoPrazo, type Ocorrencia } from '../financeiro/contabil/obrigacoes';

const CHAVE_DISPENSA = 'maisacai_alerta_contabil_dispensado';

export function useAlertasContabeis(ativo: boolean, recarregarQuando: unknown) {
  const [lista, setLista] = useState<Ocorrencia[]>([]);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    supabase
      .from('financeiro_maisacai')
      .select('dados')
      .eq('id', 'principal')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo || error) return; // sem tabela ou sem permissão: não mostra nada
        const contabil = migrarContabil((data?.dados as { contabil?: unknown } | undefined)?.contabil);
        setLista(ocorrencias(contabil).filter(precisaAtencao));
      });
    return () => {
      vivo = false;
    };
  }, [ativo, recarregarQuando]);
  return lista;
}

const lerDispensa = () => {
  try {
    return localStorage.getItem(CHAVE_DISPENSA);
  } catch {
    return null;
  }
};

export function BannerContabil({ lista, onAbrir }: { lista: Ocorrencia[]; onAbrir: () => void }) {
  const hoje = hojeSP();
  // "Dispensar" esconde até amanhã, mas o que estiver atrasado volta a aparecer no dia seguinte
  const [dispensado, setDispensado] = useState(() => lerDispensa() === hoje);
  if (!lista.length || dispensado) return null;

  const atrasadas = lista.filter((o) => o.status === 'atrasada');
  const deHoje = lista.filter((o) => o.status === 'hoje');
  const urgente = atrasadas.length > 0 || deHoje.length > 0;
  const resumo = [
    atrasadas.length && `${atrasadas.length} atrasada${atrasadas.length > 1 ? 's' : ''}`,
    deHoje.length && `${deHoje.length} para hoje`,
    lista.length - atrasadas.length - deHoje.length > 0 && `${lista.length - atrasadas.length - deHoje.length} chegando`,
  ].filter(Boolean).join(' · ');

  return (
    <div role="status" className={`flex items-center gap-3 rounded-xl border pl-3 pr-1.5 h-11 text-[13px] ${urgente ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-[#e4d0f2] bg-[#f5eefa] text-[#3d0a5c]'}`}>
      <BellRing size={16} className="shrink-0" />
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="font-semibold whitespace-nowrap">Fichas contábeis: {resumo}</span>
        {lista[0] && (
          <span className="hidden lg:block truncate opacity-75">
            · {textoPrazo(lista[0])} ({longa(lista[0].vencimento)}): {lista[0].obrigacao.nome}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onAbrir} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#6a2092] h-8 px-3 text-[13px] font-semibold text-white hover:bg-[#521872]">
          Abrir agenda <ChevronRight size={14} />
        </button>
        <button
          type="button"
          title="Esconder até amanhã"
          aria-label="Esconder até amanhã"
          className="cursor-pointer rounded-lg p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100"
          onClick={() => {
            try {
              localStorage.setItem(CHAVE_DISPENSA, hoje);
            } catch {
              /* sem storage: esconde só nesta sessão */
            }
            setDispensado(true);
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
