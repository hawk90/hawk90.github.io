---
title: "임베디드 Chain of Trust — 다단계 서명 검증의 전체 흐름"
slug: "embedded/bootloader/chapter27-chain-of-trust"
date: 2026-05-19T09:27:00
description: "TF-A v2.15.0 Trusted Board Boot와 U-Boot FIT 서명을 QEMU에서 함께 켜고, BL33 변조가 거부되는 경로와 FIT 공개키가 체인 밖 DTB에 있을 때 공격자 FIT가 부팅되는 장면을 실제 로그로 보여 줍니다."
series: "Bootloader Internals"
seriesOrder: 27
tags: [embedded, bootloader, secure-boot, chain-of-trust, signing]
draft: false
topics: ["embedded"]
---

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서는 U-Boot가 FIT 서명을 검증하는 것을, [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)에서는 i.MX BootROM이 fuse의 SRK 해시로 첫 이미지를 검증하는 것을 봤습니다. 각 단계의 검증이 따로 동작한다는 것은 확인했습니다. 이 장의 질문은 그다음입니다. **단계와 단계 사이의 이음새가 정말 이어져 있는가.**

체인은 가장 약한 고리만큼만 강합니다. 그래서 이 장은 검증 기능을 하나씩 소개하지 않고, 실제로 체인을 이어 붙여 본 뒤 끊어지는 자리를 찾습니다. 실험 환경은 [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)와 같습니다. TF-A **v2.15.0** `PLAT=qemu`에 이번에는 Trusted Board Boot(TBB)를 켜고, BL33으로 U-Boot v2024.04 `qemu_arm64`를, FIT는 Ch 16의 커널·DTB·initramfs 묶음을 썼습니다. 실행은 QEMU 11.1.3 `virt,secure=on`, `cortex-a57` 2코어, 1 GiB입니다.

## 한 줄 요약

TBB를 켠 TF-A는 BL33(U-Boot) 1바이트 변조를 `Failed to load image id 5 (-80)`으로 막았습니다. 그런데 같은 시스템에서 FIT 공개키가 든 DTB를 공격자 키로 바꾸자, TBB는 그대로 통과했고 U-Boot는 공격자가 서명한 FIT를 `sha256,rsa2048:dev+ OK`로 받아 커널을 실행했습니다. 다음 단계를 검증하는 키가 앞 단계가 검증한 데이터 *안에* 있어야 체인이 이어집니다.

![SoC ROM trust anchor에서 TF-A Trusted Board Boot, U-Boot FIT 검증, Linux kernel을 거쳐 module signing과 dm-verity로 갈라지는 검증 단계와 각 단계가 성립하는 조건을 나타낸 그림](/images/blog/bootloader/diagrams/ch27-chain-of-trust.svg)

그림의 각 화살표가 이 장에서 점검하는 고리 하나입니다. 아래에서는 앞의 세 고리(trust anchor → TBB → FIT)를 실제로 이어 붙이고 끊어 봅니다.

## 체인의 첫 고리 — ROTPK 해시

체인의 출발점은 바꿀 수 없는 곳에 둔 키입니다. i.MX에서는 fuse의 SRK 해시였습니다. QEMU에는 fuse가 없으므로 TF-A QEMU 포트는 그 역할을 BL1 바이너리에 맡깁니다. `plat/qemu/qemu/platform.mk`는 `TRUSTED_BOARD_BOOT`가 켜지면 빌드 중에 `openssl genrsa 2048`로 `rot_key.pem`을 만들고, 그 공개키 DER의 SHA-256을 `rotpk_sha256.bin`에 씁니다. `plat/qemu/common/qemu_rotpk.S`는 이 파일을 `.incbin ROTPK_HASH`로 바이너리에 직접 넣고, `qemu_trusted_boot.c`의 `plat_get_rotpk_info()`가 `ROTPK_IS_HASH` 플래그와 함께 그 위치를 돌려줍니다.

