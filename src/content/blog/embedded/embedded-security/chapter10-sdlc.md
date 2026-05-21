---
title: "Ch 10: 보안 개발 라이프사이클 / 시리즈 마무리"
date: 2026-05-08T11:00:00
description: "Microsoft SDL, threat modeling, SBOM, supply chain, 사고 대응. 시리즈 마무리."
tags: [SDLC, SDL, SBOM, Threat Modeling, Supply Chain]
series: "Embedded Security"
seriesOrder: 10
draft: false
---

## 한 줄 요약

> **"보안은 *마지막에 검사하는 항목*이 아니라 *처음부터 끝까지 따라가는 프로세스*입니다."** — 출시 직전에 pen test 한 번 받고 마무리하는 것이 가장 흔하고 가장 비싼 실수입니다. 보안은 요구사항·설계·구현·검증·배포·운영의 *모든 단계*에 분산됩니다.

이 시리즈의 마지막 장입니다. 앞에서 다룬 *기술적 도구*들이 *어떤 프로세스 안에서 쓰여야 의미가 있는지*를 정리합니다. 같은 secure boot, 같은 OTA, 같은 TLS라도 *threat model 없이 만든 것*과 *threat model을 따라 만든 것*은 보안 수준이 다릅니다.

이 장에서는 Microsoft SDL을 뼈대로, OWASP IoT Top 10과 SAMM을 보조 참고로 두고, *임베디드에 특화된* 보안 SDLC를 그립니다. 그리고 시리즈 전체를 돌아보며 다음 학습 경로를 추천합니다.

## 보안 SDLC의 7단계

**1. Training / Education          → 팀 전체의 보안 역량**


**2. Requirements                  → 보안 요구사항 정의 (Ch 8 표준 + 위협)**


**3. Design                        → Threat Modeling (Ch 1 재방문)**


**4. Implementation                → secure coding, static analysis**


**5. Verification                  → fuzzing, code review, pen test (Ch 9)**


**6. Release                       → final security review, SBOM**


**7. Response / Operations         → vuln disclosure, patch, sunset**

Microsoft SDL의 12개 practice를 7단계로 묶은 것입니다. 각 단계에 *명시적 산출물*이 있어야 합니다. *체크리스트 없는 단계는 안 한 것과 같습니다*.

## 1. Training — 팀 역량

보안 사고의 *대부분은 작은 코딩 실수*입니다. `strcpy`, `memcpy`의 잘못된 사용, `system(user_input)`, 평문 비교, 부족한 입력 검증. 이 모든 것이 *코드를 쓴 엔지니어가 그 위험을 몰랐을 때* 들어갑니다.

| 역할 | 최소 training |
|------|--------------|
| 모든 엔지니어 | OWASP Top 10, CWE Top 25, secure coding 기본 |
| Architect | Threat modeling (STRIDE/DREAD), 표준 (Ch 8) |
| Implementation lead | Static analysis tooling, supply chain |
| QA / Test lead | Fuzzing, pen test methodology |
| Operations | Vuln disclosure, incident response |

연간 *최소 4시간 갱신*이 Microsoft SDL의 기준선입니다. 짧지만 *없으면 차이가 큽니다*.

## 2. Requirements — 보안 요구의 명시

[Ch 8 표준](/blog/embedded/embedded-security/chapter08-iot-standards)에서 본 ETSI/NIST/CRA 요구를 *제품 요구사항*에 명시적으로 들이는 단계입니다.

```text
Security Requirements (예: 산업용 IoT 게이트웨이)

SR-01  No default credentials                       (ETSI 5.1)
SR-02  Signed firmware update only                  (ETSI 5.3, 5.7)
SR-03  TLS 1.3, server certificate pinning          (ETSI 5.5)
SR-04  Secure element for key storage               (ETSI 5.4)
SR-05  Secure boot from BootROM                     (ETSI 5.7)
SR-06  Logical access control on all interfaces     (NIST IR 8259)
SR-07  Telemetry log retention 30 days              (NIST IR 8259)
SR-08  Vuln disclosure email + ENISA 24h reporting  (EU CRA)
SR-09  5-year support period                        (EU CRA)
SR-10  SBOM (CycloneDX 1.5)                         (EU CRA, NTIA)
```

