---
title: "리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영"
slug: "embedded/protocols/industrial-ethernet/chapter11-linux-realtime"
date: 2026-05-13T09:11:00
description: "Linux 산업 통신의 wakeup 지연·CPU/IRQ 배치·NIC 경로와 EtherCAT deadline을 구분하고, 측정 조건과 overrun 처리를 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 11
tags: [linux, preempt-rt, xenomai, ethercat-driver, cyclictest, isolcpus]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **Linux의 타이머 wakeup 지연, 애플리케이션 실행 시간과 통신 완료 시간은 서로 다른 값입니다. PREEMPT_RT와 cyclictest만으로 전체 제어 deadline을 증명하지는 못합니다.**

이 장에서는 Linux 기반 산업 통신을 검증할 때 측정해야 할 경계를 나눕니다. 설명 기준은 Linux v6.12와 rt-tests v2.6이며, EtherCAT API는 IgH 1.6 문서와 대조합니다. 아래에는 이 글에서 얻지 않은 cyclictest 측정 로그나 “50 μs 이하면 생산 가능” 같은 보편 합격 기준을 싣지 않습니다.

설정 순서는 지연의 원인을 찾아 필요한 변경을 하나씩 검증하는 방향입니다. 모든 설비에 같은 부트 옵션과 NIC 값을 복사하거나 보안 완화·전력 관리를 일괄 해제하는 방식은 근거가 부족합니다. 마스터 구현의 API 흐름은 [Ch 5](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)를 함께 참고합니다.

## 먼저 측정 경계를 정하기

| 측정 경계 | 무엇을 포함하는가 | 추가로 필요한 증거 |
|---|---|---|
| 목표 wakeup→실제 wakeup | 타이머와 스케줄링 지연 | 부하·실행 정책·CPU 배치 |
| wakeup→송신 요청 | 애플리케이션과 마스터 처리 | 최악 실행 시간과 blocking |
| 송신 요청→실제 선로 송신 | driver·큐·NIC 경로 | 실제 경로의 timestamp나 외부 관측 |
| 선로 송신→유효 입력 수신 | 네트워크와 장치 응답 | 토폴로지·슬레이브·WKC/status |
| 전체 제어 반응 | 계산·통신·IO 갱신 | 제어 요구와 장애 시 반응 조건 |

예를 들어 250 μs 주기에서 wakeup 지연이 18 μs였다고 해도 나머지 구간이 얼마인지 알 수 없습니다. 평균이 낮아도 드문 spike나 데이터 유효성 문제를 놓칠 수 있습니다. 반대로 주기와 deadline이 항상 같은 것도 아니므로 요구를 먼저 명시해야 합니다.

## PREEMPT_RT와 실행 정책

Linux v6.12는 mainline에서 PREEMPT_RT 구성을 사용할 수 있는 기준입니다. 실제 활성화 가능 여부는 architecture와 배포 커널 구성으로 확인합니다. 커널 버전 문자열에 6.12가 있다는 사실만으로 `CONFIG_PREEMPT_RT=y`를 증명하지 않습니다.

