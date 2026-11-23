---
title: "POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜"
slug: "embedded/protocols/industrial-ethernet/chapter10-powerlink"
date: 2026-05-13T09:10:00
description: "openPOWERLINK V2.7.2를 Debian VM에서 빌드해 MN을 veth에 띄우고 SoA·SoC·ASnd 프레임과 50 ms 주기를 tshark로 확인한 뒤, 선로 시간 하한과 프로세스 이미지 API, openSAFETY의 책임 경계를 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 10
tags: [powerlink, opensafety, br-automation, black-channel]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **POWERLINK의 주기 통신과 openSAFETY의 안전 통신은 맡는 책임이 서로 다릅니다. 주기가 빠르거나 스택이 공개되어 있다는 사실이 안전 기능의 인증을 대신하지는 않습니다.**

POWERLINK는 MN(Managing Node)이 주기와 전송 기회를 관리하는 산업용 이더넷입니다. [Ch 2](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)에서 본 TDMA 방식으로, 회의 진행자가 발언 순서를 정해 한 사람씩 마이크를 넘기는 모습과 같습니다. MN이 진행자이고, CN(Controlled Node)은 자기 이름이 불릴 때만 말합니다.

이 장은 [openPOWERLINK V2.7.2](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/V2.7.2) 소스를 기준으로 프레임 형식과 API를 확인합니다. 그리고 Debian 12 VM(kernel 6.1.0-56-arm64)에서 스택과 MN demo를 빌드해 veth에 띄우고, 실제로 나가는 프레임을 tshark 4.0.17로 풉니다.

## MN과 CN: 기본 전송 순서

`stack/include/oplk/frame.h`의 `eMsgType`(133~140행)이 정의하는 메시지 종류입니다. 주석은 출처로 "EPSG DS 301 V1.2.0"을 적습니다.

| 메시지 | 값 | 역할 |
|---|---|---|
| SoC (Start of Cycle) | `0x01` | 주기 시작을 알림 |
| PReq (Poll Request) | `0x03` | MN이 대상 CN을 부르며 출력 데이터를 전달 |
| PRes (Poll Response) | `0x04` | CN이 입력 데이터를 응답 |
| SoA (Start of Asynchronous) | `0x05` | 비동기 구간을 열고 누가 보낼지 지정 |
| ASnd (Asynchronous Send) | `0x06` | 비동기 서비스 데이터(NMT 명령 등) |
| AMNI | `0x07` | Active Managing Node Indication |
| AInv | `0x0D` | Asynchronous Invite |

한 주기는 SoC로 시작해, CN마다 PReq/PRes를 한 번씩 주고받고, SoA로 비동기 구간을 엽니다. SoA의 RequestedServiceID와 Target 필드가 이번 비동기 구간에 누가 ASnd를 보낼지 지정합니다. 표의 AMNI는 MN 이중화용 메시지이고, 아래 캡처의 SoA에도 MN Redundancy 비트가 있습니다.

## 실제 프레임 — MN demo를 veth에 띄우기

openPOWERLINK는 Linux userspace에서 pcap으로 프레임을 주고받는 구성을 기본으로 빌드합니다. VM에서 스택(`stack/`)을 빌드한 뒤 `apps/demo_mn_console`을 빌드했습니다. 기본 구성은 `CFG_BUILD_KERNEL_STACK = "Link to Application"`이고(`apps/common/cmake/configure-linux.cmake` 32행, 생성된 CMakeCache에도 같은 값), 링크에는 `libpcap-dev`와 `libsystemd-dev`가 필요했습니다. `libsystemd-dev` 없이 빌드하면 마지막 링크에서 멈춥니다.

```text
[100%] Linking C executable demo_mn_console
/usr/bin/ld: cannot find -lsystemd: No such file or directory
collect2: error: ld returned 1 exit status
```

