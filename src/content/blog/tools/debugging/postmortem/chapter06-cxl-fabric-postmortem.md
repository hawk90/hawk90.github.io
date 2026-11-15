---
title: "CXL Fabric Postmortem — 분산 디바이스·Multi-Host Pool 장애 추적"
slug: "tools/debugging/postmortem/chapter06-cxl-fabric-postmortem"
date: 2026-06-18T09:08:00
description: "CXL 2.0/3.x fabric에서 multi-host pooled 디바이스 fail 분석 — Fabric Manager log·LD 상태·cross-host correlation."
series: "Postmortem Debugging"
seriesOrder: 6
tags: [cxl, fabric, postmortem, multi-host, pooling, fabric-manager]
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 한 host의 vmcore만으로는 부족한가

Fabric 장애에서는 host의 kernel object, device·switch 상태, Fabric Manager의 제어 기록이 서로 다른 곳에 있습니다. 이 글은 [CXL3.1의 FM·pooling·DC·HDM-DB 정의](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)와 Linux6.12의 CXL trace source를 대조한 **수집·가설 검증 계획**입니다. 실제 multi-host 장애를 재현한 보고서가 아닙니다.

[Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)의 vmcore 순회는 그 host의 software 상태에 한정됩니다. FM이 반드시 out-of-band라는 가정, vmcore에 모든 BISnp count·memory read/write 이력이 있다는 가정, 존재하지 않는 helper/command를 쓰지 않습니다.

## 사건을 연결할 식별자와 자료

| 자료 | 함께 보존할 식별·조건 | 자료가 없을 때 판단할 수 없는 것 |
|------|------|------|
| Host vmcore·kernel log | host·boot ID, kernel/build, dump coverage | 전체 device 상태·다른 host의 실행 |
| FM log·DB snapshot | fabric·device·LD, allocation generation·request/ack | 실제 host 사용·완료되지 않은 제어 요청 |
| Switch·device log·snapshot | port·LD, firmware·reset generation, 수집 시각 | 과거 전체 route·잃어버린 event |
| CEDT/CFMWS·decoder map | host HPA, target DPA, interleave와 유효 구간 | host 간 같은 HPA가 같은 memory인지 |
| Workload·RAS·monitoring | address 의미, actor, policy·counter 단위 | 접근 주체·원인·시간 순서 |

HPA는 host 주소 공간입니다. 서로 다른 host의 같은 숫자가 같은 physical data를 뜻하지 않습니다. 반대로 같은 device 용량에 다른 LD·generation이 연결될 수 있으므로 주소·owner만 비교하지 않습니다. 제어 plane 요청과 완료 ack, 실제 OS online·workload 사용 시점도 구분합니다.

## 시간 정렬 — 숫자 정렬과 인과 순서는 다릅니다

