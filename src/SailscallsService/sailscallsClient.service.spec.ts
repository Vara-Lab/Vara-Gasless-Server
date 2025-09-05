import { Test, TestingModule } from '@nestjs/testing';
import { SailscallsService } from './sailscallsClient.service';

jest.mock('@gear-js/api', () => ({
  GearApi: { create: jest.fn() },
}));

jest.mock('sailscalls', () => ({
  SailsCalls: { new: jest.fn() },
}));

jest.mock('../consts', () => ({
  NETWORK: 'wss://testnet.vara.network',
  CONTRACT_ADDRESS: '0xCONTRACT',
  CONTRACT_IDL: 'idl',
  SPONSOR_NAME: 'nestjs-account',
  SPONSOR_MNEMONIC: 'strong vara gear ...',
  MIN_TOKENS_FOR_VOUCHER: 1,
  TOKENS_TO_ADD_TO_VOUCHER: 2,
  INITIAL_TOKENS_FOR_VOUCHER: 3,
  NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: 1_200,
  INITIAL_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: 1_200,
}));

import { GearApi } from '@gear-js/api';
import { SailsCalls } from 'sailscalls';

describe('SailscallsService (unit con mocks)', () => {
  let service: SailscallsService;

  const mockApi = {
    on: jest.fn()
  };
  const sailsCallsMock = {
    createVoucher: jest.fn(),
    voucherIsExpired: jest.fn(),
    renewVoucherAmountOfBlocks: jest.fn(),
    voucherBalance: jest.fn(),
    addTokensToVoucher: jest.fn(),
    command: jest.fn(),
    query: jest.fn(),
    disconnectGearApi: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (GearApi.create as jest.Mock).mockResolvedValue(mockApi);
    (SailsCalls.new as jest.Mock).mockResolvedValue(sailsCallsMock);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [SailscallsService],
    }).compile();

    service = moduleRef.get(SailscallsService);

    await service.onModuleInit();
  });

  it('Check correct init data on sailscalls (onModuleInit)', () => {
    expect(GearApi.create).toHaveBeenCalledWith({ providerAddress: 'wss://testnet.vara.network' });

    expect(SailsCalls.new).toHaveBeenCalledWith(
      expect.objectContaining({
        gearApi: mockApi,
        voucherSignerData: {
          sponsorMnemonic: 'strong vara gear ...',
          sponsorName: 'nestjs-account',
        },
        newContractsData: [
          {
            contractName: 'contract',
            address: '0xCONTRACT',
            idl: expect.any(String),
          },
        ],
      }),
    );

    expect(service.sailsInstance).toBe(sailsCallsMock as any);
  });

  it('createVoucher - set and return voucherId', async () => {
    sailsCallsMock.createVoucher.mockResolvedValue('0xVOUCHER');

    const voucherId = await service.createVoucher('0xUSER' as any);

    expect(sailsCallsMock.createVoucher).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      initialTokensInVoucher: 3, 
      initialExpiredTimeInBlocks: 1_200,
    });
    expect(voucherId).toBe('0xVOUCHER');
  });

  it('checkVoucher - renew and add tokens to the voucher', async () => {
    sailsCallsMock.voucherIsExpired.mockResolvedValue(true);
    sailsCallsMock.voucherBalance.mockResolvedValue(0);

    await service.checkVoucher('0xUSER' as any, '0xVOUCHER' as any);

    expect(sailsCallsMock.renewVoucherAmountOfBlocks).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      voucherId: '0xVOUCHER',
      numOfBlocks: 1_200,
    });
    expect(sailsCallsMock.addTokensToVoucher).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      voucherId: '0xVOUCHER',
      numOfTokens: 2, 
    });
  });

  it('checkVoucher - voucher is updated', async () => {
    sailsCallsMock.voucherIsExpired.mockResolvedValue(false);
    sailsCallsMock.voucherBalance.mockResolvedValue(5);

    await service.checkVoucher('0xUSER' as any, '0xVOUCHER' as any);

    expect(sailsCallsMock.renewVoucherAmountOfBlocks).not.toHaveBeenCalled();
    expect(sailsCallsMock.addTokensToVoucher).not.toHaveBeenCalled();
  });

  it('onModuleDestroy - disconnect gear api', async () => {
    await service.onModuleDestroy();
    expect(sailsCallsMock.disconnectGearApi).toHaveBeenCalled();
  });
});