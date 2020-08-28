import { TestBed } from '@angular/core/testing';
import { AuthenticationInterceptor } from './authentication.interceptor';
describe('AuthenticationInterceptor', () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [
            AuthenticationInterceptor
        ]
    }));
    it('should be created', () => {
        const interceptor = TestBed.inject(AuthenticationInterceptor);
        expect(interceptor).toBeTruthy();
    });
});
//# sourceMappingURL=authentication.interceptor.spec.js.map