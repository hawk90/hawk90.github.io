---
title: "Ch 6: 루트 파일시스템"
date: 2026-05-17T06:00:00
description: "Buildroot/Yocto로 루트 파일시스템을 만들고 QEMU에서 사용한다."
tags: [QEMU, Buildroot, Yocto, Rootfs, initramfs, ext4]
series: "QEMU Embedded Emulation"
seriesOrder: 6
draft: true
---

커널이 부팅하면 그 다음은 *user-space*입니다. user-space가 사는 곳이 **rootfs**. QEMU에서 rootfs를 attach해 init부터 shell까지 진입하는 흐름이 임베디드 개발의 *완전한 부팅*입니다.

## Rootfs 종류

| 종류 | 특징 | 적합도 |
|------|------|--------|
| **initramfs** | 메모리 cpio archive — kernel이 풀어 사용 | 작은 system·boot 속도 우선 |
| **ext4 디스크 이미지** | 블록 디바이스로 mount | production·실 storage 모사 |
| **NFS root** | host의 NFS share를 mount | 개발 iteration 빠름 |
| **squashfs** | read-only 압축 fs | 대형 rootfs·OS 이미지 |

각자 용도가 다릅니다. 학습은 initramfs가 빠르고, production은 ext4가 표준.

## Buildroot — 가장 빠른 방법

Buildroot는 *최소한*의 rootfs를 *한 명령*으로 만들어 줍니다.

```bash
git clone https://github.com/buildroot/buildroot.git
cd buildroot
git checkout 2024.02

# QEMU ARM64 virt용
make qemu_aarch64_virt_defconfig

# RISC-V는
make qemu_riscv64_virt_defconfig

# 빌드(첫 빌드는 30~60분, 이후는 incremental)
make -j$(nproc)
```

결과는 `output/images/`.

```text
output/images/
├── Image           ← Linux 커널
├── rootfs.ext2     ← ext2/4 디스크 이미지
├── rootfs.cpio.gz  ← initramfs용
├── fw_jump.bin     ← (RISC-V) OpenSBI
└── start-qemu.sh   ← 실행 스크립트
```

## QEMU에서 ext4 rootfs

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel output/images/Image \
    -drive file=output/images/rootfs.ext2,format=raw,id=hd0,if=none \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyAMA0 earlycon"
```

부팅 결과(끝부분):

```text
[    3.456789] EXT4-fs (vda): mounted filesystem with ordered data mode.
[    3.567890] VFS: Mounted root (ext2 filesystem) on device 254:0.
[    3.678901] Run /sbin/init as init process

Starting syslogd: OK
Starting klogd: OK
...

Welcome to Buildroot
buildroot login: root
# uname -a
Linux buildroot 6.6.0 ... #1 SMP ... aarch64 GNU/Linux
```

`root` 계정 비밀번호 없이 로그인. shell 진입.

## QEMU에서 initramfs

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel output/images/Image \
    -initrd output/images/rootfs.cpio.gz \
    -append "console=ttyAMA0"
```

`-drive` 없이 *kernel + initrd*만. kernel이 cpio.gz를 *RAM에 풀어* rootfs로. 빠르지만 메모리 사용량 증가.

## Buildroot 커스터마이즈

`make menuconfig`로 패키지 선택.

```bash
make menuconfig
# Target packages → Networking → openssh
# Target packages → Shell and utilities → bash
# Target packages → Development → python3
make -j$(nproc)
```

특정 패키지 추가가 *한 click*. busybox는 기본이며 *Toolbox 스타일*.

## 사용자 코드 추가

Buildroot의 *overlay*로 custom 파일을 rootfs에 추가합니다.

```bash
mkdir -p board/myboard/rootfs_overlay/etc/init.d/
cat > board/myboard/rootfs_overlay/etc/init.d/S99myinit <<'EOF'
#!/bin/sh
echo "Hello from S99myinit" > /dev/console
EOF
chmod +x board/myboard/rootfs_overlay/etc/init.d/S99myinit
```

`make menuconfig` → System configuration → Root filesystem overlay directories → `board/myboard/rootfs_overlay`. 재빌드 시 자동 포함.