각 SR이 *측정 가능한 acceptance criteria*를 가져야 합니다. "Secure communication"이 아니라 "TLS 1.3, with cipher suite limited to TLS_AES_128_GCM_SHA256 and TLS_CHACHA20_POLY1305_SHA256, and server certificate pinning to ACME Root CA G2"가 SR입니다.

## 3. Design — Threat Modeling 재방문

[Ch 1: Threat Model](/blog/embedded/embedded-security/chapter01-threat-model)에서 다룬 STRIDE를 *설계 산출물 옆에* 두는 단계입니다.

### STRIDE 매핑 예 — OTA 컴포넌트

| Threat | 시나리오 | Mitigation |
|--------|---------|----------|
| Spoofing | 가짜 update 서버가 펌웨어 제공 | TLS + cert pinning + 이미지 서명 |
| Tampering | MITM이 이미지 일부 변경 | 이미지 서명, hash verify |
| Repudiation | 디바이스가 어떤 펌웨어를 받았는지 부인 | 서버 측 audit log + device-side log |
| Information disclosure | 펌웨어 자체 노출 | 채널 암호화 (그러나 핵심 방어는 아님) |
| Denial of service | 무한 OTA 시도 | bootcount 제한, exponential backoff |
| Elevation of privilege | 권한 없는 이미지가 설치됨 | secure boot, rollback counter |

각 mitigation이 *코드의 어디서 처리되는지* 추적 가능해야 합니다. design review에서 *위 표가 채워지지 않은 자리*가 *보안 갭*입니다.

### Microsoft Threat Modeling Tool / OWASP Threat Dragon

자동화 도구가 도움 됩니다. 데이터 흐름 다이어그램(DFD)을 그리면 *trust boundary 별 위협 후보*를 자동 제안합니다. 임베디드는 *Threat Dragon*(오픈소스)이 작은 팀에 적합합니다.

## 4. Implementation — secure coding + 자동 검사

### 언어 표준 + static analysis

C/C++ 임베디드에서 *반드시* 따라야 할 자리입니다.

| 도구 | 영역 |
|------|------|
| MISRA C / MISRA C++ | 자동차·기능 안전 (코딩 규칙) |
| CERT C / CERT C++ | 보안 중심 (Carnegie Mellon) |
| Clang-Tidy + Clang Static Analyzer | 일상 CI 통합 |
| cppcheck | 가벼운 정적 분석 |
| Coverity / CodeSonar / Klocwork | 상용, 깊이 있는 분석 |
| Polyspace | abstract interpretation, 자동차 표준 |
| semgrep | 패턴 기반, 빠르고 자동화 좋음 |

CI에 *최소* clang-tidy + cppcheck + semgrep을 묶고, *블로커 룰*을 정의합니다. [Embedded Automotive — CERT C](/blog/embedded/automotive/cert-c/00-overview)와 [MISRA C](/blog/embedded/automotive/misra-c/00-overview)가 임베디드 C에 가장 직접적입니다.

### Compiler hardening

같은 코드를 *컴파일러가 더 안전하게 빌드*하도록 옵션을 강제합니다.

**공통:**

- -Wall -Wextra -Wformat=2 -Wconversion -Werror
- -fstack-protector-strong
- -fno-strict-aliasing
- -fno-common
- -D_FORTIFY_SOURCE=2

**위치 독립:**

- -fPIC / -fPIE -pie

**스택·heap:**

- -ftrapv (signed overflow trap)
- -fcf-protection=full (Intel CET / ARM BTI)

**링커:**

- -Wl,-z,relro -Wl,-z,now -Wl,-z,noexecstack

`-Werror`로 *경고를 빌드 실패로* 만드는 것이 가장 큰 효과를 가집니다. 안 그러면 1년 뒤 *경고 1000개* 상황이 옵니다.

### 흔한 패턴 — 안전한 대안

```c
// Bad
strcpy(dst, src);
sprintf(buf, "%s/%s", dir, file);
memcpy(dst, src, len);

// Good
strlcpy(dst, src, sizeof(dst));         // BSD / wrap이 표준 C에는 없음
snprintf(buf, sizeof(buf), "%s/%s", dir, file);
if (len > sizeof(dst)) return ERR;
memcpy(dst, src, len);

// Even better — safer wrappers
result_t copy_string(char *dst, size_t dst_size, const char *src);
result_t format_path(char *dst, size_t dst_size, const char *dir, const char *file);
```

