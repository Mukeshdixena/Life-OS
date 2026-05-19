import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const CLIENT_ORIGIN = 'https://life-os-client.vercel.app';

  app.enableCors({
    origin(origin, callback) {
      if (!origin || origin === CLIENT_ORIGIN) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
