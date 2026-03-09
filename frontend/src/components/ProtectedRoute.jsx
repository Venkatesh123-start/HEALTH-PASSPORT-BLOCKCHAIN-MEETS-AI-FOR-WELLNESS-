import React, { useContext, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * Role-Based Access Control (RBAC) Protected Route Component
 * Handles authentication and role-based redirects
 *
 * @param {string|string[]} role - Required role(s) to access route
 * @param {string} redirectTo - Custom redirect path (optional)
 * @param {ReactNode} children - Protected content
 */
const ProtectedRoute = ({ role, redirectTo, children }) => {
  const location = useLocation();
  const { isAuthenticated, userRole, loading, getDashboardPath } =
    useContext(AuthContext);

  // Also check localStorage as fallback during initial load
  const token = localStorage.getItem("token");
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // Show loading state briefly during auth initialization
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!token && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get effective role (from context or localStorage)
  const effectiveRole = userRole || storedUser?.role;

  // No role required - allow access to authenticated users
  if (!role) {
    return children;
  }

  // Normalize roles for comparison
  const allowedRoles = Array.isArray(role) ? role : [role];
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
  const normalizedUserRole = effectiveRole?.toLowerCase();

  // Check if user has required role
  const hasRequiredRole = normalizedAllowedRoles.includes(normalizedUserRole);

  if (!hasRequiredRole) {
    // Role mismatch - redirect to appropriate dashboard instead of login
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Smart redirect based on user's actual role
    const dashboardPath = getDashboardPath
      ? getDashboardPath()
      : getRoleDashboard(normalizedUserRole);

    // Prevent redirect loop
    if (location.pathname === dashboardPath) {
      return <Navigate to="/" replace />;
    }

    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};

/**
 * Get dashboard path for a given role (fallback function)
 * @param {string} role - User role
 * @returns {string} Dashboard path
 */
const getRoleDashboard = (role) => {
  switch (role) {
    case "doctor":
      return "/doctor/dashboard";
    case "patient":
      return "/patient/dashboard";
    case "lab":
      return "/lab/dashboard";
    case "insurance":
      return "/insurance/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/";
  }
};

/**
 * Higher-order component for role-based protection
 * Usage: withRoleProtection(['doctor'])(MyComponent)
 */
export const withRoleProtection = (allowedRoles) => {
  return (WrappedComponent) => {
    return function ProtectedComponent(props) {
      return (
        <ProtectedRoute role={allowedRoles}>
          <WrappedComponent {...props} />
        </ProtectedRoute>
      );
    };
  };
};

/**
 * Pre-configured route protection for Doctors
 */
export const DoctorRoute = ({ children }) => (
  <ProtectedRoute role="doctor">{children}</ProtectedRoute>
);

/**
 * Pre-configured route protection for Patients
 */
export const PatientRoute = ({ children }) => (
  <ProtectedRoute role="patient">{children}</ProtectedRoute>
);

/**
 * Pre-configured route protection for Admins
 */
export const AdminRoute = ({ children }) => (
  <ProtectedRoute role="admin">{children}</ProtectedRoute>
);

/**
 * Pre-configured route protection for Lab
 */
export const LabRoute = ({ children }) => (
  <ProtectedRoute role="lab">{children}</ProtectedRoute>
);

/**
 * Pre-configured route protection for Insurance
 */
export const InsuranceRoute = ({ children }) => (
  <ProtectedRoute role="insurance">{children}</ProtectedRoute>
);

export default ProtectedRoute;