export type WeekStartDayDTO = 'monday' | 'sunday';

export interface UserDTO {
  username: string;
  email: string;
  week_start_day: WeekStartDayDTO;
  merge_weekends: boolean;
  has_password: boolean;
  google_id: string | null;
}

export interface UserUpdateDTO {
  username?: string;
  email?: string;
  week_start_day?: WeekStartDayDTO;
  merge_weekends?: boolean;
}

export interface UpdatePasswordDTO {
  current_password?: string;
  new_password: string;
}

export interface UserSigninDTO {
  username: string;
  password: string;
}

export interface UserSignupDTO {
  username: string;
  email: string;
  password: string;
}

export interface TokenDTO {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

export interface RefreshTokenDTO {
  refresh_token: string;
}

export interface GoogleSigninDTO {
  id_token?: string;
  code?: string;
}
