// Relatórios da Maya assistente (Junior e Michele), montados no servidor.
// Usa os mesmos cálculos do gestor (src/financeiro), para a Maya nunca mostrar número diferente da tela.
import { supabaseAdmin } from './admin';
import { lotesDoRegistro, resumo as resumoCashback } from '../../src/utils/cashbackLotes';
import { migrar } from '../../src/financeiro/constantes';
import { custoFicha, custoUnitInsumo, tamanhosDa, ROTULO_TAMANHO } from '../../src/financeiro/calc';
import { analisarVendas } from '../../src/financeiro/vendas';
import { calcularDreContabil } from '../../src/financeiro/contabil/dreContabil';
import { calcularDre } from '../../src/financeiro/dre';
import { ocorrencias, textoPrazo } from '../../src/financeiro/contabil/obrigacoes';
import { somarMeses } from '../../src/financeiro/contabil/datas';
import type { Dados, DespesaCaixa, Pedido, ProdutoCardapio, AdicionalCardapio } from '../../src/financeiro/types';

export interface EntradaRelatorio {
  tipo?: string;
  termo?: string;
  data_inicio?: string;
  data_fim?: string;
  telefone?: string;
  order_id?: string | number;
  /** Telefone REAL de quem mandou a mensagem (vem do n8n, não da IA). Autoriza troca de horário. */
  autor?: string;
  valor?: number | string;
  descricao?: string;
  categoria?: string;
  forma_pagamento?: string;
  data?: string;
}

// ─── Datas no fuso de São José dos Pinhais (UTC−3, sem horário de verão) ────────
const FUSO = '-03:00';
const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const diaSP = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const somaDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const inicio = (dia: string) => `${dia}T00:00:00${FUSO}`;
const lerDia = (s: unknown, padrao: string) => {
  const t = String(s ?? '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : padrao;
};
const dm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const dma = (dia: string) => `${dm(dia)}/${dia.slice(0, 4)}`;
const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const periodoTxt = (de: string, ate: string) => (de === ate ? dma(de) : `${dm(de)} a ${dma(ate)}`);

const brl = (v: unknown) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
const pct = (v: unknown) => Number(v || 0).toFixed(1).replace('.', ',') + '%';
const tipoPedido = (t: unknown) => (/deliver|entrega/i.test(String(t || '')) ? 'Entrega' : 'Retirada');
const pagamento = (p: unknown) => {
  const s = String(p || '').toLowerCase();
  if (s.includes('pix')) return 'PIX';
  if (s.includes('dinheiro') || s.includes('cash')) return 'Dinheiro';
  if (s.includes('cart') || s.includes('card') || s.includes('créd') || s.includes('déb')) return 'Cartão';
  return String(p || 'Outro');
};
const FECHADOS = ['finalizado', 'concluído', 'concluido', 'cancelado'];

const sb = () => supabaseAdmin();

async function todosPedidos(de?: string, ateExclusivo?: string, campos = 'id,customer_name,customer_phone,total_amount,order_type,payment_method,delivery_zone,delivery_address,status,items,created_at,notes,change_for') {
  const lista: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let q = sb().from('orders').select(campos).order('created_at', { ascending: false }).range(offset, offset + 999);
    if (de) q = q.gte('created_at', inicio(de));
    if (ateExclusivo) q = q.lt('created_at', inicio(ateExclusivo));
    const { data, error } = await q;
    if (error) throw error;
    lista.push(...(data || []));
    if (!data || data.length < 1000 || (!de && lista.length >= 1000)) break;
  }
  return lista;
}

async function carregarFinanceiro(): Promise<Dados> {
  const { data, error } = await sb().from('financeiro_maisacai').select('dados').eq('id', 'principal').maybeSingle();
  if (error) throw error;
  return migrar(data?.dados ?? null);
}

// ─── Financeiro: fichas, insumos, margens, CMV, custos fixos ─────────────────────
function linhasFicha(f: Dados['fichas'][number], d: Dados) {
  const linhas = ['📋 FICHA TÉCNICA: ' + f.nome.toUpperCase()];
  if (f.obs) linhas.push('ℹ️ ' + f.obs);
  for (const t of tamanhosDa(f)) {
    const venda = f.precos[t] ?? 0;
    const c = custoFicha(f, t, d);
    const cmv = venda ? (c.total / venda) * 100 : 0;
    linhas.push(`• ${f.tipo === 'copo' ? 'Copo ' + ROTULO_TAMANHO[t] : 'Tamanho único'}:`);
    linhas.push('  - Venda: ' + brl(venda));
    linhas.push('  - Custo base (copo/tampa/colher/açaí): ' + brl(c.base));
    linhas.push('  - Custo recheio: ' + brl(c.recheio));
    linhas.push('  - CUSTO TOTAL (CMV): ' + brl(c.total) + ' (' + pct(cmv) + ')');
    linhas.push('  - MARGEM BRUTA: ' + brl(venda - c.total) + ' (' + pct(100 - cmv) + ')');
  }
  if (f.recheio.length) {
    const ingr = f.recheio
      .map((it) => {
        const ins = it.tipo === 'insumo' ? d.insumos.find((x) => x.id === it.refId) : undefined;
        const prep = it.tipo === 'preparo' ? d.preparos.find((x) => x.id === it.refId) : undefined;
        return `${ins?.nome || prep?.nome || 'Item'} (${it.qtd}${ins?.unidade || 'g'})`;
      })
      .join(', ');
    linhas.push('• Composição: ' + ingr);
  }
  return linhas;
}

function margens(d: Dados) {
  const itens: Array<{ nome: string; venda: number; custo: number; margem: number; cmv: number }> = [];
  for (const f of d.fichas) {
    for (const t of tamanhosDa(f)) {
      const venda = f.precos[t] ?? 0;
      if (!venda) continue;
      const custo = custoFicha(f, t, d).total;
      itens.push({ nome: f.tipo === 'copo' ? `${f.nome} (${ROTULO_TAMANHO[t]})` : f.nome, venda, custo, margem: venda - custo, cmv: (custo / venda) * 100 });
    }
  }
  return itens;
}