빌드 결과에서 확인했습니다. `rot_key.pem` 공개키의 SHA-256은 `c50a2e76…e1db78ff`이고, 이 32바이트가 `bl1.bin`의 `0xe7c3`, `bl2.bin`의 `0xe37b`에 들어 있으며 `bl31.bin`에는 없습니다. 인증서를 검사하는 BL1과 BL2만 루트 키를 압니다. 실제 SoC라면 이 32바이트가 OTP에 있어야 하고, QEMU처럼 flash에 있는 BL1에 있으면 BL1을 바꾸는 공격자가 루트 키도 바꿀 수 있습니다. QEMU 포트는 체인의 *구조*를 보여 주는 실험대이지 보안 제품이 아닙니다.

## TBB 빌드와 FIP 안의 인증서

[Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)의 빌드 명령에 두 옵션을 더합니다.

```bash
make CROSS_COMPILE=aarch64-elf- PLAT=qemu DEBUG=1 LOG_LEVEL=40 \
     TRUSTED_BOARD_BOOT=1 GENERATE_COT=1 \
     BL33=u-boot.bin all fip
```

macOS에서는 한 번 더 막혔습니다. `drivers/auth/mbedtls/mbedtls_common.mk`가 mbed TLS 버전을 `grep -hP`로 읽는데, macOS 기본 `grep`에는 `-P`가 없어서 버전이 빈 값이 되고 `Error: TF-A only supports MbedTLS versions > 3.x`로 멈춥니다. 서브모듈(`contrib/mbed-tls`)의 `build_info.h`는 실제로 `MBEDTLS_VERSION_MAJOR 3`이었습니다. Homebrew GNU grep을 PATH 앞에 두자 빌드가 끝났고, `cert_create` 도구가 인증서를 만들었습니다.

```text
$ fiptool info fip.bin
Trusted Boot Firmware BL2: offset=0x1A0, size=0x133AC, cmdline="--tb-fw"
EL3 Runtime Firmware BL31: offset=0x1354C, size=0xF89B, cmdline="--soc-fw"
Non-Trusted Firmware BL33: offset=0x22DE7, size=0xFFB30, cmdline="--nt-fw"
Trusted key certificate: offset=0x122917, size=0x616, cmdline="--trusted-key-cert"
SoC Firmware key certificate: offset=0x122F2D, size=0x4E2, cmdline="--soc-fw-key-cert"
Non-Trusted Firmware key certificate: offset=0x12340F, size=0x4F2, cmdline="--nt-fw-key-cert"
Trusted Boot Firmware BL2 certificate: offset=0x123901, size=0x4BE, cmdline="--tb-fw-cert"
SoC Firmware content certificate: offset=0x123DBF, size=0x438, cmdline="--soc-fw-cert"
Non-Trusted Firmware content certificate: offset=0x1241F7, size=0x448, cmdline="--nt-fw-cert"
```

Ch 25의 세 항목에 인증서 여섯 개가 붙었습니다. 인증서는 두 종류입니다. *key certificate*는 다음 단계를 서명할 공개키를 담고, *content certificate*는 이미지의 해시를 담습니다. 회사 출입증에 비유하면 key certificate는 "이 사람이 부서 출입증을 발급할 수 있다"는 위임장이고, content certificate는 그 부서장이 발급한 개인 출입증입니다.

## 부팅 로그에 보이는 검증 순서

DEBUG 빌드의 로그에서 이미지 ID를 따라가면 검증 순서가 보입니다. ID는 `include/export/common/tbbr/tbbr_img_def_exp.h`에 정의돼 있습니다(BL2=1, BL31=3, BL33=5, TRUSTED_BOOT_FW_CERT=6, TRUSTED_KEY_CERT=7, SOC_FW_KEY_CERT=9, NON_TRUSTED_FW_KEY_CERT=11, SOC_FW_CONTENT_CERT=13, NON_TRUSTED_FW_CONTENT_CERT=15).

