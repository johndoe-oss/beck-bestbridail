import React from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { customerToken, adminToken } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (adminOnly && !adminToken) {
      setLocation("/bb-studio/login");
    } else if (!adminOnly && !customerToken) {
      setLocation("/login");
    }
  }, [customerToken, adminToken, adminOnly, setLocation]);

  if (adminOnly && !adminToken) return null;
  if (!adminOnly && !customerToken) return null;

  return adminOnly ? (
    <AdminLayout>
      <Component />
    </AdminLayout>
  ) : (
    <PublicLayout>
      <Component />
    </PublicLayout>
  );
}

export function Protected({ component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  return <ProtectedRoute component={component} adminOnly={adminOnly} />;
}
