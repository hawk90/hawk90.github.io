---
title: "리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영"
slug: "embedded/protocols/industrial-ethernet/chapter11-linux-realtime"
date: 2026-05-13T09:11:00
description: "Debian VM에서 일반 커널과 PREEMPT_RT 커널의 cyclictest를 유휴·부하 조건으로 돌려 VM 지연이 무엇을 보여 주고 무엇을 못 보여 주는지 구분하고, Linux v6.12 문서로 RT·CPU 격리 설정을, overrun 산술과 IgH API로 통신 주기의 경계를 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 11
tags: [linux, preempt-rt, xenomai, ethercat-driver, cyclictest, isolcpus]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **Linux의 타이머 wakeup 지연, 애플리케이션 실행 시간과 통신 완료 시간은 서로 다른 값입니다. PREEMPT_RT와 cyclictest만으로 전체 제어 deadline을 증명하지는 못합니다.**

[Ch 5](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)의 마스터 루프와 [Ch 10](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)의 MN 주기는 모두 Linux가 제때 깨워 줘야 돌아갑니다. Ch 10의 VM에서도 50 ms 주기의 SoC 간격이 32.9~65.6 ms로 흔들렸습니다. 이 장에서는 Linux 쪽 지연을 재는 방법을 보고, 그 측정이 무엇을 말해 주고 무엇은 말해 주지 못하는지 가립니다.

기준은 Linux v6.12 소스·문서와 rt-tests v2.6 소스이고, 실행은 Apple Silicon Mac의 QEMU/HVF 위 Debian 12 VM(vCPU 4)에서 했습니다. VM 숫자는 산업용 하드웨어의 지연이 아닙니다. 이 장의 실험은 그 차이를 보여 주려는 목적도 있습니다.

## 먼저 측정 경계를 정하기

지연을 재기 전에 어디서 어디까지를 잴지 정합니다. 택배 배송 시간을 말할 때 "주문부터 도착까지"인지 "출고부터 도착까지"인지 정하지 않으면 숫자를 비교할 수 없는 것과 같습니다.

| 측정 경계 | 무엇을 포함하는가 | 어떻게 재는가 |
|---|---|---|
| 목표 wakeup → 실제 wakeup | 타이머와 스케줄링 지연 | cyclictest |
| wakeup → 송신 요청 | 애플리케이션과 마스터 처리 | 루프 안 timestamp |
| 송신 요청 → 실제 선로 송신 | driver·큐·NIC 경로 | NIC hardware timestamp나 외부 캡처 |
| 선로 송신 → 유효 입력 수신 | 네트워크와 장치 응답 | WKC/status와 수신 timestamp |
| 전체 제어 반응 | 계산·통신·IO 갱신 | 입력 변화와 출력 변화를 같은 계측기로 |

cyclictest는 이 중 첫 줄만 잽니다. 250 μs 주기에서 wakeup 지연이 18 μs라도 나머지 네 줄이 얼마인지는 따로 재야 합니다.

## PREEMPT_RT와 실행 정책

Linux v6.12의 `kernel/Kconfig.preempt` 70~72행에서 `PREEMPT_RT`("Fully Preemptible Kernel (Real-Time)")는 `EXPERT && ARCH_SUPPORTS_RT`에 의존합니다. 같은 판에서 arm64(`arch/arm64/Kconfig` 105행), x86(`arch/x86/Kconfig` 128행), riscv(`arch/riscv/Kconfig` 68행)가 `ARCH_SUPPORTS_RT`를 select합니다. help 문구는 이 옵션이 spinlock·rwlock 같은 잠금을 선점 가능하고 priority inheritance를 지원하는 구현으로 바꾸고, 인터럽트를 스레드로 처리하게 만든다고 설명합니다.

커널 판 문자열만으로는 RT인지 알 수 없습니다. VM에 설치한 Debian의 두 커널을 보면 차이가 보입니다.

```text
$ uname -a
Linux localhost 6.1.0-56-rt-arm64 #1 SMP PREEMPT_RT Debian 6.1.192-2 (2026-11-16) aarch64 GNU/Linux
$ grep -E "^CONFIG_PREEMPT" /boot/config-$(uname -r)
CONFIG_PREEMPT_LAZY=y
CONFIG_PREEMPT_RT=y
CONFIG_PREEMPT_COUNT=y
CONFIG_PREEMPTION=y
CONFIG_PREEMPT_RCU=y
```

일반 커널 `6.1.0-56-arm64`의 config에는 `CONFIG_PREEMPT_VOLUNTARY=y`가 있고 `CONFIG_PREEMPT_RT`는 없었습니다.

