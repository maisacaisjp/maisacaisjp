import { ArrowRight, CheckCircle2, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Paginacao, SeletorSecao, useAlturaQueCabe, useListaQueCabe } from '../../../components/admin/ui';
import { hojeSP, longa, NOMES_DIA } from '../../contabil/datas';
import { aplica, ocorrencias, rotuloPeriodo, textoPrazo, type Ocorrencia } from '../../contabil/obrigacoes';
import { OBRIGACOES_PADRAO } from '../../contabil/plano';
import { MESES_CURTOS, uid } from '../../format';
import { useDados } from '../../store';
import type { Frequencia, Obrigacao } from '../../types';
import { Btn, Card, Num, Sel, Selo, Txt, Vazio } from '../../ui';

const TOM = { atrasada: 'ruim', hoje: 'alerta', proxima: 'info', futura: 'neutro', feita: 'ok' } as const;
const FREQ: Array<{ value: Frequencia; label: string }> = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
];

function quando(o: Obrigacao) {
  if (o.frequencia === 'semanal') return `toda ${NOMES_DIA[o.dia % 7]}`;
  if (o.frequencia === 'mensal') return o.diaUtil ? `${o.dia}º dia útil` : `dia ${o.dia}`;
  return `${String(o.dia).padStart(2, '0')}/${MESES_CURTOS[(o.mes ?? 12) - 1]}`;
}

