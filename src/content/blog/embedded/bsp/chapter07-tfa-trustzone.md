---
title: "TF-A·TrustZone 통합 — BL31·secure world·SMC 흐름 적용"
date: 2026-05-18T09:07:00
description: "ARM Trusted Firmware-A를 BSP에 통합 — BL31 빌드, U-Boot와 BL33 결합, secure/non-secure 분리."
series: "BSP Development"
seriesOrder: 7
tags: [embedded, bsp, tf-a, trustzone, security]
draft: false
---

## 한 줄 요약

> **"ARMv8 BSP는 TF-A의 BL31이 secure monitor로 상주하고, U-Boot은 그 위의 BL33으로 동작합니다."** ARM Trusted Firmware-A는 거의 모든 Cortex-A 보드에서 *반드시* 통합해야 하는 secure world의 기반층입니다.

## TF-A가 필요한 이유

ARMv8 아키텍처에서 부팅 직후 *모든 코드*가 가장 높은 권한 레벨인 EL3에서 시작합니다. EL3는 secure monitor를 위한 자리이며, 이 자리에 머무를 코드가 있어야 OS가 SMC 호출로 PSCI·secure storage·trusted apps에 접근할 수 있습니다. ARM은 이 역할을 표준화한 reference 구현으로 *Trusted Firmware-A (TF-A)*를 제공합니다.

i.MX 8M, RK3588, AM62, STM32MP1, Qualcomm SDM 같은 ARMv8 SoC는 모두 *TF-A를 BL31로 채택*합니다. vendor가 직접 작성한 SMC monitor를 쓰는 경우는 거의 없으며, vendor는 TF-A에 자기 SoC port만 추가합니다.

TF-A 없이는 PSCI를 통한 CPU on/off가 불가능하므로 SMP 부팅도 안 됩니다. TrustZone-aware DRAM 컨트롤러 설정도 BL31의 일이며, OP-TEE 같은 TEE OS도 BL31의 boot 후에 깨어납니다.

## BL 단계 모델

TF-A는 부팅을 *BL0부터 BL33*까지 단계로 나눕니다.

```text
BL0 — BootROM (SoC 내부, fix)
   │  boot mode pin 읽기, BL1 적재
   ▼
BL1 — Trusted Boot ROM (선택적, ROM 안에 fuse-burn 가능)
   │  BL2 인증·적재
   ▼
BL2 — Trusted Boot Firmware (DDR 초기화·서명 검증)
   │  SoC vendor마다 SPL 대체 또는 보완
   ▼
BL31 — EL3 Runtime Firmware (Secure Monitor)
   │  PSCI, SMC handler, 상주 코드
   ├── BL32 — Secure World OS (OP-TEE 등, 선택)
   ▼
BL33 — Non-secure firmware (U-Boot)
   │  Linux 부팅 준비
   ▼
Linux Kernel (EL2 또는 EL1)
```

BL31은 *상주 코드*입니다. Linux로 진입한 뒤에도 SMC instruction이 호출되면 BL31이 깨어나 처리하고 EL1으로 돌아갑니다. SMC instruction은 사실상 secure world로의 *trap*입니다.

i.MX 8M Plus의 실제 흐름은 다음과 같습니다.

```text
BootROM
  → flash.bin 적재 (offset 32KB)
    flash.bin = SPL + DDR firmware + tee.bin + bl31.bin + u-boot.itb
  → SPL이 SRAM에서 동작 (DDR 초기화)
  → SPL이 DDR로 bl31.bin·tee.bin·u-boot.itb 적재
  → BL31 점프
  → BL31이 OP-TEE(BL32)·U-Boot(BL33) 시작
```

SPL이 BL2 역할을 겸하는 경우입니다. RK3588은 BootROM이 직접 BL2를 적재하고 BL2가 BL31을 호출하는 *더 표준적인* 흐름입니다.

## TF-A 소스 트리

```text
trusted-firmware-a/
├── bl1/
├── bl2/
├── bl2u/
├── bl31/                ← EL3 runtime
├── bl32/                ← BL32 reference (TSP)
├── plat/
│   ├── nxp/
│   │   └── imx/
│   │       └── imx8m/
│   │           ├── imx8mp/         ← i.MX 8M Plus port
│   │           ├── imx8mq/
│   │           └── ...
│   ├── rockchip/
│   │   ├── rk3588/
│   │   └── ...
│   ├── ti/
│   │   ├── k3/
│   │   └── ...
│   ├── st/
│   │   └── stm32mp1/
│   └── arm/             ← Juno, FVP reference
├── drivers/             ← UART, crypto, GIC, console
├── lib/                 ← libc, fdt, optee_utils
├── include/
└── services/
    └── std_svc/         ← PSCI 등 표준 서비스
```

