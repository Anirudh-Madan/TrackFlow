import client from '../client'

export const getPendingOrders = () => client.get('/orders/pending')
export const getOrderDetails  = (id) => client.get(`/orders/${id}`)
export const approveOrder     = (id) => client.post(`/orders/${id}/approve`)
export const flagOrder        = (id, reason) => client.post(`/orders/${id}/flag`, { reason })
export const returnOrder      = (id, reason) => client.post(`/orders/${id}/return`, { reason })
export const getOrders        = (params) => client.get('/orders', { params })
export const createOrder      = (data) => client.post('/orders', data)
