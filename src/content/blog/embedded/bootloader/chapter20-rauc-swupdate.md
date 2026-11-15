---
title: "임베디드 펌웨어 업데이트 — RAUC vs SWUpdate 비교"
slug: "embedded/bootloader/chapter20-rauc-swupdate"
date: 2026-05-09T09:20:00
description: "U-Boot와 통합되는 펌웨어 업데이트 프레임워크 — RAUC와 SWUpdate의 비교와 적용."
series: "Bootloader Internals"
seriesOrder: 20
tags: [embedded, bootloader, u-boot, rauc, swupdate, ota]
draft: false
topics: ["embedded"]
---

RAUC와 SWUpdate는 업데이트 artifact를 검증·설치하는 framework입니다. 어느 쪽도 U-Boot의 A/B slot script, storage layout, health policy를 보드 설정 없이 자동으로 만들어 주지 않습니다. 이 장은 RAUC 1.15 문서와 SWUpdate 2026.05 문서를 기준으로 interface 차이를 정리합니다.

## 한 줄 요약

**RAUC는 signed bundle과 configured slot/bootloader integration을 제공하고, SWUpdate는 `sw-description`이 정의하는 image/file/bootenv 작업을 제공합니다.** A/B 선택, boot success 판단, rollback은 제품의 bootloader contract와 일치해야 합니다.

## 업데이트 경계

보드에서 확인할 계약은 다음과 같습니다.

1. 업데이트할 inactive target과 booted slot을 어떻게 찾는가.
2. bundle signature, compatible/revision, artifact hashes를 어떤 정책으로 검증하는가.
3. 어떤 device/partition에 image를 기록하며 interruption 시 기존 bootable system을 어떻게 보존하는가.
4. U-Boot environment 또는 다른 bootchooser state를 어떤 interface로 갱신하는가.
5. 어떤 health check가 성공을 결정하고 실패 뒤 누가 fallback을 수행하는가.

문서에 명시한 bundle format이나 command example만으로 실제 제품의 atomicity, power-loss safety 및 recovery를 판정하지 않습니다.

## 기능 차이

| 주제 | RAUC | SWUpdate |
|------|------|----------|
| Description | `system.conf`와 `manifest.raucm` | 기본 parser는 libconfig 문법의 `sw-description`; 다른 parser도 구성 가능 |
| Container | bundle; signing/keyring과 bundle format은 RAUC configuration에 따름 | `.swu`는 기본적으로 cpio container이며 `sw-description`이 archive 첫 항목 |
| Slot selection | system.conf의 slot/bootname과 bootloader backend; U-Boot에는 matching script 필요 | image target, `bootenv`, collection/mode를 description과 invocation/config로 정함 |
| Success state | RAUC status/D-Bus API로 booted slot good/bad 표시 가능 | update transaction marker/state와 product-specific health/boot policy를 연동 |
| Extension | system/install/slot hooks와 handlers | handlers, Lua/shell scripts, webserver/Suricatta는 build/runtime configuration에 따름 |

각 문서의 version, build options, target configuration이 기능 가용성과 구문을 결정합니다.

## RAUC 설정과 bootchooser

RAUC의 U-Boot backend는 `bootloader=uboot`, slot bootname과 별도의 U-Boot script를 요구합니다. 기본 interface는 `BOOT_ORDER`와 `BOOT_<bootname>_LEFT` 변수를 이용합니다. 따라서 slot bootname `A`/`B`를 설정하면 예시 변수는 `BOOT_A_LEFT`/`BOOT_B_LEFT`이며, `BOOT_SLOT`을 자동으로 바꾼다고 가정하지 않습니다. Script의 boot command와 storage mapping은 제품에 맞춰야 합니다.

다음은 RAUC 문서 형식에 맞춘 축약 예시입니다. target slot device, type와 keyring은 보드에서 확정해야 합니다.

```ini
# /etc/rauc/system.conf
[system]
compatible=boardx-v1
bootloader=uboot

[keyring]
path=/etc/rauc/keyring.pem

[slot.rootfs.0]
device=/dev/mmcblk0p2
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/mmcblk0p3
type=ext4
bootname=B
```

```ini
# bundle input directory의 manifest.raucm
[update]
compatible=boardx-v1
version=1.2.3

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4
```

Build host에서 bundle을 만들고 target에서 install할 수 있습니다. 아래 명령은 syntax example이며 이 작업에서 실행하거나 target에 설치하지 않았습니다.

```bash
rauc --cert=<certificate.pem> --key=<private-key.pem> bundle <input-dir> <bundle.raucb>
rauc install <bundle.raucb>
rauc status mark-good booted
```

