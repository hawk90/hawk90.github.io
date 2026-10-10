---
title: "Matter·Thread 분석 — IoT 통합 표준·Commissioning·Multi-Fabric"
slug: "embedded/modern-recipes/part12-12-matter-thread"
date: 2026-04-21T09:11:00
description: "Apple·Google·Amazon·Samsung이 공동으로 만든 Matter 1.3/1.4와 Thread 1.3 mesh를 합쳐 IoT device를 한 번에 모든 ecosystem에 등록하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 148
tags: [recipes, iot, matter, thread, openthread, csa]
topics: ["embedded"]
---

## 한 줄 요약

> **"Matter는 여러 생태계가 상호운용을 목표로 사용하는 IoT application-layer 표준입니다."** Thread·Wi-Fi·Ethernet을 transport로 사용할 수 있고 multi-fabric commissioning을 지원하지만, 실제 ecosystem·device type·controller 지원 범위는 제품과 인증 버전에서 확인합니다. Matter 사용만으로 규제 보안 요구사항이 자동 충족되지는 않습니다.

## 어떤 상황에서 쓰나

Smart light, door lock, thermostat, sensor, plug, blind, appliance처럼 *집·건물에서 다른 brand와 섞여 동작해야 하는 모든 IoT device*가 후보입니다. 산업 IoT·gateway에서 Matter를 쓸지는 필요한 device type이 표준에 정의되어 있는지부터 확인합니다.

이전에는 HomeKit·Google Weave·Amazon Smart Home·Samsung SmartThings·Zigbee·Z-Wave가 따로따로 였어서 vendor는 각 ecosystem별 firmware variant를 유지해야 했습니다. Matter는 *commissioning·discovery·security·OTA*를 단일 표준으로 묶었고, 각 ecosystem의 hub(Apple TV·Nest Hub·Echo·SmartThings Station)가 Matter controller 역할을 합니다.

## 핵심 개념

Matter는 *application layer + security + transport*로 구성되는 layered protocol입니다.

| Layer | 구성 |
|-------|------|
| Application | Data Model — Endpoint·Cluster(Lighting, Door Lock, Thermostat, Sensor 등)·Attribute·Command |
| Security | PASE (commissioning용 passcode 기반 session), CASE (운영용 certificate 기반 session), Group key |
| Transport | IPv6 over UDP/TCP — Thread(802.15.4 mesh)·Wi-Fi·Ethernet |

핵심 통찰은 *Matter가 여러 IP transport를 지원*한다는 점입니다. 공통 application model을 재사용할 수 있지만, platform port·commissioning·전원 관리 코드는 Thread node와 Wi-Fi node에서 달라질 수 있습니다.

Thread는 *802.15.4 + 6LoWPAN* 위에 자체 mesh routing을 얹은 IPv6 network입니다.

| Layer | 내용 |
|-------|------|
| PHY/MAC | IEEE 802.15.4 2.4 GHz, 250 kbps |
| Network | 6LoWPAN (IPv6 over low-power) |
| Routing | MLE 기반 distance-vector routing, Router 사이 multi-hop |
| Roles | Leader, Router, REED, FED, MED, SED (1.2부터 SSED) |
| Border Router | Thread ↔ Wi-Fi/Ethernet IPv6 routing |

Thread 1.2에서 Sleepy End Device의 지연을 줄이는 CSL(Coordinated Sampled Listening)·Enhanced Frame Pending과 Thread Domain unicast addressing이 들어왔고, Thread 1.3에서 Border Router의 양방향 IPv6 연결, SRP·DNS-SD 기반 service discovery, TCP 지원이 정의됐습니다.

Multi-fabric은 Matter의 핵심 기능입니다. 같은 device 하나가 여러 fabric에 등록될 수 있습니다. 각 fabric은 별도의 NOC(Node Operational Certificate)를 가지며, 지원 가능한 fabric 수와 ecosystem별 동작은 Matter version·device resource·controller 구현으로 확인합니다.

그래서 사용자는 한 device를 여러 ecosystem의 controller에서 함께 쓸 수 있습니다. 다만 각 ecosystem이 지원하는 device type과 기능 범위는 따로 확인해야 합니다.

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

OpenThread는 Google이 공개한 open-source Thread 구현입니다. nRF Connect SDK, Zephyr, ESP-IDF, Silicon Labs SDK에 통합되어 있습니다.

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

이 예시는 약 5초 poll 주기를 설정한 구성입니다. 실제 sleep 비율과 CR2032 수명은 poll interval·TX 재시도·센서 duty cycle·배터리 조건으로 측정합니다.

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

On/Off command 처리 자체는 SDK의 On/Off cluster server가 맡고, application은 attribute가 바뀐 뒤 불리는 `MatterPostAttributeChangeCallback`에서 hardware를 움직입니다. `examples/lighting-app/linux/main.cpp`와 같은 구조입니다.

