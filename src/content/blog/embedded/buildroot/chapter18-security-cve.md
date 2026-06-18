---
title: "Buildroot Security·CVE 추적 — pkg-stats와 Reproducible Builds"
date: 2026-05-19T09:18:00
description: "Buildroot의 CVE 추적·legal info 산출·SBOM·reproducible build로 보안과 컴플라이언스를 관리하는 패턴."
series: "Buildroot Practical"
seriesOrder: 18
tags: [embedded, buildroot, security, cve, sbom, reproducible-builds]
draft: false
---

## 한 줄 요약

> **"보안은 *출시 직전*에 시작하면 늦습니다."** — Buildroot는 CVE 추적·license 산출·reproducible build·hardening을 빌드 시스템 안에 내장합니다. 양산 직전이 아니라 *시리즈를 시작할 때*부터 켜 두어야 의미가 있습니다.

## 임베디드 보안의 4축

임베디드 시스템의 보안·컴플라이언스는 *런타임 방어* 하나로 끝나지 않습니다. Buildroot 관점에서 다음 네 축이 동시에 굴러가야 합니다.

| 축 | 무엇을 다루는가 | Buildroot 진입점 |
|---|---|---|
| **CVE 추적** | 빌드에 들어간 패키지의 알려진 취약점 추적 | `make pkg-stats` |
| **License compliance** | GPL·LGPL·BSD·proprietary 라이선스 의무 이행 | `make legal-info` |
| **Reproducible build** | 같은 commit에서 *bit-perfect*로 동일한 산출물 | `BR2_REPRODUCIBLE=y` |
| **Hardening** | RELRO·SSP·PIE 등 binary 수준의 방어 | `BR2_RELRO_*`, `BR2_SSP_*`, `BR2_PIC_PIE` |

네 축은 *독립적*입니다. CVE를 추적해도 hardening을 끄면 reverse engineering이 쉬워지고, hardening만 켜도 라이선스 의무를 안 챙기면 법무 사고가 납니다. 한 축씩 분리해 익혀 두는 게 양산 단계에서 *전부를 다시 학습*하는 비용보다 쌉니다.

이 장은 네 축의 *Buildroot 진입점*을 다룹니다. 깊은 보안 이론보다는 *지금 트리에서 어떤 명령을 치면 어떤 산출물이 나오는지*에 집중합니다.

## make pkg-stats — CVE 매칭

`make pkg-stats`는 Buildroot가 빌드한 패키지를 *NVD (National Vulnerability Database)*와 매칭해 알려진 CVE를 출력합니다.

```bash
$ make pkg-stats
$ ls output/
... legal-info/  pkg-stats.html  pkg-stats.json
```

HTML과 JSON 두 형식이 동시에 생성됩니다. CI에서는 JSON을 파싱하고, 사람이 볼 때는 HTML을 봅니다.

JSON 한 항목은 다음 형태입니다.

```json
{
  "openssl": {
    "version": "3.0.12",
    "license": "OpenSSL",
    "cves": [
      {
        "id": "CVE-2024-0727",
        "score": 5.5,
        "description": "Processing a maliciously formatted PKCS12 file ...",
        "fixed_in": "3.0.13"
      }
    ]
  }
}
```

매칭은 *CPE (Common Platform Enumeration)*를 통해 이루어집니다. 패키지가 `*.mk` 파일에서 `OPENSSL_CPE_ID_VENDOR = openssl`과 같이 CPE 메타데이터를 선언해야 NVD와 짝지어집니다. CPE 메타데이터가 없는 패키지는 *CVE가 있어도 못 잡습니다*. 이것이 첫 번째 정확도 한계입니다.

두 번째 한계는 *vendor patch가 적용된 경우*입니다. Buildroot가 openssl 3.0.12에 CVE-2024-0727 패치를 *수동으로 적용*하면 *런타임은 안전*하지만 `pkg-stats`는 *버전만 보고* 여전히 CVE를 보고합니다. 진짜 위험인지 판단하려면 `package/openssl/*.patch` 파일을 확인해 *이미 패치된 CVE 번호*인지 봐야 합니다.

세 번째 한계는 *false positive*입니다. CPE가 광범위해 다른 컴포넌트의 CVE가 매칭되거나, *적용 조건*(특정 빌드 옵션·플랫폼)이 맞지 않는 CVE까지 끌고 옵니다. 양산 트리에서는 *triage 결과를 yaml로 기록*해 두는 게 일반적입니다.

