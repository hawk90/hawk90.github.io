---
title: "Ch 13: Helix QAC 깊이 — 프로젝트 setup, suppression, CI 통합"
date: 2026-05-18T14:00:00
description: "Helix QAC 2024 실전 설정 — .prj 구조, RCMA 룰 셋, suppression 문법, GitLab/Jenkins CI, baseline 관리, reporting."
tags: [misra, c, helix-qac, prqa, ci, static-analysis, gitlab, suppression]
series: "MISRA C"
seriesOrder: 13
draft: false
---

10장이 도구 목록을 봤다면, 이 장은 *가장 많이 쓰이는 도구인 Helix QAC*의 *실전 설정 깊이*를 본다. 빈 프로젝트에서 *완전한 CI 통합*까지 단계별로.

## Helix QAC 개요

| 항목 | 값 |
|------|-----|
| 회사 | Perforce (구 Programming Research Ltd, PRQA) |
| 버전 (2024 기준) | 2024.1 / 2024.2 |
| 지원 표준 | MISRA C:2012/Amendment 4, MISRA C++:2008/2023, AUTOSAR C++14, CERT C/C++, JSF C++, HIC++ |
| 가격 | 좌석당 *연 수천 달러* — 정확한 가격은 sales 문의 |
| 라이선스 | floating, named, evaluation |
| 통합 | CLI, Jenkins, GitLab, Bamboo, Bitbucket, GitHub, Eclipse, VS Code |

## 프로젝트 구조

QAC 프로젝트는 *.prj* 파일과 일련의 *컴포넌트*로 구성.

```text
project_root/
├── helix-qac/
│   ├── EPB_ECU.prj
│   ├── compilers/
│   │   └── gcc12-arm.qcs
│   ├── rules/
│   │   ├── misra2012.rcc
│   │   ├── project_policy.rcc
│   │   └── advisory_promotion.rcc
│   ├── suppressions/
│   │   └── permit_files.scl
│   ├── baseline/
│   │   └── 2024-06-baseline.qaf
│   └── reports/
└── src/
    ├── drivers/
    ├── app/
    └── tests/
```

각 파일의 역할:

| 경로 | 역할 |
|------|------|
| `EPB_ECU.prj` | 메인 프로젝트 |
| `compilers/gcc12-arm.qcs` | Compiler specification |
| `rules/misra2012.rcc` | Rule Configuration |
| `rules/project_policy.rcc` | 프로젝트 정책 |
| `rules/advisory_promotion.rcc` | Advisory → Required 격상 |
| `suppressions/permit_files.scl` | Permit 기반 suppression |
| `baseline/2024-06-baseline.qaf` | Approved baseline |
| `reports/` | 생성된 리포트들 |

## 1. Compiler Specification (.qcs)

QAC가 *어떤 컴파일러*로 *어떤 옵션*으로 컴파일되는 코드를 분석할지 정의.

```ini
# compilers/gcc12-arm.qcs

compiler_name = gcc
compiler_path = arm-none-eabi-gcc
compiler_version = 12.2.1

# 표준 헤더 검색 경로
include_path = /opt/arm-none-eabi/arm-none-eabi/include
include_path = /opt/arm-none-eabi/lib/gcc/arm-none-eabi/12.2.1/include

# 매크로 정의
define = __GNUC__=12
define = __STDC_VERSION__=199901L
define = __thumb__
define = STM32F767xx

# 컴파일러별 기본 동작 (Dir 1.1)
char_signedness = unsigned
int_size = 32
long_size = 32
long_long_size = 64
pointer_size = 32
sizeof_size_t = 32
endianness = little
```

이 정보로 QAC가 *해당 컴파일러의 implementation-defined 동작을 정확히 모델링*. char가 signed인 환경과 unsigned인 환경에서 *분석 결과가 다르다*.

## 2. Rule Configuration (.rcc)

어떤 규칙을 적용할지, 어떤 severity로 다룰지.

```yaml
# rules/misra2012.rcc

baseline_compliance: MISRA-C:2012 Amendment 4

# Mandatory 규칙 — error로 처리
rule "9.1":
  severity: error
  message_id: 1062
  description: "자동 변수 미초기화"

rule "13.6":
  severity: error
  message_id: 0432

# Required 규칙 — warning
rule_class "Required":
  default_severity: warning

# Advisory — info (또는 무시)
rule_class "Advisory":
  default_severity: info

# 프로젝트 정책: Advisory → Required 격상
rule "5.9":
  severity: warning
  reason: "Project policy PR-5.9: internal linkage 식별자 고유"

rule "11.5":
  severity: warning
  reason: "Project policy PR-11.5"

rule "15.5":
  severity: warning
  reason: "Project policy PR-15.5: single exit"
```

