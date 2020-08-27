import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
let ShellComponent = class ShellComponent {
    /**
     * @param {BreakpointObserver} breakpointObserver Breakpoint Observer to detect screen size.
     * @param {ChangeDetectorRef} cdr Change Detector Ref.
     */
    constructor(breakpointObserver, cdr) {
        this.breakpointObserver = breakpointObserver;
        this.cdr = cdr;
        this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
            .pipe(map(result => result.matches));
        /** Sets the initial state of sidenav as collapsed. Not collapsed if false. */
        this.sidenavCollapsed = false;
    }
    /**
     * Subscribes to progress bar to update its mode.
     */
    ngOnInit() {
    }
    /**
     * Toggles the current collapsed state of sidenav according to the emitted event.
     * @param {boolean} event denotes state of sidenav
     */
    toggleCollapse($event) {
        this.sidenavCollapsed = $event;
        this.cdr.detectChanges();
    }
};
ShellComponent = __decorate([
    Component({
        selector: 'online-banking-shell',
        templateUrl: './shell.component.html',
        styleUrls: ['./shell.component.scss']
    })
], ShellComponent);
export { ShellComponent };
//# sourceMappingURL=shell.component.js.map