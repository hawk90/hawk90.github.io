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

부트로더 디버깅은 실행 단계와 사용할 수 있는 관측 수단부터 나누면 접근하기 쉽습니다. 초기 UART 출력, U-Boot 콘솔 명령, JTAG/GDB, 재부팅 뒤 보존된 로그는 서로 다른 조건에서 쓸 수 있습니다. 설정과 주소는 SoC·보드·U-Boot 버전에 따라 달라지므로, 다른 보드의 값을 그대로 복사하지 말고 해당 빌드 설정과 보드 문서를 확인하세요.

## 한 줄 요약

초기 UART와 로그로 실패 단계를 좁히고, 콘솔·JTAG은 대상과 메모리 배치를 확인한 뒤 사용하며, 재부팅 뒤 자료는 보존 구성이 확인된 경우에만 분석합니다.

## 초기 UART 출력

U-Boot에는 일반 serial 드라이버가 준비되기 전에 쓸 수 있는 debug UART 경로가 있습니다. `CONFIG_DEBUG_UART`와 UART 드라이버 종류, base address, clock, baudrate 등은 SoC와 보드 설정에 맞아야 합니다. 예를 들어 U-Boot 문서는 Qualcomm 보드별 설정을 별도로 제시합니다. 이는 다른 SoC의 설정 예가 아닙니다.

```text
# 개념 예시: 실제 값과 드라이버는 보드 defconfig 및 SoC 문서에서 확인
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_ANNOUNCE=y
CONFIG_DEBUG_UART_<BOARD_DRIVER>=y
CONFIG_DEBUG_UART_BASE=<보드 UART 주소>
CONFIG_DEBUG_UART_CLOCK=<UART 입력 클럭>
```

출력이 없으면 UART 핀mux·클럭·전원, debug UART 지원 시점, 선택된 콘솔과 실제 baudrate를 순서대로 확인합니다. 문자가 깨져 보일 때도 baudrate 하나만 원인으로 단정할 수 없습니다. 해당 보드의 early-init 흐름을 소스와 로그로 확인하세요. U-Boot Driver Model 디버깅 문서는 `CONFIG_DEBUG_UART`, 로그 레벨, JTAG 및 sandbox를 가능한 방법으로 안내합니다.

## U-Boot 콘솔에서 관찰하기

`bdinfo`는 실행 중인 빌드가 제공하는 보드·메모리 정보를 출력합니다. 주소를 다른 보드의 예와 비교해 유효한 범위라고 가정하지 마세요. `md`는 메모리를 읽고 `mw`는 씁니다. `mtest`는 지정 범위에 패턴을 기록한 뒤 읽으므로 해당 메모리의 기존 내용을 파괴할 수 있습니다. U-Boot 문서에 따르면 반복 횟수를 생략하면 명령이 자동으로 끝나지 않을 수도 있습니다.

```text
=> bdinfo
=> md <검토가 끝난 주소> <길이>
# mw와 mtest는 메모리 변경이 안전하다고 확인한 격리된 시험 환경에서만 사용
```

보드 메모리 맵, 실행 중인 코드·스택·DTB·예약 영역과 충돌하지 않는지 확인하기 전에는 `mw`나 `mtest`를 실행하지 마세요. 환경 변수 변경이나 `env save`도 영구 저장소에 영향을 줄 수 있습니다. 부팅 스크립트를 조사할 때는 읽기 전용 출력부터 확인하고, 변경은 복구 경로와 저장 동작을 확인한 시험 장치에서만 합니다.

## JTAG와 GDB

JTAG/GDB 연결은 프로브, OpenOCD target 설정, 디버그 권한, 코어 상태와 올바른 ELF가 필요합니다. U-Boot 공식 예제는 AT91 SAMA5D2를 대상으로 하며, 다른 보드에 그대로 적용할 수 없습니다. U-Boot 문서는 relocation 전에는 원래 ELF 심볼을 사용할 수 있고, relocation 뒤에는 `bdinfo`의 `relocaddr`를 확인해 심볼 주소를 다시 설정해야 한다고 설명합니다.

