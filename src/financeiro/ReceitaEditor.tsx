import { Plus, Trash2 } from 'lucide-react';
import { custoUnitRef, nomeRef, pendenciaItem, qtdNoTamanho, unidadeRef } from './calc';
import { brl, num, uid } from './format';
import { useDados } from './store';
import type { ItemReceita, Tamanho } from './types';
import { Btn, NumOpcional, Num, Selo } from './ui';

// Tabela de itens de receita. Com porTamanho=true mostra colunas 550 / 440 / 330 (440 e 330 opcionais = fator).
export function ReceitaEditor({ itens, onChange, porTamanho = false, excluirPreparo }: {
  itens: ItemReceita[];
  onChange: (itens: ItemReceita[]) => void;
  porTamanho?: boolean;
  excluirPreparo?: string;
}) {
  const { dados } = useDados();
  const insumos = [...dados.insumos].sort((a, b) => a.nome.localeCompare(b.nome));
  const preparos = dados.preparos.filter((p) => p.id !== excluirPreparo);
  const mudar = (id: string, patch: Partial<ItemReceita>) => onChange(itens.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const adicionar = () => {
    const primeiro = insumos[0] ? { tipo: 'insumo' as const, refId: insumos[0].id } : preparos[0] ? { tipo: 'preparo' as const, refId: preparos[0].id } : null;
    if (primeiro) onChange([...itens, { id: uid(), ...primeiro, qtd: 0 }]);
    else alert('Cadastre antes um insumo na aba Insumos.');
  };
  const tams: Tamanho[] = porTamanho ? ['G', 'M', 'P'] : ['U'];
  const CAMPO: Record<string, 'qtdM' | 'qtdP'> = { M: 'qtdM', P: 'qtdP' };
  const TITULO: Record<string, string> = { G: 'Qtd 550', M: 'Qtd 440', P: 'Qtd 330' };

  return (
    <div className="overflow-x-auto">
      <table className="fin-tabela">
        <thead>
          <tr>
            <th className="min-w-48">Item</th>
            {porTamanho ? tams.map((t) => <th key={t} className="fin-num">{TITULO[t]}</th>) : <th className="fin-num">Qtd</th>}
            <th>Un.</th>
            <th className="fin-num">Custo {porTamanho ? '550' : ''}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => {
            const un = unidadeRef(it, dados);
            const pend = pendenciaItem(it, dados);
            return (
              <tr key={it.id}>
                <td className="fin-cheio" data-label="Item">
                  <select
                    className="fin-campo"
                    value={`${it.tipo}:${it.refId}`}
                    onChange={(e) => {
                      const [tipo, refId] = e.target.value.split(/:(.*)/s);
                      mudar(it.id, { tipo: tipo as ItemReceita['tipo'], refId });
                    }}
                  >
                    {preparos.length > 0 && (
                      <optgroup label="Preparos">
                        {preparos.map((p) => (
                          <option key={p.id} value={`preparo:${p.id}`}>{p.nome}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Insumos">
                      {insumos.map((i) => (
                        <option key={i.id} value={`insumo:${i.id}`}>{i.nome}</option>
                      ))}
                    </optgroup>
                  </select>
                  {pend && <div className="mt-0.5"><Selo tom="alerta">{pend}</Selo></div>}
                </td>
                {tams.map((t) =>
                  t === 'G' || t === 'U' ? (
                    <td key={t} className="w-20" data-label={porTamanho ? TITULO[t] : `Quantidade (${un})`}><Num value={it.qtd} onChange={(v) => mudar(it.id, { qtd: v })} /></td>
                  ) : (
                    <td key={t} className="w-20" data-label={TITULO[t]}>
                      <NumOpcional
                        value={it[CAMPO[t]]}
                        placeholder={num(qtdNoTamanho({ ...it, [CAMPO[t]]: null }, t, dados.config), 1)}
                        onChange={(v) => mudar(it.id, { [CAMPO[t]]: v })}
                      />
                    </td>
                  ),
                )}
                <td className="text-stone-500 max-md:hidden">{un}</td>
                <td className="fin-num" data-label={`Custo ${porTamanho ? '550' : ''}`}>{brl(it.qtd * custoUnitRef(it, dados))}</td>
                <td className="w-8 fin-acao">
                  <button type="button" className="cursor-pointer text-stone-400 hover:text-rose-600" title={`Remover ${nomeRef(it, dados)}`} onClick={() => onChange(itens.filter((x) => x.id !== it.id))}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Btn variante="neutro" onClick={adicionar}><Plus size={14} /> Adicionar item</Btn>
        {porTamanho && <span className="text-xs text-stone-400">440 e 330 em branco = quantidade do 550 × fator (Ajustes). Digite para fixar um valor.</span>}
      </div>
    </div>
  );
}