demo의 구성 파일은 저장소에 들어 있는 `apps/common/openCONFIGURATOR_projects/Demo_3CN/output/mnobd.cdc`입니다. 이 프로젝트는 CN 1·32·110 세 대를 정의하고, MN의 `NMT_CycleLen_U32`(0x1006)를 `0x0000C350`, 즉 50,000 μs로 둡니다(`deviceConfiguration/00000000_POWERLINK_CiA302-4_MN.xdc` 149행). CN 없이 MN만 veth0에 띄우고(`timeout 12 ./demo_mn_console -c mnobd.cdc -d veth0`), 다른 network namespace로 옮긴 veth1에서 tcpdump로 잡았습니다.

MN 로그는 NMT 상태를 차례로 지나 Operational까지 갑니다.

```text
NmtGsResetConfiguration->NmtMsNotActive Originating event:NmtEventEnterMsNotActive
NmtMsNotActive->NmtMsPreOperational1 Originating event:NmtEventTimerMsPreOp1
NmtMsPreOperational1->NmtMsPreOperational2 Originating event:NmtEventTimerMsPreOp2
NmtMsPreOperational2->NmtMsReadyToOperate Originating event:NmtEventEnterReadyToOperate
NmtMsReadyToOperate->NmtMsOperational Originating event:NmtEventEnterMsOperational
```

캡처 파일을 Python 표준 라이브러리만 쓰는 스크립트(`epl-pcap-stats.py`)로 세었습니다. EtherType 0x88AB 프레임 778개 중 SoC 198개, SoA 579개, ASnd 1개였고, 첫 프레임부터 마지막 프레임까지 10.41초였습니다. CN이 응답하지 않으니 PReq는 나가지 않았습니다. 첫 SoC 전 0.575초 동안은 SoA만 381개가 중앙값 0.719 ms 간격으로 나갔고(Pre-Operational 1), 그 사이에 ASnd 하나가 broadcast로 NMT ResetNode 명령을 보냈습니다.

```text
   16   3.449343 b6:34:d2:3c:85:75 → EPLv2_SoA    POWERLINK 54 240->255  SoA  (NO_SERVICE)->  0  F:EA=0,ER=0    NMT_MS_PRE_OPERATIONAL_1
   17   3.450125 b6:34:d2:3c:85:75 → EPLv2_SoA    POWERLINK 54 240->255  SoA  (NO_SERVICE)->  0  F:EA=0,ER=0    NMT_MS_PRE_OPERATIONAL_1
...
   26   3.456345 b6:34:d2:3c:85:75 → EPLv2_SoA    POWERLINK 54 240->255  SoA  (NMT_REQUEST_INV)->240  F:EA=0,ER=0    NMT_MS_PRE_OPERATIONAL_1
   27   3.456351 b6:34:d2:3c:85:75 → EPLv2_ASnd   POWERLINK 60 240->255  ASnd (NMT_COMMAND) NMTResetNode
...
  398   4.024071 b6:34:d2:3c:85:75 → EPLv2_SoC    POWERLINK 36 240->255 SoC
  400   4.058538 b6:34:d2:3c:85:75 → EPLv2_SoC    POWERLINK 36 240->255 SoC
...
```

목록의 시각은 tcpdump를 켠 순간부터 센 값이라, 앞 15개 프레임은 veth가 올라오며 커널이 보낸 IPv6 프레임입니다. SoC가 나오기 시작한 뒤 연속 SoC 197개 간격의 중앙값은 50.009 ms, 최소 32.944 ms, 최대 65.576 ms였습니다. 설정한 50 ms 주기를 중심으로 ±17 ms쯤 흔들린 셈입니다. 이 값은 pcap으로 보내는 userspace MN을 VM 안에서 돌린 결과라 장비의 POWERLINK 주기 정밀도와 비교할 수 없습니다.

SoC 프레임 하나를 tshark로 풀면 다음과 같습니다.

