# Student Learning Platform Requirements

## Overview
A modern, responsive web application for delivering educational content through an interactive learning experience. The platform supports course management, module-based learning, note-taking, and resource sharing, with a focus on maintainable and scalable development practices.

## Development Guidelines

### File Modifications
- SQL migration files in `/home/project/supabase/migrations` must NEVER be edited
- New migrations must be created as separate files with complete content
- Changes must be formatted as clean, unambiguous diffs
- Build upon the most recent version of files
- Provide sufficient context to avoid ambiguity
- Maintain exact indentation and whitespace
- Order hunks sequentially from top to bottom
- Use only existing context lines

### Terminal Commands
- Use `type="start"` for application/project startup commands
- Use `type="shell"` for other terminal operations
- Dev server restarts are handled automatically after shell commands

### Dependencies
- Always prioritize package.json updates for new dependencies
- Install required dependencies before other operations
- Automatic dependency installation occurs on package.json updates

## Core Features

### 1. Authentication & Authorization
- Email-based authentication system
- Protected routes requiring authentication
- Persistent login state
- Secure logout functionality

### 2. Navigation & Layout
- Collapsible sidebar navigation
- Mobile-responsive design
- Breadcrumb navigation
- Course and module hierarchy display
- Persistent sidebar state
- Active state indicators for current route

### 3. Course Management
- Course listing with visual cards
- Course details view including:
  - Chronological ordering by course date (most recent first)
  - Chronological ordering by course date (most recent first)
  - Course title and description
  - Instructor information
  - Schedule details
  - Module listing
- Course thumbnail images
- Module progression tracking
- Consistent chronological ordering across all views:
  - Dashboard display (most recent first)
  - Sidebar navigation (most recent first)
  - Class listing page
  - Course dates determine display order
- Consistent ordering across all views:
  - Dashboard display
  - Sidebar navigation
  - Class listing page

### 4. Module Features
- Interactive slide presentation viewer
- Module navigation within courses
- Progress tracking
- Resource attachments (PDFs, links)
- Module order and hierarchy

### 5. Note-Taking System
- Rich text editor with formatting options:
  - Bold, italic formatting
  - Strike-through text
  - Bullet and numbered lists
  - Text alignment options
  - Block quotes
  - Keyboard shortcuts
  - Auto-save indicator
  - Last saved timestamp
- Auto-saving functionality
- Success/error state feedback
- Module-specific notes
- User-specific notes:
  - Notes are private and only accessible to the creating user
  - Secure storage with user-based access control
  - Automatic user association with created notes
  - Prevention of unauthorized access to others' notes

### 6. Content Export
- PDF export functionality including:
  - Module content
  - Rich text notes with formatting
  - Slide captures
  - Course information
  - Instructor details
  - Module metadata

### 7. Search Functionality
- Global search across:
  - Modules
  - Resources
  - Notes
- Real-time search results
- Fuzzy matching for better results
- Search result categorization

### 8. User Profile
- Profile information display
- Avatar support
- Profile editing capabilities
- Account settings management
- Profile customization:
  - Personal information updates
  - Contact details management
  - Communication preferences
  - Profile visibility settings
- Password management:
  - Secure password change flow
  - Current password verification
  - Password strength validation
  - Password history tracking
  - Password reset confirmation
  - Security notifications
- Profile data:
  - Name and title
  - Contact information
  - Professional background
  - Educational history
  - Profile picture
  - Time zone preferences
  - Language settings
  - Notification preferences

## Technical Requirements

### Database
- Supabase for data storage and management:
  - User authentication and authorization
  - Course and module data
  - Notes and resources
  - User profiles and preferences
  - Real-time updates
  - Row-level security policies
  - Type-safe database operations
  - Secure API access

### Deployment
- Netlify for web hosting:
  - Continuous deployment
  - SSL/TLS encryption
  - CDN distribution
  - Environment variable management
  - Build optimization
  - Preview deployments
  - Custom domain support
  - Automatic branch deployments

### Frontend
- React 18.3+
- TypeScript 5.5+
- TipTap for rich text editing
- Vite build system
- TailwindCSS for styling
- React Router for navigation
- Lucide React for icons

### State Management
- React Context for auth state
- Local storage for persistent data
- Efficient state updates

### Performance
- Lazy loading for routes
- Optimized image loading
- Responsive design for all screen sizes
- Smooth animations and transitions

### Security
- Protected routes
- Secure authentication flow
- Database row-level security
- Environment variable protection
- User-specific data isolation
- Note access control
- XSS prevention
- CORS compliance
- Secure API endpoints

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browser compatibility
- Responsive breakpoints:
  - Mobile: 320px+
  - Tablet: 768px+
  - Desktop: 1024px+

