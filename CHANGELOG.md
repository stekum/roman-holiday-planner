# Changelog

## [3.0.0](https://github.com/stekum/roman-holiday-planner/compare/v2.2.0...v3.0.0) (2026-04-27)


### ✨ Features

* **#113:** Phase 1 — Cross-Device Workspace-Sync ([#229](https://github.com/stekum/roman-holiday-planner/issues/229)) ([710b31c](https://github.com/stekum/roman-holiday-planner/commit/710b31ca71151657ce4feb6ed0983f18a8548485))
* **#209:** dynamic app title from TripConfig.city ([#247](https://github.com/stekum/roman-holiday-planner/issues/247)) ([f444dc3](https://github.com/stekum/roman-holiday-planner/commit/f444dc35a0b830a2c5fecf089f9a45858ca80cbd))
* **#227:** default-trip-pin (cross-device via users.defaultWorkspaceId) ([#246](https://github.com/stekum/roman-holiday-planner/issues/246)) ([8506eeb](https://github.com/stekum/roman-holiday-planner/commit/8506eebe290b6c09385f76b47e6ba250d51ad13c))
* **#228:** Workspace Access Control + Einladungs-Flow ([#245](https://github.com/stekum/roman-holiday-planner/issues/245)) ([cbc091f](https://github.com/stekum/roman-holiday-planner/commit/cbc091f655ad80580b08040bd647df75221ff446))
* **#74:** alle Homebases als Map-Marker, aktive hervorgehoben ([#234](https://github.com/stekum/roman-holiday-planner/issues/234)) ([e2edc85](https://github.com/stekum/roman-holiday-planner/commit/e2edc85275ad6cb21c4edaef654e3783dc651974))
* **#74:** Multi-Homebase pro Trip (datumsbasiert) ([#232](https://github.com/stekum/roman-holiday-planner/issues/232)) ([12df264](https://github.com/stekum/roman-holiday-planner/commit/12df264172f937164cc6afd723a90081d592595c)), closes [#74](https://github.com/stekum/roman-holiday-planner/issues/74)
* **#78:** transit days (Reisetage zwischen Städten) ([#251](https://github.com/stekum/roman-holiday-planner/issues/251)) ([2a1e874](https://github.com/stekum/roman-holiday-planner/commit/2a1e874e8dda10f459a1c01b6153996fbd03966a))


### 🐛 Bug Fixes

