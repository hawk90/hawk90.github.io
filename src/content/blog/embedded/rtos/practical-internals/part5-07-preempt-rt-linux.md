---
title: "PREEMPT_RT Linux — Mainline 6.12·Xenomai 4·EVL"
slug: "embedded/rtos/practical-internals/part5-07-preempt-rt-linux"
date: 2026-05-08T09:52:00
description: "Linux 6.12의 PREEMPT_RT 지원 조건과 핵심 변경을 정리하고, Xenomai 4·EVL과 함께 RTOS와의 선택 기준을 비교합니다. threaded IRQ·sleeping spinlock·cyclictest까지 한 지도에 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 52
tags: [preempt-rt, linux, xenomai, evl, real-time-linux]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"PREEMPT_RT는 Linux의 lock과 interrupt를 scheduler가 다룰 수 있게 바꿉니다."** — Linux 6.12 mainline에 config로 들어왔고, Debian 13은 RT kernel package를 따로 줍니다. 그 kernel을 VM에서 돌려 보면, latency를 정하는 것이 kernel 하나가 아니라는 점도 함께 보입니다.

## 어떤 문제를 푸는가

deadline이 빡빡하면 RTOS, driver와 network stack이 많이 필요하면 Linux라는 구분이 있었고, 둘 다 필요하면 4-12의 AMP처럼 core를 나눴습니다. PREEMPT_RT는 Linux 쪽을 RTOS에 가깝게 끌어오는 방법입니다. 일반 kernel이 "급한 손님이 와도 지금 하던 설거지는 끝내고 받는" 식당이라면, RT kernel은 설거지 대부분을 중간에 내려놓을 수 있게 바꾼 식당입니다.

v6.12 `kernel/Kconfig.preempt:70-82`의 `PREEMPT_RT`는 `depends on EXPERT && ARCH_SUPPORTS_RT`이고, help는 spinlock·rwlock을 "preemptible priority-inheritance aware variants"로 바꾸고 "enforcing interrupt threading"한다고 설명합니다. arm64는 `arch/arm64/Kconfig:105`에서 `ARCH_SUPPORTS_RT`를 select합니다. 배포판 kernel이 이 옵션을 켰는지는 따로 봐야 합니다. Debian 13은 일반 kernel과 별도로 `linux-image-rt-arm64` package를 줍니다.

이번 편의 목표는 두 가지입니다. 첫째, PREEMPT_RT가 mainline에서 *무엇을 어떻게 바꾸는지* 정리합니다. 둘째, Xenomai 4/EVL의 dual-kernel 접근과 비교하고, RTOS와 PREEMPT_RT를 가르는 *결정 기준*을 명확히 합니다.

## Mainline 합류 — 20년의 종착점

이 글은 Debian 13 arm64 guest(QEMU 11.1.3 `-M virt -accel hvf -cpu host`, vCPU 4개, 4 GiB, Apple silicon Mac host)에 Debian의 `6.12.117+deb13-arm64`와 `6.12.117+deb13-rt-arm64`를 설치하고 차례로 부팅해 같은 시험을 돌렸습니다. 같은 6.12.117 version이라 PREEMPT_RT 여부만 다릅니다. 문서와 소스는 Linux v6.12 태그(commit `adc21867`)를 봤습니다.

먼저 밝혀 둡니다. **이 측정은 HVF 가상 머신 위의 결과라 bare-metal latency가 아닙니다.** guest의 vCPU는 macOS가 스케줄하는 host thread라, guest kernel이 아무리 빨리 깨어나도 host가 그 vCPU를 늦게 돌리면 그만큼 늦어집니다. 아래 결과가 바로 그 효과를 보여 줍니다.

```text
Linux localhost 6.12.117+deb13-rt-arm64 #1 SMP PREEMPT_RT Debian 6.12.117-1 (2026-11-12) aarch64 GNU/Linux
/sys/kernel/realtime: 1
CONFIG_PREEMPT=y
CONFIG_PREEMPT_RT=y
CONFIG_HZ=250
```

일반 kernel은 같은 자리에서 `CONFIG_PREEMPT_VOLUNTARY=y`였고 `/sys/kernel/realtime`이 없었습니다.

## 핵심 변경 1 — Threaded IRQ

