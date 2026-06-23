import axios from 'axios'
import { useAuthStore } from '../../store/authStore'

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  failedQueue = []
}

export function attachRefreshInterceptor(client) {
  client.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const orig = error.config

      if (error.response?.status !== 401 || orig._retry) {
        const msg = error.response?.data?.error || error.message || 'Something went wrong'
        return Promise.reject(new Error(msg))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            orig.headers.Authorization = `Bearer ${token}`
            return client(orig)
          })
          .catch((err) => Promise.reject(err))
      }

      orig._retry = true
      isRefreshing = true

      const storedToken = localStorage.getItem('trackflow-refresh-token')
      if (!storedToken) {
        isRefreshing = false
        useAuthStore.getState().logout()
        return Promise.reject(new Error('Session expired'))
      }

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { token: storedToken })
        const { accessToken, refreshToken } = data.data

        useAuthStore.getState().updateToken(accessToken)
        localStorage.setItem('trackflow-refresh-token', refreshToken)

        orig.headers.Authorization = `Bearer ${accessToken}`
        processQueue(null, accessToken)
        return client(orig)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().logout()
        return Promise.reject(new Error('Session expired, please log in again'))
      } finally {
        isRefreshing = false
      }
    }
  )
}
