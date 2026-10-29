import { MenuItem, ExtraIngredient } from './data/menu';
export type { MenuItem, ExtraIngredient };

export type ProductSize = 'P' | 'M' | 'G' | 'Big' | 'Super Big';
export type PizzaSize = ProductSize; // Compatibilidade com código existente

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  size?: ProductSize;
  isHalfAndHalf?: boolean;
  halfAndHalfFlavor?: MenuItem;
  quantity: number;
  notes?: string;
  extras?: ExtraIngredient[];
  priceCalculated: number;
}

export type DeliveryMethod = 'delivery' | 'pickup';

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  method: DeliveryMethod;
  neighborhood: string;
  address: string;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix';
  changeFor?: string;
  notes?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}
