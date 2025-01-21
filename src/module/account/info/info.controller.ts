import { Controller, Get, Post, Response, Headers, Body, Query, Logger } from '@nestjs/common';
import { InfoService } from './info.service';

@Controller()
export class InfoController {
  private readonly logger: Logger = new Logger(this.constructor.name);
  constructor(private readonly infoService: InfoService) {}

  @Post()
  async Create(@Response() response, @Headers() header, @Body() body, @Query() query) {
    return this.infoService
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
    return this.infoService
      .Read()
      .then((result) => {
        return response.status(result.code).send(result);
      })
      .catch((error) => {
        return response.status(error.code).send(error);
      });
  }
}
