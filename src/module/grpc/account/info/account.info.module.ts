import { Module } from '@nestjs/common';
import { AccountInfoService } from './account.info.service';
import { AccountInfoController } from './account.info.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as process from 'node:process';
import { ModelConfig } from '../../../../config/const/model.config';
import AccountInfoSchema from '../../../../schema/account/info/account.info.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    /** **
     * Connection Of database to the Framework
     */
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
    /**
     * Linked Schema data Into The Features
     */
    MongooseModule.forFeature([{ schema: AccountInfoSchema, name: ModelConfig.accountInfo }]),
  ],
  controllers: [AccountInfoController],
  providers: [AccountInfoService],
})
export class AccountInfoModule {}
