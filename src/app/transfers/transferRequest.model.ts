/**
 * A Transfer Request Model adhered from the API Docs
 */
export interface TransferRequest {
fromOfficeId: number;
fromClientId: number;
fromAccountType: number;
fromAccountId: number;
toOfficeId: number;
toClientId: number;
toAccountType: number;
toAccountId: number;
dateFormat: string;
locale: string;
transferDate: string;
transferAmount: number;
transferDescription: string;
}
