---
title: "Ch 3: 프로토콜 스택 — PHY·LL·HCI·L2CAP·ATT·GATT·GAP"
date: 2026-05-08T03:00:00
description: "BLE 스택 7층. Controller(PHY/LL)와 Host(HCI 이상) 분리, GATT가 사용자 인터페이스."
series: "Getting Started with BLE"
seriesOrder: 3
tags: [ble, stack, phy, ll, hci, l2cap, att, gatt]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"BLE 스택은 *Controller(PHY+LL)와 Host(L2CAP 이상)*로 분리되어 있고, 둘 사이를 *HCI*가 잇습니다."** 이 분리는 *클래식 BT부터 내려온 설계 결정*이고, *single-chip(둘 다 한 칩)과 dual-chip(분리)* 양쪽을 모두 지원하기 위한 것입니다. 이 장은 *바이트 수준에서* 어떻게 패킷이 흐르는지를 봅니다.

OSI 7계층처럼 BLE도 *계층화*되어 있습니다. 다만 OSI와는 다르게 *Controller와 Host의 경계*가 명확하고, *그 경계가 HCI*입니다. 이 분리를 알면 *왜 Linux에서 hcitool로 raw command를 쏘는지*, *왜 nRF52에서 NimBLE이 Controller와 Host를 다 가지는지*가 단번에 보입니다.

이번 장은 *각 계층이 어떤 바이트를 다루는지*를 *trace 수준에서* 봅니다. 4장의 GAP, 5장의 GATT가 *어디에 얹히는지*를 알기 위한 토대입니다.

## 전체 그림 — 7계층

![BLE 프로토콜 스택 — 7계층 (Application부터 PHY까지)](/images/blog/ble/diagrams/ch03-ble-stack.svg)

위 그림은 *논리적*입니다. 실제로는 *GAP과 GATT가 SMP/ATT를 호출*하고, *L2CAP은 그 아래에서 채널만 관리*합니다. 직선 적층이 아니라 *교차 의존*이 있습니다.

| 계층 | 역할 | 다루는 단위 |
|------|------|------------|
| PHY | 무선 비트 전송 | 비트 |
| LL | 패킷, 호핑, 상태기계 | LL PDU (2~257 byte) |
| HCI | Controller ↔ Host 인터페이스 | HCI Command/Event/Data |
| L2CAP | 채널 다중화, fragment | L2CAP frame (CID별) |
| ATT | 속성 read/write | ATT PDU (1~MTU byte) |
| GATT | service/characteristic 모델 | ATT 위에서 추상화 |
| SMP | pairing, key 분배 | SMP PDU |
| GAP | 디바이스 발견·연결 | 절차 |

## PHY — 2.4 GHz 무선

물리 계층은 *2.4 GHz ISM 대역*을 *40개 채널 × 2 MHz*로 나눕니다. 각 채널은 *주파수 인덱스*로 구분됩니다.

```text
채널 인덱스 → 주파수 매핑 (4.0~5.4 공통)
ch 37 → 2402 MHz  (advertising primary)
ch 0  → 2404 MHz
ch 1  → 2406 MHz
...
ch 10 → 2424 MHz
ch 38 → 2426 MHz  (advertising primary)
ch 11 → 2428 MHz
...
ch 36 → 2478 MHz
ch 39 → 2480 MHz  (advertising primary)

광고: ch 37, 38, 39 (WiFi 1, 6, 11과 의도적으로 비충돌)
데이터: ch 0~36 (37개)
```

변조는 *GFSK (Gaussian Frequency Shift Keying)*입니다. *1 또는 0*을 *주파수 편차 ±250 kHz*로 보냅니다.

```text
1M PHY    1 bit = 1 µs                  symbol rate 1 Msym/s
2M PHY    1 bit = 0.5 µs                symbol rate 2 Msym/s
Coded S=2 1 bit = 2 µs (FEC 1/2)         symbol rate 1 Msym/s
Coded S=8 1 bit = 8 µs (FEC + pattern)   symbol rate 1 Msym/s
```

5.0의 *2M PHY*는 *symbol rate를 2배로*, *Coded PHY*는 *같은 symbol rate에 FEC*를 적용합니다.

