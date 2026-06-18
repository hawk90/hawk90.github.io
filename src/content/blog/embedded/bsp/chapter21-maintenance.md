---
title: "BSP 유지보수 — 업스트림 기여·커널 버전업·LTS 전략"
date: 2026-05-18T09:21:00
description: "BSP의 장기 유지 — 업스트림 기여로 부담 줄이기, LTS 버전 선택, 커널 버전업 전략."
series: "BSP Development"
seriesOrder: 21
tags: [embedded, bsp, upstream, lts, maintenance]
draft: false
---

## 한 줄 요약

**유지보수 비용을 가장 크게 줄이는 단일 행동은 *업스트림 기여*입니다.** out-of-tree 패치 1만 줄을 유지하는 팀과 모두 mainline에 보낸 팀의 5년 후 위치가 다릅니다.

BSP는 빌드되어 양산되면 끝나는 것이 아닙니다. 5년, 10년 동안 보안 패치를 받고, kernel을 한두 차례 upgrade 하고, 새 라인업의 SoC variant를 추가하면서 살아갑니다. 이 기간 동안 *out-of-tree 패치의 양*이 곧 *유지보수 비용*입니다.

이번 글은 BSP의 21장을 마무리합니다. LTS 선택, 업스트림 기여 워크플로, 커널 버전업의 전략, 그리고 BSP 엔지니어가 다음에 무엇을 배우면 좋을지 시리즈 finale을 다룹니다.

## Linux LTS 일정

Linus가 release 하는 mainline은 *대략 9~10주마다* 새 버전이 나옵니다. 그중 일부가 LTS(Long Term Support)로 지정되어 Greg KH가 5~6년간 보안 백포트를 합니다.

| 버전 | EOL (예상) | 비고 |
|------|-----------|------|
| 5.4 | 2025-12 | 곧 EOL |
| 5.10 | 2026-12 | Android 11/12 베이스 |
| 5.15 | 2026-10 | Ubuntu 22.04 base |
| 6.1 | 2027-12 | 현재 다수 BSP 선택 |
| 6.6 | 2026-12 (연장될 가능성) | 현재 추천 |
| 6.12 | 2026-12 (연장될 가능성) | 최신 LTS |

선택 기준은 다음입니다.

- **양산 시점에 EOL이 2~3년 이상 남았을 것** — 양산 라이프 동안 보안 패치 받을 수 있게
- **SoC vendor의 BSP가 해당 LTS를 지원** — vendor가 패치를 backport 해주면 부담 감소
- **AOSP/AGL/Yocto LTS 일정과 일치** — 다른 layer와 align

2026년 5월 기준 새 product는 6.6 또는 6.12를 선택하는 것이 권장됩니다.

## Out-of-tree 패치 cost

BSP가 들고 있는 *vendor 패치 묶음*이 유지보수 비용의 핵심입니다.

```text
# 가상의 BSP 패치 카운트
patches/
├── linux/
│   ├── arm64-dts/        (45 patches, 1200 lines)
│   ├── drivers-net/      (12 patches, 800 lines)
│   ├── drivers-iio/      (8 patches, 600 lines)
│   └── soc-vendor-x/     (200+ patches, 50K lines)
├── uboot/
│   └── board-mybsp/      (15 patches, 2000 lines)
└── opttee/
    └── platform/         (10 patches, 1500 lines)
```

여기서 *out-of-tree 50K 줄*은 다음 LTS upgrade마다 *전부 rebase* 해야 합니다. 5.10 → 5.15 rebase에서 *수십 개의 conflict*가 생기고, 5.15 → 6.1 rebase에서 또 수십 개. 패치마다 fix가 두 줄이라도 rebase에 한 시간씩 들면 누적이 큽니다.

업스트림에 들어간 패치는 *rebase 비용이 0*입니다. 다음 LTS에 자동으로 따라옵니다. SoC vendor x가 자기 patch를 mainline에 보내 *vendor tree가 거의 비어*가는 케이스가 가장 성공한 패턴입니다(예: i.MX, Allwinner의 일부 SoC).

