---
title: "TF-A BL31 EL3 Runtime 분석 — PSCI·SDEI·RAS dispatcher 추적"
date: 2026-05-22T09:31:00
description: "TF-A BL31의 EL3 runtime service 구조 — runtime_svc 등록 모델, vector entry, PSCI·SDEI·RAS dispatcher, SMC call latency."
series: "Bootloader Internals"
seriesOrder: 31
tags: [embedded, bootloader, tf-a, bl31, el3, psci, sdei, ras, smccc, arm]
---

## 한 줄 요약

> **"BL31은 *부트가 끝난 뒤에도 EL3에 상주*하는 작은 운영체제입니다."** — BL1·BL2는 일회성으로 사라지지만 BL31은 SMC 명령이 올라올 때마다 깨어나 PSCI·SDEI·RAS·SiP service를 dispatch합니다. Linux의 CPU hotplug, suspend, system reset이 전부 이 한 binary를 거칩니다.

[Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 BL31이 *살아 있는 runtime firmware*라는 점을 짚었습니다. 이 장은 그 안쪽으로 들어가 BL31이 *어떻게 service를 등록하고*, SMC 명령이 *어떻게 dispatch되며*, PSCI·SDEI·RAS 세 서비스가 *왜 EL3에 있어야 하는지*를 정리합니다. BL33이 부트를 끝낸 뒤에도 BL31이 EL3에서 무엇을 하고 있는지가 핵심입니다.

## BL31의 두 얼굴 — 부트와 런타임

BL31의 실행은 두 단계로 나뉩니다. 첫째는 *부트 단계*다. BL2가 BL31에 진입하면 `bl31_entrypoint`가 console·MMU·exception vector를 초기화하고, EL3 system register를 SCR_EL3·SCTLR_EL3 단위로 set up한 뒤, 등록된 runtime service들을 `service_init()`으로 한 번씩 호출합니다. 마지막에 BL33으로 점프하기 위해 `bl31_prepare_next_image_entry()`로 SPSR_EL3·ELR_EL3에 *BL33의 EL과 진입점*을 박고 `el3_exit`로 ERET합니다.

둘째는 *런타임 단계*다. BL33과 커널이 동작하는 동안 BL31의 메모리는 살아 있지만 코드는 *호출이 올 때만* 깨어납니다. `smc #0` 명령이 EL1 또는 EL2에서 trap하면 EL3 vector table의 `sync_exception_aarch64` 엔트리로 진입하고, runtime exception 핸들러가 *EC(Exception Class)* 필드를 보고 SMC인지 다른 trap인지 가릅니다. SMC면 dispatcher로, HVC면 reject, undef면 panic입니다.

```text
[부트 단계]
BL2 → bl31_entrypoint
        ├─ console_init, mmu_setup, vector_set
        ├─ runtime_svc_init (모든 등록 service의 init 호출)
        └─ bl31_prepare_next_image_entry → el3_exit (ERET)
                                              │
                                              ▼
                                         BL33 (EL2)

[런타임 단계]
EL1/EL2 코드의 smc #0
   │
   ▼
EL3 vector_table[sync_exception_aarch64]
   │
   ▼
sync_exception_handler → SMC EC 분기 → handle_runtime_svc
   │
   ▼
runtime service dispatch → handler 실행 → x0~x7 채워 ERET
```

부트 단계는 한 번뿐이고, 런타임 단계는 시스템이 살아 있는 *내내 반복*됩니다. BL31의 핵심 비용은 런타임 SMC 처리 속도이며 이게 곧 OS의 power management 응답성과 직결됩니다.

## 메모리 위치 — EL3-only가 핵심

BL31은 *non-secure master가 절대 못 보는 영역*에 있어야 합니다. 보통 두 가지 방식 중 하나입니다.

| 방식 | 위치 | 보호 메커니즘 | 대표 SoC |
|---|---|---|---|
| **Secure DRAM carveout** | DDR 끝쪽 secure 영역 | TZASC가 non-secure 접근 차단 | i.MX 8M, Rockchip RK3399 |
| **EL3-only SRAM** | 전용 on-chip SRAM | bus matrix가 EL3 master만 허용 | TI K3, Marvell Armada |

i.MX 8M Plus의 BL31은 `0xBE00_0000 ~ 0xBE10_0000`에 자리합니다. 이 영역은 TZASC(TrustZone Address Space Controller)가 *secure write/read만 통과*시킵니다. Linux 커널이 그 주소를 normal mapping으로 매핑하려 하면 *bus error*가 납니다. DTB의 `/reserved-memory` 노드에 `no-map`으로 표시해 커널이 페이지 테이블에 *아예 올리지 못하게* 막습니다.

```dts
reserved-memory {
    #address-cells = <2>;
    #size-cells = <2>;

    bl31@be000000 {
        reg = <0x0 0xbe000000 0x0 0x00100000>;
        no-map;
    };
};
```

BL31 본체는 약 100 KB로 작지만 *page table·exception stack·percpu context*까지 합쳐 보통 1 MB carveout을 잡습니다. Stack은 CPU 코어 수만큼 따로 잡혀 있어 4-core라면 stack 영역만 16~32 KB × 4를 차지합니다.

## runtime_svc 등록 모델 — DECLARE_RT_SVC

TF-A는 runtime service를 *컴파일 타임에 ELF section으로 모은다*. 각 service의 등록 정보가 `.rt_svc_descs` section에 들어가고, BL31이 부팅 시 그 section을 순회해 service 테이블을 만듭니다.

```c
/* include/services/std_svc/psci.h */
DECLARE_RT_SVC(
    std_svc,                  /* 이름 */
    OEN_STD_START,            /* OEN 시작 (0x04) */
    OEN_STD_END,              /* OEN 끝   (0x04) */
    SMC_TYPE_FAST,            /* fast or yielding */
    std_svc_setup,            /* init 함수 */
    std_svc_smc_handler       /* SMC handler */
);
```

`DECLARE_RT_SVC`는 다음 매크로입니다.

```c
/* include/common/runtime_svc.h (간략화) */
#define DECLARE_RT_SVC(_name, _start, _end, _type, _setup, _smch) \
    static const rt_svc_desc_t __svc_desc_ ## _name               \
        __section(".rt_svc_descs") __used = {                     \
            .start_oen   = _start,                                \
            .end_oen     = _end,                                  \
            .call_type   = _type,                                 \
            .name        = #_name,                                \
            .init        = _setup,                                \
            .handle      = _smch,                                 \
        };
```

각 description은 *function ID의 OEN(Owning Entity Number) 범위*를 가집니다. SMCCC에서 OEN은 function ID의 bit 29:24에 들어 있고, 0x00은 ARM Architecture call, 0x01은 CPU service, 0x02는 SiP service, 0x03은 OEM, 0x04는 Standard service(PSCI 포함), 0x32~0x3F는 Trusted OS service로 예약돼 있습니다.

부팅 시 `runtime_svc_init()`이 `.rt_svc_descs` section을 순회해 *OEN 별 dispatch 테이블*을 만듭니다.

```c
/* common/runtime_svc.c (간략화) */
void __init runtime_svc_init(void)
{
    rt_svc_desc_t *rt_svc_descs;
    uint32_t index, start_idx, end_idx;

    rt_svc_descs = (rt_svc_desc_t *) RT_SVC_DESCS_START;
    rt_svc_descs_num = RT_SVC_DESCS_END - RT_SVC_DESCS_START;
    rt_svc_descs_num /= sizeof(rt_svc_desc_t);

    for (index = 0; index < rt_svc_descs_num; index++) {
        rt_svc_desc_t *service = &rt_svc_descs[index];

        /* 1. init 호출 */
        if (service->init && service->init() != 0)
            panic();

        /* 2. OEN 범위만큼 dispatch table에 등록 */
        start_idx = get_unique_oen(service->start_oen, service->call_type);
        end_idx   = get_unique_oen(service->end_oen,   service->call_type);

        for (uint32_t i = start_idx; i <= end_idx; i++)
            rt_svc_descs_indices[i] = (uint8_t) index;
    }
}
```

`rt_svc_descs_indices[]`가 *OEN → service index* 매핑이고, 런타임에 SMC가 올라오면 dispatcher는 *function ID의 OEN bit*로 한 번에 service를 찾습니다. O(1) lookup이라 SMC overhead가 크지 않습니다.

## SMC 진입 — vector entry부터 dispatcher까지

SMC가 trap되는 경로를 끝까지 따라가 봅니다. EL1에서 `smc #0`을 실행하면 CPU가 ELR_EL3·SPSR_EL3·ESR_EL3를 채우고 EL3 vector table의 `0x400` offset(*Lower EL using AArch64, Sync exception*)으로 점프합니다.

```asm
/* bl31/aarch64/runtime_exceptions.S (간략화) */
vector_entry sync_exception_aarch64
    apply_at_speculative_wa
    check_and_unmask_ea
    handle_sync_exception
end_vector_entry sync_exception_aarch64
```

`handle_sync_exception`이 `ESR_EL3`를 읽어 EC(Exception Class)를 확인합니다. SMC64면 `smc_handler64`로, SMC32면 `smc_handler32`로 분기합니다.

```asm
/* bl31/aarch64/runtime_exceptions.S */
.macro handle_sync_exception
    mrs   x30, esr_el3
    ubfx  x30, x30, #ESR_EC_SHIFT, #ESR_EC_LENGTH
    cmp   x30, #EC_AARCH64_SMC
    b.eq  smc_handler64
    cmp   x30, #EC_AARCH32_SMC
    b.eq  smc_handler32
    b     report_unhandled_exception
.endm
```

`smc_handler64`가 *caller 컨텍스트(x0~x29)를 cpu_context에 저장*하고, function ID(x0)를 보고 dispatcher인 `handle_runtime_svc`를 호출합니다.

SMC 진입부터 service handler까지의 호출 흐름을 그림으로 정리하면 다음과 같습니다.

![SMC dispatcher 흐름 — EL1에서 EL3로, vector entry에서 service handler까지](/images/blog/bootloader/diagrams/chapter31-smc-dispatcher.svg)

```c
/* bl31/bl31_main.c */
uintptr_t handle_runtime_svc(uint32_t smc_fid,
                             uint64_t x1, uint64_t x2,
                             uint64_t x3, uint64_t x4,
                             void *cookie, void *handle,
                             uint64_t flags)
{
    rt_svc_desc_t *rt_svc;
    uint32_t index, idx;

    /* OEN으로 service index 조회 */
    idx = get_unique_oen_from_smc_fid(smc_fid);
    index = rt_svc_descs_indices[idx];

    if (index >= MAX_RT_SVCS)
        SMC_RET1(handle, SMC_UNK);

    rt_svc = &rt_svc_descs[index];
    return rt_svc->handle(smc_fid, x1, x2, x3, x4,
                          cookie, handle, flags);
}
```

해당 service의 `handle` 함수가 실제 SMC 처리를 합니다. PSCI라면 `std_svc_smc_handler`가, OP-TEE 호출이라면 `opteed_smc_handler`가 깨어납니다. 처리 결과는 `SMC_RET*` 매크로로 cpu_context에 다시 쓰이고, vector entry로 돌아가 `eret`이 실행되면 *EL3 → 원래 EL*로 복귀합니다.

## 주요 service — PSCI·SDEI·RAS·SiP

BL31에 등록되는 service는 대략 다섯 종류입니다. 각각이 *EL3에 있어야만 하는 이유*가 있습니다.

| Service | OEN | 책임 | EL3에 있어야 하는 이유 |
|---|---|---|---|
| **PSCI** | 0x04 (STD) | CPU power on/off/suspend, system reset/off | secondary CPU의 reset release는 SoC reset controller 권한 필요 |
| **SDEI** | 0x04 (STD) | NMI 비슷한 secure event를 normal world에 주입 | exception 주입은 EL3 권한 |
| **RAS** | 0x04 (STD) | machine check, ECC error handling | secure error log 접근 |
| **SiP service** | 0x02 | SoC 자체 정의 (clock, DRAM tuning 등) | secure-only register 접근 |
| **Trusted OS dispatch** | 0x32 (TOS) | BL32(OP-TEE)로 SMC 라우팅 | secure world EL 전환 |

세 표준 service(PSCI·SDEI·RAS)를 차례로 봅니다.

### PSCI — power state coordination

PSCI는 가장 자주 호출되는 service다. Linux의 CPU hotplug, suspend-to-RAM, reboot이 전부 PSCI SMC다. 자세한 ABI는 [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 다룹니다. EL3에 있어야 하는 이유는 *secondary CPU의 reset assert/release*가 보통 SoC reset controller의 secure register를 건드려야 하기 때문입니다. NXP i.MX 8M Plus의 경우 SRC(System Reset Controller)의 일부 register가 *secure-only*로 마킹돼 있어 normal world에서는 쓸 수 없습니다.

### SDEI — software delegated exception

SDEI는 SecurePartition NMI에 해당하는 메커니즘입니다. EL3가 *normal world의 EL1·EL2에 비동기 이벤트를 주입*할 수 있게 합니다. 사용 예가 `firmware-first error handling`입니다. 하드웨어가 ECC error를 raise하면 우선 EL3가 받아 SDEI event로 가공한 뒤 Linux의 등록된 핸들러로 던집니다. 커널은 이 핸들러에서 메모리 page를 isolate하거나 process를 kill할 수 있습니다.

```c
/* SDEI 등록 (커널 측 의사 코드) */
int sdei_event_register(uint32_t event_num,
                        sdei_event_callback_t cb,
                        void *arg);

/* SMC 매핑 — SDEI_EVENT_REGISTER */
arm_smccc_smc(SDEI_1_0_FN_SDEI_EVENT_REGISTER,
              event_num, (uint64_t) cb, ...);
```

SDEI event는 *normal interrupt와 별도 경로*로 들어와 IRQ가 masked된 상황에서도 동작합니다. 일반 IRQ로 처리할 수 없는 *치명적 비동기 알림*이 SDEI의 용도입니다.

### RAS — reliability, availability, serviceability

RAS는 ECC·snoop·bus error 같은 *machine check*를 다룹니다. ARMv8.2 RAS extension이 정의한 error record가 EL3에 있고, BL31이 이를 polling하거나 interrupt로 받아 SDEI로 변환합니다. firmware-first 모델에서 RAS와 SDEI는 *짝*입니다. RAS가 hardware error를 모으고 SDEI가 OS에 알립니다.

## bl31_main의 진입 — 부트 후 BL33으로

`bl31_entrypoint`는 어셈블리로 짠 reset handler지만 결국 C 함수 `bl31_main`을 호출합니다.

```c
/* bl31/bl31_main.c (간략화) */
void __init bl31_main(void)
{
    NOTICE("BL31: %s\n", version_string);
    NOTICE("BL31: %s\n", build_message);

    /* 1. SCR_EL3, SCTLR_EL3 finalize */
    bl31_arch_setup();

    /* 2. platform-specific setup */
    bl31_platform_setup();

    /* 3. 모든 runtime service init 호출 */
    runtime_svc_init();

    /* 4. BL32(OP-TEE) image가 있으면 먼저 진입 → 돌아오면 BL33 */
    if (bl32_init != NULL) {
        INFO("BL31: Initializing BL32\n");
        (*bl32_init)();
    }

    /* 5. BL33 진입 준비 */
    bl31_prepare_next_image_entry();
    console_flush();
}

/* bl31_entrypoint 끝부분에서 el3_exit가 ERET */
```

`bl31_prepare_next_image_entry()`가 *다음 image의 SPSR과 ELR을 cpu_context에 박는다*. BL32가 등록돼 있으면 먼저 BL32로 진입한 뒤 BL32의 종료 SMC가 올라오면 BL33으로 넘어갑니다.

```c
/* bl31/bl31_main.c */
void bl31_prepare_next_image_entry(void)
{
    entry_point_info_t *next_image_info;
    uint32_t image_type;

    /* SECURE면 BL32, NON_SECURE면 BL33 */
    image_type = (NON_SECURE & ~mp_state) ? NON_SECURE : SECURE;
    next_image_info = bl31_plat_get_next_image_ep_info(image_type);

    /* cpu_context에 SPSR_EL3, ELR_EL3, SP_ELX 채워 넣음 */
    cm_init_my_context(next_image_info);
    cm_prepare_el3_exit(image_type);
}
```

`el3_exit`이 ERET하면 SPSR_EL3의 EL bit이 EL2를 가리키고, ELR_EL3가 BL33 진입점(예: 0x40200000)을 가리킵니다. CPU는 EL3 → EL2로 권한이 내려간 채 U-Boot 첫 명령을 실행합니다.

## SMC call latency — 측정

SMC 한 번의 cost를 안 잡아 두면 *EL3 call을 너무 자주* 쓰는 코드를 짜게 됩니다. Cortex-A53 1.5 GHz 기준 측정값입니다.

| 작업 | 사이클 | 시간 |
|---|---|---|
| `smc #0` instruction 자체 | ~10 | 6.7 ns |
| EL3 vector entry + caller 저장 | ~80 | 53 ns |
| Dispatcher (OEN lookup) | ~20 | 13 ns |
| PSCI_VERSION handler (가장 가벼움) | ~30 | 20 ns |
| 컨텍스트 복원 + ERET | ~60 | 40 ns |
| **합계 (round trip)** | **~200** | **~133 ns** |

PSCI_VERSION 같은 가벼운 호출은 200 ns 안에 끝납니다. PSCI CPU_ON은 *secondary CPU reset release*까지 포함하므로 *10~100 µs*로 훨씬 비쌉니다. 비교를 위해 `hvc #0`(HVC, EL2 trap)는 SMC 대비 동일 latency다. `svc #0`(SVC, EL1 trap)은 EL3까지 안 가서 *30~50 ns* 수준입니다.

```text
[비교]
SVC (EL0 → EL1) :  ~40 ns   syscall
HVC (EL1 → EL2) : ~120 ns   hypervisor call
SMC (EL1 → EL3) : ~130 ns   secure monitor call
SMC + PSCI CPU_ON: ~10-100 µs  (CPU reset 포함)
```

PSCI suspend는 *수십 µs* 단위라서 idle loop에서 한 번 호출하는 것은 괜찮지만 *hot path에서 SMC를 부르는 것은 금기*다. OP-TEE 호출은 SMC + S-EL1 진입 + secure world MMU 전환이 더해져 보통 *수 µs*다.

## bl31_entrypoint 어셈블리 — 첫 명령

부트 단계의 시작점을 어셈블리 수준에서 봅니다. `bl31/aarch64/bl31_entrypoint.S`의 핵심입니다.

```asm
/* bl31/aarch64/bl31_entrypoint.S (간략화) */
.global bl31_entrypoint
func bl31_entrypoint
    /* 1. EL3 system register 기본값 set up */
    el3_entrypoint_common                              \
        _init_sctlr=1                                  \
        _warm_boot_mailbox=!PROGRAMMABLE_RESET_ADDRESS \
        _secondary_cold_boot=!COLD_BOOT_SINGLE_CPU     \
        _init_memory=1                                 \
        _init_c_runtime=1                              \
        _exception_vectors=runtime_exceptions          \
        _pie_fixup_size=BL31_LIMIT - BL31_BASE

    /* 2. BL2가 넘긴 인자(x0~x3) 저장 */
    mov  x20, x0   /* arg0 — BL2가 넘긴 bl_params */
    mov  x21, x1
    mov  x22, x2
    mov  x23, x3

    /* 3. platform setup */
    bl   bl31_early_platform_setup
    bl   bl31_plat_arch_setup

    /* 4. C 함수 진입 */
    bl   bl31_main

    /* 5. 모든 service init 끝 → BL33으로 ERET */
    b    el3_exit
endfunc bl31_entrypoint
```

`el3_entrypoint_common` 매크로가 *MMU 켜기 전 단계의 모든 준비*를 합니다. SCTLR_EL3에서 M·C·I bit을 끄고, exception vector 등록, BSS clear, runtime stack 설정, MMU page table build, MMU 활성화까지를 한 매크로로 묶었습니다. 이 매크로가 끝나면 BL31은 *MMU on·cache on*의 정상 환경이 됩니다.

## 자주 보는 함정

### Runtime service 등록 누락

SiP service를 새로 만들면서 `DECLARE_RT_SVC`만 적고 *link script에 .rt_svc_descs section을 안 포함*하면 service가 dispatch table에 들어가지 않습니다. BL33에서 그 SMC를 호출하면 `SMC_UNK`(0xFFFFFFFF)가 return됩니다. 빌드 후 `aarch64-linux-gnu-objdump -h bl31.elf | grep rt_svc`로 section이 *실제로 비어 있지 않은지* 확인합니다.

### SMC clobber — caller-saved register 잘못 가정

ARMv8 SMCCC v1.0은 x0~x17까지를 *caller-saved*로 정의합니다. SMC를 호출한 코드가 *그 register들이 유지된다고 가정*하면 깨집니다. 특히 `arm_smccc_smc()`를 inline asm으로 직접 짜면서 clobber list에 `"x0"~"x17"` 누락하는 실수가 흔합니다. mainline 커널 `arch/arm64/kernel/smccc-call.S`는 이를 매크로로 안전하게 감싸 두었습니다.

### EL3 stack overflow

BL31의 stack은 *CPU당 별도*로 잡힙니다. TF-A의 `PLATFORM_STACK_SIZE`(보통 0x1000 = 4 KB)가 한 CPU의 EL3 stack 크기입니다. SDEI handler가 깊은 콜체인을 만들거나 PSCI suspend 안에서 큰 local array를 잡으면 *조용히 overflow*합니다. 보통 *MMU page fault* 형태로 나타나고 EL3 fault는 시스템 hang으로 직결됩니다. `PLATFORM_STACK_SIZE`를 0x2000으로 늘리거나 stack canary를 켜서(`ENABLE_STACK_PROTECTOR=strong`) 조기 검출합니다.

### SCR_EL3.NS bit 관리 실수

EL3가 normal world와 secure world를 오갈 때 `SCR_EL3.NS` bit(non-secure bit)을 정확히 set/clear해야 합니다. SMC handler 안에서 secure world의 register를 읽기 전에 NS=0으로 바꾸지 않으면 *normal world view의 register*가 읽힙니다. mainline TF-A는 `cm_set_next_eret_context()`에서 이를 자동 처리하지만, custom handler를 짤 때 잊기 쉽습니다.

### Console flush 누락 후 ERET

BL31이 BL33으로 점프하기 직전에 `console_flush()`를 부르지 않으면 *마지막 NOTICE 메시지*가 UART FIFO에 남아 BL33이 동일 UART를 reinit할 때 잘려 나갑니다. BL31의 마지막 줄이 항상 UART에 안 보이면 flush 누락입니다.

## 정리

- BL31은 *부트가 끝나도 EL3에 상주*하는 작은 운영체제입니다. BL1·BL2는 일회성이지만 BL31은 시스템 종료까지 살아 있습니다.
- 메모리는 secure DRAM carveout 또는 EL3-only SRAM에 잡히며 TZASC가 non-secure 접근을 차단합니다. DTB의 `/reserved-memory`에 `no-map`으로 표시해 커널이 매핑하지 못하게 막습니다.
- runtime service는 `DECLARE_RT_SVC` 매크로로 `.rt_svc_descs` ELF section에 등록되고, BL31이 부팅 시 OEN별 dispatch 테이블을 만듭니다.
- SMC 진입 경로는 *vector entry → EC 분기 → handle_runtime_svc → service handler*이며 round trip이 약 130 ns(Cortex-A53 1.5 GHz)다.
- 주요 service는 PSCI·SDEI·RAS·SiP service·Trusted OS dispatch 다섯 가지이며, 각각 EL3에 있어야만 하는 권한 요구가 있습니다.
- SDEI는 SecurePartition NMI에 해당하는 메커니즘이며 RAS hardware error를 normal world에 비동기 주입할 때 짝으로 씁니다.
- `bl31_main`이 service init 후 `bl31_prepare_next_image_entry`로 BL33의 SPSR/ELR을 세팅하고, `el3_exit`가 ERET하면서 EL3 → EL2로 권한이 내려갑니다.
- 흔한 함정은 runtime service 등록 누락, SMC clobber 잘못, EL3 stack overflow, SCR_EL3.NS 관리 실수, console flush 누락 다섯 가지입니다.

## 다음 편

다음 편 [Ch 32: PSCI / SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)는 BL31의 가장 큰 손님인 PSCI를 SMCCC 호출 규약과 함께 깊이 봅니다. function ID 구조, fast vs yielding call, CPU_ON·CPU_OFF·CPU_SUSPEND의 ABI를 코드 수준에서 정리하고 Linux PSCI driver가 어떻게 이를 호출하는지를 따라갑니다.

## 관련 항목

- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 32: PSCI / SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)
- [Ch 33: SMP secondary CPU bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [Embedded Security Ch 5: TEE / OP-TEE](/blog/embedded/embedded-security/chapter05-tee)
- [Practical RTOS Internals Ch 4-11: TrustZone-M과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [원문 — TF-A firmware design](https://trustedfirmware-a.readthedocs.io/en/latest/design/firmware-design.html)
- [원문 — Arm SMCCC v1.4](https://developer.arm.com/documentation/den0028)
