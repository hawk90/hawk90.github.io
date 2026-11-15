---
title: "임베디드 A/B 부팅 이중화 — OTA 안전성을 위한 부트 슬롯 설계"
slug: "embedded/bootloader/chapter17-ab-update"
date: 2026-05-09T09:17:00
description: "A/B 슬롯 업데이트와 U-Boot bootcount/custom bootchooser를 이용한 보드별 fallback 설계."
series: "Bootloader Internals"
seriesOrder: 17
tags: [embedded, bootloader, u-boot, ab-update, fallback]
draft: false
topics: ["embedded"]
---

A/B 설계는 update payload를 inactive slot에 기록해 현재 bootable slot을 보존하는 데 도움을 줍니다. 이것만으로 bootloader, shared data, slot metadata, power-loss behavior 또는 application health를 보호하지는 않습니다. 보장 범위는 storage layout과 bootchooser 구현으로 결정됩니다.

## 한 줄 요약

**A/B slot은 inactive-side update와 boot selection policy를 분리하는 설계입니다.** U-Boot `bootcount`는 재부팅 시도 횟수를 추적할 수 있지만, slot switching과 health confirmation은 board/update-framework 설정에 따라 구현해야 합니다.

## 왜 A/B인가

A/B 설계는 update 중 inactive slot에 새 펌웨어를 기록하고, 제품 bootchooser가 새 slot을 선택하도록 구성할 수 있습니다. 새 슬롯이 정상 동작했다고 판단되면 제품 정책에 따라 success 상태를 기록합니다. 실패 후 복구는 persistent attempt metadata, reset/watchdog 동작, fallback script가 모두 맞게 설정된 경우에만 가능합니다.

```text
[Slot A: active]              [Slot B: standby]
  bootcount = 0                 (이전 펌웨어)
       |
       v
  download new image -> write to B
       |
       v
  product bootchooser selects B
       |
       v
  reboot -> product policy attempts B
       |
       +---- health confirmation: product records success
       |
       +---- failure: configured reset/count/fallback policy
                       may select A
```

두 슬롯 구조는 여러 embedded update 설계에서 쓰이지만, 보편 레이아웃이나 실패 복구 보장은 아닙니다. Android의 A/B metadata/API는 별도 플랫폼 계약으로 취급합니다.

## 파티션 레이아웃

아래는 크기와 partition 이름이 예시인 한 가지 개념도이며 표준 레이아웃이 아닙니다. Bootloader, environment, metadata, erase geometry와 recovery storage는 보드별로 추가 설계해야 합니다.

```text
eMMC user area
+-----------------+ 0x000000
| GPT             |
+-----------------+
| boot_a (FIT)    |  10 MB
+-----------------+
| boot_b (FIT)    |  10 MB
+-----------------+
| rootfs_a        |  512 MB
+-----------------+
| rootfs_b        |  512 MB
+-----------------+
| data            |  나머지 (공유)
+-----------------+
```

Shared data를 둘지, 어느 데이터까지 slot에 복제할지는 rollback 호환성·schema migration·복구 요구에 따라 결정합니다.

슬롯 변수 이름과 저장 위치는 bootchooser 구현의 계약입니다. 아래 설명의 uppercase slot 변수는 일반적인 U-Boot 표준 이름이 아닙니다.

## bootcount와 altbootcmd

U-Boot의 boot-count policy는 보드별 boot command와 연결되어야 합니다. 이 글의 이전 `setenv` 예제는 표준 U-Boot 명령처럼 보이지만 슬롯 전환 함수, 저장의 내구성, 실제 파티션 매핑을 검증하지 않았으므로 제거했습니다. 제품 script는 선택한 U-Boot tag와 board configuration에서 설계·검증해야 합니다.

## U-Boot `bootcount` behavior