```text
INFO:    Using crypto library 'mbed TLS'
INFO:    BL1: Loading BL2
INFO:    Loading image id=6 at address 0xe05b000
INFO:    Loading image id=1 at address 0xe05b000
NOTICE:  BL1: Booting BL2
...
INFO:    BL2: Loading image id 3
INFO:    Loading image id=7 at address 0xe090000
INFO:    Loading image id=9 at address 0xe090000
INFO:    Loading image id=13 at address 0xe090000
INFO:    Loading image id=3 at address 0xe090000
INFO:    BL2: Loading image id 5
INFO:    Loading image id=11 at address 0x60000000
INFO:    Loading image id=15 at address 0x60000000
INFO:    Loading image id=5 at address 0x60000000
```

이미지마다 부모 인증서부터 읽습니다. BL31(3)은 trusted key cert(7) → SoC FW key cert(9) → SoC FW content cert(13) → BL31 순서입니다. BL33(5)은 non-trusted FW key cert(11) → non-trusted FW content cert(15) → BL33입니다. 이 순서는 `common/bl_common.c:179`의 `load_auth_image_recursive()`가 만듭니다. 주석 그대로 "uses recursion to authenticate the parent images up to the root of trust"이고, 부모를 읽을 때도 같은 `image_data`를 넘기므로 인증서가 이미지 자리(`0xe090000`, `0x60000000`)에 먼저 읽힙니다.

BL33 앞에서 trusted key cert(7)를 다시 읽지 않는 이유도 소스에 있습니다. `drivers/auth/auth_mod.c:443`의 `auth_mod_get_parent_id()`는 부모에 `IMG_FLAG_AUTHENTICATED`가 이미 서 있으면 더 올라가지 않습니다. BL31을 검증할 때 7번이 인증됐으므로, BL33 체인은 11번에서 시작합니다.

BL33의 마지막 고리는 `drivers/auth/tbbr/tbbr_cot_bl2.c`에 있습니다. BL33 이미지 기술자는 `.parent = &non_trusted_fw_content_cert`이고 인증 방법은 `AUTH_METHOD_HASH`, 비교 대상은 `nt_world_bl_hash`입니다. 즉 BL33은 서명이 아니라 **해시**로 검증하고, 그 해시를 담은 인증서가 서명 체인으로 ROTPK까지 이어집니다.

## 고리 하나를 끊어 본다 — BL33 1바이트 변조

체인이 실제로 막는지 확인하려고 `u-boot.bin`의 오프셋 `0x1000` 바이트(`0xc0`)를 XOR `0xff`로 바꾼 뒤, 인증서는 그대로 두고 `fiptool update --nt-fw`로 BL33만 교체했습니다.

```text
INFO:    BL2: Loading image id 5
INFO:    Loading image id=11 at address 0x60000000
INFO:    Image id=11 loaded: 0x60000000 - 0x600004f2
INFO:    Loading image id=15 at address 0x60000000
INFO:    Image id=15 loaded: 0x60000000 - 0x60000448
INFO:    Loading image id=5 at address 0x60000000
INFO:    Image id=5 loaded: 0x60000000 - 0x600ffb30
ERROR:   BL2: Failed to load image id 5 (-80)
```

인증서 두 개는 통과했고(변조하지 않았으니까요), BL33 읽기도 성공했지만 해시 비교에서 떨어졌습니다. `-80`은 `include/lib/libc/errno.h:146`의 `EAUTH`("Authentication error")입니다. `load_auth_image_recursive()`는 `auth_mod_verify_img()`가 실패하면 "Authentication error, zero memory and flush it right away"라는 주석대로 읽어 둔 이미지를 0으로 지우고 `-EAUTH`를 돌려줍니다. BL2(`bl2/bl2_image_load_v2.c:72`)는 위 `ERROR`를 찍고 `plat_error_handler()`를 부르며, QEMU 포트는 이 함수를 따로 두지 않으므로 `plat/common/plat_bl_common.c:69`의 기본 구현인 `wfi` 무한 루프에서 멈춥니다. 로그는 이 줄이 마지막이고 U-Boot 배너는 나오지 않습니다.

## 체인이 끊긴 자리 — FIT 공개키는 어디 있나

