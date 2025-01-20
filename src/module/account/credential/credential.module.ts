import { Module } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { DatabaseConnectionConfig } from '../../../config/database.connection.config';
import { MongooseModule } from '@nestjs/mongoose';
import AccountCredentialSchema, {
  AccountCredentialModel,
} from '../../../schema/account.credential.schema';

@Module({
  imports: [
    DatabaseConnectionConfig,
    MongooseModule.forFeature([
      {
        schema: AccountCredentialSchema,
        name: AccountCredentialModel.modelName,
      },
    ]),
  ],
  controllers: [CredentialController],
  providers: [CredentialService],
})
export class CredentialModule {}
