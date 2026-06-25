import client from '../client'

export const getChallans = (params) => client.get('/challans', { params })
export const getChallanDetails = (id) => client.get(`/challans/${id}`)
