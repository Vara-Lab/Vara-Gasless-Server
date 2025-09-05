import { IsVaraAddress } from "./utils";

export class VoucherDataDto {
    @IsVaraAddress({ message: "Invalid user address" })
    userAddress: string;
    @IsVaraAddress({ message: "Invalid voucher address" })
    voucherId: string;
}