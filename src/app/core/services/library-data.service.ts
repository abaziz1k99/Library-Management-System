import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
    AcquisitionRequest,
    AcquisitionStatus,
    Announcement,
    AnnouncementAudience,
    AuditAction,
    Book,
    BookCopy,
    BorrowRequest,
    BorrowRequestStatus,
    BranchMetric,
    CopyStatus,
    EBook,
    EBookAccessRequest,
    EBookStatus,
    FineRecord,
    FineStatus,
    InventoryRecord,
    InventoryStatus,
    LibraryAuditLog,
    LibraryBranch,
    LibraryMember,
    LibraryPolicy,
    LibraryRole,
    LibrarySettings,
    LibraryStore,
    LibraryUser,
    Loan,
    MemberStatus,
    MemberType,
    RenewalRequest,
    RenewalRequestStatus,
    Reservation,
    ReservationStatus,
    RoleDefinition
} from '@/app/core/models/library.models';
import {
    LIBRARY_SCHEMA_VERSION as schemaVersion,
    branchMetrics as seedBranchMetrics,
    circulationTrend as seedCirculationTrend,
    libraryAcquisitions as seedAcquisitions,
    libraryAnnouncements as seedAnnouncements,
    libraryAuditLogs as seedAuditLogs,
    libraryBookCopies as seedBookCopies,
    libraryBooks as seedBooks,
    libraryBorrowRequests as seedBorrowRequests,
    libraryBranches as seedBranches,
    libraryEBookRequests as seedEBookRequests,
    libraryEBooks as seedEBooks,
    libraryFines as seedFines,
    libraryInventoryRecords as seedInventoryRecords,
    libraryLoans as seedLoans,
    libraryMembers as seedMembers,
    libraryPolicies as seedPolicies,
    libraryRenewalRequests as seedRenewalRequests,
    libraryReservations as seedReservations,
    libraryRoles as seedRoles,
    librarySettings as seedSettings,
    libraryUsers as seedUsers
} from '@/app/core/data/library-seed';
import { StorageService } from '@/app/core/services/storage.service';
import { AuthService } from '@/app/core/services/auth.service';

const STORAGE_KEY = 'library.v1';

function emptyMetric(branchId: string): BranchMetric {
    return {
        id: `metric-${branchId}`,
        branchId,
        totalTitles: 0,
        totalCopies: 0,
        availableCopies: 0,
        issuedCopies: 0,
        overdueLoans: 0,
        totalMembers: 0,
        activeLoans: 0,
        reservations: 0,
        finesOutstanding: 0,
        digitalResources: 0
    };
}

@Injectable({
    providedIn: 'root'
})
export class LibraryDataService {
    private readonly storage = inject(StorageService);
    private readonly auth = inject(AuthService);

    private readonly _store = signal<LibraryStore>(this.initStore());

    readonly store = this._store.asReadonly();

    readonly branches = computed(() => this._store().branches);
    readonly users = computed(() => this._store().users);
    readonly roles = computed(() => this._store().roles);
    readonly policies = computed(() => this._store().policies);
    readonly branchMetrics = computed(() => this._store().branchMetrics);
    readonly circulationTrend = computed(() => this._store().circulationTrend);
    readonly ebooks = computed(() => this._store().ebooks);
    readonly ebookRequests = computed(() => this._store().ebookRequests);
    readonly auditLogs = computed(() => this._store().auditLogs);
    readonly settings = computed(() => this._store().settings);

    readonly activeBranches = computed(() => this.branches().filter((branch) => branch.status === 'ACTIVE'));
    readonly publishedEBooks = computed(() => this.ebooks().filter((book) => book.status === 'PUBLISHED'));
    readonly pendingEBookRequests = computed(() => this.ebookRequests().filter((request) => request.status === 'PENDING'));

    readonly books = computed(() => this._store().books);
    readonly bookCopies = computed(() => this._store().bookCopies);
    readonly members = computed(() => this._store().members);
    readonly loans = computed(() => this._store().loans);
    readonly reservations = computed(() => this._store().reservations);
    readonly borrowRequests = computed(() => this._store().borrowRequests);
    readonly renewalRequests = computed(() => this._store().renewalRequests);
    readonly fines = computed(() => this._store().fines);
    readonly acquisitions = computed(() => this._store().acquisitions);
    readonly inventoryRecords = computed(() => this._store().inventoryRecords);
    readonly announcements = computed(() => this._store().announcements);

    readonly activeLoans = computed(() => this.loans().filter((loan) => loan.status === 'ACTIVE' || loan.status === 'OVERDUE'));
    readonly overdueLoans = computed(() => this.loans().filter((loan) => loan.status === 'OVERDUE' || (!loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now())));
    readonly pendingBorrowRequests = computed(() => this.borrowRequests().filter((request) => request.status === 'PENDING'));
    readonly pendingRenewalRequests = computed(() => this.renewalRequests().filter((request) => request.status === 'PENDING'));
    readonly pendingReservations = computed(() => this.reservations().filter((reservation) => reservation.status === 'PENDING' || reservation.status === 'READY'));
    readonly unpaidFines = computed(() => this.fines().filter((fine) => fine.status === 'UNPAID'));
    readonly pendingAcquisitions = computed(() => this.acquisitions().filter((request) => request.status === 'PENDING'));
    readonly openInventoryIssues = computed(() => {
        const latest = new Map<string, InventoryRecord>();
        for (const record of this.inventoryRecords()) {
            const current = latest.get(record.copyId);
            if (!current || new Date(record.checkedAt).getTime() > new Date(current.checkedAt).getTime()) {
                latest.set(record.copyId, record);
            }
        }
        return [...latest.values()].filter((record) => record.status === 'MISSING' || record.status === 'DAMAGED');
    });

    copyAvailability(bookId: string): number {
        return this._store().bookCopies.filter((copy) => copy.bookId === bookId && copy.status === 'AVAILABLE').length;
    }

    copiesFor(bookId: string): BookCopy[] {
        return this._store().bookCopies.filter((copy) => copy.bookId === bookId);
    }

    memberName(memberId: string): string {
        const member = this._store().members.find((item) => item.id === memberId);
        return member ? `${member.firstName} ${member.lastName}` : 'Unknown member';
    }

    memberForUsername(username: string | null): LibraryMember | undefined {
        if (!username) return undefined;
        const linked: Record<string, string> = {
            teacher1: 'mem-003',
            student1: 'mem-001'
        };
        const linkedId = linked[username];
        if (linkedId) {
            return this._store().members.find((member) => member.id === linkedId);
        }
        return this._store().members.find((member) => member.email.toLowerCase().startsWith(`${username.toLowerCase()}@`));
    }

