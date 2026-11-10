import type {
    AcquisitionRequest,
    Announcement,
    Book,
    BookCopy,
    BorrowRequest,
    BranchMetric,
    CirculationTrendPoint,
    EBook,
    EBookAccessRequest,
    FineRecord,
    InventoryRecord,
    LibraryAuditLog,
    LibraryBranch,
    LibraryMember,
    LibraryPolicy,
    LibrarySettings,
    LibraryUser,
    Loan,
    RenewalRequest,
    Reservation,
    RoleDefinition
} from '@/app/core/models/library.models';
import { ALL_PERMISSION_KEYS } from '@/app/core/models/library.models';

const now = '2026-11-09T08:00:00.000Z';
const ts = (createdAt = now, updatedAt = now) => ({ createdAt, updatedAt });

export const LIBRARY_SCHEMA_VERSION = 3;
export const LIBRARY_STORAGE_KEY = 'library.v1';

export const libraryBranches: LibraryBranch[] = [
    {
        id: 'br-main',
        name: 'Main Campus Library',
        code: 'LIB-MAIN',
        address: 'Central Campus, Building A, University Avenue',
        phone: '+880 9612 100100',
        email: 'main.library@university.edu',
        openingHours: '08:00 - 22:00 (Sat - Thu)',
        seatCapacity: 850,
        shelfCount: 420,
        status: 'ACTIVE',
        ...ts('2020-01-10T08:00:00.000Z')
    },
    {
        id: 'br-eng',
        name: 'Engineering Branch Library',
        code: 'LIB-ENG',
        address: 'Faculty of Engineering, Block C, Level 2',
        phone: '+880 9612 100200',
        email: 'engineering.library@university.edu',
        openingHours: '08:30 - 20:00 (Sat - Thu)',
        seatCapacity: 320,
        shelfCount: 180,
        status: 'ACTIVE',
        ...ts('2021-03-15T08:00:00.000Z')
    },
    {
        id: 'br-biz',
        name: 'Business & Economics Branch',
        code: 'LIB-BIZ',
        address: 'Business School Complex, Ground Floor',
        phone: '+880 9612 100300',
        email: 'business.library@university.edu',
        openingHours: '09:00 - 20:00 (Sat - Thu)',
        seatCapacity: 260,
        shelfCount: 140,
        status: 'ACTIVE',
        ...ts('2022-07-01T08:00:00.000Z')
    },
    {
        id: 'br-sci',
        name: 'Science & Research Annex',
        code: 'LIB-SCI',
        address: 'Research Park, Annex Building, Level 1',
        phone: '+880 9612 100400',
        email: 'science.library@university.edu',
        openingHours: '09:00 - 18:00 (Sat - Thu)',
        seatCapacity: 180,
        shelfCount: 110,
        status: 'INACTIVE',
        ...ts('2023-11-20T08:00:00.000Z')
    }
];

export const libraryRoles: RoleDefinition[] = [
    {
        role: 'SUPER_ADMIN',
        label: 'Super Admin',
        description: 'Oversees the entire library network, user access, policies, audit logs and system-wide reporting.',
        icon: 'pi pi-shield',
        permissions: [...ALL_PERMISSION_KEYS]
    },
    {
        role: 'LIBRARY_ADMIN',
        label: 'Library Admin / Librarian',
        description: 'Runs a branch: catalog, memberships, circulation, fines, digital resources, acquisitions and inventory.',
        icon: 'pi pi-building-columns',
        permissions: [
            'branches.view',
            'users.view',
            'users.manage',
            'catalog.view',
            'catalog.manage',
            'circulation.issue',
            'circulation.return',
            'circulation.renew',
            'circulation.reserve',
            'membership.view',
            'membership.manage',
            'fines.view',
            'fines.manage',
            'fines.waive',
            'digital.view',
            'digital.manage',
            'acquisitions.view',
            'acquisitions.approve',
            'inventory.view',
            'inventory.adjust',
            'reports.view',
            'reports.export',
            'audit.view',
            'policies.manage'
        ]
    },
    {
        role: 'LIBRARY_STAFF',
        label: 'Library Staff',
        description: 'Handles daily circulation, member verification, reservations, returns and inventory checks.',
        icon: 'pi pi-id-card',
        permissions: [
            'catalog.view',
            'circulation.issue',
            'circulation.return',
            'circulation.renew',
            'circulation.reserve',
            'membership.view',
            'fines.view',
            'digital.view',
            'inventory.view',
            'reports.view'
        ]
    },
    {
        role: 'TEACHER',
        label: 'Teacher / Faculty',
        description: 'Searches the catalog, reserves books, renews loans and accesses permitted digital resources.',
        icon: 'pi pi-graduation-cap',
        permissions: ['catalog.view', 'circulation.renew', 'circulation.reserve', 'digital.view', 'membership.view']
    },
    {
        role: 'STUDENT',
        label: 'Student',
        description: 'Searches the catalog, reserves books, renews loans, views fines and accesses digital resources.',
        icon: 'pi pi-user',
        permissions: ['catalog.view', 'circulation.renew', 'circulation.reserve', 'digital.view', 'membership.view']
    }
];

