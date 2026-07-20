import client from '../client'

export const getPurchaseOrders     = ()          => client.get('/purchase-orders').then(r => r.data)
export const getPurchaseOrderById  = (id)        => client.get(`/purchase-orders/${id}`).then(r => r.data)
export const getPOEditHistory      = (id)        => client.get(`/purchase-orders/${id}/edit-history`).then(r => r.data)
export const createPurchaseOrder   = (body)      => client.post('/purchase-orders', body).then(r => r.data)
export const updatePurchaseOrder   = (id, body)  => client.put(`/purchase-orders/${id}`, body).then(r => r.data)
export const deletePurchaseOrder   = (id, body)  => client.delete(`/purchase-orders/${id}`, { data: body }).then(r => r.data)
export const returnPurchaseOrder   = (id, body)  => client.post(`/purchase-orders/${id}/return`, body).then(r => r.data)
export const getOrderItems         = ()          => client.get('/purchase-orders/order-items').then(r => r.data)
