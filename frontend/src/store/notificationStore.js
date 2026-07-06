import { create } from 'zustand'

export const useNotificationStore = create((set) => ({
  unreadCount: 0,

  setUnreadCount: (n) => set({ unreadCount: n }),

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  resetUnread: () => set({ unreadCount: 0 }),
}))
