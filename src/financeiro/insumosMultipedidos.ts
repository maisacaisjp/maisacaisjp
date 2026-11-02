import { hoje, norm, uid } from './format';
import type { Dados, Insumo, Unidade } from './types';

// Preços de custo do cadastro de ingredientes do Multipedidos, conferidos em 02/11/2026.
// kg e L viram embalagem de 1000 g/ml; o preço é sempre o de 1 kg, 1 L ou 1 unidade.
// Ficam de fora "Custo fixo médio" (R$ 6,11/un) e "Cremes custo médio por kilo" (R$ 20,48/kg):
// são médias, não insumos, e o custo fixo já é contado na aba Custos fixos.
type Linha = [nome: string, categoria: string, medida: 'kg' | 'L' | 'un', preco: number];

const ACAI = 'Açaí e polpas';
const CREME = 'Cremes e mousses';
const FRUTA = 'Frutas';
const COMPL = 'Complementos';
const CALDA = 'Caldas e coberturas';
const LATIC = 'Laticínios';
const BEBIDA = 'Bebidas';
const EMB = 'Embalagens';

export const LINHAS_MULTIPEDIDOS: Linha[] = [
  // Cremes
  ['Açaí natural', ACAI, 'kg', 14.4],
  ['Açaí sabor banana', ACAI, 'kg', 14.4],
  ['Açaí sabor morango', ACAI, 'kg', 14.06],
  ['Cupuaçu Tradicional', ACAI, 'kg', 14.06],
  ['Cupuaçu Cremoso', CREME, 'kg', 28.57],
  ['Café e cacau', CREME, 'kg', 24.57],
  ['Pitaya', ACAI, 'kg', 24.57],
  ['Tapioca com coco', CREME, 'kg', 28.57],
  ['Creme de Paçoca', CREME, 'kg', 24.57],
  ['Base Milk Shake', CREME, 'kg', 16.77],
  // Adicionais
  ['Abacaxi', FRUTA, 'kg', 10],
  ['Amendoim', COMPL, 'kg', 20.15],
  ['Banana', FRUTA, 'kg', 5.99],
  ['Bis extra ao leite', COMPL, 'un', 2],
  ['Bis extra oreo', COMPL, 'un', 2],
  ['Calda de morango', CALDA, 'kg', 23],
  ['Chocoball', COMPL, 'kg', 35],
  ['Cobertura de caramelo', CALDA, 'kg', 15],
  ['Cobertura de chocolate', CALDA, 'kg', 20],
  ['Cobertura de morango', CALDA, 'kg', 15],
  ['Confete', COMPL, 'kg', 32],
  ['Creme de avelã', CREME, 'kg', 60],
  ['Danoninho', CREME, 'kg', 16],
  ['Doce de leite', LATIC, 'kg', 20],
  ['Farinha láctea', COMPL, 'kg', 30],
  ['Gotas de chocolate', COMPL, 'kg', 34],
  ['Granola', COMPL, 'kg', 20],
  ['Kinder barrinha', COMPL, 'un', 1.54],
  ['Kinder bueno ao leite', COMPL, 'un', 5.29],
  ['Kinder bueno white', COMPL, 'un', 5.29],
  ['Kit kat ao leite', COMPL, 'un', 2.5],
  ['Kit kat white', COMPL, 'un', 2.5],
  ['Kiwi importado', FRUTA, 'kg', 20],
  ['Leite condensado', LATIC, 'kg', 12],
  ['Leite condensado zero lactose', LATIC, 'kg', 20],
  ['Leite em pó', LATIC, 'kg', 38],
  ['Leite em pó zero lactose', LATIC, 'kg', 32],
  ['Mel', CALDA, 'kg', 32],
  ['Morango', FRUTA, 'kg', 20],
  ['Mousse de ninho', CREME, 'kg', 16],
  ['Ouro branco', COMPL, 'un', 1],
  ['Ovomaltine', COMPL, 'kg', 35],
  ['Paçoca', COMPL, 'kg', 26],
  ['Sonho de valsa', COMPL, 'un', 1],
  ['Uva verde s/ semente', FRUTA, 'kg', 20],
  ['Bolacha maisena triturada', COMPL, 'kg', 8],
  ['Leite Integral', LATIC, 'L', 7],
  ['Água mineral (suco)', BEBIDA, 'L', 1],
  // Embalagens
  ['Copo 330ml', EMB, 'un', 0.2],
  ['Copo 440ml', EMB, 'un', 0.2],
  ['Copo 550ml', EMB, 'un', 0.3],
  ['Copo 770ml', EMB, 'un', 0.35],
  ['Potinho adicionais 145ml', EMB, 'un', 0.35],
  ['Pote 1 litro', EMB, 'un', 1.2],
  ['Colher', EMB, 'un', 0.2],
  ['Guardanapo', EMB, 'un', 0.07],
  ['Suporte para copo', EMB, 'un', 0.39],
  ['Saco delivery', EMB, 'un', 0.36],
  ['Tampa Bolha', EMB, 'un', 0.32],
  ['Canudo', EMB, 'un', 0.1],
  ['Copo Milk Shake', EMB, 'un', 0.3],
  ['Adesivo', EMB, 'un', 0.25],
  ['Lacre de segurança', EMB, 'un', 0.05],
  ['Cartãozinho @maisacaisjp', EMB, 'un', 0.08],
  ['Sacola branca pequena', EMB, 'un', 0.05],
];

const UNIDADE: Record<Linha[2], Unidade> = { kg: 'g', L: 'ml', un: 'un' };

export const faltandoMultipedidos = (d: Pick<Dados, 'insumos'>) => {
  const existentes = new Set(d.insumos.map((i) => norm(i.nome)));
  return LINHAS_MULTIPEDIDOS.filter(([nome]) => !existentes.has(norm(nome)));
};

// Só acrescenta o que falta: insumo com o mesmo nome continua como está, com o preço já salvo.
export function importarMultipedidos(d: Dados): Dados {
  const novos: Insumo[] = faltandoMultipedidos(d).map(([nome, categoria, medida, preco]) => ({
    id: uid(),
    nome,
    categoria,
    unidade: UNIDADE[medida],
    qtdEmbalagem: medida === 'un' ? 1 : 1000,
    precoEmbalagem: preco,
    perda: 0,
    atualizadoEm: hoje(),
  }));
  return { ...d, insumos: [...d.insumos, ...novos] };
}
