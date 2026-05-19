---
title: "Ch 32: PSCI / SMCCC ABI"
date: 2026-05-22T32:00:00
description: "SMCCC 호출 규약과 PSCI v1.1 ABI — function ID 구조, fast vs yielding, CPU_ON·CPU_SUSPEND, Linux PSCI driver."
series: "Bootloader Internals"
seriesOrder: 32
tags: [embedded, bootloader, psci, smccc, arm, tf-a, kernel]
---

## 한 줄 요약

> **"PSCI는 *모든 ARMv8 SoC가 같은 인터페이스*로 CPU power를 다루게 만드는 ABI 계약이다."** — Linux 커널이 어느 SoC에서든 `arm_smccc_smc(PSCI_CPU_ON, ...)`만 부르면 TF-A의 platform 코드가 그 SoC 특유의 reset controller를 알아서 두드린다. SMCCC가 호출 규약을, PSCI가 의미를 정의한다.

[Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에서 BL31이 runtime service를 dispatch하는 구조를 봤다. 이 장은 그 위에서 가장 큰 service인 PSCI(Power State Coordination Interface)를 다룬다. 호출 규약 SMCCC와 PSCI v1.1 ABI를 함께 본다. Linux의 CPU hotplug·suspend·reboot이 결국 어떤 SMC로 내려가는지가 결론이다.

## SMCCC — 호출 규약 자체

SMCCC(SMC Calling Convention)는 *ABI 계약*이지 service가 아니다. EL1·EL2 코드가 EL3(또는 EL2)로 *어떤 register에 무엇을 담아* trap할지를 정의한다. ARMv8 spec의 일부고 모든 standard SMC service가 이를 따른다.

```text
Caller (EL1 또는 EL2)             Callee (EL3 또는 EL2)
─────────────────────             ────────────────────
x0 = function ID         ───▶     x0~x7 읽음
x1~x7 = 인자                       handler 실행
                                  x0~x7에 결과 채움
x0~x7 = 결과            ◀───      ERET
```

x0~x7만 인자·결과로 쓰는 것이 핵심이다. 나머지 register는 callee가 보존한다. AArch32에서는 r0~r7이지만 *최대 6개 인자* 제약이 있다. AArch64는 *6개 인자, 4개 결과*가 표준이지만 SMCCC v1.2부터는 x0~x17까지 결과를 확장한다.

```c
/* include/linux/arm-smccc.h */
struct arm_smccc_res {
    unsigned long a0;
    unsigned long a1;
    unsigned long a2;
    unsigned long a3;
};

asmlinkage void arm_smccc_smc(unsigned long a0, unsigned long a1,
                              unsigned long a2, unsigned long a3,
                              unsigned long a4, unsigned long a5,
                              unsigned long a6, unsigned long a7,
                              struct arm_smccc_res *res);
```

`a0`가 function ID, `a1~a7`이 인자, `res->a0~a3`이 결과 4개다. 호출 어셈블리는 다음 한 줄이 핵심이다.

```asm
/* arch/arm64/kernel/smccc-call.S */
SYM_FUNC_START(__arm_smccc_smc)
    smc    #0
    ldr    x4, [sp]           /* res 포인터 */
    stp    x0, x1, [x4, #0]
    stp    x2, x3, [x4, #16]
    ret
SYM_FUNC_END(__arm_smccc_smc)
```

`smc #0` 하나로 EL3 trap이 일어나고, 돌아오면 x0~x3에 결과가 들어 있다. 그것을 `res` 구조체에 쓰고 함수를 끝낸다.

## Function ID — 32-bit 구조

SMCCC function ID는 *정확히 32-bit*로 정의된 비트필드다. 어느 service에 속하는지, fast call인지 yielding call인지, AArch32용인지 AArch64용인지가 한 워드에 다 들어 있다.

```text
bit  31  30           24 23      16 15           0
   ┌────┬──────────────┬──────────┬──────────────┐
   │ FT │  OEN         │ MBZ      │ Function num │
   └────┴──────────────┴──────────┴──────────────┘
     │      │              │          │
     │      │              │          └─ service 안 함수 번호
     │      │              └─ Must Be Zero
     │      └─ Owning Entity Number (어떤 service)
     └─ Fast(1) / Yielding(0)

bit 30 (calling convention type):
   0 = SMC32 (AArch32 register)
   1 = SMC64 (AArch64 register, AArch64에서만 호출)
```

OEN 영역은 6 bit이라 64 가지 service가 정의 가능하다. spec이 다음과 같이 예약했다.

| OEN | 영역 | function ID 시작 |
|---|---|---|
| 0x00 | ARM Architecture Call | 0x8000_0000 / 0xC000_0000 |
| 0x01 | CPU service | 0x8100_0000 / 0xC100_0000 |
| 0x02 | SiP service (SoC vendor) | 0x8200_0000 / 0xC200_0000 |
| 0x03 | OEM service | 0x8300_0000 / 0xC300_0000 |
| 0x04 | Standard service (PSCI 등) | 0x8400_0000 / 0xC400_0000 |
| 0x05 | Standard Hypervisor service | 0x8500_0000 / 0xC500_0000 |
| 0x06 | Vendor Hypervisor service | 0x8600_0000 / 0xC600_0000 |
| 0x32~0x3F | Trusted OS service | 0xB200_0000 ~ 0xBF00_0000 |

`0xC400_0003`을 풀어 보면 `FT=1(fast)`, `OEN=0x04(Standard)`, `function=3` → PSCI CPU_ON(SMC64)이다. `0x8400_0002`는 `FT=1`, `OEN=0x04`, function 2 → PSCI CPU_OFF(SMC32)다.

## Fast call vs yielding call

bit 31(FT)이 fast/yielding을 가른다. 두 call의 의미가 *완전히 다르다*.

| 종류 | 의미 | callee 의무 | 예 |
|---|---|---|---|
| **Fast call** (FT=1) | atomic, *짧은 작업* | 곧장 처리하고 즉시 ERET | PSCI 대부분, SiP service |
| **Yielding call** (FT=0) | 길어질 수 있음, *interrupt 받을 수 있음* | 처리 중 interrupt가 들어오면 *원래 호출자에게 yield* | OP-TEE TA 호출 |

OP-TEE 안에서 TA가 수십 ms 동안 동작해야 할 때 yielding call이 쓰인다. 그 사이에 normal world에서 timer interrupt가 들어오면 OP-TEE가 *그 interrupt를 일단 normal world에 돌려주고*, normal world가 처리한 뒤 다시 같은 SMC를 재호출해 작업을 이어 받는다. PSCI는 모두 fast call이다. CPU_ON조차도 *호출 자체는 곧장 return*하고 실제 CPU 깨우기는 비동기로 진행된다.

## PSCI v1.1 — function 카탈로그

PSCI v1.1이 정의하는 함수가 30개가 넘지만 자주 쓰는 것은 십수 개다.

| Function | ID (SMC64) | 인자 | 의미 |
|---|---|---|---|
| `PSCI_VERSION` | `0x8400_0000` | — | spec version 반환 |
| `CPU_SUSPEND` | `0xC400_0001` | power_state, entry, ctx | low-power state 진입 |
| `CPU_OFF` | `0x8400_0002` | — | 자기 자신 power off |
| `CPU_ON` | `0xC400_0003` | target_cpu, entry, ctx | secondary CPU 깨우기 |
| `AFFINITY_INFO` | `0xC400_0004` | target_cpu, level | CPU 상태 조회 (ON/OFF/PENDING_ON) |
| `MIGRATE` | `0xC400_0005` | UP_TRUSTED_OS_target_cpu | UP secure OS 이동 |
| `MIGRATE_INFO_TYPE` | `0x8400_0006` | — | secure OS의 migration capability |
| `SYSTEM_OFF` | `0x8400_0008` | — | 시스템 종료 |
| `SYSTEM_RESET` | `0x8400_0009` | — | warm reset |
| `PSCI_FEATURES` | `0x8400_000A` | psci_func_id | 특정 function 지원 여부 |
| `CPU_FREEZE` | `0x8400_000B` | — | OS-initiated suspend 변종 |
| `SYSTEM_RESET2` | `0xC400_0012` | reset_type, cookie | reset 종류 지정 |

return value의 표준 의미는 다음과 같다.

```c
/* PSCI return codes */
#define PSCI_SUCCESS              0
#define PSCI_NOT_SUPPORTED       -1
#define PSCI_INVALID_PARAMS      -2
#define PSCI_DENIED              -3
#define PSCI_ALREADY_ON          -4
#define PSCI_ON_PENDING          -5
#define PSCI_INTERNAL_FAILURE    -6
#define PSCI_NOT_PRESENT         -7
#define PSCI_DISABLED            -8
#define PSCI_INVALID_ADDRESS     -9
```

`CPU_ON`이 `-4`(ALREADY_ON)을 return하면 그 CPU가 *이미 켜져 있다*는 뜻이고, `-2`(INVALID_PARAMS)면 *target_cpu MPIDR이 잘못*이다.

## CPU_ON 깊이 — secondary CPU 깨우기

PSCI의 대표 호출인 CPU_ON을 끝까지 따라가 본다. 인자가 세 개다.

```c
int psci_cpu_on(unsigned long target_cpu,  /* MPIDR_EL1 형식 */
                unsigned long entry,       /* 깨어난 CPU가 점프할 PA */
                unsigned long context_id); /* 깨어난 CPU의 x0에 들어갈 값 */
```

`target_cpu`는 MPIDR(Multiprocessor Affinity Register) 형식이다. cluster·core·thread·thread2의 4단 affinity로 표현된다. Cortex-A53 4-core single cluster라면 core 1을 가리키는 MPIDR은 `0x0000_0001`이다. big.LITTLE의 LITTLE cluster core 1은 `0x0000_0001`, big cluster core 0은 `0x0000_0100`이다.

호출 어셈블리는 다음과 같다.

```asm
/* secondary CPU 0x101을 entry_pa에서 시작 */
mov   x0, #0xC4000003       /* PSCI_CPU_ON (SMC64) */
mov   x1, #0x101            /* target_cpu MPIDR */
ldr   x2, =secondary_entry  /* entry */
mov   x3, #0                /* context_id */
smc   #0
/* return value in x0 */
```

EL3로 trap된 뒤 TF-A의 PSCI 코드가 다음을 한다.

```c
/* lib/psci/psci_main.c (간략화) */
int psci_cpu_on(u_register_t target_cpu,
                uintptr_t entrypoint,
                u_register_t context_id)
{
    int rc;
    entry_point_info_t ep;
    unsigned int target_idx = plat_core_pos_by_mpidr(target_cpu);

    /* 1. target CPU 유효성 */
    if (target_idx < 0 || target_idx >= PLATFORM_CORE_COUNT)
        return PSCI_E_INVALID_PARAMS;

    /* 2. 이미 켜져 있는지 */
    if (psci_get_aff_info_state_by_idx(target_idx) == AFF_STATE_ON)
        return PSCI_E_ALREADY_ON;

    /* 3. entry point 검증 */
    rc = psci_validate_entry_point(&ep, entrypoint, context_id);
    if (rc != PSCI_E_SUCCESS)
        return rc;

    /* 4. AFF_STATE를 ON_PENDING으로 표시 */
    psci_set_aff_info_state_by_idx(target_idx, AFF_STATE_ON_PENDING);

    /* 5. platform-specific reset release */
    rc = psci_plat_pm_ops->pwr_domain_on(target_cpu);
    if (rc != PSCI_E_SUCCESS)
        return PSCI_E_INTERNAL_FAIL;

    return PSCI_E_SUCCESS;
}
```

핵심은 5번 `pwr_domain_on`이다. SoC vendor가 제공하는 platform 코드가 *해당 SoC의 reset controller*를 두드린다. NXP i.MX 8M Plus의 경우 `plat/imx/common/imx8_psci.c`의 `imx_pwr_domain_on()`이 다음 단계를 한다.

```c
/* plat/imx/imx8m/imx8mp/imx8mp_psci.c (의사 코드) */
int imx_pwr_domain_on(u_register_t mpidr)
{
    unsigned int core_id = MPIDR_AFFLVL0_VAL(mpidr);

    /* 1. wake-up register에 entry point 박기 */
    mmio_write_64(IMX_SRC_BASE + GPR(core_id * 2),
                  psci_get_warm_entry());

    /* 2. SRC를 통해 해당 코어 reset deassert */
    val = mmio_read_32(IMX_SRC_BASE + SRC_A53RCR1);
    val |= (1 << (core_id - 1));   /* power up bit */
    mmio_write_32(IMX_SRC_BASE + SRC_A53RCR1, val);

    return PSCI_E_SUCCESS;
}
```

reset이 풀린 CPU는 BL31의 *warm boot entry*(`psci_warmboot_entrypoint`)에서 시작한다. 거기서 CPU 자신의 percpu context를 초기화한 뒤 caller가 넘긴 `entry`로 ERET한다. 자세한 secondary CPU 측 흐름은 [Ch 33](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서 다룬다.

## CPU_SUSPEND — power_state 인코딩

CPU_SUSPEND는 *얼마나 깊은 sleep으로 들어갈지*를 power_state 인자에 인코딩한다. PSCI v1.0 이후로는 두 인코딩이 공존한다.

```text
[Original power_state — PSCI v0.2]
bit  31 30 29 28 27 26 25 24    23 22 21 20 19 18 17 16    15 14 13 12 11 10  9  8 7    0
   ┌──┬──┬──────────────────┬────────────────────────┬──────────────────────────┬─────┐
   │SF│ 0│ StateType        │ StateID                │ AffinityLevel            │ MBZ │
   └──┴──┴──────────────────┴────────────────────────┴──────────────────────────┴─────┘
     │     │                                              │
     │     │                                              └─ 0=CPU, 1=cluster, 2=system
     │     └─ 0=standby (WFI), 1=power-down (state lost)
     └─ Shallow(0) / Deep(1)

[Extended power_state — PSCI v1.0+ (선호)]
bit  31 30           24 23      16 15            0
   ┌──┬───────────────┬──────────┬───────────────┐
   │PD│ MBZ           │ Level    │ StateID       │
   └──┴───────────────┴──────────┴───────────────┘
     │
     └─ Power-down(1) / Standby(0)
```

extended 인코딩이 더 단순하고 platform이 StateID로 *vendor 자체 정의 sleep mode*를 표현한다. 예를 들어 i.MX 8M Plus는 다음 StateID를 정의한다.

| StateID | Level | 의미 |
|---|---|---|
| `0x0001` | 0 | CPU WFI (cache 유지) |
| `0x0011` | 0 | CPU power-down (cache flush) |
| `0x0022` | 1 | cluster power-down |
| `0x0033` | 2 | system suspend (DDR self-refresh) |

Linux의 `cpuidle-arm` driver가 DT의 `domain-idle-states`를 읽어 *이 StateID를 자동 생성*해 PSCI suspend를 호출한다.

## Linux PSCI driver — DT와 진입

Linux 커널의 PSCI 진입점은 `drivers/firmware/psci/psci.c`다. DT의 `psci` 노드를 보고 method(`smc` 또는 `hvc`)와 function ID들을 읽는다.

```dts
/* arch/arm64/boot/dts/freescale/imx8mp.dtsi */
psci {
    compatible = "arm,psci-1.0";
    method = "smc";
};

cpus {
    cpu@0 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x0>;
        enable-method = "psci";
        cpu-idle-states = <&cpu_pd_wait>;
    };
    cpu@1 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x1>;
        enable-method = "psci";
        cpu-idle-states = <&cpu_pd_wait>;
    };
    /* ... cpu@2, cpu@3 ... */
};
```

`compatible = "arm,psci-1.0"`이면 standard function ID를 자동 사용한다. 더 옛 PSCI 0.1은 function ID를 DT에 *명시*해야 한다.

```dts
/* PSCI 0.1 (legacy) */
psci {
    compatible = "arm,psci";
    method = "smc";
    cpu_on = <0xc4000003>;
    cpu_off = <0x84000002>;
    cpu_suspend = <0xc4000001>;
};
```

커널의 PSCI 0.2+ 호출 래퍼는 다음과 같다.

```c
/* drivers/firmware/psci/psci.c */
static int psci_cpu_on(unsigned long cpuid, unsigned long entry_point)
{
    int err;
    u32 fn = PSCI_FN_NATIVE(0_2, CPU_ON);

    err = invoke_psci_fn(fn, cpuid, entry_point, 0);
    return psci_to_linux_errno(err);
}

static int psci_cpu_off(u32 state)
{
    int err;
    u32 fn = PSCI_0_2_FN_CPU_OFF;

    err = invoke_psci_fn(fn, state, 0, 0);
    return psci_to_linux_errno(err);
}
```

`invoke_psci_fn`은 method(`smc` 또는 `hvc`)에 따라 `arm_smccc_smc()` 또는 `arm_smccc_hvc()`로 분기한다.

## PSCI_VERSION 확인 — 부팅 시 일관성 점검

커널은 부팅 초기 PSCI version을 확인해 *기대한 spec과 일치하는지* 검사한다.

```c
/* drivers/firmware/psci/psci.c (간략화) */
static int __init psci_0_2_init(void)
{
    int err;
    u32 ver;

    err = invoke_psci_fn(PSCI_0_2_FN_PSCI_VERSION, 0, 0, 0);
    ver = err;

    pr_info("PSCIv%d.%d detected in firmware.\n",
            PSCI_VERSION_MAJOR(ver),
            PSCI_VERSION_MINOR(ver));

    if (PSCI_VERSION_MAJOR(ver) == 0 && PSCI_VERSION_MINOR(ver) < 2) {
        err = -EINVAL;
        pr_err("Conflicting PSCI version detected.\n");
        goto out_put_node;
    }

    return 0;
}
```

PSCI v0.2 이상이어야 standard function ID가 통한다. TF-A는 항상 v1.1+를 구현하므로 이 점검이 통과 못 하는 경우는 *legacy bootloader*를 의심해야 한다.

## CPU_ON latency 측정

CPU_ON이 *얼마나 걸리는지*가 boot up 시간을 좌우한다. 4-core Cortex-A72 1.5 GHz 측정값이다.

| 단계 | 시간 |
|---|---|
| `smc #0` → BL31 entry | ~130 ns |
| PSCI dispatcher + validation | ~500 ns |
| platform `pwr_domain_on` (reset release) | 1~5 µs |
| Secondary CPU의 ROM bootstrap | 5~20 µs |
| BL31 warm boot path (MMU on, exception vec) | 3~10 µs |
| Caller로 control 반환 (CPU_ON 자체) | ~200 ns |
| Linux `secondary_start_kernel` 도달 | 10~50 µs (총합) |

`CPU_ON` SMC 자체는 *수 µs 안에 return*하지만 *secondary CPU가 Linux에 진입*하는 데까지는 수십 µs가 든다. 4-core를 모두 깨우면 약 100~200 µs가 든다.

```text
[ 4-core boot up 측정 (i.MX 8M Plus, kernel 6.6) ]
[    0.000000] CPU0: Booted secondary processor 0x0000000000 [0x410fd034]
[    0.087401] smp: Bringing up secondary CPUs ...
[    0.087512] Detected VIPT I-cache on CPU1
[    0.087602] CPU1: Booted secondary processor 0x0000000001 [0x410fd034]
[    0.087701] Detected VIPT I-cache on CPU2
[    0.087788] CPU2: Booted secondary processor 0x0000000002 [0x410fd034]
[    0.087889] Detected VIPT I-cache on CPU3
[    0.087977] CPU3: Booted secondary processor 0x0000000003 [0x410fd034]
[    0.088107] smp: Brought up 1 node, 4 CPUs
```

CPU1~CPU3 각각이 ~100 µs 안에 올라온다. PSCI overhead가 잘 짜여 있다는 신호다.

## SMCCC version 확인 — feature negotiation

SMCCC v1.1에서 `ARM_SMCCC_VERSION` function이 추가됐다(`0x8000_0000`). 커널이 부팅 시 이를 호출해 SMCCC version을 확인하고 *지원되는 conduit과 conduit-specific feature*를 협상한다.

```c
/* drivers/firmware/smccc/smccc.c */
void __init arm_smccc_version_init(u32 version, enum arm_smccc_conduit conduit)
{
    smccc_version = version;
    smccc_conduit = conduit;
}

static int __init smccc_devices_init(void)
{
    struct platform_device *pdev;

    if (smccc_version < ARM_SMCCC_VERSION_1_1)
        return -ENODEV;

    /* SMCCC v1.1+면 TRNG, Spectre mitigation 등 추가 디바이스 등록 */
    pdev = platform_device_register_simple("smccc_trng", -1, NULL, 0);
    /* ... */
}
```

SMCCC v1.1 이상이면 *Spectre v2 mitigation*(`ARM_SMCCC_ARCH_WORKAROUND_1`)을 EL3에 위임할 수 있다. 커널이 직접 BPIALL 같은 명령을 안 쓰고 *SMC로 EL3에 위임*하는 모델이다.

## 자주 보는 함정

### PSCI version mismatch

TF-A를 빌드할 때 `PSCI_OS_INIT_MODE=1`을 켜고 커널이 그것을 모르면 *suspend 호출이 거부*된다. PSCI v1.1의 OS-initiated mode와 Platform-coordinated mode가 호환되지 않는다. 커널 부팅 로그에 `PSCIv1.1 detected in firmware` 정도만 확인하지 말고 `cat /sys/kernel/debug/psci`로 *실제 사용되는 mode*를 본다.

### MPIDR 인코딩 잘못

`target_cpu` 인자를 *logical CPU number*(0, 1, 2, 3)로 넘기면 안 된다. *MPIDR_EL1 값*이어야 한다. big.LITTLE의 경우 logical CPU 0이 MPIDR 0x000인지 0x100인지가 cluster 구성에 따라 다르다. 커널은 `cpu_logical_map(cpu)`로 변환하지만, U-Boot이나 자체 코드를 짤 때는 *DT의 `cpu@N`의 reg 속성*을 그대로 써야 안전하다.

### CPU_OFF가 return하면 안 됨

`PSCI_CPU_OFF` 호출은 *return하지 않는다*. 호출한 CPU 자신이 power down되기 때문이다. 만약 return값이 오면 *power down에 실패*했다는 뜻이며 그 즉시 BUG해야 한다. 커널은 다음과 같이 짠다.

```c
void cpu_die(void)
{
    arch_cpu_idle_dead();   /* 내부에서 psci_cpu_off() */
    BUG();                  /* 도달하면 안 됨 */
}
```

return 후 BUG()가 *방어선*이다. 도달하면 PSCI 구현이 buggy다.

### SYSTEM_RESET vs SYSTEM_RESET2

`SYSTEM_RESET`(0x8400_0009)은 *warm reset*만 보장하고 reset 종류를 지정 못 한다. `SYSTEM_RESET2`(0xC400_0012)는 cold/warm/vendor-specific을 인자로 지정한다. mainline 커널의 `reboot` syscall이 보통 `SYSTEM_RESET`을 부르는데, *cold reset이 필요*한 경우(DDR 내용 완전 소거 등) `reboot_mode`를 통해 SYSTEM_RESET2로 강제할 수 있다.

### MIGRATE_INFO_TYPE 무시

UP(Uniprocessor) secure OS를 쓰는 시스템에서 그 OS가 *어느 CPU에 묶여 있는지*를 PSCI가 추적한다. CPU_OFF 호출 전에 `MIGRATE_INFO_TYPE`을 확인하고 *secure OS를 다른 CPU로 옮긴 뒤*에 끄지 않으면 OP-TEE가 죽는다. mainline TF-A의 dispatcher가 이를 자동 처리하지만, custom secure OS를 통합할 때 자주 빠뜨린다.

### Suspend StateID 잘못

CPU_SUSPEND의 StateID를 platform이 모르는 값으로 넘기면 *INVALID_PARAMS*가 떨어진다. `cpuidle-arm`이 DT의 `arm,psci-suspend-param`을 읽는데, 이 값이 platform PSCI 구현이 인식하는 값과 *정확히 일치*해야 한다. DT 작성 시 platform `power_state` 인코딩을 spec과 대조해 본다.

## 정리

- SMCCC는 호출 *규약*이고 PSCI는 *그 위에서 정의된 service*다. 둘은 짝으로 쓰인다.
- function ID는 32-bit 비트필드로 FT(fast/yielding)·SMC32/64·OEN·function num을 인코딩한다. OEN이 service를, function num이 그 안의 함수를 가른다.
- Fast call은 *원자적*이고 yielding call은 *interrupt에 의해 yield*될 수 있다. PSCI는 모두 fast call, OP-TEE TA 호출이 대표적인 yielding call이다.
- PSCI v1.1이 정의하는 함수는 30개 이상이지만 자주 쓰는 것은 `CPU_ON`, `CPU_OFF`, `CPU_SUSPEND`, `SYSTEM_RESET`, `SYSTEM_OFF`, `AFFINITY_INFO`, `PSCI_VERSION`, `PSCI_FEATURES` 정도다.
- `CPU_ON`의 핵심은 platform 코드의 `pwr_domain_on`이다. SoC 자체 reset controller(NXP SRC, Rockchip CRU 등)를 두드려 reset을 풀고 secondary CPU의 warm boot entry로 진입시킨다.
- Linux PSCI driver는 DT의 `psci` 노드와 `cpus/cpu@N/enable-method = "psci"`를 보고 자동으로 PSCI를 사용한다. method가 `smc`인지 `hvc`인지가 분기점이다.
- `CPU_ON` SMC 자체는 수 µs 안에 return하지만 secondary CPU가 Linux에 진입하는 데까지는 수십 µs가 든다. 4-core 전체로 100~200 µs 수준이다.
- 흔한 함정은 PSCI version mismatch, MPIDR 인코딩 잘못, CPU_OFF return 처리, SYSTEM_RESET 종류 구분, MIGRATE_INFO 무시, Suspend StateID 잘못이다.

## 다음 편

다음 편 [Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서는 PSCI CPU_ON 호출 *이후*에 secondary CPU가 *어떤 어셈블리를 통과해* Linux에 도착하는지를 따라간다. spin-table 방식과 PSCI 방식의 비교, ARM64 `secondary_startup` 분석, percpu 자료구조 초기화, hotplug CPU_OFF 흐름을 정리한다.

## 관련 항목

- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 31: TF-A BL31 EL3 Runtime](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)
- [Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)
- [Practical RTOS Internals Ch 2-6: Cortex-A context switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [Practical RTOS Internals Ch 4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [원문 — Arm PSCI v1.1 specification (DEN0022)](https://developer.arm.com/documentation/den0022)
- [원문 — Arm SMCCC v1.4 (DEN0028)](https://developer.arm.com/documentation/den0028)