```text
Ethernet II, Src: b6:34:d2:3c:85:75 (b6:34:d2:3c:85:75), Dst: EPLv2_SoC (01:11:1e:00:00:01)
    Type: ETHERNET Powerlink v2 (0x88ab)
Ethernet POWERLINK
    .000 0001 = MessageType: Start of Cycle (SoC) (1)
    Destination: 255 (0xff) (broadcast)
    Source: 240 (0xf0) (Managing Node)
    Flags: 0x00
...
    NetTime: Nov 23, 2026 04:07:51.665558215 UTC
    RelativeTime: 0

0000  01 11 1e 00 00 01 b6 34 d2 3c 85 75 88 ab 01 ff   .......4.<.u....
0010  f0 00 00 00 17 bc 03 6b c7 9c ab 27 00 00 00 00   .......k...'....
0020  00 00 00 00                                       ....
```

목적지 MAC은 메시지 종류마다 다른 multicast 주소입니다. 캡처에서 SoC는 `01:11:1e:00:00:01`, SoA는 `01:11:1e:00:00:03`, ASnd는 `01:11:1e:00:00:04`였습니다. SoC는 NetTime(절대 시각)을 실어 CN이 시각을 맞출 수 있게 합니다. 프레임이 36 byte로 Ethernet 최소 길이보다 짧은 것은 스택이 SoC를 padding 없이 36 byte로 만들고(`oplkdefs.h` 126행 `C_DLL_MINSIZE_SOC`), veth가 padding을 붙이지 않기 때문입니다.

## NodeID와 기본 프레임

`stack/include/oplk/oplkdefs.h`(82~91행)의 주소 상수입니다.

| 상수 | 값 | 의미 |
|---|---|---|
| `C_ADR_INVALID` | `0x00` | 잘못된 주소 |
| `C_ADR_MN_DEF_NODE_ID` | `0xF0` (240) | MN 기본 주소 |
| `C_ADR_DIAG_DEF_NODE_ID` | `0xFD` | 진단 장치 기본 주소 |
| `C_ADR_RT1_DEF_NODE_ID` | `0xFE` | router type 1 기본 주소 |
| `C_ADR_BROADCAST` | `0xFF` | broadcast |
| `C_DLL_ETHERTYPE_EPL` | `0x88AB` | POWERLINK EtherType |

캡처의 "240->255"는 MN 기본 주소에서 broadcast로 보냈다는 뜻입니다. 같은 파일 93~95행은 비동기 payload 최대 1500 byte, Ethernet 프레임 최대 1514 byte·최소 60 byte(모두 FCS 제외)를 정의합니다.

`frame.h` 79~84행은 message type, destination NodeID, source NodeID의 offset을 각각 14, 15, 16으로 정의합니다. 다음 예제는 이 17 byte prefix만 읽습니다. 전체 프레임의 길이·payload·FCS는 검증하지 않습니다.

```js title="powerlink-basic-prefix.mjs"
export function decodeBasicPrefix(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 17) {
    throw new TypeError('at least 17 bytes required');
  }
  if (bytes[12] !== 0x88 || bytes[13] !== 0xab) {
    throw new RangeError('untagged POWERLINK EtherType required');
  }
  return {
    messageType: bytes[14],
    destinationNodeId: bytes[15],
    sourceNodeId: bytes[16],
  };
}
```

캡처한 SoC와 SoA 프레임의 앞 17 byte를 넣은 결과입니다(Node v24.22.3).

```text
{ messageType: 1, destinationNodeId: 255, sourceNodeId: 240 }
{ messageType: 5, destinationNodeId: 255, sourceNodeId: 240 }
```

## 최소 프레임으로 보는 선로 시간 하한

POWERLINK 주기가 얼마나 짧아질 수 있는지는 프레임 수와 링크 속도로 하한을 잡을 수 있습니다. 100 Mbit/s에서 FCS 포함 최소 MAC 프레임 64 B에 preamble/SFD 8 B와 IPG 12 B를 더하면 프레임마다 84 B, 즉 6.72 μs입니다. SoC·PReq·PRes·SoA를 모두 최소 길이로 두면 CN N대의 한 주기는 2N + 2 프레임입니다.