export default function Obrigacoes() {
  const { dados, atualizar, abrirContabil, irPara } = useDados();
  const c = dados.contabil;
  const hoje = hojeSP();
  const lista = ocorrencias(c, hoje, 35);
  const [secao, setSecao] = useState<'calendario' | 'cadastradas'>('calendario');
  const [verFeitas, setVerFeitas] = useState(false);
  const [editar, setEditar] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const setContabil = (fn: (x: typeof c) => typeof c) => atualizar((d) => ({ ...d, contabil: fn(d.contabil) }));
  const concluir = (o: Ocorrencia) => setContabil((x) => ({ ...x, concluidas: { ...x.concluidas, [o.chave]: hoje } }));
  const desfazer = (o: Ocorrencia) =>
    setContabil((x) => {
      const { [o.chave]: _, ...resto } = x.concluidas;
      return { ...x, concluidas: resto };
    });
  const mudar = (id: string, p: Partial<Obrigacao>) => setContabil((x) => ({ ...x, obrigacoes: x.obrigacoes.map((o) => (o.id === id ? { ...o, ...p } : o)) }));

  const abrir = (o: Obrigacao) => {
    if (!o.destino) return;
    if (o.destino === 'lancamentos') irPara('lancamentos');
    else abrirContabil(o.destino);
  };

  const atrasadasOuHoje = lista.filter((o) => o.status === 'atrasada' || o.status === 'hoje').length;
  const opcoesSecao = [
    { id: 'calendario' as const, rotulo: 'Calendário e prazos', contador: atrasadasOuHoje || undefined, alerta: atrasadasOuHoje > 0 },
    { id: 'cadastradas' as const, rotulo: 'Obrigações cadastradas', contador: c.obrigacoes.filter((o) => o.ativo).length },
  ];

  const pagObrigacoes = useListaQueCabe(c.obrigacoes, editar ? 44 : 32, {
    reserva: editar ? 150 : 105,
    resetar: [editar],
    deps: [secao, editar, c.obrigacoes.length],
  });

  const grupos: Array<{ titulo: string; itens: Ocorrencia[] }> = [
    { titulo: 'Atrasadas', itens: lista.filter((o) => o.status === 'atrasada') },
    { titulo: 'Hoje', itens: lista.filter((o) => o.status === 'hoje') },
    { titulo: 'Chegando', itens: lista.filter((o) => o.status === 'proxima') },
    { titulo: 'Próximas semanas', itens: lista.filter((o) => o.status === 'futura') },
    ...(verFeitas ? [{ titulo: 'Feitas', itens: lista.filter((o) => o.status === 'feita') }] : []),
  ].filter((g) => g.itens.length);

  const alturaCal = useAlturaQueCabe(calRef, 60, [secao, verFeitas, grupos.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-stone-900">Agenda contábil e fichas</h1>
          <p className="text-xs text-stone-500 adm-compactavel-esconder">O que está atrasado, vence hoje ou chega nos próximos dias aparece também como alerta no topo do gestor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorSecao<'calendario' | 'cadastradas'> valor={secao} onChange={setSecao} opcoes={opcoesSecao} />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <input type="checkbox" className="h-4 w-4 accent-[#6a2092]" checked={c.temFuncionarios} onChange={(e) => setContabil((x) => ({ ...x, temFuncionarios: e.target.checked }))} />
            <span className="adm-compactavel-esconder">A loja tem funcionários registrados (folha, FGTS, eSocial, 13º)</span>
            <span className="hidden [@media(max-height:780px)]:inline font-medium">Com funcionários</span>
          </label>
        </div>
      </div>

      {secao === 'calendario' && (
        <Card titulo="Calendário" acoes={<Btn variante="link" onClick={() => setVerFeitas(!verFeitas)}>{verFeitas ? 'Esconder feitas' : 'Mostrar feitas'}</Btn>}>
          {grupos.length === 0 ? (
            <Vazio>Nada pendente nos próximos 35 dias.</Vazio>
          ) : (
            <div
              ref={calRef}
              style={{ maxHeight: alturaCal ? `${alturaCal}px` : undefined }}
              className="space-y-4 overflow-y-auto adm-rolagem pr-1"
            >
              {grupos.map((g) => (
                <div key={g.titulo}>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">{g.titulo}</h3>
                  <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {g.itens.map((o) => (
                      <li key={o.chave} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
                        <div className="min-w-0 flex-1 basis-60">
                          <div className={`text-sm font-medium ${o.status === 'feita' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{o.obrigacao.nome}</div>
                          <div className="text-xs text-stone-500">
                            {longa(o.vencimento)} · {rotuloPeriodo(o)} · {o.obrigacao.responsavel === 'contador' ? 'contador' : 'loja'}
                            {o.obrigacao.descricao && <span className="block text-stone-400 adm-compactavel-esconder">{o.obrigacao.descricao}</span>}
                          </div>
                        </div>
                        <Selo tom={TOM[o.status]}>{o.status === 'feita' ? `feita ${longa(o.feitaEm!)}` : textoPrazo(o)}</Selo>
                        <div className="flex items-center gap-1.5">
                          {o.obrigacao.destino && o.status !== 'feita' && (
                            <Btn variante="neutro" onClick={() => abrir(o.obrigacao)}>Abrir <ArrowRight size={13} /></Btn>
                          )}
                          {o.status === 'feita' ? (
                            <Btn variante="link" onClick={() => desfazer(o)}><Undo2 size={13} /> desfazer</Btn>
                          ) : (
                            <Btn variante="sucesso" onClick={() => concluir(o)}><CheckCircle2 size={13} /> Feita</Btn>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {secao === 'cadastradas' && (
        <Card
          titulo="Obrigações cadastradas"
          acoes={
            <>
              <Btn variante="neutro" onClick={() => setEditar(!editar)}>{editar ? 'Concluir edição' : 'Editar datas'}</Btn>
              {editar && (
                <Btn onClick={() => setContabil((x) => ({ ...x, obrigacoes: [...x.obrigacoes, { id: uid(), nome: 'Nova obrigação', frequencia: 'mensal', dia: 10, antecedencia: 3, responsavel: 'loja', ativo: true, personalizada: true }] }))}>
                  <Plus size={14} /> Nova
                </Btn>
              )}
            </>
          }
        >
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-2 text-left">Ativa</th>
                  <th className="px-2 text-left">Obrigação</th>
                  <th className="px-2 text-left">Frequência</th>
                  <th className="px-2 text-left">Quando</th>
                  <th className="px-2 text-right">Avisar antes</th>
                  <th className="px-2 text-left">Quem faz</th>
                  <th />
                </tr>
              </thead>
              <tbody ref={pagObrigacoes.ref}>
                {pagObrigacoes.itens.map((o) => {
                  const valeAqui = aplica({ ...o, ativo: true }, c);
                  return (
                    <tr key={o.id} className={`border-b border-stone-100 ${o.ativo && valeAqui ? '' : 'opacity-50'}`}>
                      <td className="py-1.5"><input type="checkbox" className="h-4 w-4 accent-[#6a2092]" checked={o.ativo} onChange={(e) => mudar(o.id, { ativo: e.target.checked })} aria-label={`Ativar ${o.nome}`} /></td>
                      <td className="px-2">
                        {editar ? <Txt value={o.nome} onChange={(v) => mudar(o.id, { nome: v })} /> : o.nome}
                        {!valeAqui && <span className="ml-2 text-[11px] text-stone-400">(não se aplica: {o.condicao === 'funcionarios' ? 'sem funcionários' : o.condicao === 'mei' ? 'só MEI' : 'só Simples'})</span>}
                      </td>
                      <td className="w-28 px-2">{editar ? <Sel value={o.frequencia} onChange={(v) => mudar(o.id, { frequencia: v as Frequencia, dia: 1 })} opcoes={FREQ} /> : FREQ.find((f) => f.value === o.frequencia)?.label}</td>
                      <td className="w-44 px-2">
                        {editar ? (
                          <div className="flex gap-1">
                            {o.frequencia === 'semanal' ? (
                              <Sel value={String(o.dia)} onChange={(v) => mudar(o.id, { dia: Number(v) })} opcoes={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: NOMES_DIA[d % 7] }))} />
                            ) : (
                              <>
                                <Num value={o.dia} onChange={(v) => mudar(o.id, { dia: Math.min(31, Math.max(1, Math.round(v))) })} className="w-14" />
                                {o.frequencia === 'anual' && <Sel value={String(o.mes ?? 12)} onChange={(v) => mudar(o.id, { mes: Number(v) })} opcoes={MESES_CURTOS.map((m, i) => ({ value: String(i + 1), label: m }))} />}
                              </>
                            )}
                          </div>
                        ) : quando(o)}
                      </td>
                      <td className="w-24 px-2">{editar ? <Num value={o.antecedencia} onChange={(v) => mudar(o.id, { antecedencia: Math.max(0, Math.round(v)) })} /> : <span className="fin-num block">{o.antecedencia} d</span>}</td>
                      <td className="w-28 px-2">{editar ? <Sel value={o.responsavel} onChange={(v) => mudar(o.id, { responsavel: v as Obrigacao['responsavel'] })} opcoes={[{ value: 'loja', label: 'Loja' }, { value: 'contador', label: 'Contador' }]} /> : o.responsavel === 'loja' ? 'Loja' : 'Contador'}</td>
                      <td className="w-8">
                        {editar && o.personalizada && (
                          <button type="button" className="cursor-pointer text-stone-400 hover:text-rose-600" title="Excluir" onClick={() => confirm(`Excluir "${o.nome}"?`) && setContabil((x) => ({ ...x, obrigacoes: x.obrigacoes.filter((y) => y.id !== o.id) }))}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacao {...pagObrigacoes.paginacao} rotulo="obrigações" />
          {editar && (
            <div className="mt-2 flex justify-end">
              <Btn variante="perigo" onClick={() => confirm('Voltar a agenda para o padrão? As obrigações criadas por você são mantidas.') && setContabil((x) => ({ ...x, obrigacoes: [...OBRIGACOES_PADRAO.map((o) => ({ ...o })), ...x.obrigacoes.filter((o) => o.personalizada)] }))}>
                <RotateCcw size={14} /> Restaurar datas padrão
              </Btn>
            </div>
          )}
          <p className="mt-2 text-xs text-stone-500 adm-compactavel-esconder">Datas que caem no fim de semana são antecipadas (impostos) ou adiadas (rotinas da loja). Feriados não são considerados: confira os prazos com o contador.</p>
        </Card>
      )}
    </div>
  );
}
