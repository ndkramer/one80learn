# One80Learn - Student Learning Platform

A modern, responsive web application for delivering educational content through an interactive learning experience. Built with React, TypeScript, and Supabase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd One80Learn
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your Supabase credentials
   ```
   
   Required environment variables:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   NODE_ENV=development
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Build Tool**: Vite
- **UI Components**: Custom components with Lucide icons
- **Rich Text**: TipTap editor
- **PDF Handling**: react-pdf, pdf-lib, jsPDF
- **Routing**: React Router DOM

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route components
│   ├── admin/          # Admin dashboard pages
│   └── ...             # User-facing pages
├── utils/              # Utility functions and contexts
├── types/              # TypeScript type definitions
└── ...
```

## 🔐 Authentication

Default admin credentials:
- Email: `admin@example.com`
- Password: `Admin123!`

## 🗄️ Database

The project uses Supabase with the following main tables:
- `classes` - Course information
- `modules` - Course modules/lessons
- `resources` - Module resources (PDFs, links)
- `notes` - User notes
- `module_progress` - User progress tracking

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Development Features

- Hot module replacement
- TypeScript type checking
- ESLint code quality
- Responsive design
- Authentication with Supabase
- Real-time data updates
- Rich text editing
- PDF export functionality

## 🚨 Security Notes

There are some security vulnerabilities in dependencies that require breaking changes to fix:
- `dompurify` - XSS vulnerability (affects jsPDF)
- `esbuild` - Development server vulnerability (affects Vite)
- `pdfjs-dist` - PDF.js vulnerability (affects react-pdf)

These are primarily development-time issues. Monitor for updates and consider upgrading when stable versions are available.

## 📝 Admin Features

- Course management
- Module creation and editing
- Resource management
- User enrollment
- Analytics dashboard

## 🎯 User Features

- Course browsing and enrollment
- Interactive module viewing
- Note-taking with rich text
- Progress tracking
- PDF export
- Profile management

## 🌟 Getting Started with Development

1. **Set up Supabase**: Create tables using the migrations in `supabase/migrations/`
2. **Configure environment**: Add your Supabase credentials to `.env.local`
3. **Start coding**: The development server supports hot reload
4. **Test features**: Use the admin account to create test content

## 📚 Documentation

- [Project Plan](Project_Plan.md) - Detailed development roadmap
- [Requirements](requirements.md) - Complete feature specifications
- [Admin Login Info](admin_login.md) - Admin access details

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

**Remember to save to GitHub regularly for backup! 💾** 