import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ManualRagChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

export interface ManualRagChatSourceDto {
  chunkId: string;
  section: string;
  subsection: string;
}

export interface ManualRagChatResponseDto {
  answer: string;
  sources: ManualRagChatSourceDto[];
}
