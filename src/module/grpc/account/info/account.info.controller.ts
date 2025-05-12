import { Controller } from '@nestjs/common';
import { AccountInfoService } from './account.info.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountInfoReadResponse } from '../../../../model/proto/account/info/account.info.common.grpc';
import { Empty } from '../../../../model/proto/google/protobuf/empty';

@Controller()
export class AccountInfoController {
  constructor(private readonly infoService: AccountInfoService) {}

  @GrpcMethod('Info', 'ReadAll')
  async AuthCredential(data: Empty, metadata: Metadata, call: ServerUnaryCall<Empty, AccountInfoReadResponse>): Promise<AccountInfoReadResponse> {
    return await this.infoService
      .ReadAll({
        data,
        metadata,
        call,
      })
      .then((result) => {
        return result;
      })
      .catch((reason) => {
        throw new RpcException({
          code: reason.code,
          message: reason.msg,
          details: reason.details,
        });
      });
  }
}
