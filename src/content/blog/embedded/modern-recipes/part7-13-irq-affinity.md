---
title: "IRQ Affinity 설정이 거부되거나 되돌아가는 이유 — smp_affinity·effective_affinity·isolcpus·irqbalance"
slug: "embedded/modern-recipes/part7-13-irq-affinity"
date: 2026-04-16T09:12:00
description: "ARM SoC 임베디드 Linux에서 IRQ를 원하는 코어에 고정하는 방법과, 설정이 거부되거나 되돌아가는 이유(irqbalance·managed IRQ·CPU hotplug), 그리고 허용 집합 안에서 실제 CPU를 고르는 controller별 규칙(GIC SPI·ITS LPI·GICv2m·DWC MSI)을 커널 소스와 문서 기준으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 87
tags: [recipes, irq-affinity, isolcpus, irqbalance, preempt-rt]
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"`smp_affinity`는 IRQ가 갈 수 있는 CPU 집합이고, 그 안에서 실제로 받는 CPU는 IRQ controller driver가 고릅니다. irqbalance는 그 집합을 바꾸는 또 하나의 writer입니다."** 값을 쓰는 것보다 쓴 값이 거부되지 않고 유지되는지 확인하는 일이 더 중요합니다.

## 어떤 상황에서 쓰나

IRQ affinity를 만지는 이유는 보통 두 가지입니다.

- **격리.** RT 제어 루프를 돌리는 코어에 다른 장치의 IRQ가 들어오지 않게 합니다.
- **분산.** multi-queue NIC의 queue별 IRQ를 여러 코어에 나눠 한 코어가 RX 처리를 독점하지 않게 합니다.

방향은 반대지만 둘 다 `/proc/irq/N/` 아래 파일 몇 개로 시작합니다. 이 글은 그 파일에 값을 썼는데 *반영되지 않거나, 반영됐다가 되돌아가는* 경우를 중심으로 봅니다.

대상 독자는 GICv2/v3를 쓰는 ARM SoC에서 RT 루프를 돌리는 임베디드 Linux 개발자입니다. `/proc/interrupts`를 읽을 줄 안다고 가정합니다. 순서는 이렇습니다. "핵심 개념"에서 허용 집합과 실제 전달 CPU가 왜 다른지를 GIC·PCIe MSI 경로별로 보고, "코드 / 실제 사용 예"에서 쓰기가 거부되는 조건, irqbalance와의 공존, 부팅 파라미터, NIC queue 분배, PREEMPT_RT의 IRQ thread를 차례로 다룹니다. "자주 보는 함정"은 본문 절로 가는 증상 목록과, 받아들여진 값을 CPU hotplug와 suspend가 바꿔 놓는 두 경우로 이뤄집니다.

아래 내용은 2026-10-11에 Linux v7.3-rc6 태그의 소스·문서와 irqbalance v1.9.5 태그의 소스를 열어 대조했습니다. 커널 소스와 커널 문서 링크는 v7.3-rc6, irqbalance 링크는 v1.9.5 태그를 가리키고, 그 밖의 사용자 공간 도구(ethtool·rt-tests·systemd)는 링크마다 대조한 버전을 적었습니다. 측정 결과는 싣지 않습니다. 동작은 모두 소스와 문서에서 읽은 것입니다.

## 핵심 개념

### /proc/irq/N 아래 파일

| 파일 | 내용 |
|------|------|
| `smp_affinity` | 허용 CPU 집합, 16진 bitmask |
| `smp_affinity_list` | 같은 집합, CPU 목록 형식(`2-3`) |
| `effective_affinity`, `effective_affinity_list` | controller에 실제로 프로그래밍된 CPU. `CONFIG_GENERIC_IRQ_EFFECTIVE_AFF_MASK`일 때만 생깁니다(아래 설명) |
| `affinity_hint` | driver가 등록한 hint, 읽기 전용 |
| `/proc/irq/default_smp_affinity` | 새로 할당되는 IRQ에 적용되는 기본 mask |

파일 목록과 생성 조건은 [`kernel/irq/proc.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/proc.c)의 `register_irq_proc()`에 있습니다. [커널 문서 "SMP IRQ affinity"](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/core-api/irq/irq-affinity.rst)는 `smp_affinity`를 해당 IRQ에 허용된 CPU의 bitmask로 정의하고, 모든 CPU를 끄는 값은 받지 않는다고 적습니다.

`effective_affinity`를 만드는 Kconfig 옵션은 사용자가 고르는 항목이 아니라 irqchip driver가 select합니다. [`drivers/irqchip/Kconfig`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/irqchip/Kconfig)에서 `ARM_GIC`(GICv2)와 `ARM_GIC_V3`는 SMP일 때 `GENERIC_IRQ_EFFECTIVE_AFF_MASK`를 select하므로, GIC를 쓰는 SMP 커널에는 이 파일이 있습니다. 파일이 없는 플랫폼에서는 아래 "현재 상태 확인"처럼 `/proc/interrupts`의 열별 증가량으로 실제 CPU를 판단합니다.

### bitmask 읽는 법

`smp_affinity`는 16진수이고 bit n이 CPU n입니다. 쓰기는 `cpumask_parse_user()`를 거쳐 [`lib/bitmap-str.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/lib/bitmap-str.c)의 `bitmap_parse()`가 처리합니다. 이 함수는 문자를 하나씩 16진 숫자로 바꾸다가 16진 숫자가 아닌 문자를 만나면 `-EINVAL`을 돌려주므로, `0x2`처럼 접두사를 붙이면 `x`에서 쓰기가 실패합니다. 같은 함수는 쉼표로 나눈 묶음 하나를 32비트로 읽습니다. CPU가 32개를 넘으면 `ffffffff,00000001`처럼 8자리마다 쉼표가 들어갑니다.

