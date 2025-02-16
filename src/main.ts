import { NestFactory } from '@nestjs/core';
import { ModuleModule } from './module/module.module';
import { Logger } from '@nestjs/common';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ProtoArrayConfig } from './config/const/proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ReflectionService } from '@grpc/reflection';
import * as os from 'node:os';

(async () => {
  const logger: Logger = new Logger('Services Runner');
  //########################################################################
  const isServiceSecure = process.env.DKA_SERVER_SECURE === 'true';
  let serverCredential = ServerCredentials.createInsecure();
  //########################################################################
  const SSLPath = path.join(`/etc/letsencrypt/live`, `${os.hostname()}`);
  //########################################################################
  const CAFile = path.join(SSLPath, 'chain.pem');
  const CertFile = path.join(SSLPath, 'cert.pem');
  const PrivateKeyFile = path.join(SSLPath, 'privkey.pem');
  //########################################################################
  if (isServiceSecure) {
    if (!fs.existsSync(SSLPath)) {
      logger.error(` SSL Not Configure in ${SSLPath}.`);
      logger.error(`please run 'certbot' and connect your server with pointing public ip `);
      return process.kill(process.pid, 'SIGTERM');
    }
    if (!fs.existsSync(CAFile)) {
      logger.error(`${path.basename(CAFile)} is not exist. `);
      return process.kill(process.pid, 'SIGTERM');
    }
    if (!fs.existsSync(CertFile)) {
      logger.error(`${path.basename(CertFile)} is not exist. `);
      return process.kill(process.pid, 'SIGTERM');
    }
    if (!fs.existsSync(PrivateKeyFile)) {
      logger.error(`${path.basename(PrivateKeyFile)} is not exist. `);
      return process.kill(process.pid, 'SIGTERM');
    }
    serverCredential = ServerCredentials.createSsl(
      fs.readFileSync(CAFile),
      [
        {
          cert_chain: fs.readFileSync(CertFile),
          private_key: fs.readFileSync(PrivateKeyFile),
        },
      ],
      false,
    );
  }
  return NestFactory.createMicroservice<GrpcOptions>(ModuleModule, {
    transport: Transport.GRPC,
    options: {
      url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 80)}`,
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
