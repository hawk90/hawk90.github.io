---
title: "DDR Training과 PHY Calibration — 보드별 파라미터 튜닝"
slug: "embedded/bootloader/chapter26-ddr-training"
date: 2026-05-19T09:26:00
description: "DDR controller와 PHY 초기화, DRAM별 training 설정, 보드 bring-up에서 실패를 구분하는 방법."
series: "Bootloader Internals"
seriesOrder: 26
tags: [embedded, bootloader, ddr, lpddr, dram-init, training]
draft: false
topics: ["embedded"]
---

DDR 초기화는 메모리 부품, SoC의 controller/PHY, PCB, 초기화 firmware가 함께 맞아야 합니다. Training은 설정된 메모리 인터페이스가 동작하는 지점을 찾는 과정이지만, 알고리즘과 관찰 방법은 DRAM 세대, PHY 및 vendor 도구에 따라 다릅니다. 보편적인 register 값이나 training 성공 기준을 추측하는 대신, 보드의 BOM·회로도·정확한 DRAM 자료와 SoC 문서를 연결해 확인하세요.

## 한 줄 요약

Training 결과는 특정 SoC·PHY·DRAM·보드 조합의 증거입니다. 한 조합에서 얻은 timing, register 값, mailbox 값이나 온도 기준을 다른 제품에 이식하지 마세요.

## Controller와 PHY

Controller는 메모리 프로토콜에 맞춰 요청과 timing을 관리하고, PHY는 SoC와 DRAM 사이의 전기적 인터페이스를 구현합니다. 이 역할 분리는 분석에 유용하지만 초기화 순서, training 실행 위치와 완료 상태는 IP 공급자 및 SoC 통합 방식에 달려 있습니다. 일부 PHY는 별도의 firmware를 쓸 수 있고, 다른 구현은 register sequence나 전용 control unit을 사용할 수 있습니다.

따라서 소스에서 함수 이름만 보고 실제 hardware 절차를 일반화하지 말고, reference manual, PHY/DRAM 문서, 해당 보드의 초기화 코드 및 vendor tool output을 같은 버전으로 맞춰 보세요. U-Boot의 board 문서도 구체적인 DDR 설정 흐름을 플랫폼별로 설명합니다.

## Training 단계는 조합에 따라 다릅니다

초기화에는 DRAM 규격과 구현에 따라 command/address 또는 data path 관련 calibration, read/write timing 조정, impedance calibration 등 서로 다른 과정이 포함될 수 있습니다. 단계의 이름·순서·필수 여부와 실패 처리 방식은 모든 DDR4·LPDDR4 PHY에서 같지 않습니다. 숫자만 나열된 표를 근거 없이 표준 절차로 읽지 마세요.

DDR 세대별 signal 구성이나 전압, timing, ZQ 조건은 JEDEC 규격과 정확한 DRAM 부품의 datasheet를 확인해야 합니다. 보드에 납땜된 DRAM의 상세값을 eMMC `EXT_CSD`에서 얻는다는 식의 설명은 맞지 않습니다. DIMM의 SPD 사용 여부도 시스템 설계에 따라 다릅니다. DRAM 부품 번호와 speed grade, rank/width, SoC revision, PHY firmware 및 초기화 도구 버전을 기록하세요.

## 보드별 설정 산출과 빌드

Vendor DDR tool은 제품군에 맞는 controller 설정이나 training 입력을 생성·점검할 수 있습니다. 예를 들어 NXP의 i.MX8/MSCALE DDR Tool User Guide는 특정 i.MX 계열과 해당 도구/firmware 사용 관계 및 U-Boot 빌드 통합 방법을 설명합니다. 그 절차를 다른 i.MX 제품이나 다른 vendor에 그대로 적용할 수는 없습니다.

빌드 전 다음 자료를 상호 확인합니다.

- 정확한 SoC와 silicon revision 및 PHY/controller IP 버전
- DRAM 부품 번호, datasheet revision, density, organization, speed grade와 board routing
- 생성된 설정 파일·binary firmware 이름과 version/hash
- U-Boot tag, board defconfig, image packaging 방식과 linker/map 산출물
- vendor tool이 요구하는 BSP, firmware 및 생성 코드 조합

