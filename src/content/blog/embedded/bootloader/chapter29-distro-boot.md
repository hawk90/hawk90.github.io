---
title: "U-Boot Distro Boot — extlinux·boot.scr 표준화 분석"
slug: "embedded/bootloader/chapter29-distro-boot"
date: 2026-05-19T09:29:00
description: "U-Boot v2024.04의 두 실제 빌드로 옛 distro_bootcmd 스크립트와 Standard Boot를 비교하고, boot.scr·FIT script를 변조해 source와 bootm이 무엇을 막고 무엇을 통과시키는지 QEMU에서 확인합니다."
series: "Bootloader Internals"
seriesOrder: 29
tags: [embedded, bootloader, u-boot, distro-boot, extlinux]
draft: false
topics: ["embedded"]
---

배포판 입장에서 보드는 수백 종입니다. Debian이나 Fedora가 보드마다 다른 부팅 명령을 만들어 줄 수는 없으므로, "이 경로에 이 형식의 파일을 두면 부트로더가 찾아서 부팅한다"는 약속이 필요합니다. U-Boot에서 이 약속을 Distro Boot라고 부르고, 실제 형식은 `extlinux.conf`와 U-Boot script(`boot.scr`)입니다.

[Ch 14](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)에서 Standard Boot(bootstd)가 이 파일들을 찾는 과정을 QEMU 로그로 따라갔고, [Ch 13](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 `boot.scr`을 만들었습니다. 이 장은 두 가지를 더 봅니다. 하나는 같은 약속을 지키는 두 세대의 구현, 곧 옛 `distro_bootcmd` 스크립트와 bootstd가 v2024.04 실제 빌드에서 어떻게 다른지입니다. 다른 하나는 그 약속으로 찾아 실행하는 스크립트를 믿을 수 있는지입니다. 두 번째 질문에서는 서명 검사를 끄는 환경 변수 하나를 실제로 재현했습니다.

## 한 줄 요약

v2024.04의 i.MX8MM EVK는 아직 `bootcmd=run distro_bootcmd`(기본 변수 43개)이고, qemu_arm64는 `bootcmd=bootflow scan -lb`(21개)입니다. 둘 다 `/`와 `/boot/`에서 `extlinux/extlinux.conf`와 `boot.scr`을 찾습니다. legacy `boot.scr`의 CRC는 변조를 막지 못하고, 서명한 FIT script도 `source <addr>:<image>`로 부르거나 환경 변수 `verify=n`이면 서명 검사를 건너뜁니다. `verify=n`은 `bootm`의 FIT 서명 강제도 끕니다.

## 같은 약속, 두 세대의 구현

옛 방식은 동네 지도를 손으로 그린 쪽지와 같습니다. "1번 집에 가서 문이 열려 있으면 들어가고, 안 되면 2번 집"을 환경 변수 문자열로 적어 두었습니다. 새 방식은 내비게이션입니다. 같은 목적지를 찾지만 길 찾기 규칙이 C 코드에 들어 있습니다.

v2024.04로 빌드한 두 보드에서 `make u-boot-initial-env`로 기본 환경을 뽑아 비교했습니다.

| 항목 | i.MX8MM EVK (`imx8mm_evk_defconfig`) | QEMU (`qemu_arm64_defconfig`) |
|------|-----------------------------------|------------------------------|
| 설정 | `CONFIG_DISTRO_DEFAULTS=y`, `CONFIG_BOOTSTD=y` | `CONFIG_BOOTSTD_DEFAULTS=y`, `CONFIG_BOOTSTD_BOOTCOMMAND=y` |
| `bootcmd` | `run distro_bootcmd` | `bootflow scan -lb` |
| `boot_targets` | `mmc1 mmc2 dhcp` | `qfw usb scsi virtio nvme dhcp` |
| 기본 환경 변수 수 | 43 | 21 |

i.MX8MM은 bootstd도 켜져 있지만 `bootcmd`는 여전히 스크립트입니다. `boot/Kconfig:857`의 `DISTRO_DEFAULTS` 제목은 이미 "(deprecated) Script-based booting of Linux distributions"이고, 도움말은 "These scripts have been replaced by Standard Boot. Do not use them on new boards."라고 적습니다. 새 보드는 bootstd로 시작하고, 기존 보드는 v2024.04 시점에 아직 옮기는 중이라는 뜻입니다.

### 옛 스크립트의 길 찾기

i.MX8MM 기본 환경에서 `bootcmd`부터 따라가면 스크립트가 어떻게 장치를 훑는지 보입니다.

```text
bootcmd=run distro_bootcmd
distro_bootcmd=for target in ${boot_targets}; do run bootcmd_${target}; done
bootcmd_mmc1=devnum=1; run mmc_boot
mmc_boot=if mmc dev ${devnum}; then devtype=mmc; run scan_dev_for_boot_part; fi
scan_dev_for_boot=echo Scanning ${devtype} ${devnum}:${distro_bootpart}...; for prefix in ${boot_prefixes}; do run scan_dev_for_extlinux; run scan_dev_for_scripts; done;run scan_dev_for_efi;
boot_prefixes=/ /boot/
boot_syslinux_conf=extlinux/extlinux.conf
boot_scripts=boot.scr.uimg boot.scr
boot_a_script=load ${devtype} ${devnum}:${distro_bootpart} ${scriptaddr} ${prefix}${script}; source ${scriptaddr}
```

`boot_targets`의 장치마다, 부팅 가능한 파티션마다, `boot_prefixes`(`/`, `/boot/`)마다 먼저 `extlinux/extlinux.conf`를 찾고, 없으면 `boot.scr.uimg`와 `boot.scr`을 찾고, 마지막으로 EFI를 시도합니다. 찾은 스크립트는 `scriptaddr`(이 보드에서 `0x40480000`)에 읽어 `source ${scriptaddr}`로 실행합니다. 실패하면 `SCRIPT FAILED: continuing...`을 찍고 다음 후보로 갑니다.

`doc/develop/bootstd.rst`는 이 방식의 한계를 이렇게 정리합니다. 스크립트는 "work remarkably well"이지만 "hard to understand and extend, and the feature does not include tests"이고, 환경 변수와 `#define`으로 구현돼 있어서 설정을 정리하기 어렵다는 것입니다. 위 한 줄짜리 변수 아홉 개가 그 모습입니다. bootstd는 같은 탐색을 bootdev·bootmeth로 나눠 C로 옮겼고, 그 실행 결과는 [Ch 14](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)에 있습니다.

### 배포판 쪽 약속은 그대로

구현이 바뀌어도 배포판이 지킬 약속은 같습니다. `doc/develop/distro.rst`는 표준 형식을 "extlinux.conf, as handled by U-Boot's \"syslinux\" (disk) or \"pxe boot\" (network)"라고 정하고, U-Boot가 디스크에서 `/extlinux/extlinux.conf`, 그다음 `/boot/extlinux/extlinux.conf`를 찾는다고 적습니다. 위 스크립트의 `boot_prefixes`·`boot_syslinux_conf` 조합과 bootstd의 extlinux bootmeth가 같은 경로를 봅니다. 그래서 배포판은 `extlinux.conf`만 맞게 두면 두 세대 U-Boot 모두에서 부팅됩니다.

## 찾은 스크립트를 믿을 수 있나

`extlinux.conf`는 설정 파일이지만 `boot.scr`은 U-Boot 명령을 그대로 실행하는 프로그램입니다. `setenv`, `mmc write`, `fuse prog`까지 무엇이든 들어갈 수 있습니다. 그래서 "파티션에 놓인 스크립트를 누가 썼는가"가 중요해집니다. 신분증 검사로 비유하면, legacy 스크립트의 CRC는 신분증이 구겨지지 않았는지만 보는 것이고, FIT 서명은 발급 기관 도장까지 확인하는 것입니다. 실제로 어디까지 막는지 시험했습니다.

### 실험 준비

U-Boot는 [Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)의 `qemu_arm64` 빌드(`CONFIG_FIT_SIGNATURE=y`, `CONFIG_LEGACY_IMAGE_FORMAT=y`, `CONFIG_CMD_SOURCE=y`)이고, QEMU는 `-dtb qemu-key.dtb`로 Ch 16의 공개키(`required = "conf"`)가 든 DTB를 줍니다. 스크립트는 `-device loader,...,addr=0x50000000`으로 RAM에 올렸습니다. 만든 이미지는 네 가지입니다.

- `legit.itb`: `echo legit script ran` 한 줄을 담은 FIT script. configuration `conf-1`에 `sign-images = "script"`인 서명을 `mkimage -k keys`로 넣음
- `evil.itb`: 같은 구조에 `echo ATTACKER script ran`. 서명 없이 `mkimage -f`로만 만듦(이미지 해시는 정상)
- `legit-flip.scr`: `mkimage -T script`로 만든 legacy 스크립트의 본문 1바이트를 바꾼 것
- `evil.scr`: 공격자가 `mkimage -T script`로 새로 만든 legacy 스크립트

### 결과

| # | 명령 | 이미지 | 결과 |
|---|------|--------|------|
| A | `source 0x50000000` | `legit.itb` | `sha256,rsa2048:dev+ sha256+ legit script ran` |
| B | `source 0x50000000` | `evil.itb` | `Failed to verify required signature 'key-dev'`, 실행 안 됨 |
| C | `source 0x50000000:script-1` | `evil.itb` | `sha256+ ATTACKER script ran` |
| D | `setenv verify n` 후 `source 0x50000000` | `evil.itb` | `ATTACKER script ran` |
| E | `source 0x50000000` | `legit-flip.scr` | `Bad data crc`, 실행 안 됨 |
| F | `source 0x50000000` | `evil.scr` | `ATTACKER script ran` |

E와 F가 legacy 스크립트의 한계입니다. CRC는 우연한 손상(E)을 잡지만, 공격자가 `mkimage`로 새로 만들면 CRC도 새로 맞으므로(F) 그대로 실행됩니다. 키가 없으니 막을 근거가 없습니다.

A와 B는 기대대로입니다. 문제는 C와 D입니다. 둘 다 `boot/image-board.c`의 `image_locate_script()`에서 이유를 찾을 수 있습니다.

```c
	verify = env_get_yesno("verify");
	...
	case IMAGE_FORMAT_FIT:
		...
			if (!fit_uname) {
				...
				if (verify && fit_config_verify(fit_hdr, noffset))
					return 1;
				...
			} else {
fallback:
				...
			}
			...
			/* verify integrity */
			if (verify && !fit_image_verify(fit_hdr, noffset)) {
				puts("Bad Data Hash\n");
				return 1;
			}
```

configuration 서명을 확인하는 `fit_config_verify()`는 **이미지 이름이 주어지지 않았을 때만** 불립니다. `:script-1`처럼 이름을 주면 `fallback` 쪽으로 가서 이미지 노드의 해시만 확인하고, 서명 없는 `evil.itb`의 해시는 정상이니 통과합니다(C의 `sha256+`). 그리고 두 확인 모두 `verify`가 참일 때만 돕니다. `env_get_yesno("verify")`는 변수가 없으면 -1(참으로 취급)이지만, `n`이면 0이 되어 확인을 모두 건너뜁니다(D).

### 같은 스위치가 bootm에도 있다

`verify`는 스크립트에만 쓰이는 변수가 아닙니다. `boot/bootm.c:262`의 `bootm_start()`도 `images.verify = env_get_yesno("verify")`로 값을 읽고, `boot/image-fit.c`의 `fit_image_load()`는 `images->verify`가 참일 때만 `fit_config_verify()`를 부릅니다. Ch 16의 공격자 키 FIT(`evil.itb`, 커널·DTB·initramfs 묶음)로 확인했습니다.

```text
=> bootm 0x50000000
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev-  error!
Verification failed for '<NULL>' hash node in 'conf-1' config node
Failed to verify required signature 'key-dev'
Bad Data Hash
ERROR -2: can't get kernel image!
```

```text
=> setenv verify n;bootm 0x50000000
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   ...
## Loading ramdisk from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   ...
## Loading fdt from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   ...
Starting kernel ...
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]
```

`required = "conf"` 키가 control DTB에 그대로 있는데도, `verify=n` 한 줄로 공격자 커널이 부팅됐습니다. v2024.04의 `doc/usage/environment.rst`와 `doc/usage/fit/signature.rst`에는 `verify` 환경 변수에 대한 설명이 없었고, 이 동작은 위 소스에서만 확인됩니다.

### 이 결과가 뜻하는 것

부팅 경로 자체는 C와 D를 직접 쓰지 않습니다. 옛 스크립트의 `boot_a_script`는 `source ${scriptaddr}`, bootstd의 script bootmeth는 `boot/bootmeth_script.c:224`에서 `cmd_source_script(addr, NULL, NULL)`로 이미지 이름 없이 부르므로 configuration 서명을 확인하는 쪽으로 갑니다. 문제는 그 판단이 **환경 변수**에 달려 있다는 점입니다. [Ch 13](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 본 것처럼 환경은 flash나 eMMC에 평문으로 저장되고 서명되지 않습니다. 저장 장치에 쓸 수 있는 공격자는 `verify=n`을 환경에 넣기만 하면 됩니다. [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 본 "검증 키가 체인 밖 DTB에 있는" 틈과 같은 구조의 틈이 환경 변수에도 있는 것입니다.

막는 방향은 환경을 체인 안으로 들이거나 쓰기를 막는 것입니다. v2024.04 `env/Kconfig:759`의 `ENV_WRITEABLE_LIST`는 "only environment variables which explicitly set the 'w' writeable flag can be written and modified at runtime"이고 "No variables can be otherwise created, written or imported"라고 설명합니다. 도움말대로라면 `w` 플래그를 주지 않은 `verify`는 런타임에 만들 수도, 저장된 환경에서 가져올 수도 없습니다. 저장된 환경 자체를 쓰지 않는 `CONFIG_ENV_IS_NOWHERE`도 선택지입니다. 이 장에서는 두 설정으로 C·D를 다시 시험하지 않았습니다.

## 어떤 형식을 고를까

| 요구 | 형식 | 이 장에서 확인한 것 |
|------|------|-------------------|
| 배포판이 보드와 무관하게 설치 | `extlinux.conf` | 두 세대 U-Boot가 같은 경로(`/`, `/boot/` 아래 `extlinux/extlinux.conf`)를 봄 |
| 보드별 명령이 필요한 부팅 | `boot.scr`(legacy) | CRC만 있음. 공격자가 다시 만든 스크립트는 실행됨(F) |
| 스크립트도 서명 검증 | FIT script + `required` 키 | 이름 없이 `source`하면 막음(B). 이름을 주거나 `verify=n`이면 통과(C, D) |
| 새 보드 | bootstd(`BOOTSTD_DEFAULTS`) | `DISTRO_DEFAULTS`는 v2024.04에서 deprecated |

## 정리

- v2024.04 i.MX8MM EVK는 `run distro_bootcmd`(스크립트, 기본 변수 43개), qemu_arm64는 `bootflow scan -lb`(bootstd, 21개)입니다. `DISTRO_DEFAULTS`는 "(deprecated)"입니다.
- 옛 스크립트는 `/`·`/boot/`마다 `extlinux/extlinux.conf`, 그다음 `boot.scr.uimg`·`boot.scr`을 찾고 마지막으로 EFI를 시도합니다. bootstd는 같은 파일을 찾지만 순서가 다릅니다. 전역 bootmeth `efi_mgr`을 먼저 훑고([Ch 14](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 `glob` 항목), 이후 bootmeth마다 모든 prefix를 차례로 봅니다.
- legacy `boot.scr`의 CRC는 1바이트 손상(`Bad data crc`)은 잡지만, 공격자가 새로 만든 스크립트는 막지 못합니다.
- 서명한 FIT script는 `source <addr>`에서는 공격자 스크립트를 막지만, `source <addr>:script-1`은 이미지 해시만 봐서 통과시킵니다.
- 환경 변수 `verify=n`은 `source`와 `bootm` 모두에서 서명 검사를 끕니다. 공격자 키 FIT가 `required = "conf"` 키가 있는 상태로 부팅됐습니다.
- 환경 변수는 서명되지 않으므로, 서명 부팅을 쓰는 제품은 `ENV_WRITEABLE_LIST`나 `ENV_IS_NOWHERE`로 `verify` 같은 변수의 변경을 막아야 합니다.

## 다음 편

다음은 [Ch 30: 부트로더 CI](/blog/embedded/bootloader/chapter30-bootloader-ci)입니다. 이 장의 C·D 같은 동작은 한 번 확인하고 끝낼 것이 아니라, 설정을 바꿀 때마다 자동으로 다시 시험해야 하는 항목입니다.

## 관련 항목

- [Ch 13: env와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — `boot.scr` 만들기와 환경 저장 형식
- [Ch 14: bootflow와 bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — bootstd 탐색의 실제 로그
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — 이 장에서 쓴 키와 FIT
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust) — 체인 밖에 놓인 검증 키
- [U-Boot v2024.04 — doc/develop/distro.rst](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/distro.rst)
- [U-Boot v2024.04 — doc/develop/bootstd.rst](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/bootstd.rst)