RT kernel은 interrupt handler 대부분을 `irq/<번호>-<이름>` kernel thread로 옮깁니다. 이렇게 되면 handler도 priority를 가진 thread라서, 더 급한 user thread가 그 handler보다 먼저 돌 수 있습니다. 예외는 있습니다. `include/linux/interrupt.h:59`의 `IRQF_NO_THREAD`("Interrupt cannot be threaded")가 붙은 IRQ는 thread가 되지 않고, timer IRQ용 `IRQF_TIMER`는 이 flag를 포함합니다(`:90`).

두 kernel에서 `irq/` thread를 셌습니다.

```bash
ps -eLo cls,rtprio,comm | grep -E " irq/"
```

```text
 FF     50 irq/49-ACPI:Ged
 FF     50 irq/12-uart-pl011
 FF     50 irq/51-virtio1-config
 FF     50 irq/52-virtio1-req.0
 FF     50 irq/53-virtio1-req.1
 FF     50 irq/54-virtio1-req.2
irq/ thread count: 8
```

RT kernel에서는 UART·virtio 등 8개가 `SCHED_FIFO`(`FF`) priority 50 thread였고, 일반 kernel에서는 ACPI 하나뿐이었습니다(`irq/ thread count: 1`). 모두 같은 priority 50으로 시작하므로, 어떤 IRQ를 user RT thread보다 먼저 돌릴지는 `chrt`로 직접 정해야 합니다.

## 핵심 변경 2 — Sleeping Spinlock

v6.12 `Documentation/locking/locktypes.rst`가 두 kernel의 차이를 정리합니다. 일반 kernel에서 `spinlock_t`는 `raw_spinlock_t`와 "exactly the same semantics"이고(`:226-227`), 일반 `spin_lock()`은 preemption만 막고 IRQ는 막지 않습니다. IRQ까지 막으려면 `_irq`·`_irqsave` 변형을 씁니다.

RT kernel에서는 `spinlock_t`가 "a separate implementation based on rt_mutex"로 바뀝니다(`:229-233`). 그래서 preemption이 막히지 않고, 기다리는 쪽은 돌지 않고 잠들며, 3-05에서 본 rtmutex의 priority inheritance를 받습니다. 같은 문서는 `_irq`·`_irqsave` 변형도 RT에서는 "do not affect the CPU's interrupt disabled state"라고 적습니다. 일반 kernel에서 `spin_lock_irqsave()`로 IRQ를 막는다고 믿던 코드는 RT에서 그 보호를 잃습니다. 진짜로 돌아야 하는 곳을 위해 `raw_spinlock_t`와 bit spinlock은 RT에서도 spinning lock으로 남습니다(`:68-69`, `:214-215`).

## 핵심 변경 3 — High-Resolution Timer

hrtimer는 RT 전용이 아니고 두 kernel 모두에 있습니다(4-09에서 hrtimer가 red-black tree를 쓴다는 문서를 봤습니다). 아래 cyclictest가 재는 것이 바로 "hrtimer로 예약한 시각"과 "thread가 실제로 깨어난 시각"의 차이입니다. 예전 판의 "PREEMPT면 수 ms, RT면 수십 µs" 같은 값은 출처가 없어 지웠습니다.

## 핵심 변경 4 — RCU와 NO_HZ

v6.12 `Documentation/timers/no_hz.rst`는 `CONFIG_NO_HZ_FULL`로 "Omit Scheduling-Clock Ticks For CPUs With Only One Runnable Task"(`:104`)를 설명합니다. 문서는 그 이유로 "there is no other task to switch to"를 듭니다(`:107-108`). 거꾸로 같은 CPU에 runnable task가 둘 이상이면 tick을 멈출 이유가 없습니다. 이 글에서는 `nohz_full`·`isolcpus`를 쓰지 않았습니다.

## Latency 측정 — cyclictest

cyclictest(rt-tests 2.6의 `cyclictest V 2.60`)는 thread를 `SCHED_FIFO`로 띄워 일정 간격으로 잠들고, 예정 시각과 실제로 깨어난 시각의 차이를 µs로 기록합니다. 두 kernel에서 같은 명령을 idle 상태와 `stress-ng` 부하 상태로 60초씩 돌렸습니다.

```bash
cyclictest -m -S -p 80 -i 1000 -D 60 -q
# 부하: stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M --timeout 70s
```

`-m`은 memory lock, `-S`는 CPU마다 thread 하나(여기서는 4개), `-p 80`은 priority, `-i 1000`은 첫 thread의 간격 1000 µs입니다. 일반 kernel(6.12.117) 결과입니다.