## User Interface Requirements

### Design System
- Consistent color scheme:
  - Primary: #F98B3D (Orange)
  - Secondary: #e07a2c (Dark Orange)
  - Background: #f9fafb (Light Gray)
  - Text: #111827 (Dark Gray)
- Typography:
  - System font stack
  - Consistent heading hierarchy
  - Readable text sizes
- Component consistency:
  - Button styles
  - Card layouts
  - Form elements
  - Navigation items

### Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Color contrast compliance
- Screen reader compatibility

### Responsive Design
- Mobile-first approach
- Fluid layouts
- Touch-friendly interfaces
- Adaptive content display

## Data Requirements

### User Data
- Profile information
- Authentication state
- User preferences
- Personal notes and annotations:
  - Private note storage
  - User-specific access controls
  - Note ownership tracking
  - Secure note retrieval

### Course Data
- Course metadata
- Module information
- Resource links
- Progress tracking

### Content Storage
- Note persistence
- User preferences
- Rich text content storage
- Supabase tables:
  - Users
  - Courses
  - Modules
  - Notes (with rich text content)
  - Resources
  - User preferences
- Authentication tokens
- Progress tracking
- Profile settings:
  - Password history
  - Security audit logs
  - Profile update history
  - Session management data

## Administrative Features

### Admin Dashboard
- Secure admin access control
- Comprehensive content management:
  - Course creation and editing:
    - Batch course import/export
    - Course template management
    - Course scheduling tools
    - Prerequisite management
  - Module management:
    - Drag-and-drop module reordering
    - Module templates
    - Bulk module operations
  - Resource administration:
    - Resource library management
    - File type validation
    - Storage quota management
  - User management:
    - Bulk user operations
    - User role management
    - Access control groups
    - Activity logs

### Content Management
- Course management:
  - Create, edit, and delete courses
  - Manage course metadata
  - Schedule management
  - Instructor assignment
- Module management:
  - Create and organize modules
  - Order and structure content
  - Resource attachment:
    - File upload management
    - External resource linking
    - Resource categorization
    - Version control
- Slide management:
  - Support for multiple presentation platforms:
    - Google Slides integration
    - Gamma presentation embedding
    - Custom HTML5 presentations
    - PDF slide support
  - Slide deck upload and management
  - Preview functionality:
    - Live preview
    - Mobile preview
    - Presentation mode
    - Offline viewing support
  - Slide organization:
    - Custom slide ordering
    - Slide grouping
    - Transition effects
    - Speaker notes

### User Management
- User account administration
- Role-based access control
- New user provisioning:
  - Admin-controlled user creation
  - Email-based user invitation
  - First-time login password setup:
    - Secure password creation flow
    - Password strength requirements
    - Email verification
  - Automated welcome emails
  - Bulk user import
- Enrollment management
- Activity monitoring
- Administrative roles:
  - Super admin
  - Course admin
  - Content manager
  - Instructor
  - Teaching assistant
- Permission management:
  - Granular permission settings
  - Custom role creation
  - Permission inheritance
  - Access level auditing

### Analytics & Reporting
- Usage statistics
- User engagement metrics
- Progress tracking
- Performance analytics
- Advanced reporting:
  - Custom report builder
  - Scheduled reports
  - Export formats (CSV, PDF, Excel)
  - Data visualization
- Engagement metrics:
  - Time spent per module
  - Resource usage tracking
  - Note-taking activity
  - Completion rates
- Instructor insights:
  - Class performance overview
  - Student engagement trends
  - Resource effectiveness
  - Learning path analysis

### System Configuration
- Platform settings:
  - Branding customization
  - Email templates:
    - Welcome emails
    - Password setup instructions
    - Account activation notifications
    - Admin notifications
  - Notification settings
  - Integration management
- Security settings:
  - Authentication methods
  - Password policies:
    - Minimum requirements
    - Password history
    - First-time setup rules
    - Reset procedures
  - Session management
  - API access control
- Storage management:
  - Content delivery options
  - Backup configuration
  - Archive policies
  - Storage quotas
- Integration settings:
  - LMS connections
  - SSO configuration
  - API key management
  - Webhook configuration

## Future Considerations

### Scalability
- Support for additional course types
- Expandable module system
- Enhanced resource types
- Additional export formats

### Integration
- LMS integration capabilities
- API extensibility
- Third-party tool support
- Analytics integration

### Enhancement Opportunities
- Live collaboration features
- Real-time updates
- Enhanced media support
- Advanced assessment tools