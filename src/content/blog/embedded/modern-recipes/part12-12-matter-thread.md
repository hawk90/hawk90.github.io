---
title: "12-12: Matter·Thread — IoT 통합 표준·Commissioning·Multi-Fabric"
date: 2026-05-18T04:00:00
description: "Apple·Google·Amazon·Samsung이 공동으로 만든 Matter 1.3/1.4와 Thread 1.3 mesh를 합쳐 IoT device를 한 번에 모든 ecosystem에 등록하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 148
tags: [recipes, iot, matter, thread, openthread, csa]
---

## 한 줄 요약

> **"Matter는 Apple·Google·Amazon·Samsung의 공통 IoT 표준입니다."** Thread mesh와 Wi-Fi를 transport로 묶어 vendor lock-in 없이 *한 device가 동시에 네 ecosystem*에 등록됩니다. 2024 EU CRA가 요구하는 보안 요소도 대부분 자동으로 충족됩니다.

## 어떤 상황에서 쓰나

Smart light, door lock, thermostat, sensor, plug, blind, appliance처럼 *집·건물에서 다른 brand와 섞여 동작해야 하는 모든 IoT device*가 후보입니다. 산업 IoT·gateway도 점점 Matter를 transport로 쓰는 방향입니다.

이전에는 HomeKit·Google Weave·Amazon Smart Home·Samsung SmartThings·Zigbee·Z-Wave가 따로따로 였어서 vendor는 각 ecosystem별 firmware variant를 유지해야 했습니다. Matter는 *commissioning·discovery·security·OTA*를 단일 표준으로 묶었고, 각 ecosystem의 hub(Apple TV·Nest Hub·Echo·SmartThings Station)가 Matter controller 역할을 합니다.

## 핵심 개념

Matter는 *application layer + security + transport*로 구성되는 layered protocol입니다.

```text
Application Layer
  Cluster (Lighting, Door Lock, Thermostat, Sensor, ...)
  Endpoint·Attribute·Command (Data Model)

Security
  PASE (passcode-based session for commissioning)
  CASE (certificate-based session for operation)
  Group key

Transport
  IPv6 over UDP/TCP
  Thread (802.15.4 mesh)  |  Wi-Fi  |  Ethernet
```

핵심 통찰은 *Matter가 transport-agnostic*이라는 점입니다. 같은 application code가 Thread node·Wi-Fi node 어느 쪽에서도 돌아갑니다.

Thread는 *802.15.4 + 6LoWPAN + RPL routing*을 합친 mesh입니다.

| Layer | 내용 |
|-------|------|
| PHY/MAC | IEEE 802.15.4 2.4 GHz, 250 kbps, ~30 m |
| Network | 6LoWPAN (IPv6 over low-power) |
| Routing | RPL mesh, multi-hop |
| Roles | Router, REED, FED, Sleepy End Device |
| Border Router | Thread ↔ Wi-Fi/Ethernet bridge |

Thread 1.3에는 TCPlp(low-power TCP)와 Thread Domain(multi-network)이 들어왔습니다.

Multi-fabric은 Matter의 *killer feature*입니다.

```text
같은 device가 동시에:
  Apple Home fabric에 등록
  Google Home fabric에 등록
  Amazon Alexa fabric에 등록
  Samsung SmartThings fabric에 등록

각 fabric = 별도 NOC(Node Operational Certificate)
각 fabric은 자기 controller에서만 control 가능
```

Vendor lock-in이 종료됩니다. 사용자가 어느 ecosystem을 골라도 같은 device를 쓸 수 있습니다.

## 코드 / 실제 사용 예

### OpenThread basic node

```c
#include <openthread/thread.h>
#include <openthread/instance.h>

void thread_init(void) {
    otInstance *ot = otInstanceInitSingle();

    otOperationalDataset ds = {0};
    ds.mActiveTimestamp.mSeconds       = 1;
    ds.mComponents.mIsActiveTimestampPresent = true;

    /* Network key — provisioning에서 받음 */
    memcpy(ds.mNetworkKey.m8, network_key, 16);
    ds.mComponents.mIsNetworkKeyPresent = true;

    ds.mChannel = 15;
    ds.mComponents.mIsChannelPresent = true;

    otDatasetSetActive(ot, &ds);

    otIp6SetEnabled(ot, true);
    otThreadSetEnabled(ot, true);
}

void main_loop(otInstance *ot) {
    while (1) {
        otTaskletsProcess(ot);
        otSysProcessDrivers(ot);
    }
}
```

OpenThread는 Google maintained open-source impl입니다. nRF Connect SDK, Zephyr, ESP-IDF, Silicon Labs SDK에 모두 통합되어 있습니다.

### Sleepy End Device