export const libraryUsers: LibraryUser[] = [
    {
        id: 'user-super',
        name: 'Super Admin',
        username: 'superadmin',
        email: 'superadmin@university.edu',
        phone: '+880 1700 000001',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        branchId: null,
        lastLogin: '2026-11-09T07:45:00.000Z',
        ...ts('2020-01-01T08:00:00.000Z')
    },
    {
        id: 'user-admin-main',
        name: 'Rafiqul Islam',
        username: 'librarian',
        email: 'rafiqul.islam@university.edu',
        phone: '+880 1700 000002',
        role: 'LIBRARY_ADMIN',
        status: 'ACTIVE',
        branchId: 'br-main',
        lastLogin: '2026-11-09T08:05:00.000Z',
        ...ts('2020-02-12T08:00:00.000Z')
    },
    {
        id: 'user-admin-eng',
        name: 'Shirin Akter',
        username: 'librarian.eng',
        email: 'shirin.akter@university.edu',
        phone: '+880 1700 000003',
        role: 'LIBRARY_ADMIN',
        status: 'ACTIVE',
        branchId: 'br-eng',
        lastLogin: '2026-11-08T16:30:00.000Z',
        ...ts('2021-04-05T08:00:00.000Z')
    },
    {
        id: 'user-admin-biz',
        name: 'Kamrul Hasan',
        username: 'librarian.biz',
        email: 'kamrul.hasan@university.edu',
        phone: '+880 1700 000004',
        role: 'LIBRARY_ADMIN',
        status: 'ACTIVE',
        branchId: 'br-biz',
        lastLogin: '2026-11-08T14:10:00.000Z',
        ...ts('2022-08-14T08:00:00.000Z')
    },
    {
        id: 'user-staff-main',
        name: 'Mehedi Hasan',
        username: 'staff',
        email: 'mehedi.hasan@university.edu',
        phone: '+880 1700 000005',
        role: 'LIBRARY_STAFF',
        status: 'ACTIVE',
        branchId: 'br-main',
        lastLogin: '2026-11-09T08:20:00.000Z',
        ...ts('2022-01-09T08:00:00.000Z')
    },
    {
        id: 'user-staff-eng',
        name: 'Sadia Islam',
        username: 'staff.eng',
        email: 'sadia.islam@university.edu',
        phone: '+880 1700 000006',
        role: 'LIBRARY_STAFF',
        status: 'ACTIVE',
        branchId: 'br-eng',
        lastLogin: '2026-11-07T11:15:00.000Z',
        ...ts('2022-03-18T08:00:00.000Z')
    },
    {
        id: 'user-staff-biz',
        name: 'Tanvir Ahmed',
        username: 'staff.biz',
        email: 'tanvir.ahmed@university.edu',
        phone: '+880 1700 000007',
        role: 'LIBRARY_STAFF',
        status: 'ACTIVE',
        branchId: 'br-biz',
        lastLogin: '2026-11-06T09:40:00.000Z',
        ...ts('2023-01-22T08:00:00.000Z')
    },
    {
        id: 'user-teacher',
        name: 'Dr. Ahsan Habib',
        username: 'teacher1',
        email: 'ahsan.habib@university.edu',
        phone: '+880 1700 000008',
        role: 'TEACHER',
        status: 'ACTIVE',
        branchId: 'br-main',
        lastLogin: '2026-11-08T10:25:00.000Z',
        ...ts('2021-05-30T08:00:00.000Z')
    },
    {
        id: 'user-student',
        name: 'Nusrat Jahan',
        username: 'student1',
        email: 'nusrat.jahan@student.university.edu',
        phone: '+880 1700 000009',
        role: 'STUDENT',
        status: 'ACTIVE',
        branchId: 'br-main',
        lastLogin: '2026-11-09T06:55:00.000Z',
        ...ts('2024-01-15T08:00:00.000Z')
    },
    {
        id: 'user-inactive',
        name: 'Rafi Ahmed',
        username: 'staff.rafi',
        email: 'rafi.ahmed@university.edu',
        phone: '+880 1700 000010',
        role: 'LIBRARY_STAFF',
        status: 'INACTIVE',
        branchId: 'br-sci',
        lastLogin: '2026-09-28T12:00:00.000Z',
        ...ts('2023-09-04T08:00:00.000Z')
    },
    {
        id: 'user-suspended',
        name: 'Sumaiya Akter',
        username: 'student.sumaiya',
        email: 'sumaiya.akter@student.university.edu',
        phone: '+880 1700 000011',
        role: 'STUDENT',
        status: 'SUSPENDED',
        branchId: 'br-main',
        lastLogin: '2026-10-11T13:20:00.000Z',
        ...ts('2024-02-20T08:00:00.000Z')
    }
];

export const libraryPolicies: LibraryPolicy[] = [
    {
        id: 'policy-student',
        memberType: 'STUDENT',
        borrowLimit: 4,
        loanPeriodDays: 14,
        renewalLimit: 2,
        renewalPeriodDays: 7,
        reservationLimit: 3,
        reservationHoldDays: 3,
        finePerDay: 5,
        maxFine: 500,
        gracePeriodDays: 1,
        lostBookCharge: 1200,
        damagedBookCharge: 400,
        ...ts('2024-01-01T08:00:00.000Z')
    },
    {
        id: 'policy-teacher',
        memberType: 'TEACHER',
        borrowLimit: 8,
        loanPeriodDays: 30,
        renewalLimit: 3,
        renewalPeriodDays: 14,
        reservationLimit: 5,
        reservationHoldDays: 5,
        finePerDay: 3,
        maxFine: 300,
        gracePeriodDays: 2,
        lostBookCharge: 1200,
        damagedBookCharge: 300,
        ...ts('2024-01-01T08:00:00.000Z')
    },
    {
        id: 'policy-staff',
        memberType: 'STAFF',
        borrowLimit: 6,
        loanPeriodDays: 21,
        renewalLimit: 2,
        renewalPeriodDays: 10,
        reservationLimit: 4,
        reservationHoldDays: 4,
        finePerDay: 4,
        maxFine: 400,
        gracePeriodDays: 1,
        lostBookCharge: 1200,
        damagedBookCharge: 350,
        ...ts('2024-01-01T08:00:00.000Z')
    }
];

export const branchMetrics: BranchMetric[] = [
    {
        id: 'metric-main',
        branchId: 'br-main',
        totalTitles: 42600,
        totalCopies: 58400,
        availableCopies: 47120,
        issuedCopies: 11280,
        overdueLoans: 486,
        totalMembers: 14820,
        activeLoans: 11280,
        reservations: 362,
        finesOutstanding: 58240,
        digitalResources: 12400
    },
    {
        id: 'metric-eng',
        branchId: 'br-eng',
        totalTitles: 16800,
        totalCopies: 22150,
        availableCopies: 17940,
        issuedCopies: 4210,
        overdueLoans: 172,
        totalMembers: 4860,
        activeLoans: 4210,
        reservations: 148,
        finesOutstanding: 21460,
        digitalResources: 6800
    },
    {
        id: 'metric-biz',
        branchId: 'br-biz',
        totalTitles: 12400,
        totalCopies: 16920,
        availableCopies: 14180,
        issuedCopies: 2740,
        overdueLoans: 118,
        totalMembers: 3620,
        activeLoans: 2740,
        reservations: 96,
        finesOutstanding: 14980,
        digitalResources: 4200
    },
    {
        id: 'metric-sci',
        branchId: 'br-sci',
        totalTitles: 6400,
        totalCopies: 8100,
        availableCopies: 7960,
        issuedCopies: 140,
        overdueLoans: 12,
        totalMembers: 980,
        activeLoans: 140,
        reservations: 8,
        finesOutstanding: 1860,
        digitalResources: 3100
    }
];

export const circulationTrend: CirculationTrendPoint[] = [
    { month: 'Jun 2026', issued: 6120, returned: 5960, overdue: 284 },
    { month: 'Jul 2026', issued: 6480, returned: 6310, overdue: 302 },
    { month: 'Aug 2026', issued: 7140, returned: 6890, overdue: 334 },
    { month: 'Sep 2026', issued: 7860, returned: 7580, overdue: 368 },
    { month: 'Oct 2026', issued: 8210, returned: 8020, overdue: 412 },
    { month: 'Nov 2026', issued: 7420, returned: 7280, overdue: 486 }
];

