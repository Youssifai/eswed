import React from "react";
import { Suspense } from "react";

// Remove "use client" since layouts should be server components by default
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </Suspense>
  );
} 