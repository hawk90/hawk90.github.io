---
title: "Ch 17: A/B 업데이트와 boot 이중화"
date: 2026-05-09T17:00:00
description: "A/B 슬롯 부트 — 양산 시스템의 안전한 펌웨어 업데이트와 자동 fallback."
series: "Bootloader Internals"
seriesOrder: 17
tags: [embedded, bootloader, u-boot, ab-update, fallback]
draft: false
---

OTA 업데이트는 *전원 끊김*과 *잘못 빌드된 펌웨어* 둘 다에서 살아남아야 합니다. 전원 끊김은 쓰기 중인 슬롯을 망가뜨리고, 잘못된 펌웨어는 일단 다 쓰였더라도 부팅을 못 합니다. A/B 슬롯은 *부팅 가능한 사본 한 벌*을 항상 남겨 두는 방식으로 두 문제를 동시에 해결합니다.

## 한 줄 요약

**같은 부트 체인을 두 슬롯에 두고, U-Boot의 `bootcount`·`altbootcmd`로 부팅 실패를 감지해 자동 fallback 시키면 OTA가 어디서 끊겨도 시스템은 살아 있습니다.**

## 왜 A/B인가

업데이트 도중 시스템이 부서지지 않으려면, *지금 실행 중인 코드를 덮어쓰지 않는* 사본을 따로 두어야 합니다. 한 슬롯에서 부팅 중일 때 다른 슬롯에 새 펌웨어를 쓰고, 다 쓰면 *부팅 슬롯을 바꿔* 재부팅합니다. 새 슬롯이 잘 부팅되면 그 슬롯이 active가 됩니다. 부팅이 실패하면 자동으로 이전 슬롯으로 되돌아옵니다.

```text
[Slot A: active]              [Slot B: standby]
  bootcount = 0                 (이전 펌웨어)
       |
       v
  download new image -> write to B
       |
       v
  flag B as active, set bootcount limit
       |
       v
  reboot -> try B
       |
       +---- success: B becomes active
       |
       +---- fail (panic, no kernel): bootcount > bootlimit
                                       -> U-Boot picks A again
```

이 패턴이 라우터·셋톱·차량 ECU 모두에서 사실상의 표준입니다. Android 7부터의 A/B OTA도 같은 발상을 모바일에 가져온 것입니다.

## 파티션 레이아웃

eMMC나 NOR 한 장에 슬롯 두 개를 올리는 표준 레이아웃입니다.

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

`data`는 슬롯 공유입니다. 그렇지 않으면 업데이트 후 사용자 데이터가 사라집니다. 부팅에 필요한 것(커널·DT·initramfs)만 슬롯에 두고, 가변 데이터는 공유 파티션에 둡니다.

U-Boot 환경에는 슬롯 상태를 저장합니다.

```text
=> printenv
BOOT_SLOT=A
BOOT_AB_TRYING=B
bootcount=0
bootlimit=3
```

## bootcount와 altbootcmd

U-Boot은 *부트 횟수*를 비휘발 저장소에 기록할 수 있습니다. 부팅이 성공하면 userspace가 `bootcount=0`으로 리셋합니다. 부팅이 실패하면 다음 부팅에서 `bootcount`가 *증가만* 합니다.

```text
=> setenv bootcmd 'run boot_slot_${BOOT_SLOT}'
=> setenv altbootcmd 'run switch_slot ; run boot_slot_${BOOT_SLOT}'
=> setenv bootlimit 3
=> saveenv
```

`bootcount`가 `bootlimit`을 넘으면 U-Boot이 `bootcmd` 대신 `altbootcmd`를 실행합니다. `switch_slot`은 슬롯을 바꿔 끼우는 사용자 정의 명령이고, 그다음 다시 부팅합니다.

```text
=> setenv switch_slot '
    if test "${BOOT_SLOT}" = "A"; then
        setenv BOOT_SLOT B;
    else
        setenv BOOT_SLOT A;
    fi;
    setenv bootcount 0;
    saveenv'
=> setenv boot_slot_A '
    setenv mmcpart 1;
    load mmc 0:${mmcpart} ${kernel_addr_r} boot.itb;
    bootm ${kernel_addr_r}'
=> setenv boot_slot_B '
    setenv mmcpart 2;
    load mmc 0:${mmcpart} ${kernel_addr_r} boot.itb;
    bootm ${kernel_addr_r}'
```

