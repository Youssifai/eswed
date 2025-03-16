"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProjectById, updateProjectDeadline } from "@/db/queries/projects-queries";

/**
 * Sets or updates the deadline for a project
 */
export async function setProjectDeadline(
  projectId: string,
  deadlineDate: string | null // ISO string or null to remove deadline
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

    // Convert string to Date or use null
    const deadline = deadlineDate ? new Date(deadlineDate) : null;
    
    // Update the project deadline
    const updatedProject = await updateProjectDeadline(projectId, deadline);

    if (!updatedProject) {
      throw new Error("Failed to update project deadline - no project returned");
    }

    // Revalidate all paths that might display the deadline
    revalidatePath(`/projects/${projectId}/brief`);
    revalidatePath(`/`); // Home page with project gallery
    
    return updatedProject;
  } catch (error) {
    console.error("Error updating project deadline:", error);
    if (error instanceof Error) {
      throw new Error(`Deadline update failed: ${error.message}`);
    } else {
      throw new Error("Deadline update failed: Unknown error");
    }
  }
} 