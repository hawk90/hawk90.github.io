---
title: "Ch 5: OpenSBI 개요"
date: 2026-05-17T23:00:00
description: "OpenSBI — SBI 스펙, 플랫폼 추상화, 펌웨어 타입을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 5
tags: [RISC-V, OpenSBI, SBI, Firmware]
draft: true
---

## 개요

OpenSBI는 RISC-V Supervisor Binary Interface의 참조 구현체다.

---

## SBI란

TODO: Supervisor와 Machine 모드 간 인터페이스

---

## OpenSBI 역할

TODO:

- M-mode 런타임
- S-mode로의 트랩 위임
- 플랫폼 추상화
- 타이머, IPI, 콘솔 서비스

---

## 펌웨어 타입

TODO:

| 타입 | 설명 |
|------|------|
| FW_DYNAMIC | 다음 단계 정보를 동적으로 받음 |
| FW_JUMP | 고정 주소로 점프 |
| FW_PAYLOAD | 페이로드 포함 |

---

## 빌드 예시

TODO:

```bash
make PLATFORM=generic FW_PAYLOAD_PATH=u-boot.bin
```

---

## 메모리 레이아웃

TODO:

```
0x80000000: OpenSBI
0x80200000: 다음 단계 (U-Boot/Linux)
```

---

## 정리

- OpenSBI = M-mode 런타임
- SBI 서비스 제공
- 세 가지 펌웨어 타입
- 플랫폼별 커스터마이징 가능

---

## 다음 장 예고

Ch 6에서는 OpenSBI 빌드와 구성을 다룬다.

---

## 참고 자료

- [OpenSBI GitHub](https://github.com/riscv-software-src/opensbi)
- [SBI Specification](https://github.com/riscv-non-isa/riscv-sbi-doc)