이렇게 짜 두면 `bootlimit` 횟수만큼 새 슬롯을 시도하다 실패하면 자동으로 이전 슬롯으로 되돌아갑니다.

## bootcount.c — U-Boot 측 구현

`drivers/bootcount/`에 백엔드별 구현이 들어 있습니다. SRAM·env·EEPROM·RTC·AT91SAM PMC 등 보드마다 골라 쓸 수 있습니다.

```c
// drivers/bootcount/bootcount_env.c (요지)
void bootcount_store(ulong a)
{
    char buf[32];
    sprintf(buf, "%lu", a);
    env_set("bootcount", buf);
    env_save();
}

ulong bootcount_load(void)
{
    char *s = env_get("bootcount");
    return s ? simple_strtoul(s, NULL, 10) : 0;
}
```

defconfig에는 다음을 켭니다.

```text
CONFIG_BOOTCOUNT_LIMIT=y
CONFIG_BOOTCOUNT_ENV=y
# 또는 더 안전한 백엔드
# CONFIG_BOOTCOUNT_I2C=y
# CONFIG_SYS_I2C_RTC_ADDR=0x68
```

env 백엔드는 *env 자체가 망가지면 같이 사라지는* 약점이 있습니다. 양산 시스템에서는 RTC SRAM이나 별도 EEPROM처럼 *부트 환경과 독립된 비휘발 영역*을 쓰는 편이 안전합니다.

## userspace에서 부팅 성공 표시

부팅이 성공한 *기준*은 시스템마다 다릅니다. systemd가 올라오는 것까지면 충분한 시스템도 있고, 네트워크 연결이 확인되어야 하는 시스템도 있고, 핵심 애플리케이션이 5분 동안 정상 동작해야 비로소 "부팅 성공"이라고 인정하는 시스템도 있습니다.

성공이 확정되면 `fw_setenv`로 카운터를 리셋합니다.

```bash
# /lib/systemd/system/mark-boot-success.service
[Unit]
Description=Mark boot as successful
After=multi-user.target
Requires=critical-app.service

[Service]
Type=oneshot
ExecStart=/usr/sbin/fw_setenv bootcount 0
ExecStart=/usr/sbin/fw_setenv upgrade_available 0

[Install]
WantedBy=multi-user.target
```

`upgrade_available`은 업데이트 도구가 켜는 플래그입니다. "방금 새 슬롯으로 부팅했음"을 의미합니다. 성공이 확인되어야 이 플래그를 끄고, 그래야 다음 부팅 실패가 fallback을 발동시킬 수 있습니다.

## 업데이트 흐름 전체

OTA 한 사이클의 단계를 정리하면 이렇습니다.

1. (active=A) update agent가 새 `boot.itb`·`rootfs.img` 다운로드.
2. agent가 비활성 슬롯 B에 기록 (atomic write 또는 부분 sync 후 fsync).
3. agent가 `fw_setenv`로 `BOOT_SLOT=B`, `upgrade_available=1`, `bootcount=0`, `bootlimit=3`을 설정.
4. reboot.
5. U-Boot이 `bootcount=1`로 올리고 B 부팅 시도.
6. 결과에 따라 분기.
   - 성공: systemd가 `mark-boot-success` 실행 → `bootcount=0`.
   - 실패: U-Boot이 다음 부팅에서 `bootcount=2` → 또 실패 → 3 → `altbootcmd`.
7. `altbootcmd`가 `BOOT_SLOT=A`로 돌리고 A 부팅.

업데이트 에이전트가 직접 `BOOT_SLOT`을 토글하는 게 아니라 *U-Boot에게 토글 권한을 주는* 점이 핵심입니다. agent가 토글하면 *agent를 트로이로 만들면* fallback 안전망이 동시에 깨집니다.

## Android A/B와의 비교

