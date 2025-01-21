import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AccountCredentialModel } from '../../../schema/account.credential.schema';
import { IAccountCredential } from '../../../model/account.credential.model';
import { AccountModel } from '../../../schema/account.schema';
import { IAccount } from '../../../model/account.model';

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
      // Handle specific change types
      switch (change.operationType) {
        case 'insert':
          await this.credential
            .updateOne({ _id: change.fullDocument.credential }, { $set: { parent: change.fullDocument._id } })
            .exec()
            .then((result) => {
              this.logger.log(JSON.stringify(result));
            })
            .catch((error) => {
              this.logger.error(JSON.stringify(error));
            });
          break;
        case 'update':
          await this.credential
            .updateOne({ _id: new mongoose.Types.ObjectId(change.updateDescription?.updatedFields?.credential) }, { $set: { parent: change.documentKey._id } })
            .exec()
            .then((result) => {
              this.logger.log(JSON.stringify(result));
            })
            .catch((error) => {
              this.logger.error(JSON.stringify(error));
            });
          break;
        case 'delete':
          await this.credential
            .updateOne({ parent: change.documentKey._id }, { $unset: { parent: '' } })
            .exec()
            .then((result) => {
              this.logger.log(JSON.stringify(result));
            })
            .catch((error) => {
              this.logger.error(JSON.stringify(error));
            });
          break;
      }
    });
  }

  async onModuleDestroy() {
    await this.AccountChanges.close();
  }

  async Create(payload: { header?: any; body?: any; query?: any }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (payload.body === undefined) return reject({ status: false, code: HttpStatus.BAD_REQUEST, msg: `Body Request Is Empty` });
      const model = new this.credential(payload.body);
      return model
        .save()
        .then((result) => {
          return resolve({ status: true, code: HttpStatus.OK, msg: `Successfully Create Data`, data: result });
        })
        .catch((error) => {
          return reject({ status: false, code: HttpStatus.SERVICE_UNAVAILABLE, msg: `Failed To Insert To Database`, error: error });
        });
    });
  }
  async Read(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      return this.credential
        .find()
        .populate({
          path: 'preference',
          match: {}, // Tidak ada filter khusus, biarkan tetap bekerja meskipun data tidak ada
          options: { lean: true }, // Opsional, jika ingin mendapatkan object biasa (plain object)
        })
        .populate({
          path: 'parent',
          match: {}, // Tidak ada filter khusus, biarkan tetap bekerja meskipun data tidak ada
          options: { lean: true }, // Opsional, jika ingin mendapatkan object biasa (plain object)
        })
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
}
