import { IsArray, IsNumber, IsOptional, Min } from 'class-validator';

// 사용 가능한 기능 타입
export type FeatureType = 
  | 'chat'              // Chat Completions (GPT)
  | 'image_generation'  // DALL-E 이미지 생성
  | 'image_vision'      // GPT-4 Vision (이미지 분석)
  | 'audio_transcription' // Whisper (음성→텍스트)
  | 'audio_speech'      // TTS (텍스트→음성)
  | 'embeddings';       // 임베딩

export class CreateApiKeyDto {
  @IsNumber()
  teamId: number;

  @IsArray()
  @IsOptional()
  allowedModels?: string[];

  @IsArray()
  @IsOptional()
  allowedFeatures?: FeatureType[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyLimitUsd?: number;
}





