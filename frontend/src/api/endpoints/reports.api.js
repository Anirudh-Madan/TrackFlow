import client from '../client'

export const getSalesReport   = (params) => client.get('/reports/sales',    { params })
export const getBelowDlReport = (params) => client.get('/reports/below-dl', { params })
export const getStockReport   = ()       => client.get('/reports/stock')
