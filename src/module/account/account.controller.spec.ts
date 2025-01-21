import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { DatabaseConnectionConfig } from '../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema, { AccountModel } from '../../schema/account.schema';
import { InfoModule } from './info/info.module';
import { CredentialModule } from './credential/credential.module';

describe('AccountController', () => {
  let controller: AccountController;

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
      controllers: [AccountController],
      providers: [AccountService],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
