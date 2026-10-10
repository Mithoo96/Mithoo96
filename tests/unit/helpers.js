import { randomUUID } from 'node:crypto';
export const validLead = (over = {}) => ({
  fullName: 'Marie Joseph', businessName: 'Bon Gou Restoran', email: 'marie@example.com', phone: '(407) 555-0134',
  contactMethod: 'whatsapp', language: 'ht', industry: 'Restoran', website: 'bongou.com', stage: 'growing', goal: 'more_clients',
  services: ['website', 'crm'], challenge: 'Moun yo vizite paj nou men yo pa rele.', improve: 'Swivi kliyan', budget: '3k_7k',
  start: 'one_month', details: '', consentPrivacy: true, marketingOptIn: false, locale: 'ht', page: '/',
  idempotencyKey: randomUUID(), startedAt: Date.now() - 60_000, company_website: '', ...over,
});