## 3. Project Configuration (.prj)

```xml
<!-- EPB_ECU.prj -->
<helix_qac_project version="2024.2">
  <name>EPB ECU</name>
  <description>Electric Parking Brake ECU - ASIL D</description>

  <compiler_spec>compilers/gcc12-arm.qcs</compiler_spec>

  <source_paths>
    <path>../src/drivers/</path>
    <path>../src/app/</path>
  </source_paths>

  <exclude_paths>
    <path>../src/third_party/</path>
    <path>../src/tests/</path>
  </exclude_paths>

  <rule_config>rules/misra2012.rcc</rule_config>
  <rule_config>rules/project_policy.rcc</rule_config>

  <suppression>suppressions/permit_files.scl</suppression>

  <output_dir>reports/</output_dir>

  <analysis_options>
    <option name="parser" value="strict_c99"/>
    <option name="cross_module" value="true"/>
    <option name="memory_limit" value="8192"/>      <!-- MB -->
    <option name="parallel_workers" value="8"/>
  </analysis_options>

  <reporting>
    <report type="cdb" output="reports/cdb.json"/>
    <report type="html" output="reports/report.html"/>
    <report type="xml" output="reports/results.xml"/>
    <report type="junit" output="reports/junit.xml"/>
    <report type="sonarqube" output="reports/sonarqube.json"/>
    <report type="compliance_matrix" output="reports/matrix.html"/>
  </reporting>
</helix_qac_project>
```

## 4. Suppression Cascade (.scl)

핵심 — 어떻게 *false positive와 정당 deviation*을 표현하는가.

### 글로벌 suppression

```scl
# suppressions/permit_files.scl

# Permit P-DIV-1: 0 나눗셈 Dir 4.1 deviation
suppress rule_id "0494" {
    reason: "P-DIV-1: divisor verified nonzero at input boundary"
    files: src/dsp/*.c
    annotation_required: true   # 코드 안 주석 필수
}

# Permit P-MMI-1: MMIO 포인터 캐스트 Rule 11.4
suppress rule_id "0303" {
    reason: "P-MMI-1: MMIO 고정 주소"
    files: src/drivers/mmio.c, src/drivers/*_reg.c
    annotation_required: true
}

# Permit P-LOG-1: printf 디버그 빌드만 (Rule 21.6)
suppress rule_id "5118" {
    reason: "P-LOG-1: debug log 매크로 wrapper"
    files: src/debug/log.c
    annotation_required: true
    expires: "2025-12-31"
}
```

### 라인별 suppression

코드에서 직접:

```c
// drivers/mmio.c

/* PRQA S 0303 # MISRA 11.4 deviation under P-MMI-1
 * MMIO 고정 주소. Ref: DR-MMI-007 */
volatile uint32_t *dma_base = (uint32_t *)0x40020000U;
```

`/* PRQA S NNNN ## ... */` 문법:
- `S` = Suppress 이 줄
- `NNNN` = QAC 규칙 ID
- `#` = inline 주석
- `##` = 영구 suppression
- 추가 옵션: `START`, `STOP`, `BLOCK`

### 블록 suppression

```c
/* PRQA S 0303 BLOCK 5 # MMIO 영역 — 다음 5줄에 적용 */
volatile uint32_t *dma_base = (uint32_t *)0x40020000U;
volatile uint32_t *can_base = (uint32_t *)0x40006400U;
volatile uint32_t *spi_base = (uint32_t *)0x40013000U;
volatile uint32_t *uart_base = (uint32_t *)0x40011000U;
volatile uint32_t *adc_base = (uint32_t *)0x40012000U;
```

### 함수 suppression

```c
/* PRQA S 3206 # PR-001: 7 인자 한계 deviation */
void Configure(int p1, int p2, int p3, int p4, int p5, int p6, int p7, int p8) {
    /* ... */
}
```

## 5. Build & Analyze 명령어

