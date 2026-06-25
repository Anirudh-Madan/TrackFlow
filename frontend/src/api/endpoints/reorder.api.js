import client from '../client'

export const getReorders = (params) => client.get('/reorder', { params })
export const updateReorderStatus = (id, status) => client.put(`/reorder/${id}/status`, { status })
export const createReorderFlag = (data) => client.post('/reorder', data)
