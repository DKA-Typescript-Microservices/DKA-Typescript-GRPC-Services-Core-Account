import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AccountCredentialModel } from '../../../schema/account.credential.schema';
import { AccountModel } from '../../../schema/account.schema';
import { IAccount } from '../../../model/database/account.model';
import { Metadata, ServerUnaryCall, status } from '@grpc/grpc-js';
import { IAccountCredential, AccountCredentialCreateResponse, AccountCredentialReadResponse, AccountCredentialReadRequest, AccountCredentialAuthRequest, AccountCredentialAuthResponse } from '../../../model/proto/credential/account.credential.grpc';
import { Status } from '@grpc/grpc-js/build/src/constants';

@Injectable()
export class CredentialService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  private AccountChanges: mongoose.mongo.ChangeStream<any, any> | undefined;

  async onModuleInit() {
    this.AccountChanges = this.account.watch([
      {
        $match: {
          $or: [
            { 'fullDocument.credential': { $exists: true } }, // Detect inserts with 'credential'
            { 'updateDescription.updatedFields.credential': { $exists: true } }, // Detect updates to 'credential'
            // Deteksi delete, kita hanya butuh 'documentKey' untuk ID dokumen yang dihapus
            { operationType: 'delete' },
          ],
        },
      },
    ]);

    this.AccountChanges.on('change', async (change) => {
      const session = await this.account.startSession();
      session.startTransaction();
      // Handle specific change types
      switch (change.operationType) {
        case 'insert':
          await Promise.all([
            this.credential.updateOne({ _id: change.fullDocument.credential }, { $set: { parent: change.fullDocument._id } }, { session }),
            this.account.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.fullDocument._id } }, { credential: change.fullDocument.credential }],
              },
              { $unset: { credential: '' } },
              { session },
            ),
          ])
            .then(async () => {
              await session.commitTransaction();
            })
            .catch(async () => {
              await session.abortTransaction();
            })
            .finally(async () => {
              await session.endSession();
            });
          break;
        case 'update':
          await Promise.all([
            this.credential.updateOne({ _id: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.credential}`) }, { $set: { parent: change.documentKey._id } }, { session }),
            this.account.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.documentKey._id } }, { credential: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.credential}`) }],
              },
              { $unset: { credential: '' } },
              { session },
            ),
          ])
            .then(async () => {
              await session.commitTransaction();
            })
            .catch(async () => {
              await session.abortTransaction();
            })
            .finally(async () => {
              await session.endSession();
            });
          break;
        case 'delete':
          await this.credential.updateOne({ parent: change.documentKey._id }, { $unset: { parent: '' } });
          break;
      }
    });
  }

  async onModuleDestroy() {
    await this.AccountChanges.close();
  }

  async Create(payload: { data: IAccountCredential; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountCredentialCreateResponse> {
    return new Promise((resolve, reject) => {
      const model = new this.credential(payload.data);
      return model
        .save()
        .then((result) => {
          return resolve({ status: true, code: status.OK, msg: `Successfully Create Data`, data: result });
        })
        .catch((error) => {
          return reject({ status: false, code: status.ABORTED, msg: `Failed To Insert To Database`, error: error });
        });
    });
  }

  async Read(payload: { data: AccountCredentialReadRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountCredentialReadResponse> {
    return new Promise(async (resolve, reject) => {
      return this.credential
        .find()
        .select('-password')
        .populate('preference')
        .populate('parent')
        .exec()
        .then((result) => {
          if (result.length < 1)
            return reject({
              status: false,
              code: Status.NOT_FOUND,
              msg: `Data Not Found`,
              error: `not found`,
            });

          return resolve({
            status: true,
            code: Status.OK,
            msg: `Successfully Get Data`,
            data: result,
          });
        })
        .catch((error) => {
          return reject({
            status: false,
            code: Status.ABORTED,
            msg: `Failed Get Account Data`,
            error: error,
          });
        });
    });
  }

  async Auth(payload: { data: AccountCredentialAuthRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountCredentialAuthResponse> {
    return new Promise(async (resolve, reject) => {
      return this.credential
        .findOne({
          $and: [{ $or: [{ username: payload.data.username }, { email: payload.data.username }] }, { password: payload.data.password }],
        })
        .select('-password')
        .populate('preference')
        .populate('parent')
        .exec()
        .then((result) => {
          if (result === null || result === undefined)
            return reject({
              status: false,
              code: Status.UNAUTHENTICATED,
              msg: `Account Tidak Ada`,
              error: `Account not Exists`,
            });

          return resolve({
            status: true,
            code: Status.OK,
            msg: `Successfully Get Data`,
            data: result,
          });
        })
        .catch((error) => {
          this.logger.error(error);
          return reject({
            status: false,
            code: Status.ABORTED,
            msg: `Failed Get Account Data`,
            error: error,
          });
        });
    });
  }
}
