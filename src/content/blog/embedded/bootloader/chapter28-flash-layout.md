---
title: "임베디드 Flash Layout 설계 — partition·NAND·eMMC·UBI 비교"
date: 2026-05-19T09:28:00
description: "양산 firmware의 flash layout 설계 — 부트로더·env·kernel·rootfs·OTA slot의 sizing과 NAND/eMMC/UBI 차이."
series: "Bootloader Internals"
seriesOrder: 28
tags: [embedded, bootloader, flash, nand, emmc, ubi, partition]
draft: false
---

Flash layout은 *한 번 결정하면 양산 내내 끌고 가는* 결정입니다. 부트로더 크기, env 위치, A/B 슬롯 크기, OTA staging 영역, 사용자 데이터 영역을 *처음에 잘 잘라 두지 않으면* 두 번째 펌웨어 배포에서 막힙니다. 매체별 특성도 다릅니다. NAND는 bad block을 평생 누적하고, NOR은 byte addressable이지만 erase가 느리고, eMMC는 controller가 보이지 않는 데서 wear leveling을 하고, QSPI NOR은 DRAM 없이 XIP가 됩니다. layout 결정은 매체 특성과 양산 운영 정책이 만나는 자리입니다.

## 한 줄 요약

> **"layout은 *지금 쓸 공간*이 아니라 *3년 뒤 OTA로 늘어날 공간*까지 계산해 잘라야 합니다."** — 부트로더·env·A/B 슬롯·data·OTA staging이 *각자의 여유*를 가지고 자리잡아야 양산이 견딥니다.

## 매체별 특성 — NAND·NOR·eMMC·SD·QSPI

flash 매체는 같은 "비휘발 저장소"라도 *동작 단위와 제약*이 전혀 다릅니다. layout을 짜기 전에 매체의 *최소 동작 단위*와 *XIP 가능 여부*를 먼저 확인합니다.

| 매체 | 최소 erase 단위 | R/W 단위 | XIP | bad block | 컨트롤러 위치 | 대표 인터페이스 |
|------|----------------|---------|-----|-----------|---------------|----------------|
| **raw NAND (SLC/MLC)** | 128 KB ~ 1 MB block | page (2/4/8 KB) | 불가 | 평생 누적 | host (MTD) | parallel NAND |
| **parallel NOR** | 64 KB sector | byte | 가능 | 거의 없음 | host (MTD) | parallel NOR |
| **QSPI NOR** | 4/64 KB sector | byte (read 시) | 가능 | 거의 없음 | host (SPI controller) | QSPI |
| **eMMC** | block (controller-internal) | 512 B sector | 불가 | controller가 숨김 | embedded (JEDEC) | eMMC |
| **SD card** | block (controller-internal) | 512 B sector | 불가 | controller가 숨김 | embedded | SD |

핵심 차이는 세 가지입니다. 첫째, *XIP*. NOR·QSPI NOR은 부트로더가 *flash 주소에 직접* 명령을 페치할 수 있어 DDR 없이 동작이 가능합니다. NAND·eMMC·SD는 *항상 RAM에 적재한 뒤* 실행합니다. 둘째, *erase 단위*. NAND는 한 블록을 *통째로* 지운 뒤 page 단위로 씁니다. NOR은 sector 단위. eMMC는 *컨트롤러가 알아서* 합니다. 셋째, *bad block*. raw NAND는 출고 시 일부 블록이 bad이며 *사용 중에도 더 늘어납니다*. eMMC·SD는 컨트롤러가 *교체 블록(spare)*에서 가져와 *호스트에 보이지 않게* 처리합니다.

매체 선택이 layout을 좌우합니다. QSPI NOR이면 SPL·U-Boot이 *flash에서 직접 실행*되고 작은 partition으로 충분합니다. NAND면 bootloader도 *RAM에 복사된 뒤* 동작하고 BBT 영역과 UBI 오버헤드를 고려해야 합니다. eMMC면 boot0/boot1 hardware partition을 활용할 수 있어 *SPL 위치 결정*이 달라집니다.

## layout 설계 결정 사항

layout을 짜기 전에 결정해야 할 항목은 다음과 같습니다.

