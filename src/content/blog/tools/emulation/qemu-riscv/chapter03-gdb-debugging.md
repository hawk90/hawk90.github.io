---
title: "Ch 3: QEMU + GDB 디버깅"
date: 2026-05-17T21:00:00
description: "QEMU GDB 연동 — 브레이크포인트, 레지스터 검사, 싱글 스텝을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 3
tags: [RISC-V, QEMU, GDB, Debug]
draft: true
---

## 개요

QEMU의 GDB 스텁을 이용한 디버깅을 다룬다.

---

## QEMU 옵션

TODO:

```bash
qemu-system-riscv64 -machine virt -nographic \
    -kernel firmware.elf \
    -s -S

# -s: GDB 서버 (포트 1234)
# -S: CPU 시작 시 정지
```

---

## GDB 연결

TODO:

```bash
riscv64-unknown-elf-gdb firmware.elf
(gdb) target remote :1234
(gdb) load
```

---

## 브레이크포인트

TODO:

```gdb
(gdb) break main
(gdb) break *0x80000000
(gdb) info breakpoints
(gdb) delete 1
```

---

## 실행 제어

TODO:

```gdb
(gdb) continue          # 계속 실행
(gdb) stepi             # 명령어 단위 스텝
(gdb) nexti             # 함수 스킵 스텝
(gdb) finish            # 함수 끝까지
```

---

## 레지스터 검사

TODO:

```gdb
(gdb) info registers
(gdb) info registers pc sp ra
(gdb) p/x $pc
(gdb) set $a0 = 0x1234
```

---

## 메모리 검사

TODO:

```gdb
(gdb) x/10i $pc         # 명령어 10개
(gdb) x/4xw 0x80000000  # 워드 4개 (hex)
(gdb) x/s 0x80001000    # 문자열
```

---

## 워치포인트

TODO:

```gdb
(gdb) watch *0x80002000
(gdb) rwatch *0x80002000  # 읽기
(gdb) awatch *0x80002000  # 읽기/쓰기
```

---

## TUI 모드

TODO:

```gdb
(gdb) tui enable
(gdb) layout asm
(gdb) layout regs
```

---

## 정리

- -s -S로 GDB 대기
- target remote로 연결
- 브레이크포인트, 워치포인트 지원
- TUI로 시각적 디버깅

---

## 다음 장 예고

Ch 4에서는 sifive_e 머신을 다룬다.

---

## 참고 자료

- [GDB Remote Serial Protocol](https://sourceware.org/gdb/onlinedocs/gdb/Remote-Protocol.html)
