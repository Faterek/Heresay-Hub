"use client";

import { Navbar } from "./navbar";

interface PageLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
}

export function PageLayout({ children, showNavbar = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
}
