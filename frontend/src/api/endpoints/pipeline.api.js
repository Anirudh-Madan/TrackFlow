import client from '../client'

// ── Reads ────────────────────────────────────────────────────────────────────
export const getPipelines       = (params)  => client.get('/pipeline', { params })
export const getPipelineById     = (id)       => client.get(`/pipeline/${id}`)
export const getPipelineStats     = ()         => client.get('/pipeline/stats')
export const getDispatchWorkers   = ()         => client.get('/pipeline/workers')
export const getPendingApproval   = ()         => client.get('/pipeline/pending-approval')
export const getAvailableParts    = (orderId)  => client.get(`/pipeline/order/${orderId}/available-parts`)

// ── Stage transitions ────────────────────────────────────────────────────────
export const adminApprove   = (order_id)     => client.post('/pipeline/admin-approve', { order_id })
export const imApprove      = (id, data)     => client.post(`/pipeline/${id}/im-approve`, data)
export const quickAssignWorker = (orderId, dw_id) => client.post(`/pipeline/order/${orderId}/assign-worker`, { dw_id })
export const startDelivery  = (id, data = {})=> client.post(`/pipeline/${id}/start-delivery`, data)
export const markDelivered  = (id)           => client.post(`/pipeline/${id}/deliver`)
export const fulfill        = (id, data = {})=> client.post(`/pipeline/${id}/fulfill`, data)
export const rejectPipeline = (id, reason)   => client.post(`/pipeline/${id}/reject`, { reason })
