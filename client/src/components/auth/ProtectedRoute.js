// Protected route component
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../common/Loading';

/**
 * ProtectedRoute component that checks if user is authenticated
 * and optionally if user has the required role(s)
 * @param {Object} props Component props
 * @param {string|string[]} [props.requiredRoles] Optional roles required to access the route
 */
const ProtectedRoute = ({ requiredRoles }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return <Loading message="Checking authentication..." />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If roles are required, check if user has the required role
  if (requiredRoles && !hasRole(requiredRoles)) {
    // If user doesn't have the required role, redirect to unauthorized page
    return <Navigate to="/unauthorized" />;
  }

  // If authenticated and has required role, render the children routes
  return <Outlet />;
};

export default ProtectedRoute;