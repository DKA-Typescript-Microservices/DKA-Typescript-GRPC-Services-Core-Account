import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../sys.TimeInfo.model';

export interface IAccount extends Document {
  _id: Schema.Types.String;
  reference: Schema.Types.String;
  info: Schema.Types.String;
  place: Schema.Types.String;
  credential: Schema.Types.String;
  time_created?: ISysTimeInfo;
  time_updated?: ISysTimeInfo;
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
