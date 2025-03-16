"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject as dbCreateProject } from "@/db/queries/projects-queries";
import { createDefaultFolders } from "@/db/queries/files-queries";

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