여기까지는 체인이 잘 이어져 있습니다. 문제는 다음 고리입니다. U-Boot는 FIT 서명을 control DTB의 `/signature` 노드에 든 공개키로 검증합니다. 그런데 Ch 16에서 정리했듯 `qemu_arm64`는 `CONFIG_OF_BOARD=y`이고, `board/emulation/qemu-arm/qemu-arm.c:140`의 `board_fdt_blob_setup()`은 "QEMU loads a generated DTB for us at the start of RAM"라는 주석과 함께 RAM 시작 주소를 돌려줍니다. control DTB는 `u-boot.bin` 안에 없고, QEMU(실제 보드라면 앞 단계 펌웨어)가 런타임에 넣어 줍니다. 그리고 TBB가 해시로 확인한 것은 `u-boot.bin`뿐입니다.

이 틈이 실제로 뚫리는지 시험했습니다. 준비는 세 가지입니다.

1. `-machine virt,secure=on,dumpdtb=secure.dtb`로 QEMU DTB를 뽑습니다.
2. 같은 DTB에 정상 키(`keys/dev`)를 넣은 `secure-dev.dtb`와, 새로 만든 공격자 RSA 2048 키(`attacker/dev`, 이름까지 `dev`로 맞춤)를 넣은 `secure-attacker.dtb`를 만듭니다. 둘 다 `mkimage -K ... -r`이라 `required = "conf"`입니다.
3. 같은 ITS를 공격자 키로 서명한 `tbb-attacker.itb`를 만듭니다.

그다음 **위에서 정상 부팅한 TBB 이미지 그대로**, `-dtb`만 바꿔 두 번 부팅하고 FIT를 `-device loader,file=tbb-attacker.itb,addr=0x50000000`으로 올려 `bootm`했습니다. 정상 키가 든 DTB에서는 이렇게 됩니다.

```text
=> bootm 0x50000000
   Verifying Hash Integrity ... sha256,rsa2048:dev-  error!
Verification failed for '<NULL>' hash node in 'conf-1' config node
Failed to verify required signature 'key-dev'
Bad Data Hash
ERROR -2: can't get kernel image!
```

공격자 키가 든 DTB에서는 이렇게 됩니다.

```text
=> bootm 0x50000000
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Verifying Hash Integrity ... sha256+ OK
   ...
Starting kernel ...
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]
```

두 번 모두 TF-A 로그는 `Image id=5 loaded: 0x60000000 - 0x600ffb30` 다음 BL31로 정상 진행했습니다. BL33은 변하지 않았으니 TBB 입장에서는 아무 문제가 없습니다. 그런데 U-Boot가 믿는 키는 공격자의 키로 바뀌었고, 공격자가 서명한 커널이 실행됐습니다. 각 단계의 검증은 모두 "성공"했는데 체인 전체는 끊긴 것입니다. 금고 문(TBB)은 튼튼한데, 금고 열쇠의 복제 견본(FIT 공개키)을 현관 우편함(런타임 DTB)에 둔 셈입니다.

> ⚠️ 첫 시도에서는 BL2가 `ERROR:   Invalid Device Tree at 0x40000000: error -3`을 찍었습니다. `dumpdtb`가 만든 DTB는 헤더의 `totalsize`가 `0x100000`(1 MiB)으로 패딩돼 있었습니다. 이 파일을 `-dtb`로 넘긴 뒤 U-Boot에서 `md.l 0x40000000 2`로 RAM의 블롭 헤더를 읽어 보니 `totalsize`가 `0x204e20`(2,117,152 B)으로 더 커져 있었습니다. BL2는 PSCI 노드를 넣으려고 이 블롭을 `PLAT_QEMU_DT_MAX_SIZE`(`0x100000`) 공간에 `fdt_open_into()`하는데(`plat/qemu/common/qemu_bl2_setup.c:93-95`), 블롭이 공간보다 크니 `FDT_ERR_NOSPACE`(3)로 실패한 것입니다. in-tree `dtc -I dtb -O dtb`로 다시 써서 파일을 8,983바이트로 줄이자 RAM의 `totalsize`는 `0x23fa`가 되었고, 오류가 사라지고 `method = "smc"`가 들어갔습니다. 위 결과는 이 정리된 DTB로 다시 돌린 것입니다.

