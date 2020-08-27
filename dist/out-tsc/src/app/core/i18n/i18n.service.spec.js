import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
describe('I18nService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(I18nService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
//# sourceMappingURL=i18n.service.spec.js.map