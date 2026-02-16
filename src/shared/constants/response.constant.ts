import { HttpStatus } from '@nestjs/common';
import { ApiResponseOptions } from '@nestjs/swagger';
import {
  CREATED_MESSAGE,
  DELETED_MESSAGE,
  DELETE_RELATED_MESSAGE,
  DUPLICATED_MESSAGE,
  NOT_FOUND_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  UPDATED_MESSAGE,
  VALIDATION_MESSAGE,
} from './messages.constant';
import {
  CreatedRecordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UnauthorizedResponseDto,
  UpdateRecordResponseDto,
} from '../dtos/response.dto';

export const CREATED_RESPONSE: ApiResponseOptions = {
  status: HttpStatus.CREATED,
  description: CREATED_MESSAGE,
  type: CreatedRecordResponseDto,
};

export const UPDATED_RESPONSE = {
  status: HttpStatus.OK,
  description: UPDATED_MESSAGE,
  type: UpdateRecordResponseDto,
};

export const DUPLICATED_RESPONSE: ApiResponseOptions = {
  status: HttpStatus.CONFLICT,
  description: DUPLICATED_MESSAGE,
  type: DuplicatedResponseDto,
};

export const VALIDATION_RESPONSE = {
  status: HttpStatus.BAD_REQUEST,
  description: VALIDATION_MESSAGE,
};

export const NOT_FOUND_RESPONSE = {
  status: HttpStatus.NOT_FOUND,
  description: NOT_FOUND_MESSAGE,
  type: NotFoundResponseDto,
};

export const UNAUTHORIZED_RESPONSE = {
  status: HttpStatus.UNAUTHORIZED,
  description: UNAUTHORIZED_MESSAGE,
  type: UnauthorizedResponseDto,
};

export const DELETED_RESPONSE = {
  status: HttpStatus.OK,
  description: DELETED_MESSAGE,
};

export const DELETED_RELATED_RESPONSE = {
  status: HttpStatus.FORBIDDEN,
  description: DELETE_RELATED_MESSAGE,
};
