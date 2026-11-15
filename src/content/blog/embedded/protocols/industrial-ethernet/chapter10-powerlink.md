---
title: "POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜"
slug: "embedded/protocols/industrial-ethernet/chapter10-powerlink"
date: 2026-05-13T09:10:00
description: "POWERLINK의 MN·CN 전송 순서와 선로 시간 예산을 검산하고, openPOWERLINK의 실제 API와 openSAFETY의 책임 경계를 구분합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 10
tags: [powerlink, opensafety, br-automation, sil3, black-channel]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **POWERLINK의 주기 통신과 openSAFETY의 안전 통신은 서로 다른 책임을 가집니다. 주기가 빠르거나 스택이 공개되어 있다는 사실이 안전 기능의 인증을 대신하지는 않습니다.**

POWERLINK는 MN(Managing Node)이 주기와 전송 기회를 관리하는 산업용 이더넷입니다. 이 장에서는 기본 PReq/PRes 모드의 순서와 시간 예산을 살펴봅니다. 구현 대조에는 [openPOWERLINK V2.7.2, commit `048650a8`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/048650a80db37fa372330c3a900d2c8edb327e47)를 사용합니다.

일반 NIC로 구현할 수 있다는 것과 어떤 스위치·OS에서도 같은 시간 상한을 얻는다는 것은 다른 주장입니다. 드라이버, 토폴로지와 프레임 길이가 실제 가능한 주기에 영향을 줍니다. “유일한 오픈소스 방식”이나 출처 없는 제조사별 최소 주기 비교로 선택하지 않습니다.

## MN과 CN: 기본 전송 순서

| 메시지 | 기본 역할 | 시간 예산에서 확인할 점 |
|---|---|---|
| SoC | 주기 시작을 알립니다. | 송신 시각과 동기화 조건 |
| PReq | MN이 대상 CN에 출력 데이터를 전달합니다. | 프레임 길이와 요청 순서 |
| PRes | CN이 입력 데이터를 제공합니다. | 응답 시간과 프레임 길이 |
| SoA | 비동기 통신 기회를 관리합니다. | 비동기 구간에 남긴 예산 |
| ASnd | 비동기 서비스 데이터를 전달합니다. | 선택된 서비스와 노드의 전송량 |

기본 polling에서는 SoC 다음에 각 CN의 PReq/PRes를 처리하고 비동기 구간으로 이어집니다. Multiplexing이나 Poll Response Chaining을 쓰면 전송·동기화 조건이 달라집니다. 따라서 “모든 CN은 모든 주기에서 PReq를 받은 직후에만 송신한다”를 모든 모드의 규칙으로 확대하지 않습니다.

활성 MN이 전송을 관리하지만 redundancy를 포함한 전체 구성을 “물리적으로 MN 한 대만 존재한다”라고 한정하지 않습니다. 또한 protocol의 전송 규칙은 고장·오설정·외부 트래픽이 물리적으로 불가능하다는 보장이 아닙니다. 스위치의 큐와 전달 지연도 실제 토폴로지 조건으로 확인해야 합니다.

## 최소 프레임으로 보는 선로 시간 하한

100 Mbit/s에서 FCS 포함 최소 MAC 프레임은 64 B입니다. preamble/SFD 8 B와 IPG 12 B를 더하면 프레임마다 84 B, 즉 **6.72 μs**를 차지합니다. 아래는 모든 SoC·PReq·PRes·SoA를 최소 길이로 놓은 직렬화 모델입니다.

| CN 수 | 프레임 수 `2N + 2` | 선로 점유 시간 |
|---|---:|---:|
| 8 | 18 | 120.96 μs |
| 16 | 34 | 228.48 μs |
| 32 | 66 | 443.52 μs |

이 합계에는 ASnd, CN 응답 대기, 케이블·허브·스위치 지연, 처리 지연과 구현 여유가 없습니다. 따라서 표는 완성된 cycle time이 아닌 **가정한 프레임들의 선로 점유 하한**입니다. 32 CN의 이 모델이 200 μs에 들어가지 않는다는 것은 알 수 있지만, 8 CN이 실제 200 μs를 만족한다고 증명하지는 못합니다.

