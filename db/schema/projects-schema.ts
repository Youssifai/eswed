import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { profilesTable } from "./profiles-schema";

export const projectsTable = pgTable("projects", {
  // Use CUID as primary key
  id: text("id").primaryKey().notNull().$defaultFn(() => createId()),
  
  // Reference to the owner (profile) with foreign key constraint
  ownerId: text("owner_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  
  // Project details
  name: text("name").notNull(),
  description: text("description"),
  deadline: timestamp("deadline"), // Project deadline
  
  // Content for each section
  briefContent: text("brief_content"), // Stores rich text content
  inspirationData: text("inspiration_data"), // Stores JSON as text
  
  // Wasabi storage path
  wasabiFolderPath: text("wasabi_folder_path"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

// Helper types for type safety
export type InsertProject = typeof projectsTable.$inferInsert;
export type SelectProject = typeof projectsTable.$inferSelect; 