새 BSP에 TF-A를 통합할 때 직접 만드는 디렉터리는 `plat/<vendor>/<soc>/<board>/` 하나입니다. SoC는 이미 vendor가 port를 maintain하고 있으므로 우리는 *보드별 plat_io_storage.c·platform_def.h·plat_psci.c* 정도만 만듭니다.

## BL31 빌드 — i.MX 8M Plus 사례

```bash
git clone https://github.com/ARM-software/arm-trusted-firmware.git
cd arm-trusted-firmware

export CROSS_COMPILE=aarch64-linux-gnu-

# BL31 빌드 (DEBUG=1이면 console 출력 포함)
make PLAT=imx8mp bl31 DEBUG=1 LOG_LEVEL=40 \
    BL32_BASE=0x56000000 BL32_SIZE=0x02000000

# 결과
ls build/imx8mp/debug/bl31.bin
```

`BL32_BASE`·`BL32_SIZE`는 OP-TEE가 들어갈 자리입니다. OP-TEE 없이 부팅한다면 안 줘도 됩니다.

`LOG_LEVEL`은 BL31의 console 출력량입니다. 운용에서는 0(none) 또는 10(notice)이고, 개발에서는 40(verbose)으로 둡니다.

빌드 결과 `bl31.bin`은 *위치 독립적 raw binary*입니다. SPL이 미리 정해진 주소에 적재한 뒤 점프합니다. i.MX 8M Plus는 `0x970000`이 BL31의 entry입니다.

## platform_def.h — 보드별 메모리 맵

`plat/nxp/imx/imx8m/imx8mp/include/platform_def.h`에 보드의 메모리 맵이 정의됩니다.

```c
#define BL31_BASE               U(0x970000)
#define BL31_LIMIT              U(0x990000)

#define BL32_BASE               U(0x56000000)  /* OP-TEE */
#define BL32_LIMIT              U(0x58000000)

#define BL33_BASE               U(0x40200000)  /* U-Boot proper */

#define IMX_BOOT_UART_BASE      U(0x30890000)  /* UART2 */
#define IMX_BOOT_UART_CLK_IN_HZ 24000000

#define PLATFORM_STACK_SIZE     0x800
#define PLATFORM_CORE_COUNT     4

#define MAX_MMAP_REGIONS        16
#define MAX_XLAT_TABLES         8

#define PLAT_NS_IMAGE_OFFSET    BL33_BASE
```

`BL31_BASE`는 SRAM 안의 작은 영역입니다(보통 64~128KB). DDR이 깨어나기 전부터 동작해야 하므로 SRAM에 머뭅니다.

`BL32_BASE`는 OP-TEE가 들어갈 DDR 안 영역입니다. 이 영역은 *TZASC*(TrustZone Address Space Controller)로 *secure-only*로 보호됩니다. Linux에서 이 주소를 read하면 fault가 납니다.

`BL33_BASE`는 U-Boot proper의 적재 주소입니다. U-Boot defconfig의 `CONFIG_SYS_TEXT_BASE`와 일치해야 합니다.

## PSCI 구현

TF-A의 *가장 큰 가치*는 PSCI(Power State Coordination Interface)입니다. PSCI는 ARM SoC의 CPU on/off, 시스템 reset, suspend를 표준화한 SMC API입니다.

```c
/* plat/nxp/imx/imx8m/imx8mp/imx8mp_psci.c (요약) */

static int imx_pwr_domain_on(u_register_t mpidr)
{
    unsigned int cpu_id = MPIDR_AFFLVL0_VAL(mpidr);
    uint64_t entry = BL31_BASE;

    /* CPU 전원 켜기 (SoC 특정 GPC register) */
    imx_set_cpu_secure_entry(cpu_id, entry);
    imx_set_cpu_pwr_on(cpu_id);

    return PSCI_E_SUCCESS;
}

static void imx_system_reset(void)
{
    /* SoC reset (WDOG 또는 SCFW SMC) */
    writel(SRC_BASE_ADDR + 0x0, 0x1);
    while (1) wfi();
}

const plat_psci_ops_t imx_plat_psci_ops = {
    .pwr_domain_on              = imx_pwr_domain_on,
    .pwr_domain_off             = imx_pwr_domain_off,
    .pwr_domain_suspend         = imx_pwr_domain_suspend,
    .pwr_domain_on_finish       = imx_pwr_domain_on_finish,
    .pwr_domain_suspend_finish  = imx_pwr_domain_suspend_finish,
    .system_off                 = imx_system_off,
    .system_reset               = imx_system_reset,
    .validate_power_state       = imx_validate_power_state,
    .get_sys_suspend_power_state = imx_get_sys_suspend_power_state,
};

int plat_setup_psci_ops(uintptr_t sec_entrypoint,
                        const plat_psci_ops_t **psci_ops)
{
    imx_mailbox_init(sec_entrypoint);
    *psci_ops = &imx_plat_psci_ops;
    return 0;
}
```

