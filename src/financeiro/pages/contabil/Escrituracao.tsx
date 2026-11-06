import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CATEGORIAS_FIXO, CATEGORIAS_LANC } from '../../constantes';
import { CATEGORIAS_DESPESA_CAIXA, CONTA, CONTAS_FIXO, CONTAS_GASTO, contaDe, GRUPO_ROTULO, MAPA_PADRAO, NATUREZA_ROTULO, PLANO } from '../../contabil/plano';
import { useDados } from '../../store';
import { Btn, Card, Sel, Selo } from '../../ui';
import { Paginacao, SeletorSecao, useListaQueCabe } from '../../../components/admin/ui';

// Como cada fato da açaiteria é escriturado: onde entra no gestor, as contas e o documento que comprova
const FLUXO: Array<{ fato: string; onde: string; lancamento: string; documento: string; quando: string }> = [
  { fato: 'Venda (balcão, delivery, retirada)', onde: 'PDV e Pedidos (automático)', lancamento: 'D Caixa / Bancos / Cartões a receber · C 3.1.01 Vendas', documento: 'Pedido do gestor, NFC-e', quando: 'A cada venda' },
  { fato: 'Imposto sobre as vendas', onde: 'Calculado em Contábil → Impostos', lancamento: 'D 4.1.01 Simples sobre vendas · C 2.1.03 Impostos a recolher', documento: 'Extrato do PGDAS-D', quando: 'Mensal (competência)' },
  { fato: 'Pagamento do DAS', onde: 'Lançamentos → "Pagamento do DAS"', lancamento: 'D 2.1.03 Impostos a recolher · C 1.1.02 Bancos', documento: 'Guia DAS + comprovante', quando: 'Até dia 20' },
  { fato: 'Compra de insumos e embalagens', onde: 'Lançamentos ou aba Despesas', lancamento: 'D 1.1.04 Estoque · C Caixa / Bancos / 2.1.01 Fornecedores', documento: 'Nota fiscal de compra', quando: 'A cada compra' },
  { fato: 'Consumo de insumos (CMV)', onde: 'Fichas técnicas × vendas (automático)', lancamento: 'D 5.1.01 CMV · C 1.1.04 Estoque', documento: 'Fichas técnicas e inventário', quando: 'Semanal no DRE, acerto no inventário mensal' },
  { fato: 'Custos fixos (aluguel, folha, energia, contador)', onde: 'Custos fixos (competência)', lancamento: 'D 6.x Despesa · C 2.1.05 Contas a pagar / 2.1.02 Salários a pagar', documento: 'Contrato, holerite, conta de consumo', quando: 'Mensal' },
  { fato: 'Pagamento de custo fixo', onde: 'Lançamentos "Pagamento de custo fixo" ou aba Despesas', lancamento: 'D Contas a pagar · C Caixa / Bancos (só controle)', documento: 'Comprovante de pagamento', quando: 'No vencimento' },
  { fato: 'Despesa variável (manutenção, marketing, tarifas)', onde: 'Lançamentos ou aba Despesas', lancamento: 'D 6.x Despesa · C Caixa / Bancos', documento: 'Recibo ou nota fiscal', quando: 'Quando ocorrer' },
  { fato: 'Taxas de cartão e aplicativos', onde: 'Parâmetro % em Ajustes', lancamento: 'D 6.1.01 Taxas · C 1.1.03 Cartões a receber', documento: 'Extrato da maquininha / app', quando: 'Conciliação mensal' },
  { fato: 'Compra de equipamento', onde: 'Lançamentos "Equipamentos / investimento" + Imobilizado', lancamento: 'D 1.2.01 Imobilizado · C Bancos / Empréstimos', documento: 'Nota fiscal do bem', quando: 'Quando ocorrer' },
  { fato: 'Depreciação', onde: 'Calculada pelo Imobilizado', lancamento: 'D 6.6.01 Depreciação · C 1.2.02 Depreciação acumulada', documento: 'Planilha de bens', quando: 'Mensal' },
  { fato: 'Retirada do sócio / distribuição de lucro', onde: 'Lançamentos "Retirada do sócio"', lancamento: 'D 2.3.03 Retiradas · C Caixa / Bancos', documento: 'Recibo de distribuição', quando: 'Quando ocorrer' },
  { fato: 'Sangria e suprimento do caixa', onde: 'Aba Caixa', lancamento: 'D Bancos · C Caixa (ou o inverso)', documento: 'Relatório de fechamento do caixa', quando: 'Diário' },
  { fato: 'Fechamento do exercício', onde: 'Contábil → Balanço anual', lancamento: 'Resultado do ano → 2.3.02 Lucros acumulados', documento: 'Inventário 31/12, extratos, balanço', quando: 'Anual (31/12)' },
];