```bash
# 단순 분석
qac.exe -prj helix-qac/EPB_ECU.prj

# 출력 디렉토리 명시
qac.exe -prj helix-qac/EPB_ECU.prj -output-dir reports/2024-06-12

# 변경 파일만 (incremental)
qac.exe -prj helix-qac/EPB_ECU.prj -files-changed

# 특정 컴포넌트만
qac.exe -prj helix-qac/EPB_ECU.prj -files src/dsp/filter.c

# Baseline 비교 모드
qac.exe -prj helix-qac/EPB_ECU.prj -baseline baseline/2024-06-baseline.qaf
```

## 6. Baseline Management

ASIL D 프로젝트의 핵심. *기존 알려진 위반*은 baseline에 등록, *새로 도입되는 위반*만 빌드 실패시킨다.

```bash
# 현재 상태를 baseline으로 저장
qac.exe -prj EPB_ECU.prj -save-baseline baseline/2024-06-12.qaf

# 다음 빌드는 baseline 대비 차이만 보고
qac.exe -prj EPB_ECU.prj -baseline baseline/2024-06-12.qaf -new-only
```

CI 파이프라인에서:

```yaml
# 첫 빌드 — baseline 저장
- script:
  - qac.exe -prj EPB_ECU.prj
  - qac.exe -prj EPB_ECU.prj -save-baseline artifacts/baseline.qaf

# 후속 빌드 — baseline 대비 검사
- script:
  - qac.exe -prj EPB_ECU.prj -baseline /shared/baseline.qaf -new-only
  - if [ $? -ne 0 ]; then fail; fi
```

Baseline 자체를 *git에 commit*하지 마라 (binary blob). *CI 아티팩트*로.

## 7. CDB (Compilation Database)

CMake/clang 호환 *compile_commands.json* 으로부터 자동 설정:

```bash
# CMake에서 CDB 생성
cd build/
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..

# QAC가 그것을 사용
qac.exe -import-cdb build/compile_commands.json -prj EPB_ECU.prj
```

각 파일이 *어떤 옵션, 어떤 매크로, 어떤 include path*로 컴파일되는지 자동 학습.

## 8. GitLab CI 통합

```yaml
# .gitlab-ci.yml

stages:
  - build
  - analyze
  - report

variables:
  QAC_PRJ: helix-qac/EPB_ECU.prj
  QAC_BASELINE_URL: https://artifacts/baselines/main.qaf

build:
  stage: build
  script:
    - mkdir build && cd build
    - cmake -DCMAKE_BUILD_TYPE=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..
    - make -j$(nproc)
  artifacts:
    paths:
      - build/

misra_check:
  stage: analyze
  needs: ["build"]
  before_script:
    - wget -O baseline.qaf "$QAC_BASELINE_URL"
  script:
    - qac.exe -prj $QAC_PRJ -import-cdb build/compile_commands.json
    - qac.exe -prj $QAC_PRJ -baseline baseline.qaf -new-only -fail-on-new
  artifacts:
    when: always
    reports:
      junit: helix-qac/reports/junit.xml
      sonarqube: helix-qac/reports/sonarqube.json
    paths:
      - helix-qac/reports/
    expire_in: 90 days

baseline_update:
  stage: report
  needs: ["misra_check"]
  only:
    - main
  script:
    - qac.exe -prj $QAC_PRJ -save-baseline baseline.qaf
    - curl -X PUT -F file=@baseline.qaf $QAC_BASELINE_URL
  when: manual

compliance_report:
  stage: report
  needs: ["misra_check"]
  script:
    - qac.exe -prj $QAC_PRJ -generate-compliance-matrix
    - cp helix-qac/reports/matrix.html public/
  artifacts:
    paths:
      - public/
  only:
    - main
```

핵심:
- *Baseline은 main 브랜치에만 업데이트*. PR은 *baseline 대비 검사*.
- `-fail-on-new`로 *새 위반 도입 시 빌드 실패*.
- *Compliance matrix*를 *public artifact*로 — 심사관 접근 가능.

## 9. Jenkins 파이프라인

