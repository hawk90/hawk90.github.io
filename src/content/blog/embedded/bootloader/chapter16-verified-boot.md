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

부트 체인은 매 단계에서 다음에 실행할 이미지를 검증하도록 구성할 수 있습니다. ROM/SPL의 형식과 검증 주체는 SoC와 보드에 따라 다르며, U-Boot의 FIT 검증도 필요한 옵션과 trusted-key 정책이 활성화되어야 합니다. 검증 실패 시 recovery/halt 동작 역시 제품 구현이 정합니다.

## 한 줄 요약

**U-Boot FIT 검증은 trusted public key와 required-signature 정책을 사용해 선택된 이미지 구성을 검사합니다.** 이것은 앞 단계에서 U-Boot 자체를 검증하는 일과는 별도의 chain-of-trust 구성입니다.

## 신뢰 체인이 닫히는 지점

신뢰 체인은 제품이 보호하는 초기 신뢰점에서 출발합니다. ROM, SPL, U-Boot 및 OS 이미지의 각 단계는 SoC의 secure-boot 구현과 board configuration에 따라 달라집니다. 이 장에서는 U-Boot FIT 검증만 다룹니다.

```text
[제품별 초기 신뢰점] -> [선택적으로 검증된 firmware 단계들]
                              -> [U-Boot FIT required-key 검증]
                              -> [제품별 boot 또는 recovery 정책]
```

ROM 단계는 SoC별로 다릅니다. U-Boot의 FIT signature 지원은 문서화되어 있지만, 실제 부팅 경로와 검증 강제 여부는 선택한 build, control FDT, boot command 및 제품 정책에 달려 있습니다.

## RSA 키 쌍 만들기

가장 먼저 할 일은 빌드 서버에 보관할 private key를 만드는 것입니다. 양산 시스템에서는 HSM에 넣지만, 개발 단계에서는 파일 한 쌍으로도 충분합니다.

```bash
# 2048비트 RSA 키 생성
mkdir -p keys
openssl genpkey -algorithm RSA -out keys/dev.key \
    -pkeyopt rsa_keygen_bits:2048
openssl req -batch -new -x509 -key keys/dev.key \
    -out keys/dev.crt
```

`dev.key`가 *FIT 서명*에, `dev.crt`가 *public key 추출*에 쓰입니다. 양산에서는 키 이름에 키 ID와 사용 환경을 넣어 두는 편이 안전합니다. `prod-2026.key` 같은 식으로 두면 키 회전 시점에 혼동이 줄어듭니다.

## FIT 이미지 구조와 signature 노드

FIT은 ITS(Image Tree Source) 파일로 기술하고 `mkimage`로 컴파일합니다. signature 노드는 *어떤 키로* *어떤 해시 알고리즘*으로 서명할지를 적습니다.

```text
/dts-v1/;

/ {
    description = "Signed FIT for boardX";
    #address-cells = <1>;

    images {
        kernel-1 {
            description = "Linux 6.6";
            data = /incbin/("./Image");
            type = "kernel";
            arch = "arm64";
            os = "linux";
            compression = "none";
            load = <0x40080000>;
            entry = <0x40080000>;
            hash-1 { algo = "sha256"; };
        };

        fdt-1 {
            description = "board DT";
            data = /incbin/("./board.dtb");
            type = "flat_dt";
            arch = "arm64";
            compression = "none";
            hash-1 { algo = "sha256"; };
        };

        ramdisk-1 {
            description = "initramfs";
            data = /incbin/("./initramfs.cpio.gz");
            type = "ramdisk";
            arch = "arm64";
            os = "linux";
            compression = "gzip";
            hash-1 { algo = "sha256"; };
        };
    };

    configurations {
        default = "conf-1";
        conf-1 {
            description = "boardX boot";
            kernel = "kernel-1";
            fdt = "fdt-1";
            ramdisk = "ramdisk-1";
            signature-1 {
                algo = "sha256,rsa2048";
                key-name-hint = "dev";
                sign-images = "kernel", "fdt", "ramdisk";
            };
        };
    };
};
```

`signature`가 configuration에 있는 경우 선택된 configuration 및 서명 범위의 image 참조를 함께 인증할 수 있습니다. 서명 범위는 `sign-images`와 required-key 정책을 포함한 ITS/control FDT 설정으로 결정되므로 산출물에서 확인해야 합니다.

## mkimage로 서명 굽기

`mkimage -k`는 private key로 FIT을 서명하고, `-K u-boot.dtb`는 *동시에 U-Boot의 control DT에 public key를 박습니다*.

```bash
mkimage -f boot.its \
        -k keys \
        -K u-boot.dtb \
        -r \
        boot.itb
```

옵션 의미는 이렇습니다.

- `-k keys` — `keys/dev.key`·`keys/dev.crt`를 찾을 디렉터리
- `-K u-boot.dtb` — public key를 박을 control DT 파일
- `-r` — FIT signature 문서의 required-key 방식 설정. `-K`에 반영된 control FDT 결과를 확인해야 함

