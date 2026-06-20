export function cleanBrandName(name: string, country: string | null): string {
  let cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (country) {
    const countryRegex = new RegExp(`\\s*${country}\\s*$`, 'i');
    cleaned = cleaned.replace(countryRegex, '').trim();
  }
  return cleaned.replace(/\s*-\s*$/, '').trim();
}
