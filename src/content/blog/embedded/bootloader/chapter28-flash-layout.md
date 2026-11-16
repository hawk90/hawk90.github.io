---
title: "임베디드 Flash Layout 설계 — partition·NAND·eMMC·UBI 비교"
slug: "embedded/bootloader/chapter28-flash-layout"
date: 2026-05-19T09:28:00
description: "i.MX8MM SD 카드의 raw 영역(GPT·flash.bin·FIT·env)을 실제 빌드 값으로 그리고 GPT 충돌을 재현하며, QEMU NOR flash 위 U-Boot UBI로 LEB 크기와 예약 블록을 실측합니다."
series: "Bootloader Internals"
seriesOrder: 28
tags: [embedded, bootloader, flash, nand, emmc, ubi, partition]
draft: false
topics: ["embedded"]
---

Flash layout은 저장 장치의 바이트마다 주인을 정하는 일입니다. 어려운 점은 주인이 여럿이라는 것입니다. BootROM은 고정 오프셋을 읽고, 파티션 테이블은 디스크 앞부분을 차지하고, U-Boot는 환경 변수를 또 다른 고정 오프셋에 쓰고, OS는 파티션 안만 봅니다. 이들이 서로를 모른 채 같은 바이트를 쓰면, 어느 한쪽이 조용히 깨집니다.