```text
== idle: cyclictest -m -S -p 80 -i 1000 -D 60 -q
T: 0 (  628) P:80 I:1000 C:  59661 Min:      3 Act:  211 Avg:  186 Max:   10941
T: 1 (  629) P:80 I:1500 C:  39841 Min:      2 Act:  132 Avg:  244 Max:    7167
T: 2 (  630) P:80 I:2000 C:  29909 Min:      1 Act:  304 Avg:  355 Max:    7049
T: 3 (  631) P:80 I:2500 C:  23950 Min:      2 Act:  305 Avg:  365 Max:    8157
== load: stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M during cyclictest -m -S -p 80 -i 1000 -D 60 -q
T: 0 (  648) P:80 I:1000 C:  58819 Min:      0 Act:    2 Avg:   26 Max:   53889
T: 1 (  649) P:80 I:1500 C:  39182 Min:      1 Act:    2 Avg:   39 Max:   75813
T: 2 (  650) P:80 I:2000 C:  29442 Min:      0 Act:    1 Avg:   50 Max:   72531
T: 3 (  651) P:80 I:2500 C:  23612 Min:      1 Act:    2 Avg:   54 Max:   88127
```

RT kernel(6.12.117-rt) 결과입니다.

```text
== idle: cyclictest -m -S -p 80 -i 1000 -D 60 -q
T: 0 (  629) P:80 I:1000 C:  59786 Min:      2 Act:  205 Avg:  207 Max:    9458
T: 1 (  630) P:80 I:1500 C:  39909 Min:      2 Act:  307 Avg:  234 Max:    9351
T: 2 (  631) P:80 I:2000 C:  29953 Min:      1 Act:   73 Avg:  263 Max:   10048
T: 3 (  632) P:80 I:2500 C:  23974 Min:      2 Act:  133 Avg:  332 Max:    9963
== load: stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M during cyclictest -m -S -p 80 -i 1000 -D 60 -q
T: 0 (  652) P:80 I:1000 C:  59561 Min:      0 Act:    3 Avg:   11 Max:   82097
T: 1 (  653) P:80 I:1500 C:  39725 Min:      1 Act:    3 Avg:   15 Max:   72346
T: 2 (  654) P:80 I:2000 C:  29820 Min:      1 Act:    4 Avg:   20 Max:   51770
T: 3 (  655) P:80 I:2500 C:  23871 Min:      1 Act:    5 Avg:   23 Max:   62443
```

읽을 때 세 가지를 봅니다.

- **idle이 부하보다 느립니다.** 두 kernel 모두 idle 평균이 186~365 µs이고, 부하를 걸면 11~54 µs로 줄었습니다. vCPU가 쉬고 있으면 host가 그 thread를 재웠다가 깨우는 시간이 더해지기 때문으로 보이고, 부하로 vCPU가 계속 돌면 이 비용이 사라집니다. bare metal에서는 볼 수 없는 VM 특유의 모양입니다.
- **RT kernel은 부하 상태 평균을 줄였습니다.** thread별 평균이 26·39·50·54 µs에서 11·15·20·23 µs가 됐습니다.
- **최댓값은 둘 다 수십 ms입니다.** 부하 상태 Max가 일반 kernel 88127 µs, RT kernel 82097 µs로 차이가 없습니다. guest가 RT여도 host가 vCPU를 수십 ms 동안 돌리지 않으면 guest는 그 시간을 어떻게 할 수 없습니다. 이 숫자로 PREEMPT_RT의 최악 latency를 말할 수 없고, 그러려면 bare-metal board에서 같은 시험을 해야 합니다.

Max는 그 실행에서 관찰한 최댓값일 뿐 WCET가 아닙니다. 더 오래, 더 다양한 부하에서 돌리면 더 큰 값이 나올 수 있습니다.

```js title="parse-cyclictest.mjs"
export function parseCyclictest(text) {
    const rows = [];
    for (const line of text.split(/\r?\n/)) {
        if (!/^\s*T:/.test(line)) continue;
        const m = /^\s*T:\s*(\d+)\s+\(\s*\d+\)\s+P:\s*\d+\s+I:\s*\d+\s+C:\s*(\d+)\s+Min:\s*(\d+)\s+Act:\s*(\d+)\s+Avg:\s*(\d+)\s+Max:\s*(\d+)\s*$/.exec(line);
        if (!m) throw new Error('unsupported T row format');
        const [id, count, min, act, avg, max] = m.slice(1).map(Number);
        if (![id,count,min,act,avg,max].every(Number.isSafeInteger) ||
            count === 0 || min > max || act < min || act > max || avg < min || avg > max)
            throw new RangeError('invalid measurement row');
        rows.push({id, count, observedMinUs:min, observedMaxUs:max});
    }
    if (rows.length === 0) throw new Error('no measurement rows');
    return rows;
}
```