```text
# 모양만 보이는 예시. 실제 프로브·target 설정과 포트는 보드 설정을 사용
openocd -f <interface-config> -f <target-config>
gdb-multiarch <해당 빌드의 U-Boot ELF>
(gdb) target extended-remote :<gdb-server-port>
```

위 명령은 실행 기록이 아닙니다. 본문 작성 시 보드·프로브·OpenOCD 설정이나 U-Boot ELF가 없어 실제 연결, breakpoint, 레지스터 조회를 수행하지 않았습니다. 보안 설정에 따라 JTAG가 비활성화되거나 접근이 제한될 수 있습니다.

## 재부팅 뒤 자료

일반 RAM의 내용이 재부팅 뒤에도 남는다고 가정하지 마세요. Linux `ramoops`/pstore 로그를 보존하려면 예약 메모리, 장치 트리, 커널 설정과 드라이버 동작이 함께 맞아야 합니다. 주소와 영역 크기는 제품 메모리 맵에 맞춰 정해야 합니다. U-Boot가 그 영역을 덮어쓰지 않는지도 별도로 확인해야 합니다. 설정하지 않았거나 보존이 검증되지 않았다면 이전 부팅의 panic 로그를 읽을 수 있다고 말할 근거가 없습니다.

## 증상에서 시작하는 점검

| 관찰된 증상 | 먼저 확인할 항목 |
|---|---|
| 초기 출력이 없음 | 부팅 단계, UART 핀·클럭·전원, 보드 설정과 콘솔 선택 |
| 출력이 깨짐 | baudrate뿐 아니라 UART 입력 clock, 분주와 핀 설정 |
| SPL 다음에 멈춤 | 해당 빌드의 마지막 로그, SPL 설정, 메모리 초기화 결과 |
| U-Boot 콘솔 이후 적재 실패 | 명령이 기대하는 이미지 형식, 저장 장치와 주소 범위 |
| 재부팅 후 로그가 없음 | pstore/ramoops 예약·구성 여부와 재부팅 경로 |

이 표는 진단 시작점이며 원인을 확정하지 않습니다. 실패 직전의 실제 로그, 빌드 설정과 해당 보드의 소스·회로 자료를 함께 보관하세요.

## 정리

- debug UART와 로그 설정은 해당 SoC·보드·U-Boot 빌드에 맞춰야 합니다.
- `bdinfo`는 현재 빌드에서 관찰한 값으로 취급하고, 주소를 예제에서 복사하지 않습니다.
- `mw`, `mtest`, 환경 저장은 상태를 변경할 수 있으므로 메모리 맵·복구 경로를 먼저 확인합니다.
- JTAG/GDB는 대상별 설정과 해당 ELF가 필요하며, relocation 뒤 심볼 주소가 달라질 수 있습니다.
- 재부팅 후 자료는 ramoops/pstore 등 보존 구성이 확인된 범위에서만 분석합니다.

## 다음 장 예고

다음 편은 **Ch 23: SoC BootROM·eFuse·OTP**입니다. 초기 부팅 단계와 SoC별 보안 설정을 읽을 때 어떤 vendor 자료가 필요한지 살펴봅니다.

## 관련 항목

- [Ch 19: Linux 커널 handoff](/blog/embedded/bootloader/chapter19-kernel-handoff) — 부트 단계별 handoff 조건
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — ROM 설정과 보안 정책
- [U-Boot: Debugging with GDB](https://docs.u-boot.org/en/latest/develop/gdb.html)
- [U-Boot: Driver Model debugging](https://docs.u-boot.org/en/latest/develop/driver-model/debugging.html)
- [U-Boot: mtest command](https://docs.u-boot.org/en/v2024.01/usage/cmd/mtest.html)
