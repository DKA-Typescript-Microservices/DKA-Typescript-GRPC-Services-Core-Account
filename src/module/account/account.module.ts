import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { DatabaseConnectionConfig } from '../../config/const/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema, { AccountModel } from '../../schema/account.schema';
import AccountInfoSchema, { AccountInfoModel } from '../../schema/account.info.schema';
import AccountCredentialSchema, { AccountCredentialModel } from '../../schema/account.credential.schema';

@Module({
  imports: [
    DatabaseConnectionConfig,
    MongooseModule.forFeature([
      { schema: AccountCredentialSchema, name: AccountCredentialModel.modelName },
      { schema: AccountInfoSchema, name: AccountInfoModel.modelName },
      { schema: AccountSchema, name: AccountModel.modelName },
    ]),
  ],

  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
