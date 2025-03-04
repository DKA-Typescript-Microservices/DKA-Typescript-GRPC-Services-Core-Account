import { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  reference: Schema.Types.ObjectId;
  info: Schema.Types.ObjectId;
  place: Schema.Types.ObjectId;
  credential: Schema.Types.ObjectId;
  status: Schema.Types.Boolean;
}
