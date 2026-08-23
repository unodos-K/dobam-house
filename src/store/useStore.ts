import { create } from 'zustand';

interface AppState {
  balance: number;
  setBalance: (amount: number) => void;
}

export const useStore = create<AppState>((set) => ({
  balance: 0,
  setBalance: (amount) => set({ balance: amount }),
}));
