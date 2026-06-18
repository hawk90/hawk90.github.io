---
title: "부트로더 CI 구축 — build matrix와 자동 부팅 테스트"
date: 2026-05-19T09:30:00
description: "여러 보드의 U-Boot/TF-A를 PR마다 빌드하고, QEMU·real board에서 boot까지 자동 검증하는 CI 패턴."
series: "Bootloader Internals"
seriesOrder: 30
tags: [embedded, bootloader, ci-cd, qemu, build-matrix]
draft: false
---

## 한 줄 요약

> **"부트로더 CI는 *빌드가 끝이 아니라 boot가 끝*입니다."** — 컴파일이 성공해도 board에서 `=>` 프롬프트가 안 뜨면 의미가 없습니다. PR마다 QEMU 또는 실 보드에서 *부팅 로그까지 검증*하는 pipeline이 부트로더 CI의 본체입니다.

## 부트로더 CI의 어려움

application CI는 unit test로 끝납니다. 부트로더 CI는 그렇게 끝낼 수 없습니다. 컴파일러가 통과시킨 코드가 실 보드에서 *DDR training에 실패해 hang*하는 일이 자주 일어나고, 어셈블리 한 줄·linker script 한 항목·DTB 한 노드의 변경이 *boot 자체를 막을 수* 있습니다. 그 사실은 *실행해 봐야* 알 수 있습니다. 어려움을 만드는 요소가 네 가지입니다.

| 요소 | 내용 | 영향 |
|---|---|---|
| **보드 실기 필요** | DDR·clock·PMIC는 simulator로 못 재현 | 실 보드 farm 운영 비용 |
| **빌드 다양성** | defconfig가 보드마다 다름. SoC 변형 × revision × 옵션 | matrix 차원이 빠르게 폭증 |
| **artifact 크기** | debug ELF가 50 ~ 100 MB. multi-target이면 GB 단위 | CI artifact limit 압박 |
| **부팅 자체가 1단계 검증** | 빌드 성공 ≠ boot 성공 | QEMU/real board 자동 boot test 필수 |

[Ch 21: 새 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting)에서 본 것처럼 한 보드의 U-Boot defconfig가 정상화되는 데 *수십 commit*이 들어갑니다. 그 사이 *과거 정상 보드*가 회귀하지 않게 하려면 CI matrix가 *모든 보드를 매 PR마다* 검증해야 합니다. 이 장은 pipeline을 build matrix → QEMU boot test → 실 보드 farm → regression 검출 → secure boot 키 관리의 다섯 단으로 쌓아 갑니다.

## build matrix — defconfig·TF-A·OP-TEE 동시

U-Boot은 단독 빌드가 아닙니다. ARMv8-A에서는 *TF-A의 BL31*과 *옵션 OP-TEE*가 함께 묶여야 부팅 가능한 image가 됩니다. CI matrix는 세 trees가 *동시 build*에 들어가는 것을 전제로 합니다.

```yaml
# .gitlab-ci.yml — U-Boot · TF-A · OP-TEE를 DAG로 묶음
stages: [build, boot-test, archive]

.uboot_build: &uboot_build
  stage: build
  image: registry.example.com/bootloader-builder:2026.02
  cache: { key: "uboot-${BOARD}", paths: [u-boot/.ccache/] }
  script:
    - cd u-boot && make ${BOARD}_defconfig
    - make -j$(nproc) 2>&1 | tee build.log
    - size u-boot u-boot-spl 2>/dev/null | tee size.txt
  artifacts:
    name: "uboot-${BOARD}-${CI_COMMIT_SHORT_SHA}"
    paths: [u-boot/u-boot.bin, u-boot/u-boot.dtb, u-boot/u-boot.map,
            u-boot/spl/u-boot-spl.bin, u-boot/size.txt]
    expire_in: 1 year

build:qemu_arm64:
  <<: *uboot_build
  variables: { BOARD: qemu_arm64 }

build:imx8mp:
  <<: *uboot_build
  variables: { BOARD: imx8mp_evk }
  needs: [build:tfa_imx8mp, build:optee_imx8mp]

build:tfa_imx8mp:
  stage: build
  script: [cd trusted-firmware-a, make PLAT=imx8mp bl31 -j$(nproc)]
  artifacts: { paths: [trusted-firmware-a/build/imx8mp/release/bl31.bin] }

build:optee_imx8mp:
  stage: build
  script: [cd optee_os, make PLATFORM=imx-mx8mpevk CFG_ARM64_core=y -j$(nproc)]
  artifacts: { paths: [optee_os/out/arm-plat-imx/core/tee.bin] }
```

