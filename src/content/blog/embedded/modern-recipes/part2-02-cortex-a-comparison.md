---
title: "ARM Cortex-A 시리즈 비교 — A53·A55·A72·A78·X1 분석"
slug: "embedded/modern-recipes/part2-02-cortex-a-comparison"
date: 2026-04-11T09:14:00
description: "A53/A72/A78/Neoverse — 임베디드 Linux용 application 코어."
series: "Modern Embedded Recipes"
seriesOrder: 14
tags: [recipes, arm, cortex-a]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cortex-A는 MMU를 갖춘 application 코어이고, 코어마다 pipeline 방식과 cache 구성 범위가 다릅니다."** 같은 SoC 안의 big·LITTLE 배치는 Linux scheduler가 `cpu_capacity`로 구분합니다.

## 어떤 상황에서 쓰나

- 임베디드 Linux 보드 SoC 선택
- 산업용 게이트웨이, IoT edge 디바이스
- 자동차 IVI(In-Vehicle Infotainment)
- 라즈베리파이, BeagleBone 같은 SBC

이 글의 코어 정보는 Arm Technical Reference Manual(TRM)에서, Linux 동작은 Linux v6.12 문서와 Debian 13 arm64 guest(커널 `6.12.116+deb13-arm64`, QEMU 11.1.3 `virt`, `-accel hvf -cpu host`, 4 vCPU)에서 돌린 출력으로 확인했습니다.

## 핵심 개념

### 1) Cortex-A 패밀리 한눈에

아래 표는 각 코어 TRM의 "Features"와 "implementation options" 절에서 옮겼습니다. cache 크기는 고정값이 아니라 SoC 벤더가 고르는 *구성 범위*입니다.

| 코어 | 아키텍처 (TRM) | pipeline (TRM 문구) | L1 I/D cache | L2 cache |
| --- | --- | --- | --- | --- |
| A7 | ARMv7-A | in-order | 각 8/16/32/64KB | 없음 또는 128KB~1024KB (cluster 공유) |
| A9 | ARMv7-A | superscalar, out-of-order | 각 16/32/64KB | 코어 밖 L2C-310 같은 외부 controller |
| A53 | Armv8-A | in-order, symmetric dual-issue | 각 8/16/32/64KB | 없음 또는 128KB~2MB |
| A55 | Armv8.2-A | in-order | 각 16/32/64KB | 없음 또는 64/128/256KB (코어별) |
| A72 | ARMv8-A | superscalar, out-of-order | 48KB / 32KB 고정 | 512KB/1MB/2MB/4MB 공유 |
| A78 | Armv8.2-A | superscalar, out-of-order | 각 32/64KB | 256/512KB (코어별) |
| Neoverse V1 | Armv8.4-A | superscalar, out-of-order | — | 512/1024KB (코어별) |

출처는 Cortex-A7 MPCore TRM r0p5, Cortex-A9 TRM r4p1, Cortex-A53 MPCore TRM r0p4, Cortex-A55 Core TRM(문서 100442), Cortex-A72 MPCore TRM r0p3 "Features", Cortex-A78 Core TRM r1p2, Neoverse V1 Core TRM r1p2입니다. TRM은 pipeline 단수를 적지 않으므로 표에도 넣지 않았습니다.

### 2) In-order vs Out-of-Order

In-order 코어는 명령을 프로그램 순서대로 issue합니다. 앞 명령이 load 결과를 기다리면 뒤 명령도 함께 기다립니다. Out-of-order 코어는 의존성이 없는 뒤 명령을 먼저 실행해 그 대기 시간을 가립니다. 대신 register renaming과 재정렬 버퍼 같은 하드웨어가 더 필요합니다. Cortex-A9 TRM도 "register renaming scheme facilitates out-of-order execution"이라고 설명합니다.

식당에 비유하면 in-order는 주문 순서대로만 요리하는 주방이고, out-of-order는 재료가 먼저 준비된 주문부터 내보내는 주방입니다. 표에서 A7·A53·A55가 in-order, A9·A72·A78·V1이 out-of-order입니다.

