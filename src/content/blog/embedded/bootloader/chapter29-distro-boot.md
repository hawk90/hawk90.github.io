---
title: "Ch 29: Distro Boot · extlinux · boot.scr 표준화"
date: 2026-05-19T29:00:00
description: "보드별 다른 부트 스크립트를 표준화 — U-Boot Distro Boot, extlinux.conf, boot.scr의 차이와 선택."
series: "Bootloader Internals"
seriesOrder: 29
tags: [embedded, bootloader, u-boot, distro-boot, extlinux]
draft: false
---

## 한 줄 요약

**보드마다 다른 `bootcmd`로는 같은 distribution image를 그대로 부팅할 수 없습니다.** Distro Boot, extlinux.conf, boot.scr, 그리고 신규 bootflow는 *부트 스크립트를 표준화*해 *image 한 장이 여러 보드를 부트*하게 만드는 네 가지 답입니다.

[Ch 13](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 본 환경 변수 `bootcmd`는 보드마다 손으로 짭니다. ARMv7 BeagleBone과 ARMv8 i.MX 8M Plus는 같은 Debian armhf/arm64 image를 부팅하더라도 *부트 스크립트가 완전히 다릅니다*. distribution을 만드는 쪽 입장에서는 image 한 장에 *모든 보드의 부트 스크립트*를 다 넣어 둘 수 없습니다. 그래서 *부트로더와 image 사이의 계약*이 표준화되어야 합니다.

이 글은 네 가지 표준화 경로를 비교합니다. U-Boot Distro Boot, `extlinux.conf`, `boot.scr`, 그리고 [Ch 14](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 bootflow/bootmeth. 어느 것이 어디서 살아 있고, 새 보드에는 무엇을 권하는지 정리합니다.

## 부트 스크립트 표준화의 동기

문제는 *Debian, Fedora, OpenSUSE 같은 distribution image*가 어떻게 *그대로* 부트되는가입니다. PC에서는 GRUB이 image 안에 들어 있고, BIOS/UEFI가 GRUB을 찾아 점프합니다. ARM 임베디드에서는 그 자리가 비어 있었습니다.

전통적인 임베디드는 다음 흐름이었습니다.

1. 보드 메인테이너가 U-Boot에 보드별 `bootcmd`를 박는다.
2. 커널·DTB·rootfs를 보드별 위치에 둔다.
3. `bootcmd`가 그 위치를 읽어 부트한다.

distribution image를 만들려면 *모든 보드의 부트 스크립트를 알아야* 합니다. 비현실적입니다. 해결은 *반대 방향*입니다. distribution이 *표준 형식의 파일*을 image 안에 두고, U-Boot이 *그 형식을 해석*하기로 합니다.

| 표준 | 누가 만들었나 | 어디 사는 파일 | 사용 시기 |
|------|---------------|----------------|-----------|
| Distro Boot | Stephen Warren (NVIDIA) | (환경 변수 스크립트) | 2014~2022 주류 |
| `extlinux.conf` | syslinux 호환 | `/boot/extlinux/extlinux.conf` | Debian·Fedora 표준 |
| `boot.scr` | U-Boot legacy | `/boot/boot.scr` | 양산 firmware, 일부 보드 default |
| bootflow/bootmeth | U-Boot 2022.10+ | (C 드라이버) | 신규 보드 |

표의 위쪽 셋이 *환경 변수와 텍스트 파일*로 표준화한 1세대이고, bootflow는 *C 코드 추상화*로 옮긴 2세대입니다.

## U-Boot Distro Boot — 자동 미디어 탐색

Distro Boot는 *U-Boot 환경 변수에 작성된 표준 스크립트*입니다. `include/config_distro_bootcmd.h`에 정의되어 있고, `CONFIG_DISTRO_DEFAULTS=y`로 켭니다.

핵심은 두 가지입니다.

- `boot_targets` — 부트 미디어 우선순위 목록.
- `scan_dev_for_boot_part` — 각 미디어의 파티션을 순회하며 `extlinux.conf` 또는 `boot.scr`를 찾는 매크로.

```text
=> printenv boot_targets
boot_targets=mmc0 mmc1 usb0 pxe dhcp

=> printenv bootcmd
bootcmd=run distro_bootcmd

=> printenv bootcmd_mmc0
bootcmd_mmc0=devnum=0; run mmc_boot

=> printenv scan_dev_for_boot_part
scan_dev_for_boot_part=part list ${devtype} ${devnum} -bootable devplist;
                       env exists devplist || setenv devplist 1;
                       for distro_bootpart in ${devplist}; do
                           if fstype ${devtype} ${devnum}:${distro_bootpart} bootfstype;
                           then run scan_dev_for_boot;
                           fi;
                       done
```

수십 개의 환경 변수가 *재귀적으로 호출*되며 미디어를 훑습니다. 각 파티션에서 `extlinux/extlinux.conf` → `boot.scr.uimg` → `boot.scr` 순으로 시도하고, 첫 번째 성공이 이깁니다.

```text
=> boot
switch to partitions #0, OK
mmc0(part 0) is current device
Scanning mmc 0:1...
Found /extlinux/extlinux.conf
Retrieving file: /extlinux/extlinux.conf
241 bytes read in 4 ms (58.6 KiB/s)
1:      Linux 6.6
Retrieving file: /boot/Image
33554432 bytes read in 1102 ms (29.0 MiB/s)
append: console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait
Retrieving file: /boot/myboard.dtb
65536 bytes read in 8 ms (7.8 MiB/s)

Starting kernel ...
```

Distro Boot의 강점은 *image 작성자 입장에서 단순*하다는 점입니다. `/boot/extlinux/extlinux.conf`만 두면 됩니다. 약점은 *환경 변수 스크립트 디버깅의 어려움*입니다. 한 변수만 잘못 지우거나 덮어쓰면 부트가 죽고, 추적이 까다롭습니다.

## extlinux.conf — syslinux 호환

`extlinux.conf`는 *PC syslinux와 호환되는 텍스트 포맷*입니다. 임베디드와 PC가 *같은 부트 설명*을 쓸 수 있게 만든 결정이 핵심입니다.

```text
# /boot/extlinux/extlinux.conf
timeout 30
default linux

label linux
    menu label Linux 6.6 (current)
    linux /boot/Image
    fdt /boot/myboard.dtb
    initrd /boot/initramfs.cpio
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

label recovery
    menu label Recovery mode
    linux /boot/Image
    fdt /boot/myboard.dtb
    append console=ttyS0,115200 root=/dev/mmcblk0p3 rw rootwait single
```

키워드는 다음과 같습니다.

| 키워드 | 의미 | 예 |
|--------|------|-----|
| `default` | 자동 부트할 label 이름 | `default linux` |
| `timeout` | 메뉴 대기 시간(1/10초) | `timeout 30` = 3초 |
| `label` | 부트 항목 이름 | `label linux` |
| `menu label` | 메뉴에 표시할 텍스트 | `menu label Linux 6.6` |
| `linux` 또는 `kernel` | 커널 이미지 경로 | `/boot/Image` |
| `fdt` | device tree blob 경로 | `/boot/myboard.dtb` |
| `initrd` | initramfs 경로 | `/boot/initramfs.cpio` |
| `append` | kernel command line | `console=... root=...` |
| `fdtoverlays` | DT overlay 목록 | `/boot/overlays/usb.dtbo` |

경로는 *파일 시스템 루트 기준*입니다. `/boot/Image`는 파티션의 `/boot/Image`이지 절대 경로가 아닙니다. 보통 boot 파티션이 따로 있으면 `/Image`로 쓰고, rootfs와 같은 파티션이면 `/boot/Image`로 씁니다.

Debian, Fedora, OpenSUSE의 ARM image는 *모두* `extlinux.conf`를 표준으로 씁니다. PC의 GRUB과 동일한 역할을 ARM에서 한다고 보면 됩니다.

## boot.scr — signed script

`boot.scr`는 *컴파일된 U-Boot 스크립트*입니다. 텍스트 파일이 아니라 `mkimage`로 묶은 binary입니다. legacy U-Boot image format을 쓰고, header에 magic·load addr·entry point·CRC가 들어갑니다.

```bash
# boot.cmd — 사람이 작성하는 소스
cat <<'EOF' > boot.cmd
setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait"
load mmc 0:1 ${kernel_addr_r} /boot/Image
load mmc 0:1 ${fdt_addr_r}    /boot/myboard.dtb
load mmc 0:1 ${ramdisk_addr_r} /boot/initramfs.cpio
booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr_r}
EOF

# mkimage로 컴파일
mkimage -A arm64 -T script -C none -d boot.cmd boot.scr
```

```text
$ mkimage -l boot.scr
Image Name:
Created:      Tue May 19 09:00:00 2026
Image Type:   AArch64 U-Boot Script (uncompressed)
Data Size:    263 Bytes = 0.26 KiB
Load Address: 00000000
Entry Point:  00000000
```

Distro Boot는 파티션에서 `boot.scr.uimg` 또는 `boot.scr`를 찾으면 *그 binary script*를 `source` 명령으로 실행합니다.

```text
=> load mmc 0:1 ${scriptaddr} /boot/boot.scr
=> source ${scriptaddr}
## Executing script at 4fc00000
33554432 bytes read in 1102 ms (29.0 MiB/s)
...
Starting kernel ...
```

`boot.scr`가 살아 있는 곳은 *양산 firmware*와 *일부 보드 vendor의 default*입니다. Yocto의 meta-ti·meta-fsl-arm 같은 BSP layer가 이미지를 만들 때 `boot.scr`를 같이 굽습니다. 이미지 작성자가 *U-Boot 명령 시퀀스를 정확히 통제*하고 싶을 때 씁니다.

extlinux.conf와의 차이는 *유연성과 표준성의 trade-off*입니다.

| 항목 | `extlinux.conf` | `boot.scr` |
|------|-----------------|------------|
| 포맷 | 텍스트, syslinux 표준 | binary, U-Boot 전용 |
| 작성 | 텍스트 편집기 | `mkimage` 필요 |
| 커널 외 작업 | 불가능 | 가능 (GPIO, env 조작 등) |
| 표준 distro | Debian, Fedora 등 | meta-ti, vendor BSP |
| 디버깅 | 직접 읽음 | `mkimage -l`로 풀어 봄 |
| 권장 신규 | O | △ (특수 케이스만) |

## bootflow · bootmeth (U-Boot 신규)

[Ch 14](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)에서 자세히 다룬 bootflow/bootmeth가 *2세대 표준*입니다. distro_bootcmd의 환경 변수 스크립트를 *C 드라이버*로 옮긴 모델입니다.

```text
=> bootflow scan -l
Scanning for bootflows in all bootdevs
Seq  Method       State   Uclass    Part  Name                              Filename
---  -----------  ------  --------  ----  --------------------------------  -----------------------
  0  extlinux     ready   mmc          1  mmc@30b40000.bootdev.part_1       /extlinux/extlinux.conf
  1  efi          ready   mmc          1  mmc@30b40000.bootdev.part_1       efi/boot/bootaa64.efi
  2  script       ready   mmc          1  mmc@30b40000.bootdev.part_1       /boot.scr
  3  extlinux     ready   usb          1  usb_mass_storage.lun0.bootdev.part_1
  4  pxe          ready   ethernet  -     ethernet@30be0000.bootdev
---  -----------  ------  --------  ----  --------------------------------  -----------------------
(5 bootflows, 5 valid)
```

같은 파일(`extlinux.conf`, `boot.scr`)을 *해석하는 코드*만 바뀝니다. distribution 입장에서는 *동일한 image*가 옛 Distro Boot 보드에서도, 새 bootflow 보드에서도 부팅됩니다. 표준화의 *내부 구현이 깨끗해진* 형태로 보면 됩니다.

신규 보드라면 `CONFIG_BOOTSTD=y`와 `CONFIG_BOOTMETH_*`를 켜고 `bootcmd=bootflow scan -b`만 두면 됩니다.

## Raspberry Pi config.txt — GPU가 먼저

Raspberry Pi는 *완전히 다른 부트 흐름*을 씁니다. ARM 코어가 아니라 *VideoCore GPU가 먼저 부팅*하고, GPU의 firmware가 *SD 카드의 FAT32 파티션*에서 `config.txt`를 읽습니다.

```ini
# /boot/config.txt
# CPU / 메모리
arm_64bit=1
gpu_mem=128

# 커널 지정 — GPU firmware가 이걸 RAM에 적재해 ARM 코어에 넘김
kernel=u-boot.bin

# 또는 U-Boot 없이 직접 Linux로
# kernel=Image
# initramfs initramfs.cpio.gz followkernel
# device_tree=bcm2711-rpi-4-b.dtb

# UART console
enable_uart=1

# overlay
dtoverlay=disable-bt
dtoverlay=vc4-kms-v3d
```

흐름은 다음과 같습니다.

```text
[전원]
   │
   ▼
[VideoCore GPU 부트]
   - SoC ROM 안의 GPU firmware
   - bootcode.bin → start.elf 로딩
   │
   ▼
[GPU가 config.txt 읽음]
   - kernel= 지시자 따라 파일 선택
   - device_tree= dtb 적재
   - dtoverlay= overlay 머지
   │
   ▼
[ARM 코어 reset deassert]
   - kernel= 파일이 ARM 진입점
   │
   ▼
[U-Boot 또는 Linux 직접 실행]
```

`kernel=u-boot.bin`을 두면 U-Boot이 ARM에서 동작하고, 그 다음부터는 *위의 Distro Boot/extlinux 흐름*과 같습니다. `kernel=Image`로 두면 U-Boot 없이 GPU firmware가 *직접 Linux로 점프*합니다.

Raspberry Pi 보드에서 *Debian image*가 그대로 동작하는 비결은 image가 `config.txt`와 `extlinux.conf`(또는 GRUB EFI 이미지)를 *함께* 들고 있기 때문입니다.

## EFI Boot Manager — GRUB · systemd-boot로

ARM SystemReady IR 인증 보드는 *PC와 동일한 EFI 부트 경로*를 가져야 합니다. U-Boot이 EFI firmware로 동작하고, ESP(EFI System Partition)의 `EFI/boot/bootaa64.efi`를 부팅합니다. 그 파일이 GRUB 또는 systemd-boot입니다.

```text
=> efidebug boot dump
Boot0000:
  attributes: A-- (0x00000001)
  label: ubuntu
  file_path: HD(1,GPT,...)/File(\EFI\ubuntu\grubaa64.efi)

=> efidebug boot order
BootOrder: 0000

=> bootefi bootmgr
```

EFI에서 GRUB이 동작하면 *GRUB의 `grub.cfg`*가 부트 메뉴를 그립니다. extlinux.conf와 *겹치는* 역할입니다. 같은 image에 *둘 다 들어 있을 수* 있습니다.

| 진입점 | 우선순위 (보드별) | 부트 메뉴 위치 |
|--------|-------------------|----------------|
| `EFI/boot/bootaa64.efi` (GRUB) | EFI 우선 보드 | `/boot/grub/grub.cfg` |
| `/extlinux/extlinux.conf` | U-Boot 우선 보드 | `/boot/extlinux/extlinux.conf` |
| `/boot.scr` | legacy 보드 | (binary) |

같은 SD 카드를 i.MX 8M Plus EVK에 꽂으면 extlinux로 부팅하고, ARM 노트북에 꽂으면 GRUB으로 부팅합니다. 표준 image가 *양쪽을 다 만족*하게 만들어 두기 때문입니다.

## 어느 것을 언제 쓰는가

선택 기준은 *누가 image를 만드는가*와 *얼마나 변경 빈도가 잦은가*입니다.

| 시나리오 | 권장 | 이유 |
|----------|------|------|
| Debian/Fedora distribution image를 그대로 굽기 | `extlinux.conf` | distro가 표준으로 만듦 |
| Yocto 양산 firmware, 부트 시퀀스 완벽 통제 | `boot.scr` | U-Boot 명령 시퀀스 자유 |
| 신규 보드 U-Boot 포팅 | bootflow/bootmeth | C 추상화, 디버깅 가능 |
| SystemReady IR 보드 | EFI bootmgr | PC와 동일한 ESP 경로 |
| Raspberry Pi | `config.txt` + `extlinux.conf` | GPU firmware가 진입 결정 |
| 학습용 QEMU | 무엇이든 | 어느 것도 빠르게 실험 가능 |

신규 보드에는 *bootflow와 extlinux.conf 조합*을 권합니다. U-Boot 쪽은 bootflow C 코드, image 쪽은 표준 extlinux.conf. 양쪽이 깨끗해집니다.

## 다중 부트 — A vs B 선택

같은 보드에서 *커널 두 버전을 번갈아 부팅*하는 경우는 흔합니다. 새 커널이 망가지면 옛 커널로 fallback하는 시나리오입니다.

### extlinux 라벨로

```text
# /boot/extlinux/extlinux.conf
timeout 50
default linux-new

label linux-new
    menu label Linux 6.6 (new)
    linux /boot/Image
    fdt /boot/myboard.dtb
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

label linux-old
    menu label Linux 6.1 (fallback)
    linux /boot/Image.old
    fdt /boot/myboard.dtb
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait
```

5초 안에 키를 누르면 메뉴가 나오고, 그렇지 않으면 `default`가 자동 부트합니다. 무인 시스템에서는 *A/B 슬롯 + 부트 카운터*([Ch 26: A/B 슬롯](/blog/embedded/bootloader/chapter26-ab-update))로 자동화합니다.

### bootflow priority로

```text
=> bootflow scan -l
Seq  Method       State   Uclass    Part  Name                       Filename
---  -----------  ------  --------  ----  -------------------------  -------------------------
  0  extlinux     ready   mmc          1  mmc@0.bootdev.part_1       /extlinux/extlinux.conf
  1  extlinux     ready   mmc          2  mmc@0.bootdev.part_2       /extlinux/extlinux.conf
```

두 파티션 모두에 `extlinux.conf`를 두면 첫 번째 시도가 실패할 때 *두 번째로 자동 진행*합니다. `bootflow scan -b`는 첫 valid만 부트하지만, 부트 카운터·watchdog와 결합하면 fallback 흐름이 됩니다.

## 흔한 실수

- **`extlinux.conf` 경로를 `/extlinux/extlinux.conf`로 두는데 boot 파티션이 따로 없습니다.** rootfs와 같은 파티션이면 `/boot/extlinux/extlinux.conf`입니다. Distro Boot의 `scan_dev_for_extlinux_conf`가 두 경로를 모두 시도하지만, 커스텀 스크립트에서는 빠뜨립니다.
- **FDT 경로를 보드와 다른 dtb로 적어 놓습니다.** `fdt /boot/myboard.dtb`인데 실제 파일이 `am335x-boneblack.dtb`면 적재 실패. 커널은 시작도 못 합니다.
- **`append console=...` 항목이 보드 UART와 안 맞습니다.** i.MX는 `console=ttymxc0`, BeagleBone은 `console=ttyO0`, QEMU virt는 `console=ttyAMA0`. 잘못 적으면 부트는 되는데 *콘솔만 안 보입니다*. 가장 헷갈리는 실수입니다.
- **`boot.scr`를 만들었는데 `mkimage` 헤더의 architecture가 틀립니다.** ARMv8 보드인데 `mkimage -A arm`(ARMv7)으로 만들면 U-Boot이 거부합니다. `-A arm64`로 만드세요.
- **`config.txt`의 `kernel=u-boot.bin`이 없는데 U-Boot이 동작하기를 기대합니다.** Raspberry Pi에서 GPU firmware는 *기본적으로 Linux를 직접* 부팅합니다. U-Boot 경로를 쓰려면 `kernel=u-boot.bin`을 명시해야 합니다.
- **EFI 경로(`EFI/boot/bootaa64.efi`)는 있는데 ESP에 GPT의 `EF00` 타입이 안 찍혀 있습니다.** EFI bootmgr는 *GPT partition type*을 확인합니다. `gdisk`에서 `t`로 type을 `EF00`(EFI System)으로 바꾸세요.
- **`bootflow scan`이 빈 결과를 줍니다.** `bootmeth list`로 활성 bootmeth를 먼저 확인하세요. extlinux와 efi가 둘 다 꺼져 있으면 어떤 image도 후보가 못 됩니다.

## 정리

- 부트 스크립트 표준화는 *image 한 장이 여러 보드를 부트*하게 만드는 일입니다.
- Distro Boot는 환경 변수 스크립트로 미디어를 자동 탐색합니다. `boot_targets`이 순회 순서를 정합니다.
- `extlinux.conf`는 syslinux 호환 텍스트 포맷입니다. Debian·Fedora·OpenSUSE의 ARM 표준입니다.
- `boot.scr`는 `mkimage`로 묶은 binary script입니다. 양산 firmware와 vendor BSP가 씁니다.
- bootflow/bootmeth는 U-Boot 2022.10+의 *2세대 표준*입니다. 환경 변수 스크립트를 C 드라이버로 옮겼습니다.
- Raspberry Pi는 *GPU가 먼저* 부트하고 `config.txt`로 진입을 결정합니다. ARM 코어는 그 뒤에 깨어납니다.
- EFI Boot Manager 경로는 SystemReady IR의 표준이고, GRUB·systemd-boot로 분기합니다.
- 신규 보드에는 *bootflow + extlinux.conf 조합*을 권합니다. 양쪽이 깨끗합니다.
- 다중 부트는 `extlinux.conf` 라벨 또는 bootflow priority로 표현합니다.
- 가장 흔한 실수는 *console 파라미터*와 *FDT 파일명* 두 가지입니다.

## 다음 편

[Ch 30: 부트로더 CI](/blog/embedded/bootloader/chapter30-bootloader-ci)에서는 부트로더 변경을 *자동으로 검증*하는 파이프라인을 다룹니다. QEMU에서 boot smoke test, real board에서 hardware-in-the-loop, regression detection의 흐름을 봅니다.

## 관련 항목

- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — Distro Boot의 토대
- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — 2세대 표준
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — EFI bootmgr 자세히
- [Ch 19: 커널 인계](/blog/embedded/bootloader/chapter19-kernel-handoff) — booti/bootm의 동작
- [Ch 26: A/B 슬롯](/blog/embedded/bootloader/chapter26-ab-update) — 다중 부트의 자동화
- [Buildroot Ch 8: 파일 시스템 이미지](/blog/embedded/buildroot/chapter08-filesystems) — extlinux.conf가 들어가는 자리
- [원문 — U-Boot Standard Boot 문서](https://docs.u-boot.org/en/latest/develop/bootstd/index.html)
- [원문 — Syslinux extlinux.conf 사양](https://wiki.syslinux.org/wiki/index.php?title=Config)
