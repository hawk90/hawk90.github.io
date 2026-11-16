---
title: "Buildroot Security·CVE 추적 — pkg-stats와 Reproducible Builds"
slug: "embedded/buildroot/chapter18-security-cve"
date: 2026-05-19T09:18:00
description: "Buildroot 2026.02.3의 pkg-stats·CVE ignore·legal-info·CycloneDX SBOM과 재현성·hardening 기본값을 실제 빌드에서 확인합니다."
series: "Buildroot Practical"
seriesOrder: 18
tags: [embedded, buildroot, security, cve, sbom, reproducible-builds]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"보안은 *출시 직전*에 시작하면 늦습니다."** — Buildroot는 CVE 추적·license 산출·reproducible build·hardening을 빌드 시스템 안에 내장합니다. 양산 직전이 아니라 *시리즈를 시작할 때*부터 켜 두어야 의미가 있습니다.

이 장은 시리즈의 다른 장과 같이 **Buildroot 2026.02.3**(commit `679b9ead`)의 소스·매뉴얼을 기준으로 하고, legal-info·SBOM·hardening은 Ch 4의 QEMU 빌드에서, 재현성은 Ch 14와 같은 설정의 반복 빌드에서 실제로 확인했습니다(Debian 13 arm64 VM). `pkg-stats`는 실행하지 않았습니다. 이유는 아래 절에 적었습니다. 건물 안전 점검에 비유하면, CVE 추적은 *자재 리콜 목록 대조*, legal-info는 *자재 영수증 보관*, 재현성은 *같은 설계도로 같은 건물이 나오는지*, hardening은 *방화문 설치*입니다. 하나가 다른 하나를 대신하지 않습니다.

## 임베디드 보안의 4축

임베디드 시스템의 보안·컴플라이언스는 *런타임 방어* 하나로 끝나지 않습니다. Buildroot 관점에서 다음 네 축이 동시에 굴러가야 합니다.

| 축 | 무엇을 다루는가 | Buildroot 진입점 |
|---|---|---|
| **CVE 추적** | 빌드에 들어간 패키지의 알려진 취약점 추적 | `make pkg-stats` |
| **License compliance** | GPL·LGPL·BSD·proprietary 라이선스 의무 이행 | `make legal-info` |
| **Reproducible build** | 동일성 조건을 고정하고 산출물을 비교 | `BR2_REPRODUCIBLE=y` |
| **Hardening** | RELRO·SSP·PIE·FORTIFY 등 binary 수준의 방어 | `BR2_RELRO_*`, `BR2_SSP_*`, `BR2_PIC_PIE`, `BR2_FORTIFY_SOURCE_*` |

네 축은 *독립적*입니다. CVE 보고서가 깨끗해도 미발견 취약점과 설정 오류는 남습니다. Hardening은 취약점 악용을 어렵게 하는 방어이며 license 산출물 검토를 대신하지 않습니다. 한 축씩 분리해 익혀 두는 게 양산 단계에서 *전부를 다시 학습*하는 비용보다 쌉니다.

이 장은 네 축의 *Buildroot 진입점*을 다룹니다. 깊은 보안 이론보다는 *지금 트리에서 어떤 명령을 치면 어떤 산출물이 나오는지*에 집중합니다.

## make pkg-stats — CVE 매칭

`make pkg-stats`는 현재 설정의 패키지 메타데이터와 NVD 데이터를 대조해 보고서를 만듭니다. 최상위 `Makefile` 965~970행이 `support/scripts/pkg-stats -c --json $(O)/pkg-stats.json --html $(O)/pkg-stats.html …`를 부릅니다. 빌드가 끝났는지나 취약점을 실제로 악용할 수 있는지를 증명하는 명령은 아닙니다.

NVD 데이터를 가져오는 방법은 `support/scripts/cve.py`에 있습니다. 31행 `NVD_BASE_URL = "https://github.com/fkie-cad/nvd-json-data-feeds/"`이고, 처음에는 이 저장소를 통째로 `git clone`, 다음부터는 `git pull`합니다(150~165행). 이 장의 VM은 소스 다운로드가 초당 수십~수백 KB까지 떨어지는 환경이라 NVD 전체 이력을 clone하는 이 단계를 실행하지 않았습니다. CI에서는 이 디렉터리를 캐시해 두지 않으면 매번 전체 clone이 일어난다는 점을 염두에 둡니다.

