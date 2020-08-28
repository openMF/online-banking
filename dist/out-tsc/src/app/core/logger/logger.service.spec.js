import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
describe('LoggerService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LoggerService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=logger.service.spec.js.map