import {
  Controller,
  Get,
  Response,
  Logger,
  Post,
  Headers,
  Body,
  Query,
} from '@nestjs/common';
import { AccountService } from './account.service';

@Controller()
export class AccountController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly accountService: AccountService) {}

  @Post()
  async Create(
    @Response() response,
    @Headers() header,
    @Body() body,
    @Query() query,
  ) {
    return this.accountService
      .Create({
        header,
        body,
        query,
      })
      .then((result) => {
        return response.status(result.code).send(result);
      })
      .catch((error) => {
        this.logger.error(error);
        return response.status(error.code).send(error);
      });
  }

  @Get()
  async Read(@Response() response) {
    return this.accountService
      .Read()
      .then((result) => {
        return response.status(result.code).send(result);
      })
      .catch((error) => {
        return response.status(error.code).send(error);
      });
  }
}
