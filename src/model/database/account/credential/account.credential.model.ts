import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

export interface IAccountCredential extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  parent?: Schema.Types.String;
  email: Schema.Types.String;
  username: Schema.Types.String;
  password: Schema.Types.String;
  time_created?: ISysTimeInfo;
  time_updated?: ISysTimeInfo;
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
