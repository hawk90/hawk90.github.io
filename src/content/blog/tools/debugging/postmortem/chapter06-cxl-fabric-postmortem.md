---
title: "CXL Fabric Postmortem — 분산 디바이스·Multi-Host Pool 장애 추적"
date: 2026-06-18T09:08:00
description: "CXL 2.0/3.x fabric에서 multi-host pooled 디바이스 fail 분석 — Fabric Manager log·LD 상태·cross-host correlation."
series: "Postmortem Debugging"
seriesOrder: 6
tags: [cxl, fabric, postmortem, multi-host, pooling, fabric-manager]
draft: false
---

## 왜 fabric 분석은 어려운가

[Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)에서 *단일 호스트의 단일 디바이스* postmortem을 봤습니다. CXL 2.0 pooling·CXL 3.0 fabric에서는 *한 호스트의 vmcore만으로는 부족*합니다.

복잡도가 커지는 이유:
- 같은 디바이스가 *여러 호스트에 attach*되어 있음
- *Fabric Manager (FM)*가 *out-of-band*로 관리하므로 vmcore에 안 잡힘
- 호스트 vmcore들의 *시간 동기화 안 됨*
- *Switch의 상태*가 호스트 vmcore에 없음
- *Coherency domain ID·routing*이 fabric 토폴로지에 의존

## Fabric의 추가 자료

분석에 필요한 *5가지 별도 자료*:

| 자료 | 출처 | 내용 |
|------|------|------|
| FM log | Fabric Manager 자체 | 모든 control plane 이벤트 |
| LD 할당 이력 | FM database | host A → B로 transfer 시점 |
| Switch routing 테이블 | switch CLI export | fabric 토폴로지 snapshot |
| Coherency domain ID | CFMWS·CEDT | 어느 host가 어느 영역 owning |
| Each host vmcore | 각 호스트 kdump | 호스트별 시각 |

이 *5가지를 시간 동기화*해야 *전체 그림*이 나옵니다.

## Multi-Host 시간 동기화

호스트 vmcore들의 *각자 다른 시간*을 *정렬*하는 게 첫 단계.

| 시간 source | 정확도 |
|-------------|--------|
| NTP (Network Time Protocol) | 1~10 ms |
| PTP (Precision Time Protocol) | µs |
| GPS PPS | ns |
| HW timestamp register | local |

fabric 환경은 *최소 PTP* 권장. *NTP 1ms 오차*가 *root cause 추정에 결정적*일 수 있음.

```bash
# vmcore 시간 추출
$ crash> ptime
PROC TIME: 1719724823.501234567

# RTC와 비교
$ crash> sys
RUNTIME: 142d 12h 35m 21s
DATE: ...
```

각 vmcore의 *PROC TIME과 RTC*를 비교해 *공통 timeline*에 매핑.

## 시나리오 1 — Switch Failure

*Switch가 down되면* 모든 attached host가 *동시 실패*.

증상:
- Host A, B, C, D 모두 *같은 시점*에 CXL device access 실패
- 각 host의 *AER + cxl_pci err handler*가 동시 trigger
- FM log에 *switch port down 이벤트*

분석 흐름:
1. 각 host vmcore의 *마지막 cxl 메시지 timestamp* 추출
2. 시간 정렬해 *동시 발생 확인*
3. FM log에서 *switch event* 매치
4. Switch의 *self-diagnostic*에서 root cause (전원·과열·firmware)

## 시나리오 2 — LD 충돌

*같은 LD를 두 host가 동시 owning*하면 *데이터 corruption*:

증상:
- Host A에 보이는 메모리에 *예상치 못한 데이터*
- Host B에 보이는 같은 영역도 *손상*
- 두 host의 kernel은 *normal*로 보임

분석:
1. FM log에서 *LD allocation history* 추출
2. Allocation 중복 시점 식별
3. 각 host의 *write timeline* 매치 (cxl_mem read/write tracepoint)
4. Corrupted data pattern 분석

## 시나리오 3 — Cache Invalidation 폭증

CXL 3.0 coherent fabric에서 *cache line ping-pong*:

증상:
- 평균 throughput 정상이지만 *p99 latency 폭증*
- 결국 *watchdog timeout* 또는 *workload stall*
- bpftrace로 *snoop 빈도* 측정해야 보임

분석:
1. 각 host vmcore의 *BISnp 메시지 count*
2. 같은 *cache line address*가 *여러 host에서 자주 invalidate*되는 패턴
3. Workload code의 *shared 자료구조* 식별
4. 일반 해결: cache line *padding* 또는 *NUMA-local 할당*

## 시나리오 4 — Fabric Manager 자체 Failure

FM이 다운되면 *동적 작업 정지*:

증상:
- 기존 할당은 정상 동작
- *Hot-plug·재할당 불가*
- 새 LD 할당 요청 무응답

