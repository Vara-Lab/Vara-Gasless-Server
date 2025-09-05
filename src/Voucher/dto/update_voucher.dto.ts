import { IsVaraAddress } from "./utils";

export class UpdateVoucherDto {
    @IsVaraAddress({ message: "Invalid user address" })
    userAddress: string;
    @IsVaraAddress({ message: "Invalid voucher id" })
    voucherId: string
}