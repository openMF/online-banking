/** Custom Components */
import { ShellComponent } from '../shell/shell.component';
/** Custom Guards */
import { AuthenticationGuard } from '../authentication/authentication.guard';
/**
 * Provides helper methods to create routes.
 */
export class Route {
    /**
     * Creates routes using the shell component and authentication.
     * @param routes The routes to add.
     * @return {
     */
    static withShell(routes) {
        return {
            path: '',
            component: ShellComponent,
            children: routes,
            canActivate: [AuthenticationGuard],
            // Reuse ShellComponent instance when navigating between child views
            data: { reuse: true }
        };
    }
}
//# sourceMappingURL=route.service.js.map