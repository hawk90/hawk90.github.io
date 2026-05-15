---
title: "Ch 5: Suppression과 실무 운용"
date: 2026-05-15T05:00:00
description: "Valgrind suppression 문법, 외부 라이브러리 우회, Sanitizer와의 분담, CI 통합 실전."
tags: [Valgrind, Suppression, CI, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 5
draft: false
---

## *Suppression이 필요한 이유*

Valgrind를 실제 프로젝트에서 돌리면 *반드시* 만나는 패턴이 있습니다.

```
==12345== Conditional jump or move depends on uninitialised value(s)
==12345==    at 0x4012A3: do_handshake
==12345==    by 0x40128F: OpenSSL_init
==12345==    by 0x401234: main (main.c:10)
```

`OpenSSL_init` 안의 *uninitialized value*. 우리가 OpenSSL을 수정할 수 있나? 못합니다. 외부 라이브러리이기 때문.

이런 보고는 *반드시 발생*하지만, *우리가 고칠 수 없습니다*. 매번 노이즈로 남으면 진짜 우리 코드의 문제를 *놓치기 쉽습니다*.

**Suppression**은 이런 *알려진 false positive*를 *조용히 무시*하는 메커니즘입니다.

---

## Suppression 문법

```
{
   <suppression name>
   <error kind>
   <optional: extra info>
   fun:<function pattern>
   fun:<function pattern>
   ...
   obj:<object/library pattern>
}
```

각 줄의 의미:

### 첫 줄 — 이름

```
{
   IgnoreOpenSSL_HandshakeUninit
   ...
}
```

자유 형식. *우리만 알아보면 됨*. 보통 *무엇을 무시하는지* 설명적으로.

### 두 번째 줄 — 에러 종류

`Memcheck`의 에러 종류:

| 키워드 | 무엇 |
|--------|------|
| `Memcheck:Cond` | Conditional jump on uninitialised value |
| `Memcheck:Value4` | 4바이트 미초기화 값 사용 |
| `Memcheck:Value8` | 8바이트 미초기화 값 사용 |
| `Memcheck:Addr4` | 4바이트 invalid read/write |
| `Memcheck:Addr8` | 8바이트 invalid read/write |
| `Memcheck:Leak` | 메모리 누수 |
| `Memcheck:Free` | 잘못된 free / mismatched free |
| `Memcheck:Overlap` | overlapping memcpy |
| `Memcheck:Param` | system call 인자 (uninit/invalid) |

다른 도구:

| 키워드 | 무엇 |
|--------|------|
| `Helgrind:Race` | 데이터 레이스 |
| `Helgrind:Misc` | 락 오용 등 |
| `Helgrind:LockOrder` | 락 순서 위반 |
| `DRD:Race` | DRD의 데이터 레이스 |
| `DRD:MutexErr` | DRD의 mutex 오류 |
| `DRD:CondErr` | DRD의 condvar 오류 |

### 세 번째 줄 — 추가 옵션 (선택)

`Memcheck:Leak`만 별도 옵션을 받습니다.

```
Memcheck:Leak
match-leak-kinds: definite,indirect,possible,reachable
```

`match-leak-kinds:`로 *어떤 누수 종류*를 무시할지 한정. 보통 `definite,indirect` 정도가 적당.

### 호출 트레이스

```
fun:OpenSSL_init
fun:main
```

`fun:<pattern>` 또는 `obj:<pattern>`. 패턴은 *위에서 아래로* 매칭됩니다(스택 안쪽이 위, 바깥쪽이 아래). 와일드카드 `*`와 `?` 지원.

### 와일드카드와 매칭

```
# 정확히 일치
fun:malloc

# 와일드카드
fun:OpenSSL_*

# 정규식 모양 (limited)
fun:my_*_function

# 라이브러리 이름
obj:/usr/lib/libcrypto*.so*

# 모든 프레임 매칭
...

# 스킵 — 임의의 한 프레임
fun:*
```

`...`은 *0개 이상의 프레임을 임의로 매칭*. `fun:*`은 *정확히 한 프레임 매칭*. 둘은 의미가 다릅니다.

---

## 실전 예시

### 예 1: 외부 라이브러리 누수 무시

```
{
   OpenSSL Leak in libcrypto
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   ...
   obj:*libcrypto*.so*
}
```

`malloc`이 *어느 자리에 있든* 그 위에 `libcrypto`가 끼어 있으면 무시. `...`이 *임의 프레임*을 받아 줍니다.

### 예 2: 특정 함수의 미초기화 무시

```
{
   ThirdParty UninitValue
   Memcheck:Cond
   fun:third_party_function
}
```

`third_party_function` 안에서 발생한 미초기화 경고만 무시. 그 외 자리의 같은 종류 경고는 *정상 보고*.

### 예 3: 시스템 라이브러리 전체 무시

```
{
   GLIBC dl_init
   Memcheck:Cond
   fun:_dl_init
   ...
}
```

glibc의 동적 로더 초기화 자리. *프로세스 시작 시 한 번* 등장하는 알려진 false positive.

### 예 4: pthread 자체의 race

```
{
   pthread internal race
   Helgrind:Race
   ...
   obj:/usr/lib/libpthread*.so*
}
```

pthread 라이브러리 내부의 race 보고를 모두 무시.

---

## Suppression 자동 생성

처음부터 손으로 쓰지 마세요. `--gen-suppressions=all`로 *자동 생성*합니다.

```bash
valgrind --leak-check=full --gen-suppressions=all ./myapp 2>&1 | tee vg.out
```

각 보고서 끝에 *suppression 템플릿*이 같이 출력됩니다.

```
==12345== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12345==    at 0x483977F: malloc
==12345==    by 0x10918A: main (leak.c:5)
==12345==
==12345== {
==12345==    <insert_a_suppression_name_here>
==12345==    Memcheck:Leak
==12345==    match-leak-kinds: definite
==12345==    fun:malloc
==12345==    fun:main
==12345== }
```

이걸 *복사해* `valgrind.supp`에 붙이고:
1. *이름*을 의미 있게 변경.
2. *프레임을 좁히거나 넓힘* (필요에 따라).
3. *와일드카드*로 일반화.

```
{
   IgnoreThirdPartyInit
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   fun:third_party_init
}
```

---

## *너무 넓은* suppression의 위험

```
{
   IgnoreAllMallocFromMain
   Memcheck:Leak
   ...
   fun:main
}
```

이 suppression은 *main을 통과한 모든 누수*를 무시합니다. 우리 코드의 진짜 누수도 사라집니다. **재앙**.

원칙:

1. **가능한 한 좁게**. 특정 함수, 특정 라이브러리, 특정 호출 컨텍스트.
2. **테스트로 검증**. suppression 추가 후 *우리 코드의 알려진 누수가 여전히 잡히는지* 확인.
3. **이름에 이유**. `Ignore_libcrypto_known_init_leak`처럼 *왜 무시하는지* 이름에 담음.

좋은 suppression:

```
{
   libcrypto_OpenSSL_init_known_leak
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   fun:CRYPTO_zalloc
   fun:OPENSSL_init_crypto
}
```

세 프레임 모두 *OpenSSL 내부*. 우리 코드와는 *완전히 분리*. 안전.

---

## *발견된 suppression 통계*

```bash
valgrind --leak-check=full \
         --suppressions=valgrind.supp \
         --gen-suppressions=all \
         ./myapp 2>&1 | tail -20
```

출력 끝에:

```
ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 47 from 12)
```

`suppressed: 47 from 12` = *12종의 suppression*이 *47번 적용됨*. 이 숫자로 *suppression의 영향*을 측정.

너무 많이 적용되면 *우리 코드의 진짜 문제까지 가린 게 아닌지* 점검. `--gen-suppressions=all`로 *각 무시된 사례*를 보고, 의도와 다르면 *suppression을 좁힘*.

---

## *Valgrind 기본 suppression*

Valgrind는 *시스템 라이브러리의 알려진 false positive*에 대한 *기본 suppression*을 가지고 있습니다.

```
/usr/lib/valgrind/default.supp
```

이 파일을 *직접 수정하지 마*세요. 시스템 업데이트로 덮어쓰입니다. 대신 *프로젝트 suppression 파일*을 만들고 `--suppressions=`로 추가.

```bash
valgrind --suppressions=tests/project.supp ./myapp
```

여러 파일도 가능.

```bash
valgrind --suppressions=tests/project.supp \
         --suppressions=tests/openssl.supp \
         --suppressions=tests/glibc.supp \
         ./myapp
```

---

## *Sanitizer와의 분담* — 운영 전략

[Sanitizer](/blog/tools/debugging/sanitizers/chapter01-intro)가 더 빠른데도 Valgrind를 *함께* 운영하는 이유는, 둘의 *닿는 자리가 다르기* 때문입니다.

### 일상 (every PR)

**Sanitizer** — 빠르고 정확. 모든 PR에 ASan + UBSan 빌드.

### 주간/야간

**Valgrind Memcheck** — Sanitizer가 놓친 자리 확인.

특히:
- 외부 라이브러리 내부 누수
- 시스템 호출 인자의 미초기화
- 재컴파일 불가능한 의존성

### 릴리스 전

**Valgrind 전체 매트릭스** — Memcheck + Helgrind/DRD.

### 분담의 *구체적인 자리*

| 자리 | 도구 |
|------|------|
| 일상 메모리 오류 | Sanitizer (ASan) |
| 미초기화 값 (GCC) | Valgrind (Memcheck) ← Sanitizer는 MSan이 Clang only |
| 깊은 누수 분석 (loss record) | Valgrind (Memcheck) |
| 시스템 호출 추적 | Valgrind (모든 도구) |
| 외부 .so 내부 | Valgrind (재컴파일 불필요) |
| 빠른 race 검사 | Sanitizer (TSan) |
| 락 오용 (deadlock potential) | Valgrind (Helgrind) |
| 임베디드·옛 시스템 | Valgrind (컴파일러 무관) |

---

## CI 통합 — 실전 패턴

### GitHub Actions 야간 작업

```yaml
name: Valgrind Nightly

on:
  schedule:
    - cron: '0 2 * * *'    # 매일 02:00 UTC
  workflow_dispatch:

jobs:
  memcheck:
    runs-on: ubuntu-22.04
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - name: Install
        run: sudo apt-get install -y valgrind cmake ninja-build

      - name: Build (Debug)
        run: |
          cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug
          cmake --build build

      - name: Run Memcheck
        run: |
          valgrind --tool=memcheck \
                   --leak-check=full \
                   --show-leak-kinds=definite,indirect \
                   --error-exitcode=1 \
                   --errors-for-leak-kinds=definite,indirect \
                   --suppressions=tests/valgrind.supp \
                   --gen-suppressions=all \
                   --num-callers=30 \
                   --xml=yes \
                   --xml-file=memcheck.xml \
                   ./build/test_runner

      - name: Upload artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: memcheck-results
          path: memcheck.xml

  helgrind:
    runs-on: ubuntu-22.04
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y valgrind cmake ninja-build
      - run: cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug && cmake --build build
      - run: |
          valgrind --tool=helgrind \
                   --error-exitcode=1 \
                   --suppressions=tests/helgrind.supp \
                   --history-level=full \
                   ./build/concurrent_test
```

핵심:

- **`schedule`** — PR마다가 아니라 *야간 cron*. Valgrind는 느리니까.
- **`timeout-minutes: 60`** — Valgrind 빌드의 *상한*. 안 끝나면 실패.
- **`--xml`** — 결과를 *기계 판독 가능*하게. 큰 프로젝트에서 대시보드 통합.
- **`upload-artifact`** — 실패 시 *분석을 위해* XML 저장.

### GitLab CI

```yaml
valgrind:nightly:
  stage: nightly
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
  image: ubuntu:22.04
  timeout: 60m
  before_script:
    - apt-get update
    - apt-get install -y valgrind cmake ninja-build
  script:
    - cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug
    - cmake --build build
    - |
      valgrind --tool=memcheck \
               --leak-check=full \
               --error-exitcode=1 \
               --suppressions=tests/valgrind.supp \
               ./build/test_runner
```

`rules: schedule`로 *스케줄러로 트리거된 빌드*에만 실행.

---

## *최소화된 재현* — Valgrind를 빠르게

Valgrind는 느려서 *큰 시나리오*에 돌리기 어렵습니다. 다음 전략으로 *재현 시간을 줄임*.

### 1. 단위 테스트 격리

```bash
# 100개 테스트 중 하나만
ctest -R "FailingTestName" --output-on-failure
```

문제 있는 *한 테스트만* Valgrind로.

### 2. 가짜 데이터 작게

```c
// 큰 데이터셋 사용 안 함
load_data("small_test_input.csv");   // 10MB 대신 100KB
```

성능 테스트가 아니라 *버그 재현*이 목적. 데이터 크기 줄임.

### 3. 조건 컴파일로 빠른 종료

```c
#ifdef VALGRIND
    process_only_n_requests(10);   // Valgrind에서는 10개만
#else
    process_all_requests();
#endif
```

`VALGRIND` 매크로로 *Valgrind 빌드*만 짧게 도는 시나리오.

### 4. `--track-origins=no` (필요시)

미초기화 추적은 *2~3× 추가 비용*. 디버깅이 필요 없다면 끔.

---

## 시리즈 마무리

Valgrind 시리즈 다섯 챕터를 마칩니다.

| 장 | 주제 |
|----|------|
| Ch 1 | 개요 — Sanitizer와의 보완 관계 |
| Ch 2 | Memcheck 실전 사용 |
| Ch 3 | Leak Report 읽기 |
| Ch 4 | Helgrind와 DRD |
| Ch 5 | Suppression과 실무 운용 |

핵심 사고 정리:

1. **Valgrind는 *재컴파일 없이* 동작**. Sanitizer가 닿지 못하는 자리의 *유일한 도구*.
2. **느리지만 정확**. 일상은 Sanitizer, *깊은 점검*은 Valgrind.
3. **Memcheck = 메모리 + 미초기화**. 누수 보고는 *4종으로 분류*해 우선순위 결정.
4. **Helgrind = 락 추적**, **DRD = vector clock**. 둘은 *서로 다른 강점*. 함께 사용 가능.
5. **Suppression으로 외부 라이브러리 우회**. *최소한으로 좁게* 작성.
6. **CI에서는 *야간 작업***으로. PR마다는 Sanitizer.

도입 권장:

- **즉시**: `valgrind --leak-check=full ./test_runner`를 한 번 돌려 보기.
- **이번 주**: suppression 파일 첫 작성. 외부 라이브러리 무시.
- **이번 달**: CI 야간 작업으로 통합.

[Sanitizer 시리즈](/blog/tools/debugging/sanitizers/chapter01-intro)와 함께 보면 *디버그 도구의 큰 그림*이 완성됩니다. *어디서 무엇을 쓸지* 명확해집니다.

## 참고 자료

- [Valgrind Suppression Format](https://valgrind.org/docs/manual/manual-core.html#manual-core.suppress)
- [Default Suppressions File](https://sourceware.org/git/?p=valgrind.git;a=blob;f=glibc-2.X.supp)
- [Memcheck Manual: Suppressions](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.suppfiles)

## 관련 시리즈

- [Sanitizers](/blog/tools/debugging/sanitizers/chapter01-intro) — 짝을 이루는 도구
- [GDB / LLDB](/blog/tools/gdb-lldb/chapter01-intro-and-install) — 인터랙티브 디버깅
- [perf / flamegraph](/blog/tools/perf-flamegraph/chapter01-perf-overview) — 성능 분석
