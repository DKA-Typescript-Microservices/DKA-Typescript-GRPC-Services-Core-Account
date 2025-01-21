import * as path from 'node:path';

export const ProtoArrayConfig = {
  package: ['account.info'],
  protoPath: [path.join(path.dirname(require.main.filename), './model/proto/info/account.info.gprc.proto')],
};
