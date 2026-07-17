import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../components/AppAlert';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  maxStock: number;
}

interface CartContextType {
  items: CartItem[];
  barbershopId: string | null;
  addItem: (item: Omit<CartItem, 'quantity'>, barbershopId: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@barberflow_cart';

interface PersistedCart {
  items: CartItem[];
  barbershopId: string | null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved: PersistedCart = JSON.parse(raw);
            if (Array.isArray(saved.items)) {
              setItems(saved.items);
              setBarbershopId(saved.barbershopId ?? null);
            }
          } catch {
            // Corrupted data — start fresh
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Persist cart whenever items or barbershopId change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedCart = { items, barbershopId };
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [items, barbershopId, hydrated]);

  const clearCart = useCallback(() => {
    setItems([]);
    setBarbershopId(null);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, shopId: string) => {
      // If cart has items from a different barbershop, ask to clear
      if (barbershopId && barbershopId !== shopId) {
        Alert.alert(
          'Carrito de otra tienda',
          'Tu carrito tiene productos de otra barberia. Quieres vaciarlo y agregar este producto?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Vaciar y agregar',
              onPress: () => {
                setItems([{ ...item, quantity: 1 }]);
                setBarbershopId(shopId);
              },
            },
          ],
        );
        return;
      }

      setBarbershopId(shopId);

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          if (existing.quantity >= item.maxStock) {
            Alert.alert('Stock limitado', `Solo hay ${item.maxStock} unidades disponibles.`);
            return prev;
          }
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    [barbershopId],
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      if (next.length === 0) setBarbershopId(null);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const clamped = Math.min(quantity, i.maxStock);
        return { ...i, quantity: clamped };
      }),
    );
  }, [removeItem]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      barbershopId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [items, barbershopId, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice],
  );

  // Muestra spinner mientras AsyncStorage hidrata el carrito (evita pantalla en blanco)
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
