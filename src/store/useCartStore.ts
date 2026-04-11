import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  weight: string;
  imageUrl: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, weight: string) => void;
  updateQuantity: (productId: string, weight: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === item.productId && i.weight === item.weight);
        if (existing) {
          if (existing.quantity + item.quantity <= item.stock) {
            set({ items: items.map((i) => (i.productId === item.productId && i.weight === item.weight) ? { ...i, quantity: i.quantity + item.quantity } : i) });
          }
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (productId, weight) => set({ items: get().items.filter((i) => !(i.productId === productId && i.weight === weight)) }),
      updateQuantity: (productId, weight, quantity) => set({
        items: get().items.map((i) => (i.productId === productId && i.weight === weight) ? { ...i, quantity } : i)
      }),
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    { name: 'asc-cart' }
  )
);
