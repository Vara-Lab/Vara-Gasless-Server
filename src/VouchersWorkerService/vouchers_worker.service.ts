import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SailscallsService } from '../SailscallsService/sailscallsClient.service';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { randomUUID } from 'crypto';
import { HexString } from '@gear-js/api';
import { KeyringPair } from "@polkadot/keyring/types";
import {
  ONE_TOKEN,
  CONTRACT_ADDRESS,
  WORKER_WAITING_TIME_IN_MS,
  INITIAL_TOKENS_FOR_VOUCHER,
  INITIAL_VOUCHER_EXPIRATION_TIME_IN_BLOCKS,
  TOKENS_TO_ADD_TO_VOUCHER,
  NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS
} from '../consts';

type ProssecedTXResult = Promise<[SubmittableExtrinsic<"promise", ISubmittableResult>[], [string, HexString][]]>;

interface VoucherRequestData {
  id: string;
  request: VoucherRequest;
}

interface VoucherRequest {
  userAddress: HexString;
  voucherId?: HexString;
  addTokens: boolean;
  renewVoucher: boolean;
  createVoucher: boolean;
}

@Injectable()
export class VouchersWorkerService implements OnModuleInit, OnModuleDestroy {
  private requestsQueue: VoucherRequestData[] = [];
  private pendingRequests = new Map<string, { resolve: (voucherId: HexString) => void, reject: (e: any) => void }>();
  private running = true;

  constructor(
    private readonly sailscallsService: SailscallsService
  ) { }

  onModuleInit() { 
    this.workerLoop();
    console.log('✅ Voucher worker has been initialized.');

  }

  onModuleDestroy() { 
    console.log('✅ Voucher worker has been destroyed.');
    this.running = false; 
  }

  addVoucherRequest(voucherRequest: VoucherRequest): Promise<HexString> {
    const id = randomUUID();
    const requestVoucherData: VoucherRequestData = {
      id,
      request: voucherRequest
    };

    this.requestsQueue.push(requestVoucherData);

    const promise: Promise<HexString> = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    return promise;
  }

  private prepareTx(): ProssecedTXResult {
    return new Promise(async resolve => {
      const requestTxProsseced: [string, HexString][] = [];
      const tx: SubmittableExtrinsic<"promise", ISubmittableResult>[] = [];
      const api = this.sailscallsService.sailsInstance.sailsCallsGearApi;
      const currentRequestsQueue = this.requestsQueue.splice(0, this.requestsQueue.length);

      for (const voucherRequest of currentRequestsQueue) {
        const { id, request } = voucherRequest;
        const {
          userAddress,
          createVoucher,
          renewVoucher,
          addTokens,
          voucherId
        } = request;

        if (createVoucher && (renewVoucher || addTokens)) {
          const temp = this.pendingRequests.get(id);
          temp?.reject("Bad voucher request");

          continue;
        };

        if (createVoucher) {
          const voucherIssue = await api.voucher.issue(
            userAddress,
            INITIAL_TOKENS_FOR_VOUCHER * ONE_TOKEN,
            INITIAL_VOUCHER_EXPIRATION_TIME_IN_BLOCKS,
            [CONTRACT_ADDRESS]
          );
          tx.push(voucherIssue.extrinsic);
          requestTxProsseced.push([id, voucherIssue.voucherId])
        }

        if (!voucherId || (!addTokens && !renewVoucher)) continue;

        const newVoucherData = addTokens && renewVoucher
          ? (
            {
              prolongDuration: NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS,
              balanceTopUp: TOKENS_TO_ADD_TO_VOUCHER * ONE_TOKEN
            }
          )
          : addTokens
            ? { balanceTopUp: TOKENS_TO_ADD_TO_VOUCHER * ONE_TOKEN }
            : { prolongDuration: NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS };

        const voucherUpdate = api.voucher.update(
          userAddress,
          voucherId,
          newVoucherData
        );

        tx.push(voucherUpdate);
        requestTxProsseced.push([id, voucherId]);
      }

      resolve([tx, requestTxProsseced])
    });
  }

  private async processVoucherRequests() {
    const [tx, requestTxProsseced] = await this.prepareTx();
    const api = this.sailscallsService.sailsInstance.sailsCallsGearApi;
    const keyring = this.sailscallsService.sailsInstance.sponsorKeyring;
    const batch = api.tx.utility.forceBatch(tx);

    if (!keyring) {
      throw new Error("Sponsor account is not set");
    }

    await this.submitBatch(keyring, batch);
    
    for (const request of requestTxProsseced) {
      const temp = this.pendingRequests.get(request[0]);
      temp?.resolve(request[1]);
      this.pendingRequests.delete(request[0]);
    }
  }

  private async workerLoop() {
    while (this.running) {
      if (this.requestsQueue.length === 0) {
        await this.sleep(WORKER_WAITING_TIME_IN_MS);
        continue;
      }

      await this.processVoucherRequests();
    }
  }

  private async submitBatch(keyring: KeyringPair, batch: SubmittableExtrinsic<"promise", ISubmittableResult>) {
    return new Promise<void>(async (resolve, reject) => {
      await batch.signAndSend(keyring, ({status}) => {
        if (status.isFinalized) {
          resolve();
        } else if (status.isDropped || status.isInvalid || status.isUsurped) {    
          reject("❌Transaction fail!!");
        }
      });
    });
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}
