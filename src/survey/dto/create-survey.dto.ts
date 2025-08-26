
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

export class CreateSurveyDto {

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

  @ApiProperty({ description: 'Expiration date', type: Date })
  expireDate: Date;

  @ApiProperty({
    description: 'List of questions for the survey',
    type: [CreateQuestionDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(1, { message: 'At least one question is required' })
  questions: CreateQuestionDto[];
}