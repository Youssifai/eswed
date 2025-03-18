"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";

export default function NavigationDock() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Check if user is inside a project
  const isProjectPage = pathname.includes('/projects/');
  const projectId = isProjectPage ? pathname.split('/projects/')[1].split('/')[0] : null;
  
  // Determine active page within project
  const isProjectBrief = pathname.includes('/brief') || (isProjectPage && !pathname.includes('/inspiration') && !pathname.includes('/files'));
  const isProjectInspiration = pathname.includes('/inspiration');
  const isProjectFiles = pathname.includes('/files');
  
  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  return (
    <div className="flex items-center bg-[#292929] border border-[#4A4A4A] rounded-[10px] p-1.5">
      {/* Home icon - always present */}
      <Link href="/">
        <div className={cn(
          "p-2 rounded-[10px] transition-all",
          pathname === "/" ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
        )}>
          <Home size={25} />
        </div>
      </Link>
      
      <div className="bg-[#4A4A4A] w-[1.5px] rounded-full mx-2 h-6" />
      
      {/* Project-specific navigation */}
      {isProjectPage && (
        <>
          {/* Brief icon */}
          <Link href={`/projects/${projectId}/brief`}>
            <div className={cn(
              "p-2 rounded-[10px] transition-all",
              isProjectBrief ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
            )}>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2.26953V6.40007C14 6.96012 14 7.24015 14.109 7.45406C14.2049 7.64222 14.3578 7.7952 14.546 7.89108C14.7599 8.00007 15.0399 8.00007 15.6 8.00007H19.7305M16 13H8M16 17H8M10 9H8M14 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9265 19.673 20.362C20 19.7202 20 18.8802 20 17.2V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
          
          {/* Inspiration icon */}
          <Link href={`/projects/${projectId}/inspiration`}>
            <div className={cn(
              "p-2 rounded-[10px] transition-all",
              isProjectInspiration ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
            )}>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 17.6586V20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20V17.6586M12 2V3M3 12H2M5.5 5.5L4.8999 4.8999M18.5 5.5L19.1002 4.8999M22 12H21M18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
          
          {/* Project files icon */}
          <Link href={`/projects/${projectId}/files`}>
            <div className={cn(
              "p-2 rounded-[10px] transition-all",
              isProjectFiles ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
            )}>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7L11.8845 4.76892C11.5634 4.1268 11.4029 3.80573 11.1634 3.57116C10.9516 3.36373 10.6963 3.20597 10.4161 3.10931C10.0992 3 9.74021 3 9.02229 3H5.2C4.0799 3 3.51984 3 3.09202 3.21799C2.71569 3.40973 2.40973 3.71569 2.21799 4.09202C2 4.51984 2 5.0799 2 6.2V7M2 7H17.2C18.8802 7 19.7202 7 20.362 7.32698C20.9265 7.6146 21.3854 8.07354 21.673 8.63803C22 9.27976 22 10.1198 22 11.8V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
          
          <div className="bg-[#4A4A4A] w-[1.5px] rounded-full mx-2 h-6" />
        </>
      )}
      
      {/* Help icon */}
      <Link href="/help">
        <div className={cn(
          "p-2 rounded-[10px] transition-all",
          pathname === "/help" ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
        )}>
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 8.50224C10.1762 8.00136 10.524 7.579 10.9817 7.30998C11.4395 7.04095 11.9777 6.9426 12.501 7.03237C13.0243 7.12213 13.499 7.39421 13.8409 7.80041C14.1829 8.20661 14.37 8.72072 14.3692 9.25168C14.3692 10.7506 12.1209 11.5 12.1209 11.5M12.1499 14.5H12.1599M9.9 19.2L11.36 21.1467C11.5771 21.4362 11.6857 21.5809 11.8188 21.6327C11.9353 21.678 12.0647 21.678 12.1812 21.6327C12.3143 21.5809 12.4229 21.4362 12.64 21.1467L14.1 19.2C14.3931 18.8091 14.5397 18.6137 14.7185 18.4645C14.9569 18.2656 15.2383 18.1248 15.5405 18.0535C15.7671 18 16.0114 18 16.5 18C17.8978 18 18.5967 18 19.1481 17.7716C19.8831 17.4672 20.4672 16.8831 20.7716 16.1481C21 15.5967 21 14.8978 21 13.5V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V13.5C3 14.8978 3 15.5967 3.22836 16.1481C3.53284 16.8831 4.11687 17.4672 4.85195 17.7716C5.40326 18 6.10218 18 7.5 18C7.98858 18 8.23287 18 8.45951 18.0535C8.76169 18.1248 9.04312 18.2656 9.2815 18.4645C9.46028 18.6137 9.60685 18.8091 9.9 19.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Link>
      
      {/* User profile menu */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={cn(
            "p-2 rounded-[10px] transition-all",
            pathname === "/profile" ? "bg-[#1E1E1E] scale-95" : "hover:bg-[#1E1E1E]/40"
          )}
        >
          <User size={25} />
        </button>
        
        {showProfileMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-[#292929] border border-[#4A4A4A] rounded-lg p-1 w-44 shadow-lg">
            <Link href="/account">
              <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#1E1E1E] transition-colors">
                <Settings size={16} />
                <span>Account settings</span>
              </div>
            </Link>
            <button 
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 px-3 py-2 rounded hover:bg-[#1E1E1E] transition-colors text-left"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 