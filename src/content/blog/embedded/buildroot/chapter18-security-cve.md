---
title: "Buildroot Security·CVE 추적 — pkg-stats와 Reproducible Builds"
slug: "embedded/buildroot/chapter18-security-cve"
date: 2026-05-19T09:18:00
description: "Buildroot 2024.02의 pkg-stats JSON·CVE triage·legal-info 범위와 재현성·hardening·인증 설정을 확인합니다."
series: "Buildroot Practical"
seriesOrder: 18
tags: [embedded, buildroot, security, cve, sbom, reproducible-builds]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"보안은 *출시 직전*에 시작하면 늦습니다."** — Buildroot는 CVE 추적·license 산출·reproducible build·hardening을 빌드 시스템 안에 내장합니다. 양산 직전이 아니라 *시리즈를 시작할 때*부터 켜 두어야 의미가 있습니다.

이 장은 **Buildroot 2024.02, commit `87e979e4572449ecb7d2058b02d642b38cc3b0f8`**의 소스·매뉴얼을 기준으로 합니다. 현재 양산용 릴리스 권고가 아니라 옵션과 출력 계약의 재현 기준입니다. 실제 제품에는 사용하는 지원 브랜치와 패치 수준을 별도로 기록합니다.

## 임베디드 보안의 4축

임베디드 시스템의 보안·컴플라이언스는 *런타임 방어* 하나로 끝나지 않습니다. Buildroot 관점에서 다음 네 축이 동시에 굴러가야 합니다.

| 축 | 무엇을 다루는가 | Buildroot 진입점 |
|---|---|---|
| **CVE 추적** | 빌드에 들어간 패키지의 알려진 취약점 추적 | `make pkg-stats` |
| **License compliance** | GPL·LGPL·BSD·proprietary 라이선스 의무 이행 | `make legal-info` |
| **Reproducible build** | 동일성 조건을 고정하고 산출물을 비교 | `BR2_REPRODUCIBLE=y` |
| **Hardening** | RELRO·SSP·PIE 등 binary 수준의 방어 | `BR2_RELRO_*`, `BR2_SSP_*`, `BR2_PIC_PIE` |

네 축은 *독립적*입니다. CVE 보고서가 깨끗해도 미발견 취약점과 설정 오류는 남습니다. Hardening은 취약점 악용을 어렵게 하는 방어이며 license 산출물 검토를 대신하지 않습니다. 한 축씩 분리해 익혀 두는 게 양산 단계에서 *전부를 다시 학습*하는 비용보다 쌉니다.

이 장은 네 축의 *Buildroot 진입점*을 다룹니다. 깊은 보안 이론보다는 *지금 트리에서 어떤 명령을 치면 어떤 산출물이 나오는지*에 집중합니다.

## make pkg-stats — CVE 매칭

`make pkg-stats`는 현재 설정의 패키지 메타데이터와 NVD 데이터를 대조해 보고서를 만듭니다. 빌드 완료나 취약점 악용 가능성을 증명하는 명령은 아닙니다. 호스트 의존성과 데이터 갱신 오류도 CI 실패로 처리해야 합니다.

```text
$ make pkg-stats
```

기준 버전의 Makefile은 `$(O)/pkg-stats.json`, `$(O)/pkg-stats.html`과 `$(DL_DIR)/buildroot-nvd`를 사용합니다. `support/scripts/pkg-stats`의 `dump_json()`에서 최상위 `packages` 아래에 패키지별 정보를 넣습니다. `current_version`, `cves`, `unsure_cves`, `ignored_cves`가 관련 필드이며 CVE 목록 원소는 ID 문자열입니다. `fixed_in`·점수·설명이 담긴 객체 배열이 아닙니다.

CPE가 있으면 제품 식별에 사용하고, 없으면 패키지 이름으로 후보를 찾습니다. 따라서 CPE 미선언을 곧바로 검사 누락이라고 단정할 수 없지만 이름·버전·제품 범위가 잘못되면 오탐과 누락이 생깁니다. `cves`와 함께 `unsure_cves`도 검토합니다. 이 동작은 [기준 버전 pkg-stats](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/support/scripts/pkg-stats)의 `check_package_cves()`와 `check_package_cve_affects()`에서 확인할 수 있습니다.