```yaml
# triaged-cves.yaml
CVE-2024-0727:
  package: openssl
  status: patched
  notes: "Backported in package/openssl/0001-fix-pkcs12.patch"
CVE-2023-12345:
  package: busybox
  status: not-applicable
  notes: "Affected applet not enabled in our config"
```

## make legal-info — license 산출

`make legal-info`는 *GPL 컴플라이언스*에 필요한 산출물을 한 번에 만듭니다.

```bash
$ make legal-info
$ ls output/legal-info/
host-manifest.csv     licenses/        sources/
manifest.csv          README           host-sources/
```

각 항목의 의미는 다음과 같습니다.

| 파일·디렉터리 | 내용 |
|---|---|
| `manifest.csv` | target 패키지 목록 + 버전 + license + source URL |
| `host-manifest.csv` | host 도구 패키지 목록 (배포 의무 없음) |
| `licenses/` | 각 패키지의 license 텍스트 (`COPYING`, `LICENSE` 등) |
| `sources/` | GPL/LGPL 패키지의 *원본 tarball* |
| `host-sources/` | host 도구의 원본 tarball |
| `README` | 산출물 사용 안내 |

`manifest.csv` 한 줄 예시.

```text
PACKAGE,VERSION,LICENSE,LICENSE FILES,SOURCE ARCHIVE,SOURCE SITE,DEPENDENCIES
busybox,1.36.1,GPL-2.0,LICENSE,busybox-1.36.1.tar.bz2,https://busybox.net/...,toolchain
```

GPL/LGPL 의무는 *완성된 binary와 함께 source를 제공*하는 것이 핵심입니다. `output/legal-info/sources/` 디렉터리를 그대로 tarball로 묶어 *release artifact의 일부*로 배포하면 의무가 충족됩니다.

`BR2_LEGAL_INFO_EXTRA` 옵션으로 *Buildroot 외부에서 가져온 자체 코드*의 license도 manifest에 추가할 수 있습니다. 사내 firmware·application binary가 있다면 함께 기록해 두는 게 안전합니다.

`legal-info`를 무시하고 상용 배포한 사례가 *과거에 GPL violation 분쟁*으로 이어진 적이 여러 번 있습니다. 시리즈를 시작할 때부터 `make legal-info`를 CI에 넣어 *manifest가 깨끗하게 빠지는지* 매번 확인하는 게 가장 싸게 막는 방법입니다.

## SBOM — CycloneDX·SPDX

SBOM (Software Bill of Materials)은 *manifest의 표준 포맷 버전*입니다. EU CRA, US Executive Order 14028 같은 규제가 SBOM 제출을 요구하면서 양산 단계에서 필수에 가깝게 됐습니다.

Buildroot 자체는 *CycloneDX·SPDX 직접 출력*을 내장하지 않습니다. 대신 *외부 도구를 `manifest.csv` 위에 얹는* 방식이 표준입니다.

```bash
# 1) Buildroot manifest를 준비
$ make legal-info

# 2) 외부 도구로 SBOM 변환 (예: cyclonedx-buildroot)
$ cyclonedx-buildroot \
    --manifest output/legal-info/manifest.csv \
    --output-format json \
    --output sbom-cyclonedx.json

# 3) 또는 syft로 rootfs를 직접 스캔
$ syft output/target -o spdx-json > sbom-spdx.json
```

두 접근의 차이는 다음 표와 같습니다.

| 접근 | 정보 출처 | 장점 | 단점 |
|---|---|---|---|
| **manifest 변환** | `legal-info/manifest.csv` | Buildroot가 *정확히 안다는* 메타데이터 | host 도구·런타임 의존성 누락 가능 |
| **rootfs 스캔 (syft)** | binary 분석 | 런타임 산출물 기준 | 패키지 메타데이터 부정확할 수 있음 |

실무에서는 *두 방식을 모두 돌려 cross-check*하는 게 일반적입니다. manifest 기준 SBOM이 진실이고, syft 결과는 *누락 검증*용입니다.

## Reproducible builds — bit-perfect 보장

같은 git commit·같은 defconfig에서 *완전히 동일한 binary*가 나와야 하는 요구는 두 가지 이유로 생깁니다. 하나는 *공급망 보안*(supply chain) — 빌드 환경이 오염됐는지 확인하려면 *두 환경에서 빌드한 결과를 비교*할 수 있어야 합니다. 다른 하나는 *디버깅* — "지난주 빌드와 뭐가 달라졌는가"를 정확히 답하려면 *환경 차이가 binary에 안 새어 들어와야* 합니다.

Buildroot의 진입점은 다음 옵션입니다.

```text
BR2_REPRODUCIBLE=y
```