## Yocto — 더 큰 시스템

Buildroot가 *학습/prototype*이라면 **Yocto Project**는 *production scale*.

| 항목 | Buildroot | Yocto |
|------|-----------|-------|
| 학습 곡선 | 낮음 | 높음 |
| 빌드 시간 | 30~60분 | 수 시간 |
| 패키지 다양성 | 중간 | 매우 풍부 |
| 재현성 | 좋음 | 매우 좋음(BSP, recipe) |
| Layer 모델 | 단순 | meta-layer 복잡 |

Yocto는 *vendor가 BSP를 제공*하는 산업 표준입니다 — i.MX의 `meta-fsl-arm`, Raspberry Pi의 `meta-raspberrypi`, Xilinx의 `meta-xilinx` 등.

```bash
# Yocto setup (간략)
git clone -b kirkstone git://git.yoctoproject.org/poky
cd poky
source oe-init-build-env build
bitbake core-image-minimal
```

이 시리즈는 *Buildroot 위주*로 다루고, Yocto는 별도 시리즈에서.

## NFS root

개발 중 *iteration*이 빠른 방식 — host의 디렉터리를 *NFS로* guest가 mount.

```bash
# host
sudo apt install nfs-kernel-server
sudo mkdir /srv/nfsroot
sudo cp -a buildroot-rootfs/* /srv/nfsroot/
echo "/srv/nfsroot 10.0.2.0/24(rw,sync,no_root_squash,no_subtree_check)" \
    | sudo tee -a /etc/exports
sudo exportfs -ra
```

QEMU(network 활성):

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel Image \
    -netdev user,id=net0 \
    -device virtio-net-device,netdev=net0 \
    -append "root=/dev/nfs nfsroot=10.0.2.2:/srv/nfsroot,nfsvers=3 ip=dhcp rw console=ttyAMA0"
```

host에서 파일 수정이 *바로* guest에 반영. iteration 시간이 *분 → 초*로.

## Squashfs — read-only 압축

```bash
mksquashfs rootfs/ rootfs.sqfs -comp xz
```

부팅 후 read-only mount. read-write가 필요한 영역은 tmpfs 또는 overlayfs로 별도. *작은 NAS·라우터 OS*에서 표준.

## 흔한 함정

- **root device 부재** — `/dev/vda`가 없는데 cmdline에 명시했거나, 반대. dmesg에 "Cannot open root device".
- **권한 문제** — host에서 `cp`로 만든 rootfs의 ownership이 host user. chroot 안에서 root 필요한 binary가 fail.
- **modules 부재** — kernel module(`.ko`)이 rootfs의 `/lib/modules/`에 없으면 driver probe 실패.
- **init 부재** — `/sbin/init`이 없으면 panic. busybox `--install`로 symlink 생성.

## 정리

- rootfs 종류: **initramfs**(빠른 시작)·**ext4**(production)·**NFS**(빠른 iteration)·**squashfs**(read-only).
- **Buildroot**가 가장 빠른 학습/prototype 도구. `make qemu_*_defconfig` + `make`.
- 결과 `output/images/`에 kernel·rootfs·OpenSBI(RISC-V)·실행 스크립트.
- QEMU attach: ext4는 `-drive ... -device virtio-blk-device`, initramfs는 `-initrd`.
- `make menuconfig`로 패키지 추가, rootfs overlay로 custom 파일.
- **Yocto**는 production scale — BSP/layer 모델, 별도 시리즈.
- NFS root로 개발 iteration 가속, squashfs로 production 압축.

## 다음 장 예고

다음 장은 *kernel과 user-space의 다리* — **Device Tree**. QEMU가 자동 생성하는 DTB와 그것을 *내가* 수정하거나 augmentation하는 흐름.

## 관련 항목

- [Ch 5: 리눅스 커널 부팅](/blog/tools/emulation/qemu-embedded/chapter05-linux-kernel)
- [Ch 7: 디바이스 트리](/blog/tools/emulation/qemu-embedded/chapter07-device-tree)
- [Buildroot Practical](/blog/embedded/buildroot/chapter01-problem)
- [Modern Embedded Recipes — Rootfs Buildroot](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
