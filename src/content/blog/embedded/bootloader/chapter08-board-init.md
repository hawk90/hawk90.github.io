---
title: "Ch 8: 보드 초기화 — board_init_f와 board_init_r"
date: 2026-05-09T08:00:00
description: "U-Boot 보드 초기화 흐름 — pre-relocation (board_init_f)과 post-relocation (board_init_r)."
series: "Bootloader Internals"
seriesOrder: 8
tags: [embedded, bootloader, u-boot, board-init]
draft: false
---

## 한 줄 요약

> **"U-Boot은 부트를 *두 단계로 나눕니다*."** — `board_init_f`는 *DRAM이 없거나 작은 SRAM*에서 동작하는 *pre-relocation*, `board_init_r`은 *DRAM에 복사된 후*에 동작하는 *post-relocation*. 같은 binary이지만 *실행 환경이 완전히 다릅니다*.

U-Boot이 시작하는 순간 *어디서 동작*하는지를 봅니다. SoC SRAM(수십 KB)에서 시작해 *DRAM training이 끝나면 자기 자신을 DRAM에 복사*하고, *복사된 DRAM 코드로 점프*합니다. 점프 전이 *board_init_f*, 점프 후가 *board_init_r*. 두 단계를 *분리해서 이해*하는 것이 U-Boot 흐름의 핵심입니다.

## 왜 두 단계인가

가장 단순한 답은 *DRAM이 처음에는 없다*는 것입니다.

**부트 시점 0**

- SoC 내부 SRAM — 동작 가능 (수십 KB)
- DRAM 영역(`0x40000000`) — 죽어 있음

**DRAM training 완료 후**

- SoC 내부 SRAM — 여전히 동작 가능
- DRAM 영역(`0x40000000`) — 살아남, 수 GB 사용 가능

부트 초기에는 *SRAM 안의 작은 공간*에서 동작해야 합니다. 페이지 테이블, 스택, malloc 영역이 *모두 SRAM 안*에 들어가야 합니다. DRAM이 깨어난 후에는 *DRAM의 충분한 공간*으로 옮겨 가는 것이 자연스럽습니다.

또 다른 이유는 *코드가 ROM/Flash에서 직접 실행*되는 경우입니다. NOR flash에서 *부분적으로 실행*하다가 *DRAM에 복사 후 더 빠르게 실행*하는 패턴.

이 *복사 + 점프*가 *relocation*입니다.

## 메모리 레이아웃 변화

board_init_f와 board_init_r의 *환경 차이*를 메모리 맵으로 봅니다.

![board_init_f vs board_init_r 메모리 모델 — SRAM에서 DRAM으로 relocation](/images/blog/bootloader/diagrams/chapter08-relocation-memory.svg)

board_init_r 시점에는 *DRAM의 충분한 공간*에서 동작합니다. 스택이 크고, malloc 영역도 크고, 마음껏 driver를 probe합니다.

## init_sequence_f — pre-relocation 흐름

`common/board_f.c`에 *board_init_f의 흐름*이 함수 배열로 정의됩니다.

```c
/* common/board_f.c */

static const init_fnc_t init_sequence_f[] = {
    setup_mon_len,           /* monitor 길이 측정 */
#ifdef CONFIG_OF_CONTROL
    fdtdec_setup,             /* control DTB 확정 */
#endif
    initf_malloc,             /* SRAM 안의 작은 malloc init */
    log_init,
    initf_bootstage,
    bootstage_mark_name,
    initf_console_record,
    arch_cpu_init,            /* CPU 초기 설정 (cache, mmu off) */
    mach_cpu_init,            /* SoC별 초기화 */
    initf_dm,                 /* Driver Model init (pre-reloc만) */
    arch_cpu_init_dm,
    timer_init,
    env_init,
    init_baud_rate,
    serial_init,              /* console UART driver 활성화 */
    console_init_f,           /* 첫 printf 가능 */
    display_options,          /* "U-Boot 2024.04..." 출력 */
    checkcpu,
    print_cpuinfo,
    show_board_info,
    misc_init_f,              /* 보드 hook */
    init_func_i2c,
    dram_init,                /* DRAM 크기 측정 */
    setup_dest_addr,          /* relocation 목적지 계산 */
    reserve_round_4k,
    setup_bdinfo,
    display_new_sp,
    reloc_fdt,                /* DTB를 DRAM으로 복사 */
    setup_reloc,
    NULL
};

void board_init_f(ulong boot_flags)
{
    if (initcall_run_list(init_sequence_f))
        hang();
    /* 이후 relocate_code()로 점프 */
}
```

