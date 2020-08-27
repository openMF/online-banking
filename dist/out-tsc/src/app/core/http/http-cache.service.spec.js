import { TestBed } from '@angular/core/testing';
import { HttpCacheService } from './http-cache.service';
describe('HttpCacheService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(HttpCacheService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=http-cache.service.spec.js.map