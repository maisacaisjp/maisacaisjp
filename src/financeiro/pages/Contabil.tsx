import { BellRing, BookMarked, Building2, FileBarChart2, Landmark, Percent } from 'lucide-react';
import { ocorrencias, precisaAtencao } from '../contabil/obrigacoes';
import { useDados } from '../store';
import type { SecaoContabil } from '../types';
import Balanco from './contabil/Balanco';
import DreSemanal from './contabil/DreSemanal';
import Escrituracao from './contabil/Escrituracao';
import Imobilizado from './contabil/Imobilizado';
import Impostos from './contabil/Impostos';
import Obrigacoes from './contabil/Obrigacoes';

const SECOES: Array<{ id: SecaoContabil; rotulo: string; icone: typeof Landmark }> = [
  { id: 'dre', rotulo: 'DRE semanal', icone: FileBarChart2 },
  { id: 'balanco', rotulo: 'Balanço anual', icone: Landmark },
  { id: 'impostos', rotulo: 'Impostos', icone: Percent },
  { id: 'obrigacoes', rotulo: 'Agenda e fichas', icone: BellRing },
  { id: 'imobilizado', rotulo: 'Imobilizado', icone: Building2 },
  { id: 'escrituracao', rotulo: 'Escrituração', icone: BookMarked },
];

export default function Contabil() {
  const { dados, secao, abrirContabil } = useDados();
  const pendentes = ocorrencias(dados.contabil).filter(precisaAtencao).length;

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200/90 bg-stone-50 p-1" aria-label="Seções do contábil">
        {SECOES.map(({ id, rotulo, icone: I }) => (
          <button
            key={id}
            type="button"
            onClick={() => abrirContabil(id)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              secao === id ? 'bg-white text-[#6a2092] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <I size={14} /> {rotulo}
            {id === 'obrigacoes' && pendentes > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">{pendentes}</span>
            )}
          </button>
        ))}
      </nav>
      {secao === 'dre' && <DreSemanal />}
      {secao === 'balanco' && <Balanco />}
      {secao === 'impostos' && <Impostos />}
      {secao === 'obrigacoes' && <Obrigacoes />}
      {secao === 'imobilizado' && <Imobilizado />}
      {secao === 'escrituracao' && <Escrituracao />}
    </div>
  );
}