`pkg-stats`의 `check_package_cves()`(662행~)는 패키지에 CPE가 있으면 CPE의 product로, 없으면 패키지 이름으로 후보를 묶은 뒤 NVD를 대조합니다. 결과는 패키지마다 `cves`, `unsure_cves`, `ignored_cves` 목록과 상태로 들어갑니다.

```python
            if pkg.cves or pkg.unsure_cves:
                pkg.status['cve'] = ("error", "affected by CVEs")
            elif pkg.stale_cve_ignores:
                pkg.status['cve'] = ("warning", "has stale CVE ignores")
            else:
                pkg.status['cve'] = ("ok", "not affected by CVEs")
```

`unsure_cves`도 "affected"로 분류되므로 반드시 사람이 봅니다. `stale_cve_ignores`는 ignore 목록에 있지만 더 이상 해당하지 않는 항목을 따로 경고합니다.

백포트·비해당 판단에는 `<PKG>_IGNORE_CVES`를 씁니다. 매뉴얼 "generic-package reference"는 이 변수를 "typically used when the CVE is fixed by a patch in the package … or when the CVE for some reason does not affect the Buildroot package"로 설명하고 "A Makefile comment must always precede the addition of a CVE to this variable"이라고 요구합니다. 2026.02.3 `package/*/*.mk`에는 `IGNORE_CVES +=` 줄이 174개 있습니다. busybox가 실제 예입니다. `package/busybox/busybox.mk`는 근거가 되는 패치 이름을 주석으로 적고 바로 아래에서 ignore합니다.

```makefile
# 0003-libbb-sockaddr2str-ensure-only-printable-characters-.patch
# 0004-nslookup-sanitize-all-printed-strings-with-printable.patch
BUSYBOX_IGNORE_CVES += CVE-2022-28391

# 0012-archival-libarchive-sanitize-filenames-on-output.patch
# 0013-testsuite-tar-tests-fix-test-after-cve-2025-46394.patch
BUSYBOX_IGNORE_CVES += CVE-2025-46394
```

반대로 `0008-awk.c-fix-CVE-2023-42366-bug-15874.patch`는 이름에 CVE가 있지만 `BUSYBOX_IGNORE_CVES`에는 없습니다. 패치 파일 이름만으로 "해결됨"을 판단하면 안 되고, ignore 목록과 pkg-stats 결과를 함께 봐야 하는 이유입니다.

조직의 triage 기록에는 패키지/버전, CVE ID, 근거 링크, 적용 패치, 검토자, 검토일과 재검토 조건을 둡니다. 이는 Buildroot가 읽는 형식이 아니라 별도의 운영 기록입니다.

## make legal-info — license 산출

`make legal-info`는 license 검토에 필요한 자료를 모읍니다. Ch 9에서 htop-acme를 넣은 QEMU 빌드로 실제로 돌린 결과입니다.

```text
$ make legal-info
...
WARNING: the Buildroot source code has not been saved
$ ls output/legal-info/
README
buildroot.config
host-licenses
host-manifest.csv
host-sources
legal-info.sha256
licenses
manifest.csv
sources
$ wc -l output/legal-info/manifest.csv output/legal-info/host-manifest.csv
    8 output/legal-info/manifest.csv
   48 output/legal-info/host-manifest.csv
```

| 파일·디렉터리 | 내용 |
|---|---|
| `manifest.csv` | target 패키지 7개 + 헤더 |
| `host-manifest.csv` | host 도구 47개 + 헤더 |
| `licenses/`, `host-licenses/` | `<PKG>_LICENSE_FILES`에 적힌 파일 |
| `sources/`, `host-sources/` | 재배포 가능한 패키지의 tarball, 적용 패치, `series` |
| `buildroot.config` | 그 빌드의 `.config` |
| `legal-info.sha256` | 위 파일들의 hash |
| `README` | 저장하지 못한 자료와 주의 사항 |

