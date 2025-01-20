import { NestFactory } from '@nestjs/core';
import { ModuleModule } from './module/module.module';
import { Logger } from '@nestjs/common';
import * as process from 'node:process';

(async () => {
  const logger: Logger = new Logger('Base Sys');
  return NestFactory.create(ModuleModule, {})
    .then(async (app) => {
      return app
        .listen(
          Number(process.env.DKA_SERVER_PORT || 80),
          process.env.DKA_SERVER_HOST || '0.0.0.0',
        )
        .then((result) => {
          logger.verbose(result);
        })
        .catch((error) => {
          logger.error(error);
        });
    })
    .catch((error) => {
      logger.error(error);
    });
})();
