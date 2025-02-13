import { Module } from '@nestjs/common';
import { AccountCredentialService } from './account.credential.service';
import { AccountCredentialController } from './account.credential.controller';
import { MongooseModule } from '@nestjs/mongoose';
import AccountCredentialSchema, { AccountCredentialModel } from '../../../schema/account/credential/account.credential.schema';
import AccountInfoSchema, { AccountInfoModel } from '../../../schema/account/info/account.info.schema';
import AccountSchema, { AccountModel } from '../../../schema/account/account.schema';
import AccountTokenSchema, { AccountTokenModel } from '../../../schema/account/session/account.token.schema';
import * as process from 'node:process';

@Module({
  imports: [
    MongooseModule.forRoot(`mongodb://${process.env.DKA_MONGO_HOST || '127.0.0.1'}:${process.env.DKA_MONGO_PORT || 27017}`, {
      auth: {
        username: `${process.env.DKA_MONGO_USERNAME || 'root'}`,
        password: `${process.env.DKA_MONGO_PASSWORD || '123456789'}`,
      },
      dbName: `${process.env.DKA_MONGO_DATABASE || 'dka-account'}`,
      replicaSet: `${process.env.DKA_MONGO_RS || 'rs0'}`,
      connectTimeoutMS: 2000,
      timeoutMS: 10000,
    }),
    MongooseModule.forFeature([
      { schema: AccountCredentialSchema, name: AccountCredentialModel.modelName },
      { schema: AccountInfoSchema, name: AccountInfoModel.modelName },
      { schema: AccountSchema, name: AccountModel.modelName },
      { schema: AccountTokenSchema, name: AccountTokenModel.modelName },
    ]),
  ],
  controllers: [AccountCredentialController],
  providers: [AccountCredentialService],
})
export class AccountCredentialModule {}