// ─── Cardápio para o DRE (mesma leitura do gestor) ───────────────────────────────
async function cardapioFinanceiro() {
  const [m, e] = await Promise.all([
    sb().from('menu_items').select('id,name,category,price_single,price_p,price_m,price_g,is_active').order('sort_order'),
    sb().from('extras').select('id,name,price,is_active').order('sort_order'),
  ]);
  const cardapio = ((m.data || []) as ProdutoCardapio[]).filter((p) => !String(p.category ?? '').startsWith('system') && !String(p.id).startsWith('system'));
  return { cardapio, adicionais: (e.data || []) as AdicionalCardapio[] };
}

async function despesasPeriodo(de: string, ateExclusivo: string): Promise<DespesaCaixa[]> {
  const todas: DespesaCaixa[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb()
      .from('expenses')
      .select('id,description,amount,category,payment_method,created_at')
      .gte('created_at', inicio(de))
      .lt('created_at', inicio(ateExclusivo))
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    todas.push(...((data || []) as DespesaCaixa[]));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

async function pedidosValidos(de: string, ateExclusivo: string, campos: string): Promise<Pedido[]> {
  const lista: Pedido[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb()
      .from('orders')
      .select(campos)
      .gte('created_at', de)
      .lt('created_at', ateExclusivo)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    lista.push(...((data || []) as unknown as Pedido[]));
    if (!data || data.length < 1000) break;
  }
  return lista;
}

/** DRE do mês (mesma conta do Painel do Financeiro). */
async function relatorioDre(mesEntrada: string) {
  const mes = /^\d{4}-\d{2}$/.test(mesEntrada) ? mesEntrada : hojeSP().slice(0, 7);
  const de = `${mes}-01`;
  const ate = `${somarMeses(mes, 1)}-01`;
  const mesIni = somarMeses(mes, -12);
  const [dados, { cardapio, adicionais }, pedidos, totais, despesas] = await Promise.all([
    carregarFinanceiro(),
    cardapioFinanceiro(),
    pedidosValidos(inicio(de), inicio(ate), 'id,status,order_type,total_amount,created_at,items,motoboy_fee'),
    pedidosValidos(`${mesIni}-01T00:00:00${FUSO}`, inicio(ate), 'total_amount,created_at,status'),
    despesasPeriodo(de, ate),
  ]);
  const fatSistema: Record<string, number> = {};
  for (const p of totais) {
    const m = diaSP(p.created_at).slice(0, 7);
    fatSistema[m] = (fatSistema[m] ?? 0) + (Number(p.total_amount) || 0);
  }
  const hist = new Map(dados.historico.map((h) => [h.mes, h.faturamento]));
  const fat = (m: string) => hist.get(m) || fatSistema[m] || 0;
  const r = analisarVendas(pedidos, cardapio, adicionais, dados);
  const dc = calcularDreContabil({ de, ate, resumo: r, despesas, dados, fat });
  const g = calcularDre(dc);
  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const linhas = [
    `📈 DRE — ${nomeMes.toUpperCase()}${mes === hojeSP().slice(0, 7) ? ' (mês em andamento)' : ''}`,
    `• Pedidos: ${dc.pedidos} | Faturamento: ${brl(g.faturamento)}`,
    `(−) Impostos (${dados.contabil.imposto.regime === 'mei' ? 'MEI' : 'Simples'}): ${brl(g.impostos)}`,
    `(−) CMV estimado: ${brl(g.cmvEstimado)} (${pct(g.cmvPct * 100)} — ficha cobre ${pct(g.cobertura * 100)} das vendas)`,
    `(−) Taxas de cartão/app: ${brl(g.taxas)}`,
    `(−) Entregas: ${brl(g.entregas)}`,
    `= Margem de contribuição: ${brl(g.margemContribuicao)}`,
    `(−) Custos fixos: ${brl(g.fixos)}`,
    `(−) Outras despesas (lançamentos e caixa): ${brl(g.outrasDespesas)}`,
    g.depreciacao ? `(−) Depreciação: ${brl(g.depreciacao)}` : '',
    `= RESULTADO: ${brl(g.resultado)} ${g.resultado >= 0 ? '🟢' : '🔴'}`,
    `• Ponto de equilíbrio: ${brl(g.pontoEquilibrio)} de faturamento`,
    g.comprasInsumos ? `• Compras de insumos no mês (fora do resultado): ${brl(g.comprasInsumos)}` : '',
    dados.contabil.imposto.regime !== 'mei' ? 'ℹ️ Regime assumido Simples Anexo I — confirmar com o contador.' : '',
  ];
  return linhas.filter(Boolean).join('\n');
}

async function relatorioAgenda() {
  const dados = await carregarFinanceiro();
  const lista = ocorrencias(dados.contabil);
  const atencao = lista.filter((o) => o.status === 'atrasada' || o.status === 'hoje' || o.status === 'proxima');
  const futuras = lista.filter((o) => o.status === 'futura').slice(0, 5);
  const icone: Record<string, string> = { atrasada: '🔴', hoje: '🟠', proxima: '🟡', futura: '⚪', feita: '✅' };
  const linha = (o: (typeof lista)[number]) =>
    `${icone[o.status]} ${o.obrigacao.nome} — vence ${dma(o.vencimento)} (${textoPrazo(o)})${o.obrigacao.responsavel === 'contador' ? ' · contador' : ''}`;
  const partes = ['🗓️ AGENDA CONTÁBIL MAIS AÇAÍ'];
  partes.push(atencao.length ? 'Precisa de atenção:\n' + atencao.map(linha).join('\n') : 'Nada atrasado nem vencendo nos próximos dias. ✅');
  if (futuras.length) partes.push('Próximas:\n' + futuras.map(linha).join('\n'));
  return partes.join('\n\n');
}

// ─── Novos: avaliações, cashback, caixa, despesas ────────────────────────────────
async function relatorioAvaliacoes(de: string, ate: string) {
  const { data, error } = await sb()
    .from('order_reviews')
    .select('customer_name,rating,comment,tags,created_at')
    .gte('created_at', inicio(de))
    .lt('created_at', inicio(somaDias(ate, 1)))
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const lista = data || [];
  const { count: totalGeral } = await sb().from('order_reviews').select('id', { count: 'exact', head: true });
  if (!lista.length) return `⭐ Nenhuma avaliação entre ${periodoTxt(de, ate)}. Total geral no sistema: ${totalGeral ?? 0}.`;
  const media = lista.reduce((s, r) => s + Number(r.rating || 0), 0) / lista.length;
  const dist = [5, 4, 3, 2, 1].map((n) => `${n}★ ${lista.filter((r) => Number(r.rating) === n).length}`).join(' | ');
  const baixas = lista.filter((r) => Number(r.rating) <= 3);
  const comComentario = lista.filter((r) => String(r.comment || '').trim()).slice(0, 5);
  const linhas = [
    `⭐ AVALIAÇÕES (${periodoTxt(de, ate)})`,
    `• ${lista.length} avaliações | Média ${media.toFixed(2).replace('.', ',')} ★`,
    `• ${dist}`,
  ];
  if (baixas.length) linhas.push('⚠️ Notas baixas:\n' + baixas.slice(0, 5).map((r) => `- ${r.customer_name || 'Cliente'} (${r.rating}★, ${hora(r.created_at)}): ${r.comment || 'sem comentário'}`).join('\n'));
  if (comComentario.length) linhas.push('💬 Últimos comentários:\n' + comComentario.map((r) => `- ${r.customer_name || 'Cliente'} (${r.rating}★): ${String(r.comment).slice(0, 160)}`).join('\n'));
  return linhas.join('\n');
}

async function relatorioCashback(termo: string) {
  const { data, error } = await sb().from('settings').select('key,value').like('key', 'cashback_balance_%');
  if (error) throw error;
  const hoje = hojeSP();
  const em7 = somaDias(hoje, 7);
  const telBusca = termo.replace(/\D/g, '');
  const saldos = (data || [])
    .map((r) => ({ tel: r.key.replace('cashback_balance_', ''), ...resumoCashback(lotesDoRegistro(r.value)) }))
    .filter((s) => s.saldo > 0);
  const telefones = saldos.map((s) => s.tel);
  const nomes = new Map<string, string>();
  if (telefones.length) {
    const { data: clientes } = await sb().from('customers').select('phone,name').in('phone', telefones);
    (clientes || []).forEach((c) => nomes.set(String(c.phone), c.name || ''));
  }
  const nome = (tel: string) => nomes.get(tel) || `final ${tel.slice(-4)}`;

  if (telBusca.length >= 8) {
    const s = saldos.find((x) => x.tel.endsWith(telBusca.slice(-8)));
    if (!s) return `💜 O cliente com telefone final ${telBusca.slice(-4)} não tem saldo de cashback válido.`;
    return `💜 Cashback de ${nome(s.tel)}: ${brl(s.saldo)}` + (s.proximoVencimento ? ` (${brl(s.valorProximoVencimento)} vence em ${dma(s.proximoVencimento)})` : '');
  }
  const total = saldos.reduce((a, s) => a + s.saldo, 0);
  const vencendo = saldos.filter((s) => s.proximoVencimento && s.proximoVencimento <= em7);
  const top = [...saldos].sort((a, b) => b.saldo - a.saldo).slice(0, 5);
  const linhas = [
    '💜 CASHBACK DOS CLIENTES',
    `• ${saldos.length} clientes com saldo | Total a resgatar: ${brl(total)}`,
    'Maiores saldos:\n' + top.map((s, i) => `${i + 1}. ${nome(s.tel)}: ${brl(s.saldo)}`).join('\n'),
  ];
  if (vencendo.length) linhas.push('⏳ Vencem nos próximos 7 dias (bom avisar o cliente):\n' + vencendo.map((s) => `- ${nome(s.tel)}: ${brl(s.valorProximoVencimento)} em ${dma(s.proximoVencimento!)}`).join('\n'));
  return linhas.join('\n');
}

async function relatorioCaixa(dia: string) {
  const { data: aberto } = await sb().from('cash_sessions').select('*').eq('status', 'aberto').order('opened_at', { ascending: false }).limit(1).maybeSingle();
  let sessao = aberto;
  if (!sessao) {
    const { data } = await sb()
      .from('cash_sessions')
      .select('*')
      .lt('opened_at', inicio(somaDias(dia, 1)))
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    sessao = data;
  }
  if (!sessao) return '💵 Não encontrei nenhum caixa aberto ou fechado.';
  const [{ data: pedidos }, { data: movs }] = await Promise.all([
    sb().from('orders').select('id,total_amount,payment_method,status').eq('cash_session_id', sessao.id),
    sb().from('cash_movements').select('type,amount,reason,created_at').eq('session_id', sessao.id).order('created_at'),
  ]);
  const validos = (pedidos || []).filter((o) => o.status !== 'Cancelado');
  const porPag: Record<string, number> = {};
  validos.forEach((o) => (porPag[pagamento(o.payment_method)] = (porPag[pagamento(o.payment_method)] || 0) + Number(o.total_amount || 0)));
  const vendas = validos.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const sangrias = (movs || []).filter((m) => m.type === 'sangria');
  const suprimentos = (movs || []).filter((m) => m.type === 'suprimento');
  const tSang = sangrias.reduce((s, m) => s + Number(m.amount), 0);
  const tSup = suprimentos.reduce((s, m) => s + Number(m.amount), 0);
  const dinheiro = porPag['Dinheiro'] || 0;
  const esperado = Number(sessao.opening_amount || 0) + dinheiro + tSup - tSang;
  const linhas = [
    `💵 CAIXA ${sessao.status === 'aberto' ? 'ABERTO 🟢' : 'FECHADO 🔒'}`,
    `• Abertura: ${hora(sessao.opened_at)} com ${brl(sessao.opening_amount)}`,
    `• Vendas: ${validos.length} pedidos | ${brl(vendas)}`,
    Object.keys(porPag).length ? '• Por pagamento: ' + Object.entries(porPag).map(([k, v]) => `${k} ${brl(v)}`).join(' | ') : '',
    sangrias.length ? `• Sangrias (${sangrias.length}): −${brl(tSang)}` + sangrias.map((m) => `\n   - ${hora(m.created_at)} ${brl(m.amount)}${m.reason ? ' · ' + m.reason : ''}`).join('') : '• Sangrias: nenhuma',
    suprimentos.length ? `• Suprimentos (${suprimentos.length}): +${brl(tSup)}` : '',
    `• Dinheiro esperado na gaveta: ${brl(sessao.status === 'aberto' ? esperado : sessao.expected_amount ?? esperado)}`,
  ];
  if (sessao.status !== 'aberto') {
    linhas.push(`• Fechamento: ${sessao.closed_at ? hora(sessao.closed_at) : '-'} | Contado: ${brl(sessao.closing_counted_amount)} | Diferença: ${brl(sessao.difference)}`);
  }
  return linhas.filter(Boolean).join('\n');
}

async function relatorioDespesas(de: string, ate: string) {
  const lista = await despesasPeriodo(de, somaDias(ate, 1));
  if (!lista.length) return `🧾 Nenhuma despesa lançada entre ${periodoTxt(de, ate)}.`;
  const total = lista.reduce((s, x) => s + Number(x.amount || 0), 0);
  const porCat: Record<string, number> = {};
  lista.forEach((x) => (porCat[x.category || 'Outros'] = (porCat[x.category || 'Outros'] || 0) + Number(x.amount || 0)));
  const ultimas = [...lista].reverse().slice(0, 8);
  return [
    `🧾 DESPESAS (${periodoTxt(de, ate)})`,
    `• ${lista.length} lançamentos | Total: ${brl(total)}`,
    'Por categoria:\n' + Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${brl(v)}`).join('\n'),
    'Últimas:\n' + ultimas.map((x) => `- ${hora(x.created_at)} ${x.description}: ${brl(x.amount)} (${x.payment_method})`).join('\n'),
  ].join('\n');
}

// ─── Horários e status da loja ───────────────────────────────────────────────────
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaHoje = () => new Date(`${hojeSP()}T12:00:00Z`).getUTCDay();

async function relatorioLoja() {
  const [{ data: st }, { data: bh }] = await Promise.all([
    sb().from('settings').select('key,value').in('key', ['store_status', 'bot_active']),
    sb().from('business_hours').select('*').order('day_of_week'),
  ]);
  const val = (k: string) => (st || []).find((x) => x.key === k)?.value;
  const s = String(val('store_status') || 'auto');
  const txtLoja = s === 'open' ? '🟢 ABERTA (forçado manualmente)' : s === 'closed' ? '🔴 FECHADA (forçado manualmente)' : '🕒 AUTOMÁTICO (seguindo a grade semanal)';
  const bot = val('bot_active');
  const hoje = diaSemanaHoje();
  const lista = bh || [];
  const faixa = (d: any) => (d.is_closed ? 'Fechado' : `${String(d.opens_at).slice(0, 5)} às ${String(d.closes_at).slice(0, 5)}`);
  const hojeCfg = lista.find((d) => d.day_of_week === hoje);
  return [
    '🏪 STATUS E HORÁRIOS DA MAIS AÇAÍ SJP:',
    '',
    '• Status da loja: ' + txtLoja,
    '• Maya atendente de clientes: ' + (bot === true || bot === 'true' ? '🟢 ATIVA' : '🔴 DESLIGADA'),
    hojeCfg ? `• Horário de hoje (${DIAS[hoje]}): ${faixa(hojeCfg)}` : '',
    '',
    '📅 GRADE DA SEMANA:',
    ...lista.map((d) => `• ${DIAS[d.day_of_week]}: ${faixa(d)}${d.day_of_week === hoje ? ' ⭐ (HOJE)' : ''}`),
  ].join('\n');
}

async function alterarHorario(tipo: string, termo: string, telefone: string) {
  const t = (termo + ' ' + tipo).toLowerCase();
  let statusLoja: string | null = null;
  if (/abrir agora|abre agora|status open|abrir_loja/.test(t)) statusLoja = 'open';
  else if (/fechar agora|fecha agora|status closed|fechar_loja/.test(t)) statusLoja = 'closed';
  else if (/auto|normal|automático/.test(t)) statusLoja = 'auto';

  let dia: number | null = null;
  const nomes: Array<[RegExp, number]> = [[/domingo/, 0], [/segunda/, 1], [/terça|terca/, 2], [/quarta/, 3], [/quinta/, 4], [/sexta/, 5], [/sábado|sabado/, 6]];
  for (const [re, n] of nomes) if (re.test(t)) { dia = n; break; }
  if (dia === null && t.includes('hoje')) dia = diaSemanaHoje();

  const horas = termo.match(/\b([01]?\d|2[0-3]):?([0-5]\d)?\b/g) || [];
  const fmt = (h: string) => {
    const x = h.includes(':') ? h : h + ':00';
    return x.length === 4 ? '0' + x : x;
  };
  const abre = horas[0] ? fmt(horas[0]) : null;
  const fecha = horas[1] ? fmt(horas[1]) : null;
  const fechado = /não vai abrir|fechada hoje|não abre/.test(t) ? true : statusLoja === 'open' ? false : null;

  const { data: r, error } = await sb().rpc('alterar_horario_loja', {
    p_telefone: telefone,
    p_dia: dia,
    p_abre: abre,
    p_fecha: fecha,
    p_fechado: fechado,
    p_status_loja: statusLoja,
  });
  if (error) return 'Não consegui alterar: ' + error.message;
  if (r && (r as any).sucesso) {
    const x = r as any;
    return (
      `✅ Alteração registrada com sucesso por ${x.autorizado_por}!\n` +
      `• Dia: ${x.dia_semana}\n` +
      `• Horário: ${x.loja_fechada_no_dia ? 'Fechado o dia todo' : `${x.abre_as} às ${x.fecha_as}`}\n` +
      `• Status geral da loja: ${x.status_geral_loja}`
    );
  }
  return 'Alteração processada: ' + JSON.stringify(r);
}

// ─── Pedidos e clientes ──────────────────────────────────────────────────────────
function textoPedido(o: any) {
  const itens = (o.items || [])
    .map((i: any) => {
      let s = `• ${i.quantity || 1}x ${i.name}`;
      if (i.notes) s += ` (${i.notes})`;
      if (i.extras?.length) s += ` [Adicionais: ${i.extras.map((e: any) => e.name).join(', ')}]`;
      return s;
    })
    .join('\n');
  return [
    `📋 Pedido #${o.id} — ${o.status}`,
    `Cliente: ${o.customer_name || 'Sem nome'} (${o.customer_phone || '-'})`,
    `Data: ${hora(o.created_at)}`,
    `Tipo: ${tipoPedido(o.order_type)}${o.delivery_zone ? ` (${o.delivery_zone})` : ''}`,
    o.delivery_address ? `Endereço: ${o.delivery_address}` : '',
    `Pagamento: ${pagamento(o.payment_method)} | Total: ${brl(o.total_amount)}${o.change_for ? ` (Troco p/ ${o.change_for})` : ''}`,
    o.notes ? `Obs: ${o.notes}` : '',
    '\nItens:\n' + itens,
  ]
    .filter(Boolean)
    .join('\n');
}

function resumoVendas(todos: any[], de: string, ate: string) {
  const noPeriodo = todos.filter((o) => {
    const d = diaSP(o.created_at);
    return d >= de && d <= ate;
  });
  const validos = noPeriodo.filter((o) => o.status !== 'Cancelado');
  const cancelados = noPeriodo.filter((o) => o.status === 'Cancelado');
  const abertos = validos.filter((o) => !FECHADOS.includes(String(o.status).toLowerCase()));
  const fat = validos.reduce((a, o) => a + Number(o.total_amount || 0), 0);
  const conta = (m: Record<string, number>, k: string, n = 1) => (m[k] = (m[k] || 0) + n);
  const tamanhos: Record<string, number> = {}, bases: Record<string, number> = {}, extras: Record<string, number> = {};
  const bairros: Record<string, number> = {}, combos: Record<string, number> = {}, tipos: Record<string, number> = {}, pags: Record<string, number> = {};
  validos.forEach((o) => {
    conta(tipos, tipoPedido(o.order_type));
    conta(pags, pagamento(o.payment_method));
    if (o.delivery_zone) conta(bairros, o.delivery_zone);
    (o.items || []).forEach((i: any) => {
      const nome = String(i.name || '');
      const q = Number(i.quantity || 1);
      const sz = nome.match(/(330\s*ml|440\s*ml|550\s*ml|770\s*ml|1\s*litro|2\s*litros|1l|2l)/i);
      if (sz) conta(tamanhos, sz[1].toUpperCase(), q);
      const base = nome.replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (base) conta(combos, base, q);
      const notas = String(i.notes || '');
      if (notas.includes('Creme:')) notas.replace(/^.*Creme:\s*/i, '').split('+').forEach((b) => b.trim() && conta(bases, b.trim(), q));
      (i.extras || []).forEach((e: any) => String(e.name || '').trim() && conta(extras, String(e.name).trim(), q));
    });
  });
  const top = (m: Record<string, number>, n: number, suf = '') => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v}${suf})`).join(', ');
  const linhas = [
    `📊 MOVIMENTO MAIS AÇAÍ (${periodoTxt(de, ate)})`,
    `• Pedidos: ${validos.length} | Faturamento: ${brl(fat)} | Ticket médio: ${brl(validos.length ? fat / validos.length : 0)}`,
  ];
  if (Object.keys(tipos).length) linhas.push('• Canais: ' + Object.entries(tipos).map(([k, v]) => `${k}: ${v}`).join(' | '));
  if (Object.keys(pags).length) linhas.push('• Pagamentos: ' + Object.entries(pags).map(([k, v]) => `${k}: ${v}`).join(' | '));
  if (Object.keys(tamanhos).length) linhas.push('• Copos/tamanhos vendidos: ' + top(tamanhos, 10, ' un'));
  if (Object.keys(combos).length) linhas.push('• Mais pedidos: ' + top(combos, 5, ' un'));
  if (Object.keys(bases).length) linhas.push('• Bases mais pedidas: ' + top(bases, 4));
  if (Object.keys(extras).length) linhas.push('• Adicionais mais pedidos: ' + top(extras, 4));
  if (Object.keys(bairros).length) linhas.push('• Bairros com mais entregas: ' + top(bairros, 3, ' entregas'));

  // Destaque de quem mais gastou e lista rápida de pedidos do dia
  const validosPorValor = [...validos].sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0));
  if (validosPorValor.length) {
    const top1 = validosPorValor[0];
    linhas.push(`• 🏆 Maior pedido do período: Pedido #${top1.id} - ${top1.customer_name || 'Cliente'} (${brl(top1.total_amount)})`);
  }
  if (validos.length) {
    const listaRecentes = validos.slice(0, 10).map((o) => `#${o.id} ${o.customer_name || 'Cliente'} (${brl(o.total_amount)})`).join(', ');
    linhas.push(`• Pedidos recentes: ${listaRecentes}${validos.length > 10 ? ` ...e mais ${validos.length - 10} pedidos` : ''}`);
  }

  linhas.push(abertos.length ? `• Em preparo/aberto agora (${abertos.length}): ` + abertos.map((o) => `#${o.id} ${o.customer_name || 'Cliente'} (${brl(o.total_amount)})`).join(', ') : '• Em aberto no momento: nenhum');
  if (cancelados.length) linhas.push(`• Cancelados: ${cancelados.length} (${brl(cancelados.reduce((a, o) => a + Number(o.total_amount || 0), 0))})`);
  return linhas.join('\n');
}