수신 감도와 송신 출력은 칩마다 다릅니다.

```text
nRF52840 (Nordic) — 일반 BLE 칩
  TX power     -20 ~ +8 dBm
  RX sensitivity 1M:    -95 dBm
  RX sensitivity 2M:    -92 dBm
  RX sensitivity S=8:  -103 dBm  ← Coded LR 효과

ESP32-C3
  TX power     -27 ~ +18 dBm  ← 임베디드 중 강한 편
  RX sensitivity 1M:    -97 dBm
```

## Link Layer — 5개 상태 기계

LL은 *PHY 위에서 패킷을 만들고, 채널을 골라서, 상태를 관리*하는 계층입니다. 5개 상태로 구성됩니다.

![Link Layer 5개 상태 — Standby에서 시작해 Advertising / Scanning / Initiating 중 하나를 거쳐 Connection으로](/images/blog/ble/diagrams/ch03-ll-state.svg)

| 상태 | 역할 | 발신/수신 |
|------|------|----------|
| Standby | 라디오 off | - |
| Advertising | 자기 광고 송신 | TX 위주 |
| Scanning | 광고 청취 | RX 위주 |
| Initiating | 광고에 응답해 연결 시작 | TX/RX |
| Connection | 연결 유지, 주기 교환 | TX/RX 교번 |

### LL PDU 포맷

![LL Packet 구조 — Preamble · Access Address · PDU · CRC와 PDU Header 16-bit 세부](/images/blog/ble/diagrams/ch03-ll-packet.svg)

광고 패킷 Access Address: `0x8E89BED6` (고정). 데이터 패킷 Access Address: connect 시 32-bit 랜덤 결정.

PDU Header 16 bit는 LLID(4b) · NESN(1b) · SN(1b) · MD(1b) · Length(8b) · RFU(1b)로 구성됩니다.

### ADV_IND 패킷 예 (광고)

```text
실제 sniffer 캡처 (nRF Sniffer 형식, hex)
AA 8E 89 BE D6   ← Access Address (광고 고정값)
40 11            ← PDU header (type=0x0 ADV_IND, length=17)
A0 B1 C2 D3 E4 F5  ← AdvA (광고자 MAC, 6 byte)
02 01 06         ← Flags AD (length=2, type=0x01, value=0x06)
07 09 4D 79 44 65 76  ← Complete Local Name "MyDev" (length=7, type=0x09)
B2 4C 8A         ← CRC (3 byte)
```

광고 한 번이 *24 byte 정도*입니다. 1M PHY에서 *24 × 8 = 192 µs*에 전송됩니다.

### Connection Event

연결이 맺어지면 *Connection Interval*마다 한 번씩 *connection event*가 열립니다.

```text
Connection Interval (7.5 ms ~ 4 s)
┌──────────────────────────────────┬────...
│  CE 1                            │  CE 2  ...
│ ┌────┐┌────┐┌────┐               │ ┌────┐...
│ │M→S ││S→M ││M→S │ (반복)         │ │M→S │
│ └────┘└────┘└────┘               │ └────┘
└──────────────────────────────────┴────...
```

매 CE에서 *Master가 먼저 송신*, *Slave가 응답*. 패킷이 없어도 *empty packet*을 주고받아 연결을 유지합니다. *Slave Latency*는 *Slave가 N번까지 응답 안 해도 disconnect 안 함*을 정합니다. 절전에 결정적입니다.

채널은 *connection 시작 시 결정된 channel map (37비트 마스크)*에 따라 *매 CE마다 호핑*합니다.

```c
// Channel selection algorithm (Bluetooth Core Spec 6 Part B 4.5.8.2)
// LE_Channel_Selection_Algorithm_#1 (legacy, 4.0+)
nextChannel = (lastUnmappedChannel + hopIncrement) % 37
if (nextChannel은 channelMap에서 unused) {
    remappingIndex = nextChannel % numUsedChannels;
    nextChannel = channelMap의 remappingIndex번째 used 채널;
}
```

## HCI — Host와 Controller의 분리선

HCI(Host Controller Interface)는 *Host와 Controller가 통신하는 표준 메시지 인터페이스*입니다. 같은 칩 안의 두 모듈이든, *UART로 연결된 두 칩*이든, *같은 메시지 포맷*을 씁니다.

