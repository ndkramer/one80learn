import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Layers, User, BookOpen, ChevronRight, ChevronDown, ChevronLeft, Shield, BookCopy, Library, Users } from 'lucide-react';
import { useAuth } from '../utils/authContext';
import { useClass } from '../utils/classContext';
import LoadingSpinner from './LoadingSpinner';
import { 
  SkipLink, 
  useFocusManagement, 
  handleKeyboardClick, 
  announceToScreenReader,
  useUniqueId 
} from '../utils/accessibilityUtils';

const Layout: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { enrolledClasses, isLoading } = useClass();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    return stored ? JSON.parse(stored) : false;
  });
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>(() => {
    // Extract classId from URL if it exists
    const match = location.pathname.match(/\/classes\/([^\/]+)/);
    return match ? { [match[1]]: true } : {};
  });
  
  // Accessibility utilities
  const { saveFocus, restoreFocus } = useFocusManagement();
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const navigationId = useUniqueId('main-navigation');
  const sidebarLabelId = useUniqueId('sidebar-label');
  
  // Custom navigation handler for module pages
  const handleNavigation = useCallback((to: string, e: React.MouseEvent) => {
    // Check if we're on a module page
    const isModulePage = location.pathname.includes('/modules/');
    
    // If we're on a module page, we'll let the ModuleDetail component handle the navigation
    if (isModulePage) {
      // Prevent default navigation
      e.preventDefault();
      
      // Create a custom event that ModuleDetail can listen for
      const navigationEvent = new CustomEvent('moduleNavigation', {
        detail: { to }
      });
      
      // Dispatch the event
      window.dispatchEvent(navigationEvent);
      return;
    }
    
    // For non-module pages, navigate normally
    navigate(to);
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Update expanded classes when route changes
    const match = location.pathname.match(/\/classes\/([^\/]+)/);
    if (match) {
      setExpandedClasses({ [match[1]]: true });
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      announceToScreenReader(
        newState ? 'Sidebar collapsed' : 'Sidebar expanded',
        'polite'
      );
      return newState;
    });
  };

  const toggleMobileSidebar = () => {
    if (!sidebarOpen) {
      saveFocus();
      setSidebarOpen(true);
      // Focus first navigation item when sidebar opens
      setTimeout(() => {
        const firstNavItem = sidebarRef.current?.querySelector('a, button');
        if (firstNavItem) {
          (firstNavItem as HTMLElement).focus();
        }
      }, 100);
      announceToScreenReader('Navigation menu opened', 'polite');
    } else {
      setSidebarOpen(false);
      restoreFocus();
      announceToScreenReader('Navigation menu closed', 'polite');
    }
  };

  const toggleClass = (classId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanding = !expandedClasses[classId];
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: isExpanding
    }));
    
    // Announce to screen readers
    const className = enrolledClasses.find(c => c.id === classId)?.title || 'class';
    announceToScreenReader(
      `${className} modules ${isExpanding ? 'expanded' : 'collapsed'}`,
      'polite'
    );
  };

  // Keyboard navigation for escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        toggleMobileSidebar();
      }
    };

    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <Outlet />;
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Skip Links for keyboard users */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href={`#${navigationId}`}>Skip to navigation</SkipLink>
      
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={toggleMobileSidebar}
            aria-hidden="true"
          ></div>
        )}
        
        {/* Sidebar Navigation */}
        <aside 
          ref={sidebarRef}
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-gray-100 text-gray-900 transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
            lg:translate-x-0 lg:static lg:h-screen
          `}
          aria-labelledby={sidebarLabelId}
          aria-hidden={!sidebarOpen && window.innerWidth < 1024}
        >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-2'} focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 rounded`}
              aria-label="One80Learn - Home"
            >
              <div className="h-8 w-8 rounded-full bg-[#F98B3D] flex items-center justify-center">
                <BookOpen size={18} className="text-white" aria-hidden="true" />
              </div>
              {!sidebarCollapsed && <span className="font-bold text-xl text-gray-900">One80Learn</span>}
            </Link>
            <div className="flex items-center">
              <button
                className="hidden lg:block text-gray-500 hover:text-gray-700 transition-colors duration-200 mr-2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50"
                onClick={toggleSidebar}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebarCollapsed}
              >
                <ChevronLeft 
                  size={20} 
                  className={`transform transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <button
                ref={mobileMenuButtonRef}
                className="lg:hidden p-1 rounded text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50"
                onClick={toggleMobileSidebar}
                aria-label="Close navigation menu"
                aria-expanded={sidebarOpen}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
          </div>
          
          <nav 
            id={navigationId}
            className={`mt-10 space-y-1 ${sidebarCollapsed ? 'lg:px-2' : ''} overflow-y-auto max-h-[calc(100vh-200px)]`}
            aria-label="Main navigation"
            role="navigation"
          >
            <h2 id={sidebarLabelId} className="sr-only">Navigation Menu</h2>
            <Link 
              to="/dashboard" 
              onClick={(e) => handleNavigation("/dashboard", e)}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                isActive('/dashboard') ? 'bg-[#F98B3D] text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-label="Dashboard"
              aria-current={isActive('/dashboard') ? 'page' : undefined}
            >
              <Layers size={20} aria-hidden="true" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            
            {/* Enrolled Classes */}
            {!sidebarCollapsed && enrolledClasses.length > 0 && (
              <div className="mt-2 mb-1" role="group" aria-labelledby="enrolled-classes-heading">
                <h3 id="enrolled-classes-heading" className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Enrolled Classes
                </h3>
              </div>
            )}
            {enrolledClasses.map((classItem) => (
              <div key={classItem.id}>
                <div
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-md transition-colors duration-200 ${
                    isActive(`/classes/${classItem.id}`) ? 'bg-[#F98B3D] text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Link
                    to={`/classes/${classItem.id}`}
                    onClick={(e) => handleNavigation(`/classes/${classItem.id}`, e)}
                    className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3'} truncate flex-grow focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded`}
                    aria-label={`${classItem.title} class overview`}
                    aria-current={isActive(`/classes/${classItem.id}`) ? 'page' : undefined}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                    {!sidebarCollapsed && <span className="truncate">{classItem.title}</span>}
                  </Link>
                  {!sidebarCollapsed && (
                    <button
                      onClick={(e) => toggleClass(classItem.id, e)}
                      onKeyDown={(e) => handleKeyboardClick(e, (event) => toggleClass(classItem.id, event))}
                      className="ml-2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                      aria-label={`${expandedClasses[classItem.id] ? 'Collapse' : 'Expand'} ${classItem.title} modules`}
                      aria-expanded={expandedClasses[classItem.id]}
                      aria-controls={`modules-${classItem.id}`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform duration-200 ${
                          expandedClasses[classItem.id] ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
                
                {!sidebarCollapsed && (
                  <div
                    id={`modules-${classItem.id}`}
                    className={`overflow-hidden transition-all duration-200 ${
                      expandedClasses[classItem.id] ? 'max-h-96' : 'max-h-0'
                    }`}
                    role="group"
                    aria-labelledby={`modules-heading-${classItem.id}`}
                    aria-hidden={!expandedClasses[classItem.id]}
                  >
                    <div className="sr-only" id={`modules-heading-${classItem.id}`}>
                      {classItem.title} Modules
                    </div>
                    {classItem.modules.map((module) => (
                      <Link
                        key={module.id}
                        to={`/classes/${classItem.id}/modules/${module.id}`}
                        onClick={(e) => handleNavigation(`/classes/${classItem.id}/modules/${module.id}`, e)}
                        className={`flex items-center space-x-3 pl-8 pr-3 py-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded ${
                          isActive(`/classes/${classItem.id}/modules/${module.id}`)
                            ? 'bg-[#F98B3D]/10 text-[#F98B3D]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        aria-label={`Module ${module.order}: ${module.title}`}
                        aria-current={isActive(`/classes/${classItem.id}/modules/${module.id}`) ? 'page' : undefined}
                      >
                        <div 
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium"
                          aria-hidden="true"
                        >
                          {module.order}.
                        </div>
                        <span className="truncate text-sm">{module.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <Link 
              to="/profile" 
              onClick={(e) => handleNavigation("/profile", e)}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                isActive('/profile') ? 'bg-[#F98B3D] text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-label="User Profile"
              aria-current={isActive('/profile') ? 'page' : undefined}
            >
              <User size={20} aria-hidden="true" />
              {!sidebarCollapsed && <span>Profile</span>}
            </Link>
            
            {/* Control Panel Section - Only visible to super admins */}
            {user?.is_super_admin && (
            <div className="relative" role="group" aria-labelledby="control-panel-heading">
              <button
                onClick={() => setExpandedClasses(prev => ({ ...prev, controlPanel: !prev.controlPanel }))}
                onKeyDown={(e) => handleKeyboardClick(e, () => setExpandedClasses(prev => ({ ...prev, controlPanel: !prev.controlPanel })))}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                  isActive('/admin') ? 'bg-[#F98B3D] text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-expanded={expandedClasses.controlPanel}
                aria-controls="control-panel-menu"
                aria-label={`${expandedClasses.controlPanel ? 'Collapse' : 'Expand'} Control Panel menu`}
              >
                <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3'} truncate flex-grow`}>
                  <Shield size={20} aria-hidden="true" />
                  {!sidebarCollapsed && <span id="control-panel-heading">Control Panel</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform duration-200 ${
                      expandedClasses.controlPanel ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                )}
              </button>
              
              {!sidebarCollapsed && (
                <div
                  id="control-panel-menu"
                  className={`overflow-hidden transition-all duration-200 ${
                    expandedClasses.controlPanel ? 'max-h-48' : 'max-h-0'
                  }`}
                  role="group"
                  aria-labelledby="control-panel-heading"
                  aria-hidden={!expandedClasses.controlPanel}
                >
                  <Link
                    to="/admin/courses"
                    className={`flex items-center pl-11 pr-3 py-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded ${
                      isActive('/admin/courses') ? 'bg-[#F98B3D]/10 text-[#F98B3D]' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Manage Courses"
                    aria-current={isActive('/admin/courses') ? 'page' : undefined}
                  >
                    <span className="text-sm">Courses</span>
                  </Link>
                  <Link
                    to="/admin/resources"
                    className={`flex items-center pl-11 pr-3 py-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded ${
                      isActive('/admin/resources') ? 'bg-[#F98B3D]/10 text-[#F98B3D]' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Manage Resources"
                    aria-current={isActive('/admin/resources') ? 'page' : undefined}
                  >
                    <span className="text-sm">Resources</span>
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`flex items-center pl-11 pr-3 py-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded ${
                      isActive('/admin/users') ? 'bg-[#F98B3D]/10 text-[#F98B3D]' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Manage Users"
                    aria-current={isActive('/admin/users') ? 'page' : undefined}
                  >
                    <span className="text-sm">Users</span>
                  </Link>
                </div>
              )}
            </div>
            )}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="border-t border-gray-200 pt-4">
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 text-gray-700 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50`}
              aria-label="Log out of One80Learn"
              type="button"
            >
              <LogOut size={20} aria-hidden="true" />
              {!sidebarCollapsed && <span>Log Out</span>}
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              ref={mobileMenuButtonRef}
              className="text-gray-700 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50"
              onClick={toggleMobileSidebar}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls={navigationId}
            >
              <Menu size={24} aria-hidden="true" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">One80Learn</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </header>

        <main 
          ref={mainContentRef}
          id="main-content"
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label="Main content"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {isLoading ? (
              <LoadingSpinner text="Loading page content..." />
            ) : (
              <div className="min-h-[calc(100vh-theme(spacing.16))]">
                <Outlet />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default Layout;