```c
otLinkModeConfig mode = {
    .mRxOnWhenIdle       = false,   /* sleep when idle */
    .mDeviceType         = false,   /* not full router */
    .mNetworkData        = false,
};
otThreadSetLinkMode(ot, mode);

otLinkSetPollPeriod(ot, 5000);   /* 5 sec poll parent */
```

99% 시간 sleep, 5초마다 parent router에 poll합니다. CR2032 한 개로 *수년* 동작이 가능합니다.

### Matter SDK build (Linux example)

```bash
git clone https://github.com/project-chip/connectedhomeip
cd connectedhomeip
./scripts/checkout_submodules.py --shallow --platform linux

source scripts/activate.sh
cd examples/lighting-app/linux
gn gen out/host
ninja -C out/host
```

ESP32·nRF52840·Nordic NCS·NXP·Infineon용 example이 모두 포함되어 있습니다.

### Matter cluster handler

```cpp
#include <app/clusters/on-off-server/on-off-server.h>
#include <app-common/zap-generated/attributes/Accessors.h>

using namespace chip;
using namespace chip::app::Clusters;

void OnOff::Attributes::OnOff::Changed(
    EndpointId endpoint, bool value)
{
    if (endpoint == LIGHT_ENDPOINT_ID) {
        if (value) {
            gpio_set(LED_PIN, 1);
        } else {
            gpio_set(LED_PIN, 0);
        }
    }
}

/* Matter generated handler — On command */
bool emberAfOnOffClusterOnCallback(
    CommandHandler *cmd, const ConcreteCommandPath &path,
    const Commands::On::DecodableType &data)
{
    OnOffServer::Instance().setOnOffValue(path.mEndpointId,
                                            OnOff::Commands::On::Id, false);
    return true;
}
```

ZAP(ZCL Advanced Platform) tool로 cluster·attribute·command가 자동 생성됩니다. Vendor SDK는 *handler만* 구현합니다.

### ESP-IDF + Matter (ESP32-H2 Thread)

```c
#include "esp_matter.h"

void app_main(void) {
    esp_matter::node::config_t node_config;
    esp_matter::node_t *node = esp_matter::node::create(&node_config,
                                                          attribute_cb, NULL);

    esp_matter::endpoint::on_off_light::config_t light_cfg;
    esp_matter::endpoint_t *ep =
        esp_matter::endpoint::on_off_light::create(node, &light_cfg, ENDPOINT_FLAG_NONE, NULL);

    esp_matter::start(event_cb);
}
```

ESP32-H2가 Thread native, ESP32-C6은 Wi-Fi 6 + 802.15.4, ESP32-S3는 Wi-Fi only입니다. Matter는 세 chip 모두에서 동작합니다.

### Commissioning flow

1. **User scans QR code or NFC tag** — Setup code + discriminator + commissioning info
2. **BLE advertisement (commissioning mode)** — Phone (commissioner) discovers device
3. **PASE — Passcode Authenticated Session Establishment** — Setup code → SPAKE2+ → ephemeral session
4. **Device sends certificates (DAC chain, CD)** — Phone verifies against PAA (Product Attestation Authority)
5. **Phone (or Trusted Root) issues NOC (Node Operational Certificate)** — Operational identity for this fabric
6. **Network credentials transferred** — Thread network key OR Wi-Fi PSK
7. **CASE — Certificate Authenticated Session** — Permanent secure channel using NOC

전 과정이 end-to-end secure로 진행됩니다. Setup code 한 번이 평생 identity로 굳어집니다.

### Multi-fabric 추가

Apple Home에 등록된 device를 *Google Home에도 등록*하려면:

1. Apple Home에서 "share with Google" 선택. 또는 device를 commissioning mode로 다시 두고 Google Home app에서 add device.
2. Google이 다른 NOC를 발급. Device는 두 NOC를 모두 보관.
3. 양쪽 controller에서 control 가능.

Matter 1.3은 5 fabric, 1.4는 16+ fabric을 지원합니다.

### Border Router

**Thread Border Router 후보:**

- Apple TV 4K (2nd gen+), HomePod mini, Nest Hub Gen 2+, Echo Hub
- 또는 Raspberry Pi 4/5 + nRF52840 dongle (OpenThread BR)

**기능:**

- 802.15.4 Thread ↔ Wi-Fi/Ethernet IPv6 routing
- mDNS/DNS-SD service discovery
- BR election (multiple BRs)
- Thread Domain (multi-mesh)

Border Router 없으면 Thread mesh가 local subnet 안에서만 동작합니다. 한 home에 보통 BR이 2~3개 있습니다.

### OTA — Matter Software Update

**Matter OTA Provider cluster (`0x002A`):**

1. Vendor가 image를 cloud provider에 upload
2. Device가 query (vendor·product·current version)
3. Provider가 download URL 반환
4. Device가 image download (HTTPS over IPv6)
5. Signature verify (vendor key)
6. Apply on next boot
7. Confirm or revert

