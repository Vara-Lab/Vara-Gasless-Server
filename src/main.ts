import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  await app.listen(process.env.PORT ?? 3000);
  
  process.on('SIGINT', async () => {
    console.log('\nClosing server...');
    await app.close();
  });
}
bootstrap();
