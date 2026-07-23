import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { searchService } from '../services/search.service.js'

export const searchRouter = Router()

searchRouter.use(requireAuth, requireOrganization)

searchRouter.get('/', async (req, res) => {
  const { q, types } = req.query
  const typeList = types ? (Array.isArray(types) ? types as string[] : [types as string]) : undefined
  const data = await searchService.globalSearch(req.organization!.id, q as string ?? '', typeList)
  res.json(data)
})
