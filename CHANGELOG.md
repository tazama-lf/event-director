# SPDX-License-Identifier: Apache-2.0

## v2.0.0

## Milestone: Release v2.0.0
Date: 2024-07-18T07:00:00Z
Description: Create Release v2.0.0 release using Github Actions release workflow.

### 🐞 Bug Fixes

- fix: use passing node.js workflow without integration tests (#194) (Linked Issues: a29c982630b218a4241cddcc3dca4d6f307a98be)
- fix: remove failing scorecard (#192) (Linked Issues: e3906c2ee6d3fad42ae763f7a4ef7b29994541e7)
- fix: Reference main branch for release (Linked Issues: cae4a98043b64c024bf70201d112fc86874c1826)
- fix: add missed library from update (Linked Issues: d0641a33e31ee6f385242d24f1a8ac1282f3d66c)
- fix: use other message types (Linked Issues: 6db9885b08752e3e26e59665c5af4283972de3e8)
- fix: rename CRSP to ED (Linked Issues: 2c9654372324aa120e33dfe90190ae899d1afb8e)
- fix: rename messages list (Linked Issues: fbb4b00259a72a51399085521c71ab62a8065099)

### ⭐️ New Features

- feat: Enhancement to the release workflow (Linked Issues: 2f62582ed3076a8bab4ab3963e02690d7a2bc1cd)
- feat: refine and add new workflows (#188) (Linked Issues: 27c26abf6123168a108bf844d4d4f15b93c0aa6f)
- feat: Add more automation and refine workflows (#172) (Linked Issues: ad6b59f1c9094313c143aadbe09d627569e918ea)
- feat: updated Newman test (Linked Issues: c2830c33dae57a25a2cf495ee00259e60bada97d)
- feat: fixed sidecar naming convention (Linked Issues: 6ee545c475124615f23a44b5a7f505430923b326)
- feat: renamed all CRSP instances (Linked Issues: e863a4cf305afd774c181d08475fd75828e4f5a9)
- feat: rename crsp stream to event-director (Linked Issues: ef9a7877dd92196f472480bed6f107d18f5d0be3)
- feat: remove channels (Linked Issues: 612184697fa350a7791c24889cba5d68cab94224)

### 📚 Documentation

- docs: update env (Linked Issues: b904b3cc4b73db01f9377e53bcabc4436ee62e9f)
- docs: close code block (Linked Issues: 532c7f397913c21642a46b62470155da4d6d7bf7)
- docs: Updated readme images (Linked Issues: 58a0085da62ba2de1ab9a0172d37a4b1228540f6)
- docs: add missing env variables (Linked Issues: 2c09effc388d8929099e4d1287f65dba29cad628)
- docs: add configuration docs (Linked Issues: 115a460c8a81a92d009b862316695111d4c69433)

### 🔨 Refactorings

- refactor: move networkmap config (Linked Issues: 1ee655db68bd401d834141a0756d482942f22614)

### ⚙️ Chores

- chore: Update VERSION to v3.0.0 (Linked Issues: c5593425e68ea8bfc565ba4dfbe2fb21645fbe61)
- chore: Update CHANGELOG.md for v3.0.0 (Linked Issues: 7ef3eb5db2c37805a6a5134a12072b3d33b81aad)
- chore: Update VERSION to v2.0.0 (Linked Issues: e5e79570fdfd2df21b62d9bddf1e12a8e36d25c6)
- chore: Update CHANGELOG.md for v2.0.0 (Linked Issues: 4fec8e3629bf524131a34442e01c909c9a503ac4)
- chore: use new deps (Linked Issues: 1454171828a0a4d50fd9c469c95a2936b6521d3f)
- chore: update deps (Linked Issues: 02c2e90b6c7510d9b61465b2c57176a42d818ff1)
- chore: update tsconfig (Linked Issues: f128cf5af384504db02877e76770edcea0cf940d)
- chore: added eslint rule (Linked Issues: ffc37c905ac8548a5e141ef4beac37db396e9382)
- chore: removed dead deps (Linked Issues: 61c428ba625c961a250a6377d8d49bfcc17dcea3)
- chore: updated eslint and project dependencies (Linked Issues: 96fbcb8115e0db762f9b95753204ed488d13e2f4)
- chore: add license header (Linked Issues: 471dc0169bf13931f5efa8e62bc77ba2aeffa4d6)
- chore: bump libs ver (Linked Issues: 793b0ec9e04533e493d0731086df24f3b863fc1c)
- chore: fix references to CRSP (Linked Issues: 3b1d0376cd1881db48b30ef987b2e6b7738b94bb)

### 🏗️ Build

- build: bump coe lib versions (Linked Issues: 807d402edc1101968fc7746171b485dd0f49b040)
- build: update env (Linked Issues: d0f88ba20f0c4b303c58d52d7d5668b528ceff51)

### 🧪 Tests

- Revert "test: added postman test" (Linked Issues: 3bd33fbb501ebf608cfb4e9150aa01e9c42abec9)
- test: added postman test (Linked Issues: 25fee1311393ee79753908a786d52dfc00385d61)

### 📦 Dependencies

- chore(deps): bump coe-lib (Linked Issues: 2a4b8f32f3d1a6d3f7712e9b7ab5739d11a2bfac)
- chore(deps): bump coe-startup-lib (Linked Issues: 637a7977b406d6012ad5217b333b6079e689458c)
- chore(deps): bump coe-lib (Linked Issues: ed8ddb8f7e8d0ae029b473f5ebfbff1aa867fbfe)

### 🔧 Dev Dependencies

- chore(deps-dev): bump typescript from 5.3.3 to 5.4.5 (Linked Issues: 53e27215c03389db29f3602e10ab462f2638f5f1)
- chore(deps-dev): bump ts-jest from 29.1.2 to 29.1.3 (Linked Issues: e3cd8a757e9eff8fe8cd8fca08bc269c6ed16277)
- chore(deps-dev): bump husky from 8.0.3 to 9.0.11 (Linked Issues: 2b65cf30d0421e4a8c1228fbf39617010c54d098)
- chore(deps-dev): bump rimraf from 5.0.5 to 5.0.7 (Linked Issues: 5f7081fd21056986fa0fb68f050fdbb3532d50e4)
- chore(deps-dev): bump lint-staged from 15.2.2 to 15.2.5 (Linked Issues: 66688b1efaa2af2ffa57483f59917af69879ea86)
- chore(deps-dev): bump nodemon from 3.1.0 to 3.1.1 (Linked Issues: 51d34f2f9cd201524627c95751d39c2c606db6ff)
- chore(deps-dev): bump @typescript-eslint/parser from 7.9.0 to 7.10.0 (Linked Issues: 8af084b0c150aacb252b5dbb4587ef4b8fadb166)
- chore(deps-dev): bump eslint-plugin-n from 16.6.2 to 17.7.0 (Linked Issues: 314a1ab613c2d18ad69e38bb012cf86825c916bf)
- chore(deps-dev): bump @typescript-eslint/parser from 6.21.0 to 7.9.0 (Linked Issues: fc6ca9811241787b3d31e3c34a7b2a4b0a9e2a1b)
- chore(deps-dev): bump nodemon from 3.0.3 to 3.1.0 (Linked Issues: 45729ecf841bc5a6d2982e16f697c22cfc3aacac)

### 📝 Other Changes

- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into dev (Linked Issues: 1a21e711fa09266f7aadcdf7d546f6907a7954f4)
- Merge branch 'main' of https://github.com/frmscoe/channel-router-setup-processor into dev (Linked Issues: ba0d228d2f1ce01e9845f21ceacb78c164ef357c)
- Merge pull request #173 from frmscoe/db-rename (Linked Issues: ec40e57e70080bd4f8e4e81e1abbd2304a6098cd)
- Merge pull request #162 from frmscoe/ossf-scorecard-workflow (Linked Issues: 75216d307f1366c480f464ac258de80445757f71)
- Merge branch 'dev' into feat/eslint-deps-upgrades (Linked Issues: 6a0aa38d4e56818a9a1516e268451a6ea2f5b070)
- Add license header (Linked Issues: f480b450f63a2c4a10da098bb609aa92bc5bf604)
- Create scorecard.yml (Linked Issues: ff4399a88a0096e8cde505233e7af0e3e1ba553c)
- Merge pull request #150 from frmscoe/event-director (Linked Issues: 9c4344ff48c2ff1af2fe79f3651b62fc1442ece6)
- bug: fixed prcgTm naming convention (Linked Issues: d8c0080be6ff38027d4f79d8b1573af16405af9f)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into event-director (Linked Issues: 4b84b1fc191bd041d3abb7ed40c3f5329bcd54e2)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 8072b36c2d4aad2982ba3b752c284aaffa2e14c8)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 7c72631b7531c8ff03102bf24bdf0bbddbd22fc3)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: dd8ac4bd7c3b0596264e689236f389fc78415b6d)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 8933711575d3a865a4bc74e96352cac247ddc68f)
- Merge pull request #133 from frmscoe/feat/no-channel (Linked Issues: 303435d61333e38015d04aaea4b3e29eed1a5b26)
- chore(docs): [readme] reorder diagrams (Linked Issues: 092970dba78313d5f165cfd8e23e8a84b29e0ed6)
- chore(docs): fix readme table formatting (Linked Issues: 8247ea7ba34e50357e3206fe6890e76d4cdbeb4e)
- chore(docs): update readme (Linked Issues: 2986af7781de57fb74d9c214538ff49e1781550c)
- chore(docs): restructure headings to follow issue (Linked Issues: 50e86e853fc26fa869b22e866fd15cda222532e1)
- chore(docs): only pacs002 currently supported (Linked Issues: 3d976ab68190111cb0b673c6a5d97bb38817c1bd)
- Merge remote-tracking branch 'origin/dev' into feat/no-channel (Linked Issues: 0b53f77f2973041aa173e0588969f29bf16334b5)
- update (Linked Issues: 3c5266baf357e5d34edcd34a9f1fb0479ac44927)
- merge (Linked Issues: b8285bf1490a0c9afc2d60cd6175ef883ba48a05)
- chore(docs): add sample req/resp (Linked Issues: 23f4bade7fc9a7cf492f5d599e5a735b524dd4c0)
- Merge remote-tracking branch 'origin/dev' into feat/no-channel (Linked Issues: fbfdaf7465ee2fca98d5f470689bbbc9eaac03ab)
- Merge pull request #128 from frmscoe/revert-127-dev (Linked Issues: 21de6b480cdad0c05368e2df17926a9fb3631a6b)
- Revert "test: added postman test" (Linked Issues: 3bd33fbb501ebf608cfb4e9150aa01e9c42abec9)

