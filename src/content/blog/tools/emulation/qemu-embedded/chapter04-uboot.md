---
title: "Ch 4: U-Boot 부팅"
date: 2026-05-17T04:00:00
description: "QEMU에서 U-Boot 부트로더를 실행하고 커널을 로드한다."
tags: [QEMU, U-Boot, Bootloader, TFTP, virtio-blk]
series: "QEMU Embedded Emulation"
seriesOrder: 4
draft: true
---

**U-Boot**(Das U-Boot)은 임베디드 시스템의 사실상 표준 부트로더입니다. STM32 같은 마이크로컨트롤러부터 i.MX·Zynq·라즈베리 파이까지 *대부분*이 U-Boot을 거쳐 부팅합니다. QEMU 위에서 U-Boot를 띄우면 부트로더 스크립트·env 변수·boot 명령을 *실 보드 도착 전에* 검증할 수 있습니다.

## U-Boot의 역할

```text
SoC ROM → SPL (Secondary Program Loader) → U-Boot → Linux/RTOS
```

ROM은 *고정*. SPL은 RAM controller 초기화 같은 *최소* 단계. U-Boot은 *유연한 환경*을 제공합니다:

- 콘솔 입력 + 스크립트 실행
- 환경 변수(`printenv`, `setenv`)
- 다양한 boot source(NAND, eMMC, SD, USB, TFTP, NFS)
- FIT image, EFI 부팅
- 디버그 명령(`md`, `mw`, `i2c`, `mmc`)

production 시스템에서는 U-Boot가 *부팅의 다중성*과 *복구 가능성*을 담당합니다.

## QEMU에서 빌드·실행

ARM64 U-Boot 빌드.

```bash
git clone https://github.com/u-boot/u-boot.git
cd u-boot
git checkout v2024.04
make CROSS_COMPILE=aarch64-linux-gnu- qemu_arm64_defconfig
make CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc)
```

결과 `u-boot.bin`을 QEMU에 *`-bios`*로 전달.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 512M -nographic \
    -bios u-boot.bin
```

U-Boot 프롬프트 진입:

```text
U-Boot 2024.04 (...)

DRAM:  512 MiB
Core:  47 devices, 13 uclasses
Loading Environment from nowhere... OK
In:    serial,usbkbd
Out:   serial,vidconsole
Err:   serial,vidconsole
Net:   eth0: virtio-net#31
Hit any key to stop autoboot:  0
=>
```

`=>` 프롬프트가 U-Boot의 CLI입니다.

## RISC-V U-Boot

같은 방식.

```bash
make CROSS_COMPILE=riscv64-linux-gnu- qemu-riscv64_smode_defconfig
make CROSS_COMPILE=riscv64-linux-gnu- -j$(nproc)
```

```bash
qemu-system-riscv64 -M virt -m 512M -nographic \
    -bios opensbi-fw_jump.bin \
    -kernel u-boot.bin
```

RISC-V는 OpenSBI를 먼저 거쳐 *S-mode*에서 U-Boot가 동작.

## U-Boot 명령 — 핵심

| 명령 | 역할 |
|------|------|
| `printenv` | 환경 변수 출력 |
| `setenv` | 환경 변수 설정 |
| `saveenv` | flash에 저장 |
| `md addr [count]` | memory display |
| `mw addr value` | memory write |
| `mmc list` / `mmc info` | MMC 상태 |
| `usb start` | USB scan |
| `ext4ls dev:part` | ext4 listing |
| `ext4load dev:part addr file` | 파일 로드 |
| `booti addr - dtb` | ARM64 kernel boot |
| `bootm addr` | uImage boot |
| `tftpboot addr file` | TFTP 부팅 |
| `dhcp` | DHCP 요청 |
| `reset` | 재부팅 |

## VirtIO block에서 kernel 로드

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -bios u-boot.bin \
    -drive file=rootfs.img,format=raw,id=hd0,if=none \
    -device virtio-blk-device,drive=hd0
```

U-Boot 프롬프트에서:

```text
=> virtio scan
=> ext4ls virtio 0
            <DIR>       4096 .
            <DIR>       4096 ..
         24891488       Image
            17448       virt.dtb
            <DIR>       4096 sbin

=> ext4load virtio 0 0x40400000 /Image
=> ext4load virtio 0 0x44000000 /virt.dtb
=> booti 0x40400000 - 0x44000000
```