다음 계산기는 이 제한된 모델을 사용합니다. NodeID 숫자와 실제 연결 가능한 CN 수는 별개의 제한일 수 있으므로 수용량이나 인증 결과로 해석하지 않습니다.

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

`wireFloorNs(32)`은 `443520n`입니다. 더 빠른 링크 속도를 넣으면 산술상 시간은 줄지만 해당 장치가 그 속도와 프로파일을 지원한다는 뜻은 아닙니다. PRC를 켜면 항상 이 결과가 특정 비율로 줄어든다는 가정도 하지 않습니다.

## NodeID와 기본 프레임

[pinned `oplkdefs.h`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/stack/include/oplk/oplkdefs.h)는 MN 기본 주소를 `0xF0`으로 정의합니다. 일반 CN의 1~239와 MN 기본 주소 240을 같은 CN 할당 범위에 넣으면 안 됩니다. `0xFF` broadcast, `0xFD` 진단 기본 주소 등도 있으므로 모든 바이트를 일반 CN 번호로 분류하지 않습니다.

태그 없는 기본 Ethernet wrapper의 EtherType은 `0x88AB`입니다. [실제 `frame.h`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/stack/include/oplk/frame.h)는 message type, destination NodeID, source NodeID의 offset을 각각 14, 15, 16으로 정의합니다. 아래 예제는 이 **17 B prefix만** 읽습니다. 전체 프레임의 길이·payload·FCS를 검증하지 않습니다.

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

메시지 값은 SoC `0x01`, PReq `0x03`, PRes `0x04`, SoA `0x05`, ASnd `0x06` 등이 있습니다. 예를 들어 synthetic prefix의 마지막 다섯 바이트가 `88 ab 03 01 f0`이면 MN 기본 주소에서 CN 1로 향하는 PReq의 header 값을 나타냅니다. 실제 캡처나 완성된 유효 PReq라는 주장은 하지 않습니다.

## openPOWERLINK의 실제 API로 읽기

기존에 소개하던 `oplk_readPdo()`와 `oplk_writePdo()`는 V2.7.2 공개 API에 없습니다. 실제 [CN console demo의 `app.c`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/apps/demo_cn_console/src/app.c)는 process image를 할당하고 object dictionary와 연결한 뒤 교환합니다.

| 단계 | 실제 API | demo에서 확인할 내용 |
|---|---|---|
| 할당 | `oplk_allocProcessImage()` | input/output 크기와 실패 반환값 |
| 포인터 획득 | `oplk_getProcessImageIn/Out()` | 이미지의 수명과 방향 |
| object 연결 | `oplk_linkProcessImageObject()` | index, subindex, offset, entry 크기와 개수 |
| 수신 이미지 반영 | `oplk_exchangeProcessImageOut()` | 애플리케이션이 읽을 출력 데이터 |
| 송신 이미지 반영 | `oplk_exchangeProcessImageIn()` | 애플리케이션이 제공할 입력 데이터 |
| 종료 | `oplk_freeProcessImage()` | 연결 종료 순서와 자원 수명 |

demo는 CN 입력의 `0x6000:01`과 출력을 위한 `0x6200:01`을 연결합니다. 이 주소를 모든 모터의 controlword/statusword 주소로 바꾸어 사용하면 안 됩니다. CiA 402 object와 실제 PDO 매핑, 장치의 XDD/XDC·설정 자료를 확인해야 합니다.

동기 처리의 실행 문맥과 시점도 빌드 구성에 따릅니다. `processSync`라는 함수 이름만으로 “항상 PRes 송신 직전”이라고 단정하지 않습니다. 초기화, NMT 상태, 프로세스 이미지와 오류 처리까지 포함하지 않은 fragment를 실제 모터를 구동하는 완성 예제로 제시하지 않습니다.

## 빌드와 라이선스의 범위

V2.7.2는 대상별 stack·driver·demo 구성이 나뉩니다. `CFG_KERNEL_STACK=Userspace`, `CFG_DEMO=mn_console`라는 임의 옵션 두 개로 빌드가 완성된다고 가정하지 않습니다. 저장소의 target별 CMake와 demo 문서를 따라 필요한 라이브러리·object dictionary·설정 파일을 맞춥니다. 이 글의 검사에서는 전체 stack 빌드나 NIC 실행을 하지 않았습니다.

