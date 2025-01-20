import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { DatabaseConnectionConfig } from '../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema, { AccountModel } from '../../schema/account.schema';
import { InfoModule } from './info/info.module';
import { CredentialModule } from './credential/credential.module';

@Module({
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
})
export class AccountModule {}
