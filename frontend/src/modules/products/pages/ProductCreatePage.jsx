import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProductCreatePage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/products', { replace: true }) }, [navigate])
  return null
}