저장소의 [`license.md`](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/license.md)는 주 코드의 BSD 조건과 일부 target별 GPLv2 등 별도 조건을 구분합니다. 따라서 전체를 LGPL/BSD 하나로 요약하지 않습니다. 실제 사용하는 파일의 header와 포함된 구성 요소의 조건을 확인합니다.

## openSAFETY와 안전 기능의 경계

[IEC 61784-3-13:2021의 공개 설명](https://webstore.iec.ch/en/publication/68897)은 CPF 13에 기반한 safety communication layer를 다루며 안전 장치에 구현하는 범위를 명시합니다. 공개 초록만으로 전체 wire layout이나 CRC 다항식·길이의 구현을 확정하지 않습니다. 이 장은 해당 표준 전체를 검증한 구현 설명이 아닙니다.

Black channel 접근은 하부 통신을 안전 기능 자체로 신뢰하지 않고 안전 계층에서 통신 오류를 다루는 방식입니다. 지연·손실을 허용하는 무제한 채널이라는 뜻은 아닙니다. 안전 반응 시간 안에 통신과 장치의 반응이 이루어지는지, timeout과 오류 검출·대체 동작을 어떻게 구성하는지 확인해야 합니다.

일반 통신 케이블을 공유할 수 있어도 안전 논리·IO·출력 장치의 적합성 요구가 사라지는 것은 아닙니다. 공개 스택을 추가하거나 CRC를 두 번 검사하는 짧은 코드만으로 시스템이 SIL 3가 되지는 않습니다. 잘못된 CRC8/CRC16 필드 표나 안전 수신기 의사코드를 구현 예제로 제공하지 않습니다.

| 이름 | 구분 |
|---|---|
| openSAFETY | 이 장에서 POWERLINK와 함께 구분하는 안전 통신 계층입니다. |
| PROFIsafe | 별도 안전 통신 프로파일입니다. openSAFETY의 다른 이름이 아닙니다. |
| FSoE | 별도 안전 통신 프로토콜입니다. openSAFETY의 EtherCAT 매핑 이름이 아닙니다. |

실제 안전 기능에는 적용 표준, 지원되는 장치 조합과 safety manual을 바탕으로 설계·검증한 근거가 필요합니다. 이 장의 선로 시간 계산과 prefix decode는 안전 검증을 수행하지 않습니다. 시스템 인증 결과나 특정 safety PLC의 채택을 권장하는 근거로 사용하지 않습니다.

## 문제를 좁히는 관찰점

CN이 연결되지 않으면 NodeID, NMT 상태, 설정한 identity와 object mapping을 확인합니다. PRes가 늦으면 실제 프레임 길이, 노드별 응답과 경로 지연을 측정합니다. ASnd가 부족하면 비동기 예산과 서비스 요청량을 확인하되, 주기를 임의로 늘려도 제어 요구가 유지되는지 먼저 봅니다.

일반 TCP offload, raw Ethernet 경로와 전용 driver 경로도 구분합니다. 모든 NIC에서 `txqueuelen 0`, 모든 offload 해제가 필수라는 조언은 적용하지 않습니다. 변경할 때는 지원 여부와 변경 전후의 누락·지연·CPU 부하를 비교해야 합니다.

## 정리

- 기본 POWERLINK 모드와 PRC·multiplexing의 조건을 구분합니다.
- 최소 선로 시간은 실제 cycle time의 하한 모델이며 응답·경로·비동기 예산이 추가됩니다.
- 일반 CN 번호와 MN 기본 주소 `0xF0`을 겹치게 배정하지 않습니다.
- 공개 API는 process image와 object dictionary의 연결·교환으로 확인합니다.
- 전체 스택 빌드, 통신 실측과 순수 host 예제 검증은 서로 다른 범위입니다.
- 안전 통신 계층의 도입이 장치와 시스템의 안전 기능 검증을 대신하지 않습니다.

다음 [Ch 11: Linux 실시간 산업 통신](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)에서 OS 지연과 실제 통신 deadline을 나누어 측정하는 방법을 살펴봅니다.

## 관련 항목

- [Ch 9: TSN 스케줄링](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)
- [Ch 3: EtherCAT 아키텍처](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [openPOWERLINK V2.7.2](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/048650a80db37fa372330c3a900d2c8edb327e47)
