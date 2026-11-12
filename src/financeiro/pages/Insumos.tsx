import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { custoUnitInsumo, usoDoInsumo } from '../calc';
import { CATEGORIAS_INSUMO } from '../constantes';
import { brl, fatorExibicao, hoje, norm, sufixoUnidade, uid } from '../format';
import { faltandoMultipedidos, importarMultipedidos } from '../insumosMultipedidos';
import { useDados } from '../store';
import type { Insumo, Unidade } from '../types';
import { Btn, Card, Num, Sel, Selo, Txt, Vazio } from '../ui';

const UNIDADES: Array<{ value: Unidade; label: string }> = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'un', label: 'un' },
];

export default function Insumos() {
  const { dados, atualizar } = useDados();
  const [busca, setBusca] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);

  const mudar = (id: string, patch: Partial<Insumo>) =>
    atualizar((d) => ({ ...d, insumos: d.insumos.map((x) => (x.id === id ? { ...x, ...patch, atualizadoEm: hoje() } : x)) }));
  const semPreco = (i: Insumo) => !i.semCusto && (!i.precoEmbalagem || !i.qtdEmbalagem);

  const lista = dados.insumos
    .filter((i) => !busca || norm(i.nome).includes(norm(busca)))
    .filter((i) => !soPendentes || semPreco(i))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const pendentes = dados.insumos.filter(semPreco).length;
  const faltando = faltandoMultipedidos(dados).length;

  return (
    <Card
      titulo={<>Insumos <span className="text-xs font-normal text-stone-500">({dados.insumos.length})</span></>}
      acoes={
        <>
          <label className="relative">
            <Search size={14} className="absolute left-2 top-2.5 text-stone-400" />
            <Txt value={busca} onChange={setBusca} placeholder="Buscar" className="w-44 pl-7" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" className="accent-[#6a2092]" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} />
            Só sem preço {pendentes > 0 && <Selo tom="alerta">{pendentes}</Selo>}
          </label>
          {faltando > 0 && (
            <Btn
              variante="neutro"
              title="Acrescenta só os que faltam. Insumos que já existem não mudam."
              onClick={() => confirm(`Adicionar ${faltando} insumos com os preços do Multipedidos? Os que já existem não mudam.`) && atualizar(importarMultipedidos)}
            >
              <Download size={14} /> Importar do Multipedidos ({faltando})
            </Btn>
          )}
          <Btn
            onClick={() => {
              const novo: Insumo = { id: uid(), nome: 'Novo insumo', categoria: 'Outros', unidade: 'g', qtdEmbalagem: 1000, precoEmbalagem: 0, perda: 0, atualizadoEm: hoje() };
              atualizar((d) => ({ ...d, insumos: [novo, ...d.insumos] }));
              setBusca('');
              setSoPendentes(false);
            }}
          >
            <Plus size={14} /> Novo insumo
          </Btn>
        </>
      }
    >
      <p className="mb-3 text-xs text-stone-500 adm-compactavel-esconder">
        Coloque o preço da embalagem como vem na nota (ex.: polpa de açaí 10 kg = 10000 g por R$ 180,00). A perda é o que se perde no preparo: casca da fruta, sobra no balde.
        O custo de cada ficha é recalculado na hora.
      </p>
      {dados.insumos.length === 0 ? (
        <Vazio>Nenhum insumo ainda. Clique em "Novo insumo" ou importe as suas fichas.</Vazio>
      ) : (
        <>
        {/* Todos os insumos numa lista só: desce com a rolagem, cabeçalho fica fixo (igual a Produtos) */}
        <div className="overflow-x-auto md:overflow-y-auto md:max-h-[calc(100dvh-300px)] md:min-h-[400px] adm-rolagem">
          <table className="fin-tabela">
            <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
              <tr>
                <th className="min-w-44">Insumo</th>
                <th>Categoria</th>
                <th>Un.</th>
                <th className="fin-num">Embalagem</th>
                <th className="fin-num">Preço (R$)</th>
                <th className="fin-num">Perda %</th>
                <th className="fin-num">Custo real</th>
                <th>Fornecedor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id} className={semPreco(i) ? 'bg-amber-50/50' : ''}>
                  <td className="min-w-40 fin-cheio" data-label="Insumo"><Txt value={i.nome} onChange={(v) => mudar(i.id, { nome: v })} /></td>
                  <td className="w-40" data-label="Categoria"><Sel value={i.categoria} onChange={(v) => mudar(i.id, { categoria: v })} opcoes={[...new Set([...CATEGORIAS_INSUMO, i.categoria])].map((c) => ({ value: c, label: c }))} /></td>
                  <td className="w-20" data-label="Unidade"><Sel value={i.unidade} onChange={(v) => mudar(i.id, { unidade: v as Unidade })} opcoes={UNIDADES} /></td>
                  <td className="w-24" data-label={`Embalagem (${i.unidade})`}><Num value={i.qtdEmbalagem} onChange={(v) => mudar(i.id, { qtdEmbalagem: v })} /></td>
                  <td className="w-24" data-label="Preço (R$)"><Num value={i.precoEmbalagem} onChange={(v) => mudar(i.id, { precoEmbalagem: v })} /></td>
                  <td className="w-20" data-label="Perda %"><Num value={i.perda} onChange={(v) => mudar(i.id, { perda: v })} /></td>
                  <td className="fin-num" data-label="Custo real">
                    {semPreco(i) ? <Selo tom="alerta">sem preço</Selo> : i.semCusto ? <span className="text-stone-400">sem custo</span> : `${brl(custoUnitInsumo(i) * fatorExibicao(i.unidade))}${sufixoUnidade(i.unidade)}`}
                    {i.atualizadoEm && <span className="block text-[10px] font-normal text-stone-400">atualizado {i.atualizadoEm.split('-').reverse().join('/')}</span>}
                  </td>
                  <td className="w-36" data-label="Fornecedor"><Txt value={i.fornecedor ?? ''} onChange={(v) => mudar(i.id, { fornecedor: v })} placeholder="—" /></td>
                  <td className="w-8 fin-acao">
                    <button
                      type="button"
                      className="cursor-pointer text-stone-400 hover:text-rose-600"
                      title="Excluir"
                      onClick={() => {
                        const uso = usoDoInsumo(i.id, dados);
                        const msg = uso.length ? `"${i.nome}" é usado em: ${uso.join(', ')}.\nExcluir mesmo assim?` : `Excluir "${i.nome}"?`;
                        if (confirm(msg)) atualizar((d) => ({ ...d, insumos: d.insumos.filter((x) => x.id !== i.id) }));
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}
