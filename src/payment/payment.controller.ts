import { Controller, Get, Post, Body, UseGuards, Query, Headers } from '@nestjs/common';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApproveWithdrawDto } from './dto/approve.dto';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import constants from 'constants';

/**
 * PaymentController handles all payment-related endpoints.
 * It provides endpoints for callback, funding, withdrawal, refund, and retrieving payments.
 */
@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Handles the payment callback from the Chapa provider.
   * Accepts a transaction reference from either query or request body.
   *
   * @param tx_ref - Transaction reference from query parameters.
   * @param req - The entire request object.
   */
  @Get('callback')
  @ApiOperation({ summary: 'Handle payment callback from Chapa provider' })
  @ApiResponse({ status: 200, description: 'Payment callback processed successfully.' })
  chapaCallback(
    @Body() body: any,
    @Headers() headers: any,
  ) {
  const tx_ref = body.trx_ref;
    console.log('Transaction Reference:', tx_ref);
    return this.paymentService.handleChapaCallback(tx_ref);
  }

  /**
   * Initiates a funding operation for a creator.
   *
   * @param createPaymentDto - Payload containing funding information.
   * @param session - User session containing the creator's user ID.
   * @returns The result of the funding operation.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Post('fund')
  @ApiOperation({ summary: 'Initiates a funding operation for a creator.' })
  @ApiBody({
    type: CreatePaymentDto,
    description: 'Payload for funding operation.',
    examples: {
      example1: {
        value: {
          amount: 150,
          currency: 'ETB',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '0123456789',
          tx_ref: 'tx_001',
          callback_url: 'https://example.com/callback',
          return_url: 'https://example.com/return',
          customization: {
            title: 'Fund Payment',
            description: 'Initiate funding process'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Payment funded successfully.' })
  create(@Body() createPaymentDto: CreatePaymentDto, @Session() session: UserSession) {
    // Ensure amount is a number
    createPaymentDto.amount = parseFloat(createPaymentDto.amount as unknown as string);
    return this.paymentService.fund(createPaymentDto, session.session.userId);
  }

  /**
   * Initiates a withdrawal operation for a user.
   *
   * @param withdrawDto - Payload containing withdrawal details.
   * @param session - User session containing the user's user ID.
   * @returns The result of the withdrawal operation.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @Post('withdraw')
  @ApiOperation({ summary: 'Initiates a withdrawal operation for a user.' })
  @ApiBody({
    type: Object,
    description: 'Payload for withdrawal operation.',
    examples: {
      example1: {
        value: {
          account_name: 'User Name',
          account_number: '12345678',
          amount: 50,
          currency: 'ETB',
          reference: 'ref001',
          bank_code: '001'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Withdrawal processed successfully.' })
  withdraw(@Body() withdrawDto, @Session() session: UserSession) {
    return this.paymentService.withdraw(withdrawDto, session.session.userId);
  }

  /**
   * Processes a refund request for a creator.
   *
   * @param refundDto - Payload containing refund details.
   * @param session - User session containing the creator's user ID.
   * @returns The result of the refund operation.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('creator')
  @Post('refund')
  @ApiOperation({ summary: 'Processes a refund request for a creator.' })
  @ApiBody({
    type: Object,
    description: 'Payload for refund operation.',
    examples: {
      example1: {
        value: {
          transactionId: 'tx_001',
          amount: 75,
          reason: 'Product return'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Refund processed successfully.' })
  refund(@Body() refundDto, @Session() session: UserSession) {
    return this.paymentService.refund(refundDto, session.session.userId);
  }

  /**
   * Approves a payment transfer.
   *
   * @param approveDto - Payload containing approval details.
   * @param session - User session containing the user's user ID.
   * @returns The result of the approval operation.
   */
  @Post('approve')
  @ApiOperation({ summary: 'Approves a payment transfer.' })
  @ApiBody({
    type: Object,
    description: 'Payload for approval operation. Example: { transferId: "tx_123" }'
  })
  @ApiResponse({ status: 200, description: 'Payment approved successfully.' })
  async approvePayment(@Body() approveDto: ApproveWithdrawDto,) {
    return await this.paymentService.approvePayment(approveDto);
  }

  /**
   * Retrieves all payment records.
   *
   * @returns A list of all payment records.
   */
  @Get()
  @ApiOperation({ summary: 'Retrieves all payment records.' })
  @ApiResponse({ status: 200, description: 'List of all payment records.' })
  findAll() {
    return this.paymentService.findAll();
  }

  /**
   * Retrieves the list of available banks from Chapa.
   *
   * @returns A list of available banks.
   */
  @Get('banks')
  @ApiOperation({ summary: 'Retrieves all available banks from Chapa.' })
  @ApiResponse({ status: 200, description: 'List of available banks.' })
  async getBanks() {
    return await this.paymentService.listBanks();
  }

  /**
   * Chapa server approval webhook.
   *
   * @param body - The request body containing approval information.
   * @param signature - The signature header for request validation.
   * @returns The result of the server approval operation.
   */
  @Post('server-approval')
  @ApiOperation({ summary: 'Chapa server approval webhook' })
  async serverApproval(
    @Body() body: any,
    @Headers('chapa-signature') signature: string,
  ) {
    return await this.paymentService.serverApproval(body, signature);
  }
}
