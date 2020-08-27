import { __decorate } from "tslib";
import { Component, Input } from '@angular/core';
let SidenavComponent = class SidenavComponent {
    /**
     * @param {Router} router Router for navigation.
     * @param {AuthenticationService} authenticationService Authentication Service.
     */
    constructor(router, authenticationService) {
        this.router = router;
        this.authenticationService = authenticationService;
    }
    /**
     * Sets the username of the authenticated user.
     */
    ngOnInit() {
        const credentials = this.authenticationService.getCredentials();
        this.username = credentials.username;
    }
    /**
     * Logs out the authenticated user and redirects to login page.
     */
    logout() {
        this.authenticationService.logout()
            .subscribe(() => this.router.navigate(['/login'], { replaceUrl: true }));
    }
};
__decorate([
    Input()
], SidenavComponent.prototype, "sidenavCollapsed", void 0);
SidenavComponent = __decorate([
    Component({
        selector: 'online-banking-sidenav',
        templateUrl: './sidenav.component.html',
        styleUrls: ['./sidenav.component.scss']
    })
], SidenavComponent);
export { SidenavComponent };
//# sourceMappingURL=sidenav.component.js.map