Android A/B는 같은 원리지만 *훨씬 큰 단위*에서 작동합니다. 슬롯 안에 boot·system·vendor·product·odm 등을 모두 두 벌 둡니다. Android는 `bootloader_message_ab` 구조체를 misc 파티션에 두고, U-Boot은 그것을 읽어 슬롯을 결정합니다.

```c
// bootable/recovery/bootloader_message/include/bootloader_message/bootloader_message.h
struct slot_metadata {
    uint8_t priority;
    uint8_t tries_remaining;
    uint8_t successful_boot;
    uint8_t verity_corrupted;
} __attribute__((packed));
```

`priority`가 큰 슬롯부터 시도하고, 성공하면 `successful_boot=1`을 박습니다. 임베디드 시스템에서 자체 구조를 만들 때도 이 세 필드는 거의 그대로 따라가는 편이 안전합니다.

## CONFIG_BOOTCOUNT_LIMIT 깊이 — 백엔드와 atomic update

`CONFIG_BOOTCOUNT_LIMIT`은 U-Boot 빌드 옵션이고, 값을 *어디에* 저장할지는 별도의 백엔드 옵션이 결정합니다. 백엔드 선택은 신뢰성·복구 시나리오에 직접 영향을 줍니다.

| 백엔드 | Kconfig | 위치 | 장점 | 단점 |
|--------|---------|------|------|------|
| env | `CONFIG_BOOTCOUNT_ENV` | U-Boot env 파티션 | 가장 간단 | env partition 깨지면 같이 손실 |
| EXT (ext2/3/4) | `CONFIG_BOOTCOUNT_EXT` | rootfs 안 파일 | 파일 시스템 표준 | rootfs unmount 안 된 상태 깨질 위험 |
| AT91 GPBR | `CONFIG_BOOTCOUNT_AT91` | SoC 내부 GPBR | board 독립 NVM | 전원 끊김에 약함 |
| RTC SRAM | `CONFIG_BOOTCOUNT_RAM` | 외부 RTC backup SRAM | env 독립 | RTC 배터리 의존 |
| I2C EEPROM | `CONFIG_BOOTCOUNT_I2C` | 별도 EEPROM 칩 | 부트 체인 독립 | 추가 부품·BOM |
| PMIC register | `CONFIG_BOOTCOUNT_PMIC` | PMIC 비휘발 레지스터 | 칩 통합 | PMIC vendor 종속 |

```text
# defconfig — 권장 양산 설정 예
CONFIG_BOOTCOUNT_LIMIT=y
CONFIG_BOOTCOUNT_I2C=y
CONFIG_SYS_BOOTCOUNT_ADDR=0x68
CONFIG_SYS_BOOTCOUNT_OFFSET=0x10
CONFIG_BOOTCOUNT_BOOTLIMIT=3
```

`bootcount_store()`는 *write-then-readback* 패턴이 안전합니다. 쓰기 직후 다시 읽어 같은 값인지 확인하고, 다르면 다른 백엔드(또는 마지막 값)로 폴백합니다. env 백엔드는 `env_save()` 한 번에 *섹터 erase + write*가 일어나므로 도중에 전원이 끊기면 env 전체가 손상될 수 있습니다. `CONFIG_SYS_REDUNDAND_ENVIRONMENT`를 켜고 env partition을 두 벌 두면 한쪽이 깨져도 다른 쪽에서 복구됩니다.

## altbootcmd 흐름 — 실패 감지부터 슬롯 전환까지

U-Boot의 메인 부팅 진입점은 `bootcmd`입니다. `bootcount > bootlimit`일 때 *대신* 실행되는 것이 `altbootcmd`입니다. 두 변수가 분리되어 있어 "정상 부팅 경로"와 "fallback 경로"를 *명시적으로* 다르게 짤 수 있습니다.