`-K`가 갱신하는 control DT를 U-Boot 빌드 산출물에 포함하는 방법은 `OF_CONTROL` 및 board build 구성에 맞춰야 합니다. 일반적인 바이너리 결합 절차를 임의로 실행하지 말고 선택한 tag의 build instructions를 따릅니다.

## U-Boot 측 설정

defconfig에 검증 기능을 켜야 합니다.

```text
CONFIG_FIT=y
CONFIG_FIT_SIGNATURE=y
CONFIG_RSA=y
CONFIG_OF_CONTROL=y
CONFIG_OF_SEPARATE=y
CONFIG_SHA256=y
```

`CONFIG_FIT_SIGNATURE`는 서명 기능을 활성화하지만, 그 자체로 모든 unsigned FIT를 거부하지는 않습니다. required key 정책 및 legacy-image 설정을 함께 확인합니다. 아래 로그는 형식 예시이며 실행 캡처가 아닙니다.

```text
## Loading kernel from FIT Image at 40000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Trying 'kernel-1' kernel subimage
     Verifying Hash Integrity ... sha256+ OK
```

`+ OK`가 핵심입니다. `- Bad`가 나오면 부팅이 중단됩니다.

## 부팅 명령 흐름

FIT는 `bootm` 경로로 읽고 검증합니다. `booti`와 `bootefi`는 다른 이미지/실행 경로이므로 FIT 서명 경로와 혼동하지 않습니다.

```text
=> tftp 0x40000000 boot.itb
=> bootm 0x40000000
## Loading kernel from FIT Image at 40000000 ...
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Loading kernel from 0x40000100 to 0x40080000
   ...
```

required-signature 정책이 선택된 configuration과 실행 경로에 적용될 때 검증 실패가 부팅을 막는지 확인해야 합니다. 성공/부정 사례는 target 또는 sandbox에서 구성별로 시험해야 합니다; `CONFIG_FIT_SIGNATURE`만 켜도 unsigned FIT rejection이 보장되는 것은 아닙니다.

## anti-rollback은 별도 제품 기능

FIT signature 검증만으로 이전에 서명된 버전의 재사용을 막지는 않습니다. U-Boot의 일반 FIT format check가 제품의 OTP/RPMB counter와 버전을 자동 비교한다고 가정하면 안 됩니다. Anti-rollback에는 target-specific monotonic storage, signed version metadata, comparison policy, 그리고 update-success 이후의 irreversible counter commit 절차가 필요합니다. 이 보드별 구현은 여기서 검증하지 않았습니다.

## dm-verity와의 다리

FIT은 *부팅 시점*만 보호합니다. 부팅 후 rootfs가 바뀌면 모릅니다. 이 빈틈은 dm-verity가 막습니다. dm-verity는 rootfs 블록마다 Merkle tree hash를 계산해 두고, 커널이 블록을 읽을 때마다 hash를 검증합니다.

연결 지점은 *커널 cmdline*입니다.

```text
root=/dev/dm-0 rootflags=ro \
    dm-mod.create="root,,,ro,0 1234567 verity 1 \
        /dev/mmcblk0p2 /dev/mmcblk0p3 4096 4096 \
        152340 1 sha256 <root-hash> <salt>"
```

이 연결은 root hash와 관련 boot arguments가 검증된 image/configuration에서 왔다는 것을 보드가 보장할 때만 성립합니다. U-Boot environment의 별도 `bootargs`는 FIT 서명에 자동으로 포함되지 않으며, dm-verity 설정과 kernel policy도 제품에서 확인해야 합니다.

## FIT image examples and verification boundary

FIT/ITS 문법, `mkimage`, configuration 선택과 overlay 예시는 [15장](/blog/embedded/bootloader/chapter15-fit-image)에서 다룹니다. 여기서는 반복된 FIT 구조 walkthrough와 합성 로그를 제거하고 보안 경계만 유지합니다.

U-Boot 공식 문서는 FIT가 FDT container이며, 선택된 configuration과 trusted control-FDT public keys를 사용해 검증할 수 있다고 설명합니다. `required = "conf"`는 selected configuration을, `required = "image"`는 image verification을 요구합니다. 지원 알고리즘과 구체적인 signing scope는 해당 U-Boot tag의 FIT signature documentation으로 확인합니다.

Positive 및 negative verification은 서명된 image, unsigned configuration, 변조된 image payload, 잘못된 key를 각각 준비한 뒤 sandbox test 또는 대상 보드에서 관찰해야 합니다. 이 작업에서는 U-Boot test/build를 실행하지 않았습니다.

## 자주 하는 실수

서명 워크플로에서 자주 빠지는 함정 몇 가지를 모았습니다.

