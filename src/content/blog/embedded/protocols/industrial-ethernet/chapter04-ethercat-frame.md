---
title: "Ch 4: EtherCAT 프레임 — Datagram·WKC"
date: 2026-05-16T04:00:00
description: "EtherCAT frame이 standard Ethernet 위에 어떻게 얹히는가."
series: "Industrial Ethernet 심화"
seriesOrder: 4
tags: [ethercat, frame, datagram, wkc]
draft: false
---

## 한 줄 요약

> **"EtherCAT 프레임은 표준 Ethernet 프레임 안에 *여러 개의 datagram*을 *체인*으로 담는다. 각 datagram에는 *명령·주소·데이터·WKC*가 있다."** WKC(Working Counter)가 *몇 개의 슬레이브가 정상 처리했는지*를 마스터에 알리는 일종의 응답 채널입니다.

EtherCAT은 표준 Ethernet 위에 *자기 EtherType*을 얹는 방식입니다. 위층의 TCP/IP를 거치지 않으므로 *L2 직접 통신*입니다. 그 안에 *datagram chain*이 들어 있고, 각 datagram이 하나의 명령을 표현합니다.

이 장은 EtherCAT 프레임의 *바이트 단위 구조*, 명령 코드의 의미, WKC의 사용법, 그리고 mailbox 프로토콜 다섯 종(CoE·SoE·FoE·EoE·AoE)을 정리합니다. Wireshark dump를 옆에 두고 *직접 비트를 읽을 수 있는 수준*까지 다룹니다.

## Ethernet 프레임 안에 EtherCAT

```text
표준 Ethernet 프레임 (Ethernet II)
  ┌─────────┬──────────┬─────────┬────────────────────┬─────┐
  │ DA (6B) │ SA (6B)  │EtherType│      Payload       │ FCS │
  └─────────┴──────────┴─────────┴────────────────────┴─────┘
                            ↑
                       0x88A4 = EtherCAT
                       
EtherCAT Payload 구조
  ┌──────────────┬──────────┬──────────┬─────┬──────────┐
  │ EtherCAT Hdr │Datagram 1│Datagram 2│ ... │Datagram N│
  │   (2 byte)   │          │          │     │          │
  └──────────────┴──────────┴──────────┴─────┴──────────┘
```

EtherType `0x88A4`가 EtherCAT의 시그니처입니다. Wireshark는 이 EtherType을 보고 *EtherCAT dissector*를 활성화합니다.

EtherCAT header는 단 2 byte입니다.

```text
EtherCAT Header (2 byte, little-endian)
  bit 15-12: Type (0x1 = EtherCAT command, 일반)
  bit 11   : Reserved
  bit 10-0 : Length (datagram chain 전체 byte 수)
```

Type=0x1이 대부분입니다. Type=0x4는 *Network Variables*, Type=0x5는 *Mailbox*용 별도 표시입니다.

## Datagram 구조

```text
EtherCAT Datagram (12 byte header + data + 2 byte WKC)
  ┌────┬────┬─────────┬──────┬──────┬─────────┬─────────┬──────┐
  │Cmd │Idx │ Address │ Len  │ Rsv  │ IRQ Bit │  Data   │ WKC  │
  │1B  │1B  │  4B     │ 11b  │ 3b   │  16b    │ N byte  │ 2B   │
  └────┴────┴─────────┴──────┴──────┴─────────┴─────────┴──────┘
                                        ↑
                              0=마지막, 1=뒤에 datagram 더 있음

  Cmd: 명령 코드 (다음 표)
  Idx: 마스터가 응답 매칭에 쓰는 ID
  Address: 명령에 따라 의미가 다름
  Len: data 길이 (11 bit, 최대 1486 byte)
  WKC: 슬레이브들이 *각자 1씩 증가*시킨 카운터
```

## 명령 코드 — 핵심 표

EtherCAT 명령 코드는 *주소 모드*와 *동작*의 조합입니다.

| Cmd (hex) | 이름 | 주소 모드 | 동작 |
|-----------|------|---------|------|
| 0x00 | NOP | - | 아무것도 안 함 |
| 0x01 | APRD | Auto Increment Position | Read |
| 0x02 | APWR | Auto Increment Position | Write |
| 0x03 | APRW | Auto Increment Position | Read+Write |
| 0x04 | FPRD | Fixed Position | Read |
| 0x05 | BWR | Broadcast | Write (all slaves) |
| 0x07 | BRD | Broadcast | Read (all slaves) |
| 0x08 | LWR | Logical | Write |
| 0x09 | LRD | Logical (single direction일 수도) | Read |
| 0x0A | FPWR | Fixed Position | Write |
| 0x0B | FPRW | Fixed Position | Read+Write |
| 0x0C | LRW | Logical | Read+Write |
| 0x0D | ARMW | Auto Read Multiple Write | DC time 분배 |
| 0x0E | FRMW | Fixed Read Multiple Write | 동기 분배 |

