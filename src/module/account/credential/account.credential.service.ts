import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AccountAuthorizeRequest, AccountAuthorizeResponse, AccountVerifyTokenRequest, IAccount } from '../../../model/proto/account/account.grpc';
import { Metadata, ServerUnaryCall, status } from '@grpc/grpc-js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import mongoose, { Connection, ConnectionStates, Model } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../../schema/account/account.schema';
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
import { DurationInputArg2 } from 'moment';
import * as os from 'node:os';
import { spawnSync } from 'child_process';

@Injectable()
export class AccountCredentialService implements OnModuleInit {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;
  @InjectModel(AccountTokenModel.modelName)
  private readonly token: Model<IAccountToken>;

  private KeyPath = path.join(`/var/tmp`, `${os.hostname()}`);

  async onModuleInit() {
    if (!fs.existsSync(this.KeyPath)) {
      this.logger.verbose(`Create Directory SSL for Encryption Token ...`);
      fs.mkdirSync(this.KeyPath, { recursive: true, mode: 0o755 });
      this.logger.log('Creating RSA Private Key & RSA Public Key For Encryption Token...');
      spawnSync('openssl', ['genpkey', '-algorithm', 'RSA', '-out', path.join(this.KeyPath, 'privkey.pem'), '-pkeyopt', 'rsa_keygen_bits:8192'], { stdio: 'inherit' });
      spawnSync('openssl', ['rsa', '-in', path.join(this.KeyPath, 'privkey.pem'), '-pubout', '-out', path.join(this.KeyPath, 'pubkey.pem')], { stdio: 'inherit' });
    }
  }