`mark-good`은 RAUC의 slot state interface를 통해 요청합니다. 이를 `fw_setenv bootcount=0` 또는 `upgrade_available=0`과 동일하다고 일반화하지 않습니다. Bootcount/attempt persistence는 연결한 bootchooser script와 board config에 따릅니다.

## SWUpdate description과 A/B

SWUpdate의 기본 `sw-description` parser는 YAML이 아니라 libconfig 문법을 사용합니다. `.swu` archive에 description을 먼저 넣고 images/scripts 등을 뒤에 포함합니다. `bootenv`는 지정한 U-Boot environment variables를 갱신하는 mechanism이지 자동 A/B policy가 아닙니다.

```text
software =
{
    version = "1.2.3";
    hardware-compatibility = [ "boardx-revA" ];
    images: (
        {
            filename = "rootfs.ext4";
            device = "/dev/mmcblk0p3";
            type = "raw";
        }
    );
    bootenv: (
        {
            name = "bootpart";
            value = "0:2";
        }
    );
}
```

위 device와 bootenv 값은 설명용 placeholder일 뿐 실제 layout이 아닙니다. SWUpdate collection/mode mechanism은 dual-copy 설계에 쓸 수 있지만 inactive copy를 실행 전에 product가 결정해 mode로 넘겨야 합니다. 두 copy를 자동 발견한다고 가정하지 않습니다.

SWUpdate documents cpio packaging, `sw-description` ordering, signature configuration and `swupdate -c -i` archive check. 실제 installation `swupdate -i`는 target write를 수행할 수 있으므로 build-specific target checklist와 recovery path 없이 실행하지 않습니다.

## 운영 선택 기준

제품의 storage layout, build system, bootloader integration, package signing, health confirmation과 update service lifecycle을 기준으로 선택합니다. “RAUC는 항상 안전/빠름”, “SWUpdate는 항상 더 유연” 같은 순위는 board, version, configuration과 operational evidence 없이 결론내리지 않습니다. 둘을 평가할 때는 동일 hardware revision, slot map, interrupted-write test, invalid-signature test, rollback/mark-good test를 사용합니다.

## 흔한 실패

- **RAUC bootname을 U-Boot variable 하나와 동일시한다.** 기본 RAUC U-Boot backend는 documented `BOOT_ORDER`/`BOOT_<bootname>_LEFT` contract와 matching script를 씁니다.
- **RAUC가 generic U-Boot script를 자동 설치한다고 생각한다.** boot command와 partition mapping은 product script가 담당합니다.
- **SWUpdate collection/mode가 inactive copy를 알아서 찾는다고 가정한다.** 선택은 updater invocation 또는 제품 integration에서 명시해야 합니다.
- **mark-good을 boot 후 즉시 실행한다.** success condition은 application/service health policy가 정해야 합니다.
- **artifact compatibility만 확인하고 storage recovery를 생략한다.** signatures, slot writes, bootloader state, redundant environment 및 power-cut recovery를 분리해 검증합니다.
- **실행되지 않은 board transcript를 test result로 기록한다.** source, tag, board revision, configuration과 실제 output을 함께 남깁니다.

## 정리

- RAUC와 SWUpdate는 artifact install frameworks이며 A/B boot policy 그 자체는 아닙니다.
- RAUC U-Boot integration은 bootname, documented state variables 및 matching script가 필요합니다.
- SWUpdate는 기본 libconfig `sw-description`과 cpio container를 사용하고, bootenv/collection/mode는 제품 정책에 연결해야 합니다.
- bundle signing, target compatibility, slot persistence, mark-good와 rollback은 pinned version과 target에서 각각 확인합니다.
- 본문 예시는 문서 기반 syntax/reference이고 이 환경에서 생성/실행한 artifact나 board log가 아닙니다.

## 다음 장 예고

다음 장에서는 새 보드 포팅의 공통 workflow를 다룹니다. 보드별 Kconfig, DTS, early phase devices, DDR 설정과 first serial output은 reference board만으로 추정하지 않고 해당 U-Boot/SoC source와 hardware에 맞춥니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update) — U-Boot bootcount와 product bootchooser 경계
- [Ch 21: 새 보드 U-Boot 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [RAUC U-Boot integration](https://rauc.readthedocs.io/en/latest/integration.html)
- [RAUC using and status](https://rauc.readthedocs.io/en/latest/using.html)
- [SWUpdate description syntax](https://sbabic.github.io/swupdate/sw-description.html)
- [SWUpdate archive format/checking](https://sbabic.github.io/swupdate/swupdate.html)
