import client from '../client'

// Products
export const getProducts    = ()          => client.get('/products')
export const createProduct  = (data)      => client.post('/products', data)
export const updateProduct  = (id, data)  => client.put(`/products/${id}`, data)
export const deleteProduct  = (id)        => client.delete(`/products/${id}`)

// Categories
export const getCategories    = ()         => client.get('/products/categories')
export const createCategory   = (data)     => client.post('/products/categories', data)
export const updateCategory   = (id, data) => client.put(`/products/categories/${id}`, data)
export const deleteCategory   = (id)       => client.delete(`/products/categories/${id}`)

// Units of Measure
export const getUOM    = ()          => client.get('/products/uom')
export const createUOM = (data)      => client.post('/products/uom', data)
export const updateUOM = (id, data)  => client.put(`/products/uom/${id}`, data)
export const deleteUOM = (id)        => client.delete(`/products/uom/${id}`)

// Pricing
export const getPricing    = (params)     => client.get('/products/pricing', { params })
export const createPricing = (data)       => client.post('/products/pricing', data)
export const updatePricing = (id, data)   => client.put(`/products/pricing/${id}`, data)
export const deletePricing = (id)         => client.delete(`/products/pricing/${id}`)

// Bulk Imports
export const bulkImportProducts = (data)  => client.post('/products/bulk-import', data)
export const getImportHistory   = ()      => client.get('/products/import-history')