핵심 패턴은 세 가지입니다.

- **AP (Auto-increment Position)**: 슬레이브가 자기 *position counter*(상류로부터 몇 번째)로 식별. 초기화·재구성에 사용.
- **FP (Fixed Position)**: ESC의 *configured station address*로 식별. 정상 동작 중 개별 슬레이브 접근.
- **L (Logical)**: FMMU 매핑을 통한 *논리 주소* 접근. process data 전송에 사용.
- **B (Broadcast)**: 모든 슬레이브에 한 번에. DC 시각 latch 등.

가장 *많이 보내는* 명령은 단연 **LRW (0x0C)**입니다. 모든 process data를 *한 명령*으로 read + write합니다.

```text
주기 process data 전송 (대표 패턴)
  LRW logical 0x10000~0x101FF, 512 byte
    → 슬레이브들이 input을 읽어 들이고 동시에 output을 가져간다
    → 한 datagram, 한 frame, 12.5 μs cycle
```

## Working Counter (WKC) — 응답 채널

WKC는 *datagram 끝의 2 byte 카운터*입니다. 마스터가 *0*으로 전송합니다. 슬레이브들이 *데이터를 처리할 때마다 정해진 양만큼 증가*시킵니다.

| 명령 | 슬레이브가 증가시키는 양 |
|------|-----------------------|
| Read 성공 | +1 |
| Write 성공 | +1 |
| Read+Write 성공 | +1 (read) + +2 (write) = +3 |
| 처리 실패 | 0 (증가하지 않음) |

마스터가 *기대 WKC*를 계산해 두고, 응답 frame의 WKC와 비교합니다.

```text
LRW 16 slave 모두 4 byte R/W → 기대 WKC = 16 × 3 = 48
응답 WKC가 45면 → 3개 slave가 정상 처리 못함
응답 WKC가 0이면 → 어떤 slave에도 안 닿음 (cable break, etc)
```

WKC는 *어느 슬레이브*가 실패했는지 알려 주지 *않습니다*. 단순히 *몇 개가 정상이었나*만 말합니다. 어느 슬레이브가 문제인지 찾으려면 *개별 FPRD*로 polling해야 합니다.

## Hex frame dump — 실제 패킷 읽기

`tcpdump -i eth0 ether proto 0x88a4 -X`로 캡처한 EtherCAT 프레임을 분석해 봅니다.

```text
0x0000:  ffff ffff ffff 0102 0304 0506 88a4   .............
0x0010:  1c10 0c01 0000 0010 0010 0000 1000   .............
0x0020:  0000 0000 0000 0000 0000 0000 0000   .............
0x0030:  0000 0000 0000 0000 0000 0000 0000   .............
         ...
         (FCS)

분해:
  [0x00] DA = ff:ff:ff:ff:ff:ff           ← broadcast
  [0x06] SA = 01:02:03:04:05:06            ← master NIC MAC
  [0x0C] EtherType = 0x88A4                ← EtherCAT
  [0x0E] EtherCAT Header = 0x101c          ← little-endian
         → length = 0x01c & 0x7FF = 0x01c = 28 byte
         → type   = 1 (command)
  [0x10] Datagram:
    [0x10] Cmd = 0x0c                       ← LRW
    [0x11] Idx = 0x01
    [0x12] Address = 0x00000010             ← logical 0x10
    [0x16] Len/Flags = 0x0010                ← length=16, M=0 (last)
    [0x18] IRQ = 0x0000
    [0x1A] Data = 16 byte zero
    [0x2A] WKC = 0x0000                     ← 마스터 전송 시 0
```

응답이 돌아오면 `WKC = 0x0030` (= 48 = 16 slave × 3) 으로 바뀌어 있을 겁니다.

여러 datagram이 *체인*되는 경우 `Len/Flags` 필드의 *M bit*(bit 15)가 1입니다. 마지막 datagram만 M=0입니다.

```text
한 frame에 4 datagram chain
  DG1: BWR 0x0900, len=8, M=1, ...    ← DC sync (broadcast write)
  DG2: BRD 0x0130, len=2, M=1, ...    ← AL Status 폴링
  DG3: LRW 0x0000, len=256, M=1, ...  ← 주기 process data
  DG4: FPRD 0x0001:0x0130, len=2, M=0, ...  ← 슬레이브 1 상태 확인
```