## 업스트림 기여 워크플로

mainline에 패치를 보내는 절차는 다음과 같습니다.

1. **mainline 또는 -next 트리에 base.** v6.6 LTS가 아니라 `torvalds/master` 또는 `linux-next`.
2. **단일 commit으로 압축.** rebase로 logical change 한 개당 한 commit.
3. **commit message 작성.** Signed-off-by, subsystem prefix, problem/solution.
4. **`scripts/checkpatch.pl` 통과.** style을 깐깐히 본다.
5. **`scripts/get_maintainer.pl`로 수신자 찾기.** subsystem maintainer + mailing list.
6. **`git format-patch` + `git send-email`.**
7. **review 응답 → rev 2, rev 3 ...**
8. **maintainer가 자기 tree에 pick.** 다음 merge window에 mainline 진입.

```bash
# 패치 만들기
$ git format-patch -1 HEAD --subject-prefix="PATCH"

# checkpatch
$ ./scripts/checkpatch.pl --strict 0001-arm64-dts-mybsp.patch

# 수신자 찾기
$ ./scripts/get_maintainer.pl 0001-arm64-dts-mybsp.patch
Rob Herring <robh@kernel.org> (maintainer:OPEN FIRMWARE DEVICETREE BINDINGS)
Krzysztof Kozlowski <krzk+dt@kernel.org> (reviewer:OPEN FIRMWARE DEVICETREE BINDINGS)
devicetree@vger.kernel.org (open list:OPEN FIRMWARE DEVICETREE BINDINGS)
linux-arm-kernel@lists.infradead.org (moderated list:ARM ARCHITECTURE)
linux-kernel@vger.kernel.org (open list)

# 보내기
$ git send-email --to robh@kernel.org \
    --cc krzk+dt@kernel.org \
    --cc devicetree@vger.kernel.org \
    --cc linux-arm-kernel@lists.infradead.org \
    0001-arm64-dts-mybsp.patch
```

commit message 좋은 예입니다.

```text
arm64: dts: mybsp: add support for MyBoard rev A

MyBoard is an industrial control board based on i.MX8M Plus
with the following peripherals:
- 2x Gigabit Ethernet (one with TSN)
- 4x CAN-FD
- LPDDR4 2GB
- eMMC 16GB
- M.2 Key E for Wi-Fi/BT modules

Tested with kernel 6.7-rc1 + bootlin BSP.

Signed-off-by: Your Name <you@example.com>
---
 .../boot/dts/freescale/imx8mp-mybsp.dts       | 245 ++++++++++
 1 file changed, 245 insertions(+)
 create mode 100644 arch/arm64/boot/dts/freescale/imx8mp-mybsp.dts
```

## Subsystem별 maintainer 채널

대표적인 maintainer와 ML입니다.

| 영역 | Maintainer | Mailing list |
|------|-----------|--------------|
| -stable, LTS | Greg KH | stable@vger.kernel.org |
| ARM SoC | Arnd Bergmann, Olof Johansson | soc@kernel.org |
| Device Tree | Rob Herring, Krzysztof | devicetree@vger.kernel.org |
| ARM64 | Catalin Marinas, Will Deacon | linux-arm-kernel |
| net | Jakub Kicinski, Paolo Abeni | netdev@vger.kernel.org |
| IIO | Jonathan Cameron | linux-iio@vger.kernel.org |
| MMC | Ulf Hansson | linux-mmc@vger.kernel.org |
| USB | Greg KH | linux-usb@vger.kernel.org |
| i.MX | Shawn Guo, Sascha Hauer | linux-imx@nxp.com |
| STM32 | Maxime Coquelin, Alexandre Torgue | linux-stm32@st-md-mailman.stormreply.com |
| Rockchip | Heiko Stuebner | linux-rockchip@lists.infradead.org |

