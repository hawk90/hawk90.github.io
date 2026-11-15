---
title: "ASan과 UBSan 실전 설정 — 컴파일 옵션과 런타임 동작"
slug: "tools/debugging/sanitizers/chapter02-asan-ubsan"
date: 2026-05-29T09:02:00
description: "황금 조합 -fsanitize=address,undefined를 실제로 켜고 운영하는 자세한 방법 — 옵션, 환경 변수, suppression, 흔한 오탐."
tags: [Sanitizer, ASan, UBSan, Debugging, C, cpp]
series: "Sanitizers"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

## 황금 조합 다시 보기

[Ch 1](/blog/tools/debugging/sanitizers/chapter01-intro)에서 본 *황금 조합*을 다시 적습니다.

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1
```

각 옵션이 *왜 그 자리에 있는지*를 정확히 짚으면, 설정 디버깅이 빨라집니다. 이번 장은 이 한 줄을 *실제 프로젝트에서 운영*하는 디테일을 모읍니다.

---

## 컴파일과 링크 둘 다 적용해야 한다

가장 흔한 첫 실수입니다. Sanitizer는 *컴파일 시점*에 코드 계측을 하고, *링크 시점*에 sanitizer 런타임 라이브러리를 함께 묶습니다. 계측된 오브젝트를 런타임 없이 링크하면 보통 미정의 sanitizer 심볼로 링크가 실패합니다. 반대로 링크 단계에만 옵션을 주면 기존 오브젝트의 메모리 접근에 검사 코드를 추가하지 못합니다.

```bash
# 잘못된 예 — 컴파일에만
gcc -c -fsanitize=address main.c -o main.o
gcc main.o -o myapp                       # 링크에 없음 → undefined symbol

# 올바른 예 — 둘 다
gcc -c -fsanitize=address main.c -o main.o
gcc -fsanitize=address main.o -o myapp    # 링크에도 명시
```

이 때문에 빌드 시스템 통합 시 *컴파일러·링커 양쪽에* 같은 sanitizer 옵션을 줍니다.

```makefile
CFLAGS  += -fsanitize=address,undefined -fno-omit-frame-pointer -g -O1
LDFLAGS += -fsanitize=address,undefined
```

CMake에서는 더 간단합니다 (`target_compile_options` + `target_link_options`).

```cmake
target_compile_options(myapp PRIVATE
    -fsanitize=address,undefined
    -fno-omit-frame-pointer
    -O1 -g
)
target_link_options(myapp PRIVATE
    -fsanitize=address,undefined
)
```

---

## 컴파일러 옵션 자세히

### `-fno-omit-frame-pointer` — 스택 트레이스 정확도

Sanitizer가 에러를 보고할 때, *어디서 발생했는지*를 알려면 스택 트레이스가 필요합니다. 컴파일러는 최적화 차원에서 frame pointer를 생략하는데(`-fomit-frame-pointer`, 대부분 `-O1` 이상에서 기본 켜짐), 그러면 일부 함수가 트레이스에서 *사라집니다*.

`-fno-omit-frame-pointer`는 frame pointer를 유지합니다. 인라인과 tail call 최적화까지 되돌리지는 않으므로 완전한 트레이스를 보장하지 않습니다. 필요하면 `-fno-optimize-sibling-calls` 등도 검토합니다.

```text
ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
    #0 main.c:42 in process_data
    #1 main.c:67 in run_pipeline
    #2 main.c:103 in main
