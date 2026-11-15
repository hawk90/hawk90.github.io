---
title: "임베디드 보안 개발 라이프사이클 — Secure SDLC 적용"
slug: "embedded/embedded-security/chapter10-sdlc"
date: 2026-05-21T09:10:00
description: "Threat model에서 SBOM·빌드 출처·사고 대응까지, 임베디드 release의 보안 증거를 연결합니다."
tags: [SDLC, SDL, SBOM, threat-modeling, supply-chain]
series: "Embedded Security"
seriesOrder: 10
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"보안은 *마지막에 검사하는 항목*이 아니라 *처음부터 끝까지 따라가는 프로세스*입니다."** — 출시 직전에 pen test 한 번 받고 마무리하는 것이 가장 흔하고 가장 비싼 실수입니다. 보안은 요구사항·설계·구현·검증·배포·운영의 *모든 단계*에 분산됩니다.

앞 장의 기술을 개발·운영 절차에 연결하는 장입니다. 앞에서 다룬 *기술적 도구*들이 *어떤 프로세스 안에서 쓰여야 의미가 있는지*를 정리합니다. 같은 secure boot, 같은 OTA, 같은 TLS라도 *threat model 없이 만든 것*과 *threat model을 따라 만든 것*은 보안 수준이 다릅니다.

이 장에서는 Microsoft SDL을 뼈대로, OWASP IoT Top 10과 SAMM을 보조 참고로 두고, *임베디드에 특화된* 보안 SDLC를 그립니다. 이후 Ch 11~13에서는 PCIe·CXL 장치의 신뢰 경계로 범위를 넓힙니다.

## 보안 SDLC의 7단계

