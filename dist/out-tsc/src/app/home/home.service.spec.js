import { TestBed } from '@angular/core/testing';
import { HomeService } from './home.service';
describe('HomeService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(HomeService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=home.service.spec.js.map