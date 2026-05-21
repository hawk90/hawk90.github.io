---
title: "Ch 16: Verified Boot — RSA 서명과 public key 임베딩"
date: 2026-05-09T16:00:00
description: "U-Boot Verified Boot — FIT 서명, public key를 U-Boot DT에 박는 워크플로."
series: "Bootloader Internals"
seriesOrder: 16
tags: [embedded, bootloader, u-boot, verified-boot, security]
draft: false
---

부트로더가 커널을 *그냥 점프*하면, 디스크를 잠시라도 만질 수 있는 공격자는 마음대로 커널을 바꿔 끼울 수 있습니다. Verified Boot은 *이 한 줄*을 잘라내는 작업입니다. ROM이 SPL을 검증하고, SPL이 U-Boot를 검증하고, U-Boot이 커널·DT·initramfs를 검증합니다. 한 단계라도 서명이 안 맞으면 부팅을 끊습니다.

## 한 줄 요약

**RSA 키 쌍의 public key를 U-Boot의 control DT에 박아 두면, U-Boot은 부팅 직전에 FIT 이미지의 서명을 그 키로 검증해 신뢰 체인을 닫습니다.**

## 신뢰 체인이 닫히는 지점

신뢰 체인은 *변경 불가능한* 곳에서 출발해야 합니다. 보통 SoC ROM이 그 자리를 맡습니다. ROM은 OTP에 적힌 hash나 public key로 SPL을 검증하고, SPL은 같은 방식으로 U-Boot를 검증합니다. U-Boot까지 도달하면 다음 단계인 커널·DT·initramfs를 *FIT 이미지* 형태로 묶어 검증하면 됩니다.

```text
[ROM 검증] -> [SPL 서명 OK] -> [SPL 검증] -> [U-Boot 서명 OK]
              -> [U-Boot 검증] -> [FIT 서명 OK] -> [Linux 부팅]
                                서명 실패 -> halt 또는 recovery
```

ROM 단계는 SoC별로 다릅니다. NXP HABv4, TI HS, Rockchip BootROM 모두 형식이 제각각입니다. 하지만 *U-Boot이 FIT를 검증하는 부분*은 공통입니다. 이번 장은 그 공통 부분을 집중적으로 봅니다.

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

`signature-1`이 *configuration 단위*로 묶여 있다는 점이 중요합니다. 커널 따로, DT 따로 서명하면 공격자가 *서명된 두 묶음을 짝을 바꿔* 끼우는 mix-and-match 공격이 가능합니다. configuration 단위 서명은 셋이 한 묶음임을 보장합니다.

## mkimage로 서명 굽기

`mkimage -k`는 private key로 FIT을 서명하고, `-K u-boot.dtb`는 *동시에 U-Boot의 control DT에 public key를 박습니다*.

```bash
mkimage -f boot.its \
        -k keys \
        -K u-boot.dtb \
        -r \
        -G keys/dev.key \
        boot.itb
```

옵션 의미는 이렇습니다.

- `-k keys` — `keys/dev.key`·`keys/dev.crt`를 찾을 디렉터리
- `-K u-boot.dtb` — public key를 박을 control DT 파일
- `-r` — *required* 플래그를 박아 두어 U-Boot이 강제로 검증하게 함
- `-G keys/dev.key` — 서명에 쓸 private key (`-k`가 디렉터리, `-G`가 파일)

처음 실행하면 U-Boot DT의 `/signature/key-dev` 노드에 modulus·exponent가 들어갑니다. 이 DT를 빌드된 `u-boot.bin`에 다시 endorse(appended DT 또는 OF_EMBED 빌드)하면 끝입니다.

## U-Boot 측 설정

defconfig에 검증 기능을 켜야 합니다.

```text
CONFIG_FIT=y
CONFIG_FIT_SIGNATURE=y
CONFIG_FIT_SIGNATURE_MAX_SIZE=0x10000000
CONFIG_RSA=y
CONFIG_RSA_VERIFY_WITH_PKEY=y
CONFIG_OF_CONTROL=y
CONFIG_OF_SEPARATE=y
CONFIG_SHA256=y
```

`CONFIG_FIT_SIGNATURE=y`가 들어가는 순간 U-Boot은 *서명되지 않은 FIT을 거부*합니다. 부팅 시 콘솔에 다음과 같은 줄이 보이면 정상입니다.