각 subsystem의 *문화*가 다릅니다. devicetree는 binding 문서를 강력히 요구하고, net은 commit 메시지 양식이 엄격합니다. Documentation/process/submitting-patches.rst를 먼저 읽으면 됩니다.

## Review 응답하기

review feedback에는 다음 종류가 있습니다.

| 유형 | 대응 |
|------|------|
| Nit (style, comment) | 수용해서 다음 revision |
| Bug (실제 오류) | 수정 + 명시적 사과 |
| Design 변경 요청 | RFC 또는 design discussion 분리 |
| Reject (방향 자체 다름) | 다른 접근 시도 |

```bash
# v2 보내기
$ git format-patch -1 HEAD --subject-prefix="PATCH v2" \
    --in-reply-to="message-id-of-v1"
```

`--in-reply-to`로 v1 thread에 매답니다. cover letter에는 v1과의 차이를 명시.

**Changes since v1:**

- Drop redundant clock-names entry (Krzysztof)
- Move PHY mode to ethernet0 subnode (Rob)
- Fix DT binding compatible (David Heidelberg)

응답이 빠르면 patch가 다음 merge window에 들어갈 가능성이 높습니다. 느리면 maintainer가 잊거나 다른 patch가 같은 영역을 건드려 conflict가 생깁니다.

## LTS upgrade 전략

5.10 → 6.6 같은 메이저 upgrade는 회귀 위험이 큽니다. 다음 단계로 진행합니다.

1. **준비** — 현재 out-of-tree 패치 묶음을 *분류*. mainline 갈 후보, vendor 의존, 영구 carry.
2. **clean rebase** — 6.6 mainline에 패치들을 cherry-pick. 거의 모든 패치에서 conflict 발생.
3. **build + smoke test** — 부팅 + 기본 기능.
4. **regression test** — Ch 19의 stress, soak.
5. **performance test** — 부팅 시간, throughput.
6. **소수 baord에 deploy** — 내부 staging.
7. **field upgrade** — A/B 슬롯으로 OTA. 실패 시 자동 rollback.

5.10 → 6.6은 architecture 측 변화가 큽니다. memory controller driver, GPIO subsystem, IRQ subsystem 모두 약간씩 바뀌었습니다. vendor의 SoC layer가 6.6에 *대응되어 있어야* 합니다. 그렇지 않으면 LTS upgrade 자체가 막힙니다.

LTS skip 전략(5.10 → 6.12 한 번에)은 위험합니다. 6.1, 6.6을 거치며 단계적으로 가는 것이 안전합니다.

## Regression risk 관리

upgrade가 회귀를 가져온다면 *어떤 commit이 원인*인지 알아야 fix가 가능합니다.

git bisect:

```bash
$ git bisect start
$ git bisect bad v6.6
$ git bisect good v6.1
$ # bisect가 중간 commit을 checkout
$ make && flash && test
$ git bisect bad   # 또는 good
$ # 반복
$ # 결국 bad commit 식별
```

수동 bisect는 시간이 듭니다. CI에 *자동 bisect runner*를 두는 팀도 있습니다. test가 자동화되어 있으면 git bisect run으로 한 번에.

```bash
$ git bisect run ./scripts/auto-test.sh
```

bisect로 찾은 bad commit이 *upstream에 보고된 known issue*인 경우가 많습니다. lore.kernel.org에서 commit hash로 검색합니다.

## Vendor BSP 추적

대부분의 SoC는 vendor BSP tree가 있습니다.

- NXP — `linux-imx` (CodeAurora 또는 NXP github)
- ST — `STM32MPU_software` 
- TI — `ti-linux-kernel`
- Rockchip — `rockchip-linux/kernel`
- NVIDIA — `tegra-public-tegra-l4t`

vendor tree는 *mainline LTS + vendor 패치*로 구성됩니다. vendor가 자기 SoC의 stable layer를 유지합니다. BSP는 vendor tree를 기반으로 *board 특정* 패치만 추가합니다.

