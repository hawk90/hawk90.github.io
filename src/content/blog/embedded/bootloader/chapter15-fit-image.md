---
title: "FIT image 구조 분석 — multi-image·hash·configuration 추적"
slug: "embedded/bootloader/chapter15-fit-image"
date: 2026-05-09T09:15:00
description: "Flattened Image Tree — kernel·DTB·initramfs·overlay를 한 컨테이너로 묶는 포맷."
series: "Bootloader Internals"
seriesOrder: 15
tags: [embedded, bootloader, u-boot, fit, mkimage]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> FIT은 **device tree 형식의 파일 하나에 kernel·DTB·ramdisk를 넣고, 각각의 hash와 "어떤 조합으로 부팅할지(configuration)"를 함께 적은 컨테이너**입니다. U-Boot는 부팅할 때 hash를 다시 계산해 한 byte라도 바뀐 이미지를 거부합니다. 단, 어떤 configuration이 선택되는지는 `default` 속성만 보고 판단하면 안 됩니다.

이 글의 FIT은 실제로 만들어 부팅했습니다. 재료는 [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)의 Debian 13.7 arm64 kernel(37,660,608 byte), QEMU `virt` DTB를 바탕으로 `chosen/bootargs`만 다르게 만든 rev A·rev B DTB 두 개, 파일 하나짜리 gzip initramfs입니다. 이것들을 U-Boot v2024.04 빌드가 만든 `tools/mkimage`로 묶고, QEMU 11.1.3 `virt`(`qemu_arm64_defconfig`)에서 `bootm`했습니다.

## 왜 FIT인가

kernel, DTB, initramfs를 따로 두면 세 파일의 버전이 어긋나는 일이 생깁니다. kernel은 새것인데 DTB는 옛것인 상태로 부팅하면, 드라이버가 기대하는 노드가 없어 장치 하나가 조용히 사라지는 식의 문제가 납니다. FIT은 세 파일을 한 파일에 묶고, "이 kernel은 이 DTB와 함께"라는 조합을 configuration으로 적어 둡니다. 도시락에 비유하면 반찬(이미지)을 칸마다 담고, 뚜껑에 "A세트 = 밥 + 반찬1 + 반찬3"처럼 조합표(configuration)를 붙인 것입니다.

## ITS 작성

FIT의 원본은 ITS(Image Tree Source)라는 device tree source 파일입니다. 실제로 쓴 파일입니다.

```dts
/dts-v1/;
/ {
	description = "Debian kernel + two DTB revisions";
	#address-cells = <1>;
	images {
		kernel-1 {
			description = "Linux kernel";
			data = /incbin/("./Image");
			type = "kernel";
			arch = "arm64";
			os = "linux";
			compression = "none";
			load = <0x40400000>;
			entry = <0x40400000>;
			hash-1 { algo = "sha256"; };
		};
		fdt-1 {
			description = "DTB rev A";
			data = /incbin/("./virt-revA.dtb");
			type = "flat_dt";
			arch = "arm64";
			compression = "none";
			load = <0x43000000>;
			hash-1 { algo = "sha256"; };
		};
		fdt-2 {
			description = "DTB rev B";
			data = /incbin/("./virt-revB.dtb");
			/* fdt-1과 같은 속성 */
		};
		ramdisk-1 {
			description = "Initramfs";
			data = /incbin/("./rootfs.cpio.gz");
			type = "ramdisk";
			arch = "arm64";
			os = "linux";
			compression = "none";	/* gzip이어도 none. 아래 설명 참고 */
			load = <0x44000000>;
			hash-1 { algo = "sha256"; };
		};
	};
	configurations {
		default = "conf-revA";
		conf-revA {
			kernel = "kernel-1";
			fdt = "fdt-1";
			ramdisk = "ramdisk-1";
		};
		conf-revB {
			kernel = "kernel-1";
			fdt = "fdt-2";
			ramdisk = "ramdisk-1";
		};
	};
};
```

두 가지는 실험으로 고친 부분입니다.

**ramdisk의 `compression`.** 처음에는 initramfs가 gzip이니 `compression = "gzip"`으로 적었습니다. 그러자 `bootm`이 이렇게 경고했습니다.

```text
   Loading ramdisk from 0x523ee87c to 0x44000000
WARNING: 'compression' nodes for ramdisks are deprecated, please fix your .its file!
```

`boot/image-fit.c`(v2024.04)를 보면 U-Boot는 ramdisk를 **압축을 풀지 않고 그대로 복사**한 뒤 이 경고만 출력합니다. gzip initramfs는 kernel이 직접 풀기 때문입니다. 그래서 ramdisk는 내용이 압축되어 있어도 `compression = "none"`으로 적습니다.

**configuration 안의 `hash`.** configuration 노드에 `hash-1`을 넣은 예제가 돌아다니지만, v2024.04 `doc/usage/fit/source_file_format.rst`의 configuration 노드 구조에는 `description`, `kernel`, `fdt`, `loadables`, `script`, `compatible`과 `signature-1`이 있을 뿐 hash 노드는 없습니다. configuration을 보호하는 것은 hash가 아니라 서명입니다.

