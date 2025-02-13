import { Document, Schema } from 'mongoose';

export interface IAccountCredential extends Document {
  reference: Schema.Types.ObjectId;
  parent: Schema.Types.ObjectId;
  email: Schema.Types.String;
  username: Schema.Types.String;
  password: Schema.Types.String;
}
