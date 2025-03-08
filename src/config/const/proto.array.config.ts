import * as path from 'node:path';

const pathModel = path.join(__dirname, './../../model/proto');
export const ProtoArrayConfig = {
  package: ['account'],
  protoPath: [path.join(pathModel, './account/account.grpc.proto')],
};
