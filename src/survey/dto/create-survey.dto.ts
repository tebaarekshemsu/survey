
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
export class CreateQuestionDto {
  @ApiProperty({ description: 'Type of the question', type: String })
  type: string;

  @ApiProperty({ description: 'Label for the question', type: String })
  label: string;

  @ApiPropertyOptional({ description: 'Placeholder text', type: String })
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Is the question required?', type: Boolean })
  required?: boolean;

  @ApiPropertyOptional({ description: 'Validation rules', type: Object })
  validation?: any;

  @ApiPropertyOptional({ description: 'Options for select/multiple choice', type: Object })
  options?: any;

  @ApiPropertyOptional({ description: 'Order of the question', type: Number })
  order?: number;
}

export enum SurveyStatus {
  pending = 'pending',
  live = 'live',
  ended = 'ended',
  rejected = 'rejected',
  draft = 'draft',
}

export class CreateSurveyDto {
  @ApiPropertyOptional({ description: 'Survey ID (auto-generated)', type: String })
  id?: string;

  @ApiProperty({ description: 'ID of the creator', type: String })
  creatorId: string;

  @ApiProperty({ description: 'Survey title', type: String })
  title: string;

  @ApiProperty({ description: 'Survey description', type: String })
  description: string;

  @ApiPropertyOptional({ description: 'Target audience or criteria', type: Object })
  target?: any;

  @ApiProperty({ description: 'Reward for participation', type: Number })
  reward: number;

  @ApiProperty({ description: 'Current participant count', type: Number })
  participant: number;

  @ApiProperty({ description: 'Maximum number of participants', type: Number })
  maxParticipant: number;

  @ApiPropertyOptional({ enum: SurveyStatus, description: 'Survey status' })
  status?: SurveyStatus;

  @ApiProperty({ description: 'Expiration date', type: Date })
  expireDate: Date;

  @ApiPropertyOptional({ description: 'Creation date', type: Date })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Last update date', type: Date })
  updatedAt?: Date;

  @ApiProperty({
    description: 'List of questions for the survey',
    type: [CreateQuestionDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(1, { message: 'At least one question is required' })
  questions: CreateQuestionDto[];
}