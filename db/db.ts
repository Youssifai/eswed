import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { filesTable, profilesTable, projectsTable } from "./schema";
import * as relations from "./schema/relations";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const schema = {
  profiles: profilesTable,
  projects: projectsTable,
  files: filesTable,
  ...relations
};

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// Set up postgres with error handling and connection timeout
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, {
  max: 10, // Max connections
  idle_timeout: 20, // Timeout after 20 seconds of inactivity
  connect_timeout: 10, // Connection timeout of 10 seconds
  // Debug errors
  onnotice: (notice) => console.log("Postgres Notice:", notice),
  onparameter: (param) => console.log("Postgres Parameter:", param)
});

export const db = drizzle(client, { schema });

// Add a function to check the database connection
export async function checkDatabaseConnection() {
  try {
    // Execute a simple query to check if connection is working
    const result = await db.execute(sql`SELECT 1 as connection_test`);
    return { 
      connected: true, 
      message: "Database connection successful"
    };
  } catch (error) {
    console.error("Database connection error:", error);
    return { 
      connected: false, 
      message: error instanceof Error ? error.message : "Unknown database error",
      error
    };
  }
}