이 옵션이 켜지면 *비결정적 요소*가 일괄적으로 제거됩니다.

| 요소 | 무엇을 하는가 |
|---|---|
| `SOURCE_DATE_EPOCH` | 모든 빌드 시 timestamp를 *고정 값*으로 통일 |
| sorted tarball | 산출 tarball의 파일 순서를 ASCII로 정렬 |
| no build path leak | 임시 경로(`/tmp/buildroot-XXX`)가 binary에 박히지 않음 |
| no `__DATE__` / `__TIME__` | C 매크로의 빌드 시각 흔적 제거 |
| `find -printf '%T@'` 제거 | 파일시스템 mtime 비결정성 제거 |

build path까지 완전히 중립화하고 싶다면 보조 옵션이 있습니다.

```text
BR2_REPRODUCIBLE=y
BR2_REPRODUCIBLE_PATH=y    # 빌드 경로를 binary에서 제거 (--remap-path-prefix 사용)
```

검증은 `diffoscope`로 합니다.

```bash
$ diffoscope output1/images/rootfs.tar output2/images/rootfs.tar
$ echo $?
0    # 0이면 완전 동일
```

`diffoscope`는 tarball·squashfs·ELF binary 내부까지 *재귀적으로* 비교합니다. ELF 안의 build-id, debuglink, `.comment` 섹션까지 잡기 때문에 *눈에 안 보이는 차이*도 드러납니다.

CI에서는 다음 패턴이 흔합니다.

```bash
$ make O=build1 my_defconfig && make O=build1
$ make O=build2 my_defconfig && make O=build2
$ diffoscope build1/images build2/images || exit 1
```

두 빌드가 *다른 호스트에서* 진행돼도 동일해야 진짜 reproducible입니다. 같은 컨테이너 안에서만 같은 결과는 *환경 우연성*에 기댄 reproducibility입니다.

## Hardening flags

Binary 수준의 방어 옵션들입니다. Buildroot가 *전역 기본값*을 정해 모든 패키지에 적용합니다.

```text
BR2_RELRO_FULL=y               # Full RELRO (lazy binding 무효화)
BR2_SSP_STRONG=y               # Stack smashing protector (strong)
BR2_PIC_PIE=y                  # Position Independent Executable
BR2_FORTIFY_SOURCE_2=y         # _FORTIFY_SOURCE=2
```

각 옵션의 효과는 다음 표와 같습니다.

| 옵션 | 효과 | 비용 |
|---|---|---|
| `BR2_RELRO_PARTIAL` | GOT 일부 read-only | 미미함 |
| `BR2_RELRO_FULL` | GOT 전체 read-only, 모든 심볼 즉시 해석 | 시작 시간 +5~15% |
| `BR2_SSP_REGULAR` | stack canary (큰 buffer만) | 미미함 |
| `BR2_SSP_STRONG` | stack canary (대부분 함수) | code size +1~3% |
| `BR2_SSP_ALL` | 모든 함수 | code size +3~5% |
| `BR2_PIC_PIE` | ASLR 적용 가능한 실행파일 | code size +2~5%, 약간 느림 |
| `BR2_FORTIFY_SOURCE_2` | libc 함수 buffer overflow 런타임 검증 | 미미함 |

`BR2_RELRO_FULL` + `BR2_SSP_STRONG` + `BR2_PIC_PIE`가 *현대 임베디드 리눅스의 표준 조합*입니다. 거의 모든 패키지가 이 조합에서 빌드됩니다.

다만 *일부 패키지가 이를 깬다*는 점은 알아둬야 합니다.

- **kernel module** — PIE를 적용하면 로드 실패. 모듈은 별도로 PIE 제외.
- **bootloader (U-Boot)** — 자체 link script가 우선. Buildroot의 hardening flag가 무시됨.
- **closed-source vendor binary** — 빌드 시 flag를 못 거니까 *런타임 호환성*만 의미. 자체적으로 stack canary가 없는 binary는 그대로.
- **JIT runtime (Node.js·LuaJIT)** — `W^X` 위반으로 PIE가 충돌. 별도 정책.

이런 예외는 `BR2_PACKAGE_<NAME>_DOES_NOT_USE_PIC=y` 같은 *패키지별 override*로 표시합니다. 전역 hardening은 켜되 *예외만 명시적으로* 푸는 게 원칙입니다.

## Root password·서비스 비활성

가장 흔한 *상용 배포 사고*가 *기본 root password 그대로 출하*입니다. Buildroot는 Kconfig에서 root password를 *빌드 시 고정*하거나 *비활성화*할 수 있습니다.

