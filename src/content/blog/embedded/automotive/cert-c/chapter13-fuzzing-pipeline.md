---
title: "Ch 13: Fuzzing 자동화 파이프라인 — libFuzzer, AFL++, OSS-Fuzz, honggfuzz"
date: 2026-05-18T14:00:00
description: "현대 보안의 *기본 인프라*가 된 fuzzing. coverage-guided 원리, libFuzzer/AFL++/honggfuzz 비교, OSS-Fuzz 통합, CI 파이프라인, corpus 관리."
tags: [cert-c, fuzzing, libfuzzer, afl, oss-fuzz, security, coverage]
series: "CERT C"
seriesOrder: 13
draft: true
---

11장에서 본 CVE들이 *왜 fuzzing으로 잡혔는가*. 이 장은 *fuzzing이 현대 보안의 1차 검출 인프라*가 된 이유와 *실전 구축*을 본다.

## Fuzzing의 원리

**Coverage-guided fuzzing**:

**1. 시드 입력 → 프로그램 실행**


**2. 코드 커버리지 측정 (어느 분기를 실행했나)**


**3. 새 분기를 실행한 입력만 corpus에 보관**


**4. 입력에 *변이*(byte flip, splice, ...) 적용**


**5. 다시 실행 → coverage 측정**


**6. 반복 — 새 분기를 *계속 찾는다***


**7. crash 발견 시 *입력 저장* + 보고**

핵심은 *coverage를 안내자로 삼아* 무작위 입력의 비효율을 깬다는 점.

```
Random fuzzing       :  Crash 발견 약  1주~6개월
Coverage-guided      :  Crash 발견 약  1~24 시간
+ Symbolic execution :  Crash 발견 약   <1시간 (단순 입력)
```

## 도구 비교

| 도구 | 라이선스 | 특징 | 적합 |
|------|---------|------|------|
| **libFuzzer** | Apache 2.0 (LLVM) | In-process, fast, libfuzzer-runtime 링크 | 라이브러리 함수 |
| **AFL++** | Apache 2.0 | Out-of-process, fork-based, 풍부한 mutator | CLI 도구, 큰 바이너리 |
| **honggfuzz** | Apache 2.0 (Google) | 다양한 instrumentation, persistent | 큰 프로젝트, kernel |
| **OSS-Fuzz** | Google 운영 | libFuzzer + AFL + honggfuzz 통합 자동화 | 오픈소스 |
| **syzkaller** | Apache 2.0 (Google) | Kernel-specific (system call) | OS 커널 |
| **WinAFL** | Apache 2.0 | Windows 바이너리 | Windows 코드 |

## libFuzzer — In-process, 가장 빠름

### 코드 작성 — `LLVMFuzzerTestOneInput`

```c
// fuzz_target.c
#include <stdint.h>
#include <stddef.h>
#include "parser.h"

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    // fuzzer가 주는 입력을 함수에 넣고 crash 발견 시도
    parse_packet(data, size);
    return 0;
}
```

`parse_packet`이 *어떤 입력에서 crash하는지* fuzzer가 찾는다.

### 빌드

```bash
clang -fsanitize=fuzzer,address,undefined \
      -g -O1 \
      parser.c fuzz_target.c \
      -o fuzz_parser
```

- `fuzzer` — libFuzzer 런타임
- `address` — ASan (heap overflow, UAF, leak)
- `undefined` — UBSan (UB 검출)

### 실행

```bash
# 기본 실행
./fuzz_parser

# 시드 corpus 사용
./fuzz_parser corpus/

# 시간 제한
./fuzz_parser -max_total_time=3600 corpus/

# 입력 크기 제한
./fuzz_parser -max_len=4096 corpus/

# 다중 워커 (병렬)
./fuzz_parser -workers=8 -jobs=8 corpus/

# 메모리 한계
./fuzz_parser -rss_limit_mb=2048 corpus/

# 디버그 모드 (특정 입력 재실행)
./fuzz_parser crash-input.bin
```

### 출력

```
INFO: Running with entropic power schedule (0xFF, 100).
INFO: Seed: 1234567890
INFO: Loaded 256 modules   (102347 inline 8-bit counters)
INFO: Loaded 256 PC tables (102347 PCs)
INFO: 8 files found in corpus/
#0  READ units: 8
#9  INITED cov: 437 ft: 437 corp: 8/2Kb exec/s: 0 rss: 28Mb
#256        NEW cov: 442 ft: 445 corp: 9/2Kb lim: 13 exec/s: 0 rss: 28Mb L: 13/13
#1024       NEW cov: 451 ft: 458 corp: 11/2Kb lim: 22 exec/s: 0 rss: 28Mb L: 22/22
#16384      pulse cov: 471 ft: 484 corp: 14/3Kb lim: 60 exec/s: 16384 rss: 31Mb
#65536      pulse cov: 487 ft: 506 corp: 17/4Kb lim: 95 exec/s: 32768 rss: 36Mb

=== ERROR: AddressSanitizer: heap-buffer-overflow on address 0x60200000eff0 ...
    #0 0x4c7d8e in parse_packet parser.c:142:17
    ...
```

