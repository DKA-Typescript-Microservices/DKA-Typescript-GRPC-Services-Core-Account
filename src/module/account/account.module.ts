import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema from '../../schema/account/account.schema';
import AccountInfoSchema from '../../schema/account/info/account.info.schema';
import AccountCredentialSchema from '../../schema/account/credential/account.credential.schema';
import AccountTokenSchema from '../../schema/account/session/account.token.schema';
import { AccountCredentialModule } from './credential/account.credential.module';
import { AccountCredentialService } from './credential/account.credential.service';
import { ConfigModule } from '@nestjs/config';
import * as process from 'node:process';
import { AccountPlaceSchema } from '../../schema/account/place/account.place.schema';
import { ModelConfig } from '../../config/const/model.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(`mongodb://${process.env.DKA_MONGO_HOST || '127.0.0.1'}:${process.env.DKA_MONGO_PORT || 27017}`, {
      auth: {
        username: `${process.env.DKA_MONGO_USERNAME || 'root'}`,
        password: `${process.env.DKA_MONGO_PASSWORD || '123456789'}`,
      },
      dbName: `${process.env.DKA_MONGO_DATABASE || 'dka-account'}`,
      replicaSet: `${process.env.DKA_MONGO_RS || 'rs0'}`,
      connectTimeoutMS: 2000,
      timeoutMS: 10000,
      directConnection: process.env.DKA_MONGO_CONNECTION_DIRECT === 'true',
    }),
    MongooseModule.forFeature([
      { schema: AccountCredentialSchema, name: ModelConfig.accountCredential },
      { schema: AccountInfoSchema, name: ModelConfig.accountInfo },
      { schema: AccountSchema, name: ModelConfig.account },
      { schema: AccountTokenSchema, name: ModelConfig.accountToken },
      { schema: AccountPlaceSchema, name: ModelConfig.accountPlace },
    ]),
    AccountCredentialModule,
  ],

  controllers: [AccountController],
  providers: [AccountService, AccountCredentialService],
})
export class AccountModule {}
