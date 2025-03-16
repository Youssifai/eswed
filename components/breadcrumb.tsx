"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href: string;
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const [items, setItems] = React.useState<BreadcrumbItem[]>([]);
  const [projectName, setProjectName] = React.useState<string>("");
  
  React.useEffect(() => {
    // Fetch the project name if in a project page
    const fetchProjectName = async () => {
      const paths = pathname.split('/').filter(Boolean);
      if (paths.includes('projects') && paths.length > 1) {
        const projectId = paths[1];
        try {
          const response = await fetch(`/api/projects/${projectId}`);
          if (response.ok) {
            const project = await response.json();
            setProjectName(project.name);
          }
        } catch (error) {
          console.error("Failed to fetch project name:", error);
        }
      }
    };
    
    fetchProjectName();
  }, [pathname]);
  
  React.useEffect(() => {
    // Generate breadcrumb items based on the current path
    const generateBreadcrumb = () => {
      const paths = pathname.split('/').filter(Boolean);
      const breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Home', href: '/' }
      ];
      
      // Parse the path to create breadcrumb items
      if (paths.includes('projects') && paths.length > 1) {
        const projectId = paths[1];
        // Use the fetched project name or fallback to a generic name
        const displayName = projectName || "Project";
        
        breadcrumbItems.push({
          label: displayName,
          href: `/projects/${projectId}`
        });
        
        // Add the page name if it exists
        if (paths.length > 2) {
          const pageName = paths[2];
          breadcrumbItems.push({
            label: pageName.charAt(0).toUpperCase() + pageName.slice(1),
            href: `/projects/${projectId}/${pageName}`
          });
        }
      }
      
      setItems(breadcrumbItems);
    };
    
    generateBreadcrumb();
  }, [pathname, projectName]);
  
  return (
    <div className="px-6 py-4 text-sm">
      <div className="flex items-center">
        {items.map((item, index) => (
          <React.Fragment key={item.href}>
            <Link 
              href={item.href} 
              className="hover:text-white/80 transition-colors"
            >
              {item.label}
            </Link>
            
            {index < items.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-2 text-white/50" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
} 