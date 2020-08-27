import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';
describe('AlertService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AlertService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=alert.service.spec.js.map