## 빌드와 hash 확인

```bash
mkimage -f board.its board.itb
```

`mkimage -l`로 결과를 보면 각 이미지의 hash가 채워져 있습니다.

```text
$ mkimage -l board.itb
FIT description: Debian kernel + two DTB revisions
 Image 0 (kernel-1)
  Description:  Linux kernel
  Type:         Kernel Image
  Compression:  uncompressed
  Data Size:    37660608 Bytes = 36777.94 KiB = 35.92 MiB
  Load Address: 0x40400000
  Entry Point:  0x40400000
  Hash algo:    sha256
  Hash value:   9c37ace54ef7e1919411fd912e9f34d6982ddd7f4c8ef3c8aee56f4c4d70db67
 Image 1 (fdt-1)
...
 Default Configuration: 'conf-revA'
```

host에서 `shasum -a 256 Image`를 해도 `9c37ace5…db67`이 나옵니다. hash 노드는 kernel 데이터 자체의 SHA-256이고, 결과 `.itb`는 37,678,708 byte로 원본 kernel보다 약 18 KB 큽니다. 그 차이가 DTB 두 개, initramfs, 그리고 이 메타데이터입니다.

## `bootm`이 하는 일

FIT을 메모리에 올리고 configuration을 지정해 `bootm`하면, U-Boot는 이미지마다 hash를 다시 계산하고 `load` 주소로 복사합니다.

```text
=> load virtio 0:1 0x50000000 /boot/board.itb
37678708 bytes read in 17 ms (2.1 GiB/s)
=> bootm 0x50000000#conf-revB
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-revB' configuration
   Verifying Hash Integrity ... OK
   Trying 'kernel-1' kernel subimage
     ...
     Data Start:   0x500000d4
     Data Size:    37660608 Bytes = 35.9 MiB
     ...
   Verifying Hash Integrity ... sha256+ OK
## Loading ramdisk from FIT Image at 50000000 ...
   ...
## Loading fdt from FIT Image at 50000000 ...
   Using 'conf-revB' configuration
   Trying 'fdt-2' fdt subimage
   ...
   Verifying Hash Integrity ... sha256+ OK
   Loading fdt from 0x523ec900 to 0x43000000
   Booting using the fdt blob at 0x43000000
   Loading Kernel Image to 40400000
   Loading Ramdisk to 7d587000, end 7d58708b ... OK
   Loading Device Tree to 000000007d582000, end 000000007d586ea5 ... OK

Starting kernel ...

[    0.000000] Linux version 6.12.107+deb13-arm64 ...
[    0.000000] Kernel command line: console=ttyAMA0 earlycon fit_conf=revB
```

몇 가지를 읽을 수 있습니다.

- `Data Start: 0x500000d4`는 FIT을 올린 주소 바로 뒤(`0xd4` = 212 byte)에 kernel 데이터가 있다는 뜻입니다. FIT은 기본적으로 데이터를 device tree 안에 그대로 담습니다.
- FIT을 `0x50000000`에 올린 것은 의도한 배치입니다. kernel은 `0x40400000`부터 약 36 MiB를 차지하므로, FIT을 그 범위 안(예: QEMU의 `loadaddr` `0x40200000`)에 올리면 kernel을 복사하는 순간 FIT 자신을 덮어씁니다.
- kernel command line이 rev B DTB에 적어 둔 `fit_conf=revB`였습니다. `boot/fdt_support.c`의 `fdt_chosen()`은 `board_fdt_chosen_bootargs()`(기본 구현은 `env_get("bootargs")`)가 값을 돌려줄 때만 DTB의 `bootargs`를 덮어씁니다. 이 환경에는 `bootargs` 변수가 없었으므로 DTB의 값이 그대로 kernel에 갔습니다. 반대로 환경에 `bootargs`가 있으면 DTB 쪽은 무시됩니다.

kernel은 이 initramfs에 init이 없어 `Kernel panic - not syncing: Attempted to kill init!`으로 끝났습니다. 확인하려던 것은 FIT 적재까지이므로 rootfs는 넣지 않았습니다.

## 한 byte를 바꾸면

FIT 파일에서 kernel 데이터 안쪽(파일 offset `0xd4 + 0x100000`)의 byte 하나를 반전시켜 같은 명령을 실행했습니다.

```text
=> bootm 0x50000000#conf-revB
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-revB' configuration
   Verifying Hash Integrity ... OK
   Trying 'kernel-1' kernel subimage
     ...
   Verifying Hash Integrity ... sha256 error!
Bad hash value for 'hash-1' hash node in 'kernel-1' image node
Bad Data Hash
ERROR -2: can't get kernel image!
```

kernel로 넘어가기 전에 멈췄습니다. 저장 장치의 bit 오류나 전송 중 손상은 이렇게 잡힙니다. 그러나 이 보호에는 한계가 있습니다. 바뀐 kernel로 `mkimage`를 다시 돌리면 hash 노드도 새 값으로 채워지고, U-Boot는 그 FIT을 정상으로 받아들입니다. hash는 "파일 안에서 서로 맞는가"만 보기 때문입니다. "내가 만든 이미지인가"를 확인하려면 서명이 필요합니다.