  async Authorize(payload: { data: AccountAuthorizeRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountAuthorizeResponse> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(path.join(this.KeyPath, './pubkey.pem')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `public key is missing, miss configured.`,
          details: 'Please Create A SSL Public Key Encrypted.',
        });

      const publicKey = fs.readFileSync(path.join(this.KeyPath, './pubkey.pem'));

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
                  /** Signing Data **/
                  const timeNow = moment(moment.now());

                  const jti = v5(timeNow.toISOString(true), v5.DNS);

                  const AccessTokenExpires = timeNow
                    .clone()
                    .add(Number(`${process.env.ACCESS_TOKEN_EXPIRES_AMOUNT || 5}`), `${(process.env.ACCESS_TOKEN_EXPIRES_UNIT as DurationInputArg2) || 'minutes'}`);
                  const RefreshTokenExpires = timeNow
                    .clone()
                    .add(Number(`${process.env.REFRESH_TOKEN_EXPIRES_AMOUNT || 1}`), `${(process.env.REFRESH_TOKEN_EXPIRES_UNIT as DurationInputArg2) || 'days'}`);

                  const AccessToken = new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(AccessTokenExpires.unix())
                    .setAudience(resultGet.id)
                    .setJti(jti)
                    .setIssuer(`${process.env.ACCESS_TOKEN_ISSUER || 'service-core-account'}`)
                    .setSubject(`${process.env.ACCESS_TOKEN_SUBJECT || 'access_token'}`);

                  const RefreshToken = new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(RefreshTokenExpires.unix())
                    .setAudience(resultGet.id)
                    .setJti(jti)
                    .setIssuer(`${process.env.REFRESH_TOKEN_ISSUER || 'service-core-account'}`)
                    .setSubject(`${process.env.REFRESH_TOKEN_SUBJECT || 'refresh_token'}`);

                  const tokenQuery = new this.token({
                    reference: resultGet.id,
                    jti: jti,
                    iss: `${process.env.REFRESH_TOKEN_ISSUER || 'service-core-account'}`,
                    sub: `${process.env.REFRESH_TOKEN_SUBJECT || 'refresh_token'}`,
                    time_expired: {
                      humanize: moment(RefreshTokenExpires).format('HH:mm:ss DD MMMM YYYY'),
                      unix: RefreshTokenExpires.unix(),
                    },
                  });

                  return Promise.all([AccessToken.encrypt(createPublicKey(publicKey)), RefreshToken.encrypt(createPublicKey(publicKey))])
                    .then(async ([accessToken, refreshToken]: any) => {
                      return tokenQuery
                        .save()
                        .then(() => {
                          /** enc token **/
                          return resolve({
                            tokenType: 'Bearer',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            expiresIn: moment.duration(AccessTokenExpires.diff(timeNow)).asSeconds(),
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

  async verifyToken(payload: { data: AccountVerifyTokenRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<IAccount> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(path.join(this.KeyPath, './privkey.pem')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `private key is missing, miss configured.`,
          details: 'Please Create A SSL Private Key Decrypted.',
        });

      const privateKey = fs.readFileSync(path.join(this.KeyPath, './privkey.pem'));

      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        subject: `${process.env.ACCESS_TOKEN_SUBJECT || 'access_token'}`,
        issuer: `${process.env.ACCESS_TOKEN_ISSUER || 'service-core-account'}`,
      })
        .then(({ payload }) => {
          return resolve(payload as IAccount);
        })
        .catch((error) => {
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
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(path.join(this.KeyPath, './privkey.pem')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `private key is missing, miss configured.`,
          details: 'Please Create A SSL Private Key Decrypted.',
        });

      if (!fs.existsSync(path.join(this.KeyPath, './pubkey.pem')))
        return reject({
          status: false,
          code: Status.INTERNAL,
          msg: `Public key is missing, miss configured.`,
          details: 'Please Create A SSL Public Key Encrypted.',
        });

      const privateKey = fs.readFileSync(path.join(this.KeyPath, './privkey.pem'));
      const publicKey = fs.readFileSync(path.join(this.KeyPath, './pubkey.pem'));

      //#########################################
      const timeNow = moment(moment.now());
      //#########################################

      return jwtDecrypt(payload.data.token, createPrivateKey(privateKey), {
        issuer: `${process.env.REFRESH_TOKEN_ISSUER || 'service-core-account'}`,
        subject: `${process.env.REFRESH_TOKEN_SUBJECT || 'refresh_token'}`,
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
                  code: Status.RESOURCE_EXHAUSTED,
                  msg: `Token has been revocation. please generate new token`,
                  details: 'Token has been revocation or failed. Please request a new one.',
                });

              return this.account
                .findOne({ _id: new mongoose.Types.ObjectId(`${decodeData.payload.id}`) })
                .populate('info', '-_id -parent')
                .populate('credential', '-_id -parent')
                .populate('place', '-_id -parent')
                .sort({ _id: -1 })
                .limit(1)
                .allowDiskUse(true)
                .lean()
                .exec()
                .then((resultGet) => {
                  const AccessTokenExpires = timeNow
                    .clone()
                    .add(Number(`${process.env.ACCESS_TOKEN_EXPIRES_AMOUNT || 5}`), `${(process.env.ACCESS_TOKEN_EXPIRES_UNIT as DurationInputArg2) || 'minutes'}`);

                  resultGet.id = resultGet._id.toString(); // Set the `id` field
                  delete resultGet._id; // Remove the original _id field

                  return new EncryptJWT(resultGet)
                    .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
                    .setExpirationTime(AccessTokenExpires.unix())
                    .setAudience(resultGet.id)
                    .setIssuer(`${process.env.ACCESS_TOKEN_ISSUER || 'service-core-account'}`)
                    .setSubject(`${process.env.ACCESS_TOKEN_SUBJECT || 'access_token'}`)
                    .encrypt(createPublicKey(publicKey))
                    .then((newToken) => {
                      return resolve({
                        tokenType: 'Bearer',
                        accessToken: newToken,
                        refreshToken: payload.data.token,
                        expiresIn: moment.duration(AccessTokenExpires.diff(timeNow)).asSeconds(),
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
