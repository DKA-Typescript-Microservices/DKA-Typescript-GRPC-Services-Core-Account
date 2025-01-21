import { Test, TestingModule } from '@nestjs/testing';
import { InfoController } from './info.controller';
import { InfoService } from './info.service';
import { DatabaseConnectionConfig } from '../../../config/const/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountInfoSchema, { AccountInfoModel } from '../../../schema/account.info.schema';

describe('InfoController', () => {
  let controller: InfoController;

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
      controllers: [InfoController],
      providers: [InfoService],
    }).compile();

    controller = module.get<InfoController>(InfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
