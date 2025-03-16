import { relations } from "drizzle-orm";
import { filesTable, profilesTable, projectsTable } from ".";

// Define relations for profiles
export const profilesRelations = relations(profilesTable, ({ many }) => ({
  projects: many(projectsTable)
}));

// Define relations for projects
export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  owner: one(profilesTable, {
    fields: [projectsTable.ownerId],
    references: [profilesTable.userId]
  }),
  files: many(filesTable)
}));

// Define relations for files, including self-referencing for folders
export const filesRelations = relations(filesTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [filesTable.projectId],
    references: [projectsTable.id]
  }),
  // Self-referencing relation for parent/child folders
  parent: one(filesTable, {
    fields: [filesTable.parentId],
    references: [filesTable.id]
  }),
  children: many(filesTable, { relationName: "parent" })
})); 