    currentMember(): LibraryMember | undefined {
        return this.memberForUsername(this.auth.username());
    }

    currentAccount(): LibraryUser | undefined {
        const username = this.auth.username();
        if (!username) return undefined;
        return this._store().users.find((user) => user.username.toLowerCase() === username.toLowerCase());
    }

    assignedBranchId(): string | null {
        return this.currentAccount()?.branchId ?? null;
    }

    memberByMembershipNo(membershipNo: string): LibraryMember | undefined {
        const value = membershipNo.trim().toLowerCase();
        return this._store().members.find((member) => member.membershipNo.toLowerCase() === value);
    }

    copyByBarcode(barcode: string): BookCopy | undefined {
        const value = barcode.trim().toUpperCase();
        return this._store().bookCopies.find((copy) => copy.barcode.toUpperCase() === value);
    }

    activeLoanForCopy(copyId: string): Loan | undefined {
        return this._store().loans.find((loan) => loan.copyId === copyId && !loan.returnedAt);
    }

    verifyEligibility(memberId: string): {
        member: LibraryMember;
        eligible: boolean;
        reasons: string[];
        activeLoans: number;
        overdueLoans: number;
        borrowLimit: number;
        unpaidFines: number;
    } {
        const member = this._store().members.find((item) => item.id === memberId);
        if (!member) throw new Error('Member not found.');
        const policy = this.policyFor(member.memberType);
        const active = this.memberActiveLoans(memberId);
        const overdue = active.filter((loan) => new Date(loan.dueAt).getTime() < Date.now());
        const unpaidFines = this.memberUnpaidFines(memberId);
        const borrowLimit = policy?.borrowLimit ?? 4;
        const reasons: string[] = [];
        if (member.status !== 'ACTIVE') reasons.push(`Membership is ${member.status.toLowerCase()}.`);
        if (active.length >= borrowLimit) reasons.push(`Borrowing limit reached (${active.length}/${borrowLimit}).`);
        if (overdue.length > 0) reasons.push(`${overdue.length} overdue loan(s) must be resolved.`);
        return {
            member,
            eligible: reasons.length === 0,
            reasons,
            activeLoans: active.length,
            overdueLoans: overdue.length,
            borrowLimit,
            unpaidFines
        };
    }

    issueReservationPickup(reservationId: string): Loan {
        const reservation = this._store().reservations.find((item) => item.id === reservationId);
        if (!reservation) throw new Error('Reservation not found.');
        if (reservation.status !== 'READY' && reservation.status !== 'PENDING') throw new Error('This reservation is not ready for pickup.');
        const atBranch = this._store().bookCopies.find((copy) => copy.bookId === reservation.bookId && copy.branchId === reservation.branchId && copy.status === 'AVAILABLE');
        const anywhere = this._store().bookCopies.find((copy) => copy.bookId === reservation.bookId && copy.status === 'AVAILABLE');
        const copy = atBranch ?? anywhere;
        if (!copy) throw new Error('No available copy is ready for this reservation.');
        const loan = this.issueLoan(copy.id, reservation.memberId, 'Reservation pickup');
        this.fulfillReservation(reservation.id);
        return loan;
    }

    sendConfirmation(loanId: string, kind: 'ISSUE' | 'RETURN'): string {
        const loan = this._store().loans.find((item) => item.id === loanId);
        if (!loan) throw new Error('Loan not found.');
        const member = this._store().members.find((item) => item.id === loan.memberId);
        const message = `${kind === 'ISSUE' ? 'Borrowing' : 'Return'} confirmation sent to ${member ? `${member.firstName} ${member.lastName}` : 'the member'} for "${this.bookTitle(loan.bookId)}".`;
        this.logAudit('SEND', 'Confirmation', loan.id, message, loan.branchId);
        return message;
    }

    bookTitle(bookId: string): string {
        return this._store().books.find((book) => book.id === bookId)?.title ?? 'Unknown title';
    }

    constructor() {
        effect(() => {
            const store = this._store();
            this.flushPersist(store);
        });
    }

    private initStore(): LibraryStore {
        const raw = this.storage.get<LibraryStore>(STORAGE_KEY);
        if (raw && raw.schemaVersion === schemaVersion && Array.isArray(raw.books)) {
            return raw;
        }
        if (raw && (raw.schemaVersion === 1 || raw.schemaVersion === 2) && Array.isArray(raw.branches)) {
            return {
                ...raw,
                schemaVersion,
                ebooks: Array.isArray(raw.ebooks) ? raw.ebooks : [...seedEBooks],
                ebookRequests: Array.isArray(raw.ebookRequests) ? raw.ebookRequests : [...seedEBookRequests],
                books: [...seedBooks],
                bookCopies: [...seedBookCopies],
                members: [...seedMembers],
                loans: [...seedLoans],
                reservations: [...seedReservations],
                borrowRequests: [...seedBorrowRequests],
                renewalRequests: [...seedRenewalRequests],
                fines: [...seedFines],
                acquisitions: [...seedAcquisitions],
                inventoryRecords: [...seedInventoryRecords],
                announcements: [...seedAnnouncements]
            };
        }
        return {
            schemaVersion,
            branches: [...seedBranches],
            users: [...seedUsers],
            roles: seedRoles.map((role) => ({ ...role, permissions: [...role.permissions] })),
            policies: [...seedPolicies],
            branchMetrics: [...seedBranchMetrics],
            circulationTrend: [...seedCirculationTrend],
            ebooks: [...seedEBooks],
            ebookRequests: [...seedEBookRequests],
            books: [...seedBooks],
            bookCopies: [...seedBookCopies],
            members: [...seedMembers],
            loans: [...seedLoans],
            reservations: [...seedReservations],
            borrowRequests: [...seedBorrowRequests],
            renewalRequests: [...seedRenewalRequests],
            fines: [...seedFines],
            acquisitions: [...seedAcquisitions],
            inventoryRecords: [...seedInventoryRecords],
            announcements: [...seedAnnouncements],
            auditLogs: [...seedAuditLogs],
            settings: { ...seedSettings }
        };
    }

    private persistTimer: ReturnType<typeof setTimeout> | undefined;

    private flushPersist(store: LibraryStore): void {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.persistTimer = setTimeout(() => {
            this.storage.set(STORAGE_KEY, store);
        }, 250);
    }

    private now(): string {
        return new Date().toISOString();
    }

