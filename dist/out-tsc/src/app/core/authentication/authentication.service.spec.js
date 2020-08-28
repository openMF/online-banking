import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from './authentication.service';
describe('AuthenticationService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AuthenticationService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=authentication.service.spec.js.map