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

## 한 줄 요약

> A/B 업데이트는 **새 이미지를 쓰지 않는 쪽 슬롯에 쓰고, 부팅할 슬롯과 남은 시도 횟수를 U-Boot 환경에 적어 두고, 부팅이 성공했다고 userspace가 확인할 때까지 그 횟수를 깎는** 구조입니다. U-Boot의 `bootcount`/`altbootcmd`와 RAUC 같은 도구의 슬롯 스크립트는 이 중 "횟수를 깎고 다른 경로로 넘어가는" 부분만 맡고, "성공 확인"은 OS 쪽 책임입니다.

이 글의 두 실험은 모두 QEMU 11.1.3 `virt`에서 실제로 실행했습니다. U-Boot는 **v2024.04** `qemu_arm64_defconfig`에 `CONFIG_BOOTCOUNT_LIMIT`, `CONFIG_BOOTCOUNT_ENV`, `CONFIG_CMD_SETEXPR`을 켜서 빌드했고, 환경은 [13장](/blog/embedded/bootloader/chapter13-env-bootcmd)처럼 pflash 파일에 저장해 재부팅 사이에 유지되게 했습니다. kernel은 [15장](/blog/embedded/bootloader/chapter15-fit-image)의 Debian 13.7 arm64 FIT입니다.

## 왜 슬롯이 둘인가

업데이트 도중 전원이 꺼지는 경우를 생각하면 이유가 분명합니다. 지금 실행 중인 kernel과 rootfs를 그 자리에서 덮어쓰다 멈추면, 다음 부팅에 쓸 정상 이미지가 하나도 남지 않습니다. 슬롯을 둘 두면 새 이미지는 쉬고 있는 쪽(예: B)에만 쓰고, 쓰기가 끝난 뒤에야 "다음엔 B로 부팅"이라고 표시합니다. 이삿짐을 새 집에 다 옮긴 뒤에 주소를 바꾸는 것과 같아서, 옮기는 도중에 문제가 생겨도 옛 집(A)은 그대로입니다.

그런데 B에 쓰기는 끝났지만 B가 부팅되지 않는 경우가 남습니다. kernel이 panic하거나, rootfs의 앱이 계속 죽거나, 이미지가 깨진 경우입니다. 이때 A로 돌아오게 하는 것이 아래 두 장치입니다.

## U-Boot `bootcount` — 몇 번째 부팅인가

`CONFIG_BOOTCOUNT_LIMIT`을 켜면 `common/autoboot.c`의 `bootdelay_process()`가 부팅할 때마다 `bootcount_inc()`를 부르고, `include/bootcount.h`의 `bootcount_error()`가 다음 조건을 봅니다.

```c
/* include/bootcount.h (v2024.04), bootcount_error() 일부 */
if (bootlimit && bootcount > bootlimit) {
	printf("Warning: Bootlimit (%lu) exceeded.", bootlimit);
	...
	return 1;
}
```

이 값이 1이면 `bootcmd` 대신 `altbootcmd`를 실행합니다. 비교가 `>`이므로 `bootlimit=3`이면 **네 번째** 부팅에서 넘어갑니다.

카운트를 어디에 저장할지는 backend가 정하고, 이 실험은 환경에 저장하는 `CONFIG_BOOTCOUNT_ENV`를 썼습니다. `drivers/bootcount/bootcount_env.c`는 짧습니다.

```c
void bootcount_store(ulong a)
{
	int upgrade_available = env_get_ulong("upgrade_available", 10, 0);

	if (upgrade_available) {
		env_set_ulong("bootcount", a);
		env_save();
	}
}
```

`upgrade_available`이 1일 때만 저장합니다. 이 변수를 filesystem backend(`CONFIG_BOOTCOUNT_FS`)만의 것으로 설명하는 자료가 있지만, v2024.04의 환경 backend도 같은 변수로 동작을 켜고 끕니다. 평소에 매 부팅마다 flash를 지우고 쓰지 않으려는 장치입니다.

실험에서는 "새 이미지가 매번 실패하는" 상황을 `bootcmd`를 그냥 `reset`으로 두어 흉내 냈습니다.

```text
=> setenv bootlimit 3
=> setenv upgrade_available 1
=> setenv bootcount 0
=> setenv bootcmd 'echo BOOTCMD: new image fails, count=${bootcount}; reset'
=> setenv altbootcmd 'echo ALTBOOTCMD: rollback, count=${bootcount}; setenv upgrade_available 0; setenv bootcount 0; saveenv'
=> saveenv
=> reset
```

