import { supabase } from '../lib/supabase';
import { Ingredient, ProductRecipe, CMVSummary, PurchaseUnit, UsageUnit } from '../types/recipe';

const INGREDIENTS_STORAGE_KEY = 'maisacai_recipe_ingredients';
const RECIPES_STORAGE_KEY = 'maisacai_product_recipes';

// Insumos iniciais do Mais Açaí. Os custos começam zerados: informe o preço de compra
// de cada insumo na aba "Insumos" para o CMV ser calculado.
export const DEFAULT_INGREDIENTS: Ingredient[] = [
  { id: 'ing-acai', name: 'Polpa de Açaí', category: 'acai', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-cupuacu', name: 'Polpa de Cupuaçu', category: 'acai', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-morango', name: 'Morango', category: 'frutas', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-banana', name: 'Banana', category: 'frutas', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-uva', name: 'Uva Verde sem Semente', category: 'frutas', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-kiwi', name: 'Kiwi', category: 'frutas', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-nutella', name: 'Nutella', category: 'cremes', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-mousse-ninho', name: 'Mousse de Ninho', category: 'cremes', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-leite-condensado', name: 'Leite Condensado', category: 'laticinios', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-leite-po', name: 'Leite em Pó', category: 'laticinios', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-granola', name: 'Granola', category: 'complementos', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-pacoca', name: 'Paçoca', category: 'complementos', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-calda-morango', name: 'Calda de Morango', category: 'caldas', purchase_unit: 'l', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'ml', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-mel', name: 'Mel', category: 'caldas', purchase_unit: 'kg', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'g', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-copo-330', name: 'Copo 330ml + Tampa', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-copo-440', name: 'Copo 440ml + Tampa', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-copo-550', name: 'Copo 550ml + Tampa', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-copo-770', name: 'Copo 770ml + Tampa', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-pote-1l', name: 'Pote 1 Litro + Tampa', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
  { id: 'ing-colher', name: 'Colher Descartável', category: 'embalagens', purchase_unit: 'un', purchase_cost: 0, purchase_quantity: 1, usage_unit: 'un', cost_per_usage_unit: 0, notes: 'Informe o custo de compra' },
];

// Nenhuma ficha técnica vem pronta: cadastre as receitas dos produtos na aba "Fichas Técnicas".
export const DEFAULT_RECIPES: ProductRecipe[] = [];

export const recipeService = {
  // Converte preço de compra em custo unitário de uso
  calculateCostPerUsageUnit(
    purchaseCost: number,
    purchaseQuantity: number,
    purchaseUnit: PurchaseUnit,
    usageUnit: UsageUnit
  ): number {
    if (!purchaseQuantity || purchaseQuantity <= 0) return 0;
    
    // Normalização para Gramas (g)
    if (usageUnit === 'g') {
      if (purchaseUnit === 'kg') {
        const totalGrams = purchaseQuantity * 1000;
        return Number((purchaseCost / totalGrams).toFixed(5));
      }
      if (purchaseUnit === 'g') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Normalização para Mililitros (ml)
    if (usageUnit === 'ml') {
      if (purchaseUnit === 'l') {
        const totalMl = purchaseQuantity * 1000;
        return Number((purchaseCost / totalMl).toFixed(5));
      }
      if (purchaseUnit === 'ml') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Unidades diretas
    return Number((purchaseCost / purchaseQuantity).toFixed(5));
  },

  // Busca lista de insumos com persistência Supabase + Fallback
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data));
        return data as Ingredient[];
      }
    } catch (e) {
      console.warn('Tabela recipe_ingredients indisponível no Supabase, tentando settings...', e);
    }

    // Fallback: busca de settings no Supabase
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'recipe_ingredients_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as Ingredient[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(DEFAULT_INGREDIENTS));
    return DEFAULT_INGREDIENTS;
  },

  // Salva ou atualiza um insumo
  async saveIngredient(ingredient: Partial<Ingredient>): Promise<Ingredient> {
    const costPerUsage = this.calculateCostPerUsageUnit(
      Number(ingredient.purchase_cost || 0),
      Number(ingredient.purchase_quantity || 1),
      ingredient.purchase_unit || 'kg',
      ingredient.usage_unit || 'g'
    );

    const fullIngredient: Ingredient = {
      id: ingredient.id || `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: ingredient.name || 'Novo Insumo',
      category: ingredient.category || 'outros',
      purchase_unit: ingredient.purchase_unit || 'kg',
      purchase_cost: Number(ingredient.purchase_cost || 0),
      purchase_quantity: Number(ingredient.purchase_quantity || 1),
      usage_unit: ingredient.usage_unit || 'g',
      cost_per_usage_unit: costPerUsage,
      supplier: ingredient.supplier || '',
      current_stock: ingredient.current_stock !== undefined ? Number(ingredient.current_stock) : undefined,
      notes: ingredient.notes || '',
      updated_at: new Date().toISOString()
    };

    // 1. Tenta salvar na tabela específica
    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .upsert(fullIngredient, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    // 2. Atualiza estado em cache e settings
    const currentList = await this.getIngredients();
    const existingIndex = currentList.findIndex(i => i.id === fullIngredient.id);
    let updatedList: Ingredient[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullIngredient;
    } else {
      updatedList = [...currentList, fullIngredient];
    }

    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'recipe_ingredients_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar insumos em settings:', err);
      }
    }

    return fullIngredient;
  },

  // Exclui um insumo
  async deleteIngredient(id: string): Promise<boolean> {
    try {
      await supabase.from('recipe_ingredients').delete().eq('id', id);
    } catch {}

    const currentList = await this.getIngredients();
    const updatedList = currentList.filter(i => i.id !== id);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'recipe_ingredients_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Busca fichas técnicas
  async getRecipes(): Promise<ProductRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('product_name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data));
        return data as ProductRecipe[];
      }
    } catch (e) {
      console.warn('Tabela product_recipes indisponível no Supabase, tentando settings...', e);
    }

    // Fallback Settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'product_recipes_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as ProductRecipe[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(DEFAULT_RECIPES));
    return DEFAULT_RECIPES;
  },

  // Salva ficha técnica
  async saveRecipe(recipe: Partial<ProductRecipe>): Promise<ProductRecipe> {
    const fullRecipe: ProductRecipe = {
      id: recipe.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: recipe.product_id || '',
      product_name: recipe.product_name || 'Produto',
      size: recipe.size || 'G',
      items: recipe.items || [],
      packaging_cost: Number(recipe.packaging_cost ?? 0.65),
      fixed_overhead: Number(recipe.fixed_overhead ?? 0.40),
      notes: recipe.notes || '',
      updated_at: new Date().toISOString()
    };

    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('product_recipes')
        .upsert(fullRecipe, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    const currentList = await this.getRecipes();
    const existingIndex = currentList.findIndex(r => r.id === fullRecipe.id);
    let updatedList: ProductRecipe[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullRecipe;
    } else {
      updatedList = [...currentList, fullRecipe];
    }

    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'product_recipes_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar fichas em settings:', err);
      }
    }

    return fullRecipe;
  },

  // Exclui ficha técnica
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      await supabase.from('product_recipes').delete().eq('id', id);
    } catch {}

    const currentList = await this.getRecipes();
    const updatedList = currentList.filter(r => r.id !== id);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'product_recipes_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Calcula custos, CMV e Margens de uma ficha técnica
  calculateRecipeSummary(
    recipe: ProductRecipe,
    ingredientsMap: Record<string, Ingredient>,
    salePrice: number
  ): CMVSummary {
    let ingredientsCost = 0;

    for (const it of recipe.items || []) {
      const ing = ingredientsMap[it.ingredient_id];
      if (ing) {
        const cost = (ing.cost_per_usage_unit || 0) * (it.quantity || 0);
        ingredientsCost += cost;
      }
    }

    const packagingCost = Number(recipe.packaging_cost || 0);
    const fixedOverhead = Number(recipe.fixed_overhead || 0);
    const totalCost = ingredientsCost + packagingCost + fixedOverhead;

    const price = Number(salePrice || 0);
    const grossMargin = price > 0 ? price - totalCost : 0;
    const cmvPercent = price > 0 ? Number(((totalCost / price) * 100).toFixed(1)) : 0;
    const marginPercent = price > 0 ? Number((100 - cmvPercent).toFixed(1)) : 0;

    let healthStatus: 'optimal' | 'warning' | 'alert' = 'optimal';
    if (cmvPercent > 38) {
      healthStatus = 'alert';
    } else if (cmvPercent >= 30) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'optimal';
    }

    // Preço ideal para 30% de CMV (Custo / 0.30)
    const targetPrice30 = totalCost > 0 ? Number((totalCost / 0.30).toFixed(2)) : 0;

    return {
      recipe,
      sale_price: price,
      ingredients_cost: Number(ingredientsCost.toFixed(2)),
      packaging_cost: Number(packagingCost.toFixed(2)),
      fixed_overhead: Number(fixedOverhead.toFixed(2)),
      total_cost: Number(totalCost.toFixed(2)),
      gross_margin: Number(grossMargin.toFixed(2)),
      cmv_percent: cmvPercent,
      margin_percent: marginPercent,
      health_status: healthStatus,
      target_price_30: targetPrice30
    };
  }
};
