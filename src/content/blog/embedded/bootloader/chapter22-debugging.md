---
title: "부트로더 디버깅 기법 — DEBUG·JTAG·serial·post-mortem 분석"
slug: "embedded/bootloader/chapter22-debugging"
date: 2026-05-09T09:22:00
description: "부트로더 디버깅 — CONFIG_DEBUG_UART, JTAG, 시리얼 콘솔, panic dump 읽기."
series: "Bootloader Internals"
seriesOrder: 22
tags: [embedded, bootloader, u-boot, debugging, jtag]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> U-Boot가 이상할 때 쓰는 도구는 단계마다 다릅니다. **시리얼 드라이버 전에는 DEBUG UART, 초기화 순서는 파일별 `#define DEBUG`, relocation 뒤 코드는 `reloc off`만큼 옮긴 심볼로 gdb, 죽은 뒤에는 예외 덤프의 `elr (reloc)`과 `addr2line`**입니다. 이 글은 네 가지를 같은 U-Boot에서 모두 실제로 실행합니다.

기준은 U-Boot **v2024.04** `qemu_arm64_defconfig`에 `CONFIG_DEBUG_UART`(PL011)를 켜고 `lib/initcall.c` 맨 위에 `#define DEBUG`를 넣은 디버그 빌드입니다. QEMU 11.1.3 `virt`에서 실행했고 gdb는 `aarch64-elf-gdb` 18.1입니다. v2024.04 `doc/develop/driver-model/debugging.rst`가 권하는 순서(`#define DEBUG`, 로그 레벨, `CONFIG_LOG_ERROR_RETURN`, DEBUG UART, JTAG)를 따라가되, 결과는 모두 이 빌드에서 얻은 것입니다.

## 1. 시리얼 드라이버보다 먼저 — DEBUG UART

일반 콘솔은 driver model이 시리얼 장치를 probe한 뒤에야 출력합니다([8장](/blog/embedded/bootloader/chapter08-board-init)의 `serial_init`). 그 전에 멈추면 화면에는 아무것도 없습니다. DEBUG UART는 driver model 없이 레지스터에 직접 글자를 쓰는 작은 경로입니다. QEMU `virt`의 UART는 PL011이고 주소는 DTB의 `pl011@9000000`입니다.

```text
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_PL011=y
CONFIG_DEBUG_UART_BASE=0x9000000
CONFIG_DEBUG_UART_CLOCK=24000000
CONFIG_DEBUG_UART_ANNOUNCE=y
```

`DEBUG_UART_ANNOUNCE`를 켜면 DEBUG UART가 준비되는 순간 표시를 찍습니다. 부팅 첫 줄이 U-Boot 배너보다 먼저 나왔습니다.

```text
<debug_uart>
initcall: 000000000002a4ec
initcall: 000000000008d658
...
U-Boot 2024.04-...
```

실제 보드에서 이 한 줄이 나오면 "CPU가 U-Boot 코드를 실행하고, UART 핀과 clock이 살아 있다"까지 확인된 것입니다. [21장](/blog/embedded/bootloader/chapter21-board-porting) 그림의 1단계가 이것입니다. 안 나오면 원인은 그 앞, 곧 ROM이 이미지를 읽었는지, 주소와 clock 값이 맞는지로 좁혀집니다. 이 QEMU 실험에서 `CONFIG_DEBUG_UART_CLOCK` 값은 의미가 없지만(QEMU의 PL011은 분주를 흉내 내지 않습니다), 실제 보드에서는 이 값이 틀리면 글자가 깨집니다.

## 2. 초기화 순서 보기 — 파일별 `#define DEBUG`

U-Boot의 `debug()`는 그 파일에 `DEBUG`가 정의되어야 출력됩니다([9장](/blog/embedded/bootloader/chapter09-dram-init)). 초기화 함수를 하나씩 부르는 `lib/initcall.c`에 켜면, 실행하는 함수의 주소가 차례로 찍힙니다. 이 빌드는 부팅에서 shell까지 84줄이었습니다.

