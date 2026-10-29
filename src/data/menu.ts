// ==============================================================================
// CARDÁPIO OFICIAL MAIS AÇAÍ SJP - DESDE 2016
// Sincronizado automaticamente da base pedir.delivery/app/maisacai/menu
// ==============================================================================

export interface MenuItem {
  id: string;
  name: string;
  ingredients: string;
  category: string;
  priceSingle?: number;
  priceP?: number;
  priceM?: number;
  priceG?: number;
  priceBig?: number;
  priceSuperBig?: number;
  imageUrl?: string;
  imageUrl2?: string;
  dayOfWeek?: number;
  isBestseller?: boolean;
}

export interface ExtraIngredient {
  id: string;
  name: string;
  price: number;
}

export const RESTAURANT_WHATSAPP_PHONE = '5541997349076';
export const FREE_DELIVERY_THRESHOLD = Infinity; // Mais Açaí não tem frete grátis por valor
export const MIN_DELIVERY_ORDER = 30.0;

export const NEIGHBORHOOD_DELIVERY_FEES: Record<string, number> = {
  "Parque da Fonte": 0,
  "Afonso Pena": 5.0,
  "Centro (SJP)": 6.0,
  "Boneca do Bigode": 6.0,
  "Aristocrata": 7.0,
  "São Pedro": 6.0,
  "Guatupê": 8.0,
  "Cruzeiro": 7.0,
  "Braga": 6.0,
  "Ouro Fino": 7.0,
  "Colônia Rio Grande": 8.0,
  "Borda do Campo": 10.0,
  "Zacarias": 8.0,
  "Ipê": 9.0,
  "Outro Bairro (SJP)": 8.0
};

// Adicionais e Toppings Oficiais Mais Açaí
export const acaiExtras: ExtraIngredient[] = [
  {
    "id": "ex-3637089",
    "name": "CARIBE BUENO",
    "price": 10
  },
  {
    "id": "ex-4143417",
    "name": "CUBINHOS DE BROWNIE",
    "price": 6
  },
  {
    "id": "ex-3118515",
    "name": "CREME RAFFAELLO",
    "price": 10
  },
  {
    "id": "ex-2069310",
    "name": "BANANA",
    "price": 4
  },
  {
    "id": "ex-2069312",
    "name": "MORANGO",
    "price": 6
  },
  {
    "id": "ex-2069311",
    "name": "KIWI IMPORTADO",
    "price": 4
  },
  {
    "id": "ex-2069313",
    "name": "UVA VERDE S/ SEMENTE",
    "price": 4
  },
  {
    "id": "ex-2069309",
    "name": "ABACAXI",
    "price": 4
  },
  {
    "id": "ex-2069323",
    "name": "CALDA DE MORANGO COM PEDAÇOS",
    "price": 6
  },
  {
    "id": "ex-2069330",
    "name": "LEITE CONDENSADO",
    "price": 4
  },
  {
    "id": "ex-2069320",
    "name": "LEITE EM PÓ",
    "price": 4
  },
  {
    "id": "ex-2069328",
    "name": "NUTELLA",
    "price": 10
  },
  {
    "id": "ex-2069314",
    "name": "DANONINHO CASEIRO",
    "price": 6
  },
  {
    "id": "ex-2069315",
    "name": "MOUSSE DE NINHO",
    "price": 6
  },
  {
    "id": "ex-2069322",
    "name": "PAÇOCA",
    "price": 4
  },
  {
    "id": "ex-2069319",
    "name": "GRANOLA",
    "price": 4
  },
  {
    "id": "ex-2069316",
    "name": "AMENDOIM",
    "price": 4
  },
  {
    "id": "ex-2069317",
    "name": "CHOCOBALL",
    "price": 4
  },
  {
    "id": "ex-2069318",
    "name": "FARINHA LÁCTEA",
    "price": 4
  },
  {
    "id": "ex-2069325",
    "name": "COBERTURA DE CARAMELO",
    "price": 3
  },
  {
    "id": "ex-2069326",
    "name": "COBERTURA DE CHOCOLATE",
    "price": 3
  },
  {
    "id": "ex-2069327",
    "name": "COBERTURA DE MORANGO",
    "price": 3
  },
  {
    "id": "ex-2069329",
    "name": "DOCE DE LEITE",
    "price": 4
  },
  {
    "id": "ex-2069331",
    "name": "LEITE CONDENSADO ZERO LACTOSE",
    "price": 4
  },
  {
    "id": "ex-2069321",
    "name": "LEITE EM PÓ ZERO LACTOSE",
    "price": 4
  },
  {
    "id": "ex-2069332",
    "name": "MEL",
    "price": 4
  },
  {
    "id": "ex-2069333",
    "name": "OVOMALTINE",
    "price": 6
  },
  {
    "id": "ex-2069334",
    "name": "BIS EXTRA AO LEITE",
    "price": 6
  },
  {
    "id": "ex-2069335",
    "name": "BIS EXTRA OREO",
    "price": 6
  },
  {
    "id": "ex-2069336",
    "name": "CONFETE",
    "price": 4
  },
  {
    "id": "ex-2069337",
    "name": "GOTAS DE CHOCOLATE",
    "price": 4
  },
  {
    "id": "ex-2069338",
    "name": "KINDER BARRINHA",
    "price": 6
  },
  {
    "id": "ex-2069339",
    "name": "KINDER BUENO AO LEITE",
    "price": 10
  },
  {
    "id": "ex-2069340",
    "name": "KINDER BUENO WHITE",
    "price": 10
  },
  {
    "id": "ex-2069341",
    "name": "KIT KAT AO LEITE",
    "price": 6
  },
  {
    "id": "ex-2069342",
    "name": "KIT KAT WHITE",
    "price": 6
  },
  {
    "id": "ex-2069343",
    "name": "OURO BRANCO",
    "price": 4
  },
  {
    "id": "ex-2069344",
    "name": "SONHO DE VALSA",
    "price": 4
  }
];
export const pizzaExtras = acaiExtras;