## 고리를 다시 잇는 방법

원칙은 하나입니다. **다음 단계를 검증하는 키는 앞 단계가 검증한 데이터 안에 있어야 합니다.** 이 구성에서 그 방법은 두 갈래입니다.

U-Boot 쪽에서 잇는 방법은 공개키가 든 DTB를 `u-boot.bin`에 붙여 BL33 해시 범위에 넣는 것입니다. v2024.04 `doc/usage/fit/beaglebone_vboot.rst`는 키를 넣은 DTB로 U-Boot를 다시 빌드하는 예를 `make O=b/am335x_boneblack_vboot EXT_DTB=${WORK}/am335x-boneblack-pubkey.dtb`(469행)로 보여 줍니다. 이 방식은 `CONFIG_OF_SEPARATE`처럼 U-Boot가 자기 DTB를 쓰는 보드에 해당합니다. `qemu_arm64`에서 `OF_BOARD`를 끄고 `OF_SEPARATE`를 켜 보니, 빌드가 `scripts/check-of.sh:35`의 검사에서 멈췄습니다.

```text
This board uses a prior stage to provide the device tree.
Please enable CONFIG_OF_BOARD to ensure that it works correctly.
```

`qemu_arm64`는 `CONFIG_OF_HAS_PRIOR_STAGE`를 imply하고, 이 검사가 그 조합을 거부합니다. QEMU 보드에서 이 방법까지 실행해 보이지는 않았습니다.

TF-A 쪽에서 잇는 방법도 있습니다. `tbbr_cot_bl2.c`는 `NT_FW_CONFIG_ID` 이미지(564행)를 같은 non-trusted FW content cert의 `nt_fw_config_hash`로 검증하도록 정의합니다. 즉 Normal world용 설정 DTB를 BL33처럼 인증서 해시로 묶어 넘기는 길이 CoT에 이미 있습니다. 이번 빌드의 FIP에는 이 항목이 없었고, 이 경로도 실행해 보지는 않았습니다.

같은 구조의 틈이 환경 변수에도 있습니다. v2024.04에서는 `verify=n` 한 줄로 `bootm`의 FIT 서명 강제가 꺼지고, 환경은 서명되지 않은 저장소에 있습니다. [Ch 29](/blog/embedded/bootloader/chapter29-distro-boot)에서 공격자 키 FIT가 이 상태로 부팅되는 것을 재현했습니다.

## 그다음 고리 — 커널 모듈과 rootfs

U-Boot 뒤에도 고리가 두 개 더 있습니다. 둘 다 같은 원칙으로 점검합니다.

- **모듈 서명.** Linux 문서는 `CONFIG_MODULE_SIG_FORCE` 또는 `module.sig_enforce=1`일 때만 서명이 없거나 모르는 키로 서명된 모듈을 거부한다고 설명합니다. 그렇지 않은 permissive 모드에서는 그런 모듈도 로드되고, 커널에 tainted 표시만 남습니다. 그리고 그 판단에 쓰는 키는 커널 이미지에 들어 있으므로, 커널 이미지가 앞 단계(FIT 서명)에 묶여 있어야 의미가 있습니다.
- **dm-verity.** [Ch 20](/blog/embedded/bootloader/chapter20-rauc-swupdate)에서 RAUC verity 번들을 변조하면 `rauc info`는 통과하고 설치에서 실패하는 것을 봤습니다. rootfs도 같은 구조입니다. 블록 읽기를 검증하는 hash tree의 root hash가 서명된 커널 명령줄이나 initramfs처럼 앞 단계가 검증한 데이터 안에 있어야 합니다. 서명되지 않은 U-Boot 환경 변수에서 커널 명령줄로 들어간다면, 이 장의 DTB와 같은 틈이 생깁니다.

## anti-rollback — QEMU에서는 비어 있다

