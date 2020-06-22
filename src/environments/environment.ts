// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  fineractPlatformTenantId: 'mobile',  // For connecting to server running elsewhere update the tenant identifier
  baseApiUrl: 'https://mobile.mifos.io',  // For connecting to server running elsewhere update the base API URL
  apiProvider: '/fineract-provider/api',
  apiVersion: '/v1',
  serverUrl: 'https://mobile.mifos.io/fineract-provider/api/v1',
  selfServiceRoleId: 2
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
