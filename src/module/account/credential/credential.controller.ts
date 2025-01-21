import { Controller, Logger } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountCredentialAuthRequest, AccountCredentialAuthResponse, AccountCredentialCreateResponse, AccountCredentialReadRequest, AccountCredentialReadResponse, IAccountCredential } from '../../../model/proto/credential/account.credential.grpc';

@Controller()
export class CredentialController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly credentialService: CredentialService) {}

  @GrpcMethod('AccountCredential', 'Create')
  async Create(data: IAccountCredential, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountCredentialCreateResponse> {
    return this.credentialService
      .Create({
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

  @GrpcMethod('AccountCredential', 'Read')
  async Read(data: AccountCredentialReadRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountCredentialReadResponse> {
    return this.credentialService
      .Read({
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

  @GrpcMethod('AccountCredential', 'Auth')
  async Auth(data: AccountCredentialAuthRequest, metadata: Metadata, call: ServerUnaryCall<any, any>): Promise<AccountCredentialAuthResponse> {
    return this.credentialService
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
