import * as path from 'node:path';

export const ProtoArrayConfig = {
  package: ['account.info', 'account.credential'],
  protoPath: [path.join(path.dirname(require.main.filename), './model/proto/info/account.info.gprc.proto'), path.join(path.dirname(require.main.filename), './model/proto/credential/account.credential.grpc.proto')],
};
