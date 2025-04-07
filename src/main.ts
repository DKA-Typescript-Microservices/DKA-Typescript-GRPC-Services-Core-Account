import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { GrpcOptions, TcpOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ProtoArrayConfig } from './config/const/proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { join } from 'node:path';
import { ReflectionService } from '@grpc/reflection';
import * as os from 'node:os';
import { TlsOptions } from 'tls';
import { GrpcModule } from './module/grpc/grpc.module';
import { TcpModule } from './module/tcp/tcp.module';

(async () => {
  const logger: Logger = new Logger('Services Runner');
  //########################################################################
  const isServiceSecure = process.env.DKA_SERVER_SECURE === 'true';
  let serverCredential = ServerCredentials.createInsecure();
  let tcpOption: TlsOptions | undefined = undefined;
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

    tcpOption = {
      ca: [fs.readFileSync(CAFile)],
      key: fs.readFileSync(PrivateKeyFile),
      cert: fs.readFileSync(CertFile),
      rejectUnauthorized: true,
    };
  }

  const urlGrpcService = `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 80)}`;
  const urlTCPService = `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_BRIDGE_PORT || 63300)}`;

  return Promise.allSettled([
    NestFactory.createMicroservice<GrpcOptions>(GrpcModule, {
      transport: Transport.GRPC,
      options: {
        url: urlGrpcService,
        package: ProtoArrayConfig.package,
        protoPath: ProtoArrayConfig.protoPath,
        loader: {
          includeDirs: [join(__dirname, 'model/proto')],
          keepCase: true, // Jangan ubah jadi camelCase
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
        credentials: serverCredential,
        onLoadPackageDefinition: (pkg, server) => {
          if (process.env.DKA_SERVER_REFLECTION === undefined || process.env.DKA_SERVER_REFLECTION === 'true') {
            new ReflectionService(pkg).addToServer(server);
          }
        },
      },
    }),
    NestFactory.createMicroservice<TcpOptions>(TcpModule, {
      transport: Transport.TCP,
      options: {
        host: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}`,
        port: Number(`${process.env.DKA_SERVER_BRIDGE_PORT || 63300}`),
        tlsOptions: tcpOption,
      },
    }),
  ])
    .then(async ([grpc, tcp]) => {
      if (grpc.status === 'fulfilled') {
        grpc?.value
          .listen()
          .then((_) => {
            logger.log(`Running server GRPC successfully In ${urlGrpcService} ...`);
          })
          .catch((error) => {
            logger.error(error);
          });
      } else {
        logger.log(`Running server GRPC Failed In ${urlGrpcService} ...`);
        logger.error(grpc.reason);
      }

      if (tcp.status === 'fulfilled') {
        tcp?.value
          .listen()
          .then((_) => {
            logger.log(`Running server TCP successfully In ${urlTCPService} ...`);
            //###############################################################################################################################
            //###############################################################################################################################
          })
          .catch((error) => {
            logger.error(error);
          });
      } else {
        logger.log(`Running server TCP Failed In ${urlTCPService} ...`);
        logger.error(tcp.reason);
      }
    })
    .catch((error) => {
      logger.error(error);
    });
})();
