import {writeFile} from 'node:fs/promises';
import {recordedDetailTranslations} from './recorded-detail-translations.mjs';
const target=new URL('../../supabase/functions/public-ai-concierge/recorded-fact-translations.ts',import.meta.url);
await writeFile(target,'// Generated from src/publication/recorded-detail-translations.mjs. Platform explanatory wording; not official English text.\nexport const recordedFactTranslations: Readonly<Record<string,string>> = Object.freeze('+JSON.stringify(recordedDetailTranslations,null,2)+');\n');
console.log('Recorded AI fact translations synchronized.');
