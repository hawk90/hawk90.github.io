---
title: "Ch 33: SMP secondary CPU bring-up — spin-table vs PSCI CPU_ON"
date: 2026-05-22T33:00:00
description: "ARM64 secondary CPU 깨우기 — spin-table 옛 방식과 PSCI CPU_ON 표준 방식, secondary_startup 어셈블리, percpu 초기화, hotplug 흐름."
series: "Bootloader Internals"
seriesOrder: 33
tags: [embedded, bootloader, smp, psci, arm64, kernel, hotplug]
---

## 한 줄 요약

> **"SMP 부트는 *primary CPU가 secondary CPU 각각에 진입점을 알려 주고 한 줄씩 일으켜 세우는* 순서다."** — BL1·BL2는 single CPU로 진행되고, BL31이 primary 한 명만 BL33으로 보낸다. 나머지 CPU들은 *Linux가 primary 위에서 동작한 뒤에야* PSCI SMC로 깨워진다. 옛 spin-table 방식과 현재 표준 PSCI 방식이 *어떻게 다른지*가 핵심이다.

[Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 PSCI CPU_ON의 ABI를 봤다. 이 장은 그 *반대편*을 본다. CPU_ON이 trigger된 뒤 secondary CPU가 *어떤 어셈블리를 통과해* Linux의 `secondary_start_kernel`에 도착하는지, 그 사이에 *어떤 자료구조가 초기화*되는지를 따라간다. 비교 대상으로 옛 spin-table 방식도 함께 본다.

## 부트 시퀀스 안에서 SMP가 일어나는 자리

ARMv8-A 부트 체인은 *primary CPU 한 명만*으로 진행된다. BL1·BL2는 *single CPU 가정*으로 짜여 있다. 나머지 CPU 코어들은 reset 직후 *holding pen* 또는 *WFI*로 묶여 있다.

![SMP bring-up: primary boots alone, then PSCI CPU_ON wakes secondaries](/images/blog/bootloader/diagrams/ch33-smp-bringup-flow.svg)

primary가 *부트의 거의 끝까지* 혼자 가고, 마지막에 secondary들을 한 명씩 깨운다. 이 모델의 장점은 *부트 초반의 race를 원천 차단*하는 것이다. DDR initialization, secure carveout setup, MMU page table build 같이 *원자적 단일 흐름이 필요한 작업*을 race 걱정 없이 진행할 수 있다.

전체 SMP bring-up 흐름을 한눈에 보면 다음과 같다.

![SMP bring-up flow — power on → primary → secondary online](/images/blog/bootloader/diagrams/chapter33-smp-bringup-flow.svg)

## 두 가지 방식 — spin-table vs PSCI

secondary CPU를 깨우는 방식은 mainline 커널 기준 두 가지다.

### spin-table (legacy)

ARMv8 spec 초기에 정의된 방식이다. secondary CPU가 *지정된 메모리 주소*를 polling하며 WFE로 대기한다. primary가 *그 주소에 entry point를 write하고 SEV*하면, secondary가 깨어나 그 주소로 점프한다.

```text
[Boot]
Primary 진행                       Secondary
────────                            ──────────
                                    ldr x0, [release_addr]
                                    cbz x0, wait
                                    br  x0           ← 진입
                                wait:
                                    wfe
                                    b   loop

Linux primary:
  str <entry>, [release_addr]
  sev                              ← secondary wakes up
```

`release_addr`는 *각 CPU마다 다른 주소*고 DT에 `cpu-release-addr = <0x0 0x70000000>` 형태로 적힌다. BL31이 부팅 후 secondary CPU들을 그 주소에서 WFI/WFE 상태로 둬야 한다.

### PSCI CPU_ON (현재 표준)

primary가 SMC를 통해 BL31에 *직접 깨우기를 요청*한다. BL31이 SoC reset controller를 두드려 secondary CPU의 reset을 풀고, *warm boot path*에서 caller가 지정한 entry로 점프시킨다. spin-table과 달리 *busy-loop polling이 필요 없고* 진정한 power-down에서 깨울 수 있다.

| 항목 | spin-table | PSCI |
|---|---|---|
| 깨우는 메커니즘 | 메모리 polling + SEV | SMC + SoC reset controller |
| CPU의 전력 상태 | WFI/WFE (clock 그대로) | 진정한 power-down 가능 |
| HOTPLUG_CPU 지원 | 미흡 (재진입 어려움) | CPU_OFF로 완전 지원 |
| suspend-to-RAM | 미지원 | 지원 (CPU_SUSPEND) |
| 표준 | ARMv8 옛 spec | PSCI v1.0+ |
| Linux DT 표기 | `enable-method = "spin-table"` | `enable-method = "psci"` |

mainline 커널 기준 *PSCI가 사실상 강제*다. spin-table은 PSCI가 없는 환경(예: hypervisor 없이 EL2에서 직접 부팅하는 일부 minimal boot)이나 *legacy 보드*에만 남아 있다. 새로 만드는 모든 ARMv8 보드는 PSCI를 쓴다.

## DT 표기 — enable-method가 분기점

커널의 secondary CPU 깨우기 분기는 DT의 `enable-method` 속성으로 결정된다.

```dts
/* PSCI 방식 */
cpus {
    cpu@0 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x0>;
        enable-method = "psci";
    };
    cpu@1 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x1>;
        enable-method = "psci";
    };
};

psci {
    compatible = "arm,psci-1.0";
    method = "smc";
};
```

```dts
/* spin-table 방식 (legacy) */
cpus {
    cpu@0 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x0>;
        enable-method = "spin-table";
        cpu-release-addr = <0x0 0x70000fff8>;
    };
    cpu@1 {
        device_type = "cpu";
        compatible = "arm,cortex-a53";
        reg = <0x1>;
        enable-method = "spin-table";
        cpu-release-addr = <0x0 0x70000fff0>;
    };
};
```

같은 `cpus` 노드에 enable-method가 *섞여 있어도* 된다. 일부 CPU는 PSCI, 일부는 spin-table로 깨우는 hybrid 보드가 드물게 존재한다.

두 방식의 차이를 그림으로 비교하면 다음과 같다.

![spin-table vs PSCI CPU_ON 비교](/images/blog/bootloader/diagrams/chapter33-spin-vs-psci.svg)

## Linux primary의 SMP 진입 흐름

커널이 secondary CPU를 깨우는 코드 경로를 따라간다. `start_kernel`이 마지막에 `rest_init` → `kernel_init` → `kernel_init_freeable` → `smp_init`을 호출한다.

```c
/* kernel/smp.c */
void __init smp_init(void)
{
    unsigned int cpu;

    /* 모든 possible CPU에 대해 cpu_up 호출 */
    for_each_present_cpu(cpu) {
        if (num_online_cpus() >= setup_max_cpus)
            break;
        if (!cpu_online(cpu))
            cpu_up(cpu);
    }
}
```

`cpu_up`이 `_cpu_up` → `bringup_cpu` → `__cpu_up`(arch-specific)으로 내려간다.

```c
/* arch/arm64/kernel/smp.c */
int __cpu_up(unsigned int cpu, struct task_struct *idle)
{
    int ret;
    long status;

    /* 1. idle task 등록 — secondary가 첫 진입할 stack */
    secondary_data.task = idle;
    secondary_data.stack = task_stack_page(idle) + THREAD_SIZE;
    update_cpu_boot_status(CPU_MMU_OFF);
    __flush_dcache_area(&secondary_data, sizeof(secondary_data));

    /* 2. enable-method별 ops 호출 */
    ret = cpu_ops[cpu]->cpu_boot(cpu);
    if (ret)
        return ret;

    /* 3. secondary가 online 될 때까지 wait */
    wait_for_completion_timeout(&cpu_running,
                                msecs_to_jiffies(5000));

    if (!cpu_online(cpu))
        return -EIO;
    return 0;
}
```

`cpu_ops[cpu]`는 enable-method에 따라 다른 ops 구조체다.

```c
/* arch/arm64/kernel/cpu_ops.c */
static const struct cpu_operations *const supported_cpu_ops[] = {
    &smp_spin_table_ops,
    &cpu_psci_ops,
    NULL,
};
```

PSCI 방식이면 `cpu_psci_ops.cpu_boot = cpu_psci_cpu_boot`가 호출되어 SMC를 발사한다.

```c
/* drivers/firmware/psci/psci.c */
static int cpu_psci_cpu_boot(unsigned int cpu)
{
    phys_addr_t pa_secondary_entry = __pa_symbol(secondary_entry);
    int err = psci_ops.cpu_on(cpu_logical_map(cpu), pa_secondary_entry);

    if (err)
        pr_err("failed to boot CPU%d (%d)\n", cpu, err);
    return err;
}
```

`secondary_entry`가 *secondary CPU가 첫 진입할 어셈블리 라벨*이다. PSCI CPU_ON에 *physical address*로 넘긴다는 점이 중요하다.

## secondary_entry 어셈블리 — MMU off에서 시작

`secondary_entry`부터 `__secondary_switched`까지의 어셈블리가 SMP bring-up의 *진짜 핵심*이다. 이 코드는 *MMU off, cache off* 상태에서 시작해 *MMU on, cache on*까지 가져간다.

```asm
/* arch/arm64/kernel/head.S */
SYM_CODE_START(secondary_entry)
    bl    init_kernel_el           /* EL1 또는 EL2 결정 */
    bl    set_cpu_boot_mode_flag
    b     secondary_startup
SYM_CODE_END(secondary_entry)

SYM_CODE_START_LOCAL(secondary_startup)
    /*
     * 공통 entry — secondary 모두가 통과.
     * stack은 still primary의 secondary_data에서 가져옴.
     */
    mov   x20, x0                  /* preserve boot mode */
    bl    __cpu_secondary_check52bitva
    bl    __cpu_setup              /* TCR_EL1, MAIR_EL1 등 set up */
    adrp  x1, swapper_pg_dir       /* primary가 만든 page table */
    adrp  x2, idmap_pg_dir
    bl    __enable_mmu             /* MMU on */
    ldr   x8, =__secondary_switched
    br    x8
SYM_CODE_END(secondary_startup)
```

각 단계가 다음을 한다.

| 단계 | 내용 |
|---|---|
| `init_kernel_el` | EL2면 EL1으로 강하 (EL2 register init 포함) |
| `set_cpu_boot_mode_flag` | EL1으로 시작했는지 EL2로 시작했는지 기록 |
| `__cpu_secondary_check52bitva` | 52-bit VA 지원 일치 검증 |
| `__cpu_setup` | TCR_EL1·MAIR_EL1·SCTLR_EL1 set up |
| `__enable_mmu` | TTBR0·TTBR1 set, SCTLR_EL1.M·C·I bit set |
| `__secondary_switched` | MMU on 상태로 C 코드 진입 |

MMU를 켜는 순간 *primary가 만들어 둔 swapper_pg_dir*가 secondary에도 보이게 된다. 이 page table은 *모든 CPU가 공유*하므로 별도 build가 필요 없다. `__cpu_setup`이 TCR_EL1의 TG0/TG1(page size), IPS(physical addr size)를 primary와 *일치*시켜 page table을 그대로 쓸 수 있게 만든다.

## __secondary_switched — C 코드로 점프

MMU가 켜진 직후의 첫 C 함수가 `secondary_start_kernel`이다.

```asm
/* arch/arm64/kernel/head.S */
SYM_FUNC_START_LOCAL(__secondary_switched)
    mov   x0, x20                  /* boot mode */
    bl    set_cpu_boot_mode_flag

    /* secondary_data로부터 idle task, stack 가져옴 */
    adr_l x0, secondary_data
    ldr   x1, [x0, #CPU_BOOT_STACK] /* stack */
    cbz   x1, __secondary_too_slow
    mov   sp, x1
    ldr   x2, [x0, #CPU_BOOT_TASK]  /* task_struct */
    cbz   x2, __secondary_too_slow
    msr   sp_el0, x2                /* current_thread_info */

    scs_load_current                /* shadow call stack */
    mov   x29, #0
    mov   x30, #0
    b     secondary_start_kernel
SYM_FUNC_END(__secondary_switched)
```

`sp_el0`에 task_struct를 넣어 두는 것이 ARM64 커널의 `current` 매크로를 동작하게 만드는 핵심이다. 그래서 `current = (struct task_struct *) read_sysreg(sp_el0)`이 *어떤 CPU에서든 자기 자신의 task*를 가리킨다.

```c
/* arch/arm64/kernel/smp.c */
asmlinkage notrace void secondary_start_kernel(void)
{
    u64 mpidr = read_cpuid_mpidr() & MPIDR_HWID_BITMASK;
    struct mm_struct *mm = &init_mm;
    unsigned int cpu = smp_processor_id();

    /* 1. percpu offset 설정 */
    set_my_cpu_offset(per_cpu_offset(cpu));

    /* 2. cpu info 채우기 (cpuinfo_arm64) */
    cpuinfo_store_cpu();

    /* 3. mm context 활성화 */
    mmgrab(mm);
    current->active_mm = mm;

    /* 4. GIC CPU interface 초기화 */
    if (cpu_ops[cpu]->cpu_postboot)
        cpu_ops[cpu]->cpu_postboot();

    /* 5. local timer, IRQ enable */
    notify_cpu_starting(cpu);
    store_cpu_topology(cpu);
    numa_add_cpu(cpu);

    /* 6. online 표시 → primary가 wait에서 깨어남 */
    set_cpu_online(cpu, true);
    complete(&cpu_running);

    /* 7. local IRQ enable, idle loop 진입 */
    local_daif_restore(DAIF_PROCCTX);
    cpu_startup_entry(CPUHP_AP_ONLINE_IDLE);
}
```

`set_cpu_online(cpu, true)`이 *그 CPU가 동작 가능*함을 scheduler에 알리는 신호다. 이 줄이 실행되는 순간 scheduler가 그 CPU에 task를 배정하기 시작한다. `complete(&cpu_running)`이 primary의 `wait_for_completion_timeout`을 깨운다. 그 다음 `cpu_startup_entry`가 idle loop로 들어가고 첫 *timer interrupt*가 도착하면 scheduler가 work를 배정한다.

## percpu 자료구조 초기화

`set_my_cpu_offset(per_cpu_offset(cpu))`이 secondary의 *percpu base register*를 set up한다. ARM64는 TPIDR_EL1를 percpu offset register로 쓴다.

```c
/* arch/arm64/include/asm/percpu.h */
static inline void set_my_cpu_offset(unsigned long off)
{
    asm volatile("msr tpidr_el1, %0" :: "r" (off) : "memory");
}

static inline unsigned long __my_cpu_offset(void)
{
    unsigned long off;
    asm("mrs %0, tpidr_el1" : "=r" (off));
    return off;
}
```

이 offset이 설정되기 *전에* percpu variable 접근을 시도하면 *primary CPU의 변수에 접근*하게 되어 race가 난다. `set_my_cpu_offset` 호출 *직후부터* 비로소 percpu access가 안전하다.

GIC CPU interface 초기화는 `cpu_postboot` ops에서 한다. PSCI ops의 경우 다음이 호출된다.

```c
/* drivers/irqchip/irq-gic-v3.c */
static void gic_cpu_init(void)
{
    void __iomem *rbase;
    int i;

    /* GICR (Re-distributor) base 계산 */
    rbase = gic_data_rdist_sgi_base();

    /* SGI/PPI enable */
    for (i = 0; i < 32; i += 32)
        writel_relaxed(GICD_INT_DEF_PRI_X4,
                       rbase + GIC_DIST_PRI + i);

    /* CPU interface enable */
    gic_cpu_sys_reg_init();
}
```

GIC CPU interface(GICC/GICR)는 *CPU별로 자기 자신만 접근 가능*하다. 그래서 *secondary CPU 위에서 직접* 초기화해야 한다. primary가 대신 못 한다. 이게 secondary CPU bring-up이 단순히 reset release만으로 끝나지 않는 이유 중 하나다.

## HOTPLUG_CPU — CPU_OFF 흐름

`echo 0 > /sys/devices/system/cpu/cpu1/online`으로 CPU를 끄면 reverse 흐름이 진행된다.

```text
echo 0 > .../cpu1/online
   │
   ▼
cpu_down(1) → __cpu_down → cpuhp_kick_ap
   │
   ▼
take_cpu_down (CPU1에서 실행)
   │
   ▼
__cpu_disable
   ├─ migrate IRQs to 다른 CPU
   ├─ disable local timer
   └─ cpu_psci_cpu_disable
   │
   ▼
cpu_die (CPU1)
   ├─ idle_task_exit
   ├─ complete(&cpu_died)
   └─ arch_cpu_idle_dead
         │
         ▼
      cpu_psci_cpu_die
         │
         ▼
      smc PSCI_CPU_OFF        ← BL31로 trap
         │
         ▼
      [BL31] platform pwr_domain_off
         │
         ▼
      SoC reset assert → CPU1 전원 차단
```

CPU_OFF SMC는 *return하지 않는다*. 호출한 CPU 자신이 power down되기 때문이다. CPU1이 사라진 뒤 primary는 `wait_for_completion(&cpu_died)`에서 깨어나 hotplug list에서 CPU1을 제거한다.

다시 켤 때는 *처음 SMP bring-up과 같은 경로*가 반복된다. PSCI CPU_ON → BL31 warm boot → secondary_entry → secondary_start_kernel. CPU별 percpu storage는 *영구 할당*돼 있어 재초기화만 하면 된다.

## 측정 — 4-core boot up time

i.MX 8M Plus(4-core Cortex-A53 1.5 GHz, kernel 6.6) 측정값이다.

```text
[BL31 reset release → primary BL33 진입]    : ~5 ms
[BL33 → kernel start_kernel]                : ~500 ms
[start_kernel → smp_init]                   : ~80 ms
[smp_init → 모든 CPU online]                 : ~1 ms
  [CPU1 PSCI CPU_ON SMC]                    : ~5 µs
  [CPU1 reset → secondary_start_kernel]     : ~150 µs
  [CPU1 percpu·GIC·timer init]              : ~100 µs
  [CPU1 ONLINE 표시]                        : ~300 µs (CPU1 총합)
  [CPU2, CPU3 동일]                         : ~600 µs
[총 SMP bring-up time]                      : ~1 ms (4-core)
```

전체 부트의 *1 ms*만이 SMP bring-up에 쓰인다. 나머지는 BL31 부팅과 kernel single-CPU init이 잡아먹는다. SMP bring-up이 빠른 이유는 *PSCI fast call*과 *모든 CPU가 같은 page table을 공유*하기 때문이다.

```text
[ 부트 로그에서 본 SMP 단계 ]
[    0.087401] smp: Bringing up secondary CPUs ...
[    0.087512] Detected VIPT I-cache on CPU1
[    0.087602] GICv3: CPU1: found redistributor 1 region 0
[    0.087701] CPU1: Booted secondary processor 0x0000000001
[    0.087788] Detected VIPT I-cache on CPU2
[    0.087877] GICv3: CPU2: found redistributor 2 region 0
[    0.087966] CPU2: Booted secondary processor 0x0000000002
[    0.088054] Detected VIPT I-cache on CPU3
[    0.088143] GICv3: CPU3: found redistributor 3 region 0
[    0.088232] CPU3: Booted secondary processor 0x0000000003
[    0.088354] smp: Brought up 1 node, 4 CPUs
[    0.088462] SMP: Total of 4 processors activated.
```

`Booted secondary processor` 사이의 timestamp 차이가 *한 CPU bring-up 시간*이다. 약 100 µs 단위로 올라온다.

## 자주 보는 함정

### Secondary CPU stack 미할당

`secondary_data.stack`이 NULL이면 `__secondary_switched`의 `cbz x1, __secondary_too_slow` 검사에 걸려 secondary가 *조용히 hang*한다. mainline 커널은 idle thread를 미리 fork해 stack을 할당해 두지만, 새 enable-method ops를 custom으로 추가하다 `secondary_data` 설정을 빠뜨리면 발생한다. 부팅 중 `CPU%d: failed to come online`이 뜨면 stack 또는 task struct를 의심한다.

### GIC CPU interface 초기화 누락

`cpu_postboot`에서 `gic_cpu_init`을 부르지 않으면 SGI/PPI가 안 들어와 *secondary가 timer interrupt를 못 받는다*. local IRQ는 enable되지만 *아무 interrupt도 도착하지 않으므로* scheduler가 task를 배정해도 idle에 머문다. mainline에서는 `cpu_psci_ops`가 자동 처리하지만, hypervisor 환경의 paravirt SMP에서 빠뜨리는 경우가 있다.

### CPU_ON race — 같은 CPU 두 번 호출

primary가 `cpu_up(1)`을 호출한 직후 *다른 thread가 다시 `cpu_up(1)`을 호출*하면 PSCI가 `ALREADY_ON` 또는 `ON_PENDING`을 return한다. 커널의 `cpu_up`은 `cpu_hotplug_lock`으로 보호되지만, custom ops를 짤 때 race를 신경 쓰지 않으면 *secondary가 두 번 진입*해 stack corruption이 난다.

### MMU enable 전에 percpu access

`set_my_cpu_offset` 이전에 percpu variable에 쓰는 코드가 들어가면 *primary CPU의 percpu 영역*을 두드리게 된다. 이는 *race로 primary를 망가뜨릴 수* 있다. 특히 `pr_info` 같은 매크로가 내부에서 percpu printk buffer를 쓰므로 *MMU enable 전에 print 호출 자체가 위험*하다. mainline은 `early_printk`에 special path를 두지만 custom build에서 잊기 쉽다.

### spin-table release_addr 정렬 누락

spin-table 방식에서 `cpu-release-addr`가 8-byte aligned가 아니면 `ldr x0, [release_addr]`이 alignment fault를 낸다. DT 작성 시 *항상 8-byte aligned* 주소를 쓰고, BL31이 그 주소에 8-byte zero를 미리 깔아 둬야 한다.

### enable-method 누락 또는 잘못

`enable-method` 속성이 없으면 커널이 *PSCI도 spin-table도 아니라고 판단해* 그 CPU를 *online으로 만들지 않는다*. `dmesg`에 `CPU%d: failed in unknown state` 형태의 메시지가 뜨면 DT의 enable-method를 확인한다. 거꾸로 `enable-method = "psci"`인데 PSCI 노드 자체가 DT에 없으면 PSCI ops가 등록 안 돼 같은 결과가 난다.

## 정리

- SMP 부트는 *primary CPU가 secondary 각각에 진입점을 알려 일으켜 세우는* 순서다. BL1·BL2·BL31·BL33·Linux primary가 모두 single CPU로 진행된다.
- secondary 깨우는 방식은 두 가지다. *spin-table*은 메모리 polling + SEV, *PSCI*는 SMC + SoC reset controller다. 현재 표준은 PSCI다.
- DT의 `cpus/cpu@N/enable-method` 속성이 분기점이고, PSCI 방식이면 `psci` 노드와 `method = "smc"`가 함께 있어야 한다.
- 커널의 `__cpu_up`이 `secondary_data`에 idle task와 stack을 채우고, enable-method에 맞는 `cpu_boot` ops를 호출해 PSCI CPU_ON SMC를 발사한다.
- secondary는 `secondary_entry → secondary_startup → __secondary_switched → secondary_start_kernel`을 통과한다. MMU off에서 시작해 primary가 만든 swapper_pg_dir로 MMU를 켠다.
- `set_my_cpu_offset`이 TPIDR_EL1을 채워야 percpu access가 안전해진다. GIC CPU interface 초기화는 secondary 위에서 직접 해야 한다.
- HOTPLUG_CPU는 `cpu_die`가 `PSCI CPU_OFF` SMC로 자신을 끄는 흐름이고, 다시 켤 때는 처음 bring-up과 같은 경로가 반복된다.
- 4-core Cortex-A53 기준 전체 SMP bring-up이 약 1 ms 안에 끝난다. 한 CPU당 reset release 후 online까지 ~300 µs다.
- 흔한 함정은 secondary stack 미할당, GIC 초기화 누락, CPU_ON race, MMU 전 percpu access, spin-table 정렬 문제, enable-method 누락 여섯 가지다.

## 시리즈 마무리

이 장이 Bootloader Internals 시리즈의 *마지막 깊이*다. 시리즈는 [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)에서 시작해 BootROM부터 init까지의 전 과정을 따라왔다. 30장이 양산 CI까지의 보편적 흐름을 다뤘다면, 마지막 세 장(31·32·33)은 *ARM bare-metal boot이 깊어질 때 반드시 마주치는* EL3 runtime과 SMP bring-up을 채웠다.

다음 단계로 추천할 주제는 두 가지다. 첫째는 [Embedded Security](/blog/embedded/embedded-security/chapter01-threat-model) 시리즈로 secure boot·TrustZone·TEE의 보안 모델을 더 깊이 파는 길이다. 둘째는 [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) 시리즈로 ARM Cortex-A SMP·AMP·context switch 같은 *부트 이후의 runtime* 동작을 따라가는 길이다.

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 31: TF-A BL31 EL3 Runtime](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)
- [Ch 32: PSCI / SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)
- [Practical RTOS Internals Ch 2-6: Cortex-A context switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [Practical RTOS Internals Ch 4-7: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [Practical RTOS Internals Ch 4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [원문 — Arm PSCI v1.1 specification (DEN0022)](https://developer.arm.com/documentation/den0022)
- [원문 — Linux kernel Documentation/arm64/booting.rst](https://www.kernel.org/doc/html/latest/arch/arm64/booting.html)
