---
title: "BSP 양산 환경 구축 — CI/CD·재현 가능 빌드·서명"
date: 2026-05-18T09:20:00
description: "BSP를 양산으로 옮기는 단계 — CI 빌드, 재현성, 코드 서명, 키 관리."
series: "BSP Development"
seriesOrder: 20
tags: [embedded, bsp, ci-cd, signing, production]
draft: false
---

## 한 줄 요약

**양산 BSP는 "내 PC에서 빌드"에서 "버튼 한 번에 서명된 동일 binary"로 가야 합니다.** 재현 가능 빌드, CI/CD, 키 관리 세 축이 그 전환의 핵심입니다.

개발 단계에서는 한 사람이 자기 노트북에서 빌드합니다. 양산 단계에서는 *누가, 언제, 어떤 환경에서* 빌드해도 *bit-by-bit 동일한* binary가 나와야 합니다. 그래야 서명, 라이선스 추적, regulatory 인증이 의미를 가집니다. 동시에 binary는 *서명*되어 있어야 부트로더가 받아들이고 OTA가 통과합니다.

이번 글은 재현 가능 빌드의 기법, CI/CD 파이프라인 구성, 키 관리 계층, 양산 line의 flashing 자동화를 다룹니다.

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
| Build path 차이 | `--remap-path-prefix` (gcc, clang) |
| Locale | `LC_ALL=C` |
| 병렬 빌드 순서 | 결정적 sort, deterministic archive |
| Random ID (build-id) | `--build-id=sha1` |
| 호스트 username/hostname | strip 또는 명시적 값 |
| 컴파일러 버전 | 컨테이너로 pin |
| 의존 패키지 버전 | lock file |

## SOURCE_DATE_EPOCH

대부분의 toolchain과 packager가 이 환경 변수를 인식합니다.

```bash
$ export SOURCE_DATE_EPOCH=$(git log -1 --pretty=%ct)
$ make
```

이렇게 두면 `__DATE__`/`__TIME__`, gzip header, tar mtime, ar header가 모두 이 epoch로 고정됩니다.

```c
// __DATE__가 빌드 시각 대신 commit 시각으로 고정
printf("Built on %s\n", __DATE__);
```

Buildroot, Yocto, Debian 모두 표준으로 채택했습니다.

## build-id 결정성

ELF binary의 `.note.gnu.build-id` 섹션은 binary fingerprint입니다. linker가 *content hash*로 생성하면 결정적, 기본값(uuid)이면 매 빌드 다릅니다.

```text
LDFLAGS += -Wl,--build-id=sha1
```

또는 명시적 0 값:

```text
LDFLAGS += -Wl,--build-id=none
```

build-id를 켜둔 채 결정적으로 만드는 것이 디버깅에 유리합니다. crash dump의 build-id와 release archive의 build-id를 매칭할 수 있습니다.

## 컨테이너로 toolchain pin

호스트 OS 차이는 가장 까다로운 reproducibility 위협입니다. Ubuntu 22.04 / 24.04, glibc 2.35 / 2.39 같은 차이가 build output에 흘러갑니다. 해법은 *containerized build*입니다.

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

image digest(`@sha256:...`)로 base image를 *pin* 합니다. 다음에 누가 같은 Dockerfile을 다시 build 해도 base가 동일합니다.

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

`tags: [hardware-mybsp]`는 GitLab runner의 label입니다. 실제 보드가 연결된 runner에서만 hardware test가 실행되도록 routing 합니다.

LAVA(Linaro Automation and Validation Architecture)는 보드를 farm으로 운영하는 도구입니다. CI가 LAVA에 job 제출 → LAVA가 비어 있는 보드에 flash → 테스트 → 결과 보고.

## 키 관리 계층

키는 보통 3등급으로 나눕니다.

