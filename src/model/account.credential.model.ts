import { Document, Types, Schema } from 'mongoose';

export interface IAccountCredential extends Document {
  preference: Types.ObjectId;
  parent: Types.ObjectId;
  username: Schema.Types.String;
  password: Schema.Types.String;
}
