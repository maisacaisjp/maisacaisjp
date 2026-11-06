import { AlertTriangle, CheckCircle2, Download, Lock, LockOpen } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { filtrarPedidos, useFatMes, usePeriodoContabil } from '../../contabil/carregar';
import { hojeSP, longa } from '../../contabil/datas';
import { baixarCsv, calcularDreContabil, LINHAS_DRE } from '../../contabil/dreContabil';
import { apurarMes } from '../../contabil/impostos';
import { imobilizadoEm } from '../../contabil/imobilizado';
import { brl, pct } from '../../format';
import { useDados } from '../../store';
import type { BalancoAno } from '../../types';
import { analisarVendas } from '../../vendas';
import { Btn, Card, Indicador, Num, NumOpcional, Selo } from '../../ui';
import { SeletorSecao } from '../../../components/admin/ui';
import { TabelaDre, type ColunaDre } from './TabelaDre';

const VAZIO: BalancoAno = {
  caixa: 0, bancos: 0, cartoesReceber: 0, estoque: 0, outrosAtivos: 0,
  fornecedores: 0, salariosPagar: 0, impostosRecolher: 0, emprestimosCP: 0, outrasContasPagar: 0, emprestimosLP: 0,
  capitalSocial: 0, lucrosAnteriores: null, resultadoManual: null, retiradasManual: null,
};

const TRIMESTRES = [['01-01', '04-01', '1º tri'], ['04-01', '07-01', '2º tri'], ['07-01', '10-01', '3º tri'], ['10-01', '13-01', '4º tri']] as const;

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[1fr_105px] items-center gap-2 py-0.5 text-xs" title={dica}>
      <span className="text-stone-700 truncate">{rotulo}</span>
      {children}
    </label>
  );
}

function Fixo({ rotulo, valor, dica }: { rotulo: string; valor: number; dica?: string }) {
  return (
    <div className="grid grid-cols-[1fr_105px] items-center gap-2 py-0.5 text-xs" title={dica}>
      <span className="text-stone-700 truncate">{rotulo}</span>
      <span className="fin-num pr-2 text-right">{brl(valor)}</span>
    </div>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="mt-1 flex items-baseline justify-between border-t border-stone-200 pt-1 text-xs font-semibold">
      <span className="truncate pr-1">{rotulo}</span><span className="fin-num pr-2 text-right">{brl(valor)}</span>
    </div>
  );
}

