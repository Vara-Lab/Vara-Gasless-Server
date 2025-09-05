import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { SailscallsService } from './SailscallsService/sailscallsClient.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [SailscallsService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello world!"', () => {
      expect(appController.getHello()).toBe('Hello world!');
    });
  });
});
