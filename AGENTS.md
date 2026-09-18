# BlutdruckMonitorPWA

## Structure
- Vanilla JS PWA with no build step. `index.html` is the entrypoint.
- Core logic: `js/BloodPressureTracker.js`, `js/StorageManager.js`, `js/MistralClient.js`, `js/StatsManager.js`, `js/utils.js`
- Tests: Jest with `jsdom` environment. Config in `package.json`.

## Commands
- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage
- `npm start` / `npm run serve`: Start dev server on port 8000

## Testing
- Tests require `jest-environment-jsdom`. Mock DOM elements via `tests/setup.js`.
- Global test utilities: `storageManager`, `mistralClient`, `PERIODS`, `periodInfo`, `classifyReading`, etc.
- Mock `localStorage`, `fetch`, and `document` in tests.
- Test files: `tests/*.test.js`

## Key Conventions
- Dates stored as `YYYY-MM-DD` strings (see `formatDateKey` in `utils.js`).
- Blood pressure values: SYS 60-260, DIA 30-160, Pulse 20-250.
- Periods: `morning`, `midday`, `evening`, `other` (defined in `PERIODS` in `utils.js`).
- Entries stored in `localStorage` under key `bloodPressureEntries`.
- Mistral API key stored in `localStorage` under key `bloodPressureMistralApiKey`.
- Default Mistral model: `pixtral-12b-2409`.

## Mistral Integration
- `MistralClient` uses `api.mistral.ai/v1/chat/completions` with `response_format: { type: 'json_object' }`.
- Image analysis expects JSON: `{systolic:<number|null>,diastolic:<number|null>,pulse:<number|null>,confidence:<0-1>}`.
- Images are downscaled to max 1200px before sending.

## PWA
- Service worker: `sw.js`
- Manifest: `manifest.json`
- Version in `version.js` (update manually).

## Exclude from coverage
- `js/ThemeManager.js` (excluded in `package.json` jest config)
