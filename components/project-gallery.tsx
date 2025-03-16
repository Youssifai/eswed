"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SelectProject } from "@/db/schema/projects-schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/actions/project-actions";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";

type ProjectGalleryProps = {
  projects: SelectProject[];
};

export default function ProjectGallery({ projects }: ProjectGalleryProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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
        router.push(`/projects/${project.id}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  // Function to format deadline display
  const formatDeadlineDisplay = (deadline: Date | null) => {
    if (!deadline) return null;
    return formatDate(deadline);
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {projects.map((project) => (
          <Link href={`/projects/${project.id}`} key={project.id}>
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
      <Dialog open={open} onOpenChange={setOpen}>
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