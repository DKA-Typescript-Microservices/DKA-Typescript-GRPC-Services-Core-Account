import { Test, TestingModule } from '@nestjs/testing';
import { InfoService } from './info.service';
import { DatabaseConnectionConfig } from '../../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountInfoSchema, { AccountInfoModel } from '../../../schema/account.info.schema';

describe('InfoService', () => {
  let service: InfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseConnectionConfig,
        MongooseModule.forFeature([
          {
            schema: AccountInfoSchema,
            name: AccountInfoModel.modelName,
          },
        ]),
      ],
      providers: [InfoService],
    }).compile();

    service = module.get<InfoService>(InfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
