import { TestBed } from '@angular/core/testing';
import { AccountsService } from './accounts.service';
describe('AccountsService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AccountsService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=accounts.service.spec.js.map