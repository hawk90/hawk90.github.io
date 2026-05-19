---
title: "Ch 15: FIT image — multi-image, hash, configuration"
date: 2026-05-09T15:00:00
description: "Flattened Image Tree — kernel·DTB·initramfs·overlay를 한 컨테이너로 묶는 포맷."
series: "Bootloader Internals"
seriesOrder: 15
tags: [embedded, bootloader, u-boot, fit, mkimage]
draft: false
---

## 한 줄 요약

**FIT(Flattened Image Tree)는 kernel·DTB·ramdisk·overlay를 한 파일에 묶고, 각각에 hash와 서명을 붙이는 표준 컨테이너입니다.** 한 이미지로 여러 보드를 지원하고, verified boot의 기초가 됩니다.

[10~14장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 부트 흐름은 *kernel*, *DTB*, *ramdisk*를 따로 적재했습니다. 파일이 셋이면 배포·검증이 모두 복잡합니다. 어느 하나가 옛 버전이면 무엇이 잘못됐는지 추적이 어렵습니다. FIT는 이 셋을 *한 컨테이너*에 묶고, 각 component에 hash·서명을 달아, 전체를 *원자적*으로 다루는 포맷입니다.

이 글에서는 FIT의 구조, ITS(Image Tree Source) 작성, mkimage로 빌드, U-Boot의 적재 흐름, configuration node, 그리고 hash·서명을 다룹니다.

## 왜 FIT인가

uImage 시대에는 *kernel 하나당 한 파일*이었습니다. DTB는 따로, initramfs도 따로. 여기에 *signature를 붙이려면* 각 파일에 따로 서명을 만들어야 했습니다. 배포에서 한 파일이라도 빠지거나 잘못된 버전이면 부트가 실패합니다.

FIT는 이 문제를 *device tree blob 형식의 컨테이너*로 풉니다.

- **multi-image** — kernel + DTB + ramdisk + DT overlay를 한 파일에.
- **configuration node** — 같은 이미지에서 *여러 보드/모델*을 위한 조합 선택.
- **hash** — 각 component에 hash 노드(SHA-256 등).
- **signature** — configuration 또는 각 component에 서명.
- **압축 지원** — 각 component에 압축 지정(gzip, lzma, lz4, …).
- **로딩 주소 메타데이터** — `load`, `entry` 주소를 노드에 명시.

빌드 산출물은 `.itb`(Image Tree Binary)이고, U-Boot의 `bootm` 명령이 이해합니다.

## ITS 파일 — Image Tree Source

ITS는 *device tree source 문법*으로 작성합니다. 컴파일러는 `mkimage`(또는 `dtc`)입니다.

```dts
/dts-v1/;

/ {
    description = "Kernel and DTB for myboard";
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
            hash-1 {
                algo = "sha256";
            };
        };

        fdt-1 {
            description = "DTB for myboard rev A";
            data = /incbin/("./myboard-revA.dtb");
            type = "flat_dt";
            arch = "arm64";
            compression = "none";
            load = <0x43000000>;
            hash-1 {
                algo = "sha256";
            };
        };

        fdt-2 {
            description = "DTB for myboard rev B";
            data = /incbin/("./myboard-revB.dtb");
            type = "flat_dt";
            arch = "arm64";
            compression = "none";
            load = <0x43000000>;
            hash-1 {
                algo = "sha256";
            };
        };

        ramdisk-1 {
            description = "Initramfs";
            data = /incbin/("./rootfs.cpio.gz");
            type = "ramdisk";
            arch = "arm64";
            os = "linux";
            compression = "gzip";
            load = <0x44000000>;
            hash-1 {
                algo = "sha256";
            };
        };
    };

    configurations {
        default = "conf-revA";

        conf-revA {
            description = "Boot Linux on myboard rev A";
            kernel = "kernel-1";
            fdt = "fdt-1";
            ramdisk = "ramdisk-1";
            hash-1 {
                algo = "sha256";
            };
        };

        conf-revB {
            description = "Boot Linux on myboard rev B";
            kernel = "kernel-1";
            fdt = "fdt-2";
            ramdisk = "ramdisk-1";
            hash-1 {
                algo = "sha256";
            };
        };
    };
};
```

`images/` 안에 *raw component*들이 들어가고, `configurations/` 안에 *조합*이 들어갑니다. 같은 kernel을 두 DTB와 조합해 *두 보드 revision*을 한 파일에 묶었습니다.

## 빌드

mkimage로 ITS를 컴파일합니다.

```bash
mkimage -f myboard.its myboard.itb
```

내부적으로는 device tree compiler가 ITS를 binary blob으로 만들고, mkimage가 hash·서명을 채워 넣습니다. 결과 `.itb` 파일은 *device tree 형식의 binary*입니다. `fdtdump`나 `dtc -I dtb -O dts`로 들여다볼 수 있습니다.

```bash
$ fdtdump myboard.itb | head -30
/dts-v1/;
// magic:            0xd00dfeed
// totalsize:        0x12ab450
// off_dt_struct:    0x38
...
/ {
    description = "Kernel and DTB for myboard";
    images {
        kernel-1 {
            description = "Linux kernel";
            type = "kernel";
            ...
            hash-1 {
                algo = "sha256";
                value = <0xabcd1234 ...>;
            };
        };
    };
};
```

`hash-1`의 `value`가 mkimage 시점에 계산되어 채워진 것이 보입니다.

## U-Boot 측 적재 — `bootm`

`.itb`를 메모리에 적재한 뒤 `bootm`을 호출합니다.

```text
=> load mmc 0:1 ${loadaddr} /boot/myboard.itb
=> bootm ${loadaddr}#conf-revA
## Loading kernel from FIT Image at 40200000 ...
   Using 'conf-revA' configuration
   Trying 'kernel-1' kernel subimage
     Description:  Linux kernel
     Type:         Kernel Image
     Compression:  uncompressed
     Data Start:   0x402000ec
     Data Size:    10995712 Bytes = 10.5 MiB
     Load Address: 0x40400000
     Entry Point:  0x40400000
     Hash algo:    sha256
     Hash value:   abcd1234...
     Verifying Hash Integrity ... sha256+ OK
## Loading fdt from FIT Image at 40200000 ...
   Using 'conf-revA' configuration
   Trying 'fdt-1' fdt subimage
     ...
     Verifying Hash Integrity ... sha256+ OK
## Loading ramdisk from FIT Image at 40200000 ...
   ...
Starting kernel ...
```

`bootm ${loadaddr}#conf-revA`의 `#conf-revA`가 *configuration 이름*입니다. 생략하면 `default`가 쓰입니다.

각 component를 *지정된 load 주소*로 복사하고, hash를 검증한 뒤, kernel entry로 점프합니다. 한 명령에 검증·압축 해제·재배치가 모두 들어 있습니다.

## bootargs 변수 통합

configuration 노드에 `bootargs`를 직접 둘 수도 있습니다.

```dts
configurations {
    conf-revA {
        kernel = "kernel-1";
        fdt = "fdt-1";
        ramdisk = "ramdisk-1";
        bootargs = "console=ttyS0,115200 root=/dev/mmcblk0p2 rw";
        hash-1 { algo = "sha256"; };
    };
};
```

U-Boot 환경의 `bootargs`를 덮어쓰고 *이미지 자체가 지정한 인자*로 부팅합니다. OTA로 새 이미지를 배포할 때 *환경 변수에 의존하지 않고* 새 bootargs를 같이 보낼 수 있습니다.

## 서명 추가 — verified boot의 기초

hash는 *전송 오류 탐지*에는 충분하지만, 공격자가 image와 hash를 같이 위조하면 무용지물입니다. *서명*이 필요합니다.

```dts
configurations {
    default = "conf-revA";

    conf-revA {
        kernel = "kernel-1";
        fdt = "fdt-1";
        signature-1 {
            algo = "sha256,rsa2048";
            key-name-hint = "dev";
            sign-images = "kernel", "fdt", "ramdisk";
        };
    };
};
```

mkimage가 RSA 키로 서명을 만들어 `value`에 채워 넣습니다.

```bash
mkimage -f myboard.its -k keys/ -K u-boot.dtb -r myboard.itb
```

- `-k keys/` — 서명 키가 든 디렉터리
- `-K u-boot.dtb` — *공개 키*를 U-Boot의 control DTB에 박는다
- `-r` — 서명을 *required*로 표시 (verified boot에서 강제)

U-Boot 측에서 `CONFIG_FIT_SIGNATURE=y`를 켜면 `bootm`이 *서명 없는 FIT를 거부*합니다. 공개 키는 U-Boot 빌드 시점에 control DTB에 들어 있으므로, 키 자체가 변조되어도 부트가 막힙니다.

[16장](/blog/embedded/bootloader/chapter16-verified-boot)에서 verified boot 전체 사슬을 다룹니다. FIT 서명은 그 마지막 단계의 빌딩 블록입니다.

## 한 이미지로 여러 보드

`configurations` 노드의 강력함은 *한 `.itb`로 여러 보드*를 지원하는 데 있습니다. 양산 라인에서 보드 revision이 늘어날 때마다 별도 이미지를 빌드하지 않아도 됩니다.

```text
# U-Boot 측에서 보드 자동 감지
=> setenv board_rev "revA"
=> bootm ${loadaddr}#conf-${board_rev}
```

또는 *기본 configuration*을 *기본 fdt 매칭*으로 자동 선택합니다.

```dts
configurations {
    default = "conf-revA";

    conf-revA {
        kernel = "kernel-1";
        fdt = "fdt-1";
        compatible = "vendor,myboard-revA";   /* 보드 compatible과 매칭 */
    };
    conf-revB {
        kernel = "kernel-1";
        fdt = "fdt-2";
        compatible = "vendor,myboard-revB";
    };
};
```

U-Boot가 *현재 보드의 root compatible*과 일치하는 configuration을 자동 선택합니다. `bootm`에 `#`을 명시하지 않아도 됩니다.

## DT overlay 적용

DT overlay를 FIT 안에 두고, configuration에서 base + overlay 조합을 지정할 수 있습니다.

```dts
images {
    fdt-base { /* ... */ };
    fdt-overlay-camera { type = "flat_dt"; /* ... */ };
    fdt-overlay-display { type = "flat_dt"; /* ... */ };
};

configurations {
    conf-with-camera {
        kernel = "kernel-1";
        fdt = "fdt-base", "fdt-overlay-camera";
    };
};
```

U-Boot가 base DTB에 overlay를 적용한 결과를 커널에 넘깁니다. 같은 보드의 *옵션 부품*을 configuration 단위로 처리할 수 있습니다.

## 자주 하는 실수

- **load 주소 충돌.** kernel과 ramdisk의 load 주소가 겹치면 *조용히 깨집니다*. 적재 직후 ramdisk가 kernel을 덮어쓰거나 그 반대.
- **압축 type 불일치.** ramdisk를 `.cpio.gz`로 만들고 ITS에 `compression = "none"`이라 쓰면 U-Boot는 압축 해제를 안 합니다. 부트 후 init이 실패.
- **default configuration이 *서명되지 않음*.** `signature-1` 노드 없는 configuration이 default라면 `CONFIG_FIT_SIGNATURE_STRICT=y`에서 부트가 거부됩니다.
- **mkimage가 *옛 버전*.** mkimage가 새 사양(예: configuration signing)을 모르면 ITS는 컴파일되지만 *서명 노드는 비어 있습니다*. U-Boot 트리에서 빌드한 mkimage를 쓰세요.
- **공개 키를 control DTB에 *안 박았습니다*.** `-K u-boot.dtb`를 빼면 U-Boot가 검증할 키가 없어 모든 FIT를 거부합니다.

## 정리

- FIT는 kernel·DTB·ramdisk·overlay를 *한 파일*에 묶는 device tree 형식의 컨테이너입니다.
- ITS는 device tree source 문법이고, mkimage로 `.itb`를 빌드합니다.
- `images/`는 raw component, `configurations/`는 component 조합입니다.
- `bootm <addr>#<conf>`로 configuration을 선택해 부팅합니다.
- 각 노드에 `hash-1`을 두면 전송 오류 탐지, `signature-1`을 두면 verified boot가 됩니다.
- `compatible` 속성으로 *보드별 configuration 자동 매칭*이 가능합니다.
- DT overlay를 configuration 안에서 base + overlay로 조합할 수 있습니다.

## 다음 장 예고

다음 글에서는 *verified boot*의 전체 사슬을 봅니다. SoC ROM → SPL → U-Boot → FIT까지, 서명·해시가 어떻게 이어져 trust chain을 만드는지 정리합니다.

## 관련 항목

- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — FIT를 적재하는 새 모델
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — FIT 서명을 root of trust로
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — FIT 단위의 atomic update
- [Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — root of trust 개념
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — FIT와 OTA 결합
- [U-Boot FIT 문서](https://docs.u-boot.org/en/latest/usage/fit/index.html)