이런 *frame당 multi-datagram* 구조 덕분에 한 12.5 μs 사이클 안에 *여러 종류 작업*을 끼워 넣을 수 있습니다.

## Logical Addressing — FMMU의 역할

`LRW`/`LRD`/`LWR` 명령은 *논리 주소*를 사용합니다. 32 bit이라 *4 GB 논리 공간*입니다. 실제로는 작은 영역(수 KB)만 씁니다.

마스터의 process image:

```text
Logical address space (예: 64 slave × 평균 8 byte input + 8 byte output)
  0x00000000 - 0x000001FF  : input PDO area  (512 byte)
  0x00000200 - 0x000003FF  : output PDO area (512 byte)
```

각 슬레이브의 FMMU 0번이 *input 영역*의 자기 슬롯을, FMMU 1번이 *output 영역*의 자기 슬롯을 *DPRAM 주소*로 매핑합니다.

```text
Slave 1 FMMU 설정:
  FMMU 0: logical 0x00000000~0x00000003 → DPRAM 0x1000 (input, read)
  FMMU 1: logical 0x00000200~0x00000203 → DPRAM 0x1010 (output, write)

Slave 2 FMMU 설정:
  FMMU 0: logical 0x00000004~0x0000000B → DPRAM 0x1000 (input, read)
  FMMU 1: logical 0x00000204~0x0000020B → DPRAM 0x1010 (output, write)
```

마스터가 *LRW 0x00000000, len=1024*를 한 번 발행하면, 모든 슬레이브가 *자기 슬롯만* R/W합니다. 마스터 입장에서는 *연속된 1024 byte 메모리*를 다루는 것처럼 보입니다.

## Mailbox — CoE·SoE·FoE·EoE·AoE

주기 process data는 *작고 빠른* 데이터(위치·속도 등)입니다. *큰 비주기* 데이터(파라미터 설정, 펌웨어 업로드 등)는 *mailbox*로 보냅니다.

| 약자 | 풀네임 | 용도 | 기반 |
|------|--------|------|------|
| **CoE** | CANopen over EtherCAT | 일반 파라미터, SDO | CANopen object dictionary |
| **SoE** | Servo profile over EtherCAT | 서보 드라이브 전용 | SERCOS IDN |
| **FoE** | File over EtherCAT | 펌웨어/config 파일 | TFTP-like |
| **EoE** | Ethernet over EtherCAT | TCP/IP 터널링 | 표준 IP |
| **AoE** | ADS over EtherCAT | Beckhoff TwinCAT 통신 | Beckhoff 사유 |

가장 많이 쓰는 것은 단연 **CoE**입니다. CANopen의 *object dictionary*를 그대로 가져옵니다. 16 bit *index* + 8 bit *subindex*로 객체를 식별합니다.

```text
CANopen Object Dictionary 예 (서보 드라이브)
  0x6040 : Controlword              (4 bit 명령)
  0x6041 : Statusword               (slave 상태)
  0x607A : Target Position
  0x6064 : Position Actual Value
  0x60FF : Target Velocity
  0x6071 : Target Torque
```

CoE SDO(Service Data Object) 통신은 *Pre-Op 이후* 가능합니다. 마스터가 0x6040에 0x0F를 쓰면 슬레이브가 *Operation Enabled* 상태로 갑니다.

### CoE 통신 — Hex 예

```text
Master → Slave: SDO Download 0x607A (target position) = 1000
  Mailbox header (10 byte) + CoE header (2 byte) + SDO frame
  
  Mailbox:
    Length = 10
    Address = 0x0000 (slave가 자기 station address 사용)
    Channel = 0x00, Priority = 0x00
    Type = 0x03 (CoE)
    Counter = 0x01
    
  CoE Header:
    Number = 0x00
    Service = 2 (SDO Request)
    
  SDO:
    Cmd = 0x23 (Download Expedited, 4 byte data)
    Index = 0x607A (LE = 7A 60)
    Subindex = 0x00
    Data = 0x000003E8 (1000, LE = E8 03 00 00)
```

ASCII로 보면 사람이 즉시 알아보기 어렵지만, Wireshark의 EtherCAT/CoE dissector가 이걸 잘 풀어 줍니다.

### FoE — 펌웨어 업로드

`FoE`는 *TFTP를 EtherCAT 위로 옮긴 것*과 같습니다. *Bootstrap* 상태에서만 동작합니다. 슬레이브 firmware 업데이트의 표준 절차입니다.

