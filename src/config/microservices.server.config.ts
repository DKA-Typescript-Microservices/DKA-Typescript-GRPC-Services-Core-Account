import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import * as path from 'node:path';
import { ReflectionService } from '@grpc/reflection';

export const MicroservicesServerConfig: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 3000)}`,
    package: ['account.info'],
    protoPath: [path.join(path.dirname(require.main.filename), './model/proto/info/account.info.gprc.proto')],
    onLoadPackageDefinition: (pkg, server) => {
      new ReflectionService(pkg).addToServer(server);
    },
    channelOptions: {
      'grpc.default_compression_algorithm': 2, // 2 untuk GZIP
    },
  },
};