| CN 수 | 프레임 수 `2N + 2` | 선로 점유 시간 |
|---|---:|---:|
| 8 | 18 | 120.96 μs |
| 16 | 34 | 228.48 μs |
| 32 | 66 | 443.52 μs |

이 합계에는 ASnd, CN 응답 대기, 케이블·허브 지연, 처리 지연이 없습니다. 따라서 표는 선로만 본 하한입니다. 예를 들어 주기 200 μs가 목표라면, 32 CN은 이 하한만 봐도 들어가지 못합니다. 반대로 8 CN이 하한을 통과한다고 해서 실제로 200 μs 주기가 나온다는 보장은 없습니다. 다음 계산기가 같은 모델을 씁니다.

```js title="powerlink-wire-floor.mjs"
export function wireFloorNs(cnCount, linkBps = 100000000) {
  if (!Number.isSafeInteger(cnCount) || cnCount < 1 || cnCount > 239 ||
      !Number.isSafeInteger(linkBps) || linkBps <= 0) {
    throw new RangeError('CN count 1..239 and positive integer link rate required');
  }
  const bitsNs = BigInt(2 * cnCount + 2) * 84n * 8n * 1000000000n;
  const rate = BigInt(linkBps);
  return (bitsNs + rate - 1n) / rate;
}
```

```text
wireFloorNs(8) = 120960n
wireFloorNs(16) = 228480n
wireFloorNs(32) = 443520n
```

CN 수 상한 239는 MN 기본 주소 240(`0xF0`) 아래의 NodeID 범위에서 온 값입니다. NodeID 범위와 실제로 연결할 수 있는 CN 수는 별개입니다.

## openPOWERLINK의 실제 API로 읽기

V2.7.2 공개 API(`stack/include/oplk/oplk.h` 633~645행)에는 `oplk_readPdo`·`oplk_writePdo` 같은 PDO 단위 함수가 없습니다. 애플리케이션은 process image를 할당하고 object dictionary와 연결한 뒤 교환합니다.

| 단계 | 실제 API |
|---|---|
| 할당 | `oplk_allocProcessImage()` |
| 포인터 획득 | `oplk_getProcessImageIn()`, `oplk_getProcessImageOut()` |
| object 연결 | `oplk_linkProcessImageObject()` |
| 수신 이미지 반영 | `oplk_exchangeProcessImageOut()` |
| 송신 이미지 반영 | `oplk_exchangeProcessImageIn()` |
| 종료 | `oplk_freeProcessImage()` |

[CN console demo의 `app.c`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/V2.7.2/apps/demo_cn_console/src/app.c)는 입력을 `0x6000`, 출력을 `0x6200`에 연결하고(332·349행), `processSync()`(160행)에서 `oplk_exchangeProcessImageOut()`과 `oplk_exchangeProcessImageIn()`을 차례로 부릅니다. VM에서 빌드한 CN demo는 실행 시 "Allocating process image: Input:1 Output:1"과 "Linking process vars... ok"를 출력했습니다. `0x6000`·`0x6200`은 이 demo의 디지털 IO 객체일 뿐입니다. 모터 드라이브 같은 실제 장치라면 그 장치의 XDD/XDC에 정의된 객체를 연결합니다.

## 라이선스의 범위

저장소의 [`license.md`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/V2.7.2/license.md)에 따르면 주 소스는 SYS TEC electronic GmbH와 기여자의 BSD 라이선스입니다. 일부 target 플랫폼 전용 부분은 GPLv2 등 다른 라이선스를 따르므로 각 파일 header를 보라고 적혀 있습니다. 일부 Altera 저작권 파일은 Altera가 만든 logic device를 프로그래밍하는 용도로만 쓸 수 있다는 조건도 있습니다. 그래서 "BSD 스택"이라고 한 단어로 요약하면 빠지는 조건이 생깁니다.

