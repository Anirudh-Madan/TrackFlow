import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { attachRefreshInterceptor } from './interceptors/refreshInterceptor'

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
  (error) => Promise.reject(error)
)

// Response Interceptor: Auto-refresh on 401 before forcing logout
attachRefreshInterceptor(client)

export default client
