---
title: "PROFINET IO 모델 — Controller·Device·Supervisor 역할 추적"
date: 2026-05-13T09:07:00
description: "PROFINET IO 통신 모델 — AR·CR·DCP·alarm·MRP redundancy까지 한 번에."
series: "Industrial Ethernet 심화"
seriesOrder: 7
tags: [profinet, profinet-io, dcp, rpc, mrp]
draft: false
---

## 한 줄 요약

> **"PROFINET IO는 *AR과 CR*이라는 두 단어로 거의 모든 것이 설명됩니다."** — Controller·Device·Supervisor 세 역할이 *AR(Application Relation)*로 연결되고, 그 안의 *CR(Communication Relation)*이 cyclic·acyclic·alarm을 나누어 나릅니다.

PROFINET을 처음 보면 약어가 너무 많습니다. AR, CR, IOCR, IODData, IODWrite, DCP, GSDML. 이 장은 그 약어들을 *Controller가 Device를 발견하고 → 이름을 주고 → 연결을 맺고 → 매 사이클 IO를 주고받는* 한 줄 흐름에 끼워 맞춰 정리합니다.

이전 장에서 다룬 RT·IRT는 *링크 계층의 시간 보장* 이야기였습니다. 이 장은 그 위에 올라가는 *애플리케이션 계층*입니다. Siemens S7-1500을 IO Controller로, ET 200SP를 IO Device로 두는 가장 흔한 구성을 기준으로 풀어 갑니다.

## 세 역할 — Controller, Device, Supervisor

PROFINET IO에는 세 가지 *device class*가 있습니다.

| 역할 | 약어 | 역할 | 대표 제품 |
|------|-----|------|----------|
| IO Controller | IOC | PLC. 사이클을 *주도*. | Siemens S7-1500, S7-1200 |
| IO Device | IOD | 원격 IO·드라이브·센서. Controller의 요청에 *응답*. | ET 200SP, ET 200MP, Sinamics |
| IO Supervisor | IOS | 엔지니어링·진단 PC. *설정과 모니터링*만. | TIA Portal, PRONETA |

Controller가 마스터이고 Device가 슬레이브에 해당합니다. Supervisor는 *연결을 끊었다 붙였다*만 하는 비상주 참여자입니다.

한 네트워크에 Controller가 여러 대 있어도 됩니다. *Shared device*라는 모드로 같은 Device를 두 Controller가 일부 슬롯씩 나눠 쓰는 것도 가능합니다. 다만 *같은 슬롯*은 한 Controller만 소유합니다.

## DCP — 이름과 IP를 정하는 첫 단계

새 Device를 네트워크에 꽂으면 *MAC 주소만* 가지고 있습니다. IP도 이름도 없습니다. *DCP(Discovery and Configuration Protocol)*가 그걸 채워 줍니다.

DCP는 *IP 위가 아니라 Ethernet 위*에서 동작합니다. EtherType `0x8892`(PROFINET RT)에 *frame type 0xFEFE*를 쓰는 multicast 프레임입니다. IP가 없는 Device에도 닿을 수 있도록 *링크 계층에서* 모든 일을 합니다.

흐름은 단순합니다.

![DCP 절차 — Supervisor가 multicast Identify로 Device를 발견하고, 이름과 IP를 부여하면 Device는 flash에 영구 저장](/images/blog/industrial-ethernet/diagrams/ch07-dcp-discovery-seq.svg)

이 절차가 끝나면 Device는 `io-device-01`이라는 이름과 IP를 *flash에 영구 저장*합니다. 다음 부팅부터는 같은 이름·IP로 올라옵니다.

Wireshark로 보면 다음과 같습니다.

```text
PROFINET-DCP, Identify All
  ServiceID: Identify (5)
  ServiceType: Request (0)
  DCP/Filter Block: Name of Station = ""
PROFINET-DCP, Identify Response
  ServiceID: Identify (5)
  ServiceType: Response (1)
  Name of Station: ""
  Device Properties: ET 200SP, IM 155-6 PN HF
  Device Role: IO-Device
```

