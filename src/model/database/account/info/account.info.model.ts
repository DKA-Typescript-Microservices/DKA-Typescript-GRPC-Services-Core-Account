import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

export interface IAccountInfo extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  parent?: Schema.Types.String;
  first_name: Schema.Types.String;
  last_name: Schema.Types.String;
  time_created?: ISysTimeInfo;
  time_updated?: ISysTimeInfo;
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