```text
Saving Environment to Flash... Un-Protected 2 sectors
Hit any key to stop autoboot:  1  0
BOOTCMD: new image fails, count=1
resetting ...
Saving Environment to Flash... Un-Protected 2 sectors
Hit any key to stop autoboot:  1  0
BOOTCMD: new image fails, count=2
resetting ...
Saving Environment to Flash... Un-Protected 2 sectors
Hit any key to stop autoboot:  1  0
BOOTCMD: new image fails, count=3
resetting ...
Saving Environment to Flash... Un-Protected 2 sectors
Warning: Bootlimit (3) exceeded. Using altbootcmd.
Hit any key to stop autoboot:  1  0
ALTBOOTCMD: rollback, count=4
```

부팅마다 `Saving Environment to Flash`가 찍힌 것이 `bootcount_store()`의 `env_save()`입니다. 13장에서 본 것처럼 이 QEMU에서는 한 번에 256 KiB를 지우고 다시 쓰므로, 업데이트 직후 몇 번의 부팅에만 이 비용이 들도록 `upgrade_available`로 구간을 제한하는 것입니다.

롤백 뒤(`upgrade_available=0`)에 다시 켜 보면 동작이 달라집니다.

```text
Loading Environment from Flash... OK
Hit any key to stop autoboot:  1  0
BOOTCMD: new image fails, count=1
resetting ...
Loading Environment from Flash... OK
Hit any key to stop autoboot:  1  0
BOOTCMD: new image fails, count=1
resetting ...
```

저장이 일어나지 않아 카운트는 매번 RAM에서만 1이 되고, `bootcount_load()`는 0을 돌려주므로 `bootlimit`을 넘지 못합니다. **`bootcmd`가 계속 실패해도 `altbootcmd`로 가지 않고 영원히 재부팅합니다.** 그래서 업데이트를 설치한 쪽이 재부팅 직전에 `upgrade_available=1`을 세우고, 새 이미지가 정상이라고 확인한 뒤에 0으로 내리는 것이 이 장치의 사용법입니다. 그리고 `altbootcmd`는 "다른 명령을 실행한다"까지만 해 줍니다. 그 안에서 실제로 슬롯을 바꾸는 일은 스크립트가 해야 합니다.

## RAUC 슬롯 스크립트 — 슬롯마다 남은 횟수

RAUC는 bootcount 대신 슬롯마다 남은 횟수를 환경에 둡니다. RAUC 문서(`docs/integration.rst`)가 정한 U-Boot 쪽 인터페이스는 두 종류의 변수입니다.

| 변수 | 의미 |
| --- | --- |
| `BOOT_ORDER` | 시도할 슬롯 이름을 공백으로 구분한 순서. 예: `A B`, 업데이트 직후 `B A` |
| `BOOT_<이름>_LEFT` | 그 슬롯의 남은 시도 횟수 |

RAUC 저장소의 예제 `contrib/uboot.sh`는 이 변수들로 슬롯을 고릅니다. 이 스크립트의 슬롯 선택 부분은 그대로 두고, kernel을 읽는 줄(원본은 NAND의 `nand read`)만 이 QEMU 디스크에 맞게 바꿨습니다. 또 `bootm`이 실패하면 실제 제품에서는 watchdog이 리셋하겠지만, QEMU에는 watchdog을 두지 않았으므로 마지막에 `reset`을 붙였습니다.

```text
for BOOT_SLOT in "${BOOT_ORDER}"; do
  if test "x${bootargs}" != "x"; then
    # skip remaining slots
  elif test "x${BOOT_SLOT}" = "xA"; then
    if test 0x${BOOT_A_LEFT} -gt 0; then
      echo "Found valid slot A, ${BOOT_A_LEFT} attempts remaining"
      setexpr BOOT_A_LEFT ${BOOT_A_LEFT} - 1
      setenv load_kernel "load virtio 0:1 ${fit_addr} /boot/fit.itb"
      setenv bootargs "console=ttyAMA0 earlycon rauc.slot=A"
    fi
  elif test "x${BOOT_SLOT}" = "xB"; then
    ... (B도 같은 구조, 파티션 2)
  fi
done

if test -n "${bootargs}"; then
  saveenv
else
  echo "No valid slot found, resetting tries to 3"
  setenv BOOT_A_LEFT 3
  setenv BOOT_B_LEFT 3
  saveenv
  reset
fi

run load_kernel
bootm ${fit_addr}
reset    # 이 실험에서 더한 줄 (watchdog 대신)
```

