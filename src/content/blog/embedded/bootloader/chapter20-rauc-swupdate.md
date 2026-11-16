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

## 한 줄 요약

> RAUC와 SWUpdate는 **서명된 업데이트 묶음을 검증해 쉬고 있는 슬롯에 쓰고, U-Boot 환경 변수를 바꿔 다음 부팅 대상을 넘기는** Linux 쪽 도구입니다. 둘 다 [17장](/blog/embedded/bootloader/chapter17-ab-update)의 U-Boot 스크립트가 읽을 변수를 `fw_setenv`로 씁니다. 다만 무엇을 서명하고 언제 검사하는지, 기본 설정에서 무엇을 하지 않는지가 서로 다릅니다.

이 글의 결과는 모두 실제로 실행한 것입니다. QEMU 11.1.3 `virt`(EDK2 펌웨어)에서 Debian 13.7 arm64 nocloud 이미지(SHA512를 Debian `SHA512SUMS`와 대조)를 띄우고 Debian 패키지를 설치했습니다. 버전은 RAUC 1.13(`rauc`, `rauc-service` 1.13-3+deb13u1), SWUpdate 2024.12.1(`2024.12.1+dfsg-3+deb13u2`), libubootenv 0.3.5입니다. 디스크는 넷을 붙였습니다. 시스템(`vda`), 슬롯 A(`vdb`), 슬롯 B(`vdc`), 그리고 [13장](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 U-Boot가 `saveenv`로 저장한 NOR flash 이미지(`vdd`)입니다.

## U-Boot 환경을 Linux에서 읽고 쓰기

두 도구 모두 U-Boot 환경을 libubootenv의 `fw_printenv`/`fw_setenv`로 다룹니다. 설정 파일 한 줄로 위치를 알려 줍니다.

```bash
echo '/dev/vdd 0x0 0x40000' > /etc/fw_env.config
```

장치, 오프셋, 크기는 U-Boot 쪽 `CONFIG_ENV_ADDR` 기준 오프셋과 `CONFIG_ENV_SIZE=0x40000`과 같아야 합니다. 맞게 적자 U-Boot가 저장한 21개 변수(`arch=arm`, `board=qemu-arm`, `boot_targets=…`)가 그대로 읽혔습니다. 13장에서 본 "CRC 4 byte + `이름=값\0`" 형식을 Linux 쪽 라이브러리도 똑같이 해석합니다. 슬롯 변수를 초기화했습니다.

```text
# fw_setenv BOOT_ORDER "A B"; fw_setenv BOOT_A_LEFT 3; fw_setenv BOOT_B_LEFT 3
# fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT
BOOT_ORDER=A B
BOOT_A_LEFT=3
BOOT_B_LEFT=3
```

## RAUC — 슬롯을 아는 설치기

RAUC는 장치에 `system.conf`를 두고 슬롯을 미리 선언합니다.

```ini
[system]
compatible=qemu-demo
bootloader=uboot
data-directory=/var/lib/rauc

[keyring]
path=/etc/rauc/keyring.pem

[slot.rootfs.0]
device=/dev/vdb
type=ext4
bootname=A

[slot.rootfs.1]
device=/dev/vdc
type=ext4
bootname=B
```

`bootname` A·B가 U-Boot 변수 `BOOT_A_LEFT`·`BOOT_B_LEFT`의 이름이 됩니다. RAUC는 지금 어느 슬롯으로 부팅했는지를 kernel command line에서 알아냅니다. 처음에는 `rauc status`가 D-Bus 오류로 실패했습니다. Debian은 데몬을 `rauc-service` 패키지로 따로 나눠 두었기 때문입니다. 이 패키지를 설치하고 GRUB에 `rauc.slot=A`를 넣은 뒤 다시 부팅했습니다.

```text
# cat /proc/cmdline
BOOT_IMAGE=/boot/vmlinuz-6.12.116+deb13-arm64 root=PARTUUID=... ro rauc.slot=A
# rauc status
=== System Info ===
Compatible:  qemu-demo
Booted from: rootfs.0 (A)
...
=== Bootloader ===
Activated: rootfs.0 (A)
```

### 번들 만들기와 첫 함정

번들의 입력은 이미지 파일과 `manifest.raucm`입니다.

```ini
[update]
compatible=qemu-demo
version=1.0.0

[bundle]
format=verity

[image.rootfs]
filename=rootfs.ext4
```

처음에는 거의 빈 16 MB ext4 이미지로 만들었다가 실패했습니다.

```text
# rauc bundle --cert=dev.cert.pem --key=dev.key.pem bundle demo.raucb
Creating 'verity' format bundle
Failed to create bundle: squashfs size (4096) must be larger than 4096 bytes
```

번들 본체는 squashfs로 압축되는데, 빈 ext4는 압축하면 4 KiB가 되어 verity 형식의 최소 크기에 걸렸습니다. 실제 rootfs라면 생기지 않는 일이지만, 빈 이미지로 파이프라인을 먼저 시험해 보는 CI에서는 그대로 걸립니다. 2 MB 난수 파일을 넣자 2.1 MB 번들이 만들어졌습니다.

```text
# rauc info --keyring=/etc/rauc/keyring.pem demo.raucb
Compatible:     'qemu-demo'
Version:        '1.0.0'
...
Bundle Format:  verity
  Verity Salt:  '500fd86a...'
  Verity Hash:  'fb5ddce2...'
  Verity Size:  24576
Manifest Hash:  'b73364e1...'
1 Image:
  [rootfs]
    Filename:  rootfs.ext4
    Checksum:  f6b944d6...
    Size:      16.8 MB (16777216 bytes)
Certificate Chain:
 0 Subject: CN = demo-signer
   ...
```

### 무엇이 서명되고, 언제 검사되나

같은 번들로 두 가지를 시험했습니다.

| 시험 | `rauc info` | `rauc install` |
| --- | --- | --- |
| 다른 키(keyring에 없는 인증서)로 서명 | `signature verification failed: Verify error: self-signed certificate` | — |
| 정상 번들의 오프셋 4096 byte를 바꿈(`dd ... bs=1 seek=4096`) | **통과**(오류 없음) | `Failed mounting bundle: Unexpected dm-verity status 'C' (instead of '\0')` |

변조한 번들이 `rauc info`를 통과한 이유는 verity 형식의 구조에 있습니다. RAUC v1.13 `docs/reference.rst`에 따르면 verity 번들의 CMS 서명은 **manifest를 품고 있고**, 그 manifest에 squashfs 전체에 대한 dm-verity root hash·salt·크기가 들어 있습니다. 서명 확인은 manifest까지만 하고, squashfs의 각 블록은 설치 중 kernel의 dm-verity가 실제로 읽을 때 검사합니다. 그래서 큰 번들도 전체를 한 번 해시하지 않고 바로 설치를 시작할 수 있고, 손상된 블록은 설치 단계에서 걸립니다. 서명 하나로 전체를 검사하는 `plain` 형식과 다른 점이고, [16장](/blog/embedded/bootloader/chapter16-verified-boot)에서 본 FIT 서명이 hash 값을 덮고 데이터는 따로 검사하는 구조와 같은 생각입니다.

### 설치하면 U-Boot 변수가 바뀐다

```text
# rauc install demo.raucb
...
 99% Copying image to rootfs.1 done.
100% Installing done.
Installing `/root/w/demo.raucb` succeeded
# fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT
BOOT_ORDER=B A
BOOT_A_LEFT=3
BOOT_B_LEFT=3
# mount -o ro /dev/vdc /mnt/b && cat /mnt/b/VERSION
rootfs version 1.0.0
```

부팅한 슬롯이 A이므로 RAUC는 B(`/dev/vdc`)에 썼고, `BOOT_ORDER`를 `B A`로 바꿨습니다. 다음 부팅 때 17장의 U-Boot 스크립트가 B부터 시도한다는 뜻입니다. `rauc status --detailed`에는 설치한 번들의 버전·manifest hash·체크섬·설치 시각이 슬롯마다 기록됩니다.

B가 실패했다고 OS가 판단한 상황을 `mark-bad`로 흉내 냈습니다.

```text
# rauc status mark-bad other
rauc status: marked slot rootfs.1 as bad
# fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT
BOOT_ORDER=A
BOOT_A_LEFT=3
BOOT_B_LEFT=0
```

17장에서 RAUC 소스(`r_uboot_set_state()`)로 본 그대로, bad는 그 슬롯을 `BOOT_ORDER`에서 빼고 남은 횟수를 0으로 씁니다.

## SWUpdate — 설명 파일이 정하는 설치

SWUpdate는 장치에 슬롯을 선언하지 않습니다. 업데이트 파일(`.swu`) 안의 `sw-description`이 "이 이미지를 이 장치에, 이 변수를 이 값으로"를 직접 적습니다. 기본 파서는 libconfig 문법입니다.

```text
software =
{
	version = "2.0.0";
	hardware-compatibility: [ "1.0" ];
	images: (
		{
			filename = "image.raw";
			device = "/dev/vdb";
			type = "raw";
			sha256 = "ed841d9b...";
		}
	);
	bootenv: (
		{ name = "BOOT_ORDER"; value = "A B"; },
		{ name = "BOOT_A_LEFT"; value = "3"; }
	);
}
```

`.swu`는 cpio archive이고, `sw-description`이 첫 항목이어야 합니다. 이 하나를 동작시키기까지 Debian 빌드의 기본값 세 개에 차례로 걸렸습니다.

**1. 서명이 필수입니다.** 서명 없는 `.swu`는 `Error: SWUpdate is built for signed images, provide a public key file.`로 거부됩니다.

**2. 서명 방식이 CMS입니다.** `openssl dgst -sign`으로 만든 RSA 서명과 공개키(`-k public.pem`)를 주자 `Error loading certificate chain from swu-pub.pem`이 나왔습니다. 이 빌드는 인증서 체인을 쓰는 CMS 방식이라, SWUpdate 2024.12 `doc/source/signed_images.rst`의 방법대로 서명해야 합니다.

```bash
openssl cms -sign -in sw-description -out sw-description.sig \
        -signer swu.cert.pem -inkey swu.key.pem -outform DER -nosmimecap -binary
printf 'sw-description\nsw-description.sig\nimage.raw\n' | cpio -o -H crc > signed.swu
```

같은 문서는 서명 인증서에 `keyUsage=digitalSignature`, `extendedKeyUsage=emailProtection`을 요구한다고 적고, 확장이 없는 인증서를 쓰려면 `CONFIG_CMS_IGNORE_CERTIFICATE_PURPOSE`로 검사를 끄라고 안내합니다. 확장이 없는 RAUC용 인증서로 서명해 봤더니 이 Debian 빌드에서는 `Verified OK`로 통과했습니다. 문서의 요구와 실제 빌드 설정이 다를 수 있으므로, 제품에서는 확장을 넣은 인증서를 쓰는 편이 어느 빌드에서도 안전합니다.

**3. 하드웨어 호환 정보가 필수입니다.** 서명이 통과한 뒤 `HW compatibility not found`로 멈췄습니다. 장치의 `/etc/hwrevision`(`qemu-virt 1.0`)과 `sw-description`의 `hardware-compatibility: [ "1.0" ]`을 맞추자 진행되었습니다. 다른 보드용 업데이트를 잘못 넣는 사고를 막는 장치입니다.

세 가지를 맞춘 뒤의 검사 결과입니다.

| 시험 | 결과 |
| --- | --- |
| 정상 서명 `.swu`, `swupdate -c`(검사만) | `SWUPDATE successful !` |
| 서명 뒤 `sw-description`의 `"A B"`를 `"B A"`로 바꿈 | `Signature verification failed` |
| 서명은 그대로, `image.raw`만 다른 내용으로 교체 | `Image invalid or corrupted. Not installing ...` |
| 정상 설치 | `/dev/vdb`의 앞 1 MiB가 `image.raw`와 일치(`cmp`) |

`sw-description`은 서명이, 이미지 내용은 그 안에 적힌 `sha256`이 지킵니다. RAUC verity와 마찬가지로 "서명은 해시 목록을, 해시는 데이터를" 지키는 2단 구조입니다.

### `bootenv`가 조용히 무시되는 기본값

정상 설치는 성공했고 로그에도 `Bootloader var: BOOT_ORDER = A B`가 찍혔지만, `fw_printenv`로 보니 U-Boot 환경은 그대로였습니다. 같은 로그에 이유가 있습니다.

```text
[TRACE] : SWUPDATE running :  [print_registered_bootloaders] : Registered bootloaders:
[TRACE] : SWUPDATE running :  [print_registered_bootloaders] : 	uboot	loaded.
[TRACE] : SWUPDATE running :  [print_registered_bootloaders] : 	none	loaded.
[TRACE] : SWUPDATE running :  [print_registered_bootloaders] : 	grub	loaded.
[TRACE] : SWUPDATE running :  [print_registered_bootloaders] : 	ebg	loaded.
[INFO ] : SWUPDATE running :  [main] : Using default bootloader interface: none
```

`swupdate -h`도 `-B, --bootloader : bootloader interface (default: none)`라고 적고 있습니다. `-B uboot`를 주고 다시 설치하자 비로소 써졌습니다.

```text
# swupdate -B uboot -k swu.cert.pem -i signed.swu
[INFO ] : SWUPDATE running :  [main] : Using bootloader interface: uboot
...
# fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT ustate
BOOT_ORDER=A B
BOOT_A_LEFT=3
BOOT_B_LEFT=0
ustate=1
```

`ustate=1`은 SWUpdate가 남기는 업데이트 상태 표시입니다(`-m`으로 끌 수 있습니다). 오류 없이 "성공"으로 끝나면서 bootloader 변수만 안 바뀌는 상황이라, 테스트에서 `fw_printenv`로 결과를 확인하지 않으면 놓치기 쉽습니다.

## 고리 닫기 — U-Boot가 그 값을 읽는다

Linux에서 RAUC와 SWUpdate가 쓴 환경 디스크(`vdd`)를 그대로 U-Boot QEMU의 두 번째 flash로 붙여 부팅했습니다.

```text
Loading Environment from Flash... OK
=> printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT ustate
BOOT_ORDER=A B
BOOT_A_LEFT=3
BOOT_B_LEFT=0
ustate=1
```

U-Boot는 Linux 쪽이 다시 계산한 CRC를 정상으로 받아들였고, 17장의 슬롯 스크립트가 읽을 값이 그대로 있습니다. "Linux 업데이트 도구 → U-Boot 환경 → U-Boot 슬롯 스크립트"로 이어지는 A/B 업데이트의 전체 경로가 실제로 맞물립니다.

## 어느 쪽을 쓸까

| 기준 | RAUC | SWUpdate |
| --- | --- | --- |
| 슬롯을 누가 아는가 | 장치의 `system.conf`가 슬롯을 선언하고, 부팅한 슬롯의 반대편에 자동으로 씀 | `sw-description`이 대상 장치를 직접 적음. 반대편 선택은 collection/`-e` 등으로 직접 설계 |
| 서명 | CMS. verity 형식은 manifest만 서명하고 블록은 dm-verity가 설치 중 검사 | CMS(이 빌드). `sw-description` 서명 + 이미지별 `sha256` |
| U-Boot 변수 | `bootloader=uboot`면 설치·mark-good/bad가 `BOOT_ORDER`·`BOOT_<이름>_LEFT`를 씀 | `bootenv`에 적은 변수를 씀. 단 `-B uboot`(또는 설정 파일) 없이는 쓰지 않음 |
| 성공 확인 | `rauc status mark-good` | 제품이 직접 설계(`ustate` 등) |

슬롯 두 개로 rootfs를 통째로 바꾸는 제품이면 RAUC의 "슬롯을 아는" 모델이 실수를 줄여 주고, 파일·스크립트·여러 장치를 섞어 갱신하는 제품이면 SWUpdate의 설명 파일 모델이 유연합니다. 어느 쪽이든 위의 기본값 함정(빈 이미지, 서명 방식, 하드웨어 호환, `-B none`)을 CI에서 한 번은 실제 장치 이미지로 밟아 보는 것이 가장 확실한 검증입니다.

## 정리

- 두 도구 모두 libubootenv(`/etc/fw_env.config`)로 U-Boot 환경을 읽고 씁니다. U-Boot가 저장한 환경을 Linux가 읽고, Linux가 쓴 환경을 U-Boot가 다시 읽었습니다.
- RAUC는 `rauc.slot=`으로 부팅 슬롯을 알고, 설치하면 반대편 슬롯에 쓰고 `BOOT_ORDER`를 바꿉니다. Debian에서는 `rauc-service`가 별도 패키지입니다.
- verity 번들의 서명은 manifest(+verity root hash)만 덮습니다. 변조 번들은 `rauc info`를 통과하고 `rauc install`의 dm-verity에서 막혔습니다. 거의 빈 이미지는 squashfs 최소 크기에 걸립니다.
- Debian SWUpdate는 서명 필수·CMS 방식·하드웨어 호환 필수이며, 기본 bootloader 인터페이스가 `none`이라 `-B uboot` 없이는 `bootenv`를 쓰지 않습니다.
- SWUpdate는 `sw-description` 서명과 이미지 `sha256`로, RAUC verity는 manifest 서명과 dm-verity로 2단 검증합니다.

## 다음 장 예고

다음 장에서는 새 보드에 U-Boot를 올리는 순서를 다룹니다. defconfig와 DTS를 만들고, SPL 단계에서 쓸 장치를 고르고, 첫 시리얼 출력이 나오기까지를 [8장](/blog/embedded/bootloader/chapter08-board-init)~[10장](/blog/embedded/bootloader/chapter10-storage-boot)의 흐름에 맞춰 따라갑니다.

## 관련 항목

- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update) — U-Boot bootcount와 product bootchooser 경계
- [Ch 21: 새 보드 U-Boot 포팅](/blog/embedded/bootloader/chapter21-board-porting)
- [RAUC v1.13 reference — bundle formats](https://github.com/rauc/rauc/blob/v1.13/docs/reference.rst)
- [RAUC integration — U-Boot](https://github.com/rauc/rauc/blob/master/docs/integration.rst)
- [SWUpdate 2024.12 — signed images](https://github.com/sbabic/swupdate/blob/2024.12/doc/source/signed_images.rst)
