---
title: "DDR Controller 프로그래밍과 PHY Training — SPL의 가장 어려운 작업"
slug: "embedded/bootloader/chapter09-dram-init"
date: 2026-05-09T09:09:00
description: "DDR controller와 PHY 초기화의 역할, training 개념, 보드별 파라미터 검증 경로를 설명합니다."
series: "Bootloader Internals"
seriesOrder: 9
tags: [embedded, bootloader, u-boot, ddr, dram]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

DRAM 초기화는 부트 단계 중 하나지만, 초기화 절차와 레지스터 값은 SoC의 controller·PHY 조합과 메모리 부품, 보드 설계에 따라 달라집니다. SPL이 DRAM을 설정하는 구성에서는 초기화가 끝나기 전까지 사용할 수 있는 메모리와 진단 수단도 제한됩니다.

[8장](/blog/embedded/bootloader/chapter08-board-init)에서 본 것처럼 U-Boot의 초기화 흐름은 DRAM 준비와 이어질 수 있습니다. 다만 SPL이 담당하는지, 이전 단계가 DRAM을 준비했는지, 구체 함수가 무엇인지는 빌드와 플랫폼 설정에 달려 있습니다. 이 글은 controller와 PHY의 역할, 보드별 값의 출처, 실패를 좁혀가는 방법을 개념 수준에서 다룹니다.

## Controller와 PHY가 맡는 일

DRAM controller는 CPU 요청을 메모리 프로토콜 명령으로 바꾸고 refresh와 주소 변환 같은 동작을 관리합니다. PHY는 controller의 인터페이스 신호를 실제 DRAM 장치와 연결하고, 지원되는 구성에서는 신호 타이밍을 보정하는 절차를 수행합니다. 두 블록은 SoC마다 통합 방식과 제어 인터페이스가 다르므로, 한 controller의 register 이름이나 초기화 코드를 다른 SoC에 그대로 적용할 수 없습니다.

초기화 과정에는 전원·clock 안정화, controller/PHY 설정, DRAM mode 설정, 보정 또는 training, 이후 메모리 사용을 준비하는 단계가 포함될 수 있습니다. 구체적인 단계와 순서, 대기 시간은 DRAM 세대와 장치 사양, controller·PHY 구현 및 보드 설정을 따라야 합니다. 아래 항목은 가능한 기능의 예이며 모든 플랫폼이 같은 단계를 지원하거나 같은 순서로 실행한다는 뜻은 아닙니다.

| 기능 예 | 확인할 대상 |
|---|---|
| DRAM mode 설정 | 메모리 부품 데이터시트와 해당 세대 표준, controller 설정 문서 |
| timing 구성 | 부품 speed grade, clock, controller 요구사항, 보드별 설정 |
| 신호 보정 | 해당 PHY가 지원하는 절차와 controller/PHY 상태 보고 방식 |
| 주소·용량 설정 | DRAM 조직, bus 폭, rank/channel 구성 및 SoC 메모리 구조 |
| ECC 초기화 | ECC 구현과 firmware/OS의 메모리 사용 정책 |

## 보드별 설정은 어디서 오는가

설정은 보통 부품 데이터시트와 SoC 기술 문서, 보드의 회로·배선 자료, 공급업체가 제공하는 설정 도구 또는 검증된 reference configuration을 함께 사용해 정합니다. 저장 형식은 플랫폼에 따라 C 자료 구조, register/value 목록, firmware image, Device Tree 또는 다른 입력일 수 있습니다. “vendor tool이 모든 설정을 자동 생성한다”거나 “SPL이 항상 같은 blob을 실행한다”고 일반화할 수는 없습니다.

새 보드나 메모리 부품을 다룰 때는 먼저 다음 정보를 한 세트로 고정합니다.

1. SoC revision과 사용 중인 controller/PHY 구성
2. DRAM 부품 번호, 세대, 조직, 속도 등급과 실장 방식
3. 보드 회로도 및 관련 신호·전원 설계 자료
4. 사용 중인 bootloader/BSP 버전과 생성 설정 파일의 출처
5. 설정을 적용한 이미지와 검증 장비의 식별 정보

이 정보가 없으면 특정 register 값, memory map, training 결과를 문서만으로 판정하기 어렵습니다. 값을 추측해 채우기보다 해당 보드의 원본 설정과 공급업체 자료를 대조해야 합니다. [BSP 5장](/blog/embedded/bsp/chapter05-ddr-params)도 설정 자료를 확인할 때 참고할 수 있습니다.

![부품 데이터시트·SoC 문서·보드 회로·공급업체 설정에서 보드별 DRAM 설정을 만들고, 이를 전원·clock 안정화부터 메모리 사용 준비까지 초기화에 포함될 수 있는 단계에 적용한 뒤 검증하는 흐름](/images/blog/bootloader/diagrams/ch09-ddr-init-flow.svg)

그림의 오른쪽 단계는 점선으로 그렸는데, 대상 플랫폼에 따라 단계가 빠지거나 순서가 달라질 수 있기 때문입니다.

## 주소 변환과 메모리 구성

CPU physical address가 DRAM의 row, bank, column에 대응하는 방식은 controller와 메모리 구성에 따라 정해집니다. 주소의 어느 비트를 어떤 필드에 연결하는지에 대한 보편적인 비트 배열은 없습니다. 따라서 특정 용량이나 DRAM 조직을 전제로 만든 주소 분해 예제는 대상 controller 문서와 실제 설정 없이는 일반 예제로 사용하기 어렵습니다.

