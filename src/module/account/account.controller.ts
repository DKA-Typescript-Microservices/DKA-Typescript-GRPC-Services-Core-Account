import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { AccountService } from './account.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { RequestGrpcMiddleware } from '../../middleware/request.grpc.middleware';
import { Metadata, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import { AccountAuthRequest, AccountAuthResponse, AccountCreateRequest, AccountCreateResponse, AccountReadRequest, AccountReadResponse, IAccount } from '../../model/proto/account.grpc';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @GrpcMethod('Account', 'Create')
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
      .catch((error) => {
        this.logger.error(error);
        throw new RpcException({
          code: error.code,
          message: error.msg,
        });
      });
  }

  @GrpcMethod('Account', 'ReadAll')
  @UseInterceptors(RequestGrpcMiddleware)
  async ReadAll(data: AccountReadRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountReadResponse> {
    return this.accountService
      .ReadAll({
        data,
        metadata,
        call,
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        throw new RpcException({
          code: error.code,
          message: error.msg,
          additionalInfo: error.error,
        });
      });
  }

  @GrpcMethod('Account', 'ReadAllStream')
  @UseInterceptors(RequestGrpcMiddleware)
  async ReadAllStream(data: AccountReadRequest, metadata: Metadata, call: ServerWritableStream<AccountReadRequest, IAccount>) {
    return await this.accountService.ReadAllStream({
      data,
      metadata,
      call,
    });
  }

  @GrpcMethod('Account', 'Auth')
  @UseInterceptors(RequestGrpcMiddleware)
  async Auth(data: AccountAuthRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountAuthResponse> {
    return this.accountService
      .Auth({
        data,
        metadata,
        call,
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        throw new RpcException({
          code: error.code,
          message: error.msg,
          additionalInfo: error.error,
        });
      });
  }
}