- **부트로더 크기** — SPL(50 ~ 100 KB) + U-Boot Proper(0.5 ~ 1 MB) + TF-A(BL31, 100 ~ 200 KB) 합계.
- **env 크기** — 보통 16 ~ 64 KB. redundant pair면 두 배.
- **DTB 위치** — 커널 안 embed인지 분리인지, A/B 슬롯에 같이 둘지.
- **kernel 크기** — uImage·zImage·Image (4 ~ 10 MB이 일반).
- **rootfs 크기** — 양산 시점의 1.5배. 30 MB짜리 시스템이면 50 MB 슬롯.
- **A/B 슬롯** — kernel + DTB + rootfs를 *두 벌* 두는가.
- **recovery 영역** — *최소 부팅 + OTA agent*만 들어가는 fallback rootfs.
- **data partition** — 슬롯 공유. 사용자 설정·로그·캐시.
- **OTA staging** — 업데이트 파일을 받아 두는 임시 영역.
- **misc·persistent flags** — bootcount, slot metadata, recovery 트리거.

이 모든 항목이 *각자의 자리*를 가지고 *서로 침범하지 않아야* 합니다. 한 항목이 1 MB 모자라면 *모든 항목을 다시 잘라야* 합니다. 그래서 처음부터 여유를 두는 것이 정답입니다.

다음은 eMMC 1 GB 보드의 표준 layout 한 예입니다. dts에 partition node로 기술하는 형식입니다.

```dts
&mmc0 {
    status = "okay";

    partitions {
        compatible = "fixed-partitions";
        #address-cells = <1>;
        #size-cells = <1>;

        partition@0       { label = "spl";              reg = <0x00000000 0x00100000>; }; /* 1 MB */
        partition@100000  { label = "u-boot";           reg = <0x00100000 0x00200000>; }; /* 2 MB */
        partition@300000  { label = "u-boot-env";       reg = <0x00300000 0x00010000>; }; /* 64 KB */
        partition@310000  { label = "u-boot-env-redund";reg = <0x00310000 0x00010000>; }; /* 64 KB */
        partition@400000  { label = "boot_a";           reg = <0x00400000 0x01000000>; }; /* 16 MB */
        partition@1400000 { label = "boot_b";           reg = <0x01400000 0x01000000>; }; /* 16 MB */
        partition@2400000 { label = "rootfs_a";         reg = <0x02400000 0x10000000>; }; /* 256 MB */
        partition@12400000{ label = "rootfs_b";         reg = <0x12400000 0x10000000>; }; /* 256 MB */
        partition@22400000{ label = "data";             reg = <0x22400000 0x1BC00000>; }; /* 444 MB */
    };
};
```

이 layout은 부트로더 3 MB + env 128 KB + 슬롯 두 벌 (544 MB) + data 444 MB로 1 GB를 채웁니다. 양산 시점의 rootfs가 *180 MB*라면 256 MB 슬롯은 *1.4배 여유*입니다.

## partition sizing 원칙

각 partition의 크기는 *현재 사용량*이 아니라 *3년 뒤 OTA 누적*까지 계산해 잡습니다. 다음 표가 양산 시 적용하는 sizing rule입니다.

| partition | sizing rule | 비고 |
|-----------|-------------|------|
| **SPL** | 실제 크기 × 1.5 | 보통 1 MB로 잡으면 안전 |
| **U-Boot Proper** | 실제 크기 × 1.5 | 환경 변수 commands 추가 여유 |
| **TF-A (BL31)** | 실제 크기 × 1.5 | PSCI handler 확장 가능 |
| **env** | 16 ~ 64 KB | 사용량보다는 *erase block size*에 맞춤 |
| **env redundant** | env와 동일 | 항상 pair |
| **kernel + DTB + initramfs (FIT)** | 실제 크기 × 1.5 | A/B 슬롯이면 양쪽 동일 |
| **rootfs** | 실제 크기 × 1.5 ~ 2 | OTA 누적 가장 크게 늘어남 |
| **OTA staging** | 가장 큰 슬롯 × 1 + headroom | 부분 다운로드 + 검증 |
| **data** | 나머지 전부 | 너무 작으면 양산 후 불만 |
| **misc / bootinfo** | 16 ~ 64 KB | bootcount, slot metadata |

*"실제 크기 × 1.5"* 가 그냥 마진이 아닙니다. 2년치 OTA를 누적하면 보통 *원래 크기의 1.3 ~ 1.5배*까지 늘어납니다. 새 라이브러리 의존성, 새 모델 파일, 새 i18n 데이터가 OTA마다 누적됩니다. 슬롯이 *1.0배*이면 첫 OTA에서 막힙니다.