같은 이유로 rank, channel, bus 폭, ECC 영역과 사용 가능한 용량을 하나의 `MSTR` 값이나 고정된 주소 범위만으로 추론하지 않습니다. 보드의 구성 자료와 해당 SoC의 memory map을 확인하고, 초기화 뒤 bootloader가 보고하는 용량도 실제 대상에서 대조해야 합니다. 이 글에서는 특정 보드 주소와 register 값을 제시하지 않습니다.

## Training과 ECC의 범위

Training이라는 말은 PHY나 memory controller가 지원하는 신호 보정 절차를 가리킵니다. 예를 들어 write/read 방향의 timing 정렬이나 기준 전압 보정이 특정 메모리·PHY 조합에 적용될 수 있지만, 지원 기능·실행 시점·결과 보존 방식은 구현별로 확인해야 합니다. 모든 DDR 세대에서 같은 training 단계가 필수라거나, 실패하면 반드시 같은 console 문구가 출력된다고 단정할 수 없습니다.

ECC 또한 설정만 켜면 곧바로 전체 메모리를 사용할 수 있다는 뜻은 아닙니다. 초기화 또는 scrub 필요 여부, 범위와 시점, 오류 보고 방식은 controller 구현과 firmware 및 OS 정책을 확인해야 합니다. 예를 들어 SPL이 전체 DRAM을 초기화한다고 가정한 코드를 다른 부팅 구성에 복사하지 말고, 해당 플랫폼의 실행 순서와 ECC 요구사항을 확인합니다.

## 실패를 좁히는 방법

첫 관찰은 “어느 단계까지 진행했는가”를 대상의 실제 진단 수단으로 확인하는 것입니다. UART가 초기화 전에 준비되는지, 부트 단계에서 로그가 활성화되어 있는지에 따라 출력 가능성이 달라집니다. 출력이 없다는 사실만으로 특정 PHY 단계가 원인이라고 결론내릴 수는 없습니다.

안전한 점검 순서는 다음과 같습니다.

1. 부팅 이미지, 보드 revision, DRAM 부품 및 빌드 설정이 서로 맞는지 확인합니다.
2. 공급업체가 제공한 설정 원본과 생성 과정을 보존하고, 변경 이력을 비교합니다.
3. 해당 SoC가 문서화한 초기화 상태·오류 코드와 부트 로그를 확인합니다.
4. controller/PHY register를 읽는 작업은 대상 문서와 디버그 절차를 따라 수행합니다. 임의 주소 접근이나 복사한 값 쓰기는 피합니다.
5. 초기화가 성공한 뒤에만 플랫폼이 허용한 메모리 검증 절차를 사용하고, 실행 영역·예약 영역을 포함한 안전한 범위를 먼저 확인합니다.

U-Boot의 `mtest`, Linux의 `memtester`, `stress-ng` 같은 도구는 환경과 실행 범위가 맞을 때 메모리 검증에 사용할 수 있습니다. 실행 옵션은 도구 버전과 시스템의 메모리 사용 상태에 따라 달라집니다. 이 문서에서는 실제 보드나 격리된 테스트 환경에서 실행하지 않은 명령 출력과 성능 수치를 제시하지 않습니다. 메모리 전체를 덮어쓰는 테스트를 부팅 중인 시스템의 임의 주소에 실행하지 마세요.

## 설정과 코드의 근거를 추적하기

U-Boot은 SPL 및 초기화 흐름을 설정에 따라 구성하며, board/SoC 코드가 DRAM 초기화를 제공하는 방식도 달라집니다. [U-Boot의 board initialization 문서](https://docs.u-boot.org/en/stable/develop/init.html)는 `board_init_f()`와 DRAM 준비의 일반적인 관계를 설명하면서 일부 architecture/board가 다를 수 있다고 밝힙니다. 실제 보드의 동작을 설명하려면 사용한 U-Boot tag의 설정과 보드·SoC 소스, vendor 자료를 함께 확인해야 합니다.

이 시리즈에서 다루는 DRAM controller register 정의, MR 필드와 명령 순서, PHY training 흐름, 특정 SoC의 timing 자료, resume 동작은 보드와 버전이 지정된 근거를 확보한 뒤 별도로 기술해야 합니다. 이 정보가 없는 상태에서는 숫자 예제나 코드가 실행 가능한 설정처럼 보이지 않도록 범위를 제한합니다.

## 정리

- DRAM 설정과 초기화 흐름은 controller·PHY·메모리·보드 조합에 따라 달라집니다.
- register 값과 timing은 특정 target의 primary 자료와 생성 설정에서 추적해야 합니다.
- training, ECC scrub, address mapping을 모든 플랫폼의 공통 동작으로 가정하지 않습니다.
- 로그가 없거나 단순한 메모리 테스트가 통과했다는 사실만으로 초기화 원인을 단정하지 않습니다.
- 보드별 코드·수치·실측 결과는 target과 재현 절차를 함께 기록합니다.

## 다음 장 예고

다음 글에서는 스토리지 부트를 살펴봅니다. eMMC, SD, SATA, NAND, SPI Flash의 부트 흐름은 매체와 SoC 설정을 구분해 설명합니다.

## 관련 항목

- [Ch 8: 보드 초기화](/blog/embedded/bootloader/chapter08-board-init) — `board_init_f`와 초기화 흐름
- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 부트 매체와 이미지 로딩
- [Ch 24: SPL 내부 구조](/blog/embedded/bootloader/chapter24-spl-deep) — SPL 흐름
- [Ch 26: DDR PHY training 심화](/blog/embedded/bootloader/chapter26-ddr-training) — target 근거 확인이 필요한 세부 주제
- [BSP Ch 5: DDR 파라미터](/blog/embedded/bsp/chapter05-ddr-params) — 보드 bring-up 관점
