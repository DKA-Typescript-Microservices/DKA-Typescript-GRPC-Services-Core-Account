import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ReflectionService } from '@grpc/reflection';
import { ProtoArrayConfig } from './proto.array.config';
import { ServerCredentials } from '@grpc/grpc-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const MicroservicesServerConfig: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 50051)}`,
    package: ProtoArrayConfig.package,
    protoPath: ProtoArrayConfig.protoPath,
    credentials: ServerCredentials.createSsl(
      fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/ca/ca.crt')),
      [
        {
          cert_chain: fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/server.crt')),
          private_key: fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/private.key')),
        },
      ],
      true,
    ),
    onLoadPackageDefinition: (pkg, server) => {
      new ReflectionService(pkg).addToServer(server);
    },
  },
};
