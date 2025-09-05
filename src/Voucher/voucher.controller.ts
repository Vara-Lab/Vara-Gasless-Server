import { Controller, Get, Post, Body } from "@nestjs/common";
import { VoucherService } from "./voucher.service";
import { CreateVoucherDto } from "./dto/create_voucher.dto";
import { UpdateVoucherDto } from "./dto/update_voucher.dto";
import { VoucherDataDto } from "./dto/voucher_data.dto"; 
import { HexString } from "@gear-js/api";

@Controller("voucher")
export class VoucherController {
    constructor(
        private readonly voucherService: VoucherService
    ){}

    @Post("create-voucher")
    async createVoucher(@Body() data: CreateVoucherDto) {
        return await this.voucherService.createVoucher(data);
    }

    @Post("update-voucher")
    async updateVoucher(@Body() data: UpdateVoucherDto) {
        return await this.voucherService.updateVoucher(data);
    }

    @Get("voucher-data")
    async voucherData(@Body() data: VoucherDataDto) {
        return await this.voucherService.voucherData(
            data.userAddress as HexString,
            data.voucherId as HexString
        );
    }
}