---
title: "U-Boot 보드 초기화 시퀀스 — board_init_f와 board_init_r 분리 이유"
slug: "embedded/bootloader/chapter08-board-init"
date: 2026-05-09T09:08:00
description: "U-Boot 보드 초기화 흐름 — pre-relocation (board_init_f)과 post-relocation (board_init_r)."
series: "Bootloader Internals"
seriesOrder: 8
tags: [embedded, bootloader, u-boot, board-init]
draft: false
topics: ["embedded"]
---


## 한 줄 요약

> U-Boot는 **DRAM을 쓸 수 없는 상태에서 DRAM을 준비하는 코드**(`board_init_f`)와 **DRAM으로 옮겨 간 뒤 나머지를 초기화하는 코드**(`board_init_r`)를 나눕니다. 두 함수 사이에서 U-Boot는 자기 자신을 RAM 위쪽으로 복사하고, 그 뒤에야 BSS·전역 변수·전체 `malloc`을 쓸 수 있습니다.

이 글은 U-Boot **v2024.04**의 `common/board_f.c`, `common/board_r.c`, `arch/arm/lib/crt0_64.S`를 기준으로 합니다. 함수 이름과 순서는 이 태그의 소스에서 확인한 것이고, 다른 태그에서는 항목이 더하거나 빠질 수 있습니다.

## 왜 두 단계로 나누는가

이사에 비유하면 이해가 쉽습니다. 새 집(DRAM)에 들어가려면 먼저 새 집을 고쳐야 하는데, 고치는 동안에는 임시 숙소(SRAM이나 cache)에서 지내야 합니다. 임시 숙소는 좁아서 짐(전역 변수, 큰 heap)을 풀 수 없고, 꼭 필요한 메모 한 장(global data)만 들고 다닙니다.

`arch/arm/lib/crt0_64.S`의 주석이 이 조건을 그대로 적어 둡니다. `board_init_f()`를 부르기 전 환경은 "SRAM, locked cache 같은 바로 쓸 수 있는 RAM"에 stack과 GD(global data)만 있고, **값이 바뀌는 전역 변수와 BSS는 쓸 수 없으며 상수 데이터만** 읽을 수 있습니다. 이유는 간단합니다. 이 시점의 U-Boot 이미지는 flash나 SRAM처럼 쓰기가 안 되거나 좁은 곳에서 실행되고, BSS를 0으로 채울 RAM도 아직 없을 수 있습니다.

그래서 `board_init_f()`가 알아낸 값(relocation 주소, 새 stack 위치, 새 GD 위치)은 전부 GD 구조체에 담아 다음 단계로 넘깁니다. 전역 변수에 저장하면 relocation 뒤에 사라지거나, 애초에 쓰기 자체가 실패합니다.

## `board_init_f()` — DRAM을 쓸 수 있게 만드는 단계

`board_init_f()`는 함수 포인터 배열 `init_sequence_f`를 처음부터 끝까지 호출하고, 하나라도 0이 아닌 값을 돌려주면 `hang()`으로 멈춥니다. v2024.04의 배열을 역할별로 묶으면 다음과 같습니다(`#ifdef`로 빠지는 항목은 괄호에 조건을 적었습니다).

| 묶음 | 대표 항목 (v2024.04 순서) | 하는 일 |
| --- | --- | --- |
| 이미지·DTB | `setup_mon_len`, `fdtdec_setup`(`CONFIG_OF_CONTROL`) | U-Boot 이미지 크기 계산, control DTB 위치 확정 |
| 초기 heap·로그 | `initf_malloc`, `log_init`, `initf_bootstage` | pre-relocation용 작은 heap과 로그 준비 |
| CPU·driver model | `arch_cpu_init`, `mach_cpu_init`, `initf_dm`, `board_early_init_f`(`CONFIG_BOARD_EARLY_INIT_F`) | 아키텍처·SoC 초기 설정, pre-relocation device bind |
| 시계·console | `timer_init`, `env_init`, `init_baud_rate`, `serial_init`, `console_init_f` | 첫 UART 출력이 여기서부터 가능 |
| DRAM | `announce_dram_init`, `dram_init` | 보드가 RAM 크기를 `gd->ram_size`에 기록 |
| 메모리 예약 | `setup_dest_addr`, `reserve_*` 묶음, `dram_init_banksize` | RAM 위쪽부터 영역을 잘라 relocation 목적지 결정 |
| 넘겨줄 준비 | `setup_bdinfo`, `reloc_fdt`, `setup_reloc`, `clear_bss` | 복사할 FDT·GD 준비, `gd->reloc_off` 계산 |

여기서 눈여겨볼 점이 두 가지입니다.

첫째, `initf_malloc`이 준비하는 heap은 `CONFIG_SYS_MALLOC_F_LEN` 크기의 단순 할당기(`common/malloc_simple.c`)입니다. 해제(`free`)가 사실상 없고, 크기도 작습니다. v2024.04 루트 `Kconfig`의 기본값은 아키텍처에 따라 `0x400`부터 `0x10000`(i.MX8·i.MX8M)까지이고, 지정이 없으면 `0x2000`입니다. pre-relocation에서 driver를 많이 bind하다가 "alloc space exhausted" 같은 메시지로 멈춘다면 이 값을 먼저 봅니다.

