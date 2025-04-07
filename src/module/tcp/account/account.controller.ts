import { Controller, Logger } from '@nestjs/common';
import { AccountService } from './account.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AccountAuthRequest, AccountByIDRequest, IAccount } from '../../../model/proto/account/account.grpc';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @MessagePattern('account.read.by.id')
  async ReadById(@Payload() request: AccountByIDRequest): Promise<IAccount> {
    return await this.accountService
      .ReadById(request)
      .then((result) => {
        return result;
      })
      .catch((reason) => {
        return reason;
      });
  }

  @MessagePattern('account.auth')
  async Auth(@Payload() request: AccountAuthRequest): Promise<IAccount> {
    return await this.accountService
      .Auth(request)
      .then((result) => {
        return result;
      })
      .catch((reason) => {
        return reason;
      });
  }
}
