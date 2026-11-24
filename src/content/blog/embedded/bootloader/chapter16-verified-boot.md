---
title: "U-Boot Verified Boot — RSA 서명과 public key 임베딩 흐름"
slug: "embedded/bootloader/chapter16-verified-boot"
date: 2026-05-09T09:16:00
description: "U-Boot Verified Boot — FIT 서명, public key를 U-Boot DT에 박는 워크플로."
series: "Bootloader Internals"
seriesOrder: 16
tags: [embedded, bootloader, u-boot, verified-boot, security]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> FIT 서명은 **U-Boot의 control DTB에 들어 있는 공개키 중 `required`로 표시된 것만** 검사합니다. `required`가 없으면 서명이 없거나 남의 키로 서명된 FIT도 아무 경고 없이 부팅됩니다. 그리고 서명은 이미지 데이터가 아니라 이미지의 hash 값을 덮으므로, 데이터 위조는 서명이 아니라 그다음 hash 검사에서 잡힙니다.

[15장](/blog/embedded/bootloader/chapter15-fit-image)에서 hash만으로는 "누가 만든 이미지인가"를 보증할 수 없다는 것을 봤습니다. 이 글은 같은 QEMU 환경에서 키를 만들고, FIT에 서명하고, 공개키를 U-Boot에 넣은 뒤, 정상·무서명·변조·다른 키 네 가지 FIT을 실제로 부팅시켜 결과를 비교합니다. U-Boot는 **v2024.04** `qemu_arm64_defconfig`(이미 `CONFIG_FIT_SIGNATURE=y`, `CONFIG_RSA=y`), QEMU 11.1.3 `virt`, kernel은 Debian 13.7 arm64입니다.