원본 예제를 그대로 쓸 때 걸리는 점이 하나 있습니다. 원본은 `load_kernel`에서 `${kernel_loadaddr}`에 읽고 마지막 줄은 `bootm ${loadaddr_kernel}`로 부팅합니다. 변수 이름이 서로 달라서, 그대로 두면 읽은 곳과 다른 주소를 부팅합니다. 위에서는 둘 다 `${fit_addr}`로 맞췄습니다. 파일 머리의 주석도 "가능한 예시일 뿐이며 사용 환경에 맞게 고쳐야 한다"고 적고 있습니다.

GPT 디스크에 `rootfs_A`·`rootfs_B`·`bootscr` 세 파티션을 만들고, A에는 정상 FIT을, B에는 kernel 데이터 1 byte를 바꾼 FIT을 넣었습니다. 업데이트가 B에 막 설치된 상황을 만들려고 `BOOT_ORDER="B A"`, 두 슬롯 모두 남은 횟수 3으로 두고 리셋했습니다.

```text
Found valid slot B, 3 attempts remaining
Loading kernel
 Starting kernel
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... OK
   Trying 'kernel-1' kernel subimage
   ...
   Verifying Hash Integrity ... sha256 error!
Bad hash value for 'hash-1' hash node in 'kernel-1' image node
Bad Data Hash
ERROR -2: can't get kernel image!
bootm returned, resetting (stands in for a watchdog)
resetting ...
Found valid slot B, 2 attempts remaining
...
Found valid slot B, 1 attempts remaining
...
resetting ...
Found valid slot A, 3 attempts remaining
Loading kernel
 Starting kernel
...
[    0.000000] Linux version 6.12.107+deb13-arm64 ...
[    0.000000] Kernel command line: console=ttyAMA0 earlycon rauc.slot=A
```

B를 세 번 시도해 횟수를 다 쓴 뒤 네 번째 부팅에서 A로 넘어가 Linux가 올라왔습니다. 확인할 점이 셋 있습니다.

- 따옴표로 감싼 `for BOOT_SLOT in "${BOOT_ORDER}"`도 이 U-Boot(hush old parser)에서는 `B`, `A` 두 개로 나뉘어 반복되었습니다.
- 스크립트가 `bootargs`를 환경에 설정했으므로, FIT 안 DTB의 `chosen/bootargs` 대신 `rauc.slot=A`가 kernel에 갔습니다(15장의 `fdt_chosen()` 동작). OS 쪽 RAUC는 이 값으로 지금 어느 슬롯에서 부팅했는지 압니다.
- **성공한 A의 횟수도 3에서 2로 줄었습니다.** 스크립트는 슬롯을 고를 때마다 횟수를 깎기 때문입니다.

## 성공 확인은 OS의 몫

마지막 점이 A/B의 핵심입니다. 정상 부팅한 슬롯의 횟수를 다시 채워 주지 않으면, 정상 부팅을 세 번 할 때마다 횟수가 바닥나 "No valid slot found"로 넘어갑니다. RAUC에서는 `rauc status mark-good`이 이 일을 합니다. RAUC `src/bootloaders/uboot.c`의 `r_uboot_set_state()`는 good일 때 그 슬롯의 `BOOT_<이름>_LEFT`를 `system.conf`의 `boot_default_attempts`(없으면 `UBOOT_DEFAULT_ATTEMPTS` = 3)로 되돌리고, bad일 때는 그 슬롯을 `BOOT_ORDER`에서 빼고 횟수를 0으로 씁니다. 값은 `"%x"`, 곧 16진수로 기록되는데, 스크립트가 `test 0x${BOOT_A_LEFT} -gt 0`처럼 앞에 `0x`를 붙여 비교하는 것이 이 때문입니다. 이 값들은 Linux에서 `fw_setenv`로 U-Boot 환경에 직접 씁니다(`docs/integration.rst`).

