---
title: "SPL·TPL 내부 해부 — 가장 작은 부트 단계의 동작 추적"
slug: "embedded/bootloader/chapter24-spl-deep"
date: 2026-05-19T09:24:00
description: "U-Boot의 선택적 TPL·VPL·SPL 단계와, 보드 설정에 따라 달라지는 초기화·다음 단계 적재를 살펴봅니다."
series: "Bootloader Internals"
seriesOrder: 24
tags: [embedded, bootloader, spl, tpl, u-boot]
draft: false
topics: ["embedded"]
---

U-Boot의 SPL은 작은 2차 프로그램 로더이며, 보통 SDRAM을 준비하고 U-Boot proper 또는 다른 firmware를 적재합니다. TPL과 VPL은 필요한 보드에서 사용하는 선택적 단계입니다. 실제 실행 위치, 사용 가능한 메모리, 어떤 장치를 초기화하고 다음 이미지를 어디에서 읽는지는 SoC, ROM, 보드 설계와 U-Boot 설정에 따라 달라집니다.

## 한 줄 요약

SPL·TPL·VPL은 선택적으로 구성되는 U-Boot boot phase입니다. 단계 수, SRAM/SDRAM 배치, 이미지 포맷과 다음 단계는 보드의 U-Boot 문서와 빌드 결과로 확인해야 합니다.

## U-Boot의 xPL 단계

U-Boot 문서는 TPL(초기 단계), VPL(선택적 검증 단계), SPL(2차 로더), U-Boot proper를 설명합니다. 모든 제품이 세 단계를 사용하는 것은 아닙니다. VPL의 현재 동작과 기능 범위도 문서화된 U-Boot 버전에서 확인해야 합니다. 따라서 `BootROM → TPL → SPL → U-Boot proper`는 가능한 흐름 중 하나이지, 모든 보드의 표준 체인은 아닙니다.

SPL은 SDRAM 초기화와 다음 단계 적재를 맡을 수 있지만, 항상 U-Boot proper만 적재하는 것은 아닙니다. 공식 문서는 SPL이 ARM Trusted Firmware BL31, EDK II, Linux 또는 RISC-V OpenSBI 등으로 이어지는 경우도 설명합니다. 실제 선택은 보드의 boot flow와 이미지 패키징에서 확인하세요.

## 메모리와 코드 크기

초기 프로그램이 SRAM에서 실행되는지, 어느 시점에 SDRAM이 준비되는지, 각 이미지와 stack/BSS가 차지하는 공간은 보드별 메모리 맵과 linker map에 달려 있습니다. 모든 SPL이 “DDR 없는 SRAM”에서만 실행한다거나, 특정 SRAM 용량 범위에 들어간다고 단정하지 않습니다. 정확한 시작 주소·최대 크기·예약 영역이 필요하면 보드 defconfig, linker script, ROM 요구 사항과 해당 빌드의 map 파일을 함께 확인합니다.

SPL의 기능과 크기는 Kconfig 선택, device tree, 컴파일 대상 및 드라이버 구성의 영향을 받습니다. `CONFIG_SPL_*`라는 이름만 보고 모든 버전에 같은 옵션이 있다고 가정하지 말고, 사용 중인 U-Boot tag의 Kconfig와 최종 `.config`를 확인합니다. 빌드 성공만으로 ROM 적재 주소나 실제 보드 메모리 배치가 검증되는 것도 아닙니다.

## 장치 트리와 드라이버

SPL용 device tree는 전체 트리와 다를 수 있습니다. U-Boot 문서는 phase별로 필요한 노드를 남기기 위한 `bootph-*` 속성과 `fdtgrep` 처리 흐름을 설명합니다. 속성 이름과 동작은 U-Boot 버전에 맞춰야 하며, 오래된 `u-boot,dm-*` 태그를 새 설정과 섞지 마세요. `CONFIG_SPL_OF_PLATDATA`를 쓰는지 여부도 해당 버전의 문서와 빌드 산출물에서 확인해야 합니다.

