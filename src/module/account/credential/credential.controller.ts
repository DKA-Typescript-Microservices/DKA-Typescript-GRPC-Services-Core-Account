import { Controller } from '@nestjs/common';
import { CredentialService } from './credential.service';

@Controller()
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}
}
