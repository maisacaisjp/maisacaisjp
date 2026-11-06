// Tabela do DRE com várias colunas (semanas ou meses) e o detalhe de cada grupo da coluna em destaque.
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
import { useAlturaQueCabe } from '../../../components/admin/ui';
import { LINHAS_DRE, type DreContabil } from '../../contabil/dreContabil';
import { nomeConta } from '../../contabil/plano';
import { brl, pct } from '../../format';

export interface ColunaDre {
  chave: string;
  titulo: string;
  sub?: string;
  dre: DreContabil;
}

export function TabelaDre({ colunas, destaque, semComparacao }: { colunas: ColunaDre[]; destaque: string; semComparacao?: boolean }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const atual = colunas.find((c) => c.chave === destaque) ?? colunas[colunas.length - 1];
  const idx = colunas.indexOf(atual);
  const anterior = idx > 0 && !semComparacao ? colunas[idx - 1] : null;
  // Cabe na tela: se o demonstrativo for maior que o espaço, rola só a tabela (cabeçalho fixo), não a página
  const area = useRef<HTMLDivElement>(null);
  const altura = useAlturaQueCabe(area, 100, [colunas.length, destaque]);

  return (
    <div ref={area} style={{ maxHeight: altura }} className="-mx-4 overflow-auto px-4 adm-rolagem">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="sticky top-0 z-10 bg-white border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            <th className="py-2 pr-2 text-left">Demonstrativo</th>
            {colunas.map((c) => (
              <th key={c.chave} className={`px-2 py-2 text-right ${c.chave === atual.chave ? 'rounded-t-lg bg-[#f5eefa] text-[#6a2092]' : ''}`}>
                {c.titulo}
                {c.sub && <span className="block font-normal normal-case tracking-normal text-stone-400">{c.sub}</span>}
              </th>
            ))}
            <th className="px-2 py-2 text-right">% receita</th>
            {anterior && <th className="py-2 pl-2 text-right">vs anterior</th>}
          </tr>
        </thead>
        <tbody>
          {LINHAS_DRE.map((l) => {
            const v = l.valor(atual.dre);
            const temDetalhe = !!l.grupo && atual.dre.grupos[l.grupo].itens.length > 0;
            const forte = l.tipo === 'total' || l.tipo === 'resultado';
            const delta = anterior ? v - l.valor(anterior.dre) : 0;
            const melhorou = l.tipo === 'menos' ? delta < 0 : delta > 0;
            return (
              <Fragment key={l.id}>
                <tr className={`border-b border-stone-100 ${forte ? 'font-semibold' : ''} ${l.tipo === 'resultado' ? 'bg-stone-50' : ''}`}>
                  <td className="py-1 pr-2">
                    {temDetalhe ? (
                      <button type="button" className="flex cursor-pointer items-center gap-1 pl-3 text-left text-stone-600 hover:text-[#6a2092]" onClick={() => setAberto(aberto === l.id ? null : l.id)}>
                        {aberto === l.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />} (−) {l.rotulo}
                      </button>
                    ) : (
                      <span className={l.tipo === 'menos' ? 'pl-3 text-stone-600' : ''}>
                        {l.tipo === 'menos' ? <span className="pl-[17px]">(−) </span> : l.tipo === 'receita' ? '' : '= '}
                        {l.rotulo}
                      </span>
                    )}
                  </td>
                  {colunas.map((c) => {
                    const x = l.valor(c.dre);
                    const cor = forte ? (x >= 0 ? 'text-emerald-700' : 'text-rose-600') : '';
                    return (
                      <td key={c.chave} className={`fin-num px-2 py-1 ${cor} ${c.chave === atual.chave ? 'bg-[#f5eefa]/60' : ''}`}>
                        {brl(l.tipo === 'menos' ? -x : x)}
                      </td>
                    );
                  })}
                  <td className="fin-num px-2 py-1 text-stone-500">{atual.dre.receita ? pct(v / atual.dre.receita) : '—'}</td>
                  {anterior && (
                    <td className={`fin-num py-1 pl-2 text-xs ${delta === 0 ? 'text-stone-400' : melhorou ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${brl(Math.abs(delta)).replace('R$', '').trim()}`}
                    </td>
                  )}
                </tr>
                {aberto === l.id && l.grupo && (
                  <tr>
                    <td colSpan={colunas.length + 3} className="bg-stone-50/70 px-3 py-2">
                      <ul className="space-y-1 text-xs">
                        {atual.dre.grupos[l.grupo].itens.map((it, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0">
                              <span className="text-stone-800">{it.nome}</span>
                              <span className="ml-2 text-stone-400">{it.origem} · {it.conta} {nomeConta(it.conta)}</span>
                            </span>
                            <span className="fin-num">{brl(it.valor)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
