"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilterBar, SearchFilters } from "./search-filter-bar";

interface SearchFilterBarWrapperProps {
  initialFilters: SearchFilters;
  projectId: string;
}

export function SearchFilterBarWrapper({ 
  initialFilters, 
  projectId 
}: SearchFilterBarWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleSearch = (filters: SearchFilters) => {
    // Create a new URLSearchParams object
    const params = new URLSearchParams();
    
    // Add search parameters if they have values
    if (filters.query) {
      params.set("query", filters.query);
    }
    
    if (filters.fileType) {
      params.set("fileType", filters.fileType);
    }
    
    if (filters.mimeTypeGroup && filters.mimeTypeGroup !== "all") {
      params.set("mimeTypeGroup", filters.mimeTypeGroup);
    }
    
    // Only add showSystemFolders if it's false (since true is the default)
    if (!filters.showSystemFolders) {
      params.set("showSystemFolders", "false");
    }
    
    // Navigate to the new URL with search parameters
    const queryString = params.toString();
    const url = `/projects/${projectId}/files${queryString ? `?${queryString}` : ""}`;
    router.push(url);
  };

  return (
    <SearchFilterBar 
      initialFilters={initialFilters}
      onSearch={handleSearch}
    />
  );
} 