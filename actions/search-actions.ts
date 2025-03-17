"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { filesTable } from "@/db/schema/files-schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { getProjectById } from "@/db/queries/projects-queries";
import { SearchFilters } from "@/components/search-filter-bar";
import { FILE_TYPE_GROUPS } from "@/lib/constants";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";

interface SearchResult {
  success: boolean;
  files?: any[];
  error?: string;
}

interface FileTypeGroup {
  label: string;
  value: string;
  mimeTypes: string[];
}

export async function searchFiles(
  projectId: string,
  filters: SearchFilters
): Promise<SearchResult> {
  console.log("Searching with filters:", JSON.stringify(filters, null, 2));
  
  const { userId } = auth();

  if (!userId) {
    console.log("Authentication required");
    return { success: false, error: "Authentication required" };
  }

  try {
    // Verify the user has access to this project
    const project = await getProjectById(projectId);
    if (!project) {
      console.log("Project not found:", projectId);
      return { success: false, error: "Project not found" };
    }
    
    if (project.ownerId !== userId) {
      console.log("Unauthorized access attempt by", userId, "for project", projectId);
      return { success: false, error: "Unauthorized to access this project" };
    }

    // Get all files for the project first
    const allFiles = await getAllFilesByProjectId(projectId);
    console.log(`Found ${allFiles.length} total files in project`);
    
    // Start with all files
    let filteredFiles = [...allFiles];
    
    // If we have a search query, apply it
    if (filters.query && filters.query.trim() !== '') {
      const searchTerm = filters.query.toLowerCase().trim();
      console.log("Searching for term:", searchTerm);
      
      // Track files that match directly
      const directMatches = allFiles.filter(file => {
        const nameMatch = file.name.toLowerCase().includes(searchTerm);
        const descMatch = file.description ? file.description.toLowerCase().includes(searchTerm) : false;
        const tagsMatch = file.tags ? file.tags.toLowerCase().includes(searchTerm) : false;
        const typeMatch = file.type.toLowerCase().includes(searchTerm);
        const mimeTypeMatch = file.mimeType ? file.mimeType.toLowerCase().includes(searchTerm) : false;
        
        // Check for extension matches (with or without the dot)
        const extensionMatch = 
          file.name.toLowerCase().endsWith(`.${searchTerm}`) || 
          (searchTerm.startsWith('.') && file.name.toLowerCase().endsWith(searchTerm));
        
        return nameMatch || descMatch || tagsMatch || typeMatch || mimeTypeMatch || extensionMatch;
      });
      
      console.log(`Found ${directMatches.length} direct matches`);
      
      // If we found direct matches, include them and their parent folders
      if (directMatches.length > 0) {
        // Get all parent folders for these files
        const parentFolderIds = new Set<string>();
        
        directMatches.forEach(file => {
          // Add each parent ID to the set
          if (file.parentId) {
            parentFolderIds.add(file.parentId);
            
            // Also find parent folders of parent folders (all the way to root)
            let currentParentId = file.parentId;
            let safeguard = 0; // Prevent infinite loops
            
            while (currentParentId && safeguard < 10) {
              const parentFolder = allFiles.find(f => f.id === currentParentId);
              if (parentFolder && parentFolder.parentId) {
                parentFolderIds.add(parentFolder.parentId);
                currentParentId = parentFolder.parentId;
              } else {
                break; // Just exit the loop instead of setting to null/undefined
              }
              safeguard++;
            }
          }
        });
        
        console.log(`Found ${parentFolderIds.size} parent folders to include`);
        
        // Get all the parent folders to include
        const parentFolders = allFiles.filter(file => 
          file.type === 'folder' && parentFolderIds.has(file.id)
        );
        
        // Combine direct matches with parent folders, without duplicates
        const allMatches = new Map();
        
        // Add parent folders first
        parentFolders.forEach(folder => {
          allMatches.set(folder.id, folder);
        });
        
        // Then add direct matches
        directMatches.forEach(file => {
          allMatches.set(file.id, file);
        });
        
        // Convert back to array
        filteredFiles = Array.from(allMatches.values());
        console.log(`Total matched files including parents: ${filteredFiles.length}`);
      } else {
        // No matches found
        filteredFiles = [];
        console.log("No files matched the search term");
      }
    }
    
    // File type filter (file or folder)
    if (filters.fileType && filters.fileType !== 'any') {
      console.log("Filtering by file type:", filters.fileType);
      filteredFiles = filteredFiles.filter(file => file.type === filters.fileType);
      console.log(`After file type filter: ${filteredFiles.length} files`);
    }
    
    // MIME type filter
    if (filters.mimeTypeGroup && filters.mimeTypeGroup !== 'all') {
      console.log("Filtering by MIME type group:", filters.mimeTypeGroup);
      const selectedGroup = FILE_TYPE_GROUPS.find((g: FileTypeGroup) => g.value === filters.mimeTypeGroup);
      
      if (selectedGroup && selectedGroup.mimeTypes.length > 0) {
        console.log("Using MIME types:", selectedGroup.mimeTypes);
        filteredFiles = filteredFiles.filter(file => {
          // Skip folders in MIME type filtering
          if (file.type === 'folder') return true;
          
          if (!file.mimeType) return false;
          
          return selectedGroup.mimeTypes.some(mimeType => 
            file.mimeType?.toLowerCase().includes(mimeType.toLowerCase())
          );
        });
        console.log(`After MIME type filter: ${filteredFiles.length} files`);
      }
    }
    
    // System folder filter
    if (!filters.showSystemFolders) {
      console.log("Filtering out system folders");
      filteredFiles = filteredFiles.filter(file => !file.isSystemFolder);
      console.log(`After system folder filter: ${filteredFiles.length} files`);
    }
    
    // If we have no results but didn't specify a search term, show all files
    if (filteredFiles.length === 0 && (!filters.query || filters.query.trim() === '')) {
      console.log("No filters matched, returning all files");
      filteredFiles = [...allFiles];
    }
    
    // Sort: folders first, then by name
    filteredFiles.sort((a, b) => {
      // Folders come first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
    
    console.log(`Returning ${filteredFiles.length} files after all filters`);
    return { success: true, files: filteredFiles };
  } catch (error) {
    console.error("Error searching files:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
} 