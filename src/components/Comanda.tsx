// Comanda para impressora térmica 80 mm (padrão de comanda de delivery):
// número do pedido em destaque, tipo invertido (preto), cliente, itens com adicionais recuados,
// totais alinhados e pagamento destacado. A mesma comanda aparece na prévia e na impressão.

const brl = (v: number) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');

const itensDo = (items: any): any[] => {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const p = JSON.parse(items);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

function tipoDoPedido(t: string) {
  const s = String(t || '').toLowerCase();
  if (s.includes('deliver') || s.includes('entrega')) return 'ENTREGA';
  if (s.includes('take') || s.includes('retir')) return 'RETIRADA';
  if (s.includes('mesa')) return 'MESA';
  if (s.includes('balc')) return 'BALCÃO';
  return String(t || 'PEDIDO').toUpperCase();
}

function telefone(t: string) {
  const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');

const S = {
  linha: { borderTop: '1px dashed #000', margin: '6px 0' } as const,
  linhaCheia: { borderTop: '2px solid #000', margin: '6px 0' } as const,
  par: { display: 'flex', justifyContent: 'space-between', gap: '6px' } as const,
  rotulo: { fontSize: '9pt', fontWeight: 900, letterSpacing: '0.5px', margin: '0 0 2px' } as const,
};

/** Valores da comanda (os dois modelos usam a mesma conta). */
export function calcularComanda(pedido: any) {
  const itens = itensDo(pedido.items);
  const tipo = tipoDoPedido(pedido.orderType);
  const entrega = tipo === 'ENTREGA';
  const total = Number(pedido.totalAmount) || 0;

  const notasPedido = String(pedido.notes || '');
  const mCash = notasPedido.match(/Desconto Cashback:\s*R\$\s*([\d.,]+)/i);
  const descontoCashback = mCash ? Number(mCash[1].replace(',', '.')) || 0 : 0;
  let observacao = notasPedido.replace(/\[?Desconto Cashback:[^\]]*\]?/i, '').trim();
  // Pedido da Maya repete o texto dos itens nas observações
  if (itens.length === 1 && observacao === String(itens[0]?.name || '').trim()) observacao = '';

  const subtotal = itens.reduce((s, i) => s + Number(i.priceCalculated ?? i.basePrice ?? i.price ?? 0) * Number(i.quantity || 1), 0);
  const adicional = Number(pedido.additionalAmount) || 0;
  const desconto = Number(pedido.discountAmount) || 0;
  const taxaEntrega = entrega ? Math.max(0, Math.round((total - subtotal - adicional + desconto + descontoCashback) * 100) / 100) : 0;

  const troco = Number(String(pedido.changeFor || '').replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
  const qtdItens = itens.reduce((s, i) => s + Number(i.quantity || 1), 0);
  return { itens, tipo, entrega, total, descontoCashback, observacao, subtotal, adicional, desconto, taxaEntrega, troco, qtdItens };
}

// ─── Modo texto: para impressora no driver "Generic / Text Only" (o mesmo do 99Food) ───
// Esse driver só imprime letras: sem negrito, sem tamanho e sem acento. O destaque vem de
// MAIÚSCULAS, linhas e espaço. Colunas fixas para os valores ficarem alinhados.
const semAcento = (s: string) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\n]/g, '');