export const libraryAuditLogs: LibraryAuditLog[] = [
    {
        id: 'audit-001',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'user-super',
        detail: 'Signed in to the library administration portal.',
        branchId: null,
        ipAddress: '10.10.4.12',
        ...ts('2026-11-09T07:45:00.000Z')
    },
    {
        id: 'audit-002',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'POLICY',
        entity: 'Library Policy',
        entityId: 'policy-student',
        detail: 'Increased student renewal limit from 1 to 2 renewals.',
        branchId: null,
        ipAddress: '10.10.4.12',
        ...ts('2026-11-08T15:30:00.000Z')
    },
    {
        id: 'audit-003',
        actor: 'Rafiqul Islam',
        actorRole: 'LIBRARY_ADMIN',
        action: 'CREATE',
        entity: 'Library Account',
        entityId: 'user-staff-main',
        detail: 'Created circulation desk staff account for Mehedi Hasan.',
        branchId: 'br-main',
        ipAddress: '10.10.5.21',
        ...ts('2026-11-08T12:10:00.000Z')
    },
    {
        id: 'audit-004',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'STATUS',
        entity: 'Library Branch',
        entityId: 'br-sci',
        detail: 'Set Science & Research Annex to inactive pending renovation.',
        branchId: 'br-sci',
        ipAddress: '10.10.4.12',
        ...ts('2026-11-07T10:05:00.000Z')
    },
    {
        id: 'audit-005',
        actor: 'Shirin Akter',
        actorRole: 'LIBRARY_ADMIN',
        action: 'ROLE',
        entity: 'User Account',
        entityId: 'user-staff-eng',
        detail: 'Assigned Library Staff permissions to Sadia Islam.',
        branchId: 'br-eng',
        ipAddress: '10.10.6.18',
        ...ts('2026-11-06T16:40:00.000Z')
    },
    {
        id: 'audit-006',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'SETTINGS',
        entity: 'Library Settings',
        entityId: 'library-settings',
        detail: 'Enabled automated due-date reminders and reservation alerts.',
        branchId: null,
        ipAddress: '10.10.4.12',
        ...ts('2026-11-05T09:25:00.000Z')
    },
    {
        id: 'audit-007',
        actor: 'Kamrul Hasan',
        actorRole: 'LIBRARY_ADMIN',
        action: 'UPDATE',
        entity: 'Library Branch',
        entityId: 'br-biz',
        detail: 'Updated opening hours to 09:00 - 20:00 (Sat - Thu).',
        branchId: 'br-biz',
        ipAddress: '10.10.7.33',
        ...ts('2026-11-04T14:15:00.000Z')
    },
    {
        id: 'audit-008',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'ROLE',
        entity: 'Role Permissions',
        entityId: 'LIBRARY_ADMIN',
        detail: 'Granted fine waiver permission to the Library Admin role.',
        branchId: null,
        ipAddress: '10.10.4.12',
        ...ts('2026-11-03T11:50:00.000Z')
    },
    {
        id: 'audit-009',
        actor: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'CREATE',
        entity: 'Library Branch',
        entityId: 'br-sci',
        detail: 'Registered the Science & Research Annex branch.',
        branchId: 'br-sci',
        ipAddress: '10.10.4.12',
        ...ts('2026-10-30T08:20:00.000Z')
    },
    {
        id: 'audit-010',
        actor: 'Mehedi Hasan',
        actorRole: 'LIBRARY_STAFF',
        action: 'STATUS',
        entity: 'Member Account',
        entityId: 'user-suspended',
        detail: 'Suspended a student membership after three unresolved overdue loans.',
        branchId: 'br-main',
        ipAddress: '10.10.5.44',
        ...ts('2026-10-28T13:35:00.000Z')
    }
];

export const libraryEBooks: EBook[] = [
    {
        id: 'ebook-algorithms',
        title: 'Introduction to Algorithms and Data Structures',
        author: 'Dr. Farhana Islam',
        isbn: '978-984-33-1201-4',
        category: 'Computer Science',
        publisher: 'University Press',
        publishedYear: 2023,
        pages: 412,
        language: 'English',
        description: 'A practical introduction to algorithm analysis, sorting, searching, trees, graphs and dynamic programming for undergraduate students.',
        excerpt: 'Chapter 1 — Foundations\n\nAn algorithm is a finite sequence of well-defined instructions used to solve a problem. The efficiency of an algorithm is commonly expressed in terms of time and space complexity using asymptotic notation.\n\nThis open e-book covers arrays, linked lists, stacks, queues, trees, graphs, hashing, sorting and dynamic programming. Each chapter includes worked examples and review questions designed for a one-semester course.\n\nChapter 2 — Complexity\n\nBig-O notation describes an upper bound on growth. For example, binary search runs in O(log n) time on a sorted array, while a linear scan runs in O(n).',
        accessLevel: 'OPEN',
        status: 'PUBLISHED',
        downloadAllowed: true,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Super Admin',
        ...ts('2026-01-12T08:00:00.000Z')
    },
    {
        id: 'ebook-research',
        title: 'Research Methods for University Students',
        author: 'Prof. David Wilson',
        isbn: '978-984-33-1187-1',
        category: 'Research',
        publisher: 'Academic Press',
        publishedYear: 2022,
        pages: 286,
        language: 'English',
        description: 'Guidance on selecting research questions, reviewing literature, designing studies, collecting data and writing academic reports.',
        excerpt: 'Chapter 1 — Starting a Research Project\n\nA strong research project begins with a focused question. The question should be answerable, relevant and grounded in existing literature.\n\nChapter 2 — Literature Review\n\nA literature review is not a summary of everything written on a topic. It is a structured argument that identifies what is known, what is contested and where a new contribution can be made.\n\nChapter 3 — Research Design\n\nQuantitative, qualitative and mixed-method designs each answer different kinds of questions. Choose the design that best fits the evidence you need.',
        accessLevel: 'OPEN',
        status: 'PUBLISHED',
        downloadAllowed: true,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Super Admin',
        ...ts('2026-02-03T08:00:00.000Z')
    },
    {
        id: 'ebook-ml',
        title: 'Advanced Machine Learning: Selected Papers',
        author: 'Dr. Ahmed Karim',
        isbn: '978-984-33-1455-9',
        category: 'Computer Science',
        publisher: 'Graduate Studies Press',
        publishedYear: 2024,
        pages: 198,
        language: 'English',
        description: 'A restricted collection of advanced papers on deep learning, representation learning and model evaluation for graduate seminars.',
        excerpt: 'This restricted title contains advanced research papers prepared for graduate seminars. Access requires approval from the library administration.\n\nContents include representation learning, transformer architectures, evaluation methodology and reproducibility in machine learning research.',
        accessLevel: 'RESTRICTED',
        status: 'PUBLISHED',
        downloadAllowed: false,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Super Admin',
        ...ts('2026-03-10T08:00:00.000Z')
    },
    {
        id: 'ebook-accounting',
        title: 'Financial Accounting Fundamentals',
        author: 'Ayesha Siddiqua',
        isbn: '978-984-33-1302-8',
        category: 'Business',
        publisher: 'Business School Press',
        publishedYear: 2021,
        pages: 338,
        language: 'English',
        description: 'Core accounting concepts including journals, ledgers, trial balances, financial statements and cash-flow reporting.',
        excerpt: 'Chapter 1 — The Accounting Equation\n\nAssets = Liabilities + Equity. Every transaction affects at least two accounts, which keeps the accounting equation in balance.\n\nChapter 2 — Financial Statements\n\nThe income statement reports performance over a period. The balance sheet reports financial position at a point in time. The cash-flow statement explains changes in cash.',
        accessLevel: 'OPEN',
        status: 'PUBLISHED',
        downloadAllowed: true,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Rafiqul Islam',
        ...ts('2026-04-18T08:00:00.000Z')
    },
    {
        id: 'ebook-digital',
        title: 'Digital Libraries and Information Systems',
        author: 'Rafiqul Islam',
        isbn: '978-984-33-1520-6',
        category: 'Library Science',
        publisher: 'University Press',
        publishedYear: 2025,
        pages: 264,
        language: 'English',
        description: 'Designing paperless library services: metadata, digital repositories, access control, preservation and circulation workflows.',
        excerpt: 'Chapter 1 — From Paper to Pixels\n\nA digital library is more than a collection of files. It combines metadata, access policies, search, preservation and user services into one system.\n\nChapter 2 — Access Control\n\nRole-based permissions let libraries protect licensed and restricted material while keeping open educational resources available to the whole community.\n\nChapter 3 — Digital Preservation\n\nFormats age. A preservation plan includes format migration, checksums, redundant storage and documented retention rules.',
        accessLevel: 'RESTRICTED',
        status: 'PUBLISHED',
        downloadAllowed: false,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Super Admin',
        ...ts('2026-05-22T08:00:00.000Z')
    },
    {
        id: 'ebook-writing',
        title: 'Academic Writing Handbook',
        author: 'Dr. David Wilson',
        isbn: '978-984-33-1401-0',
        category: 'Language & Writing',
        publisher: 'Academic Press',
        publishedYear: 2020,
        pages: 154,
        language: 'English',
        description: 'A concise handbook on essay structure, citation, paraphrasing and revision for university coursework.',
        excerpt: 'This draft handbook is not yet published. It covers essay structure, paragraph development, citation styles and revision checklists.',
        accessLevel: 'OPEN',
        status: 'DRAFT',
        downloadAllowed: false,
        fileName: null,
        fileType: null,
        fileSize: 0,
        dataUrl: null,
        uploadedBy: 'Super Admin',
        ...ts('2026-06-01T08:00:00.000Z')
    }
];