C++라면 `std::string_view`, `std::span`, `gsl::span`이 큰 도움이 됩니다.

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

Pen test는 *완성된 제품에 외부 시선*을 한 번 거치는 단계입니다. 1주 정도의 *블랙박스* 또는 *그레이박스* 평가가 기본입니다. 처음 받으면 *수십 건의 finding*이 나오는 것이 일반적이므로, 시간 여유(보통 *출시 2~3개월 전*)를 두고 받습니다.

### OWASP IoT Top 10 (2018, 여전히 유효)

```text
I1  Weak, Guessable, or Hardcoded Passwords
I2  Insecure Network Services
I3  Insecure Ecosystem Interfaces (web/cloud/mobile)
I4  Lack of Secure Update Mechanism
I5  Use of Insecure or Outdated Components
I6  Insufficient Privacy Protection
I7  Insecure Data Transfer and Storage
I8  Lack of Device Management
I9  Insecure Default Settings
I10 Lack of Physical Hardening
```

Pen test 시나리오가 이 10개를 *적어도 한 번씩* 시험하면 표준 커버리지에 가깝습니다.

## 6. Release — SBOM + final review

### Software Bill of Materials (SBOM)

EU CRA·미국 EO 14028 모두가 *SBOM 의무*를 도입했습니다. *제품에 들어간 모든 컴포넌트의 목록*을 release마다 제출합니다.

표준은 두 가지입니다.

| 형식 | 유래 | 비고 |
|------|-----|------|
| **SPDX 3.0** | Linux Foundation | 라이선스 관리에 강점 |
| **CycloneDX 1.5** | OWASP | 보안·VEX·취약점 추적에 강점 |

도구로 자동 생성합니다.

```bash
# Yocto
bitbake -c create_spdx core-image-minimal
# 또는
syft packages dir:./build/tmp/deploy/images/qemux86-64/ -o cyclonedx-json

# 컨테이너
syft packages docker:our-image:latest -o spdx-json

# Buildroot
make legal-info
```

생성된 SBOM은 *서명*해서 OTA 이미지와 함께 배포합니다. 새 CVE가 공개되면, 영향받는 디바이스를 *SBOM grep만으로* 식별할 수 있어야 합니다.

### VEX (Vulnerability Exploitability eXchange)

CycloneDX 1.4부터 VEX를 함께 발행할 수 있습니다. "*우리 제품에 이 CVE의 영향 받는 컴포넌트가 들어 있지만, 사용 방식상 exploitable 하지 않음*"을 *기계가 읽을 수 있게* 표명하는 형식입니다.

```json
{
  "vulnerabilities": [
    {
      "id": "CVE-2024-12345",
      "source": { "name": "NVD" },
      "ratings": [{ "severity": "high" }],
      "analysis": {
        "state": "not_affected",
        "justification": "code_not_reachable",
        "detail": "Vulnerable function is not called in our build configuration"
      }
    }
  ]
}
```

VEX 없이 SBOM만 발행하면 *모든 CVE에 영향받는 것처럼 보이는* 자리가 생깁니다. EU CRA 24시간 보고 의무를 합리적으로 관리하려면 VEX가 거의 필수입니다.

### Supply chain — SLSA + Sigstore

빌드 자체의 *공급망 무결성*입니다.

```text
SLSA Level 1  : 빌드가 자동화, 출처 명시
SLSA Level 2  : 호스팅된 빌드 시스템, 서명된 provenance
SLSA Level 3  : non-falsifiable provenance, isolated builds
SLSA Level 4  : 두 명이 review, hermetic + reproducible builds
```

대부분의 임베디드 팀이 *Level 2~3*를 목표로 합니다. *GitHub Actions + cosign* 조합이 가장 흔합니다.

```bash
# 빌드 산출물에 서명
cosign sign-blob --key cosign.key firmware.bin > firmware.bin.sig

# 검증
cosign verify-blob --key cosign.pub --signature firmware.bin.sig firmware.bin
```

Sigstore의 *keyless 서명*(OIDC 기반)은 키 회전 부담을 줄여 줍니다.

## 7. Response — 운영 단계의 보안

### Vulnerability disclosure

[ETSI 5.2](/blog/embedded/embedded-security/chapter08-iot-standards)가 요구하는 자리입니다. *최소* 다음 셋이 공개되어야 합니다.

