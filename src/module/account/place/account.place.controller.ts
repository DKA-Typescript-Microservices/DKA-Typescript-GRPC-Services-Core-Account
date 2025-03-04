import { Controller } from '@nestjs/common';
import { AccountPlaceService } from './account.place.service';

@Controller()
export class AccountPlaceController {
  constructor(private readonly placeService: AccountPlaceService) {}
}
