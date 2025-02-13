import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ReflectionService } from '@grpc/reflection';
import { ProtoArrayConfig } from './proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const isServiceSecure = process.env.DKA_SERVER_SECURE === 'true';

export const MicroservicesServerConfig: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 8080)}`,
    package: ProtoArrayConfig.package,
    protoPath: ProtoArrayConfig.protoPath,
    credentials: isServiceSecure
      ? ServerCredentials.createSsl(
          fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/ca/ca.crt')),
          [
            {
              cert_chain: fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/server.crt')),
              private_key: fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/private.key')),
            },
          ],
          true,
        )
      : ServerCredentials.createInsecure(),
    onLoadPackageDefinition: (pkg, server) => {
      if (process.env.DKA_SERVER_REFLECTION === undefined || process.env.DKA_SERVER_REFLECTION === 'true') {
        new ReflectionService(pkg).addToServer(server);
      }
    },
  },
};
