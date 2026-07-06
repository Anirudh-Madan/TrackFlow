import client from '../client'

export const getRegions  = () => client.get('/regions')
export const createRegion = (data) => client.post('/regions', data)
export const updateRegion = (id, data) => client.put(`/regions/${id}`, data)
export const deleteRegion = (id) => client.delete(`/regions/${id}`)