| 원하는 CPU | 2진 | `smp_affinity`에 쓰는 값 | `smp_affinity_list`에 쓰는 값 |
|---|---|---|---|
| CPU0 | `0001` | `1` | `0` |
| CPU1 | `0010` | `2` | `1` |
| CPU2 | `0100` | `4` | `2` |
| CPU3 | `1000` | `8` | `3` |
| CPU2·3 | `1100` | `c` | `2-3` |
| CPU0~3 | `1111` | `f` | `0-3` |

셸의 `$((1 << n))`은 10진수를 출력합니다. CPU4의 mask `16`을 그대로 `smp_affinity`에 쓰면 16진 0x16으로 읽혀, 8-CPU 시스템에서는 CPU1·2·4가 됩니다. 4-CPU SoC라면 bit 4가 CPU 개수를 넘으므로 `bitmap_parse()`가 `-EOVERFLOW`를 돌려주고 쓰기 자체가 실패합니다(`cpumask_parse_user()`는 비트 수로 `nr_cpumask_bits`, 즉 `nr_cpu_ids`를 넘깁니다. [`include/linux/cpumask.h`](https://github.com/torvalds/linux/blob/v7.3-rc6/include/linux/cpumask.h)). 스크립트에서는 `printf '%x'`로 바꾸거나 처음부터 `smp_affinity_list`를 씁니다. 커널 문서도 CPU 1024~1031 같은 큰 번호에는 bitmask 대신 list 형식을 쓰는 예를 듭니다.

### smp_affinity와 effective_affinity

`smp_affinity`는 *허용 집합*일 뿐입니다. ARM GIC에서는 그 차이가 바로 드러납니다. [`irq-gic-v3.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/irqchip/irq-gic-v3.c)와 [`irq-gic.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/irqchip/irq-gic.c)의 `gic_set_affinity()`는 SPI의 affinity를 바꿀 때 받은 mask에서 CPU 하나를 골라 그 CPU만 effective affinity로 기록합니다. `/proc`에서 쓰는 일반 경로(`force`가 거짓)는 `cpumask_any_and(mask, cpu_online_mask)`를 부르는데, [`include/linux/cpumask.h`](https://github.com/torvalds/linux/blob/v7.3-rc6/include/linux/cpumask.h)에서 이 매크로는 `cpumask_first_and()`로 정의돼 있습니다. 즉 mask 안에서 *번호가 가장 낮은 online CPU*가 고정적으로 선택됩니다.

그래서 GIC SPI에 `c`(CPU2·3)를 쓰면 IRQ는 CPU2로만 가고, CPU2가 offline일 때만 CPU3으로 갑니다. 여러 SPI에 `f`를 쓰면 모두 CPU0에 몰립니다. 여러 코어에 부하를 나누려면 mask를 넓히는 대신 IRQ 자체를 여러 개 만들어 각각 다른 CPU 하나를 줍니다. 뒤에 나오는 NIC multi-queue가 그 방법입니다.

### PCIe MSI — controller에 따라 규칙이 다르다

PCIe NIC의 queue별 MSI-X IRQ를 누가 받는지는 SoC의 MSI 경로에 달려 있습니다. 여기서는 v7.3-rc6 tree에 있는 세 경로를 봅니다.

**GICv3 + ITS.** GICv3에 ITS가 있으면 MSI는 SPI가 아니라 ITS를 거치는 LPI가 됩니다. 이 IRQ는 [`irq-gic-v3-its.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/irqchip/irq-gic-v3-its.c)의 `its_set_affinity()`가 맡고, 결과는 역시 CPU 하나입니다. 고르는 기준은 다릅니다. 일반 경로의 `its_select_cpu()`는 managed가 아닌 IRQ라면 mask·online CPU·ITS가 속한 NUMA node의 교집합에서 먼저 찾고, 비면 mask와 online CPU의 교집합(그것도 비면 online CPU 전체)으로 넓힙니다. 후보 안에서는 `cpumask_pick_least_loaded()`가 지금 LPI가 가장 적게 배정된 CPU를 고릅니다. LPI 수는 CPU마다 managed·일반을 따로 셉니다.

따라서 ITS에서 넓은 mask를 주면 어느 CPU가 될지는 그 순간 다른 LPI의 배치에 달려 있습니다.

**GICv2m.** GICv2에는 ITS가 없습니다. GICv2m frame을 쓰는 SoC에서 MSI는 GIC의 SPI 하나로 들어옵니다. [`irq-gic-v2m.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/irqchip/irq-gic-v2m.c)의 `gicv2m_irq_chip`은 `irq_set_affinity`로 `irq_chip_set_affinity_parent`를 걸어 두므로, affinity는 parent인 GIC의 `gic_set_affinity()`가 처리합니다. 결과는 "smp_affinity와 effective_affinity" 절의 SPI 규칙과 같아서 mask 안의 가장 낮은 번호 online CPU입니다.

**DesignWare PCIe 내장 MSI controller.** [`pcie-designware-host.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/pci/controller/dwc/pcie-designware-host.c)는 SMP 커널에서 MSI IRQ의 `irq_set_affinity`를 [`kernel/irq/chip.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/chip.c)의 `irq_chip_redirect_set_affinity()`로 둡니다. 이 IRQ들은 controller의 parent IRQ 하나로 모여 들어오고, 그 handler가 `generic_handle_demux_domain_irq()`로 개별 MSI를 나눠 부릅니다. affinity를 쓰면 이 함수는 mask(online CPU와 교집합을 낸 값)의 첫 CPU를 redirect 대상으로 저장하고, mask 전체를 effective affinity로 기록합니다. 그래서 이 경로에서만 `effective_affinity_list`에 CPU가 여러 개 나올 수 있습니다. handler가 도는 CPU는 [`kernel/irq/irqdesc.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/irqdesc.c)의 `demux_redirect_remote()`가 정합니다. parent IRQ를 받은 CPU가 이 집합 안에 있으면 그 CPU에서 바로 돌고, 집합 밖이면 `irq_work_queue_on()`으로 저장해 둔 redirect 대상, 즉 mask의 첫 CPU에서 돕니다.

세 경로 모두 queue IRQ마다 CPU를 하나만 넣으면 후보가 하나뿐이므로 결과가 정해집니다. 아래 NIC 스크립트가 CPU 번호 하나씩을 쓰는 이유입니다.

## 코드 / 실제 사용 예

### 현재 상태 확인

```bash
grep -E 'CPU|eth0' /proc/interrupts
cat /proc/irq/23/smp_affinity
cat /proc/irq/23/smp_affinity_list
cat /proc/irq/23/effective_affinity_list
ls -l /proc/irq/23/smp_affinity
```

`/proc/interrupts`의 CPU 열은 누적 카운트입니다. 한 번 읽고 끝내지 말고 트래픽을 흘린 뒤 다시 읽어 *어느 열이 늘었는지*를 봅니다.

### 수동 설정

```bash
# CPU1 only
echo 2 > /proc/irq/23/smp_affinity

# CPU2 and CPU3 (a GIC SPI goes to CPU2, the lowest online CPU in the mask)
echo c > /proc/irq/23/smp_affinity

# same as above, list format
echo 2-3 > /proc/irq/23/smp_affinity_list

# where it actually goes
cat /proc/irq/23/effective_affinity_list
```

### 쓰기가 거부되는 경우

[`kernel/irq/proc.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/proc.c)의 `write_irq_affinity()`는 `irq_can_set_affinity_usr()`가 거짓이거나 전역 변수 `no_irq_affinity`가 설정돼 있으면 `-EPERM`을 돌려줍니다. [`kernel/irq/manage.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/manage.c)와 [`include/linux/irq.h`](https://github.com/torvalds/linux/blob/v7.3-rc6/include/linux/irq.h)를 따라가면 조건은 다음과 같습니다.

| 원인 | 소스상 조건 | 해당 IRQ |
|---|---|---|
| per-CPU IRQ | `IRQD_PER_CPU` | `IRQF_PERCPU`로 등록한 IRQ(`request_percpu_irq()` 계열은 자동으로 붙임) |
| balancing 금지 | `IRQD_NO_BALANCING` | driver가 `IRQF_NOBALANCING`으로 고정한 IRQ |
| managed IRQ | `irqd_affinity_is_managed()` | 커널이 queue별로 자동 배정한 IRQ |
| controller 미지원 | `irq_set_affinity` 콜백 없음 | affinity를 못 바꾸는 controller의 IRQ |
| 전역 금지 | `no_irq_affinity` ≠ 0 | 모든 IRQ |

per-CPU IRQ는 `__setup_irq()`가 `IRQF_PERCPU`를 보고 `IRQD_PER_CPU`를 켭니다.

`ls -l`의 쓰기 비트로는 이 조건을 판단할 수 없습니다. `register_irq_proc()`은 디렉터리를 만드는 순간에만 `irq_can_set_affinity_usr()`를 보고 쓰기 비트를 정합니다. chip이 이미 정해진 IRQ의 디렉터리는 initcall보다 먼저 만들어집니다([`init/main.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/init/main.c)에서 `init_irq_proc()`이 `do_initcalls()`보다 먼저 불림). 나중에 driver가 `IRQF_NOBALANCING`으로 요청한 IRQ는 쓰기 비트가 남은 채로 쓰기만 `EPERM`이 되고, `no_irq_affinity`도 파일 권한에 반영되지 않습니다. 판단은 쓰기의 반환값으로 합니다.

managed IRQ에 대해서는 [kernel-parameters 문서](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/admin-guide/kernel-parameters.txt)의 `isolcpus=managed_irq` 항목도 커널이 관리하며 `/proc/irq/*`로 바꿀 수 없다고 적습니다. 이 IRQ를 격리 코어에서 빼려면 부팅 파라미터를 씁니다("부팅 시 기본값 — irqaffinity와 isolcpus" 절). controller가 affinity를 지원하지 않는 경우는 커널 문서가 값이 기본값(전체 CPU)에서 바뀌지 않는다고 설명합니다.

### irqbalance와 공존하기

irqbalance는 `/proc/irq/N/smp_affinity`에 직접 써서 IRQ를 옮기는 daemon입니다. 부하 표본은 기본 10초마다 잽니다([`constants.h`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/constants.h)의 `SLEEP_INTERVAL`, man page의 `-t`/`--interval`).

그렇다고 10초마다 모든 IRQ를 다시 쓰지는 않습니다. [`activate.c`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/activate.c)의 `activate_mapping()`은 이번 주기에 옮기기로 정한(`moved`) IRQ만 다루고, `check_affinity()`로 읽은 현재 값이 새 mask와 같으면 쓰지 않습니다. 손으로 쓴 값은 irqbalance가 그 IRQ를 다른 곳에 배치하기로 정한 주기에 덮어써집니다. [커널 RSS 문서](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/networking/scaling.rst)도 irqbalance가 수동 설정을 덮어쓸 수 있다고 적습니다.

수동 설정과 공존시키는 방법은 [irqbalance(1) man page](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/irqbalance.1)에 있습니다.

| 목적 | 방법 |
|---|---|
| 특정 IRQ를 건드리지 않게 | `--banirq=<irq>`, 여러 번 지정 가능 |
| 특정 CPU에 IRQ를 배정하지 않게 | `IRQBALANCE_BANNED_CPULIST=2-3` |
| 아예 끄기 | `systemctl disable --now irqbalance` |

`IRQBALANCE_BANNED_CPUS`(16진 mask)는 man page에 폐기 예정으로 표시돼 있고, 대신 `IRQBALANCE_BANNED_CPULIST`를 쓰라고 안내합니다. 둘 다 지정하지 않으면 irqbalance는 `/sys/devices/system/cpu/isolated`와 `/sys/devices/system/cpu/nohz_full`에 나온 CPU를 기본으로 제외합니다([`cputree.c`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/cputree.c)의 `setup_banned_cpus()`).

두 파일은 [`drivers/base/cpu.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/base/cpu.c)가 만들고(`nohz_full`은 `CONFIG_NO_HZ_FULL`일 때만), 어느 부팅 파라미터가 어느 파일에 CPU를 올리는지는 [`kernel/sched/isolation.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/sched/isolation.c)의 `isolcpus=`·`nohz_full=` 파싱이 정합니다. 같은 파일의 주석대로 `isolcpus=nohz`는 `nohz_full=`과 같습니다.

| 부팅 파라미터 | CPU가 나오는 파일 | irqbalance 기본 제외 |
|---|---|---|
| `isolcpus=2,3` (flag 없음) | `isolated` | 제외 |
| `isolcpus=domain,2,3` | `isolated` | 제외 |
| `isolcpus=managed_irq,7` | 없음 | 제외 안 됨 |
| `nohz_full=7` | `nohz_full` | 제외 |
| `isolcpus=nohz,7` | `nohz_full` | 제외 |

반대로 둘 중 하나라도 지정하면 같은 함수가 그 값만 쓰고 `isolated`·`nohz_full` 자동 제외를 건너뜁니다. `nohz_full=7`로 부팅한 시스템에 `IRQBALANCE_BANNED_CPULIST=2-3`을 넣으면 CPU7은 더 이상 제외되지 않습니다. 변수를 쓸 때는 격리 코어까지 목록에 함께 넣습니다(`2-3,7`).

변수는 systemd unit의 `EnvironmentFile`에 넣습니다. upstream unit([`misc/irqbalance.service.in`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/misc/irqbalance.service.in))에는 `EnvironmentFile=@pkgconfdir@/irqbalance.env`와 `EnvironmentFile=-@usrconfdir@/irqbalance` 두 줄이 있고, `ExecStart=/usr/sbin/irqbalance $IRQBALANCE_ARGS`로 `IRQBALANCE_ARGS`를 명령행에 그대로 넘깁니다. 두 자리표시자는 빌드 때 채워지므로, 실제 경로는 설치된 unit에서 `systemctl cat`으로 읽습니다. 변수 이름과 설명은 같은 디렉터리의 [`irqbalance.env`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/misc/irqbalance.env)에 주석으로 있습니다.

```bash
systemctl cat irqbalance | grep -E 'EnvironmentFile|ExecStart'
# in that EnvironmentFile:
#   IRQBALANCE_ARGS="--banirq=23 --banirq=24"
#   IRQBALANCE_BANNED_CPULIST=2-3
sudo systemctl restart irqbalance
```

### 부팅 시 기본값 — irqaffinity와 isolcpus

[CPU isolation 문서](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/admin-guide/cpu-isolation.rst)는 8-CPU 시스템에서 CPU7을 완전히 격리하는 예로 다음 명령행을 듭니다.

```text
nohz_full=7 irqaffinity=0-6 isolcpus=managed_irq,7 nosmt
```

IRQ에 관련된 항목은 둘입니다. [kernel-parameters 문서](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/admin-guide/kernel-parameters.txt)에서 `irqaffinity=0-6`은 기본 IRQ affinity mask를 정하고, `isolcpus=managed_irq,7`은 managed IRQ의 자동 배정 mask에 격리 CPU와 housekeeping CPU가 함께 있을 때 housekeeping 쪽으로 보냅니다. 문서는 이 격리를 best effort라고 적습니다.

flag 없이 쓴 `isolcpus=2,3`의 기본 flag는 `domain`이고, 문서 설명은 SMP balancing·scheduling에서 빼는 것까지입니다. `kernel/irq/` 코드가 참조하는 housekeeping 유형도 `HK_TYPE_MANAGED_IRQ` 하나뿐입니다. 일반 IRQ는 `irqaffinity=`가, managed IRQ는 `managed_irq` flag가 따로 맡습니다.

`irqaffinity=`에는 제약이 두 가지 있습니다. [`kernel/irq/irqdesc.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/irqdesc.c)의 `irq_affinity_setup()`은 사용자가 준 목록에 boot CPU를 항상 추가하므로, boot CPU를 IRQ 대상에서 빼는 용도로는 쓸 수 없습니다. 또 기본 mask는 IRQ descriptor를 할당할 때와 일반 IRQ를 처음 시작할 때([`kernel/irq/chip.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/chip.c)의 `irq_startup()`)에만 적용되므로, 이미 시작된 IRQ는 옮겨지지 않습니다. 시작 전에 사용자가 값을 써 둔 IRQ는 그 값에 online CPU가 있으면 그 값을 유지하고, managed IRQ는 기본 mask 대신 자기 mask를 씁니다.

같은 기본 mask는 부팅 뒤 `/proc/irq/default_smp_affinity`로도 바꿀 수 있습니다. `kernel/irq/proc.c`의 `default_affinity_write()`는 `smp_affinity`와 같은 16진 bitmask만 받고(list 형식 파일은 없음), online CPU가 하나도 없는 mask는 `-EINVAL`로 거절합니다. boot CPU를 강제로 넣는 코드는 이 경로에 없습니다. 앞의 규칙대로 이 값은 그 뒤에 할당되거나 시작되는 IRQ에만 적용되므로, 이미 시작된 IRQ는 `smp_affinity_list`로 하나씩 옮깁니다. `/proc/irq/N/` 디렉터리가 있다는 것만으로는 시작 여부를 알 수 없습니다. "쓰기가 거부되는 경우" 절에서 본 것처럼 디렉터리는 부팅 초기에 chip이 정해진 IRQ마다 미리 만들어집니다.

```bash
# CPU0-6 on an 8-CPU system (hex only)
echo 7f > /proc/irq/default_smp_affinity
cat /proc/irq/default_smp_affinity
```

부팅 뒤에는 격리가 적용됐는지와 housekeeping 범위를 벗어난 IRQ가 남았는지 확인합니다. 예시 명령행(`isolcpus=managed_irq,7`)이라면 `isolated`는 빈 줄이고 `nohz_full`에 `7`이 나옵니다.

```bash
# isolcpus= without flags or with domain
cat /sys/devices/system/cpu/isolated
# nohz_full= (CONFIG_NO_HZ_FULL only)
cat /sys/devices/system/cpu/nohz_full
for f in /proc/irq/[0-9]*/smp_affinity_list; do
    printf '%s: %s\n' "$f" "$(cat "$f")"
done | grep -vE ': 0-6$'
```

### NIC multi-queue — queue별 IRQ 분배

[커널 RSS 문서](https://github.com/torvalds/linux/blob/v7.3-rc6/Documentation/networking/scaling.rst)에 따르면 receive queue마다 IRQ가 따로 있고, PCIe 장치는 MSI-X로 각 IRQ를 특정 CPU에 보낼 수 있습니다.

queue 수는 [ethtool v7.1의 ethtool(8)](https://git.kernel.org/pub/scm/network/ethtool/ethtool.git/tree/ethtool.8.in?h=v7.1)의 `-l`/`-L`로 보고 바꿉니다. man page는 channel을 "IRQ 하나와 그 IRQ를 일으킬 수 있는 queue들의 묶음"으로 정의하고, `combined`는 다목적 channel 수입니다.

```bash
sudo ethtool -l eth0
sudo ethtool -L eth0 combined 4
```

queue IRQ 이름은 driver가 `request_irq()`에 넘긴 문자열이고, `/proc/interrupts` 각 줄의 마지막 열에 찍힙니다([`kernel/irq/proc.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/proc.c)의 `show_interrupts()`). 형식은 driver가 정하므로, 먼저 `grep eth0 /proc/interrupts`로 queue IRQ만 골라낼 패턴을 정해 아래 스크립트의 `pat`에 넣습니다.

```bash
#!/bin/bash
IFACE=eth0
CPUS=(0 1 2 3)          # target CPUs, round-robin
i=0
IRQS=$(awk -v pat="^${IFACE}-" \
    '$NF ~ pat { sub(":", "", $1); print $1 }' /proc/interrupts)
for irq in $IRQS; do
    cpu=${CPUS[i % ${#CPUS[@]}]}
    echo "$cpu" > /proc/irq/$irq/smp_affinity_list
    echo "IRQ $irq -> CPU $cpu"
    i=$((i + 1))
done
```

bitmask 대신 `smp_affinity_list`에 CPU 번호를 그대로 쓰므로 10진·16진 혼동이 생기지 않습니다. 격리 코어는 `CPUS`에서 빼고, irqbalance가 켜져 있다면 이 IRQ들을 `--banirq`로 제외해야 값이 유지됩니다. 쓰기가 `EPERM`으로 실패하면 "쓰기가 거부되는 경우" 절 표의 조건 중 하나입니다.

### PREEMPT_RT — threaded IRQ의 affinity와 priority

[`include/linux/interrupt.h`](https://github.com/torvalds/linux/blob/v7.3-rc6/include/linux/interrupt.h)에서 `CONFIG_PREEMPT_RT`이면 `force_irqthreads()`가 항상 참입니다. RT가 아닌 커널에서는 `CONFIG_IRQ_FORCED_THREADING`이 켜져 있을 때 `threadirqs` 부팅 파라미터가 같은 일을 하고, 이 옵션이 없으면 `force_irqthreads()`는 항상 거짓입니다. arm64는 [`arch/arm64/Kconfig`](https://github.com/torvalds/linux/blob/v7.3-rc6/arch/arm64/Kconfig)에서 이 옵션을 select합니다. `irq_setup_forced_threading()`([`manage.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/manage.c))은 `IRQF_NO_THREAD`·`IRQF_PERCPU`·`IRQF_ONESHOT` 중 하나라도 붙은 action은 handler를 바꾸기 전에 바로 돌려보내고, primary handler가 이미 `irq_default_primary_handler`인 action도 건드리지 않습니다. 그래서 PREEMPT_RT에서도 hardirq 문맥에서 도는 코드가 남습니다.

- `IRQF_NO_THREAD`·`IRQF_PERCPU`가 붙은 action의 handler. `IRQF_TIMER`는 정의에 `IRQF_NO_THREAD`를 포함하므로 timer IRQ도 여기에 듭니다.
- `IRQF_ONESHOT`으로 등록하면서 primary handler를 직접 넘긴 action의 primary handler. `thread_fn`만 `irq/<번호>-<이름>` thread로 돕니다.

`request_threaded_irq()`에 primary handler로 `NULL`을 넘기면 함수가 그 자리에 `irq_default_primary_handler`를 넣으므로, hardirq에서는 thread를 깨우는 일만 합니다. 첫 번째 경우의 handler에는 아래의 thread 조정이 적용되지 않습니다.

같은 파일에서 확인되는 두 가지가 운영 방식을 정합니다.

- **이름과 기본 priority.** thread 이름은 `irq/<번호>-<이름>`이고, `irq_thread()`가 `sched_set_fifo()`를 불러 SCHED_FIFO `MAX_RT_PRIO / 2`, 즉 50으로 시작합니다. 강제 threading된 IRQ가 primary handler와 `thread_fn`을 둘 다 가졌다면 `thread_fn`은 `irq/<번호>-s-<이름>`이라는 secondary thread로 따로 돌고, [`kernel/sched/syscalls.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/sched/syscalls.c)의 `sched_set_fifo_secondary()`가 주는 `MAX_RT_PRIO / 2 - 1`, 즉 49로 시작합니다. priority를 올릴 때는 두 thread를 함께 봅니다.
- **affinity는 IRQ를 따라간다.** IRQ affinity가 바뀌면 primary·secondary thread 모두 다음에 대기 루프로 돌아올 때 IRQ의 effective affinity를 자기 CPU mask로 복사합니다(`irq_thread_check_affinity()`). 반대 방향, 즉 thread만 옮기는 것은 안 됩니다. `setup_irq_thread()`가 thread를 만들 때 부르는 [`kthread_bind_mask()`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/kthread.c)가 `PF_NO_SETAFFINITY`를 켜고, 이 flag가 있으면 `sched_setaffinity()`가 `-EINVAL`을 돌려주므로 `taskset -p`는 `Invalid argument`로 실패합니다. `setup_irq_thread()`의 주석도 vector 전체를 옮기라고 적습니다. thread의 위치는 `smp_affinity`로 정합니다.

```bash
# IRQ threads (irq/N-name and irq/N-s-name) with their policy/priority
for pid in $(ps -e -o pid=,comm= | awk '$2 ~ /^irq\// { print $1 }'); do
    printf '%s ' "$(ps -o comm= -p "$pid")"
    chrt --pid "$pid" | tr '\n' ' '; echo
done

# change one IRQ thread's SCHED_FIFO priority
sudo chrt --pid -f <prio> <pid>

# move the IRQ, and therefore its thread, to CPU1
echo 1 > /proc/irq/23/smp_affinity_list
```

`sched_set_fifo()` 위의 주석이 적듯 커널은 알맞은 priority를 고를 정보가 없으므로, 50·49는 출발점일 뿐이고 같은 CPU의 RT task와의 순서는 관리자가 정해 넣습니다. 위의 `chrt --pid` 두 형식(조회, 정책·priority 지정)은 [util-linux v2.42.4의 chrt(1)](https://github.com/util-linux/util-linux/blob/v2.42.4/schedutils/chrt.1.adoc)에 있고, 바꾸려면 `CAP_SYS_NICE`가 필요합니다.

### Driver 쪽 — affinity hint API

```c
/* hint only; the affinity itself is not changed */
irq_update_affinity_hint(irq, cpumask_of(2));

/* set the hint and apply it as the affinity */
irq_set_affinity_and_hint(irq, cpumask_of(2));

/* before free_irq(): clear the hint */
irq_update_affinity_hint(irq, NULL);
```

[`include/linux/interrupt.h`](https://github.com/torvalds/linux/blob/v7.3-rc6/include/linux/interrupt.h)는 예전 `irq_set_affinity_hint()`를 deprecated로 표시하고 위 두 함수를 쓰라고 안내합니다. 기존 함수는 내부에서 `irq_set_affinity_and_hint()`를 부르므로 hint 등록과 함께 affinity도 바꿉니다. `free_irq()` 경로의 `__free_irq()`는 hint가 남아 있으면 `WARN_ON_ONCE`를 띄우므로 해제 전에 `NULL`로 지웁니다. hint는 `/proc/irq/N/affinity_hint`로 user space에 보이지만, irqbalance 1.9.5 daemon의 C 소스에는 이 파일을 읽는 코드가 없습니다. 즉 hint만 등록해서는 irqbalance가 그 IRQ를 다른 곳으로 옮길 수 있습니다.

hint를 지키게 하려면 irqbalance의 `--policyscript`(`-l`)를 씁니다. man page에 따르면 irqbalance는 IRQ마다 이 script를 sysfs 장치 경로와 IRQ 번호를 인자로 실행하고, script가 stdout에 찍은 `ban=true` 같은 key=value를 읽습니다. v1.9.5 tree에 들어 있는 예제 [`follow-affinity-hint.example`](https://github.com/Irqbalance/irqbalance/blob/v1.9.5/misc/irqbalance.policy.d/follow-affinity-hint.example)이 바로 이 용도입니다. 장치의 `uevent`에서 `DRIVER=`가 `AFFINITY_WHITELIST`에 든 driver이고 `affinity_hint`에 켜진 bit가 있으면 `ban=true`를 찍어 balancing에서 빼고, hint 값을 `smp_affinity`에 다시 씁니다. 예제 파일 첫머리 주석은 이 파일을 고치지 말고 자기 script를 만들 때 틀로 쓰라고 적습니다. 특정 IRQ 번호만 빼면 되는 경우라면 앞의 `--banirq`로도 충분합니다.

## 효과 확인 절차

설정을 바꿨다면 두 가지를 함께 기록합니다. 이 글은 기록 절차만 싣고 측정 결과는 싣지 않습니다.

1. **IRQ가 어디로 가는지.** 부하 전후의 `/proc/interrupts`를 저장해 열별 증가량을 비교합니다. 격리 코어 열이 늘지 않아야 합니다.
2. **격리 코어의 지연.** [rt-tests v2.11의 cyclictest](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.8?h=v2.11)를 격리 코어(아래 예에서는 CPU7)에 묶어 돌리고 histogram을 저장합니다.

```bash
cat /proc/interrupts > irq-before.txt
sudo cyclictest -m -p 80 -t 1 -a 7 -i 1000 -D 10m -h 400 -q > cyclictest-cpu7.txt
cat /proc/interrupts > irq-after.txt
```

비교는 설정 하나만 다른 상태끼리 합니다. 예를 들어 `irqaffinity=` 유무만 바꾸고 같은 부하(NIC 트래픽, 저장장치 I/O)로 두 번 돌린 뒤 histogram의 꼬리와 `/proc/interrupts` 증가량을 함께 봅니다.

## 자주 보는 함정

본문에서 원인을 이미 다룬 증상은 해당 절로 연결만 합니다.

- **손으로 쓴 값이 몇 초 뒤 바뀌어 있다.** irqbalance가 그 IRQ를 옮겼습니다. "irqbalance와 공존하기" 절의 `--banirq`를 씁니다.
- **`IRQBALANCE_BANNED_CPULIST`를 넣었더니 격리 코어에 IRQ가 들어온다.** 변수가 `isolated`·`nohz_full` 자동 제외를 끕니다. 그 절에서 본 대로 격리 코어도 목록에 넣습니다.
- **`$((1 << n))` 값을 `smp_affinity`에 썼더니 엉뚱한 CPU로 가거나 쓰기가 실패한다.** CPU0~3은 10진·16진 값(1·2·4·8)이 같아 우연히 맞고, CPU4부터 10진 값이 16진으로 읽힙니다. "bitmask 읽는 법" 절.
- **`isolcpus=`만 두었는데 격리 코어에 IRQ가 온다.** IRQ 격리는 `irqaffinity=`와 `managed_irq` flag가 맡습니다. "부팅 시 기본값 — irqaffinity와 isolcpus" 절.
- **GIC에서 넓은 mask를 줬는데 한 코어에 몰린다.** SPI는 mask 안의 가장 낮은 번호 online CPU로만 갑니다. "smp_affinity와 effective_affinity" 절.

아래 두 경우는 쓴 값이 거부되지 않고 받아들여진 뒤 커널이 바꿔 놓는 경우입니다.

### CPU hotplug 뒤 affinity가 바뀌어 있음

[`kernel/irq/cpuhotplug.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/irq/cpuhotplug.c)의 `migrate_one_irq()`는 CPU가 내려갈 때 IRQ의 affinity에 online CPU가 하나도 남지 않으면, managed IRQ는 shutdown하고 일반 IRQ는 affinity를 그 순간의 `cpu_online_mask`로 바꿔 저장합니다. arm64의 [`__cpu_disable()`](https://github.com/torvalds/linux/blob/v7.3-rc6/arch/arm64/kernel/smp.c)은 CPU를 online mask에서 먼저 뺀 뒤 IRQ를 옮기므로, 내려가는 CPU는 그 집합에 들어가지 않습니다.

CPU가 다시 올라올 때 `irq_affinity_online_cpu()`가 복원하는 대상은 managed IRQ뿐입니다. 코드대로라면 4-CPU arm64 시스템에서 CPU1만 허용하던 일반 IRQ는 `echo 0 > /sys/devices/system/cpu/cpu1/online` 뒤 `smp_affinity_list`가 `0,2-3`이 되고, CPU1을 다시 올려도 CPU1은 돌아오지 않습니다. CPU를 내렸다 올리는 시스템이라면 affinity 적용 스크립트를 CPU online 뒤에도 다시 돌립니다. sysfs의 `online` 파일로 CPU를 올리면 [`drivers/base/core.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/base/core.c)의 `device_online()`이 그 CPU 장치(subsystem `cpu`)에 `online` uevent를 보내므로, udev 규칙에서 이 이벤트에 스크립트를 겁니다. [systemd v258의 udev(7)](https://github.com/systemd/systemd/blob/v258/man/udev.xml)는 `RUN`을 아주 짧게 끝나는 foreground 작업에만 허용하므로, 스크립트는 `smp_affinity_list`만 쓰고 바로 끝나야 합니다.

```text
# /etc/udev/rules.d/90-irq-affinity.rules
SUBSYSTEM=="cpu", ACTION=="online", RUN+="/usr/local/sbin/irq-affinity.sh"
```

### suspend에서 깨어난 뒤 affinity가 바뀌어 있음

udev 규칙은 suspend-to-RAM을 덮지 못합니다. [`kernel/power/suspend.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/power/suspend.c)의 `suspend_enter()`는 suspend-to-idle이 아니면 secondary CPU를 내렸다 올리는데, 이 경로([`kernel/cpu.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/kernel/cpu.c)의 `freeze_secondary_cpus()`·`thaw_secondary_cpus()`)는 `online` uevent를 보내지 않습니다. 그 uevent는 sysfs `online` 파일 경로의 `device_online()`과 SMT 제어 경로에서만 나갑니다. CPU를 내리는 동안 일반 IRQ의 affinity가 깨지고 올라올 때 managed IRQ만 복원되는 것은 hotplug와 같습니다. suspend-to-idle은 CPU를 내리지 않으므로 해당하지 않습니다.

systemd를 쓰는 시스템이라면 [systemd v258의 systemd-suspend.service(8)](https://github.com/systemd/systemd/blob/v258/man/systemd-suspend.service.xml)에 적힌 sleep hook으로 다시 적용합니다. suspend 직전과 직후에 `/usr/lib/systemd/system-sleep/`의 실행 파일을 첫 인자 `pre`·`post`로 실행하므로, `post`일 때 같은 스크립트를 부릅니다. 같은 man page는 이 디렉터리의 실행 파일을 로컬 전용 임시방편(hack)으로 보라고 적고, 응용 프로그램이라면 inhibitor lock을 쓰라고 안내합니다.

```bash
#!/bin/sh
# /usr/lib/systemd/system-sleep/irq-affinity
[ "$1" = post ] && exec /usr/local/sbin/irq-affinity.sh
exit 0
```

## 정리

- **받는 CPU는 mask가 아니라 controller driver가 정합니다.** GIC SPI는 가장 낮은 번호, ITS는 LPI가 가장 적은 CPU, DWC MSI는 parent IRQ를 받은 CPU가 mask 안이면 그 CPU, 밖이면 mask의 첫 CPU입니다. 결과를 고정하려면 IRQ마다 CPU 하나를 `smp_affinity_list`로 주고, 분산은 mask를 넓히는 대신 IRQ(queue) 수로 합니다.
- **쓴 값이 반영되지 않는 길은 둘입니다.** 쓰기 자체가 `EPERM`으로 거부되거나(파일 권한이 아니라 반환값으로 판단), 기본 mask(`irqaffinity=`, `default_smp_affinity`)가 이미 시작된 IRQ에 닿지 않는 경우입니다. managed IRQ와 boot CPU는 `/proc`로 다룰 수 없어 `isolcpus=managed_irq`처럼 부팅 파라미터로 정합니다.
- **받아들여진 값을 바꾸는 writer는 셋입니다.** irqbalance(`--banirq`, 격리 코어를 포함한 `IRQBALANCE_BANNED_CPULIST`), CPU hotplug(udev `online` 규칙), suspend-to-RAM(sleep hook). 각각에 맞는 지점에서 같은 스크립트를 다시 돌립니다.
- **PREEMPT_RT의 IRQ thread는 IRQ를 따라갑니다.** 위치는 `smp_affinity`로만 정해지고(`taskset`은 `EINVAL`), priority는 `chrt`로 50·49에서 조정합니다.

다음 편은 [루트 파일시스템 구축 — Buildroot 기초·Package·Toolchain](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)입니다.

## 관련 항목

- [7-12: sysfs·configfs 활용](/blog/embedded/modern-recipes/part7-12-sysfs)
- [PE 6-01: 실전 사례 — ISR Latency 100µs Deadline Miss 추적](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
- [PE 3-06: Interrupt Storm 처리 — NAPI·Rate-Limit·Polling 전환](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
- [RTOS 5-07: PREEMPT_RT Linux — Mainline 6.12·Xenomai 4·EVL](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux) — IRQ thread의 CPU는 `taskset`으로 옮길 수 없습니다. 이 글의 "PREEMPT_RT — threaded IRQ의 affinity와 priority" 절을 함께 봅니다.
- [Industrial Ethernet 11: 리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime) — `irqaffinity=`는 boot CPU를 항상 포함하고 managed IRQ는 옮기지 않습니다. 이 글의 "부팅 시 기본값 — irqaffinity와 isolcpus" 절을 함께 봅니다.
