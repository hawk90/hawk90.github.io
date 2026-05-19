---
title: "6-09: Matter·Thread — IoT 표준 (Apple·Google·Amazon)"
date: 2026-05-21T09:00:00
description: "Matter 1.3/1.4, Thread 1.3, OpenThread, nRF52840·ESP32-H2·RP2040W. Commissioning, fabric, cluster."
series: "Modern Embedded Recipes"
seriesOrder: 39
tags: [recipes, iot, matter, thread, openthread, csa]
draft: true
---

## 한 줄 요약

> **"Matter = Apple·Google·Amazon 공통 IoT 표준"** — Thread mesh + WiFi 통합.

## 배경 — 표준 통일

```text
2020 이전:
  HomeKit (Apple)
  Google Weave
  Amazon Smart Home
  Samsung SmartThings
  Zigbee, Z-Wave, MQTT
  → vendor lock-in, complexity

2021: Connectivity Standards Alliance (CSA) — Matter 발표
2022: Matter 1.0 ratified
2023: Matter 1.2
2024: Matter 1.3
2025: Matter 1.4 (large network 지원)
```

전세계 IoT 표준 — *commissioning·discovery·security 단일*.

## Matter Architecture

```text
Application Layer:
  Cluster (Lights, Sensors, Door Lock, ...)
  
Data Model:
  Endpoint·Cluster·Attribute·Command
  
Transport:
  TCP·UDP (over IP)
  Thread / WiFi / Ethernet
  
Security:
  PASE (Passcode-Authenticated Session Establishment)
  CASE (Certificate-Authenticated Session Establishment)
  Group key
```

OSI layer 모델 — *transport 무관*.

## Thread 1.3

```text
Thread:
  IEEE 802.15.4 PHY/MAC
  6LoWPAN (IPv6 over low-power)
  Mesh routing (RPL)
  Border Router (Thread ↔ WiFi)
  
Thread 1.3:
  TCPlp (TCP over low-power)
  Thread Domain (multi-network)
  
802.15.4:
  2.4 GHz, 250 kbps
  ~30 m indoor
  Low power (sleepy end device)
```

## nRF52840 / ESP32-H2 / RP2040W

```text
Thread-capable MCUs:
  Nordic nRF52840·nRF5340·nRF54L
  Espressif ESP32-H2·H4·C6
  Silicon Labs EFR32
  TI CC1352·CC2652
  
Recent:
  Raspberry Pi RP2040W (WiFi)
  Pi Pico 2 W (WiFi)
```

## OpenThread — Google 오픈소스

```c
#include <openthread/thread.h>

otInstance *instance = otInstanceInitSingle();

/* Set network key */
otNetworkKey key = { .m8 = {0x00, 0x11, ...} };
otThreadSetNetworkKey(instance, &key);

/* Enable */
otIp6SetEnabled(instance, true);
otThreadSetEnabled(instance, true);
```

Google maintained. Zephyr·nRF Connect SDK·ESP-IDF 통합.

## Matter SDK

```bash
git clone https://github.com/project-chip/connectedhomeip
cd connectedhomeip
./scripts/checkout_submodules.py --shallow --platform linux

# Build example
source scripts/activate.sh
cd examples/lighting-app/linux
gn gen out/host
ninja -C out/host
```

```c
/* Lighting app */
#include <app/server/Server.h>
#include <app/clusters/on-off-server/on-off-server.h>

void on_off_changed(EndpointId endpoint, AttributeId attribute, ...) {
    if (attribute == OnOff::Attributes::OnOff::Id) {
        bool on = ...;
        gpio_set(LED, on);
    }
}
```

## Cluster — Data Model

```text
Lighting cluster:
  Attributes:
    OnOff (bool)
    Level (0-255)
    ColorXY·ColorTemp
    
  Commands:
    On, Off, Toggle
    MoveToLevel
    MoveToColor
    
Door lock:
  Attributes: LockState, UserCount
  Commands: LockDoor, UnlockDoor

Thermostat:
  Attributes: Temp, HeatingSetpoint
  Commands: SetSetpoint
```

300+ standard cluster — Matter spec.

## Commissioning Flow

```text
1. User scans QR code or NFC
   → setup code + discriminator
   
2. BLE/IP discovery
   Phone (commissioner) finds device
   
3. PASE — Passcode-authenticated session
   Setup code → ephemeral key
   
4. Device certificate signed (DAC, PAI, CD)
   PKI verification
   
5. Operational certificate (NOC) issued
   Permanent identity
   
6. Network credentials transferred
   Thread network key 또는 WiFi PSK
   
7. CASE — Certificate-authenticated session
   Permanent secure channel
```

End-to-end secure provisioning.

## Multi-Admin·Multi-Fabric

```text
한 device가 *여러 ecosystem* 동시 등록:
  - Apple Home
  - Google Home
  - Amazon Alexa
  - Samsung SmartThings
  
각 ecosystem = *별도 fabric*
각 fabric = 별도 NOC
```

Vendor lock-in 종료 — *Matter의 핵심*.

## Border Router

```text
Thread Border Router:
  - Thread 802.15.4 ↔ WiFi/Ethernet
  - Apple HomePod, Google Nest Hub, Amazon Echo
  - OpenThread Border Router (RPi 4·5)
  
Function:
  - Service discovery (mDNS·DNS-SD)
  - IPv6 routing
  - BR election, redundancy
```

