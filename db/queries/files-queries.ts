"use server";

import { db } from "@/db/db";
import { and, eq, isNull } from "drizzle-orm";
import { fileTypeEnum, filesTable, InsertFile, SelectFile } from "../schema/files-schema";

export const createFile = async (data: InsertFile) => {
  try {
    const [newFile] = await db.insert(filesTable).values(data).returning();
    return newFile;
  } catch (error) {
    console.error("Error creating file:", error);
    throw new Error("Failed to create file");
  }
};

export const createFolder = async (
  projectId: string,
  name: string,
  parentId?: string,
  isSystemFolder: boolean = false
) => {
  try {
    const folderData: InsertFile = {
      projectId,
      name,
      type: "folder",
      parentId: parentId || null,
      isSystemFolder
    };

    const [newFolder] = await db.insert(filesTable).values(folderData).returning();
    return newFolder;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw new Error("Failed to create folder");
  }
};

export const getFileById = async (id: string) => {
  try {
    const file = await db.query.files.findFirst({
      where: eq(filesTable.id, id)
    });

    return file;
  } catch (error) {
    console.error("Error getting file by ID:", error);
    throw new Error("Failed to get file");
  }
};

export const getFilesByProjectId = async (projectId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: eq(filesTable.projectId, projectId)
    });
    
    return files;
  } catch (error) {
    console.error("Error getting files by project ID:", error);
    throw new Error("Failed to get files");
  }
};

export const getRootFilesByProjectId = async (projectId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: and(
        eq(filesTable.projectId, projectId),
        isNull(filesTable.parentId)
      )
    });
    
    return files;
  } catch (error) {
    console.error("Error getting root files by project ID:", error);
    throw new Error("Failed to get root files");
  }
};

export const getFilesByParentId = async (parentId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: eq(filesTable.parentId, parentId)
    });
    
    return files;
  } catch (error) {
    console.error("Error getting files by parent ID:", error);
    throw new Error("Failed to get files");
  }
};

export const updateFile = async (id: string, data: Partial<InsertFile>) => {
  try {
    const [updatedFile] = await db
      .update(filesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(filesTable.id, id))
      .returning();
    
    return updatedFile;
  } catch (error) {
    console.error("Error updating file:", error);
    throw new Error("Failed to update file");
  }
};

export const moveFile = async (id: string, newParentId: string | null) => {
  try {
    const [updatedFile] = await db
      .update(filesTable)
      .set({ parentId: newParentId, updatedAt: new Date() })
      .where(eq(filesTable.id, id))
      .returning();
    
    return updatedFile;
  } catch (error) {
    console.error("Error moving file:", error);
    throw new Error("Failed to move file");
  }
};

export const deleteFile = async (id: string) => {
  try {
    await db.delete(filesTable).where(eq(filesTable.id, id));
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};

// Helper function to create default folders for a new project
export const createDefaultFolders = async (projectId: string) => {
  try {
    const defaultFolders = ["Assets", "PNG Exports", "Design Files"];
    
    const folders = await Promise.all(
      defaultFolders.map(name => 
        createFolder(projectId, name, undefined, true)
      )
    );
    
    return folders;
  } catch (error) {
    console.error("Error creating default folders:", error);
    throw new Error("Failed to create default folders");
  }
}; 