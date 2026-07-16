import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,           // { id, name, role, role_id, permissions: string[] }
      accessToken: null,
      isAuthenticated: false,

      setUser: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
        }),

      updateToken: (accessToken) => set({ accessToken }),

      /** Update the permissions array (e.g. after admin changes them) */
      updatePermissions: (permissions) =>
        set((state) => ({
          user: state.user ? { ...state.user, permissions } : state.user,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),

      /**
       * Returns true if the current user has the given permission key.
       * Admin bypass: if user has the wildcard 'settings.manage' and is admin
       * this is handled by full permission seeding — no special cases in code.
       */
      hasPermission: (code) => {
        const { user } = get()
        if (!user || !user.permissions) return false
        return user.permissions.includes(code)
      },

      /** Returns true if user has ALL of the given permission keys */
      hasAllPermissions: (...codes) => {
        const { user } = get()
        if (!user || !user.permissions) return false
        return codes.every((code) => user.permissions.includes(code))
      },

      /** Returns true if user has ANY of the given permission keys */
      hasAnyPermission: (...codes) => {
        const { user } = get()
        if (!user || !user.permissions) return false
        return codes.some((code) => user.permissions.includes(code))
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