```

위 출력은 형식 설명용입니다. 함수명·줄 번호는 디버그 정보, 심볼라이저, 최적화에 따라 달라집니다.

### `-O1` — 약한 최적화

이 옵션은 *조심해서* 골라야 합니다.

| 최적화 | 효과 |
|--------|------|
| `-O0` | 계측 검사는 동작합니다. 최적화가 적어 실행 비용과 진단 형태가 달라집니다. |
| `-O1` | *권장*. 대부분의 UB 검사가 잘 동작하면서 속도도 견딜 만함. |
| `-O2`/`-O3` | UB 위반 코드를 *제거*해 sanitizer가 찾지 못할 수 있음. |

엄밀하게 말하면 sanitizer는 어느 최적화 레벨에서도 *대부분* 동작하지만, *어떤 UB는 컴파일러가 미리 제거*해 ASan이 *놓치는* 경우가 있습니다. 그래서 sanitizer 빌드는 보통 `-O1`을 씁니다.

### `-g` — 디버그 심볼

Sanitizer 보고서가 *파일명·줄 번호*를 보여 주려면 `-g`가 필요합니다. 없으면 주소만 찍힙니다.

```text
# -g 없이
#0 0x40123f in process_data
#1 0x401aef in run_pipeline

# -g 있게
#0 in process_data /path/to/main.c:42
#1 in run_pipeline /path/to/main.c:67
```

`-g`는 *모든 sanitizer 빌드*에 필수입니다.

---

## 환경 변수 — 런타임 동작 제어

Sanitizer는 *환경 변수*로 런타임 동작을 바꿉니다. 각 sanitizer가 자기 변수를 갖습니다.

```bash
ASAN_OPTIONS=...
UBSAN_OPTIONS=...
TSAN_OPTIONS=...
LSAN_OPTIONS=...
MSAN_OPTIONS=...
```

값은 `key=value:key=value:...` 형식의 콜론 구분입니다.

### 자주 쓰는 ASAN_OPTIONS

```bash
ASAN_OPTIONS=\
detect_leaks=1:\
halt_on_error=1:\
abort_on_error=1:\
symbolize=1:\
print_summary=1
```

| 키 | 의미 |
|------|------|
| `detect_leaks=1` | 지원되는 ASan 런타임에서 LSan을 활성화합니다. 배포판·타깃 지원도 확인합니다. |
| `halt_on_error=1` | ASan 기본값은 true입니다. 복구 실행은 컴파일 시 `-fsanitize-recover=address`와 런타임 `halt_on_error=0`가 모두 필요합니다. |
| `abort_on_error=1` | 종료 경로에서 abort를 사용합니다. 코어 저장은 OS 정책과 제한에 따라 별도로 결정됩니다. |
| `symbolize=1` | 주소를 함수명·줄 번호로 변환 (`llvm-symbolizer` 또는 `addr2line` 사용) |
| `print_summary=1` | 종료 시 요약 출력 |
| `strict_string_checks=1` | 문자열 인자가 NUL 종료 문자열이라는 조건을 추가로 검사합니다. |
| `check_initialization_order=1` | 번역 단위 간 동적 초기화 순서를 검사하며 macOS에서는 지원하지 않습니다. |

CI에서는 보통 `halt_on_error=1:abort_on_error=1`을 켜서 첫 실패가 *프로세스 종료 코드 비-0*으로 즉시 보고되도록 합니다.

### 자주 쓰는 UBSAN_OPTIONS

```bash
UBSAN_OPTIONS=\
halt_on_error=1:\
print_stacktrace=1:\
symbolize=1
```

UBSan은 ASan보다 옵션이 적습니다. 가장 중요한 두 가지:

- `halt_on_error=1` — UB를 만났을 때 즉시 종료.
- `print_stacktrace=1` — 어디서 UB가 났는지 트레이스 출력.

기본값은 *경고만 출력하고 계속 진행*입니다. CI에서는 거의 항상 `halt_on_error=1`로 켭니다.

### `symbolize`가 동작 안 할 때

ASan의 주소 해석에는 디버그 정보와 사용 가능한 심볼라이저가 필요합니다. macOS에서는 dsymutil로 별도 디버그 정보를 만들어야 할 수도 있습니다. 도구가 없다는 이유만으로 모든 함수명이 사라지는 것은 아닙니다.

```bash
export ASAN_SYMBOLIZER_PATH="$(command -v llvm-symbolizer)"
```

위 경로가 실제 실행 파일인지 먼저 확인합니다. addr2line을 ASAN_SYMBOLIZER_PATH에 그대로 넣는 방식은 llvm-symbolizer의 대체 설정이 아닙니다. 설치된 compiler-rt의 addr2line 지원 여부와 allow_addr2line 옵션을 별도로 확인합니다. Xcode 도구와 Homebrew LLVM이 같은 실행 파일을 제공한다고 가정하지 않습니다.


---

## Suppression — *오탐 / 외부 라이브러리 무시*

Sanitizer가 외부 라이브러리(OpenSSL, glibc, Qt)에서 *우리가 못 고치는 자리*를 보고할 때, suppression 파일로 *그 자리만 무시*할 수 있습니다.

LSan과 ASan interceptor용 파일을 분리합니다. leak 규칙을 ASAN_OPTIONS의 suppression 파일에 섞지 않습니다.

```text
# lsan.supp
leak:known_third_party_leak
```

```text
# asan.supp
interceptor_via_fun:known_third_party_function
```

```bash
LSAN_OPTIONS=suppressions=lsan.supp ./myapp
ASAN_OPTIONS=suppressions=asan.supp ./myapp
UBSAN_OPTIONS=suppressions=ubsan.supp ./myapp
```

UBSan은 검사 종류와 위치를 적습니다. 예를 들어 signed-integer-overflow:known_file.cpp입니다. 런타임 suppression은 복구 가능한 검사에만 적용되고, 심볼·소스 위치를 해석할 정보도 필요합니다. ASan interceptor suppression은 이미 ASan으로 계측된 우리 코드의 임의 오류를 끄는 기능이 아닙니다.

패턴은 도구별 규칙을 따릅니다. 모든 suppression이 일반 정규식이라는 가정은 틀립니다. 원인·수정 불가 사유·재검토 조건을 기록하고 범위를 최소화합니다. 외부 라이브러리에서 발생했다는 사실만으로 오탐으로 분류하지 않습니다.


---

## 흔한 오탐과 함정

### 1. 정적 초기화 순서 의존 (SIOF)

```cpp
// a.cpp
struct A { A() { /* uses B */ } };
A a;