env partition만 예외입니다. env는 사용량이 *문자열 합계* 수준이라 1 KB도 안 되지만, *erase block 단위*에 맞춰 잡습니다. NAND에서 erase block이 128 KB면 env도 *최소 128 KB*. eMMC에서는 16 ~ 64 KB로 충분합니다.

## env partition 설계

env partition은 *부트 정책을 저장하는 곳*입니다. [Ch 13: env와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 다룬 모든 변수가 여기 저장됩니다. layout 설계에서 결정해야 할 점은 *위치*와 *redundancy*입니다.

U-Boot에서 env 백엔드는 Kconfig 옵션 하나로 정합니다.

```text
# eMMC user area에 env
CONFIG_ENV_IS_IN_MMC=y
CONFIG_SYS_MMC_ENV_DEV=0
CONFIG_SYS_MMC_ENV_PART=0
CONFIG_ENV_OFFSET=0x300000
CONFIG_ENV_SIZE=0x10000

# redundant env (제2 사본)
CONFIG_SYS_REDUNDAND_ENVIRONMENT=y
CONFIG_ENV_OFFSET_REDUND=0x310000
```

redundant env는 *두 사본을 번갈아 쓰는* 패턴입니다. 한 사본을 *erase + write* 하는 도중 전원이 끊겨도 *다른 사본이 살아 있어* 부팅이 가능합니다. CRC와 *flag byte*로 어느 쪽이 최신인지 판단합니다. 새 사본에 먼저 flag·payload·crc를 다 쓴 뒤, 기존 사본의 flag를 무효 처리합니다. 부팅 시 두 사본을 모두 읽어 *valid crc + 높은 flag*인 쪽을 채택합니다.

env partition을 *부트로더와 같은 erase block에 두면* 부트로더 업데이트 중 env가 날아갈 위험이 있습니다. 반드시 *분리된 erase block*에 둡니다. NAND의 경우 erase block이 128 KB라면 env partition이 *그 블록 경계*에 정확히 맞아야 합니다. offset이 잘못 잡혀 *부트로더 마지막 영역과 env 첫 영역이 같은 erase block을 공유*하면 양쪽 모두 위태로워집니다.

## A/B slot sizing

A/B 슬롯은 [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update)에서 다룬 안전 fallback의 기반입니다. layout 관점에서의 결정은 *어디까지를 슬롯에 두고 어디부터를 공유로 둘 것인가*입니다.

| 영역 | A/B 분할? | 이유 |
|------|----------|------|
| **SPL** | 보통 NO | 매우 안정적, 거의 안 바꿈 |
| **U-Boot Proper** | optional | 바꾸려면 A/B 권장 |
| **TF-A** | optional | secure update 시 A/B 필수 |
| **kernel + DTB + initramfs** | YES | 매 OTA마다 바뀜 |
| **rootfs** | YES | 매 OTA마다 바뀜 |
| **data (user data)** | NO (공유) | 슬롯 토글 시 데이터 유지 |
| **OTA staging** | NO (공유) | 다운로드 임시 |
| **misc / bootinfo** | NO (공유) | bootcount, metadata |

`data`를 공유에 두지 않으면 *슬롯이 바뀔 때마다 사용자 설정·로그가 사라집니다*. 반대로 kernel·rootfs를 공유에 두면 A/B의 의미가 없어집니다. *부팅에 필요한 것은 슬롯에*, *가변 사용자 데이터는 공유에*가 원칙입니다.

slot 안의 *내부 layout*은 FIT 이미지 한 장으로 묶는 게 표준입니다.

```text
boot_a (16 MB)
+------------------------+
| FIT image (boot.itb)   |
|   - kernel             |
|   - DTB                |
|   - initramfs (option) |
|   - configurations     |
+------------------------+
```

FIT으로 묶으면 *kernel·DTB 짝*이 항상 일치합니다. kernel만 따로 OTA했다가 *옛 DTB로 부팅해서 random panic*이 나는 사고를 막을 수 있습니다.

## NAND BBT — 불량 블록 관리

raw NAND는 *출고 시점부터 일부 블록이 bad*이며 *사용 중에 더 늘어납니다*. BBT (Bad Block Table)가 *어느 블록이 bad인지* 기록해 두는 표입니다. layout 설계에서는 BBT가 *별도의 영역*을 차지한다는 사실을 잊으면 안 됩니다.

```text
$ dmesg | grep -i 'bad block\|bbt'
[    2.347] Scanning device for bad blocks
[    2.812] Bad eraseblock 47 at 0x000005e0000
[    2.851] Bad eraseblock 312 at 0x000027000000
[    3.024] Bad eraseblock 891 at 0x00006f600000
[    3.198] nand: Scanning device for bad blocks
[    3.245] nand_bbt: bbt found at page 524160, version 0x01
[    3.247] nand_bbt: mirror bbt found at page 524032, version 0x01
```

BBT는 *마지막 블록 근처*에 보통 자리잡습니다. main BBT와 mirror BBT 두 사본을 둡니다. 한 사본의 블록이 새로 bad가 되어도 mirror에서 복원합니다.

BBT 영역은 *kernel MTD layer가 자동 관리*합니다. 우리가 partition으로 잡지는 않지만, 마지막 partition을 *flash 끝까지 채우지 말고 몇 블록 여유*를 둡니다.

NAND 256 MB(블록 128 KB, 2048 블록) 보드의 표준 배치는 *block 0부터* SPL(8 블록)·U-Boot(16 블록)·env(8 블록)·kernel_a(64 블록) 순으로 자리잡고, *block 2044 ~ 2046*은 reserve, *block 2046 ~ 2048*은 BBT(main + mirror)가 자동으로 차지합니다. 핵심 두 가지가 있습니다. 첫째, *block 0은 반드시 good*이어야 합니다. SPL이 들어가는 자리이고, BootROM이 *bad block을 인식 못 하는* 경우가 흔합니다. 둘째, NAND는 *erase를 너무 자주 하면 wear가 빨리 옵니다*. 양산 OTA가 빈번한 시스템은 *block당 P/E cycle*을 계산해 슬롯 회전 정책을 잡아야 합니다.

bad block이 누적되면 *해당 블록을 skip*하면서 사용합니다. raw NAND에 직접 partition을 잡으면 *bad block을 만나는 순간* 그 영역이 망가집니다. 그래서 NAND 위에는 보통 *UBI*를 한 층 더 얹습니다.

## UBI/UBIFS — NAND 위의 layer

UBI (Unsorted Block Images)는 *NAND의 physical eraseblock*을 *logical eraseblock*으로 추상화하는 레이어입니다. bad block 관리, wear leveling, atomic update가 자동입니다. 스택은 application → UBIFS(file system) → UBI volume → UBI(PEB↔LEB mapping) → MTD partition → NAND chip의 순서입니다.

UBI 위에는 *여러 volume*을 둘 수 있습니다. 한 MTD partition을 UBI로 만든 뒤 그 안에 *kernel·rootfs·data* volume을 따로 잡는 패턴이 흔합니다.

`ubinize.cfg` 작성 예입니다.

```ini
[kernel_volume]
mode=ubi
image=boot.itb
vol_id=0
vol_type=static
vol_name=kernel
vol_flags=autoresize

[rootfs_volume]
mode=ubi
image=rootfs.ubifs
vol_id=1
vol_type=dynamic
vol_name=rootfs
vol_size=256MiB

[data_volume]
mode=ubi
vol_id=2
vol_type=dynamic
vol_name=data
vol_size=128MiB
```

`ubinize -o ubi.img -m 2048 -p 128KiB ubinize.cfg`로 이미지를 만들어 NAND에 한 번 씁니다. 이후에는 UBI 위에서 *볼륨 단위로* 업데이트합니다.

UBI는 *bad block을 자동 skip*하고, *erase count를 평준화*하며, *atomic update*를 보장합니다. 대신 *오버헤드*가 있습니다. 보통 partition의 *5 ~ 10%*가 UBI overhead로 빠집니다. 256 MB partition이면 실제로 *230 ~ 244 MB*만 사용 가능합니다. sizing할 때 이 오버헤드를 빼고 계산합니다.

NOR이나 eMMC에서는 UBI가 *필요 없습니다*. NOR은 bad block이 거의 없고, eMMC는 controller가 wear leveling을 합니다. UBI는 *raw NAND 전용 layer*로 이해하면 됩니다.

## eMMC partition 활용

eMMC는 *JEDEC 표준*으로 *hardware partition*을 제공합니다. layout 설계 관점에서 이 partition들의 *각자의 용도*를 활용하면 깔끔합니다.

| 영역 | 약자 | 표준 크기 | 일반적 용도 |
|------|-----|---------|-----------|
| **boot0** | BOOT1 | 4 MB | SPL, write-protected 가능 |
| **boot1** | BOOT2 | 4 MB | 백업 SPL 또는 U-Boot |
| **RPMB** | Replay Protected | 4 ~ 16 MB | 키·anti-rollback counter |
| **General Purpose Partition (GPP)** | GP1 ~ GP4 | 가변 | factory data, calibration |
| **User Data Area (UDA)** | — | 나머지 전부 | kernel, rootfs, data |

`mmc partconf` 명령으로 *부팅 시 어느 partition을 읽을지* 결정합니다.

```bash
# boot0에서 부팅, boot0 access enabled, partition 1 active
$ mmc partconf 0 1 1 1
# 의미: device=0, BOOT_ACK=1, BOOT_PARTITION_ENABLE=1, PARTITION_ACCESS=1

# 확인
$ mmc partconf 0
EXT_CSD[179], PARTITION_CONFIG:
BOOT_ACK: 0x1
BOOT_PARTITION_ENABLE: 0x1
PARTITION_ACCESS: 0x0
```

전형적인 활용은 *boot0에 SPL + U-Boot Proper*를 두고, *UDA에 kernel·rootfs·data*를 GPT로 자르는 패턴입니다. BootROM이 boot0를 읽도록 boot mode strap을 설정하면, *UDA의 GPT가 망가져도 부트로더는 살아남습니다*. boot1은 boot0의 백업, GPP1은 출고 시 calibration 데이터를 읽기 전용으로 두는 자리로 활용합니다.

RPMB는 *replay protected*입니다. host가 RPMB에 쓰려면 사전 공유된 *256-bit key*로 HMAC 서명을 해야 합니다. anti-rollback counter나 device-bound key를 저장하기에 적합합니다. [Ch 27: chain of trust](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 RPMB 활용을 다룹니다.

`genimage`로 이런 레이아웃을 한 번에 빌드할 수 있습니다.

```text
image emmc.img {
    hdimage {
        partition-table-type = "gpt"
    }

    partition boot_a {
        partition-type-uuid = "0fc63daf-8483-4772-8e79-3d69d8477de4"
        image = "boot_a.fit"
        size = 16M
    }
    partition boot_b {
        partition-type-uuid = "0fc63daf-8483-4772-8e79-3d69d8477de4"
        image = "boot_b.fit"
        size = 16M
    }
    partition rootfs_a {
        image = "rootfs.ext4"
        size = 1G
    }
    partition rootfs_b {
        image = "rootfs.ext4"
        size = 1G
    }
    partition data {
        image = "data.ext4"
        size = 5G
    }
}
```

이렇게 만든 `emmc.img`는 boot0가 아닌 *UDA만* 채웁니다. boot0는 별도 도구(`mmc-utils` 또는 vendor flashing tool)로 따로 씁니다.

## 설계 워크플로

새 보드의 layout을 짜는 순서는 다음과 같습니다.

1. **요구사항 수집** — 매체 종류·크기, 양산 시 firmware 크기, OTA 사용 여부, A/B 필요 여부, secure boot 사용 여부, 예상 OTA 주기.
2. **첫 layout draft** — 위 sizing rule 표를 그대로 적용해 한 장 그립니다. dts 형식이나 genimage 형식 둘 다 OK.
3. **growth simulation** — 향후 2 ~ 3년치 OTA 누적을 시뮬레이션합니다. 슬롯이 *현재의 1.5배*가 되는 순간 *어디서 막히는지* 확인합니다.
4. **매체 특성 적용** — NAND면 erase block 정렬과 BBT 영역, UBI 오버헤드를 반영. eMMC면 boot0/RPMB 활용을 결정.
5. **secure boot 정렬** — 서명된 영역의 *경계*가 erase block 경계와 일치해야 합니다. 어긋나면 검증이 깨집니다.
6. **prototype 검증** — 실제 보드에 굽고 OTA 1 ~ 2회 사이클을 돌립니다. partition 사이의 침범, env 손상, BBT 누적을 확인.
7. **양산 fix** — 위 검증이 통과되면 *layout을 고정*합니다. 양산 후에는 *기존 device가 살아 있도록* 변경이 매우 제한됩니다.

특히 7번이 중요합니다. layout은 *양산이 시작되면 거의 못 바꿉니다*. 이미 배포된 디바이스의 OTA가 새 layout과 호환되지 않으면 그 디바이스들은 *brick* 됩니다. 그래서 처음 30분의 *sizing 결정*이 3년의 운영을 좌우합니다.

## 흔한 실수

layout 설계에서 자주 일어나는 실수입니다.

- **env partition을 OTA 도중 쓰는 패턴.** OTA agent가 `fw_setenv`로 슬롯 metadata를 쓰는데 마침 그 시점에 전원이 끊기면 env가 망가져 부팅 자체가 불가능해집니다. redundant env가 필수입니다.
- **A 슬롯에서 B 슬롯 데이터 노출.** 마운트 점을 잘못 두면 active 슬롯에서 *비활성 슬롯의 rootfs*가 보입니다. 디버그용으로는 편리하지만 양산에서는 *비활성 슬롯을 mount 하지 않는* 정책이 안전합니다.
- **RPMB key reuse.** 한 모델의 모든 디바이스가 같은 RPMB key를 쓰면 *한 디바이스의 key가 유출되는 순간 전 라인이 뚫립니다*. 디바이스별 unique key가 원칙입니다.
- **flash 끝까지 partition.** NAND에서 BBT 영역을 침범하면 부팅 자체가 안 됩니다. 최소 2 ~ 4 블록은 비워 둡니다.
- **kernel은 슬롯에, DTB는 공통.** 새 커널을 옛 DTB로 부팅하면 random panic. FIT으로 묶어 *짝을 강제*합니다.
- **erase block 경계 미정렬.** NAND env partition이 erase block 중간에서 시작하면 *env 업데이트가 인접 영역까지 erase*합니다. 인접 영역이 부트로더면 부트로더가 날아갑니다.
- **OTA staging 부재.** staging 영역 없이 *비활성 슬롯에 직접 다운로드*하면 다운로드 도중 실패 시 비활성 슬롯이 망가져 fallback이 불가능해집니다. 별도 staging 영역에 다운로드 + 검증 후 슬롯에 *atomic swap*하는 것이 안전합니다.
- **slot size = 현재 사용량.** 첫 OTA에서 막힙니다. 1.5배는 최소이고 2배도 흔합니다.

## 정리

- Flash layout은 양산 시작 전 30분의 결정이 3년 운영을 좌우합니다. 한 번 정해지면 거의 못 바꿉니다.
- 매체별 특성이 layout을 좌우합니다. raw NAND는 BBT·UBI, NOR은 XIP·byte addressable, eMMC는 boot0/RPMB, SD는 GPT.
- partition sizing은 *현재 × 1.5*가 최소. rootfs는 2배까지도 흔합니다. OTA 누적이 빠르게 늘어납니다.
- env partition은 *erase block 경계*에 정렬하고 *redundant pair*로 둡니다. env 손상은 부팅 자체를 막습니다.
- A/B 슬롯에는 *부팅에 필요한 것*(kernel·DTB·rootfs)을 두고, *가변 사용자 데이터*는 공유 partition에 둡니다.
- NAND는 BBT 영역을 자동 관리하므로 partition을 *flash 끝까지 채우지 말고* 여유를 둡니다.
- raw NAND 위에는 UBI/UBIFS를 거의 항상 얹습니다. bad block skip, wear leveling, atomic update가 자동. 5 ~ 10% 오버헤드.
- eMMC의 boot0/boot1/RPMB를 활용하면 부트로더와 secure counter를 *UDA와 분리된 영역*에 둘 수 있습니다.
- 흔한 실수는 env 도중 쓰기, RPMB key reuse, slot size 부족, erase block 경계 미정렬입니다.

## 다음 편

다음 편은 [Ch 29: Distro Boot 표준화](/blog/embedded/bootloader/chapter29-distro-boot)에서 *generic distro 부팅*을 다룹니다. 보드별 bootcmd 대신 `distro_bootcmd`를 써서 *어디서 부팅할지 자동으로 탐색*하는 표준화 패턴을 봅니다.

## 관련 항목

- [Ch 10: 부트 미디어와 storage boot](/blog/embedded/bootloader/chapter10-storage-boot) — 매체별 부트 흐름
- [Ch 13: env와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — env 저장 위치와 백엔드
- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update) — 슬롯 부팅 메커니즘
- [Ch 27: Chain of trust와 RPMB](/blog/embedded/bootloader/chapter27-chain-of-trust) — RPMB key·anti-rollback
- [Buildroot Ch 16: OTA partition 구성](/blog/embedded/buildroot/chapter16-ota) — 양산 OTA 빌드 관점
- [원문 — U-Boot Manual: Environment Variables](https://u-boot.readthedocs.io/en/latest/usage/environment.html)
- [원문 — Linux MTD subsystem](http://www.linux-mtd.infradead.org/doc/general.html)
- [원문 — UBI Documentation](http://www.linux-mtd.infradead.org/doc/ubi.html)