Crash 발생 시 입력이 `crash-12345abcd...` 파일로 저장. 해당 파일로 *재현* 가능.

### 핵심 옵션

```bash
-len_control=20         # 길이 변이 비율
-detect_leaks=1         # leak 검출 (LSan)
-print_pcs=1            # PC 출력
-print_corpus_stats=1   # corpus 통계
-shrink=1               # crash 후 minimal reproducer 찾기
```

## AFL++ — Out-of-process, 가장 견고

### 빌드 (afl-clang-lto 또는 afl-cc)

```bash
# 컴파일러 wrapper
AFL_USE_ASAN=1 afl-cc -O1 parser.c fuzz_target.c -o fuzz_parser

# 또는 LLVM mode (instrumentation)
afl-clang-lto -O3 parser.c -o parser
```

### `fuzz_target.c` — main 또는 persistent

```c
// 형식 1 — main 함수
int main(int argc, char **argv) {
    uint8_t buf[4096];
    ssize_t n = read(0, buf, sizeof(buf));
    parse_packet(buf, n);
    return 0;
}

// 형식 2 — persistent mode (더 빠름)
int main(void) {
    uint8_t buf[4096];

    __AFL_INIT();
    while (__AFL_LOOP(10000)) {
        ssize_t n = read(0, buf, sizeof(buf));
        parse_packet(buf, n);
    }
    return 0;
}
```

`__AFL_LOOP(N)`은 *N번 fork 없이 같은 프로세스 재실행*. 시작 비용 절약.

### 실행

```bash
# 기본
afl-fuzz -i corpus/ -o findings/ -- ./fuzz_parser @@

# AddressSanitizer 통합
AFL_USE_ASAN=1 afl-fuzz -i corpus/ -o findings/ -- ./fuzz_parser @@

# 다중 instance
afl-fuzz -i corpus/ -o findings/ -M master -- ./fuzz_parser @@ &
afl-fuzz -i corpus/ -o findings/ -S slave1 -- ./fuzz_parser @@ &
afl-fuzz -i corpus/ -o findings/ -S slave2 -- ./fuzz_parser @@ &

# 시간 제한
timeout 1h afl-fuzz -i corpus/ -o findings/ -- ./fuzz_parser @@

# CMPLOG (RedQueen-style)
afl-fuzz -c ./parser_cmplog -i corpus/ -o findings/ -- ./fuzz_parser @@
```

### AFL++의 차별점

- **Persistent + deferred fork**: 시작 비용 최소화.
- **CMPLOG**: 비교 명령어 추적 → 검사 우회 가능.
- **LAF-Intel**: 큰 정수 비교를 *byte-level*로 분할.
- **REDQUEEN**: 비교 명령어와 입력을 매핑해 *마법값 자동 추론*.
- **MOpt scheduler**: mutator 선택 최적화.

## honggfuzz — 다양한 백엔드

```bash
# Compile
hfuzz-clang -O1 parser.c fuzz_target.c -o fuzz_parser

# Execute
honggfuzz -i corpus/ -o findings/ -- ./fuzz_parser ___FILE___

# In-process (libfuzzer-style)
hfuzz-clang -fsanitize=hfuzz parser.c fuzz_target.c -o fuzz_parser
./fuzz_parser corpus/
```

`honggfuzz`의 강점:
- **다양한 instrumentation** — SanCov, BTS, Intel PT, perf event.
- **Network fuzzing 지원** — socket fuzzer.
- **Kernel fuzzing** — kvm-based.

## OSS-Fuzz — 24/7 자동화

Google이 운영. *오픈소스 프로젝트* 대상으로 *Google 인프라*에서 24/7 fuzzing 무료.

### 통합 — `project.yaml`

```yaml
# projects/<your-project>/project.yaml
homepage: "https://github.com/yourorg/yourproject"
language: c
primary_contact: "your@email.com"
sanitizers:
  - address
  - memory
  - undefined
fuzzing_engines:
  - libfuzzer
  - afl
  - honggfuzz
main_repo: "https://github.com/yourorg/yourproject.git"
```

### Dockerfile

