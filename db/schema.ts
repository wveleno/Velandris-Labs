import { pgTable, date, text, integer, primaryKey } from 'drizzle-orm/pg-core';

export const dailyMetrics = pgTable('daily_metrics', {
  day: date('day').notNull(),
  metric: text('metric').notNull(),
  dimension: text('dimension').notNull(),
  total: integer('total').notNull().default(0),
}, table => [primaryKey({ columns: [table.day, table.metric, table.dimension] })]);
