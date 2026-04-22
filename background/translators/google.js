/**
 * Google Translate (free web API) adapter
 */
export async function translateWithGoogle(text, sourceLang, targetLang) {
  const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Translate request failed: ${response.status}`);
  }
  const data = await response.json();

  // Response structure: [[["translated","original",null,null,10],...],...]
  const translated = data[0]
    .filter((item) => item && item[0])
    .map((item) => item[0])
    .join('');
  return translated;
}