각 함수가 *0을 반환하면 다음으로*, *0이 아니면 hang*. 부트 디버깅 시 *어느 함수에서 죽는지* 확인하는 것이 첫걸음입니다.

### 핵심 함수들

| 함수 | 책임 |
|------|------|
| `arch_cpu_init` | cache flush, MMU 끔, 아키텍처 초기 설정 |
| `initf_dm` | Driver Model init (DM_FLAG_PRE_RELOC만) |
| `serial_init` | console UART driver probe |
| `console_init_f` | 첫 printf 사용 가능 |
| `dram_init` | DRAM 크기 측정 (보드별 hook) |
| `setup_dest_addr` | DRAM 안의 relocation 목적지 계산 |
| `reloc_fdt` | DTB를 DRAM으로 복사 |
| `setup_reloc` | relocation 정보 준비 |

### dram_init — 보드 hook

DRAM 크기는 *보드별로* 다릅니다. 보드 코드가 `dram_init()`을 *override*합니다.

```c
/* board/<vendor>/<board>/<board>.c */

int dram_init(void)
{
    /* PHYS_SDRAM_SIZE는 보드 헤더에서 정의 */
    gd->ram_size = PHYS_SDRAM_SIZE;
    return 0;
}
```

크기를 *fuse나 DDR controller 레지스터에서 동적으로* 읽기도 합니다.

```c
int dram_init(void)
{
    u32 size = read_ddr_size_from_fuse();
    gd->ram_size = size;
    return 0;
}
```

`gd->ram_size`가 *전체 부트 흐름에서 DRAM 크기의 source of truth*입니다.

## gd_t — 전역 데이터

board_init_f가 *전역 변수를 마음대로 못 쓰는* 이유는 *bss가 아직 zero-init 안 됐을 수* 있고 *DRAM이 없을 수* 있기 때문입니다. 대신 `gd_t` 구조체에 *모든 상태*를 보관합니다.

```c
/* include/asm-generic/global_data.h */

struct global_data {
    struct bd_info *bd;
    unsigned long flags;
    unsigned int baudrate;
    unsigned long cpu_clk;
    unsigned long bus_clk;
    unsigned long mem_clk;
    phys_size_t ram_size;
    unsigned long mon_len;
    unsigned long irq_sp;
    unsigned long start_addr_sp;
    unsigned long reloc_off;     /* relocation 오프셋 */
    struct global_data *new_gd;
    struct udevice *cur_serial_dev;
    void *fdt_blob;              /* control DTB */
    ...
};

#define gd  ((volatile gd_t *)gd_ptr)
```

`gd`는 *전역 포인터*로 *항상 접근 가능*합니다. ARM에서는 보통 *r9 또는 x18 레지스터*에 고정되어 있습니다.

```c
/* arch/arm/include/asm/global_data.h */

#ifdef CONFIG_ARM64
#define DECLARE_GLOBAL_DATA_PTR  register volatile gd_t *gd asm ("x18")
#else
#define DECLARE_GLOBAL_DATA_PTR  register volatile gd_t *gd asm ("r9")
#endif
```

이 *레지스터를 망가뜨리지 않는* 것이 ARM assembly 코드의 규칙입니다.

## relocation — DRAM으로 옮기기

board_init_f 끝에서 *DRAM의 어디로 옮길지*를 계산합니다.

```c
/* common/board_f.c */

static int setup_dest_addr(void)
{
    /* DRAM 끝에서 mon_len만큼 아래 */
    gd->ram_top = gd->ram_base + get_effective_memsize();
    gd->relocaddr = gd->ram_top - gd->mon_len;
    gd->relocaddr &= ~(4096 - 1);  /* 4KB align */

    return 0;
}
```

DRAM의 *맨 위*에 U-Boot을 둡니다. *아래는 비워서* 커널 적재 영역으로 씁니다.

```text
DRAM 2GB:
0x40000000  +-------------------+
            | 빈 영역             |
            | (커널/initrd 적재)  |
            |                   |
            +-------------------+
            |                   |
            +-------------------+
            | malloc 영역         |
            +-------------------+
            | stack             |
            +-------------------+
            | bss               |
            +-------------------+
            | data              |
            +-------------------+
            | text (U-Boot 코드) |
0xBFE00000  +-------------------+   ← gd->relocaddr
            | (4KB align)        |
0xC0000000  +-------------------+
```

