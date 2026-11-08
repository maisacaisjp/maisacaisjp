// ==============================================================================
// GERADOR OFICIAL DE PIX (EMV QRCPS / BR CODE - BANCO CENTRAL DO BRASIL)
// Chave: 41 997349076 (Michele Alvarez - Mais Açaí)
// ==============================================================================

export const PIX_CONFIG_PADRAO = {
  chave: '41997349076',
  telefoneFormatado: '(41) 99734-9076',
  beneficiario: 'Michele Alvarez',
  cidade: 'Sao Jose dos Pinhais',
  empresa: 'Mais Açaí'
};

/** Calcula o CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) exigido pelo padrão BR Code do Bacen */
function calcularCrc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Formata campo TLV (Tag, Length, Value) */
function formatarTlv(id: string, valor: string): string {
  const tamanho = String(valor.length).padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

export interface OpcoesPix {
  chave?: string;
  beneficiario?: string;
  cidade?: string;
  valor?: number;
  identificador?: string;
}

/**
 * Gera o código PIX Copia e Cola oficial com CRC16 válido.
 */
export function gerarPixCopiaECola(opcoes: OpcoesPix = {}): string {
  const chaveBruta = opcoes.chave || PIX_CONFIG_PADRAO.chave;
  const digitosChave = chaveBruta.replace(/\D/g, '');
  // Celular nacional: adiciona +55 para validação no Bacen
  const chavePix = digitosChave.length === 11 ? `+55${digitosChave}` : digitosChave;

  // Remove acentos e caracteres especiais para conformidade estrita EMV ASCII
  const limpaTexto = (t: string, max: number) =>
    (t || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, max);

  const nomeBeneficiario = limpaTexto(opcoes.beneficiario || PIX_CONFIG_PADRAO.beneficiario, 25) || 'MICHELE ALVAREZ';
  const nomeCidade = limpaTexto(opcoes.cidade || PIX_CONFIG_PADRAO.cidade, 15) || 'S JOSE PINHAIS';
  const txid = limpaTexto(opcoes.identificador || '***', 25) || '***';

  // 26: Merchant Account Information - PIX
  const gui = formatarTlv('00', 'br.gov.bcb.pix');
  const chaveEmv = formatarTlv('01', chavePix);
  const merchantAccount = formatarTlv('26', `${gui}${chaveEmv}`);

  // 62: Additional Data Field Template (TxId)
  const additionalData = formatarTlv('62', formatarTlv('05', txid));

  // Constrói partes sem o CRC
  const partes = [
    formatarTlv('00', '01'), // Payload Format Indicator
    merchantAccount,
    formatarTlv('52', '0000'), // Merchant Category Code
    formatarTlv('53', '986'), // Transaction Currency (986 = Real BRL)
  ];

  if (opcoes.valor && opcoes.valor > 0) {
    partes.push(formatarTlv('54', opcoes.valor.toFixed(2))); // Transaction Amount
  }

  partes.push(
    formatarTlv('58', 'BR'), // Country Code
    formatarTlv('59', nomeBeneficiario), // Merchant Name
    formatarTlv('60', nomeCidade), // Merchant City
    additionalData,
    '6304' // CRC16 Tag + Tamanho fixo 04
  );

  const payloadIncompleto = partes.join('');
  const crc = calcularCrc16(payloadIncompleto);

  return `${payloadIncompleto}${crc}`;
}

/**
 * Gera a URL da imagem do QR Code para renderização imediata.
 */
export function gerarQrCodePixUrl(pixCopiaECola: string, tamanho = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&margin=8&data=${encodeURIComponent(pixCopiaECola)}`;
}