export default function Balanco() {
  const { dados, cardapio, adicionais, atualizar } = useDados();
  const hoje = hojeSP();
  const anoHoje = Number(hoje.slice(0, 4));
  const [ano, setAno] = useState(Number(hoje.slice(5, 7)) <= 3 ? anoHoje - 1 : anoHoje);
  const [secao, setSecao] = useState<'balanco' | 'dre'>('balanco');
  const de = `${ano}-01-01`;
  const ate = `${ano + 1}-01-01`;
  const dataRef = `${ano}-12-31` < hoje ? `${ano}-12-31` : hoje;
  const encerrado = `${ano}-12-31` < hoje;

  const { pedidos, despesas, fatSistema, carregando, erro, erroDespesas } = usePeriodoContabil(de, ate);
  const fat = useFatMes(dados.historico, fatSistema);
  const b: BalancoAno = { ...VAZIO, ...(dados.contabil.balancos[String(ano)] ?? {}) };
  const fechado = !!b.fechadoEm;
  const mudar = (p: Partial<BalancoAno>) =>
    atualizar((d) => ({ ...d, contabil: { ...d.contabil, balancos: { ...d.contabil.balancos, [String(ano)]: { ...VAZIO, ...(d.contabil.balancos[String(ano)] ?? {}), ...p } } } }));

  // DRE do ano por trimestre. Meses sem pedidos no sistema usam o faturamento do Histórico.
  const { colunas, dreAno } = useMemo(() => {
    const histPorMes: Record<string, number> = {};
    for (const h of dados.historico) if (h.mes.startsWith(String(ano)) && !fatSistema[h.mes] && h.faturamento) histPorMes[h.mes] = h.faturamento;
    const fazer = (ini: string, fim: string) => {
      const resumo = analisarVendas(filtrarPedidos(pedidos, ini, fim), cardapio, adicionais, dados);
      const hist = Object.fromEntries(Object.entries(histPorMes).filter(([m]) => `${m}-01` >= ini && `${m}-01` < fim));
      return calcularDreContabil({ de: ini, ate: fim, resumo, despesas, dados, fat, receitaHistorico: hist });
    };
    const cols: ColunaDre[] = TRIMESTRES.map(([i, f, t]) => {
      const ini = `${ano}-${i}`;
      const fim = f === '13-01' ? `${ano + 1}-01-01` : `${ano}-${f}`;
      return { chave: t, titulo: t, dre: fazer(ini, fim) };
    });
    const anual = fazer(de, ate);
    cols.push({ chave: 'ano', titulo: String(ano), sub: encerrado ? 'exercício' : 'até hoje', dre: anual });
    return { colunas: cols, dreAno: anual };
  }, [pedidos, despesas, cardapio, adicionais, dados, fat, fatSistema, ano, de, ate, encerrado]);

  const imob = imobilizadoEm(dados.contabil.bens, dataRef);
  const anterior = dados.contabil.balancos[String(ano - 1)];
  const lucrosAnteriores = b.lucrosAnteriores ?? anterior?.lucrosFinais ?? 0;
  const resultado = b.resultadoManual ?? dreAno.resultado;
  const retiradas = b.retiradasManual ?? dreAno.retiradas;
  const lucrosAcumulados = lucrosAnteriores + resultado - retiradas;

  const ac = b.caixa + b.bancos + b.cartoesReceber + b.estoque + b.outrosAtivos;
  const anc = imob.liquido;
  const ativo = ac + anc;
  const pc = b.fornecedores + b.salariosPagar + b.impostosRecolher + b.emprestimosCP + b.outrasContasPagar;
  const pnc = b.emprestimosLP;
  const pl = b.capitalSocial + lucrosAcumulados;
  const passivoPl = pc + pnc + pl;
  const diferenca = ativo - passivoPl;
  const fechaBem = Math.abs(diferenca) < 1;

  const dez = `${ano}-12`;
  const dasDez = dados.contabil.imposto.regime === 'mei' ? dados.contabil.imposto.dasMei : fat(dez) * apurarMes(dez, dados.contabil.imposto, fat).aliquota;

  const exportar = () => {
    baixarCsv(`balanco-dre-${ano}.csv`, [
      [`BALANÇO PATRIMONIAL EM ${longa(dataRef)}`, ''],
      ['ATIVO CIRCULANTE', ac], ['Caixa', b.caixa], ['Bancos e PIX', b.bancos], ['Cartões e apps a receber', b.cartoesReceber], ['Estoque', b.estoque], ['Outros ativos', b.outrosAtivos],
      ['ATIVO NÃO CIRCULANTE', anc], ['Imobilizado (custo)', imob.custo], ['(−) Depreciação acumulada', -imob.depreciacao],
      ['TOTAL DO ATIVO', ativo], ['', ''],
      ['PASSIVO CIRCULANTE', pc], ['Fornecedores', b.fornecedores], ['Salários e encargos', b.salariosPagar], ['Impostos a recolher', b.impostosRecolher], ['Empréstimos CP', b.emprestimosCP], ['Outras contas a pagar', b.outrasContasPagar],
      ['PASSIVO NÃO CIRCULANTE', pnc], ['Empréstimos LP', b.emprestimosLP],
      ['PATRIMÔNIO LÍQUIDO', pl], ['Capital social', b.capitalSocial], ['Lucros acumulados anteriores', lucrosAnteriores], ['Resultado do exercício', resultado], ['(−) Retiradas', -retiradas],
      ['TOTAL DO PASSIVO + PL', passivoPl], ['Diferença a conciliar', diferenca], ['', ''],
      [`DRE ${ano}`, ...colunas.map((c) => c.titulo)],
      ...LINHAS_DRE.map((l) => [l.rotulo, ...colunas.map((c) => (l.tipo === 'menos' ? -1 : 1) * l.valor(c.dre))]),
    ]);
  };

  const anos = Array.from({ length: anoHoje - 2019 }, (_, i) => anoHoje - i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900">Balanço patrimonial de {ano}</h1>
          <p className="text-xs text-stone-500 adm-compactavel-esconder">{encerrado ? `Posição em 31/12/${ano}.` : `Prévia: posição em ${longa(hoje)}. O balanço oficial é o de 31/12.`} Ativo precisa ser igual a Passivo + Patrimônio líquido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeletorSecao<'balanco' | 'dre'>
            valor={secao}
            onChange={setSecao}
            opcoes={[{ id: 'balanco', rotulo: 'Balanço patrimonial' }, { id: 'dre', rotulo: `DRE ${ano} por trimestre` }]}
          />
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="fin-campo w-28" aria-label="Ano">
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <Btn variante="neutro" onClick={exportar} disabled={carregando}><Download size={14} /> CSV para o contador</Btn>
          {fechado ? (
            <Btn variante="neutro" onClick={() => confirm('Reabrir o balanço para edição?') && mudar({ fechadoEm: undefined })}><LockOpen size={14} /> Reabrir</Btn>
          ) : (
            <Btn variante="sucesso" disabled={carregando || !encerrado} title={encerrado ? undefined : 'Só dá para fechar depois de 31/12'} onClick={() => {
              if (!fechaBem && !confirm(`O balanço tem diferença de ${brl(diferenca)}. Fechar mesmo assim?`)) return;
              mudar({ fechadoEm: hoje, lucrosFinais: lucrosAcumulados });
            }}>
              <Lock size={14} /> Fechar balanço
            </Btn>
          )}
        </div>
      </div>

      {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Não consegui ler as vendas do ano: {erro}</p>}
      {erroDespesas && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Despesas do caixa não lidas ({erroDespesas}): o resultado está sem elas.</p>}
      {fechado && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} /> Balanço fechado em {longa(b.fechadoEm!)}. Lucros acumulados de {brl(b.lucrosFinais ?? lucrosAcumulados)} viram o saldo inicial de {ano + 1}.</p>}

      {secao === 'balanco' && (
        <div className="space-y-3">
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Indicador rotulo="Total do ativo" valor={brl(ativo)} />
            <Indicador rotulo="Patrimônio líquido" valor={brl(pl)} tom={pl >= 0 ? 'ok' : 'ruim'} />
            <Indicador rotulo="Liquidez corrente" valor={pc ? (ac / pc).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'} sub="ideal > 1" />
            <Indicador rotulo="Endividamento" valor={ativo ? pct((pc + pnc) / ativo) : '—'} sub="dívidas ÷ ativo" />
          </div>

          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${fechaBem ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            {fechaBem ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={16} className="shrink-0 text-amber-600" />}
            {fechaBem ? (
              <span>Balanço fechado: Ativo = Passivo + PL = <b>{brl(ativo)}</b>.</span>
            ) : (
              <span>
                Diferença a conciliar: <b>{brl(diferenca)}</b> ({diferenca > 0 ? 'sobra ativo' : 'falta ativo'}).
                <span className="adm-compactavel-esconder ml-1">Causas comuns: retiradas não lançadas, caixa/banco não contado, estoque não inventariado ou lucros anteriores.</span>
              </span>
            )}
          </div>

          <fieldset disabled={fechado} className="grid gap-3 lg:grid-cols-3 min-w-0 items-start">
            <Card titulo="Ativo">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Circulante</h3>
              <Campo rotulo="Caixa" dica="Contagem da gaveta e do cofre em 31/12"><Num value={b.caixa} onChange={(v) => mudar({ caixa: v })} /></Campo>
              <Campo rotulo="Bancos e PIX" dica="Saldo do extrato em 31/12"><Num value={b.bancos} onChange={(v) => mudar({ bancos: v })} /></Campo>
              <Campo rotulo="Cartões / apps" dica="Vendas no cartão/iFood ainda a receber"><Num value={b.cartoesReceber} onChange={(v) => mudar({ cartoesReceber: v })} /></Campo>
              <Campo rotulo="Estoque" dica="Inventário de insumos e embalagens a preço de custo"><Num value={b.estoque} onChange={(v) => mudar({ estoque: v })} /></Campo>
              <Campo rotulo="Outros ativos"><Num value={b.outrosAtivos} onChange={(v) => mudar({ outrosAtivos: v })} /></Campo>
              <Total rotulo="Ativo circulante" valor={ac} />

              <h3 className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-stone-500">Não circulante</h3>
              <Fixo rotulo="Imobilizado (custo)" valor={imob.custo} dica={`${imob.bens} bens, da aba Imobilizado`} />
              <Fixo rotulo="(−) Depreciação" valor={-imob.depreciacao} />
              <Total rotulo="Ativo não circulante" valor={anc} />
              <Total rotulo="TOTAL DO ATIVO" valor={ativo} />
            </Card>

            <Card titulo="Passivo">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Circulante</h3>
              <Campo rotulo="Fornecedores" dica="Boletos de compras a pagar"><Num value={b.fornecedores} onChange={(v) => mudar({ fornecedores: v })} /></Campo>
              <Campo rotulo="Salários / encargos" dica="Folha de dezembro paga em janeiro, FGTS, INSS"><Num value={b.salariosPagar} onChange={(v) => mudar({ salariosPagar: v })} /></Campo>
              <Campo rotulo="Impostos a recolher" dica={`DAS de dezembro, pago em janeiro. Estimativa: ${brl(dasDez)}`}>
                <div className="flex items-center gap-1">
                  <Num value={b.impostosRecolher} onChange={(v) => mudar({ impostosRecolher: v })} />
                  {!fechado && Math.abs(b.impostosRecolher - dasDez) > 0.5 && (
                    <button type="button" className="cursor-pointer text-[11px] font-semibold text-[#6a2092] underline" onClick={() => mudar({ impostosRecolher: Math.round(dasDez * 100) / 100 })}>
                      usar
                    </button>
                  )}
                </div>
              </Campo>
              <Campo rotulo="Empréstimos (até 12m)"><Num value={b.emprestimosCP} onChange={(v) => mudar({ emprestimosCP: v })} /></Campo>
              <Campo rotulo="Outras contas"><Num value={b.outrasContasPagar} onChange={(v) => mudar({ outrasContasPagar: v })} /></Campo>
              <Total rotulo="Passivo circulante" valor={pc} />

              <h3 className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-stone-500">Não circulante</h3>
              <Campo rotulo="Empréstimos (+12m)"><Num value={b.emprestimosLP} onChange={(v) => mudar({ emprestimosLP: v })} /></Campo>
              <Total rotulo="Passivo não circulante" valor={pnc} />
              <Total rotulo="TOTAL DO PASSIVO" valor={pc + pnc} />
            </Card>

            <Card titulo="Patrimônio líquido">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Composição do PL</h3>
              <Campo rotulo="Capital social" dica="Valor do contrato social"><Num value={b.capitalSocial} onChange={(v) => mudar({ capitalSocial: v })} /></Campo>
              <Campo rotulo="Lucros anteriores" dica={anterior?.lucrosFinais !== undefined ? `Vem do balanço fechado de ${ano - 1}` : 'Primeiro balanço: peça o saldo ao contador'}>
                <NumOpcional value={b.lucrosAnteriores} onChange={(v) => mudar({ lucrosAnteriores: v })} placeholder={brl(lucrosAnteriores)} />
              </Campo>
              <Campo rotulo="Resultado do exercício" dica={b.resultadoManual === null ? 'Calculado pelo DRE abaixo (vazio = automático)' : `Informado à mão. DRE calculou ${brl(dreAno.resultado)}`}>
                <NumOpcional value={b.resultadoManual} onChange={(v) => mudar({ resultadoManual: v })} placeholder={carregando ? '…' : brl(dreAno.resultado)} />
              </Campo>
              <Campo rotulo="(−) Retiradas / lucros" dica="Soma das retiradas lançadas (vazio = automático)">
                <NumOpcional value={b.retiradasManual} onChange={(v) => mudar({ retiradasManual: v })} placeholder={brl(dreAno.retiradas)} />
              </Campo>
              <Fixo rotulo="= Lucros acumulados" valor={lucrosAcumulados} />
              <Total rotulo="Patrimônio líquido" valor={pl} />
              <Total rotulo="TOTAL PASSIVO + PL" valor={passivoPl} />
            </Card>
          </fieldset>
        </div>
      )}

      {secao === 'dre' && (
        <Card titulo={<span className="flex flex-wrap items-center gap-2">DRE de {ano} por trimestre {!encerrado && <Selo tom="alerta">ano em andamento</Selo>}</span>}>
          {carregando ? <p className="py-6 text-center text-sm text-stone-400">Carregando as vendas do ano (pode levar alguns segundos)…</p> : <TabelaDre colunas={colunas} destaque="ano" semComparacao />}
          {dreAno.receitaHistorico > 0 && (
            <p className="mt-3 text-xs text-stone-500 adm-compactavel-esconder">
              {brl(dreAno.receitaHistorico)} de receita vêm de meses do Histórico sem pedidos no sistema. Neles o CMV usa o mesmo % medido (ou a meta) e não há taxa de entrega.
            </p>
          )}
          <p className="mt-2 text-xs text-stone-500 adm-compactavel-esconder">Custos fixos usam o cadastro atual para o ano todo. Se algum custo mudou durante o ano, ajuste o resultado à mão no campo acima.</p>
        </Card>
      )}
    </div>
  );
}