이 흐름이 *실 SD 카드 부팅*과 똑같습니다 — U-Boot의 학습이 그대로 production에 옮겨갑니다.

## TFTP 부팅

host에 tftpd를 띄우고 U-Boot이 fetch.

```bash
# host
sudo apt install tftpd-hpa
sudo cp Image /var/lib/tftpboot/
sudo cp virt.dtb /var/lib/tftpboot/
sudo systemctl restart tftpd-hpa
```

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -bios u-boot.bin \
    -netdev user,id=net0 \
    -device virtio-net-device,netdev=net0
```

U-Boot:

```text
=> setenv serverip 10.0.2.2
=> tftpboot 0x40400000 Image
=> tftpboot 0x44000000 virt.dtb
=> booti 0x40400000 - 0x44000000
```

`10.0.2.2`가 QEMU user-mode 네트워크의 *host 주소*. 실 네트워크 부팅과 동일한 흐름을 *완전히* 테스트.

## 환경 변수와 boot script

production U-Boot은 *환경 변수*에 boot script를 두어 다양한 부팅 경로를 *동시에* 시험합니다.

```text
=> setenv bootcmd 'ext4load virtio 0 0x40400000 /Image; ext4load virtio 0 0x44000000 /virt.dtb; booti 0x40400000 - 0x44000000'
=> setenv bootargs 'root=/dev/vda rw console=ttyAMA0'
=> saveenv
=> boot
```

`bootcmd`가 *autoboot*에서 실행됩니다. failover 패턴(`bootcmd_a`, `bootcmd_b`)도 production에 흔합니다.

## FIT image

여러 *binary*(kernel·DTB·initramfs·firmware)를 *하나의 파일*로 묶은 형식. U-Boot의 `bootm`이 native로 다룹니다.

```bash
# .its 파일에서 .itb 생성
mkimage -f kernel.its kernel.itb

# U-Boot에서
=> ext4load virtio 0 0x40400000 /kernel.itb
=> bootm 0x40400000
```

FIT image는 *서명 검증·encryption*도 지원해 secure boot의 표준 포맷.

## 흔한 함정

- **bootcmd 사용 시 \\ escape 누락** — saveenv 후 boot 실패. quote 정확히.
- **DRAM 부족** — U-Boot 자체가 ~5MB. kernel + initrd 더하면 OOM. 최소 512MB.
- **DTB address** — kernel과 *겹치지 않는* 영역에 load. 보통 `0x44000000`.
- **EFI vs U-Boot CLI** — 최신 U-Boot은 EFI 부팅 가능. distro-style boot이 더 자연스러울 수 있음.

## 정리

- **U-Boot**은 임베디드 부트로더의 사실상 표준. QEMU에서 *실 보드와 동일한* 환경.
- ARM은 `qemu_arm64_defconfig`, RISC-V는 `qemu-riscv64_smode_defconfig`.
- 핵심 명령: `printenv`/`setenv`/`saveenv`, `md`/`mw`, `ext4load`/`tftpboot`, `booti`/`bootm`.
- VirtIO block과 TFTP 부팅 흐름이 *실 SD/eMMC + 네트워크*와 동일.
- `bootcmd` 환경 변수로 autoboot 스크립트 작성. failover 패턴 흔함.
- **FIT image**로 multi-binary 묶음 + 서명 검증.
- ARM은 `-bios u-boot.bin`만, RISC-V는 OpenSBI를 *먼저* 거침.

## 다음 장 예고

다음 장은 U-Boot가 로드하는 *내용물* — **Linux 커널**의 크로스 빌드와 부팅 흐름. defconfig·tinyconfig·custom config의 균형까지.

## 관련 항목

- [Ch 3: RISC-V virt 머신](/blog/tools/emulation/qemu-embedded/chapter03-riscv-virt)
- [Ch 5: 리눅스 커널 부팅](/blog/tools/emulation/qemu-embedded/chapter05-linux-kernel)
- [Bootloader Internals](/blog/embedded/bootloader/chapter01-boot-problem)
- [RISC-V QEMU — 풀 스택 부팅](/blog/tools/emulation/qemu-riscv/chapter09-full-stack-boot)
