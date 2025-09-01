import { WithdrawDto } from './dto/withdraw.dto';
import { Injectable, Inject, HttpException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async fund(createPaymentDto: CreatePaymentDto , userId: string) {

    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: {
      name: true,
      email: true
    }});

    // 1. Create payment record with pending status
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type: 'fund',
        amount: createPaymentDto.amount,
        currency: 'ETB',
        status: 'pending',
        metadata: JSON.parse(JSON.stringify(createPaymentDto)),
      },
    });

    // 2. Prepare Chapa API payload
    const tx_ref = `TX-${payment.id}`;
    const [firstName, lastName] = user?.name.split(' ') || ['Unknown', 'User'];
    const chapaPayload = {
      amount: createPaymentDto.amount,
      currency: 'ETB',
      email: user?.email,
      first_name: firstName,
      last_name: lastName,
      phone_number: createPaymentDto.phone_number,
      tx_ref,
      callback_url: 'https://yourdomain.com/api/payment/callback',
      return_url: 'https://yourdomain.com/payment/return',
      customization: createPaymentDto.customization,
    };

    // 3. Call Chapa API
    try {
      const res = await axios.post(
        'https://api.chapa.co/v1/transaction/initialize',
        chapaPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.data && res.data.status === 'success') {
        // Optionally update payment with tx_ref or chapa id
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { transactionId: tx_ref },
        });
        return { checkout_url: res.data.data.checkout_url };
      } else {
        throw new HttpException(res.data, 400);
      }
    } catch (error) {
      throw new HttpException(error.response?.data || error.message, 500);
    }
  }

  async handleChapaCallback(tx_ref: string): Promise<{ success: boolean; message: string; error?: any; status?: number }> {
    // 1. Verify with Chapa
    try {
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
    // 1. Check if user's wallet exists and has sufficient balance
    let wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet || wallet.balance < withdrawDto.amount) {
      throw new HttpException('Insufficient funds', 400);
    }

    // 2. Create a payment record for withdrawal in pending status
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type: 'withdraw',
        amount: withdrawDto.amount,
        currency: withdrawDto.currency || 'ETB',
        status: 'pending',
        metadata: JSON.parse(JSON.stringify(withdrawDto)),
      },
    });

    // 3. Decrease wallet balance immediately
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: withdrawDto.amount } },
    });

    // 4. Prepare Chapa transfer payload
    const payload = {
      account_name: withdrawDto.account_name,
      account_number: withdrawDto.account_number,
      amount: String(withdrawDto.amount),
      currency: withdrawDto.currency || 'ETB',
      reference: withdrawDto.reference || `withdraw-${Date.now()}`,
      bank_code: withdrawDto.bank_code,
    };

    // 5. Call Chapa Transfer API
    try {
      const res = await axios.post(
        'https://api.chapa.co/v1/transfers',
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // If transfer is successful, update payment status
      if (res.data && res.data.status === 'success') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'success' },
        });
        return res.data;
      } else {
        // If transfer fails, roll back wallet deduction and mark payment as failed
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: withdrawDto.amount } },
        });
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        throw new HttpException(res.data, 400);
      }
    } catch (error) {
      // Rollback wallet balance in case of error
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: withdrawDto.amount } },
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
      throw new HttpException(error.response?.data || error.message, 500);
    }
  }

  async refund(refundDto: any, userId: string) {
    // Check that the creator has a wallet
    const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet) {
      throw new Error('Wallet not found for the creator');
    }

    // Retrieve active surveys (assuming active surveys are those with status 'pending' or 'live')
    const activeSurveys = await this.prisma.survey.findMany({
      where: {
        creatorId: userId,
        status: { in: ['pending', 'live'] }
      }
    });

    // Sum the rewards of all active surveys
    const totalRewards = activeSurveys.reduce((sum, survey) => sum + survey.reward, 0);

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
      reference: refundDto.reference || `refund-${Date.now()}`,
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
}
