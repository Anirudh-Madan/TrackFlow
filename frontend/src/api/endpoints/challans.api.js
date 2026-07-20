import client from '../client'

export const getChallans          = ()          => client.get('/challans').then(r => r.data)
export const getChallanById       = (id)        => client.get(`/challans/${id}`).then(r => r.data)
export const getChallanEditHistory= (id)        => client.get(`/challans/${id}/edit-history`).then(r => r.data)
export const createChallan        = (body)      => client.post('/challans', body).then(r => r.data)
export const updateChallan        = (id, body)  => client.put(`/challans/${id}`, body).then(r => r.data)
export const deleteChallan        = (id, body)  => client.delete(`/challans/${id}`, { data: body }).then(r => r.data)
export const returnChallan        = (id, body)  => client.post(`/challans/${id}/return`, body).then(r => r.data)
export const checkPartAvailability= (sku)       => client.get(`/challans/check-part?sku=${encodeURIComponent(sku)}`).then(r => r.data)
export const getPublicChallan     = (token)     => client.get(`/challans/public/${token}`).then(r => r.data)