```bash
# boot.scr 소스 — mkimage -A arm -T script로 .scr 변환
# /boot/boot.scr.cmd
setenv bootargs "root=/dev/mmcblk0p${rootpart} rootwait console=ttyS0,115200"

if test "${BOOT_COUNT}" -ge "${BOOT_LIMIT}"; then
    echo "*** bootcount exceeded, switching slot ***"
    if test "${BOOT_SLOT}" = "A"; then
        setenv BOOT_SLOT B
        setenv rootpart 4
        setenv kernelpart 2
    else
        setenv BOOT_SLOT A
        setenv rootpart 3
        setenv kernelpart 1
    fi
    setenv BOOT_COUNT 0
    saveenv
fi

load mmc 0:${kernelpart} ${kernel_addr_r} boot.itb
bootm ${kernel_addr_r}
```

이 script가 `altbootcmd`로 등록되어 있으면, `bootcount` 초과 시 U-Boot이 자동으로 호출합니다. 슬롯 전환 후 `BOOT_COUNT`를 0으로 리셋해야 *전환된 슬롯도* 같은 횟수만큼 시도할 기회를 가집니다. 리셋을 잊으면 한 번 fallback이 발동된 뒤 양 슬롯 모두 부팅 시도가 봉쇄됩니다.

## upgrade_available — RAUC·SWUpdate와 U-Boot의 계약

`upgrade_available`은 *userspace 업데이트 도구*와 *U-Boot* 사이의 단방향 깃발입니다. 도구가 새 슬롯에 이미지를 쓰고 1로 set 하고, 첫 부팅이 성공하면 userspace가 0으로 clear 합니다.

```bash
# RAUC post-install hook 또는 swupdate post-update 스크립트
fw_setenv upgrade_available 1
fw_setenv bootcount 0
fw_setenv BOOT_SLOT B
reboot
```

U-Boot 측에서는 이 플래그가 *fallback을 발동할지*의 조건으로 쓰입니다.

```bash
# bootcmd 일부
if test "${upgrade_available}" = "1"; then
    if test "${BOOT_COUNT}" -ge "${BOOT_LIMIT}"; then
        echo "Upgrade failed, falling back"
        run switch_slot
    fi
fi
run boot_slot_${BOOT_SLOT}
```

플래그가 0이면 fallback 로직 자체가 무시됩니다. 이미 *정상 운영 중*인 시스템에서 우연한 reset이 누적되어 fallback이 발동하지 않게 막는 안전장치입니다. RAUC는 `system.conf`의 `[handler]` 섹션에서 `bootloader=uboot`와 `data-directory`만 지정하면 이 플래그 토글을 자동으로 처리해 줍니다.

## Boot status 상태머신 — installed → trying → good/bad

A/B 시스템의 각 슬롯은 4-state 상태머신을 가집니다. 상태는 환경 변수(예: `BOOT_A_STATE`, `BOOT_B_STATE`)나 misc 파티션 metadata에 저장됩니다.

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

U-Boot의 슬롯 선택 규칙은 단순합니다. `good`을 우선, 없으면 `trying`, 둘 다 없으면 `bad` 중 우선순위가 높은 쪽을 마지막 수단으로 시도합니다. Android `slot_metadata`의 `priority` 필드가 이 우선순위를 표현합니다. `bad`로 마킹된 슬롯은 *새 OTA가 다시 `installed`로 전환할 때까지* 부팅 후보에서 빠집니다.

## Shared data partition — A/B 사이에서 살아남는 데이터

부팅 슬롯은 두 벌이지만, *사용자 데이터*는 한 벌입니다. 어떤 데이터를 shared로 두고 어떤 것을 슬롯 안에 둘지가 업그레이드 후 *데이터 손실*과 *마이그레이션 비용*을 결정합니다.

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

shared 파티션의 *스키마*는 OTA가 책임집니다. v1 펌웨어가 만든 SQLite DB를 v2 펌웨어가 읽을 수 있어야 하고, 그 반대(rollback 후 v1이 v2의 DB를 만나는 경우)도 *최소한 충돌 없이 무시*되어야 합니다. shared 데이터에 *버전 필드*를 한 칸 두는 것이 가장 흔한 해법입니다.

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

## Rollback 시나리오 — 6가지 실패 패턴

부팅 실패가 발생하는 방식은 단일하지 않습니다. 각각이 다른 감지 메커니즘과 다른 fallback 트리거를 요구합니다.