초기화 값의 출처와 변경 이력을 보드 revision에 연결해 두세요. 다른 DRAM 부품을 같은 보드 옵션으로 처리할 수 있는지, 또는 보드 식별을 통해 설정을 선택하는지는 해당 platform code로 확인합니다.

## 실패를 조사하는 순서

1. 보드 BOM과 부품 marking이 build가 대상으로 삼는 DRAM과 일치하는지 확인합니다.
2. U-Boot 로그 또는 PHY firmware의 진단 output에서 마지막으로 완료된 단계를 기록합니다. 출력이 없는 경우 그 사실만으로 training 단계나 원인을 확정할 수 없습니다.
3. 정확한 부품 datasheet와 SoC/PHY 매뉴얼에서 설정 값, reset, clocking 및 전원 조건을 대조합니다.
4. vendor가 제공하는 상태 해석 도구·테스트를 해당 release 기준으로 사용하고, raw register 주소나 결과 코드를 인터넷의 다른 보드에서 복사하지 않습니다.
5. 재현 가능한 조건에서 부품·보드 revision, 온도, 전원, firmware 버전과 결과를 함께 기록합니다.

온도 변화, 보드 간 편차, reset 후 간헐 오류는 조사 단서일 뿐 특정 원인을 확정하지 않습니다. PCB impedance, 길이 정합, Vref, 저항값을 수치로 판정하려면 회로도·layout·DRAM/SoC specification과 실제 측정이 필요합니다. 이 글은 특정 board를 측정하거나 training result를 얻은 기록이 아닙니다.

## Training 이후 메모리 시험

초기화 완료 메시지는 모든 메모리 주소, 온도, 전압과 부하 조건에서 무오류를 보장하지 않습니다. 제품 검증은 SoC vendor가 안내하는 DDR tool, OS memory test, ECC telemetry와 stress 조건을 제품 요구 사항에 맞춰 조합합니다. 시험 결과는 memory range, cache 설정, 접근 pattern, runtime, 온도·전원 조건과 build ID를 함께 적어야 합니다.

U-Boot `mtest`는 선택한 RAM 범위에 pattern을 기록한 뒤 읽는 명령입니다. 따라서 기존 내용을 덮어쓸 수 있고, 시작·끝 주소가 안전하다고 확인되어야 합니다. Linux `memtester`나 stress 도구 역시 시스템 사용 중 전체 RAM을 시험할 수 있는 것은 아닙니다. 이 도구를 실행한 사실만으로 제조 sign-off나 ECC coverage를 주장하지 마세요.

## 정리

- Training 순서와 지원 기능은 DRAM 규격뿐 아니라 PHY·SoC 구현에 종속됩니다.
- timing과 electrical limits는 정확한 DRAM/SoC 자료 및 보드 설계 자료에서 얻습니다.
- vendor 생성 코드와 firmware는 맞는 silicon, board, BSP 및 tool 버전으로 고정합니다.
- raw training register 값이나 합성 로그를 일반적인 정상 기준으로 제시하지 않습니다.
- 메모리 시험은 범위와 파괴성, 시험 조건을 기록하고 하드웨어 sign-off와 구분합니다.

## 다음 장 예고

다음 편은 **Ch 27: 신뢰 체인(Chain of Trust)**입니다. 초기 firmware, U-Boot FIT, 커널 모듈과 rootfs 무결성 검증이 어떤 조건에서 서로 연결되는지 분리해 살펴봅니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep)
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [NXP i.MX8/MSCALE DDR Tool User Guide](https://community.nxp.com/pwmxy87654/attachments/pwmxy87654/other/22755/1/MSCALE_DDR_Tool_User_Guide.pdf)
- [NXP i.MX8/MSCALE DDR Tool Release](https://community.nxp.com/t5/i-MX-Processors-Knowledge-Base/i-MX-8-8X-Family-DDR-Tools-Release/ta-p/1121519)
- [U-Boot: TI K3 DDR configuration](https://docs.u-boot.org/en/latest/board/ti/k3.html)
- [U-Boot: mtest command](https://docs.u-boot.org/en/v2024.01/usage/cmd/mtest.html)
- [JEDEC LPDDR4 Standard](https://www.jedec.org/standards-documents/docs/jesd209-4b)