U-Boot v2025.01 문서에서 `CONFIG_BOOTCOUNT_LIMIT`은 reset 뒤 `bootcount`를 올리고, 증가값이 `bootlimit`을 초과하면 `altbootcmd`를 실행합니다. `bootlimit` 또는 `altbootcmd`가 없으면 기대한 fallback이 성립하지 않을 수 있습니다. 저장 backend는 별도 설정이며 write durability는 backend별로 검증해야 합니다. `CONFIG_BOOTCOUNT_FS`의 `upgrade_available` 조건도 core behavior 전체에 일반화하지 않습니다.

## userspace에서 부팅 성공 표시

부팅 성공의 기준은 시스템마다 다릅니다. OS가 올라오는 것, 네트워크 연결, 핵심 application health 중 무엇을 확인할지 제품 정책으로 정해야 합니다. U-Boot 문서에서 `upgrade_available`은 `CONFIG_BOOTCOUNT_FS` backend 관련 동작으로 설명되므로, 모든 backend에 적용되는 일반 flag로 다루지 않습니다. 성공 marker 명령과 service unit은 이 문서에서 보드 실행 예제로 제공하지 않습니다.

## 업데이트 흐름과 framework 연동

비활성 슬롯 쓰기, 이미지 검증, bootchooser state 갱신, 재부팅, health confirmation 및 fallback은 하나의 제품 계약을 이룹니다. 변수 이름과 순서는 update framework 및 U-Boot script에 따라 다릅니다. 아래 RAUC 절은 공식 U-Boot bootchooser 인터페이스 요구를 요약하며, generic `fw_setenv` 레시피는 아닙니다.

## Android A/B metadata는 별도 계약

Android slot metadata와 U-Boot `bootcount`는 같은 자료구조가 아닙니다. Android boot-control API, on-disk metadata layout과 U-Boot port integration을 Android platform source에서 확인하지 않고 이 장에서는 bitfield나 mapping을 제시하지 않습니다.

## Backend and persistence

Boot-count storage backend와 slot-state storage는 서로 다른 책임입니다. U-Boot documentation lists boot-count configuration and the filesystem backend format; a product must additionally validate its own environment, SRAM, EEPROM, filesystem or secure storage implementation. Atomicity, wear, power-loss recovery and counter width are not inferred from the Kconfig name. A board-specific configuration and power-cut test are required.

## `altbootcmd` and custom slot switching

`altbootcmd` is selected by the boot-count policy after `bootcount > bootlimit`; it does not inherently switch slots. The script shown in this chapter used inconsistent uppercase `BOOT_COUNT`/`BOOT_LIMIT` names, while U-Boot core uses lowercase `bootcount`/`bootlimit`. A board script must explicitly map its state variables, choose a fallback slot, persist the change safely, and define what happens if both slots fail. No generic slot-switch script is executable across boards.

## RAUC and bootloader contract

RAUC does not make an arbitrary U-Boot `upgrade_available` policy appear automatically from a `[handler]` section. Its U-Boot bootchooser integration requires `bootloader=uboot`, slot `bootname` configuration, the expected state variables (`BOOT_ORDER`, `BOOT_<bootname>_LEFT`) and a matching U-Boot script. RAUC can then update boot selection state through that interface. SWUpdate integration is a separate configuration. The exact tool version, variable names, script and `fw_setenv` backend must be pinned and tested.

## 제품별 boot status 상태머신

아래 상태 모델은 예시이며 U-Boot이나 RAUC의 universal four-state slot protocol이 아닙니다. 실제 state name, storage format, transition과 recovery policy는 bootchooser implementation에서 정의해야 합니다.

| State | 의미 | 진입 조건 | 다음 상태 |
|-------|------|-----------|-----------|
| `installed` | 새 이미지가 기록만 됨 | OTA write 완료 | `trying` (다음 부팅 시) |
| `trying` | 이번 부팅 시도 중 | U-Boot이 슬롯 선택 | `good` (health OK) / `bad` (fail) |
| `good` | 정상 동작 확인 | userspace health check 통과 | 다음 OTA까지 유지 |
| `bad` | 부팅 또는 health 실패 | bootcount 초과·panic | 다음 OTA 전까지 부팅 후보 제외 |