```text
## Loading kernel from FIT Image at 40000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Trying 'kernel-1' kernel subimage
     Verifying Hash Integrity ... sha256+ OK
```

`+ OK`가 핵심입니다. `- Bad`가 나오면 부팅이 중단됩니다.

## 부팅 명령 흐름

서명 검증은 `bootm`(또는 `booti`·`bootefi`)이 자동으로 합니다. 따로 명령이 없습니다.

```text
=> tftp 0x40000000 boot.itb
=> bootm 0x40000000
## Loading kernel from FIT Image at 40000000 ...
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK
   Loading kernel from 0x40000100 to 0x40080000
   ...
```

`bootm`이 `verify` 단계를 거치고, *실패 시 즉시 abort*합니다. 잘 된 부팅과 *서명 안 된 FIT* 부팅을 한 번씩 시도해서 정말 거부되는지 확인해야 합니다. `Verifying Hash Integrity ... error!`가 떠야 정상입니다.

## anti-rollback

서명만 검증하면 *유효한 서명이 박힌 옛 버전*으로 되돌리는 rollback 공격이 가능합니다. anti-rollback은 *최소 허용 버전*을 OTP에 저장하고, 부팅 시 FIT의 버전 필드가 이 값 이상인지 확인합니다.

```text
configurations {
    conf-1 {
        ...
        rollback-index = <0x00010005>;
    };
};
```

U-Boot의 `fit_check_format()`이 이 인덱스를 읽어 OTP 값과 비교합니다. OTP 갱신은 *부팅 성공 후 일정 횟수*가 지났을 때만 수행하는 것이 안전합니다. 한 번 잘못된 펌웨어를 받고 OTP를 올려 버리면 영영 되돌릴 수 없기 때문입니다.

## dm-verity와의 다리

FIT은 *부팅 시점*만 보호합니다. 부팅 후 rootfs가 바뀌면 모릅니다. 이 빈틈은 dm-verity가 막습니다. dm-verity는 rootfs 블록마다 Merkle tree hash를 계산해 두고, 커널이 블록을 읽을 때마다 hash를 검증합니다.

연결 지점은 *커널 cmdline*입니다.

```text
root=/dev/dm-0 rootflags=ro \
    dm-mod.create="root,,,ro,0 1234567 verity 1 \
        /dev/mmcblk0p2 /dev/mmcblk0p3 4096 4096 \
        152340 1 sha256 <root-hash> <salt>"
```

여기서 `<root-hash>`가 FIT에 함께 서명된 *DT에 박힌* 값이면, "FIT가 서명되어 있으니 cmdline도 안전, cmdline이 root-hash를 박고 있으니 rootfs도 안전"이라는 한 줄짜리 체인이 완성됩니다.

## FIT 구조 깊이 — .its source의 세 축

FIT은 *세 종류의 노드*가 한 트리에 모인 구조입니다. `images`에 *바이너리*가, `configurations`에 *부팅 시 선택지*가, 그리고 각 노드 안에 `hash@N`·`signature@N` 같은 *무결성 메타*가 들어갑니다. 이 세 축이 어떻게 맞물리는지 한눈에 정리합니다.

| 노드 | 역할 | 필수 필드 |
|------|------|-----------|
| `images/kernel@N` | 부팅할 커널 바이너리 | `data`·`type=kernel`·`arch`·`load`·`entry` |
| `images/fdt@N` | 보드 DT | `data`·`type=flat_dt`·`arch` |
| `images/ramdisk@N` | initramfs | `data`·`type=ramdisk`·`compression` |
| `images/<n>/hash@N` | 해당 image의 무결성 hash | `algo` (`sha256` 권장) |
| `configurations/conf@N` | (kernel, fdt, ramdisk) 묶음 한 벌 | `kernel`·`fdt`·`ramdisk` 참조 |
| `configurations/conf@N/signature@N` | configuration 단위 서명 | `algo`·`key-name-hint`·`sign-images` |

각 `images/<n>` 안의 `hash@1`은 *그 image 한 덩어리*의 해시입니다. `configurations/conf@1/signature@1`은 그 configuration이 묶고 있는 *여러 image의 hash와 메타*를 모두 한 번에 RSA로 서명합니다. 즉 hash는 *각 조각*, signature는 *한 묶음*이 단위입니다.

