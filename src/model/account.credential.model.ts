import { Document, Types, Schema } from 'mongoose';

export interface IAccountCredential extends Document {
  preference: Types.ObjectId;
  parent: Types.ObjectId;
  email: Schema.Types.String;
  username: Schema.Types.String;
  password: Schema.Types.String;
}