**1. security.txt        : 표준 위치에 보안 연락처**

- https://example.com/.well-known/security.txt

**2. 응대 SLA            : 영업일 N일 이내 첫 응답**


**3. 처리 정책           : coordinated disclosure 기간 (보통 90일)**

`security.txt` 예:

```text
Contact: security@example.com
Encryption: https://example.com/pgp-key.txt
Acknowledgments: https://example.com/security/hall-of-fame
Preferred-Languages: en, ko
Policy: https://example.com/security/policy
Expires: 2027-12-31T23:59:59Z
```

### Incident response — 24시간 보고

EU CRA는 *actively exploited vulnerability를 알게 된 후 24시간 이내*에 ENISA에 보고를 요구합니다. 다음 흐름이 권장됩니다.

```text
T+0h   : 보안 연구자/사용자/CERT가 vuln 보고
T+0h   : security@ 메일이 자동으로 SOC ticket 생성
T+1h   : 트리아주 회의 (영향 범위, exploitability)
T+4h   : Active exploit 확인 시 → CRA 24h timer 시작
T+24h  : ENISA + 영향 국가 CERT에 1차 보고
T+72h  : Public CVE 등록 (또는 vendor-internal 추적)
T+30d  : 패치 개발 + QA
T+90d  : 패치 OTA 배포 + public advisory
```

*리허설*이 필요합니다. 처음 받는 보고가 *진짜 incident*이면 보통 절차를 따라가지 못합니다. 분기에 한 번 *table-top exercise*를 권장합니다.

### CVE / CWE / OSV — 추적

| 데이터베이스 | 용도 |
|------------|------|
| CVE (cve.org) | 공개 취약점 ID |
| NVD | CVE + CVSS 점수 + CWE 매핑 |
| OSV.dev | 오픈소스 패키지 단위 vuln |
| GitHub Advisory DB | GitHub 호스팅 프로젝트 |
| KISA CVE 한글 | 한국어 요약 |

SBOM과 결합해 *우리 제품에 영향 있는 새 CVE를 자동 알림*하는 흐름이 표준입니다. `osv-scanner`, `grype`, `trivy`가 무료 옵션입니다.

```bash
osv-scanner --sbom=firmware.cdx.json
```

### Sunset — 지원 종료

[ETSI 5.3](/blog/embedded/embedded-security/chapter08-iot-standards) / EU CRA가 요구하는 *최소 지원 기간*이 끝나면, *지원 종료를 사용자에게 명시 공지*합니다. 공지 없이 슬쩍 끝내는 것이 *그 자체로* 위반입니다.

## 시리즈 마무리 — 학습 경로

이 시리즈에서 다룬 10개 장이 *임베디드 보안의 윤곽*입니다. 깊게 들어가려면 다음 경로를 권장합니다.

### 책