```dockerfile
# projects/<your-project>/Dockerfile
FROM gcr.io/oss-fuzz-base/base-builder

RUN apt-get update && apt-get install -y make pkg-config zlib1g-dev

RUN git clone --depth 1 https://github.com/yourorg/yourproject /src/yourproject
WORKDIR yourproject
COPY build.sh $SRC/
```

### `build.sh`

```bash
#!/bin/bash -eu

cd $SRC/yourproject

# 본 라이브러리 빌드 (sanitizer 적용)
./configure --enable-fuzzer
make -j$(nproc)

# Fuzz target 빌드
$CC $CFLAGS -c fuzz/fuzz_parser.c -o fuzz_parser.o
$CXX $CXXFLAGS fuzz_parser.o -o $OUT/fuzz_parser \
    libparser.a $LIB_FUZZING_ENGINE
```

### Submit

```bash
# Local 테스트
python infra/helper.py build_image yourproject
python infra/helper.py build_fuzzers --sanitizer address yourproject
python infra/helper.py run_fuzzer yourproject fuzz_parser

# PR 제출
# github.com/google/oss-fuzz에 PR
```

승인되면 *24/7 Google 인프라에서 fuzzing*. 새 crash 발견 시 *자동으로 GitHub issue 생성* (private 옵션).

### 효과

OpenSSL은 OSS-Fuzz 도입 후:
- 2017~ : 100+ CVE 자동 발견
- *대부분 patch 전*에 발견 (responsible disclosure)
- 발견 → 보고 → fix 사이클 *수일*

OSS-Fuzz 통계 (2024):
- 1000+ 프로젝트 통합
- 10,000+ 검출된 버그
- *Linux kernel, OpenSSL, libpng, FFmpeg, libxml2* 등 핵심 소프트웨어

## Corpus 관리

Fuzzer는 *시드 corpus*에서 시작. 좋은 corpus가 *발견 효율*을 결정.

### 시드 수집

```bash
# 1. 알려진 valid 입력 수집
find . -name "*.png" > corpus/png/
find . -name "*.json" > corpus/json/

# 2. 표준 testcase
# RFC examples, official test vectors

# 3. 실제 production traffic (sampled, anonymized)
```

### Corpus minimization

큰 corpus는 *느림*. 같은 coverage를 주는 최소 입력 집합으로 압축.

```bash
# libFuzzer
./fuzz_parser -merge=1 minimized_corpus/ corpus/

# AFL++
afl-cmin -i corpus/ -o minimized_corpus/ -- ./fuzz_parser @@
afl-tmin -i input.bin -o minimal.bin -- ./fuzz_parser @@
```

### Corpus 공유

여러 fuzzer instance가 *같은 corpus*를 공유하며 진행하면 *coverage 빨리 확장*.

```bash
# 1번 머신
./fuzz_parser corpus/ -fork=4

# 2번 머신
rsync corpus/ machine1:corpus/
./fuzz_parser corpus/

# 주기적으로 sync
*/5 * * * * rsync corpus/ *_machines_*:corpus/
```

## CI 통합 — 짧은 fuzz 실행

매 PR마다 *전체 fuzz 운영은 어려움*. *짧은 시간(10~30분)*만 실행해 *regression 검출*.

### GitLab CI

```yaml
fuzz_smoke:
  stage: test
  image: ubuntu:22.04
  before_script:
    - apt-get update && apt-get install -y clang lld
  script:
    - clang -fsanitize=fuzzer,address -g -O1
        parser.c tests/fuzz_target.c -o fuzz_parser
    - ./fuzz_parser corpus/ -max_total_time=600
  artifacts:
    when: on_failure
    paths:
      - crash-*
    expire_in: 1 week
```

`-max_total_time=600` = 10분. 새 crash 발견 시 *CI 실패 + crash 파일 보존*.

### GitHub Actions

```yaml
name: Fuzz
on: [push, pull_request]
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/cache@v3
      with:
        path: corpus/
        key: fuzz-corpus-${{ hashFiles('parser.c') }}
        restore-keys: fuzz-corpus-
    - name: Build
      run: |
        clang -fsanitize=fuzzer,address -O1 \
              parser.c tests/fuzz_target.c -o fuzz_parser
    - name: Run fuzz
      run: ./fuzz_parser corpus/ -max_total_time=900
    - name: Save crashes
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: crashes
        path: crash-*
    - name: Save corpus (winner)
      if: success()
      uses: actions/upload-artifact@v3
      with:
        name: corpus
        path: corpus/
```

`corpus/`를 *캐시*해 *이후 PR에서 빠른 시작*. Crash 발견 시 *artifact로 보존*.

## Structured-aware Fuzzing

단순 byte mutation으로는 *복잡한 입력 형식*에 효율 낮음. 형식을 *알려주는 fuzzer*.

