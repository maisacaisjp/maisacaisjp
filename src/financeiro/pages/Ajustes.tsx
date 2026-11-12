import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef } from 'react';
import { dadosIniciais, migrar } from '../constantes';
import { hoje } from '../format';
import { useDados } from '../store';
import type { Config } from '../types';
import { Btn, Card, Num } from '../ui';

const CAMPOS: Array<{ chave: keyof Config; rotulo: string; dica: string }> = [
  { chave: 'fatorP', rotulo: 'Fator base dos complementos no 330ml', dica: '1,00 = porção base informada (ex.: 100 g de mousse no 330ml).' },
  { chave: 'fatorM', rotulo: 'Fator dos complementos no 440ml (+20%)', dica: '1,20 = 20% a mais que o 330ml (100 g viram 120 g), como nas fichas do Multipedidos.' },
  { chave: 'fatorG', rotulo: 'Fator dos complementos no 550ml (+40%)', dica: '1,40 = 40% a mais que o 330ml (100 g viram 140 g), como nas fichas do Multipedidos.' },
  { chave: 'fator770', rotulo: 'Fator dos adicionais no Copo 770ml (+60%)', dica: '1,60 = 60% a mais que o 330ml (100 g viram 160 g), como nas fichas do Multipedidos.' },
  { chave: 'fator1L', rotulo: 'Fator dos adicionais no Pote 1L Recheado (2x)', dica: '2,00 = o dobro do 330ml (100 g viram 200 g). Chocolates por unidade não mudam com o tamanho.' },
  { chave: 'cmvMeta', rotulo: 'Meta de CMV (%)', dica: 'Açaiteria costuma trabalhar entre 28% e 35%.' },
  { chave: 'taxaPagamento', rotulo: 'Taxa média de pagamento (%)', dica: 'Média cobrada por maquininha/cartão sobre o faturamento (PIX e dinheiro não têm taxa).' },
  { chave: 'custoPorEntrega', rotulo: 'Custo padrão por entrega sem valor lançado (R$)', dica: 'O custo real vem do valor da entrega lançado em cada pedido (tela Pedidos). Este valor só entra nas entregas que ficaram sem valor. Deixe 0 para não estimar.' },
  { chave: 'diasTrabalhados', rotulo: 'Dias trabalhados por mês', dica: 'Usado no custo fixo por dia.' },
];

export default function Ajustes() {
  const { dados, atualizar, substituir } = useDados();
  const arquivo = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeiro-mais-acai-${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = async (f: File) => {
    try {
      const d = migrar(JSON.parse(await f.text()));
      if (confirm(`Substituir os dados atuais pelo backup? (${d.fichas.length} fichas, ${d.insumos.length} insumos, ${d.lancamentos.length} lançamentos, ${d.historico.length} meses de histórico)`)) substituir(d);
    } catch {
      alert('Arquivo inválido.');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card titulo="Parâmetros">
        <div className="space-y-3">
          {CAMPOS.map((c) => (
            <label key={c.chave} className="grid grid-cols-[1fr_110px] items-center gap-3 text-sm">
              <span>
                {c.rotulo}
                <span className="block text-xs text-stone-500">{c.dica}</span>
              </span>
              <Num value={dados.config[c.chave]} onChange={(v) => atualizar((d) => ({ ...d, config: { ...d.config, [c.chave]: v } }))} />
            </label>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card titulo="Backup">
          <p className="mb-3 text-xs text-stone-500">
            Os dados ficam salvos no banco do Mais Açaí e só o dono logado vê. Baixe um backup de vez em quando para guardar uma cópia sua.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={exportar}><Download size={14} /> Baixar backup</Btn>
            <Btn variante="neutro" onClick={() => arquivo.current?.click()}><Upload size={14} /> Restaurar backup</Btn>
            <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
            <Btn variante="perigo" onClick={() => confirm('Apagar TODOS os dados do Financeiro (fichas, insumos, custos, lançamentos e histórico)? Baixe um backup antes.') && substituir(dadosIniciais())}>
              <RotateCcw size={14} /> Recomeçar do zero
            </Btn>
          </div>
        </Card>
        <Card titulo="Como o custo é calculado">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-stone-600">
            <li><b>Insumo</b>: preço da embalagem ÷ quantidade ÷ (1 − perda).</li>
            <li><b>Preparo</b> (mousse, danoninho, calda caseira): soma dos insumos ÷ rendimento → custo por grama.</li>
            <li><b>Base do copo</b> (copo + tampa + colher + açaí): uma para 330, 440 e 550ml.</li>
            <li><b>Ficha do combo</b>: base do tamanho + complementos. Os complementos são cadastrados no 550; 440 e 330 = 550 × fator, ou valor fixado à mão.</li>
            <li><b>Adicionais</b> têm ficha própria e o custo é somado quando o cliente escolhe.</li>
            <li><b>Vendas</b>: cada item vendido no gestor é ligado à ficha pelo produto e tamanho.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
