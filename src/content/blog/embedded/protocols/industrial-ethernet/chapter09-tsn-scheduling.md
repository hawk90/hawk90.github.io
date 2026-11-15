---
title: "TSN 스케줄링 메커니즘 — Qbv·Qbu·gPTP 동기화 분석"
slug: "embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling"
date: 2026-05-13T09:09:00
description: "주기 경계의 guard band와 프레임 선로 시간을 검산하고, Linux taprio의 offload·시계 모드를 구분합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 9
tags: [tsn, qbv, qbu, ptp, scheduling, gcl, ilp, cnc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **GCL의 기간 합계만 맞추면 충분하지 않습니다. 주기 경계의 간섭, 큐 매핑, 송신 준비 시각과 기준 시계를 함께 맞춰야 합니다.**

이 장은 1 Gbit/s 출력 포트 한 개의 교육용 스케줄을 계산합니다. 실제 스위치의 스케줄을 측정한 결과나 모든 hop의 deadline 증명은 아닙니다. Linux 설정 의미는 [iproute2 v6.12.0의 `tc-taprio.8`](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/tc-taprio.8?h=v6.12.0)과 Linux v6.12 구현을 기준으로 구분합니다.

PCP와 traffic class의 매핑은 설계의 입력입니다. PCP 7을 언제나 safety, PCP 6을 언제나 AVB A로 부르는 보편 규칙은 없습니다. 여기서는 두 traffic class를 사용하며 TC1은 예약 트래픽, TC0은 나머지 트래픽으로 **가정**합니다.

## 한 포트의 시간 예산

한 주기는 1 ms이고, 예약 트래픽은 주기당 MAC 프레임 4개입니다. 각 프레임 길이는 FCS 포함 256 B이며 주기 시작 전에 큐에 준비된다고 가정합니다. 애플리케이션 payload가 256 B라는 뜻은 아닙니다.

| 구간 | 기간 | gate mask | 예제의 목적 |
|---|---:|---:|---|
| 0~12 μs | 12,000 ns | `0x02` | TC1 송신 기회 |
| 12~984 μs | 972,000 ns | `0x01` | TC0 송신 기회 |
| 984~1000 μs | 16,000 ns | `0x00` | 다음 주기 TC1 앞의 guard band |

1 Gbit/s에서 256 B 프레임 하나의 선로 점유는 `(256 + 8 + 12) × 8 = 2208 ns`입니다. 네 개는 8832 ns이므로 12,000 ns 안에 들어갑니다. 남은 3168 ns가 모든 하드웨어 처리 지연을 보장하는 여유라는 주장은 하지 않습니다.

TC0 최대 MAC 프레임을 FCS 포함 1522 B로 제한하면 같은 가정의 선로 점유는 12,336 ns입니다. 16,000 ns guard는 이 값보다 큽니다. 중요한 위치는 **TC0 구간 뒤, 다음 TC1 구간 앞**입니다. TC1 바로 뒤에만 빈 구간을 넣고 주기 마지막까지 TC0을 열면 다음 주기 경계가 보호되지 않습니다.

## 실행 가능한 계산 입력

다음 JSON은 이 글의 계산기에만 사용하는 형식입니다. 스위치나 CNC에 import하는 표준 schema는 아닙니다. preamble/SFD 8 B와 IPG 12 B를 선로 시간에 포함하고 별도의 장치 지연은 포함하지 않습니다.

```json title="tsn-teaching-schedule.json"
{
  "linkBps": 1000000000,
  "criticalMacBytes": 256,
  "criticalCount": 4,
  "maxOtherMacBytes": 1522,
  "cycleNs": 1000000,
  "entries": [
    {"mask": 2, "ns": 12000},
    {"mask": 1, "ns": 972000},
    {"mask": 0, "ns": 16000}
  ]
}
```

계산기는 이 **세 구간 모델만** 검사합니다. 일반 GCL 합성기, stream별 분리 검사기나 지연 보장 도구가 아닙니다. BigInt로 계산하여 정수 overflow와 단위 반올림을 명시적으로 처리합니다.

```js title="tsn-teaching-check.mjs"
export function checkSchedule(s) {
  const positive = x => Number.isSafeInteger(x) && x > 0;
  const fields = ['linkBps', 'criticalMacBytes', 'criticalCount',
    'maxOtherMacBytes', 'cycleNs'];
  if (!s || !fields.every(k => positive(s[k])) ||
      !Array.isArray(s.entries) || s.entries.length !== 3) {
    throw new TypeError('positive integers and exactly three entries required');
  }
  const masks = [2, 1, 0];
  if (!Array.from(s.entries).every((e, i) => e && e.mask === masks[i] && positive(e.ns))) {
    throw new RangeError('required order: TC1, TC0, closed guard');
  }
  const wire = bytes => {
    const bitsNs = (BigInt(bytes) + 20n) * 8n * 1000000000n;
    return (bitsNs + BigInt(s.linkBps) - 1n) / BigInt(s.linkBps);
  };
  const total = s.entries.reduce((n, e) => n + BigInt(e.ns), 0n);
  const critical = wire(s.criticalMacBytes) * BigInt(s.criticalCount);
  const guard = wire(s.maxOtherMacBytes);
  return {
    totalMatches: total === BigInt(s.cycleNs),
    criticalFits: critical <= BigInt(s.entries[0].ns),
    boundaryGuardFits: guard <= BigInt(s.entries[2].ns),
    criticalWireNs: critical.toString(),
    requiredGuardNs: guard.toString(),
  };
}
```

JSON을 읽어 `checkSchedule()`에 전달하면 세 검사 결과가 참이고, `criticalWireNs`는 `"8832"`, `requiredGuardNs`는 `"12336"`입니다. 링크를 100 Mbit/s로만 바꾸면 예약 구간과 guard 모두 부족해집니다. 더 큰 TC0 프레임을 허용하거나 네 개보다 많은 TC1 프레임이 쌓이면 예제의 전제도 바뀝니다.

## taprio: software, txtime-assist, full offload

| 모드 | 핵심 조건 | 기준 시계와 주의점 |
|---|---|---|
| software scheduling | 하드웨어 GCL 실행을 요청하지 않습니다. | qdisc의 `clockid`를 사용합니다. OS 지연을 별도 측정합니다. |
| `flags 0x1` | txtime-assist, ETF와의 조합을 확인합니다. | `txtime-delay`와 ETF delta의 관계를 확인합니다. |
| `flags 0x2` | full offload를 드라이버·NIC가 지원해야 합니다. | 장치 PHC를 사용하므로 `clockid`를 생략합니다. |

`0x1`과 `0x2`는 동시에 사용할 수 없습니다. full offload 예제에 `clockid CLOCK_TAI`와 txtime-assist용 옵션을 섞지 않습니다. PHC는 PTP Hardware Clock이며 timestamp 위치가 반드시 PHY라는 뜻은 아닙니다.

다음은 **실험망용 설정 형식 예**입니다. 이 글의 검증에서는 실행하지 않았습니다. 두 송신 큐와 full offload, 해당 GCL·간격을 지원하는 장치가 필요하며, 실제 적용 전에는 기존 qdisc와 트래픽의 영향을 확인해야 합니다. `ethLAB`는 실제 인터페이스 이름으로 바꿉니다.

```bash title="taprio-full-offload-example.sh"
tc qdisc replace dev ethLAB parent root handle 100 taprio \
  num_tc 2 \
  map 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 \
  queues 1@0 1@1 \
  base-time 200 \
  sched-entry S 02 12000 \
  sched-entry S 01 972000 \
  sched-entry S 00 16000 \
  flags 0x2
```

여기서 map은 skb priority 0~15를 TC에 매핑합니다. priority 7만 TC1로 보냅니다. skb priority, VLAN PCP와 실제 하드웨어 큐 사이의 경로는 별도로 확인해야 합니다. GCL의 bit는 stream 번호가 아니라 traffic class 번호입니다.

`base-time 200`은 PHC 기준의 주기 위상을 보여 주는 예입니다. 과거 시각이면 지원 구현은 cycle을 더해 현재 이후의 시작을 구합니다. “과거 base-time은 무조건 오류” 또는 “항상 현재+1초로 설정”은 올바른 규칙이 아닙니다. 여러 hop의 base-time이 같아야만 하는 것도 아닙니다. 경로별 전달 시간에 맞춘 위상 차이가 필요할 수 있습니다.

qdisc 적용 성공은 NIC의 물리 송신 시각이나 end-to-end deadline을 측정한 결과가 아닙니다. 전제인 최대 프레임과 송신량을 실제로 제한하고, driver offload 상태와 wire상의 송신·수신을 확인해야 합니다. 이 예제는 장치별 `max-sdu`와 overhead accounting을 완성한 생산 설정이 아닙니다.

## 시간 동기화 설정에서 분리할 것

[LinuxPTP의 gPTP 예제](https://www.linuxptp.org/documentation/configs/gptp/)는 `network_transport L2`, `delay_mechanism P2P`, `transportSpecific 0x1` 등의 설정을 제시합니다. 임의의 `gPTP 1` 옵션으로 전체 프로파일을 선택하는 방식이 아닙니다. 현재 설치한 LinuxPTP 버전의 설정 parser와 프로파일을 함께 확인합니다.

PHC와 시스템 시계는 다를 수 있습니다. full offload는 장치 PHC의 스케줄이고 software 모드의 `CLOCK_TAI`와 자동으로 같아지지 않습니다. `ptp4l`·`phc2sys`의 동기화 방향, UTC/TAI offset과 grandmaster 역할을 정한 뒤 구성해야 합니다. 의미를 확인하지 않고 `phc2sys -O 0`으로 시계를 맞추는 예제는 제공하지 않습니다.

다음 명령은 Linux 실험 장치에서 상태를 읽는 데 사용합니다. 출력은 이 글에서 측정한 결과로 싣지 않습니다. timestamp capability가 있어도 그 기능의 활성화나 오차 상한까지 증명하지는 않습니다.

```bash
ethtool -T ethLAB
tc -s -d qdisc show dev ethLAB
```

## 다중 hop과 스케줄 합성

한 출력 포트의 gate 시간이 맞아도 다음 hop의 큐에 제때 도착해야 합니다. 송신 시간, propagation과 bridge delay, clock error, 애플리케이션 준비 지연을 합쳐 경로별 제약을 만듭니다. 서로 다른 큐라도 같은 출력 링크를 동시에 사용할 수 없다는 점이 중요합니다.

ILP/MILP에서는 송신 시작 시각, 경로·큐 배정과 순서 선택을 변수로 두고, deadline과 링크의 비중첩 제약을 표현할 수 있습니다. OR 형태의 순서 선택은 정수 변수를 사용해 선형화할 수 있습니다. 단지 OR가 있다는 이유로 모든 정식화가 비선형인 것은 아닙니다.

주기마다 여러 release가 있으면 hyperperiod 안의 반복과 경계 간섭도 포함해야 합니다. FIFO와 실제 큐 공유, gate 해상도와 entry 수 제한도 필요합니다. 최적화 목표나 변수 집합이 다른데 모든 solver가 같은 답이나 실행 시간을 낸다고 가정하지 않습니다.

Greedy/list scheduling이 답을 못 찾았다는 사실은 전역적으로 불가능하다는 증명이 아닙니다. 반대로 답을 찾았어도 모델에서 누락한 지연이나 구현 제약이 있으면 장치에서 실패할 수 있습니다. 수동 설계의 한계를 “8노드”, solver 시간을 “수십 초”처럼 보편 수치로 고정하지 않습니다.

## 정리

- guard band는 방해 트래픽 뒤, 보호할 구간 앞에 있어야 합니다. 주기 경계도 포함합니다.
- 프레임 길이에 어떤 헤더·FCS·선로 overhead를 포함했는지 명시합니다.
- GCL은 class의 송신 자격을 제어하며 stream별 패킷 시각을 직접 지정하지 않습니다.
- taprio 모드별 옵션과 시계를 구분하고 full offload에는 `clockid`를 넣지 않습니다.
- 과거 base-time과 hop별 위상은 지원 구현과 경로 조건으로 해석합니다.
- 계산 검증, 설정 수락과 실제 장치의 deadline 측정은 서로 다른 단계입니다.

다음 [Ch 10: POWERLINK·OpenSAFETY](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)에서 다른 주기 통신 방식과 safety 계층의 경계를 살펴봅니다.

## 관련 항목

- [Ch 8: TSN 표준 개요](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 11: Linux 실시간](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [Linux v6.12 taprio 구현](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_taprio.c)
- [iproute2 v6.12.0 taprio 사용자 문서](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/tc-taprio.8?h=v6.12.0)
