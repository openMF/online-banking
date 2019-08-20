import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  // Created observables and necessary subscribers in the individual components
  public configObservable = new Subject<boolean>();
  public tokenObservable = new Subject<string>();
  public spinnerObservable = new Subject<boolean>();
  public savingsChartObservable = new Subject<boolean>();
  public loansChartObservable = new Subject<boolean>();
  public sharesChartObservable = new Subject<boolean>();
  public idObservable = new Subject<string>();
  emitConfig(userStatus: boolean) {
    this.configObservable.next(userStatus);
  }
  emitTokenObservable(token: string) {
    this.tokenObservable.next(token);
  }
  emitSpinnerObservable(spin: boolean) {
    this.spinnerObservable.next(spin);
  }
  emitSavingsChartObservable(chart: boolean) {
    this.spinnerObservable.next(chart);
  }
  emitLoansChartObservable(chart: boolean) {
    this.spinnerObservable.next(chart);
  }
  emitSharesChartObservable(chart: boolean) {
    this.spinnerObservable.next(chart);
  }
  emitIdObservable(id: string) {
    this.idObservable.next(id);
  }
}
