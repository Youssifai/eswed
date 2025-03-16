import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectById } from "@/db/queries/projects-queries";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";
import FileManager from "@/components/file-manager";
import CreateFolderDialog from "@/components/create-folder-dialog";
import UploadFileDialog from "@/components/upload-file-dialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, Upload } from "lucide-react";

export default async function FilesPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { userId } = auth();

  if (!userId) {
    return redirect("/login");
  }

  const project = await getProjectById(params.projectId);

  if (!project) {
    return redirect("/");
  }

  // Check if user has access to this project
  if (project.ownerId !== userId) {
    return redirect("/");
  }

  // Get all files and folders for this project
  const allFiles = await getAllFilesByProjectId(params.projectId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-semibold">Project Files</h1>
        <div className="flex gap-2">
          <CreateFolderDialog projectId={params.projectId}>
            <Button className="bg-neutral-800 hover:bg-neutral-700 text-white">
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </CreateFolderDialog>
          
          <UploadFileDialog projectId={params.projectId}>
            <Button className="bg-neutral-800 hover:bg-neutral-700 text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </UploadFileDialog>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <FileManager 
          projectId={params.projectId}
          rootFiles={allFiles}
        />
      </div>
    </div>
  );
} 