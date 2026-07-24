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
import { voiceRouter } from './voice.routes.js'
import { chatRouter } from './chat.routes.js'
import { campaignBuilderRouter } from './campaign-builder.routes.js'
import { calendarRouter } from './calendar.routes.js'
import { webhookOutboundRouter } from './webhook-outbound.routes.js'
import { leadScoringRouter } from './lead-scoring.routes.js'
import { customerSubscriptionsRouter } from './customer-subscriptions.routes.js'
import { reportsRouter } from './reports.routes.js'
import { locationsRouter } from './locations.routes.js'
import { brandRouter } from './brand.routes.js'
import { appointmentReschedulerRouter } from './appointment-rescheduler.routes.js'
import { reviewRequestsRouter } from './review-requests.routes.js'
import { proposalsRouter } from './proposals.routes.js'
import { smsInboxRouter } from './sms-inbox.routes.js'
import { staffScheduleRouter } from './staff-schedule.routes.js'
import { jobCostingRouter } from './job-costing.routes.js'
import { followUpSequencesRouter } from './follow-up-sequences.routes.js'
import { testimonialsRouter } from './testimonials.routes.js'
import { forecastingRouter } from './forecasting.routes.js'
import { callLogRouter } from './call-log.routes.js'
import { clientPortalRouter } from './client-portal.routes.js'
import { recurringAppointmentsRouter } from './recurring-appointments.routes.js'
import { teamInboxRouter } from './team-inbox.routes.js'
import { contentCalendarRouter } from './content-calendar.routes.js'
import { commissionRouter } from './commission.routes.js'
import { billingPortalRouter } from './billing-portal.routes.js'
import { formBuilderRouter } from './form-builder.routes.js'
import { multiLocationReportRouter } from './multi-location-report.routes.js'
import { knowledgeBaseRouter } from './knowledge-base.routes.js'

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
apiRouter.use('/voice', voiceRouter)
apiRouter.use('/chat', chatRouter)
apiRouter.use('/campaigns', campaignBuilderRouter)
apiRouter.use('/calendar', calendarRouter)
apiRouter.use('/webhooks', webhookOutboundRouter)
apiRouter.use('/lead-scoring', leadScoringRouter)
apiRouter.use('/customer-subscriptions', customerSubscriptionsRouter)
apiRouter.use('/reports', reportsRouter)
apiRouter.use('/locations', locationsRouter)
apiRouter.use('/brand', brandRouter)
apiRouter.use('/reschedule', appointmentReschedulerRouter)
apiRouter.use('/review-requests', reviewRequestsRouter)
apiRouter.use('/proposals', proposalsRouter)
apiRouter.use('/sms', smsInboxRouter)
apiRouter.use('/staff-schedule', staffScheduleRouter)
apiRouter.use('/job-costing', jobCostingRouter)
apiRouter.use('/sequences', followUpSequencesRouter)
apiRouter.use('/testimonials', testimonialsRouter)
apiRouter.use('/forecasting', forecastingRouter)
apiRouter.use('/call-log', callLogRouter)
apiRouter.use('/client-portal', clientPortalRouter)
apiRouter.use('/recurring-appointments', recurringAppointmentsRouter)
apiRouter.use('/team-inbox', teamInboxRouter)
apiRouter.use('/content-calendar', contentCalendarRouter)
apiRouter.use('/commission', commissionRouter)
apiRouter.use('/billing-portal', billingPortalRouter)
apiRouter.use('/forms', formBuilderRouter)
apiRouter.use('/location-reports', multiLocationReportRouter)
apiRouter.use('/knowledge-base', knowledgeBaseRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'kanavu-api' })
})
