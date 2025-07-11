import React from 'react';

// Base skeleton component with animation
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    aria-hidden="true"
  />
);

// Skeleton for ClassCard components
export const ClassCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden" role="status" aria-label="Loading class">
    <SkeletonBase className="h-52 w-full" />
    <div className="p-6">
      <SkeletonBase className="h-6 w-3/4 mb-3" />
      <SkeletonBase className="h-4 w-full mb-2" />
      <SkeletonBase className="h-4 w-2/3 mb-4" />
      <div className="flex justify-between items-center">
        <SkeletonBase className="h-4 w-20" />
        <SkeletonBase className="h-10 w-24 rounded-md" />
      </div>
    </div>
    <span className="sr-only">Loading class information...</span>
  </div>
);

// Skeleton for ModuleCard components
export const ModuleCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow-md" role="status" aria-label="Loading module">
    <div className="flex justify-between items-start mb-4">
      <SkeletonBase className="h-6 w-2/3" />
      <SkeletonBase className="h-8 w-8 rounded-full" />
    </div>
    <SkeletonBase className="h-4 w-full mb-2" />
    <SkeletonBase className="h-4 w-3/4 mb-4" />
    <div className="flex justify-between items-center">
      <SkeletonBase className="h-4 w-16" />
      <SkeletonBase className="h-6 w-20 rounded-full" />
    </div>
    <span className="sr-only">Loading module information...</span>
  </div>
);

// Skeleton for Dashboard stats cards
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow-md" role="status" aria-label="Loading statistics">
    <div className="flex items-center">
      <SkeletonBase className="h-12 w-12 rounded-lg mr-4" />
      <div className="flex-1">
        <SkeletonBase className="h-4 w-20 mb-2" />
        <SkeletonBase className="h-8 w-16" />
      </div>
    </div>
    <span className="sr-only">Loading statistics...</span>
  </div>
);

// Skeleton for user profile information
export const ProfileSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6" role="status" aria-label="Loading profile">
    <div className="flex items-center mb-6">
      <SkeletonBase className="h-20 w-20 rounded-full mr-4" />
      <div className="flex-1">
        <SkeletonBase className="h-6 w-40 mb-2" />
        <SkeletonBase className="h-4 w-32" />
      </div>
    </div>
    <div className="space-y-4">
      <div>
        <SkeletonBase className="h-4 w-16 mb-2" />
        <SkeletonBase className="h-10 w-full" />
      </div>
      <div>
        <SkeletonBase className="h-4 w-20 mb-2" />
        <SkeletonBase className="h-10 w-full" />
      </div>
      <div>
        <SkeletonBase className="h-4 w-24 mb-2" />
        <SkeletonBase className="h-24 w-full" />
      </div>
    </div>
    <span className="sr-only">Loading profile information...</span>
  </div>
);

// Skeleton for table rows
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <tr role="status" aria-label="Loading table row">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <SkeletonBase className="h-4 w-full" />
      </td>
    ))}
    <span className="sr-only">Loading table data...</span>
  </tr>
);

// Skeleton for list items
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center p-4 border-b border-gray-200" role="status" aria-label="Loading list item">
    <SkeletonBase className="h-10 w-10 rounded-full mr-3" />
    <div className="flex-1">
      <SkeletonBase className="h-4 w-3/4 mb-2" />
      <SkeletonBase className="h-3 w-1/2" />
    </div>
    <SkeletonBase className="h-6 w-16 rounded-full" />
    <span className="sr-only">Loading list item...</span>
  </div>
);

// Skeleton for form fields
export const FormFieldSkeleton: React.FC = () => (
  <div className="mb-4" role="status" aria-label="Loading form field">
    <SkeletonBase className="h-4 w-24 mb-2" />
    <SkeletonBase className="h-10 w-full rounded-md" />
    <span className="sr-only">Loading form field...</span>
  </div>
);

// Skeleton for navigation items
export const NavItemSkeleton: React.FC = () => (
  <div className="flex items-center p-3 rounded-md" role="status" aria-label="Loading navigation">
    <SkeletonBase className="h-5 w-5 mr-3" />
    <SkeletonBase className="h-4 w-20" />
    <span className="sr-only">Loading navigation item...</span>
  </div>
);

// Skeleton for content sections
export const ContentSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-3" role="status" aria-label="Loading content">
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonBase 
        key={index} 
        className={`h-4 ${
          index === lines - 1 ? 'w-2/3' : 'w-full'
        }`} 
      />
    ))}
    <span className="sr-only">Loading content...</span>
  </div>
);

// Skeleton for PDF viewer
export const PDFSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6" role="status" aria-label="Loading PDF">
    <div className="mb-4 flex justify-between items-center">
      <SkeletonBase className="h-6 w-32" />
      <div className="flex space-x-2">
        <SkeletonBase className="h-8 w-8 rounded" />
        <SkeletonBase className="h-8 w-8 rounded" />
        <SkeletonBase className="h-8 w-20 rounded" />
      </div>
    </div>
    <SkeletonBase className="h-96 w-full rounded-lg" />
    <div className="mt-4 flex justify-center">
      <SkeletonBase className="h-8 w-32 rounded" />
    </div>
    <span className="sr-only">Loading PDF viewer...</span>
  </div>
);

// Skeleton for admin dashboard
export const AdminDashboardSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading admin dashboard">
    {/* Header */}
    <div className="flex justify-between items-center">
      <SkeletonBase className="h-8 w-48" />
      <SkeletonBase className="h-10 w-32 rounded-md" />
    </div>
    
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <StatsCardSkeleton key={index} />
      ))}
    </div>
    
    {/* Table */}
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <SkeletonBase className="h-6 w-32" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: 5 }).map((_, index) => (
                <th key={index} className="px-6 py-3">
                  <SkeletonBase className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={5} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <span className="sr-only">Loading admin dashboard...</span>
  </div>
);

// Skeleton for class detail page
export const ClassDetailSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading class details">
    {/* Header */}
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start space-x-6">
        <SkeletonBase className="h-32 w-48 rounded-lg" />
        <div className="flex-1">
          <SkeletonBase className="h-8 w-3/4 mb-4" />
          <SkeletonBase className="h-4 w-full mb-2" />
          <SkeletonBase className="h-4 w-2/3 mb-4" />
          <div className="flex space-x-4">
            <SkeletonBase className="h-6 w-20 rounded-full" />
            <SkeletonBase className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    
    {/* Modules */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <ModuleCardSkeleton key={index} />
      ))}
    </div>
    <span className="sr-only">Loading class details...</span>
  </div>
);

// Comprehensive page skeleton for full page loading
export const PageSkeleton: React.FC<{ type?: 'dashboard' | 'list' | 'detail' | 'admin' }> = ({ 
  type = 'dashboard' 
}) => {
  switch (type) {
    case 'admin':
      return <AdminDashboardSkeleton />;
    case 'detail':
      return <ClassDetailSkeleton />;
    case 'list':
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <SkeletonBase className="h-8 w-48" />
            <SkeletonBase className="h-10 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <ClassCardSkeleton key={index} />
            ))}
          </div>
        </div>
      );
    case 'dashboard':
    default:
      return (
        <div className="space-y-6">
          <SkeletonBase className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatsCardSkeleton key={index} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <ClassCardSkeleton key={index} />
            ))}
          </div>
        </div>
      );
  }
}; 