```groovy
// Jenkinsfile
pipeline {
    agent { label 'helix-qac' }

    parameters {
        booleanParam(name: 'UPDATE_BASELINE', defaultValue: false)
    }

    stages {
        stage('Build') {
            steps {
                sh '''
                    cmake -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
                    cmake --build build -j$(nproc)
                '''
            }
        }

        stage('MISRA Analysis') {
            steps {
                sh '''
                    qac.exe -prj helix-qac/EPB_ECU.prj \
                        -import-cdb build/compile_commands.json \
                        -baseline baselines/main.qaf \
                        -new-only \
                        -fail-on-new
                '''
            }
            post {
                always {
                    publishHTML(target: [
                        reportDir: 'helix-qac/reports',
                        reportFiles: 'report.html',
                        reportName: 'MISRA Report'
                    ])
                    junit 'helix-qac/reports/junit.xml'
                }
            }
        }

        stage('Update Baseline') {
            when {
                allOf {
                    branch 'main'
                    expression { params.UPDATE_BASELINE }
                }
            }
            steps {
                sh '''
                    qac.exe -prj helix-qac/EPB_ECU.prj \
                        -save-baseline baselines/main.qaf
                    git add baselines/main.qaf
                    git commit -m "chore: update QAC baseline"
                    git push origin main
                '''
            }
        }
    }
}
```

## 10. False Positive 처리

QAC가 *분명히 false positive*인 경고를 낼 때.

### Step 1 — Tool에 보고

```
Perforce Support → "Rule X false positive"
sample code, expected behavior, observed warning 첨부
```

### Step 2 — Custom Help text

```c
/* PRQA S 0314 # FALSE POSITIVE — QAC2024-FP-001
 * Rule 10.6: x = (int)y 형태. y가 int 범위 안임을 컴파일러가 검증.
 * 보고: SUPPORT-2024-08-12 */
int x = (int)y;
```

후속 검토 가능하게 *ticket id 포함*.

### Step 3 — Patch / Workaround

QAC가 fix 제공할 때까지 *suppression 또는 코드 변경*.

## 11. Compliance Matrix 자동 생성

```bash
qac.exe -prj EPB_ECU.prj -generate-compliance-matrix
```

결과 — HTML 표:

```html
<!-- reports/matrix.html -->
<table class="compliance">
  <thead>
    <tr>
      <th>Rule</th>
      <th>Category</th>
      <th>Status</th>
      <th>Suppressed</th>
      <th>New</th>
    </tr>
  </thead>
  <tbody>
    <tr class="compliant">
      <td>9.1</td>
      <td>Mandatory</td>
      <td>Compliant</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr class="deviation">
      <td>21.3</td>
      <td>Required</td>
      <td>Deviation</td>
      <td>3 (P-DYN-1)</td>
      <td>0</td>
    </tr>
    <!-- ... -->
  </tbody>
</table>
```

심사관이 *바로 확인 가능*한 형식.

## 12. 도구 cross-check — QAC + Polyspace

ASIL D 인증에서는 *한 도구만으로 부족*하다는 경우가 많다. QAC + Polyspace 또는 QAC + Coverity 조합.

```bash
# QAC 결과
qac.exe -prj EPB_ECU.prj -output-dir reports/qac

# Polyspace 결과
polyspace-bug-finder -sources-list-file sources.lst -results-dir reports/polyspace

# 결과 비교
python3 scripts/cross_check.py reports/qac reports/polyspace > diff_report.txt
```

`cross_check.py`는 *각 도구가 어느 규칙을 어떻게 검출*했는지 비교. 차이가 있으면 *심사관에게 설명할 자료*.

**Cross-Check Report 예시:**

| 분류 | 건수 |
|------|------|
| Rules detected by QAC only | 12 |
| Rules detected by Polyspace only | 8 |
| Rules detected by both | 187 |
| Rules detected by neither | 0 |

분석:

- QAC-only — 대부분 형식 규칙 (식별자, comment). Polyspace는 metric이 부족.
- Polyspace-only — 대부분 path-sensitive (UB 검출). QAC는 static 한계.
- 결론 — 두 도구가 *상호 보완*. 단독 사용 부족.

## 13. 성능 — 분석 시간

| 코드베이스 | 분석 시간 | 메모리 |
|----------|---------|-------|
| 10KLoC | < 1분 | 1GB |
| 100KLoC | 5~10분 | 4GB |
| 1MLoC | 30분~1시간 | 16GB |
| 5MLoC (Linux kernel급) | 4~6시간 | 64GB |

`-parallel-workers N`로 *코어 수 활용*. CI 머신은 *큰 메모리* 권장.

Incremental 분석은 *변경 파일만* — 보통 *1분 미만*.

## 14. 일반적인 함정

### 함정 1 — 헤더 변경 시 전체 재분석

