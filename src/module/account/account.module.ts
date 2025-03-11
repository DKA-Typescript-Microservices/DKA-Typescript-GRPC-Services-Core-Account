import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { MongooseModule } from '@nestjs/mongoose';
import AccountSchema from '../../schema/account/account.schema';
import AccountInfoSchema from '../../schema/account/info/account.info.schema';
import AccountCredentialSchema from '../../schema/account/credential/account.credential.schema';
import { ConfigModule } from '@nestjs/config';
import * as process from 'node:process';
import { AccountPlaceSchema } from '../../schema/account/place/account.place.schema';
import { ModelConfig } from '../../config/const/model.config';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
      { schema: AccountPlaceSchema, name: ModelConfig.accountPlace },
    ]),
    ClientsModule.register([
      {
        name: 'SESSION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: `${process.env.DKA_SERVICE_SESSION_HOST || '127.0.0.1'}`,
          port: Number(process.env.DKA_SERVICE_SESSION_PORT || 63301),
        },
      },
    ]),
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