장치 탐색이 실패하면 먼저 다음 자료를 맞춰 봅니다.

- SPL이 실제로 사용하는 device tree와 phase 속성
- 최종 설정에서 포함된 uclass와 구체 드라이버
- 해당 부팅 매체와 다음 단계 이미지가 패키징된 방식
- SPL console/log 설정과 초기화 로그
- 빌드 시 생성된 map, symbol, image metadata

다른 보드의 Kconfig 조각이나 driver 이름을 복사해서 해결했다고 판단하지 마세요. `sandbox`와 U-Boot 테스트 도구는 일부 소프트웨어 경로를 확인하는 데 유용하지만, 특정 SoC의 ROM·DDR 초기화·전기적 동작을 대신 검증하지 않습니다.

## 다음 단계 적재와 메모리 배치

다음 단계는 raw media, 파일시스템, FIT 또는 플랫폼별 패키징으로 읽을 수 있습니다. 어떤 선택지가 가능한지와 인증 여부는 SPL의 해당 버전·보드 구현 및 ROM 요구 사항에 따라 다릅니다. FIT에 이미지가 들어 있다는 사실만으로 인증된다는 보장은 없습니다. 인증 설정, 키 자료와 실패 경로를 별도로 확인해야 합니다.

링커 스크립트와 초기 진입 코드는 `.text`, `.data`, `.bss`, stack 및 image entry의 배치를 함께 결정합니다. `.bss`를 언제 초기화하는지, 이미지가 ROM에 의해 어느 주소로 적재되는지는 architecture startup code와 보드 설정에 달렸습니다. 따라서 일반 코드 조각이나 가상의 주소를 기준으로 BSS 경계·stack 충돌을 진단하지 말고, 해당 빌드 ELF/map과 ROM/board 문서를 사용합니다.

## 디버깅과 시험 범위

U-Boot 문서는 debug UART, log level, JTAG/GDB와 sandbox를 초기 단계 문제의 조사 방법으로 안내합니다. 각 수단은 설정·하드웨어가 있어야 하며 로그가 없다는 사실만으로 특정 초기화 함수의 실패를 확정할 수는 없습니다. bootstage 기록도 대상 버전과 설정이 갖춰진 경우에만 사용할 수 있습니다.

SPL을 검증할 때는 먼저 재현 가능한 보드·빌드 조합을 고정하고, ROM 단계에서 SPL 진입, SDRAM 준비, 다음 이미지 검증과 handoff를 구분해 기록합니다. 실제 보드가 없는 상태에서는 빌드·정적 검사 결과와 하드웨어 실행 결과를 분리해서 보고해야 합니다. 이 글의 수정 과정에서는 U-Boot 빌드, QEMU, ROM 또는 실기 부팅을 실행하지 않았습니다.

## 정리

- TPL·VPL·SPL은 보드에 따라 선택적으로 구성됩니다.
- SPL의 실행 메모리, 기능, 다음 단계와 이미지 형식은 SoC·ROM·U-Boot 설정에 종속됩니다.
- Kconfig, phase별 device tree, ELF/map과 패키징 산출물을 같은 U-Boot tag 기준으로 확인합니다.
- FIT 사용만으로 인증을 가정하지 않으며, linker/BSS/stack 동작은 실제 빌드 결과와 startup code로 확인합니다.
- sandbox나 정적 검사 결과는 ROM·DDR·보드의 실기 검증과 구분합니다.

## 다음 장 예고

다음 편은 **Ch 25: ARM TF-A 통합**입니다. 보드별 펌웨어 패키징에서 TF-A와 U-Boot 단계가 어떻게 연결되는지 살펴봅니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)
- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee)
- [U-Boot v2025.01: Generic xPL framework](https://docs.u-boot.org/en/v2025.01/develop/spl.html)
- [U-Boot: Debugging driver model](https://docs.u-boot.org/en/latest/develop/driver-model/debugging.html)