- *Practical IoT Hacking* (Chantzis, Stais 외, 2021) — 실전 분석 중심
- *Embedded Systems Security* (Kleidermacher, Kleidermacher, 2012) — 고전이지만 여전히 유효
- *Hardware Security: A Hands-on Learning Approach* (Bhunia, Tehranipoor, 2018) — 학부 교재
- *The Hardware Hacking Handbook* (Woudenberg, O'Flynn, 2021) — ChipWhisperer 저자
- *Security Engineering* (Anderson, 3rd ed., 2020) — 분야 전체 조망

### 실습 자원

- *Embedded Security CTF*: 매년 열리는 hardware CTF
- *Hardwear.io* / *Black Hat USA* 임베디드 트랙 — 발표 영상이 좋은 자료
- *MIT 6.858 Computer Systems Security* — 강의 자료 무료
- *OST2 Open Security Training* — 무료 코스, 펌웨어 분석 포함

### 다음 시리즈 — 인접 분야

이 시리즈와 가장 가까운 인접 영역들입니다.

| 시리즈 | 연결점 |
|--------|--------|
| [Embedded Automotive — MISRA C](/blog/embedded/automotive/misra-c/00-overview) | secure coding의 자동차 표준 |
| [Embedded Automotive — CERT C](/blog/embedded/automotive/cert-c/00-overview) | 보안 코딩 규칙 |
| [Embedded Automotive — AUTOSAR Adaptive](/blog/embedded/automotive/autosar-adaptive/00-overview) | 자동차 SOA + 보안 |
| [Aerospace Standards — DO-178C](/blog/embedded/aerospace-standards/do-178c/00-overview) | 항공 기능 안전, DO-326A로 연결 |
| [Aerospace Standards — JSF C++](/blog/embedded/aerospace-standards/jsf-cpp/00-overview) | safety-critical C++ |
| [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm) | RTOS와 secure world |
| [Buildroot Practical](/blog/embedded/buildroot/chapter01-buildroot-philosophy) | Linux 임베디드 빌드와 SBOM |

자동차·항공은 *기능 안전*(safety)과 *보안*(security)이 만나는 자리입니다. 이 시리즈의 보안 위에 *안전*을 더하면 산업급 임베디드 시스템 엔지니어링이 완성됩니다.

## 자주 하는 실수

### 출시 직전 한 번의 pen test로 마무리

발견된 *수십 건의 finding* 중 *설계 결함*은 출시 일정 안에 못 고칩니다. *threat model을 설계 단계에서* 했다면 대부분 미리 잡혔을 것입니다.

### SBOM을 한 번 만들고 갱신 안 함

SBOM은 *매 release마다* 자동 생성되어야 합니다. CI 통합 필수.

### 보안 사고를 비공개로 처리

법적·평판 손실이 더 큽니다. *coordinated disclosure*가 표준이고, 보고자에게 인정(*hall of fame*)을 주는 문화가 장기적으로 이득입니다.

### vuln disclosure 이메일을 일반 support 메일과 같이 운영

보안 보고가 일반 문의에 묻혀 *N주 동안 미응답*인 경우가 흔합니다. 별도 *security@*과 *별도 SOC 큐*가 필요합니다.

### 지원 기간 종료를 조용히

ETSI/CRA 위반입니다. *명시 공지*가 의무.

### "한국 시장만 보면 CRA 무관"

한국 제조사가 *EU에 수출하지 않더라도*, *글로벌 supply chain*에 들어가면 *고객사를 통해* CRA 의무가 흘러들어옵니다. 미리 준비하는 것이 비용 절감입니다.

## 정리

- 보안은 *마지막 검사*가 아니라 *전 단계의 프로세스*입니다.
- 7단계: training → requirements → design → implementation → verification → release → response.
- Threat modeling은 *설계 산출물 옆에* 있어야 의미가 있습니다.
- Compiler hardening, static analysis, fuzzing을 *CI에 기본 통합*합니다.
- SBOM은 EU CRA 의무이며 VEX와 함께 발행하는 것이 표준입니다.
- Supply chain은 SLSA + Sigstore로 무결성을 관리합니다.
- Vulnerability disclosure 절차와 24시간 보고는 *리허설*이 필요합니다.
- 지원 종료는 *명시 공지*가 의무입니다.

이로써 Embedded Security 시리즈를 마칩니다. 이 시리즈가 *우리 제품을 우리가 먼저 점검할* 능력을 키우는 출발점이 되기를 바랍니다. 다음 학습 자원과 인접 시리즈를 참고해 더 깊은 영역으로 이어가시면 좋습니다.

## 관련 항목

- [Ch 1: Threat Model](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 8: IoT 표준](/blog/embedded/embedded-security/chapter08-iot-standards)
- [Ch 9: 펌웨어 분석 / 리버싱](/blog/embedded/embedded-security/chapter09-firmware-analysis)
- [Embedded Automotive — MISRA C 시리즈](/blog/embedded/automotive/misra-c/00-overview)
- [Embedded Automotive — CERT C 시리즈](/blog/embedded/automotive/cert-c/00-overview)
- [Aerospace Standards — DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/00-overview)
- [Practical RTOS Internals — TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [원문 — Microsoft Security Development Lifecycle](https://www.microsoft.com/en-us/securityengineering/sdl)
- [원문 — OWASP SAMM](https://owaspsamm.org/)
- [원문 — OWASP IoT Top 10](https://owasp.org/www-project-internet-of-things/)
- [원문 — CycloneDX](https://cyclonedx.org/)
- [원문 — SPDX](https://spdx.dev/)
- [원문 — SLSA](https://slsa.dev/)
- [원문 — Sigstore](https://www.sigstore.dev/)
- [원문 — OSV.dev](https://osv.dev/)
