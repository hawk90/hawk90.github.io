---
title: "TSN 스케줄링 메커니즘 — Qbv·Qbu·gPTP 동기화 분석"
slug: "embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling"
date: 2026-05-13T09:09:00
description: "1 Gbit/s 포트 하나의 GCL과 주기 경계 guard band를 계산기로 검산하고, Linux taprio의 software·txtime-assist·full offload 모드를 Debian VM의 veth에서 실제로 설정해 커널이 받아들이는 조건과 거부 메시지를 확인합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 9
tags: [tsn, qbv, qbu, ptp, scheduling, gcl, ilp, cnc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **GCL의 기간 합계만 맞추면 충분하지 않습니다. 주기 경계의 간섭, 큐 매핑, 송신 준비 시각과 기준 시계를 함께 맞춰야 합니다.**

[Ch 8](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)에서 Qbv 게이트가 traffic class별로 송신 자격을 준다는 것을 봤습니다. 이 장은 1 Gbit/s 출력 포트 하나의 교육용 스케줄을 직접 계산하고, 그 스케줄을 Linux `taprio`에 넣어 봅니다. 기준은 [iproute2 v6.12.0의 `tc-taprio.8`](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/tc-taprio.8?h=v6.12.0)과 Linux v6.12 `net/sched/sch_taprio.c`이고, 실행은 Debian 12 VM(kernel 6.1.0-56-arm64, iproute2 6.1.0)의 송신 큐 4개짜리 veth에서 했습니다. 실제 스위치의 스케줄을 잰 결과는 아닙니다.

PCP를 어느 traffic class에 대응시킬지는 설계자가 먼저 정하는 값입니다. 여기서는 두 traffic class를 쓰고 TC1을 예약 트래픽, TC0을 나머지 트래픽으로 정합니다.

## 한 포트의 시간 예산

한 주기는 1 ms이고, 예약 트래픽은 주기당 MAC 프레임 4개입니다. 각 프레임은 FCS 포함 256 B이고 주기 시작 전에 큐에 준비된다고 가정합니다.

| 구간 | 기간 | gate mask | 목적 |
|---|---:|---:|---|
| 0~12 μs | 12,000 ns | `0x02` | TC1 송신 기회 |
| 12~984 μs | 972,000 ns | `0x01` | TC0 송신 기회 |
| 984~1000 μs | 16,000 ns | `0x00` | 다음 주기 TC1 앞의 guard band |

1 Gbit/s에서 256 B 프레임 하나의 선로 점유는 preamble/SFD 8 B와 IPG 12 B를 더해 `(256 + 8 + 12) × 8 = 2208 ns`입니다. 네 개는 8832 ns이므로 12,000 ns 안에 들어가고 3168 ns가 남습니다.

TC0 최대 MAC 프레임을 VLAN 태그 포함 1522 B로 제한하면 선로 점유는 12,336 ns이고, 16,000 ns guard는 그보다 큽니다. 위치가 중요합니다. guard는 **TC0 구간 뒤, 다음 TC1 구간 앞**에 있어야 합니다. 984 μs에 시작한 1522 B 프레임이 1000 μs를 넘겨 다음 주기의 TC1 구간을 먹지 않게 막는 것이 guard의 일이기 때문입니다. TC1 바로 뒤에만 빈 구간을 두고 주기 끝까지 TC0을 열어 두면 이 경계가 보호되지 않습니다.

## 실행 가능한 계산 입력

다음 JSON은 이 글의 계산기에만 쓰는 형식입니다. 스위치나 CNC가 읽는 표준 schema는 아닙니다.

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

계산기는 위의 세 구간 모델만 검사합니다. 선로 시간에는 preamble/SFD와 IPG 20 B를 더하고, 장치 지연은 넣지 않습니다. BigInt로 계산하고 ns 단위로 올림합니다.

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

JSON을 그대로 넣은 결과와, 링크만 100 Mbit/s로 바꾼 결과입니다(Node v24.22.3).

```text
1G   {
  totalMatches: true,
  criticalFits: true,
  boundaryGuardFits: true,
  criticalWireNs: '8832',
  requiredGuardNs: '12336'
}
100M {
  totalMatches: true,
  criticalFits: false,
  boundaryGuardFits: false,
  criticalWireNs: '88320',
  requiredGuardNs: '123360'
}
```

100 Mbit/s에서는 선로 시간이 열 배라 예약 구간(12 μs)과 guard(16 μs) 모두 모자랍니다. 같은 GCL이 링크 속도만 바뀌어도 무너진다는 뜻입니다.

## taprio: 세 가지 모드

`tc-taprio.8`(v6.12.0)은 `flags`를 다음처럼 정의합니다.

| 모드 | 설정 | `tc-taprio.8`의 설명 |
|---|---|---|
| software | `flags` 없음 + `clockid` | 커널이 `clockid` 시계로 게이트를 돌림 |
| txtime-assist | `flags 0x1` + `txtime-delay` + `clockid` | taprio가 송신 시각을 정하고 `etf(8)` qdisc가 그 시각에 정렬해 보냄 |
| full offload | `flags 0x2` | GCL을 NIC에 넘겨 하드웨어가 주기적으로 실행. `clockid`가 필요 없음 |

같은 문서는 "setting flags to 0x3 is invalid"라고 적고, `txtime-delay`는 패킷이 taprio에서 NIC까지 가는 최대 시간으로 ETF의 `delta`보다 커야 한다고 설명합니다.

### software 모드 — VM에서 동작

veth를 송신 큐 4개로 만들고(`ip link add tsn0 numtxqueues 4 ... type veth ...`) 앞의 GCL을 넣었습니다. base-time 200은 일부러 과거로 줬습니다.

```bash
tc qdisc replace dev tsn0 parent root handle 100 taprio \
  num_tc 2 \
  map 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 \
  queues 1@0 1@1 \
  base-time 200 \
  sched-entry S 02 12000 \
  sched-entry S 01 972000 \
  sched-entry S 00 16000 \
  clockid CLOCK_TAI
```

`map`은 skb priority 0~15를 traffic class에 대응시키고, 여기서는 priority 7만 TC1로 보냅니다. `queues 1@0 1@1`은 TC0을 송신 큐 0에, TC1을 큐 1에 둡니다. GCL의 bit는 stream 번호가 아니라 traffic class 번호입니다. 매핑이 실제로 그렇게 동작하는지 보려고 `SO_PRIORITY` 7과 0으로 FCS를 뺀 256 B 프레임을 1000개씩 보낸 뒤 통계를 읽었습니다.

```text
# tc -s qdisc show dev tsn0
qdisc taprio 100: root refcnt 5 tc 2 map 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0
queues offset 0 count 1 offset 1 count 1
clockid TAI	base-time 200 cycle-time 1000000 cycle-time-extension 0
	index 0 cmd S gatemask 0x2 interval 12000
	index 1 cmd S gatemask 0x1 interval 972000
	index 2 cmd S gatemask 0 interval 16000

 Sent 512070 bytes 2001 pkt (dropped 0, overlimits 0 requeues 0)
...
qdisc pfifo 0: parent 100:2 limit 1000p
 Sent 256000 bytes 1000 pkt (dropped 0, overlimits 0 requeues 0)
...
qdisc pfifo 0: parent 100:1 limit 1000p
 Sent 256070 bytes 1001 pkt (dropped 0, overlimits 0 requeues 0)
```

priority 7 프레임 1000개가 큐 1(`100:2`)로, priority 0 프레임이 큐 0(`100:1`)으로 갔습니다. 큐 0에 하나 더 잡힌 70 byte는 이 시험이 보내지 않은 다른 프레임입니다. taprio는 cycle-time을 entry의 합 1,000,000 ns로 계산했습니다.

### base-time이 과거일 때

`tc-taprio.8`은 base-time이 과거면 스케줄이 `base-time + (N * cycle-time)`에 시작하고, N은 그 시각이 "now"보다 커지는 가장 작은 정수라고 적습니다. v6.12의 `taprio_get_start_time()`(`sch_taprio.c` 1200~1232행)이 이 규칙을 그대로 구현합니다. base가 now보다 뒤면 base를 쓰고, 아니면 `n = (now - base) / cycle`을 구해 `base + (n + 1) * cycle`에서 시작합니다. 그래서 커널은 위 base-time 200도 받아들였습니다. 여러 장치가 같은 base-time과 cycle-time을 쓰면 시작 시각이 같은 주기 격자 위에 놓이고, hop마다 위상을 다르게 주고 싶으면 base-time을 그만큼 옮깁니다.

### full offload — veth에서 거부

같은 GCL에 `flags 0x2`를 주면 veth에서는 커널이 거부합니다.

```text
Error: Device does not have a PTP clock.
```

v6.12의 `sch_taprio.c` 1627~1629행은 full offload일 때 드라이버의 `get_ts_info`로 PHC index를 읽고, PHC가 없으면 이 메시지로 거부합니다. 같은 분기(1618~1621행)는 full offload에 `clockid`를 주면 "The 'clockid' cannot be specified for full offload"로 거부하고, VM의 kernel 6.1도 같은 메시지를 냈습니다. NIC가 자기 PHC로 GCL을 돌리기 때문에 시계를 따로 고를 수 없습니다.

### txtime-assist + ETF

`flags 0x1 txtime-delay 200000 clockid CLOCK_TAI`로 다시 만들고, TC1 큐에 ETF를 붙였습니다.

```text
# tc qdisc replace dev tsn0 parent 100:2 etf clockid CLOCK_TAI delta 200000 offload skip_sock_check
Error: Specified device does not support ETF offload.
# tc qdisc replace dev tsn0 parent 100:2 etf clockid CLOCK_TAI delta 200000 skip_sock_check
# tc -d qdisc show dev tsn0
qdisc taprio 100: root refcnt 5 tc 2 map 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0
queues offset 0 count 1 offset 1 count 1
clockid TAI flags 0x1 txtime delay 200000	base-time 200 cycle-time 1000000 cycle-time-extension 0
...
qdisc etf 8002: parent 100:2 clockid TAI delta 200000 offload off deadline_mode off skip_sock_check on
```

`offload`(NIC의 launch time 기능)는 veth가 지원하지 않아 거부되고, 소프트웨어 ETF는 붙었습니다. 이 예는 `tc-taprio.8`의 권고와 달리 `txtime-delay`와 ETF `delta`를 같은 200 μs로 줬습니다. 실제 구성에서는 `txtime-delay`를 `delta`보다 크게 잡습니다.

### 커널이 막는 조합

같은 VM에서 잘못된 조합을 넣어 본 결과입니다.

| 시도 | kernel 6.1의 응답 | v6.12 `sch_taprio.c` |
|---|---|---|
| `flags 0x3` | "Specified 'flags' are not valid." | 1834~1838행 "TXTIME_ASSIST and FULL_OFFLOAD are mutually exclusive" |
| 실행 중 `flags` 변경 | "Changing 'flags' of a running schedule is not supported." | 1841~1843행 같은 문구 |
| software 모드에 `clockid` 없음 | "Specifying a 'clockid' is mandatory." | 1671행 |
| `flags` 없이 `txtime-delay` | "txtime-delay can only be set when txtime-assist mode is enabled." | 1924행 |
| 단일 큐 장치(dummy) | "Multi-queue device is required." | 2078행 |

`flags 0x3`의 메시지는 6.1과 6.12에서 다릅니다. 같은 실수라도 커널 판에 따라 오류 문구가 달라지므로, 문구가 아니라 반환 코드로 실패를 판단합니다.

qdisc 설정이 받아들여졌다는 것은 NIC가 그 시각에 실제로 송신했다는 증거가 아닙니다. software 모드의 게이트는 커널 타이머로 돌고, 그 정밀도는 [Ch 11](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)에서 잰 wakeup 지연의 영향을 받습니다.

## PHC와 시스템 시계는 따로 맞춥니다

[LinuxPTP v4.4의 `configs/gPTP.cfg`](https://github.com/richardcochran/linuxptp/blob/v4.4/configs/gPTP.cfg)는 gPTP 동작을 설정 항목 묶음으로 표현합니다. `network_transport L2`, `delay_mechanism P2P`, `transportSpecific 0x1`, `ptp_dst_mac 01:80:C2:00:00:0E`, `gmCapable 1` 등입니다. ptp4l에 `-f configs/gPTP.cfg`로 이 파일을 주는 방식이고, 옵션 하나로 프로파일 전체를 고르는 방식이 아닙니다.

PHC와 시스템 시계는 다른 시계입니다. full offload는 NIC PHC의 시간으로 GCL을 돌리고, software·txtime-assist 모드는 `clockid`로 고른 시스템 시계(위 예에서는 `CLOCK_TAI`)를 씁니다. 두 시계를 맞추는 것은 linuxptp의 `phc2sys` 몫이며, 어느 쪽이 기준인지(PHC → 시스템 또는 그 반대)는 grandmaster 역할에 따라 정합니다. 장비에서 상태를 읽을 때는 다음을 씁니다.

```bash
ethtool -T ethLAB
tc -s -d qdisc show dev ethLAB
```

`ethtool -T`가 PHC index를 보여 주면 full offload의 전제가 갖춰진 것이고, `tc -s -d`가 각 송신 큐(child qdisc)의 송신·drop 수를 보여 줍니다.

## 다중 hop과 스케줄 합성

한 포트의 게이트가 맞아도 다음 hop의 큐에 제때 도착해야 합니다. 경로별 제약은 송신 시간, 전파·bridge 지연, 시계 오차, 애플리케이션 준비 시각을 합쳐 만듭니다. 서로 다른 큐라도 같은 출력 링크를 동시에 쓸 수는 없습니다.

ILP/MILP 정식화에서는 송신 시작 시각, 경로·큐 배정, 순서 선택을 변수로 두고 deadline과 링크 비중첩을 제약으로 씁니다. "A가 B보다 먼저 또는 B가 A보다 먼저" 같은 순서 선택은 정수 변수 하나와 큰 상수(big-M)를 써서 선형 제약 두 개로 바꿀 수 있습니다. 주기마다 release가 여러 번 있으면 hyperperiod 전체를 펼쳐야 하고, gate 해상도와 장치가 허용하는 GCL entry 수도 제약에 들어갑니다.

Greedy·list scheduling이 해를 못 찾았다는 것은 해가 없다는 증명이 아닙니다. 반대로 해를 찾았어도 모델에 빠진 지연이 있으면 장치에서 실패합니다. 위 계산기가 100 Mbit/s에서 바로 실패한 것처럼, 모델의 입력 하나가 바뀌면 결과 전체를 다시 검산합니다.

## 정리

- guard band는 방해 트래픽 뒤, 보호할 구간 앞에 둡니다. 다음 주기로 넘어가는 경계도 예외가 아닙니다.
- 1 Gbit/s에서 256 B × 4는 8832 ns, 1522 B guard는 12,336 ns이며, 100 Mbit/s에서는 같은 GCL이 실패합니다.
- taprio는 software(`clockid`), txtime-assist(`flags 0x1` + ETF), full offload(`flags 0x2`, `clockid` 없음, PHC 필요) 세 모드입니다.
- 과거 base-time을 주면 `base + (N+1) × cycle`, 즉 now 뒤의 첫 주기 경계에서 시작합니다.
- VM의 veth에서 software 모드와 software ETF는 동작했고, full offload와 ETF offload는 PHC·하드웨어 부재로 거부되었습니다.
- 커널이 설정을 받아들이는 것, 계산이 맞는 것, 장치가 실제로 그 시각에 송신하는 것은 각각 따로 확인합니다.

다음 [Ch 10: POWERLINK·OpenSAFETY](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)에서 다른 주기 통신 방식과 safety 계층의 경계를 살펴봅니다.

## 관련 항목

- [Ch 8: TSN 표준 개요](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)
- [Ch 11: Linux 실시간](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [Linux v6.12 taprio 구현](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_taprio.c)
- [iproute2 v6.12.0 taprio 사용자 문서](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/tc-taprio.8?h=v6.12.0)
