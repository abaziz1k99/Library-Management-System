import { Injectable, computed, inject } from '@angular/core';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { BranchMetric, LibraryBranch, LibraryRole } from '@/app/core/models/library.models';

export interface BranchOverviewRow {
    branch: LibraryBranch;
    metric: BranchMetric;
    utilization: number;
}

export interface LibrarySummary {
    totalBranches: number;
    activeBranches: number;
    inactiveBranches: number;
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
    utilization: number;
}

const ZERO_METRIC: Omit<BranchMetric, 'branchId' | 'id'> = {
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

@Injectable({
    providedIn: 'root'
})
export class LibraryDashboardService {
    private readonly data = inject(LibraryDataService);

    readonly summary = computed<LibrarySummary>(() => {
        const metrics = this.data.branchMetrics();
        const branches = this.data.branches();
        const totals = metrics.reduce(
            (acc, metric) => ({
                totalTitles: acc.totalTitles + metric.totalTitles,
                totalCopies: acc.totalCopies + metric.totalCopies,
                availableCopies: acc.availableCopies + metric.availableCopies,
                issuedCopies: acc.issuedCopies + metric.issuedCopies,
                overdueLoans: acc.overdueLoans + metric.overdueLoans,
                totalMembers: acc.totalMembers + metric.totalMembers,
                activeLoans: acc.activeLoans + metric.activeLoans,
                reservations: acc.reservations + metric.reservations,
                finesOutstanding: acc.finesOutstanding + metric.finesOutstanding,
                digitalResources: acc.digitalResources + metric.digitalResources
            }),
            { ...ZERO_METRIC }
        );

        return {
            ...totals,
            totalBranches: branches.length,
            activeBranches: branches.filter((branch) => branch.status === 'ACTIVE').length,
            inactiveBranches: branches.filter((branch) => branch.status === 'INACTIVE').length,
            utilization: totals.totalCopies === 0 ? 0 : (totals.issuedCopies / totals.totalCopies) * 100
        };
    });

    readonly branchOverview = computed<BranchOverviewRow[]>(() =>
        this.data
            .branches()
            .map((branch) => {
                const metric = this.data.metricFor(branch.id) ?? { id: `metric-${branch.id}`, branchId: branch.id, ...ZERO_METRIC };
                return {
                    branch,
                    metric,
                    utilization: metric.totalCopies === 0 ? 0 : (metric.issuedCopies / metric.totalCopies) * 100
                };
            })
            .sort((a, b) => b.metric.totalCopies - a.metric.totalCopies)
    );

    readonly collectionStatus = computed(() => {
        const summary = this.summary();
        const overdue = summary.overdueLoans;
        const onLoan = Math.max(summary.issuedCopies - overdue, 0);
        return {
            available: summary.availableCopies,
            onLoan,
            overdue
        };
    });

    readonly roleDistribution = computed(() => {
        const users = this.data.users();
        const roles: LibraryRole[] = ['SUPER_ADMIN', 'LIBRARY_ADMIN', 'LIBRARY_STAFF', 'TEACHER', 'STUDENT'];
        return roles.map((role) => ({
            role,
            label: this.data.roleLabel(role),
            count: users.filter((user) => user.role === role).length
        }));
    });

    readonly recentActivity = computed(() => this.data.auditLogs().slice(0, 6));
}