export const libraryEBookRequests: EBookAccessRequest[] = [
    {
        id: 'req-001',
        ebookId: 'ebook-ml',
        username: 'teacher1',
        userName: 'Dr. Ahsan Habib',
        role: 'TEACHER',
        note: 'Preparing a graduate seminar on applied machine learning. I need the selected papers for the reading list.',
        status: 'PENDING',
        requestedAt: '2026-11-08T09:15:00.000Z',
        reviewedAt: null,
        reviewedBy: null,
        ...ts('2026-11-08T09:15:00.000Z')
    },
    {
        id: 'req-002',
        ebookId: 'ebook-digital',
        username: 'student1',
        userName: 'Nusrat Jahan',
        role: 'STUDENT',
        note: 'Required reading for my digital libraries coursework.',
        status: 'APPROVED',
        requestedAt: '2026-11-05T11:40:00.000Z',
        reviewedAt: '2026-11-06T08:20:00.000Z',
        reviewedBy: 'Super Admin',
        ...ts('2026-11-05T11:40:00.000Z')
    },
    {
        id: 'req-003',
        ebookId: 'ebook-ml',
        username: 'student.sumaiya',
        userName: 'Sumaiya Akter',
        role: 'STUDENT',
        note: 'Requesting access for a group project.',
        status: 'REJECTED',
        requestedAt: '2026-10-27T13:10:00.000Z',
        reviewedAt: '2026-10-28T09:00:00.000Z',
        reviewedBy: 'Super Admin',
        ...ts('2026-10-27T13:10:00.000Z')
    }
];

