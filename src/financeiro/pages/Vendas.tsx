import { Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ROTULO_TAMANHO } from '../calc';
import { brl, mesAtual, nomeMes, num, pct } from '../format';
import { useDados, usePedidos } from '../store';
import { analisarVendas, type VendaProduto } from '../vendas';
import { Btn, Card, Indicador, SeletorMes, Selo, Vazio, tomCmv } from '../ui';
import { novaFichaDe, novaFichaDeAdicional } from './Fichas';

export default function Vendas() {
  const { dados, cardapio, adicionais, atualizar, irPara } = useDados();
  const [mes, setMes] = useState(mesAtual());
  const { pedidos, carregando, erro, recarregar } = usePedidos(mes);
  const r = useMemo(() => analisarVendas(pedidos, cardapio, adicionais, dados), [pedidos, cardapio, adicionais, dados]);
  const comFicha = r.produtos.filter((p) => p.custo !== null);
  const semFicha = useMemo(() => {
    const m = new Map<string, VendaProduto>();
    r.produtos.filter((p) => p.custo === null).forEach((p) => {
      const k = p.produtoId ?? p.nome;
      const v = m.get(k) ?? { ...p, qtd: 0, receita: 0 };
      v.qtd += p.qtd;
      v.receita += p.receita;
      m.set(k, v);
    });
    return [...m.values()].sort((a, b) => b.receita - a.receita);
  }, [r.produtos]);

  const criarFicha = (p: VendaProduto) => {
    const adic = p.adicional ? adicionais.find((a) => `extra:${a.id}` === p.produtoId) : undefined;
    const prod = !p.adicional ? cardapio.find((c) => c.id === p.produtoId) ?? null : null;
    const f = adic ? novaFichaDeAdicional(adic) : novaFichaDe(prod, dados.bases);
    if (!adic && !prod) {
      f.nome = p.nome;
      if (p.adicional) f.tipo = 'adicional';
    }
    atualizar((d) => ({ ...d, fichas: [...d.fichas, f] }));
    irPara('fichas', f.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900 first-letter:uppercase">Vendas de {nomeMes(mes)}</h1>
          <p className="text-xs text-stone-500">Lidas dos pedidos do gestor. Pedidos cancelados ficam de fora. Adicionais contam separados do produto.</p>
        </div>
        <div className="flex gap-2">
          <SeletorMes value={mes} onChange={setMes} />
          <Btn variante="neutro" onClick={recarregar} disabled={carregando}><RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /> Atualizar</Btn>
        </div>
      </div>

      {erro && <Vazio>Não consegui ler os pedidos: {erro}</Vazio>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Faturamento" valor={carregando ? '…' : brl(r.faturamento)} sub={`${r.pedidos} pedidos · ${r.entregas} entregas`} />
        <Indicador rotulo="Ticket médio" valor={carregando ? '…' : brl(r.pedidos ? r.faturamento / r.pedidos : 0)} />
        <Indicador rotulo="Vendas com ficha" valor={carregando ? '…' : pct(r.receitaItens ? r.receitaComFicha / r.receitaItens : 0)} sub={`${brl(r.receitaComFicha)} de ${brl(r.receitaItens)} em itens`} />
        <Indicador rotulo="CMV medido" valor={carregando ? '…' : pct(r.receitaComFicha ? r.custoComFicha / r.receitaComFicha : NaN)} sub="só nos itens que têm ficha" />
      </div>

      <Card titulo="Mais vendidos sem ficha técnica" acoes={<span className="text-xs text-stone-500">Comece por estes: são os que mais pesam no faturamento</span>}>
        {semFicha.length === 0 ? (
          <Vazio>{carregando ? 'Carregando…' : r.pedidos ? 'Todos os itens vendidos têm ficha.' : 'Sem vendas no mês.'}</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="fin-tabela">
              <thead><tr><th>Item</th><th>Categoria</th><th className="fin-num">Qtd</th><th className="fin-num">Receita</th><th className="fin-num">% das vendas</th><th /></tr></thead>
              <tbody>
                {semFicha.slice(0, 25).map((p) => (
                  <tr key={p.chave}>
                    <td className="fin-cheio font-medium">{p.nome} {p.adicional && <Selo tom="info">adicional</Selo>}</td>
                    <td className="text-stone-500 max-md:hidden">{p.categoria}</td>
                    <td className="fin-num" data-label="Qtd">{num(p.qtd, 1)}</td>
                    <td className="fin-num" data-label="Receita">{brl(p.receita)}</td>
                    <td className="fin-num" data-label="% das vendas">{pct(r.receitaItens ? p.receita / r.receitaItens : 0)}</td>
                    <td className="w-32 text-right fin-acao">
                      <Btn variante="neutro" className="whitespace-nowrap" onClick={() => criarFicha(p)}><Plus size={13} /> Criar ficha</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card titulo="Lucro por item (com ficha)">
        {comFicha.length === 0 ? (
          <Vazio>Nenhum item vendido neste mês tem ficha ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="fin-tabela">
              <thead><tr><th>Item</th><th>Tam.</th><th className="fin-num">Qtd</th><th className="fin-num">Receita</th><th className="fin-num">Custo</th><th className="fin-num">CMV</th><th className="fin-num">Lucro bruto</th></tr></thead>
              <tbody>
                {comFicha.map((p) => {
                  const cmv = p.receita ? (p.custo ?? 0) / p.receita : NaN;
                  return (
                    <tr key={p.chave} className="cursor-pointer hover:bg-stone-50" onClick={() => p.fichaId && irPara('fichas', p.fichaId)}>
                      <td className="fin-cheio font-medium">{p.nome} {p.adicional && <Selo tom="info">adicional</Selo>}</td>
                      <td data-label="Tamanho">{p.tamanho === 'U' ? '—' : ROTULO_TAMANHO[p.tamanho]}</td>
                      <td className="fin-num" data-label="Qtd">{num(p.qtd, 1)}</td>
                      <td className="fin-num" data-label="Receita">{brl(p.receita)}</td>
                      <td className="fin-num" data-label="Custo">{brl(p.custo ?? 0)}</td>
                      <td className="fin-num" data-label="CMV"><Selo tom={tomCmv(cmv, dados.config.cmvMeta)}>{pct(cmv)}</Selo></td>
                      <td className="fin-num font-medium" data-label="Lucro bruto">{brl(p.receita - (p.custo ?? 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-stone-400">Receita sem taxa de entrega. A receita dos adicionais aparece separada da do produto.</p>
      </Card>
    </div>
  );
}