// b.cpp
struct B { B() { /* init */ } };
B b;
```

전역 객체 `a`와 `b`의 *초기화 순서가 .cpp 파일 사이에서 정의되지 않습니다*. `a`의 생성자가 `b`를 쓰는데 `b`가 아직 초기화 안 됐을 수 있습니다.

지원 플랫폼의 ASan은 `check_initialization_order=1`로 검사할 수 있지만, 기본은 꺼져 있으며 macOS에서는 이 검사를 지원하지 않습니다. 대신 *Construct On First Use* 관용으로 회피합니다.

```cpp
B& get_b() {
    static B instance;   // 첫 호출 시 초기화 — 순서 보장
    return instance;
}
```

### 2. STL 컨테이너 overflow 검사

```cpp
std::vector<int> v(10);
int x = v[20];   // ❌ container-overflow (ASan 옵션 필요)
```

기본 ASan의 메모리 경계와 vector의 논리적 size는 다릅니다. 위의 v[20]이 실제 할당 밖이면 heap-buffer-overflow일 수 있고, size 밖이지만 capacity 안인 접근은 container annotation이 있어야 container-overflow로 잡힐 수 있습니다.

[libstdc++ 문서](https://gcc.gnu.org/onlinedocs/libstdc++/manual/debug.html)는 vector의 추가 계측을 -D_GLIBCXX_SANITIZE_VECTOR로 명시적으로 켜도록 안내합니다. libc++는 배포 버전과 allocator의 annotation 지원을 확인합니다. 라이브러리 내부 매크로를 임의로 정의하거나, 런타임 detect_container_overflow만으로 계측이 생긴다고 가정하지 않습니다.


### 3. 동적 로딩·비표준 스택·시그널

비계측 플러그인은 탐지 공백을 만들 수 있습니다. dlsym으로 얻은 함수 주소를 호출했다는 사실만으로 ASan 오탐이라고 판정하지 않습니다. 보고된 접근과 실제 함수 시그니처·수명·호출 규약을 먼저 확인합니다.

ASan은 일반적인 예외 처리와 longjmp를 지원합니다. 사용자 정의 스택 전환이나 coroutine/fiber는 런타임 연동을 추가로 검토할 대상이며, 일반 C++ 예외가 곧 오탐 원인이라는 설명은 맞지 않습니다.

시그널 핸들러의 malloc·printf 사용은 POSIX의 async-signal-safe 규칙으로 판단합니다. ASan은 그 규칙을 빠짐없이 검사하는 도구가 아니므로 경고가 없어도 안전하다고 결론 내리지 않습니다.


---

## *어디까지 켜야 하나* — 결정 가이드

Sanitizer를 *모든 빌드에 항상* 켤 수는 없습니다. 오버헤드도 있고 일부 환경에서 동작 안 합니다. 다음 가이드로 결정합니다.

### 켤 자리

- **로컬 개발 빌드**: 기본 켜기. `ENABLE_SANITIZERS=ON`을 디폴트.
- **단위 테스트**: 항상 켜기. 작은 단위 테스트는 sanitizer 오버헤드가 큰 문제 안 됨.
- **CI의 PR 빌드**: 켜기. PR마다 ASan+UBSan 빌드를 한 번 더 돌림.
- **통합 테스트의 일부**: 큰 데이터셋은 sanitizer 빌드가 너무 느림 → 작은 시나리오만.

### 끌 자리

- **일반 배포 빌드**: ASan 런타임은 진단용으로 분리합니다. UBSan trap/minimal-runtime 같은 배포 전략은 비용과 지원 범위를 별도로 검토합니다.
- **벤치마크**: 끄기. 측정 결과가 의미 없어짐.
- **임베디드/모바일**: 메모리 오버헤드 큼. 디바이스 위에서 못 돌릴 수 있음.

CMake에서는 옵션으로 분기합니다.

```cmake
option(ENABLE_SANITIZERS "Enable ASan + UBSan" OFF)

