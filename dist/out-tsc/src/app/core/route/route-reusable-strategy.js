/** Angular Imports */
import { RouteReuseStrategy } from '@angular/router';
/**
 * A route strategy allowing for explicit route reuse.
 * Used as a workaround for https://github.com/angular/angular/issues/18374
 * To reuse a given route, add `data: { reuse: true }` to the route definition.
 */
export class RouteReusableStrategy extends RouteReuseStrategy {
    shouldDetach(route) {
        return false;
    }
    store(route, detachedTree) { }
    shouldAttach(route) {
        return false;
    }
    retrieve(route) {
        return null;
    }
    shouldReuseRoute(future, curr) {
        return (future.routeConfig === curr.routeConfig) || future.data.reuse;
    }
}
//# sourceMappingURL=route-reusable-strategy.js.map