### 3) big.LITTLE과 Linux의 capacity

한 SoC에 성능 위주 코어(big)와 효율 위주 코어(LITTLE)를 함께 두는 구성을 big.LITTLE이라고 합니다. Linux 문서 `Documentation/scheduler/sched-capacity.rst`는 이런 시스템을 "asymmetric CPU capacity systems"라고 부르고, 각 CPU의 성능을 가장 빠른 CPU 기준으로 정규화한 `capacity`로 표현합니다. 문서는 big.LITTLE이 µarch 차이와 DVFS 차이를 *둘 다* 가진 예라고 적습니다.

capacity 값은 sysfs로 바로 보입니다. 아래는 Debian guest에서 읽은 값이고, 4개 vCPU가 모두 같은 코어라 전부 1024입니다.

```text
# cat /sys/devices/system/cpu/cpu*/cpu_capacity
1024
1024
1024
1024
```

big.LITTLE 보드라면 LITTLE 코어의 값이 1024보다 작게 나옵니다. 이 값이 다를 때 Energy Aware Scheduling(EAS)이 동작할 수 있는데, `sched-energy.rst`는 EAS가 "heterogeneous CPU topologies (such as Arm big.LITTLE)"에서만 동작하고 "EAS does not support platforms with symmetric CPU topologies"라고 적습니다. 같은 문서 6.4절은 EAS와 함께 쓸 governor로 schedutil만 지원한다고 명시합니다.

Cortex-A55 TRM은 A55가 DynamIQ Shared Unit(DSU) 안에 "Little core"로 구현되고, L2 cache는 "private to each core"라고 설명합니다. DynamIQ 세대에서는 LITTLE 코어도 자기 L2를 갖고, 코어들은 DSU를 거쳐 외부 메모리에 연결됩니다.

### 4) AArch64와 AArch32

Arm의 *Learn the architecture - A64 Instruction Set Architecture Guide*(102374, 1.4)는 A64 레지스터를 다음과 같이 설명합니다.

| 항목 | AArch64 (A64 guide 102374) |
| --- | --- |
| 범용 레지스터 | 31개, 64-bit `X0`~`X30` 또는 32-bit `W0`~`W30` |
| Stack pointer | 범용 레지스터가 아님. Exception level마다 별도 SP |
| Link register | `X30` (`LR`이라고도 부름). 예외 복귀는 `ELR_ELx` 사용 |
| PC | 범용 레지스터가 아니며 데이터 처리 명령에 쓸 수 없음 |

A64 명령은 모두 4바이트입니다. guest에서 함수 하나를 컴파일해 보면 주소가 4씩 증가합니다.

```text
$ gcc -O2 -c add3.c && objdump -d add3.o     # long add3(long a, long b, long c)
0000000000000000 <add3>:
   0:	8b010000 	add	x0, x0, x1
   4:	8b020000 	add	x0, x0, x2
   8:	d65f03c0 	ret
```

가상 주소 폭은 커널 설정으로 정해집니다. `Documentation/arch/arm64/memory.rst`는 4KB page에서 3단계면 39-bit, 4단계면 48-bit VA를 쓰고, 52-bit VA는 ARMv8.2-LVA가 있고 64KB page일 때 가능하며 하드웨어에 기능이 없으면 48-bit로 fallback한다고 적습니다. Debian 13 arm64 커널의 설정은 다음과 같습니다.

```text
# grep -E "CONFIG_ARM64_VA_BITS|CONFIG_ARM64_PA_BITS=|CONFIG_COMPAT=" /boot/config-6.12.116+deb13-arm64
# CONFIG_ARM64_VA_BITS_39 is not set
# CONFIG_ARM64_VA_BITS_48 is not set
CONFIG_ARM64_VA_BITS_52=y
CONFIG_ARM64_VA_BITS=52
CONFIG_ARM64_PA_BITS=52
CONFIG_COMPAT=y
```

