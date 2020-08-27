import { TestBed } from '@angular/core/testing';
import { HttpService } from './http.service';
describe('HttpService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(HttpService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=http.service.spec.js.map