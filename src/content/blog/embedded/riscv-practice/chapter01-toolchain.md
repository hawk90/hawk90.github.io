---
title: "Ch 1: 툴체인 설치"
date: 2025-05-19T07:00:00
description: "RISC-V 툴체인 — riscv-gnu-toolchain, LLVM, IDE 설정을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 1
tags: [RISC-V, Toolchain, GCC, LLVM]
draft: true
---

## 개요

RISC-V 개발을 위한 툴체인 설치와 설정을 다룬다.

---

## riscv-gnu-toolchain

TODO:

```bash
# 의존성
sudo apt install autoconf automake autotools-dev curl \
    python3 libmpc-dev libmpfr-dev libgmp-dev gawk \
    build-essential bison flex texinfo gperf libtool \
    patchutils bc zlib1g-dev libexpat-dev

# 빌드
git clone https://github.com/riscv-collab/riscv-gnu-toolchain
cd riscv-gnu-toolchain
./configure --prefix=/opt/riscv --enable-multilib
make -j$(nproc)
```

---

## 프리빌트 바이너리

TODO:

```bash
# SiFive 툴체인
wget https://static.dev.sifive.com/...

# xPack
npm install -g xpm
xpm install @xpack-dev-tools/riscv-none-elf-gcc@latest
```

---

## LLVM/Clang

TODO:

```bash
# Ubuntu
sudo apt install clang lld llvm

# RISC-V 타겟 확인
clang --print-targets | grep riscv
```

---

## 툴체인 변종

TODO:

| 툴체인 | 타겟 |
|--------|------|
| riscv64-unknown-elf | 베어메탈 (64비트) |
| riscv32-unknown-elf | 베어메탈 (32비트) |
| riscv64-linux-gnu | Linux |

---

## IDE 설정

TODO:

- VS Code + Cortex-Debug
- CLion + OpenOCD
- Eclipse + GNU MCU

---

## 환경 변수

TODO:

```bash
export PATH=/opt/riscv/bin:$PATH
export CROSS_COMPILE=riscv64-unknown-elf-
```

---

## 정리

- riscv-gnu-toolchain이 표준
- 프리빌트로 빠른 시작 가능
- LLVM도 RISC-V 지원
- 타겟에 맞는 툴체인 선택

---

## 다음 장 예고

Ch 2에서는 보드 선택 가이드를 다룬다.

---

## 참고 자료

- [riscv-gnu-toolchain](https://github.com/riscv-collab/riscv-gnu-toolchain)
- [xPack RISC-V](https://xpack.github.io/dev-tools/riscv-none-elf-gcc/)