vendor가 mainline 기여를 잘 하면 vendor tree의 out-of-tree가 줄어들고, BSP의 부담도 줄어듭니다. 새 SoC를 고를 때 *mainline support 정도*를 한 항목으로 평가하는 것이 좋습니다.

## CVE 추적과 보안 백포트

field 보드의 보안 패치는 *Greg KH의 LTS*에서 자동으로 받습니다. 단 *out-of-tree 영역*은 직접 따라가야 합니다. WPA, OpenSSL, dropbear, BusyBox 등.

```bash
# Buildroot
$ make show-info | jq '.packages'
# 패키지별 버전 출력 → 매주 CVE DB와 매칭

# 또는 cve-check.sh 같은 도구
$ cve-check --buildroot output/
```

Yocto에는 `cve-check` 클래스가 있습니다.

```text
INHERIT += "cve-check"
```

빌드 시 `tmp/log/cve/*` 아래에 CVE 매칭 결과가 나옵니다.

CVE가 *exploitable*한지는 별도 판단입니다. 모든 CVE를 매번 backport 하면 양산 라인이 멈춥니다. *우선순위*는 다음과 같이 분류합니다.

| 우선순위 | 기준 | 대응 |
|---------|------|------|
| Critical | RCE, network 노출 | 즉시 hotfix release |
| High | local privilege escalation | 다음 patch release (월 단위) |
| Medium | DoS, info leak | 다음 minor release (분기) |
| Low | 이론적 위협 | 다음 LTS upgrade |

## 시리즈 finale — 21장 회고

BSP Development 시리즈가 21장에 걸쳐 다룬 내용을 한눈에 정리합니다.

### Part I — 기초 (Ch 1~5)

- BSP의 정의와 범위 (Ch 1)
- 보드와 SoC 이해 (Ch 2)
- toolchain 구축 (Ch 3)
- 첫 번째 부팅 (Ch 4)
- Device Tree 기본 (Ch 5)

### Part II — 부트로더와 커널 (Ch 6~10)

- U-Boot 포팅 (Ch 6)
- 커널 포팅 (Ch 7)
- 디바이스 드라이버 (Ch 8)
- power management (Ch 9)
- secure boot 기초 (Ch 10)

### Part III — 시스템 통합 (Ch 11~15)

- multimedia subsystem (Ch 11)
- 네트워크 stack (Ch 12)
- 그래픽 (DRM/KMS) (Ch 13)
- 디버깅 도구 (Ch 14)
- 부트 시간 최적화 (Ch 15)

### Part IV — 양산과 운영 (Ch 16~21)

- Buildroot/Yocto 통합 (Ch 16)
- 이미지 패키징 (Ch 17)
- OTA와 recovery (Ch 18)
- stability testing (Ch 19)
- 양산 환경 (Ch 20)
- 유지보수 (Ch 21)

## BSP 엔지니어의 다음 단계

BSP를 한 번 완성한 엔지니어는 다음 방향으로 깊이를 만들 수 있습니다.

| 방향 | 추천 시리즈 |
|------|------------|
| 빌드 시스템 깊이 | [Buildroot Practical](/blog/embedded/buildroot/) |
| RTOS 영역 | [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/), [FreeRTOS Mastering](/blog/embedded/rtos/) |
| recipe 묶음 | [Modern Embedded Recipes](/blog/embedded/modern-recipes/) |
| 보안 깊이 | [Embedded Security](/blog/embedded/embedded-security/) |
| 작은 MCU/SoC | [ESP32-C3 Mastering](/blog/embedded/esp32-c3/) |

BSP의 다음 자연스러운 방향은 *보안*입니다. secure boot, OP-TEE, attestation, supply chain 보안 같은 영역이 양산 BSP의 다음 챕터가 됩니다. 동시에 자동차/산업용 도메인에서는 *real-time*과 *functional safety*도 중요한 layer입니다.

