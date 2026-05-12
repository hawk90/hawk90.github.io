---
title: "Modern Embedded Recipes: 서문"
date: 2026-05-12
description: "임베디드 엔지니어가 실제로 겪는 문제들의 해결집. HAL 사용법이 아니라 실전 트러블슈팅을 다룹니다."
series: "Modern Embedded Recipes"
seriesOrder: 0
tags: [embedded, recipes, troubleshooting, hardware, rtos, linux]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

"UART가 안 찍혀요."

임베디드 엔지니어라면 누구나 한 번쯤 이 문장으로 시작하는 디버깅 세션을 경험합니다. 데이터시트를 열고, 오실로스코프를 연결하고, clock 설정을 확인하고... 결국 TX/RX 핀이 바뀌어 있었다는 것을 발견하기까지 반나절이 걸립니다.

문제는 이런 경험이 **전수되지 않는다**는 것입니다.

시중의 임베디드 책들은 대부분 이렇게 시작합니다:

```c
HAL_UART_Transmit(&huart1, buffer, size, timeout);
```

"HAL 함수를 호출하면 데이터가 전송됩니다." 네, 맞습니다. 하지만 **안 될 때** 어떻게 해야 하는지는 알려주지 않습니다.

## 이 시리즈가 다루는 것

이 시리즈는 **"안 될 때"**를 다룹니다:

- UART가 안 찍힐 때 체크리스트
- DDR init이 실패할 때 디버깅 순서
- PCIe BAR가 제대로 안 잡힐 때
- Device Tree 수정했는데 적용이 안 될 때
- JTAG이 안 붙을 때
- Virtual JTAG / Remote Debug가 동작 안 할 때

그리고 **"될 때도 문제가 되는"** 것들:

- ISR에서 호출하면 안 되는 함수를 호출했을 때
- Lock-free라고 했는데 성능이 안 나올 때
- Cache flush 타이밍이 잘못됐을 때
- DMA가 완료됐는데 데이터가 깨져 있을 때

## 대상 독자

이 시리즈는 다음과 같은 분들을 위해 작성되었습니다:

1. **주니어 임베디드 엔지니어** (1-3년차)
   - 기본적인 HAL 사용은 가능하지만
   - "왜 안 되지?"에서 막히는 분

2. **펌웨어에서 Linux로 넘어가는 분**
   - MCU 개발 경험은 있지만
   - Device Tree, DMA, kernel module이 낯선 분

3. **FPGA/가속기와 협업하는 분**
   - SW는 할 줄 알지만
   - HW 인터페이스(PCIe, AXI)가 처음인 분

## 시리즈 구성

총 6개 Part, 36개 글로 구성됩니다:

| Part | 주제 | 글 수 |
|------|-----|-------|
| 1 | Hardware Bring-up | 6 |
| 2 | RTOS & Concurrency | 6 |
| 3 | Performance | 6 |
| 4 | Linux Embedded | 6 |
| 5 | FPGA / Accelerator | 6 |
| 6 | Embedded AI | 6 |

## 집필 원칙

1. **증상으로 시작한다**: "OOO 안 될 때"로 시작합니다
2. **체크리스트를 제공한다**: 순서대로 따라할 수 있도록
3. **왜 그런지 설명한다**: 단순 해결책이 아닌 원리
4. **실제 코드를 보여준다**: 복사-붙여넣기 가능한 예제
5. **실패 사례를 공유한다**: 저도 이렇게 삽질했습니다

## 이 시리즈를 읽는 법

이 시리즈는 교과서처럼 처음부터 끝까지 정독하는 용도도 있지만, 실제로는 **문제가 생겼을 때 바로 찾아보는 레퍼런스**로 쓰는 것이 더 잘 맞습니다.

추천하는 사용 방식은 다음과 같습니다:

