import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account.schema';
import mongoose, { Model } from 'mongoose';
import { IAccount } from '../../model/database/account.model';
import { AccountInfoModel } from '../../schema/account.info.schema';
import { IAccountInfo } from '../../model/database/account.info.model';
import { AccountCredentialModel } from '../../schema/account.credential.schema';
import { IAccountCredential } from '../../model/database/account.credential.model';

@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  private AccountInfoChange: mongoose.mongo.ChangeStream<any, any> | undefined;
  private AccountCredentialChange: mongoose.mongo.ChangeStream<any, any> | undefined;

  async onModuleInit() {
    await Promise.all([this.InfoEvents(), this.CredentialEvents()]);
  }

  async onModuleDestroy() {
    /** Tutup Fungsi Watch **/
    await Promise.all([this.AccountCredentialChange.close(), this.AccountInfoChange.close()]);
  }

  /**
   *
   * @param payload
   * @constructor
   */
  async Create(payload: { header?: any; body?: any; query?: any }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (payload.body === undefined)
        return reject({
          status: false,
          code: HttpStatus.BAD_REQUEST,
          msg: `Body Request Is Empty`,
        });
      const model = new this.account(payload.body);
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

  async Read(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      return this.account
        .find()
        .populate('preference', '-preference -parent')
        .populate('info', '-parent')
        .populate('credential', '-parent -username -password')
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
          return reject({
            status: false,
            code: HttpStatus.SERVICE_UNAVAILABLE,
            msg: `Failed Get Account Data`,
            error: error,
          });
        });
    });
  }

  private async InfoEvents() {
    this.AccountInfoChange = this.info.watch([
      {
        $match: {
          $or: [
            { 'fullDocument.parent': { $exists: true } }, // Detect inserts with 'credential'
            { 'updateDescription.updatedFields.parent': { $exists: true } }, // Detect updates to 'credential'
            // Deteksi delete, kita hanya butuh 'documentKey' untuk ID dokumen yang dihapus
            { operationType: 'delete' },
          ],
        },
      },
    ]);

    this.AccountInfoChange.on('change', async (change) => {
      const session = await this.info.startSession();
      session.startTransaction();
      // Handle specific change types
      switch (change.operationType) {
        case 'insert':
          await Promise.all([
            this.account.updateOne({ _id: change.fullDocument.parent }, { $set: { info: change.fullDocument._id } }),
            this.info.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.fullDocument._id } }, { parent: change.fullDocument.parent }],
              },
              { $unset: { parent: '' } },
              { session },
            ),
          ]);
          break;
        case 'update':
          await Promise.all([this.account.updateOne({ _id: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.parent}`) }, { $set: { info: change.documentKey._id } })]);
          break;
        case 'delete':
          await this.account.updateOne({ info: change.documentKey._id }, { $unset: { info: '' } });
          break;
      }
    });
  }

  private async CredentialEvents() {
    this.AccountCredentialChange = this.credential.watch([
      {
        $match: {
          $or: [
            { 'fullDocument.parent': { $exists: true } }, // Detect inserts with 'credential'
            { 'updateDescription.updatedFields.parent': { $exists: true } }, // Detect updates to 'credential'
            // Deteksi delete, kita hanya butuh 'documentKey' untuk ID dokumen yang dihapus
            { operationType: 'delete' },
          ],
        },
      },
    ]);

    this.AccountCredentialChange.on('change', async (change) => {
      const session = await this.credential.startSession();
      session.startTransaction();
      // Handle specific change types
      switch (change.operationType) {
        case 'insert':
          await Promise.all([
            this.account.updateOne({ _id: change.fullDocument.parent }, { $set: { credential: change.fullDocument._id } }, { session }),
            this.credential.findOneAndUpdate(
              {
                $and: [{ _id: { $ne: change.fullDocument._id } }, { parent: change.fullDocument.parent }],
              },
              { $unset: { parent: '' } },
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
          this.logger.log('update detect', change);
          await Promise.all([this.account.updateOne({ _id: new mongoose.Types.ObjectId(`${change.updateDescription?.updatedFields?.parent}`) }, { $set: { credential: change.documentKey._id } }, { session })])
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
          this.logger.log('delete detect', change);
          await this.account.updateOne({ credential: change.documentKey._id }, { $unset: { credential: '' } });
          break;
      }
    });
  }
}
