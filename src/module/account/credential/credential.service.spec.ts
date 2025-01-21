import { Test, TestingModule } from '@nestjs/testing';
import { CredentialService } from './credential.service';
import { DatabaseConnectionConfig } from '../../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountCredentialSchema, { AccountCredentialModel } from '../../../schema/account.credential.schema';

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseConnectionConfig,
        MongooseModule.forFeature([
          {
            schema: AccountCredentialSchema,
            name: AccountCredentialModel.modelName,
          },
        ]),
      ],
      providers: [CredentialService],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
