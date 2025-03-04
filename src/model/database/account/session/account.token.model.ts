import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

/**
 * Model Data Untuk Account Refresh Token Data Digunakan Pemuatan Session Data
 */
export interface IAccountToken extends Document {
  reference: Schema.Types.ObjectId;
  jti: Schema.Types.String;
  sub: Schema.Types.String;
  iss: Schema.Types.String;
  time_created: ISysTimeInfo;
  time_updated: ISysTimeInfo;
  time_expired: ISysTimeInfo;
  status: Schema.Types.Boolean;
}
