# Wellbeing Compass AI Content Planner

## Tačni koraci

1. Raspakuj projekat.
2. Otvori folder u VS Code.
3. U terminalu pokreni:
   - `npm install`
4. Kopiraj `.env.example` u `.env.local`
5. U `.env.local` upiši svoj OpenAI ključ:
   - `OPENAI_API_KEY=...`
6. Lokalno pokretanje preko Netlify funkcija:
   - `npx netlify dev`
7. Otvori adresu koju ti terminal pokaže.
8. Testiraj dugme **Generate with AI**.

## GitHub + Netlify deploy

1. Kreiraj novi GitHub repo.
2. Uploaduj cijeli sadržaj ovog foldera.
3. Na Netlify poveži repo.
4. Build command ostavi `npm run build`.
5. Publish directory ostavi `dist`.
6. U Netlify Site settings > Environment variables dodaj:
   - `OPENAI_API_KEY`
7. Deploy.

## Struktura foldera

- `src/` frontend aplikacija
- `netlify/functions/` backend funkcija za OpenAI
- `netlify.toml` Netlify konfiguracija
- `.env.example` primjer env varijable
