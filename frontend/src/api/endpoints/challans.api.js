import client from '../client'

export const getChallans          = ()          => client.get('/challans')
export const getChallanById       = (id)        => client.get(`/challans/${id}`)
export const getChallanEditHistory= (id)        => client.get(`/challans/${id}/edit-history`)
export const createChallan        = (body)      => client.post('/challans', body)
export const updateChallan        = (id, body)  => client.put(`/challans/${id}`, body)
export const deleteChallan        = (id, body)  => client.delete(`/challans/${id}`, { data: body })
export const returnChallan        = (id, body)  => client.post(`/challans/${id}/return`, body)
export const checkPartAvailability= (sku)       => client.get(`/challans/check-part?sku=${encodeURIComponent(sku)}`)
export const setBillNumber       = (id, body)  => client.patch(`/challans/${id}/bill-number`, body)
export const approveChallan       = (id, body)  => client.post(`/challans/${id}/approve`, body)
export const getPublicChallan     = (token)     => client.get(`/challans/public/${token}`)
