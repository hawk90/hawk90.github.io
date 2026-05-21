---
title: "Ch 10: 스토리지 부트 — MMC, SCSI, NAND, SPI Flash"
date: 2026-05-09T10:00:00
description: "부트 미디어별 동작 차이 — eMMC, SD, SATA, NAND, SPI NOR/NAND의 부트 모드."
series: "Bootloader Internals"
seriesOrder: 10
tags: [embedded, bootloader, u-boot, storage, mmc, nand]
draft: false
---

## 한 줄 요약

**스토리지 부트의 핵심은 "부트 ROM이 기대하는 위치에, 기대하는 형식으로 이미지가 있어야 한다"입니다.** 미디어마다 그 위치와 형식이 다르고, 그 위에서 U-Boot가 동작하는 명령도 다릅니다.

[9장](/blog/embedded/bootloader/chapter09-dram-init)에서 DRAM이 깨어났으니, 이제 메인 U-Boot는 *부트 이미지를 어디서 어떻게 읽을지* 결정해야 합니다. eMMC, SD, SATA, NAND, SPI NOR/NAND는 *물리 레이어*도 다르고 *부트 ROM이 보는 헤더*도 다릅니다. 같은 SoC라도 BOOTSEL 핀 값에 따라 완전히 다른 경로를 탑니다.

이 글에서는 각 미디어의 부트 모드, U-Boot에서 그 미디어를 다루는 명령, 그리고 *어디까지가 부트 ROM의 일이고 어디부터 U-Boot의 일인지*를 정리합니다.

## 부트 미디어 선택과 BOOTSEL

대부분의 SoC는 칩 외부 핀(BOOTSEL, BOOT_MODE)을 reset 시점에 읽어 부트 소스를 결정합니다.

```text
BOOTSEL[2:0] = 000 → 외부 fuse/OTP에 따름
             = 001 → SD card
             = 010 → eMMC
             = 011 → SPI NOR
             = 100 → NAND
             = 101 → USB (download mode)
             = 110 → Ethernet
             = 111 → JTAG halt
```

값은 SoC마다 다릅니다. 양산 보드는 보통 BOOTSEL을 GPIO로 끌어내 *recovery jumper*를 만듭니다. jumper를 짧게 하면 USB download로, 빼면 eMMC로 부팅하는 식입니다. 칩의 [3장](/blog/embedded/bootloader/chapter03-build-system) 빌드 산출물(SPL + main U-Boot)을 어느 미디어에 어느 형식으로 쓸지가 다음 문제입니다.

## eMMC와 SD — MMC 서브시스템

eMMC는 BGA로 PCB에 박혀 있고, SD는 슬롯에 꽂는 카드입니다. 전기적·프로토콜적으로는 거의 같은 *MMC 패밀리*입니다. U-Boot에서도 같은 `mmc` 명령으로 다룹니다. 다음 그림은 eMMC의 boot partition과 user area의 구조를 보여줍니다.

![eMMC 부트 파티션 레이아웃 — Boot Partition과 User Area(GPT)](/images/blog/bootloader/diagrams/ch10-storage-layout.svg)

```text
=> mmc list
FSL_SDHC: 0 (eMMC)
FSL_SDHC: 1 (SD)
=> mmc dev 0 0     # eMMC user partition 선택
=> mmc info
Device: FSL_SDHC
Manufacturer ID: 13
OEM: 14e
Tran Speed: 200000000
Bus Width: 8-bit DDR
=> mmc part        # 파티션 목록
Partition Map for MMC device 0  --  Partition Type: EFI
Part  Start LBA    End LBA      Name
  1   0x00002000   0x00021fff   boot
  2   0x00022000   0x00121fff   rootfs
```

eMMC는 *boot partition*(hardware 영역)을 별도로 가집니다. user area와 분리되어 있고, 부트 ROM이 *boot partition 1*을 먼저 봅니다. SPL과 main U-Boot를 boot partition에 쓰면, user area는 깨끗하게 GPT 파티션으로 쓸 수 있습니다.

```bash
# eMMC boot partition에 U-Boot 쓰기 (호스트 PC에서)
echo 0 > /sys/block/mmcblk0boot0/force_ro
dd if=u-boot-with-spl.imx of=/dev/mmcblk0boot0 bs=1k seek=33
echo 1 > /sys/block/mmcblk0boot0/force_ro

# U-Boot에서 boot partition 활성화
mmc partconf 0 1 1 1     # boot ack, boot 0, partition 1
```

