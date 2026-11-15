---
title: "산업용 통신 실시간 요구사항 — Determinism·Jitter·Cycle Time"
slug: "embedded/protocols/industrial-ethernet/chapter02-realtime-requirements"
date: 2026-05-13T09:02:00
description: "Soft·Firm·Hard real-time — 산업 자동화의 시간 등급."
series: "Industrial Ethernet 심화"
seriesOrder: 2
tags: [realtime, jitter, latency, cycle-time]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"결정성은 평균 지연이 아니라 *최악 지연의 상한*이다."** 산업 제어망의 설계는 jitter 예산 분배와 시계 동기, 두 축으로 정해집니다.

산업용 이더넷 책을 처음 펴면 "1 ms 사이클", "sub-μs jitter" 같은 숫자가 쏟아집니다. 어디서 나온 숫자이고, 무엇을 보장한다는 의미인지 정량적으로 정리하지 않으면 표준 비교가 *느낌의 비교*로 끝납니다.

이 장은 cycle time과 jitter의 정의를 명확히 하고, 어디서 jitter가 생기는지 분해한 다음, IEEE 1588 PTP가 어떻게 모든 노드의 시계를 sub-μs로 맞추는지 풀어봅니다.

## Cycle time — 어디서 결정되는가

cycle time은 *제어 알고리즘이 한 번 도는 데 걸리는 시간*입니다. 보통 *제어 대상의 물리 시정수*가 정합니다.

cycle은 샘플링 주기·통신 주기·연산 완료 시간 중 무엇을 뜻하는지 먼저 정해야 합니다. 물리 시정수 하나를 Nyquist 주파수로 간주하거나, 그 1/10이라는 규칙에서 1/4 주기를 유도할 수는 없습니다. 제어 대역폭·안정성 여유·센서/구동기·연산 및 통신 지연을 함께 설계해야 합니다.

가상 통신 주기를 250 μs로 정했다면, 예를 들어 sample→계산→전송→출력의 각 worst-case budget과 margin의 합이 해당 deadline 안에 들어가는지 확인합니다. 이 숫자는 제어 성능이나 안전 응답 시간의 권고값이 아닙니다.

## Jitter — 평균이 아니라 분산

jitter는 *cycle 간 도착 시각의 편차*입니다. 평균 250 μs cycle인데, 어떤 사이클은 240 μs 만에, 다른 사이클은 260 μs 만에 도착하면 jitter는 ±10 μs입니다.

제어 이론에서 jitter는 *시간 변동성*으로 작용합니다. 위치 제어 PID 입장에서 cycle 간격이 매번 다른 것은 *제어 주기가 흔들리는 것*과 같습니다. 결과는 *진동* 또는 *위치 오차 누적*입니다.

어느 jitter가 무해한지 또는 설비를 정지시켜야 하는지는 제어·안전 요구사항에서 정합니다. ns·μs 숫자 하나로 가공 품질이나 비상 정지를 일반화하지 않습니다.

**관측 p99.9와 worst-case 보장은 다릅니다.** 백분위는 유한 표본의 통계이고, 상한 보장은 명세된 조건 안의 모든 경우를 다룹니다. Jitter도 예정 시각 대비 오차·연속 간격 편차·peak-to-peak 중 어떤 정의인지 명시해야 합니다.

## Jitter 예산 분해

망의 전체 jitter는 여러 *원천*의 합입니다. 결정적 망의 설계는 각 원천에 *예산*을 배정하는 일입니다.

| 구분 | 확인할 값 |
|---|---|
| host release / scheduling | task가 예정 시각에서 얼마나 늦게 실행됐는지 |
| 송수신 경로 | timestamp 기준점과 IRQ/queue·serialization 비용 |
| 전파·device 처리 | 고정 지연과 그 변동을 구분 |
| clock 동기 | clock offset·drift와 경로 비대칭 |

100 m 전파 시간 같은 고정 지연을 jitter에 그대로 더하면 안 됩니다. EtherCAT DC가 맞추는 slave clock/event와 host의 frame 송신 지연도 별도로 관측해야 합니다.

## IEEE 1588 PTP — 어떻게 ns 정밀로 동기하나