manifest의 헤더는 다음 일곱 열이고, 값은 따옴표로 감싼 CSV입니다.

```text
"PACKAGE","VERSION","LICENSE","LICENSE FILES","SOURCE ARCHIVE","SOURCE SITE","DEPENDENCIES WITH LICENSES"
"busybox","1.37.0","GPL-2.0, bzip2-1.0.4","LICENSE archival/libarchive/bz/LICENSE","busybox-1.37.0.tar.bz2","https://www.busybox.net/downloads","gcc-final [GPL-3.0-with-GCC-exception] glibc [GPL-2.0+ (programs), LGPL-2.1+, BSD-3-Clause, MIT (library)] linux-headers [GPL-2.0] skeleton-init-common [unknown] skeleton-init-sysv [unknown]"
```

마지막 열에 `skeleton-init-common [unknown]`처럼 라이선스가 `unknown`으로 찍힌 내부 패키지가 섞입니다. 값이 쉼표를 포함하므로 단순 쉼표 split 대신 CSV parser로 읽습니다. `README`는 Buildroot 소스, toolchain, autotools 패키지에 적용된 libtool 패치를 "due to technical limitations" 저장하지 못했다고 적고, `_REDISTRIBUTE = NO` 패키지의 소스도 저장하지 않습니다. 실행 성공이 곧 배포 의무 충족은 아닙니다.

`BR2_LEGAL_INFO_EXTRA`라는 설정은 2026.02.3 `Config.in`에도 없습니다. 자체 application은 패키지 recipe에 license·license files·source를 선언해 manifest에 들어가게 합니다.

## SBOM — show-info와 generate-cyclonedx

`make show-info`는 패키지 정보를 JSON으로 출력합니다. QEMU 빌드에서는 65개 항목(host 포함)이 나왔습니다. 이 JSON을 표준 SBOM으로 바꾸는 도구가 2026.02.3에는 트리에 있습니다. `utils/generate-cyclonedx` 머리말이 사용법을 적습니다.

```text
# This script converts the output of the show-info make target
# to CycloneDX format.
#
# Example usage:
# $ make show-info | utils/generate-cyclonedx > sbom.json
```

실제로 돌린 결과입니다.

```text
$ make -s show-info > /tmp/si.json
$ utils/generate-cyclonedx < /tmp/si.json > /tmp/sbom.json
$ python3 -c 'import json;d=json.load(open("/tmp/sbom.json"));print(d["bomFormat"],d["specVersion"],len(d["components"]))'
CycloneDX 1.6 57
```

busybox component의 앞부분입니다.

```json
{
 "bom-ref": "busybox",
 "type": "library",
 "name": "busybox",
 "version": "1.37.0",
 "licenses": [
  { "license": { "id": "GPL-2.0" } },
  { "license": { "name": "bzip2-1.0.4" } }
 ],
 "cpe": "cpe:2.3:a:busybox:busybox:1.37.0:-:*:*:*:*:*:*",
 "externalReferences": [
  {
   "type": "source-distribution",
   "url": "https://www.busybox.net/downloads/busybox-1.37.0.tar.bz2",
```

SPDX 목록에 있는 라이선스는 `id`로, 없는 것(`bzip2-1.0.4`)은 `name`으로 들어갑니다. `cpe`는 패키지 `.mk`의 `CPE_ID_*` 변수에서 옵니다(Ch 5의 `LIBYAML_CPE_ID_VENDOR`). 스크립트 주석은 패치로 해결된 CVE(`IGNORE_CVES`)를 "resolved_with_pedigree"로 표시한다고 적습니다. show-info의 65개 중 SBOM component가 57개인 차이는 변환 과정에서 빠진 항목이 있다는 뜻이므로, 무엇이 빠졌는지(가상 패키지 등) 확인한 뒤 배포 이미지와 대조합니다.

## Reproducible builds — 조건을 고정한 비교

