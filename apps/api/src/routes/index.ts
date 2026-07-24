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
import { chatWidgetRouter } from './chat-widget.routes.js'
import { waitlistRouter } from './waitlist.routes.js'
import { giftCardsRouter } from './gift-cards.routes.js'
import { referralsRouter } from './referrals.routes.js'
import { documentTemplatesRouter } from './document-templates.routes.js'
import { dripCampaignsRouter } from './drip-campaigns.routes.js'
import { loyaltyRouter } from './loyalty.routes.js'
import { intakeRouter } from './intake.routes.js'
import { resourceBookingRouter } from './resource-booking.routes.js'
import { auditLogRouter } from './audit-log.routes.js'
import { paymentLinksRouter } from './payment-links.routes.js'
import { emailBroadcastRouter } from './email-broadcast.routes.js'
import { pushNotificationsRouter } from './push-notifications.routes.js'
import { whatsappRouter } from './whatsapp.routes.js'
import { aiEmailWriterRouter } from './ai-email-writer.routes.js'
import { csatRouter } from './csat.routes.js'
import { apiKeysRouter } from './api-keys.routes.js'
import { teamPermissionsRouter } from './team-permissions.routes.js'
import { calendarSyncRouter } from './calendar-sync.routes.js'
import { notificationCenterRouter } from './notification-center.routes.js'
import { expensesRouter } from './expenses.routes.js'
import { vendorsRouter } from './vendors.routes.js'
import { inventoryRouter } from './inventory.routes.js'
import { projectsRouter } from './projects.routes.js'
import { timeTrackingRouter } from './time-tracking.routes.js'
import { estimatesRouter } from './estimates.routes.js'
import { contractsRouter } from './contracts.routes.js'
import { goalsRouter } from './goals.routes.js'
import { emailTemplatesRouter } from './email-templates.routes.js'
import { onboardingRouter } from './onboarding.routes.js'
import { businessDoctorRouter } from './business-doctor.routes.js'

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
apiRouter.use('/chat-widget', chatWidgetRouter)
apiRouter.use('/waitlist', waitlistRouter)
apiRouter.use('/gift-cards', giftCardsRouter)
apiRouter.use('/referrals', referralsRouter)
apiRouter.use('/documents', documentTemplatesRouter)
apiRouter.use('/drip-campaigns', dripCampaignsRouter)
apiRouter.use('/loyalty', loyaltyRouter)
apiRouter.use('/intake', intakeRouter)
apiRouter.use('/resources', resourceBookingRouter)
apiRouter.use('/audit-log', auditLogRouter)
apiRouter.use('/payment-links', paymentLinksRouter)
apiRouter.use('/broadcasts', emailBroadcastRouter)
apiRouter.use('/push', pushNotificationsRouter)
apiRouter.use('/whatsapp', whatsappRouter)
apiRouter.use('/email-writer', aiEmailWriterRouter)
apiRouter.use('/csat', csatRouter)
apiRouter.use('/api-keys', apiKeysRouter)
apiRouter.use('/team-permissions', teamPermissionsRouter)
apiRouter.use('/calendar-sync', calendarSyncRouter)
apiRouter.use('/notification-center', notificationCenterRouter)
apiRouter.use('/expenses', expensesRouter)
apiRouter.use('/vendors', vendorsRouter)
apiRouter.use('/inventory', inventoryRouter)
apiRouter.use('/projects', projectsRouter)
apiRouter.use('/time-tracking', timeTrackingRouter)
apiRouter.use('/estimates', estimatesRouter)
apiRouter.use('/contracts', contractsRouter)
apiRouter.use('/goals', goalsRouter)
apiRouter.use('/email-templates', emailTemplatesRouter)
apiRouter.use('/onboarding', onboardingRouter)
apiRouter.use('/business-doctor', businessDoctorRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'kanavu-api' })
})