이 parser를 위 실제 출력 파일에 돌렸습니다. 네 thread씩 모두 형식 검사를 통과했고, 최댓값은 위 표와 같았습니다.

```text
cyclictest-6.12.117.log idle max 10941 us; load max 88127 us; rows 4 4
cyclictest-6.12.117-rt.log idle max 10048 us; load max 82097 us; rows 4 4
```

이 parser는 `-q` 요약의 `T:` 줄과 µs 단위만 읽습니다. `--nsecs`나 histogram 출력은 형식이 달라 따로 처리해야 합니다.

## Xenomai 4 / EVL — Dual Kernel

EVL은 Linux kernel 옆에 real-time core를 하나 더 두는 dual-kernel 방식입니다. Linux가 도는 쪽을 in-band, EVL core가 도는 쪽을 out-of-band라고 부릅니다. EVL 문서의 thread API 페이지에 따르면 EVL은 thread를 새로 만들지 않고 "enables a regular POSIX thread to invoke its real-time services"이며, 그 진입점이 `evl_attach_self()`입니다. 붙은 thread는 현재 CPU에 고정되고, `SCHED_FIFO` 같은 policy면 out-of-band로 돕니다.

같은 페이지는 out-of-band thread가 일반 Linux system call을 부르면 "EVL may have to demote the caller automatically from the EVL context to the in-band stage"라고 적습니다. Linux 호출이 금지되는 것은 아니지만, 부르는 순간 그 thread는 Linux의 latency를 따르게 됩니다. `malloc()`처럼 system call을 부를 수 있는 함수도 같은 이유로 피하라고 합니다. `evl_set_thread_mode(int efd, int mask, int *oldmask)`로 `EVL_T_WOSS`를 켜면 이런 강등이 일어날 때 경고를 받습니다. 이 글에서는 EVL을 빌드하거나 돌리지 않았습니다.

## 두 접근 비교

| 비교 축 | PREEMPT_RT | EVL 계열 |
|---|---|---|
| 실행 구조 | mainline RT config와 Linux scheduler | in-band Linux + out-of-band RT services |
| 검증 대상 | arch/config·driver·lock/IRQ·application | matching core/lib ABI·RT services/driver·stage 전환 |
| deadline | 실제 hardware/workload에서 검증 | 실제 hardware/workload·OOB 유지 조건에서 검증 |

예전 판의 "PREEMPT_RT=soft 100 µs, EVL=hard 10 µs" 같은 등급은 출처가 없어 지웠습니다. 위 VM 실행이 보여 주듯 latency는 kernel 방식 하나가 아니라 hardware와 그 아래 계층(여기서는 host OS)까지 합쳐 정해집니다.

## 산업 PLC — Linux + PREEMPT_RT

fieldbus 제어라면 NIC interrupt → IRQ thread → 제어 task → 출력까지 단계마다 시간 예산을 나눕니다. 위에서 본 것처럼 RT kernel에서는 NIC의 IRQ thread도 priority를 가지므로, 제어 task와 그 IRQ thread의 priority 순서를 직접 정해야 합니다. 특정 회사의 채택 사례는 출처를 확인하지 않아 다루지 않습니다.

## 자동차 — Linux + RT + 별도 ASIL 코어

Linux와 별도 RT core를 함께 쓰는 구성은 4-12의 AMP입니다. 그 경우 PREEMPT_RT는 Linux 쪽의 응답을 줄이는 수단이고, 두 core 사이의 shared memory·DMA 간섭은 여전히 따로 검증해야 합니다.

## 적용 사례

### ROS 2와 오디오

ROS 2나 audio처럼 user space에 많은 계층이 있는 경우, kernel이 thread를 제때 깨워도 그 위의 allocator·middleware가 늦으면 소용이 없습니다. cyclictest는 kernel이 thread를 깨우는 시간만 재므로, application의 end-to-end 시간은 따로 잽니다. 이 글에서는 둘 다 돌리지 않았습니다.