export const libraryBooks: Book[] = [
    { id: 'book-alg', isbn: '978-0-262-03384-8', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', publisher: 'MIT Press', publishedYear: 2022, language: 'English', description: 'Comprehensive coverage of algorithms, data structures and complexity analysis.', edition: '4th Edition', status: 'ACTIVE', ...ts('2024-01-15T08:00:00.000Z') },
    { id: 'book-db', isbn: '978-0-07-802215-9', title: 'Database System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', publisher: 'McGraw-Hill', publishedYear: 2020, language: 'English', description: 'Relational databases, SQL, transactions, storage and query processing.', edition: '7th Edition', status: 'ACTIVE', ...ts('2024-01-15T08:00:00.000Z') },
    { id: 'book-net', isbn: '978-0-13-359475-9', title: 'Computer Networking: A Top-Down Approach', author: 'James Kurose', category: 'Computer Science', publisher: 'Pearson', publishedYear: 2021, language: 'English', description: 'Protocols, network architecture and internetworking from the application layer down.', edition: '8th Edition', status: 'ACTIVE', ...ts('2024-02-01T08:00:00.000Z') },
    { id: 'book-se', isbn: '978-0-13-468599-9', title: 'Software Engineering', author: 'Ian Sommerville', category: 'Computer Science', publisher: 'Pearson', publishedYear: 2019, language: 'English', description: 'Software processes, requirements, architecture, testing and project management.', edition: '10th Edition', status: 'ACTIVE', ...ts('2024-02-01T08:00:00.000Z') },
    { id: 'book-ml', isbn: '978-0-13-468641-5', title: 'Machine Learning Fundamentals', author: 'Aurélien Géron', category: 'Computer Science', publisher: 'O Reilly', publishedYear: 2023, language: 'English', description: 'Hands-on introduction to supervised learning, model evaluation and neural networks.', edition: '2nd Edition', status: 'ACTIVE', ...ts('2024-03-10T08:00:00.000Z') },
    { id: 'book-acc', isbn: '978-1-119-78424-5', title: 'Financial Accounting Fundamentals', author: 'Ayesha Siddiqua', category: 'Business', publisher: 'Business School Press', publishedYear: 2021, language: 'English', description: 'Accounting cycle, financial statements and reporting for managers.', edition: '3rd Edition', status: 'ACTIVE', ...ts('2024-03-10T08:00:00.000Z') },
    { id: 'book-mkt', isbn: '978-0-13-489511-4', title: 'Marketing Management', author: 'Philip Kotler', category: 'Business', publisher: 'Pearson', publishedYear: 2022, language: 'English', description: 'Market analysis, segmentation, branding and integrated marketing strategy.', edition: '16th Edition', status: 'ACTIVE', ...ts('2024-04-05T08:00:00.000Z') },
    { id: 'book-eco', isbn: '978-0-07-337575-1', title: 'Principles of Microeconomics', author: 'N. Gregory Mankiw', category: 'Economics', publisher: 'Cengage', publishedYear: 2020, language: 'English', description: 'Supply and demand, market structures, welfare and public policy.', edition: '9th Edition', status: 'ACTIVE', ...ts('2024-04-05T08:00:00.000Z') },
    { id: 'book-eng', isbn: '978-0-19-880389-3', title: 'Academic Writing: A Handbook for Students', author: 'Stephen Bailey', category: 'Language & Writing', publisher: 'Routledge', publishedYear: 2019, language: 'English', description: 'Essay structure, citation, argumentation and revision for university writing.', edition: '5th Edition', status: 'ACTIVE', ...ts('2024-05-12T08:00:00.000Z') },
    { id: 'book-mat', isbn: '978-0-13-499145-8', title: 'Calculus: Early Transcendentals', author: 'James Stewart', category: 'Science', publisher: 'Cengage', publishedYear: 2020, language: 'English', description: 'Limits, derivatives, integrals and applications for first-year calculus.', edition: '9th Edition', status: 'ACTIVE', ...ts('2024-05-12T08:00:00.000Z') },
    { id: 'book-eee', isbn: '978-0-13-474335-0', title: 'Electrical Engineering: Principles and Applications', author: 'Allan R. Hambley', category: 'Engineering', publisher: 'Pearson', publishedYear: 2018, language: 'English', description: 'Circuits, electronics, power systems and digital logic fundamentals.', edition: '7th Edition', status: 'ACTIVE', ...ts('2024-06-01T08:00:00.000Z') },
    { id: 'book-lib', isbn: '978-1-78330-452-1', title: 'Digital Libraries and Information Systems', author: 'Rafiqul Islam', category: 'Library Science', publisher: 'University Press', publishedYear: 2025, language: 'English', description: 'Metadata, repositories, access control, preservation and paperless circulation.', edition: '1st Edition', status: 'ACTIVE', ...ts('2026-05-22T08:00:00.000Z') }
];

export const libraryBookCopies: BookCopy[] = [
    { id: 'copy-alg-001', bookId: 'book-alg', branchId: 'br-main', barcode: 'PUL-ALG-0001', shelfLocation: 'A-201 / CS-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-01-20T08:00:00.000Z') },
    { id: 'copy-alg-002', bookId: 'book-alg', branchId: 'br-main', barcode: 'PUL-ALG-0002', shelfLocation: 'A-201 / CS-01', condition: 'GOOD', status: 'ISSUED', ...ts('2024-01-20T08:00:00.000Z') },
    { id: 'copy-alg-003', bookId: 'book-alg', branchId: 'br-eng', barcode: 'PUL-ALG-0003', shelfLocation: 'C-204 / CS-01', condition: 'FAIR', status: 'AVAILABLE', ...ts('2024-01-20T08:00:00.000Z') },
    { id: 'copy-db-001', bookId: 'book-db', branchId: 'br-main', barcode: 'PUL-DB-0001', shelfLocation: 'A-202 / CS-02', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-02-02T08:00:00.000Z') },
    { id: 'copy-db-002', bookId: 'book-db', branchId: 'br-main', barcode: 'PUL-DB-0002', shelfLocation: 'A-202 / CS-02', condition: 'GOOD', status: 'ISSUED', ...ts('2024-02-02T08:00:00.000Z') },
    { id: 'copy-net-001', bookId: 'book-net', branchId: 'br-eng', barcode: 'PUL-NET-0001', shelfLocation: 'C-205 / CS-03', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-02-10T08:00:00.000Z') },
    { id: 'copy-net-002', bookId: 'book-net', branchId: 'br-eng', barcode: 'PUL-NET-0002', shelfLocation: 'C-205 / CS-03', condition: 'GOOD', status: 'RESERVED', ...ts('2024-02-10T08:00:00.000Z') },
    { id: 'copy-se-001', bookId: 'book-se', branchId: 'br-main', barcode: 'PUL-SE-0001', shelfLocation: 'A-203 / CS-04', condition: 'FAIR', status: 'ISSUED', ...ts('2024-02-15T08:00:00.000Z') },
    { id: 'copy-se-002', bookId: 'book-se', branchId: 'br-main', barcode: 'PUL-SE-0002', shelfLocation: 'A-203 / CS-04', condition: 'DAMAGED', status: 'DAMAGED', ...ts('2024-02-15T08:00:00.000Z') },
    { id: 'copy-ml-001', bookId: 'book-ml', branchId: 'br-eng', barcode: 'PUL-ML-0001', shelfLocation: 'C-301 / CS-05', condition: 'GOOD', status: 'ISSUED', ...ts('2024-03-15T08:00:00.000Z') },
    { id: 'copy-ml-002', bookId: 'book-ml', branchId: 'br-main', barcode: 'PUL-ML-0002', shelfLocation: 'A-204 / CS-05', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-03-15T08:00:00.000Z') },
    { id: 'copy-acc-001', bookId: 'book-acc', branchId: 'br-biz', barcode: 'PUL-ACC-0001', shelfLocation: 'B-101 / BUS-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-03-18T08:00:00.000Z') },
    { id: 'copy-acc-002', bookId: 'book-acc', branchId: 'br-biz', barcode: 'PUL-ACC-0002', shelfLocation: 'B-101 / BUS-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-03-18T08:00:00.000Z') },
    { id: 'copy-mkt-001', bookId: 'book-mkt', branchId: 'br-biz', barcode: 'PUL-MKT-0001', shelfLocation: 'B-102 / BUS-02', condition: 'FAIR', status: 'ISSUED', ...ts('2024-04-08T08:00:00.000Z') },
    { id: 'copy-eco-001', bookId: 'book-eco', branchId: 'br-biz', barcode: 'PUL-ECO-0001', shelfLocation: 'B-103 / ECO-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-04-08T08:00:00.000Z') },
    { id: 'copy-eng-001', bookId: 'book-eng', branchId: 'br-main', barcode: 'PUL-ENG-0001', shelfLocation: 'D-101 / ENG-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-05-15T08:00:00.000Z') },
    { id: 'copy-mat-001', bookId: 'book-mat', branchId: 'br-main', barcode: 'PUL-MAT-0001', shelfLocation: 'A-101 / MAT-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2024-05-15T08:00:00.000Z') },
    { id: 'copy-eee-001', bookId: 'book-eee', branchId: 'br-eng', barcode: 'PUL-EEE-0001', shelfLocation: 'C-102 / EEE-01', condition: 'FAIR', status: 'LOST', ...ts('2024-06-05T08:00:00.000Z') },
    { id: 'copy-lib-001', bookId: 'book-lib', branchId: 'br-main', barcode: 'PUL-LIB-0001', shelfLocation: 'A-301 / LIS-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2026-05-25T08:00:00.000Z') },
    { id: 'copy-lib-002', bookId: 'book-lib', branchId: 'br-main', barcode: 'PUL-LIB-0002', shelfLocation: 'A-301 / LIS-01', condition: 'GOOD', status: 'AVAILABLE', ...ts('2026-05-25T08:00:00.000Z') }
];

