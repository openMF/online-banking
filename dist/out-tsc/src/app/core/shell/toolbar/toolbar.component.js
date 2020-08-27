import { __decorate } from "tslib";
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
let ToolbarComponent = class ToolbarComponent {
    /**
     * @param {Router} router Router
     * @param {AuthenticationService} authenticationService Authentication Service
     */
    constructor(breakpointObserver, router, authenticationService) {
        this.breakpointObserver = breakpointObserver;
        this.router = router;
        this.authenticationService = authenticationService;
        /** Subscription to breakpoint observer for handset. */
        this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
            .pipe(map(result => result.matches));
        /** Side Navigation Collapse Event */
        this.sidenavCollapsed = false;
        /** Sidenav Collapse Event emitter */
        this.collapse = new EventEmitter();
    }
    ngOnInit() {
        this.isHandset$.subscribe(isHandset => {
            if (isHandset && this.sidenavCollapsed) {
                this.toggleSidenavCollapse(false);
            }
        });
    }
    /**
     * Reverse the current state of side navigation
     */
    toggleSidenav() {
        this.sidenav.toggle();
    }
    /**
     * Toggles the current collapsed state of sidenav.
     */
    toggleSidenavCollapse(sidenavCollapsed) {
        this.sidenavCollapsed = sidenavCollapsed || !this.sidenavCollapsed;
        this.collapse.emit(this.sidenavCollapsed);
    }
    /**
     * Logs out the user and redirects to login page
     */
    logout() {
        this.authenticationService.logout()
            .subscribe(() => this.router.navigate(['/login'], { replaceUrl: true }));
    }
};
__decorate([
    Input()
], ToolbarComponent.prototype, "sidenav", void 0);
__decorate([
    Output()
], ToolbarComponent.prototype, "collapse", void 0);
ToolbarComponent = __decorate([
    Component({
        selector: 'online-banking-toolbar',
        templateUrl: './toolbar.component.html',
        styleUrls: ['./toolbar.component.css'],
        animations: [
            trigger('fadeInOut', [
                transition(':enter', [
                    style({ opacity: 0 }),
                    animate(500, style({ opacity: 1 }))
                ]),
                transition(':leave', [
                    animate(500, style({ opacity: 0 }))
                ])
            ])
        ]
    })
], ToolbarComponent);
export { ToolbarComponent };
//# sourceMappingURL=toolbar.component.js.map