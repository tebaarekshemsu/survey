import { WithdrawDto } from './dto/withdraw.dto';
import { Injectable, Inject, HttpException, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApproveWithdrawDto } from './dto/approve.dto';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a unique transaction key.
   * @returns A unique transaction key as a string, e.g. "tx_...".
   */
  generateTransactionKey(): string {
    // Use a UUID without dashes (32 chars) and prefix with 'tx_' (3 chars) => 35 chars total.
    // Slice to 36 as a safety-net to guarantee the reference meets Chapa's 36-char limit.
    const id = uuidv4().replace(/-/g, '');
    const tx = `tx_${id}`;
    return tx.slice(0, 36);
  }

  async fund(createPaymentDto: CreatePaymentDto, userId: string) {
    // normalize & validate amount again on the service layer
    const amount = Number(createPaymentDto.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Invalid amount provided for funding.');
    }

    const tx_ref = this.generateTransactionKey();

    // 1. Create payment record with pending status and connect the user relation
    const payment = await this.prisma.payment.create({
      data: {
        // connect the existing user record (Prisma expects relation)
        user: { connect: { id: userId } },
        type: 'fund',
        amount,
        currency: 'ETB',
        transactionId: tx_ref,
        status: 'pending',
        metadata: {
          amount
        },
        // ...other fields as needed...
      },
    });

    // 2. Prepare Chapa API payload
    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: {
      name: true,
      email: true
    }});

    const [firstName, lastName] = user?.name.split(' ') || ['Unknown', 'User'];
    const chapaPayload = {
      amount: createPaymentDto.amount,
      currency: 'ETB',
      email: user?.email,
      first_name: firstName,
      last_name: lastName,
      phone_number: createPaymentDto.phone_number,
      tx_ref,
      callback_url: process.env.CALL_BACK_URL,
      return_url: process.env.RETURN_URL,
      customization: createPaymentDto.customization,
    };

    // 3. Call Chapa API
    try {
      // Call Chapa API and return only the response data to avoid circular references
      const response = await axios.post(
        'https://api.chapa.co/v1/transaction/initialize',
        chapaPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new HttpException(error.response?.data || error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleChapaCallback(tx_ref: string): Promise<{ success: boolean; message: string; error?: any; status?: number }> {
    // 1. Verify with Chapa
    try {
      console.log("incomming")
      const verifyRes = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          },
        },
      );
      const data = verifyRes.data?.data;
      if (verifyRes.data.status === 'success' && data.status === 'success') {
        // 2. Find payment by transactionId
        const payment = await this.prisma.payment.findFirst({ where: { transactionId: tx_ref } });
        if (!payment) {
          return { success: false, message: 'Payment not found for tx_ref', status: 404 };
        }
        // 3. Update payment status to success
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'success' },
        });
        // 4. Update wallet balance
        // Find wallet by userId
        let wallet = await this.prisma.wallet.findFirst({ where: { userId: payment.userId } });
        if (!wallet) {
          // Create wallet if not exists
          wallet = await this.prisma.wallet.create({
            data: {
              userId: payment.userId,
              balance: payment.amount,
              totalEarn: payment.amount,
              totalSpend: 0,
            },
          });
        } else {
          // Update wallet if exists
          await this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: payment.amount },
              totalEarn: { increment: payment.amount },
            },
          });
        }
        return { success: true, message: 'Payment successful and wallet updated.' };
      } else {
        // Mark payment as failed
        await this.prisma.payment.updateMany({
          where: { transactionId: tx_ref },
          data: { status: 'failed' },
        });
        return { success: false, message: 'Payment failed.' };
      }
    } catch (error) {
      return { success: false, message: 'Verification error', error: error.response?.data || error.message, status: 500 };
    }
  }
  
 async withdraw(withdrawDto: WithdrawDto, userId: string) {

  const tx_ref = this.generateTransactionKey();
    // 1. Check if user's wallet exists and has sufficient balance
    let wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet || wallet.balance < withdrawDto.amount) {
      throw new HttpException('Insufficient funds', 400);
    }

    // 2. Create a payment record for withdrawal in pending status
    const payment = await this.prisma.payment.create({
      data: {
        // switch from scalar userId to a relation connect
        user: { connect: { id: userId } },
        type: 'withdraw',
        amount: withdrawDto.amount,
        currency: 'ETB',
        status: 'pending',
        transactionId: tx_ref,
        metadata: JSON.parse(JSON.stringify(withdrawDto)),
      },
    });

    // 2.5 Reserve funds immediately: decrement balance and increment totalSpend
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: withdrawDto.amount },
      },
    });

  // 3. Prepare Chapa transfer payload (wallet will be finalized on success or rolled back on failure)
    const payload = {
      account_name: withdrawDto.account_name,
      account_number: withdrawDto.account_number,
      amount: String(withdrawDto.amount),
      currency: 'ETB',
      reference: tx_ref,
      bank_code: withdrawDto.bank_code,
    };

    // 4. Call Chapa Transfer API
    try {
      const res = await axios.post(
        'https://api.chapa.co/v1/transfers',
        payload,
        { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, 'Content-Type': 'application/json' } },
      );

      // If Chapa indicates success -> finalize payment as success
      if (res.data && res.data.status === 'success') {
        await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'success' } });
        return { payment, chapaResponse: res.data };
      }

      // Otherwise treat as failed: mark payment failed and rollback wallet reservation
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: withdrawDto.amount },        },
      });

      return { payment, chapaResponse: res.data };
    } catch (error) {
      // Rollback wallet reservation on error and mark payment as failed
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } }).catch(() => {});
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: withdrawDto.amount },
        },
      }).catch(() => {});

      throw new HttpException(error.response?.data || error.message, 500);
    }
  }

  async refund(refundDto: any, userId: string) {
    // Check that the creator has a wallet
    const tx_ref = this.generateTransactionKey();
    const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet) {
      throw new Error('Wallet not found for the creator');
    }

    // Retrieve active surveys (assuming active surveys are those with status 'pending' or 'live')
    const activeSurveys = await this.prisma.survey.findMany({
      where: {
        creatorId: userId,
        status: { in: ['live'] }
      }
    });

    // Sum the rewards of all active surveys
    const totalRewards = activeSurveys.reduce((sum, survey) => sum + survey.reward * (survey.maxParticipant - survey.participant), 0);

    // Ensure wallet balance covers the rewards committed
    if (wallet.balance < totalRewards) {
      throw new Error('Insufficient wallet balance: active survey rewards exceed current balance');
    }

    // Determine refundable amount (excess funds after accounting for active survey rewards)
    const refundAmount = wallet.balance - totalRewards;

    if (refundAmount <= 0) {
      throw new Error('No refundable amount available');
    }

    // Create a refund payment record with pending status
    const refundPayment = await this.prisma.payment.create({
      data: {
        userId,
        type: 'refund',
        amount: refundAmount,
        currency: 'ETB',
        status: 'pending',
        transactionId: tx_ref,
        metadata: refundDto.metadata || {}
      }
    });

    // Deduct the refund amount from the wallet immediately
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: wallet.balance - refundAmount,
        totalSpend: wallet.totalSpend + refundAmount
      }
    });

    // Prepare Chapa transfer payload using refundDto account details
    const payload = {
      account_name: refundDto.account_name,
      account_number: refundDto.account_number,
      amount: String(refundAmount),
      currency: 'ETB',
      reference: tx_ref,
      bank_code: refundDto.bank_code
    };

    try {
      // Initiate refund transfer
      const transferRes = await axios.post(
        'https://api.chapa.co/v1/transfers',
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!(transferRes.data && transferRes.data.status === 'success')) {
        throw new Error('Transfer initiation failed');
      }

      // Verify the refund transfer using Chapa's verify-transfers endpoint
      const verifyUrl = `https://api.chapa.co/v1/transfer/verify-transfers/${payload.reference}`;
      const verifyRes = await axios.get(verifyUrl, {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`
        }
      });

      if (verifyRes.data && verifyRes.data.status === 'success') {
        await this.prisma.payment.update({
          where: { id: refundPayment.id },
          data: { status: 'success' }
        });
        return { message: `Refund successful: ${refundAmount} ETB refunded` };
      } else {
        throw new Error('Refund transfer verification failed');
      }
    } catch (error) {
      // Rollback wallet deduction if refund fails
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: refundAmount }, totalSpend: { decrement: refundAmount } }
      });
      await this.prisma.payment.update({
        where: { id: refundPayment.id },
        data: { status: 'failed' }
      });
      throw new Error(error.response?.data || error.message);
    }
  }

  async listBanks() {
    const response = await axios.get('https://api.chapa.co/v1/banks', {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`
      }
    });
    return response.data;
  }

  async approvePayment(approveDto: ApproveWithdrawDto) {
    const pendingWithdraw = await this.findPendingWithdraw(approveDto.reference);
    if (!pendingWithdraw) {
      throw new HttpException('No pending withdrawal found.', 400);
    }
    await this.prisma.payment.update({
      where: { id: pendingWithdraw.id },
      data: { status: 'success' },
    });
    return { status: 200, message: 'Payment approved successfully.' };
  }

  async findPendingWithdraw(transferId: string) {
    // Find a pending withdraw payment matching the transaction reference and user
    return await this.prisma.payment.findFirst({
      where: {
        transactionId: transferId,
        type: 'withdraw',
        status: 'pending',
      },
    });
  }

  findAll() {
    return this.prisma.payment.findMany();
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  update(id: string, updatePaymentDto: UpdatePaymentDto) {
    return this.prisma.payment.update({ where: { id }, data: updatePaymentDto });
  }

  remove(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }

  async serverApproval(body: any, signature: string) {
    const secret = process.env.CHAPA_APPROVAL_SECRET;
    if (!secret) {
      throw new HttpException('Missing CHAPA_APPROVAL_SECRET', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      throw new HttpException('Invalid signature', HttpStatus.BAD_REQUEST);
    }

    // Find the pending payment by transactionId
    const existing = await this.prisma.payment.findFirst({
      where: { transactionId: body.id },
    });
    if (!existing) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
    // Update payment status based on webhook
    const payment = await this.prisma.payment.update({
      where: { id: existing.id },
      data: { status: body.status === 'success' ? 'success' : 'failed' },
    });

    // Adjust wallet only on successful transfer
    if (body.status === 'success') {
      // Find wallet by userId, then update by id
      const wallet = await this.prisma.wallet.findFirst({ where: { userId: payment.userId } });
      if (!wallet) {
        throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
      }
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: payment.amount },
          totalSpend: { increment: payment.amount },
        },
      });
    }

    return { status: 'approved' };
  }
}
