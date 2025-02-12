import * as path from 'node:path';

const pathModel = path.join(path.dirname(require.main.filename), './model/proto/account');
export const ProtoArrayConfig = {
  package: ['account.info', 'account.credential', 'account'],
  protoPath: [
    path.join(pathModel, './info/account.info.grpc.proto'),
    path.join(pathModel, './credential/account.credential.grpc.proto'),
    path.join(pathModel, './account.grpc.proto'),
  ],
};