[Linux v6.12 `locktypes.rst`](https://kernel.org/doc/html/v6.12/locking/locktypes.html)는 PREEMPT_RT에서 `spinlock_t`가 rt_mutex 기반 구현으로 바뀌어 선점을 끄지 않는다고 설명합니다. 반면 `raw_spinlock_t`는 "a strict spinning lock implementation in all kernels, including PREEMPT_RT kernels"입니다. 그래서 `raw_spinlock_t` 구간과 hard interrupt는 RT 커널에서도 선점되지 않고, 최악 지연은 그 길이보다 짧아질 수 없습니다.

`SCHED_FIFO` 우선순위는 높을수록 먼저 돌지만, 무조건 99로 올리면 같은 CPU의 NIC IRQ 스레드보다 위에 서서 자기가 기다리는 패킷 처리를 막을 수 있습니다. 위 Kconfig 설명대로 RT 커널은 인터럽트를 스레드로 돌리므로, 그 스레드의 우선순위도 설계 대상입니다. 메모리는 `mlockall(MCL_CURRENT | MCL_FUTURE)`로 swap되지 않게 고정합니다. cyclictest의 `--mlockall`도 같은 호출입니다(`cyclictest.c` 1885~1887행, 주석 "lock all memory (prevent swapping)").

## CPU·IRQ 배치

[v6.12 `kernel-parameters.txt`](https://docs.kernel.org/6.12/admin-guide/kernel-parameters.html)의 관련 옵션입니다.

| 항목 | 문서의 설명 |
|---|---|
| `isolcpus=` | "Isolate a given set of CPUs from disturbance. [Deprecated - use cpusets instead]". 기본 flag `domain`은 SMP balancing·scheduling에서 떼어 내며, 한 번 떼면 되돌릴 수 없다고 경고 |
| `nohz_full=` | `CONFIG_NO_HZ_FULL=y` 커널에서 지정 CPU의 tick을 가능할 때 멈춤. boot CPU는 범위에서 빠지고, 지정 CPU의 RCU callback도 offload |
| `rcu_nocbs=` | RCU callback을 해당 CPU 밖으로 offload |
| `irqaffinity=` | 기본 IRQ affinity mask |

`isolcpus`의 `nohz` flag 설명은 남는 1 Hz tick이 workqueue로 넘어가고, 기본적으로 global workqueue가 모든 CPU에서 돌므로 `/sys/devices/virtual/workqueue/cpumask`를 따로 설정해야 한다고 적습니다. 즉 부트 옵션 하나로 CPU가 완전히 조용해지지 않습니다. 격리가 실제로 됐는지는 `/proc/interrupts`의 CPU별 카운터가 늘지 않는지로 확인합니다.

## cyclictest: VM에서 돌려 본 것

cyclictest는 정해진 간격으로 `clock_nanosleep(..., TIMER_ABSTIME, ...)`으로 잠들었다가 실제로 깬 시각과 목표 시각의 차이를 잽니다(rt-tests v2.6 `src/cyclictest/cyclictest.c` 676행). v2.6의 long option 표(1018행부터)에 `--affinity`, `--duration`, `--interval`, `--loops`, `--mlockall`, `--priority`, `--quiet`, `--threads`가 있습니다. VM의 rt-tests는 Debian 12 패키지 2.4로, `--help`에 `-i INTV --interval=INTV base interval of thread in us`라고 나옵니다. 단위는 μs입니다.

같은 명령을 두 커널에서 부하 없이 한 번, `stress-ng --cpu 4 --hdd 2` 부하 아래에서 한 번, 각각 60초씩 돌렸습니다.

```bash
cyclictest --affinity=2 --threads=1 --priority=80 \
  --interval=250 --duration=60 --mlockall --quiet
```

| 커널 | 부하 | C (루프 수) | Min | Avg | Max |
|---|---|---:|---:|---:|---:|
| 6.1.0-56-arm64 (PREEMPT_VOLUNTARY) | 없음 | 223182 | 1 μs | 81 μs | 13081 μs |
| 6.1.0-56-arm64 | stress-ng | 186533 | 0 μs | 79 μs | 149763 μs |
| 6.1.0-56-rt-arm64 (PREEMPT_RT) | 없음 | 187909 | 1 μs | 134 μs | 50785 μs |
| 6.1.0-56-rt-arm64 | stress-ng | 160105 | 0 μs | 135 μs | 224003 μs |

표에서 VM 환경의 한계가 세 가지 보입니다.

1. **RT 커널이 최대값을 줄이지 못했습니다.** 부하 아래 최대는 RT 커널 쪽이 224 ms로 더 컸습니다. VM의 vCPU는 macOS host의 스레드이고, host가 그 스레드를 언제 돌릴지는 guest 커널이 정할 수 없습니다. guest의 PREEMPT_RT는 guest 안의 선점만 바꿉니다.
2. **루프 수가 모자랍니다.** 60초에 250 μs 간격이면 명목상 240,000번인데, 실제로는 160,105~223,182번이었습니다. rt-tests v2.6 `cyclictest.c` 801~805행은 깨어난 시각이 다음 목표를 이미 넘었으면 목표를 interval 단위로 계속 밀어 현재 시각 이후로 보냅니다. 한 번 크게 늦으면 그동안의 주기는 세지 않고 건너뜁니다.
3. **평균은 수십~백여 μs에 머무는데 최대는 평균의 약 160~1,900배까지 튑니다.** [Ch 1](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)의 ping 실험과 같은 모양입니다.

1번 때문에 이 숫자를 장비 성능으로 옮기면 안 됩니다. RT 커널의 효과를 재려면 bare metal이나 vCPU를 고정·전용으로 잡은 hypervisor에서 다시 재야 합니다.

### 횟수와 시간 조건

`--loops`와 `--duration`은 다른 조건입니다. RT 커널에서 `--loops=200000`으로 돌린 결과입니다.

```text
T: 0 (  421) P:80 I:250 C: 200000 Min:      1 Act:   61 Avg:  341 Max:  103065
```

200,000 × 250 μs는 명목상 50초입니다. 같은 VM에서 `--loops=20000`을 `time`으로 잰 실행은 명목 5.0초에 대해 `real 0m5.280s`가 걸렸습니다. 이 0.28초에는 프로세스 시작과 `mlockall` 시간도 들어 있지만, 늦어진 주기가 쌓이면 wall time은 명목값보다 길어집니다. 시간을 기준으로 끝내려면 `--duration`을 쓰고, 횟수 기준이면 wall time이 명목값보다 길어질 수 있음을 로그에 남깁니다.

출력 첫 줄의 `# /dev/cpu_dma_latency set to 0us`도 기억해 둡니다. cyclictest는 이 파일이 있으면 0을 써서 CPU가 깊은 idle 상태로 들어가지 않게 합니다(`cyclictest.c` 234행 주석). 측정하는 동안 시스템의 전력 동작이 바뀐다는 뜻이라, 평소 운영 상태와 같은 조건이 아닙니다.

## Overrun 이후의 deadline 계산

위 표의 Max처럼 한 번 크게 늦으면 다음 주기를 어떻게 잡을지 정해야 합니다. 밀린 주기를 몰아서 연달아 돌릴지, 건너뛰고 다음 정시부터 갈지의 선택입니다. 기차가 30분 늦었을 때 남은 역 정차를 모두 빠르게 몰아서 할지, 다음 정시 열차 시간표로 갈아탈지와 비슷합니다.

다음 코드는 **늦은 release를 건너뛰고 현재 시각보다 뒤에 오는 첫 release를 고르는 산술**입니다. 실제 시계나 sleep을 부르지 않습니다.

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

호스트(Apple clang, `-Wall -Wextra -std=c11`)에서 네 경우를 돌렸습니다.

```text
prev=1000 now=1100 period=250 -> ok=1 next=1250 skipped=0
prev=1000 now=1750 period=250 -> ok=1 next=2000 skipped=3
prev=1000 now=1250 period=250 -> ok=1 next=1500 skipped=1
prev=18446744073709551515 now=18446744073709551565 period=250 -> ok=0 next=0 skipped=0
```

이 함수는 now가 목표와 정확히 같을 때(1250)도 그 주기를 건너뜁니다. 마지막 줄처럼 다음 값을 64 bit로 표현할 수 없으면 wrap하지 않고 실패하며, 출력 인자는 건드리지 않습니다. 실제 루프에서는 `clock_nanosleep()`이 `EINTR`로 돌아오면 같은 목표로 다시 자고, `skipped`가 0이 아니면 그 횟수를 로그에 남깁니다. 놓친 주기에 출력을 유지할지 안전 상태로 갈지는 제어 쪽에서 정합니다.

## NIC와 마스터 경로 확인

NIC 튜닝은 그 NIC를 어느 경로로 쓰느냐에 따라 다릅니다. SOEM은 `PF_PACKET` raw socket(Ch 5), IgH 네이티브 드라이버는 네트워크 스택을 거치지 않는 polling, IgH generic 드라이버는 커널 안의 `PF_PACKET` 소켓입니다. 같은 ethtool 설정도 경로에 따라 효과가 다릅니다.

| 변경 후보 | 무엇을 바꾸는가 |
|---|---|
| ring 크기(`ethtool -G`) | 큐에 쌓이는 프레임 수. 줄이면 대기는 짧아지고 burst에서 drop이 늘 수 있음 |
| coalescing(`ethtool -C`) | 인터럽트를 몇 프레임·몇 μs마다 낼지 |
| IRQ affinity | NIC IRQ 스레드가 도는 CPU |
| launch time·Qbv | [Ch 9](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)의 ETF offload·taprio full offload. NIC가 지원해야 함 |

장비에서 상태를 읽는 명령입니다.

```bash
uname -r
cat /proc/cmdline
cat /proc/interrupts
ethtool -i ethLAB
ethtool -g ethLAB
ethtool -c ethLAB
ethtool -k ethLAB
```

`-i`는 드라이버 이름(IgH 네이티브 드라이버 지원 여부를 판단할 때 필요), `-g`·`-c`·`-k`는 ring, coalescing, offload 설정입니다.

## IgH EtherCAT: 설정 수락과 유효 IO

[IgH 1.6 API 문서](https://docs.etherlab.org/ethercat/1.6/doxygen/ecrt_8h.html)와 1.6.9 소스의 `include/ecrt.h`로 주기 루프의 단계를 나누면 다음과 같습니다(행 번호는 1.6.9).

| 단계 | API |
|---|---|
| 마스터 요청 | `ecrt_request_master()` (655행) |
| 구성 | `ecrt_master_create_domain()`, `ecrt_master_slave_config()`, `ecrt_domain_reg_pdo_entry_list()` |
| 활성화 | `ecrt_master_activate()` (1061행) |
| 수신 처리 | `ecrt_master_receive()` (1131행), `ecrt_domain_process()` (2234행) |
| 유효성 판단 | domain의 WKC 상태(`ecrt_domain_state()`) |
| 송신 | `ecrt_domain_queue()` (2247행), `ecrt_master_send()` (1113행) |
| 종료 | `ecrt_release_master()` (692행) |

`ecrt.h` 1052~1054행 주석대로 활성화 뒤에는 애플리케이션이 `ecrt_master_send()`와 `ecrt_master_receive()`를 주기적으로 불러야 통신이 유지됩니다. 즉 위 cyclictest가 잰 wakeup 지연은 EtherCAT 프레임 송신 시각 흔들림의 첫 성분이 되고, 그 위에 루프 처리와 driver 경로 지연이 더해집니다. 실제 시험에서는 루프마다 wakeup 시각, `ecrt_master_send()` 직전 시각, domain WKC를 같이 기록해 앞의 측정 경계 표 첫째·둘째·넷째 줄을 연결합니다.

## 정리

- PREEMPT_RT는 v6.12에서 `ARCH_SUPPORTS_RT`인 arm64·x86·riscv에서 고를 수 있고, 켜졌는지는 `uname -a`의 `PREEMPT_RT`와 `/boot/config`로 확인합니다.
- RT 커널에서도 `raw_spinlock_t` 구간은 선점되지 않습니다.
- `isolcpus`는 v6.12 문서에서 deprecated이고, 남은 tick·workqueue는 따로 옮겨야 합니다.
- VM에서는 RT 커널이 cyclictest 최대값(부하 시 224 ms)을 줄이지 못했습니다. guest 커널이 host의 vCPU 스케줄링을 제어하지 못하기 때문이며, VM 숫자는 장비 성능이 아닙니다.
- `--loops`는 횟수, `--duration`은 시간 조건이고, 늦은 주기가 쌓이면 wall time이 늘어납니다.
- overrun 정책(건너뛰기·몰아 돌리기)과 놓친 주기의 기록을 루프 설계에 넣습니다.
- EtherCAT 루프는 wakeup·송신 시각·WKC를 함께 기록해야 측정 경계가 이어집니다.

다음 [Ch 12: 프로토콜 비교와 선택](/blog/embedded/protocols/industrial-ethernet/chapter12-comparison)에서 실제 선정에 필요한 요구 사항과 그 근거를 정리합니다.

## 관련 항목

- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Practical RTOS Internals: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [rt-tests v2.6 소스](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/?h=v2.6)
- [Linux v6.12 `kernel/Kconfig.preempt`](https://github.com/torvalds/linux/blob/v6.12/kernel/Kconfig.preempt)