부트 이미지가 적재된 다음의 흐름은 단순합니다.

```text
=> mmc dev 0
=> ext4load mmc 0:1 ${loadaddr} /boot/Image
=> ext4load mmc 0:1 ${fdt_addr_r} /boot/board.dtb
=> booti ${loadaddr} - ${fdt_addr_r}
```

`load` 명령이 추상화되어 있어 `fatload`, `ext4load`, `load`(자동 감지) 모두 가능합니다. distroboot 환경 변수는 거의 항상 *`load`*를 씁니다.

## SD/eMMC 컨트롤러 — CSD·CID·EXT_CSD

`mmc info`가 어떻게 그렇게 자세한 정보를 알까요. MMC 카드는 *register set*을 가지고 있고, 호스트 컨트롤러가 CMD0~CMD13 시퀀스로 그것을 읽습니다. 핵심 레지스터는 세 가지입니다.

| 레지스터 | 크기 | 내용 |
|---------|------|------|
| CID (Card Identification) | 128b | Manufacturer ID, OEM, 제품명, 시리얼, 제조일 |
| CSD (Card Specific Data) | 128b | 용량(C_SIZE), 블록 길이, read/write 속도, 보안 정보 |
| EXT_CSD (Extended CSD) | 512B | eMMC 전용. 파티션 설정, BOOT_BUS_CONFIG, HS 모드, life time |

U-Boot에서 EXT_CSD 전체를 덤프해 보면 다음과 같습니다.

```text
=> mmc dev 0 0
=> mmc bootbus 0 2 0 0     # 또는 mmc rpmb 등 EXT_CSD를 만지는 명령
=> mmc ecsd                # 보드에 따라 추가 명령으로 활성
EXT_CSD[179]  PARTITION_CONFIG     = 0x48   # boot1, ack enabled
EXT_CSD[177]  BOOT_BUS_CONFIG       = 0x12   # 8-bit DDR boot
EXT_CSD[185]  HS_TIMING            = 0x02   # HS200
EXT_CSD[196]  DEVICE_TYPE          = 0x57   # HS200 1.8V·DDR50·HS400 가능
EXT_CSD[268]  PRE_EOL_INFO         = 0x01   # 정상
EXT_CSD[269]  DEVICE_LIFE_TIME_A   = 0x02   # 10~20% 사용
EXT_CSD[269]  DEVICE_LIFE_TIME_B   = 0x01   # 0~10% 사용
```

PARTITION_CONFIG와 BOOT_BUS_CONFIG는 다음 절에서 `mmc partconf`·`mmc bootbus`로 직접 만집니다. DEVICE_LIFE_TIME은 SLC 영역과 MLC 영역의 *마모도*를 0x01~0x0B 단계로 보고합니다. 양산 디바이스의 [13장](/blog/embedded/bootloader/chapter13-env-bootcmd) 헬스 체크에서 이 값을 주기적으로 읽어 SD swap 안내를 띄우는 패턴이 흔합니다.

스피드 모드는 EXT_CSD[185] HS_TIMING과 [196] DEVICE_TYPE이 결정합니다.

| 모드 | 클럭 | 데이터 비트 | DDR | 최대 throughput |
|------|------|-------------|-----|----------------|
| Default Speed | 26MHz | 1/4/8-bit | SDR | 26MB/s |
| High Speed (HS) | 52MHz | 4/8-bit | SDR | 52MB/s |
| DDR50 | 50MHz | 8-bit | DDR | 100MB/s |
| HS200 | 200MHz | 8-bit | SDR | 200MB/s |
| HS400 | 200MHz | 8-bit | DDR | 400MB/s |

부트 ROM은 보통 *Default Speed 1-bit*로 시작합니다. SPL이 EXT_CSD를 읽고 HS200·HS400으로 *upgrade*한 뒤 main U-Boot를 빠르게 로드합니다.

## eMMC boot partition 흐름 — boot0/boot1 자동 부팅

eMMC는 user area와 별도로 *boot0*·*boot1* 두 개의 boot partition을 가집니다. SoC의 부트 ROM은 *PARTITION_CONFIG가 가리키는 boot partition*을 읽습니다.

