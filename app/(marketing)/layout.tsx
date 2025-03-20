"use client";

import React from "react";

// Explicitly use client-side rendering to avoid server component manifest issues
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 