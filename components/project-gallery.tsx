"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { SelectProject } from "@/db/schema/projects-schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, deleteProject } from "@/actions/project-actions";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Calendar, MoreVertical, Trash, Upload, X, FileIcon } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useDropzone } from "react-dropzone";
import { Separator } from "@/components/ui/separator";

type ProjectGalleryProps = {
  projects: SelectProject[];
};

export default function ProjectGallery({ projects }: ProjectGalleryProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const project = await createProject({
        name,
        description: description || null,
      });

      if (project) {
        // If there are files, upload them to the project
        if (files.length > 0) {
          // Navigate to files page and pass the files (we'll implement file upload in that page)
          router.push(`/projects/${project.id}/files?initialUpload=true`);
          // Store files in sessionStorage to use them on the files page
          sessionStorage.setItem(`project_${project.id}_pending_files`, JSON.stringify(
            files.map(file => ({ 
              name: file.name, 
              type: file.type, 
              size: file.size,
              lastModified: file.lastModified
            }))
          ));
          // Store the actual File objects (can't be stringified)
          for (let i = 0; i < files.length; i++) {
            sessionStorage.setItem(`project_${project.id}_file_${i}`, URL.createObjectURL(files[i]));
          }
        } else {
          router.push(`/projects/${project.id}`);
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      setDeletingId(projectId);
      const result = await deleteProject(projectId);
      
      if (result?.success) {
        toast({
          title: "Project deleted",
          description: "The project has been deleted successfully.",
          variant: "default",
        });
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast({
        title: "Error",
        description: "Failed to delete the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Function to format deadline display
  const formatDeadlineDisplay = (deadline: Date | null) => {
    if (!deadline) return null;
    return formatDate(deadline);
  };

  // File dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    // Accept all file types
    accept: undefined
  });

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Clear form when dialog closes
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setName("");
      setDescription("");
      setFiles([]);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <Link href={`/projects/${project.id}`}>
              <div className="group relative bg-[#252525] rounded-lg overflow-hidden transition-all hover:shadow-lg h-[230px]">
                {/* If there's no image, leave it transparent like in the design */}
                <div className="w-full h-full bg-transparent flex items-center justify-center">
                  {/* Project title overlay at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium truncate">{project.name}</h3>
                      {project.deadline && (
                        <div className="flex items-center text-xs text-white/70">
                          <Calendar size={12} className="mr-1" />
                          {formatDeadlineDisplay(project.deadline)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Context Menu */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#252525] text-white border-[#333]">
                  <DropdownMenuItem 
                    className="text-red-500 focus:text-red-500 focus:bg-[#333]"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteProject(project.id);
                    }}
                    disabled={deletingId === project.id}
                  >
                    <Trash size={16} className="mr-2" />
                    {deletingId === project.id ? "Deleting..." : "Delete Project"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {/* New Project Card */}
        <div 
          className="bg-[#252525] rounded-lg flex items-center justify-center cursor-pointer h-[230px] transition-all hover:shadow-lg"
          onClick={() => setOpen(true)}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.5708 20C19.8328 20 20.8568 18.977 20.8568 17.714V13.143L21.9998 12L20.8568 10.857V6.286C20.8568 5.023 19.8338 4 18.5708 4M5.429 4C4.166 4 3.143 5.023 3.143 6.286V10.857L2 12L3.143 13.143V17.714C3.143 18.977 4.166 20 5.429 20M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-lg font-medium">New Project</span>
          </div>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[425px] bg-[#1E1E1E] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input 
                  id="project-name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Enter project name"
                  className="bg-[#252525] border-[#333]"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description (optional)</Label>
                <Textarea 
                  id="project-description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Enter project description"
                  className="bg-[#252525] border-[#333]"
                  rows={4}
                />
              </div>
              
              {/* File upload area */}
              <div className="grid gap-2 mt-2">
                <Label>Add Files (optional)</Label>
                <div 
                  {...getRootProps()} 
                  className={`p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                    isDragActive 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-[#333] bg-[#252525] hover:border-[#555]"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Upload size={24} className="text-gray-400" />
                    <p className="text-sm text-gray-400">
                      {isDragActive
                        ? "Drop files here..."
                        : "Drag & drop files here, or click to select files"}
                    </p>
                  </div>
                </div>
                
                {/* Show file list if files are selected */}
                {files.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-400 mb-2">Selected files:</div>
                    <div className="max-h-36 overflow-y-auto">
                      {files.map((file, index) => (
                        <div 
                          key={`${file.name}-${index}`} 
                          className="flex items-center justify-between py-2 px-3 bg-[#252525] rounded mb-1"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileIcon size={16} className="text-gray-400 shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-white ml-2"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="border-[#333] text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#0070f3] hover:bg-[#0060df]"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 