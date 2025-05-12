import { Controller, Logger } from '@nestjs/common';
import { AccountService } from './account.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import {
  AccountByIDRequest,
  AccountCreateRequest,
  AccountCreateResponse,
  AccountDeleteOneRequest,
  AccountPutOneRequest,
  AccountReadByIDResponse,
  AccountReadRequest,
  AccountReadResponse,
  IAccount,
} from '../../../model/proto/account/account.common.grpc';
import { AccountAuthRequest } from '../../../model/proto/account/credential/account.credential.common.grpc';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @GrpcMethod('Resources', 'Create')
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

  @GrpcMethod('Credential', 'Authorization')
  async AuthCredential(data: AccountAuthRequest, metadata: Metadata, call: ServerUnaryCall<AccountAuthRequest, IAccount>): Promise<IAccount> {
    return await this.accountService
      .AuthCredential({
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

  @GrpcMethod('Resources', 'ReadByID')
  async ReadByID(data: AccountByIDRequest, metadata: Metadata, call: ServerUnaryCall<AccountByIDRequest, AccountReadByIDResponse>): Promise<AccountReadByIDResponse> {
    return await this.accountService
      .ReadByID({
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

  @GrpcMethod('Resources', 'DeleteOne')
  async DeleteOne(data: AccountDeleteOneRequest, metadata: Metadata, call: ServerUnaryCall<AccountDeleteOneRequest, IAccount>): Promise<IAccount> {
    return await this.accountService
      .DeleteOne({
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