## 자주 하는 실수 (시리즈 통합)

**Out-of-tree에 만족.** "당장 동작하니까"로 patch를 carry 하면 5년 후 비용이 곱절. mainline 가능성을 *매 patch마다* 검토.

**LTS upgrade 미루기.** 6.1을 EOL 직전까지 들고 가다 갑자기 6.12로 점프하면 회귀 폭탄. 1~2년마다 한 단계.

**CVE를 release note에만 적기.** 실제 fix가 안 들어간 채 "CVE-2024-XXXX 대응"이 release note에 있으면 *허위 광고*. 실제 commit 링크 첨부.

**Documentation 부재.** BSP 엔지니어가 회사를 떠나면 *어떻게 빌드하는지* 모르게 되는 케이스. 빌드 절차, key 위치, CI URL을 새 엔지니어가 한 페이지로 찾을 수 있게.

**Test 자동화 미수행.** 매 release를 손으로 검증하면 결국 검증을 생략. 매 commit smoke, 매 tag 24시간 soak.

## 정리

- 유지보수 비용은 out-of-tree 패치의 양에 비례합니다. 업스트림 기여가 가장 효과적인 비용 절감 수단입니다.
- LTS 선택은 양산 시점에 EOL까지 2~3년 이상 남도록 합니다. 2026년 신규 product는 6.6 또는 6.12.
- 업스트림 기여는 mainline base, checkpatch, get_maintainer, format-patch, send-email의 표준 워크플로를 따릅니다.
- LTS upgrade는 단계적으로 진행합니다. 5.10 → 6.1 → 6.6 식으로 한 단계씩 testing.
- git bisect는 회귀 commit을 식별하는 표준입니다. CI에 자동 bisect를 두는 것이 한 단계 더.
- CVE 추적은 LTS 커널은 자동, out-of-tree 패키지(WPA, OpenSSL 등)는 별도 도구로 수동. 우선순위에 따라 hotfix/patch/minor release.
- BSP 엔지니어의 다음 단계는 보안, RTOS, 그리고 recipe 묶음입니다.

## 시리즈 마무리

BSP Development 21장이 끝났습니다. 처음 보드를 잡았을 때 toolchain을 어떻게 시작했는지부터, 양산 후 LTS upgrade까지 한 BSP가 거치는 *모든 단계*를 다뤘습니다. 한 사람이 모든 영역에서 expert가 되기는 어렵습니다. 하지만 *어디서 시작해 어디로 가야 하는지*를 알면 새 BSP 프로젝트에 들어갈 때 막막함이 줄어듭니다.

읽어 주셔서 감사합니다. 다음 시리즈에서 만나뵙겠습니다.

## 추천 다음 시리즈

- [Buildroot Practical](/blog/embedded/buildroot/) — 빌드 시스템을 깊이 다룹니다. BSP의 Ch 16에서 가볍게 다룬 영역이 전체 시리즈로.
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — 커널 내부, scheduler, RCU, dyntick. BSP에서 다루지 못한 *커널 자체*의 깊이.
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 부팅, IPC, 네트워크, 멀티미디어 recipe 묶음.
- [Embedded Security](/blog/embedded/embedded-security/) — secure boot, OP-TEE, attestation, supply chain.
- [ESP32-C3 Mastering](/blog/embedded/esp32-c3/) — 작은 MCU/SoC의 풀스택. Linux BSP와 대비되는 베어메탈/RTOS 시선.

## 관련 항목

- [Ch 1: BSP란 무엇인가](/blog/embedded/bsp/chapter01-what-is-bsp) — 시리즈 출발점
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — 직전 단계
- [Linux Kernel Documentation — Submitting Patches](https://www.kernel.org/doc/html/latest/process/submitting-patches.html) — 원문
- [LTS schedule](https://www.kernel.org/category/releases.html) — kernel.org의 공식 schedule
