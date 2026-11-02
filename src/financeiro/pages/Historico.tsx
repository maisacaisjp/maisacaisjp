import { Plus, Upload, Calendar, Layers, CheckCircle2 } from 'lucide-react';
import { HistoricalSalesModal } from '../../components/HistoricalSalesModal';
import { DADOS_HISTORICOS_MENSAIS } from '../../data/historicalSalesData';
import { useMemo, useState } from 'react';
import { MESES_CURTOS, brl, num, pct } from '../format';
import { useDados, useFaturamentoSistema } from '../store';
import type { FaturamentoMes } from '../types';
import { Btn, Card, Indicador, NumOpcional, Selo, Vazio } from '../ui';

const MES_NOME: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

// "12.345,67" / "12345,67" / "12345.67" / "R$ 1.200" → número
export function lerValor(bruto: string): number | null {
  const s = bruto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s || !/\d/.test(s)) return null;
  let t = s;
  if (s.includes(',')) t = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) t = s.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Uma linha colada da planilha: data do mês + faturamento (+ pedidos opcional)
export function lerLinha(linha: string): FaturamentoMes | null {
  let mes: string | null = null;
  let resto = linha;
  const tirar = (m: RegExpMatchArray) => {
    resto = linha.replace(m[0], ' ');
  };
  let m = linha.match(/(?<![\d.,])((?:19|20)\d{2})[-/](\d{1,2})(?![\d])/);
  if (m) {
    mes = `${m[1]}-${m[2].padStart(2, '0')}`;
    tirar(m);
  } else if ((m = linha.match(/(?<![\d.,])(\d{1,2})[-/.]((?:19|20)\d{2})(?![\d])/))) {
    mes = `${m[2]}-${m[1].padStart(2, '0')}`;
    tirar(m);
  } else if ((m = linha.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*[\s/.\-de]*(\d{4}|\d{2})(?![\d])/i))) {
    const ano = m[2].length === 2 ? `20${m[2]}` : m[2];
    mes = `${ano}-${String(MES_NOME[m[1].toLowerCase()]).padStart(2, '0')}`;
    tirar(m);
  }
  if (!mes || Number(mes.slice(5)) < 1 || Number(mes.slice(5)) > 12) return null;
  const numeros = (resto.match(/R?\$?\s*\d[\d.,]*/g) ?? []).map(lerValor).filter((n): n is number => n !== null);
  if (!numeros.length) return null;
  return { mes, faturamento: numeros[0], pedidos: numeros[1] !== undefined ? Math.round(numeros[1]) : null };
}

