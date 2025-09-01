import { Request, Response  } from 'express';
import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Res ,UseGuards, Query } from '@nestjs/common';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

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
   * @param tx_ref_body - Transaction reference from the request body.
   */
  @Get('callback')
  @ApiOperation({ summary: 'Handle payment callback from Chapa provider' })
  @ApiResponse({ status: 200, description: 'Payment callback processed successfully.' })
  chapaCallback(@Query('tx_ref') tx_ref: string, @Body('tx_ref') tx_ref_body: string) {
    const result = this.paymentService.handleChapaCallback(tx_ref || tx_ref_body);
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
}
