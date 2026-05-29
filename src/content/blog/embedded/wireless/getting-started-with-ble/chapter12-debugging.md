---
title: "Ch 12: BLE 디버깅 — Wireshark, BLE Sniffer, nRF Connect"
date: 2026-05-08T12:00:00
description: "보이지 않는 무선 트래픽을 보는 법. nRF52840 Dongle + Wireshark가 표준 조합."
series: "Getting Started with BLE"
seriesOrder: 12
tags: [ble, debug, wireshark, sniffer, nrf-connect]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

## 한 줄 요약

> **"BLE 버그의 90%는 *눈에 안 보여서* 어렵습니다. *공중에 떠다니는 packet*과 *HCI 명령 시퀀스*를 직접 보기 시작하면, 의외로 단순한 mismatch인 경우가 대부분입니다."** nRF52840 Dongle + Wireshark가 *무료 표준 조합*, btmon이 *Linux HCI 표준*, nRF Connect 모바일 앱이 *현장 점검 표준*입니다.

이번 장은 *BLE 디버깅의 세 레이어*를 한 번에 정리합니다. 첫째, *공중 인터페이스*(over-the-air sniffer)로 양쪽 라디오 간 packet을 봅니다. 둘째, *HCI 인터페이스*(btmon, log)로 host와 controller 사이를 봅니다. 셋째, *GATT 인터페이스*(nRF Connect 앱)로 서비스·characteristic·CCCD를 직접 만져 봅니다. 그리고 *시리즈 마지막*이라 *다음 추천 시리즈*도 정리합니다.

## BLE 디버깅이 어려운 이유

먼저 *왜 어려운가*를 짚어 두면 도구 선택이 명확해집니다.

| 어려움 | 원인 | 대응 |
|--------|------|------|
| 무선 — 직접 못 봄 | RF는 oscilloscope로 분석 어려움 | sniffer 라디오로 packet 캡처 |
| 암호화 | 페어링 후 packet payload 안 보임 | LTK 추출해 sniffer에 주입 |
| 동시 광고 | 한 환경에 수십 개 BLE 디바이스 | MAC/UUID 필터 |
| 채널 hopping | 3 광고 채널 + 37 데이터 채널 | sniffer가 자동 follow |
| 짧은 packet | 1.5 ms 안에 다 끝남 | 시간축 zoom |
| 양쪽 stack 다름 | 폰 stack, 칩 stack 차이 | 양쪽 다 캡처 |

가장 큰 함정은 *추측 디버깅*입니다. "MTU 협상이 안 됐을 거다"라고 *추정*하지 말고, sniffer로 *실제 ATT_EXCHANGE_MTU_REQ packet을 확인*해야 합니다. BLE는 *추정과 실제의 괴리*가 다른 어떤 프로토콜보다 큽니다.

## Sniffer 옵션 - 가격대별

| 도구 | 가격 | 동시 채널 | 지원 PHY | 장점 | 약점 |
|------|------|----------|----------|------|------|
| nRF52840 Dongle + nRF Sniffer | $10 | 1 | 1M/2M/Coded | 무료 SW, 양품질 | 1 채널만 |
| TI CC1352P + SmartRF Sniffer | $50 | 1 | 1M/2M | TI 친화 | 활성 개발 멈춤 |
| Ellisys Bluetooth Tracker | $5000+ | 모든 (3 + 37 동시) | 모두 | 전문가용 | 가격 |
| Frontline Sodera | $4000+ | 모든 | 모두 | enterprise | 가격 |
| Wireshark + USB Bluetooth 5.0 + extcap | $30 | 1 | 1M | 매우 저렴 | 품질 |

대부분의 일반 응용에는 *nRF52840 Dongle + nRF Sniffer for BLE*가 *충분합니다*. Nordic이 무료로 제공하는 *closed-source 펌웨어*를 dongle에 굽고, Wireshark의 *extcap plugin*을 통해 캡처합니다.

## nRF Sniffer 셋업