## v3.0.0

## Milestone: Release v2.0.0
Date: 2024-07-18T07:00:00Z
Description: Create Release v2.0.0 release using Github Actions release workflow.

### ⚙️ Chores

- chore: Update VERSION to v2.0.0 (Linked Issues: e5e79570fdfd2df21b62d9bddf1e12a8e36d25c6)
- chore: Update CHANGELOG.md for v2.0.0 (Linked Issues: 4fec8e3629bf524131a34442e01c909c9a503ac4)

### 🏗️ Build

- build: bump coe lib versions (Linked Issues: 807d402edc1101968fc7746171b485dd0f49b040)

## v2.0.0

## Milestone: Release v2.0.0
Date: 2024-07-18T07:00:00Z
Description: Create Release v2.0.0 release using Github Actions release workflow.

### 🐞 Bug Fixes

- fix: use passing node.js workflow without integration tests (#194) (Linked Issues: a29c982630b218a4241cddcc3dca4d6f307a98be)
- fix: remove failing scorecard (#192) (Linked Issues: e3906c2ee6d3fad42ae763f7a4ef7b29994541e7)
- fix: Reference main branch for release (Linked Issues: cae4a98043b64c024bf70201d112fc86874c1826)
- fix: add missed library from update (Linked Issues: d0641a33e31ee6f385242d24f1a8ac1282f3d66c)
- fix: use other message types (Linked Issues: 6db9885b08752e3e26e59665c5af4283972de3e8)
- fix: rename CRSP to ED (Linked Issues: 2c9654372324aa120e33dfe90190ae899d1afb8e)
- fix: rename messages list (Linked Issues: fbb4b00259a72a51399085521c71ab62a8065099)

### ⭐️ New Features

- feat: Enhancement to the release workflow (Linked Issues: 2f62582ed3076a8bab4ab3963e02690d7a2bc1cd)
- feat: refine and add new workflows (#188) (Linked Issues: 27c26abf6123168a108bf844d4d4f15b93c0aa6f)
- feat: Add more automation and refine workflows (#172) (Linked Issues: ad6b59f1c9094313c143aadbe09d627569e918ea)
- feat: updated Newman test (Linked Issues: c2830c33dae57a25a2cf495ee00259e60bada97d)
- feat: fixed sidecar naming convention (Linked Issues: 6ee545c475124615f23a44b5a7f505430923b326)
- feat: renamed all CRSP instances (Linked Issues: e863a4cf305afd774c181d08475fd75828e4f5a9)
- feat: rename crsp stream to event-director (Linked Issues: ef9a7877dd92196f472480bed6f107d18f5d0be3)
- feat: remove channels (Linked Issues: 612184697fa350a7791c24889cba5d68cab94224)

### 📚 Documentation

- docs: update env (Linked Issues: b904b3cc4b73db01f9377e53bcabc4436ee62e9f)
- docs: close code block (Linked Issues: 532c7f397913c21642a46b62470155da4d6d7bf7)
- docs: Updated readme images (Linked Issues: 58a0085da62ba2de1ab9a0172d37a4b1228540f6)
- docs: add missing env variables (Linked Issues: 2c09effc388d8929099e4d1287f65dba29cad628)
- docs: add configuration docs (Linked Issues: 115a460c8a81a92d009b862316695111d4c69433)

### 🔨 Refactorings

- refactor: move networkmap config (Linked Issues: 1ee655db68bd401d834141a0756d482942f22614)

### ⚙️ Chores

- chore: use new deps (Linked Issues: 1454171828a0a4d50fd9c469c95a2936b6521d3f)
- chore: update deps (Linked Issues: 02c2e90b6c7510d9b61465b2c57176a42d818ff1)
- chore: update tsconfig (Linked Issues: f128cf5af384504db02877e76770edcea0cf940d)
- chore: added eslint rule (Linked Issues: ffc37c905ac8548a5e141ef4beac37db396e9382)
- chore: removed dead deps (Linked Issues: 61c428ba625c961a250a6377d8d49bfcc17dcea3)
- chore: updated eslint and project dependencies (Linked Issues: 96fbcb8115e0db762f9b95753204ed488d13e2f4)
- chore: add license header (Linked Issues: 471dc0169bf13931f5efa8e62bc77ba2aeffa4d6)
- chore: bump libs ver (Linked Issues: 793b0ec9e04533e493d0731086df24f3b863fc1c)
- chore: fix references to CRSP (Linked Issues: 3b1d0376cd1881db48b30ef987b2e6b7738b94bb)

### 🏗️ Build

- build: update env (Linked Issues: d0f88ba20f0c4b303c58d52d7d5668b528ceff51)

### 🧪 Tests

- Revert "test: added postman test" (Linked Issues: 3bd33fbb501ebf608cfb4e9150aa01e9c42abec9)
- test: added postman test (Linked Issues: 25fee1311393ee79753908a786d52dfc00385d61)

### 📦 Dependencies

- chore(deps): bump coe-lib (Linked Issues: 2a4b8f32f3d1a6d3f7712e9b7ab5739d11a2bfac)
- chore(deps): bump coe-startup-lib (Linked Issues: 637a7977b406d6012ad5217b333b6079e689458c)
- chore(deps): bump coe-lib (Linked Issues: ed8ddb8f7e8d0ae029b473f5ebfbff1aa867fbfe)

### 🔧 Dev Dependencies

- chore(deps-dev): bump typescript from 5.3.3 to 5.4.5 (Linked Issues: 53e27215c03389db29f3602e10ab462f2638f5f1)
- chore(deps-dev): bump ts-jest from 29.1.2 to 29.1.3 (Linked Issues: e3cd8a757e9eff8fe8cd8fca08bc269c6ed16277)
- chore(deps-dev): bump husky from 8.0.3 to 9.0.11 (Linked Issues: 2b65cf30d0421e4a8c1228fbf39617010c54d098)
- chore(deps-dev): bump rimraf from 5.0.5 to 5.0.7 (Linked Issues: 5f7081fd21056986fa0fb68f050fdbb3532d50e4)
- chore(deps-dev): bump lint-staged from 15.2.2 to 15.2.5 (Linked Issues: 66688b1efaa2af2ffa57483f59917af69879ea86)
- chore(deps-dev): bump nodemon from 3.1.0 to 3.1.1 (Linked Issues: 51d34f2f9cd201524627c95751d39c2c606db6ff)
- chore(deps-dev): bump @typescript-eslint/parser from 7.9.0 to 7.10.0 (Linked Issues: 8af084b0c150aacb252b5dbb4587ef4b8fadb166)
- chore(deps-dev): bump eslint-plugin-n from 16.6.2 to 17.7.0 (Linked Issues: 314a1ab613c2d18ad69e38bb012cf86825c916bf)
- chore(deps-dev): bump @typescript-eslint/parser from 6.21.0 to 7.9.0 (Linked Issues: fc6ca9811241787b3d31e3c34a7b2a4b0a9e2a1b)
- chore(deps-dev): bump nodemon from 3.0.3 to 3.1.0 (Linked Issues: 45729ecf841bc5a6d2982e16f697c22cfc3aacac)

### 📝 Other Changes

- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into dev (Linked Issues: 1a21e711fa09266f7aadcdf7d546f6907a7954f4)
- Merge branch 'main' of https://github.com/frmscoe/channel-router-setup-processor into dev (Linked Issues: ba0d228d2f1ce01e9845f21ceacb78c164ef357c)
- Merge pull request #173 from frmscoe/db-rename (Linked Issues: ec40e57e70080bd4f8e4e81e1abbd2304a6098cd)
- Merge pull request #162 from frmscoe/ossf-scorecard-workflow (Linked Issues: 75216d307f1366c480f464ac258de80445757f71)
- Merge branch 'dev' into feat/eslint-deps-upgrades (Linked Issues: 6a0aa38d4e56818a9a1516e268451a6ea2f5b070)
- Add license header (Linked Issues: f480b450f63a2c4a10da098bb609aa92bc5bf604)
- Create scorecard.yml (Linked Issues: ff4399a88a0096e8cde505233e7af0e3e1ba553c)
- Merge pull request #150 from frmscoe/event-director (Linked Issues: 9c4344ff48c2ff1af2fe79f3651b62fc1442ece6)
- bug: fixed prcgTm naming convention (Linked Issues: d8c0080be6ff38027d4f79d8b1573af16405af9f)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into event-director (Linked Issues: 4b84b1fc191bd041d3abb7ed40c3f5329bcd54e2)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 8072b36c2d4aad2982ba3b752c284aaffa2e14c8)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 7c72631b7531c8ff03102bf24bdf0bbddbd22fc3)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: dd8ac4bd7c3b0596264e689236f389fc78415b6d)
- Merge branch 'dev' of https://github.com/frmscoe/channel-router-setup-processor into rename-crsp-to-event-director (Linked Issues: 8933711575d3a865a4bc74e96352cac247ddc68f)
- Merge pull request #133 from frmscoe/feat/no-channel (Linked Issues: 303435d61333e38015d04aaea4b3e29eed1a5b26)
- chore(docs): [readme] reorder diagrams (Linked Issues: 092970dba78313d5f165cfd8e23e8a84b29e0ed6)
- chore(docs): fix readme table formatting (Linked Issues: 8247ea7ba34e50357e3206fe6890e76d4cdbeb4e)
- chore(docs): update readme (Linked Issues: 2986af7781de57fb74d9c214538ff49e1781550c)
- chore(docs): restructure headings to follow issue (Linked Issues: 50e86e853fc26fa869b22e866fd15cda222532e1)
- chore(docs): only pacs002 currently supported (Linked Issues: 3d976ab68190111cb0b673c6a5d97bb38817c1bd)
- Merge remote-tracking branch 'origin/dev' into feat/no-channel (Linked Issues: 0b53f77f2973041aa173e0588969f29bf16334b5)
- update (Linked Issues: 3c5266baf357e5d34edcd34a9f1fb0479ac44927)
- merge (Linked Issues: b8285bf1490a0c9afc2d60cd6175ef883ba48a05)
- chore(docs): add sample req/resp (Linked Issues: 23f4bade7fc9a7cf492f5d599e5a735b524dd4c0)
- Merge remote-tracking branch 'origin/dev' into feat/no-channel (Linked Issues: fbfdaf7465ee2fca98d5f470689bbbc9eaac03ab)
- Merge pull request #128 from frmscoe/revert-127-dev (Linked Issues: 21de6b480cdad0c05368e2df17926a9fb3631a6b)
- Revert "test: added postman test" (Linked Issues: 3bd33fbb501ebf608cfb4e9150aa01e9c42abec9)

## v1.1.0 (future date, 2024)

* Next change summary here

## v1.0.0 (July 2nd, 2024)

* Add workflows, pr template, version and changelog.md file.
