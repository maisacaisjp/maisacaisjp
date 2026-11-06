import { Download, Plus, Trash2 } from 'lucide-react';
import { contaDe, CATEGORIAS_BEM } from '../../contabil/plano';
import { hojeSP, longa } from '../../contabil/datas';
import { depMensal, depreciacaoAcumulada, imobilizadoEm } from '../../contabil/imobilizado';
import { brl, uid } from '../../format';
import { useDados } from '../../store';
import type { Bem } from '../../types';
import { Btn, Card, Indicador, Num, Sel, Selo, Txt, Vazio } from '../../ui';

export default function Imobilizado() {
  const { dados, atualizar } = useDados();
  const bens = dados.contabil.bens;
  const hoje = hojeSP();
  const sit = imobilizadoEm(bens, hoje);
  const depMes = bens.filter((b) => !b.baixadoEm && depreciacaoAcumulada(b, hoje) < b.valor).reduce((s, b) => s + depMensal(b), 0);
  const setBens = (fn: (b: Bem[]) => Bem[]) => atualizar((d) => ({ ...d, contabil: { ...d.contabil, bens: fn(d.contabil.bens) } }));
  const mudar = (id: string, p: Partial<Bem>) => setBens((l) => l.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const jaImportados = new Set(bens.map((b) => b.lancamentoId).filter(Boolean));
  const investimentos = dados.lancamentos.filter((l) => contaDe(dados.contabil, 'lanc', l.categoria) === '1.2.01' && !jaImportados.has(l.id));
  const categorias = CATEGORIAS_BEM.map((c) => ({ value: c.nome, label: `${c.nome} (${c.vida} anos)` }));

  const novo = (p: Partial<Bem> = {}) => {
    const cat = CATEGORIAS_BEM[0];
    setBens((l) => [...l, { id: uid(), nome: 'Novo bem', categoria: cat.nome, dataAquisicao: hoje, valor: 0, vidaUtilAnos: cat.vida, ...p }]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Imobilizado (custo)" valor={brl(sit.custo)} sub={`${sit.bens} bens em uso`} />
        <Indicador rotulo="Valor contábil hoje" valor={brl(sit.liquido)} sub={`depreciação acumulada ${brl(sit.depreciacao)}`} />
        <Indicador rotulo="Depreciação por mês" valor={brl(depMes)} sub="entra no DRE como despesa" />
      </div>

      {investimentos.length > 0 && (
        <Card titulo="Investimentos lançados que ainda não estão no imobilizado">
          <ul className="divide-y divide-stone-100 text-sm">
            {investimentos.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>{longa(l.data)} · {l.descricao} <span className="fin-num ml-2 font-medium">{brl(l.valor)}</span></span>
                <Btn variante="neutro" onClick={() => novo({ nome: l.descricao, dataAquisicao: l.data, valor: l.valor, lancamentoId: l.id })}><Download size={13} /> Trazer</Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card titulo="Bens da açaiteria" acoes={<Btn onClick={() => novo()}><Plus size={14} /> Novo bem</Btn>}>
        <p className="mb-3 text-xs text-stone-500">Máquina de açaí, freezers, balcão refrigerado, liquidificadores industriais, móveis, computador e impressora, moto de entrega, reformas. Depreciação linear pelas taxas usuais da Receita.</p>
        {bens.length === 0 ? (
          <Vazio>Nenhum bem cadastrado. Sem eles o balanço fica sem imobilizado e o DRE sem depreciação.</Vazio>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-2 text-left">Bem</th><th className="px-2 text-left">Categoria</th><th className="px-2 text-left">Aquisição</th>
                  <th className="px-2 text-right">Valor (R$)</th><th className="px-2 text-right">Vida (anos)</th><th className="px-2 text-right">Dep./mês</th>
                  <th className="px-2 text-right">Valor hoje</th><th className="px-2 text-left">Baixa</th><th />
                </tr>
              </thead>
              <tbody>
                {bens.map((b) => {
                  const acum = depreciacaoAcumulada(b, hoje);
                  return (
                    <tr key={b.id} className={`border-b border-stone-100 ${b.baixadoEm ? 'opacity-50' : ''}`}>
                      <td className="py-1.5 pr-2"><Txt value={b.nome} onChange={(v) => mudar(b.id, { nome: v })} /></td>
                      <td className="w-56 px-2">
                        <Sel value={b.categoria} onChange={(v) => mudar(b.id, { categoria: v, vidaUtilAnos: CATEGORIAS_BEM.find((c) => c.nome === v)?.vida ?? b.vidaUtilAnos })} opcoes={categorias.some((c) => c.value === b.categoria) ? categorias : [...categorias, { value: b.categoria, label: b.categoria }]} />
                      </td>
                      <td className="w-36 px-2"><Txt type="date" value={b.dataAquisicao} onChange={(v) => v && mudar(b.id, { dataAquisicao: v })} /></td>
                      <td className="w-28 px-2"><Num value={b.valor} onChange={(v) => mudar(b.id, { valor: v })} /></td>
                      <td className="w-20 px-2"><Num value={b.vidaUtilAnos} onChange={(v) => mudar(b.id, { vidaUtilAnos: v })} /></td>
                      <td className="fin-num px-2">{brl(depMensal(b))}</td>
                      <td className="fin-num px-2">{acum >= b.valor && b.valor > 0 ? <Selo>depreciado</Selo> : brl(b.valor - acum)}</td>
                      <td className="w-36 px-2"><Txt type="date" value={b.baixadoEm ?? ''} onChange={(v) => mudar(b.id, { baixadoEm: v || undefined })} /></td>
                      <td className="w-8">
                        <button type="button" className="cursor-pointer text-stone-400 hover:text-rose-600" title="Excluir" onClick={() => confirm(`Excluir "${b.nome}"?`) && setBens((l) => l.filter((x) => x.id !== b.id))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">Preencha a data de baixa quando o bem for vendido, quebrar sem conserto ou for descartado: ele sai do balanço e para de depreciar.</p>
      </Card>
    </div>
  );
}
