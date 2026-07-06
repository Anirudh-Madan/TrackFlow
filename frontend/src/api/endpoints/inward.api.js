import client from '../client'

export const getInwards = (params) => client.get('/inward', { params })
export const getInwardDetails = (id) => client.get(`/inward/${id}`)
export const createInward = (data) => client.post('/inward', data)
