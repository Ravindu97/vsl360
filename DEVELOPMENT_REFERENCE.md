# VSL 360 — Tour Operations Management System

## Development Reference Document

> **Purpose:** Complete technical reference for building the VSL 360 web-based internal management system. Covers all functional requirements, data models, API design, UI structure, and technology recommendations.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack Recommendation](#2-technology-stack-recommendation)
3. [System Architecture](#3-system-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Main Workflow](#5-main-workflow)
6. [Data Models / Database Schema](#6-data-models--database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Frontend Pages & Components](#8-frontend-pages--components)
9. [Document Generation](#9-document-generation)
10. [File Upload & Attachments](#10-file-upload--attachments)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Status Tracking & Notifications](#12-status-tracking--notifications)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Project Structure](#14-project-structure)

---

## 1. Project Overview

VSL 360 is a **web-based internal management system** for a tour operations company. It handles the full tour lifecycle:

- Client inquiry → Client profile creation → Costing & payment → Internal handover → Department tasks → Document generation

### Core Goals

- Reduce manual work across sales, reservation, transport, and operations teams
- Organize client/booking information in a centralized system
- Allow multiple departments to collaborate from one platform
- Auto-generate 4 key documents: Invoice, Transport Details, Hotel Reservation, Full Itinerary

### Key Business Entities

| Entity | Description |
|--------|-------------|
| **Booking** | Master record for a client's tour (1 booking = 1 trip) |
| **Client/Guest** | Main guest who made the inquiry |
| **Pax (Passengers)** | Additional travelers under the same booking |
| **Hotel Plan** | Night-by-night hotel assignments, room types, meal plans |
| **Transport Plan** | Vehicle, driver, pickup/drop-off details |
| **Invoice** | Financial record with costing, payments, balance |
| **Documents** | Auto-generated PDFs (Invoice, Transport, Reservation, Itinerary) |

---

## 2. Technology Stack Recommendation

### Frontend — **React with TypeScript**

| Choice | Reason |
|--------|--------|
| **React 18+ (TypeScript)** | Industry standard, massive ecosystem, strong typing for complex forms |
| **Vite** | Fast build tool, HMR, superior DX over CRA |
| **Tailwind CSS** | Utility-first CSS, rapid UI development, consistent design |
| **shadcn/ui** | High-quality accessible components built on Radix UI, fully customizable |
| **React Router v6** | Client-side routing with nested layouts and role-based guards |
| **TanStack Query (React Query)** | Server state management, caching, background refetching |
| **React Hook Form + Zod** | Performant form handling with schema-based validation |
| **Zustand** | Lightweight global state (auth, UI state) — simpler than Redux |
| **Axios** | HTTP client with interceptors for auth tokens |
| **date-fns** | Lightweight date manipulation |
| **Lucide React** | Clean icon library |

### Backend — **Node.js with Express and TypeScript**

| Choice | Reason |
|--------|--------|
| **Node.js 20+ (TypeScript)** | Same language as frontend, fast I/O, strong ecosystem |
| **Express.js** | Minimal, flexible, battle-tested HTTP framework |
| **Prisma ORM** | Type-safe database access, auto-generated types, excellent migrations |
| **PostgreSQL** | Robust relational DB, ideal for structured booking/financial data |
| **JWT (jsonwebtoken)** | Stateless authentication with role-based access |
| **bcrypt** | Secure password hashing |
| **Multer** | File uploads (passport copies, flight tickets) |
| **pdfkit** | Node-only PDF document generation (cPanel-safe) |
| **Zod** | Shared validation schemas (frontend + backend) |
| **Helmet + CORS + express-rate-limit** | Security middleware |
| **Winston** | Structured logging |

### Database — **PostgreSQL**

| Choice | Reason |
|--------|--------|
| **PostgreSQL 15+** | ACID compliance, JSON support, relational integrity for financial data |
| **Prisma Migrations** | Schema versioning and safe migration management |

### Why This Stack?

- **Full TypeScript:** Shared types and validation schemas between frontend and backend reduce bugs
- **React + Tailwind + shadcn/ui:** Rapid development of a clean, professional internal tool UI
- **Express + Prisma + PostgreSQL:** Proven, scalable backend for CRUD-heavy applications with relational data
- **pdfkit for PDFs:** Generates documents without browser binaries, better for constrained hosting

### Alternative Considerations

| Alternative | When to Consider |
|-------------|-----------------|
| **Next.js** (instead of Vite+React) | If SSR/SEO needed — unlikely for internal tool |
| **NestJS** (instead of Express) | If team prefers opinionated architecture with decorators |
| **MySQL** (instead of PostgreSQL) | If existing infra uses MySQL — PostgreSQL is still preferred |
| **MongoDB** (instead of PostgreSQL) | NOT recommended — relational data with financial records needs ACID |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Auth    │ │ Dashboard│ │ Booking Module   │  │
│  │  Pages   │ │  Views   │ │ (CRUD + Forms)   │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────────────┐ ┌──────────────────────┐   │
│  │ Document Viewer  │ │ User Management      │   │
│  └──────────────────┘ └──────────────────────┘   │
└─────────────┬───────────────────────────────────┘
              │ HTTPS (REST API)
              ▼
┌─────────────────────────────────────────────────┐
│              Backend (Express + TypeScript)       │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  Auth    │ │ Booking   │ │ Document Gen   │  │
│  │  Module  │ │ Module    │ │ (PDF Engine)   │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  User    │ │ Upload    │ │ Reporting      │  │
│  │  Module  │ │ Module    │ │ Module         │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
└─────────────┬───────────────────────────────────┘
              │ Prisma ORM
              ▼
┌─────────────────────────────────────────────────┐
│            PostgreSQL Database                    │
│  bookings, clients, pax, hotels, transport,      │
│  invoices, documents, users, status_history      │
└─────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│        File Storage (Local / S3)                 │
│  Passport copies, flight tickets, generated PDFs │
└─────────────────────────────────────────────────┘
```

---

## 4. User Roles & Permissions

### Role Definitions

| Role | Code | Description |
|------|------|-------------|
| **Sales Person** | `SALES` | Creates bookings, manages client profiles, handles costing |
| **Reservation Department** | `RESERVATION` | Manages hotel bookings, room categories, meal plans |
| **Transport Department** | `TRANSPORT` | Assigns vehicles, drivers, manages transport logistics |
| **Operations Manager** | `OPS_MANAGER` | Full access, monitors all departments, manages users |

### Permission Matrix

| Action | SALES | RESERVATION | TRANSPORT | OPS_MANAGER |
|--------|:-----:|:-----------:|:---------:|:-----------:|
| Create client profile | ✅ | ❌ | ❌ | ✅ |
| Add/edit trip details | ✅ | ❌ | ❌ | ✅ |
| Add/edit pax details | ✅ | ❌ | ❌ | ✅ |
| Add costing & payment | ✅ | ❌ | ❌ | ✅ |
| Upload attachments | ✅ | ❌ | ❌ | ✅ |
| Submit booking to operations | ✅ | ❌ | ❌ | ✅ |
| View confirmed bookings | ❌ | ✅ | ✅ | ✅ |
| Add/edit hotel details | ❌ | ✅ | ❌ | ✅ |
| Update reservation status | ❌ | ✅ | ❌ | ✅ |
| Generate reservation document | ❌ | ✅ | ❌ | ✅ |
| Assign vehicle & driver | ❌ | ❌ | ✅ | ✅ |
| Add transport notes | ❌ | ❌ | ✅ | ✅ |
| Generate transport document | ❌ | ❌ | ✅ | ✅ |
| Generate invoice | ✅ | ❌ | ❌ | ✅ |
| Generate full itinerary | ❌ | ❌ | ❌ | ✅ |
| Edit any booking stage | ❌ | ❌ | ❌ | ✅ |
| Monitor department progress | ❌ | ❌ | ❌ | ✅ |
| Approve final documents | ❌ | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| View reports & stats | ❌ | ❌ | ❌ | ✅ |

---

## 5. Main Workflow

### Booking Lifecycle (State Machine)

```
INQUIRY_RECEIVED
      │
      ▼
CLIENT_PROFILE_CREATED
      │
      ▼
PAX_DETAILS_ADDED
      │
      ▼
COSTING_COMPLETED
      │
      ▼
SALES_CONFIRMED (booking submitted to operations)
      │
      ├──────────────────────┐
      ▼                      ▼
RESERVATION_PENDING     TRANSPORT_PENDING
      │                      │
      ▼                      ▼
RESERVATION_COMPLETED   TRANSPORT_COMPLETED
      │                      │
      └──────────┬───────────┘
                 ▼
         DOCUMENTS_READY
                 │
                 ▼
         OPS_APPROVED (final review)
                 │
                 ▼
            COMPLETED
```

### Booking Status Values

```typescript
enum BookingStatus {
  INQUIRY_RECEIVED = 'INQUIRY_RECEIVED',
  CLIENT_PROFILE_CREATED = 'CLIENT_PROFILE_CREATED',
  PAX_DETAILS_ADDED = 'PAX_DETAILS_ADDED',
  COSTING_COMPLETED = 'COSTING_COMPLETED',
  SALES_CONFIRMED = 'SALES_CONFIRMED',
  RESERVATION_PENDING = 'RESERVATION_PENDING',
  RESERVATION_COMPLETED = 'RESERVATION_COMPLETED',
  TRANSPORT_PENDING = 'TRANSPORT_PENDING',
  TRANSPORT_COMPLETED = 'TRANSPORT_COMPLETED',
  DOCUMENTS_READY = 'DOCUMENTS_READY',
  OPS_APPROVED = 'OPS_APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
```

### Step-by-Step Process

| Step | Actor | Action | System Result |
|------|-------|--------|---------------|
| 1 | Sales Person | Receives inquiry (via WhatsApp typically) | — |
| 2 | Sales Person | Creates client profile with tour details | Status → `CLIENT_PROFILE_CREATED` |
| 3 | Sales Person | Adds pax (main guest + additional travelers) | Status → `PAX_DETAILS_ADDED` |
| 4 | Sales Person | Enters costing, payment, advance details | Status → `COSTING_COMPLETED`, Invoice auto-generated |
| 5 | Sales Person | Submits booking to operations | Status → `SALES_CONFIRMED` |
| 6 | System | Booking appears in Reservation & Transport dashboards | Status → `RESERVATION_PENDING` + `TRANSPORT_PENDING` |
| 7 | Reservation Dept | Adds hotel bookings, room types, meal plans | Status → `RESERVATION_COMPLETED` |
| 8 | Transport Dept | Assigns vehicle, driver, pickup/drop details | Status → `TRANSPORT_COMPLETED` |
| 9 | System | When both departments complete, generates all 4 documents | Status → `DOCUMENTS_READY` |
| 10 | Ops Manager | Reviews and approves final documents | Status → `OPS_APPROVED` → `COMPLETED` |

---

## 6. Data Models / Database Schema

### 6.1 Users

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String
  role      Role     @default(SALES)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  bookings  Booking[] @relation("SalesOwner")
}

enum Role {
  SALES
  RESERVATION
  TRANSPORT
  OPS_MANAGER
}
```

### 6.2 Bookings (Master Record)

```prisma
model Booking {
  id              String        @id @default(uuid())
  bookingId       String        @unique // e.g., "VSL2026001"
  status          BookingStatus @default(INQUIRY_RECEIVED)

  // Tour Information
  numberOfDays      Int
  tourMonth         String
  arrivalDate       DateTime
  arrivalTime       String
  departureDate     DateTime
  departureTime     String
  additionalActivities String?  @db.Text
  specialCelebrations  String?  @db.Text
  generalNotes        String?   @db.Text

  // Sales Owner
  salesOwnerId    String
  salesOwner      User          @relation("SalesOwner", fields: [salesOwnerId], references: [id])

  // Relations
  mainGuest       Client?
  paxList         Pax[]
  hotelPlan       HotelBooking[]
  transportPlan   TransportPlan?
  invoice         Invoice?
  attachments     Attachment[]
  documents       GeneratedDocument[]
  statusHistory   StatusHistory[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum BookingStatus {
  INQUIRY_RECEIVED
  CLIENT_PROFILE_CREATED
  PAX_DETAILS_ADDED
  COSTING_COMPLETED
  SALES_CONFIRMED
  RESERVATION_PENDING
  RESERVATION_COMPLETED
  TRANSPORT_PENDING
  TRANSPORT_COMPLETED
  DOCUMENTS_READY
  OPS_APPROVED
  COMPLETED
  CANCELLED
}
```

### 6.3 Client (Main Guest)

```prisma
model Client {
  id            String   @id @default(uuid())
  bookingId     String   @unique
  booking       Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  name          String
  citizenship   String
  email         String
  contactNumber String
  passportCopy  String?  // file path
  flightTicket  String?  // file path

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 6.4 Pax (Additional Passengers)

```prisma
model Pax {
  id            String      @id @default(uuid())
  bookingId     String
  booking       Booking     @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  name          String
  relationship  String?     // spouse, child, friend, family
  type          PaxType     // ADULT, CHILD, INFANT
  age           Int?        // required for children/infants

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum PaxType {
  ADULT
  CHILD
  INFANT
}
```

### 6.5 Hotel Bookings (Night-by-Night)

```prisma
model HotelBooking {
  id              String   @id @default(uuid())
  bookingId       String
  booking         Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  nightNumber     Int       // Night 1, Night 2, etc.
  hotelName       String
  roomCategory    String
  numberOfRooms   Int
  roomPreference  String?   // twin, double, suite, etc.
  mealPlan        String    // BB, HB, FB, AI (All Inclusive)
  mealPreference  String?   // vegetarian, halal, etc.
  mobilityNotes   String?   // accessibility requirements
  confirmationStatus String @default("PENDING") // PENDING, CONFIRMED, CANCELLED
  reservationNotes   String? @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 6.6 Transport Plan

```prisma
model TransportPlan {
  id              String   @id @default(uuid())
  bookingId       String   @unique
  booking         Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  vehicleModel       String
  vehicleNotes       String?
  babySeatRequired   Boolean  @default(false)
  driverName         String?
  driverLanguage     String   // English, Chinese, Arabic, etc.

  // Arrival pickup
  arrivalPickupLocation  String?
  arrivalPickupTime      String?
  arrivalPickupNotes     String?

  // Departure drop-off
  departureDropLocation  String?
  departureDropTime      String?
  departureDropNotes     String?

  // Internal notes
  internalNotes     String?  @db.Text

  // Day-by-day plan
  dayPlans          TransportDayPlan[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model TransportDayPlan {
  id              String        @id @default(uuid())
  transportPlanId String
  transportPlan   TransportPlan @relation(fields: [transportPlanId], references: [id], onDelete: Cascade)

  dayNumber       Int
  description     String   @db.Text
  pickupTime      String?
  pickupLocation  String?
  dropLocation    String?
  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 6.7 Invoice / Costing

```prisma
model Invoice {
  id              String   @id @default(uuid())
  bookingId       String   @unique
  booking         Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  invoiceNumber   String   @unique  // auto-generated: INV-2026-001
  invoiceDate     DateTime @default(now())
  costPerPerson   Decimal  @db.Decimal(10, 2)
  totalAmount     Decimal  @db.Decimal(10, 2)
  advancePaid     Decimal  @db.Decimal(10, 2) @default(0)
  balanceAmount   Decimal  @db.Decimal(10, 2)
  paymentNotes    String?  @db.Text
  paymentInstructions String? @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 6.8 Attachments

```prisma
model Attachment {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  fileName    String
  fileType    String   // passport, flight_ticket, other
  filePath    String   // stored file path
  fileSize    Int      // bytes
  uploadedBy  String   // user ID

  createdAt   DateTime @default(now())
}
```

### 6.9 Generated Documents

```prisma
model GeneratedDocument {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  type        DocumentType
  filePath    String
  version     Int      @default(1)
  generatedBy String   // user ID

  createdAt   DateTime @default(now())
}

enum DocumentType {
  INVOICE
  TRANSPORT_DETAILS
  HOTEL_RESERVATION
  FULL_ITINERARY
}
```

### 6.10 Status History (Audit Trail)

```prisma
model StatusHistory {
  id          String        @id @default(uuid())
  bookingId   String
  booking     Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  fromStatus  BookingStatus?
  toStatus    BookingStatus
  changedBy   String        // user ID
  notes       String?

  createdAt   DateTime @default(now())
}
```

### Entity Relationship Overview

```
User (1) ──────< Booking (many)
Booking (1) ────── Client (1)          [Main Guest]
Booking (1) ──────< Pax (many)         [Additional Passengers]
Booking (1) ──────< HotelBooking (many) [Night-by-night hotels]
Booking (1) ────── TransportPlan (1)
TransportPlan (1) ──< TransportDayPlan (many)
Booking (1) ────── Invoice (1)
Booking (1) ──────< Attachment (many)
Booking (1) ──────< GeneratedDocument (many)
Booking (1) ──────< StatusHistory (many)
```

---

## 7. API Endpoints

### 7.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password, returns JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate token |
| GET | `/api/auth/me` | Get current user profile |

### 7.2 Users (OPS_MANAGER only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a new user |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Deactivate user (soft delete) |

### 7.3 Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings (filtered by role/status) |
| POST | `/api/bookings` | Create new booking + client profile |
| GET | `/api/bookings/:id` | Get full booking details (all relations) |
| PUT | `/api/bookings/:id` | Update booking tour details |
| PUT | `/api/bookings/:id/status` | Update booking status |
| DELETE | `/api/bookings/:id` | Cancel/delete booking (OPS_MANAGER only) |

### 7.4 Client (Main Guest)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/client` | Get main guest details |
| PUT | `/api/bookings/:id/client` | Update main guest details |

### 7.5 Pax (Passengers)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/pax` | List all pax for a booking |
| POST | `/api/bookings/:id/pax` | Add a passenger |
| PUT | `/api/bookings/:id/pax/:paxId` | Update a passenger |
| DELETE | `/api/bookings/:id/pax/:paxId` | Remove a passenger |

### 7.6 Hotel / Reservation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/hotels` | Get all hotel bookings for a booking |
| POST | `/api/bookings/:id/hotels` | Add a hotel night entry |
| PUT | `/api/bookings/:id/hotels/:hotelId` | Update a hotel entry |
| DELETE | `/api/bookings/:id/hotels/:hotelId` | Remove a hotel entry |
| PUT | `/api/bookings/:id/hotels/:hotelId/confirm` | Confirm hotel reservation |

### 7.7 Transport

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/transport` | Get transport plan |
| POST | `/api/bookings/:id/transport` | Create transport plan |
| PUT | `/api/bookings/:id/transport` | Update transport plan |
| POST | `/api/bookings/:id/transport/day-plans` | Add a day plan |
| PUT | `/api/bookings/:id/transport/day-plans/:dayId` | Update a day plan |
| DELETE | `/api/bookings/:id/transport/day-plans/:dayId` | Remove a day plan |

### 7.8 Invoice / Costing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/invoice` | Get invoice for a booking |
| POST | `/api/bookings/:id/invoice` | Create invoice (auto-generates number) |
| PUT | `/api/bookings/:id/invoice` | Update invoice/costing details |

### 7.9 Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id/attachments` | List attachments |
| POST | `/api/bookings/:id/attachments` | Upload attachment (multipart/form-data) |
| GET | `/api/bookings/:id/attachments/:attachId/download` | Download attachment |
| DELETE | `/api/bookings/:id/attachments/:attachId` | Delete attachment |

### 7.10 Document Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings/:id/documents/invoice` | Generate invoice PDF |
| POST | `/api/bookings/:id/documents/transport` | Generate transport details PDF |
| POST | `/api/bookings/:id/documents/reservation` | Generate hotel reservation PDF |
| POST | `/api/bookings/:id/documents/itinerary` | Generate full itinerary PDF |
| GET | `/api/bookings/:id/documents` | List all generated documents |
| GET | `/api/bookings/:id/documents/:docId/download` | Download a generated document |

### 7.11 Reports (OPS_MANAGER)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats (counts by status, revenue) |
| GET | `/api/reports/bookings` | Booking report with filters (date, status, sales person) |
| GET | `/api/reports/revenue` | Revenue report |

---

## 8. Frontend Pages & Components

### 8.1 Page Structure

```
/login                              → Login page
/dashboard                          → Role-specific dashboard
/bookings                           → Booking list (filtered by role)
/bookings/new                       → Create new booking (Sales)
/bookings/:id                       → Booking detail view (tabbed layout)
/bookings/:id/edit                  → Edit booking details
/bookings/:id/pax                   → Manage passengers
/bookings/:id/hotels                → Manage hotel bookings (Reservation)
/bookings/:id/transport             → Manage transport plan (Transport)
/bookings/:id/invoice               → Invoice / costing details
/bookings/:id/attachments           → File uploads
/bookings/:id/documents             → Generated documents view/download
/users                              → User management (Ops Manager)
/users/new                          → Create user
/reports                            → Reports dashboard (Ops Manager)
```

### 8.2 Layout Components

| Component | Description |
|-----------|-------------|
| `AppLayout` | Main layout with sidebar navigation + top bar |
| `Sidebar` | Role-based navigation menu |
| `TopBar` | User info, notifications, logout |
| `ProtectedRoute` | Route guard checking auth + role permissions |
| `RoleGate` | Conditionally renders content based on user role |

### 8.3 Dashboard Views (per Role)

**Sales Dashboard:**
- My bookings list (recent)
- Booking status breakdown (cards/chart)
- Quick actions: Create new booking
- Pending tasks count

**Reservation Dashboard:**
- Bookings awaiting reservation details
- Recently completed reservations
- Hotel confirmation status overview

**Transport Dashboard:**
- Bookings awaiting transport assignment
- Upcoming arrivals/departures
- Driver schedule overview

**Operations Manager Dashboard:**
- All bookings overview with status pipeline
- Department completion progress bars
- Revenue summary
- Team activity feed
- Bookings requiring approval

### 8.4 Booking Detail Page (Tabbed Layout)

```
┌─────────────────────────────────────────────────────────┐
│  Booking: VSL2026001  │  Status: RESERVATION_PENDING    │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Guest & Pax] [Hotels] [Transport]           │
│ [Invoice] [Attachments] [Documents] [History]           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab content here...                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tab: Overview**
- Tour summary (dates, duration, activities, celebrations)
- Status timeline visualization
- Sales owner info
- Quick status badge

**Tab: Guest & Pax**
- Main guest details card
- Pax list table with add/edit/remove
- Pax count summary (adults/children/infants)

**Tab: Hotels**
- Night-by-night hotel table
- Add hotel entry form (night number, hotel name, room type, meal plan)
- Confirmation status toggles
- Reservation notes

**Tab: Transport**
- Vehicle & driver assignment form
- Arrival/departure pickup details
- Day-by-day transport plan
- Internal notes

**Tab: Invoice**
- Costing summary (per person, total, advance, balance)
- Payment notes
- Generate/download invoice button

**Tab: Attachments**
- File upload dropzone
- List of uploaded files with type labels
- Download/delete actions

**Tab: Documents**
- List of generated documents (4 types)
- Generate/Regenerate buttons
- Download/preview actions
- Version history

**Tab: History**
- Status change timeline
- Who changed what and when

### 8.5 Key Form Components

| Component | Used In | Fields |
|-----------|---------|--------|
| `BookingForm` | Create/edit booking | Tour dates, duration, activities, celebrations, notes |
| `ClientForm` | Guest details | Name, citizenship, email, contact, passport, flight |
| `PaxForm` | Add/edit passenger | Name, relationship, type, age |
| `HotelForm` | Add hotel entry | Night #, hotel name, room category, rooms, meal plan, preferences |
| `TransportForm` | Transport plan | Vehicle, driver, language, pickups, day plans |
| `InvoiceForm` | Costing entry | Cost per person, total, advance, balance, notes |
| `UserForm` | Create/edit user | Name, email, password, role |

### 8.6 Shared Components

| Component | Description |
|-----------|-------------|
| `DataTable` | Sortable, filterable table with pagination |
| `StatusBadge` | Color-coded booking status pill |
| `StatusTimeline` | Visual progress indicator for booking lifecycle |
| `FileUpload` | Drag-and-drop file upload with preview |
| `ConfirmDialog` | Confirmation modal for destructive actions |
| `LoadingSpinner` | Loading state indicator |
| `EmptyState` | Placeholder when no data exists |
| `SearchInput` | Debounced search input |
| `DateRangePicker` | Date range selection for filters |
| `StatCard` | Dashboard statistic card |

---

## 9. Document Generation

### 9.1 Approach

Use **pdfkit** on the backend to generate PDF documents directly in Node.js without headless browser dependencies.

### 9.2 Document Templates

#### Invoice PDF

```
┌──────────────────────────────────────┐
│ VSL 360 Logo        INVOICE          │
│                                      │
│ Invoice #: INV-2026-001              │
│ Date: 11 April 2026                  │
│                                      │
│ Bill To:                             │
│   Mr. X                              │
│   [email] | [contact]                │
│                                      │
│ Tour Details:                        │
│   Tour: 09 Days Tour                 │
│   Dates: 11 Apr - 19 Apr 2026       │
│   Pax: 5 persons                    │
│                                      │
│ ┌────────────────────┬─────────┐     │
│ │ Description        │ Amount  │     │
│ ├────────────────────┼─────────┤     │
│ │ Cost per person    │ $XXX    │     │
│ │ Total (5 pax)      │ $XXXX   │     │
│ │ Advance Paid       │ -$XXX   │     │
│ │ Balance Due        │ $XXXX   │     │
│ └────────────────────┴─────────┘     │
│                                      │
│ Payment Instructions:                │
│   [Bank details / payment method]    │
│                                      │
│ Notes: [payment notes]               │
└──────────────────────────────────────┘
```

#### Transport Details PDF (Internal Use)

```
┌──────────────────────────────────────┐
│ TRANSPORT DETAILS - INTERNAL         │
│                                      │
│ Booking: VSL2026001                  │
│ Client: Mr. X                        │
│ Tour Dates: 11 Apr - 19 Apr 2026    │
│                                      │
│ Vehicle: [model]                     │
│ Driver: [name] ([language])          │
│ Baby Seat: Yes/No                    │
│ Special Notes: [...]                 │
│                                      │
│ ARRIVAL PICKUP:                      │
│   Location: [...]                    │
│   Time: [...]                        │
│   Notes: [...]                       │
│                                      │
│ DEPARTURE DROP-OFF:                  │
│   Location: [...]                    │
│   Time: [...]                        │
│                                      │
│ DAY-BY-DAY PLAN:                     │
│ Day 1: [description]                 │
│ Day 2: [description]                 │
│ ...                                  │
└──────────────────────────────────────┘
```

#### Hotel Reservation PDF

```
┌──────────────────────────────────────┐
│ HOTEL RESERVATION DETAILS            │
│                                      │
│ Client: Mr. X                        │
│ Tour: 11 Apr - 19 Apr 2026          │
│ Guests: 5 (3 adults, 2 children)    │
│ Rooms: [count]                       │
│ Meal Preference: [vegetarian/etc.]   │
│ Mobility Notes: [if any]            │
│ Special Celebrations: [if any]       │
│                                      │
│ NIGHT-BY-NIGHT HOTEL PLAN:           │
│ ┌─────┬──────────┬────────┬───────┐  │
│ │Night│ Hotel    │ Room   │ Meal  │  │
│ ├─────┼──────────┼────────┼───────┤  │
│ │  1  │ Hotel A  │ Deluxe │  HB   │  │
│ │  2  │ Hotel B  │ Suite  │  FB   │  │
│ │ ... │ ...      │ ...    │ ...   │  │
│ └─────┴──────────┴────────┴───────┘  │
└──────────────────────────────────────┘
```

#### Full Itinerary PDF (Client-Facing)

```
┌──────────────────────────────────────┐
│ VSL 360 Logo                         │
│ YOUR TOUR ITINERARY                  │
│                                      │
│ Dear Mr. X,                          │
│ Tour: 11 Apr - 19 Apr 2026          │
│                                      │
│ ┌── DAY 1 ─────────────────────┐     │
│ │ Hotel: Hotel A (Deluxe Room) │     │
│ │ Meal: Half Board              │     │
│ │ Activities: [...]             │     │
│ │ Pickup: Airport at 10:00 AM  │     │
│ └───────────────────────────────┘     │
│                                      │
│ ┌── DAY 2 ─────────────────────┐     │
│ │ Hotel: Hotel B (Suite)        │     │
│ │ Meal: Full Board              │     │
│ │ Activities: [...]             │     │
│ └───────────────────────────────┘     │
│                                      │
│ ... (all days)                       │
│                                      │
│ IMPORTANT NOTES:                     │
│ [general notes, special notes]       │
│                                      │
│ Contact: VSL 360 support details     │
└──────────────────────────────────────┘
```

### 9.3 Implementation Approach

```typescript
// Backend service structure
// src/services/documentGenerator.ts

// 1. Fetch all related booking data from DB
// 2. Build PDF sections with shared writer helpers
// 3. Render PDF via pdfkit (no browser process)
// 4. Save PDF to file storage
// 5. Create GeneratedDocument record in DB
// 6. Return file path / download URL
```

---

## 10. File Upload & Attachments

### Supported File Types

| Type | Extensions | Max Size |
|------|-----------|----------|
| Passport Copy | `.jpg`, `.jpeg`, `.png`, `.pdf` | 5 MB |
| Flight Ticket | `.jpg`, `.jpeg`, `.png`, `.pdf` | 5 MB |
| Other Documents | `.jpg`, `.jpeg`, `.png`, `.pdf`, `.doc`, `.docx` | 10 MB |

### Storage Strategy

- **Development:** Local filesystem (`/uploads/` directory)
- **Production:** AWS S3 or similar cloud storage (recommended)
- File paths stored in database, actual files in storage
- Files organized by booking ID: `/uploads/{bookingId}/{fileType}/{filename}`

### Security

- Validate file types on both frontend and backend
- Scan file names for path traversal attacks
- Generate unique file names (UUID-based) to prevent overwrites
- Serve files through authenticated API endpoints (no direct access)

---

## 11. Authentication & Authorization

### Authentication Flow

```
1. User submits email + password to POST /api/auth/login
2. Backend validates credentials (bcrypt compare)
3. Backend returns:
   - Access Token (JWT, 15-minute expiry)
   - Refresh Token (JWT, 7-day expiry, stored in httpOnly cookie)
4. Frontend stores access token in memory (NOT localStorage)
5. Frontend sends access token in Authorization header
6. On 401, frontend uses refresh token to get new access token
```

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}
```

### Backend Middleware

```typescript
// Authentication middleware — verifies JWT
const authenticate = (req, res, next) => { /* verify token */ };

// Authorization middleware — checks role
const authorize = (...roles: Role[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Usage example:
router.post('/bookings', authenticate, authorize('SALES', 'OPS_MANAGER'), createBooking);
```

### Frontend Route Protection

```typescript
// ProtectedRoute component wraps routes requiring auth
// Checks: isAuthenticated + user.role matches allowed roles
// Redirects to /login if not authenticated
// Shows 403 page if role mismatch
```

---

## 12. Status Tracking & Notifications

### Status Transition Rules

| Current Status | Allowed Next Status | Who Can Trigger |
|---------------|-------------------|-----------------|
| INQUIRY_RECEIVED | CLIENT_PROFILE_CREATED | SALES |
| CLIENT_PROFILE_CREATED | PAX_DETAILS_ADDED | SALES |
| PAX_DETAILS_ADDED | COSTING_COMPLETED | SALES |
| COSTING_COMPLETED | SALES_CONFIRMED | SALES |
| SALES_CONFIRMED | RESERVATION_PENDING, TRANSPORT_PENDING | SYSTEM (auto) |
| RESERVATION_PENDING | RESERVATION_COMPLETED | RESERVATION |
| TRANSPORT_PENDING | TRANSPORT_COMPLETED | TRANSPORT |
| RESERVATION_COMPLETED + TRANSPORT_COMPLETED | DOCUMENTS_READY | SYSTEM (auto) |
| DOCUMENTS_READY | OPS_APPROVED | OPS_MANAGER |
| OPS_APPROVED | COMPLETED | OPS_MANAGER |
| Any status | CANCELLED | OPS_MANAGER |

### Status History

Every status change creates a `StatusHistory` record with:
- Previous status
- New status
- User who made the change
- Timestamp
- Optional notes

### In-App Notifications (Future Enhancement)

- When booking is submitted to operations → notify Reservation & Transport teams
- When department completes their section → notify Ops Manager
- When documents are approved → notify Sales Person

> **Note:** For MVP, status-based dashboards serve as the notification mechanism. Real-time notifications can be added later via WebSockets or polling.

---

## 13. Deployment & DevOps

### Development Environment

```bash
# Frontend (port 5173)
cd frontend && npm run dev

# Backend (port 3000)
cd backend && npm run dev

# Database
# Local PostgreSQL or Docker container
docker run -d --name vsl360-db -e POSTGRES_DB=vsl360 -e POSTGRES_USER=vsl360 -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:15
```

### Environment Variables

**Backend `.env`:**
```env
DATABASE_URL=postgresql://vsl360:secret@localhost:5432/vsl360
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3000/api
```

### Production Deployment Options

| Option | Description |
|--------|-------------|
| **VPS (DigitalOcean/AWS EC2)** | Full control, run Docker containers or PM2 |
| **Railway / Render** | Easy deployment for Node.js + PostgreSQL |
| **AWS (ECS + RDS)** | Scalable, managed database |
| **Vercel (frontend) + Railway (backend)** | Separate frontend/backend hosting |

### Current Production Deployment Approach

The current production environment uses cPanel shared hosting, so deployment should be based on a Git repository clone on the server rather than local release artifacts.

- The repository is cloned on the server at `/home/adminvisitsrilan/repositories/vsl360`
- Backend runtime files are synced into `/home/adminvisitsrilan/vsl360-backend`
- Frontend is built on the server and copied into `/home/adminvisitsrilan/public_html`
- Environment files must remain outside the destructive sync paths when possible
- Native Node modules such as `bcrypt` must be installed on the Linux server, not copied from macOS builds

### Recommended Production Automation

Use GitHub Actions to SSH into the server and run version-controlled deploy scripts stored in the repository.

- Backend deploy script: `scripts/deploy-backend.sh`
- Frontend deploy script: `scripts/deploy-frontend.sh`
- Workflow entry point: `.github/workflows/deploy.yml`

This keeps deployment logic in source control, avoids drift between manual and automated deploys, and removes the need to upload tarballs from a local machine.

### Docker Setup

```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 14. Project Structure

### Backend Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data (default admin user)
├── src/
│   ├── index.ts               # Express app entry point
│   ├── config/
│   │   ├── database.ts        # Prisma client instance
│   │   └── env.ts             # Environment variable validation
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication
│   │   ├── authorize.ts       # Role-based authorization
│   │   ├── errorHandler.ts    # Global error handler
│   │   ├── validate.ts        # Zod validation middleware
│   │   └── upload.ts          # Multer file upload config
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── client.routes.ts
│   │   ├── pax.routes.ts
│   │   ├── hotel.routes.ts
│   │   ├── transport.routes.ts
│   │   ├── invoice.routes.ts
│   │   ├── attachment.routes.ts
│   │   ├── document.routes.ts
│   │   └── report.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── booking.controller.ts
│   │   ├── client.controller.ts
│   │   ├── pax.controller.ts
│   │   ├── hotel.controller.ts
│   │   ├── transport.controller.ts
│   │   ├── invoice.controller.ts
│   │   ├── attachment.controller.ts
│   │   ├── document.controller.ts
│   │   └── report.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   ├── invoice.service.ts
│   │   ├── documentGenerator.ts    # PDF generation engine
│   │   └── fileStorage.ts          # File upload/download service
│   ├── validators/
│   │   ├── auth.schema.ts
│   │   ├── booking.schema.ts
│   │   ├── client.schema.ts
│   │   ├── pax.schema.ts
│   │   ├── hotel.schema.ts
│   │   ├── transport.schema.ts
│   │   └── invoice.schema.ts
│   ├── templates/                  # HTML templates for PDFs
│   │   ├── invoice.hbs
│   │   ├── transport.hbs
│   │   ├── reservation.hbs
│   │   └── itinerary.hbs
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   └── utils/
│       ├── bookingIdGenerator.ts   # Generate VSL2026XXX IDs
│       ├── invoiceNumberGenerator.ts
│       └── logger.ts
├── uploads/                       # Local file storage (dev)
├── package.json
├── tsconfig.json
└── .env
```

### Frontend Structure

```
frontend/
├── public/
│   └── vsl360-logo.png
├── src/
│   ├── main.tsx                   # App entry point
│   ├── App.tsx                    # Root component with router
│   ├── api/
│   │   ├── client.ts             # Axios instance with interceptors
│   │   ├── auth.api.ts
│   │   ├── bookings.api.ts
│   │   ├── users.api.ts
│   │   ├── hotels.api.ts
│   │   ├── transport.api.ts
│   │   ├── invoices.api.ts
│   │   ├── attachments.api.ts
│   │   └── documents.api.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── booking/
│   │   │   ├── BookingForm.tsx
│   │   │   ├── BookingTable.tsx
│   │   │   ├── BookingDetail.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── StatusTimeline.tsx
│   │   ├── guest/
│   │   │   ├── ClientForm.tsx
│   │   │   └── PaxForm.tsx
│   │   ├── hotel/
│   │   │   ├── HotelForm.tsx
│   │   │   └── HotelTable.tsx
│   │   ├── transport/
│   │   │   ├── TransportForm.tsx
│   │   │   └── DayPlanForm.tsx
│   │   ├── invoice/
│   │   │   └── InvoiceForm.tsx
│   │   ├── documents/
│   │   │   └── DocumentList.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── FileUpload.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── StatCard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBookings.ts
│   │   └── useDebounce.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── BookingListPage.tsx
│   │   ├── BookingCreatePage.tsx
│   │   ├── BookingDetailPage.tsx
│   │   ├── UserListPage.tsx
│   │   ├── UserCreatePage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── store/
│   │   └── authStore.ts           # Zustand auth state
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── formatters.ts          # Date, currency formatting
│   │   └── permissions.ts         # Role-based permission helpers
│   └── routes/
│       ├── index.tsx              # Route definitions
│       └── ProtectedRoute.tsx     # Auth + role guard
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── .env
```

---

## Appendix A: Booking ID Format

```
VSL + [4-digit year] + [3-digit sequential number]
Example: VSL2026001, VSL2026002, VSL2026153
```

Sequential number resets each year. Stored and auto-incremented in the database.

## Appendix B: Invoice Number Format

```
INV-[4-digit year]-[3-digit sequential number]
Example: INV-2026-001, INV-2026-002
```

## Appendix C: Key Business Rules

1. **One booking = one main guest = one trip.** Multiple passengers (pax) can be added under one booking.
2. **Invoice is auto-generated** when the sales person completes the costing step.
3. **Booking handover to departments is automatic** when sales person confirms the booking.
4. **All 4 documents become available** only after both reservation and transport departments complete their sections.
5. **Operations Manager can edit any booking at any stage** — serves as the system admin.
6. **Soft delete for users** — deactivate instead of removing to preserve audit trails.
7. **Status history is immutable** — every transition is logged and cannot be deleted.
8. **Booking IDs are immutable** — once generated, they cannot be changed.

## Appendix D: MVP vs Future Enhancements

### MVP (Phase 1)

- [x] User authentication (login/logout)
- [x] Role-based access control (4 roles)
- [x] Full booking CRUD (create, read, update, status management)
- [x] Client profile + pax management
- [x] Hotel booking management (night-by-night)
- [x] Transport plan management
- [x] Invoice/costing management
- [x] File attachments (passport, tickets)
- [x] PDF document generation (4 document types)
- [x] Dashboard per role
- [x] Status tracking with history
- [x] User management (Ops Manager)

### Future Enhancements (Phase 2+)

- [ ] Real-time notifications (WebSocket)
- [ ] Email notifications (booking updates, document sharing)
- [ ] WhatsApp integration (auto-capture inquiries)
- [ ] Calendar view for bookings (arrival/departure timeline)
- [ ] Driver mobile app (view assignments)
- [ ] Client portal (view itinerary, make payments)
- [ ] Advanced reporting with charts and exports
- [ ] Multi-currency support
- [ ] Audit log viewer
- [ ] Bulk operations (approve multiple bookings)
- [ ] Template management (customizable document templates)
- [ ] Backup and data export

---

*Document prepared for VSL 360 Tour Operations Management System development.*
*Based on: VSL_360_Tour_Operations_Management_System.pdf*