export const libraryMembers: LibraryMember[] = [
    { id: 'mem-001', membershipNo: 'PUL-STU-2024-001', firstName: 'Nusrat', lastName: 'Jahan', email: 'nusrat.jahan@student.university.edu', phone: '+880 1700 000009', memberType: 'STUDENT', branchId: 'br-main', department: 'Computer Science & Engineering', status: 'ACTIVE', joinedAt: '2024-01-15', expiresAt: '2027-01-14', ...ts('2024-01-15T08:00:00.000Z') },
    { id: 'mem-002', membershipNo: 'PUL-STU-2023-014', firstName: 'Arif', lastName: 'Hossain', email: 'arif.hossain@student.university.edu', phone: '+880 1700 000012', memberType: 'STUDENT', branchId: 'br-main', department: 'Computer Science & Engineering', status: 'ACTIVE', joinedAt: '2023-08-10', expiresAt: '2026-08-09', ...ts('2023-08-10T08:00:00.000Z') },
    { id: 'mem-003', membershipNo: 'PUL-TEA-2021-008', firstName: 'Dr. Ahsan', lastName: 'Habib', email: 'ahsan.habib@university.edu', phone: '+880 1700 000008', memberType: 'TEACHER', branchId: 'br-main', department: 'Computer Science & Engineering', status: 'ACTIVE', joinedAt: '2021-05-30', expiresAt: '2027-05-29', ...ts('2021-05-30T08:00:00.000Z') },
    { id: 'mem-004', membershipNo: 'PUL-TEA-2019-003', firstName: 'Dr. Farhana', lastName: 'Islam', email: 'farhana.islam@university.edu', phone: '+880 1700 000013', memberType: 'TEACHER', branchId: 'br-eng', department: 'Computer Science & Engineering', status: 'ACTIVE', joinedAt: '2019-03-15', expiresAt: '2027-03-14', ...ts('2019-03-15T08:00:00.000Z') },
    { id: 'mem-005', membershipNo: 'PUL-STF-2021-002', firstName: 'Rafiqul', lastName: 'Islam', email: 'rafiqul.islam@university.edu', phone: '+880 1700 000002', memberType: 'STAFF', branchId: 'br-main', department: 'Library Administration', status: 'ACTIVE', joinedAt: '2021-02-12', expiresAt: '2027-02-11', ...ts('2021-02-12T08:00:00.000Z') },
    { id: 'mem-006', membershipNo: 'PUL-STU-2024-021', firstName: 'Sumaiya', lastName: 'Akter', email: 'sumaiya.akter@student.university.edu', phone: '+880 1700 000011', memberType: 'STUDENT', branchId: 'br-main', department: 'Business Administration', status: 'SUSPENDED', joinedAt: '2024-02-20', expiresAt: '2027-02-19', ...ts('2024-02-20T08:00:00.000Z') },
    { id: 'mem-007', membershipNo: 'PUL-STU-2023-027', firstName: 'Tanvir', lastName: 'Ahmed', email: 'tanvir.ahmed@student.university.edu', phone: '+880 1700 000014', memberType: 'STUDENT', branchId: 'br-eng', department: 'Electrical & Electronic Engineering', status: 'ACTIVE', joinedAt: '2023-08-14', expiresAt: '2026-08-13', ...ts('2023-08-14T08:00:00.000Z') },
    { id: 'mem-008', membershipNo: 'PUL-STF-2022-006', firstName: 'Shirin', lastName: 'Akter', email: 'shirin.akter@university.edu', phone: '+880 1700 000003', memberType: 'STAFF', branchId: 'br-eng', department: 'Library Administration', status: 'ACTIVE', joinedAt: '2022-04-05', expiresAt: '2028-04-04', ...ts('2022-04-05T08:00:00.000Z') },
    { id: 'mem-009', membershipNo: 'PUL-STU-2022-019', firstName: 'Fahim', lastName: 'Rahman', email: 'fahim.rahman@student.university.edu', phone: '+880 1700 000015', memberType: 'STUDENT', branchId: 'br-biz', department: 'Business Administration', status: 'EXPIRED', joinedAt: '2022-08-12', expiresAt: '2025-08-11', ...ts('2022-08-12T08:00:00.000Z') },
    { id: 'mem-010', membershipNo: 'PUL-TEA-2019-007', firstName: 'Ayesha', lastName: 'Siddiqua', email: 'ayesha.siddiqua@university.edu', phone: '+880 1700 000016', memberType: 'TEACHER', branchId: 'br-biz', department: 'Business Administration', status: 'ACTIVE', joinedAt: '2019-07-12', expiresAt: '2027-07-11', ...ts('2019-07-12T08:00:00.000Z') },
    { id: 'mem-011', membershipNo: 'PUL-STF-2022-005', firstName: 'Mehedi', lastName: 'Hasan', email: 'mehedi.hasan@university.edu', phone: '+880 1700 000005', memberType: 'STAFF', branchId: 'br-main', department: 'Circulation Desk', status: 'ACTIVE', joinedAt: '2022-01-09', expiresAt: '2028-01-08', ...ts('2022-01-09T08:00:00.000Z') },
    { id: 'mem-012', membershipNo: 'PUL-STU-2025-040', firstName: 'Nabila', lastName: 'Hossain', email: 'nabila.hossain@student.university.edu', phone: '+880 1700 000017', memberType: 'STUDENT', branchId: 'br-main', department: 'Computer Science & Engineering', status: 'PENDING', joinedAt: '2025-08-12', expiresAt: '2028-08-11', ...ts('2025-08-12T08:00:00.000Z') }
];

export const libraryLoans: Loan[] = [
    { id: 'loan-001', copyId: 'copy-alg-002', bookId: 'book-alg', memberId: 'mem-001', branchId: 'br-main', issuedAt: '2026-10-28T10:00:00.000Z', dueAt: '2026-11-11T10:00:00.000Z', returnedAt: null, renewalCount: 0, status: 'ACTIVE', issuedBy: 'Mehedi Hasan', notes: '', ...ts('2026-10-28T10:00:00.000Z') },
    { id: 'loan-002', copyId: 'copy-db-002', bookId: 'book-db', memberId: 'mem-002', branchId: 'br-main', issuedAt: '2026-10-29T11:30:00.000Z', dueAt: '2026-11-12T11:30:00.000Z', returnedAt: null, renewalCount: 1, status: 'ACTIVE', issuedBy: 'Mehedi Hasan', notes: '', ...ts('2026-10-29T11:30:00.000Z') },
    { id: 'loan-003', copyId: 'copy-ml-001', bookId: 'book-ml', memberId: 'mem-003', branchId: 'br-eng', issuedAt: '2026-10-16T09:00:00.000Z', dueAt: '2026-11-15T09:00:00.000Z', returnedAt: null, renewalCount: 0, status: 'ACTIVE', issuedBy: 'Sadia Islam', notes: 'Graduate seminar reserve.', ...ts('2026-10-16T09:00:00.000Z') },
    { id: 'loan-004', copyId: 'copy-mkt-001', bookId: 'book-mkt', memberId: 'mem-010', branchId: 'br-biz', issuedAt: '2026-10-09T14:00:00.000Z', dueAt: '2026-11-06T14:00:00.000Z', returnedAt: null, renewalCount: 0, status: 'OVERDUE', issuedBy: 'Tanvir Ahmed', notes: '', ...ts('2026-10-09T14:00:00.000Z') },
    { id: 'loan-005', copyId: 'copy-se-001', bookId: 'book-se', memberId: 'mem-007', branchId: 'br-main', issuedAt: '2026-10-02T10:00:00.000Z', dueAt: '2026-10-30T10:00:00.000Z', returnedAt: null, renewalCount: 0, status: 'OVERDUE', issuedBy: 'Mehedi Hasan', notes: '', ...ts('2026-10-02T10:00:00.000Z') },
    { id: 'loan-006', copyId: 'copy-eco-001', bookId: 'book-eco', memberId: 'mem-005', branchId: 'br-biz', issuedAt: '2026-10-01T10:00:00.000Z', dueAt: '2026-10-22T10:00:00.000Z', returnedAt: '2026-10-15T10:00:00.000Z', renewalCount: 0, status: 'RETURNED', issuedBy: 'Tanvir Ahmed', notes: '', ...ts('2026-10-01T10:00:00.000Z') }
];

