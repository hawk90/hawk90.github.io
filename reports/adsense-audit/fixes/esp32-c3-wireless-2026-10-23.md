# ESP32-C3 wireless API and lifetime repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Bothfullarticles andloop25evaluations read; pinnedIDFv5.4.2 + its exactNimBLEsubmodule source and primary WiFi/ATT contracts compared; namednativehelperfences executed underdeclaredfakebackend scope.

## Checks and limits

NoWiFi/BLEinit, actualNimBLEhost/controller/transport, AP/phone/RF/MTUexchange/pairing/security/provisioning/mesh/throughput/power executed. Hosttests use actualpinnedAPIheaders plus upstreamdummyNPL, CSFC1default, explicitfakeadv/GATT/mbufbackend and fail-if-calledtransportstubs. Headerssystem-marked solelyforupstreammacOSqueuemacro warnings. Unrelatedclone-onlygateskipped.

Gate: [esp32-c3-wireless-2026-10-23-gate.log](esp32-c3-wireless-2026-10-23-gate.log).
Execution: [esp32-c3-wireless-2026-10-23.log](esp32-c3-wireless-2026-10-23.log).

## Per-article evidence

### `chapter07-wifi-stack.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack.md
2. **problemSignalAndCounterevidence:** AllWiFiresults miscalledasync, immediateunboundedreconnect, incomplete/doubleownerinitialization, APSTAbridgeconflation, deprecatedPMF/Enterprise and security/provisioning/layer/radio/power/throughput guarantees.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** PinnedESP-IDFv5.4.2 event/WiFi/EAP/mesh/protocomm headers and docs, officialWiFisecurity/PMFdeprecation.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separated APIreturn/link/IPevent and owner lifetime; explicitboundedretrydelay helper and nonretrydisconnect handler, modeNULL/APSTA/security contracts and pinnedprovisioningscope; removedfabricatedperformance/current/mesh/vendor claims. Manualdescriptioncorrection.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Pure retry policy6delays/cap/null/UINT_MAX tests ASan/UBSan pass; fullsource/evaluation/APIcomparison. No actualWiFiinit/AP/retrytimer/provisioning/security/throughput/current test. NoWiFi/BLEinit, actualNimBLEhost/controller/transport, AP/phone/RF/MTUexchange/pairing/security/provisioning/mesh/throughput/power executed. Hosttests use actualpinnedAPIheaders plus upstreamdummyNPL, CSFC1default, explicitfakeadv/GATT/mbufbackend and fail-if-calledtransportstubs. Headerssystem-marked solelyforupstreammacOSqueuemacro warnings. Unrelatedclone-onlygateskipped.

Before SHA-256: `b5d675421eed2248a876082066886fd527e29bc85893acc136f4ae027d320832`. After SHA-256: `56ec3ee6b4257af54280665a3ca60cb661ccd01b6732f25328fcee70ef6a6b26`.

Next action: manual-review. Which completeowner/event/timer/cancel/reinit path, peer auth/configuration and AP/hardware measurements establish reconnection, provisioning and power/performance behavior?

### `chapter08-ble-gap-gatt.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt.md
2. **problemSignalAndCounterevidence:** FixedPHYrange/throughput/radiohalf/stacksize/current claims, undefinedPHYstruct and lifecycle/notifyhandles, uncheckedmbufappend/ownership, CCCDassumption, NO_IO/MITM, MTU247payload224, publishedASCII/TODO.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinnedesp-nimbleSHA0225775e49669cd4f070400908f73718bddce83b actualheaders/notifyimplementation, IDFbleprph sample, officialBluetoothATTnotificationcontract.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected actualPHYAPI, checkedadvertisingfields/start, GATTregister/val_handle/READ/notifyguards and consumedmbuf semantics; separatedhostlifecycle/security/peersubscription; corrected244bytes and removedunsupportedrankings/guarantees/ASCII. Manualdescriptioncorrection.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** ActualAPIheaders with upstreamdummyNPL, CSFC1matchesSDKdefault, actualesp_errheader, explicitfakeadv/GATT/mbuf backends andfail-if-calledtransport. Register/adverror/null/invalidhandle/unsubscribed/value/alloc/readappend/notifyerror+consumption tests ASan/UBSan pass. Nohost/controller/peer/radio/pairingtest. NoWiFi/BLEinit, actualNimBLEhost/controller/transport, AP/phone/RF/MTUexchange/pairing/security/provisioning/mesh/throughput/power executed. Hosttests use actualpinnedAPIheaders plus upstreamdummyNPL, CSFC1default, explicitfakeadv/GATT/mbufbackend and fail-if-calledtransportstubs. Headerssystem-marked solelyforupstreammacOSqueuemacro warnings. Unrelatedclone-onlygateskipped.

Before SHA-256: `28e63e3a0e24b279ac2e27af62101b9de705ba9e04b512821e88da0621fd63ba`. After SHA-256: `1c0c442b2e6a146e817d1d4fcfa0484145cae96b98698b4b6683993b5cffd8e8`.

Next action: manual-review. Which fullhostsync/start/reset/stop lifecycle, generation-safepeerstate, actualphoneGATT/MTU/security/bond and RF/power tests establish this BLE service?

## Primary sources

- [https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0](https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0)
- [https://github.com/espressif/esp-nimble/tree/0225775e49669cd4f070400908f73718bddce83b](https://github.com/espressif/esp-nimble/tree/0225775e49669cd4f070400908f73718bddce83b)
- [https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/wifi-security.html](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/wifi-security.html)
- [https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/attribute-protocol--att-.html](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/attribute-protocol--att-.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
