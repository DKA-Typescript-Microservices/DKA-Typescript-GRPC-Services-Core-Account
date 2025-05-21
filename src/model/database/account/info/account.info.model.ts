import { Document, Schema } from 'mongoose';

export interface IAccountInfo extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  parent?: Schema.Types.String;
  first_name: Schema.Types.String;
  last_name: Schema.Types.String;
}
