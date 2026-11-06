import { Plus, Trash2 } from 'lucide-react';
import { CATEGORIAS_FIXO } from '../constantes';
import { brl, pct, uid } from '../format';
import { useDados } from '../store';
import type { CustoFixo } from '../types';
import { Btn, Card, Indicador, Num, Sel, Selo, Txt, Vazio } from '../ui';
import { Paginacao, useListaQueCabe } from '../../components/admin/ui';

export default function CustosFixos() {
  const { dados, atualizar } = useDados();
  const mudar = (id: string, patch: Partial<CustoFixo>) =>
    atualizar((d) => ({ ...d, custosFixos: d.custosFixos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const ativos = dados.custosFixos.filter((c) => c.ativo);
  const total = ativos.reduce((s, c) => s + c.valor, 0);
  const categorias = [...new Set([...CATEGORIAS_FIXO, ...dados.custosFixos.map((c) => c.categoria)])];
  const porCategoria = categorias.map((cat) => ({ cat, valor: ativos.filter((c) => c.categoria === cat).reduce((s, c) => s + c.valor, 0) })).filter((x) => x.valor > 0);
  const aConfirmar = dados.custosFixos.filter((c) => c.aConfirmar).length;
  const pag = useListaQueCabe(dados.custosFixos, 50, { reserva: 150 });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Custo fixo mensal" valor={brl(total)} sub={`${ativos.length} itens ativos`} />
        <Indicador rotulo="Por dia trabalhado" valor={brl(total / (dados.config.diasTrabalhados || 1))} sub={`${dados.config.diasTrabalhados} dias/mês (Ajustes)`} />
        <Indicador rotulo="A confirmar" valor={aConfirmar} sub="itens marcados para revisar" tom={aConfirmar ? 'ruim' : 'ok'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
      <Card
        titulo="Custos fixos mensais"
        acoes={<Btn onClick={() => atualizar((d) => ({ ...d, custosFixos: [...d.custosFixos, { id: uid(), nome: 'Novo custo', categoria: 'Outros', valor: 0, ativo: true }] }))}><Plus size={14} /> Novo custo</Btn>}
      >
        <p className="mb-3 text-xs text-stone-500 adm-compactavel-esconder">Aluguel, salários, energia, internet, contador, sistema… Tudo o que se paga todo mês, vendendo ou não.</p>
        {dados.custosFixos.length === 0 ? (
          <Vazio>Nenhum custo fixo cadastrado.</Vazio>
        ) : (
          <>
          <div ref={pag.ref} className="overflow-x-auto">
            <table className="fin-tabela">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th className="min-w-44">Custo</th>
                  <th>Categoria</th>
                  <th className="fin-num">Valor/mês (R$)</th>
                  <th className="fin-num">% do total</th>
                  <th className="min-w-56">Observação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pag.itens.map((c) => (
                  <tr key={c.id} className={c.ativo ? '' : 'opacity-50'}>
                    <td data-label="Ativo"><input type="checkbox" className="h-4 w-4 accent-[#6a2092]" checked={c.ativo} onChange={(e) => mudar(c.id, { ativo: e.target.checked })} /></td>
                    <td className="fin-cheio" data-label="Custo"><Txt value={c.nome} onChange={(v) => mudar(c.id, { nome: v })} /></td>
                    <td className="w-48" data-label="Categoria"><Sel value={c.categoria} onChange={(v) => mudar(c.id, { categoria: v })} opcoes={categorias.map((x) => ({ value: x, label: x }))} /></td>
                    <td className="w-28" data-label="Valor/mês (R$)"><Num value={c.valor} onChange={(v) => mudar(c.id, { valor: v })} /></td>
                    <td className="fin-num text-stone-500 max-md:hidden">{c.ativo && total ? pct(c.valor / total) : '—'}</td>
                    <td className="fin-cheio" data-label="Observação">
                      <div className="flex items-center gap-2">
                        {c.aConfirmar && (
                          <button type="button" className="cursor-pointer" title="Marcar como conferido" onClick={() => mudar(c.id, { aConfirmar: false })}>
                            <Selo tom="alerta">confirmar ✓</Selo>
                          </button>
                        )}
                        <Txt value={c.obs ?? ''} onChange={(v) => mudar(c.id, { obs: v })} placeholder="—" />
                      </div>
                    </td>
                    <td className="w-8 fin-acao">
                      <button type="button" className="cursor-pointer text-stone-400 hover:text-rose-600" title="Excluir" onClick={() => confirm(`Excluir "${c.nome}"?`) && atualizar((d) => ({ ...d, custosFixos: d.custosFixos.filter((x) => x.id !== c.id) }))}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td className="font-semibold">Total</td>
                  <td />
                  <td className="fin-num font-semibold">{brl(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
          <Paginacao {...pag.paginacao} rotulo="custos" className="mt-1" />
          </>
        )}
      </Card>

      {porCategoria.length > 0 && (
        <Card titulo="Para onde vai o custo fixo">
          <div className="space-y-3">
            {porCategoria.sort((a, b) => b.valor - a.valor).map((x) => (
              <div key={x.cat} className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-stone-600">{x.cat}</span>
                  <span className="fin-num font-medium">{brl(x.valor)}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-[#6a2092]" style={{ width: `${(x.valor / total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}
