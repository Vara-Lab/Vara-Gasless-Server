import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VouchersWorkerService } from '../VouchersWorkerService/vouchers_worker.service';
import { SailscallsService } from '../SailscallsService/sailscallsClient.service';
import { HexString } from '@gear-js/api';

jest.mock('../consts', () => ({
  MIN_TOKENS_FOR_VOUCHER: 5,
  CONTRACT_ADDRESS: '0xCONTRACT',
}));

describe('VoucherService', () => {
  let service: VoucherService;

  const vwMock: Pick<VouchersWorkerService, 'addVoucherRequest'> = {
    addVoucherRequest: jest.fn(),
  };

  const sailsInstanceMock = {
    vouchersInContract: jest.fn(),
    voucherBalance: jest.fn(),
    voucherIsExpired: jest.fn(),
  };

  const sailscallsServiceMock: Partial<SailscallsService> = {
    sailsInstance: sailsInstanceMock as any,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherService,
        { provide: VouchersWorkerService, useValue: vwMock },
        { provide: SailscallsService, useValue: sailscallsServiceMock },
      ],
    }).compile();

    service = moduleRef.get(VoucherService);
  });

  it('createVoucher: throws ConflictException', async () => {
    sailsInstanceMock.vouchersInContract.mockResolvedValue(['0xEXISTS']);

    await expect(
      service.createVoucher({ userAddress: '0xUSER' as HexString }),
    ).rejects.toBeInstanceOf(ConflictException);

    // Verifica que consultó usando CONTRACT_ADDRESS
    expect(sailsInstanceMock.vouchersInContract).toHaveBeenCalledWith(
      '0xUSER',
      '0xCONTRACT',
    );

    expect(vwMock.addVoucherRequest).not.toHaveBeenCalled();
  });

  it('createVoucher: queue requests and returns voucherId', async () => {
    sailsInstanceMock.vouchersInContract.mockResolvedValue([]);
    (vwMock.addVoucherRequest as jest.Mock).mockResolvedValue('0xNEW');

    const res = await service.createVoucher({ userAddress: '0xUSER' as HexString });

    expect(vwMock.addVoucherRequest).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      createVoucher: true,
      addTokens: false,
      renewVoucher: false,
    });

    expect(res).toEqual({ message: 'voucher created', voucherId: '0xNEW' });
  });

  it('updateVoucher: voucher is updated', async () => {
    sailsInstanceMock.voucherBalance.mockResolvedValue(10);
    sailsInstanceMock.voucherIsExpired.mockResolvedValue(false);

    const res = await service.updateVoucher({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xABC' as HexString,
    });

    expect(res).toEqual({
      message: 'Voucher dont need updated',
      voucherId: '0xABC',
    });

    expect(vwMock.addVoucherRequest).not.toHaveBeenCalled();
  });

  it('updateVoucher: addTokens', async () => {
    sailsInstanceMock.voucherBalance.mockResolvedValue(1);
    sailsInstanceMock.voucherIsExpired.mockResolvedValue(false);
    (vwMock.addVoucherRequest as jest.Mock).mockResolvedValue('0xABC');

    const res = await service.updateVoucher({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xABC' as HexString,
    });

    expect(vwMock.addVoucherRequest).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      voucherId: '0xABC',
      createVoucher: false,
      addTokens: true,
      renewVoucher: false,
    });

    expect(res).toEqual({
      message: 'Voucher updated (tokens added)',
      voucherId: '0xABC',
    });
  });

  it('updateVoucher: renewVOucher', async () => {
    sailsInstanceMock.voucherBalance.mockResolvedValue(7); 
    sailsInstanceMock.voucherIsExpired.mockResolvedValue(true);
    (vwMock.addVoucherRequest as jest.Mock).mockResolvedValue('0xDEF');

    const res = await service.updateVoucher({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xDEF' as HexString,
    });

    expect(vwMock.addVoucherRequest).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      voucherId: '0xDEF',
      createVoucher: false,
      addTokens: false,
      renewVoucher: true,
    });

    expect(res).toEqual({
      message: 'Voucher updated (renewed)',
      voucherId: '0xDEF',
    });
  });

  it('updateVoucher: addTokens and renewVoucher', async () => {
    sailsInstanceMock.voucherBalance.mockResolvedValue(0);
    sailsInstanceMock.voucherIsExpired.mockResolvedValue(true);
    (vwMock.addVoucherRequest as jest.Mock).mockResolvedValue('0xXYZ');

    const res = await service.updateVoucher({
      userAddress: '0xUSER' as HexString,
      voucherId: '0xXYZ' as HexString,
    });

    expect(vwMock.addVoucherRequest).toHaveBeenCalledWith({
      userAddress: '0xUSER',
      voucherId: '0xXYZ',
      createVoucher: false,
      addTokens: true,
      renewVoucher: true,
    });

    expect(res).toEqual({
      message: 'Voucher updated (tokens added and renewed)',
      voucherId: '0xXYZ',
    });
  });
});