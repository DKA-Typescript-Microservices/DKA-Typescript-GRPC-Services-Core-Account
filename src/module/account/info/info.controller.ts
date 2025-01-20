import { Controller } from '@nestjs/common';
import { InfoService } from './info.service';

@Controller()
export class InfoController {
  constructor(private readonly infoService: InfoService) {}
}
