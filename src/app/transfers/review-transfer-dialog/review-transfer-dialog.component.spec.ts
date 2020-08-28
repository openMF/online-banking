import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewTransferDialogComponent } from './review-transfer-dialog.component';

describe('ReviewTransferDialogComponent', () => {
  let component: ReviewTransferDialogComponent;
  let fixture: ComponentFixture<ReviewTransferDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReviewTransferDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReviewTransferDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
