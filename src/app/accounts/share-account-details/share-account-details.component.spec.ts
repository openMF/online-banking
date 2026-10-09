import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareAccountDetailsComponent } from './share-account-details.component';

describe('ShareAccountDetailsComponent', () => {
  let component: ShareAccountDetailsComponent;
  let fixture: ComponentFixture<ShareAccountDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShareAccountDetailsComponent ]
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
