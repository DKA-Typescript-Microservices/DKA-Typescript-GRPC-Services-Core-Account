import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { DatabaseConnectionConfig } from '../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema, { AccountModel } from '../../schema/account.schema';
import AccountInfoSchema, { AccountInfoModel } from '../../schema/account.info.schema';
import AccountCredentialSchema, { AccountCredentialModel } from '../../schema/account.credential.schema';
import { InfoModule } from './info/info.module';
import { CredentialModule } from './credential/credential.module';

@Module({
  imports: [
    DatabaseConnectionConfig,
    MongooseModule.forFeature([
      { schema: AccountCredentialSchema, name: AccountCredentialModel.modelName },
      { schema: AccountInfoSchema, name: AccountInfoModel.modelName },
      { schema: AccountSchema, name: AccountModel.modelName },
    ]),
    InfoModule,
    CredentialModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