```text
BR2_TARGET_GENERIC_ROOT_PASSWD="$6$randomsalt$hashed..."
BR2_TARGET_GENERIC_HOSTNAME="device"
BR2_TARGET_GENERIC_GETTY_PORT="ttyS0"
```

`BR2_TARGET_GENERIC_ROOT_PASSWD`는 *crypt(3) 형식*의 해시를 받습니다. 평문 password를 그대로 넣지 않습니다. 해시는 다음과 같이 생성합니다.

```bash
$ openssl passwd -6 -salt $(openssl rand -hex 8) "supersecret"
$6$abcdef0123456789$xR9...
```

생산 환경에서는 *기기마다 다른 password*를 부여하는 게 원칙입니다. 빌드 시 동일 해시는 *공장 디버그용*으로만 쓰고, *production rootfs*에서는 password 자체를 비워 SSH key·인증서 기반 인증만 허용합니다.

```text
BR2_TARGET_GENERIC_ROOT_PASSWD=""      # 빈 password
BR2_PACKAGE_DROPBEAR_DISABLE_REVERSEDNS=y
BR2_PACKAGE_DROPBEAR=y                  # SSH 접속은 key로만
```

불필요한 서비스도 *기본에서 꺼야* 합니다. busybox의 inetd 안에 `telnet`·`ftp`가 활성화돼 있으면 production rootfs에서 활성화된 채로 나갑니다.

```text
# 끄기
# BR2_PACKAGE_BUSYBOX_SHOW_OTHERS는 그대로 두되
# busybox config fragment에서 명시적 비활성:
# CONFIG_TELNETD=n
# CONFIG_FTPD=n
# CONFIG_TFTP=n
```

production 출하 직전에 `nmap`으로 *오픈된 포트 목록*을 한 번 찍어 *예상한 것만* 열려 있는지 검증하는 게 안전 그물입니다.

## CVE 모니터링 워크플로

CVE는 *오늘 안전*해도 *내일 발견*됩니다. 양산 후의 *모니터링 워크플로*가 빌드 시점의 검증만큼 중요합니다.

다음 표가 주간 워크플로의 골격입니다.

| 단계 | 명령 | 산출물 |
|---|---|---|
| 1. 최신 NVD 데이터 갱신 | (`pkg-stats`가 자동 fetch) | NVD cache |
| 2. 현재 트리 스캔 | `make pkg-stats` | `pkg-stats.json` |
| 3. 이전 스냅샷과 diff | `diff prev.json current.json` | 새 CVE 목록 |
| 4. Triage | 사람이 판단 | `triaged-cves.yaml` 업데이트 |
| 5. 대응 | 패키지 버전 bump 또는 patch 백포팅 | git commit |
| 6. CI 재실행 | 빌드 + `pkg-stats` 재확인 | 해결 확인 |

스크립트화한 예시.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 주간 CVE 스캔
make pkg-stats
cp output/pkg-stats.json "cve-snapshots/$(date +%Y-%m-%d).json"