핵심은 `needs:` directive입니다. `build:imx8mp`는 TF-A와 OP-TEE 결과물에 *의존*하므로 두 job이 끝나야 시작합니다. GitLab은 이 의존을 *DAG*로 해석해 *불필요한 직렬화 없이* 병렬화합니다.

matrix 차원은 세 가지가 표준입니다.

| 차원 | 예 | 용도 |
|---|---|---|
| **보드** | qemu_arm64 / imx8mp / rk3399 | hardware 변형마다 검증 |
| **variant** | mainline / vendor-fork | 둘 다 유지하는 팀에 필요 |
| **secure** | non-secure / secure (TF-A + signed) | secure boot regression |

세 차원을 다 켜면 *3 × 2 × 2 = 12 job*. 작아 보이지만 각 job이 *TF-A + OP-TEE + U-Boot*을 묶으면 *실제 빌드 단위는 36개*입니다. self-hosted runner pool 없이는 queue가 깁니다.

## QEMU boot test 자동화

ARMv8-A U-Boot은 *QEMU virt*에서 `-bios u-boot.bin` 한 줄로 뜹니다. CI에서 expect script로 *부팅 로그의 anchor*를 잡아 검증합니다.

```bash
#!/usr/bin/env bash
# scripts/qemu-boot-test.sh
set -euo pipefail
UBOOT_BIN="${1:-u-boot/u-boot.bin}"
LOG="qemu-boot.log"

timeout 30s qemu-system-aarch64 \
    -machine virt -cpu cortex-a53 -m 1G \
    -nographic -no-reboot -bios "$UBOOT_BIN" > "$LOG" 2>&1 &
QEMU_PID=$!

# anchor — U-Boot prompt가 떴는지
for i in $(seq 1 30); do
    if grep -q '^=> ' "$LOG"; then
        echo "[PASS] U-Boot prompt reached in ${i}s"
        kill $QEMU_PID 2>/dev/null || true; exit 0
    fi
    sleep 1
done

echo "[FAIL] U-Boot prompt not reached"; tail -30 "$LOG"
kill $QEMU_PID 2>/dev/null || true; exit 1
```

이 script가 검증하는 것은 *DRAM training + driver probe + console init 통과*입니다. `=>` 한 줄이 뜨려면 U-Boot이 *명령 인터프리터에 진입*해야 하므로 부트 체인의 절반 이상이 살아 있다는 신호입니다. 더 깊은 검증은 expect로 `version`·`bdinfo` 같은 *읽기 전용 명령*의 응답까지 확인합니다. write 명령(`mw`, `setenv saveenv`)은 *flash backing store가 더러워져* 다음 run이 영향을 받으므로 피합니다.

[Ch 22: 디버깅 워크플로](/blog/embedded/bootloader/chapter22-debugging)에서 본 *로그 anchor 기반 검증*이 CI 자동 boot test의 본체입니다.

## LAVA — 실 보드 farm

QEMU로는 잡히지 않는 회귀가 있습니다. 실제 DDR controller, PMIC 시퀀스, eMMC bus, ethernet PHY는 *real silicon*에서만 드러납니다. Linaro의 **LAVA**(Linaro Automated Validation Architecture)는 이 문제를 위한 *오픈소스 board farm 관리자*입니다. 세 가지 개념이 본체입니다. *device*는 등록된 실 보드, *job*은 한 device의 flash→boot→test 시퀀스, *dispatcher*는 device 옆에서 USB·UART·PDU를 잡는 worker입니다.

```yaml
# imx8mp-boot.yaml — deploy → boot → test의 3단
device_type: imx8mp-evk
job_name: u-boot-boot-test
timeouts: { job: { minutes: 15 }, action: { minutes: 5 } }

actions:
  - deploy:
      to: usb
      images: { boot: { url: "https://artifacts.example.com/imx8mp/${SHA}/flash.bin" } }
      os: u-boot
  - boot:
      method: u-boot
      prompts: ["=> "]
      timeout: { minutes: 3 }
  - test:
      name: uboot-smoke
      definitions:
        - { repository: "https://git.example.com/qa/uboot-tests",
            from: git, path: smoke.yaml, name: smoke }
```