### 4가지 패킷 종류

```text
HCI Packet 종류 (1 byte indicator로 구분)
0x01  Command          Host → Controller  (제어 명령)
0x02  ACL Data         양방향              (사용자 데이터)
0x03  SCO Data         양방향              (오디오, classic)
0x04  Event            Controller → Host  (상태·완료 통지)
0x05  ISO Data         양방향              (LE Audio 5.2+)
```

### Command 패킷 포맷

```text
HCI Command Packet
┌────┬──────────┬───────┬─────────────────────┐
│0x01│ OpCode   │ Param │  Parameters         │
│    │  2 byte  │Total  │  (variable)         │
│    │          │Length │                     │
│    │          │ 1 byte│                     │
└────┴──────────┴───────┴─────────────────────┘

OpCode = OGF(6 bit) | OCF(10 bit)
  OGF = OpCode Group Field (명령 그룹)
  OCF = OpCode Command Field (그룹 내 번호)

OGF 종류
  0x01 Link Control
  0x02 Link Policy
  0x03 Controller & Baseband
  0x04 Informational Parameters
  0x05 Status Parameters
  0x06 Testing
  0x08 LE Controller  ← BLE 전용
  0x3F Vendor Specific

OpCode 합성: OpCode = (OGF << 10) | OCF
```

### 자주 보는 LE 명령 OpCode

```text
LE Set Advertising Parameters   OpCode 0x2006  (OGF=8, OCF=6)
LE Set Advertising Data         OpCode 0x2008
LE Set Advertise Enable         OpCode 0x200A
LE Set Scan Parameters          OpCode 0x200B
LE Set Scan Enable              OpCode 0x200C
LE Create Connection            OpCode 0x200D
LE Read Local P-256 Public Key  OpCode 0x2025  (LESC, 4.2+)
LE Set Phy                      OpCode 0x2032  (5.0+)
```

### Command Complete Event 예

`LE Set Advertise Enable`을 호출한 후의 trace입니다.

```text
Host → Controller
01 0A 20 01 01
│  │  │  │  └─ enable = 0x01 (on)
│  │  │  └──── parameter length = 1
│  │  └─────── OGF=8 OCF=0x00A → OpCode 0x200A
│  └────────── OpCode low byte
└───────────── HCI Command indicator

Controller → Host
04 0E 04 01 0A 20 00
│  │  │  │  │  │  └─ status = 0x00 (success)
│  │  │  │  │  └──── OpCode high byte
│  │  │  │  └─────── OpCode low byte
│  │  │  └────────── num HCI command packets allowed = 1
│  │  └───────────── parameter length = 4
│  └──────────────── event code 0x0E = Command Complete
└─────────────────── HCI Event indicator
```

### ACL Data 패킷

데이터는 *ACL (Asynchronous Connection-Less) packet*으로 흐릅니다.

```text
HCI ACL Data Packet
┌────┬──────────┬───────┬─────────────────────┐
│0x02│ Handle + │Data   │  L2CAP Data         │
│    │ Flags    │Total  │  (variable)         │
│    │  2 byte  │Length │                     │
│    │          │ 2 byte│                     │
└────┴──────────┴───────┴─────────────────────┘

Handle (12 bit) = 연결 식별자, BC_Flag(2) + PB_Flag(2) | Handle(12)
PB Flag (Packet Boundary): 0=continue, 1=start non-flush, 2=start flush
```

## L2CAP — 채널 다중화

L2CAP은 *Channel ID로 위쪽 프로토콜을 다중화*합니다. BLE 4.0에서는 *3개 고정 CID*가 메인입니다.

```text
LE L2CAP CID 매핑
0x0004  ATT (Attribute Protocol) — 모든 GATT 트래픽
0x0005  LE L2CAP Signaling
0x0006  LE Security Manager Protocol (SMP)
0x0040~0x007F  Dynamic CID (LE CoC, 4.1+)
```

### L2CAP Frame

```text
L2CAP Frame (B-Frame, 가장 흔한 형태)
┌──────────┬──────┬─────────────────┐
│ Length   │ CID  │  Information    │
│  2 byte  │ 2 B  │  (variable)     │
└──────────┴──────┴─────────────────┘
```

