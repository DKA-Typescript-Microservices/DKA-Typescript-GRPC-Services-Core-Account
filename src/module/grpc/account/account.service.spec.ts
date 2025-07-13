import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as process from 'node:process';
import AccountCredentialSchema from '../../../schema/account/credential/account.credential.schema';
import { ModelConfig } from '../../../config/const/model.config';
import AccountInfoSchema from '../../../schema/account/info/account.info.schema';
import AccountSchema from '../../../schema/account/account.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AccountInfoModule } from './info/account.info.module';
import AccountPlaceSchema from '../../../schema/account/place/account.place.schema';

describe('ProductService', () => {
  let service: AccountService;
  let module: TestingModule; // ⬅️ simpan di scope atas

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        /** **
         * Connection Of database to the Framework
         */
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
        /**
         * Linked Schema data Into The Features
         */
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
        AccountInfoModule,
      ],
      providers: [AccountService],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  afterAll(async () => {
    await module.close(); // 💥 ini yang nutup koneksi2 async (mongoose, microservice, dsb)
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
