---
title: "Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석"
date: 2026-05-09T09:14:00
description: "U-Boot의 새로운 부트 모델 — bootflow / bootmeth로 distro_bootcmd 스크립트를 대체."
series: "Bootloader Internals"
seriesOrder: 14
tags: [embedded, bootloader, u-boot, bootflow, bootmeth]
draft: false
---

## 한 줄 요약

**bootflow와 bootmeth는 U-Boot 2023년 즈음부터 distro_bootcmd 환경 스크립트를 대체하기 위해 도입된 *C 코드 기반의 부트 추상화*입니다.** 부트 방법(method)과 시도된 부트 시나리오(flow)를 코드로 다루고, 환경 변수 의존을 줄입니다.

[13장](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 본 distro_bootcmd는 수백 줄의 환경 변수 스크립트입니다. 디버깅이 어렵고, 한 변수만 잘못 지워도 부트가 꼬입니다. 보드 메인테이너가 늘 보드별로 손봐야 합니다. U-Boot 커뮤니티는 이 문제를 *코드 모듈*로 옮기기로 했습니다. 결과가 `bootmeth`(부트 방법 드라이버)와 `bootflow`(시도된 부트 시나리오)입니다.

이 글에서는 두 개념의 모델, 사용 명령, 주요 bootmeth 드라이버, 그리고 distro_bootcmd에서 migration 경로를 정리합니다.

## 모델 — bootdev × bootmeth = bootflow

세 가지 추상을 구분합니다.

| 개념 | 의미 | 예 |
|------|------|-----|
| `bootdev` | 부트할 수 있는 장치 | mmc0, usb0, ethernet0 |
| `bootmeth` | 부트 방법(드라이버) | extlinux, EFI, sandbox, script, pxe |
| `bootflow` | 시도된 (bootdev, bootmeth) 조합 | "mmc0의 첫 파티션에서 extlinux 시도" |

부트는 다음 흐름입니다.

1. bootdev 목록 = U-Boot가 인식한 부트 장치.
2. bootmeth 목록 = 빌드 시 포함된 부트 방법 드라이버.
3. 각 bootdev × bootmeth 조합을 시도 → bootflow 생성.
4. 성공한 bootflow를 boot.

distro_bootcmd가 *환경 변수의 텍스트로 표현한 외곽선*이라면, bootflow는 *C 코드의 데이터 구조*입니다.

## bootflow 명령

U-Boot 2023.07부터 표준 명령으로 들어 있습니다.

```text
=> bootflow scan -l
Scanning for bootflows in all bootdevs
Seq  Method       State   Uclass    Part  Name                      Filename
---  -----------  ------  --------  ----  ------------------------  ----------------
  0  extlinux     ready   mmc          1  mmc@30b40000.bootdev.part_1  /extlinux/extlinux.conf
  1  efi          ready   mmc          1  mmc@30b40000.bootdev.part_1  efi/boot/bootaa64.efi
  2  extlinux     ready   usb          1  usb_mass_storage.lun0.bootdev.part_1
  3  pxe          ready   ethernet  -     ethernet@30be0000.bootdev
---  -----------  ------  --------  ----  ------------------------  ----------------
(4 bootflows, 4 valid)

=> bootflow list
Showing all bootflows
Seq  Method       State   Uclass    Part  Name
---  -----------  ------  --------  ----  ------------------------
  0  extlinux     ready   mmc          1  mmc@30b40000.bootdev.part_1
  1  efi          ready   mmc          1  mmc@30b40000.bootdev.part_1
  ...

=> bootflow select 0
=> bootflow info
Name:      mmc@30b40000.bootdev.part_1
Device:    mmc@30b40000.bootdev
Block dev: mmc@30b40000.blk
Method:    extlinux
State:     ready
Partition: 1
Subdir:    (none)
Filename:  /extlinux/extlinux.conf
Buffer:    7df50000
Size:      241 (577 bytes)

=> bootflow boot
```

scan, list, select, info, boot 다섯 개가 핵심입니다. `bootflow boot`는 선택된 flow를 실행합니다. `bootflow scan -b`는 *scan + 첫 번째 valid flow boot*입니다.

`bootcmd=bootflow scan -b`만 두면 distro_bootcmd 전체를 대체합니다.

## 주요 bootmeth 드라이버

빌드 시 `CONFIG_BOOTMETH_*`로 포함을 선택합니다.

| Bootmeth | 설명 | 입력 파일 |
|----------|------|-----------|
| `extlinux` | Syslinux 호환 `extlinux.conf` 해석 | `/extlinux/extlinux.conf` |
| `efi` | EFI 부트 매니저, `bootaa64.efi` 등 실행 | `EFI/boot/bootaa64.efi` |
| `script` | `boot.scr` 형식 스크립트 실행 | `/boot.scr` |
| `pxe` | PXE 사양에 따른 네트워크 부트 | `pxelinux.cfg/default` |
| `sandbox` | sandbox 빌드의 테스트용 | (host fs) |
| `cros` | Chromium OS 부트 헤더 | (verified boot) |
| `vbe_simple` | Verified Boot for Embedded | (FIT image) |

같은 보드에서 *여러 bootmeth*가 활성이면 *순서대로 시도*합니다. 순서는 `bootmeths` 환경 변수 또는 device tree의 `/bootstd` 노드로 정합니다.

```text
=> bootmeth list
Order  Seq  Name                Description
-----  ---  ------------------  -----------------------------------
    0    0  extlinux            Extlinux boot from a block device
    1    1  efi                 EFI boot from an .efi file
    2    2  pxe                 PXE boot from a network device
    3    3  script              Script boot from a block device

=> setenv bootmeths "efi extlinux"     # efi 우선
```

## extlinux bootmeth — 가장 흔한 경로

리눅스 distro의 표준은 *extlinux*입니다. Debian, Fedora 등이 `extlinux.conf`를 적재용 파일로 만들어 둡니다.

```text
# /extlinux/extlinux.conf
timeout 30
default linux

label linux
    menu label Linux 6.6
    linux /boot/Image
    fdt /boot/myboard.dtb
    initrd /boot/initramfs.cpio
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

label linux-old
    menu label Linux 6.1 (fallback)
    linux /boot/Image.old
    fdt /boot/myboard.dtb
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait
```

`bootflow boot`에 들어가면 extlinux bootmeth가 이 파일을 파싱해, `kernel + fdt + initrd + append`를 정확히 적재합니다. 환경 변수에 일일이 적을 필요가 없습니다.

부트 이미지를 *파일 시스템 안에서* 관리하는 점이 핵심입니다. 새 커널을 배포할 때 U-Boot 환경은 그대로 두고, `extlinux.conf`와 `Image`만 교체합니다.

## EFI bootmgr — EFI 환경에서

U-Boot의 EFI 구현은 *ARM SystemReady IR*의 핵심입니다. SystemReady IR 인증 보드는 *EFI에서 부팅*하는 표준 경로를 가져야 합니다.

```text
=> bootflow scan
=> bootflow list
Seq  Method       State   Uclass    Part  Name
---  -----------  ------  --------  ----  ------------------------
  0  efi          ready   mmc          1  EFI/boot/bootaa64.efi
  1  efi_mgr      ready   (none)    -     <efi_bootmgr>
```

`efi_mgr` bootmeth는 *EFI BootOrder NVRAM 변수*를 따라 부트합니다. GRUB이나 systemd-boot 같은 distro 부트로더가 EFI 변수에 자기 자신을 등록하면, U-Boot가 그것을 honor합니다.

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

EFI 경로를 통해 *PC와 동일한 distro 이미지*를 ARM 보드에서 그대로 부팅할 수 있습니다. 이것이 SystemReady IR의 핵심 목적입니다.

## 보드 정의에서의 활성화

기존 보드에서 bootflow로 옮기려면 *Kconfig 옵션*과 *환경 변수*를 조정합니다.

```text
# defconfig
CONFIG_BOOTSTD=y                  # 새 모델 활성화
CONFIG_BOOTSTD_DEFAULTS=y         # 기본 bootmeth 모음
CONFIG_BOOTMETH_EXTLINUX=y
CONFIG_BOOTMETH_EFI=y
CONFIG_BOOTMETH_PXE=y
CONFIG_BOOTMETH_SCRIPT=y
CONFIG_DISTRO_DEFAULTS=n          # 기존 distro_bootcmd 끄기
CONFIG_CMD_BOOTFLOW=y
CONFIG_CMD_BOOTFLOW_FULL=y
```

환경 변수의 `bootcmd`를 단순화합니다.

```text
# 기존
bootcmd=run distro_bootcmd

# 새 모델
bootcmd=bootflow scan -b
```

distro_bootcmd가 쓰던 `boot_targets`, `mmc_boot`, `scan_dev_for_boot_part` 같은 변수를 *모두 삭제*해도 됩니다. C 코드의 bootdev가 그 역할을 합니다.

## bootmeth 드라이버 작성

새 부트 형식을 추가하려면 *bootmeth 드라이버*를 만듭니다.

```c
/* boot/bootmeth_mycustom.c */
static int mycustom_check(struct udevice *dev, struct bootflow_iter *iter)
{
    /* 이 bootdev가 이 bootmeth를 시도할 가치가 있는지 판단 */
    if (!bootflow_iter_check_blk(iter))
        return -ENOTSUPP;
    return 0;
}

static int mycustom_read_bootflow(struct udevice *dev, struct bootflow *bflow)
{
    /* 파티션을 마운트하고, 내가 처리할 파일을 찾고, bflow에 적재 */
    int ret = bootmeth_check_fs(bflow);
    if (ret) return ret;

    ret = bootmeth_alloc_file(bflow, "/mycustom/boot.cfg",
                              0x10000, &bflow->buf, &bflow->size);
    if (ret) return ret;

    bflow->state = BOOTFLOWST_READY;
    return 0;
}

static int mycustom_boot(struct udevice *dev, struct bootflow *bflow)
{
    /* 적재된 파일을 해석해 부트 실행 */
    /* run_command 등으로 처리 */
    return 0;
}

static struct bootmeth_ops mycustom_ops = {
    .check          = mycustom_check,
    .read_bootflow  = mycustom_read_bootflow,
    .boot           = mycustom_boot,
};

U_BOOT_DRIVER(bootmeth_mycustom) = {
    .name   = "bootmeth_mycustom",
    .id     = UCLASS_BOOTMETH,
    .ops    = &mycustom_ops,
    .priv_auto = sizeof(struct mycustom_priv),
};
```

세 함수가 핵심입니다.

- `check` — 이 bootdev에서 이 bootmeth가 의미 있는지 빠른 사전 검사.
- `read_bootflow` — 부트 자원(파일 등)을 적재하고, bootflow 구조에 채워 넣는다.
- `boot` — 실제 부트 명령 실행.

distro_bootcmd 시절 *환경 변수 100줄*로 표현하던 로직이 *C 함수 세 개*로 표현됩니다. 디버거를 붙일 수 있고, 단위 테스트도 가능합니다.

## 자주 하는 실수

- **`CONFIG_BOOTSTD_FULL=y`를 끄고 `bootflow scan -b`만 의존합니다.** `_FULL`이 없으면 GUI(menu)·자세한 정보 표시 같은 부분이 빠집니다. dev 단계에서는 켜 두는 게 편합니다.
- **distro_bootcmd 변수가 *그대로 남아* 충돌합니다.** `boot_targets`이 살아 있으면 옛 로직이 같이 동작합니다. `env default -a; saveenv`로 깨끗이 시작하세요.
- **bootmeth 우선순위를 잊습니다.** EFI와 extlinux가 같은 파티션에 모두 있으면 *순서대로* 시도합니다. `bootmeths` 변수나 device tree에서 의도한 순서로 정렬하세요.
- **EFI bootmgr 변수가 *비어 있어* 부팅 안 됩니다.** distro가 EFI에 자기를 등록하지 않은 상태에서 `efi_mgr` bootmeth만 활성이면 부트 후보가 0개입니다. `efidebug boot add`로 수동 등록하거나 `efi` bootmeth(direct file)을 같이 켜세요.
- **`bootflow scan`이 같은 미디어를 두 번 봅니다.** `bootmeths` 변수에 *중복 항목*이 있으면 같은 파티션을 여러 번 스캔합니다. 깨끗하게 정리하세요.

## 정리

- bootflow/bootmeth는 distro_bootcmd 환경 스크립트를 *C 코드*로 옮긴 모델입니다.
- bootdev(장치) × bootmeth(방법)의 조합이 bootflow(시도)입니다.
- 명령 다섯 개(scan, list, select, info, boot)로 모든 흐름을 제어합니다.
- 주요 bootmeth는 extlinux, efi, script, pxe입니다.
- `bootcmd=bootflow scan -b` 한 줄이 distro_bootcmd 전체를 대체합니다.
- 새 부트 형식은 *bootmeth 드라이버*로 추가합니다. C 함수 세 개를 채우면 됩니다.
- EFI bootmgr 경로가 SystemReady IR의 표준 진입점입니다.

## 다음 장 예고

다음 글에서는 *FIT image*를 봅니다. kernel·DTB·ramdisk를 한 컨테이너로 묶고, hash와 서명으로 검증하는 표준 포맷입니다.

## 관련 항목

- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 옛 distro_bootcmd
- [Ch 15: FIT image](/blog/embedded/bootloader/chapter15-fit-image) — bootflow가 다루는 이미지 포맷
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — efi_mgr bootmeth의 자세한 동작
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 bootflow 활성화
- [U-Boot Standard Boot 문서](https://docs.u-boot.org/en/latest/develop/bootstd/index.html)
