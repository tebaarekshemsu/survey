export class WithdrawDto {
  account_name: string;
  account_number: string;
  amount: number;
  currency?: string; // default ETB
  reference?: string;
  bank_code: string;
}