export const libraryReservations: Reservation[] = [
    { id: 'res-001', bookId: 'book-net', memberId: 'mem-001', branchId: 'br-eng', status: 'PENDING', requestedAt: '2026-11-08T09:30:00.000Z', readyAt: null, expiresAt: null, notes: 'Waiting for the reserved copy to be returned.', ...ts('2026-11-08T09:30:00.000Z') },
    { id: 'res-002', bookId: 'book-alg', memberId: 'mem-012', branchId: 'br-main', status: 'PENDING', requestedAt: '2026-11-08T13:10:00.000Z', readyAt: null, expiresAt: null, notes: '', ...ts('2026-11-08T13:10:00.000Z') },
    { id: 'res-003', bookId: 'book-db', memberId: 'mem-004', branchId: 'br-main', status: 'READY', requestedAt: '2026-11-04T10:20:00.000Z', readyAt: '2026-11-09T08:00:00.000Z', expiresAt: '2026-11-12T08:00:00.000Z', notes: 'Hold at main circulation desk.', ...ts('2026-11-04T10:20:00.000Z') },
    { id: 'res-004', bookId: 'book-mkt', memberId: 'mem-006', branchId: 'br-biz', status: 'CANCELLED', requestedAt: '2026-10-20T12:00:00.000Z', readyAt: null, expiresAt: null, notes: 'Cancelled by member.', ...ts('2026-10-20T12:00:00.000Z') }
];

export const libraryBorrowRequests: BorrowRequest[] = [
    { id: 'brq-001', bookId: 'book-net', memberId: 'mem-007', branchId: 'br-eng', status: 'PENDING', requestedAt: '2026-11-08T15:20:00.000Z', reviewedAt: null, reviewedBy: null, notes: 'Needed for a networking assignment.', ...ts('2026-11-08T15:20:00.000Z') },
    { id: 'brq-002', bookId: 'book-ml', memberId: 'mem-002', branchId: 'br-main', status: 'PENDING', requestedAt: '2026-11-09T07:10:00.000Z', reviewedAt: null, reviewedBy: null, notes: '', ...ts('2026-11-09T07:10:00.000Z') },
    { id: 'brq-003', bookId: 'book-lib', memberId: 'mem-003', branchId: 'br-main', status: 'APPROVED', requestedAt: '2026-11-06T09:00:00.000Z', reviewedAt: '2026-11-06T10:00:00.000Z', reviewedBy: 'Rafiqul Islam', notes: '', ...ts('2026-11-06T09:00:00.000Z') },
    { id: 'brq-004', bookId: 'book-acc', memberId: 'mem-012', branchId: 'br-main', status: 'REJECTED', requestedAt: '2026-11-05T11:00:00.000Z', reviewedAt: '2026-11-05T12:00:00.000Z', reviewedBy: 'Rafiqul Islam', notes: 'Membership pending verification.', ...ts('2026-11-05T11:00:00.000Z') }
];

export const libraryRenewalRequests: RenewalRequest[] = [
    { id: 'rr-001', loanId: 'loan-001', memberId: 'mem-001', status: 'PENDING', requestedAt: '2026-11-08T10:00:00.000Z', reviewedAt: null, reviewedBy: null, notes: 'Course project still in progress.', ...ts('2026-11-08T10:00:00.000Z') },
    { id: 'rr-002', loanId: 'loan-002', memberId: 'mem-002', status: 'APPROVED', requestedAt: '2026-11-05T09:00:00.000Z', reviewedAt: '2026-11-05T09:30:00.000Z', reviewedBy: 'Rafiqul Islam', notes: '', ...ts('2026-11-05T09:00:00.000Z') },
    { id: 'rr-003', loanId: 'loan-004', memberId: 'mem-010', status: 'PENDING', requestedAt: '2026-11-07T16:00:00.000Z', reviewedAt: null, reviewedBy: null, notes: 'Requesting one extension.', ...ts('2026-11-07T16:00:00.000Z') }
];

export const libraryFines: FineRecord[] = [
    { id: 'fine-001', memberId: 'mem-010', loanId: 'loan-004', amount: 40, reason: 'Overdue loan — Marketing Management', status: 'UNPAID', issuedAt: '2026-11-07T08:00:00.000Z', settledAt: null, settledBy: null, note: '', ...ts('2026-11-07T08:00:00.000Z') },
    { id: 'fine-002', memberId: 'mem-007', loanId: 'loan-005', amount: 25, reason: 'Overdue loan — Software Engineering', status: 'UNPAID', issuedAt: '2026-11-01T08:00:00.000Z', settledAt: null, settledBy: null, note: '', ...ts('2026-11-01T08:00:00.000Z') },
    { id: 'fine-003', memberId: 'mem-006', loanId: null, amount: 120, reason: 'Damaged book charge', status: 'UNPAID', issuedAt: '2026-10-25T10:00:00.000Z', settledAt: null, settledBy: null, note: 'Water damage reported at return.', ...ts('2026-10-25T10:00:00.000Z') },
    { id: 'fine-004', memberId: 'mem-005', loanId: 'loan-006', amount: 20, reason: 'Late return processing fee', status: 'PAID', issuedAt: '2026-10-16T09:00:00.000Z', settledAt: '2026-10-17T09:30:00.000Z', settledBy: 'Rafiqul Islam', note: 'Paid in cash.', ...ts('2026-10-16T09:00:00.000Z') },
    { id: 'fine-005', memberId: 'mem-001', loanId: null, amount: 15, reason: 'Reservation no-show', status: 'WAIVED', issuedAt: '2026-10-10T09:00:00.000Z', settledAt: '2026-10-11T09:00:00.000Z', settledBy: 'Rafiqul Islam', note: 'First-time waiver.', ...ts('2026-10-10T09:00:00.000Z') }
];