| 등급 | 용도 | 보관 |
|------|------|------|
| Dev | 개발자 PC, daily build | 평문 파일 (git ignore) |
| QA | CI staging, internal release | CI secret store (Vault, GitLab CI variables) |
| Production | 출시 binary 서명 | HSM (Yubikey, AWS CloudHSM, on-prem PKCS#11) |

같은 키로 모두 서명하면 dev 환경 침해 시 production이 함께 무너집니다. 분리 + 서로 다른 CA chain.

## HSM 사용 패턴

HSM은 비밀키를 *내보내지 않는* 장치입니다. signing operation을 HSM에 위임합니다. PKCS#11 standard API로 접근합니다.

```bash
# YubiHSM 사용 예
$ yubihsm-shell -a sign-pkcs1v15 \
    --object-id 0x1234 \
    --algorithm rsa-pkcs1-sha256 \
    --in image.bin \
    --out image.sig
```

OpenSSL을 PKCS#11 engine 경유로:

```bash
$ openssl dgst -sha256 -sign 'pkcs11:object=prod-signing-key' \
    -engine pkcs11 -keyform engine \
    -out image.sig image.bin
```

CI 빌더는 HSM과 동일 network에 있어야 합니다. cloud HSM(AWS, GCP)은 IAM 기반 접근 제어를 합니다.

## 부트로더 서명 (secure boot)

펌웨어 자체도 서명되어 부트 ROM이 검증해야 합니다.

NXP i.MX의 HABv4:

```bash
# CSF (Command Sequence File) 생성
$ cst --certs --key-store hab4_keys/ -o csf.bin -i csf.txt
$ objcopy --add-section .csf=csf.bin u-boot.imx u-boot-signed.imx
```

ARM Trusted Firmware(TF-A)의 BL2/BL31:

```bash
$ cert_create \
    -n --tfw-nvctr 0 --ntfw-nvctr 0 \
    --rot-key rot.pem \
    --trusted-key-cert trusted_key.crt \
    --tb-fw-key-cert tb_fw_key.crt \
    --tb-fw-cert tb_fw.crt \
    --tb-fw tb_fw.bin
```

TF-A는 FIP(Firmware Image Package)로 BL2, BL31, BL33을 묶습니다. 각 binary에 cert가 붙어 chain이 검증됩니다.

OP-TEE 측 trusted application도 별도 서명됩니다. TA마다 RSA 서명 + UUID. REE 측 tee_supplicant가 TA를 로드할 때 OP-TEE OS가 서명 검증.

## Build farm — distcc/icecc

BSP 빌드는 수십 분~수 시간이 걸립니다. CI 한 대로 매 commit마다 빌드 하면 queue가 쌓입니다. distcc/icecream으로 컴파일을 *cluster*에 분산합니다.

```bash
# host에 icecc 데몬
$ apt install icecc icecc-monitor
$ systemctl start iceccd

# 클라이언트 환경
$ export PATH=/usr/lib/icecc/bin:$PATH
$ make -j40    # 4 CPU 호스트가 cluster의 40 core 사용
```

빌드 farm 5대를 둔 팀이 commit-to-image 시간을 60분에서 10분으로 줄이는 케이스가 흔합니다.

ccache + distcc는 따로. ccache는 동일 컴파일 결과를 캐시, distcc는 새 컴파일을 분산. 둘 다 켜면 누적 효과.

## 양산 라인 flashing

flash 도구는 [Ch 17](/blog/embedded/bsp/chapter17-image-packaging)에서 다뤘습니다. 양산 line은 그 도구를 *자동화*합니다.

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
        ["uuu", "-b", "emmc", image_path],
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
    ok, err = flash_board("/srv/images/mybsp-1.5.0.img")
    if not ok:
        log_failure(serial, err)
        sys.exit(1)
    provision(serial, mac)
    log_success(serial, mac)
    print(f"OK: {serial} provisioned with MAC {mac}")

if __name__ == "__main__":
    main()
```

양산 line의 한 station은 다음과 같이 운영됩니다.

1. 작업자가 보드를 jig에 장착
2. 바코드 스캔으로 serial 등록
3. USB 연결 + uuu/fastboot로 flash
4. flash 후 첫 부팅 console log 캡처
5. 자동 self-test (PCB 의 PASS/FAIL 신호)
6. provisioning(MAC, serial, factory cert)
7. 결과를 MES(Manufacturing Execution System)로 송신

failure rate는 일별로 dashboard에 plot. 특정 lot에 fail이 spike 되면 부품 또는 공정 issue.

## SBOM과 라이선스 추적

양산 BSP는 SBOM(Software Bill of Materials)을 동반해야 합니다. SPDX 또는 CycloneDX format.

```bash
# Buildroot
$ make legal-info
# output/legal-info/manifest.csv

# Yocto
$ bitbake -c create_spdx mybsp-image
# tmp/deploy/spdx/
```

manifest.csv에는 각 component, license, source URL, patch가 들어갑니다. GPL 컴포넌트는 *대응 소스 archive*가 필요합니다. Buildroot/Yocto가 자동 archive를 만들어 줍니다.

```bash
$ make legal-info-source-archive   # 모든 GPL 소스 tarball
```

regulator(CE, FCC, KC)와 customer에게 제출하는 release package는 다음을 포함합니다.

- binary image (서명됨)
- SBOM (SPDX)
- 대응 소스 archive
- 빌드 reproducibility 문서 (Dockerfile + commit hash)
- 변경 사항 (CHANGELOG)
- 보안 advisory (CVE 대응)

## 자주 하는 실수

**Dev 키로 production 서명.** dev 키가 깃 저장소에 남아 있으면 누구나 *유효한* production binary를 만들 수 있습니다. 키 분리는 양산 진입 *전*에.

**SOURCE_DATE_EPOCH 안 박기.** 같은 commit을 두 번 빌드하면 다른 binary. CI에서 *항상* 환경 변수로.

**Toolchain pin 없이 CI.** Ubuntu LTS upgrade가 다음 빌드를 깨뜨립니다. 컨테이너로 pin.

**HSM credential을 CI secret으로.** AWS IAM, GitLab masked variable, Vault token 같은 layer를 거치도록 합니다. HSM PIN을 GitLab CI variable에 *평문*으로 두면 안 됨.

**라이선스 audit 미수행.** GPL 컴포넌트가 product에 포함되었는데 SBOM에 없거나 대응 소스가 없으면 *라이선스 위반*. 매 release legal-info 자동 생성.

**Flash 후 boot test 생략.** 양산 line은 flash 직후 *반드시* boot + self-test. 미테스트로 출하한 보드의 fail rate가 dashboard에 보일 때는 이미 customer 손에.

## 정리

- 재현 가능 빌드는 `SOURCE_DATE_EPOCH`, build-id sha1, 컨테이너로 pin 한 toolchain의 조합으로 달성합니다.
- CI/CD 파이프라인은 lint → build → smoke → stress → package → sign → deploy 단계로 분리합니다.
- 키는 dev / QA / production 3등급으로 나누고 production은 HSM에 보관합니다. PKCS#11 API로 접근.
- 부트로더(HABv4, TF-A FIP), kernel(FIT image 서명), rootfs(dm-verity), OTA bundle 모두 별도 서명 layer입니다.
- LAVA 같은 board farm + GitLab runner label로 hardware test를 CI에 통합합니다.
- distcc/icecream의 build cluster로 commit-to-image 시간을 분 단위로 줄입니다.
- 양산 line은 바코드 → flash → boot → self-test → provisioning → MES 송신을 자동화합니다.
- SBOM과 대응 소스 archive는 라이선스 audit과 regulator 인증의 필수 자료입니다. 매 release 자동 생성.

## 다음 편 예고

[Ch 21: 유지보수](/blog/embedded/bsp/chapter21-maintenance)에서는 BSP의 *장기 유지보수*를 다룹니다. 업스트림 기여로 부담 줄이기, LTS 선택, 커널 버전업 전략, 그리고 시리즈 마무리입니다.

## 관련 항목

- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — 서명된 bundle의 활용
- [Ch 21: 유지보수](/blog/embedded/bsp/chapter21-maintenance) — 양산 후의 삶
- [Embedded Security — Secure boot](/blog/embedded/embedded-security/chapter01-threat-model) — 서명 chain 깊이
- [Buildroot Practical — SBOM](/blog/embedded/buildroot/chapter01-problem) — 라이선스 추적
