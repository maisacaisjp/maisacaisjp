// Ponte de impressão do gestor Mais Açaí SJP.
// Fica rodando neste computador e recebe do gestor (no navegador) a comanda já pronta em ESC/POS,
// mandando direto para a Bematech MP-4200 TH na rede (porta 9100), sem janela de impressão.
//
//   GET  http://127.0.0.1:9123/status    -> diz se a impressora está online e com papel
//   POST http://127.0.0.1:9123/imprimir  -> corpo: { "dados": "<bytes ESC/POS em base64>" }
//
// Configuração por variável de ambiente: IMPRESSORA_IP, IMPRESSORA_PORTA, PONTE_PORTA.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IP = process.env.IMPRESSORA_IP || '192.168.100.41';
const PORTA_IMPRESSORA = Number(process.env.IMPRESSORA_PORTA || 9100);
const PORTA = Number(process.env.PONTE_PORTA || 9123);
const LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ponte.log');

function log(msg) {
  const linha = `[${new Date().toLocaleString('pt-BR')}] ${msg}\n`;
  process.stdout.write(linha);
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1_000_000) fs.renameSync(LOG, LOG + '.antigo');
    fs.appendFileSync(LOG, linha);
  } catch {}
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre conexão com a impressora, opcionalmente envia bytes e lê a resposta. */
function conversar(bytes, lerResposta = 0, tempo = 4000) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: IP, port: PORTA_IMPRESSORA });
    const resposta = [];
    let fim = false;
    const terminar = (erro) => {
      if (fim) return;
      fim = true;
      clearTimeout(timer);
      sock.destroy();
      erro ? reject(erro) : resolve(Buffer.concat(resposta));
    };
    const timer = setTimeout(() => (lerResposta ? terminar() : terminar(new Error('tempo esgotado'))), tempo);
    sock.on('error', terminar);
    sock.on('data', (d) => {
      resposta.push(d);
      if (Buffer.concat(resposta).length >= lerResposta) terminar();
    });
    sock.on('connect', () => {
      sock.write(bytes, () => {
        if (!lerResposta) sock.end(() => terminar());
      });
    });
  });
}

/** DLE EOT 1 (impressora) e DLE EOT 4 (papel). */
async function status() {
  try {
    const r = await conversar(Buffer.from([0x10, 0x04, 0x01, 0x10, 0x04, 0x04]), 2, 2500);
    if (r.length < 1) return { ok: true, impressora: 'sem resposta', online: false };
    const online = (r[0] & 0x08) === 0;
    const papel = r.length > 1 ? ((r[1] & 0x60) ? 'acabou' : (r[1] & 0x0c) ? 'acabando' : 'ok') : 'desconhecido';
    return { ok: true, impressora: `${IP}:${PORTA_IMPRESSORA}`, online, papel };
  } catch (e) {
    return { ok: true, impressora: `${IP}:${PORTA_IMPRESSORA}`, online: false, erro: e.message };
  }
}

// a impressora atende um de cada vez: fila simples, com até 4 tentativas por comanda
let fila = Promise.resolve();
function imprimir(bytes) {
  const tarefa = fila.then(async () => {
    let ultimoErro;
    for (let t = 1; t <= 4; t++) {
      try {
        await conversar(bytes);
        return;
      } catch (e) {
        ultimoErro = e;
        log(`tentativa ${t} falhou: ${e.message}`);
        await espera(1500);
      }
    }
    throw ultimoErro;
  });
  fila = tarefa.catch(() => {});
  return tarefa;
}

function responder(res, codigo, obj) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const servidor = http.createServer((req, res) => {
  // o gestor roda em outro endereço (site), então libera o acesso do navegador
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  if (req.method === 'GET' && req.url === '/status') {
    return status().then((s) => responder(res, 200, s));
  }

  if (req.method === 'POST' && req.url === '/imprimir') {
    let corpo = '';
    req.on('data', (d) => {
      corpo += d;
      if (corpo.length > 2_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const { dados, pedido } = JSON.parse(corpo || '{}');
        const bytes = Buffer.from(String(dados || ''), 'base64');
        if (!bytes.length) return responder(res, 400, { ok: false, erro: 'comanda vazia' });
        await imprimir(bytes);
        log(`impresso${pedido ? ` pedido #${pedido}` : ''} (${bytes.length} bytes)`);
        responder(res, 200, { ok: true });
      } catch (e) {
        log(`erro ao imprimir: ${e.message}`);
        responder(res, 502, { ok: false, erro: e.message });
      }
    });
    return;
  }

  responder(res, 404, { ok: false, erro: 'caminho desconhecido' });
});

servidor.on('error', (e) => {
  log(e.code === 'EADDRINUSE' ? `a ponte já está rodando na porta ${PORTA}` : `erro: ${e.message}`);
  process.exit(e.code === 'EADDRINUSE' ? 0 : 1);
});

servidor.listen(PORTA, '127.0.0.1', () => log(`ponte de impressão ligada em http://127.0.0.1:${PORTA} -> Bematech ${IP}:${PORTA_IMPRESSORA}`));

