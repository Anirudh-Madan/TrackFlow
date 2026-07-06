import client from '../client'

export const getAnalyticsOverview = () => client.get('/analytics/overview')
export const getPipelineFlow       = () => client.get('/analytics/flow')
