import client from '../client'

export const getPayments            = (params)   => client.get('/payments', { params })
export const createPayment          = (data)     => client.post('/payments', data)
export const updatePayment          = (id, data) => client.put(`/payments/${id}`, data)
export const getPaymentEditHistory  = (id)       => client.get(`/payments/${id}/edit-history`)
export const getDaywiseOutstandings = (params)   => client.get('/payments/daywise-outstandings', { params })
export const getPartyOutstanding    = (partyId)  => client.get(`/payments/outstanding/${partyId}`)
export const getPartyLedger         = (partyId, params) => client.get(`/payments/ledger/${partyId}`, { params })
export const getPaymentsByParty     = (partyId)  => client.get(`/payments/party/${partyId}`)
