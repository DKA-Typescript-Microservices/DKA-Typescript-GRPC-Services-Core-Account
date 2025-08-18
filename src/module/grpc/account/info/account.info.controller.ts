import { Controller } from '@nestjs/common';
import { AccountInfoService } from './account.info.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountInfoReadResponse } from '../../../../model/proto/core/account/info/account.info.common.grpc';
import { Empty } from '../../../../model/proto/google/protobuf/empty';
import { INFO_PACKAGE_NAME, INFO_SERVICE_NAME } from '../../../../model/proto/core/account/info/account.info.grpc';

@Controller()
export class AccountInfoController {
  /** Action Accunt service data iun service data in controller for account info data **/
  constructor(private readonly infoService: AccountInfoService) {}

  @GrpcMethod(`${INFO_PACKAGE_NAME}.${INFO_SERVICE_NAME}`, 'ReadAll')
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