[crash의 sys 문서](https://crash-utility.github.io/help_pages/sys.html)는 system 정보를 설명하지만 가상의 `ptime`·`PROC TIME` 출력을 제공하지 않습니다. 이전 문서의 해당 command·출력은 제거했습니다. Boot-relative log timestamp를 다른 host의 UTC나 RTC와 바로 빼지 않습니다.

각 source의 time scale·boot/session ID, 측정한 offset·drift·오차 범위, 동기화 중단·clock step·log 지연을 기록합니다. [linuxptp의 ptp4l](https://www.linuxptp.org/documentation/ptp4l/)도 hardware/software timestamp와 topology 설정을 구분합니다. PTP를 켰다는 사실로 µs 정확도, GPS/PPS라는 이름으로 ns 정확도를 보장하지 않습니다.

서로 공통 시각으로 변환할 근거가 있으면 event 시각을 하나의 숫자 대신 가능한 구간으로 비교할 수 있습니다. 아래는 **이미 정규화한 nanosecond 구간**의 관계만 보는 함수이며 clock synchronization 구현이 아닙니다.

```js title="event-window-order.mjs"
export function eventOrder(a, b) {
  for (const event of [a, b]) {
    if (event === null || typeof event !== 'object' ||
        typeof event.lo !== 'bigint' || typeof event.hi !== 'bigint' ||
        event.lo > event.hi)
      throw new TypeError('ordered bigint interval required');
  }
  if (a.hi < b.lo) return 'before';
  if (b.hi < a.lo) return 'after';
  return 'undetermined';
}
```

합성 event에서 명확한 선후·겹치는 오차 구간·맞닿은 경계·큰 timestamp와 잘못된 입력을 실행했습니다. 구간이 겹치면 중앙 timestamp 순서가 있어도 선후를 확정하지 않습니다. 구간이 분리돼도 시간적 선후는 인과의 증명이 아니므로 request ID·generation·독립 자료를 함께 확인해야 합니다.

## 시나리오별 가설과 반증 조건

### 1. Switch·공통 경로 실패

여러 host의 비슷한 시각 오류는 공통 경로 가설의 단서입니다. 실제 routing과 영향을 받은 port/device를 확인하고 switch 전원·firmware·upstream port·reset 사건을 비교합니다. 모든 host가 반드시 동시에 같은 AER를 보고하거나 switch 원인이라고 단정하지 않습니다. 영향을 받지 않은 경로·host가 반증 표본이 됩니다.

### 2. LD·capacity 소유권 전이 문제

CXL2.0 pooling, CXL3.x sharing, Dynamic Capacity의 사용 모델을 구분합니다. Owner ID가 두 개 보인다는 이유만으로 corruption을 확정하지 않습니다. 동일 resource·generation의 허용 정책, quiescence·unbind/재할당·decoder·OS online·DMA 잔존을 대조합니다. 의도된 sharing과 금지된 중복 소유는 다른 사건입니다.

Linux6.12 [CXL core trace source](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/trace.h)의 RAS·poison·event 등 관측점을 임의의 `cxl_mem read/write` 전수 추적으로 바꾸지 않습니다. CPU load/store가 kernel driver를 매번 통과하는 것도 아닙니다. 실제 거래 이력이 필요하면 지원 device·switch telemetry나 analyzer의 범위·loss·수집 설정이 필요합니다.

### 3. Coherency·tail latency 문제

BISnp는 관련 HDM-DB·back-invalidation 구성과 의미를 확인해야 하며 모든 Type3·multi-host pool에 같은 coherent sharing을 가정하지 않습니다. Vmcore나 bpftrace에서 모든 flit·BISnp count를 자동 복원할 수 있다고 쓰지 않습니다.

Protocol·counter 정의, 실제 shared address·owner·access pattern과 workload trace를 연결합니다. Padding·NUMA-local 할당이 가능한 후보일 수 있어도 장애 원인과 개선 효과는 같은 workload의 비교 증거가 있어야 합니다.

### 4. FM process·database 장애

FM unavailable 시 기존 data plane이 계속 동작하는지는 구현·작업 단계·lease·recovery 정책에 달려 있습니다. FM core·durable request/ack·DB generation·실제 port/LD 상태를 맞추기 전에 DB를 복원·재할당하는 것을 일반 해법으로 제시하지 않습니다. Failover의 재실행·중복 요청·부분 완료도 조사합니다.

## drgn과 외부 자료의 경계

한 host의 kernel 구조를 읽는 helper가 전체 fabric의 모든 owner·route·coherency domain을 제공하는 것은 아닙니다. 이전의 `walk_cxl_logical_devices()`와 가정한 member는 실제 API가 아니어서 제거했습니다. Matching build의 구조·dump coverage를 확인한 host 결과와 FM/device snapshot을 외부 식별자로 연결합니다.

Lustre·Ceph·OpenTelemetry는 각자의 관측 시스템입니다. 이름을 나열하거나 확인하지 않은 LWP 도구를 붙인다고 CXL transaction trace가 생기지 않습니다. 실제 adapter·event schema·clock mapping을 검증한 자료만 사용합니다.

## 분석 체크리스트와 결론의 범위

| 단계 | 남길 결과 | 결론을 보류할 조건 |
|------|------|------|
| Evidence 보존 | 원본 hash·수집자·source·generation | 장애 뒤 reset·재할당으로 원본 상태 변경 |
| ID·주소 mapping | HPA/DPA·LD·port·allocation 유효 구간 | 같은 숫자만 있고 decoder map 없음 |
| 시간 비교 | time scale·오차 구간·clock 변경 기록 | 오차가 사건 간격보다 큼 |
| 가설 대조 | 영향/비영향 표본·대안·반증 | 단일 log 부재만으로 FM down 확정 |
| 복구·재사용 | 소유권·잔류 접근·정리 완료 증거 | 요청 ack만 있고 실제 teardown 미확인 |

전송되지 않은 log, 필터링된 dump page, polling 사이에 바뀐 상태는 검출 없음과 다릅니다. 수집 가능한 자료부터 가설을 좁히고 확인된 사실·가능한 원인·미확인 범위를 따로 남깁니다. 이 장의 실행은 합성 시각 구간 계산에 한정되며 실제 FM·switch·host·vmcore 장애나 복구 시험을 수행하지 않았습니다.

## 시리즈 마무리

이 시리즈는 core 형식·debugger·자동화·CXL 객체·분산 자료의 관찰 경계를 연결했습니다. 모든 사후 분석 영역이나 실제 fabric 운영 검증을 마쳤다는 뜻은 아닙니다.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 4: 포스트모템 자동화](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)
- [Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
