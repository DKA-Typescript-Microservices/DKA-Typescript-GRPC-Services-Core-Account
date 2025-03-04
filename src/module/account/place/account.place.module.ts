import { Module } from '@nestjs/common';
import { AccountPlaceService } from './account.place.service';
import { AccountPlaceController } from './account.place.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as process from 'node:process';
import { AccountPlaceModel, AccountPlaceSchema } from '../../../schema/account/place/account.place.schema';

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
    MongooseModule.forFeature([{ schema: AccountPlaceSchema, name: AccountPlaceModel.modelName }]),
  ],
  controllers: [AccountPlaceController],
  providers: [AccountPlaceService],
})
export class AccountPlaceModule {}