이 검증은 신뢰 사슬의 한 고리일 뿐입니다. U-Boot 자체와 그 안의 공개키를 앞 단계(ROM·SPL)가 검증하지 않으면, 공격자는 U-Boot를 통째로 바꿔 이 검사를 건너뜁니다. 그 앞쪽은 [23장](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)과 [27장](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 다룹니다.

## 키 만들기

서명용 개인키와 인증서를 만듭니다. 비교 실험을 위해 같은 이름(`dev`)의 다른 키도 하나 더 만들었습니다.

```bash
mkdir -p keys
openssl genpkey -algorithm RSA -out keys/dev.key -pkeyopt rsa_keygen_bits:2048
openssl req -batch -new -x509 -key keys/dev.key -out keys/dev.crt -subj /CN=dev
```

`mkimage`는 `-k` 디렉터리에서 `<key-name-hint>.key`·`.crt`를 찾으므로 파일 이름이 ITS의 `key-name-hint`와 맞아야 합니다.

## 서명할 ITS

15장의 ITS에서 configuration에 `signature-1`을 더한 것입니다.

```dts
	configurations {
		default = "conf-1";
		conf-1 {
			kernel = "kernel-1"; fdt = "fdt-1"; ramdisk = "ramdisk-1";
			signature-1 {
				algo = "sha256,rsa2048";
				key-name-hint = "dev";
				sign-images = "kernel", "fdt", "ramdisk";
			};
		};
	};
```

서명을 image 노드가 아니라 configuration에 두는 이유는 조합을 묶기 위해서입니다. image마다 따로 서명하면, 각각은 정상 서명이지만 서로 다른 버전에서 가져온 kernel과 DTB를 섞는 공격(mix-and-match)을 막을 수 없습니다.

## 공개키는 "U-Boot가 실제로 읽는 DTB"에 넣는다

```bash
mkimage -f signed.its -k keys -K <control.dtb> -r signed.itb
```

```text
Signature written to 'signed.itb', node '/configurations/conf-1/signature-1'
Public key written to 'qemu-key.dtb', node '/signature/key-dev'
```

여기서 처음 걸린 것이 `-K`에 줄 파일입니다. 보통은 `u-boot.dtb`를 주지만, QEMU 빌드는 `CONFIG_OF_BOARD=y`라 U-Boot가 자기 DTB가 아니라 **QEMU가 RAM 시작에 넣어 주는 DTB를 control DTB로 씁니다**(`board/emulation/qemu-arm/qemu-arm.c`의 `board_fdt_blob_setup()`). `u-boot.dtb`에 키를 넣어 봐야 읽히지 않습니다. v2024.04 `doc/develop/devicetree/dt_qemu.rst`대로 `-machine virt,dumpdtb=qemu.dtb`로 QEMU의 DTB를 뽑아 그 파일에 키를 넣고, QEMU를 `-dtb qemu-key.dtb`로 실행했습니다. 실제 보드라면 `CONFIG_OF_SEPARATE`일 때 키를 넣은 DTB로 다시 묶어야 하며, v2024.04 `Makefile`의 `EXT_DTB` 변수(`make EXT_DTB=<dtb>`, `doc/usage/fit/beaglebone_vboot.rst`의 예)가 그 방법입니다.

U-Boot에서 키가 들어갔는지 확인합니다.

```text
=> fdt addr ${fdtcontroladdr}
=> fdt list /signature/key-dev
key-dev {
	required = "conf";
	algo = "sha256,rsa2048";
	rsa,r-squared = <...>;
	rsa,modulus = <...>;
	rsa,exponent = <0x00000000 0x00010001>;
	rsa,n0-inverse = <0x88751b0d>;
	rsa,num-bits = <0x00000800>;
	key-name-hint = "dev";
};
```

`required = "conf"`가 `-r` 옵션의 결과이고, 공개키는 PEM이 아니라 U-Boot가 바로 계산에 쓰는 형태(modulus, exponent `0x10001`, 2048 bit)로 들어갑니다.

### 부팅 전에 키 삽입 결과 확인하기

호스트에서도 `dtc` 패키지의 `fdtget`으로 **QEMU에 넘길 바로 그 파일**을 검사합니다. 아래 명령은 앞에서 키를 넣은 `qemu-key.dtb`가 있는 디렉터리에서 실행합니다.

```bash
fdtget -t s qemu-key.dtb /signature/key-dev required
fdtget -t s qemu-key.dtb /signature/key-dev algo
fdtget -t u qemu-key.dtb /signature/key-dev rsa,num-bits
```

이 장의 설정에서 확인할 값은 차례로 `conf`, `sha256,rsa2048`, `2048`입니다. 첫 명령이 `FDT_ERR_NOTFOUND`로 실패하면 네 가지 FIT 비교에 앞서 `-r`과 키를 넣은 DTB 경로부터 확인합니다. 세 값이 맞는 것은 키 삽입과 필수 검증 설정을 확인한 것이며, 올바른 키 쌍인지는 아래의 정상 서명·다른 키 부팅 결과로 구별합니다. `required`의 의미와 `-K`·`-r` 조합은 [v2024.04 서명 문서](https://docs.u-boot.org/en/v2024.04/usage/fit/signature.html#public-key-storage)에 정의되어 있습니다.

## 네 가지 FIT으로 시험

같은 키 DTB로 부팅한 뒤 네 FIT을 차례로 `bootm`했습니다.

**① 서명 없는 FIT** (`signature-1`을 뺀 ITS로 만듦)

```text
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ...  error!
No 'signature' subnode found for '<NULL>' hash node in 'conf-1' config node
Failed to verify required signature 'key-dev'
Bad Data Hash
ERROR -2: can't get kernel image!
```

**② 다른 키로 서명한 FIT** (이름은 같은 `dev`, 키는 다름)

```text
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev-  error!
Verification failed for '<NULL>' hash node in 'conf-1' config node
Failed to verify required signature 'key-dev'
```

키 이름 힌트가 같아도 RSA 검증에서 `dev-`로 실패합니다. 이름은 키를 찾는 데만 쓰입니다.

**③ 정상 서명 FIT의 kernel 데이터 1 byte를 바꾼 것**

```text
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Trying 'kernel-1' kernel subimage
   Verifying Hash Integrity ... sha256 error!
Bad hash value for 'hash-1' hash node in 'kernel-1' image node
Bad Data Hash
```

**서명은 통과했습니다.** 그리고 바로 다음의 kernel hash에서 막혔습니다. 이것이 FIT 서명의 구조입니다. 서명된 노드 목록(`hashed-nodes`)을 FIT에서 꺼내 보면 다음과 같습니다.

```text
$ fdtget signed.itb /configurations/conf-1/signature-1 hashed-nodes
/ /configurations/conf-1 /images/kernel-1 /images/kernel-1/hash-1
/images/fdt-1 /images/fdt-1/hash-1 /images/ramdisk-1 /images/ramdisk-1/hash-1
```

`doc/usage/fit/signature.rst`는 이 노드들의 속성을 서명에 넣되 **이름이 `data`인 속성은 빼다고** 적고 있습니다. 즉 서명은 "kernel hash 값이 `9c37…`이다"를 보증하고, kernel 데이터가 그 hash와 맞는지는 이미지 hash 검사가 봅니다. 37 MB kernel 전체를 RSA로 서명하지 않아도 되는 이유이고, 동시에 이미지마다 `hash-1` 노드를 빼면 안 되는 이유입니다.

**④ 정상 서명 FIT**

```text
=> bootm 0x50000000
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Trying 'kernel-1' kernel subimage
   Verifying Hash Integrity ... sha256+ OK
## Loading ramdisk from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   ...
## Loading fdt from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   ...
Starting kernel ...

[    0.000000] Linux version 6.12.107+deb13-arm64 ...
```

configuration 서명(`sha256,rsa2048:dev+`)은 kernel·ramdisk·fdt를 꺼낼 때마다 한 번씩, 이미지 hash(`sha256+`)는 각 이미지에서 한 번씩 확인합니다.

## `-r`을 빼면 아무것도 막지 않는다

같은 공개키를 `-r` 없이 넣은 DTB(`required` 속성 없음)로 바꿔 ①과 ②를 다시 실행했습니다.

```text
=> fdt get value r /signature/key-dev required
libfdt fdt_getprop(): FDT_ERR_NOTFOUND
=> load virtio 0:1 0x50000000 /boot/unsigned.itb
=> bootm start 0x50000000
## Loading kernel from FIT Image at 50000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... OK
   Trying 'kernel-1' kernel subimage
   Verifying Hash Integrity ... sha256+ OK
...
=> load virtio 0:1 0x50000000 /boot/evil.itb
=> bootm start 0x50000000
   Using 'conf-1' configuration
   Verifying Hash Integrity ... OK
```

서명 없는 FIT도, 남의 키로 서명한 FIT도 통과했습니다. 서명 검사 줄(`sha256,rsa2048:dev`)조차 나오지 않습니다. 공개키가 아예 없는 원래 QEMU DTB에서도 결과는 같았습니다. `boot/image-fit-sig.c`의 `fit_config_verify_required_keys()`는 `/signature` 아래 키를 돌면서 `required`가 `"conf"`가 아닌 키는 `continue`로 건너뜁니다. **`CONFIG_FIT_SIGNATURE=y`와 공개키만으로는 검증이 강제되지 않고, `required`가 있어야 합니다.**

`required` 키가 여러 개면 기본은 모두 통과해야 하고(`all`), `/signature`에 `required-mode = "any"`를 두면 하나만 통과해도 됩니다(`signature.rst`, `fdtput -t s control.dtb /signature required-mode any`). 키를 교체하는 기간에 옛 키와 새 키를 함께 받는 용도입니다.

## 서명이 막지 못하는 것

- **옛 버전으로 되돌리기(rollback).** 예전에 정상 서명된 FIT은 지금도 정상 서명입니다. 취약점이 있던 이전 kernel을 다시 넣어도 위 ④처럼 통과합니다. 막으려면 서명된 버전 정보와, 되돌릴 수 없는 저장소(OTP·RPMB 등)의 counter를 비교하는 제품별 장치가 따로 필요합니다.
- **FIT 밖에서 오는 값.** 환경의 `bootargs`는 서명 범위 밖입니다. [15장](/blog/embedded/bootloader/chapter15-fit-image)에서 본 것처럼 환경에 `bootargs`가 있으면 서명된 DTB의 `chosen/bootargs`를 덮어쓰므로, 제품에서는 환경을 고정하거나 kernel command line을 서명된 DTB에서만 받게 구성합니다.
- **환경 변수 `verify`.** v2024.04에서 `verify=n`이면 `bootm`이 `required` 키가 있어도 configuration 서명 검사를 건너뜁니다(`boot/bootm.c:262`, `fit_image_load()`). 이 장의 공격자 키 FIT가 그 상태에서 부팅되는 것을 [29장](/blog/embedded/bootloader/chapter29-distro-boot)에서 재현했습니다. 환경은 서명되지 않으므로 제품에서는 이 변수를 바꿀 수 없게 막아야 합니다.
- **공개키를 담은 DTB 자체.** 이 장의 QEMU 구성에서 공개키는 `-dtb qemu-key.dtb`로 들어가는 런타임 DTB에 있습니다. 그 DTB를 공격자 키가 든 것으로 바꾸면 U-Boot는 공격자가 서명한 FIT를 `+ OK`로 받아들입니다. 앞 단계(TF-A Trusted Board Boot)가 `u-boot.bin`을 검증해도 이 DTB는 그 범위 밖입니다. [27장](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 이 장면을 실제로 재현하고, 키를 검증 범위 안으로 옮기는 방법을 정리했습니다.
- **부팅 이후의 rootfs.** FIT은 kernel·DTB·initramfs까지만 보호합니다. 그 뒤 rootfs의 무결성은 kernel의 dm-verity 같은 기능이 이어받고, dm-verity의 root hash가 서명된 이미지(예: 서명된 initramfs나 DTB)에서 와야 사슬이 이어집니다.

## 키 관리

개인키는 저장소에 넣지 않습니다. 개발 키라도 `keys/`를 `.gitignore`로 막고, 양산 키는 빌드 서버나 HSM에 둡니다. 이 실험의 결과가 보여 주듯, 키 이름(`key-name-hint`)은 같아도 키가 다르면 검증에 실패하므로 키를 바꿀 때는 새 공개키가 든 U-Boot를 먼저 배포하고(필요하면 `required-mode any`로 두 키를 함께 둔 뒤) 그다음 새 키로 서명한 FIT을 배포합니다.

## 정리

- 공개키는 U-Boot가 **실제로 읽는** control DTB에 넣습니다. QEMU(`CONFIG_OF_BOARD`)는 `dumpdtb`로 뽑은 DTB에 넣고 `-dtb`로 넘겼고, 실제 보드는 `EXT_DTB` 등으로 다시 묶습니다.
- 정상 서명은 `sha256,rsa2048:dev+ OK`, 무서명·다른 키는 `Failed to verify required signature 'key-dev'`로 막혔습니다.
- 서명은 `hashed-nodes`의 `data` 외 속성, 곧 이미지 hash 값을 덮습니다. 데이터 1 byte 변조는 서명을 통과한 뒤 이미지 hash에서 막혔습니다.
- `-r`(`required = "conf"`)이 없으면 서명 없는 FIT과 남의 키로 서명한 FIT이 모두 부팅됩니다.
- 서명은 rollback, 환경의 `bootargs`, 부팅 이후 rootfs를 막지 않습니다.

## 다음 장 예고

서명만으로는 안전한 *업데이트*를 보장할 수 없습니다. 다음 장에서는 OTA 도중 전원이 끊겨도 살아남는 A/B 슬롯 구조와 `bootcount`·`altbootcmd`를 사용한 자동 fallback을 봅니다.

## 관련 항목

- [Ch 15: FIT 이미지 — 한 묶음으로 부팅하기](/blog/embedded/bootloader/chapter15-fit-image) — 이번 장이 서명한 컨테이너 구조
- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 23: eFuse와 Root-of-Trust](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — 신뢰의 출발점이 되는 OTP 키 해시
- [Ch 25: TF-A로 BL 단계별 서명](/blog/embedded/bootloader/chapter25-tfa-optee) — BL1·BL2·BL31까지의 서명 흐름
- [Ch 27: 전체 chain of trust 정리](/blog/embedded/bootloader/chapter27-chain-of-trust) — eFuse→BL→kernel까지의 큰 그림
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — ROM·SPL 측 시점에서 본 같은 체인
- [U-Boot v2024.04 `doc/usage/fit/signature.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/fit/signature.rst) · [`boot/image-fit-sig.c`](https://github.com/u-boot/u-boot/blob/v2024.04/boot/image-fit-sig.c)
- [U-Boot v2024.04 `doc/develop/devicetree/dt_qemu.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/devicetree/dt_qemu.rst)
