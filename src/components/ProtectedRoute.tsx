// src/components/ProtectedRoute.tsx
// Client-side authentication protection

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user has a session
        const { session } = await getSession();
        
        if (!session) {
          console.log('No session found - redirecting to login');
          router.push('/login?redirectTo=' + window.location.pathname);
          return;
        }

        // If super admin is required, check role
        if (requireSuperAdmin) {
          const isSuperAdminUser = await isSuperAdmin();
          
          if (!isSuperAdminUser) {
            console.log('Not a super admin - redirecting to login');
            router.push('/login?error=unauthorized');
            return;
          }
        }

        // User is authorized
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router, requireSuperAdmin]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B6777]"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthorized) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}