---
title: "Ch 2: QEMU 설치와 빌드"
date: 2026-05-17T02:00:00
description: "QEMU를 소스에서 빌드하고 개발 환경을 구축한다."
tags: [QEMU, Build, Setup, configure, meson]
series: "QEMU Fake Device Driver"
seriesOrder: 2
draft: true
---

이 시리즈는 *custom device*를 QEMU 소스에 추가해 빌드합니다. 따라서 *패키지로 설치된 QEMU*가 아닌 *소스 빌드*가 필요합니다. 이 장은 의존성·소스·configure·build를 한 번에 정리합니다.

## 의존성 설치

```bash
# Ubuntu/Debian
sudo apt-get install -y \
    git build-essential ninja-build python3 python3-pip \
    libglib2.0-dev libfdt-dev libpixman-1-dev zlib1g-dev \
    libslirp-dev libcap-ng-dev libattr1-dev \
    libsdl2-dev libgtk-3-dev libvte-2.91-dev \
    libaio-dev libcurl4-openssl-dev libssh-dev

# Fedora
sudo dnf install -y \
    git make ninja-build python3 \
    glib2-devel libfdt-devel pixman-devel zlib-devel \
    libslirp-devel SDL2-devel gtk3-devel

# macOS (Homebrew)
brew install ninja pkg-config glib pixman libslirp
```

이 의존성이 *최소*. 추가 feature(`--enable-kvm`·`--enable-vnc` 등) 활성 시 각각의 의존성도.

## 소스 클론

```bash
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu

# 안정 버전
git checkout v8.2.0

# 또는 mainline
git checkout master
```

mainline은 *진화 중* — 빠른 feature 채택. 학습이나 production은 *stable tag* 권장.

## configure

```bash
mkdir build && cd build

../configure \
    --target-list=x86_64-softmmu,aarch64-softmmu,riscv64-softmmu \
    --enable-debug \
    --enable-kvm \
    --prefix=$HOME/qemu-build
```

| 옵션 | 의미 |
|------|------|
| `--target-list` | 빌드할 target architecture. 짧으면 빌드 빠름 |
| `--enable-debug` | symbol + assertion |
| `--enable-kvm` | KVM 가속 |
| `--prefix=...` | install 위치 |
| `--disable-werror` | warning을 error로 안 함 (개발 중) |
| `--enable-trace-backends=log` | trace event 활성 |

`--target-list`가 *제일 중요*. `x86_64-softmmu` 하나만으로 *시간 절반*. 모든 target 빌드는 *수십 분*.

## 빌드

```bash
make -j$(nproc)
```

`-j`로 병렬. 8-core 머신에서 *5~10분*. 첫 빌드 후엔 *증분 빌드*로 *수초~수십초*.

## 빌드 결과 확인

```bash
./qemu-system-x86_64 --version
# QEMU emulator version 8.2.0
```

```bash
./qemu-system-x86_64 -machine help
# Supported machines are:
# isapc                ISA-only PC
# microvm              microvm (i386)
# pc                   ...
# pc-i440fx-...
# q35                  ...
```

## install (옵션)

```bash
make install
```

`--prefix=$HOME/qemu-build`에 install. `$PATH`에 추가:

```bash
export PATH=$HOME/qemu-build/bin:$PATH
```

install 안 해도 *빌드 디렉터리에서* 직접 실행 가능.

## 검증 — Hello QEMU

가장 간단한 부팅 시험.

```bash
# Linux kernel + initramfs 받기 (또는 빌드)
# 여기서는 cirros 같은 작은 image 사용
wget https://download.cirros-cloud.net/0.6.2/cirros-0.6.2-x86_64-disk.img

./qemu-system-x86_64 -enable-kvm -m 256M \
    -nographic \
    -drive file=cirros-0.6.2-x86_64-disk.img,format=qcow2,if=virtio
```

부팅 후 `cirros` user로 login(`cubswin:)` 비밀번호). 종료는 `sudo poweroff`.

여기까지 *환경 준비 완료*.

## 디버깅 환경

GDB로 *QEMU 자체*를 디버깅(custom device 개발 시 매우 유용).

```bash
gdb --args ./qemu-system-x86_64 -m 256M -enable-kvm ...
(gdb) break my_device_realize
(gdb) run
```

`--enable-debug`로 빌드해야 symbol 풍부.

## 빌드 시스템 — meson

QEMU 7.0+부터 *meson + ninja* 기반(이전엔 autotools).

```bash
# meson 명령으로도 가능
meson setup build --buildtype=debug
ninja -C build
```

옵션을 `./configure`에서 *meson option*으로 자동 변환.

## 빌드 최적화

| 옵션 | 효과 |
|------|------|
| `--disable-docs` | 문서 빌드 skip — 빠름 |
| `--disable-gtk --disable-sdl` | GUI 의존 제거 |
| `--target-list=x86_64-softmmu` | 한 target만 |
| `ccache` 활성 | 재빌드 가속 |
| `mold` linker | link 시간 단축 |

```bash
sudo apt install ccache mold
export CC="ccache gcc"
../configure --extra-ldflags="-fuse-ld=mold" ...
```

## Cross compile

ARM에서 빌드해 x86 target — 보통은 *그 반대* 시나리오가 흔하므로 cross는 거의 안 함. 필요하면:

```bash
../configure \
    --cross-prefix=aarch64-linux-gnu- \
    --target-list=x86_64-linux-user
```

## Out-of-tree custom device

QEMU 소스에 *직접 추가*하는 게 표준이지만, *out-of-tree*도 가능. plugin 메커니즘 또는 *module 빌드*. 학습용은 in-tree.

## 흔한 함정

- **의존성 누락** — configure가 *조용히* feature 비활성. log 확인.
- **disk space** — debug 빌드는 *20GB+*. 미리 확보.
- **`-j` 너무 큼** — 8GB RAM에서 `-j16`이면 OOM. `-j$(nproc)` 권장.
- **build dir과 source dir 혼동** — *out-of-source* 권장. `cd build && ../configure`.

## 정리

- QEMU 소스 빌드는 `git clone` → 의존성 설치 → `configure` → `make`.
- `--target-list` 좁히면 빌드 시간 *절반 이하*.
- `--enable-debug`로 GDB 친화 binary.
- ccache·mold로 *재빌드 가속*.
- 빌드 결과는 `build/qemu-system-...`에. install 없이도 *그 자리에서 실행*.
- Hello QEMU: cirros image로 *5분 만에* 부팅 확인.
- Out-of-source 빌드(`cd build && ../configure`)가 표준.

## 다음 장 예고

다음 장부터 *device model 작성*. **QOM**(QEMU Object Model)의 기초를 봅니다.

## 관련 항목

- [Ch 1: QEMU 개요](/blog/tools/emulation/qemu-fake-device/chapter01-overview)
- [Ch 3: QOM 기초](/blog/tools/emulation/qemu-fake-device/chapter03-qom-basics)
- [QEMU Internals — Architecture](/blog/tools/emulation/qemu-internals/chapter01-architecture)
- [QEMU Internals — Contributing](/blog/tools/emulation/qemu-internals/chapter12-contributing)
