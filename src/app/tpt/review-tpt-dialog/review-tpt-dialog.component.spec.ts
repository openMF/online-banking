import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewTptDialogComponent } from './review-tpt-dialog.component';

describe('ReviewTptDialogComponent', () => {
  let component: ReviewTptDialogComponent;
  let fixture: ComponentFixture<ReviewTptDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReviewTptDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReviewTptDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