- **private key를 git에 커밋한다.** 양산 키는 HSM 또는 격리된 빌드 서버에만 둡니다. dev key라 하더라도 별도 `keys/` 디렉터리를 `.gitignore`로 막아야 합니다.
- **control DT에 public key를 박는 것과 `u-boot.bin`에 박는 것을 혼동한다.** `OF_EMBED=y`면 DTB가 바이너리에 합쳐지지만, `OF_SEPARATE=y`면 `u-boot-dtb.bin`처럼 합치는 단계를 거쳐야 합니다.
- **`-r` 플래그를 빼서** required 표시가 없는 키만 박는다. U-Boot은 *required* 키가 없으면 검증을 강제하지 않습니다. 결과는 "서명이 있어도 안 검증"입니다.
- **configuration 단위가 아닌 image 단위 서명**으로 mix-and-match 가능 상태가 된다.
- **FIT verification memory limit을 임의로 조정합니다.** 해당 option의 tag별 의미와 failure mode는 board config에서 검증해야 합니다.
- **hash 알고리즘이 mismatch.** .its는 `sha1`인데 U-Boot config는 `CONFIG_SHA256=y`만 켜져 있으면 `Verifying Hash Integrity ... unsupported`로 죽습니다. 새 시스템은 처음부터 sha256 이상으로 통일합니다.
- **private key 파일 permission이 group/other에 열려 있어** OpenSSL이 `unable to load Private Key`로 거부합니다. `chmod 600 keys/*.key`가 빌드 서버의 기본 위생입니다.

실패가 잡히는 *증상*과 *원인*을 한 표로 모았습니다.

| 증상 (콘솔 로그) | 가능한 원인 | 첫 점검 |
|------------------|-------------|---------|
| `No FIT image format` | 잘못된 주소·non-FIT 이미지 | `iminfo`로 magic 확인 |
| `Verification failed for required key` | control DTB에 키가 없거나 `required`가 빠짐 | `fdtdump u-boot-dtb.dtb \| grep -A20 signature` |
| `Verifying Hash Integrity ... error!` (RSA verify 단계) | 서명 후 image 수정·잘못된 키 페어 | mkimage 재실행, public/private 일치 확인 |
| `Verifying Hash Integrity ... bad` (image hash 단계) | image 본문 손상 또는 storage 오류 | image 다시 굽기, eMMC bad block 점검 |
| `unsupported hash algorithm` | .its `algo`와 U-Boot config 불일치 | `CONFIG_SHA256=y` 등 활성화 |
| `Failed to verify required signature` | sign-images에 빠진 image 존재 | .its의 `sign-images` 목록 점검 |
| `unable to load Private Key` (mkimage 실행 중) | 키 파일 permission 또는 잘못된 PEM | `chmod 600`, OpenSSL로 키 형식 확인 |

## 정리

- 제품별 신뢰 체인의 각 firmware handoff는 해당 SoC와 board documentation으로 확인합니다.
- RSA 키 쌍의 private key는 빌드 서버, public key는 U-Boot control DT에 박힙니다.
- `mkimage -k keys -K u-boot.dtb -r`는 문서화된 signing 흐름의 일부이며, 결과 FIT과 U-Boot control FDT를 확인합니다.
- signature 노드는 *configuration 단위*로 둬야 mix-and-match 공격을 막을 수 있습니다.
- required-key 설정과 FIT verification path를 함께 확인합니다; `CONFIG_FIT_SIGNATURE` 단독은 universal reject policy가 아닙니다.
- FIT signature만으로 유효한 이전 버전의 replay를 막지 못하므로 제품별 monotonic version policy가 필요합니다.
- 부팅 이후의 rootfs 무결성은 dm-verity가 받아 신뢰 체인을 이어 갑니다.

## 다음 장 예고

서명만으로는 안전한 *업데이트*를 보장할 수 없습니다. 다음 장에서는 OTA 도중 전원이 끊겨도 살아남는 A/B 슬롯 구조와 `bootcount`·`altbootcmd`를 사용한 자동 fallback을 봅니다.

## 관련 항목

- [Ch 15: FIT 이미지 — 한 묶음으로 부팅하기](/blog/embedded/bootloader/chapter15-fit-image) — 이번 장이 서명한 컨테이너 구조
- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 23: eFuse와 Root-of-Trust](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — 신뢰의 출발점이 되는 OTP 키 해시
- [Ch 25: TF-A로 BL 단계별 서명](/blog/embedded/bootloader/chapter25-tfa-optee) — BL1·BL2·BL31까지의 서명 흐름
- [Ch 27: 전체 chain of trust 정리](/blog/embedded/bootloader/chapter27-chain-of-trust) — eFuse→BL→kernel까지의 큰 그림
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — ROM·SPL 측 시점에서 본 같은 체인
- [원문 — U-Boot doc/uImage.FIT/signature.txt](https://docs.u-boot.org/en/v2025.01/usage/fit/signature.html)