```text
initcall: 000000000002a4ec
initcall: 000000000008d658
initcall: 0000000000031460
...
DRAM:  initcall: 00000000000034e4
...
initcall: 000000000002a728
initcall: 000000007f701a14
initcall: 000000007f701a1c
```

`addr2line -f -e u-boot`으로 풀면 앞의 세 개는 `setup_mon_len`, `fdtdec_setup`, `initf_malloc`이고, 8장에서 본 `init_sequence_f`의 맨 앞 순서 그대로입니다. 출력 중간의 `DRAM:  ` 바로 뒤에 initcall 줄이 붙은 것은 `announce_dram_init`이 줄바꿈 없이 `DRAM:  `만 찍고 다음 함수(`dram_init`)로 넘어갔기 때문입니다. 출력과 초기화 함수가 한 줄에서 맞물려 보입니다.

주소가 `0x7f701a14`로 크게 뛰는 지점이 relocation입니다. 이후 주소는 RAM 위쪽에서 실행되는 복사본의 주소라서, 이 빌드의 `reloc off`(`0x7f6d7000`)를 빼야 `addr2line`이 풀 수 있습니다. 빼서 풀면 `initr_trace`이고, `init_sequence_r`의 첫 항목입니다. [21장](/blog/embedded/bootloader/chapter21-board-porting)의 `initcall failed at call <addr>`도 같은 함수가 찍는 메시지이므로, relocation 뒤에 실패했다면 같은 방법으로 뺀 뒤 풀고, 21장에서 본 대로 배열의 한 칸 앞을 봅니다.

## 3. relocation 뒤에 멈추기 — gdb와 `reloc off`

QEMU의 gdbstub(`-gdb tcp::1235`)에 gdb를 붙이고, shell의 `version` 명령을 처리하는 `do_version`에 breakpoint를 걸었습니다. 먼저 ELF를 그대로 읽은 경우입니다.

```text
(gdb) symbol-file u-boot
(gdb) info address do_version
Symbol "do_version" is a function at address 0x12884.
(gdb) break do_version
Breakpoint 1 at 0x12884: file cmd/version.c, line 21.
(gdb) continue
```

shell에서 `version`을 쳐도 멈추지 않았습니다. 링크 주소 `0x12884`는 relocation 전 flash 위의 코드이고, 실제로 실행되는 것은 RAM의 복사본입니다. v2024.04 `doc/README.arm-relocation`이 이 경우에 relocation 주소로 심볼을 다시 읽으라고 안내합니다. 모든 섹션을 같은 거리만큼 옮기는 gdb의 `-o` 옵션에 `bdinfo`의 `reloc off`를 주었습니다.

```text
(gdb) symbol-file
(gdb) add-symbol-file u-boot -o 0x7f6d7000
add symbol table from file "u-boot" with all sections offset by 0x7f6d7000
(gdb) info address do_version
Symbol "do_version" is a function at address 0x7f6e9884.
(gdb) break do_version
(gdb) continue

Breakpoint 1, do_version (cmdtp=0x7f7ad398 <_u_boot_list_2_cmd_2_version>, flag=0, argc=1, argv=0x7e6adfa0)
    at cmd/version.c:21
21		printf(display_options_get_banner(false, buf, sizeof(buf)));
(gdb) bt
#0  do_version (...) at cmd/version.c:21
#1  0x000000007f709e6c in cmd_call (...) at common/command.c:581
#2  cmd_process (...) at common/command.c:636
#3  0x000000007f700bc4 in run_pipe_real (...) at common/cli_hush.c:1675
#4  run_list_real (...) at common/cli_hush.c:1872
#5  0x000000007f700d70 in run_list (...) at common/cli_hush.c:2021
#6  parse_stream_outer (...) at common/cli_hush.c:3211
#7  0x000000007f7012a0 in parse_file_outer () at common/cli_hush.c:3303
#8  0x000000007f709320 in cli_loop () at common/cli.c:302
#9  0x000000007f6fe354 in main_loop () at common/main.c:83
#10 0x000000007f701a48 in run_main_loop () at common/board_r.c:554
#11 0x000000007f75afa8 in initcall_run_list (init_sequence=0x7f7a5e98 <init_sequence_r>) at lib/initcall.c:74
#12 0x000000007f701d08 in board_init_r (...) at common/board_r.c:770
#13 0x000000007f6d9a18 in _main () at arch/arm/lib/crt0_64.S:141
```

