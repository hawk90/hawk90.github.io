---
title: "BSP 양산 환경 구축 — CI/CD·재현 가능 빌드·서명"
slug: "embedded/bsp/chapter20-production"
date: 2026-05-18T09:20:00
description: "BSP를 양산으로 옮기는 단계 — CI 빌드, 재현성, 코드 서명, 키 관리."
series: "BSP Development"
seriesOrder: 20
tags: [embedded, bsp, ci-cd, signing, production]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**양산 BSP는 "내 PC에서 빌드"에서 "버튼 한 번에 서명된 동일 binary"로 가야 합니다.** 재현 가능 빌드, CI/CD, 키 관리 세 축이 그 전환의 핵심입니다.

개발 단계에서는 한 사람이 자기 노트북에서 빌드합니다. 양산 단계에서는 *누가, 언제, 어떤 환경에서* 빌드해도 *bit-by-bit 동일한* binary가 나와야 합니다. 그래야 서명, 라이선스 추적, regulatory 인증이 의미를 가집니다. 동시에 binary는 *서명*되어 있어야 부트로더가 받아들이고 OTA가 통과합니다.

이번 글은 재현 가능 빌드, CI/CD 파이프라인, 키 관리, 서명, SBOM, 양산 line 자동화를 다룹니다. 재현성은 Debian 13 guest의 gcc 14.2로 직접 시험했고, 서명 도구와 SBOM 생성은 U-Boot·TF-A·Buildroot·Yocto 문서로 대조했습니다(실행하지 않았습니다).

## 재현 가능 빌드의 필요성

같은 소스에서 두 번 빌드한 binary가 다르면 다음 문제가 생깁니다.

- *어느 binary가 field에 있는지* 추적 불가
- 서명된 binary와 unsigned binary가 같은 소스인지 확인 불가
- 라이선스 audit에서 SBOM 정확성 떨어짐
- 보안 사고 시 *어디서부터 영향*인지 판단 불가

reproducibility를 깨는 주범은 다음입니다.

| 원인 | 해결 |
|------|------|
| 빌드 timestamp | `SOURCE_DATE_EPOCH` 환경 변수 |
| Build path 차이 | gcc·clang의 `-ffile-prefix-map=OLD=NEW` |
| Locale | `LC_ALL=C` |
| 병렬 빌드 순서 | 결정적 sort, deterministic archive |
| ELF build-id 설정 | 해당 linker가 지원하는 결정적 style을 선택하고 실제 산출물 비교 |
| 호스트 username/hostname | strip 또는 명시적 값 |
| 컴파일러 버전 | 컨테이너로 pin |
| 의존 패키지 버전 | lock file |

## SOURCE_DATE_EPOCH와 경로 — 직접 해 보기

`SOURCE_DATE_EPOCH`는 빌드 도구에게 "지금" 대신 쓸 시각을 알려 주는 환경 변수입니다. 서로 다른 디렉터리 `a/`와 `b/`에 같은 파일을 두고 gcc 14.2로 세 번 빌드했습니다.

```c
#include <stdio.h>
int main(void) { printf("Built on %s %s\n", __DATE__, __TIME__); return 0; }
```

```text
# 1) 그냥 빌드 (2초 간격)
$ cd a && gcc -O2 -g -o ver ver.c; sleep 2; cd ../b && gcc -O2 -g -o ver ver.c
09058c7f82c6d145...  a/ver
9c3d0786b26559a5...  b/ver
# 2) SOURCE_DATE_EPOCH=1700000000
67e3c3cbd9cad55c...  a/ver
3850be40347801a3...  b/ver
$ a/ver
Built on Nov 14 2023 22:13:20
# 3) SOURCE_DATE_EPOCH + -ffile-prefix-map=<dir>=.
7ff7169c5987823b...  a/ver
7ff7169c5987823b...  b/ver
```

`SOURCE_DATE_EPOCH`가 `__DATE__`·`__TIME__`을 고정했는데도(2번, 1700000000은 2023-11-14 22:13:20 UTC) 두 바이너리는 달랐습니다. `-g`로 넣은 디버그 정보에 빌드 디렉터리 경로가 들어가기 때문입니다. `-ffile-prefix-map`으로 경로를 바꿔 주자(3번) 두 바이너리가 같아졌습니다. 재현성은 원인 하나를 고쳐서는 확인되지 않고, 두 번 빌드해 비교해야 확인됩니다.

## build-id 결정성