if(ENABLE_SANITIZERS)
    add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address,undefined)
endif()
```

자세한 통합은 [Ch 5](/blog/tools/debugging/sanitizers/chapter05-cmake-ci)에서 다룹니다.

---

## 보고 읽기 — ASan 출력 형식

```c
// main.c
#include <string.h>
int main() {
    char buf[8];
    strcpy(buf, "Hello, World!");
    return 0;
}
```

다음 로그는 필드를 설명하는 예시이며 이번 환경의 실측 로그가 아닙니다.

```text
$ gcc -fsanitize=address,undefined -fno-omit-frame-pointer -g -O1 main.c -o test
$ ./test
=================================================================
==12345==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffe8c5f0a08 at pc 0x0000004012a3 bp 0x7ffe8c5f0930 sp 0x7ffe8c5f00d8
WRITE of size 14 at 0x7ffe8c5f0a08 thread T0
    #0 0x4012a2 in __interceptor_strcpy /usr/include/.../strcpy_interceptor.h:45
    #1 0x401361 in main /path/to/main.c:4
    #2 0x7f7c4a02d082 in __libc_start_main
    #3 0x40118d in _start

Address 0x7ffe8c5f0a08 is located in stack of thread T0 at offset 40 in frame
    #0 0x4012ce in main /path/to/main.c:2

  This frame has 1 object(s):
    [32, 40) 'buf' (line 3) <== Memory access at offset 40 overflows this variable
