import { Document, Schema } from 'mongoose';

export interface IAccountCredential extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  parent?: Schema.Types.String;
  email: Schema.Types.String;
  username: Schema.Types.String;
  password: Schema.Types.String;
}