AArch32 지원은 코어마다 다릅니다. Cortex-A78 TRM과 Neoverse V1 TRM은 둘 다 "AArch32 Execution state at Exception level EL0 only"라고 적습니다. 즉 32-bit 커널은 올릴 수 없고, 64-bit 커널 위의 32-bit 사용자 프로세스만 돌 수 있습니다. 커널 쪽에서는 `CONFIG_COMPAT=y`가 그 32-bit 사용자 공간 지원입니다.

### 5) Neoverse — 인프라용 코어

Neoverse는 Arm의 인프라·서버용 코어 라인입니다. Neoverse V1 TRM은 V1이 Armv8.4-A를 구현하고 Armv8.5-A·8.6-A의 일부 명령(BFloat16, Int8 matrix multiply 등)을 r1p0에서 추가했다고 적습니다. 또 "There can only be one Neoverse V1 core per cluster"라고 적고, L2는 코어별 512KB 또는 1024KB입니다.

## 코드 / 실제 사용 예

먼저 Linux에서 코어 정보를 확인합니다. 아래 출력은 Apple Silicon 위 HVF guest라 Arm 코어 이름 대신 `Vendor ID: Apple`, `CPU part: 0x000`이 나옵니다. 실제 Cortex-A 보드에서는 `CPU implementer : 0x41`(Arm)과 코어별 `CPU part`가 나옵니다.

```text
# lscpu | head -8
Architecture:                            aarch64
CPU op-mode(s):                          64-bit
Byte Order:                              Little Endian
CPU(s):                                  4
On-line CPU(s) list:                     0-3
Vendor ID:                               Apple
BIOS Vendor ID:                          QEMU
Model name:                              -

# head -9 /proc/cpuinfo
processor	: 0
BogoMIPS	: 48.00
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm jscvt fcma lrcpc dcpop sha3 asimddp sha512 asimdfhm dit uscat ilrcpc flagm sb paca pacg dcpodp flagm2 frint i8mm bf16 bti
CPU implementer	: 0x61
CPU architecture: 8
CPU variant	: 0x0
CPU part	: 0x000
CPU revision	: 0
```

`CPU op-mode(s)`에 `64-bit`만 나온 것도 눈여겨볼 점입니다. 이 host CPU는 AArch32 실행을 지원하지 않아서 `CONFIG_COMPAT=y` 커널이라도 32-bit 사용자 프로그램을 돌릴 수 없습니다.

cpufreq governor는 cpufreq driver가 있어야 보입니다. guest에는 cpufreq driver가 없어 디렉터리 자체가 없습니다.

```text
# cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
cat: /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor: No such file or directory
```

big 코어에만 작업을 묶고 싶으면 affinity를 씁니다. 아래 프로그램은 호출한 thread를 CPU 2~3에 묶고, 실제로 허용된 CPU 집합과 실행 중인 CPU를 출력합니다.

```c
#define _GNU_SOURCE
#include <pthread.h>
#include <sched.h>
#include <stdio.h>

/* pin the calling thread to CPUs [first, last] and report where it runs */
static int pin_range(int first, int last) {
    cpu_set_t set;
    CPU_ZERO(&set);
    for (int i = first; i <= last; i++) CPU_SET(i, &set);
    return pthread_setaffinity_np(pthread_self(), sizeof(set), &set);
}

int main(void) {
    int err = pin_range(2, 3);
    if (err) { fprintf(stderr, "pthread_setaffinity_np: %d\n", err); return 1; }
    cpu_set_t got;
    pthread_getaffinity_np(pthread_self(), sizeof(got), &got);
    printf("allowed:");
    for (int i = 0; i < CPU_SETSIZE; i++) if (CPU_ISSET(i, &got)) printf(" %d", i);
    volatile unsigned long spin = 0;
    for (unsigned long i = 0; i < 200000000UL; i++) spin += i;   /* give the scheduler time to move us */
    printf("\nrunning on CPU %d\n", sched_getcpu());
    return 0;
}
```

Debian guest의 GCC 14.2.0으로 빌드해 그대로 실행하고, `taskset -c 1`로 프로세스를 CPU 1에 묶은 뒤에도 실행했습니다.

