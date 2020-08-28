import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TptComponent } from './tpt.component';

describe('TptComponent', () => {
  let component: TptComponent;
  let fixture: ComponentFixture<TptComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TptComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
