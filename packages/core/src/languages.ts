export interface LanguageDescriptor {
  readonly code: string;
  readonly label: string;
}

export const SOURCE_LANGUAGES: readonly LanguageDescriptor[] = [
  { code: 'auto', label: 'Auto detect' },
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
];

export const TARGET_LANGUAGES: readonly LanguageDescriptor[] =
  SOURCE_LANGUAGES.filter((l) => l.code !== 'auto');
