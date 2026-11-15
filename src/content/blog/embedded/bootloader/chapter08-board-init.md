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

> `board_init_f()`는 relocation 전 단계의 공통 초기화 흐름이고, `board_init_r()`는 선택한 relocation 및 architecture path 뒤에 실행되는 단계입니다. 각 보드의 시작 주소와 메모리 구성은 U-Boot 공통 규칙이 아닙니다.

U-Boot의 board initialization은 단계별로 필요한 CPU, console, memory, device model 및 image handoff 준비를 수행합니다. 정확한 함수 순서와 가능한 memory는 architecture, `CONFIG` 옵션, board code와 U-Boot version에 따라 달라집니다.

## Relocation 전 환경

Relocation 전 코드는 현재 실행 가능한 저장소나 메모리에서 실행됩니다. 어떤 platform은 SRAM을 쓰고, 다른 platform은 XIP flash 또는 architecture-specific 경로를 씁니다. 따라서 “항상 수십 KB SRAM에서 시작하고, DRAM training 뒤 같은 binary를 DRAM으로 복사한다”는 표현은 보편적이지 않습니다.

U-Boot v2024.04의 board initialization 설명은 `board_init_f()`에서 global data를 쓸 수 있고 stack이 SRAM에 있을 수 있으며, 일반적으로 BSS를 사용할 수 없다고 설명합니다. xPL 단계와 일부 architecture는 별도 조건을 둡니다. 초기화 코드가 쓸 수 있는 BSS, stack, heap 및 console 여부는 해당 build configuration으로 확인해야 합니다.

## `init_sequence_f`와 board hook

U-Boot v2024.04의 `common/board_f.c`에는 `init_sequence_f`가 정의되어 있습니다. 예를 들어 monitor 길이 계산, 선택적 control DTB 준비, early allocator·logging·driver model, board/architecture 초기화, DRAM 설정, memory reservation과 relocation metadata 준비가 구성에 따라 포함됩니다. 이 배열은 `CONFIG` 및 architecture 조건부라 고정된 모든 보드 공통 목록이 아닙니다.

`board_early_init_f()`, `dram_init()`, architecture/SoC 초기화 함수 등은 board integration이 제공하거나 선택할 수 있는 hook입니다. hook 존재, 호출 위치, 반환값의 처리와 가능한 override는 사용하는 U-Boot tag를 기준으로 확인하세요. 이 글에서는 버전 미지정 함수 배열과 미검증 board C 구현을 예제로 제시하지 않습니다.

## DRAM 이후와 relocation

DRAM이 준비되는 시점과 relocation 여부는 platform에 따라 다릅니다. U-Boot v2024.04의 `setup_dest_addr()`는 usable RAM의 top을 계산해 `gd->relocaddr`의 초기 값을 정합니다. 그 다음 `init_sequence_f`는 구성에 따라 `reserve_video()`, `reserve_trace()` 같은 영역을 먼저 잡아 `gd->relocaddr`를 낮추고, `reserve_uboot()`가 `mon_len`을 빼고 page boundary에 맞춥니다. 이어지는 `reserve_malloc()`, `reserve_board()`, `reserve_fdt()`, `reserve_stacks()` 같은 단계는 U-Boot image 아래에 malloc, board/global data, FDT, stack 영역을 배치합니다. 따라서 최종 주소는 단순히 `ram_base + ram_size - mon_len`으로만 결정되지 않습니다.

`reloc_off` 계산도 architecture에 따라 image start 또는 `CONFIG_TEXT_BASE`를 기준으로 합니다. `bdinfo` output 하나만 보고 relocation 관계를 일반화하지 말고, 같은 build의 linker/configuration과 `common/board_f.c` 및 architecture relocation code를 같이 확인해야 합니다.

![board_init_f의 init_sequence_f가 dram_init 뒤 setup_dest_addr와 reserve 단계를 거쳐 relocation 후 board_init_r로 넘어가는 흐름, 그리고 usable RAM top에서 아래로 U-Boot 이미지·malloc·FDT·stack 영역이 예약되는 순서](/images/blog/bootloader/diagrams/chapter08-relocation-memory.svg)

그림은 v2024.04 `init_sequence_f`의 항목 순서를 따른 개념도이며, 실제 영역 크기와 주소는 보드의 configuration에 따라 달라집니다.

## Global data와 runtime 확인

`gd`는 U-Boot의 global data를 가리키며, relocation 전후에 복사·재설정될 수 있습니다. 포인터가 참조하는 데이터가 relocation 뒤에도 유효한지, register allocation과 BSS 조건이 architecture/compiler 설정에 맞는지 확인하세요. register 이름을 모든 Arm build에 공통 규칙처럼 적용하지 않습니다.

`bdinfo`와 `bootstage report`는 활성화된 command/configuration에서 실제 board 상태와 단계 timing을 확인하는 방법입니다. 이 문서의 이전 숫자 transcript는 board, defconfig, U-Boot tag와 실행 증거가 없어 제거했습니다. 측정하려면 동일한 image·보드의 원본 output과 build metadata를 함께 보관하고, `dram_init` duration만으로 내부 training 원인을 단정하지 마세요.

```text
=> bdinfo
=> bootstage report
```

위 명령은 사용 형태만 보여주며 여기서 실행하지 않았습니다.

## 확인 절차

- U-Boot version/tag와 board defconfig를 고정합니다.
- `common/board_f.c`의 조건부 `init_sequence_f`, memory reservation, relocation 코드와 architecture별 relocation path를 읽습니다.
- 초기 실행 매체, stack/BSS/allocator 사용 가능 시점과 DRAM 준비 여부를 board code에서 확인합니다.
- `dram_init()` 등 hook의 실제 구현과 반환 결과를 확인합니다.
- `bdinfo` 및 `bootstage report`를 target에서 수집했다면 해당 build의 source/config와 함께 해석합니다.

## 정리

- `board_init_f()`와 `board_init_r()`는 U-Boot 초기화 흐름의 서로 다른 단계입니다.
- 초기 실행 주소와 memory는 architecture·board-specific이며 SRAM이 보편 출발점은 아닙니다.
- `init_sequence_f`와 reservation order는 configuration에 따라 달라집니다.
- 최종 relocation address는 image size와 여러 memory reservation의 영향을 받습니다.
- `bdinfo`·bootstage 출력은 실제 target에서 수집한 같은 build의 증거로 해석합니다.

## 다음 편

[Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)에서는 DRAM controller 초기화와 PHY training의 역할 및 board-specific parameter 확인을 다룹니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 22: 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [U-Boot v2024.04 `common/board_f.c`](https://github.com/u-boot/u-boot/blob/v2024.04/common/board_f.c)