// ─── Lançamento de despesas pelos sócios ──────────────────────────────────────────
export function normalizarCategoriaDespesa(cat: string, desc: string): string {
  const texto = (cat + ' ' + desc).toLowerCase();
  if (/embalagem|copo|tampa|sacola|colher|canudo|pote|bobina/i.test(texto)) return 'Embalagens & Descartáveis';
  if (/energia|luz|copel|agua|água|sanepar|gas|gás|internet|net|wifi/i.test(texto)) return 'Água, Luz, Gás & Net';
  if (/salario|salário|diaria|diária|freela|motoboy|entregador|ajudante/i.test(texto)) return 'Salários & Equipe';
  if (/anuncio|anúncio|trafego|tráfego|marketing|panfleto|meta|insta/i.test(texto)) return 'Marketing & Anúncios';
  if (/manuten|conserto|reforma|reparo|freezer|liquidificador|balança|equipamento/i.test(texto)) return 'Manutenção & Equipamentos';
  if (/imposto|das|taxa|mei|simples|tributo/i.test(texto)) return 'Impostos & Taxas';
  if (/aluguel|iptu|condominio|condomínio/i.test(texto)) return 'Aluguel / Renda';
  if (/acai|açaí|fruta|morango|banana|leite|nutella|creme|polpa|sorvete|chocolate|atacadao|atacadão|ceasa|condor|mercado|insumo|fornecedor/i.test(texto)) return 'Fornecedores & Insumos';
  return 'Outros Gastos';
}

