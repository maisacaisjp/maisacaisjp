#!/usr/bin/env node
/**
 * validate-menu.cjs
 * Valida integridade do cardápio: imagens, preços, categorias, duplicatas
 *
 * Uso: node .opencode/skills/crm-cardapio-digital/scripts/validate-menu.cjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Validando cardápio...\n');

  const { data: items, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;

  const issues = {
    missingImage: [],
    missingPrice: [],
    missingCategory: [],
    missingIngredients: [],
    duplicateNames: [],
    invalidPrice: [],
    pausedButActive: [],
    activeButNoStock: []
  };

  const nameCount = new Map();
  items.forEach(item => {
    const count = nameCount.get(item.name) || 0;
    nameCount.set(item.name, count + 1);
  });

  for (const item of items) {
    // Imagem
    if (!item.image_url || item.image_url === 'none') {
      issues.missingImage.push({ id: item.id, name: item.name });
    }

    // Preços
    const hasPrice = item.price_single || item.price_p || item.price_m || item.price_g;
    if (!hasPrice) {
      issues.missingPrice.push({ id: item.id, name: item.name });
    } else {
      const prices = [item.price_single, item.price_p, item.price_m, item.price_g].filter(Boolean);
      if (prices.some(p => p <= 0 || p > 500)) {
        issues.invalidPrice.push({ id: item.id, name: item.name, prices });
      }
    }

    // Categoria
    if (!item.category) {
      issues.missingCategory.push({ id: item.id, name: item.name });
    }

    // Ingredientes
    if (!item.ingredients || item.ingredients.trim() === '') {
      issues.missingIngredients.push({ id: item.id, name: item.name });
    }

    // Duplicatas
    if (nameCount.get(item.name) > 1) {
      issues.duplicateNames.push({ id: item.id, name: item.name });
    }
  }

  // Verifica paused_items vs menu_items
  const { data: paused } = await supabase
    .from('paused_items')
    .select('id');
  const pausedIds = new Set(paused?.map(p => p.id) || []);

  for (const item of items) {
    if (pausedIds.has(item.id) && item.is_active !== false) {
      issues.pausedButActive.push({ id: item.id, name: item.name });
    }
    if (!pausedIds.has(item.id) && item.is_active === false) {
      issues.activeButNoStock.push({ id: item.id, name: item.name });
    }
  }

  // Relatório
  console.log(`📦 Total de itens: ${items.length}\n`);

  let totalIssues = 0;
  for (const [key, list] of Object.entries(issues)) {
    if (list.length > 0) {
      console.log(`⚠️  ${key.replace(/([A-Z])/g, ' $1').trim()}: ${list.length}`);
      list.slice(0, 5).forEach(i => console.log(`   - ${i.name} (${i.id})`));
      if (list.length > 5) console.log(`   ... e mais ${list.length - 5}`);
      totalIssues += list.length;
    }
  }

  if (totalIssues === 0) {
    console.log('✅ Cardápio válido! Nenhum problema encontrado.');
  } else {
    console.log(`\n📊 Total de issues: ${totalIssues}`);
  }

  // Categorias únicas
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  console.log(`\n📂 Categorias (${categories.length}): ${categories.join(', ')}`);

  // Estatísticas de preço
  const pricedItems = items.filter(i => i.price_single || i.price_p || i.price_m || i.price_g);
  if (pricedItems.length > 0) {
    const prices = pricedItems.flatMap(i => [
      i.price_single, i.price_p, i.price_m, i.price_g
    ].filter(Boolean));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    console.log(`💰 Preços: Min R$${min.toFixed(2)} | Max R$${max.toFixed(2)} | Média R$${avg.toFixed(2)}`);
  }
}

main().catch(console.error);