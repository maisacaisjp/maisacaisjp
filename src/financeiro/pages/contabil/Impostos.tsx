import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useFatMes, useFatSistema } from '../../contabil/carregar';
import { ajustarVencimento, hojeSP, listaMeses, longa, somarMeses } from '../../contabil/datas';
import { apurarMes, FAIXAS_ANEXO_I, LIMITE_MEI, LIMITE_SIMPLES, SUBLIMITE_SIMPLES } from '../../contabil/impostos';
import { contaDe } from '../../contabil/plano';
import { brl, nomeMes, num, pct } from '../../format';
import { useDados } from '../../store';
import type { ConfigImposto, Regime } from '../../types';
import { Card, Indicador, Num, NumOpcional, Sel, Selo } from '../../ui';
import { Paginacao, useListaQueCabe } from '../../../components/admin/ui';

const REGIMES: Array<{ value: Regime; label: string }> = [
  { value: 'simples', label: 'Simples Nacional (Anexo I)' },
  { value: 'mei', label: 'MEI (DAS fixo)' },
  { value: 'manual', label: 'Alíquota informada pelo contador' },
];

export default function Impostos() {
  const { dados, atualizar } = useDados();
  const cfg = dados.contabil.imposto;
  const hoje = hojeSP();
  const mesAtual = hoje.slice(0, 7);
  const primeiro = somarMeses(mesAtual, -11);
  // Faturamento do mês atual e dos 11 anteriores, mais os 12 antes deles para a RBT12
  const { fatSistema, carregando, erro } = useFatSistema(primeiro, mesAtual);
  const fat = useFatMes(dados.historico, fatSistema);
  const mudar = (p: Partial<ConfigImposto>) => atualizar((d) => ({ ...d, contabil: { ...d.contabil, imposto: { ...d.contabil.imposto, ...p } } }));

  // DAS pago por mês de competência: lançamentos "Pagamento do DAS" feitos no mês seguinte
  const pagos = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of dados.lancamentos) {
      if (contaDe(dados.contabil, 'lanc', l.categoria) !== '2.1.03') continue;
      const comp = somarMeses(l.data.slice(0, 7), -1);
      acc[comp] = (acc[comp] ?? 0) + l.valor;
    }
    return acc;
  }, [dados.lancamentos, dados.contabil]);

  const linhas = listaMeses(primeiro, mesAtual).reverse().map((mes) => {
    const a = apurarMes(mes, cfg, fat);
    const faturamento = fat(mes);
    const valor = cfg.regime === 'mei' ? cfg.dasMei : faturamento * a.aliquota;
    const venc = ajustarVencimento(`${somarMeses(mes, 1)}-20`, 'antecipa');
    return { mes, a, faturamento, valor, venc, pago: pagos[mes] ?? 0 };
  });
  const atual = linhas[0];
  const anoCorrente = listaMeses(`${hoje.slice(0, 4)}-01`, mesAtual).reduce((s, m) => s + fat(m), 0);
  const totalAno = linhas.filter((l) => l.mes.startsWith(hoje.slice(0, 4))).reduce((s, l) => s + l.valor, 0);
  const pagApur = useListaQueCabe(linhas, 33, { reserva: 110 });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr] items-start">
        <div className="space-y-4">
        <Card titulo="Regime tributário">
          <div className="space-y-3 text-sm">
            <label className="block text-xs text-stone-500">Regime
              <Sel value={cfg.regime} onChange={(v) => mudar({ regime: v as Regime })} opcoes={REGIMES} className="mt-1" />
            </label>
            {cfg.regime === 'simples' && (
              <label className="grid grid-cols-[1fr_110px] items-center gap-3">
                <span>Alíquota efetiva fixa (%)
                  <span className="block text-xs text-stone-500">Deixe vazio para calcular pela RBT12. Preencha se o contador passar a alíquota do mês (extrato do PGDAS-D).</span>
                </span>
                <NumOpcional value={cfg.aliquotaManual} onChange={(v) => mudar({ aliquotaManual: v })} placeholder="auto" />
              </label>
            )}
            {cfg.regime === 'manual' && (
              <label className="grid grid-cols-[1fr_110px] items-center gap-3">
                <span>Alíquota sobre o faturamento (%)<span className="block text-xs text-stone-500">Ex.: Lucro Presumido somando PIS, COFINS, IRPJ, CSLL e ICMS, conforme o contador.</span></span>
                <NumOpcional value={cfg.aliquotaManual} onChange={(v) => mudar({ aliquotaManual: v })} />
              </label>
            )}
            {cfg.regime === 'mei' && (
              <label className="grid grid-cols-[1fr_110px] items-center gap-3">
                <span>Valor do DAS-MEI (R$/mês)<span className="block text-xs text-stone-500">5% do salário mínimo + R$ 1 de ICMS (comércio). Confira o valor do ano no Portal do Empreendedor.</span></span>
                <Num value={cfg.dasMei} onChange={(v) => mudar({ dasMei: v })} />
              </label>
            )}
            <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600 adm-compactavel-esconder">
              O imposto entra no DRE como dedução da receita, pelo regime de competência: a venda de novembro gera o DAS que vence em 20 de dezembro.
              O pagamento você lança em Lançamentos → <b>Pagamento do DAS</b>, que fica só como controle e não conta duas vezes.
            </p>
            <p className="text-[11px] text-stone-400 adm-compactavel-esconder">
              Reforma tributária: em 2026 a CBS e o IBS estão em fase de teste e quem é do Simples continua pagando só o DAS. Confirme com o contador antes de 2027.
            </p>
          </div>
        </Card>
        {cfg.regime === 'simples' && (
          <Card titulo="Tabela do Anexo I (comércio)">
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-2 text-left">Faixa</th><th className="px-2 text-right">RBT12 até</th><th className="px-2 text-right">Alíquota nominal</th><th className="px-2 text-right">Parcela a deduzir</th><th className="pl-2 text-right">Efetiva no topo</th>
                  </tr>
                </thead>
                <tbody>
                  {FAIXAS_ANEXO_I.map((f, i) => (
                    <tr key={f.ate} className={`border-b border-stone-100 ${atual.a.faixa === i + 1 ? 'bg-[#f5eefa] font-semibold' : ''}`}>
                      <td className="py-1.5">{i + 1}ª</td>
                      <td className="fin-num px-2">{brl(f.ate)}</td>
                      <td className="fin-num px-2">{num(f.nominal * 100, 2)}%</td>
                      <td className="fin-num px-2">{brl(f.deduzir)}</td>
                      <td className="fin-num pl-2">{pct((f.ate * f.nominal - f.deduzir) / f.ate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone-500 adm-compactavel-esconder">Alíquota efetiva = (RBT12 × nominal − parcela a deduzir) ÷ RBT12. RBT12 = faturamento dos 12 meses anteriores ao mês apurado.</p>
          </Card>
        )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador rotulo={`DAS de ${nomeMes(mesAtual).split(' ')[0]}`} valor={carregando ? '…' : brl(atual.valor)} sub={`vence ${longa(atual.venc)}`} />
            <Indicador rotulo="Alíquota efetiva" valor={carregando ? '…' : cfg.regime === 'mei' ? 'fixo' : pct(atual.a.aliquota)} sub={atual.a.faixa ? `${atual.a.faixa}ª faixa do Anexo I` : atual.a.fonte === 'manual' ? 'informada' : 'DAS-MEI'} />
            <Indicador rotulo="RBT12" valor={carregando ? '…' : brl(atual.a.rbt12)} sub={`${atual.a.mesesComDado} de 12 meses com faturamento`} />
          </div>
          {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Não consegui ler o faturamento: {erro}</p>}
          {!carregando && atual.a.mesesComDado < 12 && cfg.regime !== 'mei' && (
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="shrink-0" /> Faltam meses na RBT12. Preencha o faturamento antigo na aba Histórico para a alíquota sair certa.
            </p>
          )}
          {cfg.regime === 'mei' && anoCorrente > LIMITE_MEI * 0.8 && (
            <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle size={16} className="shrink-0" /> Faturamento do ano em {brl(anoCorrente)}: {anoCorrente > LIMITE_MEI ? 'acima' : 'perto'} do limite do MEI ({brl(LIMITE_MEI)}). Fale com o contador sobre o desenquadramento.
            </p>
          )}
          {cfg.regime === 'simples' && atual.a.rbt12 > SUBLIMITE_SIMPLES * 0.85 && (
            <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle size={16} className="shrink-0" /> RBT12 perto do sublimite de {brl(SUBLIMITE_SIMPLES)} (ICMS fora do DAS) / limite de {brl(LIMITE_SIMPLES)}.
            </p>
          )}
          <Card titulo="Apuração mês a mês" acoes={<span className="text-xs text-stone-500">Total estimado em {hoje.slice(0, 4)}: <b>{brl(totalAno)}</b></span>}>
            <div ref={pagApur.ref} className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-2 text-left">Competência</th>
                    <th className="px-2 text-right">Faturamento</th>
                    <th className="px-2 text-right">RBT12</th>
                    <th className="px-2 text-right">Alíquota</th>
                    <th className="px-2 text-right">DAS estimado</th>
                    <th className="px-2 text-right">Vencimento</th>
                    <th className="pl-2 text-right">Pago (lançado)</th>
                  </tr>
                </thead>
                <tbody>
                  {pagApur.itens.map((l) => (
                    <tr key={l.mes} className="border-b border-stone-100">
                      <td className="py-1.5 first-letter:uppercase">{nomeMes(l.mes)}</td>
                      <td className="fin-num px-2">{carregando ? '…' : brl(l.faturamento)}</td>
                      <td className="fin-num px-2 text-stone-500">{carregando ? '…' : brl(l.a.rbt12)}</td>
                      <td className="fin-num px-2">{cfg.regime === 'mei' ? '—' : pct(l.a.aliquota)}</td>
                      <td className="fin-num px-2 font-semibold">{carregando ? '…' : brl(l.valor)}</td>
                      <td className="fin-num px-2 text-stone-500">{longa(l.venc)}</td>
                      <td className="fin-num pl-2">
                        {l.pago > 0 ? (
                          <Selo tom={Math.abs(l.pago - l.valor) <= Math.max(5, l.valor * 0.05) ? 'ok' : 'alerta'} title="Diferença grande: confira com o extrato do PGDAS-D">
                            <CheckCircle2 size={11} /> {brl(l.pago)}
                          </Selo>
                        ) : l.venc < hoje ? <Selo tom="ruim">não lançado</Selo> : <span className="text-stone-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao {...pagApur.paginacao} rotulo="meses" className="mt-1" />
          </Card>
        </div>
      </div>


    </div>
  );
}