export const libraryAcquisitions: AcquisitionRequest[] = [
    { id: 'acq-001', title: 'Deep Learning', author: 'Ian Goodfellow', isbn: '978-0-262-03561-3', branchId: 'br-eng', requestedBy: 'Dr. Ahsan Habib', estimatedCost: 4500, status: 'PENDING', requestedAt: '2026-11-07T09:00:00.000Z', reviewedAt: null, reviewedBy: null, notes: 'Recommended for the graduate ML seminar.', ...ts('2026-11-07T09:00:00.000Z') },
    { id: 'acq-002', title: 'Clean Architecture', author: 'Robert C. Martin', isbn: '978-0-13-449416-6', branchId: 'br-main', requestedBy: 'Arif Hossain', estimatedCost: 2800, status: 'APPROVED', requestedAt: '2026-11-04T10:00:00.000Z', reviewedAt: '2026-11-05T10:00:00.000Z', reviewedBy: 'Rafiqul Islam', notes: '', ...ts('2026-11-04T10:00:00.000Z') },
    { id: 'acq-003', title: 'Modern Library Management', author: 'Sarah Khan', isbn: '978-1-234-56789-0', branchId: 'br-main', requestedBy: 'Rafiqul Islam', estimatedCost: 3200, status: 'ORDERED', requestedAt: '2026-10-28T11:00:00.000Z', reviewedAt: '2026-10-29T11:00:00.000Z', reviewedBy: 'Super Admin', notes: 'Order placed with University Press.', ...ts('2026-10-28T11:00:00.000Z') },
    { id: 'acq-004', title: 'Advanced Econometrics', author: 'William Greene', isbn: '978-0-13-513245-6', branchId: 'br-biz', requestedBy: 'Ayesha Siddiqua', estimatedCost: 5200, status: 'RECEIVED', requestedAt: '2026-10-10T09:00:00.000Z', reviewedAt: '2026-10-12T09:00:00.000Z', reviewedBy: 'Super Admin', notes: 'Received and catalogued.', ...ts('2026-10-10T09:00:00.000Z') },
    { id: 'acq-005', title: 'Data Visualization Handbook', author: 'Claus Wilke', isbn: '978-0-13-468-5999', branchId: 'br-main', requestedBy: 'Nusrat Jahan', estimatedCost: 3600, status: 'REJECTED', requestedAt: '2026-10-20T13:00:00.000Z', reviewedAt: '2026-10-22T13:00:00.000Z', reviewedBy: 'Rafiqul Islam', notes: 'Duplicate title already on order.', ...ts('2026-10-20T13:00:00.000Z') }
];

export const libraryInventoryRecords: InventoryRecord[] = [
    { id: 'inv-001', copyId: 'copy-eee-001', bookId: 'book-eee', branchId: 'br-eng', status: 'MISSING', checkedAt: '2026-11-06T09:00:00.000Z', checkedBy: 'Sadia Islam', notes: 'Not found on shelf during stock verification.', ...ts('2026-11-06T09:00:00.000Z') },
    { id: 'inv-002', copyId: 'copy-se-002', bookId: 'book-se', branchId: 'br-main', status: 'DAMAGED', checkedAt: '2026-11-05T10:00:00.000Z', checkedBy: 'Mehedi Hasan', notes: 'Torn cover and loose pages.', ...ts('2026-11-05T10:00:00.000Z') },
    { id: 'inv-003', copyId: 'copy-alg-001', bookId: 'book-alg', branchId: 'br-main', status: 'VERIFIED', checkedAt: '2026-11-04T11:00:00.000Z', checkedBy: 'Mehedi Hasan', notes: '', ...ts('2026-11-04T11:00:00.000Z') },
    { id: 'inv-004', copyId: 'copy-lib-001', bookId: 'book-lib', branchId: 'br-main', status: 'ADJUSTED', checkedAt: '2026-11-03T12:00:00.000Z', checkedBy: 'Rafiqul Islam', notes: 'Shelf location corrected to A-301 / LIS-01.', ...ts('2026-11-03T12:00:00.000Z') }
];

export const libraryAnnouncements: Announcement[] = [
    { id: 'ann-001', title: 'New computer science arrivals', message: 'Twelve new computer science titles are now available at the Main Campus and Engineering branch libraries.', audience: 'ALL', branchId: null, channel: 'ALL', status: 'SENT', sentAt: '2026-11-08T09:00:00.000Z', sentBy: 'Rafiqul Islam', ...ts('2026-11-08T09:00:00.000Z') },
    { id: 'ann-002', title: 'Overdue loan reminder', message: 'You have one or more overdue library loans. Please return them or renew online to avoid additional fines.', audience: 'STUDENT', branchId: null, channel: 'EMAIL', status: 'SENT', sentAt: '2026-11-07T08:00:00.000Z', sentBy: 'Rafiqul Islam', ...ts('2026-11-07T08:00:00.000Z') },
    { id: 'ann-003', title: 'Extended opening hours', message: 'All active branch libraries will remain open until 22:00 during the examination period.', audience: 'ALL', branchId: null, channel: 'IN_APP', status: 'SENT', sentAt: '2026-11-05T10:00:00.000Z', sentBy: 'Rafiqul Islam', ...ts('2026-11-05T10:00:00.000Z') },
    { id: 'ann-004', title: 'Semester break schedule', message: 'Draft announcement for the upcoming semester break opening hours.', audience: 'ALL', branchId: null, channel: 'ALL', status: 'DRAFT', sentAt: null, sentBy: 'Rafiqul Islam', ...ts('2026-11-09T08:00:00.000Z') }
];

export const librarySettings: LibrarySettings = {
    libraryName: 'Paperless University Library',
    shortName: 'PUL',
    contactEmail: 'library@university.edu',
    contactPhone: '+880 9612 100000',
    address: 'University Central Campus, Library Avenue',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    fineCalculation: 'DAILY',
    autoApproveReservations: true,
    autoRenewals: false,
    emailNotifications: true,
    smsNotifications: true,
    qrCodePrefix: 'PUL',
    ...ts('2024-01-01T08:00:00.000Z')
};

export const librarySeedData = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    branches: libraryBranches,
    users: libraryUsers,
    roles: libraryRoles,
    policies: libraryPolicies,
    branchMetrics,
    circulationTrend,
    ebooks: libraryEBooks,
    ebookRequests: libraryEBookRequests,
    books: libraryBooks,
    bookCopies: libraryBookCopies,
    members: libraryMembers,
    loans: libraryLoans,
    reservations: libraryReservations,
    borrowRequests: libraryBorrowRequests,
    renewalRequests: libraryRenewalRequests,
    fines: libraryFines,
    acquisitions: libraryAcquisitions,
    inventoryRecords: libraryInventoryRecords,
    announcements: libraryAnnouncements,
    auditLogs: libraryAuditLogs,
    settings: librarySettings
};
