import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslatedInput } from '../types/translated-field.type';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly _apiKey: string;

  constructor(private readonly _config: ConfigService) {
    this._apiKey = this._config.get<string>('google.translateApiKey') ?? '';
  }

  async toTranslatedField(
    input: TranslatedInput,
    existing?: Record<string, string>,
  ): Promise<Record<string, string>> {
    const es = input.es?.trim() ?? '';
    if (!es) return { es: '' };
    if (existing && existing['es'] === es && existing['en']) return existing;
    const en = await this.translateText(es, 'en');
    return { es, en };
  }

  async translateText(text: string, to: string): Promise<string> {
    const trimmed = text?.trim();
    if (!trimmed) return '';
    if (!this._apiKey) {
      this.logger.warn('GOOGLE_TRANSLATE_API_KEY not set, returning original text');
      return text;
    }
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this._apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: trimmed, source: 'es', target: to, format: 'text' }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Google Translate API error ${res.status}: ${err}`);
        return text;
      }
      const data = await res.json() as { data: { translations: { translatedText: string }[] } };
      return data.data.translations[0]?.translatedText ?? text;
    } catch (err) {
      this.logger.warn(`translateText failed: ${err}`);
      return text;
    }
  }

  async translateFields<T extends object>(
    dto: T,
    fields: (keyof T)[],
    existing?: Partial<Record<string, Record<string, string>>>,
  ): Promise<Record<string, Record<string, string>>> {
    const result: Record<string, Record<string, string>> = {};
    await Promise.all(
      fields.map(async (field) => {
        const val = dto[field] as TranslatedInput | undefined;
        if (val?.es !== undefined) {
          result[field as string] = await this.toTranslatedField(
            val,
            existing?.[field as string],
          );
        }
      }),
    );
    return result;
  }
}
