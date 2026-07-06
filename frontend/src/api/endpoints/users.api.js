import client from '../client'

export const getUsers = () => client.get('/users')

export const createUser = (userData) => client.post('/users', userData)

export const updateUser = (id, data) => client.put(`/users/${id}`, data)

export const deleteUser = (id) => client.delete(`/users/${id}`)

export const getRegions = () => client.get('/regions')

export const createRegion = (data) => client.post('/regions', data)
