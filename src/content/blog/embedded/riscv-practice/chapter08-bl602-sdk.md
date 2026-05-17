---
title: "Ch 8: bl_mcu_sdk 환경"
date: 2025-05-19T14:00:00
description: "bl_mcu_sdk — 빌드, 플래시, 디버그 설정을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 8
tags: [RISC-V, BL602, SDK, Build]
draft: true
---

## 개요

Bouffalo Lab의 공식 SDK인 bl_mcu_sdk(bouffalo_sdk) 사용법을 다룬다.

---

## SDK 설치

TODO:

```bash
git clone https://github.com/bouffalolab/bouffalo_sdk.git
cd bouffalo_sdk
```

---

## 툴체인

TODO:

```bash
# 프리빌트 다운로드
# 또는 riscv-gnu-toolchain 사용

export BL_SDK_PATH=/path/to/bouffalo_sdk
export PATH=$PATH:$BL_SDK_PATH/toolchain/riscv/bin
```

---

## 프로젝트 구조

TODO:

```
bouffalo_sdk/
├── bsp/
│   └── board/
│       └── bl602dk/
├── components/
├── drivers/
├── examples/
│   └── helloworld/
└── tools/
```

---

## 빌드

TODO:

```bash
cd examples/helloworld
make CHIP=bl602 BOARD=bl602dk
```

---

## 플래시

TODO:

```bash
# BLDevCube 사용 (GUI)
# 또는 bflb-mcu-tool (CLI)

bflb-mcu-tool --chipname bl602 --firmware build/build_out/helloworld.bin
```

---

## 시리얼 모니터

TODO:

```bash
minicom -D /dev/ttyUSB0 -b 2000000
```

---

## 예제 코드

TODO:

```c
#include "bflb_mtimer.h"
#include "board.h"

int main(void) {
    board_init();
    printf("Hello BL602!\n");
    while (1) {
        bflb_mtimer_delay_ms(1000);
        printf("tick\n");
    }
}
```

---

## 정리

- bouffalo_sdk가 공식 SDK
- make 기반 빌드
- bflb-mcu-tool로 플래시
- 예제 풍부

---

## 다음 장 예고

Ch 9에서는 Zephyr on BL602를 다룬다.

---

## 참고 자료

- [bouffalo_sdk](https://github.com/bouffalolab/bouffalo_sdk)
- [bflb-mcu-tool](https://pypi.org/project/bflb-mcu-tool/)