dispatcher는 *USB-to-UART*로 콘솔을 잡고 *PDU(Power Distribution Unit)*로 전원을 껐다 켭니다. flash는 보드별 SDP/uuu/J-Link를 통합한 *deploy method*가 처리합니다. LAVA의 실 가치는 *trace 보관*입니다. 모든 job의 boot log·command output·timing이 *영구 저장*되어 6개월 뒤 *어느 commit에서 어떤 boot 메시지가 바뀌었는지*를 git bisect와 함께 추적할 수 있습니다.

## Buildbot·self-hosted runner

LAVA가 부담스러우면 *self-hosted runner + USB flash*로 더 가볍게 갈 수 있습니다. GitHub Actions self-hosted runner를 *보드 옆 PC*에 설치하고, runner가 USB 케이블로 flash·reset·console 캡처를 직접 수행합니다.

```yaml
# .github/workflows/board-test.yml — self-hosted runner가 USB flash → boot
jobs:
  flash-and-boot:
    runs-on: [self-hosted, board-imx8mp]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: uboot-imx8mp }
      - name: Flash via uuu (SDP mode)
        run: |
          ./scripts/pdu.sh on port=2 && sleep 1
          uuu -b emmc flash.bin
      - name: Capture console boot log
        run: |
          ./scripts/pdu.sh cycle port=2
          timeout 30s tio /dev/ttyUSB0 > console.log &
          sleep 30 && grep -q '^=> ' console.log
      - uses: actions/upload-artifact@v4
        with: { name: console-imx8mp, path: console.log }
```

`[self-hosted, board-imx8mp]` label로 *해당 보드가 연결된 runner*에만 job을 라우팅합니다. PDU script가 *USB controllable power strip*을 제어합니다. 보드 단일 dependency는 단점이지만 학습 곡선이 낮고 초기 비용이 작아 1~2 보드 단계에서 충분합니다. 옵션을 비교하면 다음과 같습니다.

| 옵션 | 보드 수 | 학습 비용 | 적합 |
|---|---|---|---|
| **LAVA** | 수십 ~ 수백 | 높음 | 양산 라인, 검증 팀 |
| **self-hosted runner** | 1 ~ 10 | 낮음 | 소규모 팀, 초기 |
| **Buildbot worker** | 5 ~ 50 | 중간 | 자유도 높은 lab |
| **수동 boot test** | 1 ~ 3 | 0 | prototyping 단계 |

## regression 검출

빌드가 통과하고 boot가 떠도 *조용한 회귀*가 있습니다. image size가 *서서히 자라* SPL SRAM 한계에 가까워지거나, boot time이 *50 ms씩 누적*되는 일입니다. CI에 *수치 metric*을 박아두고 PR마다 baseline과 비교합니다.

```bash
$ size u-boot u-boot-spl/u-boot-spl
   text    data     bss     dec     hex filename
 712384   24832   91240  828456   ca4e8 u-boot
  78912    1024   12288   92224   168c0 u-boot-spl/u-boot-spl
```

이 값을 JSON으로 떨궈 *commit별 추세*를 추적하고, CI 마지막 단계에서 baseline과 비교해 임계 초과면 *PR을 fail*시킵니다.

```bash
# scripts/regression-check.sh
PR_SIZE=$(jq .text metric-pr.json)
BASE_SIZE=$(jq .text metric-base.json)
GROWTH=$(( PR_SIZE - BASE_SIZE ))
PCT=$(( GROWTH * 100 / BASE_SIZE ))

if [ "$PCT" -gt 2 ]; then
    echo "REGRESSION: u-boot.bin text grew ${PCT}% (${GROWTH} bytes)"
    exit 1
fi
```

추적할 metric의 예입니다.

| metric | 측정 방식 | 임계 |
|---|---|---|
| **u-boot.bin text size** | `size u-boot` | +2% / PR |
| **u-boot-spl size** | `size u-boot-spl` | SRAM 한도 - 5% |
| **boot time** | 첫 printk timestamp 대비 `=>` 시각 | +100 ms / PR |
| **DDR training time** | SPL 시작 ~ DDR pass anchor | +50 ms / PR |
| **secure verify time** | BL2가 BL31 검증한 시간 | +20 ms / PR |
| **memory test pass rate** | `mtest` 명령 결과 | 100% 미만 즉시 fail |

