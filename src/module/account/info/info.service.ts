import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountInfoModel } from '../../../schema/account.info.schema';
import { IAccountInfo } from '../../../model/account.info.model';

@Injectable()
export class InfoService {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;

  async Create(payload: {
    header?: any;
    body?: any;
    query?: any;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (payload.body === undefined)
        return reject({
          status: false,
          code: HttpStatus.BAD_REQUEST,
          msg: `Body Request Is Empty`,
        });
      const model = new this.info(payload.body);
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
    return new Promise((resolve, reject) => {
      return this.info
        .find()
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
