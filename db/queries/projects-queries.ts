"use server";

import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { InsertProject, projectsTable, SelectProject } from "../schema/projects-schema";

export const createProject = async (data: InsertProject) => {
  try {
    const [newProject] = await db.insert(projectsTable).values(data).returning();
    return newProject;
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
};

export const getProjectById = async (id: string) => {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projectsTable.id, id)
    });

    return project;
  } catch (error) {
    console.error("Error getting project by ID:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get project: ${error.message}`);
    } else {
      throw new Error("Failed to get project: Unknown error");
    }
  }
};

export const getProjectsByOwnerId = async (ownerId: string): Promise<SelectProject[]> => {
  try {
    const projects = await db.query.projects.findMany({
      where: eq(projectsTable.ownerId, ownerId)
    });
    
    return projects;
  } catch (error) {
    console.error("Error getting projects by owner ID:", error);
    throw new Error("Failed to get projects");
  }
};

export const updateProject = async (id: string, data: Partial<InsertProject>) => {
  try {
    const [updatedProject] = await db
      .update(projectsTable)
      .set(data)
      .where(eq(projectsTable.id, id))
      .returning();
    
    return updatedProject;
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
};

export const updateBriefContent = async (id: string, briefContent: string) => {
  try {
    const [updatedProject] = await db
      .update(projectsTable)
      .set({ briefContent, updatedAt: new Date() })
      .where(eq(projectsTable.id, id))
      .returning();
    
    return updatedProject;
  } catch (error) {
    console.error("Error updating brief content:", error);
    throw new Error("Failed to update brief content");
  }
};

export const updateInspirationData = async (id: string, inspirationData: string) => {
  try {
    const [updatedProject] = await db
      .update(projectsTable)
      .set({ inspirationData, updatedAt: new Date() })
      .where(eq(projectsTable.id, id))
      .returning();
    
    return updatedProject;
  } catch (error) {
    console.error("Error updating inspiration data:", error);
    throw new Error("Failed to update inspiration data");
  }
};

export const deleteProject = async (id: string) => {
  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
  } catch (error) {
    console.error("Error deleting project:", error);
    throw new Error("Failed to delete project");
  }
};

export const updateProjectDeadline = async (id: string, deadline: Date | null) => {
  try {
    const [updatedProject] = await db
      .update(projectsTable)
      .set({ 
        deadline, 
        updatedAt: new Date() 
      })
      .where(eq(projectsTable.id, id))
      .returning();
    
    return updatedProject;
  } catch (error) {
    console.error("Error updating project deadline:", error);
    throw new Error("Failed to update project deadline");
  }
}; 