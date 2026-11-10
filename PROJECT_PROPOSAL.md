# Project Proposal: Paperless Library Management System

## 1. Project Overview

The **Paperless Library Management System** is a role-based web application that digitises the day-to-day operations of a university library network. It replaces paper registers, manual membership checks, handwritten issue/return records, and disconnected fine tracking with one central portal.

The system provides separate workspaces for Super Admins, Library Admins, Library Staff, Teachers, and Students. Each role sees only the tools and records relevant to its responsibilities, while shared data connects catalog records, physical copies, memberships, circulation, reservations, fines, digital resources, inventory, and reporting.

The prototype is built with **Angular 21 and TypeScript**, using **PrimeNG** for interface components and **Chart.js** for dashboards. Data is stored in the browser for demonstration, with typed services and seed data providing realistic library workflows.

---

## 2. Problem Statement

University libraries typically maintain separate records for:

- book catalogues and physical copies
- member registrations and eligibility
- issue, return, and renewal transactions
- reservations and pickup queues
- overdue charges and payments
- lost or damaged copies
- acquisitions and inventory checks
- notices and member communication
- e-books and digital resources

When these records are kept on paper or in disconnected spreadsheets, staff spend time re-entering data, members cannot easily check availability, overdue items are missed, and administrators lack reliable branch-level reporting.

A paperless, role-based platform makes these workflows faster to perform, easier to audit, and available to members through self-service.

---

## 3. Project Objectives

- Replace paper circulation records with digital issue, return, renewal, and reservation workflows.
- Provide a single catalog of books, physical copies, ISBNs, shelf locations, and identification codes.
- Manage student, teacher, and staff memberships with digital verification.
- Automate due-date tracking, overdue detection, and fine calculation.
- Support branch-level operations while giving Super Admins system-wide oversight.
- Allow members to search the catalog, reserve books, request renewals, view fines, and use a digital membership card.
- Provide upload and controlled access for e-books, journals, papers, and other digital resources.
- Produce circulation, membership, inventory, acquisition, and fine reports.
- Maintain audit records for administrative actions.

---

## 4. Role-Based Features

### 4.1 Super Admin

| Feature area | Description |
|---|---|
| **Network dashboard** | System-wide statistics for branches, copies, circulation, members, overdue items, reservations, fines, and digital resources. |
| **Branch management** | Create, update, activate, and deactivate library branches with contact details, opening hours, capacity, and shelves. |
| **User accounts** | Create, edit, activate, suspend, and delete administrator, staff, teacher, and student accounts. |
| **Roles and permissions** | Assign roles, review the permission matrix, and manage access for each role. |
| **Library policies** | Configure system-wide borrowing limits, loan periods, renewals, reservations, grace periods, fines, and lost/damaged charges. |
| **Activity monitoring** | Review audit logs of branch, account, role, policy, settings, and e-book actions. |
| **System reports** | Generate branch performance, circulation, membership, fine, inventory, and audit reports. |
| **E-book management** | Upload e-books, set open or restricted access, publish/unpublish titles, and approve special access requests. |

### 4.2 Library Admin / Librarian

| Feature area | Description |
|---|---|
| **Operations dashboard** | Branch-focused availability, circulation, overdue, membership, and fine statistics with charts. |
| **Catalog management** | Add, edit, archive, and search books with ISBN, category, publisher, edition, language, and description. |
| **Copy management** | Maintain individual copies, barcodes, shelf locations, condition, and availability status. |
| **Identification codes** | Generate and display Code 39 barcodes and QR-style labels for copies. |
| **Memberships** | Register and maintain student, teacher, and staff memberships with status and expiry dates. |
| **Circulation** | Issue books, record returns, renew loans, mark lost copies, and apply policy limits. |
| **Approvals** | Approve or reject borrowing, reservation, and renewal requests. |
| **Fines** | Add fines, record payments, waive charges, and view collection summaries. |
| **E-books and digital resources** | Upload and manage digital titles and review restricted-access requests. |
| **Acquisitions** | Review purchase requests, approve or reject them, and mark them ordered or received. |
| **Inventory** | Verify stock, record missing/damaged copies, and resolve exceptions. |
| **Announcements** | Send notices, reminders, and reservation alerts to selected audiences and branches. |
| **Reporting** | Produce circulation, membership, inventory, fine, acquisition, and audit reports. |

### 4.3 Library Staff

