import { Document, Schema } from 'mongoose';

export interface IAccountInfo extends Document {
  reference?: Schema.Types.ObjectId;
  parent?: Schema.Types.ObjectId;
  firstName: Schema.Types.String;
  lastName: Schema.Types.String;
}