```text
hash@1: sha256(image-data)
signature@1: rsa2048( sha256( kernel.hash @ fdt.hash @ ramdisk.hash @ config-meta ) )
```

이 구조이기 때문에 U-Boot은 두 단계로 검증합니다. 먼저 *signature 검사*로 hash 묶음이 변조되지 않았는지 보고, 그 다음 *각 image의 hash 재계산*으로 실제 데이터가 hash와 맞는지 봅니다. 둘 중 한 단계라도 깨지면 부팅이 끊깁니다.

## mkimage 서명 흐름 — public key가 control DTB로 들어가는 순간

`mkimage`는 한 번에 두 가지를 합니다. `.itb`를 만들면서 *동시에* `u-boot-dtb.dtb`에 public key 노드를 추가합니다. 흐름을 단계별로 보겠습니다.

```bash
# 1) image-only .itb 생성 (서명 없음, 디버그용)
mkimage -f myboard.its myboard.itb

# 2) 본 서명 + control DTB에 public key 임베드
mkimage -f myboard.its \
        -K u-boot-dtb.dtb \
        -k ./keys \
        -r \
        myboard.itb
```

`-K u-boot-dtb.dtb`가 핵심입니다. mkimage가 `./keys/dev.crt`에서 modulus·exponent를 꺼내 control DTB의 `/signature/key-dev` 노드에 박습니다. 이 DTB가 U-Boot 바이너리에 합쳐지는 순간(`OF_EMBED=y` 빌드 또는 `cat u-boot-nodtb.bin u-boot-dtb.dtb > u-boot.bin`) public key가 *코드와 한 덩어리*가 됩니다.

```text
key-dev {
    required = "conf";
    algo = "sha256,rsa2048";
    rsa,num-bits = <0x800>;
    rsa,modulus = [c0 8e 7a ... ];
    rsa,exponent = <0x10001>;
    rsa,n0-inverse = <0xdeadbeef>;
    rsa,r-squared = <... >;
    key-name-hint = "dev";
};
```

`required = "conf"`가 *configuration 노드를 검사할 때 이 키가 반드시 매치해야 한다*는 표시입니다. `-r` 플래그가 없으면 `required`가 빠져 *서명이 있어도 강제하지 않는* 무용지물 상태가 됩니다.

## U-Boot bootm 시 verification 단계

`bootm 0x40000000`을 치는 순간 U-Boot 내부에서 다음 순서가 돌아갑니다. 코드는 `boot/image-fit.c`·`boot/image-fit-sig.c`에 있습니다.

**1. fit_check_format()         — magic·구조 검증**


**2. fit_conf_get_node()        — 부팅할 conf@N 선택**


**3. fit_image_verify_required_sigs()**

- ├ control DTB의 required key 목록 수집
- ├ conf@N/signature@N 노드와 매치
- └ 매치 실패 시 abort

**4. fit_image_check_sig()**

- ├ signed image 목록 (kernel·fdt·ramdisk)
- ├ region 데이터 모아 RSA verify
- └ Verifying Hash Integrity ... sha256,rsa2048:dev+ OK

**5. fit_image_load(kernel)**

- ├ image data 메모리에 복사
- └ hash@1 재계산 → Verifying Hash Integrity ... sha256+ OK

**6. fit_image_load(fdt) / fit_image_load(ramdisk)  — 동일 절차**


**7. boot_jump_linux()          — entry point로 점프**

3·4단계가 *configuration 서명* 검증, 5·6단계가 *각 image hash* 검증입니다. 콘솔 로그에서 같은 "Verifying Hash Integrity"가 두 번 보이는 이유가 이것입니다.

```text
## Loading kernel from FIT Image at 40000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK   <-- configuration sig
   Trying 'kernel-1' kernel subimage
     Verifying Hash Integrity ... sha256+ OK             <-- image hash
   Loading kernel from 0x40000160 to 0x40080000
## Loading fdt from FIT Image at 40000000 ...
   Trying 'fdt-1' fdt subimage
     Verifying Hash Integrity ... sha256+ OK
```

## multi-config 서명 — 한 FIT, 여러 보드 변형

