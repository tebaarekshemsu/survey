export class CreatePaymentDto {
	amount: number;
	phone_number: string;
	customization?: {
		title?: string;
		description?: string;
	};
}
