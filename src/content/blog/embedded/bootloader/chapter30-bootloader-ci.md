---
title: "부트로더 CI 구축 — build matrix와 자동 부팅 테스트"
slug: "embedded/bootloader/chapter30-bootloader-ci"
date: 2026-05-19T09:30:00
description: "U-Boot 빌드, sandbox·QEMU 시험과 real-board validation의 범위를 구분하는 CI 설계."
series: "Bootloader Internals"
seriesOrder: 30
tags: [embedded, bootloader, ci-cd, qemu, build-matrix]
draft: false
topics: ["embedded"]
---
U-Boot 검증은 빌드, software test, emulation과 real-board test를 구분해서 설계합니다. QEMU나 sandbox는 지원되는 U-Boot 코드 경로를 반복 가능한 환경에서 확인할 수 있지만, 실제 SoC의 DDR PHY training, power sequencing, signal integrity 또는 flash를 검증하지는 않습니다. board farm 결과도 firmware, hardware revision, peripherals와 test coverage를 기록해야 의미가 있습니다.

## 한 줄 요약

CI 결과는 시험한 artifact와 platform 범위만 설명합니다. 빌드 성공, sandbox/QEMU smoke test, board-level boot와 production qualification을 같은 “boot pass”로 합치지 마세요.

## Build matrix와 artifact provenance

Matrix는 지원 대상 defconfig, architecture/toolchain, relevant build options와 firmware dependency를 기준으로 만듭니다. TF-A나 OP-TEE가 필요한 target만 해당 artifact를 빌드·패키징하며, version과 configuration을 고정합니다. 모든 보드가 TF-A/OP-TEE를 필요로 하거나 같은 package format을 쓴다고 전제하지 않습니다.

각 job의 산출물에는 최소한 source revision, toolchain, defconfig/config fragment, build command, dependency revision, image checksum과 test coverage를 연결합니다. Cache는 build 시간을 줄이는 편의 기능이며, 다른 configuration의 stale object를 재사용하지 않도록 key와 clean-build 확인을 설계합니다. Artifact retention 기간과 용량은 프로젝트의 release 및 incident-response 요구로 정합니다.

## Sandbox와 U-Boot 테스트

U-Boot v2025.01의 pytest documentation은 sandbox U-Boot을 실행하거나 board console hook으로 물리 보드에 연결해 test를 돌리는 방식을 설명합니다. 기본 sandbox 테스트 실행 모양은 다음과 같습니다.

```bash
./test/py/test.py --bd sandbox --build
```

이 명령은 U-Boot source tree, Python test requirements와 sandbox build가 필요합니다. 이 작업 환경에는 U-Boot source checkout이 없어 실행하지 않았습니다. 성공한 sandbox test는 그 test가 대상으로 한 software behavior의 결과이지, 별도 SoC/ROM/DDR 동작의 증거가 아닙니다.

## QEMU에서 지원되는 보드

U-Boot v2025.01의 QEMU ARM 문서는 `qemu_arm64_defconfig`로 U-Boot을 빌드하고 QEMU `virt` machine에서 실행하는 예를 제공합니다.

```bash
make qemu_arm64_defconfig
make
qemu-system-aarch64 -machine virt -nographic -cpu cortex-a57 -bios u-boot.bin
```

이 경로는 QEMU가 제공하는 CPU, RAM, device tree와 virtual devices에서 해당 U-Boot build를 시험합니다. QEMU `virt`의 virtual RAM을 거쳤다는 이유로 target DDR calibration이 통과했다고 결론내리지 마세요. U-Boot이 지원하지 않는 QEMU machine 또는 SoC-specific ROM flow에도 이 command를 그대로 적용할 수 없습니다.

## Real board와 hardware-in-the-loop

물리 보드 테스트는 명시된 board revision과 recovery procedure, 전원 제어, serial/console capture, flash method, artifact checksum, timeout과 cleanup을 필요로 합니다. 가능한 경우 먼저 비파괴 read-only smoke test를 수행하고, write/erase/OTP 명령은 별도 승인된 fixture와 복구 절차 없이는 CI에 넣지 않습니다.

Hardware 결과에는 DUT 식별자, SoC/board revision, boot media, firmware configuration, 주변 장치, 온도/전압 조건, log와 정확한 test command를 기록합니다. 단일 보드 pass는 전체 제품군·환경 범위를 보증하지 않습니다. QEMU와 physical target은 서로 다른 결함 class를 다루므로 각 결과를 따로 보고합니다.

## Regression과 bisect

Build size, boot time, console milestone 같은 metric은 U-Boot version과 hardware/test setup이 통제된 경우 추적할 수 있습니다. Threshold는 product requirement와 측정 noise로 정하고 근거 없이 +2%, +100 ms 같은 universal limit을 두지 마세요. SPL size limit은 해당 ROM, SRAM layout과 image packaging constraint로부터 계산합니다.

`git bisect run`은 각 revision에서 같은 build/test procedure와 같은 test fixture를 사용해야 합니다. 해당 revision을 시험할 수 없는 빌드·환경 실패는 good/bad와 분리해 skip으로 처리합니다. Bisect output과 첫 failing revision은 재현한 경우에만 보고하고, 미실행 예시를 결과처럼 붙이지 않습니다.

## Secure build와 key 관리

CI에서 production signing key를 일반 build job에 노출하지 않습니다. 개발/test key와 release signing path를 분리하고, secret store/HSM 접근을 조직의 release policy에 맞춥니다. 어떤 signing method를 사용하든 CI가 승인되지 않은 artifact에 release key로 서명하지 못하는 권한 경계와 감사 기록이 필요합니다. 구체적인 Vault, cloud KMS 또는 Git hosting workflow syntax는 선택한 제품과 version 문서로 구성합니다.

## 정리

- Build, sandbox, QEMU와 physical-board validation은 서로 다른 범위입니다.
- Matrix는 실제 defconfig와 firmware dependency를 반영하고 artifact provenance를 보존합니다.
- U-Boot test/py와 QEMU는 지원되는 software/emulated 경로를 검증합니다. 실제 DDR/ROM/peripheral 동작은 별도 target test입니다.
- Hardware automation에는 board identity, recovery, console capture와 non-destructive test policy가 필요합니다.
- Metric threshold, bisect 결과와 CI pass는 측정 환경 및 실행 기록이 있어야 주장할 수 있습니다.
- Test signing key와 production signing key의 권한을 분리합니다.

## 다음 장

다음 장은 **Ch 31: Boot performance measurement**입니다. 실제 hardware에서 timing source와 측정 조건을 고정하는 방법을 다룹니다.

## 관련 항목

- [Ch 21: 새 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 22: 부트로더 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [Ch 25: TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [U-Boot v2025.01: QEMU ARM](https://docs.u-boot.org/en/v2025.01/board/emulation/qemu-arm.html)
- [U-Boot v2025.01: pytest suite](https://docs.u-boot.org/en/v2025.01/develop/py_testing.html)
