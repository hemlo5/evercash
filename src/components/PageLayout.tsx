import { ReactNode } from "react";
import { MobileNavButton } from "@/components/MobileNav";

interface PageLayoutProps {
  children: ReactNode;
  showMobileNav?: boolean;
}

export function PageLayout({ children, showMobileNav = true }: PageLayoutProps) {
  return (
    <div className="relative">
      {/* Mobile Navigation Button - Fixed position for all pages */}
      {showMobileNav && (
        <div className="fixed top-4 right-4 z-30 md:hidden">
          <MobileNavButton />
        </div>
      )}
      
      {/* Page Content */}
      {children}
    </div>
  );
}
