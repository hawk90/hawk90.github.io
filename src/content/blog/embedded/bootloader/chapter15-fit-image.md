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

**FIT(Flattened Image Tree)는 kernel·DTB·ramdisk·overlay를 한 파일에 묶고, 설정에 따라 hash와 signature metadata를 포함할 수 있는 U-Boot 이미지 형식입니다.** 한 이미지로 여러 구성을 나타낼 수 있고, verified boot의 구성 요소로 사용할 수 있습니다.

[10~14장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 부트 흐름은 *kernel*, *DTB*, *ramdisk*를 따로 적재했습니다. 파일이 셋이면 배포·검증이 모두 복잡합니다. 어느 하나가 옛 버전이면 무엇이 잘못됐는지 추적이 어렵습니다. FIT는 관련 이미지와 구성을 한 컨테이너에 패키징할 수 있습니다. 패키징만으로 배포의 원자성이나 보안이 보장되지는 않으며, 무결성과 서명 검증은 별도 설정이 필요합니다.

이 글의 DTS/ITS 조각은 구조 설명용 예시이며 target artifact로 빌드하거나 실행하지 않았습니다. FIT configuration 속성, signature metadata, address, algorithm 지원은 선택한 U-Boot tag와 host `mkimage` 버전에 맞춰 검증해야 합니다.

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

ITS는 device tree source 형식이며, 일반적으로 U-Boot의 `mkimage`가 처리합니다. `dtc`만으로 서명·해시 작성까지 대체하는 것은 아닙니다.

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

FIT의 실제 구조는 사용하는 `mkimage` 버전과 입력 ITS에 따라 달라집니다. 아래 명령으로 파일을 덤프할 수 있지만, 이 문서에는 특정 보드에서 생성한 덤프 결과를 싣지 않습니다.

```bash
fdtdump myboard.itb
```

`hash` 노드는 생성 절차와 옵션에 따라 값이 채워지며, 이 노드가 있다고 해서 서명 검증이나 trusted boot가 자동 활성화되는 것은 아닙니다.

## U-Boot 측 적재 — `bootm`

`.itb`를 메모리에 적재한 뒤 `bootm`을 호출합니다.

```text
=> load mmc 0:1 ${loadaddr} /boot/myboard.itb
=> bootm ${loadaddr}#conf-revA
```

이 명령은 해당 FIT, U-Boot 빌드, 주소 배치가 실제 구성과 맞을 때의 syntax 예시입니다. 보드별 주소, 선택된 configuration 및 성공 출력은 실행 확인하지 않았습니다.

`bootm ${loadaddr}#conf-revA`의 `#conf-revA`가 *configuration 이름*입니다. 생략하면 `default`가 쓰입니다.

각 component를 *지정된 load 주소*로 복사하고, hash를 검증한 뒤, kernel entry로 점프합니다. 한 명령에 검증·압축 해제·재배치가 모두 들어 있습니다.

## bootargs 변수 통합

일부 FIT 기반 부트 설계는 OS command line을 함께 제공하려 하지만, 이 속성과 U-Boot `bootargs` 사이의 지원·우선순위를 이 문서의 확인 자료로 검증하지 못했습니다. 제품에 적용하기 전 선택한 tag의 source와 runtime behavior를 대조해야 합니다.

여기서는 검증되지 않은 `bootargs` property 예시를 제시하지 않습니다. FIT image/configuration 처리와 Linux command-line 전달은 각각 target의 U-Boot tag 문서 및 source로 확인합니다.

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

서명 생성 시에는 FIT 문서에 맞는 ITS와 mkimage 옵션, 키, 대상 configuration을 준비해야 합니다. 서명 node의 속성과 선택되는 이미지 범위는 빌드 도구와 옵션에 따라 정해집니다.

```bash
mkimage -f myboard.its -k keys/ -K u-boot.dtb -r myboard.itb
```

- `-k keys/` — 서명 키가 든 디렉터리
- `-K u-boot.dtb` — *공개 키*를 U-Boot의 control DTB에 박는다
- `-r` — 서명 verification에서 required key 정책을 설정하는 옵션; 결과 FIT와 control FDT의 required 조건을 검사해야 합니다.

`CONFIG_FIT_SIGNATURE`는 FIT 서명 기능을 활성화하지만, 이것만으로 모든 unsigned FIT가 거부된다고 할 수는 없습니다. FIT 문서는 control FDT의 public key에 `required = "conf"` 또는 `required = "image"` 조건을 두어 필수 검증을 설정하는 방법을 설명합니다. 키는 신뢰 가능한 방식으로 control FDT에 provision되어야 하며, 키 저장과 fallback 설정은 제품의 root-of-trust 설계로 검증해야 합니다.

[16장](/blog/embedded/bootloader/chapter16-verified-boot)에서 verified boot 전체 사슬을 다룹니다. FIT 서명은 그 마지막 단계의 빌딩 블록입니다.

## 한 이미지로 여러 보드

`configurations` 노드의 강력함은 *한 `.itb`로 여러 보드*를 지원하는 데 있습니다. 양산 라인에서 보드 revision이 늘어날 때마다 별도 이미지를 빌드하지 않아도 됩니다.

```bash
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

configuration 선택은 명시된 configuration 또는 default 속성에 따릅니다. compatible에 따른 best-match 선택은 `CONFIG_FIT_BEST_MATCH` 등 build/runtime 조건에 의존하므로, compatible 속성만으로 자동 선택을 가정하면 안 됩니다.

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

U-Boot FIT overlay 문서는 configuration의 `fdt` 목록에 base와 overlay를 순서대로 지정하는 방식을 설명합니다. 보드별 overlay 적용은 실제 FIT, DT symbols, load addresses와 U-Boot 설정으로 검증해야 합니다.

## 자주 하는 실수

- **load 주소 충돌.** kernel과 ramdisk의 load 주소가 겹치면 *조용히 깨집니다*. 적재 직후 ramdisk가 kernel을 덮어쓰거나 그 반대.
- **압축 속성을 가정합니다.** 실제 payload 압축 형식, ITS 속성 및 U-Boot의 지원 조합을 확인하고 부팅 시험을 합니다.
- **required key 정책과 FIT 서명 범위를 확인하지 않습니다.** required key 속성, 서명된 configuration 및 구성에 포함된 이미지가 맞는지 positive/negative 시험을 합니다.
- **mkimage가 *옛 버전*.** mkimage가 새 사양(예: configuration signing)을 모르면 ITS는 컴파일되지만 *서명 노드는 비어 있습니다*. U-Boot 트리에서 빌드한 mkimage를 쓰세요.
- **검증 키 provision을 확인하지 않습니다.** 키 위치와 required 조건이 대상 빌드에서 일치하는지 확인합니다. 동작은 `CONFIG_FIT_SIGNATURE`만으로 단정할 수 없습니다.

## 정리

- FIT는 kernel·DTB·ramdisk·overlay를 *한 파일*에 묶는 device tree 형식의 컨테이너입니다.
- ITS는 device tree source 문법이고, mkimage로 `.itb`를 빌드합니다.
- `images/`는 raw component, `configurations/`는 component 조합입니다.
- `bootm <addr>#<conf>`로 configuration을 선택해 부팅합니다.
- hash는 FIT component 무결성 검사에 사용되고 서명 검증은 trusted key 및 required 정책 등 추가 구성이 필요합니다.
- compatible best-match 선택은 해당 U-Boot의 `FIT_BEST_MATCH` 설정과 실행 조건을 확인해야 합니다.
- DT overlay를 configuration 안에서 base + overlay로 조합할 수 있습니다.

## 다음 장 예고

다음 글에서는 *verified boot*의 전체 사슬을 봅니다. SoC ROM → SPL → U-Boot → FIT까지, 서명·해시가 어떻게 이어져 trust chain을 만드는지 정리합니다.

## 관련 항목

- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — FIT를 적재하는 새 모델
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — FIT 서명을 root of trust로
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — FIT 단위의 atomic update
- [Security Ch 2: Secure Boot](/blog/embedded/embedded-security/chapter02-secure-boot) — root of trust 개념
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — FIT와 OTA 결합
- [U-Boot v2025.01 FIT 문서](https://docs.u-boot.org/en/v2025.01/usage/fit/index.html)
- [U-Boot v2025.01 FIT Signature Verification](https://docs.u-boot.org/en/v2025.01/usage/fit/signature.html)
- [U-Boot v2025.01 FIT Overlay Usage](https://docs.u-boot.org/en/v2025.01/usage/fit/overlay-fdt-boot.html)
- [U-Boot v2025.01 bootm command](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootm.html)