export function normalizarFormaPagamentoDespesa(forma: string): string {
  const f = String(forma || '').toLowerCase();
  if (f.includes('dinheiro') || f.includes('cash')) return 'Dinheiro';
  if (f.includes('cart') || f.includes('card') || f.includes('cred') || f.includes('deb')) return 'Cartão';
  if (f.includes('transf') || f.includes('ted') || f.includes('doc')) return 'Transferência';
  return 'PIX';
}

export async function lancarDespesa(dados: {
  descricao?: string;
  valor?: number | string;
  categoria?: string;
  forma_pagamento?: string;
  data?: string;
  autor?: string;
}): Promise<{ sucesso: boolean; mensagem: string; despesa?: any }> {
  const tel = String(dados.autor || '').replace(/\D/g, '');
  const isJunior = ['996560080', '96560080'].some((d) => tel.endsWith(d));
  const isMichele = ['997349076', '97349076'].some((d) => tel.endsWith(d));
  if (!isJunior && !isMichele) {
    return { sucesso: false, mensagem: '❌ Ação não autorizada. Apenas os sócios (Junior e Michele) podem lançar despesas.' };
  }
  const nomeDono = isJunior ? 'Junior' : 'Michele';

  const valorNum = Number(String(dados.valor || 0).replace(',', '.'));
  if (!valorNum || valorNum <= 0 || isNaN(valorNum)) {
    return { sucesso: false, mensagem: '❌ Valor da despesa inválido. Informe um valor numérico maior que zero (ex: R$ 85,00).' };
  }

  const desc = String(dados.descricao || 'Despesa avulsa').trim().slice(0, 300);
  const cat = normalizarCategoriaDespesa(dados.categoria || '', desc);
  const forma = normalizarFormaPagamentoDespesa(dados.forma_pagamento || '');
  const hoje = hojeSP();
  const diaValido = dados.data && /^\d{4}-\d{2}-\d{2}$/.test(dados.data) ? dados.data : hoje;
  const isoCriacao = `${diaValido}T12:00:00${FUSO}`;

  const { data: novaDespesa, error } = await sb()
    .from('expenses')
    .insert({
      description: `${desc} (via Maya - ${nomeDono})`,
      amount: Number(valorNum.toFixed(2)),
      category: cat,
      payment_method: forma,
      created_at: isoCriacao,
    })
    .select('id,description,amount,category,payment_method,created_at')
    .single();

  if (error) {
    console.error('[lancarDespesa] Erro supabase:', error);
    return { sucesso: false, mensagem: '❌ Erro ao salvar despesa no banco: ' + error.message };
  }

  // Se foi pago em dinheiro, registra sangria automática no caixa aberto (se houver)
  if (forma === 'Dinheiro') {
    try {
      const { data: openSession } = await sb()
        .from('cash_sessions')
        .select('id')
        .eq('status', 'aberto')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSession?.id) {
        await sb().from('cash_movements').insert({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          session_id: openSession.id,
          type: 'sangria',
          amount: Number(valorNum.toFixed(2)),
          reason: `Despesa: ${desc} (${cat})`,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.warn('[lancarDespesa] Aviso sangria:', e?.message || e);
    }
  }

  return {
    sucesso: true,
    mensagem:
      `✅ Despesa lançada com sucesso por ${nomeDono}!\n` +
      `• *Valor:* ${brl(valorNum)}\n` +
      `• *Descrição:* ${desc}\n` +
      `• *Categoria:* ${cat}\n` +
      `• *Pagamento:* ${forma}\n` +
      `• *Data:* ${dma(diaValido)}\n\n` +
      `O valor já foi computado no DRE e no painel financeiro da loja.`,
    despesa: novaDespesa,
  };
}

// ─── Entrada ─────────────────────────────────────────────────────────────────────
export async function montarRelatorio(inp: EntradaRelatorio): Promise<string> {
  const tipo = String(inp.tipo || 'resumo').toLowerCase().trim();
  const termo = String(inp.termo ?? inp.order_id ?? inp.telefone ?? '').trim();
  const hoje = hojeSP();
  const de = lerDia(inp.data_inicio, hoje);
  const ate = lerDia(inp.data_fim, de);

  try {
    if (['ficha', 'fichas', 'custo_produto'].includes(tipo)) {
      const d = await carregarFinanceiro();
      const busca = termo.toLowerCase();
      const achadas = d.fichas.filter((f) => f.nome.toLowerCase().includes(busca));
      if (!achadas.length) return `Não encontrei ficha técnica para "${termo}". Dica: informe o nome do combo ou produto (ex: Nevado, Favorito, 2 Litros, Magnífico).`;
      return achadas.slice(0, 3).map((f) => linhasFicha(f, d).join('\n')).join('\n\n');
    }
    if (['embalagem', 'embalagens', 'copo', 'copos', 'descartaveis', 'descartáveis'].includes(tipo)) {
      const d = await carregarFinanceiro();
      const busca = termo.toLowerCase();
      let achados = d.insumos.filter((i) => {
        const cat = (i.categoria || '').toLowerCase();
        const n = (i.nome || '').toLowerCase();
        return (
          cat.includes('embalag') ||
          cat.includes('descart') ||
          /copo|tampa|colher|sacola|guardanapo|pote|canudo|adesivo|lacre|suporte/i.test(n)
        );
      });
      if (busca && !['embalagens', 'embalagem', 'copos', 'copo', 'descartaveis', 'descartáveis'].includes(busca)) {
        achados = achados.filter((i) => i.nome.toLowerCase().includes(busca));
      }
      if (!achados.length) return `Não encontrei embalagens para "${termo}".`;
      const lista = achados.map((i) => {
        const un = i.unidade === 'un';
        const custoUnit = custoUnitInsumo(i);
        return (
          `• ${i.nome}:\n` +
          `  - Custo unitário: ${brl(custoUnit * (un ? 1 : 1000))} ${un ? '/un' : '/kg'}\n` +
          `  - Pacote/Embalagem: ${i.qtdEmbalagem} ${i.unidade} por ${brl(i.precoEmbalagem)}` +
          (i.fornecedor ? ` | Fornecedor: ${i.fornecedor}` : '') +
          (i.obs ? ` | Obs: ${i.obs}` : '')
        );
      });
      return `📦 CUSTOS DE EMBALAGENS E COPOS (${achados.length} itens cadastrados):\n\n` + lista.join('\n\n');
    }
    if (tipo === 'insumo' || tipo === 'insumos') {
      const d = await carregarFinanceiro();
      const busca = termo.toLowerCase();
      const achados = busca ? d.insumos.filter((i) => i.nome.toLowerCase().includes(busca)) : d.insumos;
      if (!achados.length) return `Não encontrei nenhum insumo com o termo "${termo}".`;
      const lista = achados.slice(0, 12).map((i) => {
        const un = i.unidade === 'un';
        return (
          `• ${i.nome} (${i.categoria}):\n` +
          `  - Embalagem: ${i.qtdEmbalagem}${i.unidade} por ${brl(i.precoEmbalagem)}\n` +
          `  - Perda: ${i.perda || 0}% | Custo efetivo: ${brl(custoUnitInsumo(i) * (un ? 1 : 1000))} ${un ? 'R$/unidade' : 'R$/kg'}` +
          (i.fornecedor ? ` | Fornecedor: ${i.fornecedor}` : '')
        );
      });
      return `📦 INSUMOS E CUSTOS DE COMPRA (${achados.length} encontrados):\n\n` + lista.join('\n\n');
    }
    if (tipo === 'ranking_margens' || tipo === 'melhores_margens') {
      const itens = margens(await carregarFinanceiro()).sort((a, b) => b.margem - a.margem).slice(0, 10);
      return '🏆 TOP 10 PRODUTOS MAIS LUCRATIVOS (maior margem bruta em R$):\n\n' + itens.map((x, i) => `${i + 1}. ${x.nome}: Margem ${brl(x.margem)} (${pct(100 - x.cmv)}) | Venda ${brl(x.venda)} | Custo ${brl(x.custo)}`).join('\n');
    }
    if (tipo === 'maior_cmv' || tipo === 'custo_alto') {
      const itens = margens(await carregarFinanceiro()).sort((a, b) => b.cmv - a.cmv).slice(0, 10);
      return '⚠️ PRODUTOS COM MAIOR CMV % (atenção para preço ou porcionamento):\n\n' + itens.map((x, i) => `${i + 1}. ${x.nome}: CMV ${pct(x.cmv)} (custo ${brl(x.custo)} sobre venda ${brl(x.venda)})`).join('\n');
    }
    if (tipo === 'custos_fixos' || tipo === 'fixos') {
      const ativos = (await carregarFinanceiro()).custosFixos.filter((f) => f.ativo !== false);
      if (!ativos.length) return 'Ainda não há custos fixos cadastrados. Dá para cadastrar aluguel, luz, internet e folha na aba Custos fixos do Financeiro.';
      const total = ativos.reduce((s, f) => s + Number(f.valor || 0), 0);
      return '🏢 CUSTOS FIXOS MENSAIS MAIS AÇAÍ:\n' + ativos.map((f) => `• ${f.nome} (${f.categoria}): ${brl(f.valor)}${f.aConfirmar ? ' (a confirmar)' : ''}`).join('\n') + `\n\n💰 Total fixo mensal: ${brl(total)}`;
    }
    if (['dre', 'resultado', 'lucro', 'financeiro', 'contabil', 'contábil'].includes(tipo)) {
      const mes = /^\d{4}-\d{2}/.test(termo) ? termo.slice(0, 7) : inp.data_inicio ? de.slice(0, 7) : hoje.slice(0, 7);
      return await relatorioDre(mes);
    }
    if (['agenda', 'agenda_contabil', 'obrigacoes', 'obrigações', 'impostos_vencendo'].includes(tipo)) return await relatorioAgenda();
    if (['avaliacoes', 'avaliações', 'avaliacao', 'reviews'].includes(tipo)) {
      const ini = inp.data_inicio ? de : somaDias(hoje, -29);
      return await relatorioAvaliacoes(ini, inp.data_inicio ? ate : hoje);
    }
    if (tipo === 'cashback' || tipo === 'saldo_cashback') return await relatorioCashback(termo || String(inp.telefone || ''));
    if (['caixa', 'caixa_do_dia', 'sangria', 'fechamento', 'abertura'].includes(tipo)) return await relatorioCaixa(de);
    if (tipo === 'despesas' || tipo === 'despesa' || tipo === 'gastos') return await relatorioDespesas(inp.data_inicio ? de : `${hoje.slice(0, 7)}-01`, inp.data_inicio ? ate : hoje);
    if (['loja', 'horario', 'horarios', 'consultar_horarios'].includes(tipo)) return await relatorioLoja();
    if (['alterar_horario', 'mudar_horario', 'status_loja', 'abrir_loja', 'fechar_loja'].includes(tipo)) {
      const tel = String(inp.autor || '').replace(/\D/g, '');
      if (!tel) return 'Não consegui identificar o seu telefone para autorizar a alteração.';
      return await alterarHorario(tipo, termo, tel);
    }
    if (['lancar_despesa', 'inserir_despesa', 'registrar_despesa', 'nova_despesa', 'despesa_lancar'].includes(tipo)) {
      const tel = String(inp.autor || inp.telefone || '').replace(/\D/g, '');
      let valor = inp.valor;
      let desc = inp.descricao;
      let cat = inp.categoria;
      let forma = inp.forma_pagamento;
      let data = inp.data || inp.data_inicio;

      // Se termo for JSON ou texto estruturado
      if (termo && termo.trim().startsWith('{')) {
        try {
          const j = JSON.parse(termo);
          valor = valor ?? j.valor ?? j.amount;
          desc = desc ?? j.descricao ?? j.description;
          cat = cat ?? j.categoria ?? j.category;
          forma = forma ?? j.forma_pagamento ?? j.payment_method;
          data = data ?? j.data ?? j.date;
        } catch {}
      } else if (termo && !valor) {
        if (termo.includes('|')) {
          const partes = termo.split('|').map((s) => s.trim());
          valor = partes[0];
          desc = partes[1];
          cat = partes[2];
          forma = partes[3];
        } else {
          const m = termo.match(/(?:r\$\s*|valor\s*:?\s*)?(\d+(?:[.,]\d{1,2})?)/i);
          if (m) valor = m[1];
          desc = termo.replace(/(?:r\$\s*|valor\s*:?\s*)?(\d+(?:[.,]\d{1,2})?)/i, '').trim() || termo;
        }
      }

      const r = await lancarDespesa({
        valor,
        descricao: desc,
        categoria: cat,
        forma_pagamento: forma,
        data,
        autor: tel,
      });
      return r.mensagem;
    }
    if (['pedido', 'pedidos', 'buscar_pedido', 'pedidos_dia', 'pedidos_hoje'].includes(tipo)) {
      const termoTexto = String(inp.termo || inp.order_id || '').trim();
      const idDigitos = termoTexto.replace(/\D/g, '');

      // 1) Busca direta por número do pedido (ex: "32", "#32" ou order_id preenchido)
      if (idDigitos && (/^#?\d+$/.test(termoTexto) || inp.order_id)) {
        const { data } = await sb().from('orders').select('*').eq('id', idDigitos).maybeSingle();
        return data ? textoPedido(data) : `Pedido #${idDigitos} não encontrado no sistema.`;
      }

      // 2) Busca por nome do cliente, telefone ou endereço (ex: "link", "ana paula")
      const ehPalavraChaveGenerica = !termoTexto || ['pedidos', 'pedido', 'hoje', 'todos', 'pedidos de hoje', 'pedidos do dia'].includes(termoTexto.toLowerCase());
      if (!ehPalavraChaveGenerica) {
        const { data, error } = await sb()
          .from('orders')
          .select('*')
          .or(`customer_name.ilike.%${termoTexto}%,delivery_address.ilike.%${termoTexto}%,customer_phone.ilike.%${termoTexto}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        if (!data || !data.length) {
          return `Não encontrei nenhum pedido com o nome ou termo "${termoTexto}".`;
        }
        if (data.length === 1) {
          return textoPedido(data[0]);
        }
        return (
          `Encontrei ${data.length} pedidos correspondentes a "${termoTexto}":\n\n` +
          data
            .map(
              (o) =>
                `• Pedido #${o.id} (${hora(o.created_at)}): ${o.customer_name || 'Cliente'} — ${brl(o.total_amount)} (${o.status}, ${tipoPedido(o.order_type)}, ${pagamento(o.payment_method)})`
            )
            .join('\n') +
          `\n\nPara ver detalhes completos de algum deles, peça pelo número (ex: "detalhes do pedido #${data[0].id}").`
        );
      }

      // 3) Listagem de pedidos do período (padrão: hoje)
      const ords = await todosPedidos(de, somaDias(ate, 1));
      if (!ords.length) return `Nenhum pedido registrado no período (${periodoTxt(de, ate)}).`;

      const validos = ords.filter((o) => o.status !== 'Cancelado');
      const maior = [...validos].sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))[0];

      const listaPedidos = ords.slice(0, 15).map((o) => {
        return `• #${o.id} (${hora(o.created_at)}): ${o.customer_name || 'Cliente'} — ${brl(o.total_amount)} (${o.status}, ${tipoPedido(o.order_type)}, ${pagamento(o.payment_method)})`;
      }).join('\n');

      let out = `📋 PEDIDOS DO PERÍODO (${periodoTxt(de, ate)} — Total: ${ords.length}):\n`;
      if (maior) {
        out += `🏆 Maior pedido: #${maior.id} ${maior.customer_name || 'Cliente'} (${brl(maior.total_amount)})\n\n`;
      }
      out += listaPedidos;
      if (ords.length > 15) {
        out += `\n... e mais ${ords.length - 15} pedidos.`;
      }
      return out;
    }
    if (tipo === 'cliente') {
      const termoTexto = String(inp.termo || inp.telefone || '').trim();
      const tel = termoTexto.replace(/\D/g, '').slice(-9);

      let q = sb().from('orders').select('*').order('created_at', { ascending: false }).limit(20);
      if (tel.length >= 8) {
        q = q.ilike('customer_phone', `%${tel}%`);
      } else if (termoTexto) {
        q = q.ilike('customer_name', `%${termoTexto}%`);
      } else {
        return 'Informe o telefone ou o nome do cliente para consultar o histórico.';
      }

      const { data, error } = await q;
      if (error) throw error;
      const ords = data || [];
      if (!ords.length) return `Nenhum pedido encontrado para o cliente "${termoTexto}".`;
      const total = ords.filter((o) => o.status !== 'Cancelado').reduce((a, o) => a + Number(o.total_amount || 0), 0);
      return `Histórico de ${ords[0].customer_name || 'Cliente'} (${ords[0].customer_phone || termoTexto}):\nTotal de pedidos: ${ords.length}\nTotal gasto: ${brl(total)}\n\nÚltimos pedidos:\n` + ords.slice(0, 5).map((o) => `• #${o.id} (${hora(o.created_at)}): ${brl(o.total_amount)} - ${o.status}`).join('\n');
    }
    if (tipo === 'ranking_clientes') {
      const ords = (await todosPedidos()).filter((o) => o.status !== 'Cancelado');
      const m: Record<string, { nome: string; n: number; v: number }> = {};
      ords.forEach((o) => {
        const k = String(o.customer_phone || '').replace(/\D/g, '').slice(-9);
        if (k.length < 8) return;
        m[k] = m[k] || { nome: o.customer_name || 'Cliente', n: 0, v: 0 };
        m[k].n++;
        m[k].v += Number(o.total_amount || 0);
      });
      const top = Object.entries(m).sort((a, b) => b[1].v - a[1].v).slice(0, 10);
      return top.length ? '🏆 Top clientes por faturamento:\n' + top.map(([k, x], i) => `${i + 1}. ${x.nome} (..${k.slice(-4)}): ${x.n} pedidos, ${brl(x.v)}`).join('\n') : 'Nenhum cliente registrado.';
    }
    // Resumo de vendas do período (padrão: hoje)
    return resumoVendas(await todosPedidos(de, somaDias(ate, 1)), de, ate);
  } catch (e: any) {
    console.error('[maya-relatorio]', tipo, e?.message || e);
    return 'Erro ao montar o relatório: ' + (e?.message || e);
  }
}