한 펌웨어 이미지로 *여러 보드 변형*을 지원해야 할 때가 있습니다. RAM 크기가 다른 두 SKU, 또는 RevA·RevB의 DT 차이를 한 묶음에 담는 식입니다. configurations 노드를 여러 개 두고 *각 conf마다 따로 서명*합니다.

```text
configurations {
    default = "conf-revb";

    conf-reva {
        description = "boardX Rev A (no PMIC)";
        kernel = "kernel-1";
        fdt = "fdt-reva";
        ramdisk = "ramdisk-1";
        signature-1 {
            algo = "sha256,rsa2048";
            key-name-hint = "dev";
            sign-images = "kernel", "fdt", "ramdisk";
        };
    };

    conf-revb {
        description = "boardX Rev B (with PMIC)";
        kernel = "kernel-1";
        fdt = "fdt-revb";
        ramdisk = "ramdisk-1";
        signature-1 {
            algo = "sha256,rsa2048";
            key-name-hint = "dev";
            sign-images = "kernel", "fdt", "ramdisk";
        };
    };
};
```

부팅 시 적절한 conf를 고르려면 U-Boot 환경 변수 또는 board hook을 씁니다.

```text
=> setenv board_rev revb
=> setenv bootargs "...."
=> bootm 0x40000000#conf-${board_rev}
```

`bootm <addr>#<conf-name>`이 conf를 명시적으로 선택하는 문법입니다. 보드 코드에서 GPIO·EEPROM·OTP를 읽어 자동으로 `board_rev`를 결정하면 한 .itb로 두 SKU를 지원할 수 있습니다. 양쪽 conf 모두 서명되어 있으므로 어떤 변형을 골라도 *신뢰 체인이 동일*합니다.

## rollback protection — version 필드와 anti-rollback counter

서명만 검증하면 *유효한 서명이 박힌 옛 버전*으로 되돌리는 공격이 가능합니다. CVE 패치 직전 펌웨어가 그대로 서명되어 있으니, 공격자가 그것을 다시 깔면 끝입니다. 막는 방법은 FIT에 *단조 증가 버전*을 박고 OTP의 counter와 비교하는 것입니다.

```text
/ {
    images { ... };
    configurations {
        default = "conf-1";
        conf-1 {
            kernel = "kernel-1";
            fdt = "fdt-1";
            rollback-index = <0x00010005>;   /* 1.5 */
            signature-1 { ... };
        };
    };
};
```

U-Boot 측에서 board hook이 OTP 또는 RPMB의 counter를 읽어 비교합니다.

```c
int board_fit_image_post_process(void **p_image, size_t *p_size)
{
    uint32_t fit_idx = fit_get_rollback_index(*p_image);
    uint32_t otp_min = otp_read_rollback_min();
    if (fit_idx < otp_min) {
        printf("Rollback blocked: fit=%u otp_min=%u\n",
               fit_idx, otp_min);
        return -EPERM;
    }
    /* 부팅 성공이 충분히 확인된 후 별도 시점에 otp_min 갱신 */
    return 0;
}
```

OTP 갱신은 *부팅 성공 + 응용 동작 확인*까지 끝난 뒤에 합니다. 부팅 직후에 올려 버리면 잘못된 펌웨어가 한 번 올라간 순간 모든 *유효한 옛 버전*이 영원히 차단됩니다. 보통 `bootcount` 메커니즘과 짝지어 N회 연속 부팅 성공 시에만 counter를 한 칸 올립니다.

## encryption + signature — 기밀성까지 추가

기본 verified boot은 *무결성*만 보장합니다. FIT의 내용은 평문이라 누구나 읽을 수 있습니다. 외주 SoC·재고 유출 위험이 있는 펌웨어는 AES로 한 겹 더 감싸 *기밀성*까지 챙깁니다. mkimage가 `-e`로 image별 암호화를 지원합니다.

```text
images {
    kernel-1 {
        data = /incbin/("./Image");
        type = "kernel";
        cipher {
            algo = "aes256-gcm";
            key-name-hint = "kek-2026";
            iv-name-hint = "kernel-iv";
        };
        hash-1 { algo = "sha256"; };
    };
};
```

```bash
mkimage -f myboard.its \
        -E -k ./keys -K u-boot-dtb.dtb -r \
        -G ./keys/sign.key \
        myboard.itb
```

키 관리에서 *서명 키와 암호화 키를 분리*하는 것이 원칙입니다.

