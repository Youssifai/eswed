import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectById } from "@/db/queries/projects-queries";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";
import FileManager from "@/components/file-manager";
import CreateFolderDialog from "@/components/create-folder-dialog";
import UploadFileDialog from "@/components/upload-file-dialog";
import { FolderPlus, Upload, AlertCircle, Download } from "lucide-react";
import { checkDatabaseConnection } from "@/db/db";
import { SearchFilters } from "@/components/search-filter-bar";
import { searchFiles } from "@/actions/search-actions";
import { SelectFile } from "@/db/schema/files-schema";
import { SearchFilterBarWrapper } from "@/components/search-filter-bar-wrapper";
import FilePageActions from "@/components/file-page-actions";

interface FilesPageProps {
  params: {
    projectId: string;
  };
  searchParams: {
    query?: string;
    fileType?: string;
    mimeTypeGroup?: string;
    showSystemFolders?: string;
    initialUpload?: string;
  };
}

export default async function FilesPage({ params, searchParams }: FilesPageProps) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    // Check database connection
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.connected) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Database Connection Error</h2>
          <p className="text-gray-600 mb-4">{dbStatus.message || "Unknown database error"}</p>
        </div>
      );
    }
    
    const projectId = params.projectId;
    const project = await getProjectById(projectId);

    if (!project) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
        </div>
      );
    }

    // Parse search params
    const initialFilters: SearchFilters = {
      query: searchParams.query || "",
      fileType: (searchParams.fileType || "") as "file" | "folder" | "",
      mimeTypeGroup: searchParams.mimeTypeGroup || "all",
      showSystemFolders: searchParams.showSystemFolders !== "false",
    };
    
    // Get files based on search filters
    let files: SelectFile[] = [];
    if (Object.keys(searchParams).length > 0 && 
        (searchParams.query || searchParams.fileType || 
         searchParams.mimeTypeGroup || searchParams.showSystemFolders)) {
      // If search params exist, use search functionality
      const searchResult = await searchFiles(projectId, initialFilters);
      files = searchResult.success ? (searchResult.files as SelectFile[]) || [] : [];
    } else {
      // Otherwise get all files
      files = await getAllFilesByProjectId(projectId);
    }

    const hasInitialUpload = searchParams.initialUpload === 'true';

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-semibold">Project Files</h1>
          
          <FilePageActions 
            projectId={projectId} 
            initialUpload={hasInitialUpload} 
          />
        </div>
        
        <div className="mb-6">
          <SearchFilterBarWrapper 
            initialFilters={initialFilters}
            projectId={projectId}
          />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <FileManager 
            projectId={projectId}
            rootFiles={files}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in files page:", error);
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-gray-600">An error occurred while loading the files.</p>
      </div>
    );
  }
} 