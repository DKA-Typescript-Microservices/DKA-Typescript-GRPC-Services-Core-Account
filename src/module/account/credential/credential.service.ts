import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountCredentialModel } from '../../../schema/account.credential.schema';
import { IAccountCredential } from '../../../model/account.credential.model';

@Injectable()
export class CredentialService {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

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
      const model = new this.credential(payload.body);
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
      return this.credential
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
