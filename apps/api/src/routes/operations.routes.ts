import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { operationsService } from '../services/operations.service.js'

export const operationsRouter = Router()

operationsRouter.use(requireAuth, requireOrganization)

// Summary
operationsRouter.get('/summary', async (req, res) => {
  const data = await operationsService.getOperationsSummary(req.organization!.id)
  res.json(data)
})

// Employees
operationsRouter.get('/employees', async (req, res) => {
  const { isActive, page, limit } = req.query
  const data = await operationsService.getEmployees(req.organization!.id, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

operationsRouter.post('/employees', async (req, res) => {
  const employee = await operationsService.createEmployee(req.organization!.id, req.body)
  res.status(201).json(employee)
})

operationsRouter.patch('/employees/:employeeId', async (req, res) => {
  const employee = await operationsService.updateEmployee(req.organization!.id, req.params['employeeId']!, req.body)
  res.json(employee)
})

// Inventory
operationsRouter.get('/inventory', async (req, res) => {
  const { category, lowStock, page, limit } = req.query
  const data = await operationsService.getInventory(req.organization!.id, {
    category: category as string | undefined,
    lowStock: lowStock === 'true',
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

operationsRouter.get('/inventory/low-stock', async (req, res) => {
  const items = await operationsService.getLowStockItems(req.organization!.id)
  res.json({ items })
})

operationsRouter.post('/inventory', async (req, res) => {
  const item = await operationsService.createInventoryItem(req.organization!.id, req.body)
  res.status(201).json(item)
})

operationsRouter.patch('/inventory/:itemId/quantity', async (req, res) => {
  const { delta } = req.body
  const item = await operationsService.updateInventoryQuantity(req.organization!.id, req.params['itemId']!, Number(delta))
  res.json(item)
})

// Vendors
operationsRouter.get('/vendors', async (req, res) => {
  const { category, page, limit } = req.query
  const data = await operationsService.getVendors(req.organization!.id, {
    category: category as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

operationsRouter.post('/vendors', async (req, res) => {
  const vendor = await operationsService.createVendor(req.organization!.id, req.body)
  res.status(201).json(vendor)
})
