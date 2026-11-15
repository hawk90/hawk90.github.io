---
title: "Multi-core SMP Bring-up — PSCI·Secondary CPU 깨우기"
slug: "embedded/bsp/chapter09-smp-bringup"
date: 2026-05-18T09:09:00
description: "보드의 다른 코어를 깨우는 절차를 정리합니다. PSCI, spin-table, ARM CPU hotplug의 흐름을 살펴봅니다."
series: "BSP Development"
seriesOrder: 9
tags: [embedded, bsp, smp, psci, multicore]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**Secondary CPU의 시작·대기 상태는 SoC와 firmware boot design에 따라 달라집니다.** Linux는 DT/firmware가 설명한 CPU enable method를 사용해 추가 CPU를 온라인 상태로 가져옵니다. PSCI는 이 약속을 펌웨어 레벨로 표준화한 인터페이스입니다.

많은 SoC는 reset 뒤 boot CPU를 선택하고 다른 CPU를 firmware 대기 루프나 저전력 상태에 둡니다. 이 동작은 보편적인 BootROM 규칙이 아니므로 SoC TRM과 boot firmware에서 확인합니다. 그래서 BSP의 책임 중 하나는 *secondary CPU를 깨우는 신호*를 정확히 보내는 일입니다. 잘못된 부팅 주소나 stack을 주면 secondary CPU가 첫 명령어에서 그대로 죽고, 사용자는 dmesg에 `CPU1: failed to come online`만 보게 됩니다.

## CPU bring-up의 큰 그림

Boot CPU와 secondary CPU의 단계는 boot firmware와 `enable-method`에 따라 다릅니다. PSCI를 사용하면 Linux가 firmware interface로 CPU_ON을 요청하고, spin-table을 사용하면 kernel과 platform이 release location을 통해 handoff합니다. secondary CPU가 Linux kernel에 진입할 때의 exception level은 arm64 boot protocol 조건을 따라야 하며, 모든 구성에서 `EL3 → EL2 → EL1` 순으로 내려간다고 볼 수 없습니다.

<!-- TODO: TikZ — boot CPU와 secondary CPU의 병렬 bring-up 흐름도 -->

이 절차의 핵심은 *enable-method*를 무엇으로 선택했는지입니다.

## enable-method — PSCI vs spin-table

DT의 `cpus` 노드가 각 CPU의 깨우는 방법을 선언합니다.

```text
cpus {
    #address-cells = <2>;
    #size-cells = <0>;

    cpu0: cpu@0 {
        device_type = "cpu";
        compatible = "arm,cortex-a72";
        reg = <0x0 0x0>;
        enable-method = "psci";
    };

    cpu1: cpu@1 {
        device_type = "cpu";
        compatible = "arm,cortex-a72";
        reg = <0x0 0x1>;
        enable-method = "psci";
    };

    cpu2: cpu@100 {
        device_type = "cpu";
        compatible = "arm,cortex-a72";
        reg = <0x0 0x100>;
        enable-method = "psci";
    };
    /* ... */
};

psci {
    compatible = "arm,psci-1.0";
    method = "smc";
    cpu_suspend = <0xc4000001>;
    cpu_off     = <0x84000002>;
    cpu_on      = <0xc4000003>;
};
```

| 방식 | 동작 | 보드 예 |
|------|------|---------|
| `psci` | kernel이 DT에 지정한 SMC/HVC conduit로 PSCI firmware에 요청 | 해당 보드의 firmware·DT 조합에서 확인 |
| `spin-table` | DT에 적힌 *release address*에 secondary CPU 점프 주소를 쓰고 SEV로 깨움 | 초기 arm64, 일부 32-bit ARM |
| `local-timer` (32-bit ARM) | 보드 specific 메커니즘 | 오래된 OMAP, i.MX6 등 |

arm64 DT binding은 `psci` 또는 `spin-table`을 enable method로 정의합니다. 32-bit ARM은 SoC별 method가 다양하므로 대상 DTS와 kernel binding을 확인합니다.

## PSCI 흐름 — CPU_ON

PSCI CPU_ON 개념 흐름은 kernel, firmware, target CPU 단계로 나눠 볼 수 있습니다. 구체 함수와 exception-level handoff는 커널 및 firmware 버전에 따라 달라집니다.

