import client from '../client'

export const getUsers = () => {
  return client.get('/users')
}

export const createUser = (userData) => {
  return client.post('/users', userData)
}
