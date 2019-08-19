import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  public configObservable = new Subject<boolean>();

  emitConfig(userStatus: boolean) {
    this.configObservable.next(userStatus);
  }
  constructor() { }
}