(경로 앞부분은 줄였습니다.) 이 백트레이스 한 장이 이 시리즈의 앞부분을 한 번에 보여 줍니다. `_main`(crt0_64.S, 8장)에서 `board_init_r`로 넘어와 `init_sequence_r`의 마지막 `run_main_loop`가 `main_loop`를 부르고, hush 파서([13장](/blog/embedded/bootloader/chapter13-env-bootcmd))가 명령을 나눠 `cmd_call`로 `do_version`을 실행합니다. 이 QEMU 빌드는 `CONFIG_TEXT_BASE=0`이라 `reloc off`와 `relocaddr`가 같은 값이므로 README의 `add-symbol-file u-boot <relocaddr>` 형식도 같은 결과를 줍니다. `TEXT_BASE`가 0이 아닌 보드에서는 `-o <reloc off>`가 헷갈리지 않습니다.

실제 보드에서는 gdbstub 자리에 JTAG 프로브와 OpenOCD가 들어갈 뿐, `reloc off`를 맞추는 일은 같습니다. 칩의 보안 설정이 JTAG을 막고 있으면 이 방법은 쓸 수 없으므로, 개발 단계 보드에서 미리 확인해 둡니다.

## 4. 죽은 뒤에 읽기 — 예외 덤프

일부러 매핑되지 않은 주소를 읽게 했습니다.

```text
=> md.q 0xffff000000000000 1
"Synchronous Abort" handler, esr 0x96000004, far 0xffff000000000000
elr: 000000000008eb58 lr : 000000000008ea78 (reloc)
elr: 000000007f765b58 lr : 000000007f765a78
x0 : 0000000000000011 x1 : 000000007f7929a3
...
x18: 000000007e696d90 x19: 0000000000000002
...
x24: ffff000000000000 x25: 000000007e596968
...
Code: 91268c01 17ffffd3 7100229f 54000081 (f9400303)
Resetting CPU ...
```

덤프를 한 줄씩 풀면 원인이 소스 한 줄까지 내려옵니다.

| 덤프 항목 | 값 | 푼 결과 |
| --- | --- | --- |
| `esr` | `0x96000004` | EC(bit 31:26) `0x25` = `ESR_ELx_EC_DABT_CUR`(같은 EL의 data abort), DFSC `0x04` = `ESR_ELx_FSC_FAULT`(translation fault), WnR 0 = 읽기 (`arch/arm/include/asm/esr.h`) |
| `far` | `0xffff000000000000` | 접근하려던 주소. `md.q`에 준 값 그대로 |
| `elr ... (reloc)` | `0x8eb58` | `addr2line` → `hexdump_line`, `lib/display_options.c:188` |
| `Code:`의 괄호 | `f9400303` | 역어셈블 → `ldr x3, [x24]`. 덤프의 `x24`가 `0xffff000000000000` |
| `x18` | `0x7e696d90` | GD 포인터 register([8장](/blog/embedded/bootloader/chapter08-board-init)) |

`elr` 줄이 두 개인 이유는 `arch/arm/lib/interrupts_64.c`의 `show_regs()`에 있습니다. relocation이 끝난 상태(`GD_FLG_RELOC`)면 `elr - gd->reloc_off`를 `(reloc)` 표시와 함께 먼저 찍어 줍니다. 그래서 위의 gdb처럼 직접 빼지 않아도 `addr2line`에 바로 넣을 수 있습니다. `lib/display_options.c:188`은 `md`가 8 byte 단위로 메모리를 읽는 바로 그 줄(`x = lb.uq[i] = *(volatile ulong *)data;`)입니다. `Code:`는 죽은 명령어 앞뒤의 기계어이고, 괄호 친 것이 죽은 명령어입니다.