```cpp
#include <app/ConcreteAttributePath.h>
#include <app-common/zap-generated/ids/Attributes.h>
#include <app-common/zap-generated/ids/Clusters.h>

using namespace chip::app::Clusters;

void MatterPostAttributeChangeCallback(
    const chip::app::ConcreteAttributePath &path,
    uint8_t type, uint16_t size, uint8_t *value)
{
    if (path.mClusterId == OnOff::Id &&
        path.mAttributeId == OnOff::Attributes::OnOff::Id &&
        path.mEndpointId == LIGHT_ENDPOINT_ID) {
        gpio_set(LED_PIN, *value ? 1 : 0);
    }
}
```

ZAP(ZCL Advanced Platform) tool은 지원되는 cluster·attribute·command의 code generation을 돕습니다. Vendor는 generated code와 SDK version에 맞춰 handler·platform integration을 구현합니다.

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

ESP32-H2는 Thread native, ESP32-C6은 Wi-Fi 6 + 802.15.4, ESP32-S3는 Wi-Fi 계열 구성을 제공합니다. Matter 지원 여부와 transport 조합은 해당 SDK·예제·인증 범위에서 확인합니다.

### Commissioning flow

1. **User scans QR code or NFC tag** — Setup code + discriminator + commissioning info
2. **BLE advertisement (commissioning mode)** — Phone (commissioner) discovers device
3. **PASE — Passcode Authenticated Session Establishment** — Setup code → SPAKE2+ → ephemeral session
4. **Device sends certificates (DAC chain, CD)** — Phone verifies against PAA (Product Attestation Authority)
5. **Phone (or Trusted Root) issues NOC (Node Operational Certificate)** — Operational identity for this fabric
6. **Network credentials transferred** — Thread network key OR Wi-Fi PSK
7. **CASE — Certificate Authenticated Session** — Permanent secure channel using NOC

Commissioning 과정은 PASE·인증서·CASE를 사용해 보호되지만, 전체 보안 수준은 DAC/PAA 관리와 device·controller 구현에 좌우됩니다. Setup code와 operational identity의 수명·교체 정책도 제품에서 설계해야 합니다.

### Multi-fabric 추가

Apple Home에 등록된 device를 *Google Home에도 등록*하려면:

1. 이미 등록된 controller(Apple Home)에서 pairing mode를 켭니다. Controller가 device의 commissioning window를 열고 새 setup code를 보여 줍니다.
2. 두 번째 controller(Google Home app)에서 그 code로 device를 추가합니다.
3. Google fabric이 별도 NOC를 발급하고, device는 두 fabric의 NOC를 모두 보관합니다.
4. 양쪽 controller에서 같은 device를 제어할 수 있습니다.

Device가 지원하는 fabric 수는 Operational Credentials cluster의 `SupportedFabrics` attribute로 드러나며, spec은 최소 5개를 요구합니다.

### Border Router

**Thread Border Router 예:**

- Thread radio가 들어간 smart home hub — Apple TV 4K·HomePod mini, Nest Hub (2nd gen) 등. 같은 제품군이라도 model별로 Thread 탑재 여부가 다르므로 사양표로 확인합니다.
- 또는 Raspberry Pi + nRF52840 dongle 같은 RCP (OpenThread Border Router)

**기능:**

- 802.15.4 Thread ↔ Wi-Fi/Ethernet IPv6 routing
- mDNS/DNS-SD service discovery
- SRP server — Thread device의 service 등록 (Thread 1.3)
- 여러 BR이 있을 때의 redundancy

Border Router가 없으면 Thread mesh 안의 device끼리만 통신하고, Wi-Fi·Ethernet 쪽 controller에는 닿지 못합니다.

### OTA — Matter Software Update

**OTA Software Update Provider cluster(`0x0029`)·Requestor cluster(`0x002A`):**

1. Device(Requestor)가 Provider node에 `QueryImage`를 보냅니다(vendor ID·product ID·현재 version).
2. 새 image가 있으면 Provider가 image URI를 돌려줍니다.
3. Device가 image를 받습니다. 기본 경로는 Matter의 BDX(Bulk Data Transfer)입니다.
4. Device가 image를 검증하고 `ApplyUpdateRequest`로 적용 시점을 확인받습니다.
5. 재부팅 후 새 firmware로 올라오면 `NotifyUpdateApplied`로 알립니다.

Device 안에서 image를 검증·설치·되돌리는 부분은 platform의 bootloader 몫입니다. TF-M 기반 device라면 앞 편의 MCUboot chain이 그 역할을 합니다.

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

Mesh 성능은 router 수·배치·hop 수·간섭에 따라 달라지므로 설치 환경에서 측정합니다. 기록할 항목입니다.

