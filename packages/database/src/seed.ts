import { PrismaClient } from '../generated/client/index.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create super admin user
  const passwordHash = await bcrypt.hash('Password123!', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@kanavu.ai' },
    update: {},
    create: {
      email: 'admin@kanavu.ai',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      isSuperAdmin: true,
      emailVerified: true,
    },
  })

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-hvac' },
    update: {},
    create: {
      name: "Smith's HVAC & Plumbing",
      slug: 'demo-hvac',
      industry: 'HVAC',
      phone: '(555) 123-4567',
      email: 'info@smithshvac.com',
      website: 'https://smithshvac.com',
      timezone: 'America/New_York',
      address: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
      },
      businessHours: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '13:00' },
        sunday: { open: null, close: null },
      },
      members: {
        create: {
          userId: user.id,
          role: 'ADMIN',
        },
      },
    },
  })

  // Create subscription
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan: 'PRO',
      status: 'ACTIVE',
      seats: 10,
      aiCallsPerMonth: 5000,
      storageGb: 100,
    },
  })

  // Create sample contacts
  const contacts = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '555-0100', type: 'CUSTOMER' as const, status: 'WON' as const, score: 92 },
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', phone: '555-0101', type: 'LEAD' as const, status: 'NEW' as const, score: 45 },
    { firstName: 'Mike', lastName: 'Williams', email: 'mike.w@email.com', phone: '555-0102', type: 'PROSPECT' as const, status: 'QUALIFIED' as const, score: 71 },
    { firstName: 'Emily', lastName: 'Davis', email: 'emily.d@email.com', phone: '555-0103', type: 'CUSTOMER' as const, status: 'WON' as const, score: 88 },
    { firstName: 'David', lastName: 'Brown', email: 'david.b@email.com', phone: '555-0104', type: 'LEAD' as const, status: 'CONTACTED' as const, score: 55 },
  ]

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { id: `seed-contact-${contact.firstName.toLowerCase()}-${org.id}`.slice(0, 36) },
      update: {},
      create: {
        ...contact,
        organizationId: org.id,
        ownerId: user.id,
        source: 'manual',
        tags: ['demo'],
      },
    })
  }

  // Seed knowledge base
  const knowledgeItems = [
    {
      title: 'Service Pricing Guide',
      content: `AC Tune-up: $89\nHeating Inspection: $79\nEmergency Service (after hours): $149 trip charge\nFull HVAC Installation: Starting at $3,500\nDuct Cleaning: $299`,
      category: 'pricing',
    },
    {
      title: 'Refund Policy',
      content: `We offer a 30-day satisfaction guarantee on all service work. If you're not satisfied, we'll return to make it right at no charge. Refunds for parts are handled case-by-case.`,
      category: 'policy',
    },
    {
      title: 'Service Area',
      content: `We serve Austin, TX and surrounding areas within 30 miles including: Round Rock, Cedar Park, Pflugerville, Lakeway, and Georgetown.`,
      category: 'operations',
    },
  ]

  for (const item of knowledgeItems) {
    await prisma.knowledgeItem.create({
      data: { ...item, organizationId: org.id, tags: ['demo'] },
    }).catch(() => {}) // Skip if exists
  }

  // Seed AI memory
  await prisma.memory.createMany({
    data: [
      {
        organizationId: org.id,
        type: 'SEMANTIC',
        content: "Smith's HVAC focuses on residential and commercial HVAC services in Austin TX. Primary services: AC repair, heating, installation, duct work. Busiest months: June-August and November-January.",
        importance: 0.9,
        sourceType: 'onboarding',
      },
      {
        organizationId: org.id,
        type: 'EPISODIC',
        content: "Customer John Smith complained about slow response times in December 2024. Issue resolved by adding weekend scheduling.",
        importance: 0.7,
        sourceType: 'customer_feedback',
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed complete!')
  console.log('   Email: admin@kanavu.ai')
  console.log('   Password: Password123!')
  console.log(`   Org slug: demo-hvac`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
