import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,           // { id, name, email, role, permissions: string[] }
      accessToken: null,
      isAuthenticated: false,

      setUser: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
        }),

      updateToken: (accessToken) => set({ accessToken }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),

      hasPermission: (code) => {
        const { user } = get()
        if (!user || !user.permissions) return false
        return user.permissions.includes(code)
      },
    }),
    {
      name: 'trackflow-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
