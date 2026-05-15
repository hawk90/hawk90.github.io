---
title: "Ch 2: QEMU 설치와 빌드"
date: 2025-09-01T02:00:00
description: "QEMU를 소스에서 빌드하고 개발 환경을 구축한다."
tags: [QEMU, Build, Setup]
series: "QEMU Fake Device Driver"
seriesOrder: 2
draft: true
---

## 개요

QEMU를 소스에서 빌드하면 커스텀 디바이스를 추가할 수 있습니다.

---

## 의존성 설치

```bash
# Ubuntu/Debian
sudo apt-get install git libglib2.0-dev libfdt-dev libpixman-1-dev zlib1g-dev \
  ninja-build python3 python3-pip libslirp-dev
```

---

## QEMU 소스 클론

```bash
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu
git checkout v8.2.0  # 안정 버전 선택
```

---

## 빌드 설정

```bash
mkdir build && cd build
../configure --target-list=x86_64-softmmu --enable-debug
```

---

## 빌드

```bash
make -j$(nproc)
```

---

## 테스트 실행

```bash
./qemu-system-x86_64 --version
```

---

## 정리

- QEMU는 소스에서 빌드해야 커스텀 디바이스를 추가할 수 있다.
- `--enable-debug` 옵션으로 디버그 정보를 포함한다.
- `--target-list`로 필요한 타겟만 빌드해 시간을 절약한다.

---

## 관련 항목

- [Ch 1: QEMU 개요](/blog/tools/qemu-fake-device/chapter01-overview)
- [Ch 3: QEMU 디바이스 모델 기초](/blog/tools/qemu-fake-device/chapter03-qom-basics)