이 ops 테이블을 등록해 두면 Linux의 `arm,psci-1.0` 드라이버가 SMC로 `PSCI_CPU_ON`을 호출할 때마다 `imx_pwr_domain_on()`이 실행됩니다.

## device tree에서의 PSCI

Linux DT에 PSCI node가 있어야 secondary CPU bring-up이 동작합니다.

```text
psci {
    compatible = "arm,psci-1.0";
    method = "smc";
};

cpus {
    #address-cells = <1>;
    #size-cells = <0>;

    cpu0: cpu@0 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x0>;
        enable-method = "psci";
        next-level-cache = <&A53_L2>;
    };

    cpu1: cpu@1 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x1>;
        enable-method = "psci";
        next-level-cache = <&A53_L2>;
    };
    /* cpu2, cpu3 동일 */
};
```

`enable-method = "psci"`가 *PSCI 사용*을 의미합니다. 이 한 줄이 없으면 Linux는 SMP 부팅을 안 합니다. Ch 9에서 SMP bring-up 디버깅을 자세히 다룹니다.

## TrustZone 메모리 분할

TF-A는 SoC의 TZASC(TrustZone Address Space Controller)를 설정해 *DDR 일부를 secure-only*로 만듭니다.

```c
/* plat_arch_setup() 또는 bl31_plat_arch_setup()에서 호출 */

#define TZASC_BASE      0x32F80000

void imx_init_tzasc(void)
{
    /* Region 0: 0x40000000 ~ 0x55FFFFFF — Non-secure (Linux DDR) */
    writel(0x40000000, TZASC_BASE + 0x100);
    writel(0x55FFFFFF, TZASC_BASE + 0x104);
    writel(0xC0000000, TZASC_BASE + 0x110);  /* NS access */

    /* Region 1: 0x56000000 ~ 0x57FFFFFF — Secure-only (OP-TEE) */
    writel(0x56000000, TZASC_BASE + 0x120);
    writel(0x57FFFFFF, TZASC_BASE + 0x124);
    writel(0x80000000, TZASC_BASE + 0x130);  /* S-only access */

    /* Region 2: 0x58000000 ~ 0xFFFFFFFF — Non-secure */
    writel(0x58000000, TZASC_BASE + 0x140);
    writel(0xFFFFFFFF, TZASC_BASE + 0x144);
    writel(0xC0000000, TZASC_BASE + 0x150);
}
```

설정 후 OP-TEE 영역은 *Linux에서 접근 불가*입니다. dmesg에서 OP-TEE 영역에 read를 시도하면 *SError exception*이 발생합니다.

비슷한 컨트롤러로 GIC의 secure interrupt 그룹, IOMUX의 secure-only mux, SDMA의 secure channel 등이 있습니다. 모두 BL31이 설정합니다.

## OP-TEE를 BL32로 통합

OP-TEE를 secure OS로 함께 부팅한다면 BL32 슬롯에 들어갑니다.

```bash
# OP-TEE 빌드
git clone https://github.com/OP-TEE/optee_os.git
cd optee_os

make CROSS_COMPILE64=aarch64-linux-gnu- CROSS_COMPILE=arm-linux-gnueabihf- \
    PLATFORM=imx-mx8mpevk CFG_TEE_CORE_LOG_LEVEL=3 \
    CFG_TZDRAM_START=0x56000000 CFG_TZDRAM_SIZE=0x02000000 \
    CFG_TEE_RAM_VA_SIZE=0x00200000 \
    O=out

# 결과
ls out/core/tee-raw.bin
```

이 `tee-raw.bin`을 `bl31.bin`과 함께 *flash.bin*에 묶습니다. i.MX의 경우 NXP `imx-mkimage` 도구가 이 묶음을 만듭니다.

```bash
# imx-mkimage
make SOC=iMX8MP flash_evk_tee \
    AHAB_IMG=ahab-container.img \
    BL33=u-boot.itb \
    BL32=tee-raw.bin \
    BL31=bl31.bin \
    DDR_FW_PATH=lpddr4_pmu_train_*.bin

ls iMX8M/flash.bin
```