```bash
# 1. nRF52840 Dongle 구매 (Nordic 공식 $10)

# 2. nRF Sniffer for Bluetooth LE 펌웨어 다운로드
#    https://www.nordicsemi.com/Products/Development-tools/nrf-sniffer-for-bluetooth-le

# 3. nRF Connect for Desktop > Programmer 앱으로 dongle에 펌웨어 flash

# 4. Wireshark + extcap plugin 설치
#    macOS:
brew install wireshark
cp -r extcap/* "/Applications/Wireshark.app/Contents/MacOS/extcap/"

#    Linux:
sudo cp -r extcap/* /usr/lib/x86_64-linux-gnu/wireshark/extcap/
sudo apt install python3-pyserial

# 5. Wireshark 실행 → Capture interfaces에 "nRF Sniffer for Bluetooth LE COM..."이 보임
```

**Wireshark에서 nRF Sniffer 사용:**

1. Capture interfaces에서 nRF Sniffer 선택
2. (선택) Device 목록에서 타겟 BLE 디바이스 클릭 → follow
3. Start capture
4. 타겟 디바이스와 폰 사이 BLE 트래픽이 packet 단위로 표시

**Wireshark 필터 예:**

| 필터 | 의미 |
|------|------|
| `btle.advertising_address == 11:22:33:44:55:66` | 특정 MAC만 |
| `btatt` | ATT 레이어만 |
| `btatt.opcode == 0x0A` | Read Request |
| `btatt.opcode == 0x12` | Write Request |
| `btsmp` | SMP (pairing) |
| `btle.length > 30` | 큰 packet만 |

암호화된 연결을 *복호화*하려면 *LTK*를 알아야 합니다. nRF Sniffer는 *Wireshark의 BLE preferences*에서 LTK를 입력하면 *암호화된 packet도 복호화해* 보여 줍니다.

```text
[LTK 입력 방법 - Wireshark]

Wireshark > Preferences > Protocols > BT SMP
  Pre-bonded keys:
    LTK: 0102030405060708 090A0B0C0D0E0F10  (Hex, 16 byte)
    
또는 IRK 입력:
  IRK: A1B2C3D4E5F6...
```

LTK 얻기는 *디바이스 펌웨어에서 log로 찍는* 게 가장 빠릅니다. 또는 *nRF Sniffer가 페어링 과정을 직접 캡처*해서 자동 추출하기도 합니다(LESC가 아닌 Legacy + Just Works만).

## Wireshark 필터 카탈로그

자주 쓰는 필터 모음입니다.

```text
# Advertising
btle.advertising_header.pdu_type == 0x00     ADV_IND
btle.advertising_header.pdu_type == 0x02     ADV_NONCONN_IND
btle.advertising_header.pdu_type == 0x06     ADV_SCAN_IND
btle.advertising_header.pdu_type == 0x07     ADV_EXT_IND

# Connection events
btle.control.opcode == 0x00                  LL_CONNECTION_UPDATE_IND
btle.control.opcode == 0x02                  LL_TERMINATE_IND
btle.control.opcode == 0x03                  LL_ENC_REQ (페어링 후 암호화 시작)
btle.control.opcode == 0x16                  LL_LENGTH_REQ (DLE)
btle.control.opcode == 0x18                  LL_PHY_REQ

# ATT
btatt.opcode == 0x02     Exchange MTU Request
btatt.opcode == 0x03     Exchange MTU Response
btatt.opcode == 0x0A     Read Request
btatt.opcode == 0x0B     Read Response
btatt.opcode == 0x12     Write Request
btatt.opcode == 0x13     Write Response
btatt.opcode == 0x1B     Handle Value Notification
btatt.opcode == 0x1D     Handle Value Indication

# SMP (pairing)
btsmp.opcode == 0x01     Pairing Request
btsmp.opcode == 0x02     Pairing Response
btsmp.opcode == 0x0C     Pairing Public Key
btsmp.opcode == 0x0D     Pairing DHKey Check
btsmp.opcode == 0x05     Pairing Failed
```

## btmon - Linux HCI 추적

over-the-air는 *완성된 packet*만 보여 줍니다. *왜 그렇게 만들어졌는지*는 *host ↔ controller* HCI 인터페이스를 봐야 합니다. Linux에는 `btmon`이 표준입니다.

```bash
# BLE 트래픽 실시간 모니터
sudo btmon

# 파일로 저장
sudo btmon -w /tmp/ble-trace.snoop

# 저장한 trace를 Wireshark에서 열기
wireshark /tmp/ble-trace.snoop
```