| Feature area | Description |
|---|---|
| **Operations dashboard** | Assigned-branch view of available copies, active loans, overdue items, pickups, renewals, and daily counts. |
| **Circulation desk** | Scan or enter member IDs and book barcodes to issue, return, and renew books. |
| **Member verification** | Check membership status, borrowing limits, overdue loans, unpaid fines, and eligibility. |
| **Reservations and pickups** | Hand over ready reservations, issue the reserved copy, or cancel the hold. |
| **Catalog lookup** | Search books, check availability, and view shelf locations for the assigned branch. |
| **Shelf and availability updates** | Correct shelf locations and update copy condition/status within branch permissions. |
| **Lost and damaged reporting** | Record missing, damaged, or lost copies and resolve exceptions. |
| **Inventory checks** | Perform stock verification for the assigned branch. |
| **Daily reports** | View and print issue, return, and overdue activity for a selected date. |
| **Confirmations** | Trigger digital borrowing and return receipts and review recently sent confirmations. |

### 4.4 Teacher / Faculty

| Feature area | Description |
|---|---|
| **Personal dashboard** | Borrowed books, due dates, reservations, fines, alerts, and library announcements. |
| **Catalog search** | Search by title, author, ISBN, category, or subject and check availability and shelf locations. |
| **Reservations** | Reserve books online, track status, and cancel holds. |
| **Loans and renewals** | View current loans, request renewals, and review borrowing history. |
| **Digital membership card** | QR/barcode membership card for verification at any branch. |
| **E-books and resources** | Read open e-books and request special permission for restricted titles. |
| **Book suggestions** | Recommend new books and academic resources to the library. |
| **Fines** | View applicable charges, payment status, and waiver history. |
| **Notifications** | Receive due-date, reservation, fine, and announcement alerts. |
| **Profile** | Maintain contact details on the membership record. |

### 4.5 Student

Students receive the same self-service workspace with a student-specific borrowing policy, including:

- catalog search by title, author, ISBN, category, or subject
- availability and shelf-location checks
- online reservations and pickup tracking
- borrowed books, due dates, and renewal requests
- borrowing history
- digital membership card with QR/barcode
- permitted e-books, lecture references, papers, and theses
- book suggestions
- fine and payment status
- due-date reminders, reservation alerts, and announcements
- personal library profile

---

## 5. Paperless Library Operations

- Digital membership verification using membership numbers and QR/barcode cards.
- Barcode and QR-based book-copy identification.
- Online reservations, waitlists, and pickup-ready holds.
- Digital issue, return, renewal, and loan history.
- Automatic due-date tracking and overdue fine calculation.
- Digital borrowing and return receipts.
- Online access to permitted digital resources.
- Digital acquisition requests and approval workflow.
- Automated reminders and notifications.
- Digital inventory verification and stock reporting.
- System-wide audit logging.

---

## 6. System Architecture

### 6.1 Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 21 (standalone components, signals) |
| Language | TypeScript |
| UI components | PrimeNG 21 |
| Styling | Tailwind CSS, SCSS layout utilities |
| Charts | Chart.js |
| State and persistence | Angular signals + browser `localStorage` |
| Authentication | Demonstration session-based login via `sessionStorage` |

### 6.2 Application Structure

```
src/app/
  core/
    models/          typed library entities and enums
    data/            seed data for branches, books, members, loans, etc.
    services/        auth, storage, library data, dashboards
    guards/          authentication and role routing
  features/
    library-admin/   Super Admin pages
    librarian/       Library Admin workspace
    staff/           Library Staff workspace
    my-library/      Teacher and Student self-service workspace
  layouts/           topbar, sidebar, menu, footer
  pages/auth/        login and demo accounts
  shared/            reusable cards, tables, charts, status tags, logos
```

### 6.3 Core Data Entities

- `LibraryBranch`
- `Book`, `BookCopy`
- `LibraryMember`
- `Loan`
- `Reservation`
- `BorrowRequest`
- `RenewalRequest`
- `FineRecord`
- `AcquisitionRequest`
- `InventoryRecord`
- `Announcement`
- `EBook`, `EBookAccessRequest`
- `LibraryUser`, `RoleDefinition`, `LibraryPolicy`
- `LibraryAuditLog`

Each record uses typed identifiers, timestamps, status fields, and branch references so records remain connected across modules.

---

## 7. Key Workflows

### 7.1 Issue a Book

