import client from '../client'

export const getSettings      = ()           => client.get('/settings').then(r => r.data)
export const setAdminPin      = (body)       => client.post('/settings/set-pin', body).then(r => r.data)
export const verifyAdminPin   = (body)       => client.post('/settings/verify-pin', body).then(r => r.data)
