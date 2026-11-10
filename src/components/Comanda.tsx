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

export default function Comanda({ pedido }: { pedido: any }) {
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

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: '#000', fontSize: '10pt', lineHeight: 1.3, fontWeight: 600 }}>
      {/* Loja */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13pt', fontWeight: 900, letterSpacing: '1px' }}>MAIS AÇAÍ SJP</div>
        <div style={{ fontSize: '8pt', fontWeight: 600 }}>Pedido pelo cardápio digital</div>
      </div>
      <div style={S.linhaCheia} />

      {/* Número e tipo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '9pt', fontWeight: 700 }}>PEDIDO</div>
        <div style={{ fontSize: '26pt', fontWeight: 900, lineHeight: 1 }}>#{pedido.id}</div>
        <div style={{ display: 'inline-block', background: '#000', color: '#fff', fontSize: '13pt', fontWeight: 900, padding: '2px 12px', margin: '5px 0 3px', letterSpacing: '1px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
          {tipo}
        </div>
        {pedido.createdAt && <div style={{ fontSize: '9pt', fontWeight: 600 }}>{dataHora(pedido.createdAt)}</div>}
      </div>
      <div style={S.linha} />

      {/* Cliente */}
      <p style={S.rotulo}>CLIENTE</p>
      <div style={{ fontSize: '12pt', fontWeight: 900 }}>{pedido.customerName || 'Cliente'}</div>
      {pedido.customerPhone && <div style={{ fontSize: '10pt' }}>{telefone(pedido.customerPhone)}</div>}
      {entrega && (pedido.deliveryAddress || pedido.deliveryZone) && (
        <div style={{ marginTop: '4px' }}>
          <p style={S.rotulo}>ENDEREÇO DE ENTREGA</p>
          {pedido.deliveryAddress && <div style={{ fontSize: '11pt', fontWeight: 800 }}>{pedido.deliveryAddress}</div>}
          {pedido.deliveryZone && <div style={{ fontSize: '10pt', fontWeight: 700 }}>Bairro: {pedido.deliveryZone}</div>}
        </div>
      )}
      <div style={S.linha} />

      {/* Itens */}
      <div style={{ ...S.par, ...S.rotulo }}>
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
              <span style={{ fontSize: '11pt', fontWeight: 900 }}>
                {qtd}x {String(item.name || '').trim()}
              </span>
              <span style={{ fontSize: '10pt', fontWeight: 800, whiteSpace: 'nowrap' }}>{brl(base * qtd)}</span>
            </div>
            {extras.map((e, j) => (
              <div key={j} style={{ ...S.par, paddingLeft: '10px', fontSize: '9.5pt', fontWeight: 600 }}>
                <span>+ {Number(e.quantity) > 1 ? `${e.quantity}x ` : ''}{e.name}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{Number(e.price) ? brl(Number(e.price) * Number(e.quantity || 1) * qtd) : ''}</span>
              </div>
            ))}
            {notas && (
              <div style={{ paddingLeft: '10px', fontSize: '10pt', fontWeight: 900, marginTop: '1px' }}>
                {/^creme:/i.test(notas) ? notas : `OBS: ${notas}`}
              </div>
            )}
          </div>
        );
      })}
      <div style={S.linha} />

      {/* Totais */}
      <div style={{ ...S.par, fontSize: '10pt' }}>
        <span>Subtotal</span>
        <span>{brl(subtotal)}</span>
      </div>
      {entrega && (
        <div style={{ ...S.par, fontSize: '10pt' }}>
          <span>Taxa de entrega</span>
          <span>{taxaEntrega > 0 ? brl(taxaEntrega) : 'Grátis'}</span>
        </div>
      )}
      {adicional > 0 && (
        <div style={{ ...S.par, fontSize: '10pt' }}>
          <span>Acréscimo{pedido.editReason ? ` (${pedido.editReason})` : ''}</span>
          <span>+ {brl(adicional)}</span>
        </div>
      )}
      {desconto > 0 && (
        <div style={{ ...S.par, fontSize: '10pt' }}>
          <span>Desconto</span>
          <span>- {brl(desconto)}</span>
        </div>
      )}
      {descontoCashback > 0 && (
        <div style={{ ...S.par, fontSize: '10pt' }}>
          <span>Cashback usado</span>
          <span>- {brl(descontoCashback)}</span>
        </div>
      )}
      <div style={{ ...S.par, fontSize: '14pt', fontWeight: 900, marginTop: '3px' }}>
        <span>TOTAL</span>
        <span>{brl(total)}</span>
      </div>
      <div style={S.linha} />

      {/* Pagamento */}
      <p style={S.rotulo}>PAGAMENTO</p>
      <div style={{ fontSize: '12pt', fontWeight: 900 }}>{String(pedido.paymentMethod || 'Não informado').toUpperCase()}</div>
      {troco > 0 && (
        <div style={{ fontSize: '10pt', fontWeight: 800 }}>
          Troco para {brl(troco)}
          {troco > total ? ` — levar ${brl(troco - total)}` : ''}
        </div>
      )}
      {/pix/i.test(String(pedido.paymentMethod || '')) && <div style={{ fontSize: '9pt' }}>Conferir o comprovante do PIX</div>}
      {pedido.nif && <div style={{ fontSize: '9.5pt', marginTop: '2px' }}>CPF na nota: {pedido.nif}</div>}

      {observacao && (
        <>
          <div style={S.linha} />
          <p style={S.rotulo}>OBSERVAÇÕES DO PEDIDO</p>
          <div style={{ fontSize: '10.5pt', fontWeight: 900 }}>{observacao}</div>
        </>
      )}

      <div style={S.linhaCheia} />
      <div style={{ textAlign: 'center', fontSize: '8.5pt', fontWeight: 600 }}>
        Obrigado pela preferência!
        <br />
        maisacaisjpbr.netlify.app
      </div>
    </div>
  );
}
