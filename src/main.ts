import { NestFactory } from '@nestjs/core';
import { ModuleModule } from './module/module.module';
import { Logger } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import { MicroservicesServerConfig } from './config/microservices.server.config';

(async () => {
  const logger: Logger = new Logger('Services Runner');
  return NestFactory.createMicroservice<GrpcOptions>(ModuleModule, MicroservicesServerConfig)
    .then(async (app) => {
      return app
        .listen()
        .then(() => {
          logger.log(`Running server successfully`);
        })
        .catch((error) => {
          logger.error(error);
        });
    })
    .catch((error) => {
      logger.error(error);
    });
})();
