
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';

export class CreateResponseDto {
  @ApiProperty({ description: 'Survey Id', type: String })
  surveyId: string;

  @ApiProperty({ type: () => [AnswerDto], description: 'List of answers' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class AnswerDto {
  @ApiProperty({ description: 'Question Id', type: String })
  questionId: string;

  @ApiProperty({ description: 'Response text', type: String })
  answer: string;
}