*이름이 빈 문자열*인 Device는 *공장 출하 상태*거나 reset된 상태입니다. 이름이 한번 박히면 그 이름으로 Controller가 찾아옵니다. 이름이 같은 Device가 같은 망에 두 개 있으면 *둘 다 fault*가 됩니다.

## AR과 CR — 연결의 두 계층

이름과 IP가 정해진 Device를 Controller가 *연결*합니다. 이 연결이 *AR(Application Relation)*입니다.

AR은 Controller와 Device 사이의 *논리적 1:1 채널*입니다. 한 AR 안에 여러 *CR(Communication Relation)*이 들어갑니다.

| CR 종류 | 역할 | 주기 |
|---------|------|------|
| **IOCR** (Input/Output CR) | cyclic IO 데이터 전송 | 사이클마다 (예: 1ms) |
| **RecordDataCR** | acyclic read/write (parameter, diagnostic) | 요청 시 |
| **AlarmCR** | event 기반 alarm 전송 | 비주기 |

연결 수립은 *AR Establish*라는 RPC 호출로 시작합니다. Controller가 Device의 UDP 49152 포트로 *DCE-RPC*를 보냅니다.

![AR Establish — Controller가 RPC로 Device에 Connect, 파라미터 Write, DControl/CControl 핸드셰이크 후 cyclic IO 시작](/images/blog/industrial-ethernet/diagrams/ch07-ar-connect-seq.svg)

이 절차가 *모두 성공*해야 Device의 LED가 녹색이 됩니다. 어디서 멈추는지가 트러블슈팅의 절반입니다.

## IOCR — cyclic IO 프레임

IOCR이 실제 *공정 데이터*를 주고받습니다. Controller가 Device로 보내는 *output frame*과 Device가 Controller로 보내는 *input frame* 두 방향이 있습니다.

프레임은 EtherType `0x8892`, FrameID `0xC000~0xFAFF`(RT class 1) 범위를 씁니다. 사이클 주기는 *send clock × reduction ratio*로 계산합니다.

```text
send clock     = 31.25 µs (PROFINET 기본 단위)
reduction ratio = 32
cycle time      = 31.25 µs × 32 = 1 ms
```

ET 200SP 기본 사이클은 1ms입니다. IRT를 켜면 250µs까지 내려갑니다. 더 빠른 사이클이 필요한 모션은 *PROFIdrive over IRT*로 250µs·125µs까지 갑니다.

한 IOCR의 페이로드 구조는 다음과 같습니다.

```text
| FrameID | IOData (slot1) | IOData (slot2) | ... | APDU Status |
   2B         N bytes          N bytes              4B

APDU Status:
  CycleCounter (2B)  ← 매 사이클 증가
  DataStatus   (1B)  ← Valid / Provider state / Problem indicator
  TransferStatus (1B)
```

`CycleCounter`가 *연속*인지를 Device가 검증합니다. 두 사이클이 연속으로 빠지면 *connection lost*로 간주하고 Device가 *safe state*로 갑니다.

## RecordData — acyclic read·write

parameter 변경, diagnostic 읽기, identification은 cyclic 채널을 쓰지 않습니다. *RecordDataCR*이 별도 RPC로 처리합니다.

대표적 호출은 두 가지입니다.

```text
IODWrite (write parameter)
  AR UUID, API, Slot, Subslot, Index
  + record data
  → Device가 parameter를 적용 후 ACK

IODRead (read diagnostic / I&M)
  AR UUID, API, Slot, Subslot, Index
  ← record data
```

`Index`가 *무엇을 읽고 쓸지*를 결정합니다. PROFINET이 표준 index를 정의합니다.

| Index | 내용 |
|-------|------|
| `0xAFF0` | I&M 0 (Identification & Maintenance — vendor, order ID, serial) |
| `0xAFF1` | I&M 1 (function tag, location tag) |
| `0xAFF2~5` | I&M 2~5 (사용자 정의) |
| `0xC000~F7FF` | vendor specific |
| `0xE000~E0FF` | ExpectedSubmodule data |
| `0xE040` | Diagnostic data |

I&M 0를 읽으면 *어떤 Device가 무엇인지*가 한 번에 나옵니다. 공장 자산 관리 시스템이 매일 도는 작업이 IODRead 0xAFF0 sweep입니다.