| 키 종류 | 용도 | 임베드 위치 | 회전 정책 |
|---------|------|-------------|-----------|
| Signing private (RSA) | FIT 서명 | HSM 또는 빌드 서버 격리 | 침해 시 즉시 |
| Signing public (RSA) | FIT 검증 | U-Boot control DTB | 펌웨어 업데이트로 |
| KEK (AES) | image 암호화 키 wrap | OTP 또는 secure enclave | OTP 1회성 |
| Image key (AES) | 실제 image 본문 암호화 | KEK로 감싼 채 FIT 안 | 빌드마다 새로 |

서명 키 침해와 암호화 키 침해는 *피해 범위가 다릅니다*. 서명 키가 깨지면 임의 펌웨어가 부팅 가능, 암호화 키가 깨지면 펌웨어 코드만 노출입니다. 분리해 두면 한쪽 회전이 다른 쪽에 영향을 안 줍니다.

## 자주 하는 실수

서명 워크플로에서 자주 빠지는 함정 몇 가지를 모았습니다.

- **private key를 git에 커밋한다.** 양산 키는 HSM 또는 격리된 빌드 서버에만 둡니다. dev key라 하더라도 별도 `keys/` 디렉터리를 `.gitignore`로 막아야 합니다.
- **control DT에 public key를 박는 것과 `u-boot.bin`에 박는 것을 혼동한다.** `OF_EMBED=y`면 DTB가 바이너리에 합쳐지지만, `OF_SEPARATE=y`면 `u-boot-dtb.bin`처럼 합치는 단계를 거쳐야 합니다.
- **`-r` 플래그를 빼서** required 표시가 없는 키만 박는다. U-Boot은 *required* 키가 없으면 검증을 강제하지 않습니다. 결과는 "서명이 있어도 안 검증"입니다.
- **configuration 단위가 아닌 image 단위 서명**으로 mix-and-match 가능 상태가 된다.
- **`CONFIG_FIT_SIGNATURE_MAX_SIZE`를 너무 작게 잡아** FIT 한 부분만 검증되고 나머지가 통과한다.
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

- 신뢰 체인은 ROM에서 시작해 U-Boot이 FIT을 검증하는 곳에서 닫힙니다.
- RSA 키 쌍의 private key는 빌드 서버, public key는 U-Boot control DT에 박힙니다.
- `mkimage -k keys -K u-boot.dtb -G key.pem`이 *서명*과 *키 임베딩*을 한 번에 수행합니다.
- signature 노드는 *configuration 단위*로 둬야 mix-and-match 공격을 막을 수 있습니다.
- `CONFIG_FIT_SIGNATURE=y`만 켜면 U-Boot이 부팅 시 자동으로 검증합니다.
- anti-rollback 인덱스로 *유효한 서명이 있는 옛 버전* 공격을 막을 수 있습니다.
- 부팅 이후의 rootfs 무결성은 dm-verity가 받아 신뢰 체인을 이어 갑니다.

## 다음 장 예고

서명만으로는 안전한 *업데이트*를 보장할 수 없습니다. 다음 장에서는 OTA 도중 전원이 끊겨도 살아남는 A/B 슬롯 구조와 `bootcount`·`altbootcmd`를 사용한 자동 fallback을 봅니다.

## 관련 항목

- [Ch 15: FIT 이미지 — 한 묶음으로 부팅하기](/blog/embedded/bootloader/chapter15-fit-image) — 이번 장이 서명한 컨테이너 구조
- [Ch 17: A/B 업데이트와 boot 이중화](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 23: eFuse와 Root-of-Trust](/blog/embedded/bootloader/chapter23-efuse-rot) — 신뢰의 출발점이 되는 OTP 키 해시
- [Ch 25: TF-A로 BL 단계별 서명](/blog/embedded/bootloader/chapter25-tfa-signing) — BL1·BL2·BL31까지의 서명 흐름
- [Ch 27: 전체 chain of trust 정리](/blog/embedded/bootloader/chapter27-chain-of-trust) — eFuse→BL→kernel까지의 큰 그림
- [Embedded Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — ROM·SPL 측 시점에서 본 같은 체인
- [원문 — U-Boot doc/uImage.FIT/signature.txt](https://u-boot.readthedocs.io/en/latest/usage/fit/signature.html)
