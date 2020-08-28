import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable, EventEmitter } from '@angular/core';
/**
 * Alert service.
 */
let AlertService = class AlertService {
    /**
     * Initializes alert event.
     */
    constructor() {
        this.alertEvent = new EventEmitter();
    }
    /**
     * Emits an alert event.
     * @param {Alert} alertEvent Alert event.
     */
    alert(alertEvent) {
        this.alertEvent.emit(alertEvent);
    }
};
AlertService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], AlertService);
export { AlertService };
//# sourceMappingURL=alert.service.js.map