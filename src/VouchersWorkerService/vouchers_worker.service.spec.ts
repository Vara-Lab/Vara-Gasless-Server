import { Test, TestingModule } from '@nestjs/testing';
import { VouchersWorkerService } from './vouchers_worker.service';
import { SailscallsService } from '../SailscallsService/sailscallsClient.service';
import { HexString } from '@gear-js/api';

jest.setTimeout(20_000);

jest.mock('../consts', () => ({
  ONE_TOKEN: 1,
  CONTRACT_ADDRESS: '0xCONTRACT',
  WORKER_WAITING_TIME_IN_MS: 5,
  INITIAL_TOKENS_FOR_VOUCHER: 3,
  INITIAL_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: 600,
  TOKENS_TO_ADD_TO_VOUCHER: 2,
  NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: 1200,
}));

describe('VouchersWorkerService', () => {
  let moduleRef: TestingModule;
  let service: VouchersWorkerService;

  const issueResult = {
    extrinsic: { __ex: 'issue' } as any, // SubmittableExtrinsic simulated
    voucherId: '0xNEW' as HexString,
  };

  const apiMock = {
    voucher: {
      issue: jest.fn(async (_user: string, _tokens: number, _blocks: number, _allowed: string[]) => issueResult),
      update: jest.fn(() => ({ __ex: 'update' } as any)),
    },
    tx: {
      utility: {
        forceBatch: jest.fn((_txArr: any[]) => batchMock),
      },
    },
  };

  const batchMock = {
    signAndSend: jest.fn(async (_keyring: any, cb: (r: any) => void) => {
      await Promise.resolve();
      cb({ status: { isFinalized: true, isDropped: false, isInvalid: false, isUsurped: false } });
      return Promise.resolve();
    }),
  };

  const keyringMock = { address: 'SPONSOR' } as any;

  const sailscallsServiceMock: Partial<SailscallsService> = {
    sailsInstance: {
      sailsCallsGearApi: apiMock as any,
      sponsorKeyring: keyringMock,
    } as any,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      providers: [
        VouchersWorkerService,
        { provide: SailscallsService, useValue: sailscallsServiceMock },
      ],
    }).compile();

    service = moduleRef.get(VouchersWorkerService);

    service.onModuleInit();
  });

  afterEach(async () => {
    service.onModuleDestroy();
  });

  it('createVucher - returns a new voucherId', async () => {
    const process = service.addVoucherRequest({
      userAddress: '0xUSER' as HexString,
      createVoucher: true,
      renewVoucher: false,
      addTokens: false,
    });

    const voucherId = await process;

    expect(voucherId).toBe('0xNEW');

    expect(apiMock.voucher.issue).toHaveBeenCalledWith(
      '0xUSER',
      3,
      600,
      ['0xCONTRACT'],
    );

    expect(apiMock.tx.utility.forceBatch).toHaveBeenCalled();
    const txArg = (apiMock.tx.utility.forceBatch as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg.length).toBe(1);

    expect(batchMock.signAndSend).toHaveBeenCalledWith(keyringMock, expect.any(Function));
  });

  it('updateVOucher: addTokens and returns voucherId', async () => {
    const process = service.addVoucherRequest({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xABC' as HexString,
      createVoucher: false,
      renewVoucher: false,
      addTokens: true,
    });

    const voucherId = await process;
    expect(voucherId).toBe('0xABC');

    expect(apiMock.voucher.update).toHaveBeenCalledWith(
      '0xUSER',
      '0xABC',
      { balanceTopUp: 2 },
    );
  });

  it('updateVOucher: renewVoucher and returns voucherId', async () => {
    const process = service.addVoucherRequest({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xDEF' as HexString,
      createVoucher: false,
      renewVoucher: true,
      addTokens: false,
    });

    const voucherId = await process;
    expect(voucherId).toBe('0xDEF');

    expect(apiMock.voucher.update).toHaveBeenCalledWith(
      '0xUSER',
      '0xDEF',
      { prolongDuration: 1_200 },
    );
  });

  it('updateVOucher: addTokens, renewVoucher and returns voucherId', async () => {
    const process = service.addVoucherRequest({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xXYZ' as HexString,
      createVoucher: false,
      renewVoucher: true,
      addTokens: true,
    });

    const voucherId = await process;
    expect(voucherId).toBe('0xXYZ');

    expect(apiMock.voucher.update).toHaveBeenCalledWith(
      '0xUSER',
      '0xXYZ',
      { prolongDuration: 1_200, balanceTopUp: 2 },
    );
  });

  it('createVoucher: error if addTokens or renewVoucher are true', async () => {
    const p = service.addVoucherRequest({
      userAddress: '0xUSER' as HexString,
      createVoucher: true,
      addTokens: true,
      renewVoucher: false,
    });

    await expect(p).rejects.toEqual('Bad voucher request');

    expect(apiMock.voucher.issue).not.toHaveBeenCalled();
    expect(apiMock.tx.utility.forceBatch).toHaveBeenCalled();
    const txArg = (apiMock.tx.utility.forceBatch as jest.Mock).mock.calls.pop()[0];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg.length).toBe(0);
  });
});