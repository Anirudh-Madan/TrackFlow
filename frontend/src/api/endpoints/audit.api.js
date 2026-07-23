import client from '../client'

export const getAuditLogs = (params) => client.get('/reports/activity-log', { params })