1. Staff verifies the member using membership number or digital card.
2. The system checks membership status, borrowing limit, overdue loans, and fines.
3. Staff scans the book-copy barcode.
4. The system records the loan, calculates the due date from policy, and marks the copy as issued.
5. A digital borrowing receipt can be sent to the member.

### 7.2 Return a Book

1. Staff scans the copy barcode.
2. The system finds the active loan and displays the member and due date.
3. On return, the copy becomes available.
4. If overdue, the system calculates a fine using the member-type policy and grace period.
5. A return receipt can be sent.

### 7.3 Reserve and Pick Up

1. A teacher or student reserves an available title online.
2. Library staff or an administrator marks the reservation ready.
3. The member receives a pickup alert with a hold expiry date.
4. Staff issue the reserved copy and mark the reservation fulfilled.

### 7.4 Restricted E-Book Access

1. An administrator uploads an e-book and sets it to **restricted**.
2. A teacher or student requests special access with a reason.
3. An administrator approves or rejects the request.
4. Approved members can read the title in the browser; others see only the metadata.

### 7.5 Acquisitions

1. A member or librarian suggests a book.
2. The Library Admin reviews the request.
3. The request is approved, rejected, ordered, or received.
4. Received titles can be added to the catalog as new books and copies.

---

## 8. Implementation Status

The prototype currently includes:

| Area | Status |
|---|---|
| Authentication and five role workspaces | Implemented |
| Super Admin dashboard, branches, accounts, roles, policies, audit, reports | Implemented |
| Library Admin catalog, copies, memberships, circulation, approvals, fines, acquisitions, inventory, announcements, reports | Implemented |
| Library Staff dashboard, scanning desk, catalog, member verification, inventory, daily reports, confirmations | Implemented |
| Teacher and Student dashboards, catalog, loans, reservations, fines, digital card, profile, notifications | Implemented |
| E-book upload, reading, restricted access requests, approvals | Implemented |
| Barcode and QR-style copy labels | Implemented (Code 39 barcode; QR-style demo matrix) |
| Browser persistence and audit logging | Implemented |

---

## 9. Scope and Limitations

This project is a functional prototype for demonstration and academic evaluation.

- Authentication is simulated with demonstration accounts; passwords are not managed by a server.
- Data is stored in the browser (`localStorage`), not a central database.
- Uploaded e-books are stored in browser storage and are limited to approximately 3 MB per file.
- QR labels are generated as visual demo matrices; production use would require a standards-compliant QR encoder.
- Email and SMS confirmations are simulated and recorded in the audit log.
- Payments are recorded as prototype transactions; no payment gateway is connected.
- A production system would require secure server-side authentication, a relational database, file storage, permission enforcement, backups, privacy controls, and integrations with university systems.

---

## 10. Non-Functional Considerations

| Area | Approach |
|---|---|
| **Usability** | Consistent role-based navigation, responsive layouts, empty states, validation messages, and confirmation dialogs. |
| **Accessibility** | Labelled form controls, keyboard-friendly dialogs, visible status tags, and readable contrast. |
| **Performance** | Lazy-loaded feature routes, memoised signal computations, paginated tables, and debounced storage writes. |
| **Auditability** | Mutations record actor, role, action, entity, branch, and timestamp. |
| **Data integrity** | Business rules prevent duplicate reservations, over-limit borrowing, deleting active copies, and invalid renewals. |
| **Security (production)** | Server-side authentication, hashed passwords, role policies, encrypted transport, and restricted file access. |

---

## 11. Expected Outcome

The expected outcome is a paperless, role-based library portal that demonstrates how a university library network can manage:

- catalog and copy records
- memberships and eligibility
- circulation and reservations
- fines and payments
- digital resources and special permissions
- acquisitions and inventory
- announcements and confirmations
- branch and system-wide reporting

The prototype provides a clear foundation for a production system backed by secure institutional infrastructure.

---

## 12. Demonstration Accounts

| Role | Username | Password |
|---|---|---|
| Super Admin | `superadmin` | `Admin@123` |
| Library Admin | `librarian` | `Librarian@123` |
| Library Staff | `staff` | `Staff@123` |
| Teacher / Faculty | `teacher1` | `Teacher@123` |
| Student | `student1` | `Student@123` |

---

## 13. Conclusion

The Paperless Library Management System consolidates library operations into one typed, role-aware Angular application. It replaces paper-based circulation and membership records with digital workflows, gives members self-service access to the catalog and digital resources, and gives administrators the oversight and reporting needed to run a multi-branch library network.
