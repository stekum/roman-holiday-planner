# Changelog

## [2.1.0](https://github.com/stekum/roman-holiday-planner/compare/v2.0.0...v2.1.0) (2026-04-22)


### ✨ Features

* **#123:** GA4 via Firebase Analytics + 6 core events ([#194](https://github.com/stekum/roman-holiday-planner/issues/194)) ([e15adaa](https://github.com/stekum/roman-holiday-planner/commit/e15adaaa1ff2d4984213524b96a62e793c8844ce)), closes [#123](https://github.com/stekum/roman-holiday-planner/issues/123)
* **#133:** email admin on new pending access request ([#196](https://github.com/stekum/roman-holiday-planner/issues/196)) ([78146c8](https://github.com/stekum/roman-holiday-planner/commit/78146c83f548d1743f40960f986349a61c4ed847))


### 🐛 Bug Fixes

* **#123:** add measurementId to Firebase initializeApp config ([#195](https://github.com/stekum/roman-holiday-planner/issues/195)) ([f2fbdb1](https://github.com/stekum/roman-holiday-planner/commit/f2fbdb1bc4ccbbc831ad64b1abc973070c055fb4)), closes [#123](https://github.com/stekum/roman-holiday-planner/issues/123)
* **ci:** build service-account.json from 3 split secrets ([#172](https://github.com/stekum/roman-holiday-planner/issues/172)) ([#205](https://github.com/stekum/roman-holiday-planner/issues/205)) ([834ec38](https://github.com/stekum/roman-holiday-planner/commit/834ec38a4a89f24acb71f579d283eebc1e45dce3))
* **ci:** materialize VITE_ secrets in .env.local for Vite build ([#188](https://github.com/stekum/roman-holiday-planner/issues/188)) ([7fcb530](https://github.com/stekum/roman-holiday-planner/commit/7fcb530b335a1c2fdc7983b6254b7d94f48867e6))
* **ci:** pass VITE_* secrets to beta build ([#187](https://github.com/stekum/roman-holiday-planner/issues/187)) ([28feb5a](https://github.com/stekum/roman-holiday-planner/commit/28feb5a4ec320cfc2db14528d167c4c290f93b7b))
* **ci:** store service-account as raw JSON secret (no base64) ([#204](https://github.com/stekum/roman-holiday-planner/issues/204)) ([93d5dd2](https://github.com/stekum/roman-holiday-planner/commit/93d5dd22a42cfe095feb3d4131043f80b5923674)), closes [#172](https://github.com/stekum/roman-holiday-planner/issues/172)
* **ci:** strip whitespace from base64 before decode ([#172](https://github.com/stekum/roman-holiday-planner/issues/172)) ([#203](https://github.com/stekum/roman-holiday-planner/issues/203)) ([612912c](https://github.com/stekum/roman-holiday-planner/commit/612912ccae5e07f5e311da71848320730c0356cc))
* **ci:** use heredoc for .env.local + sanity-check line count ([#189](https://github.com/stekum/roman-holiday-planner/issues/189)) ([231c98e](https://github.com/stekum/roman-holiday-planner/commit/231c98e72a5b7e78c249b90ceaabb93e3f6356ce))


### ⚡ Performance

* **#178:** session-cache für fetchPlaceEnrichment + RoutePolyline ([#185](https://github.com/stekum/roman-holiday-planner/issues/185)) ([2319107](https://github.com/stekum/roman-holiday-planner/commit/231910765e5494d9fff1a44a9332f7f039cfec4c)), closes [#178](https://github.com/stekum/roman-holiday-planner/issues/178)
* **#179:** prime enrichment cache from Firestore on POI load ([#193](https://github.com/stekum/roman-holiday-planner/issues/193)) ([c89a69b](https://github.com/stekum/roman-holiday-planner/commit/c89a69b47ecef8f5c27c72e3f498b7d42d1f46b7))
* **#180:** dev-mode flags to skip Directions + Places API ([#192](https://github.com/stekum/roman-holiday-planner/issues/192)) ([88bad3f](https://github.com/stekum/roman-holiday-planner/commit/88bad3f69767da81da6135531dfc6b63bf883f46)), closes [#180](https://github.com/stekum/roman-holiday-planner/issues/180)


### 📝 Documentation

* **#137:** architecture documentation structure ([#200](https://github.com/stekum/roman-holiday-planner/issues/200)) ([721b631](https://github.com/stekum/roman-holiday-planner/commit/721b6316a6734e6ac41c4e1748e2b35ebed246e2)), closes [#137](https://github.com/stekum/roman-holiday-planner/issues/137)
* **#154:** CarPlay / Android Auto Handoff section in USER-GUIDE ([#197](https://github.com/stekum/roman-holiday-planner/issues/197)) ([798f241](https://github.com/stekum/roman-holiday-planner/commit/798f24138c6208cde325a00de4c18f5fbfd0fd74)), closes [#154](https://github.com/stekum/roman-holiday-planner/issues/154)
* add [#178](https://github.com/stekum/roman-holiday-planner/issues/178) (API-Caching Perf) to v2.1 Tabelle ([2408d21](https://github.com/stekum/roman-holiday-planner/commit/2408d2139c79e6dc050d9ca38c6197ba5e5c4af6))
* add [#190](https://github.com/stekum/roman-holiday-planner/issues/190) (Chrome DevTools MCP) to v2.1 roadmap ([69b5a3c](https://github.com/stekum/roman-holiday-planner/commit/69b5a3cfc54d7c7ebf9f6b6ce7a868d7ed5bdacd))
* add [#213](https://github.com/stekum/roman-holiday-planner/issues/213) to v2.1 roadmap (GH-Pages sunset cleanup) ([d304a58](https://github.com/stekum/roman-holiday-planner/commit/d304a58734fb81ac28cff2a3857d9503414f0e34))
* add 4 new cost-optimization issues ([#179](https://github.com/stekum/roman-holiday-planner/issues/179)-[#182](https://github.com/stekum/roman-holiday-planner/issues/182)) from cost-analysis ([bb3d99e](https://github.com/stekum/roman-holiday-planner/commit/bb3d99e98c4132d9d1f05183fa25bdfa038acac0))
* mark [#117](https://github.com/stekum/roman-holiday-planner/issues/117) done — Firebase Hosting migration shipped ([be8171f](https://github.com/stekum/roman-holiday-planner/commit/be8171f9bc263999005bd9b9e2fbb2ebf11d294f))
* sync v2.1 — mark [#183](https://github.com/stekum/roman-holiday-planner/issues/183)/[#178](https://github.com/stekum/roman-holiday-planner/issues/178) done, move [#213](https://github.com/stekum/roman-holiday-planner/issues/213) to v3.0-beta ([4ec754c](https://github.com/stekum/roman-holiday-planner/commit/4ec754c0cf1c930e9d1cb7758b3bb3300fc67a5d))


### ♻️  Refactoring

* **#181 pt1:** migrate HomebasePhotoSync to Places API (New) ([#206](https://github.com/stekum/roman-holiday-planner/issues/206)) ([0bb4482](https://github.com/stekum/roman-holiday-planner/commit/0bb4482c8828dbc3aa28021a3331fe612aa2b14f)), closes [#181](https://github.com/stekum/roman-holiday-planner/issues/181)
* **#181 pt2:** migrate AddFromMap to Places API (New) ([#207](https://github.com/stekum/roman-holiday-planner/issues/207)) ([db51673](https://github.com/stekum/roman-holiday-planner/commit/db51673d016fb0d6ba9f4ba84bcc3b4391f0dd9c)), closes [#181](https://github.com/stekum/roman-holiday-planner/issues/181)
* **#181 pt3:** migrate all remaining Places API call-sites ([#208](https://github.com/stekum/roman-holiday-planner/issues/208)) ([86b2dbf](https://github.com/stekum/roman-holiday-planner/commit/86b2dbf65610560129369a659ed29b80635600c6)), closes [#181](https://github.com/stekum/roman-holiday-planner/issues/181)
* rename „Roman Holiday Planner" → „Holiday Planner" (user-visible) ([#210](https://github.com/stekum/roman-holiday-planner/issues/210)) ([d32e35c](https://github.com/stekum/roman-holiday-planner/commit/d32e35cd29d032c060c05aa9d7450a7e61a09ccd))


### 🤖 CI / Infra

* **#172:** nightly playwright smoke suite ([#201](https://github.com/stekum/roman-holiday-planner/issues/201)) ([e7fedb5](https://github.com/stekum/roman-holiday-planner/commit/e7fedb5c6df6d8d8dc54d5cee60f8d99be420bee)), closes [#172](https://github.com/stekum/roman-holiday-planner/issues/172)
* **#173:** semantic-release via release-please ([#198](https://github.com/stekum/roman-holiday-planner/issues/198)) ([6a99f30](https://github.com/stekum/roman-holiday-planner/commit/6a99f30bc2f4ced433eb58be5fecb5c4b0b2427f)), closes [#173](https://github.com/stekum/roman-holiday-planner/issues/173)
* **#183:** auto-sync Issue-Milestone → Project-Board + Release-Field ([#184](https://github.com/stekum/roman-holiday-planner/issues/184)) ([43479bc](https://github.com/stekum/roman-holiday-planner/commit/43479bc6c35371913e898bad0e9334e1981089ae)), closes [#183](https://github.com/stekum/roman-holiday-planner/issues/183)
* **#190:** add chrome-agent.sh + MCP setup docs ([#191](https://github.com/stekum/roman-holiday-planner/issues/191)) ([2466130](https://github.com/stekum/roman-holiday-planner/commit/2466130dab17ef1f7c856d21046ccb5af6c592f4)), closes [#190](https://github.com/stekum/roman-holiday-planner/issues/190)
* add workflow_dispatch to release-please for manual trigger ([50dd2b0](https://github.com/stekum/roman-holiday-planner/commit/50dd2b02df77c1aa8a50672f780b235ad2f1fa0c))
