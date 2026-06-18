---
title: "ASan과 UBSan 실전 설정 — 컴파일 옵션과 런타임 동작"
date: 2026-05-29T09:02:00
description: "황금 조합 -fsanitize=address,undefined를 실제로 켜고 운영하는 자세한 방법 — 옵션, 환경 변수, suppression, 흔한 오탐."
tags: [Sanitizer, ASan, UBSan, Debugging, C, C++]
series: "Sanitizers"
seriesOrder: 2
draft: false
---

## 황금 조합 다시 보기

[Ch 1](/blog/tools/debugging/sanitizers/chapter01-intro)에서 본 *황금 조합*을 다시 적습니다.

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1
```

각 옵션이 *왜 그 자리에 있는지*를 정확히 짚으면, 설정 디버깅이 빨라집니다. 이번 장은 이 한 줄을 *실제 프로젝트에서 운영*하는 디테일을 모읍니다.

---

## 컴파일과 링크 둘 다 적용해야 한다

가장 흔한 첫 실수입니다. Sanitizer는 *컴파일 시점*에 코드 계측을 하고, *링크 시점*에 sanitizer 런타임 라이브러리를 함께 묶습니다. 둘 중 하나라도 빠지면 빌드는 되지만 *동작이 이상*해집니다.

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

`-fno-omit-frame-pointer`는 이걸 강제로 끄고 *완전한 트레이스*를 보장합니다.

```
ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
    #0 main.c:42 in process_data
    #1 main.c:67 in run_pipeline
    #2 main.c:103 in main
```

이 줄들이 *모두* 보여야 디버깅이 가능합니다. 빠뜨리면 트레이스가 짧아지거나 `??`로 채워집니다.

### `-O1` — 약한 최적화

이 옵션은 *조심해서* 골라야 합니다.

| 최적화 | 효과 |
|--------|------|
| `-O0` | *너무 약함*. 컴파일러가 일부 UB를 *그대로 흘려보내* sanitizer 오탐 증가. |
| `-O1` | *권장*. 대부분의 UB 검사가 잘 동작하면서 속도도 견딜 만함. |
| `-O2`/`-O3` | UB 위반 코드를 *제거*해 sanitizer가 찾지 못할 수 있음. |

엄밀하게 말하면 sanitizer는 어느 최적화 레벨에서도 *대부분* 동작하지만, *어떤 UB는 컴파일러가 미리 제거*해 ASan이 *놓치는* 경우가 있습니다. 그래서 sanitizer 빌드는 보통 `-O1`을 씁니다.

### `-g` — 디버그 심볼

Sanitizer 보고서가 *파일명·줄 번호*를 보여 주려면 `-g`가 필요합니다. 없으면 주소만 찍힙니다.

```
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
print_stacktrace=1:\
symbolize=1:\
print_summary=1
```

| 키 | 의미 |
|------|------|
| `detect_leaks=1` | LSan을 ASan에서 활성화 (Linux 기본 1, macOS 기본 0) |
| `halt_on_error=1` | 첫 에러에서 즉시 종료 (기본 0 — 계속 진행) |
| `abort_on_error=1` | `exit()`가 아니라 `abort()`로 종료 → coredump 생성 |
| `symbolize=1` | 주소를 함수명·줄 번호로 변환 (`llvm-symbolizer` 또는 `addr2line` 사용) |
| `print_stacktrace=1` | 모든 보고에 스택 트레이스 포함 |
| `print_summary=1` | 종료 시 요약 출력 |
| `strict_string_checks=1` | `strcpy` 등의 *교차* 영역 검사 (느려짐) |
| `check_initialization_order=1` | 전역 변수 초기화 순서 의존 검사 |

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

ASan은 *외부 심볼라이저*를 호출해 주소→줄 번호 변환을 합니다. 환경에 `llvm-symbolizer`가 없으면 *숫자 주소만 보입니다*.

```bash
# llvm-symbolizer 경로 명시
export ASAN_SYMBOLIZER_PATH=/usr/bin/llvm-symbolizer