```text
EXT_CSD[179] PARTITION_CONFIG 비트 필드
  [7]   BOOT_ACK         — 1이면 부트 시작 시 R1 ack 전송
  [5:3] BOOT_PARTITION_ENABLE
        000 = boot disabled (user area에서 부팅 시도)
        001 = boot0
        010 = boot1
        111 = user area
  [2:0] PARTITION_ACCESS  — 현재 RW 대상 (커널 동작용)
```

`mmc partconf`가 이 바이트를 직접 씁니다.

```text
=> mmc partconf 0 1 1 1
# arg1=0 : MMC 디바이스 인덱스
# arg2=1 : BOOT_ACK 활성화
# arg3=1 : BOOT_PARTITION_ENABLE = 001 (boot0 사용)
# arg4=1 : PARTITION_ACCESS = 001 (boot0를 user 대상으로)

=> mmc partconf 0
EXT_CSD[179] = 0x49
  BOOT_ACK         = 1
  BOOT_PARTITION   = boot0
  PARTITION_ACCESS = boot0
```

여기에 BOOT_BUS_CONFIG(EXT_CSD[177])가 *부트 ROM이 boot partition을 읽을 때*의 버스 폭과 속도를 정합니다.

```text
=> mmc bootbus 0 2 0 0
# arg1=0 : 디바이스
# arg2=2 : BOOT_BUS_WIDTH = 8-bit
# arg3=0 : RESET_BOOT_BUS_COND = 1-bit로 reset 후 복귀
# arg4=0 : BOOT_MODE = SDR backward-compatible
```

A/B 부트 시스템에서는 boot0와 boot1에 *서로 다른 U-Boot 카피*를 두고, OTA 성공 시 PARTITION_CONFIG를 flip합니다. fail-safe 부트의 핵심 메커니즘입니다.

## SATA — `scsi` 명령

SATA SSD를 부트 디스크로 쓰는 시스템(예: NXP Layerscape, Marvell Armada)에서는 `scsi` 명령으로 디스크를 enumerate합니다.

```text
=> scsi scan
SCSI: scanning bus for devices...
  Device 0: (0:0) Vendor: ATA Prod.: Samsung SSD 870 Rev: 4B6Q
            Type: Hard Disk
            Capacity: 476940.0 MB = 465.7 GB
=> scsi part 0
Partition Map for SCSI device 0
Part  Start LBA    End LBA      Name
  1   0x00000800   0x000807ff   efi
  2   0x00080800   0x3a385bff   rootfs
=> load scsi 0:1 ${loadaddr} /Image
```

U-Boot의 SCSI 레이어는 *AHCI*나 *iEDMA* 컨트롤러 위에서 표준 SCSI 명령(READ(10), WRITE(10) 등)을 발행합니다. eMMC와 달리 boot partition이 없으므로, GPT의 첫 파티션에 *FAT*나 *ext4*로 부트 파일을 두고 그대로 읽습니다.

## NAND — UBI와 UBIFS

raw NAND는 *bad block*과 *ECC*를 펌웨어가 처리해야 합니다. 부트 ROM은 보통 NAND의 첫 몇 block을 hardware ECC로 읽어 SPL을 적재합니다. SPL과 main U-Boot 이후는 *UBI*(Unsorted Block Images)와 *UBIFS*가 표준입니다.

```text
=> nand info
Device 0: nand0, sector size 128 KiB
  Page size       2048 b
  OOB size          64 b
  Erase size    131072 b
  ecc strength       8 bit
  ecc step size    512 b
=> ubi part nand0
=> ubi info
UBI: attached mtd1 (name "nand0", size 4096 MiB)
UBI: max. sequence number:       42
=> ubifsmount ubi0:rootfs
=> ubifsload ${loadaddr} /boot/Image
```

UBI는 wear leveling과 bad block 관리를 펌웨어 레이어에서 처리하는 *로지컬 볼륨*입니다. NAND의 raw block 위에 PEB(Physical Erase Block)와 LEB(Logical Erase Block)의 매핑 테이블을 두고, write에서 자동으로 다른 PEB로 옮깁니다.

NAND를 쓰는 시스템의 부트 파티션 레이아웃은 보통 이렇습니다.

```text
Block 0~3   — SPL (hardware ECC, fixed location)
Block 4~7   — main U-Boot (still raw, sometimes redundant copies)
Block 8~9   — U-Boot env (redundant)
Block 10~   — UBI volume (rootfs, kernel, ...)
```