서명이 맞는 *옛* 이미지를 다시 올리는 공격은 서명 검증으로 막을 수 없습니다. TBB는 인증서에 NV counter를 넣고 플랫폼의 증가만 가능한 카운터와 비교하는 방식으로 이를 막습니다(`tbbr_cot_bl2.c`의 `non_trusted_nv_ctr`, OID `NON_TRUSTED_FW_NVCOUNTER_OID`). 그런데 QEMU 포트의 구현은 이렇습니다(`plat/qemu/common/qemu_trusted_boot.c`).

```c
int plat_get_nv_ctr(void *cookie, unsigned int *nv_ctr)
{
	*nv_ctr = 0;

	return 0;
}

int plat_set_nv_ctr(void *cookie, unsigned int nv_ctr)
{
	return 1;
}
```

카운터는 항상 0이고 갱신은 항상 실패합니다. 롤백 방지는 저장소(OTP나 RPMB 같은)가 있어야 동작하는 기능이라, QEMU에서는 빈 껍데기입니다. 실제 제품에서는 이 두 함수가 무엇을 읽고 쓰는지가 롤백 방지의 전부입니다.

## 정리

- 체인의 각 고리는 "앞 단계가 검증한 데이터 안에 다음 단계의 키나 해시가 있는가"로 점검합니다.
- TF-A v2.15.0 QEMU 포트는 ROTPK 해시를 `qemu_rotpk.S`로 BL1·BL2에 넣습니다(이 빌드에서 `bl1.bin` `0xe7c3`, `bl2.bin` `0xe37b`). 실제 제품이라면 이 자리가 OTP여야 합니다.
- TBB 빌드의 FIP에는 key certificate 3개와 content certificate 3개가 더해지고, 로그에서 이미지마다 부모 인증서부터 읽는 순서가 보입니다.
- BL33 1바이트 변조는 `Failed to load image id 5 (-80)`(`EAUTH`)으로 막히고, 이미지는 0으로 지워진 뒤 BL2가 `wfi` 루프에서 멈춥니다.
- `qemu_arm64`의 FIT 공개키는 런타임 DTB에 있어 TBB 범위 밖입니다. 공격자 키 DTB로 바꾸면 TBB는 통과하고 공격자 FIT가 부팅됐습니다.
- 고치려면 키 DTB를 BL33에 포함하거나(`EXT_DTB`, `OF_SEPARATE` 보드) TF-A의 `NT_FW_CONFIG` 인증 경로를 씁니다. 둘 다 이 장에서 실행하지는 않았습니다.
- QEMU 포트의 NV counter는 항상 0이라 롤백 방지가 동작하지 않습니다.

## 다음 장 예고

다음 장에서는 [Ch 28: Flash layout 설계](/blog/embedded/bootloader/chapter28-flash-layout)를 다룹니다. 서명된 이미지와 키, 환경 변수를 flash의 어느 영역에 두고 어떻게 갱신하는지가 이 장의 이음새 문제와 바로 이어집니다.

## 관련 항목

- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — FIT 서명과 `required = "conf"` 시험
- [Ch 20: RAUC·SWUpdate](/blog/embedded/bootloader/chapter20-rauc-swupdate) — RAUC verity 번들 변조 시험
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — 체인의 첫 고리를 fuse에 두는 i.MX HAB
- [Ch 25: TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee) — TBB 없이 본 같은 부팅 흐름
- [TF-A: Trusted Board Boot](https://trustedfirmware-a.readthedocs.io/en/latest/design/trusted-board-boot.html) — CoT와 인증서 구조 설계 문서
- [U-Boot v2024.04 — doc/usage/fit/beaglebone_vboot.rst](https://github.com/u-boot/u-boot/blob/v2024.04/doc/usage/fit/beaglebone_vboot.rst) — 키를 넣은 DTB로 U-Boot를 다시 빌드하는 예
- [Linux: Kernel module signing](https://www.kernel.org/doc/html/latest/admin-guide/module-signing.html)
- [Linux: dm-verity target](https://docs.kernel.org/admin-guide/device-mapper/verity.html)