- **Linux side** (`arch/arm64/kernel/psci.c`) — `cpu_psci_cpu_boot()`가 `invoke_psci_fn(PSCI_0_2_FN_CPU_ON, mpidr, entry_point, 0)`을 호출하고, 이는 다시 `smc #0`(또는 configurable하게 `hvc`)을 발행합니다.
- **Firmware side** (ATF BL31, `services/std_svc/psci/`) — `psci_cpu_on_start()`가 secondary CPU의 power domain을 켜고 reset을 풀며, `entry_point`를 보안 RAM에 stash한 뒤 secondary CPU의 ROM이 BL31의 warm boot vector로 점프하게 합니다.
- **Secondary CPU side** — BL31 warm boot vector가 EL3에서 컨텍스트를 설정하고 `EL3 → EL1`으로 ERET한 뒤, `entry_point`(Linux의 `secondary_entry`)로 점프합니다.

<!-- TODO: TikZ — Linux / Firmware / Secondary CPU 3-side PSCI CPU_ON call flow -->

여기서 `entry_point`는 Linux 커널이 미리 정한 secondary entry입니다. arm64에서는 `arch/arm64/kernel/head.S`의 `secondary_entry` 심볼입니다.

```c
/* arch/arm64/kernel/smp.c 발췌 (개념) */

static int cpu_psci_cpu_boot(unsigned int cpu)
{
    phys_addr_t pa_secondary_entry = __pa_symbol(secondary_entry);
    int err = psci_ops.cpu_on(cpu_logical_map(cpu), pa_secondary_entry);
    if (err)
        pr_err("failed to boot CPU%d (%d)\n", cpu, err);
    return err;
}
```

`psci_ops.cpu_on`은 SMC instruction을 발행합니다. SMC가 EL3로 trap되면 ATF BL31의 PSCI handler가 받아 처리합니다.

## spin-table — PSCI 없는 환경

오래된 보드 또는 ATF가 없는 환경에서는 spin-table 방식을 씁니다.

```text
cpu1: cpu@1 {
    device_type = "cpu";
    compatible = "arm,cortex-a53";
    reg = <0x0 0x1>;
    enable-method = "spin-table";
    cpu-release-addr = <0x0 0x80000ff8>;
};
```

``cpu-release-addr`은 자연 정렬된 64-bit zero-initialized memory location을 가리키며, secondary CPU의 polling code가 이를 읽습니다. 해당 location은 Linux가 일반 RAM으로 사용할 수 없도록 reserved area에 두어야 합니다. 아래 DT fragment는 이 reservation과 firmware setup을 포함하지 않은 설명용 예시입니다. 실제 설정은 SoC와 boot firmware 문서에 맞춰야 합니다. Loop는 대략 다음과 같습니다.

**secondary_holding_pen:**

- ldr  x0, [release_addr]   ; release 주소 폴링
- cbz  x0, secondary_holding_pen   ; 0이면 계속 spin
- br   x0                   ; 0 아니면 그 주소로 점프

arm64 boot protocol의 spin-table 흐름에서 boot CPU는 release location에 secondary entry address를 쓰고 필요하면 SEV를 보냅니다. 이 설명은 protocol 조건을 설명하며, 이 글의 샘플 주소를 실제 보드에서 사용할 수 있다는 뜻은 아닙니다.

PSCI에 비해 단순하지만 단점이 명확합니다.

- 단순 spin-table 구현은 PSCI처럼 CPU power management 기능을 제공하지 않습니다. 구체적인 CPU off/hotplug 지원은 SoC firmware와 kernel 구현을 확인합니다.
- spin-table은 CPU enable protocol이며 secure-world 기능은 별도의 firmware/security design 문제입니다.
- Hotplug, idle 진입 등 power management 통합이 어렵습니다.

## CPU 부팅 인자

커널이 secondary CPU를 깨울 때 넘겨야 하는 정보가 있습니다.

```c
/* arch/arm64/kernel/head.S 발췌 (개념) */

ENTRY(secondary_entry)
    bl      stext_secondary
    ...

ENTRY(stext_secondary)
    mrs     x0, mpidr_el1     // CPU ID 읽기
    and     x0, x0, #0xff
    adr     x1, secondary_data
    add     sp, x1, #(THREAD_SIZE - 16)   // stack 설정
    ...
```

각 secondary CPU는 *자기만의 stack*과 *task_struct*를 가져야 합니다. Boot CPU가 `secondary_data` 구조에 이를 준비해 두고, secondary CPU가 점프해 와서 자기 stack pointer를 설정합니다.

## smp_cpus_init — 커널 시작

`start_kernel()` 후반에서 `rest_init()` → `kernel_init()` → `smp_init()`이 호출됩니다.

```text
[Boot CPU]
start_kernel()
  ├─ setup_arch()           # DT 파싱, MPIDR로 CPU 발견
  ├─ smp_prepare_cpus()     # enable-method 등록
  └─ rest_init()
       └─ kernel_init()
            └─ smp_init()
                 └─ for each cpu: cpu_up(cpu)
                      └─ __cpu_up()
                           └─ smp_ops.cpu_boot(cpu)
                                └─ cpu_psci_cpu_boot(cpu)
