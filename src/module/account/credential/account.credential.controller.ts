import { Controller } from '@nestjs/common';
import { AccountCredentialService } from './account.credential.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { AccountAuthorizeRequest, AccountAuthorizeResponse, AccountVerifyTokenRequest, IAccount } from '../../../model/proto/account/account.grpc';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';

@Controller()
export class AccountCredentialController {
  constructor(private readonly credentialService: AccountCredentialService) {}

  @GrpcMethod('Credential', 'authorize')
  async Authorize(data: AccountAuthorizeRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountAuthorizeResponse> {
    return this.credentialService
      .Authorize({
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

  @GrpcMethod('Credential', 'verifyToken')
  async verifyToken(data: AccountVerifyTokenRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<IAccount> {
    return this.credentialService
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

  @GrpcMethod('Credential', 'refreshToken')
  async refreshToken(data: AccountVerifyTokenRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountAuthorizeResponse> {
    return this.credentialService
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
