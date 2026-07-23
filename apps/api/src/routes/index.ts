import { Router } from 'express'
import { authRouter } from './auth.routes.js'
import { aiRouter } from './ai.routes.js'
import { crmRouter } from './crm.routes.js'
import { orgRouter } from './organizations.routes.js'
import { marketingRouter } from './marketing.routes.js'
import { salesRouter } from './sales.routes.js'
import { financeRouter } from './finance.routes.js'
import { receptionistRouter } from './receptionist.routes.js'
import { websiteRouter } from './website.routes.js'
import { analyticsRouter } from './analytics.routes.js'
import { reviewRouter } from './review.routes.js'
import { operationsRouter } from './operations.routes.js'
import { automationsRouter } from './automations.routes.js'
import { notificationsRouter } from './notifications.routes.js'
import { searchRouter } from './search.routes.js'
import { portalRouter } from './portal.routes.js'
import { stripeRouter } from './stripe.routes.js'
import { socialRouter } from './social.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/ai', aiRouter)
apiRouter.use('/crm', crmRouter)
apiRouter.use('/org', orgRouter)
apiRouter.use('/marketing', marketingRouter)
apiRouter.use('/sales', salesRouter)
apiRouter.use('/finance', financeRouter)
apiRouter.use('/receptionist', receptionistRouter)
apiRouter.use('/website', websiteRouter)
apiRouter.use('/analytics', analyticsRouter)
apiRouter.use('/reviews', reviewRouter)
apiRouter.use('/operations', operationsRouter)
apiRouter.use('/automations', automationsRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.use('/search', searchRouter)
apiRouter.use('/portal', portalRouter)
apiRouter.use('/stripe', stripeRouter)
apiRouter.use('/social', socialRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'kanavu-api' })
})
