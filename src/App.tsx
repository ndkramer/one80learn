import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './utils/authContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import ClassList from './pages/ClassList';
import ClassDetail from './pages/ClassDetail';
import ModuleDetail from './pages/ModuleDetail';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { ClassProvider } from './utils/classContext';
import { ModuleProvider } from './utils/moduleContext';
import { NoteProvider } from './utils/noteContext';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseAdmin from './pages/admin/CourseAdmin';
import ResourceAdmin from './pages/admin/ResourceAdmin';
import UserAdmin from './pages/admin/UserAdmin';
import ModuleAdmin from './pages/admin/ModuleAdmin';
import ModuleResourcesPage from './pages/admin/ModuleResourcesPage';
import AdminLayout from './pages/admin/AdminLayout';
import EnrollmentCourseList from './pages/admin/EnrollmentCourseList';
import EnrollmentUserSelection from './pages/admin/EnrollmentUserSelection';
import { AdminAuthProvider } from './utils/adminAuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();
  const location = useLocation();
  
  console.log('App: ProtectedRoute check -', { isAuthenticated, isLoading, isInitialized });
  
  // Show loading spinner until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Only redirect once auth is fully initialized
  // Allow access to set-password route even when authenticated
  const isSetPasswordRoute = location.pathname === '/set-password';
  console.log('App: ProtectedRoute - isSetPasswordRoute:', isSetPasswordRoute, 'user needs password set:', user?.needs_password_set);

  // Check if user needs to set password and redirect if needed
  if (isAuthenticated && !isSetPasswordRoute && user?.needs_password_set === true) {
    console.log('App: User needs to set password or just confirmed email, redirecting to /set-password');
    return <Navigate to="/set-password" />;
  }
  
  if (!isAuthenticated && !isSetPasswordRoute) {
    console.log('App: User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  console.log('App: Rendering App component');
  
  // Note: The /set-password route is now outside the ProtectedRoute wrapper
  // so it can be accessed regardless of authentication status
  return (
    <Router>
      <Routes>
        {/* Auth Routes - These should be accessible without authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Set password route - explicitly outside ProtectedRoute to avoid auth redirects */}
        <Route path="/set-password" element={
          <div className="min-h-screen bg-gray-50">
            <SetPassword />
          </div>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminAuthProvider>
              <AdminLayout>
                <Outlet />
              </AdminLayout>
            </AdminAuthProvider>
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="courses" element={<CourseAdmin />} />
          <Route path="courses/:courseId/modules" element={<ModuleAdmin />} />
          <Route path="courses/:courseId/modules/:moduleId/resources" element={<ModuleResourcesPage />} />
          <Route path="enrollments" element={<EnrollmentCourseList />} />
          <Route path="enrollments/:courseId" element={<EnrollmentUserSelection />} />
          <Route path="resources" element={<ResourceAdmin />} />
          <Route path="users" element={<UserAdmin />} />
        </Route>

        {/* Protected User Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <ClassProvider>
              <ModuleProvider>
                <NoteProvider>
                  <Layout>
                    <Outlet />
                  </Layout>
                </NoteProvider>
              </ModuleProvider>
            </ClassProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard\" replace />} />
          <Route path="dashboard/*" element={<Dashboard />} />
          <Route path="classes" element={<ClassList />} />
          <Route path="classes/:classId" element={<ClassDetail />} />
          <Route path="classes/:classId/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;