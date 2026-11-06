import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIAS_LANC, PAGAMENTOS } from '../constantes';
import { brl, hoje, mesAtual, nomeMes, uid } from '../format';
import { useDados } from '../store';
import type { Lancamento } from '../types';
import { Btn, Card, Num, SeletorMes, Sel, Selo, Txt, Vazio } from '../ui';
import { Paginacao, useListaQueCabe } from '../../components/admin/ui';

export default function Lancamentos() {
  const { dados, atualizar } = useDados();
  const [mes, setMes] = useState(mesAtual());
  const [novo, setNovo] = useState<Omit<Lancamento, 'id'>>({ data: hoje(), descricao: '', categoria: 'Compra de insumos', valor: 0, pagamento: 'PIX', fornecedor: '' });

  const doMes = dados.lancamentos.filter((l) => l.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data));
  const total = doMes.reduce((s, l) => s + l.valor, 0);
  const porCat = CATEGORIAS_LANC.map((c) => ({ ...c, valor: doMes.filter((l) => l.categoria === c.nome).reduce((s, l) => s + l.valor, 0) })).filter((c) => c.valor > 0);
  const mudar = (id: string, patch: Partial<Lancamento>) =>
    atualizar((d) => ({ ...d, lancamentos: d.lancamentos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const salvar = () => {
    if (!novo.descricao.trim() || !novo.valor) return alert('Preencha descrição e valor.');
    atualizar((d) => ({ ...d, lancamentos: [...d.lancamentos, { ...novo, id: uid() }] }));
    setNovo({ ...novo, descricao: '', valor: 0, fornecedor: '' });
    if (!novo.data.startsWith(mes)) setMes(novo.data.slice(0, 7));
  };
  const catOpcoes = CATEGORIAS_LANC.map((c) => ({ value: c.nome, label: c.nome }));
  const pagOpcoes = PAGAMENTOS.map((p) => ({ value: p, label: p }));
  const pag = useListaQueCabe(doMes, 50, { reserva: 140, resetar: [mes] });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
      <Card titulo={<span className="first-letter:uppercase">Lançamentos de {nomeMes(mes)}</span>} acoes={<SeletorMes value={mes} onChange={setMes} />}>
        {doMes.length === 0 ? (
          <Vazio>Nenhum lançamento neste mês.</Vazio>
        ) : (
          <>
          <div ref={pag.ref} className="overflow-x-auto">
            <table className="fin-tabela">
              <thead>
                <tr><th>Data</th><th className="min-w-48">Descrição</th><th>Categoria</th><th className="fin-num">Valor (R$)</th><th>Pagamento</th><th>Fornecedor</th><th /></tr>
              </thead>
              <tbody>
                {pag.itens.map((l) => (
                  <tr key={l.id}>
                    <td className="w-36" data-label="Data"><Txt type="date" value={l.data} onChange={(v) => v && mudar(l.id, { data: v })} /></td>
                    <td className="fin-cheio" data-label="Descrição"><Txt value={l.descricao} onChange={(v) => mudar(l.id, { descricao: v })} /></td>
                    <td className="w-52" data-label="Categoria"><Sel value={l.categoria} onChange={(v) => mudar(l.id, { categoria: v })} opcoes={catOpcoes} /></td>
                    <td className="w-28" data-label="Valor (R$)"><Num value={l.valor} onChange={(v) => mudar(l.id, { valor: v })} /></td>
                    <td className="w-40" data-label="Pagamento"><Sel value={l.pagamento} onChange={(v) => mudar(l.id, { pagamento: v })} opcoes={[...new Set([...PAGAMENTOS, l.pagamento])].map((p) => ({ value: p, label: p }))} /></td>
                    <td className="w-40" data-label="Fornecedor"><Txt value={l.fornecedor ?? ''} onChange={(v) => mudar(l.id, { fornecedor: v })} /></td>
                    <td className="w-8 fin-acao">
                      <button type="button" className="cursor-pointer text-stone-400 hover:text-rose-600" title="Excluir" onClick={() => confirm('Excluir lançamento?') && atualizar((d) => ({ ...d, lancamentos: d.lancamentos.filter((x) => x.id !== l.id) }))}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td /><td className="font-semibold">Total do mês</td><td /><td className="fin-num font-semibold">{brl(total)}</td><td colSpan={3} /></tr></tfoot>
            </table>
          </div>
          <Paginacao {...pag.paginacao} rotulo="lançamentos" className="mt-1" />
          </>
        )}
      </Card>

      <div className="space-y-4">
        <Card titulo="Novo lançamento">
          <div className="grid gap-2 grid-cols-2">
            <label className="text-xs text-stone-500">Data<Txt type="date" value={novo.data} onChange={(v) => setNovo({ ...novo, data: v })} className="mt-1" /></label>
            <label className="text-xs text-stone-500">Valor (R$)<Num value={novo.valor} onChange={(v) => setNovo({ ...novo, valor: v })} className="mt-1" /></label>
            <label className="text-xs text-stone-500 col-span-2">Descrição<Txt value={novo.descricao} onChange={(v) => setNovo({ ...novo, descricao: v })} placeholder="Ex.: Atacadão: leite condensado e granola" className="mt-1" /></label>
            <label className="text-xs text-stone-500 col-span-2">Categoria<Sel value={novo.categoria} onChange={(v) => setNovo({ ...novo, categoria: v })} opcoes={catOpcoes} className="mt-1" /></label>
            <label className="text-xs text-stone-500">Pagamento<Sel value={novo.pagamento} onChange={(v) => setNovo({ ...novo, pagamento: v })} opcoes={pagOpcoes} className="mt-1" /></label>
            <label className="text-xs text-stone-500">Fornecedor<Txt value={novo.fornecedor ?? ''} onChange={(v) => setNovo({ ...novo, fornecedor: v })} placeholder="opcional" className="mt-1" /></label>
            <Btn onClick={salvar} className="justify-center py-2 col-span-2"><Plus size={14} /> Lançar</Btn>
          </div>
          <p className="mt-2 text-xs text-stone-500">{CATEGORIAS_LANC.find((c) => c.nome === novo.categoria)?.dica}</p>
        </Card>

        {porCat.length > 0 && (
          <Card titulo="Por categoria">
            <ul className="space-y-1.5 text-sm">
              {porCat.map((c) => (
                <li key={c.nome} className="flex items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">{c.nome} {c.noResultado ? <Selo tom="info">entra no resultado</Selo> : <Selo>só controle</Selo>}</span>
                  <span className="fin-num font-medium">{brl(c.valor)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
