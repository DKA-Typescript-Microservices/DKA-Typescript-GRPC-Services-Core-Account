import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { AccountService } from './account.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { RequestGrpcMiddleware } from '../../middleware/request.grpc.middleware';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountCreateRequest, AccountCreateResponse, AccountPutOneRequest, AccountReadRequest, AccountReadResponse, IAccount } from '../../model/proto/account/account.grpc';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @GrpcMethod('Resources', 'Create')
  @UseInterceptors(RequestGrpcMiddleware)
  async Create(data: AccountCreateRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountCreateResponse> {
    return this.accountService
      .Create({
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

  @GrpcMethod('Resources', 'ReadAll')
  @UseInterceptors(RequestGrpcMiddleware)
  async ReadAll(data: AccountReadRequest, metadata: Metadata, call: ServerUnaryCall<AccountReadRequest, AccountReadResponse>): Promise<AccountReadResponse> {
    return await this.accountService
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

  @GrpcMethod('Resources', 'UpdateOne')
  @UseInterceptors(RequestGrpcMiddleware)
  async UpdateOne(data: AccountPutOneRequest, metadata: Metadata, call: ServerUnaryCall<AccountPutOneRequest, IAccount>): Promise<IAccount> {
    return await this.accountService
      .UpdateOne({
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
