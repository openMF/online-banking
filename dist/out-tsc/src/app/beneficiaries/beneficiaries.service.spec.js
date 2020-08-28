import { TestBed } from '@angular/core/testing';
import { BeneficiariesService } from './beneficiaries.service';
describe('BeneficiariesService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(BeneficiariesService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=beneficiaries.service.spec.js.map