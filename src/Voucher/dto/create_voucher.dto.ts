import { HexString } from "@gear-js/api";
import { IsVaraAddress } from "./utils";

export class CreateVoucherDto {
    @IsVaraAddress({ message: "Invalid user address" })
    userAddress: string;
}