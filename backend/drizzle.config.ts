import type { Config } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@db:5432/utarchive";

const config: Config = {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    connectionString,
  },
};

export default config;
