---
title: "Ch 7: SBI 호출 규약"
date: 2025-05-19T01:00:00
description: "SBI 호출 규약 — ecall, 함수 ID, 반환값, 에러 코드를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 7
tags: [RISC-V, SBI, ECALL, Calling-Convention]
draft: true
---

## 개요

S-mode에서 M-mode의 SBI 서비스를 호출하는 규약을 다룬다.

---

## ECALL 명령어

TODO:

```asm
# S-mode에서 ecall → M-mode 트랩
ecall
```

---

## 레지스터 규약

TODO:

| 레지스터 | 용도 |
|----------|------|
| a7 | Extension ID (EID) |
| a6 | Function ID (FID) |
| a0-a5 | 인자 |
| a0 | 반환값 (에러 코드) |
| a1 | 반환값 (값) |

---

## sbiret 구조체

TODO:

```c
struct sbiret {
    long error;
    long value;
};
```

---

## 에러 코드

TODO:

| 코드 | 이름 | 의미 |
|------|------|------|
| 0 | SBI_SUCCESS | 성공 |
| -1 | SBI_ERR_FAILED | 실패 |
| -2 | SBI_ERR_NOT_SUPPORTED | 미지원 |
| -3 | SBI_ERR_INVALID_PARAM | 잘못된 인자 |
| -4 | SBI_ERR_DENIED | 거부됨 |
| -5 | SBI_ERR_INVALID_ADDRESS | 잘못된 주소 |

---

## C 래퍼 예시

TODO:

```c
struct sbiret sbi_ecall(int eid, int fid,
                        unsigned long a0, unsigned long a1,
                        unsigned long a2, unsigned long a3,
                        unsigned long a4, unsigned long a5) {
    struct sbiret ret;
    register unsigned long _a0 asm("a0") = a0;
    // ... 레지스터 설정
    asm volatile("ecall"
                 : "+r"(_a0), "+r"(_a1)
                 : "r"(_a7), "r"(_a6), ...
                 : "memory");
    ret.error = _a0;
    ret.value = _a1;
    return ret;
}
```

---

## 정리

- ecall로 S→M 트랩
- a7=EID, a6=FID로 기능 선택
- a0-a5로 인자 전달
- sbiret으로 에러/값 반환

---

## 다음 장 예고

Ch 8에서는 SBI 확장을 다룬다.

---

## 참고 자료

- [SBI Specification](https://github.com/riscv-non-isa/riscv-sbi-doc)
