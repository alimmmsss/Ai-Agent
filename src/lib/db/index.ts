import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a SQL client with Neon
const sql = neon(process.env.DATABASE_URL!);

// Create Drizzle database instance
export const db = drizzle(sql, { schema });

// Export schema for easy access
export * from './schema';
