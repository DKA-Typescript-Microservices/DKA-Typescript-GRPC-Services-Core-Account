import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account.schema';
import { Model } from 'mongoose';
import { IAccount } from '../../model/account.model';

@Injectable()
export class AccountService {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;

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
        .populate({
          path: 'preference',
          match: {}, // Tidak ada filter khusus, biarkan tetap bekerja meskipun data tidak ada
          options: { lean: true }, // Opsional, jika ingin mendapatkan object biasa (plain object)
        })
        .populate({
          path: 'info',
          match: {}, // Sama seperti di atas, biarkan jika tidak ada data
          options: { lean: true },
        })
        .populate({
          path: 'credential',
          match: {}, // Biarkan jika data credential tidak ada
          options: { lean: true },
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
