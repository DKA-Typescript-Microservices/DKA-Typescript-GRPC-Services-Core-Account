import { Document, Types } from 'mongoose';

export interface IAccount extends Document {
  preference: Types.ObjectId;
  info: Types.ObjectId;
  credential: Types.ObjectId;
}
