import client from '../client'

export const getPurchaseOrders     = ()          => client.get('/purchase-orders')
export const getPurchaseOrderById  = (id)        => client.get(`/purchase-orders/${id}`)
export const getPOEditHistory      = (id)        => client.get(`/purchase-orders/${id}/edit-history`)
export const createPurchaseOrder   = (body)      => client.post('/purchase-orders', body)
export const updatePurchaseOrder   = (id, body)  => client.put(`/purchase-orders/${id}`, body)
export const deletePurchaseOrder   = (id, body)  => client.delete(`/purchase-orders/${id}`, { data: body })
export const returnPurchaseOrder   = (id, body)  => client.post(`/purchase-orders/${id}/return`, body)
export const getOrderItems         = ()          => client.get('/purchase-orders/order-items')