```text
# gcc -O2 -Wall -pthread p2-02-pin.c -o pin && ./pin
allowed: 2 3
running on CPU 3
# taskset -c 1 ./pin
allowed: 2 3
running on CPU 2
```

두 번째 실행이 보여 주듯 `pthread_setaffinity_np`는 시작 시점의 `taskset` mask를 덮어씁니다. 프로세스 밖에서 걸어 둔 제한이 프로그램 안의 affinity 호출로 풀릴 수 있다는 뜻이므로, 운영 환경에서 CPU를 격리하려면 cgroup cpuset 같은 상위 제한을 함께 씁니다. 실제 big.LITTLE 보드에서는 어느 CPU 번호가 big인지 먼저 `cpu_capacity`로 확인하고 번호를 고릅니다.

## 측정 / 비교

이번 글에서 측정한 것은 위의 affinity 동작과 커널 설정뿐입니다. 코어 간 DMIPS·SPEC 수치와 big.LITTLE 전력 수치는 Arm이 코어별로 같은 형식으로 공개한 자료를 찾지 못해 싣지 않았습니다. 코어를 비교할 때는 1절 표의 구조 차이(in-order/OoO, cache 범위)를 출발점으로 삼고, 성능은 후보 SoC 보드에서 같은 바이너리로 잽니다.

## 자주 보는 함정

> ⚠️ governor를 확인하지 않고 big 코어 성능을 기대함

`Documentation/admin-guide/pm/cpufreq.rst`의 `powersave` governor는 정책의 최저 주파수를 요청합니다. 이 상태에서는 big 코어도 최저 클럭으로 돕니다. EAS를 쓰려면 `sched-energy.rst` 6.4절에 따르면 schedutil이 필요합니다. 먼저 `scaling_governor`가 있는지, 무엇인지 읽습니다.

> ⚠️ 32-bit 사용자 공간을 새 코어로 그대로 옮김

A78·Neoverse V1은 AArch32를 EL0에서만 지원하고, 위 guest처럼 AArch32를 아예 지원하지 않는 CPU도 있습니다. `lscpu`의 `CPU op-mode(s)`에 `32-bit`가 없으면 32-bit 바이너리는 실행되지 않습니다. 새 시스템은 사용자 공간까지 AArch64로 빌드합니다.

> ⚠️ cluster마다 L2가 다르다는 점을 잊음

A7·A53의 L2는 cluster 안에서 공유되지만, A55·A78의 L2는 코어별(per-core) 구성 옵션입니다. 같은 SoC에서도 big과 LITTLE의 L2 크기가 다를 수 있습니다.

> ⚠️ `cpu_capacity`를 보지 않고 CPU 번호로 big을 짐작

CPU 번호와 big/LITTLE의 대응은 SoC와 device tree가 정합니다. `taskset -c 4-7` 같은 번호를 다른 보드에 그대로 옮기지 말고 `cpu_capacity`로 확인합니다.

## 정리

- Cortex-A 코어의 pipeline 방식과 cache 구성 범위는 TRM의 Features·implementation options 절에 있습니다.
- A7·A53·A55는 in-order, A9·A72·A78·Neoverse V1은 out-of-order입니다.
- Linux는 big.LITTLE을 `cpu_capacity`로 구분하고, EAS는 비대칭 topology와 schedutil에서만 동작합니다.
- A64는 31개 범용 레지스터와 4바이트 고정 길이 명령을 쓰며, `LR`은 `X30`입니다.
- A78·V1은 AArch32를 EL0에서만 지원하므로 32-bit 커널은 올릴 수 없습니다.

다음 편에서는 **ARM 레지스터 구조**를 다룹니다. Cortex-M의 R0 ~ R15와 special register들입니다.

## 관련 항목

- [2-01: Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)
- [2-03: ARM 레지스터 구조](/blog/embedded/modern-recipes/part2-03-arm-registers)
- [2-08: MMU 기초](/blog/embedded/modern-recipes/part2-08-arm-mmu)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