이 장은 두 가지를 실제 값으로 봅니다. 하나는 [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)·[Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 빌드한 i.MX8M Mini(이하 i.MX8MM) EVK 이미지로 SD 카드 앞부분의 지도를 그리고, GPT와 부트 이미지가 부딪히는 장면을 재현하는 것입니다. 다른 하나는 raw flash용 UBI가 실제로 얼마를 가져가는지를 QEMU의 NOR flash 위에서 U-Boot UBI로 재는 것입니다.

## 한 줄 요약

i.MX8MM EVK SD 카드의 raw 영역은 GPT(0~0x4400), `flash.bin`(0x8400~0x1114A0), 환경 변수(0x400000~0x401000)로 나뉘고, 첫 파티션은 그 뒤에 와야 합니다. `flash.bin`을 1 KiB에 잘못 쓰면 주 GPT가 깨집니다. UBI는 128 KiB 블록마다 헤더를 빼고(NOR에서 128 B), 장치 전체에서 4블록을 예약하며, NAND라면 bad block용 예약이 더 붙습니다.

## SD 카드 앞부분의 주인들

SD 카드 앞 몇 MiB는 아파트 1층 상가와 비슷합니다. 위층(파티션)은 관리사무소(GPT)가 나눠 주지만, 1층에는 관리사무소도 모르는 가게(BootROM 이미지, U-Boot 환경)가 정해진 호수에 입주해 있습니다. 위층 분양을 1층까지 내리면 가게를 덮게 됩니다.

i.MX8MM EVK 빌드에서 각 주인의 위치를 모으면 다음과 같습니다.

| 영역 | 시작 | 끝 | 근거 |
|------|------|-----|------|
| 보호 MBR + GPT 헤더 + 파티션 항목 | `0x0` | `0x4400` | LBA 0, LBA 1, 128개 × 128 B = 16 KiB(LBA 2~33) |
| `flash.bin` (SPL + FIT) | `0x8400` | `0x1114A0` | `dd ... bs=1024 seek=33`(`doc/board/nxp/imx8mm_evk.rst:51`), binman map의 `imx-boot` 크기 `0x1090a0` |
| └ `u-boot.itb`(FIT) | `0x60000` | — | `CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR=0x300` × 512 |
| U-Boot 환경 변수 | `0x400000` | `0x401000` | `CONFIG_ENV_IS_IN_MMC=y`, `CONFIG_ENV_OFFSET=0x400000`, `CONFIG_ENV_SIZE=0x1000` |
| 첫 파티션 | `0x401000` 이후 | — | 위 세 영역과 겹치지 않는 곳 |

GPT 크기는 U-Boot 소스에서 확인했습니다. `include/part_efi.h`는 `GPT_PRIMARY_PARTITION_TABLE_LBA 1ULL`, `GPT_ENTRY_SIZE 128`이고, 항목 수 `GPT_ENTRY_NUMBERS`는 `CONFIG_EFI_PARTITION_ENTRIES_NUMBERS`(이 빌드에서 128)입니다. 128 × 128 B = 16 KiB가 LBA 2부터 32칸을 차지하므로 주 GPT는 LBA 33, 곧 `0x4400`에서 끝납니다. 33 KiB(`0x8400`)에서 시작하는 `flash.bin`과는 16 KiB 간격이 있습니다.

환경 변수는 `CONFIG_SYS_MMC_ENV_DEV=1`, 곧 mmc 장치 1에 있습니다. `arch/arm/dts/imx8mm.dtsi`의 alias가 `mmc1 = &usdhc2`이고, EVK DTS에서 `usdhc2`는 카드 감지 핀(`cd-gpios`)을 가진 SD 슬롯입니다. 또 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 본 `spl_board_boot_device()`도 `SD2_BOOT`를 `BOOT_DEVICE_MMC1`로 바꿉니다. SD 카드로 부팅하는 EVK라면 이 표가 같은 카드 위의 지도입니다. 환경 변수와 `flash.bin` 끝 사이에는 약 2.9 MiB가 비어 있어서, `flash.bin`이 그만큼 커져도 환경 변수를 덮지 않습니다.

반대로 첫 파티션을 4 MiB(`0x400000`, sector 8192)에서 시작하게 만들면 환경 변수 4 KiB가 그 파티션의 첫 블록과 겹칩니다. 파티션을 포맷하는 순간 U-Boot 환경이 지워지고, `saveenv`를 하면 파일 시스템 첫 블록이 덮입니다. U-Boot 보드 문서는 파티션 시작 위치를 정해 주지 않으므로, 이 계산은 이미지를 만드는 쪽(Yocto WIC 설정, 공장 스크립트)이 책임져야 합니다.

### GPT를 덮는 장면 재현

표의 숫자가 실제로 지켜지는지 보려고 64 MiB 빈 이미지에 GPT를 만들고(첫 파티션은 sector 16384 = 8 MiB, 이 실험에서 고른 값), 빌드한 `flash.bin`을 두 위치에 써 봤습니다. 도구는 GPT fdisk(`sgdisk`) 1.0.10입니다.

```bash
dd if=/dev/zero of=sd.img bs=1m count=0 seek=64
sgdisk -n 1:16384:+32M -t 1:8300 sd.img
dd if=flash.bin of=sd.img bs=1024 seek=33 conv=notrunc
sgdisk -v sd.img
```

문서대로 33 KiB에 쓰면 이렇게 나옵니다.

```text
No problems found. 65469 free sectors (32.0 MiB) available in 2
segments, the largest of which is 49119 (24.0 MiB) in size.
```

같은 절차에서 `seek=1`(1 KiB)로만 바꾸면 이렇게 나옵니다.

```text
Caution! After loading partitions, the CRC doesn't check out!
Warning! Main partition table CRC mismatch! Loaded backup partition table
instead of main partition table!
Warning! One or more CRCs don't match. You should repair the disk!
Main header: OK
Backup header: OK
Main partition table: ERROR
Backup partition table: OK
...
```

1 KiB는 LBA 2입니다. LBA 1의 GPT 헤더는 살아남았고, LBA 2부터 시작하는 파티션 항목이 `flash.bin`에 덮여 CRC가 깨졌습니다. GPT는 디스크 끝에 백업을 두므로 `sgdisk`는 백업을 읽어 버텼습니다. 하지만 이 상태로 OS가 GPT를 "복구"하면 이번에는 백업 기준으로 주 GPT를 다시 써서 `flash.bin`의 앞부분을 덮게 됩니다. 부트 이미지와 파티션 테이블이 서로를 번갈아 망가뜨리는 구조입니다.

### 다른 SoC는 다른 숫자 — Allwinner의 8 KiB

이 충돌이 실제로 문제가 된 SoC가 있습니다. U-Boot v2024.04 `doc/board/allwinner/sunxi.rst`는 Allwinner BootROM이 SD 카드 sector 16(8 KiB)에서 부트 이미지를 찾고, 이것이 "in the middle of a potential GPT partition table"이라고 적습니다. 그래서 U-Boot는 이 SoC에서 GPT 항목 수 기본값을 줄입니다. `disk/Kconfig`의 `EFI_PARTITION_ENTRIES_NUMBERS`는 `default 56 if ARCH_SUNXI`이고, 도움말은 "devices that might need to place their first-stage bootloader in the middle of a regular GPT"를 위한 설정이라고 설명합니다. 56 × 128 B = 7 KiB는 LBA 2~15를 차지해 정확히 8 KiB에서 끝납니다. 같은 문서는 H3 이후 SoC가 sector 256(128 KiB)도 확인하므로 `seek=128`로 쓰면 GPT와 겹치지 않는다고 안내합니다.

i.MX8MM의 33 KiB, Allwinner의 8 KiB와 128 KiB처럼, 첫 고정 오프셋은 SoC가 정합니다. 레이아웃 설계는 그 숫자를 확인하는 데서 시작합니다.

## raw flash와 UBI — 얼마를 가져가나

eMMC와 SD는 컨트롤러가 bad block과 wear leveling을 감추고 블록 장치처럼 보입니다. raw NAND·NOR는 그렇지 않아서, 소프트웨어가 지움 단위(eraseblock)와 bad block을 직접 다뤄야 합니다. Linux와 U-Boot에서 그 일을 맡는 층이 UBI입니다. UBI는 물리 블록(PEB)을 논리 블록(LEB)으로 바꿔 주고, 그 대가로 공간을 조금 가져갑니다. 그 "조금"을 어림값 대신 실측했습니다.

QEMU `virt`의 두 번째 CFI NOR flash를 MTD로 쓰도록 U-Boot v2024.04 `qemu_arm64`에 `CONFIG_MTD`, `CONFIG_FLASH_CFI_MTD`, `CONFIG_CMD_MTDPARTS`, `CONFIG_CMD_UBI`, `CONFIG_MTD_UBI`를 켰습니다. `mtd list`로 보면 `nor1`은 블록 크기 `0x20000`(128 KiB), min I/O `0x1`인 NOR입니다. 앞 1 MiB는 환경 변수 자리로 남기고 나머지에 UBI를 붙였습니다.

```text
=> setenv mtdids nor1=nor1
=> setenv mtdparts mtdparts=nor1:1m(env),32m(ubi)
=> mtdparts
nor1: partitioning exceeds flash size
=> ubi part ubi
mtd: partition "ubi" extends beyond the end of device "nor1" -- size truncated to 0x1f00000
ubi0: attaching mtd3
ubi0: scanning is finished
ubi0: empty MTD device detected
ubi0: attached mtd3 (name "ubi", size 31 MiB)
ubi0: PEB size: 131072 bytes (128 KiB), LEB size: 130944 bytes
ubi0: min./max. I/O unit sizes: 1/1, sub-page size 1
ubi0: VID header offset: 64 (aligned 64), data offset: 128
ubi0: good PEBs: 248, bad PEBs: 0, corrupted PEBs: 0
ubi0: user volume: 0, internal volumes: 1, max. volumes count: 128
ubi0: max/mean erase counter: 0/0, WL threshold: 4096, image sequence number: 0
ubi0: available PEBs: 244, total reserved PEBs: 4, PEBs reserved for bad PEB handling: 0
```

앞의 두 줄이 이 장의 주제를 그대로 보여 줍니다. 32 MiB 장치에 1 MiB + 32 MiB 파티션을 지정했는데, U-Boot는 `partitioning exceeds flash size` 경고를 내고 파티션을 `0x1f00000`(31 MiB)으로 **잘라서 그대로 진행했습니다.** 오류로 멈추지 않으므로, 레이아웃이 장치 크기와 맞는지는 이 단계 전에 따로 검사해야 합니다.

나머지 숫자를 소스로 풀면 이렇습니다.

| 항목 | 값 | 설명 |
|------|----|------|
| PEB → LEB | 131,072 → 130,944 B | 블록마다 EC 헤더와 VID 헤더 64 B씩. NOR라 min I/O가 1이어서 정렬 손실이 없음 |
| 예약 PEB | 4개 | layout volume 2(`UBI_LAYOUT_VOLUME_EBS`, `ubi-media.h:304`) + wear-leveling 1(`WL_RESERVED_PEBS`, `wl.c:103`) + atomic LEB change 1(`EBA_RESERVED_PEBS`, `eba.c:45`) |
| bad block 예약 | 0개 | `MTD_UBI_BEB_LIMIT` 도움말: NOR처럼 bad block이 없는 flash에서는 무시 |
| 사용 가능 | 244 PEB | `ubi create rootfs`가 만든 최대 볼륨 31,950,336 B(244 × 130,944) |

원시 크기 248 × 131,072 = 32,505,856 B 중 31,950,336 B가 남았으니, 이 구성에서 UBI가 가져간 몫은 약 1.7%입니다. `ubi info l`의 내부 볼륨 `layout volume`(`reserved_pebs 2`)도 함께 보입니다.

### 같은 계산을 NAND에 하면

NAND에서는 두 가지가 달라집니다. 첫째, 헤더 정렬입니다. `drivers/mtd/ubi/build.c:728-741`은 VID 헤더를 EC 헤더의 정렬 크기 뒤에 두고, 데이터 시작(`leb_start`)을 `ALIGN(vid_hdr_offset + UBI_VID_HDR_SIZE, min_io_size)`로 정합니다. min I/O가 NAND page라면 데이터는 다음 page 경계에서 시작합니다. 2 KiB page·128 KiB 블록 NAND에 이 식을 넣으면 sub-page 쓰기를 지원할 때 헤더가 첫 page에 함께 들어가 LEB = 128 KiB − 2 KiB = 126 KiB가 되고, 지원하지 않으면 헤더가 page 두 개를 차지해 128 KiB − 4 KiB = 124 KiB가 됩니다. 이 두 값은 위 코드로 계산한 것이고, NAND에서 측정한 값은 아닙니다.

둘째, bad block 예약입니다. `CONFIG_MTD_UBI_BEB_LIMIT`(기본 20)의 도움말은 이 값이 1024 블록당 예상 bad block 수이고, 20이면 "about 1.9% of physical eraseblocks"를 예약하며, 그 비율이 attach하는 파티션이 아니라 **NAND 칩 전체** 기준이라고 강조합니다. 칩 하나를 두 파티션으로 나눠 각각 UBI를 붙이면 칩 전체 기준 예약을 파티션마다 따로 하게 됩니다. 작은 UBI 파티션을 여러 개 두는 레이아웃이 생각보다 공간을 많이 잃는 이유입니다.

Linux 쪽에서도 같은 실험을 하려 했지만, 이 장에서 쓴 Debian 13 arm64 커널(6.12.116)에는 `CONFIG_MTD_UBI=m`과 `CONFIG_UBIFS_FS=m`은 있어도 `mtdram`·`nandsim` 모듈이 없어서 가상 MTD 장치를 만들 수 없었습니다(`modprobe: FATAL: Module mtdram not found`). U-Boot의 `drivers/mtd/ubi/`는 Linux UBI와 같은 IBM·Nokia 저작권 표기를 단 같은 계열 코드이고 on-flash 형식 정의(`ubi-media.h`)도 같지만, 위 숫자는 U-Boot에서 잰 것입니다.

## eMMC는 또 다른 층

eMMC는 user area 외에 boot partition과 RPMB 같은 하드웨어 영역이 따로 있습니다. 이 영역은 GPT가 아니라 eMMC 자체 설정(EXT_CSD)으로 나뉘고, U-Boot에서는 `mmc partconf`로 어느 영역에서 부팅할지를 바꿉니다. [Ch 10](/blog/embedded/bootloader/chapter10-storage-boot)에서 v2024.04 `doc/usage/cmd/mmc.rst`의 partconf 값(`0x0`/`0x1`/`0x2`/`0x7`)을 정리했습니다. 이 명령은 장치의 영구 설정을 바꾸므로, 공장 절차에서 한 번 정하고 이후에는 읽기만 하는 것이 안전합니다.

i.MX8MM에서 eMMC로 부팅하면 위 SD 지도의 "33 KiB"가 그대로 적용되지 않습니다. ROM이 어느 영역의 어느 오프셋을 읽는지는 부팅 장치마다 다르고, 그 값은 SoC reference manual에 있습니다. 이 장에서는 eMMC 부팅을 실험하지 않았습니다.

## 레이아웃을 데이터로 관리하기

위 실험에서 문제를 잡은 것은 매번 계산과 도구였습니다. GPT 충돌은 `sgdisk -v`가, 장치 초과는 U-Boot 경고가 알려 줬습니다. 그런데 U-Boot는 경고만 하고 진행했고, `dd`는 아무 말도 하지 않았습니다. 그래서 레이아웃은 사람이 읽는 표가 아니라 기계가 읽는 한 곳에 두고, 빌드할 때마다 다음을 검사하는 편이 낫습니다.

1. 각 영역의 `[시작, 끝)`을 Kconfig(`CONFIG_ENV_OFFSET`, `CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR`)와 빌드 산출물(binman map의 크기)에서 읽어 서로 겹치지 않는지 확인합니다.
2. 첫 파티션 시작이 마지막 raw 영역의 끝보다 뒤인지, 파티션 정렬(이 실험에서는 8 MiB)을 지키는지 확인합니다.
3. 생성한 디스크 이미지에 `sgdisk -v`를 돌려 GPT가 온전한지 확인합니다.
4. raw flash라면 MTD 파티션 합이 장치 크기를 넘지 않는지, UBI 파티션마다 bad block 예약(칩 전체 기준)을 더해 용량을 계산합니다.

## 정리

- i.MX8MM EVK SD 카드에서 GPT는 `0x4400`까지, `flash.bin`은 `0x8400`~`0x1114A0`, FIT는 `0x60000`, 환경 변수는 `0x400000`~`0x401000`입니다. 첫 파티션은 `0x401000` 뒤에 둡니다.
- `flash.bin`을 1 KiB에 쓰면 LBA 2부터의 파티션 항목이 덮여 `Main partition table: ERROR`가 됩니다.
- Allwinner는 BootROM 오프셋(8 KiB)이 GPT 안에 있어, U-Boot가 sunxi에서 GPT 항목 수 기본값을 56으로 줄입니다.
- U-Boot UBI는 QEMU NOR(128 KiB 블록)에서 LEB 130,944 B, 예약 4 PEB, bad block 예약 0으로, 약 1.7%를 가져갔습니다.
- NAND에서는 헤더가 page 단위로 정렬되어 LEB가 더 줄고, `MTD_UBI_BEB_LIMIT` 기본 20(칩 전체의 약 1.9%)이 파티션마다 예약됩니다.
- U-Boot는 장치를 넘는 `mtdparts`를 경고 후 잘라서 진행하므로, 레이아웃 겹침과 크기는 빌드 단계에서 기계로 검사합니다.

## 다음 편

다음 편은 [Ch 29: Distro Boot 표준화](/blog/embedded/bootloader/chapter29-distro-boot)입니다. 파티션 안에 놓인 커널과 설정 파일을 U-Boot가 어떤 규칙으로 찾는지 봅니다.

## 관련 항목

- [Ch 10: 부트 미디어와 storage boot](/blog/embedded/bootloader/chapter10-storage-boot) — `mmc partconf` 값과 QEMU 저장 장치
- [Ch 13: env와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 환경 변수 저장 형식과 flash 수명
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — 슬롯을 두 벌 두는 레이아웃
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — 섹터 0x300의 FIT를 읽는 SPL
- [U-Boot v2024.04 — doc/board/allwinner/sunxi.rst](https://github.com/u-boot/u-boot/blob/v2024.04/doc/board/allwinner/sunxi.rst) — BootROM 오프셋과 GPT
- [Linux: UBI File System](https://docs.kernel.org/filesystems/ubifs.html)
- [Linux MTD: UBI 문서](http://www.linux-mtd.infradead.org/doc/ubi.html)