백포트·비해당 판단에는 `<PKG>_IGNORE_CVES`가 있습니다. [패키지 변수 매뉴얼](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/docs/manual/adding-packages-generic.adoc)은 패치 또는 비해당 이유를 앞선 주석에 기록하도록 요구합니다. 단순히 경고를 없애기 위해 등록하지 않고 패치 내용·빌드 옵션·도달 가능성·검토자를 함께 추적합니다. ID를 ignore에 넣었다는 사실 자체가 수정 검증은 아닙니다.

조직의 triage 기록에는 패키지/버전, CVE ID, 근거 링크, 적용 patch commit, 검토자, 검토일과 재검토 조건을 둡니다. 이는 Buildroot가 자동으로 읽는 YAML schema가 아니라 별도의 운영 기록입니다.

## make legal-info — license 산출

`make legal-info`는 license 검토에 필요한 자료를 모읍니다. [공식 legal notice](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/docs/manual/legal-notice.adoc)는 누락 경고와 패키지 선언의 정확성까지 검토해야 한다고 설명합니다. 실행 성공만으로 배포 의무가 충족됐다고 결론내리지 않습니다.

```text
$ make legal-info
$ ls output/legal-info/
host-manifest.csv     licenses/        sources/
manifest.csv          README           host-sources/
buildroot.config      host-licenses/
```

각 항목의 의미는 다음과 같습니다.

| 파일·디렉터리 | 내용 |
|---|---|
| `manifest.csv` | target 패키지 목록 + 버전 + license + source URL |
| `host-manifest.csv` | host 도구 패키지의 선언 정보; 배포 여부·license별 검토 |
| `licenses/` | 각 패키지의 license 텍스트 (`COPYING`, `LICENSE` 등) |
| `sources/` | 재배포 가능으로 선언된 패키지 source와 적용 patch |
| `host-sources/` | host 도구의 원본 tarball |
| `README` | 산출물 사용 안내 |

`manifest.csv` 한 줄 예시.

```text
PACKAGE,VERSION,LICENSE,LICENSE FILES,SOURCE ARCHIVE,SOURCE SITE,DEPENDENCIES WITH LICENSES
```

기준 버전의 manifest header는 위 일곱 열입니다. 실제 값은 인용부호가 있는 CSV로 출력되므로 단순 쉼표 split 대신 CSV parser를 사용합니다. `sources/`에는 `_REDISTRIBUTE = NO`인 패키지가 저장되지 않고, 외부 toolchain 일부와 Buildroot 자체 등의 자료도 누락될 수 있습니다. README 경고와 실제 배포 구성·수정 내용을 확인해야 합니다.

`BR2_LEGAL_INFO_EXTRA`라는 설정은 기준 소스에 없습니다. 자체 application도 올바른 package recipe에 license·license files·source 정보를 선언하고, 별도 반입 binary와 빌드/설치 자료는 제품의 배포 목록과 대조합니다. 특정 license의 의무 충족 판단은 이 장의 범위를 넘습니다.

## SBOM — 입력 자료와 표준 문서를 구분

기준 버전의 `make show-info`는 패키지 정보를 JSON으로 출력합니다. 이는 표준 SBOM 자체가 아니라 변환에 사용할 수 있는 입력 자료입니다.

```bash
make show-info > buildroot-show-info.json
```

기준 Makefile에는 CycloneDX/SPDX 산출 target이 없습니다. 이전 예의 `cyclonedx-buildroot --manifest ...`는 도구·옵션의 근거를 확보하지 못해 실행 절차에서 제외했습니다. 이후 릴리스의 내장 기능은 해당 릴리스에서 다시 확인합니다.

변환 도구를 도입한다면 버전과 입력 schema를 고정하고 target/host 범위, dependency 관계, license 표현과 실제 배포 파일의 대응을 확인합니다. 파일시스템 scanner는 이와 다른 관측 자료를 제공하지만 package DB가 없는 rootfs에서 식별이 빠질 수 있습니다. 어느 한 산출물을 무조건 정본으로 삼지 않고 빌드 메타데이터·배포 이미지·외부 반입 목록 사이의 차이를 검토합니다.