같은 git commit·같은 defconfig에서 *완전히 동일한 binary*가 나와야 하는 요구는 두 가지 이유로 생깁니다. 하나는 *공급망 보안*(supply chain) — 빌드 환경이 오염됐는지 확인하려면 *두 환경에서 빌드한 결과를 비교*할 수 있어야 합니다. 다른 하나는 *디버깅* — "지난주 빌드와 뭐가 달라졌는가"를 정확히 답하려면 *환경 차이가 binary에 안 새어 들어와야* 합니다.

Buildroot의 진입점은 다음 옵션입니다.

```text
BR2_REPRODUCIBLE=y
```

`Config.in`의 help는 범위를 분명히 적습니다.

```text
	  This option will remove all sources of non-reproducibility
	  from the build process. For a given Buildroot configuration,
	  this allows to generate exactly identical binaries from one
	  build to the other, including on different machines.

	  The current implementation is restricted to builds with the
	  same output directory. Many (absolute) paths are recorded in
	  intermediary files, and it is very likely that some of these
	  paths leak into the target rootfs. If you build with the
	  same O=... path, however, the result is identical.
```

옵션을 켜면 최상위 `Makefile` 540행이 `SOURCE_DATE_EPOCH`를 Buildroot 버전의 시각으로 정하고, `fs/common.mk` 46~49행의 `ROOTFS_REPRODUCIBLE`이 이미지 생성 직전에 `target/`의 모든 파일 시각을 그 값으로 맞춥니다.

### 실측 — 같은 경로에서 두 번씩

같은 VM, 같은 output 경로(`O=$HOME/orep`)에서 output을 지우고 두 번씩 빌드했습니다. 설정은 Ch 14와 같은 QEMU defconfig + 외부 toolchain에 `rootfs.tar`를 더한 것이고, 한 쌍은 `BR2_REPRODUCIBLE`을 끄고, 한 쌍은 켰습니다.

| 산출물 | 끔: 1회차 vs 2회차 | 켬: 1회차 vs 2회차 |
|---|---|---|
| `rootfs.tar` | 다름 | **같음** (`9a5228f0…`) |
| `Image` (커널) | 다름 | **같음** (`4dd7041e…`) |
| `rootfs.ext2` | 다름 | 다름 (`ddc7bc4c…` / `59d3832f…`) |

옵션을 끈 쌍은 `tar tvf` 목록부터 시각이 달랐고(`2026-11-16 06:05` 등 빌드 시각), 풀어서 비교하니 `bin/busybox`부터 내용이 달랐습니다. 옵션을 켠 쌍은 rootfs의 *파일 내용과 메타데이터*(tar)와 커널이 바이트 단위로 같았습니다.

ext4 이미지만 달랐습니다. `fs/ext2/ext2.mk`의 `mkfs.ext4` 옵션에는 UUID나 hash seed를 고정하는 인자가 없어, 이미지마다 새 값이 들어가는 것으로 보입니다. 이 실험에서는 차이 위치를 `dumpe2fs`로 확인하지 않았으므로 원인은 확정하지 않습니다. 재현성을 배포 검증에 쓴다면 *비교할 산출물*을 정해 두고(예: `rootfs.tar`), 파일시스템 이미지는 내용 비교 도구(`diffoscope` 등)로 따로 봅니다.

이 결과는 "같은 output 경로, 같은 호스트, 몇 분 차이"라는 가장 좁은 조건에서의 결과입니다. help가 경고하는 대로 output 경로가 다르면 경로가 새어 들어갈 수 있으므로, 다른 경로·다른 호스트 비교는 따로 돌려 봐야 합니다.

## Hardening flags

Binary 수준의 방어 옵션은 `Config.in`의 "Security Hardening Options"에 있습니다. 2026.02.3에서 QEMU defconfig를 펼쳤을 때 *기본값*은 다음과 같았습니다. 아무것도 켜지 않아도 PIE·SSP strong·full RELRO·FORTIFY 1이 들어갑니다.

```text
BR2_PIC_PIE=y
BR2_SSP_STRONG=y
BR2_SSP_OPTION="-fstack-protector-strong"
BR2_RELRO_FULL=y
BR2_FORTIFY_SOURCE_1=y
```

