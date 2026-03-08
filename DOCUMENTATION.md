# Event Management System (EMS) - Atmiya University

## Complete Technical Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Architecture](#3-project-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [API Reference](#7-api-reference)
8. [Frontend Components](#8-frontend-components)
9. [Key Features](#9-key-features)
10. [Security Implementation](#10-security-implementation)
11. [File Structure](#11-file-structure)
12. [Setup & Installation](#12-setup--installation)
13. [Environment Configuration](#13-environment-configuration)
14. [Development Workflow](#14-development-workflow)

---

## 1. Project Overview

### Description
The Event Management System (EMS) is a comprehensive web-based platform designed for Atmiya University to manage events, hackathons, registrations, and attendance tracking. The system provides role-based access control with three distinct user types: Students, Admins, and Masters (Super Admins).

### Key Capabilities
- **Event Management**: Create, edit, and manage various types of events (Sessions, Workshops, Webinars)
- **Hackathon Management**: Full hackathon lifecycle management with team registration, problem statements, and attendance tracking
- **User Management**: Multi-role user system with onboarding workflow
- **QR Code System**: Secure QR code generation and scanning for attendance
- **PDF Export**: Generate professional reports and attendance sheets
- **Real-time Updates**: SWR-based data fetching with real-time updates

### Live URL
`https://events.adsc-atmiya.in`

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.3.8 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Radix UI | Various | Headless UI components |
| React Hook Form | 7.56.4 | Form handling |
| Zod | 3.25.20 | Schema validation |
| SWR | 2.3.3 | Data fetching & caching |
| Framer Motion | 12.23.6 | Animations |
| Lucide React | 0.525.0 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 15.3.8 | Backend API |
| Prisma | 6.8.2 | ORM for database operations |
| PostgreSQL | - | Database |
| Supabase | 2.57.4 | Authentication & Backend as a Service |

### Additional Libraries
| Library | Purpose |
|---------|---------|
| @react-pdf/renderer | PDF generation |
| html5-qrcode | QR code scanning |
| qrcode | QR code generation |
| qr-code-styling | Styled QR codes |
| nodemailer | Email sending |
| date-fns | Date manipulation |
| recharts | Charts and analytics |
| papaparse | CSV parsing |
| xlsx | Excel file handling |
| jspdf | PDF generation alternative |
| Cloudflare Turnstile | CAPTCHA verification |

---

## 3. Project Architecture

### Application Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    MIDDLEWARE LAYER                         │ │
│  │  • Session management  • Route protection  • Security      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   PAGE COMPONENTS   │    │        API ROUTES               │ │
│  │                     │    │                                 │ │
│  │  /                  │    │  /api/events/*                  │ │
│  │  /events/*          │    │  /api/hackathons/*              │ │
│  │  /hackathons/*      │    │  /api/student/*                 │ │
│  │  /admin/*           │    │  /api/admin/*                   │ │
│  │  /master/*          │    │  /api/master/*                  │ │
│  │  /student/*         │    │  /api/auth/*                    │ │
│  │  /onboarding        │    │  /api/user/*                    │ │
│  │                     │    │  /api/department/*              │ │
│  └─────────────────────┘    │  /api/program/*                 │ │
│                              └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌───────────────────┐  ┌───────────────┐  ┌─────────────────┐
│    SUPABASE       │  │   PRISMA ORM  │  │   POSTGRESQL    │
│  Authentication   │  │               │  │    DATABASE     │
│  • Google OAuth   │  │               │  │                 │
│  • Email/Password │  │               │  │                 │
└───────────────────┘  └───────┬───────┘  └────────┬────────┘
                               │                    │
                               └────────────────────┘
```

### Route Structure

```
app/
├── (common)/               # Public routes (grouped)
│   ├── (auth)/             # Auth routes
│   │   ├── auth/           # OAuth callbacks
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── events/             # Public event listing
│   ├── hackathons/         # Public hackathon listing
│   │   └── [id]/           # Hackathon details
│   ├── onboarding/         # User onboarding
│   ├── reset-password/     # Password reset
│   └── update-password/    # Password update
│
├── admin/                  # Admin dashboard (ADMIN role)
│   ├── page.tsx            # Admin overview
│   ├── account/            # Account settings
│   └── hackathons/         # Hackathon management
│       └── [id]/           # Hackathon details
│
├── master/                 # Master dashboard (MASTER role - Super Admin)
│   ├── page.tsx            # Master overview
│   ├── account/            # Account settings
│   ├── events/             # Event management (CRUD)
│   │   ├── create/         # Create event
│   │   ├── edit/           # Edit event
│   │   └── details/        # Event details
│   ├── hackathons/         # Hackathon management (CRUD)
│   │   ├── create/         # Create hackathon
│   │   ├── edit/           # Edit hackathon
│   │   ├── attendance/     # Attendance management
│   │   └── [id]/           # Hackathon details
│   ├── management/         # System management
│   │   ├── departments/    # Department CRUD
│   │   └── programs/       # Program CRUD
│   └── users/              # User management
│       ├── students/       # Students list
│       ├── admins/         # Admins management
│       └── masters/        # Masters management
│
├── student/                # Student dashboard (STUDENT role)
│   ├── page.tsx            # Student overview
│   ├── account/            # Account settings
│   └── participations/     # Hackathon participations
│       └── [id]/           # Participation details
│
├── api/                    # API Routes
│   ├── admin/              # Admin-specific APIs
│   ├── auth/               # Authentication APIs
│   ├── colleges/           # College lookup
│   ├── department/         # Department CRUD
│   ├── events/             # Event APIs
│   ├── hackathons/         # Hackathon APIs
│   ├── master/             # Master-specific APIs
│   ├── og/                 # Open Graph images
│   ├── program/            # Program CRUD
│   ├── qr-code/            # QR code operations
│   ├── student/            # Student APIs
│   └── user/               # User profile APIs
│
└── legal/                  # Legal pages
    ├── cookies/
    ├── privacy/
    └── terms/
```

---

## 4. Database Schema

### Entity Relationship Diagram (Text)

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER SYSTEM                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────┐      ┌───────────┐      ┌───────────┐                  │
│    │   User   │──┬──▶│  Student  │      │   Admin   │                  │
│    │          │  │   └───────────┘      └───────────┘                  │
│    │  id      │  │          │                                          │
│    │  email   │  │          ▼                                          │
│    │  role    │  │   ┌─────────────┐    ┌───────────┐                  │
│    │  ...     │  │   │ Department  │◀───│  Program  │                  │
│    └──────────┘  │   └─────────────┘    └───────────┘                  │
│                  │                                                      │
│                  └──▶┌───────────┐                                      │
│                      │  Master   │                                      │
│                      └───────────┘                                      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                            EVENT SYSTEM                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────────┐     ┌──────────────────┐     ┌───────────────┐     │
│    │    Event     │────▶│ EventRegistration │◀──│     User      │     │
│    │              │     └──────────────────┘     └───────────────┘     │
│    │  id          │                                                    │
│    │  name        │     ┌──────────────────┐                           │
│    │  slug        │────▶│  EventFeedback   │                           │
│    │  description │     └──────────────────┘                           │
│    │  mode        │                                                    │
│    │  status      │     ┌──────────────────┐                           │
│    │  ...         │────▶│  EventSpeaker    │                           │
│    └──────────────┘     └──────────────────┘                           │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                          HACKATHON SYSTEM                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌───────────────┐                                                    │
│    │   Hackathon   │────────────────────────────────────────┐           │
│    │               │                                         │           │
│    │  id           │     ┌──────────────────────────┐       │           │
│    │  name         │────▶│ HackathonProblemStatement│       │           │
│    │  description  │     └──────────────────────────┘       │           │
│    │  location     │                                         │           │
│    │  mode         │     ┌──────────────────────────┐       │           │
│    │  status       │────▶│    HackathonRules        │       │           │
│    │  ...          │     └──────────────────────────┘       │           │
│    └───────────────┘                                         │           │
│           │                                                  │           │
│           │              ┌──────────────────────────┐       │           │
│           └─────────────▶│HackathonAttendanceSchedule│◀─────┘           │
│                          └──────────────────────────┘                   │
│                                     │                                    │
│                                     ▼                                    │
│                          ┌──────────────────────────┐                   │
│                          │  HackathonAttendance     │                   │
│                          └──────────────────────────┘                   │
│                                     ▲                                    │
│                                     │                                    │
│    ┌───────────────┐     ┌──────────────────────────┐                   │
│    │ HackathonTeam │────▶│  HackathonTeamMember     │                   │
│    │               │     └──────────────────────────┘                   │
│    │  teamName     │                ▲                                    │
│    │  teamId       │                │                                    │
│    │  leaderId     │────▶ Student ──┘                                    │
│    │  mentor       │                                                     │
│    │  submissionUrl│     ┌──────────────────────────┐                   │
│    │  disqualified │────▶│  HackathonTeamInvite     │                   │
│    └───────────────┘     └──────────────────────────┘                   │
│           │                                                              │
│           └─────────────▶┌──────────────────────────┐                   │
│                          │HackathonTemporaryInvite  │                   │
│                          └──────────────────────────┘                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Model Definitions

#### User Model
```prisma
model User {
  id                  String                @id @default(uuid())
  email               String                @unique
  phone               String?               @unique
  role                Role                  // STUDENT, ADMIN, MASTER
  firstName           String
  lastName            String?
  supabaseId          String                @unique
  qrCode              String?               // QR code image URL
  qrCodeData          String?               // QR code encoded data
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  
  // Relations
  admins              Admin?
  masters             Master?
  students            Student?
  events              Event[]
  eventFeedbacks      EventFeedback[]
  eventRegistrations  EventRegistration[]
  HackathonAttendance HackathonAttendance[]
}
```

#### Student Model
```prisma
model Student {
  id                  String                @id @default(uuid())
  userId              String                @unique
  departmentId        String?
  programId           String?
  currentSemester     Int?
  currentYear         Int?
  registrationNumber  String?               @unique
  university          String?               // For non-Atmiya students
  dateOfBirth         DateTime?
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  
  // Relations
  user                User                  @relation(...)
  department          Department?           @relation(...)
  program             Program?              @relation(...)
  leadingTeams        HackathonTeam[]       @relation("TeamLeader")
  HackathonTeamMember HackathonTeamMember[]
  HackathonTeamInvite HackathonTeamInvite[]
}
```

#### Event Model
```prisma
model Event {
  id                         String              @id @default(uuid())
  slug                       String              @unique
  name                       String
  description                String
  key_highlights             String[]
  note                       String?
  poster_url                 String
  mode                       EventMode           // ONLINE, OFFLINE
  address                    String?
  start_date                 DateTime
  end_date                   DateTime?
  start_time                 DateTime
  end_time                   DateTime?
  event_type                 EventType           // SESSION, WORKSHOP, WEBINAR, OTHER
  status                     EventStatus         // UPCOMING, COMPLETED, CANCELLED, OTHER
  registration_required      Boolean
  registration_link          String?
  registration_limit         Int?
  recording_link             String?
  feedback_form_link         String?
  tags                       String[]
  organizer_name             String
  organizer_contact          String?
  is_paid                    Boolean             @default(false)
  ticket_price               Int?
  current_registration_count Int                 @default(0)
  feedback_score             Float?
  qrCode                     String?
  qrCodeData                 String?
  createdById                String
  created_at                 DateTime            @default(now())
  updated_at                 DateTime            @updatedAt
  
  // Relations
  created_by                 User                @relation(...)
  feedbacks                  EventFeedback[]
  registrations              EventRegistration[]
  speakers                   EventSpeaker[]
}
```

#### Hackathon Model
```prisma
model Hackathon {
  id                      String                        @id @default(uuid())
  name                    String
  description             String
  location                String
  poster_url              String
  start_date              DateTime
  end_date                DateTime
  start_time              DateTime
  end_time                DateTime
  registration_start_date DateTime
  registration_end_date   DateTime
  registration_limit      Int?
  mode                    EventMode
  status                  EventStatus
  tags                    String[]
  organizer_name          String
  organizer_contact       String?
  evaluationCriteria      String[]
  team_size_limit         Int?
  open_submissions        Boolean                       @default(true)
  open_registrations      Boolean                       @default(true)
  qrCode                  String?
  qrCodeData              String?
  created_at              DateTime                      @default(now())
  updated_at              DateTime                      @updatedAt
  
  // Relations
  problemStatements       HackathonProblemStatement[]
  rules                   HackathonRules[]
  teams                   HackathonTeam[]
  attendanceSchedules     HackathonAttendanceSchedule[]
}
```

### Enums
```prisma
enum Role {
  STUDENT
  ADMIN
  MASTER
}

enum EventMode {
  ONLINE
  OFFLINE
}

enum EventType {
  SESSION
  WORKSHOP
  WEBINAR
  OTHER
}

enum EventStatus {
  UPCOMING
  COMPLETED
  CANCELLED
  OTHER
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
}
```

---

## 5. Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
                        │    USER     │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Google OAuth │  │Email/Password│  │ Password     │
    │    Login     │  │    Login     │  │   Reset      │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │ SUPABASE AUTH    │
                   │                  │
                   │ • Session mgmt   │
                   │ • Token handling │
                   │ • OAuth provider │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ TURNSTILE        │
                   │ CAPTCHA          │
                   │ (Login/Register) │
                   └────────┬─────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     ONBOARDING CHECK        │
              │                             │
              │ onboarding_complete: false  │────▶ /onboarding
              │ onboarding_complete: true   │────▶ Dashboard
              └─────────────────────────────┘
```

### Session Management via Middleware

The middleware (`middleware.ts` + `utils/supabase/middleware.ts`) handles:

1. **Session Refresh**: Automatically refreshes Supabase sessions
2. **Route Protection**: Redirects based on authentication state
3. **Role Enforcement**: Routes users to appropriate dashboards
4. **Onboarding Flow**: Ensures new users complete onboarding

```typescript
// Middleware Logic Flow
PUBLIC_ROUTES = ["/", "/events", "/hackathons", "/register", "/login", ...]
AUTH_ROUTES = ["/login", "/register"]

// Decision Tree:
if (isPublicAsset) → Allow
if (isAPIRoute || isHomePage) → Allow
if (authenticated && onAuthRoute) → Redirect to dashboard
if (authenticated && !onboardingComplete) → Redirect to /onboarding
if (authenticated && wrongDashboard) → Redirect to correct dashboard
if (!authenticated && protectedRoute) → Redirect to /login
```

### Role Validation Security

The system implements dual-layer role validation:

1. **Supabase Metadata**: Role stored in `user.app_metadata.role`
2. **Database Role**: Role stored in `User.role` column

```typescript
// Role validation compares both sources
async function validateUserRole(userId: string) {
  const supabaseRole = user.app_metadata?.role;
  const databaseRole = dbUser.role;
  
  // If mismatch, auto-fix by syncing Supabase to database
  if (supabaseRole !== databaseRole) {
    await supabase.auth.updateUser({
      data: { role: databaseRole }
    });
  }
}
```

---

## 6. User Roles & Permissions

### Role Matrix

| Feature | STUDENT | ADMIN | MASTER |
|---------|---------|-------|--------|
| View Public Events | ✅ | ✅ | ✅ |
| View Public Hackathons | ✅ | ✅ | ✅ |
| Register for Events | ✅ | ✅ | ✅ |
| Create Hackathon Team | ✅ | ❌ | ❌ |
| Join Hackathon Team | ✅ | ❌ | ❌ |
| View Own Participations | ✅ | ❌ | ❌ |
| Manage Hackathon Attendance | ❌ | ✅ | ✅ |
| View All Students | ❌ | ✅ | ✅ |
| Create Events | ❌ | ❌ | ✅ |
| Create Hackathons | ❌ | ❌ | ✅ |
| Edit/Delete Events | ❌ | ❌ | ✅ |
| Edit/Delete Hackathons | ❌ | ❌ | ✅ |
| Manage Departments | ❌ | ❌ | ✅ |
| Manage Programs | ❌ | ❌ | ✅ |
| Manage Users (Promote/Demote) | ❌ | ❌ | ✅ |
| View Analytics Dashboard | ❌ | ✅ | ✅ |

### Dashboard Access

| Role | Dashboard Path | Features |
|------|---------------|----------|
| STUDENT | `/student` | Overview, Participations, Account |
| ADMIN | `/admin` | Overview, Hackathons (attendance), Students |
| MASTER | `/master` | Full CRUD access to all entities |

---

## 7. API Reference

### Authentication APIs

#### POST `/api/auth/validate-role`
Validates user role consistency between Supabase and database.

**Response:**
```json
{
  "success": true,
  "message": "Role validation passed",
  "role": "STUDENT"
}
```

### Event APIs

#### GET `/api/events`
Returns all public events.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Event Name",
    "start_date": "2024-01-15",
    "status": "UPCOMING",
    "mode": "OFFLINE",
    "event_type": "WORKSHOP",
    ...
  }
]
```

#### GET `/api/events/[id]`
Returns single event details.

#### POST `/api/events` (Master only)
Creates a new event.

**Request Body:** `EventSchema` (see schemas/event.ts)

#### PUT `/api/events/[id]` (Master only)
Updates an existing event.

#### POST `/api/events/attendance` (Master only)
Marks attendance for event registration.

```json
{
  "userId": "supabase-user-id",
  "eventId": "event-uuid"
}
```

### Hackathon APIs

#### GET `/api/hackathons`
Returns all hackathons with user registration status.

**Response:**
```json
{
  "hackathons": [...],
  "userRegistrations": {
    "hackathon-id-1": true,
    "hackathon-id-2": false
  }
}
```

#### GET `/api/hackathons/[id]`
Returns hackathon details with user's team info.

**Response:**
```json
{
  "hackathon": {...},
  "userTeam": null | HackathonTeam,
  "pendingInvites": [...]
}
```

#### POST `/api/hackathons` (Master only)
Creates a new hackathon.

#### POST `/api/hackathons/attendance`
Marks legacy attendance for hackathon team member.

#### POST `/api/hackathons/attendance-single`
Marks attendance with schedule ID for detailed tracking.

#### POST `/api/hackathons/attendance-bulk`
Bulk attendance marking.

#### GET `/api/hackathons/attendance-schedule`
Gets attendance schedules for a hackathon.

#### POST `/api/hackathons/attendance-schedule` (Admin/Master)
Creates attendance schedule.

### Student APIs

#### GET `/api/student`
Returns all students (Admin/Master only).

#### GET `/api/student/[id]`
Returns single student details with user info.

#### GET `/api/student/participations`
Returns hackathon participations for current student.

#### GET `/api/student/overview`
Returns student dashboard overview data.

### User APIs

#### GET `/api/user/profile`
Returns current user profile.

#### PUT `/api/user/profile`
Updates user profile.

#### GET `/api/user/qr-code`
Generates/retrieves user QR code.

### Department & Program APIs

#### GET `/api/department`
Returns all departments with programs.

#### POST `/api/department` (Master only)
Creates a new department.

#### GET `/api/program`
Returns all programs.

#### POST `/api/program` (Master only)
Creates a new program under a department.

### Master APIs

#### GET `/api/master/events`
Returns all events with creator details.

#### GET `/api/master/overview`
Returns dashboard statistics.

---

## 8. Frontend Components

### Component Architecture

```
components/
├── error-boundary/          # Error handling wrapper
│   └── ErrorBoundary.tsx
│
├── export/                  # PDF export components
│   ├── AttendanceExportPDF.tsx
│   ├── CommonPDFComponents.tsx
│   ├── EventExportPDF.tsx
│   ├── HackathonExportPDF.tsx
│   ├── HackthonICARD.tsx
│   ├── HackthonSignatureSheet.tsx
│   └── HacktthonICARDBunch.tsx
│
├── global/                  # Shared global components
│   ├── LandingFooter.tsx
│   ├── OGThumbnail.tsx
│   ├── OnTapGoogle.tsx
│   ├── Providers.tsx
│   ├── ThemeProvider.tsx
│   ├── breadcrumbs/
│   ├── data-table/
│   │   ├── DataTable.tsx
│   │   └── DataTableSkeleton.tsx
│   ├── form-dialog/
│   ├── heading/
│   ├── mode-toggle/
│   ├── navigation-bar/
│   ├── quick-action-toggle/
│   └── sidebar/
│       ├── Sidebar.tsx
│       └── UserNavigation.tsx
│
├── section/                 # Feature-specific sections
│   ├── account/
│   ├── admin/
│   │   └── sidebar/links.ts
│   ├── auth/
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventFeedbackForm.tsx
│   │   ├── EventQRCodeDisplay.tsx
│   │   └── UserQRCodeDisplay.tsx
│   ├── landing/
│   │   ├── CTASection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HeroSection.tsx
│   │   └── StatsSection.tsx
│   ├── login/
│   │   ├── LoginForm.tsx
│   │   └── loginAction.ts
│   ├── master/
│   │   ├── events/
│   │   ├── hackathons/
│   │   ├── overview/
│   │   └── sidebar/links.ts
│   ├── onboarding/
│   │   ├── OnboardingForm.tsx
│   │   └── onboardingAction.ts
│   ├── register/
│   │   ├── RegisterForm.tsx
│   │   └── registerAction.ts
│   └── student/
│       ├── hackathons/
│       │   ├── CreateTeamForm.tsx
│       │   ├── HackathonDetail.tsx
│       │   ├── HackathonList.tsx
│       │   └── TeamMemberInvitation.tsx
│       ├── overview/
│       ├── participations/
│       └── sidebar/links.ts
│
├── security/                # Security components
│
└── ui/                      # Base UI components (Radix/shadcn)
    ├── accordion.tsx
    ├── alert-dialog.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── button.tsx
    ├── calendar.tsx
    ├── card.tsx
    ├── chart.tsx
    ├── checkbox.tsx
    ├── command.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── form.tsx
    ├── input.tsx
    ├── label.tsx
    ├── popover.tsx
    ├── progress.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sidebar.tsx
    ├── skeleton.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    └── tooltip.tsx
```

### Key Component Patterns

#### Form Pattern with Zod Validation
```tsx
// Example: Event Form
const form = useForm<EventSchema>({
  resolver: zodResolver(eventSchema),
  defaultValues: {
    name: "",
    description: "",
    mode: "OFFLINE",
    ...
  },
});

async function onSubmit(data: EventSchema) {
  const response = await createEvent(data);
  if (response.error) {
    toast.error(response.error);
  } else {
    toast.success("Event created");
    router.push("/master/events");
  }
}
```

#### Data Fetching with SWR
```tsx
// Example: Hackathon list fetching
const { data, error, isLoading, mutate } = useSWR<HackathonData>(
  `/api/hackathons/${params.id}`,
  async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  }
);
```

---

## 9. Key Features

### 9.1 Event Management

**Creating Events (Master only):**
1. Navigate to `/master/events/create`
2. Fill event details (name, description, type, mode)
3. Set dates/times and registration settings
4. Add speakers (optional)
5. Upload poster image
6. Submit to create

**Event Types:**
- SESSION: General informational sessions
- WORKSHOP: Hands-on learning workshops
- WEBINAR: Online seminars
- OTHER: Miscellaneous events

**Event Registration Flow:**
```
Student views event → Clicks Register → 
System checks registration_limit → 
Creates EventRegistration record → 
Increments current_registration_count →
Sends confirmation email
```

### 9.2 Hackathon System

**Hackathon Lifecycle:**
```
1. CREATION (Master creates hackathon)
   └── Set problem statements, rules, dates
   
2. REGISTRATION_OPEN
   ├── Students browse hackathons
   ├── Team Leader creates team
   │   └── Selects problem statement
   │   └── Provides mentor details
   └── Team Leader invites members
       ├── System sends invite notifications
       └── Students accept/decline invites
       
3. REGISTRATION_CLOSED
   └── No new teams can be created
   
4. HACKATHON_ACTIVE
   ├── Attendance tracking (QR scan)
   ├── Multiple check-in schedules per day
   └── Submission URL collection
   
5. HACKATHON_COMPLETED
   └── Export attendance data, PDFs
```

**Team Management:**
- Team Leader can invite students by email
- Invited students see pending invites in hackathon details
- Team size limited by `team_size_limit`
- Teams can be disqualified by Admin/Master

### 9.3 QR Code System

**QR Code Types:**
1. **User QR**: Personal QR for student identification
2. **Event QR**: QR code for event check-in
3. **Team Member QR**: QR for hackathon attendance

**QR Code Security:**
```typescript
interface QRCodeData {
  id: string;           // Unique identifier
  type: 'user' | 'event' | 'teamMember';
  userId: string;
  eventId?: string;
  teamId?: string;
  hackathonId?: string;
  timestamp: number;
  signature: string;    // HMAC-SHA256 signature
}
```

QR codes are cryptographically signed using HMAC-SHA256 to prevent tampering.

### 9.4 Attendance Tracking

**Event Attendance:**
- Master scans student QR at event
- System marks `attended: true` in EventRegistration
- Records `checkedInAt` timestamp and `checkedInBy` user

**Hackathon Attendance:**
```
Hackathon
└── AttendanceSchedule (Day 1, Morning Check-in)
    └── HackathonAttendance (per team member)
└── AttendanceSchedule (Day 1, Afternoon Check-in)
    └── HackathonAttendance (per team member)
└── AttendanceSchedule (Day 2, Morning Check-in)
    └── ...
```

### 9.5 PDF Export

Available exports:
- **Attendance Export PDF**: Team-wise attendance records
- **Hackathon I-Cards**: ID cards for participants
- **Signature Sheet**: Physical attendance signature collection
- **Event Report**: Event summary with registrations

### 9.6 Onboarding Flow

New users must complete onboarding:

1. **For Atmiya Students:**
   - Select Department
   - Select Program
   - Enter Registration Number
   - Enter Current Semester/Year

2. **For Other University Students:**
   - Search and select University
   - Enter basic details

---

## 10. Security Implementation

### Security Layers

1. **Authentication Layer (Supabase)**
   - Secure session management
   - OAuth integration (Google)
   - Password policies
   - CAPTCHA (Cloudflare Turnstile)

2. **Authorization Layer (Middleware)**
   - Route-based access control
   - Role verification on each request
   - Dashboard path enforcement

3. **API Security**
   - Role validation on sensitive endpoints
   - Database role verification (not just Supabase metadata)
   - Input validation with Zod schemas

4. **Data Security**
   - QR codes signed with HMAC-SHA256
   - Sensitive data encryption
   - SQL injection prevention via Prisma ORM

### Security Headers
```typescript
// middleware.ts
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

### Role Escalation Prevention
```typescript
// Every API checks database role, not just Supabase metadata
const dbUser = await prisma.user.findUnique({
  where: { supabaseId: user.id },
  select: { role: true }
});

if (!dbUser || !["ADMIN", "MASTER"].includes(dbUser.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## 11. File Structure

### Complete Directory Tree

```
ems-atmiya/
├── app/                          # Next.js App Router pages
│   ├── (common)/                 # Public route group
│   ├── admin/                    # Admin dashboard
│   ├── api/                      # API routes
│   ├── legal/                    # Legal pages
│   ├── master/                   # Master dashboard
│   ├── student/                  # Student dashboard
│   ├── error.tsx                 # Error boundary
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── manifest.ts               # PWA manifest
│   ├── not-found.tsx             # 404 page
│   ├── page.tsx                  # Landing page
│   ├── robots.ts                 # SEO robots
│   └── sitemap.ts                # SEO sitemap
│
├── components/                   # Reusable components
│   ├── error-boundary/
│   ├── export/
│   ├── global/
│   ├── section/
│   ├── security/
│   └── ui/
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Authentication state
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.ts             # Mobile detection
│   ├── useDepartment.ts          # Department data hook
│   └── useRoleValidation.ts      # Role validation hook
│
├── lib/                          # Core utilities
│   ├── security/
│   │   └── roleValidation.ts     # Role validation logic
│   ├── metadata.ts               # SEO metadata config
│   ├── nodeMailerConfig.ts       # Email configuration
│   ├── prisma.ts                 # Prisma client singleton
│   ├── qr-code.ts                # QR code utilities
│   ├── swr-fetcher.ts            # SWR fetcher config
│   └── utils.ts                  # General utilities
│
├── prisma/                       # Database
│   ├── migrations/               # Migration files
│   └── schema.prisma             # Database schema
│
├── public/                       # Static assets
│   ├── fonts/
│   └── images/
│
├── schemas/                      # Zod validation schemas
│   ├── admin.ts
│   ├── department.ts
│   ├── event.ts
│   ├── hackathon.ts
│   ├── loginSchema.ts
│   ├── master.ts
│   ├── onboardingStudentSchema.ts
│   ├── program.ts
│   ├── registerSchema.ts
│   ├── reset-password.ts
│   ├── student.ts
│   ├── team.ts
│   └── updatePasswordSchema.ts
│
├── scripts/                      # Utility scripts
│   ├── populate-team-leaders.ts
│   └── update-team-leaders.ts
│
├── store/                        # State management (Jotai)
│   ├── form-dialog.ts
│   └── sidebar.ts
│
├── supabase/                     # Supabase configuration
│   └── config.toml
│
├── types/                        # TypeScript types
│   ├── attendance.ts
│   ├── barcode-detector.d.ts
│   ├── global.d.ts
│   └── hackathon.ts
│
├── utils/                        # Utility functions
│   ├── functions/
│   │   └── getDashboardPath.ts
│   ├── other/
│   └── supabase/
│       ├── admin-server.ts
│       ├── client.ts
│       ├── middleware.ts
│       └── server.ts
│
├── .env (not tracked)            # Environment variables
├── .env.example                  # Env template
├── components.json               # shadcn/ui config
├── eslint.config.mjs             # ESLint config
├── fetcher.ts                    # Axios fetcher
├── jsrepo.json                   # JS repo config
├── middleware.ts                 # Next.js middleware
├── next-env.d.ts                 # Next.js types
├── next.config.ts                # Next.js config
├── package.json                  # Dependencies
├── postcss.config.mjs            # PostCSS config
├── README.md                     # Project readme
└── tsconfig.json                 # TypeScript config
```

---

## 12. Setup & Installation

### Prerequisites
- Node.js 20.x or later
- PostgreSQL database
- Supabase account
- Cloudflare account (for Turnstile CAPTCHA)

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd ems-atmiya

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev

# 6. Start development server
npm run dev
```

### Database Setup

```bash
# Create initial migration
npx prisma migrate dev --name init

# Push schema changes (development)
npx prisma db push

# View database in browser
npx prisma studio
```

---

## 13. Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
TURNSTILE_SECRET_KEY="your-secret-key"

# QR Code Security
QR_CODE_SECRET="your-secure-random-string"

# Email (Nodemailer)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-email-password"
EMAIL_FROM="noreply@events.adsc-atmiya.in"

# Application
NEXT_PUBLIC_APP_URL="https://events.adsc-atmiya.in"
```

### Supabase Configuration

1. Create a new Supabase project
2. Enable Email/Password authentication
3. Configure Google OAuth provider
4. Set up email templates for:
   - Email confirmation
   - Password reset
   - Magic link login

---

## 14. Development Workflow

### Scripts

```bash
# Development
npm run dev          # Start with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev    # Run migrations
npx prisma db push        # Push schema changes
npx prisma studio         # Open database GUI
```

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js recommended rules
- Prettier for formatting (recommended)

### Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run linting and type checks
4. Create pull request for review
5. Merge after approval

### Testing Recommendations

```bash
# Manual testing checklist:
□ Authentication flow (login, register, logout)
□ Onboarding flow (Atmiya and other students)
□ Event creation and registration
□ Hackathon team creation and invitations
□ Attendance scanning and marking
□ PDF export generation
□ Role-based access control
```

---

## Quick Reference

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npx prisma studio` | Open database browser |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma generate` | Regenerate Prisma client |

### API Quick Reference

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/events` | GET | Public | List all events |
| `/api/events/[id]` | GET | Public | Get event details |
| `/api/hackathons` | GET | Auth | List hackathons |
| `/api/hackathons/[id]` | GET | Auth | Get hackathon details |
| `/api/student/participations` | GET | Student | Get my participations |
| `/api/master/events` | GET | Master | List all events (admin) |
| `/api/events/attendance` | POST | Master | Mark attendance |

### Role Paths

| Role | Dashboard | Capabilities |
|------|-----------|--------------|
| STUDENT | `/student` | View events, join teams, view participations |
| ADMIN | `/admin` | Manage attendance, view students |
| MASTER | `/master` | Full system access, CRUD operations |

---

## Contact & Support

**Event Management System - Atmiya University**

For technical issues, contact the development team or submit an issue in the repository.

---

*Document Version: 1.0*
*Last Updated: February 2026*