## Reproducible builds — 조건을 고정한 비교

같은 git commit·같은 defconfig에서 *완전히 동일한 binary*가 나와야 하는 요구는 두 가지 이유로 생깁니다. 하나는 *공급망 보안*(supply chain) — 빌드 환경이 오염됐는지 확인하려면 *두 환경에서 빌드한 결과를 비교*할 수 있어야 합니다. 다른 하나는 *디버깅* — "지난주 빌드와 뭐가 달라졌는가"를 정확히 답하려면 *환경 차이가 binary에 안 새어 들어와야* 합니다.

Buildroot의 진입점은 다음 옵션입니다.

```text
BR2_REPRODUCIBLE=y
```

기준 `Config.in`은 이 기능을 experimental로 표시하고 **동일한 output 경로**라는 제약과 일부 패키지의 비재현성을 명시합니다. 따라서 임의의 서로 다른 빌드 경로가 자동으로 제거된다는 보장이 아닙니다. `SOURCE_DATE_EPOCH`는 timestamp 일관성을 위한 입력이며 모든 프로그램이 이를 따르는 것은 아닙니다. `BR2_REPRODUCIBLE_PATH`는 이 소스에 없습니다.

검증 범위에는 Buildroot/외부 트리 commit, defconfig, toolchain, 다운로드 원본, output 경로, 환경 변수와 비교할 산출물을 기록합니다. 같은 환경의 반복 빌드는 기초 검사이고, 다른 호스트·시간대·사용자 같은 조건을 바꾸는 검사는 그 범위를 넓힙니다. 한 조건에서 같았다는 결과를 모든 환경에 대한 보장으로 확대하지 않습니다.

검증은 `diffoscope`로 합니다.

```text
$ diffoscope output1/images/rootfs.tar output2/images/rootfs.tar
$ echo $?
0    # 0이면 완전 동일
```

`diffoscope`는 tarball·squashfs·ELF binary 내부까지 *재귀적으로* 비교합니다. ELF 안의 build-id, debuglink, `.comment` 섹션까지 잡기 때문에 *눈에 안 보이는 차이*도 드러납니다.

두 독립된 clean 빌드에서 **동일한 output 절대 경로**를 사용하려면 별도의 작업 공간·러너를 사용할 수 있습니다. `build1`과 `build2`처럼 경로까지 바꿨을 때 차이가 나면 기준 옵션의 제약과 패키지별 경로 유출을 함께 분석합니다. 이 장에서는 실제 rootfs 두 벌을 빌드하거나 재현성을 입증하지 않았습니다.

## Hardening flags

Binary 수준의 방어 옵션들입니다. Buildroot의 toolchain·패키지 빌드에 전달되는 옵션입니다. 각 빌드 시스템이 실제로 반영했는지는 최종 ELF에서 확인해야 합니다.

```text
BR2_RELRO_FULL=y               # Full RELRO (lazy binding 무효화)
BR2_SSP_STRONG=y               # Stack smashing protector (strong)
BR2_PIC_PIE=y                  # Position Independent Executable
BR2_FORTIFY_SOURCE_2=y         # _FORTIFY_SOURCE=2
```

각 옵션의 효과는 다음 표와 같습니다.

| 옵션 | 기준 소스의 목적 | 확인할 결과 |
|---|---|---|
| `BR2_RELRO_PARTIAL` | relocation 영역 일부의 쓰기 제한 | ELF program header의 GNU_RELRO |
| `BR2_RELRO_FULL` | RELRO와 즉시 binding | GNU_RELRO와 NOW flag |
| `BR2_SSP_REGULAR` | 지정 조건의 함수에 stack protector | 대상 함수의 canary 코드 |
| `BR2_SSP_STRONG` | local array·frame address 참조 등으로 범위 확장 | 실제 compiler 결과 |
| `BR2_SSP_ALL` | 모든 함수에 stack protector 요청 | 전체 ELF와 runtime 지원 |
| `BR2_PIC_PIE` | 위치 독립 실행파일 빌드 요청 | ELF 종류와 대상 ASLR 설정 |
| `BR2_FORTIFY_SOURCE_2` | libc/compiler의 추가 경계 검사 | 최적화·libc 지원·변환된 호출 |