export function textoComanda(pedido: any, colunas = 44): string {
  const c = calcularComanda(pedido);
  const L: string[] = [];
  const linha = (ch = '-') => L.push(ch.repeat(colunas));
  const centro = (t: string) => {
    const s = semAcento(t).slice(0, colunas);
    L.push(' '.repeat(Math.max(0, Math.floor((colunas - s.length) / 2))) + s);
  };
  // quebra o texto na largura, com recuo nas linhas seguintes
  const quebrar = (t: string, largura: number, recuo = '') => {
    const limpo = semAcento(t);
    const inicio = (limpo.match(/^ */) || [''])[0]; // recuo da primeira linha
    const palavras = limpo.trim().split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let atual = '';
    for (const p of palavras) {
      const tentativa = atual ? `${atual} ${p}` : p;
      const lim = out.length ? largura - recuo.length : largura - inicio.length;
      if (tentativa.length > lim && atual) {
        out.push(atual);
        atual = p;
      } else atual = tentativa;
    }
    if (atual) out.push(atual);
    return out.map((l, i) => (i ? recuo + l : inicio + l));
  };
  const texto = (t: string, recuo = '') => quebrar(t, colunas, recuo).forEach((l) => L.push(l));
  // texto à esquerda e valor à direita na mesma linha
  const par = (esq: string, dir: string, recuo = '') => {
    const d = semAcento(dir);
    const partes = quebrar(recuo + esq.trimStart(), colunas - d.length - 1, recuo + '  ');
    partes.forEach((p, i) => L.push(i === 0 ? p.padEnd(colunas - d.length) + d : p));
  };

  L.push('');
  centro('MAIS ACAI SJP');
  linha('=');
  centro(`*** PEDIDO #${pedido.id} ***`);
  centro(`[ ${c.tipo} ]`);
  if (pedido.createdAt) centro(dataHora(pedido.createdAt));
  linha();
  texto(`CLIENTE: ${String(pedido.customerName || 'Cliente').toUpperCase()}`, '         ');
  if (pedido.customerPhone) texto(`Tel: ${telefone(pedido.customerPhone)}`);
  if (c.entrega && (pedido.deliveryAddress || pedido.deliveryZone)) {
    L.push('');
    L.push('ENTREGAR EM:');
    if (pedido.deliveryAddress) texto(String(pedido.deliveryAddress).toUpperCase());
    if (pedido.deliveryZone) texto(`Bairro: ${pedido.deliveryZone}`);
  }
  linha();
  par(`ITENS (${c.qtdItens})`, 'VALOR');
  L.push('');
  c.itens.forEach((item, idx) => {
    const qtd = Number(item.quantity || 1);
    const extras: any[] = Array.isArray(item.extras) ? item.extras : [];
    const somaExtras = extras.reduce((s, e) => s + Number(e.price || 0) * Number(e.quantity || 1), 0);
    const base = item.basePrice !== undefined ? Number(item.basePrice) : Number(item.priceCalculated || 0) - somaExtras;
    if (idx) L.push('');
    par(`${qtd}x ${String(item.name || '').trim().toUpperCase()}`, brl(base * qtd));
    extras.forEach((e) => {
      const valor = Number(e.price) ? brl(Number(e.price) * Number(e.quantity || 1) * qtd) : '';
      par(`+ ${Number(e.quantity) > 1 ? `${e.quantity}x ` : ''}${e.name}`, valor, '   ');
    });
    const notas = String(item.notes || '').trim();
    if (notas) texto(/^creme:/i.test(notas) ? `   ${notas}` : `   >> OBS: ${notas.toUpperCase()}`, '      ');
  });
  linha();
  par('Subtotal', brl(c.subtotal));
  if (c.entrega) par('Taxa de entrega', c.taxaEntrega > 0 ? brl(c.taxaEntrega) : 'Gratis');
  if (c.adicional > 0) par(`Acrescimo${pedido.editReason ? ` (${pedido.editReason})` : ''}`, '+' + brl(c.adicional));
  if (c.desconto > 0) par('Desconto', '-' + brl(c.desconto));
  if (c.descontoCashback > 0) par('Cashback usado', '-' + brl(c.descontoCashback));
  linha('=');
  par('TOTAL A PAGAR', brl(c.total));
  linha('=');
  texto(`PAGAMENTO: ${String(pedido.paymentMethod || 'Nao informado').toUpperCase()}`);
  if (c.troco > 0) texto(`TROCO PARA ${brl(c.troco)}${c.troco > c.total ? ` (LEVAR ${brl(c.troco - c.total)})` : ''}`);
  if (pedido.nif) texto(`CPF na nota: ${pedido.nif}`);
  if (c.observacao) {
    linha();
    L.push('OBSERVACOES DO PEDIDO:');
    texto(c.observacao.toUpperCase());
  }
  linha();
  L.push('', '', '', '');
  return L.join('\n');
}

export function ComandaTexto({ pedido }: { pedido: any }) {
  return (
    <pre style={{ margin: 0, fontFamily: "'Courier New', Courier, monospace", fontSize: '7.5pt', lineHeight: 1.25, color: '#000', whiteSpace: 'pre' }}>
      {textoComanda(pedido)}
    </pre>
  );
}

