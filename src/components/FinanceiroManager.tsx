import { AlertTriangle, BookOpen, Landmark, CalendarRange, ChefHat, CheckCircle2, CloudOff, LayoutDashboard, Loader2, Package, Receipt, Settings, ShoppingBag, Wallet } from 'lucide-react';
import { FinanceiroProvider, useDados, type Aba, type StatusSalvo } from '../financeiro/store';
import Ajustes from '../financeiro/pages/Ajustes';
import Contabil from '../financeiro/pages/Contabil';
import { ocorrencias, precisaAtencao } from '../financeiro/contabil/obrigacoes';
import type { SecaoContabil } from '../financeiro/types';
import CustosFixos from '../financeiro/pages/CustosFixos';
import Fichas from '../financeiro/pages/Fichas';
import Historico from '../financeiro/pages/Historico';
import Insumos from '../financeiro/pages/Insumos';
import Lancamentos from '../financeiro/pages/Lancamentos';
import Painel from '../financeiro/pages/Painel';
import Preparos from '../financeiro/pages/Preparos';
import Vendas from '../financeiro/pages/Vendas';

const ABAS: Array<{ id: Aba; rotulo: string; icone: typeof LayoutDashboard }> = [
  { id: 'painel', rotulo: 'Painel', icone: LayoutDashboard },
  { id: 'contabil', rotulo: 'Contábil', icone: Landmark },
  { id: 'fichas', rotulo: 'Fichas', icone: BookOpen },
  { id: 'insumos', rotulo: 'Insumos', icone: Package },
  { id: 'preparos', rotulo: 'Bases', icone: ChefHat },
  { id: 'fixos', rotulo: 'Custos fixos', icone: Wallet },
  { id: 'lancamentos', rotulo: 'Lançamentos', icone: Receipt },
  { id: 'vendas', rotulo: 'Vendas', icone: ShoppingBag },
  { id: 'historico', rotulo: 'Histórico', icone: CalendarRange },
  { id: 'ajustes', rotulo: 'Ajustes', icone: Settings },
];

const STATUS: Record<StatusSalvo, { texto: string; classe: string }> = {
  carregando: { texto: 'Carregando…', classe: 'bg-stone-50 text-stone-500 border-stone-200' },
  salvo: { texto: 'Salvo no banco', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  salvando: { texto: 'Salvando…', classe: 'bg-[#f5eefa] text-[#6a2092] border-[#e4d0f2]' },
  pendente: { texto: 'Alterações a salvar…', classe: 'bg-[#f5eefa] text-[#6a2092] border-[#e4d0f2]' },
  erro: { texto: 'Erro ao salvar', classe: 'bg-rose-50 text-rose-700 border-rose-200' },
  conflito: { texto: 'Alterado em outro aparelho', classe: 'bg-amber-50 text-amber-800 border-amber-200' },
  'sem-tabela': { texto: 'Só neste navegador', classe: 'bg-amber-50 text-amber-800 border-amber-200' },
  'sem-permissao': { texto: 'Sem permissão', classe: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function Conteudo() {
  const { aba, irPara, status, erroSalvar, recarregar, tentarDeNovo, dados } = useDados();
  const alertas = ocorrencias(dados.contabil).filter(precisaAtencao).length;
  const s = STATUS[status];
  const Icone = status === 'salvo' ? CheckCircle2 : status === 'salvando' || status === 'carregando' || status === 'pendente' ? Loader2 : status === 'sem-tabela' ? CloudOff : AlertTriangle;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] flex flex-wrap items-center gap-2">
        <nav className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap flex-1">
          {ABAS.map(({ id, rotulo, icone: I }) => (
            <button
              key={id}
              type="button"
              onClick={() => irPara(id)}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:justify-start ${
                aba === id ? 'bg-[#6a2092] text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <I size={14} className="shrink-0 max-[1439px]:hidden" /> {rotulo}
              {id === 'contabil' && alertas > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold leading-4 ${aba === id ? 'bg-white text-[#6a2092]' : 'bg-amber-500 text-white'}`}>{alertas}</span>
              )}
            </button>
          ))}
        </nav>
        <span className={`ml-auto mr-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${s.classe}`} title={erroSalvar ?? 'Área visível só para o dono da loja.'}>
          <Icone size={12} className={status === 'salvando' || status === 'carregando' ? 'animate-spin' : ''} /> {s.texto}
        </span>
      </div>

      {status === 'sem-tabela' && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <CloudOff size={16} className="shrink-0" />
          <div>
            A tabela do Financeiro ainda não existe no banco. Rode o arquivo <b>FINANCEIRO_MAIS_ACAI.sql</b> no SQL Editor do Supabase.
            Até lá, o que você digitar fica guardado só neste navegador e é enviado ao banco automaticamente depois.
            <button type="button" className="ml-2 cursor-pointer font-semibold underline" onClick={recarregar}>Tentar de novo</button>
          </div>
        </div>
      )}
      {status === 'sem-permissao' && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle size={16} className="shrink-0" /> O Financeiro é visível só para o dono da loja. Entre com o usuário administrador.
        </div>
      )}
      {status === 'conflito' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          Os dados do Financeiro foram alterados em outro aparelho depois que você abriu esta tela. Para não apagar o trabalho do outro, nada foi salvo.
          <button type="button" className="cursor-pointer font-semibold underline" onClick={recarregar}>Carregar a versão mais nova (descarta o que não foi salvo aqui)</button>
        </div>
      )}
      {status === 'erro' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle size={16} className="shrink-0" /> Não consegui salvar no banco{erroSalvar ? `: ${erroSalvar}` : ''}. Suas alterações continuam guardadas neste navegador.
          <button type="button" className="cursor-pointer font-semibold underline" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}

      {aba === 'painel' && <Painel />}
      {aba === 'contabil' && <Contabil />}
      {aba === 'fichas' && <Fichas />}
      {aba === 'insumos' && <Insumos />}
      {aba === 'preparos' && <Preparos />}
      {aba === 'fixos' && <CustosFixos />}
      {aba === 'lancamentos' && <Lancamentos />}
      {aba === 'vendas' && <Vendas />}
      {aba === 'historico' && <Historico />}
      {aba === 'ajustes' && <Ajustes />}
    </div>
  );
}

export default function FinanceiroManager({ abaInicial, secaoInicial }: { abaInicial?: Aba; secaoInicial?: SecaoContabil }) {
  return (
    <FinanceiroProvider abaInicial={abaInicial} secaoInicial={secaoInicial}>
      <Conteudo />
    </FinanceiroProvider>
  );
}
