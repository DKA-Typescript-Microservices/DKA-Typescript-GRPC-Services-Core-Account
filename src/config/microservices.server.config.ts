import { GrpcOptions, Transport } from '@nestjs/microservices';
import * as process from 'node:process';
import { ReflectionService } from '@grpc/reflection';
import { ProtoArrayConfig } from './proto.array.config';

export const MicroservicesServerConfig: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    url: `${process.env.DKA_SERVER_HOST || '0.0.0.0'}:${Number(process.env.DKA_SERVER_PORT || 3000)}`,
    package: ProtoArrayConfig.package,
    protoPath: ProtoArrayConfig.protoPath,
    onLoadPackageDefinition: (pkg, server) => {
      new ReflectionService(pkg).addToServer(server);
    },
    channelOptions: {
      'grpc.default_compression_algorithm': 2, // 2 untuk GZIP
    },
  },
};
