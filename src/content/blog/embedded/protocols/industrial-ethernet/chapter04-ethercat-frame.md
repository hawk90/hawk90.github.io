---
title: "EtherCAT 프레임 구조 분석 — Datagram·WKC·Address 모드"
slug: "embedded/protocols/industrial-ethernet/chapter04-ethercat-frame"
date: 2026-05-13T09:04:00
description: "EtherCAT frame이 standard Ethernet 위에 어떻게 얹히는가."
series: "Industrial Ethernet 심화"
seriesOrder: 4
tags: [ethercat, frame, datagram, wkc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 프레임은 표준 Ethernet 프레임 안에 *여러 개의 datagram*을 *체인*으로 담는다. 각 datagram에는 *명령·주소·데이터·WKC*가 있다."** WKC(Working Counter)가 *몇 개의 슬레이브가 정상 처리했는지*를 마스터에 알리는 일종의 응답 채널입니다.

EtherCAT은 표준 Ethernet 위에 *자기 EtherType*을 얹는 방식입니다. 위층의 TCP/IP를 거치지 않으므로 *L2 직접 통신*입니다. 그 안에 *datagram chain*이 들어 있고, 각 datagram이 하나의 명령을 표현합니다.

이 장은 EtherCAT 프레임의 *바이트 단위 구조*, 명령 코드의 의미, WKC의 사용법, 그리고 mailbox 프로토콜 다섯 종(CoE·SoE·FoE·EoE·AoE)을 정리합니다. 합성 frame과 parser를 옆에 두고 *직접 비트를 읽을 수 있는 수준*까지 다룹니다.

## Ethernet 프레임 안에 EtherCAT

![EtherCAT 프레임 — Ethernet II에서 시작하여 Payload가 EtherCAT Header + Datagram chain으로 확장되고, 각 datagram은 Cmd/Idx/Address/Len/IRQ/Data/WKC 구조](/images/blog/industrial-ethernet/diagrams/ch04-ethercat-frame.svg)

EtherType `0x88A4`가 EtherCAT의 시그니처입니다. Wireshark는 이 EtherType을 보고 *EtherCAT dissector*를 활성화합니다.

이 글은 untagged Ethernet II·MTU 1500 B·EtherCAT command type1을 다룹니다. [SOEM v1.4.0 타입 정의](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercattype.h)와 [datagram 생성 코드](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatbase.c)를 기준으로 합니다. EtherCAT header는 2 byte입니다.

```text
EtherCAT Header (2 byte, little-endian)
  bit 15-12: Type (0x1 = EtherCAT command, 일반)
  bit 11   : Reserved
  bit 10-0 : Length (datagram chain 전체 byte 수)
```

Type=0x1이 대부분입니다. Type=0x4는 *Network Variables*, Type=0x5는 *Mailbox*용 별도 표시입니다.

## Datagram 구조

Datagram 필드 의미:

- **Cmd** (1B): 명령 코드 (다음 표)
- **Idx** (1B): 마스터가 응답 매칭에 쓰는 ID
- **Address** (4B): 명령에 따라 의미가 다름
- **Len** (11b): data 길이 (최대 1486 byte)
- **Len/Flags**의 bit15: M(more datagrams). 마지막 datagram은 0입니다.
- **IRQ** (16b): interrupt 정보. M bit와 다른 필드입니다.
- **WKC** (2B): 성공한 접근의 명령별 가중 증가량을 누적하는 카운터

## 명령 코드 — 핵심 표

EtherCAT 명령 코드는 *주소 모드*와 *동작*의 조합입니다.

| Cmd | 이름 | 주소 모드 | 동작 |
|---|---|---|---|
| 0x00 | NOP | - | 아무것도 안 함 |
| 0x01 | APRD | Auto Increment | Read |
| 0x02 | APWR | Auto Increment | Write |
| 0x03 | APRW | Auto Increment | Read+Write |
| 0x04 | FPRD | Configured address | Read |
| 0x05 | FPWR | Configured address | Write |
| 0x06 | FPRW | Configured address | Read+Write |
| 0x07 | BRD | Broadcast | Read |
| 0x08 | BWR | Broadcast | Write |
| 0x09 | BRW | Broadcast | Read+Write |
| 0x0A | LRD | Logical | Read |
| 0x0B | LWR | Logical | Write |
| 0x0C | LRW | Logical | Read+Write |
| 0x0D | ARMW | Auto Increment | Read Multiple Write |
| 0x0E | FRMW | Configured address | Read Multiple Write |

핵심 패턴은 네 가지입니다.

- **AP (Auto-increment Position)**: 슬레이브가 자기 *position counter*(상류로부터 몇 번째)로 식별. 초기화·재구성에 사용.
- **FP (Fixed Position)**: ESC의 *configured station address*로 식별. 정상 동작 중 개별 슬레이브 접근.
- **L (Logical)**: FMMU 매핑을 통한 *논리 주소* 접근. process data 전송에 사용.
- **B (Broadcast)**: 모든 슬레이브에 한 번에. DC 시각 latch 등.

**LRW(0x0C)**는 logical 영역의 읽기와 쓰기를 한 datagram에 묶는 명령입니다. 실제 master는 mapping·장치 지원·segment 크기에 따라 LRW 여러 개 또는 LRD/LWR를 사용합니다.

주기 process data 전송의 대표 패턴은 `LRW logical 0x10000~0x101FF`에 512 byte를 실어 보내는 것입니다. 이 한 명령으로 슬레이브들이 input을 읽어 들이는 동시에 output을 가져갑니다. 하나의 datagram으로 다룰 수 있는지는 mapping과 frame 길이·master 구현을 확인해야 하며, 이 설명만으로 특정 cycle 완료가 보장되지는 않습니다.

## Working Counter (WKC) — 응답 채널

WKC는 *datagram 끝의 2 byte 카운터*입니다. 마스터가 *0*으로 전송합니다. 슬레이브들이 *데이터를 처리할 때마다 정해진 양만큼 증가*시킵니다.

| 명령 | 슬레이브가 증가시키는 양 |
|------|-----------------------|
| Read 성공 | +1 |
| Write 성공 | +1 |
| Read+Write 성공 | +1 (read) + +2 (write) = +3 |
| 처리 실패 | 0 (증가하지 않음) |

마스터가 *기대 WKC*를 계산해 두고, 응답 frame의 WKC와 비교합니다. 예를 들어 16개 슬레이브가 모두 4 byte를 R/W하는 LRW라면 기대 WKC는 16 × 3 = 48입니다.

- 기대 48에 응답 45면 가중 증가량이 3 부족합니다. 한 장치의 read+write 실패일 수도 있고 여러 접근 실패의 조합일 수도 있어 실패 장치 수를 알 수 없습니다.
- WKC=0은 성공으로 집계된 접근이 없다는 뜻입니다. 주소·mapping·상태·frame 손실 등을 구별해야 하며 cable break만을 뜻하지 않습니다.

WKC는 *어느 슬레이브*가 실패했는지 알려 주지 *않습니다*. 성공 접근의 가중 합만 알려 줍니다. 어느 슬레이브가 문제인지 찾으려면 *개별 FPRD*로 polling해야 합니다.

## 합성 frame을 바이트로 읽기

아래는 실제 NIC capture가 아닌 **44-byte 합성 송신 frame**입니다. Ethernet padding·preamble·IFG·FCS는 포함하지 않았습니다. 논리 주소0x10, data16 byte, WKC0인 LRW 하나를 담았습니다. 운영망에 송신하는 예제가 아닙니다.

```text
ff ff ff ff ff ff 02 00 00 00 00 01 88 a4 1c 10
0c 01 10 00 00 00 10 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00
```

| offset | 필드 | 해석 |
|---|---|---|
| 0x0C | EtherType | 88 a4 (network order) |
| 0x0E | EtherCAT header | 1c 10 →0x101c, type1·chain28 B |
| 0x10 | Cmd / Idx | 0x0C LRW / 1 |
| 0x12 | Logical address | 10 00 00 00 →0x10 |
| 0x16 | Len/Flags | 10 00 →16 B·M0 |
| 0x18 | IRQ | 0 |
| 0x1A | Data | 16 B |
| 0x2A | WKC | 0 (송신 시) |

실제 capture에서는 `tcpdump -XX`처럼 Ethernet header 포함 여부를 확인해야 합니다. FCS 보존 여부·VLAN·offload 설정에 따라 offset과 보이는 byte 수가 달라질 수 있습니다. 이 예의 WKC가 실제 망에서 48로 바뀐다고 가정하지 않습니다.

다음 Node.js parser는 이 글의 **untagged·type1·1500 B payload 범위**를 검사합니다. VLAN·FCS·명령의 application 의미와 slave 상태를 검증하는 도구는 아닙니다.

```js title="ethercat-frame-parser.mjs"
export function parseEtherCAT(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 16 || frame.readUInt16BE(12) !== 0x88a4)
    throw new RangeError('untagged EtherCAT frame required');
  const header = frame.readUInt16LE(14), end = 16 + (header & 0x7ff);
  if ((header >>> 12) !== 1 || (header & 0x800) || end > frame.length || end > 1514)
    throw new RangeError('invalid EtherCAT header or length');
  const datagrams = [];
  let offset = 16;
  while (offset < end) {
    if (end-offset < 12) throw new RangeError('short datagram');
    const flags = frame.readUInt16LE(offset+6), length = flags & 0x7ff;
    const next = offset + 12 + length, more = Boolean(flags & 0x8000);
    if ((flags & 0x3800) || next > end || more !== (next < end))
      throw new RangeError('invalid datagram chain');
    datagrams.push({command:frame[offset], index:frame[offset+1],
      address:frame.readUInt32LE(offset+2), length, more,
      irq:frame.readUInt16LE(offset+8),
      data:Buffer.from(frame.subarray(offset+10,offset+10+length)),
      wkc:frame.readUInt16LE(offset+10+length)});
    offset = next;
  }
  if (!datagrams.length) throw new RangeError('empty command chain');
  return datagrams;
}
```

M은 각 datagram의 Len/Flags bit15이며, 다음 datagram은 이전 WKC 뒤에서 시작합니다. Parser는 이 연결과 선언 길이를 검사하고 data를 복사해 반환합니다. 뒤에 붙은 padding은 EtherCAT chain에 포함하지 않습니다.

## Logical Addressing — FMMU의 역할

`LRW`/`LRD`/`LWR` 명령은 *논리 주소*를 사용합니다. 32 bit이라 *4 GB 논리 공간*입니다. 실제로는 작은 영역(수 KB)만 씁니다.

마스터의 process image:

```text
Logical address space (예: 64 slave × 평균 8 byte input + 8 byte output)
  0x00000000 - 0x000001FF  : input PDO area  (512 byte)
  0x00000200 - 0x000003FF  : output PDO area (512 byte)
```

각 슬레이브의 FMMU 0번이 *input 영역*의 자기 슬롯을, FMMU 1번이 *output 영역*의 자기 슬롯을 *DPRAM 주소*로 매핑합니다.

**Slave 1 FMMU 설정:**

- FMMU 0: logical 0x00000000~0x00000003 → DPRAM 0x1000 (input, read)
- FMMU 1: logical 0x00000200~0x00000203 → DPRAM 0x1010 (output, write)

**Slave 2 FMMU 설정:**

- FMMU 0: logical 0x00000004~0x0000000B → DPRAM 0x1000 (input, read)
- FMMU 1: logical 0x00000204~0x0000020B → DPRAM 0x1010 (output, write)

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

**CoE**는 CANopen 객체 접근을 EtherCAT mailbox에 싣는 방식입니다. CANopen의 *object dictionary*를 그대로 가져옵니다. 16 bit *index* + 8 bit *subindex*로 객체를 식별합니다.

| index | CiA402 객체의 예 |
|---|---|
| 0x6040 | Controlword (16-bit) |
| 0x6041 | Statusword |
| 0x607A | Target Position |
| 0x6064 | Position Actual Value |
| 0x60FF | Target Velocity |
| 0x6071 | Target Torque |

CoE SDO는 지원 mailbox 상태에서 사용합니다. CiA402 Controlword는 16-bit이고, 0x0F 한 번으로 모든 상태의 drive가 Operation Enabled로 간다는 보장은 없습니다. Statusword·fault·mode·상태 전이와 실제 구동기 조건을 확인해야 합니다.

### CoE 통신 — Hex 예

[SOEM의 `ec_mbxheadert`·SDO 구성](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatcoe.c)에서 mailbox header는 **6 B**입니다. 아래는 0x607A:00에 4-byte 값1000을 쓰는 expedited download request의 **합성 mailbox payload**이며 실제 drive에 명령을 실행한 결과가 아닙니다.

```text
0a 00 00 00 00 13 00 20 23 7a 60 00 e8 03 00 00
```

처음6 B의 Length=10은 header를 제외한 길이입니다. 0x13은 type3(CoE)·counter1이고, CoE header 00 20 다음의 0x23·7a60·00·e8030000은 command·index·subindex·4-byte data입니다. 요청을 구성한 것만으로 drive의 상태 전이나 실제 위치 변경이 검증되지는 않습니다.

ASCII로 보면 사람이 즉시 알아보기 어렵지만, Wireshark의 EtherCAT/CoE dissector가 이걸 잘 풀어 줍니다.

### FoE — 펌웨어 업로드

FoE는 EtherCAT mailbox에서 파일을 전송합니다. Bootstrap은 장치가 지원하는 update 경로의 하나이며, `ec_FOEwrite()`가 상태 전이·reset·image 검증까지 자동 처리하지는 않습니다.

[SOEM v1.4.0 `ethercatfoe.c`](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatfoe.c)는 mailbox 크기와 header를 고려해 segment를 나누고 packet number·ACK·timeout을 처리합니다. 고정1024-byte chunk나 별도 EOF flag를 가정하지 않습니다. 최대 segment보다 짧은 마지막 DATA로 종료하며, 파일 크기가 segment의 정확한 배수이면 마지막 zero-length DATA가 필요합니다. 실제 update는 장치의 상태·파일 형식·권한·복구 절차를 따라야 하며 여기서는 실행하지 않습니다.

### EoE — 보조 IP 채널

EoE는 EtherCAT 망 위에 *TCP/IP 패킷*을 *터널링*합니다. 슬레이브에 *웹 인터페이스*를 띄울 때 흔히 씁니다. mailbox 경로를 사용하지만 같은 링크와 host 시간을 소비합니다. 주기 process data에 영향을 주지 않으려면 master의 bandwidth·queue·scheduling budget을 검증해야 합니다.

성능은 일반 IP에 한참 못 미칩니다. 진단·설정 용도이지 *데이터 전송 메인 채널*이 아닙니다.

## 자주 하는 실수

### "WKC가 기대값이면 모든 게 정상이다"

대부분 그렇지만, *FMMU 매핑이 잘못된 경우*에도 WKC는 증가합니다. 슬레이브가 *엉뚱한 비트*를 R/W하면서도 *명령 자체는 성공*한 것으로 처리합니다. WKC는 *통신*은 보장하지만 *의미*는 보장하지 않습니다. process image와 실제 데이터의 *내용*을 별도로 확인해야 합니다.

### "LRW 한 번이면 모든 슬레이브의 모든 데이터를 다 본다"

FMMU에 *매핑된 영역만* 다룹니다. 매핑 안 된 슬레이브 레지스터는 LRW로 못 봅니다. *비매핑 레지스터*(예: AL Status, error counter)는 FPRD로 *개별 polling*해야 합니다.

### "Mailbox는 process data와 같은 cycle에서 처리된다"

mailbox는 *별도 Sync Manager*(SM0/SM1)를 씁니다. process data는 SM2/SM3. *동시에* 흐를 수 있지만 *cycle 안에서 우선순위가 낮습니다*. SM 분리가 링크 대역폭과 host 실행 시간을 무한히 분리해 주지는 않습니다.

### "EtherType 0x88A4 패킷이 라우터를 통과한다"

L2 EtherType은 *라우터를 못 넘습니다*. EtherCAT은 *동일 broadcast 도메인* 안에서만 동작합니다. 망 분리가 필요하면 *EtherCAT bridge* 슬레이브로 별도 segment를 만들거나, EoE 위로 IP 패킷을 *터널링*하는 방법을 씁니다.

### "Datagram 길이는 무한정 길게 된다"

Ethernet MTU가 1500 byte. EtherCAT header 2 byte + datagram header10 B + WKC2 B, 합계12 B이므로 *한 datagram의 data는 최대 1486 byte*입니다. 한 frame에 *여러 datagram*을 chain할 수는 있어도, 한 datagram이 jumbo frame처럼 길어지지는 않습니다.

## 정리

- EtherCAT 프레임은 EtherType `0x88A4`로 표준 Ethernet 위에 직접 얹힙니다.
- EtherCAT header(2 byte) 다음에 *여러 datagram*이 체인으로 옵니다.
- 명령 코드는 *주소 모드 (AP·FP·L·B)*와 *동작(R·W·RW)*의 조합입니다. 핵심은 LRW(0x0C), LRD(0x0A), LWR(0x0B), BRD(0x07), BWR(0x08)입니다.
- WKC는 명령별 성공 접근의 가중 증가량을 누적합니다. 기대값과 비교해 *통신 건전성*을 판별합니다.
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
