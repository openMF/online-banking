/**
 * Credentials Model
 */
export interface Credentials {
  authenticated: boolean;
  base64EncodedAuthenticationKey?: string;
  clients?: number[];
  isSelfServiceUser?: boolean;
  officeId?: number;
  officeName?: string;
  organisationalRole?: any;
  permissions?: any;
  roles?: any;
  staffDisplayName?: string;
  userId?: number;
  username: string;
}
