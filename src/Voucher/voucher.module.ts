import { Module } from "@nestjs/common";
import { VoucherController } from "./voucher.controller";
import { VoucherService } from "./voucher.service";
import { SailscallsService } from "../SailscallsService/sailscallsClient.service";
import { VouchersWorkerService } from "../VouchersWorkerService/vouchers_worker.service";

@Module({
    controllers: [VoucherController],
    providers: [
        VoucherService, 
        SailscallsService, 
        VouchersWorkerService
    ]
})
export class VoucherModule {}