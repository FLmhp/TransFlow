export interface LanguageDescriptor {
  readonly code: string;
  readonly label: string;
}

export const SOURCE_LANGUAGES: readonly LanguageDescriptor[] = [
  { code: "auto", label: "自动检测" },
  { code: "en", label: "英语" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁体中文" },
  { code: "ja", label: "日语" },
  { code: "ko", label: "韩语" },
  { code: "fr", label: "法语" },
  { code: "de", label: "德语" },
  { code: "es", label: "西班牙语" },
  { code: "pt", label: "葡萄牙语" },
  { code: "ru", label: "俄语" },
  { code: "ar", label: "阿拉伯语" },
  { code: "it", label: "意大利语" },
  { code: "nl", label: "荷兰语" },
  { code: "pl", label: "波兰语" },
  { code: "tr", label: "土耳其语" },
  { code: "vi", label: "越南语" },
  { code: "th", label: "泰语" },
];

export const TARGET_LANGUAGES: readonly LanguageDescriptor[] = SOURCE_LANGUAGES.filter(
  (l) => l.code !== "auto",
);