| 옵션 | 목적 | 확인할 결과 |
|---|---|---|
| `BR2_RELRO_PARTIAL` / `BR2_RELRO_FULL` | relocation 영역 쓰기 제한 / + 즉시 binding | `GNU_RELRO` program header, `BIND_NOW` |
| `BR2_SSP_REGULAR` / `_STRONG` / `_ALL` | stack protector 적용 범위 | `__stack_chk_fail` 참조 |
| `BR2_PIC_PIE` | 위치 독립 실행 파일 | ELF `Type: DYN (Position-Independent Executable file)` |
| `BR2_FORTIFY_SOURCE_1` / `_2` / `_3` | libc 함수의 경계 검사 | `__*_chk` 심볼 |

설정만 보지 말고 결과 ELF를 확인합니다. 빌드된 busybox와 htop(Ch 9)을 Buildroot의 cross `readelf`로 봤습니다.

```text
$ aarch64-buildroot-linux-gnu-readelf -h output/target/bin/busybox | grep Type
  Type:                              DYN (Position-Independent Executable file)
$ aarch64-buildroot-linux-gnu-readelf -lW output/target/bin/busybox | grep GNU_RELRO
  GNU_RELRO      0x0c4248 0x00000000000c4248 0x00000000000c4248 0x002db8 0x002db8 R   0x1
$ aarch64-buildroot-linux-gnu-readelf -d output/target/bin/busybox | grep -E "BIND_NOW|FLAGS"
 0x0000000000000018 (BIND_NOW)           
 0x000000006ffffffb (FLAGS_1)            Flags: NOW PIE
$ aarch64-buildroot-linux-gnu-readelf -sW --dyn-syms output/target/usr/bin/htop | grep -oE "__[a-z_]+_chk" | sort -u
__fdelt_chk
__realpath_chk
__snprintf_chk
__stack_chk
__strncat_chk
```

두 바이너리 모두 PIE, `GNU_RELRO`, `BIND_NOW`(`FLAGS_1: NOW PIE`)를 가졌고, htop에는 stack protector(`__stack_chk`)와 FORTIFY 변환 함수(`__snprintf_chk` 등)가 보였습니다. 패키지 빌드 시스템이 플래그를 무시하는 경우도 있으므로 이런 확인을 CI에 둡니다. 비용(크기·성능)은 대상 workload로 직접 재야 하며, 이 장에서는 재지 않았습니다.

## Root password·서비스 비활성

인증 정책은 root password 문자열 하나로 결정되지 않습니다. `system/Config.in`의 `BR2_TARGET_GENERIC_ROOT_PASSWD`는 평문과 crypt 해시를 모두 받지만 `.config`·로그 노출을 경고합니다. Ch 3에서 본 것처럼 QEMU defconfig의 기본값은 빈 문자열이고, Ch 4에서 실제로 비밀번호 없이 root로 로그인됐습니다. 해시 안의 `$`는 **`$$`로 이스케이프**해야 make 확장을 피합니다. 중요한 비밀번호를 명령줄 인자로 남기는 예는 사용하지 않습니다.

빈 `BR2_TARGET_GENERIC_ROOT_PASSWD`는 로컬 root 로그인에 비밀번호가 필요 없다는 의미입니다. 이를 일반적인 계정 잠금이나 모든 SSH 서버의 key-only 정책으로 간주하면 안 됩니다. root password 로그인을 막는 설정은 다음과 같습니다.

```text
# BR2_TARGET_ENABLE_ROOT_LOGIN is not set
```

이 설정은 SSH key 배치나 서버별 인증 정책까지 자동 구성하지 않습니다. Dropbear startup은 `/etc/default/dropbear`의 인자를 읽으므로 실제 이미지의 override·PAM·다른 계정·로컬 콘솔·복구 모드를 함께 확인합니다. 생산 환경의 key-only 여부는 허용 key의 접속 성공과 password/빈 password의 거부를 실제 대상에서 검사합니다.

BusyBox server applet은 BusyBox 설정에서 켜고 끕니다. Buildroot의 기본 `package/busybox/busybox.config`는 이미 두 줄을 끈 상태입니다(878행, 979행).

