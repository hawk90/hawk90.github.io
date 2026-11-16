---
title: "BSP 유지보수 — 업스트림 기여·커널 버전업·LTS 전략"
slug: "embedded/bsp/chapter21-maintenance"
date: 2026-05-18T09:21:00
description: "BSP의 장기 유지 — 업스트림 기여로 부담 줄이기, LTS 버전 선택, 커널 버전업 전략."
series: "BSP Development"
seriesOrder: 21
tags: [embedded, bsp, upstream, lts, maintenance]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**유지보수 비용은 직접 들고 다니는 out-of-tree 패치에서 나옵니다.** 그 패치를 업스트림에 보내면, 다음 커널부터는 커뮤니티가 함께 유지합니다.

BSP는 양산으로 끝나지 않습니다. 제품이 팔리는 동안 보안 패치를 받고, 커널을 올리고, SoC variant를 추가합니다. 이삿짐에 비유하면 out-of-tree 패치는 이사할 때마다 직접 싸고 풀어야 하는 짐입니다. 업스트림에 들어간 코드는 새 집에 이미 붙박이로 있습니다.

이번 글은 BSP의 21장을 마무리합니다. LTS 선택, 업스트림 기여 워크플로, 커널 버전업의 전략, 그리고 BSP 엔지니어가 다음에 무엇을 배우면 좋을지 시리즈 finale을 다룹니다.

## Linux LTS 일정

