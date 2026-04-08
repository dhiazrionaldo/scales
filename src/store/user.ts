import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
  warehouse: string | null;
  setWarehouse: (warehouse: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  userRole: null,
  setUserRole: (userRole) => set({ userRole }),
  warehouse: null,
  setWarehouse: (warehouse) => set({ warehouse }),
}));
