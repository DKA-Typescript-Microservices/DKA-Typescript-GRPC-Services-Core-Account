import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { AccountService } from './account.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { RequestGrpcMiddleware } from '../../middleware/request.grpc.middleware';
import { Metadata, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import {
  AccountCreateRequest,
  AccountCreateResponse,
  AccountGetTokenRequest,
  AccountGetTokenResponse,
  AccountReadRequest,
  AccountReadResponse,
  AccountVerifyTokenRequest,
  AccountVerifyTokenResponse,
  IAccount,
} from '../../model/proto/account/account.grpc';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @GrpcMethod('Account', 'Create')
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

  @GrpcMethod('Account', 'ReadAll')
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

  @GrpcMethod('Account', 'ReadAllStream')
  @UseInterceptors(RequestGrpcMiddleware)
  ReadAllStream(data: AccountReadRequest, metadata: Metadata, call: ServerWritableStream<AccountReadRequest, IAccount>) {
    return this.accountService.ReadAllStream({
      data,
      metadata,
      call,
    });
  }

  @GrpcMethod('Account', 'getToken')
  async getToken(data: AccountGetTokenRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountGetTokenResponse> {
    return this.accountService
      .getToken({
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

  @GrpcMethod('Account', 'verifyToken')
  async verifyToken(data: AccountVerifyTokenRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountVerifyTokenResponse> {
    return this.accountService
      .verifyToken({
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

  @GrpcMethod('Account', 'refreshToken')
  async refreshToken(data: AccountVerifyTokenRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountGetTokenResponse> {
    return this.accountService
      .refreshToken({
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