ATT 트래픽을 보면 거의 항상 *CID 0x0004*입니다.

```text
실제 패킷 예 (ATT Read Request)
ACL Header     02 41 00 09 00
L2CAP Header   05 00 04 00         ← length=5, CID=0x0004 (ATT)
ATT Payload    0A 13 00            ← OpCode 0x0A (Read Request), handle=0x0013
              └ 0A = Read Request
              └ 13 00 = handle 0x0013 (little-endian)
```

## ATT — Attribute Protocol

ATT는 *원시 read/write 연산*만 제공합니다. *모든 GATT 트래픽이 ATT PDU*입니다.

### ATT PDU 포맷

```text
ATT PDU
┌──────┬──────────────────┬────────────┐
│OpCode│ Attribute Params │ Signature  │
│ 1 B  │   (variable)     │ optional   │
└──────┴──────────────────┴────────────┘

OpCode bit 구조
  bit 7: command flag (1 = no response expected)
  bit 6: authentication signature flag
  bits 5..0: method
```

### 자주 보는 ATT OpCode

```text
0x01  Error Response
0x02  Exchange MTU Request
0x03  Exchange MTU Response
0x04  Find Information Request
0x05  Find Information Response
0x06  Find By Type Value Request
0x08  Read By Type Request
0x09  Read By Type Response
0x0A  Read Request
0x0B  Read Response
0x0C  Read Blob Request
0x10  Read By Group Type Request   ← service discovery 시작
0x11  Read By Group Type Response
0x12  Write Request
0x13  Write Response
0x16  Prepare Write Request
0x18  Execute Write Request
0x1B  Handle Value Notification    ← server → client, 응답 없음
0x1D  Handle Value Indication      ← server → client, 응답 필요
0x1E  Handle Value Confirmation
0x52  Write Command (no response)
```

### Read Request/Response 예

```text
Client → Server (Read handle 0x002A의 값)
0A 2A 00
│  └──┴── handle 0x002A
└──────── Read Request

Server → Client (값 = 65)
0B 41
│  └── value (1 byte: 0x41 = 65)
└───── Read Response
```

ATT는 *반드시 request/response 쌍*입니다(notify/indicate 제외). 한 번에 *하나의 트랜잭션*만 진행됩니다.

## GATT — 사용자 인터페이스

GATT는 *ATT 위에 모델을 얹습니다*. *Service → Characteristic → Descriptor* 구조와 *각 요소의 역할*을 정합니다. 5장에서 자세히 다룹니다.

GATT는 *ATT를 그대로 사용*합니다. *별도 PDU가 없습니다*. 예를 들어 *Service Discovery*는 *ATT Read By Group Type Request (OpCode 0x10)*를 *Type=0x2800 (Primary Service)*로 호출하는 것입니다.

## SMP — Security Manager

SMP는 *pairing과 key 분배*를 다룹니다. CID 0x0006으로 흐릅니다. 7장에서 자세히 봅니다.

```text
주요 SMP OpCode
0x01  Pairing Request
0x02  Pairing Response
0x03  Pairing Confirm
0x04  Pairing Random
0x05  Pairing Failed
0x0C  Pairing Public Key  ← LESC (4.2+)
0x0D  Pairing DHKey Check
```

## GAP — 디바이스 정체성과 절차

GAP은 *프로토콜이 아니라 정책*입니다. *내가 어떤 디바이스이고, 어떻게 발견되고, 어떻게 연결하는지*를 정합니다. 4장에서 자세히 봅니다.

GAP은 *모든 계층을 가로질러* 동작합니다. *LL의 advertising 상태*, *L2CAP의 채널 선택*, *SMP의 pairing 정책*, *GATT의 Generic Access Service*가 모두 GAP의 일부입니다.

## Single-chip vs Dual-chip

HCI 분리선 덕분에 *두 가지 구현 방식*이 가능합니다.

### Single-chip

```text
┌──────────────────────────────────┐
│  Application                     │
├──────────────────────────────────┤
│  Host (L2CAP, ATT, GATT, ...)    │
├──────────────────────────────────┤
│  HCI (메모리 호출, software API) │
├──────────────────────────────────┤
│  Controller (LL, PHY)            │
├──────────────────────────────────┤
│  Hardware (2.4 GHz radio)        │
└──────────────────────────────────┘
              모두 한 칩
```