```text
1. 마스터 → Pre-Op로 슬레이브 전이
2. 마스터 → Bootstrap으로 슬레이브 전이
3. FoE Write Request (filename, password)
4. FoE Data 패킷 반복 (1024 byte chunk)
5. FoE Data 마지막 (eof flag)
6. 슬레이브 → 자체 reset
7. Init으로 복귀
```

SOEM의 `ec_FOEwrite()` 함수가 이 시퀀스를 캡슐화합니다.

### EoE — 보조 IP 채널

EoE는 EtherCAT 망 위에 *TCP/IP 패킷*을 *터널링*합니다. 슬레이브에 *웹 인터페이스*를 띄울 때 흔히 씁니다. *실시간 process data와 분리된 별도 mailbox 채널*이므로 cycle에 영향을 주지 않습니다.

성능은 일반 IP에 한참 못 미칩니다. 진단·설정 용도이지 *데이터 전송 메인 채널*이 아닙니다.

## 자주 하는 실수

### "WKC가 기대값이면 모든 게 정상이다"

대부분 그렇지만, *FMMU 매핑이 잘못된 경우*에도 WKC는 증가합니다. 슬레이브가 *엉뚱한 비트*를 R/W하면서도 *명령 자체는 성공*한 것으로 처리합니다. WKC는 *통신*은 보장하지만 *의미*는 보장하지 않습니다. process image와 실제 데이터의 *내용*을 별도로 확인해야 합니다.

### "LRW 한 번이면 모든 슬레이브의 모든 데이터를 다 본다"

FMMU에 *매핑된 영역만* 다룹니다. 매핑 안 된 슬레이브 레지스터는 LRW로 못 봅니다. *비매핑 레지스터*(예: AL Status, error counter)는 FPRD로 *개별 polling*해야 합니다.

### "Mailbox는 process data와 같은 cycle에서 처리된다"

mailbox는 *별도 Sync Manager*(SM0/SM1)를 씁니다. process data는 SM2/SM3. *동시에* 흐를 수 있지만 *cycle 안에서 우선순위가 낮습니다*. 마스터가 mailbox에 큰 파일을 쓰는 동안에도 process data cycle은 *영향 없이* 흐릅니다.

### "EtherType 0x88A4 패킷이 라우터를 통과한다"

L2 EtherType은 *라우터를 못 넘습니다*. EtherCAT은 *동일 broadcast 도메인* 안에서만 동작합니다. 망 분리가 필요하면 *EtherCAT bridge* 슬레이브로 별도 segment를 만들거나, EoE 위로 IP 패킷을 *터널링*하는 방법을 씁니다.

### "Datagram 길이는 무한정 길게 된다"

Ethernet MTU가 1500 byte. EtherCAT header 2 byte + datagram overhead 14 byte이므로 *한 datagram의 data는 최대 1486 byte*입니다. 한 frame에 *여러 datagram*을 chain할 수는 있어도, 한 datagram이 jumbo frame처럼 길어지지는 않습니다.

## 정리

- EtherCAT 프레임은 EtherType `0x88A4`로 표준 Ethernet 위에 직접 얹힙니다.
- EtherCAT header(2 byte) 다음에 *여러 datagram*이 체인으로 옵니다.
- 명령 코드는 *주소 모드 (AP·FP·L·B)*와 *동작(R·W·RW)*의 조합입니다. 핵심은 LRW(0x0C), LRD(0x09), LWR(0x08), BRD(0x07), BWR(0x05)입니다.
- WKC는 *처리된 슬레이브 수*를 누적합니다. 기대값과 비교해 *통신 건전성*을 판별합니다.
- 논리 주소(LRW)는 FMMU를 통해 *각 슬레이브의 DPRAM 슬롯*으로 매핑됩니다.
- mailbox 프로토콜은 CoE(파라미터), SoE(서보), FoE(파일), EoE(IP 터널), AoE(Beckhoff) 다섯입니다.
- CoE는 CANopen object dictionary(0x6040, 0x6041, 0x607A 등)를 그대로 씁니다.
- WKC는 *통신 성공*만 보장하지 *의미 정확성*은 보장하지 *않습니다*.

다음 편은 **Ch 5: EtherCAT Master/Slave — SOEM·IgH**입니다. 오픈소스 master 구현 두 가지를 비교하고, 슬레이브 측 ESC chip 선택, ENI/ESI XML 파일의 구조를 풀어봅니다.

## 관련 항목

- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [원문 — Wireshark EtherCAT dissector](https://wiki.wireshark.org/EtherCAT)
- [원문 — CiA 402 servo profile](https://www.can-cia.org/can-knowledge/canopen/cia402/)
