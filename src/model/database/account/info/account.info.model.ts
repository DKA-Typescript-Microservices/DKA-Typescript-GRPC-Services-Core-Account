import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

export interface IAccountInfo extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  parent?: Schema.Types.String;
  /**
   * adalah data pribadi akun yang di integrasikan dengan data biodata atau data personal di dalam database
   */
  first_name: Schema.Types.String;
  last_name: Schema.Types.String;
  /**
   * adalah data jenis kelamin data user di dalam system databse di dalm services akun di dalam servive account
   */
  gendre: Schema.Types.String;
  time_created?: ISysTimeInfo;
  time_updated?: ISysTimeInfo;
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