위 이름은 [기준 Config.in](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/Config.in)에 존재하지만 architecture/toolchain 의존성을 만족해야 선택됩니다. 비용의 고정 백분율은 근거가 없어 제외했습니다. 실제 binary 크기, 시작 시간과 대표 workload를 비교합니다.

커널·부트로더·사전 빌드 vendor binary는 사용자 공간 패키지와 빌드 경로가 다릅니다. `BR2_PACKAGE_<NAME>_DOES_NOT_USE_PIC`이라는 공통 override 옵션은 기준 트리에 없습니다. JIT의 W^X 정책과 PIE도 서로 다른 문제이므로 일괄 충돌로 설명하지 않습니다. package recipe, compiler/linker command와 최종 산출물의 차이를 확인해 예외를 기록합니다.

## Root password·서비스 비활성

인증 정책은 root password 문자열 하나로 결정되지 않습니다. 기준 [system/Config.in](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/system/Config.in)은 평문과 지정 crypt 해시를 모두 받지만 `.config`·로그 노출을 경고합니다. 해시 안의 `$`는 **`$$`로 이스케이프**해야 make 확장을 피합니다. 중요한 비밀번호를 명령줄 인자로 남기는 예는 사용하지 않습니다.

빈 `BR2_TARGET_GENERIC_ROOT_PASSWD`는 로컬 root 로그인에 비밀번호가 필요 없다는 의미입니다. 이를 일반적인 계정 잠금이나 모든 SSH 서버의 key-only 정책으로 간주하면 안 됩니다. root password 로그인을 막으려는 기준 설정은 다음과 같습니다.

```text
# BR2_TARGET_ENABLE_ROOT_LOGIN is not set
```

이 설정은 SSH key 배치나 서버별 인증 정책까지 자동 구성하지 않습니다. Dropbear startup은 `/etc/default/dropbear`의 인자를 읽으므로 실제 이미지의 override·PAM·다른 계정·로컬 콘솔·복구 모드를 함께 확인합니다. 생산 환경의 key-only 여부는 허용 key의 접속 성공과 password/빈 password의 거부를 실제 대상에서 검사합니다.

BusyBox에서 사용하지 않는 server applet은 설정 fragment로 끕니다. 예를 들어 아래는 telnet·FTP server를 제외하는 Kconfig 형식입니다.

```text
# CONFIG_TELNETD is not set
# CONFIG_FTPD is not set
```

별도 package나 init script가 같은 서비스를 제공할 수 있으므로 applet 설정만으로 포트 차단을 입증할 수 없습니다. 배포 이미지의 서비스 시작 경로와 실제 listen 상태를 확인합니다.

## CVE 모니터링 워크플로

CVE는 *오늘 안전*해도 *내일 발견*됩니다. 양산 후의 *모니터링 워크플로*가 빌드 시점의 검증만큼 중요합니다.

`make pkg-stats` 결과를 commit/config/데이터 갱신 시각과 함께 보관하고 이전 보고서와 비교합니다. JSON 전체의 textual diff는 날짜·통계 차이도 포함하므로 새로 보고된 패키지/CVE/확실성 조합을 따로 추출합니다. 다음 도구의 입력은 기준 버전의 **완전한 pkg-stats JSON**이며, 아래 검사는 실제 NVD 접속 대신 synthetic fixture로 수행했습니다.

