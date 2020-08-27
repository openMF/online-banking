import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareAccountsListComponent } from './share-accounts-list.component';

describe('ShareAccountsListComponent', () => {
  let component: ShareAccountsListComponent;
  let fixture: ComponentFixture<ShareAccountsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShareAccountsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareAccountsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