# 지난주와 비교
prev=$(ls -1 cve-snapshots/*.json | tail -2 | head -1)
curr=$(ls -1 cve-snapshots/*.json | tail -1)
jq -r '.[] | .cves[]?.id' "$prev" | sort -u > /tmp/prev-cves.txt
jq -r '.[] | .cves[]?.id' "$curr" | sort -u > /tmp/curr-cves.txt
comm -13 /tmp/prev-cves.txt /tmp/curr-cves.txt > new-cves.txt

if [ -s new-cves.txt ]; then
    echo "새 CVE 발견:"
    cat new-cves.txt
    exit 1
fi
```

CI에 주간 스케줄로 걸어 두면 *놓치는* 사고가 줄어듭니다. 새 CVE가 발견됐을 때 *얼마나 빨리 패치하는지*가 *조직의 보안 성숙도*를 결정합니다.

## 흔한 실수

지금까지 정리한 네 축에서 자주 발생하는 실수입니다.

**`BR2_GENERATE_LOCALE` 미설정으로 정보 누락**. locale 관련 패키지의 manifest가 *비어 보이거나 잘못된 license*로 표시되는 경우가 있습니다. glibc-localedata 경로의 메타데이터를 Buildroot가 못 찾기 때문입니다. 처음부터 `BR2_GENERATE_LOCALE`을 명시적으로 설정해 *경고를 끄는* 게 manifest를 깨끗하게 유지합니다.

**legal-info를 무시한 상용 배포**. 가장 큰 위험. GPL/LGPL 패키지의 source archive를 *고객에게 제공할 의무*를 안 챙기면 *소송 위험*까지 갑니다. 시리즈 초반부터 `make legal-info`를 CI에 넣고 *PR마다 manifest를 검토*하는 습관이 가장 싼 보험입니다.

**pkg-stats가 vendor patch 무시**. CVE가 *이미 패키지의 patch로 수정*됐는데도 *버전이 안 올라서* 여전히 보고되는 경우입니다. 트리에서 `grep -r CVE-2024 package/` 같은 검색으로 *이미 백포팅된 CVE 목록*을 따로 관리해 둬야 합니다. `triaged-cves.yaml`에 `status: patched`로 기록.

**reproducible build를 *한 환경에서만* 검증**. 같은 컨테이너 안에서 두 번 빌드해 같은 결과가 나오는 건 *진짜 reproducible이 아닙니다*. 다른 호스트·다른 user·다른 시간대에서 빌드해도 같아야 합니다. CI에 *서로 다른 두 러너*를 명시적으로 분리해 검증해야 의미가 있습니다.

**hardening flag를 *글로벌만* 켜고 예외 검증 안 함**. `BR2_PIC_PIE=y`를 켰는데 *어떤 패키지가 이를 깨는지* 모르면 빌드 실패를 디버깅하느라 시간이 갑니다. 패키지별 `_DOES_NOT_USE_PIC` 옵션을 표로 정리해 *어떤 예외가 있는지* 문서화해 두는 게 다음 사람의 학습 비용을 줄입니다.

**root password를 빌드 시 *평문*으로 넣음**. `BR2_TARGET_GENERIC_ROOT_PASSWD="admin"`처럼 평문을 넣으면 *config 파일이 그대로 새는 순간* password가 노출됩니다. crypt(3) 해시 형태로만 넣어야 합니다.

## 정리

- 임베디드 보안은 CVE 추적·license compliance·reproducible build·hardening 네 축이며, *시리즈 시작 시점*부터 켜 두는 게 양산 직전에 도입하는 것보다 훨씬 쌉니다.
- `make pkg-stats`는 NVD와 매칭해 CVE를 보고하지만 CPE 메타데이터 누락·vendor patch·false positive 세 가지 정확도 한계가 있습니다. *Triage 결과를 yaml로* 기록해 두는 습관이 필요합니다.
- `make legal-info`는 manifest.csv·license 텍스트·source archive를 한 번에 만들어 GPL/LGPL 의무 이행에 필요한 산출물을 제공합니다.
- SBOM은 manifest를 *CycloneDX·SPDX 표준 포맷*으로 변환한 결과입니다. `cyclonedx-buildroot`·`syft`를 manifest 위에 얹어 생성하며, 두 방식 cross-check가 표준입니다.
- `BR2_REPRODUCIBLE=y`는 timestamp·sorted tarball·build path 등 비결정성을 제거합니다. `diffoscope`로 검증하며 *서로 다른 두 호스트*에서 동일해야 진짜 reproducible입니다.
- Hardening은 `BR2_RELRO_FULL` + `BR2_SSP_STRONG` + `BR2_PIC_PIE`가 표준 조합. 일부 패키지(kernel module·bootloader·JIT)는 예외이므로 *패키지별 override*로 명시합니다.
- Root password는 *crypt 해시 형태로만* 빌드 시점에 박고, production은 SSH key 인증으로. 불필요한 서비스(telnet·ftp·tftp)는 명시적으로 비활성화해야 합니다.
- 양산 후에는 주간 `pkg-stats` 스캔으로 새 CVE를 모니터링하고, diff 결과를 triage·패치·버전 bump의 워크플로로 처리합니다.

## 다음 장 예고

다음 편은 **Ch 19: CI/CD**. 이 장의 `pkg-stats`·`legal-info`·`diffoscope` 검증을 *자동화 파이프라인*에 어떻게 얹는지 다룹니다.


## 관련 항목

- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — toolchain 버전이 CVE surface를 결정함
- [Ch 16: OTA 업데이트 — bundle signing과 rollback](/blog/embedded/buildroot/chapter16-ota) — reproducible build와 signing이 OTA 신뢰의 기반
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — SDK 배포 시 manifest 동봉
- [Ch 19: CI/CD — Buildroot를 파이프라인에 얹기](/blog/embedded/buildroot/chapter19-cicd) — pkg-stats·legal-info·diffoscope 자동화
- [원문 — Buildroot Manual §10.3: CVE management](https://buildroot.org/downloads/manual/manual.html)
- [원문 — Reproducible Builds 프로젝트](https://reproducible-builds.org/)
