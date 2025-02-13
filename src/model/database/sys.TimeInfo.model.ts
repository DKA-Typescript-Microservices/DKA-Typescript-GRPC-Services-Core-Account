import { Document, Schema } from 'mongoose';

export interface ISysTimeInfo extends Document {
  humanize: Schema.Types.String;
  unix: Schema.Types.Number;
}
