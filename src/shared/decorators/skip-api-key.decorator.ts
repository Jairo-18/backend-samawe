import { SetMetadata } from '@nestjs/common';

export const SKIP_API_KEY = 'skipApiKey';
export const SkipApiKey = () => SetMetadata(SKIP_API_KEY, true);