relocation 함수는 *arch별 assembly*입니다.

```asm
/* arch/arm/lib/relocate.S */

ENTRY(relocate_code)
    ldr    x1, __image_copy_start_ofs
    ...
    /* DRAM의 새 주소로 코드 복사 */
1:  ldp    x10, x11, [x1], #16
    stp    x10, x11, [x0], #16
    cmp    x1, x2
    b.lo   1b

    /* 다시 rela.dyn fixup */
fixloop:
    ldp    x0, x1, [x12], #16
    ...

    /* board_init_r로 점프 */
    bl     board_init_r
ENDPROC(relocate_code)
```

복사 후 *PC가 새 주소*로 점프합니다. 이 시점부터는 *모든 코드가 DRAM에서 실행*됩니다.

## init_sequence_r — post-relocation 흐름

`common/board_r.c`에 *board_init_r의 흐름*이 정의됩니다.

```c
/* common/board_r.c */

static init_fnc_t init_sequence_r[] = {
    initr_trace,
    initr_reloc,              /* gd->flags에 RELOC 표시 */
    initr_caches,             /* MMU + cache enable */
    initr_reloc_global_data,  /* fdt_blob 등 포인터 재계산 */
    initr_barrier,
    initr_malloc,             /* malloc 영역을 DRAM으로 */
    initr_bootstage,
    initr_dm,                 /* DM 재초기화, 모든 driver */
    initr_dm_devices,
    arch_initr_trap,
    initr_announce,           /* "U-Boot is now running from DRAM" */
    dm_announce,
    initr_serial,
    stdio_init,
    initr_env,                /* 환경 변수 적재 */
    initr_secondary_cpu,      /* SMP 깨우기 (ARMv7) */
    initr_pci,
    initr_pci_ep,
    stdio_add_devices,
    initr_jumptable,
    console_init_r,           /* console 인터프리터 활성화 */
    initr_eth,                /* ethernet init */
    initr_post,               /* post-init hook */
    run_main_loop,            /* 명령 인터프리터 시작 */
    NULL
};

void board_init_r(gd_t *new_gd, ulong dest_addr)
{
    gd = new_gd;
    ...
    while (init_sequence_r[i]) {
        init_sequence_r[i]();
        i++;
    }
}
```

run_main_loop가 *명령 인터프리터를 시작*하는 *마지막 줄*입니다. 이 함수는 *반환하지 않습니다*.

```c
/* common/main.c */

void main_loop(void)
{
    bootstage_mark_name(BOOTSTAGE_ID_MAIN_LOOP, "main_loop");

    cli_init();
    autoboot_command(...);   /* bootcmd 실행 */

    cli_loop();              /* 명령 입력 대기, 영원히 */
}
```

`autoboot_command`가 *환경 변수 bootcmd*를 실행합니다. bootcmd가 *커널을 부트*하면 *cli_loop에 도달하지 않습니다*. autoboot이 *중단*되면 cli_loop에서 *프롬프트가 떠* 명령 입력을 받습니다.

## board 코드가 hook할 수 있는 지점

보드별 초기화 코드가 *끼어들 수 있는 곳*은 여러 군데 있습니다.

### pre-relocation hook

```c
int board_early_init_f(void)
{
    /* board_init_f 초기, pinctrl 설정 등 */
    return 0;
}

int dram_init(void)
{
    /* DRAM 크기 보고 */
    gd->ram_size = ...;
    return 0;
}

int dram_init_banksize(void)
{
    /* multi-bank DRAM 정보 */
    gd->bd->bi_dram[0].start = PHYS_SDRAM;
    gd->bd->bi_dram[0].size = PHYS_SDRAM_SIZE;
    return 0;
}

int misc_init_f(void)
{
    /* 기타 pre-reloc 초기화 */
    return 0;
}
```

### post-relocation hook

```c
int board_init(void)
{
    /* board_init_r 중간 단계 hook */
    /* GPIO 설정, PMIC tuning 등 */
    return 0;
}

int board_late_init(void)
{
    /* 거의 끝, 환경 변수 동적 설정 */
    env_set("board_name", get_board_revision());
    return 0;
}

int misc_init_r(void)
{
    /* 환경 변수 외 기타 */
    return 0;
}

int last_stage_init(void)
{
    /* 가장 마지막, cli_loop 직전 */
    return 0;
}
```

### kernel handoff hook

