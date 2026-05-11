import { Injectable, Logger } from '@nestjs/common';
import { translate } from '@vitalets/google-translate-api';
import { TranslatedInput } from '../types/translated-field.type';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  async toTranslatedField(
    input: TranslatedInput,
  ): Promise<Record<string, string>> {
    const es = input.es?.trim() ?? '';
    if (!es) return { es: '' };
    try {
      const { text } = await translate(es, { from: 'es', to: 'en' });
      return { es, en: text };
    } catch (err) {
      this.logger.warn(`Translation failed, saving ES only: ${err}`);
      return { es };
    }
  }

  async translateText(text: string, to: string): Promise<string> {
    const trimmed = text?.trim();
    if (!trimmed) return '';
    try {
      const { text: translated } = await translate(trimmed, { to });
      return translated;
    } catch (err) {
      this.logger.warn(`translateText failed: ${err}`);
      return text;
    }
  }

  async translateFields<T extends object>(
    dto: T,
    fields: (keyof T)[],
  ): Promise<Record<string, Record<string, string>>> {
    const result: Record<string, Record<string, string>> = {};
    await Promise.all(
      fields.map(async (field) => {
        const val = dto[field] as TranslatedInput | undefined;
        if (val?.es !== undefined) {
          result[field as string] = await this.toTranslatedField(val);
        }
      }),
    );
    return result;
  }
}
