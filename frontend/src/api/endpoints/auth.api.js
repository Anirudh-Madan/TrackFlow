import client from '../client'

export const login = (login_id, password) => {
  return client.post('/auth/login', { login_id, password })
}

export const logout = (refreshToken) => {
  return client.post('/auth/logout', { token: refreshToken })
}

export const changePassword = (currentPassword, newPassword) => {
  return client.post('/auth/change-password', { currentPassword, newPassword })
}
