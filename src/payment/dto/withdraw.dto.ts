export class WithdrawDto {
  account_name: string;
  account_number: string;
  amount: number;
  currency?: string; // default ETB
  bank_code: string;
}
