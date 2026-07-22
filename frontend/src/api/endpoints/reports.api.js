import client from '../client'

export const getSalesReport    = (params) => client.get('/reports/sales',         { params }).then(r => r.data)
export const getBelowDlReport  = (params) => client.get('/reports/below-dl',      { params }).then(r => r.data)
export const getStockReport    = ()       => client.get('/reports/stock').then(r => r.data)
export const getSalesmanWise   = (params) => client.get('/reports/salesman-wise',  { params }).then(r => r.data)
export const getPartyWise      = (params) => client.get('/reports/party-wise',     { params }).then(r => r.data)
export const getSupplierWise   = (params) => client.get('/reports/supplier-wise',  { params }).then(r => r.data)
export const getActivityLog    = (params) => client.get('/reports/activity-log',   { params }).then(r => r.data)
export const getAiInsight      = (body)   => client.post('/reports/ai-insight',    body).then(r => r.data)