둘째, `initf_dm`은 모든 device를 bind하지 않습니다. `doc/develop/driver-model/design.rst`의 "Pre-Relocation Support"에 따르면 `DM_FLAG_PRE_RELOC`가 붙은 driver나 DT에 `bootph-all` 속성이 있는 노드만 이 단계에서 초기화됩니다. 그래서 UART를 relocation 전에 쓰려면 그 UART 노드에 `bootph-all`(또는 해당 단계의 `bootph-*`)이 있어야 합니다. 이 속성이 빠지면 relocation 전 console이 조용한 원인이 됩니다.

## 메모리 예약과 relocation 목적지

`dram_init()`이 RAM 크기를 알려 주면, `setup_dest_addr()`가 사용할 수 있는 RAM의 꼭대기를 `gd->ram_top`과 `gd->relocaddr`의 시작값으로 정합니다. 이어지는 `reserve_*` 함수들은 그 꼭대기에서 아래로 내려오면서 영역을 하나씩 떼어 냅니다. 책장 맨 위 칸부터 책을 꽂는 것과 같습니다.

v2024.04 `init_sequence_f`에서 실제 순서는 이렇습니다.

1. `reserve_round_4k`, `arch_reserve_mmu`, `reserve_video`, `reserve_trace` — 4 KiB 정렬, MMU table, framebuffer, trace buffer(각각 구성에 있을 때)
2. `reserve_uboot` — U-Boot 이미지(`gd->mon_len`)만큼 빼고 4 KiB로 정렬합니다. 이 값이 최종 `gd->relocaddr`, 곧 **U-Boot가 복사될 주소**입니다.
3. `reserve_malloc`, `reserve_board`, `reserve_global_data`, `reserve_fdt`, `reserve_bootstage`, `reserve_bloblist`, `reserve_arch`, `reserve_stacks` — U-Boot 이미지 **아래**에 heap, `bd_info`, 새 GD, FDT 복사본, stack을 차례로 둡니다. 마지막 stack 위치가 `gd->start_addr_sp`가 됩니다.

![board_init_f의 init_sequence_f가 dram_init 뒤 setup_dest_addr와 reserve 단계를 거쳐 relocation 후 board_init_r로 넘어가는 흐름, 그리고 usable RAM top에서 아래로 U-Boot 이미지·malloc·FDT·stack 영역이 예약되는 순서](/images/blog/bootloader/diagrams/chapter08-relocation-memory.svg)

그림은 v2024.04 `init_sequence_f`의 순서를 따른 개념도입니다. 칸의 높이는 실제 크기에 비례하지 않습니다.

마지막으로 `setup_reloc()`가 이동 거리를 계산합니다. ARM에서는 `gd->reloc_off = gd->relocaddr - __image_copy_start`이고, ARM이 아닌 대부분의 아키텍처에서는 `CONFIG_TEXT_BASE`를 기준으로 뺍니다(M68K·MicroBlaze는 별도 식). 이 값은 relocation 뒤 함수 주소를 디버거에서 맞출 때 그대로 쓰입니다. 링크된 주소에 `reloc_off`를 더하면 실제 실행 주소가 됩니다.

## Relocation 순간 — `crt0_64.S`가 하는 일

ARM64에서 `board_init_f()`가 돌아오면 `_main`(`arch/arm/lib/crt0_64.S`)이 나머지를 이어 받습니다. 주석에 적힌 7단계 중 relocation 부분은 다음과 같습니다.

1. stack과 GD를 `board_init_f()`가 DRAM에 잡아 둔 새 위치로 옮깁니다. 이때도 BSS는 아직 쓸 수 없습니다.
2. U-Boot proper는 `relocate_code`로 자기 이미지를 `gd->relocaddr`로 복사합니다. SPL은 이 단계가 없고 `board_init_f()`에서 그대로 돌아옵니다.
3. 복사본의 주소를 고칩니다. `doc/README.arm-relocation`에 따르면 ARM U-Boot는 `-pie`로 링크되어 `.rel.dyn` fixup 표를 이미지에 담고, relocation loop가 이 표를 읽어 절대 주소를 새 위치 기준으로 바꿉니다.
4. 일부 CPU를 위해 `c_runtime_cpu_setup`을 부르고, BSS를 0으로 채운 뒤 `board_init_r()`로 점프합니다. 이 함수는 돌아오지 않습니다.

이사로 치면 3단계가 "주소록의 옛 주소를 새 주소로 고쳐 쓰는 일"입니다. 이 표가 빠지거나 손상되면 복사는 성공해도 첫 함수 포인터 호출에서 옛 주소로 뛰어 멈춥니다.

## `board_init_r()` — 모든 것을 쓸 수 있는 단계

`board_init_r()`도 배열 `init_sequence_r`을 차례로 실행합니다. 첫 항목들이 relocation이 끝났다는 사실을 시스템에 알립니다.