## Alarm — 비주기 이벤트

`AlarmCR`은 Device가 *비동기로* Controller에 사건을 알리는 채널입니다. 두 우선순위가 있습니다.

| Alarm | 우선순위 | 용도 |
|-------|---------|------|
| **High Priority** | 0xC008 (FrameID) | process alarm — *공정상 즉시 대응* 필요 |
| **Low Priority** | 0xC009 | diagnostic alarm — 진단·예방 |

alarm은 *재전송 로직*이 따로 있습니다. Device가 보내면 Controller가 ACK를 보내야 합니다. ACK가 없으면 일정 시간 후 retry합니다.

전형적 alarm은 다음 같은 것입니다.

- *Diagnosis appears* — 채널 X에서 wire break 감지
- *Diagnosis disappears* — wire break 해소
- *Pull/Plug* — 모듈이 뽑히거나 새로 꽂힘
- *Return of submodule* — submodule이 다시 준비됨

TIA Portal에서 Device를 클릭하면 보이는 *진단 버퍼*가 사실상 이 alarm의 누적입니다.

## MRP — 매체 redundancy

PROFINET은 *링 토폴로지*에서 *MRP(Media Redundancy Protocol)*로 redundancy를 제공합니다. IEC 62439-2 표준입니다.

```text
   [MRM]
   /   \
  /     \
[MRC]   [MRC]
  \     /
   \   /
   [MRC]
```

링 안의 *한 노드*가 *MRM(Media Redundancy Manager)*입니다. 보통 Controller나 backbone 스위치가 맡습니다. 나머지는 *MRC(Client)*입니다.

평상시 MRM은 링의 *두 포트 중 한쪽을 blocking*합니다. 그러면 토폴로지가 *논리적 daisy-chain*이 됩니다. 어디선가 링이 끊어지면 MRM이 *blocking을 풀어* 새 경로로 트래픽을 흘립니다.

복구 시간은 200ms가 표준입니다. PROFINET은 *3사이클 missed*가 곧 fault이므로 *cycle ≥ 70ms*인 시스템에서만 MRP 단독으로 충분합니다. 더 빠른 사이클(예: 1ms)을 쓰는 시스템은 *MRPD(MRP Domain)*나 다중 링을 결합해야 합니다.

## Stack vendor — 누가 만든 코드인가

IO Device 펌웨어를 처음부터 짜는 일은 거의 없습니다. *PROFINET stack vendor*에서 라이센스해서 통합하는 게 표준입니다.

| 벤더 | 특징 | 타깃 |
|------|------|------|
| **Renesas** | R-IN 패밀리. ASIC + stack 일체화. | EtherCAT·PROFINET·EtherNet/IP 모두 |
| **HMS Industrial Networks** | Anybus / Ixxat. 외장 모듈 + chipset. | 빠른 통합 우선 |
| **TI Sitara AM6x** | PRU-ICSS로 PROFINET IRT 가능. | Linux + Cortex-R5F 듀얼 |
| **Hilscher** | netX 시리즈. multi-protocol. | OEM 외장 칩 |
| **Profichip** | TPS-1. PROFINET 전용. | 가격 우선 |

ET 200SP 같은 Siemens 제품 내부는 *Siemens 자체 ASIC + stack*입니다. 외부 ecosystem은 위 벤더들이 거의 다 메웁니다.

## GSDML — Device를 PLC에 등록하기

Controller가 어떤 Device를 *어떻게 다룰지* 알려면 *GSDML(General Station Description Markup Language)* 파일이 필요합니다. XML로 작성된 *Device의 capability 명세*입니다.

```xml
<DeviceProfile xmlns="http://www.profibus.com/GSDML/2003/11/DeviceProfile">
  <DeviceIdentity VendorID="0x002A" DeviceID="0x0301">
    <InfoText TextId="IDT_DEVICE_NAME"/>
    <VendorName Value="Siemens AG"/>
  </DeviceIdentity>
  <DeviceFunction>
    <Family MainFamily="I/O" ProductFamily="ET 200SP"/>
  </DeviceFunction>
  <ApplicationProcess>
    <DeviceAccessPointList>
      <DeviceAccessPointItem ID="DAP_1"
                             PhysicalSlots="0..64"
                             ModuleIdentNumber="0x00000060"
                             MinDeviceInterval="32">
        <!-- MinDeviceInterval × 31.25µs = 1 ms minimum cycle -->
      </DeviceAccessPointItem>
    </DeviceAccessPointList>
  </ApplicationProcess>
</DeviceProfile>
```

