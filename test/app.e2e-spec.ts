import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { decodeAddress, GearKeyring } from '@gear-js/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SailsCalls } from 'sailscalls';
import request from 'supertest';

const CONTRACT_ADDRESS = '0xe54fcb7deb5246c6ab05a4ba23f410410b16c501fe814ff1975c488e2f6dd72d';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

jest.setTimeout(30000);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let keyring: KeyringPair;
  let sailscalls: SailsCalls;
  let voucherId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    const acc = await GearKeyring.create('nest-account');
    keyring = acc.keyring;

    sailscalls = await SailsCalls.new({
      network: 'wss://testnet.vara.network'
    });
  });

  afterAll(async () => {
    await app.close();
    await sailscalls.disconnectGearApi();
  });

  it('/ (GET)', async () => {
    await request(server)
      .get('/')
      .expect(200)
      .expect('Hello world!');
  });

  it('/voucher/create-voucher (POST)', async () => {
    const userDecodedAddress = decodeAddress(keyring.address);
    const response = await request(server)
      .post('/voucher/create-voucher')
      .send({
        userAddress: userDecodedAddress
      })
      .expect(201);

    expect(Object.keys(response.body)).toEqual(['message', 'voucherId']);

    const contractVouchers = await sailscalls.vouchersInContract(
      userDecodedAddress,
      CONTRACT_ADDRESS
    );

    expect(contractVouchers.length).toBe(1);
    expect(response.body.voucherId).toBe(contractVouchers[0]);
    expect(response.body.message).toBe('voucher created');

    voucherId = response.body.voucherId;
  });

  it('/voucher/update-voucher (POST)', async () => {
    const userDecodedAddress = decodeAddress(keyring.address);
    const response = await request(server)
      .post('/voucher/update-voucher')
      .send({
        userAddress: userDecodedAddress,
        voucherId
      })
      .expect(201);

    expect(Object.keys(response.body)).toEqual(['message', 'voucherId']);

    expect(response.body.message).toEqual("Voucher updated (tokens added)");
    expect(response.body.voucherId).toEqual(voucherId);
  });

  it('FAIL - /voucher/create-voucher (POST)', async () => {
    const userDecodedAddress = decodeAddress(keyring.address);
    const response = await request(server)
      .post('/voucher/create-voucher')
      .send({
        userAddress: userDecodedAddress
      })
      .expect(409);

    expect(Object.keys(response.body)).toEqual(['message', 'error', 'statusCode']);
    expect(response.body).toMatchObject({
      message: 'User already has a voucher',
      error: 'Conflict',
      statusCode: 409
    });
  });

  it ("FAIL - /voucher/update-voucher (POST)", async () => {
    const newKeyring = await GearKeyring.create("test");
    const userDecodedAddress = decodeAddress(newKeyring.keyring.address);
    const response = await request(server)
      .post('/voucher/update-voucher')
      .send({
        userAddress: userDecodedAddress,
        voucherId
      })
      .expect(409);

    expect(Object.keys(response.body)).toEqual(['message', 'error', 'statusCode']);
    expect(response.body).toMatchObject({
      message: 'User is not the owner of the voucher',
      error: 'Conflict',
      statusCode: 409
    });
  });

});
