---
title: "Ch 10: U-Boot SPL"
date: 2026-05-17T04:00:00
description: "U-Boot SPL — 2단계 로더, DRAM 초기화, 다음 단계 로드를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 10
tags: [RISC-V, U-Boot, SPL, DRAM]
draft: true
---

## 개요

SPL(Secondary Program Loader)은 U-Boot의 최소화된 1단계 로더다.

---

## SPL이 필요한 이유

TODO:

- 제한된 SRAM
- DRAM 초기화 전 실행
- 최소 기능만 포함

---

## SPL 부트 플로우

TODO:

```
ROM → SPL → OpenSBI → U-Boot proper → Linux
```

---

## SPL 빌드

TODO:

```bash
make ... SPL=y
```

---

## DRAM 초기화

TODO: 플랫폼별 DDR 초기화 코드

---

## 다음 단계 로드

TODO:

```c
void board_init_f(ulong dummy)
{
    // 최소 초기화
}

void board_init_r(gd_t *dummy1, ulong dummy2)
{
    // DRAM 초기화
    // 다음 단계 로드
    spl_load_image();
    jump_to_image_no_args();
}
```

---

## SPL 설정

TODO:

```
CONFIG_SPL=y
CONFIG_SPL_TEXT_BASE=0x80000000
CONFIG_SPL_MAX_SIZE=0x10000
```

---

## 정리

- SPL은 SRAM에서 실행
- DRAM 초기화 담당
- 최소 드라이버만 포함
- U-Boot proper를 DRAM에 로드

---

## 다음 장 예고

Ch 11에서는 커널 부팅을 다룬다.

---

## 참고 자료

- [U-Boot SPL](https://docs.u-boot.org/en/latest/develop/spl.html)
