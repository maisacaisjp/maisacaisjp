import { ALL_MENU_ITEMS } from '../data/menu';

export function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/æ/g, 'ae')
    .replace(/ç/g, 'c')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/ñ/g, 'n')
    .replace(/[òóôõö]/g, 'o')
    .replace(/œ/g, 'oe')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function findImageForProduct(item: { name: string; category?: string; id?: string; imageUrl?: string; image_url?: string }): string | null {
  // 1. Se o próprio item já possui imageUrl ou image_url cadastrada (do Supabase/Admin), retorna ela diretamente!
  const directUrl = (item as any)?.imageUrl || (item as any)?.image_url;
  if (directUrl && directUrl !== 'none') {
    if (directUrl.startsWith('http') || directUrl.startsWith('data:') || directUrl.startsWith('/')) {
      return directUrl;
    }
    return `/${directUrl}`;
  }

  // 2. Procura nos itens do menu padrão pelo ID
  if (item?.id) {
    const hardcodedItem = ALL_MENU_ITEMS.find(i => i.id === item.id);
    if (hardcodedItem && hardcodedItem.imageUrl && hardcodedItem.imageUrl !== 'none') {
      const fileName = hardcodedItem.imageUrl.replace(/^\//, '');
      if (fileName.startsWith('http') || fileName.startsWith('data:')) return fileName;
      return `/${fileName}`;
    }
  }

  // 3. Fallback inteligente pelo nome do produto
  if (item?.name) {
    const hardcodedByName = ALL_MENU_ITEMS.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
    if (hardcodedByName && hardcodedByName.imageUrl && hardcodedByName.imageUrl !== 'none') {
      const fileName = hardcodedByName.imageUrl.replace(/^\//, '');
      if (fileName.startsWith('http') || fileName.startsWith('data:')) return fileName;
      return `/${fileName}`;
    }
  }

  return null;
}
