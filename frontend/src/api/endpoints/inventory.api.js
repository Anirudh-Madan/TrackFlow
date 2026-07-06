import client from '../client'

// Stock Summary
export const getStockSummary   = (params) => client.get('/inventory/stock', { params })
export const getLowStock       = ()        => client.get('/inventory/stock/low')

// Transactions (immutable ledger)
export const getTransactions   = (params) => client.get('/inventory/transactions', { params })

// Damaged Stock
export const getDamaged        = (params) => client.get('/inventory/damaged', { params })
export const recordDamage      = (data)   => client.post('/inventory/damaged', data)

// Adjustments
export const getAdjustments    = (params) => client.get('/inventory/adjustments', { params })
export const createAdjustment  = (data)   => client.post('/inventory/adjustments', data)

// Reorder
export const placeReorder      = (data)   => client.post('/inventory/reorder', data)
