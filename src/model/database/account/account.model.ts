import { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  preference: Schema.Types.ObjectId;
  info: Schema.Types.ObjectId;
  credential: Schema.Types.ObjectId;
  status: Schema.Types.Boolean;
}
