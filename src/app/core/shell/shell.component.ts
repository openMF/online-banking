import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'online-banking-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches)
    );
  /** Sets the initial state of sidenav as collapsed. Not collapsed if false. */
  sidenavCollapsed = false;


  /**
   * @param {BreakpointObserver} breakpointObserver Breakpoint Observer to detect screen size.
   * @param {ChangeDetectorRef} cdr Change Detector Ref.
   */
  constructor(private breakpointObserver: BreakpointObserver,
              private cdr: ChangeDetectorRef) { }

  /**
   * Subscribes to progress bar to update its mode.
   */
  ngOnInit() {
  }

  /**
   * Toggles the current collapsed state of sidenav according to the emitted event.
   * @param {boolean} event denotes state of sidenav
   */
  toggleCollapse($event: boolean) {
    this.sidenavCollapsed = $event;
    this.cdr.detectChanges();
  }
}
