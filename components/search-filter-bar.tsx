import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, FilterIcon, XIcon } from "lucide-react";
import { FILE_TYPE_GROUPS } from "@/lib/constants";

export interface SearchFilters {
  query: string;
  fileType: "file" | "folder" | "any" | "";
  mimeTypeGroup: string;
  showSystemFolders: boolean;
}

interface SearchFilterBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
}

export function SearchFilterBar({ onSearch, initialFilters = {} }: SearchFilterBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialFilters.query || "",
    fileType: initialFilters.fileType || "any",
    mimeTypeGroup: initialFilters.mimeTypeGroup || "all",
    showSystemFolders: initialFilters.showSystemFolders !== false,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Count active filters (excluding query)
  useEffect(() => {
    let count = 0;
    if (filters.fileType && filters.fileType !== "any") count++;
    if (filters.mimeTypeGroup !== "all") count++;
    if (!filters.showSystemFolders) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  // For passing to the search function, convert "any" to empty string 
  // to maintain backward compatibility with existing search logic
  const getSearchFilters = () => {
    return {
      ...filters,
      fileType: filters.fileType === "any" ? "" : filters.fileType,
    };
  };

  // Trigger search whenever filters change
  useEffect(() => {
    // Add a small delay to avoid excessive searches while typing
    const handler = setTimeout(() => {
      onSearch(getSearchFilters());
    }, 300);
    
    return () => clearTimeout(handler);
  }, [filters, onSearch]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch(getSearchFilters());
    }
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: "",
      fileType: "any",
      mimeTypeGroup: "all",
      showSystemFolders: true,
    };
    setFilters(resetFilters);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, type, description, tags..."
            className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-400"
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {filters.query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-neutral-700"
              onClick={() => updateFilter("query", "")}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 hover:text-white"
            >
              <FilterIcon className="h-4 w-4 mr-1" /> 
              Filters 
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-neutral-700 text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-neutral-800 border-neutral-700 text-white">
            <div className="p-2 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">File Type</label>
                <Select
                  value={filters.fileType}
                  onValueChange={(value) => updateFilter("fileType", value)}
                >
                  <SelectTrigger className="h-8 bg-neutral-700 border-neutral-600 text-white">
                    <SelectValue placeholder="Any Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectItem value="any" className="focus:bg-neutral-700 focus:text-white">Any Type</SelectItem>
                    <SelectItem value="file" className="focus:bg-neutral-700 focus:text-white">Files Only</SelectItem>
                    <SelectItem value="folder" className="focus:bg-neutral-700 focus:text-white">Folders Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">File Format</label>
                <Select
                  value={filters.mimeTypeGroup}
                  onValueChange={(value) => updateFilter("mimeTypeGroup", value)}
                >
                  <SelectTrigger className="h-8 bg-neutral-700 border-neutral-600 text-white">
                    <SelectValue placeholder="All Formats" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                    {FILE_TYPE_GROUPS.map((group) => (
                      <SelectItem 
                        key={group.value} 
                        value={group.value}
                        className="focus:bg-neutral-700 focus:text-white"
                      >
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-neutral-700">
                <DropdownMenuCheckboxItem
                  checked={filters.showSystemFolders}
                  onCheckedChange={(checked) => 
                    updateFilter("showSystemFolders", checked === true)
                  }
                  className="text-white focus:bg-neutral-700 focus:text-white"
                >
                  Show System Folders
                </DropdownMenuCheckboxItem>
              </div>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 hover:bg-neutral-700 text-white"
                  onClick={handleReset}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Display active filters as badges */}
        {filters.fileType && filters.fileType !== "any" && (
          <Badge variant="secondary" className="h-8 bg-neutral-700 text-white">
            {filters.fileType === "file" ? "Files Only" : "Folders Only"}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 text-gray-300 hover:text-white hover:bg-transparent"
              onClick={() => updateFilter("fileType", "any")}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {filters.mimeTypeGroup !== "all" && (
          <Badge variant="secondary" className="h-8 bg-neutral-700 text-white">
            {FILE_TYPE_GROUPS.find(g => g.value === filters.mimeTypeGroup)?.label || ""}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 text-gray-300 hover:text-white hover:bg-transparent"
              onClick={() => updateFilter("mimeTypeGroup", "all")}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {!filters.showSystemFolders && (
          <Badge variant="secondary" className="h-8 bg-neutral-700 text-white">
            No System Folders
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 text-gray-300 hover:text-white hover:bg-transparent"
              onClick={() => updateFilter("showSystemFolders", true)}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
} 