# 또는 환경에 없으면 GCC 빌드용 addr2line
export ASAN_SYMBOLIZER_PATH=$(which addr2line)
```

Ubuntu/Debian: `sudo apt install llvm`로 설치하면 함께 들어옵니다. macOS: Xcode Command Line Tools에 포함.

---

## Suppression — *오탐 / 외부 라이브러리 무시*

Sanitizer가 외부 라이브러리(OpenSSL, glibc, Qt)에서 *우리가 못 고치는 자리*를 보고할 때, suppression 파일로 *그 자리만 무시*할 수 있습니다.

```bash
# suppression 파일 — asan.supp
leak:libcrypto.so
leak:libssl.so
interceptor_via_fun:OpenSSL_*
```

```bash
LSAN_OPTIONS=suppressions=asan.supp ./myapp
ASAN_OPTIONS=suppressions=asan.supp ./myapp
UBSAN_OPTIONS=suppressions=ubsan.supp ./myapp
```

각 sanitizer가 자기 suppression 파일을 따로 가집니다. 패턴은 함수명 / 모듈명 / 정규식을 지원합니다.

**suppression 패턴 예:**

| 패턴 | 의미 |
|------|------|
| `leak:my_known_leak_function` | 함수명 |
| `leak:libfoo.so` | 라이브러리 |
| `interceptor_via_fun:^OpenSSL_*` | 정규식 (interceptor) |
| `signed-integer-overflow:somefile.cpp` | UBSan 전용 |

Suppression은 *최후의 수단*입니다. 우리 코드의 버그를 가리면 안 됩니다. 외부 라이브러리·CRT의 *알려진 false positive*에만 씁니다.

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

ASan은 `check_initialization_order=1`로 이 자리를 잡지만, 기본은 꺼져 있습니다. 대신 *Construct On First Use* 관용으로 회피합니다.

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

기본 ASan은 `std::vector`의 *논리적 크기*까지만 검사하고, *물리 capacity*가 더 크면 그 안은 잡지 못합니다. 켜려면:

```bash
ASAN_OPTIONS=detect_container_overflow=1
# 컴파일 시
-D_LIBCPP_HAS_ASAN_CONTAINER_ANNOTATIONS  # libc++
```

libstdc++(GCC 기본)는 *이미 활성화*되어 있고, libc++(Clang/macOS)는 명시적으로 켜야 합니다.

### 3. `dlsym`이 ASan과 충돌

```c
// Sanitizer에 잘못 잡히는 패턴
void* sym = dlsym(handle, "func");
typedef int (*FN)(int);
FN fn = (FN)sym;
fn(42);  // ASan이 false positive 보고 가능
```

`dlsym`은 *주소를 동적으로 얻어*와서 호출하는데, sanitizer 계측 정보가 없습니다. 보통 외부 plugin 시스템에서 등장하고, 이 자리는 *suppression*으로 우회합니다.

### 4. `setjmp`/`longjmp`와 sanitizer

`longjmp`로 *스택을 풀어 버리는* 코드는 ASan이 *use-after-return false positive*를 보고할 수 있습니다. C++ 예외와도 비슷한 문제 — sanitizer가 일부 스택 시나리오를 추적 못 합니다.

### 5. 시그널 핸들러 안에서

```c
void handler(int sig) {
    // ❌ malloc, printf 등 비-async-safe 호출
    char* buf = malloc(100);
}
```

ASan은 *시그널 핸들러 안에서의 할당*을 의심할 수 있습니다. 표준 POSIX에서도 시그널 핸들러는 *async-signal-safe 함수만* 호출해야 합니다. ASan은 이를 *상기시켜 주는 효과*가 있습니다.

---

## *어디까지 켜야 하나* — 결정 가이드

Sanitizer를 *모든 빌드에 항상* 켤 수는 없습니다. 오버헤드도 있고 일부 환경에서 동작 안 합니다. 다음 가이드로 결정합니다.

### 켤 자리

- **로컬 개발 빌드**: 기본 켜기. `ENABLE_SANITIZERS=ON`을 디폴트.
- **단위 테스트**: 항상 켜기. 작은 단위 테스트는 sanitizer 오버헤드가 큰 문제 안 됨.
- **CI의 PR 빌드**: 켜기. PR마다 ASan+UBSan 빌드를 한 번 더 돌림.
- **통합 테스트의 일부**: 큰 데이터셋은 sanitizer 빌드가 너무 느림 → 작은 시나리오만.

### 끌 자리

- **릴리스 빌드**: 무조건 끄기. 사용자에게 2배 느린 바이너리를 줄 수는 없습니다.
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

## 보고 읽기 — *실제 ASan 출력 해부*

```c
// main.c
#include <string.h>
int main() {
    char buf[8];
    strcpy(buf, "Hello, World!");
    return 0;
}
```

```bash
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

## 정리

- ASan + UBSan은 *컴파일과 링크 둘 다*에 적용. 한쪽이라도 빠지면 미동작.
- 권장 옵션: `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`.
- 환경 변수 `ASAN_OPTIONS` / `UBSAN_OPTIONS`로 런타임 동작 제어. CI는 `halt_on_error=1` 권장.
- `symbolize=1`로 줄 번호 보고. `ASAN_SYMBOLIZER_PATH`로 심볼라이저 경로 명시 가능.
- *Suppression*은 외부 라이브러리·알려진 false positive에만. 우리 코드 버그를 가리지 마라.
- 오탐 함정: SIOF, container overflow, dlsym, longjmp, async-signal-safe.
- 켤 자리: 로컬 개발, 단위 테스트, PR CI. 끌 자리: 릴리스, 벤치마크.

## 다음 장 예고

[Ch 3: LSan과 누수 분석](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)에서는 메모리 누수에 집중합니다. LSan 보고서 해석, *알려진 누수* suppression, 일회성·반복적 분석 패턴.

## 참고 자료

- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer Manual](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Sanitizers wiki: AddressSanitizerFlags](https://github.com/google/sanitizers/wiki/AddressSanitizerFlags)
