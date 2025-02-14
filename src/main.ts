import { NestFactory } from '@nestjs/core';
import { ModuleModule } from './module/module.module';
import { Logger } from '@nestjs/common';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ProtoArrayConfig } from './config/const/proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { ReflectionService } from '@grpc/reflection';

(async () => {
  const logger: Logger = new Logger('Services Runner');

  const isServiceSecure = process.env.DKA_SERVER_SECURE === 'true';
  const rootPath = path.dirname(require.main.filename);
  const sslPathDirectory = path.join(rootPath, './config/ssl');
  const caPathDirectory = path.join(sslPathDirectory, 'ca');
  const serverPathDirectory = path.join(sslPathDirectory, 'server');

  const caCertFile = path.join(caPathDirectory, './ca.crt');
  const serverCertFile = path.join(serverPathDirectory, './server.crt');
  const serverPrivateFile = path.join(serverPathDirectory, './private.key');

  let serverCredential = ServerCredentials.createInsecure();

  if (isServiceSecure && !fs.existsSync(sslPathDirectory)) {
    logger.error(`serverSecure Detected. but ssl directory not found.`);
    logger.verbose(`Automatically Create Certificate. Please Wait ...`);
    spawnSync('yarn', ['cert'], { stdio: 'inherit' });
  }

  if (isServiceSecure && !fs.existsSync(caPathDirectory) && !fs.existsSync(caCertFile)) {
    logger.error(`serverSecure Detected. but ssl/ca directory or ca.crt not found.`);
    logger.verbose(`Automatically Create Certificate. Please Wait ...`);
    spawnSync('yarn', ['cert'], { stdio: 'inherit' });
  }

  if (isServiceSecure && !fs.existsSync(serverPathDirectory) && !fs.existsSync(serverCertFile) && !fs.existsSync(serverPrivateFile)) {
    logger.error(`serverSecure Detected. but ssl/server directory or private.key or server.crt not found.`);
    logger.verbose(`Automatically Create Certificate. Please Wait ...`);
    spawnSync('yarn', ['cert'], { stdio: 'inherit' });
  }

  if (isServiceSecure) {
    serverCredential = ServerCredentials.createSsl(
      fs.readFileSync(caCertFile),
      [
        {
          cert_chain: fs.readFileSync(serverCertFile),
          private_key: fs.readFileSync(serverPrivateFile),
        },
      ],
      true,
    );
  }

  return NestFactory.createMicroservice<GrpcOptions>(ModuleModule, {
    transport: Transport.GRPC,
    options: {
      url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || isServiceSecure ? 8080 : 80)}`,
      package: ProtoArrayConfig.package,
      protoPath: ProtoArrayConfig.protoPath,
      credentials: serverCredential,
      onLoadPackageDefinition: (pkg, server) => {
        if (process.env.DKA_SERVER_REFLECTION === undefined || process.env.DKA_SERVER_REFLECTION === 'true') {
          new ReflectionService(pkg).addToServer(server);
        }
      },
    },
  })
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