[Ch 25: 부트 시간 측정](/blog/embedded/bootloader/chapter25-boot-time)에서 본 timestamp 기반 측정을 *CI metric pipeline에 통합*하면 회귀 추세가 자동으로 잡힙니다.

## bisect 자동화

회귀가 잡히면 *언제 들어왔는지*가 다음 질문입니다. `git bisect`는 binary search로 *첫 failing commit*을 찾는 표준 도구입니다. CI artifact가 *commit별로 보관*되어 있으면 bisect를 *자동화*할 수 있습니다.

```bash
#!/usr/bin/env bash
# test.sh — bisect가 호출할 stub
set -euo pipefail

cd u-boot
make qemu_arm64_defconfig >/dev/null
make -j$(nproc) >/dev/null 2>&1 || exit 125  # build fail = skip

../scripts/qemu-boot-test.sh u-boot.bin || exit 1  # boot fail = bad
exit 0  # boot ok = good
```

`exit 125`는 *bisect skip* 신호입니다. 빌드 자체가 깨진 commit은 *good/bad 판정 불가*로 처리해 건너뜁니다.

```bash
$ git bisect start && git bisect bad HEAD && git bisect good v2024.04
$ git bisect run ./test.sh
Bisecting: 187 revisions left to test after this (roughly 8 steps)
... (8회 빌드·boot test 자동 반복)
e7a9c1f0d is the first bad commit
    arm: Refactor MMU table generation
```

8 단계면 *256 commit 범위*를 한 시간 안에 좁힙니다. self-hosted runner pool이 충분하면 *밤사이 자동 bisect*가 흔한 운영 패턴입니다. CI artifact를 보관할 때 *모든 commit의 ELF*를 두면 bisect를 *재빌드 없이* 돌릴 수도 있지만 retention 정책과 짝지어야 합니다.

## artifact 아카이브

부트로더 artifact는 *6개월 ~ 1년 보관*이 표준입니다. 양산 image가 필드에 깔린 뒤 그 commit의 ELF·map·DTB가 있어야 core dump 해석과 crash address 역추적이 가능합니다.

| 산출물 | 크기 (typical) | 용도 |
|---|---|---|
| `u-boot.bin` | 700 KB | flash 가능한 image |
| `u-boot` (ELF, with debug) | 30 ~ 80 MB | gdb·addr2line |
| `u-boot.map` / `System.map` | 1 MB / 500 KB | symbol 위치 / kallsyms 매칭 |
| `u-boot.dtb` | 30 KB | runtime device tree |
| `flash.bin` (TF-A + U-Boot) | 1.2 MB | 양산용 flash image |
| boot log | 50 KB | 회귀 비교 (6개월 보관) |

```bash
# scripts/archive.sh — image + 메타데이터를 함께 보관
TAG=$(git describe --always --tags)
DEST="s3://artifacts.example.com/bootloader/${BOARD}/${TAG}"

aws s3 cp u-boot/u-boot.bin "${DEST}/u-boot.bin"
aws s3 cp u-boot/u-boot     "${DEST}/u-boot.elf"
aws s3 cp u-boot/u-boot.map "${DEST}/u-boot.map"
aws s3 cp flash.bin         "${DEST}/flash.bin"

cat > meta.json <<EOF
{ "sha": "$(git rev-parse HEAD)", "tag": "${TAG}",
  "board": "${BOARD}", "built_at": "$(date -u +%FT%TZ)" }
EOF
aws s3 cp meta.json "${DEST}/meta.json"
```

`meta.json`이 함께 가는 것이 핵심입니다. 6개월 뒤 *어느 image인지 식별*하려면 SHA·tag·board·시각이 묶여 있어야 합니다.

## secure boot CI

