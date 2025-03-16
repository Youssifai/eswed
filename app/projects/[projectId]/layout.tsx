"use client";

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import NavigationDock from '@/components/dock';
import Breadcrumb from '@/components/breadcrumb';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const projectId = params.projectId as string;
  const pathname = usePathname();
  const isInspirationPage = pathname.includes('/inspiration');

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Breadcrumb */}
      <div className="pt-6 px-[140px]">
        <Breadcrumb />
      </div>
      
      {/* Main content */}
      <main className={`flex-1 ${isInspirationPage ? 'p-0' : 'px-[140px] pt-6'} pb-20 overflow-hidden`}>
        {children}
      </main>

      {/* Dock navigation */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <NavigationDock />
      </div>
    </div>
  );
} 