```text
        OTA write              first boot
[ - ] --------------> [installed] -------> [trying]
                                              |
                       +----------------------+
                       |                      |
              health OK|              health/boot fail
                       v                      v
                    [good]                  [bad]
                       |                      |
                       | new OTA              | new OTA
                       v                      v
                  [installed]             [installed]
```

U-Boot core bootcount는 slot state machine이나 `good`/`bad` 우선순위를 정의하지 않습니다. 이 동작은 선택한 RAUC script, Android boot-control integration 또는 custom bootchooser source에서 확인해야 합니다.

## Shared data partition — A/B 사이에서 살아남는 데이터

A/B product가 shared data를 사용할지는 application compatibility, rollback 및 migration 요구에 따라 결정합니다.

| 데이터 종류 | 배치 | 이유 |
|-------------|------|------|
| `/etc/machine-id` | shared | 장치 고유 ID, OTA로 바뀌면 안 됨 |
| Wi-Fi 자격 증명 | shared | 사용자가 다시 입력하지 않게 |
| 디바이스 시리얼·MAC | shared (또는 OTP) | factory provisioning 결과 |
| 애플리케이션 DB | shared with schema version | OTA가 schema 마이그레이션 책임 |
| `/var/log` | shared | 부팅 실패 원인 추적 |
| 임시 캐시 | per-slot 또는 tmpfs | 슬롯 전환 시 stale 방지 |
| `/etc/os-release` | per-slot | 현재 슬롯의 빌드 정보 |
| 커널·DTB·initramfs | per-slot | 슬롯이 곧 부팅 단위 |

shared 파티션의 *스키마*는 OTA가 책임집니다. v1 펌웨어가 만든 SQLite DB를 v2 펌웨어가 읽을 수 있어야 하고, 그 반대(rollback 후 v1이 v2의 DB를 만나는 경우)도 *최소한 충돌 없이 무시*되어야 합니다. schema versioning과 rollback behavior는 product data contract에서 명시해야 합니다.

```c
// /var/lib/myapp/state.cbor 헤더
struct shared_state_header {
    uint32_t magic;       // 'MYAP'
    uint16_t version;     // 현재 schema version
    uint16_t min_version; // 이 데이터로 동작 가능한 최소 펌웨어
    uint8_t  body[];
};
```

`min_version`보다 낮은 펌웨어로 rollback되었을 때는 *데이터를 무시하고 default로 시작*하거나, 별도 backup에서 복구합니다.

## Rollback failure coverage

A/B fallback은 구성만으로 boot attempt failure를 모두 감지한다고 보장되지 않습니다. Kernel panic 뒤 다음 boot를 위해 reset이 필요하고, userspace health failure도 정책에 따라 success marker를 쓰지 않는 방식으로 반영해야 합니다. Watchdog, storage error, ECC threshold 및 application health는 각각 board/OS integration 대상입니다. 이 article에는 이를 재현한 로그나 보드 결과가 없으므로 개별 감지 경로를 검증된 사실로 제시하지 않습니다.

## A/B와 secure boot의 결합

A/B와 verified boot를 함께 쓸 때 각 bootable slot이 허용된 signed content를 제공하고 recovery image도 정책에 포함되는지 확인해야 합니다. Slot update와 key policy는 제품별 설계입니다.

1. 한 슬롯의 이미지를 부분적으로 업데이트할 때 서명이 깨지면, 다른 슬롯은 영향받지 않아야 합니다.
2. Anti-rollback storage와 counter commit은 trusted firmware/SoC 별도 설계이며 TPM PCR은 일반적인 monotonic rollback counter와 같지 않습니다.

```text
+---------+    +-------------+    +---------------+
| ROM     | -> | BL2 (TF-A)  | -> | FIP A or B    |
+---------+    +-------------+    +---------------+
                      |                  |
                verify BL2          verify slot
                with ROTPK         with anti-rb v
```

Counter의 scope, per-slot version requirements, fallback compatibility와 commit timing은 신뢰 모델에 따라 달라집니다. 이 장의 앞선 단정은 U-Boot/RAUC 일반 behavior가 아니므로 product-specific implementation 없이 적용하면 안 됩니다.

## 자주 하는 실수

