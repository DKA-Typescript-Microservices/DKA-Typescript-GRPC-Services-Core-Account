import { Injectable, Logger } from '@nestjs/common';
import { AccountAuthorizeRequest, AccountAuthorizeResponse, AccountVerifyTokenRequest, AccountVerifyTokenResponse, IAccount } from '../../../model/proto/account/account.grpc';
import { Metadata, ServerUnaryCall, status } from '@grpc/grpc-js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import mongoose, { Connection, ConnectionStates, Model } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../../schema/account/account.schema';
import { AccountInfoModel } from '../../../schema/account/info/account.info.schema';
import { IAccountInfo } from '../../../model/database/account/info/account.info.model';
import { AccountCredentialModel } from '../../../schema/account/credential/account.credential.schema';
import { IAccountCredential } from '../../../model/database/account/credential/account.credential.model';
import { AccountTokenModel } from '../../../schema/account/session/account.token.schema';
import { IAccountToken } from '../../../model/database/account/session/account.token.model';
import { v5 } from 'uuid';
import * as moment from 'moment-timezone';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { createPublicKey } from 'crypto';
import { createPrivateKey } from 'node:crypto';

@Injectable()
export class AccountCredentialService {
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

  async Authorize(payload: { data: AccountAuthorizeRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountAuthorizeResponse> {
    return new Promise(async (resolve, reject) => {
      const rootDirectory = path.dirname(require.main.filename);
      const pathRelativeOfServerSSL = './config/ssl/server';

      const pathOfServerSSL = path.join(rootDirectory, pathRelativeOfServerSSL);

      if (!fs.existsSync(pathOfServerSSL)) {
        fs.mkdirSync(pathOfServerSSL, { recursive: true, mode: 0o755 });
      }

      if (!fs.existsSync(path.join(pathOfServerSSL, './public.key')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `public key is missing, miss configured.`,
          details: 'Please Create A SSL Public Key Encrypted.',
        });

      const publicKey = fs.readFileSync(path.join(pathOfServerSSL, './public.key'));

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

                  const AccessTokenExpires = timeNow.add(20, 'seconds').unix();
                  const RefreshTokenExpires = timeNow.add(1, 'days').unix();

                  const AccessToken = new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(AccessTokenExpires)
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
    return new Promise(async (resolve, reject) => {
      const rootDirectory = path.dirname(require.main.filename);
      const pathRelativeOfServerSSL = './config/ssl/server';

      const pathOfServerSSL = path.join(rootDirectory, pathRelativeOfServerSSL);

      if (!fs.existsSync(pathOfServerSSL)) {
        fs.mkdirSync(pathOfServerSSL, { recursive: true, mode: 0o755 });
      }

      if (!fs.existsSync(path.join(pathOfServerSSL, './private.key')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `private key is missing, miss configured.`,
          details: 'Please Create A SSL Private Key Decrypted.',
        });

      const privateKey = fs.readFileSync(path.join(pathOfServerSSL, './private.key'));

      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        subject: 'access_token',
        issuer: 'service-core-account',
      })
        .then((decodeData) => {
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
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid or malformed token.`,
                details: 'The token is malformed or could not be decoded.',
              });

            case 'NotBeforeError':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `Token is not active yet.`,
                details: 'The token is not yet active based on the "nbf" claim.',
              });

            case 'JsonWebTokenIssuerError':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Invalid issuer.`,
                details: 'The issuer of the token is not valid. Please check the token issuer.',
              });

            case 'JsonWebTokenSubjectError':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Invalid subject.`,
                details: 'The subject of the token is not valid. Please check the token subject.',
              });

            case 'JOSEAlgNotAllowed':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Algorithm not allowed.`,
                details: 'The algorithm used in the token is not allowed. Please check the token algorithm.',
              });

            case 'JOSEError':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `JOSE error.`,
                details: 'There was an issue with JOSE encoding or decoding. Please check the token structure.',
              });

            case 'JOSENotSupported':
              return reject({
                status: false,
                code: Status.UNAVAILABLE,
                msg: `JOSE format not supported.`,
                details: 'The JOSE format used in the token is not supported. Please check the token format.',
              });

            case 'JWEInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWE.`,
                details: 'The JWE (JSON Web Encryption) is invalid. Please check the encryption settings.',
              });

            case 'JWKInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWK.`,
                details: 'The JSON Web Key (JWK) is invalid or cannot be used for this operation.',
              });

            case 'JWKSInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWKS.`,
                details: 'The JSON Web Key Set (JWKS) is invalid or cannot be used.',
              });

            case 'JWKSMultipleMatchingKeys':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `Multiple matching keys in JWKS.`,
                details: 'There are multiple keys in the JWKS that match the token. Only one key should match.',
              });

            case 'JWKSNoMatchingKey':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `No matching key in JWKS.`,
                details: 'No key was found in the JWKS that matches the token. Please check the key set.',
              });

            case 'JWKSTimeout':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWKS timeout.`,
                details: 'The process of fetching JWKS timed out. Please try again later.',
              });

            case 'JWSInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWS.`,
                details: 'The JWS (JSON Web Signature) is invalid. Please check the signature.',
              });

            case 'JWSSignatureVerificationFailed':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWS signature verification failed.`,
                details: 'The signature verification for the JWS failed. Please check the signing key or process.',
              });

            case 'JWTClaimValidationFailed':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWT claim validation failed.`,
                details: 'The claims in the JWT did not pass validation. Please check the claim values.',
              });

            case 'JWTInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWT.`,
                details: 'The JWT is invalid. Please check the token structure or claims.',
              });

            default:
              return reject({
                status: false,
                code: Status.UNIMPLEMENTED,
                msg: `${error.toString()}`,
                details: 'The token might be corrupted or incorrect.',
              });
          }
        });
    });
  }

  async refreshToken(payload: { data: AccountVerifyTokenRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountAuthorizeResponse> {
    //#########################################
    const timeNow = moment(moment.now());
    //#########################################
    return new Promise(async (resolve, reject) => {
      const rootDirectory = path.dirname(require.main.filename);
      const pathRelativeOfServerSSL = './config/ssl/server';

      const pathOfServerSSL = path.join(rootDirectory, pathRelativeOfServerSSL);

      if (!fs.existsSync(pathOfServerSSL)) {
        fs.mkdirSync(pathOfServerSSL, { recursive: true, mode: 0o755 });
      }

      if (!fs.existsSync(path.join(pathOfServerSSL, './private.key')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `private key is missing, miss configured.`,
          details: 'Please Create A SSL Private Key Decrypted.',
        });

      if (!fs.existsSync(path.join(pathOfServerSSL, './public.key')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `Public key is missing, miss configured.`,
          details: 'Please Create A SSL Public Key Encrypted.',
        });

      const privateKey = fs.readFileSync(path.join(pathOfServerSSL, './private.key'));
      const publicKey = fs.readFileSync(path.join(pathOfServerSSL, './public.key'));

      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        subject: 'refresh_token',
        issuer: 'service-core-account',
      })
        .then((decodeData) => {
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
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid or malformed token.`,
                details: 'The token is malformed or could not be decoded.',
              });

            case 'NotBeforeError':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `Token is not active yet.`,
                details: 'The token is not yet active based on the "nbf" claim.',
              });

            case 'JsonWebTokenIssuerError':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Invalid issuer.`,
                details: 'The issuer of the token is not valid. Please check the token issuer.',
              });

            case 'JsonWebTokenSubjectError':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Invalid subject.`,
                details: 'The subject of the token is not valid. Please check the token subject.',
              });

            case 'JOSEAlgNotAllowed':
              return reject({
                status: false,
                code: Status.UNKNOWN,
                msg: `Algorithm not allowed.`,
                details: 'The algorithm used in the token is not allowed. Please check the token algorithm.',
              });

            case 'JOSEError':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `JOSE error.`,
                details: 'There was an issue with JOSE encoding or decoding. Please check the token structure.',
              });

            case 'JOSENotSupported':
              return reject({
                status: false,
                code: Status.UNAVAILABLE,
                msg: `JOSE format not supported.`,
                details: 'The JOSE format used in the token is not supported. Please check the token format.',
              });

            case 'JWEInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWE.`,
                details: 'The JWE (JSON Web Encryption) is invalid. Please check the encryption settings.',
              });

            case 'JWKInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWK.`,
                details: 'The JSON Web Key (JWK) is invalid or cannot be used for this operation.',
              });

            case 'JWKSInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWKS.`,
                details: 'The JSON Web Key Set (JWKS) is invalid or cannot be used.',
              });

            case 'JWKSMultipleMatchingKeys':
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `Multiple matching keys in JWKS.`,
                details: 'There are multiple keys in the JWKS that match the token. Only one key should match.',
              });

            case 'JWKSNoMatchingKey':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `No matching key in JWKS.`,
                details: 'No key was found in the JWKS that matches the token. Please check the key set.',
              });

            case 'JWKSTimeout':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWKS timeout.`,
                details: 'The process of fetching JWKS timed out. Please try again later.',
              });

            case 'JWSInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWS.`,
                details: 'The JWS (JSON Web Signature) is invalid. Please check the signature.',
              });

            case 'JWSSignatureVerificationFailed':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWS signature verification failed.`,
                details: 'The signature verification for the JWS failed. Please check the signing key or process.',
              });

            case 'JWTClaimValidationFailed':
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: `JWT claim validation failed.`,
                details: 'The claims in the JWT did not pass validation. Please check the claim values.',
              });

            case 'JWTInvalid':
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: `Invalid JWT.`,
                details: 'The JWT is invalid. Please check the token structure or claims.',
              });

            default:
              return reject({
                status: false,
                code: Status.UNIMPLEMENTED,
                msg: `${error.toString()}`,
                details: 'The token might be corrupted or incorrect.',
              });
          }
        });
    });
  }
}