## Tuning — RT 성능 추출

위 실행에서 확인할 수 있었던 tuning 순서는 이렇습니다. 먼저 kernel config(`CONFIG_PREEMPT_RT`)와 `/sys/kernel/realtime`으로 RT kernel인지 확인하고, `ps`로 IRQ thread의 priority를 본 뒤, cyclictest를 idle과 부하 두 조건에서 돌립니다. 이 VM에서는 idle 평균이 더 나빴는데, bare metal이라면 CPU의 deep idle state 진입이 비슷한 효과를 낼 수 있어 확인 대상이 됩니다. cyclictest가 시작할 때 출력한 `# /dev/cpu_dma_latency set to 0us`가 그 idle state를 막으려는 설정입니다. `isolcpus`·`nohz_full`·CPU frequency 고정은 이 글에서 시험하지 않았습니다.

## Yocto·Buildroot 통합

Yocto나 Buildroot로 image를 만들 때도 확인 방법은 위와 같습니다. 최종 image의 kernel config에 `CONFIG_PREEMPT_RT=y`가 있는지, 부팅 후 `/sys/kernel/realtime`이 1인지 봅니다. v6.12 이전 kernel을 쓰는 BSP는 mainline에 이 옵션이 없으므로 별도 RT patch가 필요합니다. 이 글에서는 Yocto·Buildroot로 빌드하지 않았습니다.

## RTOS vs Linux PREEMPT_RT — 결정 기준

고정된 숫자 경계(예전 판의 "10 µs·1 MB·50 MB")로 고르지 않습니다. 이 글의 VM에서도 RT kernel의 최댓값은 수십 ms였지만, 그것은 host 때문이었습니다. 실제 판단은 target board에서 deadline보다 충분히 긴 시간 동안 부하를 걸고 잰 분포와, 필요한 driver·API가 어느 쪽에 있는지로 합니다. 둘 다 필요하면 4-12의 AMP가 선택지입니다.

## 자주 보는 함정

- VM에서 잰 cyclictest를 hardware 성능으로 봅니다. 위 실행의 수십 ms Max는 host 스케줄링의 결과였습니다.
- idle에서 한 번 잰 값만 봅니다. 위 실행은 idle과 부하에서 모양이 반대였습니다.
- RT kernel에서도 `spin_lock_irqsave()`가 IRQ를 막는다고 봅니다. `locktypes.rst`에 따르면 막지 않습니다.
- RT kernel로 바꾸고 IRQ thread priority를 그대로 둡니다. 모두 50으로 시작합니다.

## 정리

- Linux v6.12의 `PREEMPT_RT`는 `EXPERT && ARCH_SUPPORTS_RT`에 의존하고, arm64는 지원합니다. Debian 13은 `-rt-arm64` kernel을 따로 줍니다.
- RT kernel에서 IRQ handler 8개가 `irq/` thread(FIFO 50)가 됐고, 일반 kernel은 1개였습니다.
- RT kernel에서 `spinlock_t`는 rt_mutex 기반이 되고 `_irqsave`도 IRQ를 막지 않습니다.
- HVF VM의 cyclictest에서 RT kernel은 부하 평균을 26~54 µs에서 11~23 µs로 줄였지만, Max는 둘 다 수십 ms로 host가 정했습니다.
- EVL thread는 Linux system call을 부르면 in-band로 강등됩니다.

## 근거 자료

- [Linux 6.12 lock types](https://docs.kernel.org/6.12/locking/locktypes.html), [NO_HZ](https://docs.kernel.org/6.12/timers/no_hz.html), [kernel/Kconfig.preempt](https://github.com/torvalds/linux/blob/v6.12/kernel/Kconfig.preempt), [include/linux/interrupt.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/interrupt.h).
- [Linux Foundation cyclictest](https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start), [측정 원리 FAQ](https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/faq).
- [EVL thread API](https://evlproject.org/core/user-api/thread/), [API revisions](https://evlproject.org/core/user-api/api-revs/).



이번 글로 *Practical RTOS Internals* 시리즈가 마무리됩니다. 프롤로그부터 이 글까지 53편에서 task와 ISR, 동기화, scheduling, 메모리, 컨텍스트 스위치, SMP, 그리고 FreeRTOS·Zephyr·RT-Thread·NuttX 소스와 실행까지 다뤘습니다.

## 관련 항목

- [1-01: 왜 RTOS인가](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-06: Apache NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
