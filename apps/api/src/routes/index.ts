import { Router } from 'express'
import { authRouter } from './auth.routes.js'
import { aiRouter } from './ai.routes.js'
import { crmRouter } from './crm.routes.js'
import { orgRouter } from './organizations.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/ai', aiRouter)
apiRouter.use('/crm', crmRouter)
apiRouter.use('/org', orgRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'kanavu-api' })
})
