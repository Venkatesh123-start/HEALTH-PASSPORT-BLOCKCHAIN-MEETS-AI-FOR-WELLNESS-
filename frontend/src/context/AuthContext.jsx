import { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

/**
 * Role-Based Access Control (RBAC) AuthProvider
 * Stores user authentication state, role, and profile data
 */
export const AuthProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // Full user object with role-specific fields
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        const storedUser = localStorage.getItem("user");

        if (token && role) {
          setIsAuthenticated(true);
          setUserRole(role);

          // Parse stored user data if available
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error("Error initializing auth state:", error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login user with full data
   * @param {string} role - User role (patient, doctor, admin, lab, insurance)
   * @param {Object} userData - Full user object with role-specific fields
   */
  const loginUser = useCallback((role, userData = null) => {
    setIsAuthenticated(true);
    setUserRole(role);

    if (userData) {
      // Store user data with role-specific fields
      const userProfile = {
        _id: userData._id || userData.id,
        id: userData._id || userData.id, // Keep both for compatibility
        name: userData.name,
        email: userData.email,
        role: role,
        walletAddress: userData.walletAddress,
        did: userData.did, // Decentralized ID for blockchain
        // Doctor-specific fields
        ...(role === "doctor" && {
          specialty: userData.specialty,
          licenseNumber: userData.licenseNumber,
        }),
        // Patient-specific fields
        ...(role === "patient" && {
          dateOfBirth: userData.dateOfBirth,
          bloodType: userData.bloodType,
        }),
      };

      setUser(userProfile);
      localStorage.setItem("user", JSON.stringify(userProfile));
    }

    localStorage.setItem("role", role);
  }, []);

  /**
   * Logout user and clear all stored data
   */
  const logoutUser = useCallback(() => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setUser(null);
  }, []);

  /**
   * Check if current user has specific role
   * @param {string|string[]} roles - Role or array of roles to check
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (roles) => {
      if (!userRole) return false;
      const rolesArray = Array.isArray(roles) ? roles : [roles];
      return rolesArray.map((r) => r.toLowerCase()).includes(userRole.toLowerCase());
    },
    [userRole]
  );

  /**
   * Check if user is a Doctor
   * @returns {boolean}
   */
  const isDoctor = useCallback(() => {
    return userRole?.toLowerCase() === "doctor";
  }, [userRole]);

  /**
   * Check if user is a Patient
   * @returns {boolean}
   */
  const isPatient = useCallback(() => {
    return userRole?.toLowerCase() === "patient";
  }, [userRole]);

  /**
   * Get role-based dashboard path
   * @returns {string} Dashboard path for current user's role
   */
  const getDashboardPath = useCallback(() => {
    switch (userRole?.toLowerCase()) {
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
  }, [userRole]);

  /**
   * Update user profile data
   * @param {Object} updates - Fields to update
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        user,
        loading,
        loginUser,
        logoutUser,
        hasRole,
        isDoctor,
        isPatient,
        getDashboardPath,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};