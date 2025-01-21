import { Body, Controller, Get, Headers, Logger, Post, Query, Response } from '@nestjs/common';
import { CredentialService } from './credential.service';

@Controller()
export class CredentialController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  async Create(@Response() response, @Headers() header, @Body() body, @Query() query) {
    return this.credentialService
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
    return this.credentialService
      .Read()
      .then((result) => {
        return response.status(result.code).send(result);
      })
      .catch((error) => {
        return response.status(error.code).send(error);
      });
  }
}
