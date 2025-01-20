import { Document, Types } from 'mongoose';

export interface IAccountInfo extends Document {
  preference: Types.ObjectId;
  parent: Types.ObjectId;
}
