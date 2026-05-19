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

```text
1. (active=A) update agent가 새 boot.itb·rootfs.img 다운로드
2. agent가 비활성 슬롯 B에 기록 (atomic write 또는 부분 sync 후 fsync)
3. agent가 fw_setenv로
       BOOT_SLOT=B
       upgrade_available=1
       bootcount=0
       bootlimit=3
4. reboot
5. U-Boot이 bootcount=1로 올리고 B 부팅 시도
6.a (성공) systemd가 mark-boot-success 실행 -> bootcount=0
6.b (실패) U-Boot이 다음 부팅에서 bootcount=2 -> 또 실패 -> 3 -> altbootcmd
7. altbootcmd가 BOOT_SLOT=A로 돌리고 A 부팅
```

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

## 자주 하는 실수

A/B 도입 시 자주 만나는 함정입니다.

- **bootcount를 env에 두고**, env 자체가 한 슬롯과 같이 망가지면서 카운터를 잃어버린다.
- **userspace가 bootcount를 직접 결정한다.** "응용이 올라왔으니 성공"이라고 하면, 응용은 올라왔지만 *데이터가 부서졌어도* 성공 처리됩니다. 별도 health check가 필요합니다.
- **rootfs를 공유 파티션에 두고**, 한 슬롯이 그것을 망가뜨리면 양 슬롯이 같이 죽는다.
- **DTB는 슬롯에, 커널은 공통 파티션에 둔다.** 새 커널이 옛 DTB로 부팅을 시도해 *random panic*을 일으킨다.
- **`bootlimit`을 1로 설정한다.** 첫 부팅의 *우연한 실패*까지 fallback으로 처리해 의도와 다른 슬롯에 갇힌다.
- **upgrade_available 플래그를 잊는다.** "정상 동작 중인데도 부팅 실패가 일어났을 때" fallback이 동작하지 않거나, "업데이트 시도가 아닌데도" fallback이 동작하는 두 가지 오작동이 모두 가능합니다.

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

- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: EFI in U-Boot — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate) — A/B를 *위 레이어*에서 다루는 도구
- [원문 — U-Boot doc/README.bootcount](https://u-boot.readthedocs.io/en/latest/usage/environment.html#bootcount)