대표 칩: *Nordic nRF52840, ESP32-C3, TI CC2640, NXP KW36*. Host와 Controller가 *같은 메모리에서 함수 호출*로 통신합니다. HCI는 *논리적으로만* 존재합니다.

### Dual-chip (HCI over UART)

```text
┌──────────────────────┐
│  Application         │
├──────────────────────┤
│  Host (Linux BlueZ)  │
└──────┬───────────────┘
       │ HCI over UART (115200~3M baud)
       │ 또는 USB (Bluetooth HID transport)
┌──────┴───────────────┐
│  Controller chip     │
│  (CYW20706, BCM4343, │
│   nRF52840 + Zephyr  │
│   HCI controller fw) │
└──────────────────────┘
```

대표 구성: *Raspberry Pi 내장 BCM43438*, *USB Bluetooth dongle*, *Linux 서버 + BLE 모듈*. Host는 *Linux의 BlueZ 또는 Zephyr*, Controller는 *별도 칩*. HCI 패킷이 *실제로 UART/USB를 흐릅니다*.

```bash
# Linux에서 raw HCI 트래픽 보기
sudo btmon                    # btmon: HCI 모니터
sudo hcidump -X              # 구식 dump tool
sudo hcitool lescan          # advertise 패킷 보기
sudo hciconfig hci0 -a       # 컨트롤러 정보
```

### 비교

| 항목 | Single-chip | Dual-chip |
|------|-------------|-----------|
| 부품 수 | 1 | 2 |
| BOM 비용 | 낮음 | 높음 |
| 전력 | 매우 낮음 | UART/USB로 더 소비 |
| Host 자유도 | 펌웨어에 묶임 | Linux 등 OS 자유 |
| 응용 | IoT 센서, 웨어러블 | 게이트웨이, 임베디드 PC |

ESP-IDF의 NimBLE은 *Single-chip 모드와 Dual-chip 모드 양쪽*을 지원합니다. ESP32 자체로 동작시키면 single-chip, *ESP32를 BLE controller로 두고 Linux host*에 UART로 붙이는 구성도 가능합니다.

## Linux HCI 트레이스 — 실제 예

```bash
# Bluetooth Sniffer 켜기
sudo btmon

# 다른 터미널에서
sudo bluetoothctl
[bluetooth]# scan on
```

btmon이 출력하는 한 줄 예입니다.

```text
< HCI Command: LE Set Scan Enable (0x08|0x000c) plen 2
        Scanning: Enabled (0x01)
        Filter duplicates: Enabled (0x01)
> HCI Event: Command Complete (0x0e) plen 4
      LE Set Scan Enable (0x08|0x000c) ncmd 1
        Status: Success (0x00)
> HCI Event: LE Meta Event (0x3e) plen 41
      LE Advertising Report (0x02)
        Num reports: 1
        Event type: Connectable undirected - ADV_IND (0x00)
        Address type: Random (0x01)
        Address: 6F:23:88:E5:AA:B1 (Resolvable)
        Data length: 29
        Flags: 0x06
          LE General Discoverable Mode
          BR/EDR Not Supported
        Complete Local Name: My ESP32-C3
        TX power: 9 dBm
        RSSI: -45 dBm (0xd3)
```

각 줄이 *어느 계층의 어떤 메시지*인지 표시됩니다. *HCI Command → Command Complete*의 *비동기 응답 구조*, *LE Advertising Report*가 *어떻게 광고를 노출*하는지 모두 보입니다.

## 패킷이 위→아래로 흐르는 예

GATT *Read Request*가 사용자 앱에서 무선까지 흘러가는 과정입니다.

