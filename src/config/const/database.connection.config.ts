import { DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as process from 'node:process';

export const DatabaseConnectionConfig: DynamicModule = MongooseModule.forRoot(`mongodb://${process.env.DKA_MONGO_HOST || '127.0.0.1'}:${process.env.DKA_MONGO_PORT || 27017}`, {
  auth: {
    username: `${process.env.DKA_MONGO_USERNAME || 'root'}`,
    password: `${process.env.DKA_MONGO_PASSWORD || '123456789'}`,
  },
  dbName: `${process.env.DKA_MONGO_NAME || 'dka-account'}`,
  replicaSet: `${process.env.DKA_MONGO_RS || 'rs0'}`,
  connectTimeoutMS: 2000,
  timeoutMS: 10000,
});