[kernel.org의 release 페이지](https://www.kernel.org/category/releases.html)가 longterm branch와 projected EOL을 공개합니다. 2026-11-16에 읽은 표입니다.

| 버전 | 릴리스 | Projected EOL |
|------|-------|---------------|
| 6.18 | 2025-11-30 | Dec, 2028 |
| 6.12 | 2024-11-17 | Dec, 2028 |
| 6.6 | 2023-10-29 | Dec, 2027 |
| 6.1 | 2022-12-11 | Dec, 2027 |
| 5.15 | 2021-10-31 | Dec, 2026 |
| 5.10 | 2020-12-13 | Dec, 2026 |

5.4는 이 표에서 빠졌습니다. 표의 maintainer는 모든 행이 Greg Kroah-Hartman과 Sasha Levin으로, MAINTAINERS 파일의 `STABLE BRANCH` 항목과 같습니다.

선택 기준은 다음입니다.

- **제품 지원 기간 동안 EOL이 남았을 것** — 그 기간 동안 stable 패치를 받을 수 있게
- **SoC vendor의 BSP가 해당 LTS를 지원** — vendor가 패치를 backport 해주면 부담 감소
- **빌드 시스템의 지원 일정과 맞을 것** — Yocto나 Buildroot release가 그 커널을 지원하는지

이 시리즈의 커널이 6.12인 이유도 여기 있습니다. Debian 13이 6.12.116을 싣고 있고(Ch 3), kernel.org의 6.12 EOL이 2028년 12월입니다.

## Out-of-tree 패치 cost

BSP가 들고 다니는 패치가 얼마나 되는지는 `git log`나 패치 디렉터리로 셉니다. 이 시리즈에서 본 예로는 Buildroot의 BeagleBone defconfig이 메인라인 대신 `beagleboard/linux`의 `6.1.46-ti-r13`을 받는 경우(Ch 1)와, i.MX 95 PCIe erratum이 v6.16에야 메인라인에 들어간 경우(Ch 2)가 있습니다. 앞의 경우는 vendor tree 전체가, 뒤의 경우는 v6.16 이전 커널을 쓰는 BSP라면 그 erratum 백포트가 직접 들고 다닐 짐이 됩니다. 커널을 올릴 때마다 이 짐을 새 커널 위에 다시 얹어야 합니다.

변경이 업스트림에 들어가면 그 이후 커널에서는 따로 들고 다닐 필요가 없습니다. 이미 출시한 제품의 이전 커널에는 여전히 백포트가 필요합니다.

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
git format-patch -1 HEAD --subject-prefix="PATCH"
./scripts/checkpatch.pl --strict 0001-arm64-dts-mybsp.patch
./scripts/get_maintainer.pl 0001-arm64-dts-mybsp.patch
```

`get_maintainer.pl`이 무엇을 돌려주는지는 i.MX 8M Plus EVK의 DTS 파일로 linux-6.12에서 실행해 봤습니다.

```text
$ ./scripts/get_maintainer.pl -f arch/arm64/boot/dts/freescale/imx8mp-evk.dts
Rob Herring <robh@kernel.org> (maintainer:OPEN FIRMWARE AND FLATTENED DEVICE TREE BINDINGS)
Krzysztof Kozlowski <krzk+dt@kernel.org> (maintainer:OPEN FIRMWARE AND FLATTENED DEVICE TREE BINDINGS)
Conor Dooley <conor+dt@kernel.org> (maintainer:OPEN FIRMWARE AND FLATTENED DEVICE TREE BINDINGS)
Shawn Guo <shawnguo@kernel.org> (maintainer:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
Sascha Hauer <s.hauer@pengutronix.de> (maintainer:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
Pengutronix Kernel Team <kernel@pengutronix.de> (reviewer:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
Fabio Estevam <festevam@gmail.com> (reviewer:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
devicetree@vger.kernel.org (open list:OPEN FIRMWARE AND FLATTENED DEVICE TREE BINDINGS)
imx@lists.linux.dev (open list:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
linux-arm-kernel@lists.infradead.org (moderated list:ARM/FREESCALE IMX / MXC ARM ARCHITECTURE)
linux-kernel@vger.kernel.org (open list)
```

DTS 하나에 DT binding maintainer와 i.MX 플랫폼 maintainer가 함께 나옵니다. 받는 사람은 이 출력에서 고릅니다.

```bash
git send-email --to shawnguo@kernel.org \
    --cc s.hauer@pengutronix.de \
    --cc imx@lists.linux.dev \
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

Tested on the board with the patch applied to the target tree.

Signed-off-by: Your Name <you@example.com>
---
 .../boot/dts/freescale/imx8mp-mybsp.dts       | 245 ++++++++++
 1 file changed, 245 insertions(+)
 create mode 100644 arch/arm64/boot/dts/freescale/imx8mp-mybsp.dts
```

## Subsystem별 maintainer 채널

linux-6.12의 `MAINTAINERS` 파일에서 이 시리즈와 관련된 항목의 `M:`(maintainer)과 `L:`(mailing list)입니다.

| MAINTAINERS 항목 | M: | L: |
|------|-----------|--------------|
| STABLE BRANCH | Greg Kroah-Hartman, Sasha Levin | stable@vger.kernel.org |
| OPEN FIRMWARE AND FLATTENED DEVICE TREE BINDINGS | Rob Herring, Krzysztof Kozlowski, Conor Dooley | devicetree@vger.kernel.org |
| ARM/FREESCALE IMX / MXC ARM ARCHITECTURE | Shawn Guo, Sascha Hauer | imx@lists.linux.dev, linux-arm-kernel@lists.infradead.org |
| IIO SUBSYSTEM AND DRIVERS | Jonathan Cameron | linux-iio@vger.kernel.org |
| MULTIMEDIA CARD (MMC), SECURE DIGITAL (SD) AND SDIO SUBSYSTEM | Ulf Hansson | linux-mmc@vger.kernel.org |
| ARM/STM32 ARCHITECTURE | Maxime Coquelin, Alexandre Torgue | linux-stm32@st-md-mailman.stormreply.com |
| ARM/Rockchip SoC support | Heiko Stuebner | linux-rockchip@lists.infradead.org |

담당자는 바뀌므로 표를 외우지 말고 보낼 때마다 `get_maintainer.pl`을 돌립니다. 보내기 전에 `Documentation/process/submitting-patches.rst`를 읽습니다.

## Review 응답하기

review feedback에는 다음 종류가 있습니다.

| 유형 | 대응 |
|------|------|
| Nit (style, comment) | 다음 revision에 반영 |
| Bug (실제 오류) | 수정하고 changelog에 적음 |
| Design 변경 요청 | 설계를 따로 논의 |
| Reject (방향 자체 다름) | 다른 접근 검토 |

```bash
# v2 보내기
$ git format-patch -1 HEAD --subject-prefix="PATCH v2" \
    --in-reply-to="message-id-of-v1"
```

`--in-reply-to`로 v1 thread에 매답니다. cover letter에는 v1과의 차이를 명시.

**Changes since v1:**

- Drop redundant clock-names entry (Krzysztof)
- Move PHY mode to ethernet0 subnode (Rob)
- Fix DT binding compatible (Conor)

응답 일정과 merge 결과는 maintainer 판단, patch quality, test evidence, release timing 및 subsystem process에 따릅니다. 재촉 횟수만으로 merge 시점을 예측하지 않습니다.

## LTS upgrade 전략

LTS 사이를 옮길 때의 순서 예입니다.

1. **준비** — 현재 out-of-tree 패치 묶음을 분류합니다. 업스트림에 보낼 것, vendor 의존, 계속 들고 갈 것.
2. **rebase** — 새 LTS 위에 패치를 다시 얹습니다.
3. **build + smoke test** — 부팅과 기본 기능(Ch 10의 단계별 첫 줄).
4. **regression test** — Ch 19의 stress 도구.
5. **performance test** — 부팅 시간(Ch 15), 처리량.
6. **내부 staging 보드에 배포**.
7. **field upgrade** — A/B 슬롯 OTA, 실패 시 rollback(Ch 18).

vendor의 SoC 지원이 새 LTS에 있어야 이 순서를 밟을 수 있습니다. Ch 8에서 본 것처럼 NXP의 vendor 트리는 `lf-6.6.y` 같은 LTS 브랜치로 나옵니다.

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

test가 자동화되어 있으면 `git bisect run`이 스크립트의 종료 코드로 good/bad를 정합니다.

```bash
$ git bisect run ./scripts/auto-test.sh
```

찾은 commit은 lore.kernel.org에서 commit 제목이나 hash로 검색해 이미 보고된 문제인지 봅니다.

## Vendor BSP 추적

이 시리즈에서 확인한 vendor tree는 둘입니다. NXP의 GitHub `nxp-imx/linux-imx`(`lf-6.6.y`)와 BeagleBoard 재단의 `beagleboard/linux`(`6.1.46-ti-r13`)입니다(Ch 1, Ch 8). vendor tree는 LTS 위에 vendor 패치를 얹은 것이고, BSP는 그 위에 보드 패치를 더합니다. 새 SoC를 고를 때는 요구 장치마다 메인라인 지원 여부를 표로 만들어 평가합니다(Ch 1).

## CVE 추적과 보안 백포트

커널의 보안 수정은 stable/LTS 릴리스로 나오지만, 제품 이미지에 들어가는 것은 BSP가 그 릴리스를 받아 다시 빌드했을 때뿐입니다. 커널 밖의 패키지(OpenSSL, BusyBox 등)는 빌드 시스템의 도구로 따라갑니다.

- **Buildroot**: 2024.02 매뉴얼 `common-usage.adoc:165-182`. `make show-info`는 패키지와 버전·license를 JSON으로 내고(Ch 16에서 실행), `make pkg-stats`는 "whether known CVEs (security vulnerabilities) affect the packages in your current configuration"을 HTML·JSON으로 보여 줍니다.
- **Yocto**: 5.0.17 Development Tasks Manual의 vulnerabilities 절은 `INHERIT += "cve-check"`로 이미지의 CVE를 검사하라고 적습니다.

이 글은 두 검사를 실행하지 않았습니다. 찾은 CVE를 언제 반영할지는 제품의 정책입니다. 아래는 그런 정책의 예입니다.

| 우선순위 | 기준 | 대응 |
|---------|------|------|
| Critical | RCE, network 노출 | 즉시 hotfix release |
| High | local privilege escalation | 다음 patch release (월 단위) |
| Medium | DoS, info leak | 다음 minor release (분기) |
| Low | 이론적 위협 | 다음 LTS upgrade |

## 시리즈 회고 — 실제 목차

이 시리즈의 21편은 보드 bring-up부터 유지보수까지 다음 순서로 구성했습니다.

1. BSP 정의와 범위
2. SoC 데이터시트 읽기
3. Device Tree 설계
4. Pin mux와 clock
5. DDR 매개변수
6. U-Boot 포팅
7. TF-A와 TrustZone 통합
8. Linux kernel config
9. SMP bring-up
10. 첫 부팅 추적
11. 부트로그 디버깅
12. Peripheral driver 통합
13. Power management
14. Thermal과 watchdog
15. 부트 시간 최적화
16. Buildroot·Yocto와 rootfs 통합
17. 이미지 패키징
18. OTA와 field recovery
19. Stability testing
20. 양산 환경과 재현 가능한 build
21. 유지보수와 LTS 전략

## BSP 엔지니어의 다음 단계

BSP를 한 번 완성하고 나면 깊이를 만들 방향이 갈립니다. 가장 자연스러운 쪽은 *보안*입니다. secure boot, OP-TEE, attestation, supply chain 보안은 양산 BSP가 끝나는 자리에서 곧바로 이어지는 주제입니다. 자동차나 산업용 도메인이라면 *real-time*과 *functional safety*가 그다음 layer가 됩니다.

구체적으로 어느 시리즈로 이어지는지는 이 글 끝의 [추천 다음 시리즈](#추천-다음-시리즈)에 정리했습니다.

## 자주 하는 실수 (시리즈 통합)

**Out-of-tree에 만족.** 들고 다니는 패치마다 커널을 올릴 때 다시 얹는 일이 생깁니다. 패치마다 업스트림에 보낼 수 있는지 검토합니다.

**LTS EOL을 확인하지 않음.** 위 표에서 5.10과 5.15는 2026년 12월이 projected EOL입니다. 그 뒤에도 그 커널로 출시한다면 stable 패치는 직접 백포트해야 합니다.

**CVE를 release note에만 적기.** 실제 수정 commit이 이미지에 들어갔는지를 release note에 commit 링크로 남깁니다.

**Documentation 부재.** BSP 엔지니어가 회사를 떠나면 *어떻게 빌드하는지* 모르게 되는 케이스. 빌드 절차, key 위치, CI URL을 새 엔지니어가 한 페이지로 찾을 수 있게.

**Test 자동화 미수행.** 손으로 하는 검증은 바쁠 때 빠집니다. Ch 19처럼 commit마다 smoke, release 후보마다 긴 시험을 CI에 둡니다.

## 정리

- 유지보수 비용은 직접 들고 다니는 out-of-tree 패치에서 나옵니다. 업스트림에 들어간 변경은 이후 커널에서 따로 들고 다닐 필요가 없습니다.
- 2026-11-16 기준 kernel.org의 projected EOL은 6.12·6.18이 2028년 12월, 6.1·6.6이 2027년 12월, 5.10·5.15가 2026년 12월입니다.
- 업스트림 기여는 mainline base, checkpatch, get_maintainer, format-patch, send-email의 표준 워크플로를 따릅니다.
- `get_maintainer.pl`은 DTS 하나에도 DT binding과 플랫폼 maintainer를 함께 돌려줍니다. 담당자는 보낼 때마다 이 스크립트로 확인합니다.
- 회귀는 `git bisect run`으로 찾습니다.
- kernel.org longterm은 upstream stable fix를 제공하지만 제품 이미지가 자동으로 업데이트되지는 않습니다. 배포판·vendor tree·out-of-tree package를 포함해 CVE triage와 release 계획을 운영합니다.
- BSP 엔지니어의 다음 단계는 보안, RTOS, 그리고 recipe 묶음입니다.

## 시리즈 마무리

BSP Development 21장이 끝났습니다. 보드 자료를 읽는 데서 시작해 양산 뒤 LTS upgrade까지, 한 BSP가 거치는 단계를 실제 소스와 실행 로그로 따라왔습니다. 한 사람이 모든 영역에서 expert가 되기는 어렵습니다. 하지만 *어디서 시작해 어디로 가야 하는지*를 알면 새 BSP 프로젝트에 들어갈 때 막막함이 줄어듭니다.

읽어 주셔서 감사합니다. 다음 시리즈에서 만나뵙겠습니다.

## 추천 다음 시리즈

- [Buildroot Practical](/blog/embedded/buildroot/chapter01-problem) — 빌드 시스템을 깊이 다룹니다. BSP의 Ch 16에서 가볍게 다룬 영역이 전체 시리즈로.
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — 커널 내부, scheduler, RCU, dyntick. BSP에서 다루지 못한 *커널 자체*의 깊이.
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 부팅, IPC, 네트워크, 멀티미디어 recipe 묶음.
- [Embedded Security](/blog/embedded/embedded-security/chapter01-threat-model) — secure boot, OP-TEE, attestation, supply chain.
- ESP32-C3 Mastering — 작은 MCU/SoC의 풀스택. Linux BSP와 대비되는 베어메탈/RTOS 시선.

## 관련 항목

- [Ch 1: BSP란 무엇인가](/blog/embedded/bsp/chapter01-what-is-bsp) — 시리즈 출발점
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — 직전 단계
- [Linux Kernel Documentation — Submitting Patches](https://www.kernel.org/doc/html/latest/process/submitting-patches.html) — 원문
- [LTS schedule](https://www.kernel.org/category/releases.html) — kernel.org의 공식 schedule
