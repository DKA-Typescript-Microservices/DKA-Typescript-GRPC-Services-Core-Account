import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from './sys.TimeInfo.model';

export interface IAccountToken extends Document {
  preference: Schema.Types.ObjectId;
  jti: Schema.Types.String;
  sub: Schema.Types.String;
  iss: Schema.Types.String;
  time_created: ISysTimeInfo;
  time_updated: ISysTimeInfo;
  time_expired: ISysTimeInfo;
  status: Schema.Types.Boolean;
}
