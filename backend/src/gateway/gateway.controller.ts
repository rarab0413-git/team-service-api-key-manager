import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller('v1')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * Chat Completions endpoint - Compatible with OpenAI API
   * POST /v1/chat/completions
   */
  @Post('chat/completions')
  @HttpCode(HttpStatus.OK)
  async chatCompletions(
    @Headers('authorization') authorization: string,
    @Body() body: { model: string; messages: unknown[]; [key: string]: unknown },
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleChatCompletion(
      authorization,
      body,
      '/v1/chat/completions',
    );
    
    return res.status(result.status).json(result.data);
  }

  /**
   * Completions endpoint (legacy) - Compatible with OpenAI API
   * POST /v1/completions
   */
  @Post('completions')
  @HttpCode(HttpStatus.OK)
  async completions(
    @Headers('authorization') authorization: string,
    @Body() body: { model: string; prompt: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleChatCompletion(
      authorization,
      { ...body, messages: [] },
      '/v1/completions',
    );
    
    return res.status(result.status).json(result.data);
  }

  /**
   * Embeddings endpoint - Compatible with OpenAI API
   * POST /v1/embeddings
   */
  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  async embeddings(
    @Headers('authorization') authorization: string,
    @Body() body: { model: string; input: string | string[]; [key: string]: unknown },
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleGenericRequest(
      authorization,
      'POST',
      '/v1/embeddings',
      body,
    );
    
    return res.status(result.status).json(result.data);
  }

  /**
   * Models endpoint - List available models
   * GET /v1/models
   */
  @Get('models')
  async listModels(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleGenericRequest(
      authorization,
      'GET',
      '/v1/models',
    );
    
    return res.status(result.status).json(result.data);
  }

  /**
   * Image Generation endpoint - DALL-E
   * POST /v1/images/generations
   */
  @Post('images/generations')
  @HttpCode(HttpStatus.OK)
  async imageGeneration(
    @Headers('authorization') authorization: string,
    @Body() body: { model?: string; prompt: string; n?: number; size?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleImageGeneration(
      authorization,
      body,
      '/v1/images/generations',
    );
    
    return res.status(result.status).json(result.data);
  }

  /**
   * Audio Speech endpoint - TTS
   * POST /v1/audio/speech
   */
  @Post('audio/speech')
  @HttpCode(HttpStatus.OK)
  async audioSpeech(
    @Headers('authorization') authorization: string,
    @Body() body: { model: string; input: string; voice: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleAudioSpeech(
      authorization,
      body,
      '/v1/audio/speech',
    );
    
    // Audio response is binary data
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });
    return res.status(result.status).send(result.data);
  }

  /**
   * Audio Transcription endpoint - Whisper
   * POST /v1/audio/transcriptions
   * Note: Requires multipart/form-data with file upload
   */
  @Post('audio/transcriptions')
  @HttpCode(HttpStatus.OK)
  async audioTranscriptions(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const result = await this.gatewayService.handleAudioTranscription(
      authorization,
      '/v1/audio/transcriptions',
    );
    
    return res.status(result.status).json(result.data);
  }
}





