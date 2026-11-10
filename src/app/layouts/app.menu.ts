import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/services/auth.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    model: MenuItem[] = [];
    private readonly auth = inject(AuthService);

    ngOnInit() {
        if (this.auth.role() === 'SUPER_ADMIN') {
            this.model = [
                {
                    label: 'Overview',
                    items: [{ label: 'Library Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/admin/dashboard'] }]
                },
                {
                    label: 'Library Network',
                    items: [{ label: 'Branches', icon: 'pi pi-fw pi-building', routerLink: ['/admin/branches'] }]
                },
                {
                    label: 'Access Control',
                    items: [
                        { label: 'User Accounts', icon: 'pi pi-fw pi-users', routerLink: ['/admin/users'] },
                        { label: 'Roles & Permissions', icon: 'pi pi-fw pi-shield', routerLink: ['/admin/roles'] }
                    ]
                },
                {
                    label: 'Digital Resources',
                    items: [{ label: 'E-Books', icon: 'pi pi-fw pi-cloud-upload', routerLink: ['/admin/ebooks'] }]
                },
                {
                    label: 'Configuration',
                    items: [{ label: 'Policies & Fines', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/admin/policies'] }]
                },
                {
                    label: 'Governance',
                    items: [
                        { label: 'Activity & Audit', icon: 'pi pi-fw pi-history', routerLink: ['/admin/activity'] },
                        { label: 'System Reports', icon: 'pi pi-fw pi-file-pdf', routerLink: ['/admin/reports'] }
                    ]
                }
            ];
            return;
        }

        if (this.auth.role() === 'LIBRARY_ADMIN') {
            this.model = [
                {
                    label: 'Overview',
                    items: [{ label: 'Library Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/librarian/dashboard'] }]
                },
                {
                    label: 'Catalog',
                    items: [
                        { label: 'Books & Copies', icon: 'pi pi-fw pi-book', routerLink: ['/librarian/catalog'] },
                        { label: 'E-Books', icon: 'pi pi-fw pi-cloud-upload', routerLink: ['/librarian/ebooks'] }
                    ]
                },
                {
                    label: 'Members',
                    items: [{ label: 'Memberships', icon: 'pi pi-fw pi-id-card', routerLink: ['/librarian/members'] }]
                },
                {
                    label: 'Circulation',
                    items: [
                        { label: 'Circulation Desk', icon: 'pi pi-fw pi-send', routerLink: ['/librarian/circulation'] },
                        { label: 'Requests & Approvals', icon: 'pi pi-fw pi-inbox', routerLink: ['/librarian/requests'] },
                        { label: 'Fines & Payments', icon: 'pi pi-fw pi-wallet', routerLink: ['/librarian/fines'] }
                    ]
                },
                {
                    label: 'Collection',
                    items: [
                        { label: 'Acquisitions', icon: 'pi pi-fw pi-shopping-cart', routerLink: ['/librarian/acquisitions'] },
                        { label: 'Inventory', icon: 'pi pi-fw pi-box', routerLink: ['/librarian/inventory'] }
                    ]
                },
                {
                    label: 'Communication',
                    items: [{ label: 'Announcements', icon: 'pi pi-fw pi-megaphone', routerLink: ['/librarian/announcements'] }]
                },
                {
                    label: 'Configuration',
                    items: [{ label: 'Borrowing Rules', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/librarian/policies'] }]
                },
                {
                    label: 'Reports',
                    items: [{ label: 'Library Reports', icon: 'pi pi-fw pi-file-pdf', routerLink: ['/librarian/reports'] }]
                }
            ];
            return;
        }

        if (this.auth.role() === 'LIBRARY_STAFF') {
            this.model = [
                {
                    label: 'Overview',
                    items: [{ label: 'Operations Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/staff/dashboard'] }]
                },
                {
                    label: 'Service Desk',
                    items: [{ label: 'Circulation Desk', icon: 'pi pi-fw pi-send', routerLink: ['/staff/desk'] }]
                },
                {
                    label: 'Catalog',
                    items: [
                        { label: 'Books & Availability', icon: 'pi pi-fw pi-book', routerLink: ['/staff/catalog'] },
                        { label: 'Inventory', icon: 'pi pi-fw pi-box', routerLink: ['/staff/inventory'] }
                    ]
                },
                {
                    label: 'Members',
                    items: [{ label: 'Member Verification', icon: 'pi pi-fw pi-id-card', routerLink: ['/staff/members'] }]
                },
                {
                    label: 'Reports',
                    items: [
                        { label: 'Daily Reports', icon: 'pi pi-fw pi-file-pdf', routerLink: ['/staff/reports'] },
                        { label: 'Confirmations', icon: 'pi pi-fw pi-envelope', routerLink: ['/staff/confirmations'] }
                    ]
                },
                {
                    label: 'Resources',
                    items: [{ label: 'E-Book Library', icon: 'pi pi-fw pi-cloud', routerLink: ['/ebooks'] }]
                }
            ];
            return;
        }

        if (this.auth.role() === 'TEACHER' || this.auth.role() === 'STUDENT') {
            this.model = [
                {
                    label: 'Overview',
                    items: [{ label: 'My Library', icon: 'pi pi-fw pi-home', routerLink: ['/my-library/dashboard'] }]
                },
                {
                    label: 'Catalog',
                    items: [
                        { label: 'Search Books', icon: 'pi pi-fw pi-search', routerLink: ['/my-library/catalog'] },
                        { label: 'E-Books & Resources', icon: 'pi pi-fw pi-book', routerLink: ['/my-library/resources'] }
                    ]
                },
                {
                    label: 'My Library',
                    items: [
                        { label: 'Borrowed Books', icon: 'pi pi-fw pi-send', routerLink: ['/my-library/loans'] },
                        { label: 'Reservations', icon: 'pi pi-fw pi-bookmark', routerLink: ['/my-library/reservations'] },
                        { label: 'Fines', icon: 'pi pi-fw pi-wallet', routerLink: ['/my-library/fines'] }
                    ]
                },
                {
                    label: 'Membership',
                    items: [
                        { label: 'Digital Card', icon: 'pi pi-fw pi-id-card', routerLink: ['/my-library/card'] },
                        { label: 'My Profile', icon: 'pi pi-fw pi-user', routerLink: ['/my-library/profile'] }
                    ]
                },
                {
                    label: 'Communication',
                    items: [{ label: 'Notifications', icon: 'pi pi-fw pi-bell', routerLink: ['/my-library/notifications'] }]
                }
            ];
            return;
        }

        this.model = [
            {
                label: 'Library Portal',
                items: [
                    { label: 'My Workspace', icon: 'pi pi-fw pi-home', routerLink: ['/portal'] },
                    { label: 'E-Book Library', icon: 'pi pi-fw pi-book', routerLink: ['/ebooks'] }
                ]
            }
        ];
    }
}