부트 ROM은 SPL을 hardware ECC로 읽는 것까지만 합니다. UBI 마운트는 main U-Boot가 합니다.

## NAND boot — page size·ECC·OOB layout

NAND를 부트 미디어로 쓰려면 *부트 ROM이 가정하는 page size와 ECC 알고리즘*을 정확히 맞춰야 합니다. 이 두 값이 어긋나면 SPL이 *읽히지 않습니다*. 다음은 i.MX8M의 `nand info` 출력과 OOB 레이아웃입니다.

```text
=> nand info
Device 0: nand0, sector size 128 KiB
  Manufacturer      Micron
  Chip ID           0x2c, 0xa1
  Page size         2048 bytes
  Spare area (OOB)  64 bytes
  Erase block       128 KiB (64 pages)
  Bus width         8 bit
  Plane count       1
  ECC strength      8 bit / 512 bytes
  ECC layout        BCH-8, BBT in last 4 blocks
  Total capacity    512 MiB

=> nand bad
Scanning bad blocks at offset 0x00000000
  Bad: 0x07c00000  (block 248)
  Bad: 0x1f400000  (block 1000)
```

page size와 ECC strength의 조합은 *SoC 부트 ROM이 컴파일 시점에 박힌 값*입니다. 다음 표는 i.MX 계열의 부트 ROM 가정입니다.

| Page size | OOB | ECC | 1KB당 ECC byte | 부트 ROM 가정 |
|-----------|-----|-----|----------------|---------------|
| 512B (legacy) | 16B | Hamming 1-bit | 3 | 잘 안 씀 |
| 2KB | 64B | BCH 4-bit | 7 | i.MX6/7 default |
| 2KB | 128B | BCH 8-bit | 13 | i.MX8M default |
| 4KB | 224B | BCH 16-bit | 26 | 최신 3D NAND |
| 4KB | 448B | BCH 24-bit | 42 | 고밀도 TLC |

ECC가 강할수록 OOB가 커집니다. *user data*와 *ECC byte*가 같은 OOB 영역을 두고 경쟁하므로, 부트 ROM이 *어디까지가 user OOB이고 어디부터가 ECC인지*에 대한 가정을 가지고 있습니다. Linux MTD가 같은 가정을 공유하지 않으면, SPL은 부팅되는데 *커널이 같은 NAND를 다시 읽으면 ECC 에러*가 나는 사태가 옵니다.

```text
=> nand dump 0x00000000
Page 00000000 dump:
   ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff
   ...
OOB:
   ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff
   ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff
   ff ff ff ff a3 91 7c 28  44 11 6a 8b cd ef 02 51
   ...                       └─ BCH ECC bytes (i.MX 가정)
```

부트 ROM은 *block 0*가 bad일 가능성도 처리해야 합니다. Micron·Macronix는 *factory guarantee*로 block 0를 양품으로 보장합니다. Toshiba 일부 모델은 *block 0가 bad일 수 있다*고 명시합니다. 후자에서는 부트 ROM이 redundant SPL을 *block 0~3*에 복제해 두는 패턴을 강제합니다. [28장](/blog/embedded/bootloader/chapter28-flash-layout)에서 redundant SPL 레이아웃을 더 다룹니다.

## SPI NOR Flash — `sf` 명령

소형 IoT 디바이스는 SPI NOR Flash를 부트 미디어로 자주 씁니다. 작은 용량(4~64MB), 빠른 random read, *byte-addressable*인 점이 장점입니다.

```text
=> sf probe 0:0
SF: Detected w25q256 with page size 256 Bytes, erase size 4 KiB, total 32 MiB
=> sf read ${loadaddr} 0x100000 0x800000   # offset 0x100000부터 8MB read
=> sf erase 0x100000 0x800000
=> sf write ${loadaddr} 0x100000 0x800000
```

`sf` 명령은 raw offset 기반입니다. 파티션 정보가 없으므로, 보드 정의에 *어디에 무엇이 있는지*를 환경 변수나 디바이스 트리에 박아 둡니다.

```c
/* include/configs/myboard.h — 부트 영역 정의 */
#define CONFIG_ENV_OFFSET       0x80000
#define CONFIG_ENV_SIZE         0x10000
#define CONFIG_SYS_SPI_KERNEL_OFFS  0x100000
#define CONFIG_SYS_SPI_DTB_OFFS     0x500000
```

