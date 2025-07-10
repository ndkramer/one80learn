import React from 'react';
import { Outlet, Link, useLocation, useMatch } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Layout as LayoutIcon, BookOpen, Library, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="h-8 w-8 rounded-full bg-[#F98B3D] flex items-center justify-center">
              <LayoutIcon size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Admin Portal</span>
          </div>
          
          <nav className="space-y-1">
            <Link
              to="/admin/dashboard"
              className={`flex items-center space-x-3 p-3 rounded-md transition-colors duration-200 ${
                isActive('/admin/dashboard')
                  ? 'bg-[#F98B3D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutIcon size={20} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/admin/courses"
              className={`flex items-center space-x-3 p-3 rounded-md transition-colors duration-200 ${
                isActive('/admin/courses')
                  ? 'bg-[#F98B3D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen size={20} />
              <span>Courses</span>
            </Link>
            <Link
              to="/admin/resources"
              className={`flex items-center space-x-3 p-3 rounded-md transition-colors duration-200 ${
                isActive('/admin/resources')
                  ? 'bg-[#F98B3D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Library size={20} />
              <span>Resources</span>
            </Link>
            <Link
              to="/admin/enrollments"
              className={`flex items-center space-x-3 p-3 rounded-md transition-colors duration-200 ${
                location.pathname.startsWith('/admin/enrollments')
                  ? 'bg-[#F98B3D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users size={20} />
              <span>Enrollments</span>
            </Link>
          </nav>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;