HINT: this may be a false positive if your program uses some custom stack unwind mechanism
SUMMARY: AddressSanitizer: stack-buffer-overflow on main.c:4 in main
==12345==ABORTING
```

이 보고서가 *말하는 것*을 분해하면:

1. **에러 종류**: `stack-buffer-overflow` — 스택 변수의 경계 침범
2. **접근 종류**: `WRITE of size 14` — 14바이트를 쓰려 함
3. **스택 트레이스**: `main.c:4`에서 strcpy 호출 — 우리 코드의 정확한 위치
4. **할당 정보**: `[32, 40)` — `buf`라는 변수가 차지하는 영역 (8바이트)
5. **위반 위치**: `offset 40` — 변수 끝(40) 자리에 접근 → 1바이트만 넘어도 보고
6. **요약 한 줄**: 빠른 인지용

`SUMMARY` 한 줄이 CI 로그에서 가장 먼저 보이는 부분입니다. 이걸로 *어디서 어떤 종류의 버그*인지 즉시 파악합니다.

---

## 직접 확인 — 탐지·복구·종료를 나눠 실행

다음 두 파일은 정상 입력, ASan 경계 위반, UBSan 복구·중단을 분리하기 위한 작은 예제입니다. 결과 로그의 주소와 줄 번호를 고정하지 않고 오류 종류와 종료 여부를 확인합니다.

```cpp title="bounds.cpp"
#include <cstdio>
int main(int argc, char**) {
    volatile int* values = new int[1];
    int index = argc - 1;
    values[index] = 42;
    std::printf("value=%d\n", values[0]);
    delete[] values;
}
```

```cpp title="overflow.cpp"
#include <climits>
#include <cstdio>
int main() {
    volatile int maximum = INT_MAX;
    int result = maximum + 1;
    std::puts("continued");
    return result == 0;
}
```

```bash
clang++ -O1 -g -fsanitize=address bounds.cpp -o bounds
./bounds
./bounds bad
clang++ -O1 -g -fsanitize=undefined overflow.cpp -o overflow
./overflow
UBSAN_OPTIONS=halt_on_error=1 ./overflow
```

bounds는 인자 없이 value=42를 출력합니다. bad 인자를 주면 heap-buffer-overflow로 중단합니다. overflow의 기본 복구 모드는 signed integer overflow를 보고한 뒤 continued를 출력하며, halt_on_error=1은 continued 전에 중단합니다. trap 검사는 -fsanitize-trap=undefined로 별도 빌드해 진단 런타임 출력 없이 중단되는지 확인합니다. 누수 검사는 3장의 별도 입력으로 검증합니다.

## 정리

- ASan + UBSan은 *컴파일과 링크 둘 다*에 적용. 한쪽이라도 빠지면 미동작.
- 권장 옵션: `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`.
- 환경 변수 `ASAN_OPTIONS` / `UBSAN_OPTIONS`로 런타임 동작 제어. CI는 `halt_on_error=1` 권장.
- `symbolize=1`로 줄 번호 보고. `ASAN_SYMBOLIZER_PATH`로 심볼라이저 경로 명시 가능.
- *Suppression*은 외부 라이브러리·알려진 false positive에만. 우리 코드 버그를 가리지 마라.
- 초기화 순서·container annotation·비계측 코드·사용자 스택 전환은 지원 범위를 나눠 확인합니다.
- 켤 자리: 로컬 개발, 단위 테스트, PR CI. 끌 자리: 릴리스, 벤치마크.

## 다음 장 예고

[Ch 3: LSan과 누수 분석](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)에서는 메모리 누수에 집중합니다. LSan 보고서 해석, *알려진 누수* suppression, 일회성·반복적 분석 패턴.

## 참고 자료

- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer Manual](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Sanitizers wiki: AddressSanitizerFlags](https://github.com/google/sanitizers/wiki/AddressSanitizerFlags)

## 관련 항목

- [Ch 1: Sanitizer 종류 비교](/blog/tools/debugging/sanitizers/chapter01-intro) — 다섯 sanitizer의 역할과 호환성
- [Ch 3: LSan 누수 분석](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks) — ASan에 딸려 오는 누수 검사 읽기
- [Valgrind Ch 2: Memcheck 실전](/blog/tools/debugging/valgrind/chapter02-memcheck) — 같은 메모리 오류를 재컴파일 없이 잡는 쪽
- [GDB·LLDB Ch 7: Core Dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump) — `abort_on_error=1`이 남긴 코어를 여는 방법
- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html) — 옵션과 런타임 동작 원문