SPI NAND는 `mtd` 서브시스템을 통해 UBI를 얹는 패턴이 일반적입니다. 작은 SoC에서는 raw `mtd read`도 씁니다.

## SPI flash — read 명령과 dummy cycle

SPI NOR의 throughput은 *어떤 read 명령*을 쓰느냐로 갈립니다. JEDEC 표준 명령은 다섯 가지가 있고, 각각 사용 가능한 *clock·line·dummy cycle*이 다릅니다.

| Opcode | 이름 | I/O 라인 | Dummy cycle | 최대 클럭 | 처리량 |
|--------|------|---------|-------------|----------|--------|
| 0x03 | Read | 1-1-1 | 0 | 50MHz | ~6MB/s |
| 0x0B | Fast Read | 1-1-1 | 8 | 133MHz | ~16MB/s |
| 0x3B | Fast Read Dual Output | 1-1-2 | 8 | 133MHz | ~32MB/s |
| 0x6B | Fast Read Quad Output | 1-1-4 | 8 | 133MHz | ~64MB/s |
| 0xEB | Fast Read Quad I/O | 1-4-4 | 6 | 133MHz | ~64MB/s |

0x03은 *dummy cycle이 없는* 단순 read입니다. 50MHz 이상으로 못 돌립니다. 그래서 부트 ROM은 *0x03*로 SPL을 천천히 읽는 일이 흔합니다. SPL 이후 U-Boot가 `sf` 드라이버를 통해 quad I/O 모드로 전환합니다.

```text
=> sf probe 0:0
SF: Detected w25q256 with page size 256 Bytes, erase size 4 KiB, total 32 MiB
=> sf probe 0:0 50000000 3       # 50MHz, mode 3 (CPOL=1, CPHA=1)
=> sf probe 0:0 100000000 0      # 100MHz quad I/O로 전환
SF: Detected w25q256 with quad I/O, 100MHz
```

dummy cycle 설정은 디바이스 트리에서 옵션으로 줍니다.

```text
&qspi {
    flash@0 {
        compatible = "winbond,w25q256", "jedec,spi-nor";
        reg = <0>;
        spi-max-frequency = <100000000>;
        spi-rx-bus-width = <4>;      /* quad output */
        spi-tx-bus-width = <4>;
        m25p,fast-read;              /* 0x0B 사용 */
    };
};
```

XIP(eXecute In Place)는 SPI NOR를 *메모리 매핑된 영역*으로 보고 CPU가 직접 fetch하는 모드입니다. QSPI 컨트롤러가 `0xEB` 명령을 자동 발행해 read 결과를 AHB 버스에 매핑합니다. 일부 SoC는 부트 ROM 자체가 XIP 모드로 들어가 SPL을 *복사하지 않고 그대로 실행*합니다. 단점은 dummy cycle과 latency 때문에 instruction fetch가 [26장](/blog/embedded/bootloader/chapter26-ddr-training)의 DDR보다 *10~50배* 느린 것입니다.

## 부트 미디어 성능 비교

같은 board에 같은 main U-Boot(~700KB)를 두고 미디어별 load time을 측정한 예시입니다. 환경은 i.MX8M Plus, 1.6GHz Cortex-A53, SD UHS-I 카드, eMMC 5.1 HS400, w25q256 quad-I/O 100MHz QSPI입니다.

| 미디어 | 명령 / 모드 | Burst rate | U-Boot 700KB load | 커널 8MB load |
|-------|------------|-----------|-------------------|---------------|
| SD UHS-I | CMD25 burst, 4-bit SDR104 | 80MB/s | 9ms | 100ms |
| SD UHS-I single-block | CMD17, 4-bit SDR104 | 35MB/s | 20ms | 230ms |
| eMMC HS200 | 8-bit, 200MHz SDR | 180MB/s | 4ms | 45ms |
| eMMC HS400 | 8-bit, 200MHz DDR | 380MB/s | 2ms | 22ms |
| SPI NOR 0x03 | 50MHz, 1-bit | 6MB/s | 117ms | 1330ms |
| SPI NOR 0xEB XIP | 100MHz quad I/O | 64MB/s | 11ms | 125ms |
| NAND 2KB | BCH-8, 8-bit, 50MHz | 25MB/s | 28ms | 320ms |
| SATA AHCI | NCQ, 6Gbps | 550MB/s | 1ms | 15ms |