```bash
# 헤더만 바꾸면 그 헤더를 include하는 *모든 파일*을 재분석.
# Incremental 안전한 변경: .c 파일만 수정
```

### 함정 2 — Macro 의존

```c
#ifdef DEBUG
    log_message();
#endif
```

DEBUG 정의 여부에 따라 *분석 결과가 다르다*. 컴파일러 spec에 *모든 매크로 정의 명시* 필수.

### 함정 3 — Include path 누락

QAC가 *어떤 헤더*를 찾지 못하면 *그 함수를 unknown*으로 처리. False positive 증가.

```bash
# 모든 include path 추가
qac.exe -prj EPB_ECU.prj -include-path /opt/arm/include -include-path src/include
```

### 함정 4 — `static` 함수 분석

`static` 함수는 *해당 컴파일 단위*만 본다. QAC도 *기본적으로 single-TU*. *cross-module 분석* 활성화 필요.

```xml
<analysis_options>
  <option name="cross_module" value="true"/>
</analysis_options>
```

### 함정 5 — Templates 없는 C에서 macro expansion

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x = MAX(i++, j);    // i++가 두 번 평가 — Rule 13.3, 13.4
```

QAC는 *매크로 expansion 후 분석*하므로 검출. 코드에서 매크로를 *함수로 대체*하는 것이 더 좋다 (Dir 4.9).

## 15. Suppression 통계 — 권장 한계

프로젝트당 적정 suppression 수 (Total / KLoC):

| 평가 | 값 |
|------|-----|
| 좋음 | < 5 (매우 깨끗) |
| 보통 | 5–15 |
| 주의 | 15–30 |
| 나쁨 | > 30 (suppression 폭주 — 코딩 표준 재검토) |

EPB 프로젝트 예: 85KLoC에 90 deviation = *1.06/KLoC* — 매우 좋음.

## 16. 보고서 — 심사관 입장에서

QAC가 생성한 *모든 보고서*:

1. **HTML Report** — 사람이 읽는 디테일
2. **CSV** — 스프레드시트
3. **XML** — 다른 도구 연동
4. **JUnit** — Jenkins/GitLab CI 통합
5. **SonarQube JSON** — SonarQube 대시보드
6. **Compliance Matrix HTML** — 심사 핵심 산출물
7. **Trend Report** — 시간별 위반 수 추이

심사관은 주로 *Compliance Matrix*와 *Deviation Records*를 본다. 나머지는 *증거 자료*.

## 17. License & Cost

Helix QAC는 *비싸다*.

| 항목 | 비용 |
|------|------|
| Floating License (1 좌석) | $7,000~10,000/year |
| Tool Qualification Kit | $5,000 추가 |
| Training | $2,000~5,000 |
| Multi-seat 할인 | 50명 이상에서 적용 |

대안:

- **Polyspace** — MathWorks. 비슷한 가격.
- **Coverity** — 더 비쌀 수 있음. 대기업 위주.
- **Klocwork** — 비슷한 가격.
- **clang-tidy + Cppcheck** — *무료*. ASIL B 이하 가능, ASIL C/D는 *부족*.

ASIL D 프로젝트는 *상용 도구 가격이 인증 실패 비용*보다 훨씬 싸다.

## 정리

- Helix QAC 프로젝트는 *.prj* + 컴파일러 spec(.qcs) + 규칙(.rcc) + suppression(.scl)으로 구성.
- *Baseline* 관리로 *기존 위반은 유지, 새 위반만 실패*.
- *CI 통합*은 GitLab/Jenkins 모두 지원. JUnit/SonarQube 리포팅.
- *False positive*는 코드 안 suppression + ticket 등록.
- *Cross-check* 도구 (Polyspace 등)로 *심사 신뢰* 확보.
- *Suppression 폭주*는 *코딩 표준 재검토* 신호.
- ASIL D 인증은 *상용 도구 + Qualification Kit*가 사실상 표준.

## 다음 장 예고

14장은 *CERT C와 함께 적용* — MISRA + CERT 동시 적용 시 conflict, 우선순위, 통합 정책.

## 관련 항목

- [Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [Ch 11 — ISO 26262 audit walkthrough](/blog/embedded/automotive/misra-c/chapter11-iso26262-audit-walkthrough)
- [Helix QAC 공식](https://www.perforce.com/products/helix-qac)
- [Helix QAC Documentation](https://help.perforce.com/qac/)