export default function Historico() {
  const { dados, atualizar } = useDados();
  const anoAtual = new Date().getFullYear();
  const anosComDado = [...new Set(dados.historico.map((h) => Number(h.mes.slice(0, 4))))];
  const anos = [...new Set([...anosComDado, anoAtual])].sort((a, b) => b - a);
  const [ano, setAno] = useState(anoAtual);
  const [colado, setColado] = useState('');
  const [mostrarImportar, setMostrarImportar] = useState(dados.historico.length === 0);
  const [showModal2020a2026, setShowModal2020a2026] = useState(false);
  const [feedbackSincronizado, setFeedbackSincronizado] = useState(false);

  const sincronizarPlanilhasHistoricas = () => {
    atualizar((d) => {
      const mapa = new Map(d.historico.map((h) => [h.mes, h]));
      DADOS_HISTORICOS_MENSAIS.forEach((v) => {
        if (!mapa.has(v.mes)) {
          mapa.set(v.mes, v);
        }
      });
      return { ...d, historico: [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes)) };
    });
    setFeedbackSincronizado(true);
    setTimeout(() => setFeedbackSincronizado(false), 3500);
  };

  const sistemaAno = useFaturamentoSistema(ano);
  const sistemaAtual = useFaturamentoSistema(anoAtual);
  const hist = useMemo(() => new Map(dados.historico.map((h) => [h.mes, h])), [dados.historico]);

  // Valor do mês: o informado no histórico; se não houver, o do sistema
  const valorMes = (mes: string) => {
    const h = hist.get(mes);
    if (h && h.faturamento) return { faturamento: h.faturamento, pedidos: h.pedidos ?? null, fonte: 'histórico' as const };
    const sis = (Number(mes.slice(0, 4)) === ano ? sistemaAno.porMes : sistemaAtual.porMes)[mes];
    if (sis && Number(mes.slice(0, 4)) >= anoAtual - 1) return { faturamento: sis.faturamento, pedidos: sis.pedidos, fonte: 'sistema' as const };
    return null;
  };

  const mudarMes = (mes: string, patch: Partial<FaturamentoMes>) =>
    atualizar((d) => {
      const atual = d.historico.find((h) => h.mes === mes) ?? { mes, faturamento: 0, pedidos: null };
      const novo = { ...atual, ...patch };
      const outros = d.historico.filter((h) => h.mes !== mes);
      const vazio = !novo.faturamento && !novo.pedidos;
      return { ...d, historico: vazio ? outros : [...outros, novo].sort((a, b) => a.mes.localeCompare(b.mes)) };
    });

  const resumoAnual = anos
    .map((a) => {
      let fat = 0;
      let ped = 0;
      let meses = 0;
      let mesesComPedidos = 0;
      for (let m = 1; m <= 12; m++) {
        const v = valorMes(`${a}-${String(m).padStart(2, '0')}`);
        if (!v) continue;
        fat += v.faturamento;
        meses++;
        if (v.pedidos) {
          ped += v.pedidos;
          mesesComPedidos++;
        }
      }
      return { ano: a, fat, ped, meses, mesesComPedidos };
    })
    .filter((x) => x.meses > 0)
    .sort((a, b) => a.ano - b.ano);
  const maxAno = Math.max(1, ...resumoAnual.map((x) => x.fat));

  const linhasColadas = colado.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lidas = linhasColadas.map(lerLinha);
  const validas = lidas.filter((x): x is FaturamentoMes => x !== null);
  const importar = () => {
    if (!validas.length) return;
    const substitui = validas.filter((v) => hist.has(v.mes)).length;
    if (substitui && !confirm(`${substitui} desses meses já têm valor e serão substituídos. Continuar?`)) return;
    atualizar((d) => {
      const mapa = new Map(d.historico.map((h) => [h.mes, h]));
      validas.forEach((v) => mapa.set(v.mes, { ...mapa.get(v.mes), ...v }));
      return { ...d, historico: [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes)) };
    });
    setColado('');
    setMostrarImportar(false);
    setAno(Number(validas[validas.length - 1].mes.slice(0, 4)));
  };

  const doAno = resumoAnual.find((x) => x.ano === ano);
  const anterior = resumoAnual.find((x) => x.ano === ano - 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900">Histórico de faturamento</h1>
          <p className="text-xs text-stone-500">Faturamento mês a mês dos anos anteriores. Meses sem valor informado usam o que o sistema registrou.</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variante="neutro" onClick={() => setShowModal2020a2026(true)}>
            <Calendar size={14} className="text-[#6a2092]" /> Relatório 2020 a 2026
          </Btn>
          <Btn
            variante={feedbackSincronizado ? 'sucesso' : 'neutro'}
            onClick={sincronizarPlanilhasHistoricas}
            title="Importa os 12 semestres (2020 a 2026) automaticamente para o histórico"
          >
            {feedbackSincronizado ? <CheckCircle2 size={14} /> : <Layers size={14} />}
            {feedbackSincronizado ? 'Sincronizado!' : 'Povoar 2020-2026'}
          </Btn>
          <Btn variante={mostrarImportar ? 'neutro' : 'primario'} onClick={() => setMostrarImportar((v) => !v)}>
            <Upload size={14} /> Colar da planilha
          </Btn>
        </div>
      </div>

      {mostrarImportar && (
        <Card titulo="Colar dados da planilha">
          <p className="mb-2 text-xs text-stone-500">
            Copie as colunas <b>mês</b>, <b>faturamento</b> e, se tiver, <b>quantidade de pedidos</b> e cole abaixo, uma linha por mês.
            Aceita formatos como <code className="rounded bg-stone-100 px-1">01/2019 12.345,67 830</code>, <code className="rounded bg-stone-100 px-1">2019-01;12345,67</code> ou <code className="rounded bg-stone-100 px-1">jan/19 R$ 12.345,67</code>.
          </p>
          <textarea className="fin-campo font-mono text-xs" rows={8} value={colado} onChange={(e) => setColado(e.target.value)} placeholder={'01/2019\t12.345,67\t830\n02/2019\t11.980,00\t790'} />
          {linhasColadas.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Selo tom="ok">{validas.length} meses reconhecidos</Selo>
                {lidas.length - validas.length > 0 && <Selo tom="alerta">{lidas.length - validas.length} linhas ignoradas</Selo>}
                {validas.length > 0 && <span className="text-stone-500">de {validas[0].mes.split('-').reverse().join('/')} a {validas[validas.length - 1].mes.split('-').reverse().join('/')} · total {brl(validas.reduce((s, v) => s + v.faturamento, 0))}</span>}
              </div>
              <Btn onClick={importar} disabled={!validas.length}><Plus size={14} /> Importar {validas.length} meses</Btn>
            </div>
          )}
        </Card>
      )}

      {resumoAnual.length === 0 ? (
        <Vazio>Nenhum faturamento registrado ainda. Use "Colar da planilha" ou digite mês a mês abaixo.</Vazio>
      ) : (
        <Card titulo="Ano a ano">
          <div className="overflow-x-auto">
            <table className="fin-tabela">
              <thead>
                <tr><th>Ano</th><th className="min-w-40" /><th className="fin-num">Faturamento</th><th className="fin-num">Crescimento</th><th className="fin-num">Média/mês</th><th className="fin-num">Pedidos</th><th className="fin-num">Ticket médio</th><th className="fin-num">Meses</th></tr>
              </thead>
              <tbody>
                {resumoAnual.map((x, i) => {
                  const ant = resumoAnual[i - 1];
                  const cresc = ant && ant.ano === x.ano - 1 && ant.meses === 12 && x.meses === 12 ? x.fat / ant.fat - 1 : NaN;
                  return (
                    <tr key={x.ano} className={`cursor-pointer hover:bg-stone-50 ${x.ano === ano ? 'bg-[#f7f2fb]' : ''}`} onClick={() => setAno(x.ano)}>
                      <td className="fin-cheio font-semibold">{x.ano}</td>
                      <td className="max-md:hidden"><div className="h-2.5 rounded-full bg-stone-100"><div className="h-2.5 rounded-full bg-[#6a2092]" style={{ width: `${(x.fat / maxAno) * 100}%` }} /></div></td>
                      <td className="fin-num font-semibold" data-label="Faturamento">{brl(x.fat)}</td>
                      <td className="fin-num" data-label="Crescimento">{Number.isFinite(cresc) ? <Selo tom={cresc >= 0 ? 'ok' : 'ruim'}>{cresc >= 0 ? '+' : ''}{pct(cresc)}</Selo> : <span className="text-stone-300">—</span>}</td>
                      <td className="fin-num" data-label="Média/mês">{brl(x.fat / x.meses)}</td>
                      <td className="fin-num" data-label="Pedidos">{x.ped ? num(x.ped) : '—'}</td>
                      <td className="fin-num" data-label="Ticket médio">{x.ped && x.mesesComPedidos === x.meses ? brl(x.fat / x.ped) : '—'}</td>
                      <td className="fin-num" data-label="Meses">{x.meses < 12 ? <Selo tom="alerta">{x.meses}/12</Selo> : '12'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-stone-400">Crescimento só é calculado entre anos completos (12 meses). Clique num ano para ver os meses.</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador rotulo={`Faturamento ${ano}`} valor={brl(doAno?.fat ?? 0)} sub={doAno ? `${doAno.meses} meses com dado` : 'sem dados'} />
        <Indicador rotulo="Média mensal" valor={brl(doAno ? doAno.fat / doAno.meses : 0)} sub={anterior ? `${ano - 1}: ${brl(anterior.fat / anterior.meses)}/mês` : undefined} />
        <Indicador rotulo="Melhor mês" valor={(() => {
          let melhor: { m: number; v: number } | null = null;
          for (let m = 1; m <= 12; m++) {
            const v = valorMes(`${ano}-${String(m).padStart(2, '0')}`)?.faturamento ?? 0;
            if (v && (!melhor || v > melhor.v)) melhor = { m, v };
          }
          return melhor ? `${MESES_CURTOS[melhor.m - 1]} · ${brl(melhor.v)}` : '—';
        })()} />
      </div>

      <Card
        titulo={`Meses de ${ano}`}
        acoes={
          <div className="flex flex-wrap gap-1">
            {anos.map((a) => (
              <button key={a} type="button" onClick={() => setAno(a)} className={`cursor-pointer rounded-full px-2.5 py-1 text-xs ${a === ano ? 'bg-[#6a2092] font-semibold text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{a}</button>
            ))}
            <button
              type="button"
              className="cursor-pointer rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200"
              onClick={() => {
                const a = Number(prompt('Qual ano você quer preencher?', String(Math.min(...anos) - 1)));
                if (a > 2000 && a <= anoAtual) setAno(a);
              }}
            >
              + outro ano
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="fin-tabela">
            <thead>
              <tr><th>Mês</th><th className="fin-num">Faturamento (R$)</th><th className="fin-num">Pedidos</th><th className="fin-num">Ticket médio</th><th className="fin-num">No sistema</th><th className="fin-num">vs {ano - 1}</th></tr>
            </thead>
            <tbody>
              {MESES_CURTOS.map((nome, i) => {
                const mes = `${ano}-${String(i + 1).padStart(2, '0')}`;
                const h = hist.get(mes);
                const sis = sistemaAno.porMes[mes];
                const v = valorMes(mes);
                const ant = valorMes(`${ano - 1}-${String(i + 1).padStart(2, '0')}`);
                const varAno = v && ant && ant.faturamento ? v.faturamento / ant.faturamento - 1 : NaN;
                return (
                  <tr key={mes}>
                    <td className="fin-cheio font-medium max-md:font-bold max-md:text-[#4d0471]">{nome}</td>
                    <td className="w-36" data-label="Faturamento (R$)"><NumOpcional value={h?.faturamento || null} placeholder={sis ? num(sis.faturamento, 2) : ''} onChange={(val) => mudarMes(mes, { faturamento: val ?? 0 })} /></td>
                    <td className="w-24" data-label="Pedidos"><NumOpcional value={h?.pedidos ?? null} placeholder={sis ? String(sis.pedidos) : ''} onChange={(val) => mudarMes(mes, { pedidos: val === null ? null : Math.round(val) })} /></td>
                    <td className="fin-num" data-label="Ticket médio">{v?.pedidos ? brl(v.faturamento / v.pedidos) : '—'}</td>
                    <td className="fin-num text-stone-500" data-label="No sistema">{sistemaAno.carregando ? '…' : sis ? brl(sis.faturamento) : '—'}</td>
                    <td className="fin-num" data-label={`vs ${ano - 1}`}>{Number.isFinite(varAno) ? <Selo tom={varAno >= 0 ? 'ok' : 'ruim'}>{varAno >= 0 ? '+' : ''}{pct(varAno)}</Selo> : <span className="text-stone-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-400">Campo em branco usa o valor do sistema (em cinza). Digite para informar o valor real do mês.</p>
      </Card>
      <HistoricalSalesModal
        isOpen={showModal2020a2026}
        onClose={() => setShowModal2020a2026(false)}
        onSyncFinanceiro={sincronizarPlanilhasHistoricas}
      />
    </div>
  );
}