다음은 이 글에서 산출물을 정리하기 위한 일곱 단계입니다. [Microsoft SDL practices](https://www.microsoft.com/en-us/securityengineering/sdl/practices)의 고정 12개 항목을 공식적으로 재분류한 표가 아닙니다. 공식 페이지의 확인 시점은 2026-10-24입니다.

| 단계 | 산출물 | 다음 단계에 넘길 조건 |
|------|------|------|
| Training | 역할별 훈련·과제 결과 | 실제 결함·권한·보고 절차를 설명 가능 |
| Requirements | 적용성·보안 요구·수락 기준 | 제품 경계·실패 조건이 명시됨 |
| Design | 위협·trust boundary·대안 | 설계 결정과 잔여 위험의 담당자가 있음 |
| Implementation | 코드·build 설정·review | 경고·검사 제외 사유를 추적 가능 |
| Verification | 정상·변조·실패·복구 시험 | 환경·입력·결과와 미실행 범위를 구분 |
| Release | artifact·SBOM·provenance·서명 정책 | 실제 배포 bytes와 증거가 연결됨 |
| Response | 취약점 판정·보고·patch·지원 종료 | 현장 version·담당자·기한을 찾을 수 있음 |

## 1. Training — 팀 역량

코딩 결함과 설계·배포·운영 실패를 함께 다룹니다. `strcpy`, `memcpy`의 잘못된 사용, `system(user_input)`, 평문 비교, 부족한 입력 검증. 이 모든 것이 *코드를 쓴 엔지니어가 그 위험을 몰랐을 때* 들어갑니다.

| 역할 | 최소 training |
|------|--------------|
| 모든 엔지니어 | OWASP Top 10, CWE Top 25, secure coding 기본 |
| Architect | Threat modeling (STRIDE/DREAD), 표준 (Ch 8) |
| Implementation lead | Static analysis tooling, supply chain |
| QA / Test lead | Fuzzing, pen test methodology |
| Operations | Vuln disclosure, incident response |

교육 시간의 보편적인 최소값을 Microsoft 기준으로 단정하지 않습니다. 역할별 과제, 실제 발견 결함과 후속 훈련의 연결을 남깁니다.

## 2. Requirements — 보안 요구의 명시

[Ch 8 표준](/blog/embedded/embedded-security/chapter08-iot-standards)에서 본 ETSI/NIST/CRA 요구를 *제품 요구사항*에 명시적으로 들이는 단계입니다.

| 요구 예 | 수락 기준 예 | 일반화하면 안 되는 것 |
|------|------|------|
| 허용된 update만 설치 | 다른 key·제품·변조·정책상 구버전 거부 | hash 일치만으로 서명 인증 |
| 통신 상대 확인 | trust anchor·이름·유효기간·폐기/교체 시험 | TLS1.3·pinning이면 모든 제품 요구 충족 |
| 제한된 interface 접근 | 역할별 허용·거부·재등록 시험 | 특정 보안 chip 사용이 곧 인증 |
| 상태 관찰 | 필요한 event·접근 주체·보존 정책 | NIST가 모든 제품에 30일 보존 강제 |
| 취약점 대응 | 지원 기간·보고 조건·대리 담당자 | 모든 CVE를 인지 후24시간 보고 |
| 배포 component 추적 | 해당 build의 SBOM·누락 검토 | 생성 성공만으로 완전한 inventory |

이 표는 제품 요구 예이며 ETSI/NIST/CRA 조문을 그대로 옮긴 규칙이 아닙니다. [Ch 8](/blog/embedded/embedded-security/chapter08-iot-standards)에서 적용 범위와 기한을 확인하고, 요구마다 설계·시험·운영 증거를 연결합니다.

## 3. Design — Threat Modeling 재방문

[Ch 1: Threat Model](/blog/embedded/embedded-security/chapter01-threat-model)에서 다룬 STRIDE를 *설계 산출물 옆에* 두는 단계입니다.

위협 분류 자체는 [Ch 1](/blog/embedded/embedded-security/chapter01-threat-model)에 둡니다. 여기서는 OTA data flow의 신뢰 경계, 검증 key의 소유자, counter commit 시점, fallback 조건, 지원 종료 후 동작을 설계 결정으로 남깁니다. Mitigation 칸이 채워져 있어도 구현·시험·운영 책임이 없으면 검증된 결정이 아닙니다.

예를 들어 signing key를 바꿀 때 구버전 bootloader가 새 이미지를 수락하는지, 폐기된 key가 남는지와 복구 경로를 함께 검토합니다. TLS 인증서 교체와 firmware signing key 교체를 같은 절차로 묶지 않습니다.

## 4. Implementation — secure coding + 자동 검사

### 언어 표준 + static analysis

제품 언어·규격·실제 결함 유형에 맞춰 규칙과 분석기를 선택합니다.

| 도구 | 영역 |
|------|------|
| MISRA C / MISRA C++ | 자동차·기능 안전 (코딩 규칙) |
| CERT C / CERT C++ | 보안 중심 (Carnegie Mellon) |
| Clang-Tidy + Clang Static Analyzer | 일상 CI 통합 |
| cppcheck | 가벼운 정적 분석 |
| Coverity / CodeSonar / Klocwork | 상용, 깊이 있는 분석 |
| Polyspace | abstract interpretation, 자동차 표준 |
| semgrep | 패턴 기반, 빠르고 자동화 좋음 |

검사기 수를 늘리기보다 차단할 규칙·예외 승인·오탐 처리와 새 결함의 추적을 정의합니다. 특정 도구 조합을 모든 팀의 최소 요구로 단정하지 않습니다.

### Compiler hardening

Compiler·linker·libc·CPU·OS가 지원하는 보호를 선택하고 실제 최종 binary를 검사합니다. Bare-metal MCU와 Linux userspace에 같은 flag 목록을 적용하지 않습니다.

| 보호·옵션 | 전제·한계 |
|------|------|
| `-Wall -Wextra -Wformat=2` 등 | compiler별 지원·경고 정책, 전체 보안 증명 아님 |
| `-fstack-protector-strong` | compiler 선택 함수와 guard/runtime 지원, 모든 overflow 차단 아님 |
| `_FORTIFY_SOURCE` | libc·compiler·최적화·object-size 정보에 의존 |
| `-fPIE -pie`, RELRO/NOW/noexecstack | 주로 OS/ELF loader·linker 조건, MCU MPU 설정과 별도 |
| `-fcf-protection` | [GCC x86 GNU/Linux CET 구현](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html), Arm BTI flag가 아님 |
| `-mbranch-protection` | [GCC13.4 AArch64 옵션](https://gcc.gnu.org/onlinedocs/gcc-13.4.0/gcc/AArch64-Options.html), CPU·toolchain 조건 확인 |

[glibc fortification](https://sourceware.org/glibc/manual/latest/html_node/Source-Fortification.html)은 일부 library 호출의 검사이며 잘못된 pointer의 실제 할당 크기를 마법처럼 복구하지 않습니다. `-ftrapv`도 stack·heap 보호의 대체가 아니고 signed arithmetic의 일부 검사입니다. 이 작업에서는 위 Linux/GCC hardening 구성을 build하거나 타깃에서 검증하지 않았습니다.

### Buffer 계약을 함수 경계에 표현

함수 parameter의 `sizeof(dst)`는 호출자의 배열 크기가 아닙니다. 다음 함수는 유효한 source bytes와 destination 용량을 전달받는 예입니다. 두 영역은 겹치지 않고 각 크기만큼 접근 가능한 object라는 전제가 필요합니다. NUL 종료 문자열이나 비밀 비교 함수가 아닙니다.

```c title="copy-bytes.c"
#include <stddef.h>
#include <string.h>

int copy_bytes(void *dst, size_t capacity, const void *src, size_t length)
{
    if (length == 0)
        return 0;
    if (dst == NULL || src == NULL || length > capacity)
        return -1;
    memcpy(dst, src, length);
    return 0;
}
```

이 글의 함수를 그대로 추출해 host ASan/UBSan에서 길이·용량 조합과 null·zero-length 조건을 검사했습니다. 거부 시 destination 전체가 유지되는지, 성공 시 경계 바깥이 바뀌지 않는지 확인합니다. Caller가 실제 크기를 잘못 전달하거나 영역이 겹치는 경우까지 안전하게 처리한다는 뜻은 아닙니다.

## 5. Verification — 다층 검증

| 활동 | 도구 / 산출물 |
|------|------------|
| Code review | PR 단위, security checklist |
| Static analysis | CI에서 자동, 새 결함 zero policy |
| Unit test (security cases) | gtest / Unity / CMock |
| Fuzzing | AFL++, libFuzzer, boofuzz |
| Pen test | 외부 또는 내부 red team |
| Side-channel test | ChipWhisperer 기본 측정 ([Ch 7](/blog/embedded/embedded-security/chapter07-side-channel)) |
| Firmware analysis | binwalk + Ghidra 자체 점검 ([Ch 9](/blog/embedded/embedded-security/chapter09-firmware-analysis)) |

검증 범위는 threat model과 변경 영향으로 정합니다. Pen test 기간·finding 수에 보편적인 기본값을 두지 않습니다. OTA 서명 검증 성공뿐 아니라 [Ch 6](/blog/embedded/embedded-security/chapter06-ota-update)의 변조·구버전·복구 조건을 구분합니다.

OWASP IoT Top10(2018)은 조사 주제를 정리하는 참고 목록이며 각 항목을 한 번씩 실행했다고 표준 적합성이나 보안 범위가 완성되지는 않습니다. Test plan에 관찰 결과와 장비·운영 조건이 빠진 항목을 따로 표시합니다.

## 6. Release — SBOM + final review

### Software Bill of Materials (SBOM)

SBOM은 component identity·version·관계와 배포 artifact를 연결해야 합니다. 법규·조달 조건마다 생성·보관·제공 요구가 다르며 모든 제품의 전체 목록을 항상 공개 제출한다고 쓰지 않습니다. SPDX·CycloneDX는 형식 계열이며 선택한 도구의 schema version과 소비 도구 호환성을 기록합니다.

[Yocto5.0.6 SBOM 문서](https://docs.yoctoproject.org/5.0.6/dev-manual/sbom.html)의 예는 configuration에서 class를 상속하는 방식입니다.

```bitbake
INHERIT += "create-spdx"
```

이후 image build가 image·recipe SPDX JSON과 index 등을 만듭니다. 단일 deploy directory에 scanner를 돌린 것과 recipe dependency·변경 source가 포함된 build-time SBOM을 같다고 보지 않습니다. Buildroot의 `make legal-info`는 license/source 관련 산출물이며 취약점·모든 runtime component를 완전하게 식별하는 SBOM의 동의어가 아닙니다.

이 작업에서는 Yocto image build·scanner 실행·실제 SBOM schema 검증을 하지 않았습니다. 실제 release에서는 정적 library·vendor blob·변형 package·제외 항목을 검토하고 SBOM hash와 배포 image hash를 release manifest에 연결합니다.

### VEX (Vulnerability Exploitability eXchange)

[CycloneDX VEX 설명](https://cyclonedx.org/capabilities/vex/)은 제품과 취약점의 영향 상태를 표현합니다. `not_affected`라는 문자열만 선언하지 않고 판단 근거·대상 version·분석 일시·재검토 조건을 남깁니다. 불완전한 JSON 조각과 임의 CVE 번호를 완성된 VEX 예로 쓰지 않습니다.

| 영향 판단 | 남길 증거 | 다시 판단할 조건 |
|------|------|------|
| Component 없음 | 실제 build inventory·누락 검토 | 새 component·link 방식 |
| 취약 코드 제외 | build flag·link map·source 대응 | toolchain·구성 변경 |
| 도달 불가 가설 | 호출·입력·권한 경계와 시험 | 기능·interface·권한 변경 |
| 영향 있음/조사 중 | version·재현·완화·담당자 | patch·새 악용 정보 |

VEX가 CRA 보고 대상 판단을 자동으로 대신하거나 법적 의무를 면제하지는 않습니다.

### Supply chain — provenance와 artifact 서명을 구분

[SLSA1.0 Build track](https://slsa.dev/spec/v1.0/levels)은 L0~L3를 정의합니다. 이 판은 과거 판으로 고정해 비교하며 최신이라는 뜻이 아닙니다. 이전 단일 Level1~4 표와 섞지 않습니다.

| 수준 | 확인할 것 |
|------|------|
| Build L0 | provenance 보장 없음 |
| Build L1 | build를 설명하는 provenance 존재 |
| Build L2 | hosted platform이 생성한 서명된 provenance |
| Build L3 | 더 강화된 build platform·격리·위조 방지 요구 |

Artifact 서명만으로 provenance의 정확성·builder 격리·해당 SLSA 수준이 증명되지 않습니다. Sigstore를 선택한다면 signature뿐 아니라 신뢰 key 또는 certificate identity·issuer, artifact digest와 적용한 verification policy를 확인합니다. Keyless도 identity 공급자·builder 권한의 신뢰를 검토해야 합니다. 여기서는 cosign 실행이나 SLSA 평가를 수행하지 않았습니다.

## 7. Response — 운영 단계의 보안

### Vulnerability disclosure

[Ch 8](/blog/embedded/embedded-security/chapter08-iot-standards)의 적용 제도에 맞춰 연락 경로, 수신 확인·상태 안내, coordinated disclosure와 보고 책임을 정합니다. 90일을 모든 사건의 공개·patch 의무 기한으로 두지 않습니다.

[RFC9116](https://www.rfc-editor.org/rfc/rfc9116.html)의 HTTPS `/.well-known/security.txt`는 보안 연락처를 찾는 형식입니다. Email Contact에는 `mailto:` URI를 사용하고 실제 운영 주소·만료일을 설정합니다. 다음은 예약 domain을 쓴 서식 예로, 운영 중인 endpoint가 아닙니다.

`security.txt` 예:

```text
Contact: mailto:security@example.com
Encryption: https://example.com/pgp-key.txt
Acknowledgments: https://example.com/security/hall-of-fame
Preferred-Languages: en, ko
Policy: https://example.com/security/policy
Expires: 2027-12-31T23:59:59Z
```

### Incident response — 24시간 보고

[CRA 공식 보고 안내](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)에 따라 실제 악용 취약점·심각한 incident, 인지 시점과 early warning·후속·최종 보고를 구분합니다. 2026-09-11 적용, 24/72시간 및 최종 보고 기한은 [Ch 8의 표](/blog/embedded/embedded-security/chapter08-iot-standards)와 함께 확인합니다. 내부 회의나 ticket 생성 시점으로 법적 인지 시계를 늦추지 않습니다.

Tabletop exercise에는 담당자 부재·영향 version 불명·component 공급자 미응답·patch 전 악용 조건을 넣습니다. 산출물은 최초 인지 근거, 보고 대상 판단, 다음 마감, 사용자 완화책, 담당자와 실제 전달 기록입니다. 리허설 시각과 실제 사고 대응 결과를 혼동하지 않습니다.

### CVE / CWE / OSV — 추적

| 데이터베이스 | 용도 |
|------------|------|
| CVE (cve.org) | 공개 취약점 ID |
| NVD | CVE + CVSS 점수 + CWE 매핑 |
| OSV.dev | 오픈소스 패키지 단위 vuln |
| GitHub Advisory DB | GitHub 호스팅 프로젝트 |
| CWE | 취약점 약점 유형 분류 |

SBOM과 advisory를 연결할 때 component 이름만 grep하지 말고 ecosystem·version·backport·구성·도달성을 확인합니다. Scanner 결과는 triage 후보이며 누락·오탐·업데이트 시점을 기록합니다. 특정 scanner의 version 없는 명령을 실행 검증 예로 제시하지 않습니다.

### Sunset — 지원 종료

지원 기간·종료일·사용자 통지·마지막 release·대체 조치를 적용 요구와 공개 약속에 맞춰 정합니다. CRA 최소 기간의 예외나 제품 예상 사용 기간을 무시하지 않습니다. 공급자 component 지원이 끝나도 자신의 제품 지원 책임이 자동으로 사라지는 것은 아닙니다.

## 이 장의 증거를 다음 장에 연결

Ch 11~13의 IDE·SPDM·TEE 기능도 같은 산출물 관계를 갖습니다. 장치 인증서가 유효한지, 측정 reference가 맞는지, IDE가 실제 활성인지, 실패 후 메모리 재사용이 허용되는지에 각각 다른 증거와 담당자가 필요합니다. 보안 기능 목록이 채워졌다는 이유로 하나의 통합 성공 판정을 내리지 않습니다.

## 자주 하는 실수

요구사항에 구현 제품명만 쓰거나 검사 성공을 전체 제품 보안으로 확대하지 않습니다. 릴리스마다 SBOM·build 출처·서명 대상과 실제 배포 bytes의 연결을 확인하고, 취약점 연락 경로의 부재·인계·지연도 시험합니다.

해외 공급망 고객의 계약 요구와 자사 제품에 직접 적용되는 법적 의무는 구분합니다. 한국 제조사라는 이유만으로 CRA가 적용되거나 제외된다고 단정하지 않습니다.

## 정리

각 단계의 입력·판정·산출물을 release 식별자로 연결해야 다음 담당자가 같은 결론을 검토할 수 있습니다. 이 장의 실행 검증은 buffer 함수의 host 동작에 한정됩니다. 실제 build platform·SBOM·서명 배포·규제 보고 절차를 운영 검증한 결과가 아닙니다.

다음 편은 [Ch 11: PCIe·CXL IDE](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)입니다.

## 관련 항목

- [Ch 1: Threat Model](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 8: IoT 표준](/blog/embedded/embedded-security/chapter08-iot-standards)
- [Ch 9: 펌웨어 분석 / 리버싱](/blog/embedded/embedded-security/chapter09-firmware-analysis)
- [Practical RTOS Internals — TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [원문 — Microsoft Security Development Lifecycle](https://www.microsoft.com/en-us/securityengineering/sdl)
- [원문 — OWASP SAMM](https://owaspsamm.org/)
- [원문 — OWASP IoT Top 10](https://owasp.org/www-project-internet-of-things/)
- [원문 — CycloneDX](https://cyclonedx.org/)
- [원문 — SPDX](https://spdx.dev/)
- [원문 — SLSA](https://slsa.dev/)
- [원문 — Sigstore](https://www.sigstore.dev/)
- [원문 — OSV.dev](https://osv.dev/)
