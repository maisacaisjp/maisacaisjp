import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filtrarPedidos, useFatMes, usePeriodoContabil } from '../../contabil/carregar';
import { curta, hojeSP, inicioSemana, longa, somarDias } from '../../contabil/datas';
import { baixarCsv, calcularDreContabil, LINHAS_DRE } from '../../contabil/dreContabil';
import { brl, pct } from '../../format';
import { useDados } from '../../store';
import { analisarVendas } from '../../vendas';
import { Btn, Card, Indicador } from '../../ui';
import { SeletorSecao } from '../../../components/admin/ui';
import { TabelaDre, type ColunaDre } from './TabelaDre';

const SEMANAS = 4;

export default function DreSemanal() {
  const { dados, cardapio, adicionais, atualizar } = useDados();
  const hoje = hojeSP();
  const [semana, setSemana] = useState(() => inicioSemana(hoje));
  const ini = somarDias(semana, -7 * (SEMANAS - 1));
  const fim = somarDias(semana, 7);
  const { pedidos, despesas, fatSistema, carregando, erro, erroDespesas, recarregar } = usePeriodoContabil(ini, fim);
  const fat = useFatMes(dados.historico, fatSistema);

  const colunas: ColunaDre[] = useMemo(() => {
    return Array.from({ length: SEMANAS }, (_, i) => {
      const de = somarDias(ini, 7 * i);
      const ate = somarDias(de, 7);
      const resumo = analisarVendas(filtrarPedidos(pedidos, de, ate), cardapio, adicionais, dados);
      const parcial = ate > hoje;
      return {
        chave: de,
        titulo: `${curta(de)} a ${curta(somarDias(ate, -1))}`,
        sub: parcial ? 'em andamento' : `${resumo.pedidos} pedidos`,
        dre: calcularDreContabil({ de, ate, resumo, despesas, dados, fat }),
      };
    });
  }, [pedidos, despesas, cardapio, adicionais, dados, fat, ini, hoje]);

  const atual = colunas[colunas.length - 1].dre;
  // A revisão da semana é cobrada na segunda-feira seguinte (obrigação "dre-semanal" daquele período)
  const semanaFechada = somarDias(semana, 7) <= hoje;
  const chaveFicha = `dre-semanal|${somarDias(semana, 7)}`;
  const fichaFeita = !!dados.contabil.concluidas[chaveFicha];
  const margem = atual.receita ? atual.resultado / atual.receita : NaN;

  const exportar = () => {
    baixarCsv(`dre-semanal-${semana}.csv`, [
      ['Demonstrativo', ...colunas.map((c) => c.titulo)],
      ...LINHAS_DRE.map((l) => [l.rotulo, ...colunas.map((c) => (l.tipo === 'menos' ? -1 : 1) * l.valor(c.dre))]),
    ]);
  };

  const [secao, setSecao] = useState<'dre' | 'fora'>('dre');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900">DRE semanal</h1>
          <p className="text-xs text-stone-500 adm-compactavel-esconder">Semana de segunda a domingo, regime de competência. Custos fixos e depreciação entram proporcionais aos 7 dias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeletorSecao<'dre' | 'fora'> valor={secao} onChange={setSecao} opcoes={[{ id: 'dre', rotulo: 'Demonstrativo' }, { id: 'fora', rotulo: 'Fora do resultado' }]} />
          <Btn variante="neutro" onClick={() => setSemana(somarDias(semana, -7))} aria-label="Semana anterior"><ChevronLeft size={14} /></Btn>
          <input type="date" value={semana} onChange={(e) => e.target.value && setSemana(inicioSemana(e.target.value))} className="fin-campo w-40" aria-label="Escolher semana" />
          <Btn variante="neutro" onClick={() => setSemana(somarDias(semana, 7))} disabled={somarDias(semana, 7) > hoje} aria-label="Próxima semana"><ChevronRight size={14} /></Btn>
          <Btn variante="neutro" onClick={recarregar} title="Recarregar"><RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /></Btn>
          <Btn variante="neutro" onClick={exportar} disabled={carregando}><Download size={14} /> CSV</Btn>
        </div>
      </div>

      {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Não consegui ler as vendas: {erro}</p>}
      {erroDespesas && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">As despesas da aba Despesas não puderam ser lidas ({erroDespesas}). O DRE está sem elas.</p>}


      {secao === 'dre' && (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] items-start">
        <Card
          titulo={`Semana de ${longa(semana)} e as ${SEMANAS - 1} anteriores`}
          acoes={
            semanaFechada ? (
              fichaFeita ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Revisão da semana feita</span>
              ) : (
                <Btn variante="sucesso" onClick={() => atualizar((d) => ({ ...d, contabil: { ...d.contabil, concluidas: { ...d.contabil.concluidas, [chaveFicha]: hoje } } }))}>
                  <CheckCircle2 size={14} /> Marcar revisão semanal como feita
                </Btn>
              )
            ) : undefined
          }
        >
          {carregando ? <p className="py-6 text-center text-sm text-stone-400">Carregando vendas e despesas…</p> : <TabelaDre colunas={colunas} destaque={semana} />}
          <p className="mt-2 text-xs text-stone-500 adm-compactavel-esconder">Toque numa linha com seta para ver de onde vem cada valor (custo fixo, lançamento, despesa do caixa ou parâmetro) e em qual conta ele foi escriturado.</p>
          {!carregando && atual.cobertura < 0.6 && atual.receita > 0 && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="shrink-0" /> Só {pct(atual.cobertura)} das vendas da semana têm ficha técnica, então o CMV ainda é estimado.
            </p>
          )}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1 content-start">
          <Indicador rotulo="Receita da semana" valor={carregando ? '…' : brl(atual.receita)} sub={`${atual.pedidos} pedidos · ticket ${brl(atual.pedidos ? atual.receita / atual.pedidos : 0)}`} />
          <Indicador rotulo="Lucro líquido" valor={carregando ? '…' : brl(atual.resultado)} tom={atual.resultado >= 0 ? 'ok' : 'ruim'} sub={`margem ${pct(margem)}`} />
          <Indicador rotulo="Imposto provisionado" valor={carregando ? '…' : brl(atual.impostos)} sub={atual.receita ? `${pct(atual.impostos / atual.receita)} da receita` : 'sem receita'} />
          <Indicador rotulo="CMV" valor={carregando ? '…' : pct(atual.cmvPct || NaN)} sub={`medido em ${pct(atual.cobertura)} das vendas`} />
        </div>
      </div>
      )}

      {secao === 'fora' && (
      <Card titulo="Fora do resultado (vai para o balanço ou é só controle)">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Compras para estoque', atual.compras, 'insumos e embalagens: viram CMV quando consumidos'],
            ['Pagamentos de custo fixo', atual.controleFixos, 'já contados pelo cadastro de custos fixos'],
            ['DAS pago', atual.pagamentosDas, 'baixa do imposto provisionado'],
            ['Investimentos', atual.investimentos, 'cadastre no Imobilizado para depreciar'],
            ['Retiradas do sócio', atual.retiradas, 'reduzem o patrimônio, não o lucro'],
          ].map(([r, v, dica]) => (
            <div key={r as string} className="rounded-lg bg-stone-50 p-3">
              <div className="text-xs text-stone-500">{r}</div>
              <div className="fin-num text-left font-semibold">{brl(v as number)}</div>
              <div className="mt-0.5 text-[11px] text-stone-400">{dica}</div>
            </div>
          ))}
        </div>
      </Card>
      )}
    </div>
  );
}
