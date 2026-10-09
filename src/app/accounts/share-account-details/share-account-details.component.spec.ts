import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ShareAccountDetailsComponent } from './share-account-details.component';
import { AccountsService } from '../accounts.service';

describe('ShareAccountDetailsComponent', () => {
  let component: ShareAccountDetailsComponent;
  let fixture: ComponentFixture<ShareAccountDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, HttpClientTestingModule ],
      declarations: [ ShareAccountDetailsComponent ],
      providers: [
        {
          provide: AccountsService,
          useValue: {
            getShareAccount: jasmine.createSpy('getShareAccount')
          }
        }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareAccountDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