```text
[btmon 출력 예 - 광고 시작]

< HCI Command: LE Set Advertising Parameters (0x08|0x0006) plen 15
        Min advertising interval: 30.000 msec (0x0030)
        Max advertising interval: 60.000 msec (0x0060)
        Type: Connectable undirected (ADV_IND)
        Own address type: Public
        Direct address type: Public (0x00)
        Direct address: 00:00:00:00:00:00
        Channel map: 37, 38, 39 (0x07)
        Filter policy: Allow Scan Request from Any, Allow Connect Request from Any

> HCI Event: Command Complete (0x0e) plen 4
        LE Set Advertising Parameters (0x08|0x0006) ncmd 1
        Status: Success (0x00)

< HCI Command: LE Set Advertise Enable (0x08|0x000a) plen 1
        Advertising: Enabled (0x01)
```

`<`가 host → controller, `>`가 controller → host입니다. 광고가 안 시작되는 버그는 *`Status: 0x01` 이상*이 거의 항상 원인입니다. Status 코드를 *Bluetooth Spec Volume 1 Part F*에서 확인합니다.

```bash
# Linux에서 BLE 디바이스에 직접 연결 (테스트용)
sudo bluetoothctl
> scan on
> connect 11:22:33:44:55:66
> menu gatt
> list-attributes
> select-attribute /org/bluez/hci0/dev_.../service0028/char0029
> read
> write 0x12 0x34
> notify on
```

`bluetoothctl`은 *책에서 자주 등장하는 도구*인데, 실제 운영은 *btmon으로 추적하면서 bluetoothctl로 조작*하는 패턴이 흔합니다.

## nRF Connect 모바일 앱

*nRF Connect for Mobile*(Android, iOS)이 *현장 점검*의 표준입니다. 모든 BLE 엔지니어가 폰에 깔아 둡니다.

**nRF Connect 주요 기능:**

| 기능 | 내용 |
|------|------|
| **1. Scanner** | 주변 BLE 디바이스 + adv data + RSSI · 필터 (이름, RSSI, manufacturer) · Raw adv data hex 표시 |
| **2. Device 페이지** | Service 트리 (16-bit/128-bit UUID) · Characteristic별 read/write/notify 버튼 · CCCD 토글 · MTU 협상 · Pairing 트리거 · Connection parameter 표시 |
| **3. Logger** | 모든 ATT operation 시간순 기록 · `.txt` export 가능 |
| **4. Configuration** | BLE adv 시뮬레이션 · GATT server 시뮬레이션 (HID 헤드셋 흉내 등) |
| **5. Bonds** | 페어링된 디바이스 목록 · 강제 unpair |

```python
# 안드로이드에서 nRF Connect log를 자동 파싱하는 스크립트 예
import re, sys

LOG_RE = re.compile(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\w+)\s+(.+)')

with open(sys.argv[1]) as f:
    for line in f:
        m = LOG_RE.match(line)
        if not m: continue
        ts, level, msg = m.groups()
        if 'Notification received' in msg:
            print(f'[{ts}] {msg}')
        elif 'Write Request' in msg:
            print(f'[{ts}] {msg}')
```

iOS는 시스템 정책상 *raw packet 캡처 불가*입니다. 그래서 *iOS 디버깅*은 *Mac의 PacketLogger* (Additional Tools for Xcode에 포함)나 *sniffer*만 의존하게 됩니다.

## 흔한 버그 - 9가지 카탈로그

지금까지 시리즈에서 본 *모든 흔한 함정*을 한 곳에 모았습니다.

### 1. Adv interval > scan window

```text
증상  : 폰이 디바이스를 못 잡음
원인  : peripheral adv interval이 너무 김 + central scan window 부족
검증  : sniffer에서 adv packet 캡처되는지 확인
해결  : adv interval 줄이기 (100ms 시도) + active scan
```

### 2. MTU never negotiated

```text
증상  : Notification에서 20 byte 이상 데이터가 잘림
원인  : ATT_EXCHANGE_MTU_REQ 협상 안 일어남 또는 실패
검증  : btmon/sniffer에서 MTU exchange packet 확인
해결  : 연결 후 명시적 bt_gatt_exchange_mtu 호출
```

### 3. CCCD not enabled

| 항목 | 내용 |
|------|------|
| 증상 | peripheral에서 `ble_gatts_notify` 호출했는데 폰이 못 받음 |
| 원인 | central이 CCCD(`0x2902`) descriptor에 notify bit 안 씀 |
| 검증 | sniffer에서 `ATT_WRITE_REQ to CCCD = 0x0001` 확인 |
| 해결 | 클라이언트 코드에서 `setCharacteristicNotification` + `writeDescriptor`. 또는 시뮬레이션은 nRF Connect 앱에서 notification 버튼 |

