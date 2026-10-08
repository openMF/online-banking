/**
 * Interface representing a page of results from the Fineract API.
 */
export interface Page<T> {
  totalFilteredRecords: number;
  pageItems: T[];
}

/**
 * Interface representing the basic client data returned in the list.
 */
export interface ClientData {
  id: number;
  accountNo: string;
  status: {
    id: number;
    code: string;
    value: string;
  };
  active: boolean;
  activationDate?: number[];
  firstname: string;
  lastname: string;
  displayName: string;
  officeId: number;
  officeName: string;
}

/**
 * Interface representing detailed client profile information.
 */
export interface ClientDetails extends ClientData {
  mobileNo?: string;
  emailAddress?: string;
  dateOfBirth?: number[];
  clientType?: {
    id: number;
    code: string;
    value: string;
  };
  clientClassification?: {
    id: number;
    code: string;
    value: string;
  };
}