```c
int ft_board_setup(void *blob, struct bd_info *bd)
{
    /* DTB fixup, booti 직전 호출 */
    fdt_setprop(blob, ...);
    return 0;
}

int board_prep_linux(struct bootm_headers *images)
{
    /* Linux 점프 직전 */
    return 0;
}
```

보드 .c 파일에 *원하는 hook 함수*를 정의하면 *기본 weak 구현을 override*합니다.

## bdinfo — runtime 상태 확인

U-Boot 명령 인터프리터의 `bdinfo` 명령이 *gd_t의 핵심 필드*를 보여줍니다.

```text
=> bdinfo
boot_params = 0x00000000
DRAM bank   = 0x00000000
-> start    = 0x40000000
-> size     = 0x80000000
flashstart  = 0x00000000
flashsize   = 0x00000000
flashoffset = 0x00000000
baudrate    = 115200 bps
relocaddr   = 0xbfe00000
reloc off   = 0x7fc00000
Build       = 64-bit
current eth = ethernet@30be0000
ethaddr     = 00:04:9f:01:23:45
IP addr     = <NULL>
fdt_blob    = 0x0000000000000000
new_fdt     = 0xbfdb6000
fdt_size    = 0x00018000
lmb_dump_all:
 memory.cnt  = 0x1
 memory[0]   [0x40000000-0xbfffffff], 0x80000000 bytes
 reserved.cnt = 0x4
 reserved[0] [0xbfd71008-0xbfffffff], 0x0028eff8 bytes
 ...
arch_number = 0x00000000
TLB addr    = 0xbfff0000
irq_sp      = 0x000000000000bff70
sp start    = 0x00000000bff70530
Early malloc usage: 850 / 2000
```

`relocaddr`이 *U-Boot이 적재된 위치*. `reloc off`가 *원본 주소와의 차*. 이 값이 *symbol address fixup에 사용*됩니다.

## bootstage — 시간 측정

U-Boot이 *각 단계의 timestamp*를 자동 기록합니다.

```text
=> bootstage report
Timer summary in microseconds (24 records):
       Mark    Elapsed  Stage
          0          0  reset
        102        102  SPL
     159847     159745  end SPL
     159912         65  board_init_f
     181122      21210  arch_cpu_init
     181135         13  initf_dm
     181201         66  console_init_f
     359862     178661  dram_init
     360100        238  setup_dest_addr
     360125         25  reloc_fdt
     360218         93  end board_init_f
     360230         12  board_init_r
     362544       2314  arch_initr_trap
     364112       1568  initr_eth
     364450        338  end board_init_r
     364462         12  main_loop
     364582        120  bootm_start
...
```

`bootstage report`로 *부트 시간 병목*을 찾습니다. `dram_init`이 *178ms*라면 DDR training이 차지하는 시간입니다.

## 보드 .c 파일의 *전체 모습*

i.MX 8M Plus EVK의 board 코드 골격입니다.

```c
/* board/freescale/imx8mp_evk/imx8mp_evk.c */

#include <common.h>
#include <env.h>
#include <init.h>
#include <miiphy.h>
#include <netdev.h>
#include <asm/arch/clock.h>
#include <asm/arch/sys_proto.h>

DECLARE_GLOBAL_DATA_PTR;

int board_init(void)
{
    /* GPIO 초기화, board-specific PMIC 설정 */
    return 0;
}

int board_early_init_f(void)
{
    init_uart_clk(1);
    return 0;
}

int dram_init(void)
{
    gd->ram_size = PHYS_SDRAM_SIZE;
    return 0;
}

int dram_init_banksize(void)
{
    gd->bd->bi_dram[0].start = PHYS_SDRAM;
    gd->bd->bi_dram[0].size  = PHYS_SDRAM_SIZE;
    return 0;
}

int board_phys_sdram_size(phys_size_t *size)
{
    *size = PHYS_SDRAM_SIZE;
    return 0;
}

int board_late_init(void)
{
    env_set("board_name", "EVK");
    env_set("board_rev", "iMX8MP");
    return 0;
}

#if defined(CONFIG_OF_BOARD_SETUP)
int ft_board_setup(void *blob, struct bd_info *bd)
{
    /* DTB fixup */
    return 0;
}
#endif
```

각 hook이 *어디서 호출되는지* 알면 *원하는 곳에 코드*를 넣을 수 있습니다.

## 자주 하는 실수

### 전역 변수를 *board_init_f에서 수정*