```

성공하면 dmesg에 다음 라인이 차례로 보입니다.

```text
[    0.123456] smp: Bringing up secondary CPUs ...
[    0.234567] Detected PIPT I-cache on CPU1
[    0.234890] GICv3: CPU1: found redistributor 0 region 0:0x0000000038900000
[    0.235123] CPU1: Booted secondary processor 0x0000000001 [0x410fd083]
[    0.345678] Detected PIPT I-cache on CPU2
[    0.346234] CPU2: Booted secondary processor 0x0000000002 [0x410fd083]
[    0.456789] smp: Brought up 1 node, 4 CPUs
[    0.467890] SMP: Total of 4 processors activated (96.00 BogoMIPS).
```

## kernel CPU hotplug

PSCI가 정상이라면 부팅 후에도 CPU를 동적으로 켜고 끌 수 있습니다.

```bash
# CPU2 끄기
echo 0 > /sys/devices/system/cpu/cpu2/online

# CPU2 켜기
echo 1 > /sys/devices/system/cpu/cpu2/online

# 현재 online 상태
cat /sys/devices/system/cpu/online
# 0-3
```

내부적으로는 `cpu_down()` → PSCI `CPU_OFF` SMC, `cpu_up()` → PSCI `CPU_ON` SMC가 호출됩니다. 이 메커니즘이 `cpuidle`, `cpufreq` 같은 PM 기능의 기반이 됩니다.

## 흔한 실패 모드

### CPU1만 안 올라옴

```text
[    0.234567] CPU1: failed to come online (-22)
```

`-22`는 `-EINVAL`입니다. 보통 `cpu-release-addr` 또는 PSCI 펌웨어 인터페이스가 잘못된 경우입니다. DT의 `psci` 노드 `method`가 `smc`인데 펌웨어가 `hvc`로 응답 대기하면 timeout으로 실패합니다.

### 모든 secondary CPU 실패

```text
[    0.234567] smp: Brought up 1 node, 1 CPU
```

`enable-method`가 빠졌거나, ATF BL31이 동작하지 않거나, `compatible`이 잘못 적힌 경우입니다. `arm,psci-1.0` 또는 `arm,psci-0.2` 중 펌웨어가 지원하는 버전을 정확히 적어야 합니다.

### secondary CPU가 BootROM에서 멈춤

JTAG로 보면 secondary CPU가 BL31에 도달하지 못한 상황입니다. ATF의 secondary entry point가 SPL 단계에서 RVBAR에 설정되지 않았기 때문입니다. SoC TRM의 RVBAR/WBAR 동작을 확인하고 SPL이 정확한 주소를 심는지 검증합니다.

### 클럭 부족으로 secondary CPU 동작 이상

Secondary CPU의 PLL이 boot CPU와 다른 도메인에 있으면 BSP가 명시적으로 켜야 합니다. CPU0은 정상인데 CPU1만 BogoMIPS가 절반이라면 PLL/divider 의심해야 합니다.

## 정리

- Secondary CPU는 reset 직후 WFE 상태로 정지해 있으며, boot CPU가 명시적으로 깨워야 합니다.
- 깨우는 방법은 DT `cpus` 노드의 `enable-method`로 선택하며, 최신 arm64는 `psci`가 표준입니다.
- PSCI는 SMC instruction으로 ATF BL31에 요청을 보내는 펌웨어 인터페이스입니다.
- PSCI v0.2 이상에서는 표준 function ID를 사용하고, v0.1 compatibility binding은 function ID를 DT에 제공할 수 있습니다. `method`는 firmware가 제공하는 SMC 또는 HVC conduit와 일치해야 합니다.
- spin-table은 단순하지만 power off가 안 되고 hotplug·idle과 연동하기 어렵습니다.
- Secondary CPU는 자기 stack과 task_struct를 가져야 하며, boot CPU가 `secondary_data`로 전달합니다.
- 부팅 성공 시 dmesg에 `CPU1: Booted secondary processor` 라인이 보이고, 실패 시 `-EINVAL` 같은 오류로 가시화됩니다.
- CPU hotplug는 kernel config, platform firmware, CPU topology 및 해당 CPU의 disable support에 달려 있습니다. `/sys/devices/system/cpu/` 노출만으로 hotplug 동작을 보장하지 않습니다.

## 다음 편 예고

[Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)에서는 보드를 켠 순간부터 login이 뜨기까지의 전체 부팅 단계를 체크포인트별로 따라갑니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management) — CPU hotplug와 cpuidle 통합
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — multi-core scheduling 기본
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — SMP scaling
