import { pgEnum, pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
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
  
  // Wasabi storage path - ONLY store the path, not the content
  wasabiObjectPath: text("wasabi_object_path"),
  
  // Store only essential file metadata, not the file content
  size: text("size"), // File size in bytes as string
  mimeType: text("mime_type"),
  
  // Store minimal text metadata
  description: text("description"),
  tags: text("tags"), // Comma-separated list of tags
  
  // For folders, keep track if it's a default system folder
  isSystemFolder: boolean("is_system_folder").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
}, (table) => {
  return {
    // Add indexes for search optimization
    nameIdx: index("files_name_idx").on(table.name),
    typeIdx: index("files_type_idx").on(table.type),
    tagsIdx: index("files_tags_idx").on(table.tags),
    // Project + name index for faster lookups within a project
    projectNameIdx: index("files_project_name_idx").on(table.projectId, table.name),
    // Project + type index for filtering by file type within a project
    projectTypeIdx: index("files_project_type_idx").on(table.projectId, table.type)
  };
});

// Add the self-reference constraint in a relation configuration
// This would typically be done in a relations file, but for simplicity we're mentioning it here

// Helper types for type safety
export type InsertFile = typeof filesTable.$inferInsert;
export type SelectFile = typeof filesTable.$inferSelect; 