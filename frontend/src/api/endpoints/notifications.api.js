import client from '../client'

export const getNotifications  = (params)  => client.get('/notifications', { params })
export const getUnreadCount     = ()        => client.get('/notifications/unread-count')
export const markNotificationRead = (id)    => client.post(`/notifications/${id}/read`)
export const markAllRead        = ()        => client.post('/notifications/read-all')
