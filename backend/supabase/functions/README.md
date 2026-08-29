# Edge Functions

Deno/TypeScript functions, added in later milestones (build plan section 4):

- `vin-decode-proxy` — proxies NHTSA vPIC VIN decoding
- `valuation-proxy` — calls the `VehicleValuationProvider` adapter (`@fixorreplace/types`)
- `ai-extract-repair` — Claude call to structure repair descriptions (Screen 11)
- `ai-explain` — Claude call to generate the recommendation explanation (Screen 26)
- `run-decision` — orchestrates valuation + `@fixorreplace/calc-engine` + `ai-explain`, persists a `decisions` row