분석:
1. FM 자체 *process core dump* 분석
2. FM database의 *consistency 확인*
3. FM redundancy (active-passive)가 있다면 *failover 동작 검증*
4. 복구: FM 재시작 + database 복원

## drgn 확장 — Fabric Helper

drgn helper로 fabric 분석 (개념적 예시 — *실 helper API는 drgn 및 kernel 버전 의존*):

```python
# drgn fabric 분석의 일반 패턴
from drgn import Object

# Logical Device 객체 열거 — 실제는 kernel struct를 직접 walk
# kernel 6.x mainline에 cxl_fabric helper가 없으면 자체 walker 작성
for ld_obj in walk_cxl_logical_devices(prog):
    print(f"LD owner_host={ld_obj.owner_host_id}, " +
          f"domain={ld_obj.coherency_domain}")
```

CXL fabric용 drgn helper는 *mainline에 아직 없음*. *자체 walker*를 *drgn primitive*(struct member access, list traversal)로 구현해야 합니다.

## Correlation 도구

분산 시스템의 *시간 상관 분석 기법*을 CXL에 적용:

| 도구 | 용도 |
|------|------|
| Lustre LDLM tracing | 분산 lock 분석 |
| Ceph osd debug log | object access 추적 |
| Jaeger·OpenTelemetry | distributed trace |
| LWP (Lustre Workload Profiler) | I/O timeline |

CXL fabric은 *Lustre/Ceph 분산 trace 기법*과 *유사한 접근*. *centralized logging*이 *핵심 인프라*.

## 모범 사례

운영에서 fabric postmortem이 *가능하게* 하려면:

| 영역 | 권장 |
|------|------|
| 시간 동기화 | PTP 필수, GPS 권장 |
| Logging | Fluentd·Loki 같은 *centralized log* |
| Tracing | bpftrace로 *CXL 이벤트 항상 수집* |
| FM monitoring | active-passive redundancy + DB 복제 |
| Snapshot | switch routing 표 *주기적 export* |
| Drill | *FM down·switch failure 모의 훈련* |

postmortem은 *사후 분석*. 사전에 *수집 인프라*를 구축해야 *실 사건에서 분석 가능*.

## 분석 체크리스트

Fabric postmortem 시 *순서*:

1. *모든 affected host의 vmcore 수집*
2. *FM log* + *FM database snapshot* 확보
3. *Switch routing 표 export*
4. *PTP 기반 시간 정렬* (CSV로 timeline)
5. 각 host vmcore에서 *마지막 cxl 이벤트* 추출
6. *공통 timeline*에 매핑
7. *동시 발생 패턴* 식별 (switch failure·LD 충돌 등)
8. *Root cause hypothesis* 형성
9. *추가 자료*로 검증 (FM log, bpftrace history)
10. *복구·재발 방지 계획*

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| Host vmcore들 timestamp가 ms 단위 차이 | NTP 사용. PTP로 업그레이드 |
| FM log에 event 없는데 host들 fail | FM 자체 down — FM core 확인 |
| 같은 LD가 두 owner ID | FM allocation race — DB consistency 확인 |
| Switch routing 표 export 불가 | switch firmware 미지원 — OOB management 필요 |
| Cache invalidation 패턴 보임 | shared data 구조 — workload code 점검 |
| Workload Process core dump 정상 | kernel level 문제 — vmcore 봐야 |
| drgn에 cxl helper 없음 | kernel 6.5+ 필요 또는 자체 helper |
| 분산 lock 이상 | 단일 host 단위 문제 — 호스트별 분석 |
| FM database corruption | 백업 복원 + manual reconcile |
| Timeline에 hole | 일부 host vmcore 손실 — 가능한 만큼 분석 |

## 정리

- CXL fabric postmortem은 *한 host vmcore가 부족*. *최소 5가지 자료* 필요.
- *시간 동기화*가 첫 단계. *PTP 권장*.
- 4가지 typical 시나리오: *Switch failure·LD 충돌·Cache invalidation 폭증·FM failure*.
- *drgn helper*로 fabric 객체를 *Python으로 분석* (mainline 추가 진행 중).
- *centralized logging·FM redundancy·routing snapshot*이 *사전 인프라*. 사후엔 늦음.
- 분석 체크리스트 10단계로 *체계적 진행*.

## 시리즈 마무리

Postmortem Debugging 시리즈가 *Core Dump 생성 → ELF Core 포맷 → GDB 분석 → debuginfod·Minidump 자동화 → CXL 디바이스 → CXL Fabric*까지 *모든 사후 분석 영역*을 *흐름으로 완성*했습니다.

CXL 관련 다음 깊이는 *기존 다른 시리즈*의 *CXL 챕터*로 자연 연결됩니다. *분산 추가된 모든 CXL 챕터*가 *서로 참조*하는 *네트워크 구조*입니다.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 4: 포스트모템 자동화 — debuginfod·Minidump 파이프라인](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)
- [Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