```text
1. Application
   "Battery Level characteristic을 읽어와"

2. GATT layer
   handle 0x002A이 Battery Level이라고 캐시에서 확인
   → ATT Read Request (handle=0x002A)

3. ATT layer
   ATT PDU = [0A 2A 00]  (OpCode 0x0A + handle little-endian)

4. L2CAP layer
   Frame = [03 00 04 00][0A 2A 00]
   length=3, CID=0x0004 (ATT)

5. HCI layer (dual-chip이면 UART로 송신)
   ACL Header = [01 00 07 00][03 00 04 00][0A 2A 00]
   handle=0x0001, total length=7

6. Link Layer
   LL Data PDU 만들기, 다음 connection event 슬롯에 큐잉

7. PHY
   다음 CE 시작 시각에 채널 호핑 후 GFSK 변조하여 전송
```

응답은 *반대 방향*으로 흘러옵니다. 같은 connection event 안에서 *Master가 ATT Read Request 송신 → Slave가 ATT Read Response 응답*까지 끝낼 수 있습니다.

## 자주 하는 실수

| 실수 | 바로잡기 |
|------|----------|
| HCI를 OS 레벨에서만 본다고 가정 | Single-chip도 내부에 HCI 논리 존재 |
| OpCode를 OGF+OCF 분리 안 하고 hex만 외움 | (OpCode >> 10)으로 OGF 확인 습관 |
| ATT 트래픽이 CID 0x0001 (L2CAP)이라고 착각 | 0x0004가 ATT, 0x0001은 classic만 |
| notify와 indicate를 혼용 | notify는 응답 없음, indicate는 confirmation 필요 |
| LL Data PDU max payload를 27로 고정 | 4.2+는 DLE로 251까지 |
| single-chip에서 hciconfig 명령 시도 | 펌웨어 내부라 OS에서 직접 못 봄 |
| sniffer로 PHY 라이브 캡처를 기대 | sniffer는 LL 이상만, PHY raw는 라디오 분석기 필요 |

## 정리

- BLE 스택은 *7계층*이지만 *Controller(PHY+LL)와 Host(L2CAP 이상)*의 *두 묶음*으로 보는 것이 실용적입니다.
- 두 묶음 사이를 *HCI*가 연결합니다. *Single-chip*은 메모리 호출로, *Dual-chip*은 *UART/USB로* 실제 패킷이 흐릅니다.
- *PHY*는 *2.4 GHz × 40 채널*입니다. 광고는 *37/38/39*, 데이터는 *0~36*에서 호핑합니다.
- *LL*은 *5상태 기계*입니다. 패킷은 *Access Address + PDU + CRC* 구조이고, *광고는 0x8E89BED6 고정*입니다.
- *HCI 패킷*은 *Command/Event/ACL Data/ISO Data* 4종이고, OpCode는 *OGF(6) + OCF(10)*입니다.
- *L2CAP*은 *CID로 위쪽을 다중화*합니다. *0x0004 = ATT*, *0x0005 = LE Signaling*, *0x0006 = SMP*입니다.
- *ATT*는 *바이트 단위 read/write*만 제공합니다. *GATT*가 그 위에 *service/characteristic 모델*을 얹습니다.
- *Linux btmon*으로 *모든 HCI 트래픽*을 trace할 수 있고, *nRF Sniffer*는 *LL 이상 raw*를 캡처합니다. 디버깅의 1순위 도구입니다.

## 다음 편

[Ch 4: GAP — Generic Access Profile, 4가지 역할](/blog/embedded/wireless/getting-started-with-ble/chapter04-gap)에서 *디바이스 발견과 연결의 정책*인 GAP을 자세히 봅니다. *Broadcaster/Observer/Peripheral/Central 4역할*, *주소 종류 4가지*, *RPA로 privacy 지키는 법*, *advertising interval 선택*을 다룹니다.

## 관련 항목

- [Ch 2: BLE 표준 변천](/blog/embedded/wireless/getting-started-with-ble/chapter02-spec-evolution)
- [Ch 4: GAP](/blog/embedded/wireless/getting-started-with-ble/chapter04-gap)
- [Ch 5: GATT](/blog/embedded/wireless/getting-started-with-ble/chapter05-gatt)
- [Ch 12: Debugging](/blog/embedded/wireless/getting-started-with-ble/chapter12-debugging) — btmon, sniffer 자세히
- [ESP32-C3 Mastering Ch 8: BLE 5.0](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [원문 — Bluetooth Core Spec Vol 4 (HCI)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
- [원문 — BlueZ btmon documentation](https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/monitor)