ELF `.note.gnu.build-id`는 linker가 만드는 build identifier입니다. Debian 13의 gcc는 spec에 `--build-id`를 넣어 기본으로 만들고(`gcc -dumpspecs`에 `--build-id`가 있음), 위 3번 바이너리에는 `Build ID: 1dec33cad6aaf9a0eba44c36d20b3427e6d31e6d`가 있었습니다. 두 디렉터리의 바이너리가 바이트 단위로 같았으므로 build-id도 같습니다. 바이너리가 같으면 build-id도 같으므로, 현장 바이너리의 build-id로 보관된 빌드를 찾을 수 있습니다.

```text
LDFLAGS += -Wl,--build-id=sha1
```

build-id를 생략하는 선택은 `none`이지만, 이는 결정적 identifier를 만드는 설정이 아니라 identifier를 생성하지 않는 설정입니다.

```text
LDFLAGS += -Wl,--build-id=none
```

build-id는 현장 crash dump와 보관한 디버그 심볼을 짝짓는 열쇠입니다. release마다 같은 build-id의 `vmlinux`·디버그 파일을 보관합니다(Ch 11의 `faddr2line`).

## 컨테이너로 toolchain pin

위 시험은 한 guest의 같은 gcc 14.2에서 한 것입니다. CI와 개발자 PC가 같은 결과를 내려면 컴파일러와 도구 버전까지 같아야 하므로 빌드 환경을 컨테이너 이미지로 고정합니다.

```dockerfile
# Dockerfile - BSP builder image
FROM ubuntu:24.04@sha256:abc123...

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential bc bison flex libssl-dev \
    libncurses-dev rsync python3 git wget unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
ENV SOURCE_DATE_EPOCH=1700000000
ENV LC_ALL=C
ENTRYPOINT ["/usr/bin/make"]
```

```bash
$ docker build -t mybsp-builder:1.0 .
$ docker run --rm -v $(pwd):/work mybsp-builder:1.0 all
```

image digest는 base image를 고정합니다. `apt-get update`로 최신 저장소 패키지를 설치하는 이 예시는 나머지 build dependency를 고정하지 않으므로, 재현성에는 package snapshot/version도 별도로 고정해야 합니다.

## CI/CD 파이프라인 (GitLab 예)

전체 파이프라인은 다음 단계로 흐릅니다.

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - build
  - test
  - package
  - sign
  - deploy

variables:
  GIT_STRATEGY: clone
  BUILDER_IMAGE: registry.example.com/mybsp/builder:1.0

lint:
  stage: lint
  image: $BUILDER_IMAGE
  script:
    - ./scripts/check-style.sh
    - ./scripts/check-license.sh

build:
  stage: build
  image: $BUILDER_IMAGE
  script:
    - export SOURCE_DATE_EPOCH=$(git log -1 --pretty=%ct)
    - make BR2_EXTERNAL=$PWD/bsp mybsp_defconfig
    - make -j$(nproc)
  artifacts:
    paths:
      - output/images/
    expire_in: 1 week

smoke-test:
  stage: test
  tags: [hardware-mybsp]
  script:
    - lava-tool submit $LAVA_URL job-smoke.yaml
  needs: [build]

stress-1h:
  stage: test
  tags: [hardware-mybsp]
  script:
    - lava-tool submit $LAVA_URL job-stress-1h.yaml
  needs: [build]