function Classificacao({ conta }: { conta: string }) {
  const c = CONTA.get(conta);
  if (!c) return <Selo>?</Selo>;
  if (c.grupo) return <Selo tom="info">DRE · {GRUPO_ROTULO[c.grupo]}</Selo>;
  if (c.natureza === 'controle') return <Selo>só controle</Selo>;
  return <Selo tom="neutro">balanço · {NATUREZA_ROTULO[c.natureza]}</Selo>;
}

type SecaoEscrit = 'mapa' | 'lanc' | 'desp' | 'fixo' | 'plano';

// Lista "categoria → conta" de um tipo, com paginação que cabe na tela
function SecaoMapa({
  titulo, tipo, cats, opcoes, ajuda, c, setMapa, duplicado,
}: {
  titulo: string;
  tipo: 'lanc' | 'desp' | 'fixo';
  cats: string[];
  opcoes: Array<{ value: string; label: string }>;
  ajuda: string;
  c: ReturnType<typeof useDados>['dados']['contabil'];
  setMapa: (chave: string, conta: string) => void;
  duplicado: (conta: string) => boolean;
}) {
  const pag = useListaQueCabe(cats, 45, { reserva: 120, resetar: [tipo] });
  return (
    <Card titulo={titulo}>
      <p className="mb-2 text-xs text-stone-500">{ajuda}</p>
      <ul ref={pag.ref} className="divide-y divide-stone-100">
        {pag.itens.map((cat) => {
          const conta = contaDe(c, tipo, cat);
          return (
            <li key={cat} className="grid gap-1.5 py-2 text-sm md:grid-cols-[1fr_minmax(0,340px)_auto] md:items-center md:gap-3">
              <span className="font-medium text-stone-800">{cat}</span>
              <Sel value={conta} onChange={(v) => setMapa(`${tipo}:${cat}`, v)} opcoes={opcoes.some((o) => o.value === conta) ? opcoes : [...opcoes, { value: conta, label: conta }]} />
              <span className="flex flex-wrap gap-1">
                <Classificacao conta={conta} />
                {tipo !== 'fixo' && CONTA.get(conta)?.grupo && duplicado(conta) && <Selo tom="alerta" title="Já existe custo fixo ativo nessa conta. Se este gasto é o pagamento dele, use 9.0.01 (só controle).">pode duplicar custo fixo</Selo>}
              </span>
            </li>
          );
        })}
      </ul>
      <Paginacao {...pag.paginacao} rotulo="categorias" className="mt-1" />
    </Card>
  );
}

