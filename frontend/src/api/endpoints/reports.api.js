import client from '../client'

export const getSalesReport     = (params) => client.get('/reports/sales',         { params })
export const getBelowDlReport   = (params) => client.get('/reports/below-dl',      { params })
export const getStockReport     = ()       => client.get('/reports/stock')
export const getSalesmanWise        = (params) => client.get('/reports/salesman-wise',  { params })
export const getSalesmanReport      = (params) => client.get('/reports/salesman-wise',  { params })
export const getSalespersonDetail   = (params) => client.get('/reports/salesman-detail', { params })
export const getPartyWise       = (params) => client.get('/reports/party-wise',     { params })
export const getSupplierWise    = (params) => client.get('/reports/supplier-wise',  { params })
export const getSupplierDetail  = (params) => client.get('/reports/supplier-detail', { params })
export const getActivityLog     = (params) => client.get('/reports/activity-log',   { params })
export const getPartHistory     = (params) => client.get('/reports/part-history',      { params })
export const getPartSuggestions  = (params) => client.get('/reports/part-suggestions',  { params })
export const getStockMovement   = (params) => client.get('/reports/stock-movement',     { params })
export const getVelocityMinStock = (params) => client.get('/reports/velocity-min-stock', { params })
export const updateMinStock      = (body)   => client.post('/reports/update-min-stock',   body)
export const getAiInsight       = (body)   => client.post('/reports/ai-insight',        body)