이 `flash.bin`을 SD나 eMMC에 굽습니다. BootROM이 이 단일 binary를 적재해 분해한 뒤 각 단계로 점프합니다.

## SMC 호출 — Linux에서 BL31로

Linux에서 SMC instruction을 호출하면 EL3로 trap하면서 BL31이 핸들러를 실행합니다.

```c
/* Linux kernel arch/arm64/include/asm/psci.h 흐름 */

static int __invoke_psci_fn_smc(unsigned long function_id,
                                unsigned long arg0,
                                unsigned long arg1,
                                unsigned long arg2)
{
    struct arm_smccc_res res;
    arm_smccc_smc(function_id, arg0, arg1, arg2, 0, 0, 0, 0, &res);
    return res.a0;
}

/* PSCI_CPU_ON 호출 */
psci_ops.cpu_on = __invoke_psci_fn_smc;
psci_ops.cpu_on(0x84000003, mpidr, entry_point, context_id);
```

`arm_smccc_smc()`는 단순히 `smc #0` instruction을 실행합니다. 이 순간 EL3로 진입하고 BL31의 `runtime_exceptions.S`가 처리합니다.

```text
Linux EL1
   │
   │ smc #0
   ▼
BL31 EL3 vector (runtime_exceptions.S)
   │
   ▼
smc_handler64 → runtime_svc_handler
   │
   ▼
std_svc_smc_handler → psci_smc_handler
   │
   ▼
psci_cpu_on → plat_psci_ops.pwr_domain_on
   │
   ▼
imx_pwr_domain_on (우리 SoC 코드)
   │
   ▼ eret
Linux EL1 (PSCI_E_SUCCESS)
```

이 round trip이 *μs 단위*로 일어납니다. Linux는 이 SMC가 보안 처리되는 *normal RPC*처럼 사용합니다.

## SiP service — vendor 확장

표준 PSCI 외에도 vendor가 *SoC-specific SMC service*를 추가할 수 있습니다. 이를 *SiP(Silicon Provider) service*라고 부릅니다.

```c
/* plat/nxp/imx/imx8m/imx8mp/imx_sip_svc.c */

#define IMX_SIP_GPC             0xC2000000
#define IMX_SIP_BUILDINFO       0xC2000003
#define IMX_SIP_LPDDR_DVFS      0xC2000004
#define IMX_SIP_AARCH32         0xC2000005
#define IMX_SIP_SRC             0xC2000006
#define IMX_SIP_HAB             0xC2000007

static uintptr_t imx_sip_handler(unsigned int smc_fid,
                                  u_register_t x1, u_register_t x2,
                                  u_register_t x3, u_register_t x4,
                                  void *cookie, void *handle,
                                  u_register_t flags)
{
    switch (smc_fid) {
    case IMX_SIP_LPDDR_DVFS:
        SMC_RET1(handle, dram_dvfs_handler(x1, x2, x3));
    case IMX_SIP_GPC:
        SMC_RET1(handle, imx_gpc_handler(x1, x2, x3));
    case IMX_SIP_SRC:
        SMC_RET1(handle, imx_src_handler(x1, x2, x3, x4));
    default:
        return SMC_UNK;
    }
}

DECLARE_RT_SVC(
    imx_sip_svc,
    OEN_SIP_START, OEN_SIP_END,
    SMC_TYPE_FAST,
    NULL,
    imx_sip_handler
);
```

Linux의 i.MX DDR DVFS 드라이버는 이 SMC를 호출해 BL31에게 *DDR 주파수 변경*을 요청합니다. DDR controller register는 EL3-only이므로 Linux가 직접 못 만지고, BL31을 거쳐야 합니다.

## TF-A 디버깅

TF-A가 시작은 했는데 그 뒤가 멈춘다면 *콘솔 출력이 가장 큰 단서*입니다.

```text
NOTICE:  BL31: v2.10.0
NOTICE:  BL31: Built : 14:23:01, May 19 2026
INFO:    GICv3 with legacy support detected.
INFO:    ARM GICv3 driver initialized in EL3
INFO:    TZC: Configured region 0
INFO:    BL31: Initialising Exception Handling Framework
INFO:    BL31: Initializing runtime services
INFO:    BL31: cortex_a53: CPU workaround for 855873 was applied
INFO:    BL31: Initializing BL32
INFO:    SPSR = 0x3c9
INFO:    Entry point address = 0x56000000
NOTICE:  OP-TEE 4.0.0 ...
INFO:    BL31: Preparing for EL3 exit to normal world
INFO:    Entry point address = 0x40200000
INFO:    SPSR = 0x3c9
```

