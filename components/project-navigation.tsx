"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon, ImageIcon, FolderIcon } from "lucide-react";

interface ProjectNavigationProps {
  projectId: string;
}

export default function ProjectNavigation({ projectId }: ProjectNavigationProps) {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: "Brief",
      href: `/projects/${projectId}/brief`,
      icon: FileTextIcon,
      active: pathname === `/projects/${projectId}/brief`
    },
    {
      name: "Inspiration",
      href: `/projects/${projectId}/inspiration`,
      icon: ImageIcon,
      active: pathname === `/projects/${projectId}/inspiration`
    },
    {
      name: "Files",
      href: `/projects/${projectId}/files`,
      icon: FolderIcon,
      active: pathname === `/projects/${projectId}/files`
    }
  ];

  return (
    <nav className="flex justify-center space-x-8 py-4 border-b">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors",
            item.active 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
} 