[Linux v6.12 lock 문서](https://kernel.org/doc/html/v6.12/locking/locktypes.html)는 PREEMPT_RT에서 `spinlock_t` 등의 동작이 달라지는 점을 설명합니다. `raw_spinlock_t`를 포함한 모든 구간이 선점 가능해지는 것은 아닙니다. 또한 RCU grace period가 길다는 사실을 곧바로 같은 길이의 비선점 구간으로 해석하지 않습니다.

`SCHED_FIFO`는 일반 스케줄링과 다른 실행 정책이며 우선순위·권한·RT throttling과 다른 스레드의 관계를 고려해야 합니다. 우선순위를 무조건 99로 올리면 NIC IRQ thread나 필요한 보조 작업의 진행을 방해할 수도 있습니다. 정책 변경과 affinity·memory lock의 반환값을 확인하고, 실패한 상태로 RT 실행을 시작하지 않도록 합니다.

`mlockall()`은 메모리 상주에 도움을 주지만 모든 종류의 page fault나 지연을 제거하지는 않습니다. stack과 미리 사용할 메모리를 준비하고, 동적 할당·동기 IO·lock 경합을 실제 실행 경로에서 줄여야 합니다. `MCL_FUTURE`와 자원 제한 때문에 이후 할당이 실패할 수도 있으므로 그 경로도 처리합니다.

## CPU·IRQ 배치는 하나의 고정 처방이 아닙니다

[커널 파라미터 문서](https://docs.kernel.org/6.12/admin-guide/kernel-parameters.html)는 각 옵션의 조건을 구분합니다. 아래는 효과를 읽는 요약이며, 완전한 격리를 보장하는 부트 문자열이 아닙니다.

| 항목 | 목적 | 남는 확인 사항 |
|---|---|---|
| cpuset·thread affinity | 작업이 실행할 CPU를 제한합니다. | housekeeping과 보조 스레드 배치 |
| `isolcpus` | 지정한 scheduling domain 등의 간섭을 줄입니다. | 문서가 deprecated로 안내하는 domain 격리 대신 cpuset 검토 |
| `nohz_full` | 조건을 만족하는 CPU의 주기 tick을 줄입니다. | 모든 timer·IRQ가 사라지는 것은 아닙니다. |
| `rcu_nocbs` | RCU callback 실행을 offload합니다. | callback 처리 스레드의 위치와 부하 |
| `irqaffinity` | 기본 IRQ affinity를 지정합니다. | managed IRQ·driver·irqbalance의 실제 배치 |

NIC IRQ를 애플리케이션 CPU에 둘지 다른 CPU에 둘지는 경로와 우선순위, cache·NUMA 조건으로 결정합니다. 한쪽이 항상 정답은 아닙니다. “모든 IRQ가 housekeeping으로 강제 이동한다”는 전제 대신 실제 `/proc/interrupts`와 affinity를 읽습니다.

전력·주파수 설정도 부하, 열과 전력 예산을 포함해 비교합니다. idle polling이나 깊은 sleep 제한이 모든 wakeup 지연을 0으로 만들지는 않습니다. 펌웨어·SMI 등을 의심할 때도 측정 시각과 원인 증거를 연결해야 하며, 원인을 확인하기 전에 BIOS 기능을 일괄 해제하지 않습니다.

## cyclictest: 횟수와 시간 조건 맞추기

[rt-tests v2.6의 실제 parser](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.c?h=v2.6)는 `--loops`, `--duration`, `--interval` 등을 처리합니다. 이 판에는 예전 예제의 `-n` 옵션을 사용하지 않습니다. `--interval`의 단위는 μs이며 여러 thread를 쓸 때는 interval 간격 옵션도 확인해야 합니다.

아래는 **Linux 실험 장치에서 사용할 명령 예**입니다. CPU 2가 online이고 사용할 수 있어야 하며, 필요한 권한과 RT 우선순위 정책을 먼저 확인합니다. 이 글의 host 검증에서 명령을 실행하거나 시스템의 scheduling·전력 정책을 바꾸지는 않았습니다.

```bash title="cyclictest-count-example.sh"
cyclictest --affinity=2 --threads=1 --priority=80 \
  --interval=250 --loops=200000 --mlockall --quiet
```

200,000회 × 250 μs는 명목상 **50초**입니다. 실제 시작·종료 처리와 지연이 있으므로 wall time을 정확히 50초라고 보장하지는 않습니다. 1시간을 기준으로 종료하려면 횟수 조건과 혼동하지 말고 별도로 지정합니다.

```bash title="cyclictest-duration-example.sh"
cyclictest --affinity=2 --threads=1 --priority=80 \
  --interval=250 --duration=1h --mlockall --quiet
```

명목상 1시간에는 14,400,000개의 250 μs 간격이 들어갑니다. 실제 관측 loop 수와 종료 조건은 로그로 기록해야 합니다. 200,000회 실험의 출력처럼 14,400,000회를 붙이면 다른 실험을 섞은 것입니다.

cyclictest의 실행 자체도 RT 정책과 memory lock, 전력 지연 요청 등에 영향을 줄 수 있습니다. 단순한 읽기 전용 상태 조회와는 다릅니다. 측정 보고에는 kernel/config, CPU·SMT·NUMA, BIOS·firmware, 부하, clock, 정책·affinity·우선순위, 측정 시간과 실패·누락을 남깁니다.

유휴 상태와 대표 부하를 나누어 비교하고, 통신과 저장장치·IRQ 부하가 겹치는 조건도 포함합니다. 한 시간 관측 최대값은 그 실험의 최대값입니다. 실험 시간을 늘렸다는 이유로 미관측 최악값의 수학적 상한이나 제품 합격을 선언하지 않습니다.

## Overrun 이후의 deadline 계산

절대 시각 sleep은 상대 sleep의 누적 drift를 줄이는 수단입니다. Linux의 `clock_nanosleep()`을 `TIMER_ABSTIME`으로 사용할 때 `EINTR`이면 같은 목표 시각으로 재시도하고 다른 오류도 처리해야 합니다. 이미 deadline을 넘었다면 다음 목표를 어떻게 잡을지도 정해야 합니다.

다음 코드는 **늦은 release를 건너뛰고 엄격히 미래인 다음 release를 선택하는 산술 예제**입니다. 실제 시계·sleep·EtherCAT 통신을 호출하지 않습니다. 제어기에서 누락 시 멈춰야 하는지, 데이터를 유지해야 하는지는 별도 정책이며 이 함수가 정하지 않습니다.

```c title="periodic-next-deadline.c"
#include <stdbool.h>
#include <stdint.h>

bool next_deadline(uint64_t previous, uint64_t now, uint64_t period,
                   uint64_t *next, uint64_t *skipped) {
    if (!next || !skipped || next == skipped || period == 0 ||
        now < previous || previous > UINT64_MAX - period) {
        return false;
    }
    uint64_t candidate = previous + period;
    uint64_t count = 0;
    if (now >= candidate) {
        uint64_t quotient = (now - candidate) / period;
        if (quotient == UINT64_MAX) return false;
        count = quotient + 1;
        if (count > (UINT64_MAX - candidate) / period) return false;
        candidate += count * period;
    }
    *next = candidate;
    *skipped = count;
    return true;
}
```

시간 단위를 모두 ns로 두면 `previous=1000`, `period=250`, `now=1100`에서 다음 release는 1250이고 skipped는 0입니다. `now=1750`이면 1250·1500·1750을 건너뛰어 2000을 선택하고 skipped는 3입니다. 목표와 정확히 같을 때도 건너뛰는 예제 정책임을 명시합니다.

오류 시 출력 인자는 바뀌지 않습니다. 너무 늦어서 미래 값을 표현할 수 없으면 wrap하지 않고 실패합니다. 실제 구현에서는 monotonic clock의 단위 변환, 종료·재시작과 누락 처리까지 별도로 설계해야 합니다.

## NIC와 마스터 경로 확인

NIC 튜닝은 사용하는 경로에 맞춰야 합니다. 일반 socket/NAPI, raw Ethernet과 전용 driver는 같은 경로가 아닙니다. GSO/TSO는 주로 segmentation 경로와 관련되므로 모든 EtherCAT 프레임 지연의 공통 원인으로 단정하지 않습니다.

| 변경 후보 | 검증할 조건 |
|---|---|
| ring 크기 축소 | 지연 감소와 burst에서의 drop 증가를 함께 확인합니다. |
| coalescing 조정 | driver 지원, 적응형 동작, IRQ 부하와 수신 지연을 확인합니다. |
| IRQ affinity | 애플리케이션과 IRQ thread의 위치·우선순위·NUMA를 비교합니다. |
| busy polling | 적용 socket·driver 경로와 CPU 비용을 확인합니다. IRQ 자체를 없앤다는 뜻은 아닙니다. |
| launch-time·Qbv | NIC 기능, driver와 qdisc 모드를 구분합니다. 두 기능을 같은 이름으로 부르지 않습니다. |

아래는 상태를 읽는 명령 예입니다. 실제 interface와 IRQ 번호를 확인한 뒤 해당 자료를 수집합니다. 특정 ring 크기 64, coalescing 0, txqueuelen 0을 보편적인 생산 설정으로 지정하지 않습니다.

```bash
uname -r
cat /proc/cmdline
cat /proc/interrupts
ethtool -i ethLAB
ethtool -g ethLAB
ethtool -c ethLAB
ethtool -k ethLAB
```

## IgH EtherCAT: 설정 수락과 유효 IO

[IgH 1.6 API 문서](https://docs.etherlab.org/ethercat/1.6/doxygen/ecrt_8h.html)는 master 요청에 `ecrt_request_master()`를 제공합니다. 이를 존재하지 않는 `ec_master_open` API로 안내하지 않습니다. userspace 라이브러리·kernel module·driver와 커널의 호환 조건도 함께 확인합니다.

| 단계 | 확인할 API·상태 |
|---|---|
| 구성 | master·domain·slave config 생성 결과와 PDO 등록 |
| 활성화 | `ecrt_master_activate()` 결과와 process data 포인터 |
| 수신 처리 | `ecrt_master_receive()`, `ecrt_domain_process()` |
| 유효성 판단 | domain WKC와 slave/application 상태 |
| 송신 | 출력 갱신, `ecrt_domain_queue()`, `ecrt_master_send()` |
| 종료·오류 | 출력 정책과 master 자원 해제 |

이 순서는 완성된 제어 프로그램이 아닙니다. 실제 identity·PDO map·상태 감시·반환값·DC 설정이 없는 루프를 복사해서 출력 장치를 구동하지 않습니다. `generic` driver나 특정 Intel driver 이름만으로 모든 NIC·kernel에서 지원된다고 가정하지 않습니다.

실제 통신 시험에서는 wakeup 로그와 송수신 시각, WKC/status, slave 상태와 애플리케이션의 deadline miss를 같은 실행 조건으로 연결합니다. cyclictest 결과가 좋아도 실제 통신이 실패하면 남은 경로의 증거를 모읍니다. IRQ·메모리·네트워크·장치 지연을 한 숫자에 섞지 않는 것이 목적입니다.

## 정리

- PREEMPT_RT 활성화와 전체 통신 deadline 검증은 별개입니다.
- CPU·IRQ·메모리·전력·NIC 설정은 실제 실행 경로와 부하로 비교합니다.
- cyclictest의 판과 옵션, 횟수·기간·단위를 일치시킵니다.
- 측정 최대값과 보장 상한을 구분하고, 임의의 생산 합격 기준을 두지 않습니다.
- 절대 시각 sleep과 별도로 overrun·종료·데이터 누락 정책을 설계합니다.
- EtherCAT은 API 호출 성공뿐 아니라 유효 IO와 장치 상태도 확인합니다.

다음 [Ch 12: 프로토콜 비교와 선택](/blog/embedded/protocols/industrial-ethernet/chapter12-comparison)에서 실제 선정에 필요한 요구와 증거를 묶습니다.

## 관련 항목

- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Practical RTOS Internals: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [rt-tests v2.6 소스](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/?h=v2.6)