| 항목 (v2024.04 `common/board_r.c`) | 하는 일 |
| --- | --- |
| `initr_reloc` | `gd->flags`에 `GD_FLG_RELOC`와 `GD_FLG_FULL_MALLOC_INIT`를 세웁니다. 이후 코드는 이 flag로 relocation 여부를 판단합니다 |
| `initr_caches` (ARM·RISC-V) | cache를 켭니다 |
| `initr_malloc` | `gd->relocaddr` 바로 아래 `TOTAL_MALLOC_LEN` 크기의 정식 heap을 엽니다. 여기서부터 `free`가 동작합니다 |
| `initr_of_live`, `initr_dm` | live tree와 driver model을 **다시** 초기화합니다. pre-relocation에서 bind한 device도 새로 bind됩니다 |
| `board_init` (ARM·RISC-V·sandbox) | 보드 파일의 `board_init()` hook |
| `initr_dm_devices`, `serial_initialize`, `initr_announce` | device probe, 정식 console 전환 |
| … `run_main_loop` | 배열의 마지막 항목. U-Boot shell(`main_loop`)로 들어가고 돌아오지 않습니다 |

보드를 포팅할 때 hook을 어느 쪽에 둘지는 이 표로 정합니다. DRAM이 필요하거나 heap을 많이 쓰는 초기화는 `board_init()`(r 단계)에, console 전에 꼭 해야 하는 pin mux 같은 일은 `board_early_init_f()`(f 단계)에 둡니다.

## GD 포인터는 register에 있다

`gd`는 전역 변수가 아닙니다. pre-relocation에서 전역 변수를 쓸 수 없기 때문에 U-Boot는 GD 주소를 CPU register 하나에 고정해 둡니다. v2024.04 `arch/arm/include/asm/global_data.h`에서 `CONFIG_ARM64`이면 `x18`, 32-bit ARM이면 `r9`입니다.

```c
/* arch/arm/include/asm/global_data.h (v2024.04) */
#ifdef CONFIG_ARM64
#define DECLARE_GLOBAL_DATA_PTR		register volatile gd_t *gd asm ("x18")
#else
#define DECLARE_GLOBAL_DATA_PTR		register volatile gd_t *gd asm ("r9")
#endif
```

그래서 U-Boot 안에서 실행되는 코드(독자적인 assembly, 외부 라이브러리 포함)가 이 register를 덮어쓰면 `gd->` 접근이 엉뚱한 메모리를 읽습니다. relocation 전후로 이상하게 멈추는 보드에서 먼저 의심할 곳입니다.

## 확인하는 방법

relocation 결과는 U-Boot shell에서 `bdinfo`로 볼 수 있습니다. v2024.04 `cmd/bdinfo.c`는 `relocaddr`와 `reloc off` 줄에 `gd->relocaddr`와 `gd->reloc_off`를 그대로 출력합니다. 아래는 출력 형식만 보인 것으로, 값은 보드와 구성마다 다르므로 비워 두었습니다.

```text
=> bdinfo
...
relocaddr   = 0x<gd->relocaddr>
reloc off   = 0x<gd->reloc_off>
...
```

`relocaddr`가 RAM 끝에서 이미지 크기만큼 떨어진 값보다 훨씬 아래에 있다면, 앞서 본 `reserve_video`·`reserve_trace` 같은 영역이 위쪽을 먼저 차지한 것입니다. relocation 뒤 코드에 breakpoint를 걸 때는 `System.map`의 링크 주소에 `reloc off`를 더한 주소를 씁니다.

## 정리

- `board_init_f()`는 SRAM·cache처럼 바로 쓸 수 있는 RAM에서 stack과 GD만으로 실행되고, BSS와 전역 변수를 쓸 수 없습니다(`crt0_64.S` 주석).
- `init_sequence_f`는 console·DRAM 준비 뒤 RAM 꼭대기부터 영역을 예약하고, `reserve_uboot`가 정한 주소가 relocation 목적지입니다.
- 예약 순서는 video·trace → U-Boot 이미지 → malloc·bd·GD·FDT·stack입니다(v2024.04).
- ARM은 `-pie` fixup 표로 복사된 이미지의 주소를 고치고, `gd->reloc_off`가 그 이동 거리입니다.
- `board_init_r()`는 `GD_FLG_RELOC`를 세우고 정식 heap·driver model을 다시 초기화한 뒤 `main_loop`로 갑니다.
- pre-relocation device는 `bootph-all` 또는 `DM_FLAG_PRE_RELOC`가 있어야 bind되고, heap은 `CONFIG_SYS_MALLOC_F_LEN`으로 제한됩니다.
- GD 포인터는 ARM64 `x18`, ARM32 `r9`에 있습니다(`CONFIG_ARM64`로 구분).

## 다음 편

[Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)에서는 이 글의 `dram_init()` 앞에서 실제로 DRAM controller와 PHY가 어떻게 준비되는지 다룹니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 22: 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [U-Boot v2024.04 `common/board_f.c`](https://github.com/u-boot/u-boot/blob/v2024.04/common/board_f.c)
