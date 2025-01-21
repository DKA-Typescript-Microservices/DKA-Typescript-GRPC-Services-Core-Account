import { DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

export const DatabaseConnectionConfig: DynamicModule = MongooseModule.forRoot(`mongodb://${process.env.DKA_MONGO_HOST || '127.0.0.1'}:${process.env.DKA_MONGO_PORT || 27017}`, {
  auth: {
    username: `${process.env.DKA_MONGO_USERNAME || 'root'}`,
    password: `${process.env.DKA_MONGO_PASSWORD || '123456789'}`,
  },
  dbName: `${process.env.DKA_MONGO_NAME || 'dka-account'}`,
  directConnection: true,
});