## openSAFETY와 안전 기능의 경계

[IEC 61784-3-13:2021](https://webstore.iec.ch/en/publication/68897)(Edition 3.0, 2021-05-19)의 공개 초록은 이 표준이 CPF 13에 기반한 "safety communication layer (services and protocol)"를 규정하고, 이 계층이 "intended for implementation in safety devices only"이며, 메커니즘이 IEC 61508의 기능 안전 요구를 따른다고 적습니다. 초록에는 SIL 등급이 적혀 있지 않습니다.

Black channel은 아래 통신 계층을 안전 기능의 일부로 믿지 않고, 통신 오류를 안전 계층이 직접 잡아내는 방식입니다. 택배 회사를 믿지 않고 상자에 봉인 스티커와 일련번호를 붙여 보내, 받는 사람이 직접 훼손과 누락을 확인하는 것과 같습니다. 대신 늦게 오거나 빠진 메시지를 안전 계층이 정해진 시간 안에 알아채고 안전한 상태로 가야 하므로, 안전 반응 시간 계산에는 통신 주기와 timeout이 들어갑니다.

| 이름 | 구분 |
|---|---|
| openSAFETY | IEC 61784-3-13(CPF 13 기반)의 안전 통신 계층 |
| PROFIsafe | 별도 안전 통신 프로파일. [Ch 7](/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io)의 I&M4가 PROFIsafe 서명용 |
| FSoE | 별도 안전 통신 프로토콜. openSAFETY의 EtherCAT 매핑 이름이 아님 |

공개 스택을 넣는다고 시스템이 안전 인증을 받는 것은 아닙니다. IEC 61784-3-13의 초록부터 이 계층을 안전 장치에 구현하라고 범위를 정하고 있고, 장치와 시스템의 안전 기능은 IEC 61508 절차로 따로 검증합니다.

## 문제를 좁히는 관찰점

위 VM 실행처럼 MN이 SoA만 계속 보내고 SoC가 나오지 않으면 아직 Pre-Operational 1입니다. SoC가 나오는데 특정 CN의 PReq만 보이고 PRes가 없으면 그 CN의 NodeID와 NMT 상태를 봅니다. MN 로그의 `HistoryEntry` 코드와 NMT 상태 전이 사유(`Originating event`)가 어느 단계에서 멈췄는지 알려 줍니다. 주기 간격이 흔들리면 위 캡처처럼 SoC 사이 간격의 분포를 먼저 보고, 그 흔들림이 host 쪽(Ch 11)인지 망 쪽인지 나눕니다.

## 정리

- POWERLINK 메시지는 SoC·PReq·PRes·SoA·ASnd 등이고, openPOWERLINK `frame.h`가 값 0x01·0x03·0x04·0x05·0x06을 정의합니다.
- MN 기본 주소는 `0xF0`, broadcast는 `0xFF`, EtherType은 `0x88AB`입니다.
- VM에서 MN demo는 Pre-Operational 1에 SoA만, 그 뒤로 설정값 50 ms 주기의 SoC를 보냈고, VM 안에서 SoC 간격은 32.9~65.6 ms로 흔들렸습니다.
- 최소 프레임 선로 시간은 CN 32대에 443.52 μs이고, 이것은 주기의 하한일 뿐입니다.
- 공개 API는 process image의 할당·연결·교환으로 동작합니다.
- openSAFETY는 안전 장치에 구현하는 안전 통신 계층이고, 시스템의 안전 검증을 대신하지 않습니다.

다음 [Ch 11: Linux 실시간 산업 통신](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)에서 OS 지연과 실제 통신 deadline을 나누어 측정합니다.

## 관련 항목

- [Ch 9: TSN 스케줄링](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)
- [Ch 3: EtherCAT 아키텍처](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [openPOWERLINK V2.7.2](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/V2.7.2)
- [IEC 61784-3-13:2021](https://webstore.iec.ch/en/publication/68897)
