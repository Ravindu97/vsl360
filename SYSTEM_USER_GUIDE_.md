# VSL 360 System User Guide
  
## 1. Purpose
This guide explains how to use the VSL 360 Tour Operations Management System in day-to-day operations.
  
Use this document for:
- Logging in and understanding role-based access
- Creating and managing bookings
- Coordinating Sales, Reservation, Transport, and Operations work
- Managing invoices, documents, and attachments
- Troubleshooting common user issues
  
---
  
## 2. What This System Does
VSL 360 centralizes the full tour lifecycle:
- Client inquiry and profile capture
- Passenger (Pax) management
- Hotel and transport planning
- Invoice management
- Document generation (PDFs)
- Booking status tracking and history
  
---
  
## 3. Access and Login
  
### 3.1 Login URL
- Open the frontend app in your browser (local dev default is `http://localhost:5173`).
- Use the login page to authenticate.
  
### 3.2 Default Seeded Users
All seeded users use this password:
- Password: `admin123`
  
Accounts:
- `admin@vsl360.com` (Operations Manager)
- `sales@vsl360.com` (Sales)
- `reservation@vsl360.com` (Reservation)
- `transport@vsl360.com` (Transport)
  
### 3.3 Logout
- Click your name/user icon in the top-right menu.
- Select `Logout`.
  
---
  
## 4. Roles and Responsibilities
  
### 4.1 Sales (`SALES`)
Primary tasks:
- Create bookings
- Enter client details and tour details
- Add pax details
- Add and manage invoice information
- Upload booking attachments
- Generate invoice documents
  
### 4.2 Reservation (`RESERVATION`)
Primary tasks:
- Add and manage hotel plans by night
- Confirm hotel entries
- Update reservation-related details
  
### 4.3 Transport (`TRANSPORT`)
Primary tasks:
- Create/edit transport plan
- Add day-by-day transport plan entries
- Manage driver/vehicle/pickup/drop information
  
### 4.4 Operations Manager (`OPS_MANAGER`)
Primary tasks:
- Full visibility across modules
- User management
- Final status transitions and operational oversight
- Access to dashboard metrics
  
---
  
## 5. Main Navigation
Left sidebar (role-dependent):
- `Dashboard`
- `Bookings`
- `Users` (Ops Manager only)
- `Reports` (menu item visible for Ops Manager; route may be unavailable in current UI build)
  
Top bar:
- Current user name and account dropdown
- Logout action
  
---
  
## 6. Booking Lifecycle Overview
Typical status progression:
1. `INQUIRY_RECEIVED`
2. `CLIENT_PROFILE_CREATED`
3. `PAX_DETAILS_ADDED`
4. `COSTING_COMPLETED`
5. `SALES_CONFIRMED`
6. `RESERVATION_PENDING` / `TRANSPORT_PENDING`
7. `RESERVATION_COMPLETED` / `TRANSPORT_COMPLETED`
8. `DOCUMENTS_READY`
9. `OPS_APPROVED`
10. `COMPLETED`
  
Special terminal state:
- `CANCELLED`
  
Status changes are visible in the booking `History` tab.
  
---
  
## 7. Daily Workflow by Screen
  
## 7.1 Dashboard
Purpose:
- Quick operational summary
- Booking counts and revenue snapshot
- Recent bookings shortcuts
  
How to use:
1. Open `Dashboard` after login.
2. Review summary cards (total bookings, revenue collected/pending).
3. Review status breakdown to identify queue buildup.
4. Click a recent booking to open details.
5. If your role permits, use `New Booking` for fast entry.
  
---
  
## 7.2 Bookings List
Purpose:
- View all accessible bookings
- Filter by status
- Navigate to booking details
- Create or delete bookings (role-dependent)
  
How to use:
1. Open `Bookings`.
2. Use status filter dropdown (`All Statuses` or specific stage).
3. Use row actions:
- Eye icon: open booking details
- Trash icon: delete booking (permitted roles only)
4. Click `New Booking` to create a booking.
  
---
  
## 7.3 Create Booking
Purpose:
- Capture base data for a new trip
  
Data captured:
- Client information (name, citizenship, email, contact)
- Tour details (tour month, days, arrival/departure date and time)
- Optional notes (activities, celebrations, general notes)
  
How to use:
1. Open `Bookings` -> `New Booking`.
2. Fill all required fields (`*`).
3. Submit `Create Booking`.
4. System redirects to the booking detail page.
  
Best practice:
- Ensure client email and contact are accurate before submission.
  
---
  
## 7.4 Booking Detail Page
The booking detail page is organized into tabs.
  
### 7.4.1 Overview Tab
Use for:
- High-level trip summary
- Quick counts (pax, hotels, attachments, documents)
- Status update action (based on role and allowed transitions)
  
How to use status update:
1. Select next status from dropdown.
2. Add optional notes.
3. Click `Update Status`.
  
