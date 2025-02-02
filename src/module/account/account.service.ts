import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account.schema';
import mongoose, { Connection, ConnectionStates, Model } from 'mongoose';
import { AccountInfoModel } from '../../schema/account.info.schema';
import { IAccountInfo } from '../../model/database/account.info.model';
import { AccountCredentialModel } from '../../schema/account.credential.schema';
import { IAccountCredential } from '../../model/database/account.credential.model';
import { Metadata, ServerUnaryCall, ServerWritableStream, status } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  AccountCreateRequest,
  AccountCreateResponse,
  AccountGetTokenRequest,
  AccountGetTokenResponse,
  AccountReadRequest,
  AccountReadResponse,
  AccountVerifyTokenRequest,
  AccountVerifyTokenResponse,
  IAccount,
} from '../../model/proto/account/account.grpc';
import { Observable, Subject } from 'rxjs';
import { ModelConfig } from '../../config/const/model.config';
import * as moment from 'moment-timezone';
import { EncryptJWT, jwtDecrypt } from 'jose';

import { createPrivateKey, createPublicKey } from 'crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { v5 } from 'uuid';
import { AccountTokenModel } from '../../schema/account.token.schema';
import { IAccountToken } from '../../model/database/account.token.model';

@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  @InjectModel(AccountTokenModel.modelName)
  private readonly token: Model<IAccountToken>;

  async onModuleInit() {}

  async onModuleDestroy() {}

  /**
   *
   * @param payload
   * @constructor
   */
  async Create(payload: { data: AccountCreateRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountCreateResponse> {
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();
          /** Init Model **/
          const info = new this.info(payload.data.info);
          const credential = new this.credential(payload.data.credential);
          /** Save Child Collection Account **/
          return Promise.all([info.save({ session }), credential.save({ session })])
            .then(async ([info, credential]) => {
              const account = new this.account({ credential: credential.id, info: info.id });
              return account
                .save({ session })
                .then(async (finalResult: any) => {
                  return Promise.all([
                    this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }),
                    this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session }),
                  ])
                    .then(async () => {
                      await session.commitTransaction();
                      return resolve({
                        status: true,
                        code: status.OK,
                        msg: `Successfully Create Data`,
                      });
                    })
                    .catch(async (error) => {
                      this.logger.verbose('step 3');
                      this.logger.error(JSON.stringify(error));
                      await session.abortTransaction();
                      return reject({
                        status: false,
                        code: status.ABORTED,
                        msg: error,
                      });
                    })
                    .finally(async () => {
                      await session.endSession();
                    });
                })
                .catch(async (error) => {
                  this.logger.verbose('step 2');
                  this.logger.error(JSON.stringify(error));
                  await session.abortTransaction();
                  await session.endSession();
                  return reject({
                    status: false,
                    code: status.ABORTED,
                    msg: error,
                  });
                });
            })
            .catch(async (reason) => {
              this.logger.verbose('step 1');
              this.logger.error(JSON.stringify(reason));
              await session.abortTransaction();
              await session.endSession();
              return reject({
                status: false,
                code: status.ABORTED,
                msg: reason,
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: status.UNAVAILABLE,
            msg: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: status.UNKNOWN,
            msg: 'An unexpected error occurred. Please try again later.',
            details: `The development team is investigating the issue.`,
          });
      }
    });
  }

  async ReadAll(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerUnaryCall<AccountReadRequest, AccountReadResponse> }): Promise<AccountReadResponse> {
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          const query = this.account.aggregate([
            {
              $lookup: {
                from: ModelConfig.accountInfo, // Nama koleksi yang di-referensikan oleh 'info'
                localField: 'info',
                foreignField: '_id',
                as: 'info',
              },
            },
            {
              $unwind: {
                path: '$info',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                'info._id': 0,
                'info.parent': 0,
              },
            },
            {
              $lookup: {
                from: ModelConfig.accountCredential, // Nama koleksi yang di-referensikan oleh 'credential'
                localField: 'credential',
                foreignField: '_id',
                as: 'credential',
              },
            },
            {
              $unwind: {
                path: '$credential',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                'credential._id': 0,
                'credential.password': 0,
                'credential.parent': 0,
              },
            },
          ]);
          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.allowDiskUse !== undefined)
            query.allowDiskUse(payload.data.options.allowDiskUse);
          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);
          return query
            .exec()
            .then((result) => {
              if (result.length < 1)
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });

              return resolve({
                status: true,
                code: Status.OK,
                msg: `Successfully Get Data`,
                data: result,
                metadata: {
                  count: result.length,
                },
              });
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.ABORTED,
                msg: `Failed Get Account Data`,
                details: error,
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async ReadAllStream(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerWritableStream<AccountReadRequest, IAccount> }): Promise<Observable<IAccount>> {
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Declaration Function **/
          const query = this.account.aggregate([
            {
              $lookup: {
                from: ModelConfig.accountInfo, // Nama koleksi yang di-referensikan oleh 'info'
                localField: 'info',
                foreignField: '_id',
                as: 'info',
              },
            },
            {
              $unwind: {
                path: '$info',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                'info._id': 0,
                'info.parent': 0,
              },
            },
            {
              $lookup: {
                from: ModelConfig.accountCredential, // Nama koleksi yang di-referensikan oleh 'credential'
                localField: 'credential',
                foreignField: '_id',
                as: 'credential',
              },
            },
            {
              $unwind: {
                path: '$credential',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                'credential._id': 0,
                'credential.password': 0,
                'credential.parent': 0,
              },
            },
          ]);

          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.allowDiskUse !== undefined)
            query.allowDiskUse(payload.data.options.allowDiskUse);
          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);

          query.exec().then((r) => this.logger.verbose(r.length));
          const stream = query.cursor().addCursorFlag('noCursorTimeout', true);
          const metaData = new Metadata();
          const startTime = moment(moment.now());

          const subject = new Subject<IAccount>();

          payload.call.on('close', async () => {
            if (!stream.closed) await stream.close();
          });

          let num = 0;
          stream.on('data', async (doc) => {
            setTimeout(() => {
              subject.next(doc);
            }, 200);
            this.logger.log(num);
            num++;
          });

          /**
           * Jika stream selesai secara alami
           */
          stream.on('end', async () => {
            this.logger.verbose('selesai');
            const endTime = moment(moment.now());
            const processingTime = moment.duration(endTime.diff(startTime));
            // Kirim metadata ke client sebelum stream ditutup
            metaData.set('x-time-started', startTime.toISOString(true));
            metaData.set('x-time-finished', endTime.toISOString(true));
            metaData.set('x-time-processing', `${processingTime.hours()} h, ${processingTime.minutes()} m, ${processingTime.seconds()} s, ${processingTime.milliseconds()} ms`);
            subject.complete();
            payload.call.end(metaData);
            if (!stream.closed) await stream.close();
          });

          /**
           * Jika terjadi error pada stream
           */
          stream.on('error', async (err) => {
            this.logger.log('Stream error:', err);
            subject.error(err);
            if (!stream.closed) await stream.close();
          });

          return resolve(subject.asObservable());
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async getToken(payload: { data: AccountGetTokenRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountGetTokenResponse> {
    return new Promise(async (resolve, reject) => {
      const publicKey = fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/public.key'));
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          return this.credential
            .findOne({
              $and: [
                {
                  $or: [{ username: `${payload.data.username}` }, { email: `${payload.data.username}` }],
                },
                { password: `${payload.data.password}` },
              ],
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
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });
              // next Step Get Account
              return this.account
                .findOne({ _id: new mongoose.Types.ObjectId(`${resultAuth.parent}`) })
                .populate('info', '-_id -parent')
                .populate('credential', '-_id -parent')
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
                  /** Signing Data **/
                  const timeNow = moment(moment.now());

                  const jti = v5(timeNow.toISOString(true), v5.DNS);

                  const RefreshTokenExpires = timeNow.add(1, 'days').unix();

                  const AccessToken = new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(timeNow.add(15, 'minutes').unix())
                    .setAudience(resultGet.id)
                    .setIssuer('service-core-account')
                    .setSubject('access_token');

                  const RefreshToken = new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(RefreshTokenExpires)
                    .setIssuer('service-core-account')
                    .setAudience(resultGet.id)
                    .setJti(jti)
                    .setSubject('refresh_token');

                  const tokenQuery = new this.token({
                    preference: resultGet.id,
                    jti: jti,
                    sub: 'refresh_token',
                    iss: 'service-core-account',
                    time_expired: {
                      humanize: moment.unix(RefreshTokenExpires).format('HH:mm:ss DD MMMM YYYY'),
                      unix: RefreshTokenExpires,
                    },
                  });

                  return Promise.all([AccessToken.encrypt(createPublicKey(publicKey)), RefreshToken.encrypt(createPublicKey(publicKey))])
                    .then(async ([accessToken, refreshToken]: any) => {
                      return tokenQuery
                        .save()
                        .then(() => {
                          /** enc token **/
                          return resolve({
                            status: true,
                            code: Status.OK,
                            msg: `Successfully to Created Token`,
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                          });
                        })
                        .catch((error) => {
                          this.logger.error(error);
                          return reject({
                            status: false,
                            code: Status.INTERNAL,
                            msg: `Failed To Save JTI Into Database`,
                            details: 'A system error was encountered. The development team is investigating.',
                          });
                        });
                    })
                    .catch((error) => {
                      this.logger.error(error);
                      return reject({
                        status: false,
                        code: Status.UNAUTHENTICATED,
                        msg: `Failed To Generate Access Token / Refresh Token`,
                        details: 'A system error was encountered. The development team is investigating.',
                      });
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
            code: status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async verifyToken(payload: { data: AccountVerifyTokenRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountVerifyTokenResponse> {
    const privateKey = fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/private.key'));
    return new Promise(async (resolve, reject) => {
      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        subject: 'access_token',
        issuer: 'service-core-account',
      })
        .then((decodeData) => {
          this.logger.verbose(decodeData.payload);
          return resolve({
            status: false,
            code: Status.OK,
            msg: `Successfully Get Data`,
            data: decodeData.payload as any,
          });
        })
        .catch((error) => {
          this.logger.error(error);
          switch (error.name) {
            case 'JWTExpired':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Token has expired.`,
                details: 'The token has expired. Please request a new one.',
              });

            case 'JWEDecryptionFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid or malformed token.`,
                details: 'The token is malformed or could not be decoded.',
              });

            case 'NotBeforeError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Token is not active yet.`,
                details: 'The token is not yet active based on the "nbf" claim.',
              });

            case 'JsonWebTokenIssuerError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid issuer.`,
                details: 'The issuer of the token is not valid. Please check the token issuer.',
              });

            case 'JsonWebTokenSubjectError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid subject.`,
                details: 'The subject of the token is not valid. Please check the token subject.',
              });

            case 'JOSEAlgNotAllowed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Algorithm not allowed.`,
                details: 'The algorithm used in the token is not allowed. Please check the token algorithm.',
              });

            case 'JOSEError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JOSE error.`,
                details: 'There was an issue with JOSE encoding or decoding. Please check the token structure.',
              });

            case 'JOSENotSupported':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JOSE format not supported.`,
                details: 'The JOSE format used in the token is not supported. Please check the token format.',
              });

            case 'JWEInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWE.`,
                details: 'The JWE (JSON Web Encryption) is invalid. Please check the encryption settings.',
              });

            case 'JWKInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWK.`,
                details: 'The JSON Web Key (JWK) is invalid or cannot be used for this operation.',
              });

            case 'JWKSInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWKS.`,
                details: 'The JSON Web Key Set (JWKS) is invalid or cannot be used.',
              });

            case 'JWKSMultipleMatchingKeys':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Multiple matching keys in JWKS.`,
                details: 'There are multiple keys in the JWKS that match the token. Only one key should match.',
              });

            case 'JWKSNoMatchingKey':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `No matching key in JWKS.`,
                details: 'No key was found in the JWKS that matches the token. Please check the key set.',
              });

            case 'JWKSTimeout':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWKS timeout.`,
                details: 'The process of fetching JWKS timed out. Please try again later.',
              });

            case 'JWSInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWS.`,
                details: 'The JWS (JSON Web Signature) is invalid. Please check the signature.',
              });

            case 'JWSSignatureVerificationFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWS signature verification failed.`,
                details: 'The signature verification for the JWS failed. Please check the signing key or process.',
              });

            case 'JWTClaimValidationFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWT claim validation failed.`,
                details: 'The claims in the JWT did not pass validation. Please check the claim values.',
              });

            case 'JWTInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWT.`,
                details: 'The JWT is invalid. Please check the token structure or claims.',
              });

            default:
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `${error.toString()}`,
                details: 'The token might be corrupted or incorrect.',
              });
          }
        });
    });
  }

  async refreshToken(payload: { data: AccountVerifyTokenRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountGetTokenResponse> {
    const privateKey = fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/private.key'));
    const timeNow = moment(moment.now());
    const publicKey = fs.readFileSync(path.join(path.dirname(require.main.filename), './config/ssl/server/public.key'));
    return new Promise(async (resolve, reject) => {
      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        subject: 'refresh_token',
        issuer: 'service-core-account',
      })
        .then((decodeData) => {
          this.logger.verbose(decodeData.payload);

          this.token
            .findOne({ jti: decodeData.payload.jti })
            .allowDiskUse(true)
            .lean()
            .exec()
            .then((findJti) => {
              if (findJti === undefined || findJti === null)
                return reject({
                  status: false,
                  code: Status.UNAVAILABLE,
                  msg: `failed to check jti token. or not exists`,
                  details: 'jti token not exist or failed. Please request a new one.',
                });

              if (!findJti.status)
                return reject({
                  status: false,
                  code: Status.FAILED_PRECONDITION,
                  msg: `Token has been revocation. please generate new token`,
                  details: 'Token has been revocation or failed. Please request a new one.',
                });

              return this.account
                .findOne({ _id: new mongoose.Types.ObjectId(`${decodeData.payload.id}`) })
                .populate('info', '-_id -parent')
                .populate('credential', '-_id -parent')
                .sort({ _id: -1 })
                .limit(1)
                .allowDiskUse(true)
                .lean()
                .exec()
                .then((resultGet) => {
                  return new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(timeNow.add(15, 'minutes').unix())
                    .setAudience(resultGet.id)
                    .setIssuer('service-core-account')
                    .setSubject('access_token')
                    .encrypt(createPublicKey(publicKey))
                    .then((newToken) => {
                      return resolve({
                        status: false,
                        code: Status.OK,
                        msg: `Successfully Get Data`,
                        accessToken: newToken,
                        refreshToken: payload.data.token,
                      });
                    })
                    .catch((error) => {
                      this.logger.error(error);
                      return reject({
                        status: false,
                        code: Status.UNAUTHENTICATED,
                        msg: `Failed To Generate Access Token / Refresh Token`,
                        details: 'A system error was encountered. The development team is investigating.',
                      });
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
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `failed to check jti token. or not exists`,
                details: 'jti token not exist or failed. Please request a new one.',
              });
            });
        })
        .catch((error) => {
          this.logger.error(error);
          switch (error.name) {
            case 'JWTExpired':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Token has expired.`,
                details: 'The token has expired. Please request a new one.',
              });

            case 'JWEDecryptionFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid or malformed token.`,
                details: 'The token is malformed or could not be decoded.',
              });

            case 'NotBeforeError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Token is not active yet.`,
                details: 'The token is not yet active based on the "nbf" claim.',
              });

            case 'JsonWebTokenIssuerError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid issuer.`,
                details: 'The issuer of the token is not valid. Please check the token issuer.',
              });

            case 'JsonWebTokenSubjectError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid subject.`,
                details: 'The subject of the token is not valid. Please check the token subject.',
              });

            case 'JOSEAlgNotAllowed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Algorithm not allowed.`,
                details: 'The algorithm used in the token is not allowed. Please check the token algorithm.',
              });

            case 'JOSEError':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JOSE error.`,
                details: 'There was an issue with JOSE encoding or decoding. Please check the token structure.',
              });

            case 'JOSENotSupported':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JOSE format not supported.`,
                details: 'The JOSE format used in the token is not supported. Please check the token format.',
              });

            case 'JWEInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWE.`,
                details: 'The JWE (JSON Web Encryption) is invalid. Please check the encryption settings.',
              });

            case 'JWKInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWK.`,
                details: 'The JSON Web Key (JWK) is invalid or cannot be used for this operation.',
              });

            case 'JWKSInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWKS.`,
                details: 'The JSON Web Key Set (JWKS) is invalid or cannot be used.',
              });

            case 'JWKSMultipleMatchingKeys':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Multiple matching keys in JWKS.`,
                details: 'There are multiple keys in the JWKS that match the token. Only one key should match.',
              });

            case 'JWKSNoMatchingKey':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `No matching key in JWKS.`,
                details: 'No key was found in the JWKS that matches the token. Please check the key set.',
              });

            case 'JWKSTimeout':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWKS timeout.`,
                details: 'The process of fetching JWKS timed out. Please try again later.',
              });

            case 'JWSInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWS.`,
                details: 'The JWS (JSON Web Signature) is invalid. Please check the signature.',
              });

            case 'JWSSignatureVerificationFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWS signature verification failed.`,
                details: 'The signature verification for the JWS failed. Please check the signing key or process.',
              });

            case 'JWTClaimValidationFailed':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `JWT claim validation failed.`,
                details: 'The claims in the JWT did not pass validation. Please check the claim values.',
              });

            case 'JWTInvalid':
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `Invalid JWT.`,
                details: 'The JWT is invalid. Please check the token structure or claims.',
              });

            default:
              return reject({
                status: false,
                code: Status.UNAUTHENTICATED,
                msg: `${error.toString()}`,
                details: 'The token might be corrupted or incorrect.',
              });
          }
        });
    });
  }
}
