import { __decorate } from "tslib";
/** Angular Imports */
import { Component } from '@angular/core';
let LoginComponent = class LoginComponent {
    /**
     * @param {AlertService} alertService Alert Service
     * @param {Router} router Navigation Router
     */
    constructor(alertService, router) {
        this.alertService = alertService;
        this.router = router;
        /** Trues if reset password component is on */
        this.resetPassword = false;
    }
    ngOnInit() {
        this.alert$ = this.alertService.alertEvent.subscribe((alertEvent) => {
            const alertType = alertEvent.type;
            if (alertType === 'Authentication Success') {
                console.log('Authenctication success');
                this.router.navigate(['/home'], { replaceUrl: true });
            }
            else if (alertType === 'Password Reset Required') {
                this.resetPassword = true;
            }
        });
    }
};
LoginComponent = __decorate([
    Component({
        selector: 'online-banking-login',
        templateUrl: './login.component.html',
        styleUrls: ['./login.component.css']
    })
], LoginComponent);
export { LoginComponent };
//# sourceMappingURL=login.component.js.map