| 실패 유형 | 감지 위치 | 감지 메커니즘 | 트리거 |
|-----------|-----------|---------------|--------|
| (a) kernel panic / no boot | U-Boot | bootcount 미감소 | bootcount > bootlimit |
| (b) systemd target 실패 | userspace | systemd watchdog timeout | watchdog reset |
| (c) application health 실패 | userspace | app self-report | fw_setenv bootcount++ |
| (d) DDR ECC 누적 오류 | kernel | EDAC subsystem | log → policy → fallback |
| (e) flash corruption | kernel | UBIFS error count | rootfs read-only → reboot |
| (f) boot loop | U-Boot | bootcount 패턴 분석 | "1초 안에 재부팅 N회" |

(a)는 U-Boot 단독으로 처리합니다. (b)는 systemd의 `RuntimeWatchdogSec`이 트리거가 됩니다.

```ini
# /etc/systemd/system.conf.d/watchdog.conf
[Manager]
RuntimeWatchdogSec=30s
RebootWatchdogSec=10min
```

(c)는 애플리케이션이 *명시적으로* health 실패를 보고합니다.

```bash
# /lib/systemd/system/app-healthcheck.service
[Unit]
Description=Application health check
After=critical-app.service
Requires=critical-app.service

[Service]
Type=oneshot
ExecStart=/usr/bin/myapp --self-test
ExecStartPost=/usr/sbin/rauc-mark-good
# 실패 시 fw_setenv가 호출되지 않아 다음 부팅에서 bootcount 증가

[Install]
WantedBy=multi-user.target
```

성공 경로에서 `rauc-mark-good`이 호출되어 `upgrade_available=0`·`bootcount=0`을 set 합니다. 실패하면 `ExecStartPost`가 실행되지 않으므로 다음 부팅의 bootcount가 *그대로 누적*됩니다.

(f) boot loop는 짧은 시간 안의 다중 reset을 감지하는 별도의 카운터가 필요합니다. 일부 U-Boot 보드 코드는 `bootcount_load()` 직후의 timestamp 차이로 "비정상적으로 빠른" 부팅을 식별합니다.

## A/B와 secure boot의 결합

verified boot(Ch 16, Ch 27)을 A/B와 결합할 때 *각 슬롯의 이미지가 별도로 서명*되어 있어야 합니다. 동일 키로 서명하지만 *별도의 서명 블록*을 가집니다. 이유는 두 가지입니다.

1. 한 슬롯의 이미지를 부분적으로 업데이트할 때 서명이 깨지면, 다른 슬롯은 영향받지 않아야 합니다.
2. anti-rollback counter(NXP HABv4의 SRK fuse, ARM TF-A의 trusted counter, TPM PCR)가 *슬롯별로 다른 값*을 가질 수 있어야 합니다.

```text
+---------+    +-------------+    +---------------+
| ROM     | -> | BL2 (TF-A)  | -> | FIP A or B    |
+---------+    +-------------+    +---------------+
                      |                  |
                verify BL2          verify slot
                with ROTPK         with anti-rb v
```

anti-rollback counter는 *전체 디바이스의 단조 증가 값*이지만, 슬롯 metadata에 각 슬롯이 요구하는 *최소 counter 값*을 두면 슬롯별로 검증할 수 있습니다. v3 펌웨어를 A에 설치하고 B는 v2로 남겨두면, B로 fallback할 때 anti-rollback counter는 *v2의 최소값*만 검증합니다. 단, 한 번 counter가 증가하면 *되돌릴 수 없으므로*, anti-rollback counter 증가는 새 펌웨어가 *충분히 검증된 후*에만 commit 합니다.

흔한 패턴은 *anti-rollback의 증가를 `rauc-mark-good` 시점*에 두는 것입니다. trying 상태에서는 이전 counter로 계속 동작하고, good 확정 시 counter를 한 단계 올립니다.

## 자주 하는 실수

A/B 도입 시 자주 만나는 함정입니다.

