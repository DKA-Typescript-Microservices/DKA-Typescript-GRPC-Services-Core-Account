import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ProtoArrayConfig } from './config/const/proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { join } from 'node:path';
import { ReflectionService } from '@grpc/reflection';
import * as os from 'node:os';
import { GrpcModule } from './module/grpc/grpc.module';
import { HttpModule } from './module/http/http.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyHttp2SecureOptions, FastifyHttpOptions, FastifyHttpsOptions } from 'fastify';

(async () => {
  const logger: Logger = new Logger('Services Runner');
  //########################################################################
  const isServiceSecure = process.env.DKA_SERVER_SECURE === 'true';
  let serverCredential = ServerCredentials.createInsecure();
  let fastifyOptions: FastifyHttp2SecureOptions<any> | FastifyHttpsOptions<any> | FastifyHttpOptions<any> | undefined = undefined;
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

    fastifyOptions = {
      https: {
        ca: [fs.readFileSync(CAFile)],
        key: fs.readFileSync(PrivateKeyFile),
        cert: fs.readFileSync(CertFile),
        rejectUnauthorized: true,
      },
      http2: true,
    };
  }

  return Promise.allSettled([
    NestFactory.createMicroservice<GrpcOptions>(GrpcModule, {
      transport: Transport.GRPC,
      options: {
        url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_GRPC_PORT || 50051)}`,
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
    NestFactory.create<NestFastifyApplication>(HttpModule, new FastifyAdapter(fastifyOptions)),
  ])
    .then(async ([grpc, http]) => {
      if (grpc.status === 'fulfilled') {
        grpc?.value
          .listen()
          .then((_) => {
            logger.log(`Running server GRPC successfully In ${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_GRPC_PORT || 50051)} ...`);
          })
          .catch((error) => {
            logger.error(error);
          });
      } else {
        logger.log(`Running server GRPC Failed In ${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_GRPC_PORT || 50051)} ...`);
        logger.error(grpc.reason);
      }

      if (http.status === 'fulfilled') {
        http?.value
          .listen(Number(`${process.env.DKA_SERVER_HTTP_PORT || 80}`), `${process.env.DKA_SERVER_HOST || '0.0.0.0'}`)
          .then((_) => {
            logger.log(`Running server HTTP successfully In ${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_HTTP_PORT || 80)} ...`);
            //###############################################################################################################################
            //###############################################################################################################################
          })
          .catch((error) => {
            logger.error(error);
          });
      } else {
        logger.log(`Running server HTTP Failed In ${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_HTTP_PORT || 80)} ...`);
        logger.error(http.reason);
      }
    })
    .catch((error) => {
      logger.error(error);
    });
})();
