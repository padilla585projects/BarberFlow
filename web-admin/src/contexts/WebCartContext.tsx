import { createContext, useContext, useState, ReactNode } from 'react'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  maxStock: number
}

interface WebCartContextType {
  items: CartItem[]
  barbershopId: string | null
  totalPrice: number
  addItem: (item: Omit<CartItem, 'quantity'>, barbershopId: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
}

const WebCartContext = createContext<WebCartContextType | null>(null)

export function WebCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [barbershopId, setBarbershopId] = useState<string | null>(null)

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const addItem = (item: Omit<CartItem, 'quantity'>, newBarbershopId: string) => {
    // Si hay items de otra barbería, preguntar si limpiar carrito
    if (barbershopId && barbershopId !== newBarbershopId && items.length > 0) {
      const confirm = window.confirm(
        'Tu carrito tiene productos de otra barbería. ¿Quieres vaciarlo y añadir este producto?'
      )
      if (!confirm) return
      setItems([{ ...item, quantity: 1 }])
      setBarbershopId(newBarbershopId)
      return
    }

    setBarbershopId(newBarbershopId)
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, item.maxStock)
        return prev.map(i => i.productId === item.productId ? { ...i, quantity: newQty } : i)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.productId !== productId)
      if (next.length === 0) setBarbershopId(null)
      return next
    })
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev =>
      prev.map(i => {
        if (i.productId !== productId) return i
        return { ...i, quantity: Math.min(qty, i.maxStock) }
      })
    )
  }

  const clearCart = () => {
    setItems([])
    setBarbershopId(null)
  }

  return (
    <WebCartContext.Provider value={{ items, barbershopId, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </WebCartContext.Provider>
  )
}

export function useWebCart(): WebCartContextType {
  const ctx = useContext(WebCartContext)
  if (!ctx) throw new Error('useWebCart debe usarse dentro de WebCartProvider')
  return ctx
}
