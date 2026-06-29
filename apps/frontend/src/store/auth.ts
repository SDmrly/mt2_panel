import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (a: { accessToken: string; refreshToken: string; user: User }) => void;
  setAccess: (t: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
  setAccess: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
