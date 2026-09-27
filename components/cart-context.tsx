"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { EXTRA_PRICES, FLOWER_PRICES, type ExtraId, type FlowerId, type WrapId } from "@/data/catalog";

export type { ExtraId, FlowerId, WrapId } from "@/data/catalog";
export { CART_LABELS, FLOWER_PRICES } from "@/data/catalog";

type CartState = {
  wrap: WrapId | null;
  flowers: Record<FlowerId, number>;
  extras: Record<ExtraId, boolean>;
};

type CartContextValue = CartState & {
  hydrated: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  selectWrap: (id: WrapId) => void;
  changeFlower: (id: FlowerId, delta: number) => void;
  toggleExtra: (id: ExtraId) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
};

const initialState: CartState = {
  wrap: "gold",
  flowers: { dahlia: 1, aster: 1, hydrangea: 0, eucalyptus: 1, rose: 0, lily: 0 },
  extras: { companion: false, chocolate: false, protector: false },
};

const emptyState: CartState = {
  wrap: null,
  flowers: { dahlia: 0, aster: 0, hydrangea: 0, eucalyptus: 0, rose: 0, lily: 0 },
  extras: { companion: false, chocolate: false, protector: false },
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(initialState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("rizalys-cart") ?? window.localStorage.getItem("fleurs-exception-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<CartState>;
        setState({
          ...initialState,
          ...parsed,
          flowers: { ...initialState.flowers, ...parsed.flowers },
          extras: { ...initialState.extras, ...parsed.extras },
        });
      } catch { /* keep a clean cart */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("rizalys-cart", JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = Object.values(state.flowers).reduce((a, b) => a + b, 0)
      + Object.values(state.extras).filter(Boolean).length + (state.wrap ? 1 : 0);
    const total = (Object.entries(state.flowers) as [FlowerId, number][]).reduce((sum, [id, qty]) => sum + FLOWER_PRICES[id] * qty, 0)
      + (Object.entries(state.extras) as [ExtraId, boolean][]).reduce((sum, [id, active]) => sum + (active ? EXTRA_PRICES[id] : 0), 0);
    return {
      ...state, hydrated, drawerOpen, setDrawerOpen,
      selectWrap: (id) => setState((current) => ({ ...current, wrap: id })),
      changeFlower: (id, delta) => setState((current) => ({ ...current, flowers: { ...current.flowers, [id]: Math.max(0, current.flowers[id] + delta) } })),
      toggleExtra: (id) => setState((current) => ({ ...current, extras: { ...current.extras, [id]: !current.extras[id] } })),
      clearCart: () => setState(emptyState), itemCount, total,
    };
  }, [state, hydrated, drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