### 7.4.2 Client & Pax Tab
Use for:
- Editing main client profile
- Adding/removing passengers (Pax)
  
How to add Pax:
1. Click `Add Pax`.
2. Enter name, type (`ADULT/CHILD/INFANT`), optional relationship/age.
3. Save.
  
### 7.4.3 Hotels Tab
Use for:
- Building night-by-night hotel plan
- Confirming hotel reservations
  
How to add a hotel night:
1. Click `Add Night`.
2. Enter night number, hotel name, room category, room count, meal plan.
3. Add optional preferences/notes.
4. Save.
5. Use confirm action when reservation is finalized.
  
### 7.4.4 Transport Tab
Use for:
- Creating transport master plan
- Adding day-level itinerary transport details
  
How to use:
1. Create or edit transport plan (vehicle, driver, language, pickup/drop).
2. Add `Day Plans` with day number and movement details.
3. Maintain notes for internal clarity.
  
### 7.4.5 Invoice Tab
Use for:
- Creating/editing financial values
- Tracking total, paid, and balance amounts
  
How to use:
1. Open `Invoice` tab.
2. Enter `Cost Per Person`, `Total`, `Advance Paid`, `Balance`.
3. Add payment notes/instructions if needed.
4. Save.
  
### 7.4.6 Attachments Tab
Use for:
- Uploading supporting files (e.g., passports, tickets, confirmations)
- Downloading or deleting files
  
How to use:
1. Click `Upload`.
2. Select file from device.
3. Confirm file appears in list.
4. Use download/delete actions as needed.
  
### 7.4.7 Documents Tab
Use for:
- Generating official booking PDFs
- Downloading generated versions
  
Document types:
- Invoice
- Transport Details
- Hotel Reservation
- Full Itinerary
  
How to use:
1. Click `Generate <Document Type>`.
2. Wait for document to appear in table.
3. Download from action button.
4. Repeat generation when revised versions are needed.
  
### 7.4.8 History Tab
Use for:
- Auditing status transitions and timeline notes
  
How to use:
1. Open `History` tab.
2. Review chronological entries for who/when/what changed.
  
---
  
## 7.5 User Management (Ops Manager)
Purpose:
- Add and deactivate users
- Assign role at creation
  
How to create user:
1. Open `Users`.
2. Click `Add User`.
3. Fill name, email, password, role.
4. Save.
  
How to deactivate user:
1. Click delete/deactivate action in user row.
2. Confirm action.
  
Operational note:
- User role determines module access immediately.
  
---
  
## 8. Recommended Team Operating Procedure
  
### 8.1 Sales Handover Pattern
1. Sales creates booking and completes client + pax + financial core data.
2. Sales updates status toward handover.
3. Reservation and Transport teams execute their respective tabs.
4. Ops Manager verifies completion and approves final stage.
  
### 8.2 Data Quality Checklist Before Completion
- Client profile complete and contactable
- Pax list final and accurate
- Hotel nights complete and confirmed
- Transport plan + daily movements complete
- Invoice values validated
- Required files attached
- Required PDFs generated and downloaded/shared
  
---
  
## 9. Troubleshooting for Users
  
### 9.1 Login fails
Check:
- Correct email/password
- Backend server running
- Frontend points to correct backend URL
  
### 9.2 No data showing on dashboard/bookings
Check:
- Logged-in role permissions
- API/backend availability
- Browser console/network errors (for admin support)
  
### 9.3 Cannot change status
Possible causes:
- Role does not allow that transition
- Current status has limited next states
  
### 9.4 Upload/generate actions fail
Check:
- File type/size accepted by backend rules
- Backend upload/doc generation services running
- Retry and verify network response
  
### 9.5 Seeded login users not found
Cause:
- Seed script not executed on current DB
Fix:
- Run backend DB seed process again (admin/developer task)
  
---
  
## 10. Security and Good Usage Practices
- Do not share credentials between team members.
- Change seeded default passwords in non-dev environments.
- Keep notes factual and professional (status history is audit-like).
- Avoid deleting records unless required by policy.
- Keep attachments relevant and correctly named.
  
---
  
## 11. Current Implementation Notes
- `Users` page is protected for Ops Manager role.
- Sidebar may show a `Reports` menu item for Ops Manager, but a dedicated reports route/page may not be available yet in this build.
- Core operational modules (Dashboard, Bookings, Booking Details tabs, User management) are available.
  
---
  
## 12. Quick Start (5 Minutes)
1. Login with `admin@vsl360.com` / `admin123`.
2. Open `Bookings` -> `New Booking`.
3. Create one sample booking.
4. Open booking and add:
- 1-2 Pax
- 1 Hotel night
- Transport plan and 1 day plan
- Invoice amounts
- 1 attachment
5. Generate at least one document PDF.
6. Move status forward and confirm in `History`.
  
You are now ready for normal day-to-day operation.
  