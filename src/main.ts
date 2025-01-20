import { NestFactory } from '@nestjs/core';
import { ModuleModule } from './module/module.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';

(async () => {
  const logger: Logger = new Logger('Base Sys');
  await NestFactory.createMicroservice<MicroserviceOptions>(ModuleModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.DKA_SERVER_HOST || '0.0.0.0',
      port: Number(process.env.DKA_SERVER_PORT || 80),
    },
  })
    .then((app) => {
      app.listen();
    })
    .catch((error) => {
      logger.error(error);
    });
})();
