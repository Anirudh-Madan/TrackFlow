import client from '../client'

export const getPurchaseOrders  = ()     => client.get('/purchase-orders')
export const createPurchaseOrder = (data) => client.post('/purchase-orders', data)
export const getOrderItems       = ()     => client.get('/purchase-orders/order-items')
