import client from '../client'

export const getSettings      = ()           => client.get('/settings')
export const setAdminPin      = (body)       => client.post('/settings/set-pin', body)
export const verifyAdminPin   = (body)       => client.post('/settings/verify-pin', body)
