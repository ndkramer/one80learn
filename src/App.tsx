import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './utils/authContext';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { ClassProvider } from './utils/classContext';
import { ModuleProvider } from './utils/moduleContext';
import { NoteProvider } from './utils/noteContext';
import { AdminAuthProvider } from './utils/adminAuthContext';
import { ErrorProvider, useErrorContext, useOfflineSupport } from './utils/errorUtils';
import ErrorDisplay, { OfflineIndicator } from './components/ErrorDisplay';
import ErrorBoundary, { AsyncErrorBoundary } from './components/ErrorBoundary';

// Create a client for React Query with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        // Don't retry on not found errors
        if (error?.status === 404) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst', // Better offline handling
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      networkMode: 'offlineFirst',
    },
  },
});

// Lazy load auth pages
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const SetPassword = React.lazy(() => import('./pages/SetPassword'));

// Lazy load main app pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ClassList = React.lazy(() => import('./pages/ClassList'));
const ClassDetail = React.lazy(() => import('./pages/ClassDetail'));
const ModuleDetail = React.lazy(() => import('./pages/ModuleDetail'));
const Profile = React.lazy(() => import('./pages/Profile'));

// Lazy load admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const CourseAdmin = React.lazy(() => import('./pages/admin/CourseAdmin'));
const ResourceAdmin = React.lazy(() => import('./pages/admin/ResourceAdmin'));
const UserAdmin = React.lazy(() => import('./pages/admin/UserAdmin'));
const ModuleAdmin = React.lazy(() => import('./pages/admin/ModuleAdmin'));
const ModuleResourcesPage = React.lazy(() => import('./pages/admin/ModuleResourcesPage'));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const EnrollmentCourseList = React.lazy(() => import('./pages/admin/EnrollmentCourseList'));
const EnrollmentUserSelection = React.lazy(() => import('./pages/admin/EnrollmentUserSelection'));

// Enhanced loading fallback with error boundary
const LoadingFallback = ({ text = "Loading..." }: { text?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner text={text} />
  </div>
);

// Error-aware Suspense wrapper
const SuspenseWithErrorBoundary: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  isolate?: boolean;
}> = ({ children, fallback = <LoadingSpinner />, isolate = false }) => (
  <ErrorBoundary isolate={isolate}>
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();
  const location = useLocation();
  
  console.log('App: ProtectedRoute check -', { isAuthenticated, isLoading, isInitialized });
  
  // Show loading spinner until auth is initialized
  if (!isInitialized) {
    return <LoadingFallback text="Initializing..." />;
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

// Global error display and offline management
const GlobalErrorManager: React.FC = () => {
  const { errors, removeError } = useErrorContext();
  const { isOnline } = useOfflineSupport();

  // Retry function for error display
  const handleRetry = async (error: any) => {
    // Implement global retry logic
    console.log('Retrying error:', error.id);
    
    // For now, just remove the error - specific components will handle their own retry logic
    removeError(error.id);
  };

  return (
    <>
      <ErrorDisplay
        errors={errors}
        onDismiss={removeError}
        onRetry={handleRetry}
        position="top"
        maxVisible={3}
      />
      <OfflineIndicator isVisible={!isOnline} />
    </>
  );
};

function App() {
  console.log('App: Rendering App component');
  
  return (
    <AsyncErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <Router>
            <GlobalErrorManager />
            
            <Routes>
              {/* Auth Routes - Wrapped in Suspense for code splitting */}
              <Route path="/login" element={
                <SuspenseWithErrorBoundary 
                  fallback={<LoadingFallback text="Loading login..." />}
                  isolate={true}
                >
                  <Login />
                </SuspenseWithErrorBoundary>
              } />
              <Route path="/signup" element={
                <SuspenseWithErrorBoundary 
                  fallback={<LoadingFallback text="Loading signup..." />}
                  isolate={true}
                >
                  <Signup />
                </SuspenseWithErrorBoundary>
              } />
              <Route path="/reset-password" element={
                <SuspenseWithErrorBoundary 
                  fallback={<LoadingFallback text="Loading reset password..." />}
                  isolate={true}
                >
                  <ResetPassword />
                </SuspenseWithErrorBoundary>
              } />
              <Route path="/set-password" element={
                <SuspenseWithErrorBoundary 
                  fallback={<LoadingFallback text="Loading set password..." />}
                  isolate={true}
                >
                  <div className="min-h-screen bg-gray-50">
                    <SetPassword />
                  </div>
                </SuspenseWithErrorBoundary>
              } />

              {/* Admin Routes - Wrapped in Suspense */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminAuthProvider>
                    <SuspenseWithErrorBoundary fallback={<LoadingFallback text="Loading admin..." />}>
                      <AdminLayout>
                        <Outlet />
                      </AdminLayout>
                    </SuspenseWithErrorBoundary>
                  </AdminAuthProvider>
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <AdminDashboard />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="courses" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <CourseAdmin />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="courses/:courseId/modules" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ModuleAdmin />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="courses/:courseId/modules/:moduleId/resources" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ModuleResourcesPage />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="enrollments" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <EnrollmentCourseList />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="enrollments/:courseId" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <EnrollmentUserSelection />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="resources" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ResourceAdmin />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="users" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <UserAdmin />
                  </SuspenseWithErrorBoundary>
                } />
              </Route>

              {/* Protected User Routes - Wrapped in Suspense */}
              <Route path="/" element={
                <ProtectedRoute>
                  <ClassProvider>
                    <ModuleProvider>
                      <NoteProvider>
                        <Layout>
                          <SuspenseWithErrorBoundary fallback={<LoadingSpinner />}>
                            <Outlet />
                          </SuspenseWithErrorBoundary>
                        </Layout>
                      </NoteProvider>
                    </ModuleProvider>
                  </ClassProvider>
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard/*" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <Dashboard />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="classes" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ClassList />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="classes/:classId" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ClassDetail />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="classes/:classId/modules/:moduleId" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <ModuleDetail />
                  </SuspenseWithErrorBoundary>
                } />
                <Route path="profile" element={
                  <SuspenseWithErrorBoundary fallback={<LoadingSpinner />} isolate={true}>
                    <Profile />
                  </SuspenseWithErrorBoundary>
                } />
              </Route>
              
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </ErrorProvider>
      </QueryClientProvider>
    </AsyncErrorBoundary>
  );
}

export default App;