PSA Firmware Update API와 호환되어 TF-M project와 자연스럽게 합쳐집니다.

### Diagnostic — neighbor info

```c
otNeighborInfoIterator it = OT_NEIGHBOR_INFO_ITERATOR_INIT;
otNeighborInfo info;

while (otThreadGetNextNeighborInfo(ot, &it, &info) == OT_ERROR_NONE) {
    log_info("Neighbor rloc=%04x rssi=%d link_qual=%d",
              info.mRloc16, info.mAverageRssi, info.mLinkQualityIn);
}
```

Production device는 link quality·RSSI를 telemetry로 보내 mesh 건강도를 모니터합니다.

## 측정 / 성능 비교

Thread mesh 1080 m² 가정, nRF52840 router 5개, sleepy device 10개 기준입니다.

| 지표 | 값 |
|------|------|
| Commissioning (BLE → CASE) | 15~30 sec |
| PASE handshake | 1~2 sec |
| Light on/off command latency | 50~150 ms (1-2 hop), 200~500 ms (3+ hop) |
| Sleepy device wake → response | 0.5~2 sec |
| Mesh self-heal (router 추가/제거) | 10~30 sec |
| OTA 1 MB image | 2~5 min (Thread), 30~60 sec (Wi-Fi) |

Battery life (sleepy end device, CR2032 235 mAh)입니다.

| Poll period | Average current | Battery life |
|---|---|---|
| 1 sec | 80 µA | 4 개월 |
| 5 sec | 25 µA | 13 개월 |
| 30 sec | 8 µA | 3.4 년 |
| 300 sec | 3 µA | 9 년 |

Door sensor·temperature sensor는 5분 poll로 *수년* 운영이 가능합니다.

Power 비교 (light bulb 동등 idle)입니다.

| Transport | Idle power | 평균 current |
|---|---|---|
| Thread router | 30 mW | 7 mA @ 3.3V |
| Thread SED | 0.3 mW | 100 µA |
| Wi-Fi | 200~500 mW | 60-150 mA (DTIM 3) |

Battery 운영 device는 사실상 *Thread*가 강제됩니다.

## 자주 보는 함정

> Border Router 없이 Thread

```text
mesh만 구성, BR 0개
→ device들 끼리는 통신, cloud·controller 접근 0
```

Apple TV·Nest Hub·OpenThread BR 중 하나가 필요합니다.

> 동일 SoC에서 Wi-Fi + 802.15.4 동시 전송

```text
ESP32-C6 — Wi-Fi 2.4 GHz + 802.15.4 2.4 GHz
→ 같은 antenna 시간 분할 → packet loss
```

Coexistence config(`CONFIG_ESP_COEX_*`)로 time-sharing을 설정합니다.

> Sleepy device poll period 너무 짧음

```c
otLinkSetPollPeriod(ot, 100);   /* 100 ms — battery 며칠 */
```

1초 이상이 표준입니다. Latency가 critical하면 push-based(parent → child) 방식을 활용합니다.

> Certificate provisioning 누락

```text
DAC(Device Attestation Certificate) 없이 출하
→ commissioning fail
```

각 device가 *factory-provisioned* DAC chain을 가져야 합니다. PSA ITS 또는 secure element에 저장합니다.

> Fabric overflow

```text
Matter 1.0~1.2 — 5 fabric max
1.3+ — 16
1.4+ — 더 큰 fabric
```

지원 Matter 버전을 확인하고 한도를 알려 줍니다.

> OTA image rollback 미구현

```text
새 firmware boot 실패 → 영구 brick
```

MCUboot A/B + confirmation timeout 패턴으로 *자동 revert*를 구현합니다.

## 정리

- Matter는 Apple·Google·Amazon·Samsung이 함께 만든 IoT 통합 표준입니다.
- Thread 1.3 802.15.4 mesh + 6LoWPAN이 저전력 transport, Wi-Fi/Ethernet은 상시 전원용입니다.
- Multi-fabric으로 한 device가 동시에 여러 ecosystem에 등록됩니다.
- Commissioning은 PASE → DAC verify → NOC issue → CASE 순으로 end-to-end secure입니다.
- OpenThread + Matter SDK는 nRF52840·ESP32-H2/C6·Silicon Labs·NXP에서 모두 동작합니다.
- Sleepy End Device로 CR2032 한 개에 수년 동작이 가능합니다.
- Border Router(Apple TV·Nest Hub·OpenThread BR)가 mesh와 internet을 잇습니다.
- 2024 EU CRA·UK PSTI 요구사항(secure boot·OTA·attestation)이 Matter로 대부분 자동 충족됩니다.

**Modern Embedded Recipes 시리즈 완성**입니다(Part 1~6, 39편).

## 관련 항목

- [6-08: TF-M TrustZone](/blog/embedded/modern-recipes/part12-11-tfm-trustzone)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
