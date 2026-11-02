import { AlertTriangle } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { custoFicha, pendenciasFicha, tamanhoRef } from '../calc';
import { calcularDre } from '../dre';
import { brl, mesAtual, nomeMes, pct } from '../format';
import { useDados, usePedidos, type Aba } from '../store';
import { analisarVendas } from '../vendas';
import { Card, Indicador, SeletorMes, Selo, tomCmv } from '../ui';

function Linha({ rotulo, valor, sinal, forte, sub }: { rotulo: ReactNode; valor: number; sinal?: '-' | '='; forte?: boolean; sub?: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${forte ? 'border-t border-stone-200 font-semibold' : ''}`}>
      <span className={sinal === '-' ? 'pl-3 text-stone-600' : ''}>
        {sinal === '-' ? '(−) ' : sinal === '=' ? '= ' : ''}
        {rotulo}
        {sub && <span className="ml-2 text-xs font-normal text-stone-400">{sub}</span>}
      </span>
      <span className={`fin-num ${forte ? (valor >= 0 ? 'text-emerald-600' : 'text-rose-600') : ''}`}>{brl(sinal === '-' ? -valor : valor)}</span>
    </div>
  );
}

export default function Painel() {
  const { dados, cardapio, adicionais, irPara } = useDados();
  const [mes, setMes] = useState(mesAtual());
  const { pedidos, carregando, erro } = usePedidos(mes);
  const r = useMemo(() => analisarVendas(pedidos, cardapio, adicionais, dados), [pedidos, cardapio, adicionais, dados]);
  const dre = calcularDre(mes, r, dados);
  const meta = dados.config.cmvMeta;

  const insumosSemPreco = dados.insumos.filter((i) => !i.semCusto && (!i.precoEmbalagem || !i.qtdEmbalagem)).length;
  const fichasPendentes = dados.fichas.filter((f) => pendenciasFicha(f, dados).length > 0).length;
  const fixosConfirmar = dados.custosFixos.filter((c) => c.aConfirmar).length;
  const piores = dados.fichas
    .map((f) => {
      const t = tamanhoRef(f);
      const preco = f.precos[t] ?? 0;
      return { f, cmv: preco ? custoFicha(f, t, dados).total / preco : NaN };
    })
    .filter((x) => Number.isFinite(x.cmv))
    .sort((a, b) => b.cmv - a.cmv)
    .slice(0, 5);
  const dias = Object.entries(r.porDia).sort();
  const maxDia = Math.max(1, ...dias.map(([, v]) => v));
  const pendencias: Array<{ n: number; txt: string; aba: Aba }> = [
    { n: insumosSemPreco, txt: 'insumos sem preço', aba: 'insumos' },
    { n: fichasPendentes, txt: 'fichas com pendência', aba: 'fichas' },
    { n: fixosConfirmar, txt: 'custos fixos a confirmar', aba: 'fixos' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900 first-letter:uppercase">Resultado de {nomeMes(mes)}</h1>
          <p className="text-xs text-stone-500">Vendas do gestor + fichas técnicas + custos fixos + lançamentos.</p>
        </div>
        <SeletorMes value={mes} onChange={setMes} />
      </div>
      {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Não consegui ler as vendas do gestor: {erro}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Faturamento" valor={carregando ? '…' : brl(dre.faturamento)} sub={`${r.pedidos} pedidos · ticket ${brl(r.pedidos ? r.faturamento / r.pedidos : 0)}`} />
        <Indicador rotulo="CMV" valor={carregando ? '…' : pct(dre.cmvPct || NaN)} sub={`meta ${meta}% · medido em ${pct(dre.cobertura)} das vendas`} tom={dre.cmvPct && dre.cmvPct <= meta / 100 ? 'ok' : dre.cmvPct ? 'ruim' : undefined} />
        <Indicador rotulo="Resultado estimado" valor={carregando ? '…' : brl(dre.resultado)} tom={dre.resultado >= 0 ? 'ok' : 'ruim'} sub="faturamento − custos" />
        <Indicador rotulo="Ponto de equilíbrio" valor={carregando ? '…' : brl(dre.pontoEquilibrio)} sub={Number.isFinite(dre.pontoEquilibrio) ? `faturamento mínimo no mês · ${dre.faturamento >= dre.pontoEquilibrio ? 'atingido ✓' : `faltam ${brl(dre.pontoEquilibrio - dre.faturamento)}`}` : 'precisa de vendas com ficha'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card titulo="Demonstrativo do mês (DRE)">
          <div className="text-sm">
            <Linha rotulo="Faturamento" valor={dre.faturamento} sub={`itens ${brl(r.receitaItens)} + entregas/ajustes ${brl(r.faturamento - r.receitaItens)}`} />
            <Linha sinal="-" rotulo="CMV (ingredientes e embalagens)" valor={dre.cmvEstimado} sub={dre.cobertura < 1 ? `${pct(dre.cmvPct)} medido em ${pct(dre.cobertura)} das vendas, aplicado ao total` : undefined} />
            <Linha sinal="-" rotulo="Taxas de pagamento" valor={dre.taxas} sub={`${dados.config.taxaPagamento}%`} />
            <Linha sinal="-" rotulo="Custo variável de entrega" valor={dre.entregas} sub={`${r.entregas} × ${brl(dados.config.custoPorEntrega)}`} />
            <Linha sinal="=" forte rotulo="Margem de contribuição" valor={dre.margemContribuicao} sub={pct(dre.faturamento ? dre.margemContribuicao / dre.faturamento : NaN)} />
            <Linha sinal="-" rotulo="Custos fixos" valor={dre.fixos} />
            <Linha sinal="-" rotulo="Outras despesas lançadas" valor={dre.outrasDespesas} />
            <Linha sinal="=" forte rotulo="Resultado" valor={dre.resultado} sub={pct(dre.faturamento ? dre.resultado / dre.faturamento : NaN)} />
          </div>
          {dre.cobertura < 0.6 && !carregando && r.receitaItens > 0 && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="shrink-0" />
              Só {pct(dre.cobertura)} das vendas têm ficha, então o CMV ainda é uma estimativa. Crie as fichas dos mais vendidos na aba Vendas.
            </p>
          )}
          {dre.comprasInsumos > 0 && (
            <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              Compras de insumos e embalagens lançadas no mês: <b>{brl(dre.comprasInsumos)}</b> · consumo teórico pelas fichas: <b>{brl(dre.cmvEstimado)}</b>.
              {dre.comprasInsumos > dre.cmvEstimado * 1.1 && ' Compra bem acima do consumo: pode ser estoque, desperdício ou porção maior que a ficha.'}
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card titulo="Pendências">
            <ul className="space-y-1.5 text-sm">
              {pendencias.map((p) => (
                <li key={p.txt}>
                  <button type="button" className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-stone-50" onClick={() => irPara(p.aba)}>
                    <span>{p.txt}</span>
                    <Selo tom={p.n ? 'alerta' : 'ok'}>{p.n || 'ok'}</Selo>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card titulo="Fichas com CMV mais alto">
            {piores.length === 0 ? (
              <p className="text-sm text-stone-400">Nenhuma ficha com preço e custo ainda.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {piores.map(({ f, cmv }) => (
                  <li key={f.id}>
                    <button type="button" className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-stone-50" onClick={() => irPara('fichas', f.id)}>
                      <span className="truncate">{f.nome}</span>
                      <Selo tom={tomCmv(cmv, meta)}>{pct(cmv)}</Selo>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card titulo="Faturamento por dia">
        {dias.length === 0 ? (
          <p className="text-sm text-stone-400">{carregando ? 'Carregando…' : 'Sem vendas no mês.'}</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {dias.map(([dia, v]) => (
              <div key={dia} className="group flex h-full flex-1 flex-col items-center" title={`${dia.split('-').reverse().join('/')}: ${brl(v)}`}>
                <div className="flex w-full flex-1 items-end"><div className="w-full rounded-t bg-[#6a2092] transition group-hover:bg-[#4d0471]" style={{ height: `${(v / maxDia) * 100}%` }} /></div>
                <span className="mt-1 text-[10px] text-stone-400">{Number(dia.slice(8))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
