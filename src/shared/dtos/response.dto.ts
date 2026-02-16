import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import {
  CREATED_MESSAGE,
  DELETED_MESSAGE,
  DUPLICATED_MESSAGE,
  NOT_FOUND_MESSAGE,
  SERVICE_ERROR_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  UPDATED_MESSAGE,
} from '../constants/messages.constant';
import { UPDATE_MANY_RESPONSE_EXAMPLE } from '../constants/examples.constants';
import { UpdateManyResults } from '../interfaces/results.interface';

export interface BaseResponseDto {
  title?: string;
  message?: string;
  statusCode?: number;
  error?: string;
}

export interface ObjectCreatedResponseDto {
  rowId: string;
}

export class DuplicatedResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
    example: DUPLICATED_MESSAGE,
  })
  message: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.CONFLICT,
  })
  statusCode: number;

  @ApiProperty({
    type: String,
    example: SERVICE_ERROR_MESSAGE,
  })
  error: string;
}

export class UnauthorizedResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
    example: UNAUTHORIZED_MESSAGE,
  })
  message: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.UNAUTHORIZED,
  })
  statusCode: number;
}

export class NotFoundResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
    example: NOT_FOUND_MESSAGE,
  })
  message: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.NOT_FOUND,
  })
  statusCode: number;

  @ApiProperty({
    type: String,
    example: SERVICE_ERROR_MESSAGE,
  })
  error: string;
}

export class CreatedRecordResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
  })
  title?: string;

  @ApiProperty({
    type: String,
    example: CREATED_MESSAGE,
  })
  message: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.CREATED,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: { rowId: 1 },
  })
  data: ObjectCreatedResponseDto;
}

export class SimpleSuccessResponseDto {
  message: string;
  statusCode: number;
}

export class UpdateRecordResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
  })
  title?: string;

  @ApiProperty({
    type: String,
    example: UPDATED_MESSAGE,
  })
  message?: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
}

export class DeleteReCordResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: String,
  })
  title?: string;

  @ApiProperty({
    type: String,
    example: DELETED_MESSAGE,
  })
  message?: string;

  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode?: number;
}

export interface BaseBulkResponseDto {
  message?: string;
  statusCode: number;
  records: {
    inserted?: number;
    updated?: number;
    deleted?: number;
    notFound: number;
    errors: number;
  };
}

class RecordsBulkStatsDto {
  @ApiProperty({
    type: Number,
    example: 0,
  })
  notFound: number;

  @ApiProperty({
    type: Number,
    example: 0,
  })
  errors: number;
}

export class DeleteBulkStatsDto extends RecordsBulkStatsDto {
  @ApiProperty({
    type: Number,
    example: 3,
  })
  deleted: number;
}

export class UpdateBulkStatsDto extends RecordsBulkStatsDto {
  @ApiProperty({
    type: Number,
    example: 3,
  })
  updated: number;
}

export class InsertBulkStatsDto extends RecordsBulkStatsDto {
  @ApiProperty({
    type: Number,
    example: 3,
  })
  inserted: number;
}

export class UpdateManyRecordsResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: UPDATE_MANY_RESPONSE_EXAMPLE,
  })
  data: UpdateManyResults;
}
