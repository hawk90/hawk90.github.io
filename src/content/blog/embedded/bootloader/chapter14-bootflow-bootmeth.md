---
title: "Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석"
slug: "embedded/bootloader/chapter14-bootflow-bootmeth"
date: 2026-05-09T09:14:00
description: "U-Boot Standard Boot의 bootdev·bootmeth·bootflow 모델과 보드별 migration 확인."
series: "Bootloader Internals"
seriesOrder: 14
tags: [embedded, bootloader, u-boot, bootflow, bootmeth]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**Standard Boot는 U-Boot에 내장된 자동 부트 기능이며 bootdev, bootmeth, bootflow 개념을 사용합니다.** 일부 환경 스크립트 의존을 줄일 수 있지만, 보드 설정과 환경 변수로 검색 순서를 조정할 수 있고 기존 distro boot와 기능 범위가 완전히 같다고 가정하면 안 됩니다.

[13장](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 본 distro_bootcmd는 환경 스크립트로 구성할 수 있으며, 그 길이와 복잡성은 보드별 설정에 따라 달라집니다. Standard Boot는 자동 부트를 더 내장된 방식으로 일반화합니다. `bootmeth`는 bootdev에서 bootflow를 찾는 방식이고, `bootflow`는 부트 방법과 파일 등으로 표현되는 부트 항목입니다.

이 글에서는 두 개념의 모델, 사용 명령, 주요 bootmeth 드라이버, 그리고 distro_bootcmd에서 migration 경로를 정리합니다.

## 모델 — bootdev, bootmeth, bootflow

세 가지 추상을 구분합니다.

| 개념 | 의미 | 예 |
|------|------|-----|
| `bootdev` | 부트할 수 있는 장치 | mmc0, usb0, ethernet0 |
| `bootmeth` | 부트 방법(드라이버) | extlinux, EFI, sandbox, script, pxe |
| `bootflow` | 찾아낸 부트 항목의 설명 | "파티션의 extlinux 설정 파일" |

부트는 다음 흐름입니다.

1. bootdev 목록 = U-Boot가 인식한 부트 장치.
2. bootmeth 목록 = 빌드 시 포함된 부트 방법 드라이버.
3. Standard Boot가 bootdev와 bootmeth를 순회해 부트 항목을 찾습니다. 일부 bootmeth는 자체적으로 bootdev를 선택합니다.
4. 유효한 bootflow를 찾으면 설정된 순서와 정책에 따라 부팅을 시도합니다.

bootflow는 단순히 bootdev와 bootmeth의 모든 곱 조합을 의미하지 않으며, 배포판이 제공한 부트 설정 파일도 U-Boot 코드와 구분됩니다.

## bootflow 명령

명령과 사용 가능한 옵션은 U-Boot 버전 및 `CONFIG_BOOTSTD_FULL` 설정에 따라 달라집니다. 다음 출력은 형식 설명용이며 실제 보드에서 수집한 로그가 아닙니다.

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

`scan`, `list`, `select`, `info`, `read`, `boot`가 주요 명령입니다. 일부 기능은 `CONFIG_BOOTSTD_FULL`이 필요합니다. `bootflow boot`는 선택된 flow를 실행합니다. `bootflow scan -b`는 검색 중 첫 valid bootflow를 부팅하도록 요청합니다. 실제 scan 범위와 결과는 활성 bootdev/bootmeth, 설정, 매체에 따라 달라집니다.

`bootcmd=bootflow scan -b`는 Standard Boot를 시작하는 한 가지 설정 예입니다. 이것이 기존 distro_bootcmd와 동등한 대상·우선순위·fallback을 제공하는지는 보드별로 확인해야 합니다.

## 주요 bootmeth 드라이버

Standard Boot의 bootmeth는 개별 Kconfig 옵션과 설정에 따라 사용할 수 있습니다. 이름과 지원 범위는 선택한 U-Boot tag의 문서 및 소스를 확인해야 합니다.

| Bootmeth | 설명 | 입력 파일 |
|----------|------|-----------|
| `distro` | extlinux 형식 부트 설정 검색 | 파일시스템의 extlinux 설정 |
| `efi` | EFI 실행 파일을 통한 부팅 | 보드/매체에 구성된 EFI 경로 |
| `efi_mgr` | EFI Boot Manager 경로 | EFI 변수와 구현 설정에 의존 |
| `pxe` | 네트워크 bootflow 검색 | U-Boot 구현의 PXE/extlinux 경로 |
| `script` | U-Boot script 실행 | 보드 설정의 검색 경로 |
| 기타 | Android, ChromiumOS, VBE, sandbox 등 | 각 구현과 설정에 의존 |

기본 bootmeth 순서와 선택 방법은 Standard Boot 설정에 따릅니다. `CONFIG_BOOTSTD_FULL`을 사용하는 경우 `bootmeths` 환경 변수 등으로 순서를 제어할 수 있습니다. DTS bootmeth 구성은 설정에 따라 자동 생성 동작에도 영향을 줄 수 있습니다.

```text
=> bootmeth list
<실제 목록과 순서는 빌드 및 설정에 따라 다름>

# CONFIG_BOOTSTD_FULL이 활성화된 빌드에서 지원 여부를 확인한 뒤 사용
=> setenv bootmeths "efi distro"
```

## extlinux bootmeth — 가장 흔한 경로

U-Boot의 `distro` bootmeth는 extlinux 형식 설정 파일을 읽을 수 있습니다. 어떤 OS 배포판이 해당 설정을 설치하는지는 배포판과 이미지 구성에 따라 다릅니다.

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

설정이 검색되어 유효 bootflow가 되면 관련 bootmeth가 파일을 해석합니다. 처리 가능한 지시어와 지원 범위는 U-Boot 버전 및 빌드 옵션에 따라 다르므로 실제 대상에서 검증해야 합니다.

부트 이미지를 *파일 시스템 안에서* 관리하는 점이 핵심입니다. 새 커널을 배포할 때 U-Boot 환경은 그대로 두고, `extlinux.conf`와 `Image`만 교체합니다.

## EFI bootmgr — EFI 환경에서

U-Boot에는 EFI 실행 및 EFI Boot Manager 지원이 있으며, SystemReady IR 적합성은 시스템 전체의 요구 사항과 검증 범위에 따릅니다.

```text
=> bootflow scan
=> bootflow list
Seq  Method       State   Uclass    Part  Name
---  -----------  ------  --------  ----  ------------------------
  0  efi          ready   mmc          1  EFI/boot/bootaa64.efi
  1  efi_mgr      ready   (none)    -     <efi_bootmgr>
```

EFI Boot Manager 경로는 EFI 변수 및 U-Boot의 EFI 구현에 의존합니다. EFI bootflow 목록에 표시되는 방식과 해당 기능의 가용성은 빌드 및 플랫폼 설정에 따라 확인해야 합니다.

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

EFI 경로를 통해 일부 배포판의 EFI 애플리케이션을 ARM 보드에서 실행할 수 있습니다. 호환성과 SystemReady IR 적합성은 이미지, firmware 및 시스템 요구사항으로 확인해야 합니다.

## 보드 정의에서의 활성화

기존 보드에서 Standard Boot로 전환할 때는 해당 U-Boot tag의 migration 안내와 보드별 Kconfig, DTS, 환경 설정을 함께 검토합니다. 아래는 보편적으로 적용 가능한 설정 처방이 아닙니다.

```text
# defconfig
CONFIG_BOOTSTD=y                  # 새 모델 활성화
CONFIG_BOOTSTD_DEFAULTS=y         # 기본 bootmeth 모음
# 각 bootmeth와 전체 명령의 Kconfig option은 선택한 tag에서 확인
```

환경 변수의 `bootcmd`를 단순화합니다.

```text
# 기존
bootcmd=run distro_bootcmd

# 새 모델
bootcmd=bootflow scan -b
```

옛 스크립트 전용 변수를 제거할 수 있는지는 보드와 다른 bootcmd 사용처를 먼저 확인해야 합니다. Standard Boot도 `boot_targets` 및 bootmeth 순서 설정을 사용할 수 있으므로 무조건 삭제하지 않습니다.

## bootmeth 드라이버 작성

새 부트 형식을 추가하는 방법은 bootmeth 구현을 작성하는 것이지만, API는 선택한 tag의 소스와 문서에서 확인해야 합니다.

```c
/* 개념 설명용 pseudocode: 컴파일 가능한 U-Boot 드라이버 예제가 아님 */
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

예시의 함수 원형과 멤버 이름은 tag별 API 확인 없이 복사하지 마세요. 실제 구현 계약은 선택한 U-Boot 버전의 `bootmeth` uclass/API를 따라야 합니다.

- `check` — 이 bootdev에서 이 bootmeth가 의미 있는지 빠른 사전 검사.
- `read_bootflow` — 부트 자원(파일 등)을 적재하고, bootflow 구조에 채워 넣는다.
- `boot` — 실제 부트 명령 실행.

표준 bootmeth 구현은 U-Boot driver model과 테스트 체계에 통합할 수 있습니다. 기존 환경 스크립트와 비교해 필요한 기능 및 오류 복구가 보존되는지 개별 보드에서 검토해야 합니다.

## 자주 하는 실수

- **명령 사용 가능 범위를 확인하지 않았습니다.** 일부 `bootflow` 기능과 `bootmeths` 조정은 `CONFIG_BOOTSTD_FULL`에 의존하므로 defconfig와 해당 tag 문서를 확인합니다.
- **이전 설정을 무조건 초기화합니다.** `boot_targets`는 Standard Boot에서도 사용될 수 있습니다. `env default -a`와 `saveenv`는 지속 환경을 바꾸므로 board-specific recovery 절차 없이 실행하지 않습니다.
- **bootmeth 순서를 가정합니다.** 기본 순서, 가능한 override, `CONFIG_BOOTSTD_FULL` 의존성 및 전역 bootmeth 처리는 tag 문서에서 확인합니다.
- **EFI Boot Manager 등록과 파일 검색을 같은 경로로 간주합니다.** 지원되는 경로와 필요한 EFI 변수는 선택한 빌드의 EFI 문서와 platform 설정에서 확인합니다.
- **중복 scan을 단정합니다.** 실제 반복 여부는 bootdev, bootmeth, hunters, 설정 조합에 달려 있습니다. `bootflow scan -l`의 대상 로그로 재현합니다.

## 정리

- Standard Boot는 내장 자동 부트 기능으로 bootdev, bootmeth 및 bootflow를 사용합니다.
- 검색 순서와 bootflow 생성 방식은 선택한 bootmeth, 설정 및 매체에 따라 달라집니다.
- bootflow 명령의 상세 옵션은 U-Boot tag 및 `CONFIG_BOOTSTD_FULL` 설정에 따라 다릅니다.
- 지원 bootmeth 이름과 파일 검색 경로는 선택한 U-Boot tag와 빌드 설정에서 확인합니다.
- `bootcmd=bootflow scan -b`는 적절히 구성된 빌드에서 부트 시도를 시작하는 한 방법입니다. 기존 기능과 동등한지는 보드별 검증이 필요합니다.
- 새 bootmeth는 tag별 driver-model API와 테스트 요구사항을 따라 구현해야 합니다.
- EFI Boot Manager 지원만으로 SystemReady IR 적합성이 보장되지는 않습니다.

## 다음 장 예고

다음 글에서는 *FIT image*를 봅니다. kernel·DTB·ramdisk를 한 컨테이너로 묶고, hash와 서명으로 검증하는 표준 포맷입니다.

## 관련 항목

- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 옛 distro_bootcmd
- [Ch 15: FIT image](/blog/embedded/bootloader/chapter15-fit-image) — bootflow가 다루는 이미지 포맷
- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — efi_mgr bootmeth의 자세한 동작
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 bootflow 활성화
- [U-Boot v2025.01 Standard Boot](https://docs.u-boot.org/en/v2025.01/develop/bootstd/index.html)
- [U-Boot v2025.01 bootflow command](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootflow.html)