CMD25(multi-block read)와 CMD17(single-block)의 차이가 *2배*입니다. SPL이 부트 ROM의 보수적인 single-block read로 시작하더라도, main U-Boot에서 multi-block으로 전환하면 커널 load가 빨라집니다.

SPI NOR XIP는 *load time이 0*인 대신 *execution time*이 느립니다. 0x03 모드 SPI는 부트 ROM 단계에서만 쓰고 *반드시* main U-Boot에서 quad I/O로 전환해야 합니다.

## 부트 미디어 전환 — SD → eMMC → OTA-only

양산 디바이스의 부트 미디어는 *수명 동안 세 단계*를 거칩니다.

1. **개발·초기 양산** — SD 카드 부팅. 카드만 갈아 끼우면 펌웨어 교체.
2. **본 양산** — eMMC 부팅. BOOTSEL fuse를 *블로우*해 eMMC fix.
3. **현장 배포 후** — OTA만으로 업데이트. recovery jumper로만 SD fallback.

각 단계의 변경은 *fuse*와 *PARTITION_CONFIG*가 결합한 결과입니다.

```text
# 단계 1 → 2 : eMMC를 부트 미디어로 고정
=> fuse prog -y 6 0x730 0x00000010        # BOOTSEL = eMMC
=> fuse prog -y 6 0x740 0x00000001        # BOOTSEL_OVERRIDE = enable
=> mmc partconf 0 1 1 0                   # boot0 활성화
=> mmc bootbus 0 2 0 0                    # 8-bit DDR

# 단계 2 → 3 : OTA-only 모드 진입
=> fuse prog -y 6 0x750 0x00000001        # Disable USB serial download
=> fuse prog -y 6 0x760 0x00000001        # Secure boot enforce
```

OTA 업데이트가 A/B partition을 쓰는 시스템에서, eMMC boot0와 boot1 *두 boot partition*을 A/B로 활용합니다. OTA 성공 시 `mmc partconf 0 1 2 0`로 flip하면, 다음 부트 ROM은 boot1을 읽습니다. fail-safe rollback은 그저 PARTITION_CONFIG를 한 번 더 flip하는 일입니다.

[Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update)에서 A/B 부트 메커니즘과 anti-rollback counter를 더 다룹니다.

## boot.scr — 스크립트로 묶기

위의 명령들은 *bootcmd*에 직접 넣을 수도 있지만, 보통은 `boot.scr` 파일에 묶어 부트 미디어에 둡니다.

```bash
# boot.cmd — 사람이 읽는 원본
setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait"
load mmc 0:1 ${kernel_addr_r} /boot/Image
load mmc 0:1 ${fdt_addr_r} /boot/board.dtb
booti ${kernel_addr_r} - ${fdt_addr_r}

# mkimage로 binary script 만들기
mkimage -A arm64 -O linux -T script -C none \
        -d boot.cmd boot.scr
```

`bootcmd`는 그저 `load mmc 0:1 ${loadaddr} boot.scr && source ${loadaddr}` 한 줄이면 됩니다. 부트 시나리오를 *파일 시스템 안*에 두는 것이라, 새 커널을 배포할 때 U-Boot 환경 변수를 건드리지 않아도 됩니다.

## GPT 파티션 생성 예시

호스트 PC에서 새 eMMC 또는 SD 카드에 GPT 파티션을 만드는 예시입니다.

```bash
# /dev/sdX를 새로 GPT로 초기화
sudo parted /dev/sdX mklabel gpt

# boot 파티션 (256MB, FAT32)
sudo parted /dev/sdX mkpart boot fat32 1MiB 257MiB
sudo parted /dev/sdX set 1 boot on

# rootfs 파티션 (나머지 전부, ext4)
sudo parted /dev/sdX mkpart rootfs ext4 257MiB 100%

# 파일 시스템 포맷
sudo mkfs.vfat -F 32 /dev/sdX1
sudo mkfs.ext4 /dev/sdX2

# 부트 파일 복사
sudo mount /dev/sdX1 /mnt
sudo cp Image board.dtb boot.scr /mnt/
sudo umount /mnt
```

U-Boot에서 파티션 정보를 확인합니다.

```text
=> gpt verify mmc 0 "name=boot,size=256MiB;name=rootfs,size=-"
Verify GPT: success!
```

## 자주 하는 실수

