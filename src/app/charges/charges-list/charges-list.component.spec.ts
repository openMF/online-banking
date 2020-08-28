import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChargesListComponent } from './charges-list.component';

describe('ChargesListComponent', () => {
  let component: ChargesListComponent;
  let fixture: ComponentFixture<ChargesListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChargesListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChargesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