    generateId(prefix: string): string {
        return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private logAudit(action: AuditAction, entity: string, entityId: string, detail: string, branchId: string | null): void {
        const entry: LibraryAuditLog = {
            id: this.generateId('audit'),
            actor: this.auth.name() ?? 'System',
            actorRole: this.auth.role() ?? 'SUPER_ADMIN',
            action,
            entity,
            entityId,
            detail,
            branchId,
            ipAddress: '127.0.0.1',
            createdAt: this.now(),
            updatedAt: this.now()
        };
        this._store.update((store) => ({ ...store, auditLogs: [entry, ...store.auditLogs].slice(0, 250) }));
    }

    branchName(branchId: string | null): string {
        if (!branchId) return 'All branches';
        return this._store().branches.find((branch) => branch.id === branchId)?.name ?? 'Unknown branch';
    }

    roleDefinition(role: LibraryRole): RoleDefinition | undefined {
        return this._store().roles.find((definition) => definition.role === role);
    }

    metricFor(branchId: string): BranchMetric | undefined {
        return this._store().branchMetrics.find((metric) => metric.branchId === branchId);
    }

    // ── Branches ──────────────────────────────────────────────────────────────

    createBranch(branch: Omit<LibraryBranch, 'id' | 'createdAt' | 'updatedAt'>): LibraryBranch {
        const now = this.now();
        const entity: LibraryBranch = { ...branch, id: this.generateId('br'), createdAt: now, updatedAt: now };
        this._store.update((store) => ({
            ...store,
            branches: [...store.branches, entity],
            branchMetrics: [...store.branchMetrics, emptyMetric(entity.id)]
        }));
        this.logAudit('CREATE', 'Library Branch', entity.id, `Created branch "${entity.name}" (${entity.code}).`, entity.id);
        return entity;
    }

    updateBranch(branch: LibraryBranch): void {
        const now = this.now();
        this._store.update((store) => ({
            ...store,
            branches: store.branches.map((item) => (item.id === branch.id ? { ...branch, updatedAt: now } : item))
        }));
        this.logAudit('UPDATE', 'Library Branch', branch.id, `Updated settings for "${branch.name}".`, branch.id);
    }

    toggleBranchStatus(id: string): void {
        const branch = this._store().branches.find((item) => item.id === id);
        if (!branch) throw new Error('Branch not found.');
        const status: LibraryBranch['status'] = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        this._store.update((store) => ({
            ...store,
            branches: store.branches.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Library Branch', id, `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} branch "${branch.name}".`, id);
    }

    removeBranch(id: string): void {
        const branch = this._store().branches.find((item) => item.id === id);
        if (!branch) throw new Error('Branch not found.');
        const assigned = this._store().users.filter((user) => user.branchId === id);
        if (assigned.length > 0) {
            throw new Error(`Cannot delete "${branch.name}": ${assigned.length} account(s) are assigned to it. Reassign them first.`);
        }
        this._store.update((store) => ({
            ...store,
            branches: store.branches.filter((item) => item.id !== id),
            branchMetrics: store.branchMetrics.filter((metric) => metric.branchId !== id)
        }));
        this.logAudit('DELETE', 'Library Branch', id, `Deleted branch "${branch.name}".`, null);
    }

    // ── Users & accounts ──────────────────────────────────────────────────────

    createUser(user: Omit<LibraryUser, 'id' | 'createdAt' | 'updatedAt'>): LibraryUser {
        const now = this.now();
        const entity: LibraryUser = { ...user, id: this.generateId('user'), createdAt: now, updatedAt: now };
        this._store.update((store) => ({ ...store, users: [...store.users, entity] }));
        this.logAudit('CREATE', 'Library Account', entity.id, `Created account for ${entity.name} as ${this.roleLabel(entity.role)}.`, entity.branchId);
        return entity;
    }

    updateUser(user: LibraryUser): void {
        const previous = this._store().users.find((item) => item.id === user.id);
        const now = this.now();
        this._store.update((store) => ({
            ...store,
            users: store.users.map((item) => (item.id === user.id ? { ...user, updatedAt: now } : item))
        }));
        const roleChanged = previous && previous.role !== user.role;
        this.logAudit(
            roleChanged ? 'ROLE' : 'UPDATE',
            'Library Account',
            user.id,
            roleChanged ? `Changed role for ${user.name} from ${this.roleLabel(previous.role)} to ${this.roleLabel(user.role)}.` : `Updated account details for ${user.name}.`,
            user.branchId
        );
    }

    toggleUserStatus(id: string): void {
        const user = this._store().users.find((item) => item.id === id);
        if (!user) throw new Error('Account not found.');
        if (user.role === 'SUPER_ADMIN' && user.status === 'ACTIVE') {
            throw new Error('The active Super Admin account cannot be deactivated.');
        }
        const status: LibraryUser['status'] = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        this._store.update((store) => ({
            ...store,
            users: store.users.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Library Account', id, `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} account for ${user.name}.`, user.branchId);
    }

    removeUser(id: string): void {
        const user = this._store().users.find((item) => item.id === id);
        if (!user) throw new Error('Account not found.');
        if (user.role === 'SUPER_ADMIN') {
            throw new Error('The Super Admin account cannot be deleted.');
        }
        this._store.update((store) => ({ ...store, users: store.users.filter((item) => item.id !== id) }));
        this.logAudit('DELETE', 'Library Account', id, `Deleted account for ${user.name}.`, user.branchId);
    }

    roleLabel(role: LibraryRole): string {
        return this.roleDefinition(role)?.label ?? role;
    }

    usersInRole(role: LibraryRole): number {
        return this._store().users.filter((user) => user.role === role).length;
    }

    // ── Books & copies ────────────────────────────────────────────────────────

    createBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
        const now = this.now();
        const entity: Book = { ...book, id: this.generateId('book'), createdAt: now, updatedAt: now };
        this._store.update((store) => ({ ...store, books: [entity, ...store.books] }));
        this.logAudit('CREATE', 'Book', entity.id, `Added book "${entity.title}" to the catalog.`, null);
        return entity;
    }

    updateBook(book: Book): void {
        this._store.update((store) => ({
            ...store,
            books: store.books.map((item) => (item.id === book.id ? { ...book, updatedAt: this.now() } : item))
        }));
        this.logAudit('UPDATE', 'Book', book.id, `Updated catalog record for "${book.title}".`, null);
    }

    setBookStatus(id: string, status: Book['status']): void {
        const book = this._store().books.find((item) => item.id === id);
        if (!book) throw new Error('Book not found.');
        this._store.update((store) => ({
            ...store,
            books: store.books.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Book', id, `${status === 'ACTIVE' ? 'Restored' : 'Archived'} "${book.title}".`, null);
    }

    createCopy(copy: Omit<BookCopy, 'id' | 'createdAt' | 'updatedAt'>): BookCopy {
        const now = this.now();
        const entity: BookCopy = { ...copy, id: this.generateId('copy'), createdAt: now, updatedAt: now };
        this._store.update((store) => ({ ...store, bookCopies: [entity, ...store.bookCopies] }));
        this.logAudit('CREATE', 'Book Copy', entity.id, `Added copy ${entity.barcode} for "${this.bookTitle(entity.bookId)}".`, entity.branchId);
        return entity;
    }

    updateCopy(copy: BookCopy): void {
        this._store.update((store) => ({
            ...store,
            bookCopies: store.bookCopies.map((item) => (item.id === copy.id ? { ...copy, updatedAt: this.now() } : item))
        }));
        this.logAudit('UPDATE', 'Book Copy', copy.id, `Updated copy ${copy.barcode}.`, copy.branchId);
    }

    setCopyStatus(id: string, status: CopyStatus): void {
        const copy = this._store().bookCopies.find((item) => item.id === id);
        if (!copy) throw new Error('Copy not found.');
        this._store.update((store) => ({
            ...store,
            bookCopies: store.bookCopies.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Book Copy', id, `Set copy ${copy.barcode} to ${status.toLowerCase()}.`, copy.branchId);
    }

    removeCopy(id: string): void {
        const copy = this._store().bookCopies.find((item) => item.id === id);
        if (!copy) throw new Error('Copy not found.');
        if (this._store().loans.some((loan) => loan.copyId === id && !loan.returnedAt)) {
            throw new Error(`Copy ${copy.barcode} is currently on loan and cannot be deleted.`);
        }
        this._store.update((store) => ({
            ...store,
            bookCopies: store.bookCopies.filter((item) => item.id !== id),
            inventoryRecords: store.inventoryRecords.filter((record) => record.copyId !== id)
        }));
        this.logAudit('DELETE', 'Book Copy', id, `Deleted copy ${copy.barcode}.`, copy.branchId);
    }

    nextBarcode(bookId: string): string {
        const code = bookId.replace(/^book-/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'BOOK';
        const existing = this._store().bookCopies.filter((copy) => copy.bookId === bookId).length;
        let sequence = existing + 1;
        let barcode = `PUL-${code}-${String(sequence).padStart(4, '0')}`;
        while (this._store().bookCopies.some((copy) => copy.barcode === barcode)) {
            sequence += 1;
            barcode = `PUL-${code}-${String(sequence).padStart(4, '0')}`;
        }
        return barcode;
    }

    copyQrPayload(copy: BookCopy): string {
        return `${this._store().settings.qrCodePrefix}|${copy.barcode}|${copy.bookId}|${copy.branchId}|${copy.shelfLocation}`;
    }

    // ── Members ───────────────────────────────────────────────────────────────

    createMember(member: Omit<LibraryMember, 'id' | 'createdAt' | 'updatedAt' | 'membershipNo'>): LibraryMember {
        const now = this.now();
        const entity: LibraryMember = {
            ...member,
            id: this.generateId('mem'),
            membershipNo: this.nextMembershipNo(member.memberType),
            createdAt: now,
            updatedAt: now
        };
        this._store.update((store) => ({ ...store, members: [entity, ...store.members] }));
        this.logAudit('CREATE', 'Library Member', entity.id, `Registered ${entity.firstName} ${entity.lastName} as a ${entity.memberType.toLowerCase()} member.`, entity.branchId);
        return entity;
    }

    updateMember(member: LibraryMember): void {
        this._store.update((store) => ({
            ...store,
            members: store.members.map((item) => (item.id === member.id ? { ...member, updatedAt: this.now() } : item))
        }));
        this.logAudit('UPDATE', 'Library Member', member.id, `Updated membership for ${member.firstName} ${member.lastName}.`, member.branchId);
    }

    setMemberStatus(id: string, status: MemberStatus): void {
        const member = this._store().members.find((item) => item.id === id);
        if (!member) throw new Error('Member not found.');
        this._store.update((store) => ({
            ...store,
            members: store.members.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Library Member', id, `Set ${member.firstName} ${member.lastName} to ${status.toLowerCase()}.`, member.branchId);
    }

    removeMember(id: string): void {
        const member = this._store().members.find((item) => item.id === id);
        if (!member) throw new Error('Member not found.');
        if (this._store().loans.some((loan) => loan.memberId === id && !loan.returnedAt)) {
            throw new Error('This member still has active loans and cannot be removed.');
        }
        this._store.update((store) => ({
            ...store,
            members: store.members.filter((item) => item.id !== id),
            reservations: store.reservations.filter((reservation) => reservation.memberId !== id),
            borrowRequests: store.borrowRequests.filter((request) => request.memberId !== id),
            renewalRequests: store.renewalRequests.filter((request) => request.memberId !== id)
        }));
        this.logAudit('DELETE', 'Library Member', id, `Removed membership for ${member.firstName} ${member.lastName}.`, member.branchId);
    }

    nextMembershipNo(type: MemberType): string {
        const prefix = type === 'STUDENT' ? 'STU' : type === 'TEACHER' ? 'TEA' : 'STF';
        const year = new Date().getFullYear();
        const sequence = String(this._store().members.length + 1).padStart(3, '0');
        return `PUL-${prefix}-${year}-${sequence}`;
    }

    memberActiveLoans(memberId: string): Loan[] {
        return this._store().loans.filter((loan) => loan.memberId === memberId && !loan.returnedAt);
    }

    memberUnpaidFines(memberId: string): number {
        return this._store().fines.filter((fine) => fine.memberId === memberId && fine.status === 'UNPAID').reduce((sum, fine) => sum + fine.amount, 0);
    }

    policyFor(type: MemberType): LibraryPolicy | undefined {
        return this._store().policies.find((policy) => policy.memberType === type);
    }

    // ── Circulation ───────────────────────────────────────────────────────────

    issueLoan(copyId: string, memberId: string, notes = ''): Loan {
        const copy = this._store().bookCopies.find((item) => item.id === copyId);
        if (!copy) throw new Error('Book copy not found.');
        if (copy.status !== 'AVAILABLE') throw new Error(`Copy ${copy.barcode} is not available for issue.`);
        const member = this._store().members.find((item) => item.id === memberId);
        if (!member) throw new Error('Member not found.');
        if (member.status !== 'ACTIVE') throw new Error('Only active members can borrow books.');

        const policy = this.policyFor(member.memberType);
        const limit = policy?.borrowLimit ?? 4;
        if (this.memberActiveLoans(memberId).length >= limit) {
            throw new Error(`${member.firstName} ${member.lastName} has reached the borrowing limit of ${limit} items.`);
        }

        const now = new Date();
        const due = new Date(now.getTime() + (policy?.loanPeriodDays ?? 14) * 86400000);
        const loan: Loan = {
            id: this.generateId('loan'),
            copyId,
            bookId: copy.bookId,
            memberId,
            branchId: copy.branchId,
            issuedAt: now.toISOString(),
            dueAt: due.toISOString(),
            returnedAt: null,
            renewalCount: 0,
            status: 'ACTIVE',
            issuedBy: this.auth.name() ?? 'Library Admin',
            notes: notes.trim(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        this._store.update((store) => ({
            ...store,
            loans: [loan, ...store.loans],
            bookCopies: store.bookCopies.map((item) => (item.id === copyId ? { ...item, status: 'ISSUED', updatedAt: now.toISOString() } : item))
        }));
        this.logAudit('CREATE', 'Loan', loan.id, `Issued "${this.bookTitle(copy.bookId)}" (${copy.barcode}) to ${member.firstName} ${member.lastName}.`, copy.branchId);
        return loan;
    }

    returnLoan(loanId: string): FineRecord | null {
        const loan = this._store().loans.find((item) => item.id === loanId);
        if (!loan) throw new Error('Loan not found.');
        if (loan.returnedAt) throw new Error('This loan has already been returned.');
        const member = this._store().members.find((item) => item.id === loan.memberId);
        const policy = member ? this.policyFor(member.memberType) : undefined;
        const now = new Date();
        const due = new Date(loan.dueAt);
        const overdueDays = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / 86400000) - (policy?.gracePeriodDays ?? 0));
        const amount = overdueDays > 0 ? Math.min(overdueDays * (policy?.finePerDay ?? 0), policy?.maxFine ?? 0) : 0;

        const nowIso = now.toISOString();
        this._store.update((store) => ({
            ...store,
            loans: store.loans.map((item) => (item.id === loanId ? { ...item, returnedAt: nowIso, status: 'RETURNED', updatedAt: nowIso } : item)),
            bookCopies: store.bookCopies.map((copy) => (copy.id === loan.copyId ? { ...copy, status: 'AVAILABLE', updatedAt: nowIso } : copy))
        }));

        let fine: FineRecord | null = null;
        if (amount > 0) {
            fine = this.addFine(loan.memberId, amount, `Overdue return — ${this.bookTitle(loan.bookId)}`, loan.id, `${overdueDays} day(s) overdue`);
        }
        this.logAudit('UPDATE', 'Loan', loanId, `Returned "${this.bookTitle(loan.bookId)}"${amount > 0 ? ` with a ${amount} fine` : ''}.`, loan.branchId);
        return fine;
    }

    renewLoan(loanId: string): void {
        const loan = this._store().loans.find((item) => item.id === loanId);
        if (!loan) throw new Error('Loan not found.');
        if (loan.returnedAt) throw new Error('Returned loans cannot be renewed.');
        const member = this._store().members.find((item) => item.id === loan.memberId);
        const policy = member ? this.policyFor(member.memberType) : undefined;
        const limit = policy?.renewalLimit ?? 1;
        if (loan.renewalCount >= limit) throw new Error(`Renewal limit of ${limit} has been reached.`);

        const days = policy?.renewalPeriodDays ?? 7;
        const due = new Date(new Date(loan.dueAt).getTime() + days * 86400000);
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            loans: store.loans.map((item) =>
                item.id === loanId ? { ...item, dueAt: due.toISOString(), renewalCount: item.renewalCount + 1, status: 'ACTIVE', updatedAt: nowIso } : item
            )
        }));
        this.logAudit('UPDATE', 'Loan', loanId, `Renewed "${this.bookTitle(loan.bookId)}" for ${days} more days.`, loan.branchId);
    }

    markLoanLost(loanId: string): void {
        const loan = this._store().loans.find((item) => item.id === loanId);
        if (!loan) throw new Error('Loan not found.');
        const member = this._store().members.find((item) => item.id === loan.memberId);
        const policy = member ? this.policyFor(member.memberType) : undefined;
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            loans: store.loans.map((item) => (item.id === loanId ? { ...item, status: 'LOST', updatedAt: nowIso } : item)),
            bookCopies: store.bookCopies.map((copy) => (copy.id === loan.copyId ? { ...copy, status: 'LOST', condition: 'DAMAGED', updatedAt: nowIso } : copy))
        }));
        this.addFine(loan.memberId, policy?.lostBookCharge ?? 1000, `Lost book charge — ${this.bookTitle(loan.bookId)}`, loan.id, 'Reported lost');
        this.logAudit('UPDATE', 'Loan', loanId, `Marked "${this.bookTitle(loan.bookId)}" as lost.`, loan.branchId);
    }

    approveBorrowRequest(id: string): void {
        const request = this._store().borrowRequests.find((item) => item.id === id);
        if (!request) throw new Error('Borrow request not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            borrowRequests: store.borrowRequests.map((item) =>
                item.id === id ? { ...item, status: 'APPROVED', reviewedAt: nowIso, reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: nowIso } : item
            )
        }));
        this.logAudit('STATUS', 'Borrow Request', id, `Approved borrowing request for "${this.bookTitle(request.bookId)}".`, request.branchId);
    }

    rejectBorrowRequest(id: string): void {
        const request = this._store().borrowRequests.find((item) => item.id === id);
        if (!request) throw new Error('Borrow request not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            borrowRequests: store.borrowRequests.map((item) =>
                item.id === id ? { ...item, status: 'REJECTED', reviewedAt: nowIso, reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: nowIso } : item
            )
        }));
        this.logAudit('STATUS', 'Borrow Request', id, `Rejected borrowing request for "${this.bookTitle(request.bookId)}".`, request.branchId);
    }

    approveReservation(id: string): void {
        const reservation = this._store().reservations.find((item) => item.id === id);
        if (!reservation) throw new Error('Reservation not found.');
        const policy = this.policyFor(this._store().members.find((member) => member.id === reservation.memberId)?.memberType ?? 'STUDENT');
        const holdDays = policy?.reservationHoldDays ?? 3;
        const now = new Date();
        const expires = new Date(now.getTime() + holdDays * 86400000);
        this._store.update((store) => ({
            ...store,
            reservations: store.reservations.map((item) =>
                item.id === id ? { ...item, status: 'READY', readyAt: now.toISOString(), expiresAt: expires.toISOString(), updatedAt: now.toISOString() } : item
            )
        }));
        this.logAudit('STATUS', 'Reservation', id, `Marked reservation for "${this.bookTitle(reservation.bookId)}" ready for pickup.`, reservation.branchId);
    }

    cancelReservation(id: string): void {
        const reservation = this._store().reservations.find((item) => item.id === id);
        if (!reservation) throw new Error('Reservation not found.');
        this._store.update((store) => ({
            ...store,
            reservations: store.reservations.map((item) => (item.id === id ? { ...item, status: 'CANCELLED', updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Reservation', id, `Cancelled reservation for "${this.bookTitle(reservation.bookId)}".`, reservation.branchId);
    }

    fulfillReservation(id: string): void {
        const reservation = this._store().reservations.find((item) => item.id === id);
        if (!reservation) throw new Error('Reservation not found.');
        this._store.update((store) => ({
            ...store,
            reservations: store.reservations.map((item) => (item.id === id ? { ...item, status: 'FULFILLED', updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Reservation', id, `Fulfilled reservation for "${this.bookTitle(reservation.bookId)}".`, reservation.branchId);
    }

    approveRenewalRequest(id: string): void {
        const request = this._store().renewalRequests.find((item) => item.id === id);
        if (!request) throw new Error('Renewal request not found.');
        this.renewLoan(request.loanId);
        this._store.update((store) => ({
            ...store,
            renewalRequests: store.renewalRequests.map((item) =>
                item.id === id ? { ...item, status: 'APPROVED', reviewedAt: this.now(), reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: this.now() } : item
            )
        }));
        this.logAudit('STATUS', 'Renewal Request', id, 'Approved renewal request.', null);
    }

    rejectRenewalRequest(id: string): void {
        const request = this._store().renewalRequests.find((item) => item.id === id);
        if (!request) throw new Error('Renewal request not found.');
        this._store.update((store) => ({
            ...store,
            renewalRequests: store.renewalRequests.map((item) =>
                item.id === id ? { ...item, status: 'REJECTED', reviewedAt: this.now(), reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: this.now() } : item
            )
        }));
        this.logAudit('STATUS', 'Renewal Request', id, 'Rejected renewal request.', null);
    }

    // ── Member self-service ───────────────────────────────────────────────────

    requestReservation(bookId: string, notes = ''): Reservation {
        const member = this.currentMember();
        if (!member) throw new Error('No library membership is linked to this account.');
        if (member.status !== 'ACTIVE') throw new Error('Only active memberships can reserve books.');
        const book = this._store().books.find((item) => item.id === bookId);
        if (!book || book.status !== 'ACTIVE') throw new Error('This title is not available for reservation.');

        const existing = this._store().reservations.find(
            (reservation) => reservation.bookId === bookId && reservation.memberId === member.id && (reservation.status === 'PENDING' || reservation.status === 'READY')
        );
        if (existing) throw new Error('You already have an active reservation for this title.');

        const availableHere = this._store().bookCopies.some((copy) => copy.bookId === bookId && copy.branchId === member.branchId && copy.status === 'AVAILABLE');
        const availableAnywhere = this._store().bookCopies.find((copy) => copy.bookId === bookId && copy.status === 'AVAILABLE');
        const branchId = availableHere ? member.branchId : availableAnywhere?.branchId ?? member.branchId;
        const nowIso = this.now();
        const reservation: Reservation = {
            id: this.generateId('res'),
            bookId,
            memberId: member.id,
            branchId,
            status: 'PENDING',
            requestedAt: nowIso,
            readyAt: null,
            expiresAt: null,
            notes: notes.trim(),
            createdAt: nowIso,
            updatedAt: nowIso
        };
        this._store.update((store) => ({ ...store, reservations: [reservation, ...store.reservations] }));
        this.logAudit('CREATE', 'Reservation', reservation.id, `${member.firstName} ${member.lastName} reserved "${book.title}".`, branchId);
        return reservation;
    }

    cancelMyReservation(id: string): void {
        const member = this.currentMember();
        const reservation = this._store().reservations.find((item) => item.id === id);
        if (!member || !reservation || reservation.memberId !== member.id) throw new Error('Reservation not found.');
        if (reservation.status === 'FULFILLED') throw new Error('Fulfilled reservations cannot be cancelled.');
        this._store.update((store) => ({
            ...store,
            reservations: store.reservations.map((item) => (item.id === id ? { ...item, status: 'CANCELLED', updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'Reservation', id, `${member.firstName} ${member.lastName} cancelled a reservation.`, reservation.branchId);
    }

    requestRenewal(loanId: string, notes = ''): RenewalRequest {
        const member = this.currentMember();
        if (!member) throw new Error('No library membership is linked to this account.');
        const loan = this._store().loans.find((item) => item.id === loanId);
        if (!loan || loan.memberId !== member.id) throw new Error('Loan not found.');
        if (loan.returnedAt) throw new Error('Returned loans cannot be renewed.');
        const policy = this.policyFor(member.memberType);
        if (policy && loan.renewalCount >= policy.renewalLimit) {
            throw new Error(`The renewal limit of ${policy.renewalLimit} has already been reached for this loan.`);
        }
        const pending = this._store().renewalRequests.some((request) => request.loanId === loanId && request.status === 'PENDING');
        if (pending) throw new Error('A renewal request for this loan is already pending.');
        const nowIso = this.now();
        const request: RenewalRequest = {
            id: this.generateId('rr'),
            loanId,
            memberId: member.id,
            status: 'PENDING',
            requestedAt: nowIso,
            reviewedAt: null,
            reviewedBy: null,
            notes: notes.trim(),
            createdAt: nowIso,
            updatedAt: nowIso
        };
        this._store.update((store) => ({ ...store, renewalRequests: [request, ...store.renewalRequests] }));
        this.logAudit('CREATE', 'Renewal Request', request.id, `${member.firstName} ${member.lastName} requested a renewal for "${this.bookTitle(loan.bookId)}".`, loan.branchId);
        return request;
    }

    suggestBook(title: string, author: string, notes = '', isbn = ''): AcquisitionRequest {
        const member = this.currentMember();
        if (!member) throw new Error('No library membership is linked to this account.');
        return this.createAcquisition({
            title: title.trim(),
            author: author.trim(),
            isbn: isbn.trim(),
            branchId: member.branchId,
            requestedBy: `${member.firstName} ${member.lastName}`,
            estimatedCost: 0,
            status: 'PENDING',
            notes: notes.trim()
        });
    }

    // ── Fines ─────────────────────────────────────────────────────────────────

    addFine(memberId: string, amount: number, reason: string, loanId: string | null = null, note = ''): FineRecord {
        const nowIso = this.now();
        const fine: FineRecord = {
            id: this.generateId('fine'),
            memberId,
            loanId,
            amount,
            reason,
            status: 'UNPAID',
            issuedAt: nowIso,
            settledAt: null,
            settledBy: null,
            note,
            createdAt: nowIso,
            updatedAt: nowIso
        };
        this._store.update((store) => ({ ...store, fines: [fine, ...store.fines] }));
        this.logAudit('CREATE', 'Fine', fine.id, `Issued a ${amount} fine: ${reason}.`, null);
        return fine;
    }

    payFine(id: string): void {
        const fine = this._store().fines.find((item) => item.id === id);
        if (!fine) throw new Error('Fine not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            fines: store.fines.map((item) => (item.id === id ? { ...item, status: 'PAID', settledAt: nowIso, settledBy: this.auth.name() ?? 'Library Admin', updatedAt: nowIso } : item))
        }));
        this.logAudit('PAYMENT', 'Fine', id, `Recorded payment of ${fine.amount}.`, null);
    }

    waiveFine(id: string, note = ''): void {
        const fine = this._store().fines.find((item) => item.id === id);
        if (!fine) throw new Error('Fine not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            fines: store.fines.map((item) =>
                item.id === id ? { ...item, status: 'WAIVED', settledAt: nowIso, settledBy: this.auth.name() ?? 'Library Admin', note: note || item.note, updatedAt: nowIso } : item
            )
        }));
        this.logAudit('WAIVE', 'Fine', id, `Waived fine of ${fine.amount}.`, null);
    }

    // ── Acquisitions & inventory ──────────────────────────────────────────────

    createAcquisition(request: Omit<AcquisitionRequest, 'id' | 'createdAt' | 'updatedAt' | 'requestedAt' | 'reviewedAt' | 'reviewedBy'>): AcquisitionRequest {
        const nowIso = this.now();
        const entity: AcquisitionRequest = { ...request, id: this.generateId('acq'), requestedAt: nowIso, reviewedAt: null, reviewedBy: null, createdAt: nowIso, updatedAt: nowIso };
        this._store.update((store) => ({ ...store, acquisitions: [entity, ...store.acquisitions] }));
        this.logAudit('CREATE', 'Acquisition', entity.id, `Logged acquisition request for "${entity.title}".`, entity.branchId);
        return entity;
    }

    setAcquisitionStatus(id: string, status: AcquisitionStatus): void {
        const request = this._store().acquisitions.find((item) => item.id === id);
        if (!request) throw new Error('Acquisition request not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            acquisitions: store.acquisitions.map((item) =>
                item.id === id ? { ...item, status, reviewedAt: nowIso, reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: nowIso } : item
            )
        }));
        this.logAudit('STATUS', 'Acquisition', id, `Set acquisition "${request.title}" to ${status.toLowerCase()}.`, request.branchId);
    }

    recordInventory(copyId: string, status: InventoryStatus, notes: string): InventoryRecord {
        const copy = this._store().bookCopies.find((item) => item.id === copyId);
        if (!copy) throw new Error('Book copy not found.');
        const nowIso = this.now();
        const record: InventoryRecord = {
            id: this.generateId('inv'),
            copyId,
            bookId: copy.bookId,
            branchId: copy.branchId,
            status,
            checkedAt: nowIso,
            checkedBy: this.auth.name() ?? 'Library Admin',
            notes: notes.trim(),
            createdAt: nowIso,
            updatedAt: nowIso
        };
        const nextCopyStatus: CopyStatus | null = status === 'MISSING' ? 'LOST' : status === 'DAMAGED' ? 'DAMAGED' : null;
        this._store.update((store) => ({
            ...store,
            inventoryRecords: [record, ...store.inventoryRecords],
            bookCopies: nextCopyStatus
                ? store.bookCopies.map((item) => (item.id === copyId ? { ...item, status: nextCopyStatus, condition: status === 'DAMAGED' ? 'DAMAGED' : item.condition, updatedAt: nowIso } : item))
                : store.bookCopies
        }));
        this.logAudit('UPDATE', 'Inventory', record.id, `Recorded ${status.toLowerCase()} check for copy ${copy.barcode}.`, copy.branchId);
        return record;
    }

    resolveInventoryIssue(recordId: string): void {
        const record = this._store().inventoryRecords.find((item) => item.id === recordId);
        if (!record) throw new Error('Inventory record not found.');
        const nowIso = this.now();
        this._store.update((store) => ({
            ...store,
            inventoryRecords: store.inventoryRecords.map((item) =>
                item.id === recordId ? { ...item, status: 'VERIFIED', notes: `Resolved: ${item.notes}`, checkedAt: nowIso, checkedBy: this.auth.name() ?? 'Library Admin', updatedAt: nowIso } : item
            ),
            bookCopies: store.bookCopies.map((copy) =>
                copy.id === record.copyId
                    ? { ...copy, status: copy.status === 'ISSUED' ? copy.status : 'AVAILABLE', condition: copy.condition === 'DAMAGED' ? 'FAIR' : copy.condition, updatedAt: nowIso }
                    : copy
            )
        }));
        this.logAudit('UPDATE', 'Inventory', recordId, `Resolved inventory exception for copy ${this._store().bookCopies.find((copy) => copy.id === record.copyId)?.barcode ?? record.copyId}.`, record.branchId);
    }

    // ── Announcements ─────────────────────────────────────────────────────────

    createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'sentAt' | 'sentBy' | 'status'>): Announcement {
        const nowIso = this.now();
        const entity: Announcement = {
            ...data,
            id: this.generateId('ann'),
            status: 'SENT',
            sentAt: nowIso,
            sentBy: this.auth.name() ?? 'Library Admin',
            createdAt: nowIso,
            updatedAt: nowIso
        };
        this._store.update((store) => ({ ...store, announcements: [entity, ...store.announcements] }));
        this.logAudit('SEND', 'Announcement', entity.id, `Sent announcement "${entity.title}" to ${entity.audience.toLowerCase()}.`, entity.branchId);
        return entity;
    }

    sendAnnouncement(id: string): void {
        const announcement = this._store().announcements.find((item) => item.id === id);
        if (!announcement) throw new Error('Announcement not found.');
        this._store.update((store) => ({
            ...store,
            announcements: store.announcements.map((item) =>
                item.id === id ? { ...item, status: 'SENT', sentAt: this.now(), sentBy: this.auth.name() ?? 'Library Admin', updatedAt: this.now() } : item
            )
        }));
        this.logAudit('SEND', 'Announcement', id, `Sent announcement "${announcement.title}".`, announcement.branchId);
    }

    removeAnnouncement(id: string): void {
        this._store.update((store) => ({ ...store, announcements: store.announcements.filter((item) => item.id !== id) }));
        this.logAudit('DELETE', 'Announcement', id, 'Deleted announcement.', null);
    }

    // ── E-Books & digital access ──────────────────────────────────────────────

    currentUsername(): string {
        return this.auth.username() ?? this.auth.name()?.trim().toLowerCase().replace(/\s+/g, '.') ?? 'guest';
    }

    createEBook(book: Omit<EBook, 'id' | 'createdAt' | 'updatedAt' | 'uploadedBy'>): EBook {
        const now = this.now();
        const entity: EBook = {
            ...book,
            id: this.generateId('ebook'),
            uploadedBy: this.auth.name() ?? 'Library Admin',
            createdAt: now,
            updatedAt: now
        };
        this._store.update((store) => ({ ...store, ebooks: [entity, ...store.ebooks] }));
        this.logAudit('CREATE', 'E-Book', entity.id, `Uploaded e-book "${entity.title}" (${entity.accessLevel === 'RESTRICTED' ? 'restricted' : 'open'} access).`, null);
        return entity;
    }

    updateEBook(book: EBook): void {
        const now = this.now();
        this._store.update((store) => ({
            ...store,
            ebooks: store.ebooks.map((item) => (item.id === book.id ? { ...book, updatedAt: now } : item))
        }));
        this.logAudit('UPDATE', 'E-Book', book.id, `Updated e-book "${book.title}".`, null);
    }

    setEBookStatus(id: string, status: EBookStatus): void {
        const book = this._store().ebooks.find((item) => item.id === id);
        if (!book) throw new Error('E-book not found.');
        this._store.update((store) => ({
            ...store,
            ebooks: store.ebooks.map((item) => (item.id === id ? { ...item, status, updatedAt: this.now() } : item))
        }));
        this.logAudit('STATUS', 'E-Book', id, `Set e-book "${book.title}" to ${status.toLowerCase()}.`, null);
    }

    removeEBook(id: string): void {
        const book = this._store().ebooks.find((item) => item.id === id);
        if (!book) throw new Error('E-book not found.');
        this._store.update((store) => ({
            ...store,
            ebooks: store.ebooks.filter((item) => item.id !== id),
            ebookRequests: store.ebookRequests.filter((request) => request.ebookId !== id)
        }));
        this.logAudit('DELETE', 'E-Book', id, `Deleted e-book "${book.title}".`, null);
    }

    requestEBookAccess(ebookId: string, note: string): EBookAccessRequest | null {
        const book = this._store().ebooks.find((item) => item.id === ebookId);
        const username = this.currentUsername();
        if (!book || !username || username === 'guest') return null;

        const existing = this.accessRequestFor(ebookId, username);
        if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
            return existing;
        }

        const now = this.now();
        const request: EBookAccessRequest = {
            id: this.generateId('req'),
            ebookId,
            username,
            userName: this.auth.name() ?? username,
            role: this.auth.role() ?? 'STUDENT',
            note: note.trim(),
            status: 'PENDING',
            requestedAt: now,
            reviewedAt: null,
            reviewedBy: null,
            createdAt: now,
            updatedAt: now
        };
        this._store.update((store) => ({ ...store, ebookRequests: [request, ...store.ebookRequests] }));
        this.logAudit('CREATE', 'E-Book Access Request', request.id, `Requested special access to "${book.title}".`, null);
        return request;
    }

    reviewEBookAccess(requestId: string, status: 'APPROVED' | 'REJECTED'): void {
        const request = this._store().ebookRequests.find((item) => item.id === requestId);
        if (!request) throw new Error('Access request not found.');
        const book = this._store().ebooks.find((item) => item.id === request.ebookId);
        const now = this.now();
        this._store.update((store) => ({
            ...store,
            ebookRequests: store.ebookRequests.map((item) =>
                item.id === requestId ? { ...item, status, reviewedAt: now, reviewedBy: this.auth.name() ?? 'Library Admin', updatedAt: now } : item
            )
        }));
        this.logAudit(
            'STATUS',
            'E-Book Access Request',
            requestId,
            `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${request.userName}'s access to "${book?.title ?? request.ebookId}".`,
            null
        );
    }

    accessRequestFor(ebookId: string, username: string): EBookAccessRequest | undefined {
        return this._store()
            .ebookRequests.filter((request) => request.ebookId === ebookId && request.username === username)
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];
    }

    hasEBookAccess(book: EBook, username: string | null, role: LibraryRole | null): boolean {
        if (role === 'SUPER_ADMIN') return true;
        if (book.accessLevel === 'OPEN') return true;
        if (!username) return false;
        return this._store().ebookRequests.some((request) => request.ebookId === book.id && request.username === username && request.status === 'APPROVED');
    }

    // ── Roles & permissions ───────────────────────────────────────────────────

    updateRolePermissions(role: LibraryRole, permissions: string[]): void {
        this._store.update((store) => ({
            ...store,
            roles: store.roles.map((definition) => (definition.role === role ? { ...definition, permissions: [...permissions] } : definition))
        }));
        const definition = this.roleDefinition(role);
        this.logAudit('ROLE', 'Role Permissions', role, `Updated permissions for ${definition?.label ?? role} (${permissions.length} granted).`, null);
    }

    // ── Policies ──────────────────────────────────────────────────────────────

    updatePolicy(memberType: MemberType, patch: Partial<LibraryPolicy>): void {
        const current = this._store().policies.find((policy) => policy.memberType === memberType);
        if (!current) throw new Error('Policy not found.');
        const updated: LibraryPolicy = { ...current, ...patch, updatedAt: this.now() };
        this._store.update((store) => ({
            ...store,
            policies: store.policies.map((policy) => (policy.memberType === memberType ? updated : policy))
        }));
        this.logAudit('POLICY', 'Library Policy', updated.id, `Updated borrowing and fine policy for ${memberType.toLowerCase()} members.`, null);
    }

    updateSettings(patch: Partial<LibrarySettings>): void {
        this._store.update((store) => ({ ...store, settings: { ...store.settings, ...patch, updatedAt: this.now() } }));
        this.logAudit('SETTINGS', 'Library Settings', 'library-settings', 'Updated library-wide settings.', null);
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    resetDemoData(): void {
        const fresh = this.initStore();
        this._store.set(fresh);
        this.storage.set(STORAGE_KEY, fresh);
    }
}