언제 `mark-good`을 부를지는 제품이 정합니다. kernel이 떴다는 것만으로 부르면 앱이 계속 죽는 이미지도 "성공"이 되므로, 보통 핵심 서비스가 일정 시간 정상 동작한 뒤에 부릅니다. 반대로 끝내 부르지 않으면, 위 실험처럼 몇 번의 재부팅 뒤 다른 슬롯으로 넘어갑니다. 이 시간 안에 리셋을 일으키는 것이 watchdog의 역할입니다. kernel panic이나 멈춤이 리셋으로 이어지지 않으면 횟수는 줄지 않고 보드는 그 자리에 멈춰 있습니다.

## 환경 자체를 지키기

슬롯 상태가 모두 U-Boot 환경에 있으므로, 환경이 깨지면 A/B 전체가 기본값으로 돌아갑니다. RAUC 문서는 두 가지를 요구합니다. 환경을 bootloader와 다른 곳에 두어 bootloader 업데이트 때 지워지지 않게 하고, `CONFIG_SYS_REDUNDAND_ENVIRONMENT`로 사본 두 개를 번갈아 써서 `saveenv` 도중 전원이 꺼져도 하나는 남게 하라는 것입니다([13장](/blog/embedded/bootloader/chapter13-env-bootcmd)의 redundant environment). 위 실험은 사본 하나짜리 NOR 환경이었으므로, 제품에 그대로 쓰면 이 요구를 채우지 못합니다.

## 슬롯 사이에 공유할 데이터

kernel·DTB·rootfs는 슬롯마다 따로 두지만, 장치 고유 정보와 사용자 데이터는 업데이트로 바뀌면 안 됩니다. 그래서 보통 별도 data 파티션을 둡니다. 이때 생기는 문제는 롤백입니다. 새 버전(B)이 data 파티션의 형식을 바꾼 뒤 A로 돌아가면, 옛 버전이 새 형식을 읽게 됩니다. 저장하는 데이터마다 schema 버전을 두고, 모르는 버전이면 무시하고 기본값으로 시작하도록 옛 버전도 미리 만들어 두어야 롤백이 실제로 동작합니다.

## 정리

- `CONFIG_BOOTCOUNT_LIMIT`은 부팅마다 `bootcount`를 올리고, `bootcount > bootlimit`이면 `altbootcmd`를 실행합니다. QEMU에서 `bootlimit=3`은 네 번째 부팅에 넘어갔습니다.
- `CONFIG_BOOTCOUNT_ENV`도 `upgrade_available=1`일 때만 카운트를 저장합니다. 0이면 실패가 반복돼도 `altbootcmd`로 가지 않고 계속 재부팅했습니다.
- RAUC의 U-Boot 인터페이스는 `BOOT_ORDER`와 `BOOT_<이름>_LEFT`이고, `contrib/uboot.sh` 구조로 B 실패 3회 뒤 A로 넘어가 `rauc.slot=A`로 부팅했습니다. 원본 예제의 `kernel_loadaddr`/`loadaddr_kernel` 불일치는 고쳐서 써야 합니다.
- 성공한 슬롯의 횟수도 줄어들므로, OS가 `rauc status mark-good`으로 다시 채워야 합니다. 실패가 리셋으로 이어지도록 watchdog을 둡니다.
- 슬롯 상태가 사는 U-Boot 환경은 bootloader 밖에, redundant로 둡니다.

## 다음 장 예고

다음 장은 *부트로더가 EFI*가 되는 흐름을 봅니다. `bootefi`를 통해 U-Boot이 UEFI Boot Services를 노출하고, Linux EFI stub·GRUB·systemd-boot이 그 위에서 부팅됩니다.

## 관련 항목

- [Ch 13: U-Boot 환경변수 — env partition과 fw_setenv](/blog/embedded/bootloader/chapter13-env-bootcmd) — `BOOT_ORDER`·`bootcount`가 사는 곳
- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: EFI in U-Boot — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate) — A/B를 *위 레이어*에서 다루는 도구
- [Ch 27: Signed A/B — secure boot과 슬롯별 anti-rollback](/blog/embedded/bootloader/chapter27-chain-of-trust) — 슬롯별 서명·counter 관리
- [Ch 28: Flash layout과 파티션 사이즈 산정](/blog/embedded/bootloader/chapter28-flash-layout) — boot/rootfs/shared 영역 크기 결정
- [Buildroot Ch 16: OTA 통합](/blog/embedded/buildroot/chapter16-ota) — Buildroot 측 RAUC·SWUpdate 패키징
- [원문 — U-Boot doc/README.bootcount](https://docs.u-boot.org/en/v2025.01/api/bootcount.html)