- **bootcount를 env에 두고**, env 자체가 한 슬롯과 같이 망가지면서 카운터를 잃어버린다.
- **userspace가 bootcount를 직접 결정한다.** "응용이 올라왔으니 성공"이라고 하면, 응용은 올라왔지만 *데이터가 부서졌어도* 성공 처리됩니다. 별도 health check가 필요합니다.
- **rootfs를 공유 파티션에 두고**, 한 슬롯이 그것을 망가뜨리면 양 슬롯이 같이 죽는다.
- **DTB는 슬롯에, 커널은 공통 파티션에 둔다.** 새 커널이 옛 DTB로 부팅을 시도해 *random panic*을 일으킨다.
- **`bootlimit`을 1로 설정한다.** 첫 부팅의 *우연한 실패*까지 fallback으로 처리해 의도와 다른 슬롯에 갇힌다.
- **upgrade_available 플래그를 잊는다.** "정상 동작 중인데도 부팅 실패가 일어났을 때" fallback이 동작하지 않거나, "업데이트 시도가 아닌데도" fallback이 동작하는 두 가지 오작동이 모두 가능합니다.
- **bootcount가 8-bit·overflow에 노출되어 있다.** 일부 백엔드는 단일 바이트만 쓰는데, 256번째 재부팅에서 0으로 wrap 되어 fallback 안전망이 사라집니다. 32-bit 백엔드를 쓰거나 increment 시 saturate를 보장합니다.
- **env partition이 redundant가 아닌 단일이다.** `CONFIG_SYS_REDUNDAND_ENVIRONMENT`를 켜지 않으면 env save 도중 전원 끊김으로 *전체 env 손실*이 가능합니다. 양 슬롯이 한꺼번에 의미를 잃습니다.
- **shared 데이터의 schema 버전을 관리하지 않는다.** v2 펌웨어가 작성한 DB를 v1으로 rollback했을 때 v1이 파싱 실패로 crash 합니다. `min_version` 필드와 fallback 정책이 필요합니다.

## 정리

- A/B 슬롯은 *지금 실행 중인 코드를 덮지 않는* 사본 한 벌을 항상 남겨 둡니다.
- U-Boot의 `bootcount`·`bootlimit`·`altbootcmd`가 자동 fallback의 핵심 트리오입니다.
- 부팅 성공의 *기준*은 시스템마다 다르지만, 그 판단을 userspace가 명시적으로 내려야 합니다.
- env 백엔드는 망가지기 쉬우니 RTC SRAM·EEPROM 같은 독립된 비휘발 영역을 권장합니다.
- 슬롯 토글 권한을 U-Boot에 두고 agent에 두지 않으면 안전망이 더 견고합니다.
- Android의 `slot_metadata` 세 필드(priority·tries·success)는 자체 구현에도 좋은 기준입니다.
- 가변 사용자 데이터는 슬롯 밖 공유 파티션에 두어야 양 슬롯이 함께 망가지지 않습니다.

## 다음 장 예고

다음 장은 *부트로더가 EFI*가 되는 흐름을 봅니다. `bootefi`를 통해 U-Boot이 UEFI Boot Services를 노출하고, Linux EFI stub·GRUB·systemd-boot이 그 위에서 부팅됩니다.

## 관련 항목

- [Ch 13: U-Boot 환경변수 — env partition과 fw_setenv](/blog/embedded/bootloader/chapter13-environment) — `BOOT_SLOT`·`bootcount`가 사는 곳
- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: EFI in U-Boot — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate) — A/B를 *위 레이어*에서 다루는 도구
- [Ch 27: Signed A/B — secure boot과 슬롯별 anti-rollback](/blog/embedded/bootloader/chapter27-signed-ab) — 슬롯별 서명·counter 관리
- [Ch 28: Flash layout과 파티션 사이즈 산정](/blog/embedded/bootloader/chapter28-flash-layout) — boot/rootfs/shared 영역 크기 결정
- [Buildroot Ch 16: OTA 통합](/blog/embedded/buildroot/chapter16-ota) — Buildroot 측 RAUC·SWUpdate 패키징
- [원문 — U-Boot doc/README.bootcount](https://u-boot.readthedocs.io/en/latest/usage/environment.html#bootcount)
