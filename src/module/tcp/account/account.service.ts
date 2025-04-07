import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../../schema/account/account.schema';
import mongoose, { Connection, ConnectionStates, Model } from 'mongoose';
import { AccountCredentialModel } from '../../../schema/account/credential/account.credential.schema';
import { IAccountCredential } from '../../../model/database/account/credential/account.credential.model';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { AccountAuthRequest, AccountByIDRequest, IAccount } from '../../../model/proto/account/account.grpc';
import * as argon2 from 'argon2';
import process from 'node:process';

@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  async onModuleInit() {
    this.logger.verbose(
      `This Services Pointing to Service Session in Host ${process.env.DKA_SERVICE_SESSION_HOST || '127.0.0.1'}:${process.env.DKA_SERVICE_SESSION_PORT || 63301}`,
    );
  }

  async onModuleDestroy() {}

  async ReadById(request: AccountByIDRequest): Promise<IAccount> {
    return new Promise(async (resolve, reject) => {
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          if (request.id === undefined)
            return reject({
              status: false,
              code: Status.INVALID_ARGUMENT,
              msg: `Payload ID Request Is Required`,
              error: `Payload ID Request Is Required`,
            });

          if (!mongoose.Types.ObjectId.isValid(`${request.id}`))
            return reject({
              status: false,
              code: Status.INVALID_ARGUMENT,
              msg: `Payload ID Request Is Not Valid`,
              error: `Payload ID Request Is Not Valid`,
            });

          return this.account
            .findOne({ _id: new mongoose.Types.ObjectId(`${request.id}`) })
            .populate('info', '-_id -parent')
            .populate('credential', '-_id -parent')
            .populate('place', '-_id -parent')
            .sort({ _id: -1 })
            .limit(1)
            .allowDiskUse(true)
            .lean()
            .exec()
            .then((resultGet) => {
              if (resultGet === null || resultGet === undefined)
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });
              /** Successfully Response **/
              // Remove _id
              resultGet.id = resultGet._id.toString(); // Set the `id` field
              delete resultGet._id; // Remove the original _id field
              return resolve(resultGet);
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
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An unexpected error occurred. Please try again later.',
            details: `The development team is investigating the issue.`,
          });
      }
    });
  }

  async Auth(request: AccountAuthRequest): Promise<IAccount> {
    return new Promise(async (resolve, reject) => {
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          return this.credential
            .findOne({
              $or: [{ username: `${request.username}` }, { email: `${request.username}` }],
            })
            .sort({ _id: -1 })
            .limit(1)
            .allowDiskUse(true)
            .exec()
            .then((resultAuth: any) => {
              if (resultAuth === null || resultAuth === undefined)
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Username Not Found`,
                  error: `Data Username Not Found`,
                });

              return argon2
                .verify(resultAuth.password, request.password)
                .then((resultHash) => {
                  if (!resultHash)
                    return reject({
                      status: false,
                      code: Status.UNAUTHENTICATED,
                      msg: `Wrong Password. Not Authorize`,
                      details: 'Wrong Password. Not Authorize',
                    });

                  // next Step Get Account
                  return this.account
                    .findOne({ _id: new mongoose.Types.ObjectId(`${resultAuth.parent}`) })
                    .populate('info', '-_id -parent')
                    .populate('credential', '-_id -parent -password')
                    .populate('place', '-_id -parent')
                    .sort({ _id: -1 })
                    .limit(1)
                    .allowDiskUse(true)
                    .exec()
                    .then((resultGet) => {
                      if (resultGet === null || resultGet === undefined)
                        return reject({
                          status: false,
                          code: Status.NOT_FOUND,
                          msg: `Account Data Not Found`,
                          error: `Account Data Not Found`,
                        });
                      /** Successfully Response **/
                      // Remove _id
                      resultGet.id = resultGet._id.toString(); // Set the `id` field
                      delete resultGet._id; // Remove the original _id field
                      return resolve(resultGet);
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
                })
                .catch(async (error) => {
                  this.logger.error(error);
                  return reject({
                    status: false,
                    code: Status.ABORTED,
                    msg: `Failed Processing Hash. Not Authorize`,
                    details: error,
                  });
                });
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.ABORTED,
                msg: `Failed To Authorize Account`,
                details: error,
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An unexpected error occurred. Please try again later.',
            details: `The development team is investigating the issue.`,
          });
      }
    });
  }
}
