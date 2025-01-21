import { Test, TestingModule } from '@nestjs/testing';
import { CredentialController } from './credential.controller';
import { CredentialService } from './credential.service';
import { DatabaseConnectionConfig } from '../../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountCredentialSchema, { AccountCredentialModel } from '../../../schema/account.credential.schema';

describe('CredentialController', () => {
  let controller: CredentialController;

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
      controllers: [CredentialController],
      providers: [CredentialService],
    }).compile();

    controller = module.get<CredentialController>(CredentialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
