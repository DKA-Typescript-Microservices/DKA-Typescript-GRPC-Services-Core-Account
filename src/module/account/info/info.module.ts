import { Module } from '@nestjs/common';
import { InfoService } from './info.service';
import { InfoController } from './info.controller';
import { DatabaseConnectionConfig } from '../../../config/const/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountInfoSchema, { AccountInfoModel } from '../../../schema/account.info.schema';
import AccountSchema, { AccountModel } from '../../../schema/account.schema';

@Module({
  imports: [
    DatabaseConnectionConfig,
    MongooseModule.forFeature([
      { schema: AccountSchema, name: AccountModel.modelName },
      { schema: AccountInfoSchema, name: AccountInfoModel.modelName },
    ]),
  ],
  controllers: [InfoController],
  providers: [InfoService],
})
export class InfoModule {}