board_init_f는 *bss가 zero-init 안 됐을 수 있고*, *DRAM이 없을 수도 있습니다*. 전역 변수 대신 `gd_t`의 필드에 저장합니다.

```c
/* Bad */
static int my_state = 0;

int board_early_init_f(void)
{
    my_state = 42;  /* 어떻게 될지 모름 */
    return 0;
}

/* Good */
int board_early_init_f(void)
{
    gd->arch.my_state = 42;
    return 0;
}
```

`gd_t`에 *arch 필드*를 정의해서 보드별 상태를 저장합니다.

### `dram_init` 누락

보드 .c 파일에 `dram_init()`이 *없으면 weak 기본 구현이 호출*되고, 그게 *0을 반환하지만 ram_size는 0*입니다. 이후 `setup_dest_addr`이 0을 가지고 *relocation 주소를 계산해 망함*. 반드시 정의.

### `DECLARE_GLOBAL_DATA_PTR` 빠뜨림

C 파일 상단에 `DECLARE_GLOBAL_DATA_PTR;`을 *반드시* 둡니다. 이게 없으면 `gd` 매크로가 *정의되지 않은 변수*가 됩니다.

### relocation 후 *원본 메모리* 사용

relocation 전에 *SRAM 안의 데이터를 가리키는 포인터*가 있다면, relocation 후 *그 SRAM이 사라졌을 수 있습니다*. 모든 포인터는 *gd_t의 relocated 버전*을 써야 합니다.

### `board_init_f`에서 *DM_FLAG_PRE_RELOC* 없는 driver 사용

board_init_f에서는 *DM_FLAG_PRE_RELOC가 있는 driver만* 사용 가능. 일반 driver는 *device 인스턴스 자체가 만들어지지 않습니다*.

### `gd` 레지스터를 *덮어씀*

ARM assembly에서 *r9(또는 x18)를 다른 용도로 사용*하면 *gd가 깨집니다*. 인라인 어셈블리에서 특히 주의.

### `board_init` vs `board_init_f` 헷갈림

이름이 비슷해서 혼동하기 쉽습니다.

- `board_init_f`: pre-relocation의 *전체 흐름 함수* (override 안 함)
- `board_init`: post-relocation의 *보드 hook 함수* (override 함)
- `board_early_init_f`: pre-relocation의 *보드 hook 함수* (override 함)

보드 코드가 작성하는 것은 `board_init`과 `board_early_init_f`.

### `ft_board_setup`이 *호출 안 됨*

defconfig에 `CONFIG_OF_BOARD_SETUP=y`가 *없으면* fixup이 *호출되지 않습니다*. 빌드 통과해도 *실제 부팅 시 fixup이 빠집니다*.

```text
CONFIG_OF_BOARD_SETUP=y
```

## 정리

- U-Boot은 *board_init_f*(pre-relocation, SRAM)와 *board_init_r*(post-relocation, DRAM)로 나뉩니다.
- pre-relocation은 *전역 변수를 못 쓰고*, *DRAM이 없거나 작은 SRAM*에서 동작합니다. 모든 상태는 `gd_t`에.
- `init_sequence_f` 배열의 함수가 *순차로 호출*됩니다. 하나라도 0이 아니면 hang.
- `gd_t`는 *전역 포인터*로 ARM에서 *r9(32bit) 또는 x18(64bit)* 레지스터에 고정.
- relocation은 *DRAM의 맨 위*로 U-Boot을 *복사하고 점프*합니다. PC가 *새 주소*로 옮겨가는 지점.
- `init_sequence_r`은 *DM 재초기화, env 적재, console 인터프리터*까지 진행해 *main_loop*에 도달합니다.
- 보드 코드의 hook은 `board_early_init_f`, `dram_init`, `board_init`, `board_late_init`, `ft_board_setup` 등.
- `bdinfo`로 runtime 상태, `bootstage report`로 *각 단계의 소요 시간*을 확인합니다.

## 다음 편

[Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)에서는 *DDR controller training*의 실제 흐름을 봅니다. ZQ calibration, PHY training, write/read leveling이 *왜 그렇게 길고 까다로운지*, vendor tool이 *어떻게 parameter를 뽑아내는지*.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 22: 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — U-Boot board init flow](https://u-boot.readthedocs.io/en/latest/develop/board_init.html)
- [원문 — U-Boot global data](https://u-boot.readthedocs.io/en/latest/develop/global_data.html)
