"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject as dbCreateProject, deleteProject as dbDeleteProject } from "@/db/queries/projects-queries";
import { createDefaultFolders } from "@/db/queries/files-queries";
import { eq, desc } from "drizzle-orm";
import { projectsTable } from "@/db/schema/projects-schema";
import { db } from "@/db/db";

// Interface for project creation data
type CreateProjectData = {
  name: string;
  description: string | null;
};

/**
 * Creates a new project and default folders
 */
export async function createProject(data: CreateProjectData) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to create a project");
  }

  try {
    // Create the project in the database
    const project = await dbCreateProject({
      ownerId: userId,
      name: data.name,
      description: data.description,
      briefContent: null,
      inspirationData: null,
      wasabiFolderPath: null,
    });

    if (!project) {
      throw new Error("Failed to create project");
    }

    // Create default folders for the project
    await createDefaultFolders(project.id);

    // Update the Wasabi folder path in the project - this would be implemented 
    // once Wasabi integration is added
    // const wasabiFolderPath = `user_${userId}/project_${project.id}`;
    // await updateProject(project.id, { wasabiFolderPath });

    revalidatePath("/");
    return project;
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

export async function getAllProjects() {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error("You must be logged in to view projects");
  }
  
  try {
    const projects = await db.query.projects.findMany({
      where: eq(projectsTable.ownerId, userId),
      orderBy: [desc(projectsTable.updatedAt)]
    });
    
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw new Error("Failed to load projects");
  }
}

/**
 * Deletes a project and all associated files from database and Wasabi
 */
export async function deleteProject(projectId: string) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to delete a project");
  }

  try {
    // Get the project to verify ownership
    const project = await db.query.projects.findFirst({
      where: eq(projectsTable.id, projectId),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Verify project ownership
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to delete this project");
    }

    // Delete project files from Wasabi (if integration exists)
    if (project.wasabiFolderPath) {
      // This would be implemented once Wasabi integration is added
      // await deleteWasabiFolder(project.wasabiFolderPath);
    }

    // Delete the project from database (cascade will delete associated files)
    await dbDeleteProject(projectId);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    } else {
      throw new Error("Failed to delete project: Unknown error");
    }
  }
} 