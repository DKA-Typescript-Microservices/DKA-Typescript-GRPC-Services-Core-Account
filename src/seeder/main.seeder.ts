import { seeder } from 'nestjs-seeder';
import { MongooseModule } from '@nestjs/mongoose';
import * as process from 'node:process';
import { ConfigModule } from '@nestjs/config';
import AccountCredentialSchema, { AccountCredentialModel } from '../schema/account/credential/account.credential.schema';
import AccountInfoSchema, { AccountInfoModel } from '../schema/account/info/account.info.schema';
import AccountSchema, { AccountModel } from '../schema/account/account.schema';
import { SeedAccountSeeder } from './account/seed.account.seeder';
import { AccountPlaceModel, AccountPlaceSchema } from '../schema/account/place/account.place.schema';

seeder({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(`${process.env.DKA_MONGO_PROTOCOL || 'mongodb'}://${process.env.DKA_MONGO_HOST || '127.0.0.1'}:${process.env.DKA_MONGO_PORT || 27017}`, {
      auth: {
        username: `${process.env.DKA_MONGO_USERNAME || 'root'}`,
        password: `${process.env.DKA_MONGO_PASSWORD || '123456789'}`,
      },
      dbName: `${process.env.DKA_MONGO_DATABASE || 'dka-account'}`,
      replicaSet: `${process.env.DKA_MONGO_RS || 'rs0'}`,
      connectTimeoutMS: Number(process.env.DKA_MONGO_CONNECT_TIMEOUT_MS || 2000),
      timeoutMS: Number(process.env.DKA_MONGO_TIMEOUT_MS || 10000),
      directConnection: process.env.DKA_MONGO_CONNECTION_DIRECT === 'true',
    }),
    MongooseModule.forFeature([
      { schema: AccountCredentialSchema, name: AccountCredentialModel.modelName },
      { schema: AccountInfoSchema, name: AccountInfoModel.modelName },
      { schema: AccountSchema, name: AccountModel.modelName },
      { schema: AccountPlaceSchema, name: AccountPlaceModel.modelName },
    ]),
  ],
}).run([SeedAccountSeeder]);
