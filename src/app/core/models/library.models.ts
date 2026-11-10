import { Timestamps } from './enums';

export type LibraryRole = 'SUPER_ADMIN' | 'LIBRARY_ADMIN' | 'LIBRARY_STAFF' | 'TEACHER' | 'STUDENT';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type MemberType = 'STUDENT' | 'TEACHER' | 'STAFF';

export interface LibraryBranch extends Timestamps {
    id: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    openingHours: string;
    seatCapacity: number;
    shelfCount: number;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface LibraryUser extends Timestamps {
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    role: LibraryRole;
    status: AccountStatus;
    branchId: string | null;
    lastLogin: string | null;
}

export interface PermissionDefinition {
    key: string;
    label: string;
    group: string;
    description: string;
}

export interface RoleDefinition {
    role: LibraryRole;
    label: string;
    description: string;
    icon: string;
    permissions: string[];
}

export interface BranchMetric {
    id: string;
    branchId: string;
    totalTitles: number;
    totalCopies: number;
    availableCopies: number;
    issuedCopies: number;
    overdueLoans: number;
    totalMembers: number;
    activeLoans: number;
    reservations: number;
    finesOutstanding: number;
    digitalResources: number;
}

export interface CirculationTrendPoint {
    month: string;
    issued: number;
    returned: number;
    overdue: number;
}

export interface LibraryPolicy extends Timestamps {
    id: string;
    memberType: MemberType;
    borrowLimit: number;
    loanPeriodDays: number;
    renewalLimit: number;
    renewalPeriodDays: number;
    reservationLimit: number;
    reservationHoldDays: number;
    finePerDay: number;
    maxFine: number;
    gracePeriodDays: number;
    lostBookCharge: number;
    damagedBookCharge: number;
}

export interface LibrarySettings extends Timestamps {
    libraryName: string;
    shortName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    currency: string;
    timezone: string;
    fineCalculation: 'DAILY' | 'HOURLY';
    autoApproveReservations: boolean;
    autoRenewals: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    qrCodePrefix: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS' | 'LOGIN' | 'POLICY' | 'ROLE' | 'SETTINGS' | 'PAYMENT' | 'WAIVE' | 'SEND';

export interface LibraryAuditLog extends Timestamps {
    id: string;
    actor: string;
    actorRole: LibraryRole;
    action: AuditAction;
    entity: string;
    entityId: string;
    detail: string;
    branchId: string | null;
    ipAddress: string;
}

export type EBookAccessLevel = 'OPEN' | 'RESTRICTED';

export type EBookStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EBook extends Timestamps {
    id: string;
    title: string;
    author: string;
    isbn: string;
    category: string;
    publisher: string;
    publishedYear: number;
    pages: number;
    language: string;
    description: string;
    excerpt: string;
    accessLevel: EBookAccessLevel;
    status: EBookStatus;
    downloadAllowed: boolean;
    fileName: string | null;
    fileType: string | null;
    fileSize: number;
    dataUrl: string | null;
    uploadedBy: string;
}

export interface EBookAccessRequest extends Timestamps {
    id: string;
    ebookId: string;
    username: string;
    userName: string;
    role: LibraryRole;
    note: string;
    status: AccessRequestStatus;
    requestedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
}

export type BookStatus = 'ACTIVE' | 'ARCHIVED';

export interface Book extends Timestamps {
    id: string;
    isbn: string;
    title: string;
    author: string;
    category: string;
    publisher: string;
    publishedYear: number;
    language: string;
    description: string;
    edition: string;
    status: BookStatus;
}

export type CopyStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'ARCHIVED';

export interface BookCopy extends Timestamps {
    id: string;
    bookId: string;
    branchId: string;
    barcode: string;
    shelfLocation: string;
    condition: 'GOOD' | 'FAIR' | 'DAMAGED';
    status: CopyStatus;
}

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING';

export interface LibraryMember extends Timestamps {
    id: string;
    membershipNo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    memberType: MemberType;
    branchId: string;
    department: string;
    status: MemberStatus;
    joinedAt: string;
    expiresAt: string;
}

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';

export interface Loan extends Timestamps {
    id: string;
    copyId: string;
    bookId: string;
    memberId: string;
    branchId: string;
    issuedAt: string;
    dueAt: string;
    returnedAt: string | null;
    renewalCount: number;
    status: LoanStatus;
    issuedBy: string;
    notes: string;
}

export type ReservationStatus = 'PENDING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface Reservation extends Timestamps {
    id: string;
    bookId: string;
    memberId: string;
    branchId: string;
    status: ReservationStatus;
    requestedAt: string;
    readyAt: string | null;
    expiresAt: string | null;
    notes: string;
}

export type BorrowRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface BorrowRequest extends Timestamps {
    id: string;
    bookId: string;
    memberId: string;
    branchId: string;
    status: BorrowRequestStatus;
    requestedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    notes: string;
}

export type RenewalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RenewalRequest extends Timestamps {
    id: string;
    loanId: string;
    memberId: string;
    status: RenewalRequestStatus;
    requestedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    notes: string;
}

export type FineStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface FineRecord extends Timestamps {
    id: string;
    memberId: string;
    loanId: string | null;
    amount: number;
    reason: string;
    status: FineStatus;
    issuedAt: string;
    settledAt: string | null;
    settledBy: string | null;
    note: string;
}

export type AcquisitionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED';

export interface AcquisitionRequest extends Timestamps {
    id: string;
    title: string;
    author: string;
    isbn: string;
    branchId: string;
    requestedBy: string;
    estimatedCost: number;
    status: AcquisitionStatus;
    requestedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    notes: string;
}

export type InventoryStatus = 'VERIFIED' | 'MISSING' | 'DAMAGED' | 'ADJUSTED';

export interface InventoryRecord extends Timestamps {
    id: string;
    copyId: string;
    bookId: string;
    branchId: string;
    status: InventoryStatus;
    checkedAt: string;
    checkedBy: string;
    notes: string;
}

export type AnnouncementAudience = 'ALL' | 'STUDENT' | 'TEACHER' | 'STAFF';

export interface Announcement extends Timestamps {
    id: string;
    title: string;
    message: string;
    audience: AnnouncementAudience;
    branchId: string | null;
    channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'ALL';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT';
    sentAt: string | null;
    sentBy: string;
}

export interface LibraryStore {
    schemaVersion: number;
    branches: LibraryBranch[];
    users: LibraryUser[];
    roles: RoleDefinition[];
    policies: LibraryPolicy[];
    branchMetrics: BranchMetric[];
    circulationTrend: CirculationTrendPoint[];
    ebooks: EBook[];
    ebookRequests: EBookAccessRequest[];
    books: Book[];
    bookCopies: BookCopy[];
    members: LibraryMember[];
    loans: Loan[];
    reservations: Reservation[];
    borrowRequests: BorrowRequest[];
    renewalRequests: RenewalRequest[];
    fines: FineRecord[];
    acquisitions: AcquisitionRequest[];
    inventoryRecords: InventoryRecord[];
    announcements: Announcement[];
    auditLogs: LibraryAuditLog[];
    settings: LibrarySettings;
}

export const PERMISSIONS: PermissionDefinition[] = [
    { key: 'branches.view', label: 'View Branches', group: 'Branch Management', description: 'View library branches and their settings.' },
    { key: 'branches.manage', label: 'Manage Branches', group: 'Branch Management', description: 'Create, update, activate and deactivate branches.' },
    { key: 'users.view', label: 'View Accounts', group: 'User & Accounts', description: 'View user, administrator and staff accounts.' },
    { key: 'users.manage', label: 'Manage Accounts', group: 'User & Accounts', description: 'Create, update, activate and deactivate accounts.' },
    { key: 'roles.manage', label: 'Manage Roles', group: 'User & Accounts', description: 'Assign roles and configure permissions.' },
    { key: 'catalog.view', label: 'View Catalog', group: 'Catalog', description: 'Browse books, copies, ISBN details and shelf locations.' },
    { key: 'catalog.manage', label: 'Manage Catalog', group: 'Catalog', description: 'Add, edit, categorize and archive books.' },
    { key: 'circulation.issue', label: 'Issue Books', group: 'Circulation', description: 'Issue book copies to eligible members.' },
    { key: 'circulation.return', label: 'Return Books', group: 'Circulation', description: 'Record returns and close loans.' },
    { key: 'circulation.renew', label: 'Renew Loans', group: 'Circulation', description: 'Process approved renewals.' },
    { key: 'circulation.reserve', label: 'Reserve Books', group: 'Circulation', description: 'Create and manage reservations and waitlists.' },
    { key: 'membership.view', label: 'View Memberships', group: 'Membership', description: 'Verify membership and borrowing eligibility.' },
    { key: 'membership.manage', label: 'Manage Memberships', group: 'Membership', description: 'Approve and maintain member records.' },
    { key: 'fines.view', label: 'View Fines', group: 'Fines & Payments', description: 'View overdue fines and payment history.' },
    { key: 'fines.manage', label: 'Manage Fines', group: 'Fines & Payments', description: 'Record fine payments and adjustments.' },
    { key: 'fines.waive', label: 'Waive Fines', group: 'Fines & Payments', description: 'Approve fine waivers.' },
    { key: 'digital.view', label: 'Access Digital Resources', group: 'Digital Resources', description: 'Access permitted e-books, journals and papers.' },
    { key: 'digital.manage', label: 'Manage Digital Resources', group: 'Digital Resources', description: 'Publish and maintain digital resources.' },
    { key: 'acquisitions.view', label: 'View Acquisitions', group: 'Acquisitions', description: 'View purchase requests and orders.' },
    { key: 'acquisitions.approve', label: 'Approve Acquisitions', group: 'Acquisitions', description: 'Approve purchase requests and acquisitions.' },
    { key: 'inventory.view', label: 'View Inventory', group: 'Inventory', description: 'View inventory records and stock checks.' },
    { key: 'inventory.adjust', label: 'Adjust Inventory', group: 'Inventory', description: 'Perform stock adjustments and verification.' },
    { key: 'reports.view', label: 'View Reports', group: 'Reports', description: 'View circulation, inventory, membership and fine reports.' },
    { key: 'reports.export', label: 'Export Reports', group: 'Reports', description: 'Export report data for offline use.' },
    { key: 'audit.view', label: 'View Audit Logs', group: 'Governance', description: 'View system-wide activity and audit logs.' },
    { key: 'policies.manage', label: 'Manage Policies', group: 'Governance', description: 'Configure borrowing, renewal, reservation and fine policies.' },
    { key: 'settings.manage', label: 'Manage Settings', group: 'Governance', description: 'Configure library-wide settings and notifications.' }
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map((permission) => permission.key);