### libprotobuf-mutator + libFuzzer

```cpp
#include <libfuzzer/libfuzzer_macro.h>
#include "your_proto.pb.h"

DEFINE_PROTO_FUZZER(const YourMessage &msg) {
    // protobuf 구조 보존하면서 fuzz
    ProcessMessage(msg);
}
```

Protocol Buffer 메시지를 *형식 준수하면서* 변이.

### AFL++ + grammar mutator

```bash
afl-fuzz -i corpus/ -o findings/ \
    -x grammar.json \      # JSON 형식 사전
    -- ./fuzz_parser @@
```

JSON, HTTP, SQL 등 *문법*을 알려줘 *문법 준수 입력 생성*.

## 실전 — 발견하기 좋은 버그 패턴

Fuzzing이 *특히 잘 잡는* 버그:

1. **Integer overflow** — 입력 길이 필드와 실제 처리 사이 wrap.
2. **Buffer overflow** — 길이 검증 누락.
3. **Use-after-free** — lifetime 추론 어긋남.
4. **NULL deref** — 조건 분기 누락.
5. **Type confusion** — union 처리 오류.
6. **Format string** — `%n` 등.
7. **Infinite loop / OOM** — 길이 wrap.
8. **Resource leak** — error path 누락.

상대적으로 *놓치는* 버그:

1. **Logic bug** — 형식은 맞지만 의미가 틀린.
2. **Race condition** — 단일 thread fuzzer는 동시성 검사 X (syzkaller는 가능).
3. **Side channel** — 타이밍 attack 등.

## 통계 — Fuzzing의 효율

OSS-Fuzz가 *24/7로 fuzz한 결과* (2023 보고서):

```
누적 발견 버그        : 10,000+
주당 신규 버그        : ~20개
검출 평균 시간        : 30분~수일
patch까지 평균        : 14일
첫 24시간 검출        : 30%
첫 1주 검출          : 70%
```

*전통적 코드 리뷰*가 *수개월~수년* 걸리는 버그를 fuzzing이 *수 시간~수일*에 발견.

## 비용 — Fuzz 운영

```
컴퓨팅 비용 (AWS Spot)
  1 CPU-hour       : $0.02 ~ $0.05
  연속 24/7 운영   : ~$300~700 / CPU / 월
  16 CPU 클러스터  : ~$5,000 / 월

대안:
  OSS-Fuzz (Google)  : 오픈소스 무료
  ClusterFuzz (자체)  : 내부 인프라
  Mayhem (ForAllSecure): 상용
  Code Intelligence  : 상용
```

기업이 *자체 인프라*를 운영하지 않으면 *OSS-Fuzz 통합*이 최선.

## Fuzz를 결합한 다층 방어

Fuzzing은 *마지막 방어선*. 그 전에:

**1. CERT 규칙 준수          (코딩 시점)**


**2. Static analysis         (커밋 시점)**


**3. Unit/integration test   (PR 시점)**


**4. Fuzzing                 (지속적, 24/7)**


**5. Production canary       (배포 시점)**


**6. Monitoring / alerting   (운영 시점)**

Fuzzing은 *정적 도구 + 리뷰 + 테스트*가 놓친 버그를 잡는다. 모든 layer가 같이 필요.

## 정리

- Fuzzing은 *현대 보안의 1차 검출 인프라*.
- libFuzzer (in-process), AFL++ (out-of-process), honggfuzz (백엔드 다양). 셋 다 *coverage-guided*.
- OSS-Fuzz가 *오픈소스 무료*. 24/7 인프라.
- *Sanitizer + Fuzzer 결합*이 핵심 — ASan/UBSan/MSan과 함께.
- *Corpus minimization + 공유*로 효율 극대.
- *Structured-aware fuzzing*이 복잡한 형식에 효과적.
- CI에 *짧은 fuzz smoke*(10~30분) 통합 — regression 검출.
- 정적 분석 + 테스트 + 리뷰 + fuzzing이 *다층 방어*.

## 다음 장 예고

14장은 *Sanitizer 종합* — ASan, MSan, TSan, UBSan, LSan을 *언제, 어떻게 결합*. CI 통합과 production safe mode.

## 관련 항목

- [Ch 11 — Integer CVE Deep Dive](/blog/embedded/automotive/cert-c/chapter11-integer-cve-deep-dive)
- [Ch 12 — Hardening Options](/blog/embedded/automotive/cert-c/chapter12-hardening-options)
- [LLVM libFuzzer](https://llvm.org/docs/LibFuzzer.html)
- [AFL++](https://aflplus.plus/)
- [OSS-Fuzz](https://github.com/google/oss-fuzz)
