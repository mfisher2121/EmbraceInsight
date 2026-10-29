import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstSeen: text('first_seen').notNull(),
  lastSeen: text('last_seen').notNull(),
  newsletterStatus: text('newsletter_status').notNull().default('not_requested'),
  newsletterRequestedAt: text('newsletter_requested_at'),
  suppressedAt: text('suppressed_at'),
  isTest: integer('is_test').notNull().default(0)
});

export const captureEvents = sqliteTable('capture_events', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id),
  eventType: text('event_type').notNull(),
  assetId: text('asset_id'),
  pageUrl: text('page_url'),
  targetQuery: text('target_query'),
  source: text('source').notNull(),
  utmSource: text('utm_source'),
  utmCampaign: text('utm_campaign'),
  newsletterRequested: integer('newsletter_requested').notNull().default(0),
  requestContactConsent: integer('request_contact_consent').notNull().default(0),
  consentVersion: text('consent_version').notNull(),
  consentText: text('consent_text').notNull(),
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('recorded'),
  isTest: integer('is_test').notNull().default(0)
}, table => [index('capture_events_contact_idx').on(table.contactId), index('capture_events_created_idx').on(table.createdAt)]);

export const accessTokens = sqliteTable('access_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id),
  assetId: text('asset_id'),
  kind: text('kind').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull()
}, table => [index('access_tokens_contact_idx').on(table.contactId)]);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start').notNull(),
  hits: integer('hits').notNull().default(0)
});
