import client from '../client'

// Customers API
export const getCustomers   = () => client.get('/customers')
export const createCustomer = (data) => client.post('/customers', data)
export const updateCustomer = (id, data) => client.put(`/customers/${id}`, data)
export const deleteCustomer = (id) => client.delete(`/customers/${id}`)

// Vendors API
export const getVendors   = () => client.get('/vendors')
export const createVendor = (data) => client.post('/vendors', data)
export const updateVendor = (id, data) => client.put(`/vendors/${id}`, data)
export const deleteVendor = (id) => client.delete(`/vendors/${id}`)
