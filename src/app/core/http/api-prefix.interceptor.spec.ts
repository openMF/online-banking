import { TestBed } from '@angular/core/testing';

import { ApiPrefixInterceptor } from './api-prefix.interceptor';

describe('ApiPrefixInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      ApiPrefixInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: ApiPrefixInterceptor = TestBed.inject(ApiPrefixInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