이 로그가 *전부* 안 나오면 BL31의 *어디서 멈췄는지* 알아내는 게 다음 작업입니다. `LOG_LEVEL=40`으로 verbose하게 빌드한 뒤 console에서 마지막 출력을 봅니다.

JTAG으로 BL31의 entry(`0x970000`)에 break를 걸어 step-by-step 실행할 수도 있습니다. `gdb-multiarch`로 OpenOCD와 연결합니다.

```text
(gdb) target remote :3333
(gdb) symbol-file build/imx8mp/debug/bl31/bl31.elf
(gdb) break bl31_main
(gdb) c
Continuing.
Breakpoint 1, bl31_main () at bl31/bl31_main.c:73
73          NOTICE("BL31: %s\n", version_string);
```

`.elf` 파일이 있어야 source-level debug가 됩니다. `make DEBUG=1`로 빌드한 결과를 사용합니다.

## 자주 하는 실수

### BL31 entry address가 SRAM 밖

`BL31_BASE`를 DDR 안에 두면 SRAM에서 동작해야 하는 부팅 초기에 *DDR이 깨기 전*이라 fault가 납니다. SoC vendor가 권장한 *SRAM 안 주소*를 사용합니다.

### `PLATFORM_CORE_COUNT`가 실제 코어 수와 다름

이 값이 부족하면 secondary CPU bring-up 시 PSCI가 *invalid CPU*로 거절합니다. 이 값이 많으면 BL31이 *없는 CPU에 SMC를 보내려*다 hang합니다.

### TZASC 영역이 OP-TEE 영역과 안 맞음

`BL32_BASE`·`BL32_SIZE`와 TZASC region 정의가 다르면 OP-TEE가 *자기 영역인데 read fault*를 받거나, Linux가 *secure 영역에 접근* 시도해서 SError를 받습니다. 두 정의를 *반드시 일치*시킵니다.

### `BL33_BASE`와 U-Boot의 `CONFIG_SYS_TEXT_BASE` 불일치

이 둘이 다르면 BL31이 점프했을 때 U-Boot이 *링크된 주소가 아닌 곳*에서 실행되어 GP 레지스터 참조가 망가집니다. 두 빌드 시스템에서 *반드시 같은 주소*를 씁니다.

### SiP SMC ID 충돌

vendor가 SiP service ID를 임의로 정해 표준 PSCI 영역(0x84000000~)과 겹치면 *PSCI 동작이 망가집니다*. SMC ID 공간을 명확히 분리합니다.

### `secure-status = "okay"` 잊음

DT에서 secure-only 디바이스를 정의할 때 `status = "okay"`만 두면 *non-secure에서는 보이는데 secure에서는 안 보이는* 상태가 됩니다. `secure-status = "okay"`를 함께 둡니다.

## 정리

- ARMv8 BSP에서 TF-A의 BL31은 *secure monitor로 EL3에 상주*하며 PSCI·SMC·TrustZone을 책임집니다.
- BL2(또는 SPL)가 DDR을 초기화하고 BL31·BL32·BL33을 DDR에 적재한 뒤 BL31로 점프합니다.
- `plat/<vendor>/<soc>/<board>/`에 메모리 맵(`platform_def.h`)과 PSCI 콜백(`<board>_psci.c`)을 추가하면 새 보드 port가 됩니다.
- TZASC 컨트롤러로 *DDR의 일부를 secure-only*로 분리합니다. OP-TEE 영역이 대표입니다.
- DT의 `psci { method = "smc"; }`와 `cpu@N { enable-method = "psci"; }`가 SMP 부팅을 가능하게 합니다.
- Linux는 SMC instruction으로 BL31에 trap하며, 이 round trip이 PSCI·SiP service의 기반입니다.
- 디버깅은 `LOG_LEVEL=40 DEBUG=1` 빌드 후 console 마지막 출력 + JTAG의 조합이 가장 효과적입니다.

## 다음 편

[Ch 8 — Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)에서는 TF-A가 깨운 환경 위에서 Linux 커널을 설정하고 빌드하는 흐름을 다룹니다.

## 관련 항목

- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [Embedded Security Ch 5: TEE — OP-TEE](/blog/embedded/embedded-security/chapter05-tee)
- [원문 — Trusted Firmware-A](https://trustedfirmware-a.readthedocs.io/)
- [원문 — PSCI Specification](https://developer.arm.com/documentation/den0022/latest)
- [원문 — SMC Calling Convention](https://developer.arm.com/documentation/den0028/latest)
