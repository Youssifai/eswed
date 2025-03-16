"use client";

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import NavigationDock from '@/components/dock';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Main content */}
      <main className="flex-1 px-[140px] pt-[90px] pb-20 overflow-hidden">
        {children}
      </main>

      {/* Dock navigation */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <NavigationDock />
      </div>
    </div>
  );
} 