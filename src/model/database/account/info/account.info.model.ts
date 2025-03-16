import { Document, Schema } from 'mongoose';

export interface IAccountInfo extends Document {
  reference?: Schema.Types.ObjectId;
  parent?: Schema.Types.ObjectId;
  first_name: Schema.Types.String;
  last_name: Schema.Types.String;
}
