import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { SailscallsService } from './SailscallsService/sailscallsClient.service';
import { VouchersWorkerService } from './VouchersWorkerService/vouchers_worker.service';
import { VoucherModule } from './Voucher/voucher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    VoucherModule
  ],
  controllers: [AppController],
  providers: [SailscallsService, VouchersWorkerService],
})
export class AppModule {}
