import { pgEnum, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { projectsTable } from "./projects-schema";

// Enum for file types
export const fileTypeEnum = pgEnum("file_type", ["file", "folder"]);

// First define the table structure without self-references
export const filesTable = pgTable("files", {
  // Use CUID as primary key
  id: text("id").primaryKey().notNull().$defaultFn(() => createId()),
  
  // Reference to the project with foreign key constraint
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  
  // File/folder details
  name: text("name").notNull(),
  type: fileTypeEnum("type").notNull(),
  
  // Parent folder ID (can be null for root files/folders)
  parentId: text("parent_id"),
  
  // Wasabi storage path (null for folders)
  wasabiObjectPath: text("wasabi_object_path"),
  
  // File metadata
  size: text("size"), // File size in bytes as string
  mimeType: text("mime_type"),
  
  // For folders, keep track if it's a default system folder
  isSystemFolder: boolean("is_system_folder").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

// Add the self-reference constraint in a relation configuration
// This would typically be done in a relations file, but for simplicity we're mentioning it here

// Helper types for type safety
export type InsertFile = typeof filesTable.$inferInsert;
export type SelectFile = typeof filesTable.$inferSelect; 