덤프 뒤 `Resetting CPU ...`와 함께 U-Boot가 스스로 리셋했고, 다음 부팅은 다시 `<debug_uart>`부터 시작했습니다. 현장 보드에서 원인 모를 재부팅이 반복된다면, 시리얼 로그에서 리셋 직전의 이 덤프를 먼저 찾습니다.

## 증상별 첫 도구

| 증상 | 첫 도구 | 이 글에서 본 신호 |
| --- | --- | --- |
| 아무 출력이 없음 | DEBUG UART | `<debug_uart>` 한 줄이 나오는가 |
| 배너 뒤 특정 줄에서 멈춤 | `initcall.c`의 `#define DEBUG`, `initcall failed` | 마지막 `initcall:` 주소 → `addr2line`(relocation 뒤면 `reloc off`를 뺌) |
| shell은 뜨는데 명령이 이상함 | gdb + `add-symbol-file -o <reloc off>` | breakpoint와 백트레이스 |
| 예외 덤프 후 리셋 | `elr (reloc)` + `addr2line`, `Code:` 역어셈블 | 죽은 함수·줄·명령어·레지스터 |
| 오류 값만 나오고 위치를 모름 | `CONFIG_LOG_ERROR_RETURN` | `log_msg_ret()`이 오류를 돌려준 위치마다 로그 |

마지막 줄의 `CONFIG_LOG_ERROR_RETURN`은 v2024.04 `common/Kconfig`에 있는 옵션으로, `log_ret()`·`log_msg_ret()`으로 오류를 돌려주는 곳마다 위치를 기록합니다. `include/log.h`는 이 동작을 `CONFIG_LOG`와 함께 켜졌을 때만 넣으므로 두 옵션을 같이 켭니다(이 QEMU 기본 빌드는 `CONFIG_LOG`가 꺼져 있습니다). [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 bootmeth 코드처럼 `return log_msg_ret("…", ret)` 형태가 많은 곳에서 특히 쓸모가 있습니다.

## 정리

- DEBUG UART(QEMU는 PL011 `0x9000000`)는 driver model 전에 출력하며, `<debug_uart>` 한 줄이 "코드 실행 + UART 동작"의 증거입니다.
- `lib/initcall.c`에 `#define DEBUG`를 넣으면 초기화 함수 주소가 차례로 찍힙니다. relocation 뒤 주소는 `reloc off`를 빼고 `addr2line`합니다.
- gdb는 링크 주소 심볼로는 relocation 뒤 코드에서 멈추지 않았고, `add-symbol-file u-boot -o <reloc off>`로 맞추자 `do_version`에서 멈춰 `_main`까지의 백트레이스가 나왔습니다.
- 예외 덤프의 `esr`(EC·DFSC), `far`, `elr (reloc)`, `Code:`를 풀면 원인이 `lib/display_options.c:188`의 `ldr x3, [x24]`까지 내려왔습니다.
- U-Boot는 예외 덤프 뒤 스스로 리셋합니다. 반복 재부팅은 리셋 직전 로그의 덤프부터 봅니다.

## 다음 장 예고

다음 장에서는 U-Boot보다 앞에서 실행되는 SoC의 Boot ROM과, 그 동작을 정하는 eFuse·OTP를 다룹니다.

## 관련 항목

- [Ch 19: Linux 커널 handoff](/blog/embedded/bootloader/chapter19-kernel-handoff) — 부트 단계별 handoff 조건
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — ROM 설정과 보안 정책
- [U-Boot v2024.04 `doc/develop/driver-model/debugging.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/driver-model/debugging.rst)
- [U-Boot v2024.04 `doc/README.arm-relocation`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/README.arm-relocation)
- [U-Boot v2024.04 `arch/arm/lib/interrupts_64.c`](https://github.com/u-boot/u-boot/blob/v2024.04/arch/arm/lib/interrupts_64.c)