서명된 image pipeline은 *키 관리가 본체*입니다. [Ch 27: 신뢰 체인](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 본 *production key*를 CI runner에 그대로 둘 수는 없습니다. 키 정책은 두 단계로 분리합니다.

| 키 종류 | 용도 | 저장소 | 접근 |
|---|---|---|---|
| **ephemeral CI key** | PR 검증·dev image | CI secret store (Vault·OIDC) | 모든 CI job |
| **production key** | release image | HSM (YubiHSM·Cloud KMS) | release pipeline 한정 |

CI는 *ephemeral key*로 *signing flow가 동작하는지*만 검증합니다. 양산 image는 *별도 release pipeline*이 *HSM 안에서 서명*합니다. private key가 CI runner를 *지나가지 않는* 것이 필수입니다.

```bash
# 서명·hash 검증 — ephemeral key 사용
KEY_ID="ephemeral-ci-${CI_COMMIT_SHORT_SHA}"
sha256sum u-boot/u-boot.bin > u-boot.bin.sha256

# Vault에서 ephemeral key로 서명 → 검증
vault write -field=signature transit/sign/${KEY_ID}/sha2-256 \
    input=$(base64 -w0 u-boot.bin.sha256) > u-boot.bin.sig

vault write -field=valid transit/verify/${KEY_ID}/sha2-256 \
    input=$(base64 -w0 u-boot.bin.sha256) \
    signature=$(cat u-boot.bin.sig)
# 출력: true 가 나와야 함
```

production pipeline은 *별도 branch protection*과 *별도 runner pool*을 둡니다. release tag(`v*`)에만 trigger되고 그 runner는 *HSM이 연결된 단일 호스트*입니다. CI 일반 runner는 production key를 *볼 수 없도록* network·secret level 양쪽에서 차단합니다.

## 흔한 함정

- **flash farm 단일 보드 dependency** — 보드가 죽으면 main 머지가 막힙니다. 같은 board_type을 최소 *2대 이상* 두어 fail-over가 되게 합니다.
- **expect script timing fragile** — `sleep 5; expect "=> "`처럼 sleep을 박으면 *느린 boot 한 번에 false fail*. 항상 *anchor 기반 대기*로 작성합니다.
- **secure boot key leak** — CI variable에 base64로 박아두면 *job log에 print*되는 사고가 종종 납니다. Vault·OIDC short-lived token이 표준입니다.
- **artifact 크기가 RUN을 죽임** — ELF + DTB + map을 매 PR마다 보관하면 *수 GB / day*. 보관은 *main 머지 + release tag*에만 두고, PR artifact는 *14일 retention*으로 줄입니다.
- **regression 임계가 너무 빡빡** — `+0.1%`로 잡으면 *vendor patch 한 번에 fail*. 보통 *+2%* 또는 *절대값 + 10 KB*가 운영 가능한 임계입니다.
- **boot test가 production rootfs까지** — CI에서 user space까지 부팅하려 들면 시간이 10분을 넘습니다. U-Boot prompt + `bootm` 시작 anchor까지가 *부트로더 CI의 책임 범위*입니다.
- **bisect script가 `exit 125`를 안 다룸** — 빌드 fail commit을 bad로 판정하면 *wrong commit*을 지목합니다. 빌드 실패는 반드시 *skip(125)*.

| CI 플랫폼 | matrix | self-hosted | secret store | 보드 farm 통합 |
|---|---|---|---|---|
| **GitLab CI** | parallel: matrix | docker/shell runner | Vault·File | LAVA에 webhook |
| **GitHub Actions** | strategy.matrix | label로 routing | OIDC + Vault | LAVA에 webhook |
| **Jenkins** | declarative pipeline | agent label | Credentials Plugin | LAVA plugin 존재 |
| **Buildbot** | builders × steps | worker per board | secret module | 내장 |
| **Drone** | matrix | docker runner | secret refs | webhook |

LAVA를 직접 통합하려면 *빌드 → S3 업로드 → LAVA submit-job → polling → 결과 회수*의 5단을 묶어야 합니다. Buildbot은 *LAVA worker가 builder로 직접 노출*되어 통합이 가장 짧습니다.

## 시리즈 마무리

30장을 통해 부트로더가 *POR 직후의 죽은 CPU*에서 *Linux user space*까지 다리를 놓는 전 과정을 따라왔습니다. BootROM의 결정, SPL의 SRAM 안 좁은 공간, DDR training의 까다로움, U-Boot Proper의 driver model, ARMv8-A의 BL31·BL33 분업, secure boot의 chain of trust, A/B fallback의 *부팅을 끊어내지 않는* 설계, 그리고 마지막으로 그 모든 코드가 *PR마다 검증되는* CI까지.

부트로더는 *눈에 띄지 않는 시스템*입니다. 잘 만들어진 부트로더는 *0.5초 만에 사라지고* 사용자가 의식하지 않습니다. 잘못 만들어진 부트로더는 *제품을 brick으로 바꾸어* 라인 전체를 멈춥니다. 그 무게의 비대칭이 이 시리즈를 쓴 이유였습니다.

다음 시리즈로 이어가고 싶은 방향이 셋 있습니다. 부트로더 다음에 *Linux kernel이 어떻게 시작*하는지를 따라가는 **Linux Kernel Internals**, 부트로더와 커널과 rootfs를 *한 product*로 묶어내는 **BSP Engineering**, 그리고 *대량 양산용 image 빌드 파이프라인*인 **Buildroot Practical**입니다.

| 추천 시리즈 | 다루는 범위 | 부트로더와의 연결 |
|---|---|---|
| [Linux Kernel Internals](/blog/systems/linux-kernel) | head.S → start_kernel → init | 커널 진입 ABI 이후의 흐름 |
| [BSP Engineering](/blog/embedded/bsp) | U-Boot 포팅·driver·DTS·image | 새 보드 전체 stack 통합 |
| [Buildroot Practical](/blog/embedded/buildroot) | rootfs 빌드·OTA·SDK | image pipeline 자동화 |

각 시리즈가 부트로더와 *한 면씩 맞붙어* 있어 자연스러운 확장이 됩니다.

## 정리

- 부트로더 CI는 *컴파일 성공이 아니라 boot 성공*이 종료 조건입니다. PR마다 QEMU 또는 실 보드에서 *부팅 로그까지* 검증합니다.
- build matrix는 U-Boot·TF-A·OP-TEE를 *DAG로 묶어* 병렬화합니다. 차원은 보드 × variant × secure가 표준입니다.
- QEMU boot test는 `=>` prompt anchor를 잡는 expect script로 가볍게 시작합니다. `version`·`bdinfo` 같은 *읽기 전용 명령*만 검증에 씁니다.
- 실 보드 farm은 LAVA(대규모)와 self-hosted runner(소규모) 두 갈래입니다. PDU로 전원 cycle, USB-to-UART로 콘솔 캡처가 공통 패턴입니다.
- regression metric은 image size·boot time·DDR training time이 표준이고 임계는 *+2% 또는 +10 KB* 정도가 운영 가능합니다. `git bisect run`에서 빌드 실패는 반드시 *exit 125*로 skip 처리합니다.
- artifact는 `u-boot.bin`·ELF·map·DTB·flash.bin + `meta.json`을 1년 보관. SHA·tag·board가 묶여 있어야 *6개월 뒤 추적*이 됩니다.
- secure boot 키는 *ephemeral CI key*와 *production HSM key*를 분리합니다. CI runner는 production key를 *볼 수 없어야* 합니다.
- 흔한 함정은 *flash farm 단일 보드*, *expect timing fragile*, *키 leak*, *artifact 폭증*, *bisect skip 누락* 다섯입니다.
- 부트로더 CI의 본체는 *cache 공유*보다 *boot 검증과 키 정책*입니다. application CI와 가장 크게 다른 지점입니다.

## 관련 항목

- [Ch 21: 새 보드 포팅 — defconfig부터 첫 부팅까지](/blog/embedded/bootloader/chapter21-board-porting) — matrix에 새 보드를 추가하는 출발점
- [Ch 22: 디버깅 워크플로 — JTAG·printk·boot log](/blog/embedded/bootloader/chapter22-debugging) — boot test에서 로그 anchor를 잡는 근거
- [Ch 25: 부트 시간 측정](/blog/embedded/bootloader/chapter25-boot-time) — regression metric의 timestamp source
- [Ch 27: 신뢰 체인 — secure boot key 관리](/blog/embedded/bootloader/chapter27-chain-of-trust) — secure boot CI의 key 정책 전제
- [Buildroot Ch 19: CI/CD — container build와 cache 공유](/blog/embedded/buildroot/chapter19-cicd) — rootfs CI와의 비교
- [원문 — LAVA 공식 문서](https://docs.lavasoftware.org/lava/) — board farm 자동화
- [원문 — U-Boot test/py 프레임워크](https://docs.u-boot.org/en/latest/develop/py_testing.html) — U-Boot 공식 boot test 인프라
