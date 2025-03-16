"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProjectById, updateBriefContent as dbUpdateBriefContent } from "@/db/queries/projects-queries";

/**
 * Updates the brief content for a project
 */
export async function updateBriefContent(
  projectId: string,
  briefContent: string
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

    // Update the brief content
    const updatedProject = await dbUpdateBriefContent(projectId, briefContent);

    if (!updatedProject) {
      throw new Error("Failed to update brief content - no project returned");
    }

    revalidatePath(`/projects/${projectId}/brief`);
    return updatedProject;
  } catch (error) {
    console.error("Error updating brief content:", error);
    if (error instanceof Error) {
      throw new Error(`Brief update failed: ${error.message}`);
    } else {
      throw new Error("Brief update failed: Unknown error");
    }
  }
} 