// Produtos do Cardápio
export const menuData: MenuItem[] = [
  {
    "id": "acai-1371881",
    "name": "COMBO MAGNÍFICO BROWNIE",
    "ingredients": "Açaí com nutella, mousse de ninho e pedacinhos de brownie.",
    "category": "novidades",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-1371881.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54163",
    "name": "COMBO NEVADO",
    "ingredients": "Açaí com leite condensado e leite em pó.",
    "category": "mais-vendidos",
    "priceSingle": 22,
    "priceP": 22,
    "priceM": 26,
    "priceG": 30,
    "priceBig": 38,
    "priceSuperBig": 48,
    "imageUrl": "/produtos/acai-54163.webp",
    "isBestseller": true
  },
  {
    "id": "acai-54181",
    "name": "COMBO FAVORITO",
    "ingredients": "Açaí com banana, morango, leite condensado e leite em pó.",
    "category": "mais-vendidos",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54181.webp",
    "isBestseller": true
  },
  {
    "id": "acai-54176",
    "name": "COMBO TROPICAL",
    "ingredients": "Açaí com banana, kiwi e morango.",
    "category": "mais-vendidos",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54176.webp",
    "isBestseller": true
  },
  {
    "id": "acai-54151",
    "name": "COMBO BRANCA DE NEVE",
    "ingredients": "Açaí com mousse de ninho, leite condensado e leite em pó.",
    "category": "mais-vendidos",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-54151.webp",
    "isBestseller": true
  },
  {
    "id": "acai-439358",
    "name": "COMBO SENSAÇÃO AVELÃ",
    "ingredients": "Açaí com nutella, leite condensado e leite em pó.",
    "category": "mais-vendidos",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-439358.webp",
    "isBestseller": true
  },
  {
    "id": "acai-56853",
    "name": "KIT 1 LITRO",
    "ingredients": "Descrição do kit: 1 litro de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de morangos selecionados.",
    "category": "kits-promocionais",
    "priceSingle": 49.9,
    "imageUrl": "/produtos/acai-56853.webp",
    "isBestseller": false
  },
  {
    "id": "acai-92071",
    "name": "KIT 2 LITROS",
    "ingredients": "Descrição do kit: 2 litros de açaí natural, 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de granola, 1 adicional de banana, 1 adicional de morangos selecionados.",
    "category": "kits-promocionais",
    "priceSingle": 79.9,
    "imageUrl": "/produtos/acai-92071.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1413950",
    "name": "KIT FESTA",
    "ingredients": "Descrição do kit: 3 litros de açaí natural, 1 adicional de morangos selecionados (copo 330ml), 1 adicional de banana (copo 330ml), 1 adicional de leite condensado, 1 adicional de leite em pó, 1 adicional de danoninho caseiro, 1 adicional de mousse de ninho, 1 adicional de granola, 1 adicional de confete.",
    "category": "kits-promocionais",
    "priceSingle": 129.9,
    "imageUrl": "/produtos/acai-1413950.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54319",
    "name": "330ML - COPO PEQUENO",
    "ingredients": "Copo de 330ml de açaí para montar do seu jeito: escolha os adicionais que quiser.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 16,
    "imageUrl": "/produtos/acai-54319.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54400",
    "name": "440ML - COPO MÉDIO",
    "ingredients": "Copo de 440ml de açaí para montar do seu jeito: escolha os adicionais que quiser.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-54400.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54401",
    "name": "550ML - COPO GRANDE",
    "ingredients": "Copo de 550ml de açaí para montar do seu jeito: escolha os adicionais que quiser.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 24,
    "imageUrl": "/produtos/acai-54401.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54402",
    "name": "770ML - COPO GIGANTE",
    "ingredients": "Copo de 770ml de açaí para montar do seu jeito: escolha os adicionais que quiser.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 32,
    "imageUrl": "/produtos/acai-54402.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54403",
    "name": "1 LITRO",
    "ingredients": "Pote de 1 litro de açaí para montar do seu jeito: escolha os adicionais que quiser.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 39.9,
    "imageUrl": "/produtos/acai-54403.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54404",
    "name": "2 LITROS",
    "ingredients": "Pote de 2 litros de açaí para montar do seu jeito, ideal para dividir.",
    "category": "monte-do-seu-jeito",
    "priceSingle": 76,
    "imageUrl": "/produtos/acai-54404.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352382",
    "name": "COMBO SENSAÇÃO ABACAXI",
    "ingredients": "Açaí com abacaxi, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352382.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352381",
    "name": "COMBO SENSAÇÃO BANANA",
    "ingredients": "Açaí com banana, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352381.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352385",
    "name": "COMBO SENSAÇÃO KIWI",
    "ingredients": "Açaí com leite condensado, leite em pó e kiwi importado.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352385.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54167",
    "name": "COMBO SENSAÇÃO MORANGO",
    "ingredients": "Açaí com morango, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54167.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352386",
    "name": "COMBO SENSAÇÃO UVA",
    "ingredients": "Açaí com leite condensado, leite em pó e uva verde sem semente.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352386.webp",
    "isBestseller": false
  },
  {
    "id": "acai-478904",
    "name": "COMBO DANONINHO ABACAXI",
    "ingredients": "Açaí com danoninho caseiro, leite em pó e abacaxi.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-478904.webp",
    "isBestseller": false
  },
  {
    "id": "acai-478901",
    "name": "COMBO DANONINHO BANANA",
    "ingredients": "Açaí com danoninho caseiro, leite em pó e banana.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-478901.webp",
    "isBestseller": false
  },
  {
    "id": "acai-478942",
    "name": "COMBO DANONINHO KIWI",
    "ingredients": "Açaí com danoninho caseiro, leite em pó e kiwi importado.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-478942.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54153",
    "name": "COMBO DANONINHO MORANGO",
    "ingredients": "Açaí com danoninho caseiro, leite em pó e morango.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-54153.webp",
    "isBestseller": false
  },
  {
    "id": "acai-478966",
    "name": "COMBO DANONINHO UVA",
    "ingredients": "Açaí com danoninho caseiro, leite em pó e uva verde sem semente.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-478966.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54164",
    "name": "COMBO NINHO",
    "ingredients": "Açaí com leite em pó e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-54164.webp",
    "isBestseller": false
  },
  {
    "id": "acai-478973",
    "name": "COMBO NINHO ABACAXI",
    "ingredients": "Açaí com mousse de ninho, leite em pó e abacaxi.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-478973.webp",
    "isBestseller": false
  },
  {
    "id": "acai-479052",
    "name": "COMBO NINHO BANANA",
    "ingredients": "Açaí com mousse de ninho, leite em pó e banana.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-479052.webp",
    "isBestseller": false
  },
  {
    "id": "acai-485900",
    "name": "COMBO NINHO KIWI",
    "ingredients": "Açaí com mousse de ninho, leite em pó e kiwi importado.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-485900.webp",
    "isBestseller": false
  },
  {
    "id": "acai-485909",
    "name": "COMBO NINHO MORANGO",
    "ingredients": "Açaí com mousse de ninho, leite em pó e morango.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-485909.webp",
    "isBestseller": false
  },
  {
    "id": "acai-485911",
    "name": "COMBO NINHO UVA",
    "ingredients": "Açaí com mousse de ninho, leite em pó e uva verde sem semente.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-485911.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352460",
    "name": "COMBO MAGNÍFICO ABACAXI",
    "ingredients": "Açaí com nutella, mousse de ninho e abacaxi.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-352460.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54175",
    "name": "COMBO MAGNÍFICO BANANA",
    "ingredients": "Açaí com nutella, mousse de ninho e banana.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-54175.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352462",
    "name": "COMBO MAGNÍFICO KIWI",
    "ingredients": "Açaí com nutella, mousse de ninho e kiwi importado.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-352462.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352463",
    "name": "COMBO MAGNÍFICO MORANGO",
    "ingredients": "Açaí com nutella, mousse de ninho e morango.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-352463.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352466",
    "name": "COMBO MAGNÍFICO UVA",
    "ingredients": "Açaí com nutella, mousse de ninho e uva verde sem semente.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-352466.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352489",
    "name": "COMBO TRADICIONAL ABACAXI",
    "ingredients": "Açaí com abacaxi, granola e mel.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352489.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352498",
    "name": "COMBO TRADICIONAL BANANA",
    "ingredients": "Açaí com banana, granola e mel.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352498.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352502",
    "name": "COMBO TRADICIONAL KIWI",
    "ingredients": "Açaí com kiwi importado, granola e mel.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352502.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54162",
    "name": "COMBO TRADICIONAL MORANGO",
    "ingredients": "Açaí com morango, granola e mel.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54162.webp",
    "isBestseller": false
  },
  {
    "id": "acai-352504",
    "name": "COMBO TRADICIONAL UVA",
    "ingredients": "Açaí com uva verde sem semente, granola e mel.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-352504.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54168",
    "name": "COMBO SENSAÇÃO AMENDOIM",
    "ingredients": "Açaí com amendoim, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54168.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54170",
    "name": "COMBO SENSAÇÃO GRANOLA",
    "ingredients": "Açaí com granola, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54170.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54172",
    "name": "COMBO SENSAÇÃO PAÇOCA",
    "ingredients": "Açaí com paçoca, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54172.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54171",
    "name": "COMBO SENSAÇÃO OVOMALTINE",
    "ingredients": "Açaí com ovomaltine, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54171.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54148",
    "name": "COMBO BANOFFEE",
    "ingredients": "Açaí com bolacha maizena triturada, banana, doce de leite e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 26,
    "priceP": 26,
    "priceM": 30,
    "priceG": 34,
    "priceBig": 42,
    "priceSuperBig": 52,
    "imageUrl": "/produtos/acai-54148.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54149",
    "name": "COMBO BIS AO LEITE",
    "ingredients": "Açaí com bis xtra ao leite e nutella.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54149.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54150",
    "name": "COMBO BIS OREO",
    "ingredients": "Açaí com bis xtra oreo e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54150.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54158",
    "name": "COMBO BUENO AO LEITE",
    "ingredients": "Açaí com kinder bueno ao leite e nutella.",
    "category": "combos-especiais",
    "priceSingle": 32,
    "priceP": 32,
    "priceM": 36,
    "priceG": 40,
    "priceBig": 48,
    "priceSuperBig": 58,
    "imageUrl": "/produtos/acai-54158.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54159",
    "name": "COMBO BUENO BRANCO",
    "ingredients": "Açaí com kinder bueno white e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 32,
    "priceP": 32,
    "priceM": 36,
    "priceG": 40,
    "priceBig": 48,
    "priceSuperBig": 58,
    "imageUrl": "/produtos/acai-54159.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54152",
    "name": "COMBO CHOCOBALL",
    "ingredients": "Açaí com chocoball, nutella e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 30,
    "priceP": 30,
    "priceM": 34,
    "priceG": 38,
    "priceBig": 46,
    "priceSuperBig": 56,
    "imageUrl": "/produtos/acai-54152.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54156",
    "name": "COMBO KIDS",
    "ingredients": "Açaí com confete e danoninho caseiro.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54156.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54157",
    "name": "COMBO KINDER",
    "ingredients": "Açaí com kinder barrinha, leite condensado e leite em pó.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54157.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54160",
    "name": "COMBO KIT KAT AO LEITE",
    "ingredients": "Açaí com kit kat ao leite e nutella.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54160.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54161",
    "name": "COMBO KIT KAT BRANCO",
    "ingredients": "Açaí com kit kat white e mouse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54161.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54174",
    "name": "COMBO TENTAÇÃO",
    "ingredients": "Açaí com calda de morango e mousse de ninho.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54174.webp",
    "isBestseller": false
  },
  {
    "id": "acai-808184",
    "name": "COMBO TENTAÇÃO 2",
    "ingredients": "Açaí com calda de morango e danoninho caseiro.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-808184.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54165",
    "name": "COMBO OVOMALTINE",
    "ingredients": "Açaí com cobertura de chocolate e ovomaltine.",
    "category": "combos-especiais",
    "priceSingle": 24,
    "priceP": 24,
    "priceM": 28,
    "priceG": 32,
    "priceBig": 40,
    "priceSuperBig": 50,
    "imageUrl": "/produtos/acai-54165.webp",
    "isBestseller": false
  },
  {
    "id": "acai-54177",
    "name": "COMBO TROPICAL ESPECIAL",
    "ingredients": "Açaí com abacaxi, banana, kiwi, morango e uva.",
    "category": "combos-especiais",
    "priceSingle": 28,
    "priceP": 28,
    "priceM": 32,
    "priceG": 36,
    "priceBig": 44,
    "priceSuperBig": 54,
    "imageUrl": "/produtos/acai-54177.webp",
    "isBestseller": false
  },
  {
    "id": "acai-410262",
    "name": "MILKSHAKE DE AÇAÍ 550ML",
    "ingredients": "Refrescância + cremosidade + energia = essa delícia aqui! Nosso milkshake de açaí é a combinação perfeita do sabor marcante do açaí com a cremosidade gelada que você ama.",
    "category": "milkshakes",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-410262.webp",
    "isBestseller": false
  },
  {
    "id": "acai-491982",
    "name": "MILKSHAKE DE CUPUAÇU 550ML",
    "ingredients": "Cremoso, gelado e com o azedinho tropical na medida. Refrescante, exótico e perfeito pra quem quer sair do óbvio.",
    "category": "milkshakes",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-491982.webp",
    "isBestseller": false
  },
  {
    "id": "acai-763012",
    "name": "MILKSHAKE DE CHOCOLATE 550ML",
    "ingredients": "O clássico que nunca falha pra matar a vontade de doce.",
    "category": "milkshakes",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-763012.webp",
    "isBestseller": false
  },
  {
    "id": "acai-410263",
    "name": "MILKSHAKE DE MORANGO 550ML",
    "ingredients": "Cremoso, gelado e com aquele sabor doce e levemente ácido que conquista fácil. Clássico, refrescante e impossível de errar.",
    "category": "milkshakes",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-410263.webp",
    "isBestseller": false
  },
  {
    "id": "acai-410267",
    "name": "MILKSHAKE DE PAÇOCA 550ML",
    "ingredients": "Cremoso, gelado e cheio de personalidade. Sabor intenso de amendoim com doce na medida certa pra quem ama um clássico brasileiro irresistível.",
    "category": "milkshakes",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-410267.webp",
    "isBestseller": false
  },
  {
    "id": "acai-453594",
    "name": "MILKSHAKE DE LEITE NINHO 550ML",
    "ingredients": "Cremoso, gelado e com aquele sabor suave e viciante que derrete na boca. Doce na medida certa pra quem ama um clássico irresistível.",
    "category": "milkshakes",
    "priceSingle": 22,
    "imageUrl": "/produtos/acai-453594.webp",
    "isBestseller": false
  },
  {
    "id": "acai-410264",
    "name": "MILKSHAKE DE OVOMALTINE 550ML",
    "ingredients": "Cremoso, gelado e com a crocância marcante que faz toda a diferença. Intenso, indulgente e simplesmente viciante.",
    "category": "milkshakes",
    "priceSingle": 22,
    "imageUrl": "/produtos/acai-410264.webp",
    "isBestseller": false
  },
  {
    "id": "acai-453595",
    "name": "MILKSHAKE DE NUTELLA 550ML",
    "ingredients": "Cremoso, gelado e absurdamente indulgente. Sabor intenso de chocolate com avelã pra quem não abre mão de um doce marcante e irresistível.",
    "category": "milkshakes",
    "priceSingle": 24,
    "imageUrl": "/produtos/acai-453595.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1120900",
    "name": "MILKSHAKE DE NINHO COM NUTELLA 550ML",
    "ingredients": "Cremoso, gelado e simplesmente perfeito. A suavidade do Ninho com o toque intenso da Nutella em uma combinação irresistível.",
    "category": "milkshakes",
    "priceSingle": 24,
    "imageUrl": "/produtos/acai-1120900.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1263308",
    "name": "MILKSHAKE DE NINHO COM MORANGO 550ML",
    "ingredients": "Cremoso, gelado e equilibrado na medida. A suavidade do Ninho com o frescor do morango em uma combinação leve e irresistível.",
    "category": "milkshakes",
    "priceSingle": 24,
    "imageUrl": "/produtos/acai-1263308.webp",
    "isBestseller": false
  },
  {
    "id": "acai-953067",
    "name": "MILKSHAKE DE DOCE DE LEITE COM PAÇOCA 550ML",
    "ingredients": "Cremoso, gelado e bem brasileiro. A doçura do doce de leite com o sabor intenso da paçoca em uma combinação rica e irresistível.",
    "category": "milkshakes",
    "priceSingle": 24,
    "imageUrl": "/produtos/acai-953067.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1422806",
    "name": "Leve 2 MilkShakes com Super Desconto",
    "ingredients": "Preço especial para o pedido em dupla!",
    "category": "milkshakes",
    "priceSingle": 39.9,
    "imageUrl": "/produtos/acai-1422806.webp",
    "isBestseller": false
  },
  {
    "id": "acai-453604",
    "name": "SUCO DE AÇAÍ 550ML",
    "ingredients": "Suco de açaí bem geladinho, copo de 550ml.",
    "category": "bebidas",
    "priceSingle": 10,
    "imageUrl": "/produtos/acai-453604.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1263223",
    "name": "SUCO DE AÇAÍ COM ABACAXI 550ML",
    "ingredients": "Suco de açaí com abacaxi bem geladinho, copo de 550ml.",
    "category": "bebidas",
    "priceSingle": 10,
    "imageUrl": "/produtos/acai-1263223.webp",
    "isBestseller": false
  },
  {
    "id": "acai-453609",
    "name": "SUCO DE AÇAÍ COM MORANGO 550ML",
    "ingredients": "Suco de açaí com morango bem geladinho, copo de 550ml.",
    "category": "bebidas",
    "priceSingle": 10,
    "imageUrl": "/produtos/acai-453609.webp",
    "isBestseller": false
  },
  {
    "id": "acai-500046",
    "name": "SUCO DE CUPUAÇU 550ML",
    "ingredients": "Suco de cupuaçu bem geladinho, copo de 550ml.",
    "category": "bebidas",
    "priceSingle": 10,
    "imageUrl": "/produtos/acai-500046.webp",
    "isBestseller": false
  },
  {
    "id": "acai-453637",
    "name": "SUCO DE MORANGO 550ML",
    "ingredients": "Suco de morango bem geladinho, copo de 550ml.",
    "category": "bebidas",
    "priceSingle": 10,
    "imageUrl": "/produtos/acai-453637.webp",
    "isBestseller": false
  },
  {
    "id": "acai-1263230",
    "name": "VITAMINA 550ML",
    "ingredients": "Açaí, banana, morango, leite condensado, leite em pó e leite integral.",
    "category": "bebidas",
    "priceSingle": 20,
    "imageUrl": "/produtos/acai-1263230.webp",
    "isBestseller": false
  },
  {
    "id": "acai-154813",
    "name": "ÁGUA MINERAL SEM GÁS",
    "ingredients": "Água mineral sem gás, geladinha.",
    "category": "bebidas",
    "priceSingle": 4,
    "imageUrl": "/produtos/acai-154813.webp",
    "isBestseller": false
  },
  {
    "id": "acai-154814",
    "name": "ÁGUA MINERAL COM GÁS",
    "ingredients": "Água mineral com gás, geladinha.",
    "category": "bebidas",
    "priceSingle": 4,
    "imageUrl": "/produtos/acai-154814.webp",
    "isBestseller": false
  },
  {
    "id": "acai-436274",
    "name": "COCA-COLA LATA",
    "ingredients": "Coca-Cola tradicional em lata, geladinha.",
    "category": "bebidas",
    "priceSingle": 6,
    "imageUrl": "/produtos/acai-436274.webp",
    "isBestseller": false
  },
  {
    "id": "acai-436275",
    "name": "GUARANÁ LATA",
    "ingredients": "Guaraná em lata, geladinho.",
    "category": "bebidas",
    "priceSingle": 6,
    "imageUrl": "/produtos/acai-436275.webp",
    "isBestseller": false
  },
  {
    "id": "acai-436276",
    "name": "SPRITE LATA",
    "ingredients": "Sprite em lata, geladinha.",
    "category": "bebidas",
    "priceSingle": 6,
    "imageUrl": "/produtos/acai-436276.webp",
    "isBestseller": false
  }
];

export const menuDoDia: MenuItem[] = [];
export const ALL_MENU_ITEMS: MenuItem[] = [...menuData];

// Aliases para compatibilidade total com os componentes existentes
export const menuCombos = menuData.filter(i => i.category === 'combos-especiais' || i.category === 'mais-vendidos');
export const menuMontar = menuData.filter(i => i.category === 'monte-do-seu-jeito');
export const menuKits = menuData.filter(i => i.category === 'kits-promocionais');
export const menuBebidas = menuData.filter(i => i.category === 'bebidas' || i.category === 'milkshakes');

export const menuPizzas = menuCombos;
export const menuEsfihas = menuMontar;
export const menuBordas = menuKits;
