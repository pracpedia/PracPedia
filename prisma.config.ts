import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// Load .env file so Prisma can access DATABASE_URL and other env vars
config();

export default defineConfig({
  schema: './prisma/schema.prisma',
});