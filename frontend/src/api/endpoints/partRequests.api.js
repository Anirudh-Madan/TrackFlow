import client from '../client'

export const getPartRequests   = (params) => client.get('/part-requests', { params })
export const createPartRequest  = (data)   => client.post('/part-requests', data)
export const acknowledgeRequest = (id)     => client.post(`/part-requests/${id}/acknowledge`)
export const reorderRequest     = (id, data = {}) => client.post(`/part-requests/${id}/reorder`, data)
export const closeRequest       = (id)     => client.post(`/part-requests/${id}/close`)
