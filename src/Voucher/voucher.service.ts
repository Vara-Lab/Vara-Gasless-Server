import { ConflictException, Injectable } from "@nestjs/common";
import { SailscallsService } from "../SailscallsService/sailscallsClient.service";
import { VouchersWorkerService } from "../VouchersWorkerService/vouchers_worker.service";
import { CreateVoucherDto } from "./dto/create_voucher.dto";
import { UpdateVoucherDto } from "./dto/update_voucher.dto";
import { HexString } from "@gear-js/api";
import { MIN_TOKENS_FOR_VOUCHER, CONTRACT_ADDRESS } from "../consts";

@Injectable()
export class VoucherService {
    constructor(
        private readonly vwService: VouchersWorkerService,
        private readonly sailscallsService: SailscallsService
    ){}

    async voucherData(userAddress: HexString, voucherId: HexString) {
        const sailscalls = this.sailscallsService.sailsInstance;
        let voucherExpired: boolean;

        try {
            voucherExpired = await sailscalls.voucherIsExpired(
                userAddress, 
                voucherId
            );
        } catch(e) {
            throw new ConflictException(e.sailsCallsError ?? "vucher addres is not linked to user address");
        }

        const voucherBalance = await sailscalls.voucherBalance(voucherId);

        return {
            message: "Voucher data",
            voucherData: {
                voucherExpired,
                voucherBalance
            }
        };
    }

    async createVoucher(data: CreateVoucherDto) {
        const { userAddress } = data;
        const vouchersId = await this.sailscallsService.sailsInstance.vouchersInContract(
            userAddress as HexString,
            CONTRACT_ADDRESS
        );

        if (vouchersId.length > 0) {
            throw new ConflictException("User already has a voucher");
        }

        const voucherId = await this.vwService.addVoucherRequest({
            userAddress: data.userAddress as HexString,
            createVoucher: true,
            addTokens: false,
            renewVoucher: false
        });

        return {
            message: "voucher created",
            voucherId
        };
    }

    async updateVoucher(data: UpdateVoucherDto) {
        const { userAddress, voucherId } = data;
        const sailscalls = this.sailscallsService.sailsInstance;
        const voucherBalance = await sailscalls.voucherBalance(voucherId as HexString);
        const addTokens = voucherBalance < MIN_TOKENS_FOR_VOUCHER;
        let voucherExpired: boolean;
        
        try {
            voucherExpired = await sailscalls.voucherIsExpired(
                userAddress as HexString, 
                voucherId as HexString
            );
        } catch(e) {
            throw new ConflictException(e.sailsCallsError ?? "vucher addres is not linked to user address");
        }

        if (!addTokens && !voucherExpired) {
            return {
                message: "Voucher dont need updated",
                voucherId
            };
        }
        
        await this.vwService.addVoucherRequest({
            userAddress: data.userAddress as HexString,
            voucherId: data.voucherId as HexString,
            createVoucher: false,
            addTokens,
            renewVoucher: voucherExpired
        });

        const updateMessage = addTokens && voucherExpired
            ? "(tokens added and renewed)"
            : addTokens
            ? "(tokens added)"
            : "(renewed)"

        return {
            message: `Voucher updated ${updateMessage}`,
            voucherId
        };
    }
}