- **eMMC user area에 U-Boot를 씁니다.** GPT 파티션 0번에 U-Boot를 dd로 쓰면 GPT 헤더가 깨집니다. boot partition을 쓰거나 GPT의 first usable LBA 이전 영역에 두세요.
- **NAND를 dd로 직접 씁니다.** raw NAND는 bad block과 ECC가 필요합니다. `dd if=img of=/dev/mtd0`는 bad block을 건너뛰지 않습니다. `nandwrite`나 `flash_erase`를 쓰세요.
- **SPI Flash 영역이 겹칩니다.** U-Boot env와 kernel image가 같은 sector에 들어가면 `saveenv`가 kernel을 깨뜨립니다. offset을 *erase size 단위*로 정렬하세요.
- **boot partition을 active로 설정하지 않습니다.** `mmc partconf 0 1 1 0`(boot 0 선택)인데 데이터를 boot 1에 썼다면 부트 ROM은 비어 있는 boot 0을 읽습니다.
- **distroboot 변수가 없는 보드에서 `boot.scr`를 찾지 못합니다.** `${prefix}/boot.scr`의 prefix가 `/boot/`인지 `/`인지 보드마다 다릅니다.
- **GPT 파티션 테이블이 호스트와 U-Boot에서 불일치합니다.** 호스트가 *protective MBR*만 보고 GPT를 무시하면 U-Boot의 `gpt verify`가 통과해도 Linux가 fail합니다. 양쪽 모두에서 `parted print` 또는 `gpt read`로 동일 PARTUUID를 확인하세요.
- **eMMC partition이 BOOT_ACK 없이 활성됩니다.** `mmc partconf 0 0 1 1`처럼 ACK를 0으로 두면 부트 ROM이 *ack timeout*으로 fallback 미디어를 찾습니다. 의도하지 않은 SD 부팅 또는 USB recovery 진입의 원인입니다.
- **SPI flash dummy cycle을 잘못 설정합니다.** w25q256의 quad I/O는 *6 dummy cycle*이 기본인데, 일부 디바이스 트리는 다른 패밀리에서 복사돼 *8 cycle*로 박혀 있습니다. read 결과가 *1 byte씩 밀려* 들어오면서 magic number 검증이 실패합니다. 데이터시트의 "Default Dummy Cycles" 표를 확인하세요.
- **NAND ECC strength가 SPL과 main U-Boot에서 다릅니다.** SPL이 BCH-4로 SPL 영역을 읽고, main U-Boot가 BCH-8 가정으로 같은 NAND 후반부를 읽으면 같은 PEB가 *둘 중 한쪽에서만* 읽힙니다. 보드 정의 헤더의 `CONFIG_NAND_ECC_STRENGTH`를 한 자리에서 관리하세요.

## 정리

- 부트 미디어는 BOOTSEL 핀이 결정합니다. 양산 보드는 jumper로 USB recovery 경로를 둡니다.
- eMMC는 *boot partition*에 SPL/U-Boot를 넣고, user area는 GPT로 자유롭게 쓸 수 있습니다.
- SATA는 `scsi scan`으로 enumerate하고, 일반 파티션의 파일을 그대로 읽습니다.
- NAND는 hardware ECC가 필수이고, U-Boot 이후는 *UBI*가 사실상의 표준입니다.
- SPI NOR는 raw offset 기반입니다. 영역 분할은 보드 정의에 박아 둡니다.
- `boot.scr`는 부트 시나리오를 파일 시스템에 두는 패턴입니다. 환경 변수 의존을 줄입니다.

## 다음 장 예고

다음 글에서는 *네트워크 부트*를 봅니다. DHCP, TFTP, PXE의 단계와 U-Boot에서 *distroboot*가 네트워크 부트를 어떻게 통합하는지를 정리합니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — 스토리지 부트의 전 단계
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 디스크가 없는 부트
- [Ch 12: USB 부트와 download mode](/blog/embedded/bootloader/chapter12-usb-boot) — recovery jumper의 종착지
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — `bootcmd`의 구조
- [Ch 26: DDR 컨트롤러](/blog/embedded/bootloader/chapter26-ddr-training) — XIP와 DDR fetch의 속도 차
- [Ch 28: Flash 레이아웃](/blog/embedded/bootloader/chapter28-flash-layout) — redundant SPL과 partition 설계
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — rootfs 이미지 포맷
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — 부트 파티션과 OTA