`MinDeviceInterval`이 1ms 이하를 허용하면 *send clock × reduction* 식으로 더 빠른 사이클을 설정할 수 있습니다. TIA Portal이 이 GSDML을 읽어 들여 *가능한 사이클 후보*를 메뉴에 띄웁니다.

GSDML 파일은 *vendor 웹사이트*에서 받습니다. Siemens는 SIOS 포털, Phoenix Contact는 Product list에 항상 첨부합니다.

## 자주 하는 실수

### "Device가 Identify 응답을 안 한다"

VLAN tag 문제가 가장 많습니다. PROFINET RT는 *priority tag(VLAN ID 0)*를 쓰지만, 일부 스위치는 *priority tag를 untagged로 보지 않습니다*. 스위치가 PROFINET-aware인지 확인하고, 아니면 *managed switch에서 VLAN 0를 명시적으로 허용*합니다.

### "이름은 박았는데 연결이 안 잡힌다"

*GSDML 버전*과 *Device 펌웨어 버전*이 어긋난 경우입니다. TIA에서 새 GSDML을 받아 *기존 GSDML을 제거하고* 다시 import합니다. 두 GSDML이 같은 vendor·device ID로 있으면 어떤 게 쓰일지 모릅니다.

### "1ms 사이클 설정이 메뉴에 안 보인다"

*Conformance Class*가 CC-C(IRT)인지 확인합니다. CC-A·CC-B는 *RT*만 지원하고 최소 사이클이 보통 4~8ms입니다. CC-C로 올려야 IRT 슬롯을 잡고 1ms·500µs·250µs가 메뉴에 나옵니다.

### "Shared Device가 일부 슬롯에서 fault"

같은 슬롯을 *두 Controller*가 owner로 잡은 경우입니다. PROFINET은 *한 슬롯 = 한 owner*만 허용합니다. TIA의 *Device view*에서 슬롯별 owner 색상이 다른지 확인합니다.

### "MRP를 켰는데 끊김 시 복구가 200ms보다 훨씬 오래"

링 위의 *모든 노드*가 MRC를 지원해야 합니다. 한 대라도 MRP-aware가 아니면 그 노드를 통과한 *학습된 MAC 테이블*이 flush되지 않아 복구가 길어집니다. 비-MRP 스위치를 *MRC*로 교체하거나, 그 구간을 링 밖으로 빼냅니다.

## 정리

- PROFINET IO의 세 역할은 *Controller·Device·Supervisor*입니다. PLC·원격 IO·엔지니어링 PC에 각각 대응합니다.
- *DCP*는 IP 없는 Device에 이름과 IP를 박는 *링크 계층 프로토콜*입니다.
- *AR*은 Controller·Device 사이의 논리적 채널이고, 그 안에 *IOCR·RecordDataCR·AlarmCR*이 들어갑니다.
- *IOCR*은 cyclic IO를 31.25µs × reduction으로 전송합니다. 1ms가 ET 200SP의 기본입니다.
- *IODWrite·IODRead*는 acyclic parameter·diagnostic 접근입니다. I&M 0는 자산관리의 표준 진입점입니다.
- *Alarm*은 비주기 이벤트입니다. high/low priority로 나뉘고 ACK 기반 retry가 있습니다.
- *MRP*는 링 토폴로지에 200ms redundancy를 추가합니다. 빠른 사이클에는 MRPD가 필요합니다.
- *GSDML*은 Device의 XML 명세이고, *Stack vendor*는 Renesas·HMS·TI·Hilscher가 주축입니다.

다음 편은 **Ch 8: TSN — 시간 민감 네트워킹의 표준화된 toolkit**입니다.

## 관련 항목

- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Ch 8: TSN — Time-Sensitive Networking](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [원문 — IEC 61158-6-10 (PROFINET application layer)](https://webstore.iec.ch/publication/61107)
