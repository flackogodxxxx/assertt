import { Navigate, Outlet } from "react-router-dom";
import { type Role, useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-carbon-950">
        <div className="animate-load-bar h-1 w-32 bg-assert-500 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "Admin") {
    return <Navigate to="/crm/unauthorized" replace />;
  }

  return <Outlet />;
}
