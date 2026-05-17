---
title: "Ch 4: 메모리 맵과 디바이스 트리"
date: 2025-05-18T22:00:00
description: "RISC-V 메모리 맵 — 주소 공간 레이아웃, DTB 전달, FDT 파싱을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 4
tags: [RISC-V, Memory-Map, Device-Tree, FDT]
draft: true
---

## 개요

RISC-V 시스템의 메모리 맵과 디바이스 트리 활용법을 다룬다.

---

## 일반적인 메모리 맵 (QEMU virt)

TODO:

| 주소 범위 | 용도 |
|-----------|------|
| 0x00001000 | Boot ROM |
| 0x02000000 | CLINT |
| 0x0C000000 | PLIC |
| 0x10000000 | UART |
| 0x80000000 | DRAM 시작 |

---

## 디바이스 트리란

TODO: 하드웨어 기술 데이터 구조

---

## DTB 전달 규약

TODO:

```
a0 = hartid
a1 = DTB 물리 주소
```

---

## FDT 구조

TODO:

```
FDT Header
FDT Reserve Map
FDT Structure Block
FDT Strings Block
```

---

## libfdt 사용

TODO:

```c
#include <libfdt.h>

void parse_fdt(void *fdt) {
    int err = fdt_check_header(fdt);
    if (err) return;

    int offset = fdt_path_offset(fdt, "/memory");
    // ...
}
```

---

## 주요 노드

TODO:

```dts
/ {
    #address-cells = <2>;
    #size-cells = <2>;

    cpus { ... };
    memory@80000000 { ... };
    soc { ... };
};
```

---

## 정리

- 메모리 맵은 플랫폼마다 다름
- DTB로 하드웨어 정보 전달
- a0=hartid, a1=dtb 규약
- libfdt로 파싱

---

## 다음 장 예고

Ch 5에서는 OpenSBI 개요를 다룬다.

---

## 참고 자료

- [Devicetree Specification](https://www.devicetree.org/)
- [libfdt](https://github.com/dgibson/dtc)
