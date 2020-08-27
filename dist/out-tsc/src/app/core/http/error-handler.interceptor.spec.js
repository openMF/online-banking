import { TestBed } from '@angular/core/testing';
import { ErrorHandlerInterceptor } from './error-handler.interceptor';
describe('ErrorHandlerInterceptor', () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [
            ErrorHandlerInterceptor
        ]
    }));
    it('should be created', () => {
        const interceptor = TestBed.inject(ErrorHandlerInterceptor);
        expect(interceptor).toBeTruthy();
    });
});
//# sourceMappingURL=error-handler.interceptor.spec.js.map