### 4. ATT permission mismatch

```text
증상  : Write가 Insufficient Authentication error로 실패
원인  : characteristic에 BT_GATT_PERM_WRITE_ENCRYPT인데 페어링 안 됨
검증  : btmon에서 ATT_ERROR_RSP, error_code=0x05 (Authentication)
해결  : pairing 먼저 시작 또는 permission을 PERM_WRITE로 완화
```

### 5. Bond not persisting

```text
증상  : 재연결마다 페어링 다시
원인  : Settings subsys 비활성 / NimBLE store_config_init 누락
검증  : 재부팅 후 bond 목록 비어 있음
해결  : CONFIG_BT_SETTINGS=y (NCS) 또는 ble_store_config_init() (NimBLE)
```

### 6. Connection drops every few seconds

```text
증상  : 연결 후 5초 안에 끊김
원인  : supervision timeout 너무 짧음 + WiFi 간섭
검증  : btmon에서 LE Disconnection Complete, reason=0x08 (Connection Timeout)
해결  : timeout을 5초 이상으로 늘리기 + AFH channel map
```

### 7. iOS rejects connection parameter update

```text
증상  : peripheral의 update request가 조용히 무시됨
원인  : Apple Accessory Design Guidelines 위반
검증  : le_param_updated callback에서 실제 적용 값 로깅
해결  : interval≥15ms, latency≤30, timeout≥2s, 부등식 만족
```

### 8. Throughput stuck at ~10 kbps

```text
증상  : OTA 업데이트가 매우 느림
원인  : MTU 23 + DLE 27 + 1M PHY (모든 기본값)
검증  : connection event당 한 packet만 캡처됨
해결  : MTU 247 + DLE 251 + 2M PHY 협상
```

### 9. Coded PHY 거리 4배 안 나옴

```text
증상  : 옥내에서 Coded PHY가 1M PHY와 비슷한 거리
원인  : multipath, 반사, 장애물
검증  : 옥외 LOS에서 거리 측정
해결  : 옥외/LOS 환경에서만 4× 보장. 옥내는 +6dB 정도
```

## 자주 하는 실수 - 디버깅 자체

| 실수 | 안전한 대안 |
|------|-------------|
| "MTU가 안 됐을 거다" 추측 | sniffer 또는 btmon으로 실제 확인 |
| print만으로 디버그 | 시간 정확한 sniffer trace |
| sniffer 안 사고 buying decision | $10 dongle은 *항상* 살 가치 있음 |
| LTK를 매번 reset | 펌웨어가 LTK를 항상 로그로 출력 |
| 한 환경에서만 테스트 | WiFi 켠 환경, 끈 환경 양쪽 |
| ATT_ERROR_RSP를 무시 | error_code를 표에서 찾아 원인 확인 |

## 시리즈 마무리 - 12 장 회고