export default function Escrituracao() {
  const { dados, atualizar } = useDados();
  const c = dados.contabil;
  const [catsCaixa, setCatsCaixa] = useState<string[]>(CATEGORIAS_DESPESA_CAIXA);
  const [secao, setSecao] = useState<SecaoEscrit>('mapa');

  // Categorias realmente usadas na aba Despesas (inclui as criadas na hora pelo caixa)
  useEffect(() => {
    supabase.from('expenses').select('category').limit(5000).then(({ data }) => {
      if (!data) return;
      setCatsCaixa([...new Set([...CATEGORIAS_DESPESA_CAIXA, ...data.map((x) => String(x.category ?? '').trim()).filter(Boolean)])]);
    });
  }, []);

  const setMapa = (chave: string, conta: string) => atualizar((d) => ({ ...d, contabil: { ...d.contabil, mapa: { ...d.contabil.mapa, [chave]: conta } } }));
  const opcGasto = CONTAS_GASTO.map((x) => ({ value: x.codigo, label: `${x.codigo} ${x.nome}` }));
  const opcFixo = CONTAS_FIXO.map((x) => ({ value: x.codigo, label: `${x.codigo} ${x.nome}` }));
  const categoriasFixo = [...new Set([...CATEGORIAS_FIXO, ...dados.custosFixos.map((x) => x.categoria)])];
  const catsLanc = [...new Set([...CATEGORIAS_LANC.map((x) => x.nome), ...dados.lancamentos.map((l) => l.categoria)])];
  const alterados = Object.keys(c.mapa).filter((k) => c.mapa[k] !== MAPA_PADRAO[k]).length;

  // Mesma natureza de gasto no custo fixo e numa categoria que entra no DRE: risco de contar duas vezes
  const contasFixo = new Set(dados.custosFixos.filter((x) => x.ativo && x.valor > 0).map((x) => contaDe(c, 'fixo', x.categoria)));
  const duplicado = (conta: string) => contasFixo.has(conta);

  // Tabelas longas: só as linhas que cabem na tela
  const pagFluxo = useListaQueCabe(FLUXO, 58, { reserva: 120, deps: [secao] });
  const pagPlano = useListaQueCabe(PLANO, 33, { reserva: 110, deps: [secao] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-stone-900">Escrituração mapeada</h1>
          <p className="text-xs text-stone-500 adm-compactavel-esconder">De onde vem cada número do DRE e do balanço, em qual conta ele cai e qual documento guardar para o contador.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {alterados > 0 && secao !== 'mapa' && secao !== 'plano' && (
            <Btn variante="neutro" onClick={() => confirm('Voltar todas as categorias para a conta padrão?') && atualizar((d) => ({ ...d, contabil: { ...d.contabil, mapa: {} } }))}>
              <RotateCcw size={14} /> Voltar ao padrão ({alterados} alteradas)
            </Btn>
          )}
          <SeletorSecao<SecaoEscrit>
            valor={secao}
            onChange={setSecao}
            opcoes={[
              { id: 'mapa', rotulo: 'Mapa dos fatos' },
              { id: 'lanc', rotulo: 'Lançamentos', contador: catsLanc.length },
              { id: 'desp', rotulo: 'Despesas do caixa', contador: catsCaixa.length },
              { id: 'fixo', rotulo: 'Custos fixos', contador: categoriasFixo.length },
              { id: 'plano', rotulo: 'Plano de contas' },
            ]}
          />
        </div>
      </div>

      {secao === 'mapa' && (
        <Card titulo="Mapa dos fatos contábeis">
          <div ref={pagFluxo.ref} className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-2 text-left">Fato</th><th className="px-2 text-left">Onde registrar no gestor</th><th className="px-2 text-left">Lançamento contábil</th><th className="px-2 text-left">Documento</th><th className="pl-2 text-left">Quando</th>
                </tr>
              </thead>
              <tbody>
                {pagFluxo.itens.map((f) => (
                  <tr key={f.fato} className="border-b border-stone-100 align-top">
                    <td className="py-2 pr-2 font-medium text-stone-900">{f.fato}</td>
                    <td className="px-2 py-2 text-stone-700">{f.onde}</td>
                    <td className="px-2 py-2 font-mono text-[12px] text-stone-600">{f.lancamento}</td>
                    <td className="px-2 py-2 text-stone-600">{f.documento}</td>
                    <td className="py-2 pl-2 text-stone-600">{f.quando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao {...pagFluxo.paginacao} rotulo="fatos" className="mt-1" />
          <p className="mt-1 text-xs text-stone-500 adm-compactavel-esconder">D = débito, C = crédito. Guarde os documentos por 5 anos (prazo da Receita para fiscalizar).</p>
        </Card>
      )}

      {secao === 'lanc' && (
        <SecaoMapa key="lanc" titulo="Lançamentos do Financeiro" tipo="lanc" cats={catsLanc} opcoes={opcGasto} c={c} setMapa={setMapa} duplicado={duplicado}
          ajuda="Compras de insumo vão para o estoque (o consumo já sai pelo CMV das fichas). Pagamento de custo fixo é só controle." />
      )}
      {secao === 'desp' && (
        <SecaoMapa key="desp" titulo="Despesas do caixa (aba Despesas)" tipo="desp" cats={catsCaixa} opcoes={opcGasto} c={c} setMapa={setMapa} duplicado={duplicado}
          ajuda='O que a equipe lança no caixa. Salários, aluguel e contas de consumo já estão no cadastro de custos fixos, por isso ficam como "só controle".' />
      )}
      {secao === 'fixo' && (
        <SecaoMapa key="fixo" titulo="Custos fixos" tipo="fixo" cats={categoriasFixo} opcoes={opcFixo} c={c} setMapa={setMapa} duplicado={duplicado}
          ajuda="Entram no DRE todo mês (proporcional aos dias na semana)." />
      )}

      {secao === 'plano' && (
        <Card titulo="Plano de contas">
          <div ref={pagPlano.ref} className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-2 text-left">Código</th><th className="px-2 text-left">Conta</th><th className="px-2 text-left">Natureza</th><th className="pl-2 text-left">No DRE</th>
                </tr>
              </thead>
              <tbody>
                {pagPlano.itens.map((x) => (
                  <tr key={x.codigo} className="border-b border-stone-100">
                    <td className="py-1.5 pr-2 font-mono text-[12px] text-stone-500">{x.codigo}</td>
                    <td className="px-2">{x.nome}{x.calculada && <span className="ml-2 text-[11px] text-stone-400">(calculada pelo sistema)</span>}</td>
                    <td className="px-2 text-stone-600">{NATUREZA_ROTULO[x.natureza]}</td>
                    <td className="pl-2 text-stone-600">{x.grupo ? GRUPO_ROTULO[x.grupo] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao {...pagPlano.paginacao} rotulo="contas" className="mt-1" />
        </Card>
      )}
    </div>
  );
}
