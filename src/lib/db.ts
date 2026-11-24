import { neon, usesAurora } from '@/lib/aurora';

// On AWS the database is the Aurora cluster named in the environment; on a
// laptop it is the Postgres URL in DATABASE_URL.
if (!usesAurora() && !process.env.DATABASE_URL) {
  throw new Error('No database is configured: set AURORA_CLUSTER_ARN or DATABASE_URL');
}

export const sql = neon(process.env.DATABASE_URL);
