import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Inject JWT token
client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Handle 401 / token expiration
client.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired, force logout
      useAuthStore.getState().logout()
    }
    const message = error.response?.data?.error || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default client