```text
# CONFIG_FTPD is not set
# CONFIG_TELNETD is not set
```

다만 `package/busybox/busybox.mk` 407~413행은 BusyBox `.config`에 `CONFIG_FEATURE_TELNETD_STANDALONE=y`가 있으면 `S50telnet` init 스크립트를 설치합니다. 자체 BusyBox 설정(`BR2_PACKAGE_BUSYBOX_CONFIG`)으로 telnetd를 켜면 부팅 때 서비스도 함께 올라옵니다. 별도 package나 init script가 같은 서비스를 제공할 수 있으므로 applet 설정만으로 포트 차단을 입증할 수 없습니다. 배포 이미지의 서비스 시작 경로와 실제 listen 상태를 확인합니다.

## CVE 모니터링 워크플로

CVE는 *오늘 안전*해도 *내일 발견*됩니다. 양산 후의 *모니터링 워크플로*가 빌드 시점의 검증만큼 중요합니다.

`make pkg-stats` 결과를 commit/config/데이터 갱신 시각과 함께 보관하고 이전 보고서와 비교합니다. JSON 전체의 textual diff는 날짜·통계 차이도 포함하므로 새로 보고된 패키지/CVE/확실성 조합을 따로 추출합니다. 다음 도구의 입력은 `pkg-stats`가 만드는 **완전한 JSON**(`dump_json()`의 최상위 `packages`)이며, 아래 검사는 실제 NVD 접속 대신 synthetic fixture로 수행했습니다.

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

- **도구 이름만으로 산출물을 신뢰합니다.** `pkg-stats` schema와 `legal-info/README` 경고, package 선언을 해당 릴리스에서 확인합니다. 
- **재현성 옵션을 보장으로 읽습니다.** 동일 output 경로와 패키지별 제한을 기록하고 실제 비교 결과를 남깁니다.
- **hardening 설정을 최종 결과로 취급합니다.** compiler/linker 전달과 배포 ELF를 대조합니다.
- **빈 password를 계정 잠금으로 읽습니다.** 콘솔·SSH·PAM·복구 경로의 인증 결과를 실제 이미지에서 확인합니다.

## 정리

- `make pkg-stats`는 fkie-cad NVD 저장소를 git clone해 대조하고, `cves`·`unsure_cves` 둘 다 "affected"로 분류합니다. `<PKG>_IGNORE_CVES`는 근거 주석과 함께 씁니다(본체에 174줄).
- `legal-info`는 manifest·license·소스·패치를 모으지만 Buildroot 소스 등은 저장하지 않는다고 README가 밝힙니다.
- 2026.02.3에는 `utils/generate-cyclonedx`가 있어 `show-info`에서 CycloneDX 1.6 SBOM(이 설정에서 57개 component)을 만들었습니다.
- PIE·SSP strong·full RELRO·FORTIFY 1이 기본값이고, `readelf`로 busybox·htop에서 확인했습니다.
- `BR2_REPRODUCIBLE`을 켜고 같은 경로에서 두 번 빌드하자 `rootfs.tar`와 커널은 같았고 ext4 이미지는 달랐습니다. 끄면 셋 다 달랐습니다.
- 기본 root password는 빈 문자열입니다. 인증 정책은 실제 이미지에서 확인합니다.

## 다음 장 예고

다음 편은 **Ch 19: CI/CD**. Buildroot 빌드와 산출물을 자동화 파이프라인에 어떻게 얹는지 다룹니다.


## 관련 항목

- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — toolchain 버전이 CVE surface를 결정함
- [Ch 16: OTA 업데이트 — bundle signing과 rollback](/blog/embedded/buildroot/chapter16-ota) — reproducible build와 signing이 OTA 신뢰의 기반
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — SDK 생성과 application 빌드
- [Ch 19: CI/CD — Buildroot를 파이프라인에 얹기](/blog/embedded/buildroot/chapter19-cicd) — 빌드와 산출물 자동화
- [원문 — Buildroot Manual: package details·legal info](https://buildroot.org/downloads/manual/manual.html)
- [원문 — Reproducible Builds 프로젝트](https://reproducible-builds.org/)