```js title="cve-diff.mjs"
import {readFileSync, realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function findings(document) {
    const packages = document?.packages;
    if (!packages || Array.isArray(packages) || typeof packages !== 'object' ||
        Object.keys(packages).length === 0) throw new TypeError('packages required');
    const rows = new Map();
    for (const [name, pkg] of Object.entries(packages)) {
        if (!pkg || typeof pkg !== 'object') throw new TypeError('package object');
        for (const kind of ['cves', 'unsure_cves']) {
            if (!Array.isArray(pkg[kind])) throw new TypeError(`${name}.${kind} array required`);
            for (const id of pkg[kind]) {
                if (typeof id !== 'string' || !/^CVE-[0-9]{4}-[0-9]{4,}$/.test(id))
                    throw new TypeError('invalid CVE ID');
                rows.set(JSON.stringify([name, id, kind]), {package: name, id, kind});
            }
        }
    }
    return rows;
}

export function addedFindings(previous, current) {
    const before = findings(previous), after = findings(current);
    return [...after].filter(([key]) => !before.has(key)).map(([, row]) => row)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
}

export function main(paths) {
    if (paths.length !== 2) throw new Error('usage: cve-diff.mjs PREVIOUS.json CURRENT.json');
    const [previous, current] = paths.map(path => JSON.parse(readFileSync(path, 'utf8')));
    const added = addedFindings(previous, current);
    console.log(JSON.stringify({added}, null, 2));
    return added.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
    try { process.exitCode = main(process.argv.slice(2)); }
    catch (error) { console.error(String(error)); process.exitCode = 2; }
}
```

전날과 오늘 같은 파일을 잘못 고르지 않도록 입력 경로를 명시합니다. 첫 보고서는 비교 대상이 없는 baseline으로 따로 검토하며 빈 파일이나 오류를 clean 결과로 취급하지 않습니다.

```bash
node cve-diff.mjs previous-pkg-stats.json current-pkg-stats.json
```

종료 코드 0은 새 조합 없음, 1은 추가 조합 검토 필요, 2는 입력·schema 오류입니다. 기존 미해결 CVE가 없다는 의미가 아니며, 사라진 항목도 patch 완료의 증거가 아닙니다. CPE 변경·패키지 제외·ignore·feed 변경에 의한 차이를 triage하고, 패치 후 빌드·기능·취약점 재현 검사를 별도로 수행합니다.

## 흔한 실수

- **도구 이름만으로 산출물을 신뢰합니다.** `pkg-stats` schema와 `legal-info/README` 경고, package 선언을 해당 릴리스에서 확인합니다. `BR2_GENERATE_LOCALE`을 켜면 license manifest가 고쳐진다는 근거는 기준 소스에서 확인하지 못해 제거했습니다.
- **재현성 옵션을 보장으로 읽습니다.** 동일 output 경로와 패키지별 제한을 기록하고 실제 비교 결과를 남깁니다.
- **hardening 설정을 최종 결과로 취급합니다.** compiler/linker 전달과 배포 ELF를 대조합니다.
- **빈 password를 계정 잠금으로 읽습니다.** 콘솔·SSH·PAM·복구 경로의 인증 결과를 실제 이미지에서 확인합니다.

## 정리

CVE 보고서는 후보를 찾는 입력이며 `unsure_cves`·백포트·ignore 근거까지 검토합니다. `legal-info`와 `show-info`는 license/SBOM 검토의 자료이고 의무 이행이나 표준 SBOM 완성을 보장하지 않습니다. 재현성·hardening·인증 설정은 고정된 소스 계약과 실제 제품의 동작 검증을 나누어 기록합니다.

## 다음 장 예고

다음 편은 **Ch 19: CI/CD**. Buildroot 빌드와 산출물을 자동화 파이프라인에 어떻게 얹는지 다룹니다.


## 관련 항목

- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — toolchain 버전이 CVE surface를 결정함
- [Ch 16: OTA 업데이트 — bundle signing과 rollback](/blog/embedded/buildroot/chapter16-ota) — reproducible build와 signing이 OTA 신뢰의 기반
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — SDK 생성과 application 빌드
- [Ch 19: CI/CD — Buildroot를 파이프라인에 얹기](/blog/embedded/buildroot/chapter19-cicd) — 빌드와 산출물 자동화
- [원문 — Buildroot Manual: package details·legal info](https://buildroot.org/downloads/manual/manual.html)
- [원문 — Reproducible Builds 프로젝트](https://reproducible-builds.org/)
