import { Controller, Logger } from '@nestjs/common';
import { InfoService } from './info.service';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountInfoCreateResponse, AccountInfoReadRequest, AccountInfoReadResponse, IAccountInfo } from '../../../model/proto/info/account.info.gprc';

@Controller()
export class InfoController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly infoService: InfoService) {}

  @GrpcMethod('AccountInfo', 'Read')
  async Reads(data: AccountInfoReadRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountInfoReadResponse> {
    return this.infoService
      .Read({
        data,
        metadata,
        call,
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        return error;
      });
  }

  @GrpcMethod('AccountInfo', 'Create')
  async Create(data: IAccountInfo, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountInfoCreateResponse> {
    return this.infoService
      .Create({
        data,
        metadata,
        call,
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        this.logger.error(error);
        return error;
      });
  }
}
