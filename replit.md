# SEO Project Timeline Dashboard

## Overview

This is a comprehensive SEO project management dashboard built as a full-stack web application. The system is designed around the SEO Masterplan framework with four key pillars: Technical SEO, On-Page & Content, Off-Page SEO, and Analytics & Tracking. The application supports multi-tenant collaboration with role-based permissions and provides interactive timeline management through Gantt charts.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite for development and production builds
- **Forms**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Design**: Normalized relational structure with foreign key constraints
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Authentication System
- Replit Auth integration providing OAuth2/OpenID Connect flow
- Session-based authentication with secure HTTP-only cookies
- User profile management with automatic account creation
- Protected routes requiring authentication

### Project Management
- Multi-tenant project isolation with owner-based access control
- Project member management with edit/view permission levels
- Project statistics calculation (completion rates, progress tracking)
- Soft deletion and data integrity constraints

### Task Management
- Comprehensive task system with SEO-specific categorization
- Four-pillar classification: Technical, On-Page & Content, Off-Page, Analytics
- Three-phase progression: Foundation, Growth, Authority
- Progress tracking with percentage completion
- Status management: Not Started, In Progress, Completed, On Hold, Overdue
- Assignment system with user references

### Timeline Visualization
- Interactive Gantt chart implementation
- Drag-and-drop task scheduling
- Visual progress indicators
- Color-coded pillar identification
- Responsive timeline scaling

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect discovery and token exchange
3. Session creation with PostgreSQL storage
4. User profile upsert in database
5. Client-side authentication state management

### Project Data Flow
1. User creates/selects project
2. Project access validation (ownership/membership)
3. Task data retrieval with user associations
4. Client-side filtering and sorting
5. Real-time updates through React Query

### Task Management Flow
1. Task creation with validation
2. Database insertion with foreign key constraints
3. Progress calculation and status updates
4. Timeline recalculation and re-rendering
5. Optimistic UI updates with error handling

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL connection management
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui**: Accessible UI primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server
- **vite**: Frontend development and bundling
- **tailwindcss**: Utility-first CSS framework

### Authentication & Security
- **openid-client**: OAuth2/OpenID Connect client
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session management

## Deployment Strategy

### Development Environment
- Replit-optimized configuration with hot reload
- PostgreSQL module integration
- Development server on port 5000
- Automatic restart on file changes

### Production Build
- Two-stage build process: client (Vite) and server (esbuild)
- Static asset serving with Express
- Environment variable configuration
- Database connection pooling for performance

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key (required)
- **REPLIT_DOMAINS**: OAuth redirect domains (required)
- **ISSUER_URL**: OpenID Connect issuer endpoint (optional)

### Scaling Considerations
- Stateless server design for horizontal scaling
- PostgreSQL connection pooling
- Session storage in database for multi-instance support
- CDN-ready static asset structure

## Recent Changes

```
- June 21, 2025: Enhanced dashboard with premium liquid glass effects and specular highlights
- Added glassmorphism design across all components (navigation, modals, forms, cards)
- Implemented translucent glass elements with backdrop blur and gradient animations
- Applied specular highlights on interactive elements and text
- Created comprehensive PHP integration guide for existing DMS systems
- Fixed Select component console errors by replacing empty string values
- Updated all input fields and triggers with frosted glass styling
- Implemented comprehensive Member Authority (MA) algorithm with E-E-A-T scoring system
- Added task items management with granular progress tracking and sub-items
- Built social validation system with peer reviews, ratings, and authority-weighted feedback
- Created grace period request system for handling negative reviews and performance recovery
- Enhanced database schema with task items, reviews, authority history, and social metrics
- Fixed JSX syntax errors and missing imports in TaskDetailSidebar component
- Completed API endpoints for task items, reviews, and member authority features
- Integrated MemberAuthorityDisplay component throughout the application
- Added comprehensive sub-task system with create, update, and review functionality
- Implemented real-time authority scoring based on peer reviews and task performance
- June 22, 2025: Transformed SEO Timeline into comprehensive Document Management System (DMS)
- Implemented complete DMS database schema with document tables, versioning, and access control
- Created premium Admin Dashboard with document library management and user administration
- Built intuitive Client Documents area with category filtering and project integration
- Added extensive DMS API endpoints for document CRUD, task linking, and access permissions
- Enhanced navigation with liquid glass effects and role-based access to Admin/Client areas
- Integrated document management natively into SEO Timeline with task-document linking system
- Implemented complete SAAS authentication system with login/registration/password reset
- Admin access restricted exclusively to jaguzman123@hotmail.com with automatic privilege assignment
- Added modern responsive Header and Footer components with glass effects
- Fixed all authentication flows, logout functionality, and session management
- Created AuthPage with premium glass UI and comprehensive user flows
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```