export default function Comanda({ pedido }: { pedido: any }) {
  const { itens, tipo, entrega, total, descontoCashback, observacao, subtotal, adicional, desconto, taxaEntrega, troco, qtdItens } = calcularComanda(pedido);

  // Escala de fontes: 1 número grande, 1 total grande, nomes médios em negrito, detalhes normais
  const T = {
    rotulo: { fontSize: '8pt', fontWeight: 700, letterSpacing: '1px', margin: '0 0 2px' } as const,
    detalhe: { fontSize: '9.5pt', fontWeight: 400 } as const,
    forte: { fontSize: '11pt', fontWeight: 700 } as const,
  };

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', fontSize: '9.5pt', lineHeight: 1.3, fontWeight: 400 }}>
      {/* Loja, número e tipo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '10pt', fontWeight: 700, letterSpacing: '1px' }}>MAIS AÇAÍ SJP</div>
        <div style={{ fontSize: '24pt', fontWeight: 800, lineHeight: 1.1, marginTop: '4px' }}>PEDIDO #{pedido.id}</div>
        <div style={{ display: 'inline-block', background: '#000', color: '#fff', fontSize: '12pt', fontWeight: 700, padding: '2px 14px', margin: '4px 0 3px', letterSpacing: '1px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
          {tipo}
        </div>
        {pedido.createdAt && <div style={T.detalhe}>{dataHora(pedido.createdAt)}</div>}
      </div>
      <div style={S.linha} />

      {/* Cliente */}
      <p style={T.rotulo}>CLIENTE</p>
      <div style={T.forte}>{pedido.customerName || 'Cliente'}</div>
      {pedido.customerPhone && <div style={T.detalhe}>{telefone(pedido.customerPhone)}</div>}
      {entrega && (pedido.deliveryAddress || pedido.deliveryZone) && (
        <div style={{ marginTop: '5px' }}>
          <p style={T.rotulo}>ENTREGAR EM</p>
          {pedido.deliveryAddress && <div style={T.forte}>{pedido.deliveryAddress}</div>}
          {pedido.deliveryZone && <div style={T.detalhe}>Bairro: {pedido.deliveryZone}</div>}
        </div>
      )}
      <div style={S.linha} />

      {/* Itens */}
      <div style={{ ...S.par, ...T.rotulo }}>
        <span>ITENS ({qtdItens})</span>
        <span>VALOR</span>
      </div>
      {itens.map((item, idx) => {
        const qtd = Number(item.quantity || 1);
        const extras: any[] = Array.isArray(item.extras) ? item.extras : [];
        const somaExtras = extras.reduce((s, e) => s + Number(e.price || 0) * Number(e.quantity || 1), 0);
        const base = item.basePrice !== undefined ? Number(item.basePrice) : Number(item.priceCalculated || 0) - somaExtras;
        const notas = String(item.notes || '').trim();
        return (
          <div key={idx} style={{ marginBottom: '6px' }}>
            <div style={S.par}>
              <span style={T.forte}>
                {qtd}x {String(item.name || '').trim()}
              </span>
              <span style={{ ...T.forte, whiteSpace: 'nowrap' }}>{brl(base * qtd)}</span>
            </div>
            {extras.map((e, j) => (
              <div key={j} style={{ ...S.par, ...T.detalhe, paddingLeft: '10px' }}>
                <span>+ {Number(e.quantity) > 1 ? `${e.quantity}x ` : ''}{e.name}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{Number(e.price) ? brl(Number(e.price) * Number(e.quantity || 1) * qtd) : ''}</span>
              </div>
            ))}
            {notas &&
              (/^creme:/i.test(notas) ? (
                <div style={{ ...T.detalhe, paddingLeft: '10px' }}>{notas}</div>
              ) : (
                <div style={{ paddingLeft: '10px', fontSize: '10pt', fontWeight: 700 }}>OBS: {notas}</div>
              ))}
          </div>
        );
      })}
      <div style={S.linha} />

      {/* Totais */}
      <div style={{ ...S.par, ...T.detalhe }}>
        <span>Subtotal</span>
        <span>{brl(subtotal)}</span>
      </div>
      {entrega && (
        <div style={{ ...S.par, ...T.detalhe }}>
          <span>Taxa de entrega</span>
          <span>{taxaEntrega > 0 ? brl(taxaEntrega) : 'Grátis'}</span>
        </div>
      )}
      {adicional > 0 && (
        <div style={{ ...S.par, ...T.detalhe }}>
          <span>Acréscimo{pedido.editReason ? ` (${pedido.editReason})` : ''}</span>
          <span>+ {brl(adicional)}</span>
        </div>
      )}
      {desconto > 0 && (
        <div style={{ ...S.par, ...T.detalhe }}>
          <span>Desconto</span>
          <span>- {brl(desconto)}</span>
        </div>
      )}
      {descontoCashback > 0 && (
        <div style={{ ...S.par, ...T.detalhe }}>
          <span>Cashback usado</span>
          <span>- {brl(descontoCashback)}</span>
        </div>
      )}
      <div style={{ ...S.par, fontSize: '14pt', fontWeight: 800, marginTop: '4px' }}>
        <span>TOTAL</span>
        <span>{brl(total)}</span>
      </div>
      <div style={S.linha} />

      {/* Pagamento */}
      <p style={T.rotulo}>PAGAMENTO</p>
      <div style={T.forte}>{String(pedido.paymentMethod || 'Não informado').toUpperCase()}</div>
      {troco > 0 && (
        <div style={{ fontSize: '10pt', fontWeight: 700 }}>
          Troco para {brl(troco)}
          {troco > total ? ` (levar ${brl(troco - total)})` : ''}
        </div>
      )}
      {pedido.nif && <div style={T.detalhe}>CPF na nota: {pedido.nif}</div>}

      {observacao && (
        <>
          <div style={S.linha} />
          <p style={T.rotulo}>OBSERVAÇÕES DO PEDIDO</p>
          <div style={{ fontSize: '10pt', fontWeight: 700 }}>{observacao}</div>
        </>
      )}
    </div>
  );
}
