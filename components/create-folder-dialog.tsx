"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNewFolder } from "@/actions/file-actions";

interface CreateFolderDialogProps {
  projectId: string;
  parentId?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export default function CreateFolderDialog({
  projectId,
  parentId,
  onSuccess,
  children,
}: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await createNewFolder(projectId, folderName.trim(), parentId);
      setOpen(false);
      setFolderName("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create folder. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-white border-neutral-800">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            id="folder-name"
            placeholder="Folder Name"
            className="bg-neutral-800 border-neutral-700 text-white"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button 
            variant="secondary"
            onClick={() => setOpen(false)}
            className="bg-neutral-800 hover:bg-neutral-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 