Apple TV·HomePod = Thread Border Router.

## Sleepy End Device — Battery

```c
otThreadSetSleepyEndDevice(instance, true);

/* Configure polling */
otSetPollPeriod(instance, 1000);   /* 1 sec */
```

Sleepy End Device — 99% sleep, 1% wake. *Battery 수년*.

## Application — Smart Bulb 예

```c
/* matter-light/main/AppTask.cpp */
#include <app-common/zap-generated/attributes/Accessors.h>

void on_off_attribute_changed(...) {
    bool value;
    OnOffServer::Instance().getOnOff(endpoint, &value);
    
    if (value) {
        light_turn_on();
    } else {
        light_turn_off();
    }
}

void light_set_level(uint8_t level) {
    /* 0-255 → PWM duty */
    pwm_set_duty(LED, level * 1000 / 255);
}
```

## Zephyr + OpenThread

```bash
west init -m https://github.com/nrfconnect/sdk-nrf
cd nrf
west update

# Build Matter light
west build -b nrf52840dk_nrf52840 \
    samples/matter/light_bulb
```

Nordic + Zephyr + OpenThread + Matter — *commercial-grade stack*.

## ESP-IDF + Matter

```c
/* ESP32-H2 native Matter */
#include "esp_matter.h"

esp_matter::node::node_t *node;
esp_matter::endpoint::config_t endpoint_config;

esp_matter::endpoint::create(node, &endpoint_config);
esp_matter::cluster::on_off::create(endpoint, &cluster_config, ...);
```

Espressif Matter SDK — ESP32-H2 (Thread)·ESP32-C6 (WiFi+Thread)·S3 (WiFi).

## OTA — Matter OTA Provider

```text
Matter OTA Software Update:
  - Cluster: 0x002A
  - Image announce
  - Image query·download
  - Apply on next boot
  
Vendor (Apple·Google) — OTA provider 운영
Manufacturer — image upload to vendor
End device — auto download·install
```

## Power Saving

```text
Thread Sleepy End Device (SED):
  Average 30 µA
  Wake every 1 sec for parent poll
  Battery life ~ 5 year (CR2032)

WiFi Matter:
  ESP32 — much higher power
  Plugged device (lights, switches)
```

Battery sensor — *Thread SED*. Plug-in — *WiFi or Thread Router*.

## Network Diagnostic

```c
/* Matter diagnostic cluster */
otRouterInfo router_info;
otThreadGetParentInfo(instance, &router_info);

/* Signal strength */
int8_t rssi = otThreadGetParentAverageRssi(instance);

/* Topology */
otNeighborInfoIterator it = OT_NEIGHBOR_INFO_ITERATOR_INIT;
otNeighborInfo neighbor;
while (otThreadGetNextNeighborInfo(instance, &it, &neighbor) == OT_ERROR_NONE) {
    log_info("Neighbor %04x rssi=%d", neighbor.mRloc16, neighbor.mAverageRssi);
}
```

## Apple Home — HomeKit Compatibility

```text
Matter device → 자동 Apple Home 등록
HomeKit accessory → 별도 HomeKit only
  
Matter는 HomeKit 위 추가 layer:
  Matter device ↔ Apple Home ↔ HomeKit gateway
  
일부 vendor — Matter + HomeKit dual.
```

## Cyber Resilience Act (EU CRA)

```text
2025 EU CRA — IoT 의무:
  - Secure boot (TF-M·MCUboot)
  - Encrypted storage
  - Software updates 5-year
  - Vulnerability disclosure
  - Documentation
  
Matter — *대부분 자동 호환*:
  - PASE/CASE secure session
  - OTA built-in
  - Certificate-based identity
```

## 자주 하는 실수

> ⚠️ Thread + WiFi 동시 802.15.4 conflict

```text
Same SoC (ESP32-C6) — WiFi 2.4 GHz + 802.15.4 2.4 GHz
→ interference
```

→ Coexistence config·time-sharing.

> ⚠️ Sleepy 너무 짧음

```c
otSetPollPeriod(instance, 100);   /* 100 ms — battery drains fast */
```

→ 1+ sec poll. Latency·battery trade-off.

> ⚠️ Border Router 없이 Thread

```text
Thread mesh — *Border Router*가 internet bridge
→ no BR = local 통신만, cloud 없음
```

→ Apple TV·Google Nest·OpenThread BR 설치.

> ⚠️ Fabric overflow

```text
Matter 1.0-1.2: 5 fabric max
Matter 1.3+: ~16
Matter 1.4: 더 큰 fabric
```

→ 버전 확인.

## 정리

- Matter = **CSA 통합 IoT 표준** (Apple·Google·Amazon·Samsung).
- **Thread 1.3** = 802.15.4 mesh + IPv6.
- **OpenThread** = Google 오픈소스 — Zephyr·ESP-IDF.
- **Commissioning** = PASE → DAC → NOC → CASE.
- **Multi-fabric** — vendor lock-in 종료.
- **Sleepy End Device** = battery 수년.
- 2025 EU CRA·UK PSTI — IoT 보안 의무 + Matter 호환.

**Modern Embedded Recipes 시리즈 완성** (Part 1-6, 39편).

## 관련 항목

- [6-08: TF-M TrustZone](/blog/embedded/modern-recipes/part6-08-tfm-trustzone)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part6-01-edge-inference)