## 어떤 configuration이 선택되나 — `default`가 무시되는 경우

`#conf-…` 없이 `bootm 0x50000000`만 치면 `default = "conf-revA"`가 쓰일 것 같습니다. 그런데 이 QEMU 빌드는 `CONFIG_FIT_BEST_MATCH=y`이고, 그 경우 동작이 다릅니다. rev A DTB의 루트 `compatible`을 `"vendor,board-revA"`로 바꾸고(rev B는 QEMU와 같은 `"linux,dummy-virt"`), `default`는 그대로 `conf-revA`로 둔 FIT을 실행했습니다.

```text
=> bootm start 0x50000000
   Using 'conf-revB' configuration
   Trying 'kernel-1' kernel subimage
   ...
   Trying 'fdt-2' fdt subimage
```

`default`가 rev A인데 rev B가 선택되었습니다. `boot/image-fit.c`의 `fit_image_load()`는 configuration 이름이 주어지지 않았고 `CONFIG_FIT_BEST_MATCH`가 켜져 있으면 `fit_conf_find_compat()`로 **U-Boot 자신의 DTB 루트 compatible과 가장 잘 맞는 configuration**을 고르고, `default` 속성은 보지 않습니다. 비교에 쓰는 compatible은 configuration 노드의 `compatible` 속성이고, 없으면 그 configuration이 가리키는 DTB의 루트 compatible입니다(`source_file_format.rst`). 처음 실험에서 두 DTB의 compatible이 같았을 때는 동점이라 앞의 `conf-revA`가 골라졌고, 그래서 `default`가 동작하는 것처럼 보였습니다.

여러 보드 revision을 FIT 하나로 지원하려면 이 기능이 바로 필요한 것이지만, 의도하지 않았다면 `default`를 믿고 있다가 다른 DTB로 부팅됩니다. `bootcmd`에서 `bootm ${loadaddr}#conf-${board_rev}`처럼 이름을 명시하면 두 경우 모두 그 configuration이 쓰입니다.

## 서명으로 이어지기

hash의 한계를 메우는 것이 서명입니다. configuration 노드에 `signature-1`을 두고, `mkimage`에 키를 주면 서명이 채워집니다. v2024.04 `mkimage -h`의 해당 옵션입니다.

| 옵션 | 의미 (`mkimage -h`) |
| --- | --- |
| `-k` | 개인 키가 있는 디렉터리 |
| `-K` | 공개 키를 써 넣을 `.dtb` 파일 (보통 U-Boot의 control DTB) |
| `-r` | 사용한 키를 dtb에서 `required`로 표시 |
| `-g` / `-G` | 키 이름 힌트 / 이 서명 키를 직접 지정 |
| `-F` | 이미 만든 FIT을 다시 서명 |

공개 키가 U-Boot의 DTB에 들어가고 `required`로 표시되어야, 서명이 없거나 틀린 FIT을 U-Boot가 거부합니다. 키 생성부터 실제로 서명된 FIT이 통과·거부되는 과정은 [16장](/blog/embedded/bootloader/chapter16-verified-boot)에서 같은 QEMU 환경으로 이어서 실행합니다.

## 정리

- FIT은 device tree 형식 파일에 이미지와 hash, configuration을 함께 담습니다. `mkimage -l`의 kernel hash는 host의 `shasum -a 256`과 같았습니다.
- ramdisk는 gzip이어도 `compression = "none"`으로 적습니다. U-Boot는 ramdisk를 풀지 않고 v2024.04는 경고를 냅니다. configuration에는 hash가 아니라 `signature`를 둡니다.
- FIT을 올리는 주소는 kernel의 `load` 범위와 겹치지 않게 잡습니다(이 실험은 `0x50000000`).
- 환경에 `bootargs`가 없으면 DTB의 `chosen/bootargs`가 그대로 kernel에 갑니다.
- kernel 데이터 1 byte를 바꾸자 `sha256 error!`로 부팅이 멈췄습니다. 하지만 hash는 다시 계산하면 그만이라 출처는 보증하지 못합니다.
- `CONFIG_FIT_BEST_MATCH`가 켜진 빌드에서는 configuration 이름을 주지 않으면 `default` 대신 compatible이 가장 잘 맞는 configuration이 선택됩니다.

## 다음 장 예고

다음 글에서는 *verified boot*의 전체 사슬을 봅니다. SoC ROM → SPL → U-Boot → FIT까지, 서명·해시가 어떻게 이어져 trust chain을 만드는지 정리합니다.

## 관련 항목

- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — FIT를 적재하는 새 모델
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — FIT 서명을 root of trust로
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — FIT 단위의 atomic update
- [Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — root of trust 개념
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — FIT와 OTA 결합
- [U-Boot v2024.04 `doc/usage/fit/source_file_format.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/fit/source_file_format.rst)
- [U-Boot v2024.04 `doc/usage/fit/signature.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/fit/signature.rst)
- [U-Boot v2024.04 `boot/image-fit.c`](https://github.com/u-boot/u-boot/blob/v2024.04/boot/image-fit.c)