A/B 도입 시 자주 만나는 함정입니다.

- **bootcount를 env에 두고**, env 자체가 한 슬롯과 같이 망가지면서 카운터를 잃어버린다.
- **userspace가 bootcount를 직접 결정한다.** "응용이 올라왔으니 성공"이라고 하면, 응용은 올라왔지만 *데이터가 부서졌어도* 성공 처리됩니다. 별도 health check가 필요합니다.
- **rootfs를 공유 파티션에 두고**, 한 슬롯이 그것을 망가뜨리면 양 슬롯이 같이 죽는다.
- **DTB는 슬롯에, 커널은 공통 파티션에 둔다.** 새 커널이 옛 DTB로 부팅을 시도해 *random panic*을 일으킨다.
- **`bootlimit`을 1로 설정한다.** 첫 부팅의 *우연한 실패*까지 fallback으로 처리해 의도와 다른 슬롯에 갇힌다.
- **`upgrade_available`을 모든 backend의 공통 상태 변수로 취급한다.** U-Boot 문서상 관련 동작은 `CONFIG_BOOTCOUNT_FS` backend에 한정되므로, 해당 target 설정을 확인합니다.
- **env partition이 redundant가 아닌 단일이다.** `CONFIG_SYS_REDUNDAND_ENVIRONMENT`를 켜지 않으면 env save 도중 전원 끊김으로 *전체 env 손실*이 가능합니다. 양 슬롯이 한꺼번에 의미를 잃습니다.
- **shared 데이터의 schema 버전을 관리하지 않는다.** v2 펌웨어가 작성한 DB를 v1으로 rollback했을 때 v1이 파싱 실패로 crash 합니다. `min_version` 필드와 fallback 정책이 필요합니다.

## 정리

- A/B 슬롯은 적절한 분리·쓰기·선택 정책이 구현된 경우 현재 실행 slot을 덮지 않고 update를 시도할 수 있습니다.
- U-Boot의 `bootcount`·`bootlimit`·`altbootcmd`는 구성 가능한 boot-count policy 요소이며, 슬롯 전환 자체는 별도 script/bootchooser가 구현합니다.
- boot success marker와 health policy는 제품에서 정의하고 bootloader/update-framework interface와 맞춰야 합니다.
- bootcount backend의 persistence·wear·power-loss behavior는 실제 target에서 비교 검증해야 합니다.
- Update agent와 bootchooser 사이의 권한/state contract를 명시해야 하며, RAUC 같은 framework는 정의된 interface에 따라 slot state를 갱신합니다.
- Android slot metadata는 자체 platform interface로 검증하며 U-Boot bootcount와 혼용하지 않습니다.
- Shared user data와 per-slot data의 경계는 rollback 및 schema compatibility 요구에 따라 정합니다.

## 다음 장 예고

다음 장은 *부트로더가 EFI*가 되는 흐름을 봅니다. `bootefi`를 통해 U-Boot이 UEFI Boot Services를 노출하고, Linux EFI stub·GRUB·systemd-boot이 그 위에서 부팅됩니다.

## 관련 항목

- [Ch 13: U-Boot 환경변수 — env partition과 fw_setenv](/blog/embedded/bootloader/chapter13-env-bootcmd) — `BOOT_SLOT`·`bootcount`가 사는 곳
- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: EFI in U-Boot — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate) — A/B를 *위 레이어*에서 다루는 도구
- [Ch 27: Signed A/B — secure boot과 슬롯별 anti-rollback](/blog/embedded/bootloader/chapter27-chain-of-trust) — 슬롯별 서명·counter 관리
- [Ch 28: Flash layout과 파티션 사이즈 산정](/blog/embedded/bootloader/chapter28-flash-layout) — boot/rootfs/shared 영역 크기 결정
- [Buildroot Ch 16: OTA 통합](/blog/embedded/buildroot/chapter16-ota) — Buildroot 측 RAUC·SWUpdate 패키징
- [원문 — U-Boot doc/README.bootcount](https://docs.u-boot.org/en/v2025.01/api/bootcount.html)