| 지표 | 측정 방법 |
|------|------|
| Commissioning 시간 (BLE → CASE) | controller log timestamp |
| Command latency (hop 수별) | controller 송신 → device attribute report |
| Sleepy device 응답 시간 | poll period·CSL 설정별 |
| Mesh 회복 시간 | router 제거 후 route 재수렴까지 |
| OTA 시간 | 같은 image를 Thread·Wi-Fi로 비교 |

Sleepy End Device의 배터리 수명은 *평균 전류*로 추정합니다. 수명(h) ≈ 배터리 유효 용량(mAh) / 평균 전류(mA)이고, 평균 전류는 sleep 전류와 poll·TX·센서 측정 때의 burst 전류를 duty cycle로 가중 평균한 값입니다. 전류 프로파일러로 실제 파형을 잡아 계산하고, 저온·노화에 따른 유효 용량 감소를 여유로 둡니다.

Router 역할은 radio를 항상 켜 두어야 하므로 상시 전원 device(전구·플러그)가 맡고, 배터리 device는 SED·SSED로 둡니다. Wi-Fi device는 association 유지 비용 때문에 배터리 운영 설계가 더 까다롭습니다.

## 자주 보는 함정

> Border Router 없이 Thread

Border Router 없이 mesh만 구성하면 device끼리는 통신이 되지만 cloud와 controller로는 아예 닿지 못합니다. Apple TV·Nest Hub·OpenThread BR 중 하나가 필요합니다.

> 동일 SoC에서 Wi-Fi + 802.15.4 동시 전송

ESP32-C6처럼 Wi-Fi 2.4 GHz와 802.15.4 2.4 GHz를 한 칩에서 돌리면 같은 RF를 시간으로 나눠 쓰게 되고, 그 과정에서 packet loss가 생길 수 있습니다. Coexistence config(`CONFIG_ESP_COEX_*`)로 time-sharing을 설정합니다.

> Sleepy device poll period 너무 짧음

```c
otLinkSetPollPeriod(ot, 100);   /* 100 ms마다 radio를 켜 parent에 poll */
```

Poll period는 응답 지연과 배터리 수명을 맞바꾸는 값이므로 위 평균 전류 계산으로 정합니다. 짧은 지연과 배터리를 함께 원하면 Thread 1.2의 CSL(SSED)로 parent가 정해진 시점에 child에게 보내게 하는 방식을 검토합니다.

> Certificate provisioning 누락

DAC(Device Attestation Certificate) 없이 출하하면 commissioner의 device attestation 단계에서 commissioning이 실패합니다. 각 device가 *factory-provisioned* DAC chain(DAC·PAI)과 Certification Declaration을 가져야 하고, DAC private key는 PSA ITS나 secure element처럼 보호된 저장소에 둡니다.

> Fabric overflow

Spec은 device가 fabric을 최소 5개 지원하도록 요구하고, 실제 한도는 구현이 정합니다. connectedhomeip SDK의 기본값은 `CHIP_CONFIG_MAX_FABRICS` 16입니다. 한도가 차면 새 ecosystem 추가가 실패하므로, `SupportedFabrics`·`CommissionedFabrics` attribute로 현재 상태를 확인하고 사용하지 않는 fabric을 제거하도록 안내합니다.

> OTA image rollback 미구현

새 firmware가 boot에 실패했을 때 되돌릴 image가 없으면 device를 현장에서 복구할 수 없습니다. MCUboot swap mode처럼 이전 image를 보존하고, 새 image가 스스로 정상 동작을 확인(confirm)하지 않으면 다음 reset에서 이전 image로 돌아가는 *자동 revert*를 구현합니다.

## 정리

- Matter는 여러 ecosystem의 상호운용을 목표로 하는 IoT application-layer 표준입니다.
- Thread(802.15.4 mesh + 6LoWPAN)가 저전력 transport이고, Wi-Fi/Ethernet은 주로 상시 전원 device가 씁니다.
- Multi-fabric으로 한 device가 동시에 여러 ecosystem에 등록됩니다.
- Commissioning은 PASE → DAC verify → NOC issue → CASE 순으로 진행됩니다.
- OpenThread와 Matter SDK는 Nordic·Espressif·Silicon Labs·NXP 등의 SDK에 통합되어 있습니다.
- Sleepy End Device의 배터리 수명은 poll·재전송·센서 duty cycle을 포함해 측정합니다.
- Border Router(Apple TV·Nest Hub·OpenThread BR)가 mesh와 internet을 잇습니다.
- Matter 지원만으로 EU CRA·UK PSTI 등 규제 요구사항이 자동 충족되지는 않으며, secure boot·OTA·attestation과 제품 평가를 별도로 확인합니다.

## 관련 항목

- [12-11: TF-M TrustZone](/blog/embedded/modern-recipes/part12-11-tfm-trustzone)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
