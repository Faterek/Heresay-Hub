import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, primaryKey, unique } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * User roles enum
 */
export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `hearsay-hub_${name}`);

// Speakers table - maintained by moderators
export const speakers = createTable(
  "speaker",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
  }),
  (t) => [
    index("speaker_name_idx").on(t.name),
    index("speaker_created_by_idx").on(t.createdById),
  ],
);

// Quotes table - replaces posts
export const quotes = createTable(
  "quote",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    content: d.text().notNull(),
    context: d.text(), // Optional context, only visible on quote page
    quoteDate: d.date(), // Optional date when the quote was said (supports partial dates)
    quoteDatePrecision: d.varchar({ length: 20 }).default("unknown"), // "full", "year-month", "year", "unknown"
    speakerId: d
      .integer()
      .notNull()
      .references(() => speakers.id),
    submittedById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("quote_speaker_idx").on(t.speakerId),
    index("quote_submitted_by_idx").on(t.submittedById),
    index("quote_created_at_idx").on(t.createdAt),
  ],
);

//Legacy posts table for compatibility - will be removed later
export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .default(sql`CURRENT_TIMESTAMP`),
  image: d.varchar({ length: 255 }),
  role: d.varchar({ length: 50 }).$type<UserRole>().default("USER"),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  quotes: many(quotes),
  speakers: many(speakers),
  posts: many(posts),
  quoteVotes: many(quoteVotes),
}));

export const speakersRelations = relations(speakers, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [speakers.createdById],
    references: [users.id],
  }),
  quotes: many(quotes),
}));

// Quote votes table
export const quoteVotes = createTable(
  "quote_vote",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    quoteId: d
      .integer()
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    voteType: d.varchar({ length: 10 }).notNull(), // "upvote" or "downvote"
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("quote_vote_quote_idx").on(t.quoteId),
    index("quote_vote_user_idx").on(t.userId),
    index("quote_vote_type_idx").on(t.voteType),
    // Ensure one vote per user per quote
    unique("quote_vote_unique_user_quote").on(t.quoteId, t.userId),
  ],
);

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  speaker: one(speakers, {
    fields: [quotes.speakerId],
    references: [speakers.id],
  }),
  submittedBy: one(users, {
    fields: [quotes.submittedById],
    references: [users.id],
  }),
  votes: many(quoteVotes),
}));

export const quoteVotesRelations = relations(quoteVotes, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteVotes.quoteId],
    references: [quotes.id],
  }),
  user: one(users, {
    fields: [quoteVotes.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  createdBy: one(users, {
    fields: [posts.createdById],
    references: [users.id],
  }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