1. 지금 보이는 증상과 가장 비슷한 글을 찾습니다
2. 제시된 체크리스트를 위에서 아래로 그대로 따라갑니다
3. 재현 조건, 로그, 레지스터 상태를 같이 기록합니다
4. 해결 후에는 "왜 그랬는지" 설명 부분까지 읽습니다

즉, 단순 해결집이 아니라 **문제 해결 절차를 몸에 익히는 시리즈**로 구성합니다.

## 공통 디버깅 프레임

시리즈 전반에서 반복해서 사용할 기본 프레임은 같습니다:

- 전원과 clock이 맞는가
- reset 이후 peripheral state가 기대와 같은가
- pinmux / pull-up / drive strength가 맞는가
- DMA / cache / MMU 속성이 데이터 경로와 충돌하지 않는가
- ISR / thread / user space 중 어디에서 문제가 시작되는가
- "안 되는 것"이 아니라 "어디까지는 되는지"를 좁힐 수 있는가

이 프레임을 익히면 UART, SPI, PCIe, Device Tree, NPU bring-up처럼 겉보기에 전혀 다른 문제도 비슷한 방식으로 좁혀갈 수 있습니다.

## 이 시리즈에서 다루지 않는 것

다음 항목은 의도적으로 비중을 낮춥니다:

- 특정 벤더 IDE 클릭 순서
- HAL 함수 나열형 튜토리얼
- 데이터시트 내용을 그대로 옮긴 요약
- "이 보드에서는 이렇게 했더니 됐다" 수준의 일회성 팁

핵심은 **재현 가능한 진단 순서**와 **다른 보드로 옮겨도 통하는 사고 방식**입니다.

## 예제의 기준 환경

예제는 다음 환경을 두루 가정합니다:

- Cortex-M MCU bring-up
- Cortex-A / Linux embedded board
- FPGA 연동 SoC
- RTOS + bare-metal 혼합 시스템
- 캐시 일관성, DMA, MMIO가 중요한 시스템

특정 벤더 이름보다 **문제 패턴**을 일반화하는 데 집중하겠습니다.

## 레퍼런스

이 시리즈는 다음 자료들을 참고하여 작성되었습니다:

**서적**
- *Linux Device Drivers* (3rd ed) - Corbet, Rubini, Kroah-Hartman
- *Linux Kernel Development* (3rd ed) - Robert Love
- *The Art of Multiprocessor Programming* - Herlihy & Shavit

**공식 문서**
- ARM Cortex-M85/M55 + Helium MVE Reference
- Device Tree Specification
- Linux Kernel Documentation
- Intel Virtual JTAG IP Core / Etherlink

**2025-2026 최신 기술**
- RISC-V (20B+ 코어, 주류 진입)
- Zephyr RTOS (산업 표준)
- Edge AI / TinyML (기본 기능화)
- Cortex-M85 + Helium (STM32V8, Renesas RA8)
- CXL 3.2/4.0 (메모리 확장, 128GT/s)
- NPU (Ethos-U85, 4 TOPs)
- DPU (BlueField-4, 800 Gbps)
- UCIe 3.0 (칩렛 인터커넥트, 64GT/s)
- Matter/Thread (IoT 프로토콜 통합)
- Rust Embedded (메모리 안전성)

**커뮤니티**
- LWN.net
- Interrupt Blog (Memfault)
- Embedded Artistry

## 이 시리즈를 통해 얻어야 하는 것

이 시리즈를 꾸준히 따라오면 결국 다음 능력이 남아야 합니다:

- "증상"을 "가설 목록"으로 바꾸는 능력
- 무작정 printf를 늘리는 대신, 관측 지점을 설계하는 능력
- HW/SW 경계 문제를 팀 내에서 더 정확히 설명하는 능력
- 재발 방지용 체크리스트를 스스로 만들 수 있는 능력

---

다음 글: [Part 1-1: UART 안 찍힐 때 체크리스트](/blog/embedded/modern-recipes/part1-01-uart-debugging)