분산 시스템에서 시계 동기의 표준은 PTP(Precision Time Protocol)입니다. [linuxptp 문서](https://www.linuxptp.org/documentation/ptp4l/)는 hardware·software timestamp 모드를 모두 지원합니다. PTP라는 이름이 ns 정확도를 보장하지 않으며 timestamp 기준점·경로 비대칭·oscillator·servo·profile에 따라 실제 오차가 달라집니다.

PTP에는 네 가지 메시지가 있습니다.

| 메시지 | 방향 | 역할 |
|--------|------|------|
| **Sync** | Master → Slave | 마스터의 현재 시각 t1 송신 |
| **Follow_Up** | Master → Slave | t1의 정확한 송신 시각 (옵션) |
| **Delay_Req** | Slave → Master | 슬레이브가 회신 시각 t3 |
| **Delay_Resp** | Master → Slave | 마스터의 t3 수신 시각 t4 |

이 네 메시지로 *클럭 오프셋*과 *전파 지연*을 분리해 계산합니다.

E2E two-step 교환에서 t1은 master 송신, t2는 slave 수신, t3는 slave 송신, t4는 master 수신 시각입니다. 같은 교환·단위로 정렬하고 correctionField와 clock 변화가 없다고 단순화하면 다음 식을 얻습니다.

- offset(slave−master) = `((t2−t1)−(t4−t3))/2`
- 평균 경로 지연 = `((t2−t1)+(t4−t3))/2`

다음 Node.js 함수는 정수 ns timestamp의 반 ns까지 보존하도록 결과의 두 배를 BigInt로 반환합니다. 실제 PTP servo를 구현하지는 않습니다.

```js title="ptp-four-timestamps.mjs"
export function ptpExchange(t1, t2, t3, t4) {
  if (![t1,t2,t3,t4].every(x => typeof x === "bigint" && x >= 0n) ||
      t3 < t2 || t4 < t1) throw new RangeError("invalid exchange timestamps");
  const forward = t2 - t1, reverse = t4 - t3;
  if (forward + reverse < 0n) throw new RangeError("negative path delay");
  return {offsetTimesTwoNs: forward-reverse, pathDelayTimesTwoNs: forward+reverse};
}
```

수식의 트릭은 *대칭 가정*입니다. master→slave 경로와 slave→master 경로의 지연이 *같다*고 가정하면, 두 식에서 오프셋과 지연을 *분리*할 수 있습니다. forward와 reverse 지연이 다르면 추정 offset에는 그 차이의 절반이 섞입니다. 예를 들어 경로 차이 1000 ns는 이 모델에서 offset 오차 500 ns입니다. 실제 PTP는 correctionField·timestamp 보정과 profile별 delay mechanism을 함께 적용합니다.

### 하드웨어 타임스탬프

Hardware timestamp는 OS 처리 지연이 timestamp에 섞이는 영향을 줄입니다. 목표 정확도를 만족하는지는 clock·경로·timestamp 기준점과 실측으로 확인해야 합니다.

지원하는 NIC는 *MAC 레벨*에서 송수신 시각을 캡처합니다. Linux에서 확인합니다.

```bash
ethtool -T eth0
ptp4l -v
```

이는 조회 예이며 이 환경에서는 NIC 출력이나 동기 수렴 로그를 수집하지 않았습니다. `ethtool -T`에서 TX/RX hardware 지원과 PHC index를 확인하고 실제 `/dev/ptpN`·권한·driver 지원을 함께 확인합니다.

PHC index와 device node·권한은 실제 환경에서 함께 확인합니다. PHC는 NIC 등의 hardware clock이며 timestamp 위치가 항상 MAC 한 지점으로 고정되는 것은 아닙니다.

[ptp4l 문서](https://www.linuxptp.org/documentation/ptp4l/)의 `-H`는 hardware timestamp, `-S`는 software timestamp, `-s`는 clientOnly, `-m`은 표준출력 로그입니다. 실행하면 PHC 또는 시스템 clock을 조정하므로, 사용 중인 clock 관리 daemon·profile·domain·transport를 정한 시험 환경에서 구성해야 합니다. 이 글은 해당 조정을 실행하지 않습니다.

offset 로그는 servo가 추정한 값이며 외부 기준으로 잰 절대 오차와 구별해야 합니다. 특정 100 ns 값만으로 정상 여부를 정하지 않고 요구사항·분포·holdover·수집 조건을 확인합니다.

### Boundary Clock vs Transparent Clock

망에 *스위치*가 끼면 PTP 정확도가 떨어집니다. 스위치 큐의 지연이 *비대칭*하기 때문입니다. 해결책 두 가지.

| 모델 | 동작 | 정확도 |
|------|------|--------|
| **Boundary Clock** | 스위치 자체가 PTP slave + master로 동작 | 제품·profile·구성별 검증 |
| **Transparent Clock** | 패킷 통과 시간을 *correctionField*에 누적 | 제품·profile·구성별 검증 |

Industrial switch라는 이름만으로 BC/TC 지원을 가정하지 않습니다. 제품의 profile·timestamp·보정 기능을 확인해야 합니다. PTP-aware 기능의 필요 여부는 topology·부하·허용 오차와 profile로 결정합니다.

## EtherCAT Distributed Clock — PTP의 변형

EtherCAT은 PTP를 그대로 쓰지 않습니다. *Distributed Clock(DC)*이라는 자체 방식을 씁니다. 원리는 비슷하지만 *마스터가 아니라 첫 슬레이브가 reference clock*이라는 점이 다릅니다.

DC는 IEEE 1588 PTP를 그대로 운반하는 방식이 아닙니다. [SOEM v1.4.0 `ecx_configdc()`](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatdc.c)는 BWR로 port 수신 시간을 latch한 뒤, 각 DC slave를 FPRD로 읽고 topology를 따라 delay를 계산하며 offset·delay register를 FPWR로 설정합니다. 첫 DC-capable slave가 reference로 연결됩니다. BRD 한 번으로 각 slave의 개별 시간을 수집하는 절차가 아닙니다.

주기 통신의 [ethercatmain.c](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/soem/ethercatmain.c)는 reference의 system time을 읽고 전파하는 FRMW datagram을 붙입니다. `ec_DCtime`은 reference system time의 관측값이며 slave 간 동기 오차 그 자체가 아닙니다. SYNC0 이벤트·각 장치 offset·외부 계측을 함께 보아야 실제 동기 오차를 검증할 수 있습니다. DC도 deadline을 넘긴 process data를 제때 도착시켜 주지는 않습니다.

## TDMA — 시간 슬롯 분할

POWERLINK와 SERCOS III가 쓰는 방식입니다. 한 사이클을 *고정 슬롯*으로 나눕니다.

![POWERLINK Cycle (1 ms)](/images/blog/industrial-ethernet/diagrams/ch02-powerlink-cycle.svg)

`SoC` (Start of Cycle)는 *모든 노드의 시계를 맞추는 동기 신호*를 겸합니다. Isochronous 단계에서는 마스터(MN)가 각 슬레이브(CN)에게 *PReq*를 보내고, 슬레이브가 *PRes*로 응답합니다. *고정 순서*입니다. 끝나면 Asynchronous 단계로 일반 IP 트래픽이 흐릅니다.

TDMA의 장점은 *결정성이 명시적*이라는 점입니다. 어느 시각에 어느 노드가 송신하는지 *config에 박혀* 있습니다. 단점은 *유연성 부족*입니다. 노드를 추가/제거할 때마다 *전체 스케줄을 재계산*해야 합니다.

## 동기 방식 비교

| 메커니즘 | 구별할 점 |
|---|---|
| IEEE 1588 PTP | profile·E2E/P2P·timestamp 모드·servo |
| EtherCAT DC | ESC register와 reference clock·SYNC 이벤트 |
| IEEE 802.1AS | 해당 timing profile과 bridge 지원 |

동기 표준의 이름만으로 같은 정확도나 clock domain을 가정하지 않습니다.

## 자주 하는 실수

### "PREEMPT_RT와 하드웨어 timestamp가 있으면 정확도가 보장된다"

두 기능은 host scheduling과 timestamp 변동을 줄이는 서로 다른 수단입니다. Clock domain·profile·경로 비대칭·servo와 실제 event 시점을 별도로 검증해야 합니다. 사용 중인 망을 측정했다는 기록 없이 ns 정확도를 제시하면 안 됩니다.

### "PTP는 하드웨어이고 NTP는 소프트웨어다"

linuxptp는 software timestamp도 지원합니다. PTP 메시지를 사용한다는 것과 NIC hardware timestamp를 사용한다는 것은 다른 조건입니다. NTP/PTP라는 이름만으로 지연·정확도를 고정하지 않습니다.

### "스위치가 끼면 오차는 항상 일정 배수로 커진다"

스위치의 BC/TC 기능·queue 부하·경로 대칭과 해당 profile의 요구조건을 확인해야 합니다. 일반 switch도 허용 오차 안에서 작동하는지 측정할 수 있으며, BC/TC라는 이유만으로 손실이 0이라고 가정하지 않습니다.

### "관측 p99.9가 1 μs면 항상 1 μs 이내다"

표본 백분위는 보장 상한이 아닙니다. `ec_DCtime`도 reference clock 값이므로 slave 간 오차를 직접 나타내지 않습니다. 요구조건과 외부 계측을 포함한 검증 범위를 명시해야 합니다.

## 정리

- cycle·deadline·연산 시간의 정의를 구분하고 제어·통신 budget을 함께 설계합니다.
- 관측 백분위·관측 최대·보장 상한을 구별하고 jitter 정의를 명시합니다.
- 망 jitter는 *마스터 송신, 매체 전파, switch 큐, slave 처리* 네 원천의 합입니다.
- IEEE 1588 PTP는 *하드웨어 타임스탬프*로 sub-μs 동기를 달성합니다. Sync·Follow_Up·Delay_Req·Delay_Resp 네 메시지를 씁니다.
- SOEM v1.4.0의 DC 설정은 첫 DC-capable slave를 reference로 사용하며, PTP와 다른 register·datagram 흐름입니다.
- TDMA(POWERLINK·SERCOS III)는 *시간 슬롯*으로 hard 트래픽과 best-effort를 분리합니다.
- BC/TC 기능의 필요성과 정확도는 profile·topology·허용 오차를 기준으로 확인합니다.
- PTP 지원·하드웨어 timestamp·PREEMPT_RT 중 어느 하나도 동기 정확도나 deadline을 단독으로 보장하지 않습니다.

다음 편은 **Ch 3: EtherCAT 아키텍처 — Processing on the Fly**입니다. 슬레이브가 어떻게 프레임을 *통과시키면서* 데이터를 읽고 쓰는지, FMMU와 Sync Manager가 무엇인지 풀어봅니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity) — PTP 패킷 처리를 RT core로 고정
- [원문 — IEEE 1588-2019 PTP](https://standards.ieee.org/standard/1588-2019.html)
- [원문 — linuxptp project](https://linuxptp.sourceforge.net/)