package:
  stage: package
  image: $BUILDER_IMAGE
  script:
    - genimage --config genimage.cfg
    - bmaptool create -o output/sdcard.bmap output/sdcard.img
    - sha256sum output/* > output/SHA256SUMS

sign:
  stage: sign
  image: $BUILDER_IMAGE
  only:
    - tags
  script:
    - hsm-sign --key prod-2024 \
        --in output/sdcard.img \
        --out output/sdcard.img.sig
  artifacts:
    paths:
      - output/sdcard.img
      - output/sdcard.img.sig

deploy:
  stage: deploy
  only:
    - tags
  script:
    - aws s3 cp output/sdcard.img s3://mybsp-releases/${CI_COMMIT_TAG}/
    - aws s3 cp output/sdcard.img.sig s3://mybsp-releases/${CI_COMMIT_TAG}/
```

위 YAML은 구조를 보이는 예이고, `lava-tool`, `hsm-sign` 같은 명령은 쓰는 board farm과 서명 서비스의 것으로 바꿉니다. 이 글은 이 파이프라인을 실행하지 않았습니다. `tags: [hardware-mybsp]`는 GitLab runner의 label로, 보드가 연결된 runner에서만 hardware test가 돌게 합니다.

## 키 관리 계층

키를 용도별로 나눈 예입니다.

| 등급 | 용도 | 보관 |
|------|------|------|
| Dev | 개발자 PC, daily build | 평문 파일 (git ignore) |
| QA | CI staging, internal release | CI secret store (Vault, GitLab CI variables) |
| Production | 출시 binary 서명 | YubiHSM, AWS CloudHSM 또는 PKCS#11을 제공하는 관리형 HSM 등 |

같은 키로 모두 서명하면 dev 환경이 뚫렸을 때 production 서명도 같이 뚫립니다. 등급마다 다른 CA 체인을 둡니다. RAUC로 만든 3단 체인과 만료 시험은 Ch 18에 있습니다.

## HSM 사용 패턴

HSM은 비밀키를 내보내지 않고 서명 연산만 해 주는 장치입니다. 빌드 서버는 PKCS#11 같은 표준 인터페이스로 서명을 요청합니다. HSM 제품별 명령은 이 글에서 실행하지 않아 싣지 않습니다.

## 부트로더 서명 (secure boot)

펌웨어 자체도 서명되어 부트 ROM이 검증해야 합니다.

NXP i.MX의 HABv4:

U-Boot v2024.04의 HABv4 안내(`doc/imx/habv4/guides/mx6_mx7_secure_boot.txt:123`)는 NXP CST로 CSF를 만드는 명령을 이렇게 적습니다.

```bash
./cst -i csf_uboot.txt -o csf_uboot.bin
```

CSF 입력 파일 예는 같은 디렉터리의 `csf_examples/`에 있습니다. 이 글은 서명을 실행하지 않았습니다.

ARM Trusted Firmware(TF-A)의 BL2/BL31:

TF-A는 Trusted Board Boot에서 `tools/cert_create`로 인증서를 만들고 FIP에 함께 넣습니다(`docs/design/trusted-board-boot.rst`). 이 도구의 옵션 이름은 소스에 정의되어 있습니다. 예를 들어 `rot-key`(`src/tbbr/tbb_key.c:17`), `tfw-nvctr`·`ntfw-nvctr`(`tbb_ext.c:25,35`), `tb-fw-cert`(`tbb_cert.c:21`), `trusted-key-cert`(`tbb_cert.c:38`)입니다. Ch 7의 QEMU 빌드는 Trusted Board Boot 없이 만든 FIP였습니다.

## Build farm — distcc/icecc

Ch 8에서 커널 `defconfig` 빌드 하나가 4 vCPU guest에서 18분 48초 걸렸습니다. CI가 commit마다 이런 빌드를 돌리면 대기열이 쌓이므로 distcc나 icecream으로 컴파일을 여러 기계에 나눕니다(이 글에서는 실행하지 않았습니다).

```bash
# host에 icecc 데몬
$ apt install icecc icecc-monitor
$ systemctl start iceccd

# 클라이언트 환경
$ export PATH=/usr/lib/icecc/bin:$PATH
$ make -j40    # 4 CPU 호스트가 cluster의 40 core 사용
```

ccache는 같은 컴파일의 결과를 다시 쓰고, distcc는 새 컴파일을 나눕니다. 서로 다른 일을 하므로 함께 쓸 수 있습니다.

## 양산 라인 flashing

flash 도구는 [Ch 17](/blog/embedded/bsp/chapter17-image-packaging)에서 다뤘습니다. 양산 line은 그 도구를 *자동화*합니다.

아래 스크립트는 흐름을 보이는 예이고 실행하지 않았습니다. `uuu -b emmc_all <wic.zst>`는 이미지 전체를 eMMC에 쓰는 형태로, NXP mfgtools README의 예제 줄("decompress wic.zst file and download the whole image into emmc")을 따랐습니다. 같은 README에서 `-b emmc`는 eMMC boot partition에 U-Boot만 쓰는 예입니다.

```python
#!/usr/bin/env python3
# production-flash.py
import subprocess, sys, json
from datetime import datetime

def scan_barcode():
    """바코드 스캐너에서 보드 시리얼 읽기"""
    return input("Scan board barcode: ").strip()

def flash_board(image_path):
    result = subprocess.run(
        ["uuu", "-b", "emmc_all", image_path],
        capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr

def provision(serial, mac):
    """factory partition에 시리얼/MAC 기록"""
    # mount data partition, write provisioning JSON
    pass

def main():
    serial = scan_barcode()
    mac = generate_mac(serial)
    ok, err = flash_board("/srv/images/mybsp-1.5.0.wic.zst")
    if not ok:
        log_failure(serial, err)
        sys.exit(1)
    provision(serial, mac)
    log_success(serial, mac)
    print(f"OK: {serial} provisioned with MAC {mac}")

if __name__ == "__main__":
    main()
```

station 하나의 흐름을 예로 들면 다음과 같습니다.

1. 작업자가 보드를 jig에 장착
2. 바코드 스캔으로 serial 등록
3. USB 연결 + uuu/fastboot로 flash
4. flash 후 첫 부팅 console log 캡처
5. 자동 self-test (PCB 의 PASS/FAIL 신호)
6. provisioning(MAC, serial, factory cert)
7. 결과를 MES(Manufacturing Execution System)로 송신

flash 결과를 serial과 함께 기록해 두면, 특정 부품 lot에서 실패가 몰리는지를 나중에 찾을 수 있습니다.

## SBOM과 라이선스 추적

출시 이미지에 무엇이 들어 있는지는 빌드 시스템이 목록으로 만들어 줍니다.

- **Buildroot**: `make legal-info`. Buildroot 2024.02 매뉴얼 `legal-notice.adoc`에 따르면 host·target 패키지별 manifest 파일, `sources/`와 `host-sources/` 아래의 소스, `licenses/`와 `host-licenses/` 아래의 license 텍스트가 나옵니다. 같은 문서는 이 결과를 그대로 compliance 자료로 쓰기 전에 검토하라고 적습니다.
- **Yocto**: Yocto 5.0.17 Development Tasks Manual의 SBOM 절에 따르면 OpenEmbedded는 `INHERIT_DISTRO`의 `create-spdx` class로 SPDX를 기본 생성하고, 이미지를 빌드하면 `IMAGE-MACHINE.spdx.tar.zst`가 나옵니다.

이 글은 두 명령을 실행하지 않았습니다.

release마다 함께 보관할 자료의 예입니다.

- binary image (서명됨)
- SBOM (SPDX)
- 대응 소스 archive
- 빌드 reproducibility 문서 (Dockerfile + commit hash)
- 변경 사항 (CHANGELOG)
- 보안 advisory (CVE 대응)

## 자주 하는 실수

**Dev 키로 production 서명.** dev 키가 깃 저장소에 남아 있으면 누구나 *유효한* production binary를 만들 수 있습니다. 키 분리는 양산 진입 *전*에.

**SOURCE_DATE_EPOCH만 박고 끝내기.** 위 시험처럼 시각을 고정해도 빌드 경로가 다르면 바이너리가 달랐습니다. 두 번 빌드해 비교하는 단계를 CI에 둡니다.

**Toolchain pin 없이 CI.** Ubuntu LTS upgrade가 다음 빌드를 깨뜨립니다. 컨테이너로 pin.

**HSM credential을 CI secret으로.** AWS IAM, GitLab masked variable, Vault token 같은 layer를 거치도록 합니다. HSM PIN을 GitLab CI variable에 *평문*으로 두면 안 됨.

**라이선스 자료 미생성.** release마다 `make legal-info`나 Yocto SPDX 결과를 함께 보관합니다.

**Flash 후 boot test 생략.** 양산 line은 flash 직후 *반드시* boot + self-test. 미테스트로 출하한 보드의 fail rate가 dashboard에 보일 때는 이미 customer 손에.

## 정리

- gcc 14.2 시험에서 `SOURCE_DATE_EPOCH`만으로는 바이너리가 달랐고, `-ffile-prefix-map`까지 더해야 같아졌습니다. 재현성은 두 번 빌드해 비교해야 확인됩니다.
- CI/CD 파이프라인은 lint → build → smoke → stress → package → sign → deploy 단계로 분리합니다.
- 키는 dev / QA / production 3등급으로 나누고 production은 HSM에 보관합니다. PKCS#11 API로 접근.
- 부트로더 서명은 i.MX HABv4(CST, U-Boot `doc/imx/habv4/`)와 TF-A Trusted Board Boot(`cert_create`)로 따로 있고, OTA bundle 서명은 Ch 18의 RAUC입니다.
- 보드가 연결된 runner에만 hardware test를 보내도록 GitLab runner label을 씁니다.
- 양산 line은 바코드 → flash → boot → self-test → provisioning → MES 송신을 자동화합니다.
- Buildroot는 `make legal-info`, Yocto는 기본 `create-spdx`로 manifest·license·소스 목록을 만듭니다.

## 다음 편 예고

[Ch 21: 유지보수](/blog/embedded/bsp/chapter21-maintenance)에서는 BSP의 *장기 유지보수*를 다룹니다. 업스트림 기여로 부담 줄이기, LTS 선택, 커널 버전업 전략, 그리고 시리즈 마무리입니다.

## 관련 항목

- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — 서명된 bundle의 활용
- [Ch 21: 유지보수](/blog/embedded/bsp/chapter21-maintenance) — 양산 후의 삶
- [Embedded Security — Secure boot](/blog/embedded/embedded-security/chapter01-threat-model) — 서명 chain 깊이
- [Buildroot Practical — SBOM](/blog/embedded/buildroot/chapter01-problem) — 라이선스 추적
