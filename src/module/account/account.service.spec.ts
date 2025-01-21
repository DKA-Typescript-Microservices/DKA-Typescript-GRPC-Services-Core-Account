import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { DatabaseConnectionConfig } from '../../config/const/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema, { AccountModel } from '../../schema/account.schema';
import { InfoModule } from './info/info.module';
import { CredentialModule } from './credential/credential.module';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseConnectionConfig,
        MongooseModule.forFeature([
          {
            schema: AccountSchema,
            name: AccountModel.modelName,
          },
        ]),
        InfoModule,
        CredentialModule,
      ],
      providers: [AccountService],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
