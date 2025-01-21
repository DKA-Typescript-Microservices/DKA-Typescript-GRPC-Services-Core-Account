import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AccountInfoModel } from '../../../schema/account.info.schema';
import { IAccount } from '../../../model/database/account.model';
import { AccountInfoReadResponse, AccountInfoCreateResponse, AccountInfoReadRequest, IAccountInfo } from '../../../model/proto/info/account.info.gprc';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { AccountModel } from '../../../schema/account.schema';

@Injectable()
export class InfoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;

  private AccountChanges: mongoose.mongo.ChangeStream<any, any> | undefined;

  async onModuleInit() {
    this.AccountChanges = this.account.watch([
      {
        $match: {
          $or: [
            { 'fullDocument.info': { $exists: true } }, // Detect inserts with 'credential'
            { 'updateDescription.updatedFields.info': { $exists: true } }, // Detect updates to 'credential'
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
            this.info.updateOne({ _id: change.fullDocument.info }, { $set: { parent: change.fullDocument._id } }, { session }),
            this.account.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.fullDocument._id } }, { info: change.fullDocument.info }],
              },
              { $unset: { info: '' } },
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
            this.info.updateOne({ _id: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.info}`) }, { $set: { parent: change.documentKey._id } }, { session }),
            this.account.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.documentKey._id } }, { info: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.info}`) }],
              },
              { $unset: { info: '' } },
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
          await this.info.updateOne({ parent: change.documentKey._id }, { $unset: { parent: '' } });
          break;
      }
    });
  }

  async onModuleDestroy() {
    await this.AccountChanges.close();
  }

  async Create(payload: { data: IAccountInfo; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountInfoCreateResponse> {
    return new Promise(async (resolve, reject) => {
      const model = new this.info(payload.data);
      return model
        .save()
        .then((result) => {
          return resolve({
            status: true,
            code: HttpStatus.OK,
            msg: `Successfully Create Data`,
            data: result,
          });
        })
        .catch((error) => {
          return reject({
            status: false,
            code: HttpStatus.SERVICE_UNAVAILABLE,
            msg: `Failed To Insert To Database`,
            error: error,
          });
        });
    });
  }

  async Read(payload: { data: AccountInfoReadRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountInfoReadResponse> {
    return new Promise(async (resolve, reject) => {
      return this.info
        .find()
        .populate('preference')
        .populate('parent')
        .exec()
        .then((result) => {
          return resolve({
            status: true,
            code: HttpStatus.OK,
            msg: `Successfully Get Data`,
            data: result,
          });
        })
        .catch((error) => {
          this.logger.error(error);
          return reject({
            status: false,
            code: HttpStatus.SERVICE_UNAVAILABLE,
            msg: `Failed Get Account Data`,
            error: error,
          });
        });
    });
  }
}