* **#227:** bootstrap-effect must wait for profile hydration ([7985999](https://github.com/stekum/roman-holiday-planner/commit/7985999176cd2a215c76ba432d4e907277ed8d3a))
* **#228:** allow read on non-existent workspace doc + add e2e smokes ([7796bf1](https://github.com/stekum/roman-holiday-planner/commit/7796bf156322afcfff14e596a63b22e88052f3ab))
* **#239:** AI-Tagesplan Quick-Tags aus tripConfig.categories statt hardcoded ([#242](https://github.com/stekum/roman-holiday-planner/issues/242)) ([ff86418](https://github.com/stekum/roman-holiday-planner/commit/ff86418880aa9cbef69f234c1e2d8479d34ed870)), closes [#239](https://github.com/stekum/roman-holiday-planner/issues/239)
* **#240:** AI-Prompts nutzen Tages-Homebase-Stadt statt Trip-City ([#243](https://github.com/stekum/roman-holiday-planner/issues/243)) ([4186c86](https://github.com/stekum/roman-holiday-planner/commit/4186c86ef30afd769a94bf473e807aec405919cd))
* **#74:** Map folgt activeDay im Trip-Tab (dayHomebase statt activeHomebase) ([#233](https://github.com/stekum/roman-holiday-planner/issues/233)) ([d9be0cd](https://github.com/stekum/roman-holiday-planner/commit/d9be0cdd8ae23df3c4e6b5d921d7a6ea270c4412))
* generische UX-Texte in TripConfigEditor + AddFromAiSearch ([#225](https://github.com/stekum/roman-holiday-planner/issues/225)) ([1974bf0](https://github.com/stekum/roman-holiday-planner/commit/1974bf01afb099a24e1d63460615a2254d2e4d24))
* Map pan auf Center-Change innerhalb desselben Workspace ([#231](https://github.com/stekum/roman-holiday-planner/issues/231)) ([50141c9](https://github.com/stekum/roman-holiday-planner/commit/50141c91556f12a67a7df2718f2c145bd4d5c5c3))
* Map-Remount bei Trip-Switch + Places-Results inline-scrolbar ([#226](https://github.com/stekum/roman-holiday-planner/issues/226)) ([042436d](https://github.com/stekum/roman-holiday-planner/commit/042436d5411f915ed96c04e68ea00de74985d41c))
* multi-trip Rom-Leaks — Places-Bias, Weather-Timezone, UX-Texte ([#223](https://github.com/stekum/roman-holiday-planner/issues/223)) ([2b1f196](https://github.com/stekum/roman-holiday-planner/commit/2b1f19607d3cb2d3ecb1caf9476d6de791966d49))
* PWA-Cache-Hölle auf Beta abschalten — selfDestroying Service Worker ([#236](https://github.com/stekum/roman-holiday-planner/issues/236)) ([725a1a6](https://github.com/stekum/roman-holiday-planner/commit/725a1a67007e130ca02b42947e55320df2ee250b))
* remove stray Next.js eslint-disable comment from WorkspaceMembersSection ([3d2efe1](https://github.com/stekum/roman-holiday-planner/commit/3d2efe185fc802ee724de53e997161744dcafcf2))


### 📝 Documentation

* [#244](https://github.com/stekum/roman-holiday-planner/issues/244) Map-Controls + Multi-Homebase-Trip-Übersicht in Deferred-Backlog ([ea90dee](https://github.com/stekum/roman-holiday-planner/commit/ea90deec4bcbe1fa819566740bc74e4ba5125018))
* **#209:** ROADMAP done (11/15 v3.0 erledigt, 4 offen) ([411dfc2](https://github.com/stekum/roman-holiday-planner/commit/411dfc20f9fa4e9adcf6b53b02a6e15d4bd3df0c))
* **#215:** ROADMAP done (14/15 v3.0 erledigt — nur noch [#78](https://github.com/stekum/roman-holiday-planner/issues/78) Transit-Tage offen) ([45a6835](https://github.com/stekum/roman-holiday-planner/commit/45a6835b0cd8d1132974b1787a34c54df1ad893c))
* **#216, #217:** ROADMAP done (13/15 v3.0 erledigt, 2 offen — [#78](https://github.com/stekum/roman-holiday-planner/issues/78) + [#215](https://github.com/stekum/roman-holiday-planner/issues/215)) ([7387390](https://github.com/stekum/roman-holiday-planner/commit/7387390c21ed65d4c4ce53a15428cd006b78c62c))
* **#216:** Firebase Hosting Rollback-Playbook + helper script ([#248](https://github.com/stekum/roman-holiday-planner/issues/248)) ([aa905a2](https://github.com/stekum/roman-holiday-planner/commit/aa905a2dcfa76c3eaf700dad35db50daf4ed93a4))
* **#227:** USER-GUIDE Default-Trip-Pin Sektion + ROADMAP done ([c32e71c](https://github.com/stekum/roman-holiday-planner/commit/c32e71c7824f1ad87fd0306688fae4deaebf22ec))
* **#228:** manual test plan + USER-GUIDE Mitglieder-Sektion + ROADMAP done ([031877b](https://github.com/stekum/roman-holiday-planner/commit/031877b5e6a782dfa965e0b3af403cba25b2913c))
* **#238:** Multi-Trip Validation Test-Plan + Setup/Smoke-Skripte ([99baa14](https://github.com/stekum/roman-holiday-planner/commit/99baa1402504401629299407d08e2df29c95b60b))
* **#78:** ROADMAP v3.0 komplett — 15/15 Items done ([f365f97](https://github.com/stekum/roman-holiday-planner/commit/f365f970029f004bae7c63e40c266363ca3a3e2b))
* add [#227](https://github.com/stekum/roman-holiday-planner/issues/227) (Default-Trip-Pin, Deferred) + [#228](https://github.com/stekum/roman-holiday-planner/issues/228) (Workspace Access Control Phase 2 von [#113](https://github.com/stekum/roman-holiday-planner/issues/113), v3.0) to roadmap ([b22dc6e](https://github.com/stekum/roman-holiday-planner/commit/b22dc6e87aaba0d9ec572e31d730a517ba2526cf))
* Cleanup nach Multi-Trip Sweep — ROADMAP + USER-GUIDE + tester-Subagent ([3cba59c](https://github.com/stekum/roman-holiday-planner/commit/3cba59cd54798c48bb68a3b9310750970fa80d9f))
* Multi-Trip Validation Sweep abgeschlossen — [#238](https://github.com/stekum/roman-holiday-planner/issues/238)/[#239](https://github.com/stekum/roman-holiday-planner/issues/239)/[#240](https://github.com/stekum/roman-holiday-planner/issues/240)/[#241](https://github.com/stekum/roman-holiday-planner/issues/241) closed ([3cdf1fc](https://github.com/stekum/roman-holiday-planner/commit/3cdf1fc064c719ed60c34e2c28f08a0e6339be66))
* ROADMAP v3.0-Count auf 14/9 korrigiert ([#77](https://github.com/stekum/roman-holiday-planner/issues/77), [#238](https://github.com/stekum/roman-holiday-planner/issues/238) waren nicht gezählt) ([b8cd51b](https://github.com/stekum/roman-holiday-planner/commit/b8cd51b3367091ba95a7fbc2b37aa386f49f4342))
* v3.0-beta released — Multi-Trip Architektur ([#70](https://github.com/stekum/roman-holiday-planner/issues/70) + [#71](https://github.com/stekum/roman-holiday-planner/issues/71)), 17 Tage vor Plan ([976d205](https://github.com/stekum/roman-holiday-planner/commit/976d2054a764761f8967bb1082b90a506c295f34))


### 🧹 Chores

* bump release to 3.0.0 (v3.0 Japan-Ready milestone complete) ([a74ec3f](https://github.com/stekum/roman-holiday-planner/commit/a74ec3f3aa12c9de0b033f35e91beac1c307c381))

## [2.2.0](https://github.com/stekum/roman-holiday-planner/compare/v2.1.0...v2.2.0) (2026-04-23)


### ✨ Features

* **#70:** Trip-Selector UI im Header — Dropdown + Neuen Trip anlegen ([#220](https://github.com/stekum/roman-holiday-planner/issues/220)) ([09456c7](https://github.com/stekum/roman-holiday-planner/commit/09456c760cc165295b9637321ce3d016e182960a)), closes [#70](https://github.com/stekum/roman-holiday-planner/issues/70)
* **#70:** Trip-Umbenennen per Pencil-Icon (follow-up) ([#221](https://github.com/stekum/roman-holiday-planner/issues/221)) ([16461f9](https://github.com/stekum/roman-holiday-planner/commit/16461f996329fa31eba8c22e98360986d750c58d)), closes [#70](https://github.com/stekum/roman-holiday-planner/issues/70)
* **#71:** dynamischer workspaceId via React-Context (Listener-Switch) ([#219](https://github.com/stekum/roman-holiday-planner/issues/219)) ([beb4e98](https://github.com/stekum/roman-holiday-planner/commit/beb4e9896b6215dfdfa4aa18347412e9034af287)), closes [#71](https://github.com/stekum/roman-holiday-planner/issues/71)
* **#73:** CityConfig — Places-Geocoding ersetzt ROME_CENTER ([#222](https://github.com/stekum/roman-holiday-planner/issues/222)) ([88eda89](https://github.com/stekum/roman-holiday-planner/commit/88eda8928fb6cfd78a3c27ccb6bb273a72db7fd7)), closes [#73](https://github.com/stekum/roman-holiday-planner/issues/73)


### 📝 Documentation

* **#70:** TC-10 End-to-End Multi-Trip Architektur-Test ergänzt (Stefan 2026-04-23 bestätigt) ([b8bc0c3](https://github.com/stekum/roman-holiday-planner/commit/b8bc0c3fee725d629b2c64d6457f9d1872270cfa))
* Multi-Trip Cleanup — ROADMAP Done-Marker + USER-GUIDE + Smoke-Scripts ([101ef11](https://github.com/stekum/roman-holiday-planner/commit/101ef11773a36d66d0b4f120f189ae7a90ebae30))
* sync v3.0 Japan-Ready roadmap with board (+[#209](https://github.com/stekum/roman-holiday-planner/issues/209)/[#215](https://github.com/stekum/roman-holiday-planner/issues/215)/[#216](https://github.com/stekum/roman-holiday-planner/issues/216)/[#217](https://github.com/stekum/roman-holiday-planner/issues/217)) ([9898ab0](https://github.com/stekum/roman-holiday-planner/commit/9898ab01263002469761ccda81705434cd945f43))

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