본 시리즈는 *Kevin Townsend et al.*의 *Getting Started with Bluetooth Low Energy*(O'Reilly, 2014)를 *현대 SDK*로 옮긴 한국어 가이드입니다. 책이 BlueZ·Arduino 위주였다면, 본 시리즈는 *NCS·NimBLE* 위주로 다시 썼습니다.

12 장의 흐름을 한 번에 짚으면 다음과 같습니다.

| Ch | 주제 | 핵심 통찰 |
|----|------|----------|
| 1 | Why BLE | 1 mA 평균 전류라는 *전력 혁명* |
| 2 | Spec 진화 | 4.0(2010) → 5.4(2023) 키 기능 |
| 3 | 프로토콜 스택 | PHY/LL/HCI/L2CAP/ATT/GATT/GAP/SMP |
| 4 | GAP | 4가지 역할과 광고/스캐닝 흐름 |
| 5 | GATT | service/characteristic/descriptor 3계층 |
| 6 | 표준 vs custom service | SIG-adopted 100+ vs 자체 128-bit UUID |
| 7 | Pairing·Bonding | 4 association model + LESC + 3 키 |
| 8 | Advertising·Scanning | 31B/255B 페이로드 + iBeacon/Eddystone |
| 9 | Connection 관리 | interval/latency/timeout 부등식 + DLE |
| 10 | BLE 5 | 2M·Coded·Extended·Periodic·LE Audio·Direction Finding |
| 11 | NCS 실습 | west/Kconfig/devicetree + PPK II |
| 12 | 디버깅 | sniffer + btmon + nRF Connect + 9 버그 카탈로그 |

이 시리즈를 *처음부터 끝까지* 읽었다면, 이제 *BLE 펌웨어를 처음부터 양산*까지 끌고 갈 수 있습니다. 남는 건 *실제 칩과 보드*에서 *수십 시간 디버깅*하는 경험뿐입니다.

## 다음 추천 시리즈

이 시리즈에서 발생한 *후속 관심*을 어디로 이어가면 좋을지 정리했습니다.

| 관심 영역 | 추천 시리즈 |
|----------|------------|
| BLE 보안의 *암호학 깊이* | [Embedded Security](/blog/embedded/embedded-security/) — ECC·AES·secure boot |
| RTOS 위에서 *BLE 응용 구조* | [FreeRTOS Mastering](/blog/embedded/rtos/freertos-mastering/) |
| *오늘날 양산 패턴* (OTA, BLE provisioning, secure boot) | [Modern Embedded Recipes](/blog/embedded/modern-recipes/) |
| *WiFi와 BLE 동시 운영* | [ESP32-C3 Mastering](/blog/embedded/riscv/esp32-c3-mastering/) |
| MCU *전력 측정·최적화* | [Embedded Performance Engineering](/blog/embedded/performance/) |
| 무선 *Mesh* (BLE Mesh, Thread, Matter) | (예정) Bluetooth Mesh + Matter 시리즈 |

## 정리

- BLE 디버깅의 90%는 *눈에 안 보여서* 어렵습니다. sniffer/btmon으로 *실제 packet*을 보면 거의 항상 단순 mismatch입니다.
- *nRF52840 Dongle + nRF Sniffer + Wireshark*가 무료 표준 조합입니다. $10에 양품질입니다.
- *Wireshark 필터*로 ATT/SMP/LL packet을 빠르게 좁혀 봅니다. 자주 쓰는 opcode 표를 외워 둡니다.
- *btmon*은 Linux HCI 인터페이스 추적의 표준입니다. command/event 흐름을 *실시간*으로 봅니다.
- *nRF Connect 모바일 앱*이 현장 점검 표준입니다. service/characteristic/CCCD를 *직접 만져* 봅니다.
- *9가지 흔한 버그 카탈로그*를 책상 옆에 둡니다. 80%는 이 안에 들어 있습니다.
- 추측 디버깅 대신 *측정 디버깅*. "MTU가 안 됐을 거다"가 아니라 *sniffer에서 MTU packet 확인*입니다.
- 시리즈는 끝났지만 *현장 경험*만이 진짜 학습입니다. 칩을 사고, 코드를 굽고, sniffer로 보면서 *시간 단위*로 늘어 갑니다.

## 다음 편

다음 추천은 [Embedded Security](/blog/embedded/embedded-security/) 또는 [Modern Embedded Recipes](/blog/embedded/modern-recipes/)입니다. BLE 펌웨어를 *양산*까지 끌고 가려면 *secure boot, OTA, provisioning*이 필수인데, 그 둘은 BLE 보안의 *암호학 토대*와 *오늘날 양산 패턴*을 각각 다룹니다.

## 관련 항목

- [Ch 1: Why BLE](/blog/embedded/wireless/getting-started-with-ble/chapter01-why-ble) — 시리즈 시작점
- [Ch 7: Pairing·Bonding](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding) — sniffer로 페어링 시퀀스 보기
- [Ch 11: nRF Connect SDK 실습](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk) — 실제 코드 환경
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — NimBLE 디버깅
- [Embedded Security](/blog/embedded/embedded-security/) — 다음 추천 시리즈
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 다음 추천 시리즈
- [FreeRTOS Mastering](/blog/embedded/rtos/freertos-mastering/) — 다음 추천 시리즈
- [원문 — Getting Started with Bluetooth Low Energy (O'Reilly)](https://www.oreilly.com/library/view/getting-started-with/9781491900550/)
- [원문 — nRF Sniffer for Bluetooth LE](https://www.nordicsemi.com/Products/Development-tools/nrf-sniffer-for-bluetooth-le)
- [원문 — Wireshark Bluetooth LE Capture](https://wiki.wireshark.org/Bluetooth)
