#!/usr/bin/env node
/**
 * sync-images.cjs
 * Sincroniza imagens locais (public/) → Supabase Storage
 * Atualiza menu_items.imageUrl com a URL pública
 *
 * Uso: node .opencode/skills/crm-cardapio-digital/scripts/sync-images.cjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Precisa de service role para upload
);

const BUCKET = 'product-images';
const PUBLIC_DIR = path.resolve('public');
const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

async function main() {
  console.log('🔄 Iniciando sincronização de imagens...\n');

  // 1. Lista arquivos em public/
  const files = fs.readdirSync(PUBLIC_DIR)
    .filter(f => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .filter(f => f !== '.keep');

  console.log(`📁 ${files.length} imagens encontradas em public/\n`);

  // 2. Busca produtos no banco
  const { data: products, error } = await supabase
    .from('menu_items')
    .select('id, name, image_url')
    .neq('image_url', 'none');

  if (error) throw error;

  const productMap = new Map(products.map(p => [p.id, p]));
  let uploaded = 0, updated = 0, skipped = 0, errors = 0;

  for (const file of files) {
    const productId = path.parse(file).name; // ex: "1-alhoeoleo" → "1-alhoeoleo"
    const product = productMap.get(productId);

    if (!product) {
      console.log(`⚠️  Produto não encontrado no banco: ${productId}`);
      skipped++;
      continue;
    }

    const filePath = path.join(PUBLIC_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(path.extname(file));

    // 3. Upload para Supabase Storage
    const storagePath = `${productId}${path.extname(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`❌ Erro upload ${file}:`, uploadError.message);
      errors++;
      continue;
    }

    // 4. Pega URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    // 5. Atualiza menu_items se URL mudou
    if (product.image_url !== publicUrl) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) {
        console.error(`❌ Erro update ${productId}:`, updateError.message);
        errors++;
      } else {
        console.log(`✅ ${product.name} (${productId}) → ${publicUrl}`);
        updated++;
      }
    } else {
      console.log(`⏭️  ${product.name} (${productId}) - já atualizado`);
      skipped++;
    }
    uploaded++;
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Upload: ${uploaded}`);
  console.log(`   Atualizados no DB: ${updated}`);
  console.log(`   Pulados: ${skipped}`);
  console.log(`   Erros: ${errors}`);
  console.log('\n✨ Sincronização concluída!');
}

function getContentType(ext) {
  switch (ext.toLowerCase()) {
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

main().catch(console.error);