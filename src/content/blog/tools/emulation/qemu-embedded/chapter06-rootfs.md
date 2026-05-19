---
title: "Ch 6: 루트 파일시스템"
date: 2026-05-17T06:00:00
description: "Buildroot/Yocto로 루트 파일시스템을 만들고 QEMU에서 사용한다."
tags: [QEMU, Buildroot, Yocto, Rootfs]
series: "QEMU Embedded Emulation"
seriesOrder: 6
draft: true
---

## 루트 파일시스템 종류

- **initramfs**: 메모리에 로드되는 초기 램디스크
- **ext4 이미지**: 블록 디바이스로 마운트
- **NFS root**: 네트워크 파일시스템

---

## Buildroot

간단한 루트 파일시스템 빌드 도구:

```bash
make qemu_aarch64_virt_defconfig
make
```

---

## QEMU에서 사용

```bash
qemu-system-aarch64 -M virt -m 512M \
  -kernel Image \
  -drive file=rootfs.ext4,if=virtio,format=raw \
  -append "root=/dev/vda console=ttyAMA0" -nographic
```

---

## 정리

- Buildroot/Yocto로 커스텀 루트 파일시스템을 빌드한다.
- virtio-blk로 디스크 이미지를 연결한다.
- root= 커널 옵션으로 루트 디바이스를 지정한다.

---

## 관련 항목

- [Ch 5: 리눅스 커널 부팅](/blog/tools/qemu-embedded-emulation/chapter05-linux-kernel)
- [Ch 7: 디바이스 트리](/blog/tools/qemu-embedded-emulation/chapter07-device-tree)
