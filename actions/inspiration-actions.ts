"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProjectById, updateInspirationData as dbUpdateInspirationData } from "@/db/queries/projects-queries";

/**
 * Updates the inspiration data for a project
 */
export async function updateInspirationData(
  projectId: string,
  inspirationData: string
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to update a project");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to update this project");
    }

    // Update the inspiration data
    const updatedProject = await dbUpdateInspirationData(projectId, inspirationData);

    if (!updatedProject) {
      throw new Error("Failed to update inspiration data - no project returned");
    }

    revalidatePath(`/projects/${projectId}/inspiration`);
    return updatedProject;
  } catch (error) {
    console.error("Error updating inspiration data:", error);
    if (error instanceof Error) {
      throw new Error(`Inspiration update failed: ${error.message}`);
    } else {
      throw new Error("Inspiration update failed: Unknown error");
    }
  }
} 