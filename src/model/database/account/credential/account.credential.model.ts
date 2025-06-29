import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

export interface IAccountCredential extends Document {
  _id: Schema.Types.String;
  reference?: Schema.Types.String;
  /**
   * adalah data id collection induk di dalam service account data untuk dilakukan datra infrtevbrity check di dalam databse account services
   */
  parent?: Schema.Types.String;
  /**
   * adalah data email yanmg biasa akan digunakan untuk data login akun pengguina di dalam services account untuk keperluan validation data di dalam database
   */
  email: Schema.Types.String;
  /**
   * adalah credential ussername login authentification di dalam database untuk di dalam account service akun di dalam databse data di dalam database
   */
  username: Schema.Types.String;
  /**
   * adalah password akun yang di hash di dalam database data di dalam servuice akun utnuk dilakukan kiegiatan authernmtifducation dai dalm database
   */
  password: Schema.Types.String;
  /**
   * adalah data di dalam akun kredenmtial kapan data di buat di dalam database service akun untuk menandai kapan doi buat di dalam database
   */
  time_created?: ISysTimeInfo;
  /**
   * adalah penanda waktu kapan data di update yuuntuk kkeoperluan data di dalam database
   * **/
  time_updated?: ISysTimeInfo;
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
