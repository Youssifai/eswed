"use server";

import { db } from "@/db/db";
import { projectsTable } from "@/db/schema/projects-schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateBriefContent(projectId: string, content: string) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    // Update the project's brief content
    await db
      .update(projectsTable)
      .set({
        briefContent: content,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, projectId));
    
    // Revalidate the project path to update UI
    revalidatePath(`/projects/${projectId}/brief`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update brief content:", error);
    throw error;
  }
} 