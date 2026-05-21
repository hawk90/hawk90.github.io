---
title: "Ch 9: Multi-core SMP bring-up"
date: 2026-05-09T09:00:00
description: "보드의 다른 코어를 깨우는 절차를 정리합니다. PSCI, spin-table, ARM CPU hotplug의 흐름을 살펴봅니다."
series: "BSP Development"
seriesOrder: 9
tags: [embedded, bsp, smp, psci, multicore]
draft: false
---

## 한 줄 요약

**Secondary CPU는 reset 직후 *깨어 있지만 멈춰 있는* 상태입니다.** Boot CPU가 명시적으로 "여기로 점프해서 일을 시작해"라고 알려줘야 비로소 SMP가 시작됩니다. PSCI는 이 약속을 펌웨어 레벨로 표준화한 인터페이스입니다.

ARM Cortex-A 코어가 여러 개인 SoC를 켜면 BootROM은 *CPU0 하나만* 실제로 코드를 실행합니다. 나머지 코어들은 WFE(Wait For Event) 또는 WFI 상태로 reset 직후 정지해 있습니다. 그래서 BSP의 책임 중 하나는 *secondary CPU를 깨우는 신호*를 정확히 보내는 일입니다. 잘못된 부팅 주소나 stack을 주면 secondary CPU가 첫 명령어에서 그대로 죽고, 사용자는 dmesg에 `CPU1: failed to come online`만 보게 됩니다.

## CPU bring-up의 큰 그림

```text
[Boot CPU (CPU0)]                  [Secondary CPU (CPU1..N)]
  ROM → SPL → ATF → U-Boot          WFE 상태로 정지
  ↓                                  
  Kernel start_kernel()              
  ↓                                  
  smp_init() 호출                    
  ↓                                  
  enable-method 확인 ──────────────→ PSCI_CPU_ON SMC 호출
                                     또는
                                     spin-table 주소 갱신 + sev
                                     ↓
                                     ATF/펌웨어가 CPU 깨움
                                     ↓
                                     EL3 → EL2 → EL1 점프
                                     ↓
                                     secondary_entry (커널)
                                     ↓
                                     C 코드 ready, CPU online
```

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
| `psci` | Boot CPU가 SMC instruction으로 펌웨어(ATF BL31)에 요청. 펌웨어가 secondary CPU 깨움 | i.MX8M, RK3588, BCM2711, 최신 arm64 전부 |
| `spin-table` | DT에 적힌 *release address*에 secondary CPU 점프 주소를 쓰고 SEV로 깨움 | 초기 arm64, 일부 32-bit ARM |
| `local-timer` (32-bit ARM) | 보드 specific 메커니즘 | 오래된 OMAP, i.MX6 등 |

mainline에서는 PSCI를 기본 선택지로 보고 있고, 32-bit ARM 보드도 점차 PSCI로 이동했습니다.

## PSCI 흐름 — CPU_ON

ARMv8 PSCI 1.0+ 기준입니다.

```text
[Linux side: kernel/arch/arm64/kernel/psci.c]

cpu_psci_cpu_boot(unsigned int cpu)
    └─ invoke_psci_fn(PSCI_0_2_FN_CPU_ON, mpidr, entry_point, 0)
        └─ smc #0   (또는 hvc, configurable)

[Firmware side: ATF BL31 (services/std_svc/psci/)]

psci_cpu_on_start()
    ├─ secondary CPU의 power domain ON
    ├─ release reset
    ├─ entry_point를 보안 RAM에 stash
    └─ secondary CPU의 ROM이 BL31의 warm boot vector로 점프

[Secondary CPU side]

BL31 warm boot vector
    ├─ EL3에서 컨텍스트 설정
    ├─ EL3 → EL1으로 ERET
    └─ entry_point (Linux의 secondary_entry) 점프
```

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
    cpu-release-addr = <0x0 0x80000fff8>;
};
```

`cpu-release-addr`이 가리키는 메모리는 SPL/U-Boot가 secondary CPU에게 *busy-wait loop*를 미리 심어 놓은 곳입니다. Loop는 대략 다음과 같습니다.

**secondary_holding_pen:**

- ldr  x0, [release_addr]   ; release 주소 폴링
- cbz  x0, secondary_holding_pen   ; 0이면 계속 spin
- br   x0                   ; 0 아니면 그 주소로 점프

Linux가 `cpu-release-addr`에 `secondary_entry`의 물리 주소를 쓰고 SEV를 보냅니다. Secondary CPU는 그 주소로 점프해 커널 코드 실행을 시작합니다.

PSCI에 비해 단순하지만 단점이 명확합니다.

- CPU off (전력 절감)가 불가능합니다. 한번 깨운 코어를 다시 재울 방법이 없습니다.
- Secure firmware가 없어 secure side의 컨텍스트를 못 설정합니다.
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
- `psci.method = "smc"`와 `cpu_on` 함수 ID(`0xc4000003`)가 핵심 binding입니다.
- spin-table은 단순하지만 power off가 안 되고 hotplug·idle과 연동하기 어렵습니다.
- Secondary CPU는 자기 stack과 task_struct를 가져야 하며, boot CPU가 `secondary_data`로 전달합니다.
- 부팅 성공 시 dmesg에 `CPU1: Booted secondary processor` 라인이 보이고, 실패 시 `-EINVAL` 같은 오류로 가시화됩니다.
- 부팅 후 `/sys/devices/system/cpu/cpu*/online`으로 CPU hotplug가 가능해집니다.

## 다음 편 예고

[Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)에서는 보드를 켠 순간부터 login이 뜨기까지의 전체 부팅 단계를 체크포인트별로 따라갑니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-device-tree)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management) — CPU hotplug와 cpuidle 통합
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — multi-core scheduling 기본
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/) — SMP scaling
