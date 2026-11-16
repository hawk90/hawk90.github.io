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

각 옵션이 *왜 그 자리에 있는지*를 정확히 짚으면, 설정 디버깅이 빨라집니다. 이번 장은 이 한 줄을 *실제 프로젝트에서 운영*하는 디테일을 모읍니다. 실행 환경은 1장과 같습니다. macOS 27.2.1(M2 Pro)의 Apple clang 21.0.0·Homebrew LLVM 23.1.5, 그리고 QEMU 위 Debian 13 arm64의 clang 19.1.7·GCC 14.2.0입니다. macOS의 `gcc` 명령은 Apple clang을 부르므로, GCC라고 적은 결과는 모두 Debian에서 나왔습니다.

---

## 컴파일과 링크 둘 다 적용해야 한다

가장 흔한 첫 실수입니다. Sanitizer는 *컴파일 시점*에 코드 계측을 하고, *링크 시점*에 sanitizer 런타임 라이브러리를 함께 묶습니다. 아래 "보고 읽기" 절의 `main.c`로 두 방향의 실수를 모두 재현했습니다.

```bash
# 잘못된 예 — 컴파일에만
gcc -c -fsanitize=address main.c -o main.o
gcc main.o -o myapp                       # 링크에 없음 → undefined symbol

# 올바른 예 — 둘 다
gcc -c -fsanitize=address main.c -o main.o
gcc -fsanitize=address main.o -o myapp    # 링크에도 명시
```

컴파일에만 옵션을 준 경우, 계측 코드가 부르는 런타임 함수가 없어 링크가 실패합니다. macOS(Apple clang)와 Debian(GCC 14)의 첫 줄입니다.

```text
$ gcc main.o -o myapp        # macOS
Undefined symbols for architecture arm64:
  "___asan_init", referenced from:
      _asan.module_ctor in main.o
$ gcc m.o -o myapp           # Debian 13, GCC 14
/usr/bin/ld: m.o: in function `main':
ch02_main.c:(.text+0x18): undefined reference to `__asan_option_detect_stack_use_after_return'
```

반대로 계측 없이 컴파일한 오브젝트를 `-fsanitize=address`로 링크만 하면, 링크는 성공하고 ASan 보고는 나오지 않습니다. macOS에서 이 바이너리는 ASan 대신 `_FORTIFY_SOURCE`의 `__strcpy_chk` 검사에 걸려 종료 코드 133(SIGTRAP)으로 끝났습니다. 링크 옵션은 런타임을 붙일 뿐, 이미 만들어진 오브젝트에 검사 코드를 넣지 않습니다.

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

Sanitizer가 에러를 보고할 때, *어디서 발생했는지*를 알려면 스택 트레이스가 필요합니다. ASan은 `malloc`/`free` 때마다 할당 위치의 스택을 기록하는데, 이때 frame pointer를 따라가는 빠른 unwinder를 씁니다. macOS 런타임의 `ASAN_OPTIONS=help=1`에서 `fast_unwind_on_malloc`은 `true`("use the fast frame-pointer-based unwinder on malloc/free")였습니다. 컴파일러가 frame pointer를 생략하면 그 사슬이 끊겨 "allocated by thread T0 here" 아래 프레임이 빠집니다.

기본값은 컴파일러와 타깃마다 달랐습니다. Debian 13 arm64의 GCC 14는 `gcc -O1 -Q --help=optimizers`에서 `-fomit-frame-pointer [enabled]`를 보였고 `-O0`에서도 같았습니다. clang 19는 `-O1 -###`에서 `-mframe-pointer=non-leaf`, 즉 잎 함수가 아니면 frame pointer를 유지하는 쪽이었습니다. 컴파일러 기본값에 기대지 않으려면 `-fno-omit-frame-pointer`를 명시합니다. [ASan 문서](https://clang.llvm.org/docs/AddressSanitizer.html#usage)는 인라인과 tail call이 남아 있으면 그래도 프레임이 빠질 수 있다며, 완전한 트레이스가 필요하면 `-fno-optimize-sibling-calls`를 더하라고 적습니다.

세 함수를 거쳐 힙 경계를 넘는 `pipe.c`를 `-O1 -fno-omit-frame-pointer -g`로 빌드하면 세 프레임이 모두 남습니다(Apple clang 21).

```c title="pipe.c"
#include <stdlib.h>
__attribute__((noinline)) void process_data(int *d, int n) { ((volatile int *)d)[n] = 1; }
__attribute__((noinline)) void run_pipeline(int n) { int *d = malloc(n * sizeof *d); process_data(d, n); free(d); }
int main(int argc, char **argv) { run_pipeline(argc + 3); return 0; }
```

```text
WRITE of size 4 at 0x602000000980 thread T0
    #0 0x000104fe45d8 in process_data pipe.c:2
    #1 0x000104fe4600 in run_pipeline pipe.c:3
    #2 0x000104fe4620 in main pipe.c:4
```

`noinline`과 `volatile`을 뺀 첫 시도에서는 `-O1`이 `malloc`·쓰기·`free`를 통째로 지워 보고가 아예 나오지 않았습니다.

### `-O1` — 약한 최적화

[ASan 문서](https://clang.llvm.org/docs/AddressSanitizer.html#usage)의 권장은 "To get a reasonable performance add -O1 or higher"입니다. 최적화가 버그를 지우는 경우는 `-O1`에서 이미 나타났습니다. 1장의 `strcpy` 두 변형(상수 문자열, `argv[1]`)을 최적화 수준별로 빌드해 ASan 보고가 나왔는지 본 결과입니다.

| 최적화 | Apple clang 21, 상수 문자열 | Apple clang 21, `argv[1]` | GCC 14, 상수 문자열 |
|--------|------|------|------|
| `-O0` | 보고 | 보고 | 보고 |
| `-O1` | 없음 | 보고 | 보고 |
| `-O2` | 없음 | 보고 | — |
| `-O3` | 없음 | 보고 | — |

GCC 칸의 —는 실행하지 않은 조합입니다.

같은 `-O1`이라도 clang은 상수 복사를 미리 계산해 접근을 없앴고 GCC 14는 `memcpy` 호출을 남겨 ASan 인터셉터가 잡았습니다. 입력이 실행 시점에 정해지는 경로는 `-O3`까지 모두 잡혔습니다. 그래서 `-O1`은 "속도와 진단의 균형"이지 "모든 버그를 남기는 수준"은 아닙니다. 테스트 입력을 하드코딩한 짧은 재현 코드가 경고 없이 지나가면 `-O0`으로 한 번 더 돌려 봅니다.

### `-g` — 디버그 심볼

Sanitizer 보고서가 *파일명·줄 번호*를 보여 주려면 `-g`가 필요합니다. 같은 `pipe.c`를 `-g` 없이 빌드하면 함수 이름은 심볼 테이블에서 나오지만 줄 번호가 사라집니다.

```text
# -g 없이 (Apple clang 21)
    #0 0x000102c905d8 in process_data+0x48 (nog:arm64+0x1000005d8)
    #1 0x000102c90600 in run_pipeline+0x20 (nog:arm64+0x100000600)
# -g 없이 (Debian GCC 14)
    #0 0xaaaac76a0a28 in process_data (/root/t/nog+0xa28) (BuildId: 2ec148275f41c5d9ab0634817e2ab6d1d6fdbfc2)
# -g 있게 (Debian GCC 14)
    #0 0xaaaad7f60a28 in process_data /root/t/pipe.c:2
    #1 0xaaaad7f60a4c in run_pipeline /root/t/pipe.c:3
```

줄 번호가 없으면 같은 함수 안 어느 줄인지를 오프셋으로 역산해야 하므로, sanitizer 빌드에는 `-g`를 함께 둡니다.

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

각 키의 기본값은 런타임에 `ASAN_OPTIONS=help=1`을 주고 아무 ASan 바이너리나 실행하면 `(Current Value: …)`로 나옵니다. 두 플랫폼에서 읽은 값입니다.

| 키 | macOS (Apple clang 21) | Debian 13 (GCC 14·clang 19) | 의미 |
|------|------|------|------|
| `detect_leaks` | false | true | LSan 종료 검사. Apple 런타임에 1을 주면 `detect_leaks is not supported on this platform.`으로 abort |
| `halt_on_error` | true | true | 첫 보고 뒤 종료. 계속 가려면 컴파일 때 `-fsanitize-recover=address`도 필요 |
| `abort_on_error` | true | false | 종료를 `_exit()` 대신 `abort()`로 |
| `symbolize` | true | true | 주소를 함수·줄로 변환 |
| `print_summary` | true | true | 마지막 `SUMMARY:` 줄 |
| `strict_string_checks` | false | false | 문자열 인자의 NUL 종료까지 검사 |
| `check_initialization_order` | false | false | 번역 단위 사이의 동적 초기화 순서 검사 |
| `exitcode` | 1 | 1 | 보고 뒤 종료 코드 |

`halt_on_error=0`만으로는 계속 실행되지 않았습니다. 힙 블록 끝 너머에 두 번 쓰는 프로그램을 기본 빌드로 돌리면 `halt_on_error=0`을 줘도 첫 보고에서 멈췄고, `-fsanitize-recover=address`로 다시 빌드한 뒤에야 두 보고가 모두 나오고 다음 줄의 `after`가 출력됐습니다. [GCC 매뉴얼](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)도 복구는 컴파일러와 런타임 양쪽에서 켜야 하며 ASan의 복구 모드는 "experimental"이라고 적습니다.

`abort_on_error`의 차이는 종료 코드로 드러납니다. 같은 스택 오버플로가 Debian에서는 `exitcode` 그대로 1로, macOS에서는 `abort()`의 SIGABRT 때문에 셸에서 134로 끝났습니다. 둘 다 0이 아니므로 CI는 실패로 잡습니다. CI에서 `abort_on_error=1`을 켜는 이유는 종료 코드가 아니라 코어 덤프와 디버거입니다. `abort()`는 SIGABRT를 보내므로 코어를 남기거나 디버거에서 멈출 지점이 생깁니다(5장).

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

Debian 13의 `UBSAN_OPTIONS=help=1`은 `halt_on_error`, `print_stacktrace`, `abort_on_error`를 모두 `false`로, `exitcode`를 1로 보여 줬습니다. 즉 기본은 *보고만 하고 계속 진행*입니다. 이 장 끝의 `overflow.cpp`가 보고 뒤 `continued`를 찍고 종료 코드 0으로 끝난 것이 그 결과이고, CI가 이 실행을 성공으로 본다는 뜻이기도 합니다. 그래서 CI에서는 `halt_on_error=1`을 켭니다.

### `symbolize`가 동작 안 할 때

주소를 줄 번호로 바꾸는 심볼라이저는 런타임마다 달랐습니다. `ASAN_OPTIONS=verbosity=2`로 실행하면 런타임이 어떤 도구를 골랐는지 찍습니다.

| 런타임 | 고른 심볼라이저 |
|------|------|
| Apple clang 21 (macOS) | `Using atos found at: /usr/bin/atos` (PATH에 Homebrew `llvm-symbolizer`가 있어도) |
| Homebrew LLVM 23 (macOS) | `Using atos found at: /usr/bin/atos` |
| clang 19 (Debian) | `Using llvm-symbolizer found at: /usr/bin/llvm-symbolizer-19` |
| GCC 14 (Debian) | `Using libbacktrace symbolizer.` (외부 도구 없이 libasan 내장) |

경로를 직접 지정하려면 `ASAN_SYMBOLIZER_PATH`를 씁니다.

```bash
export ASAN_SYMBOLIZER_PATH="$(command -v llvm-symbolizer)"
```

macOS에서 이 변수를 Homebrew의 `llvm-symbolizer`로 주자 로그가 `Using llvm-symbolizer at user-specified path`로 바뀌었습니다. 경로를 잘못 주면 결과가 나빠집니다. 없는 경로를 주자 `WARNING: invalid path to external symbolizer!`와 `WARNING: Failed to use and restart external symbolizer!`가 찍히고 프레임이 `process_data+0x48`처럼 줄 번호 없이 나왔습니다. Homebrew의 `llvm-addr2line`을 주자 런타임이 `External symbolizer path is set to '/opt/homebrew/opt/llvm/bin/llvm-addr2line' which isn't a known symbolizer.`라는 오류를 냈습니다. 이 변수에는 `llvm-symbolizer`를 줍니다. addr2line 사용은 별도의 `allow_addr2line` 옵션이 맡고, 두 플랫폼 모두 기본값이 `false`였습니다. 참고로 macOS에는 `/usr/bin/addr2line` 자체가 없었습니다.


---

## Suppression — *오탐 / 외부 라이브러리 무시*

Sanitizer가 외부 라이브러리(OpenSSL, glibc, Qt)에서 *우리가 못 고치는 자리*를 보고할 때, suppression 파일로 *그 자리만 무시*할 수 있습니다.

LSan과 ASan interceptor용 파일을 분리합니다. `leak:` 줄이 든 파일을 `ASAN_OPTIONS=suppressions=`로 넘기자 Debian의 ASan 런타임은 실행 전에 `AddressSanitizer: failed to parse suppressions.`와 지원 형식 목록(`interceptor_name`, `interceptor_via_fun` 등)을 찍고 멈췄습니다.

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

세 파일이 실제로 무엇을 끄는지 `supp.cpp`로 확인했습니다. `known_third_party_function`은 `strcpy`로 4바이트 버퍼를 넘치게 하고, `overflow_here`는 `INT_MAX + 1`을 계산합니다(Apple clang 21과 Debian clang 19, `-fsanitize=address,undefined`).

```cpp title="supp.cpp"
#include <climits>
#include <cstdio>
#include <cstring>
__attribute__((noinline)) int known_third_party_function(const char *s) { char buf[4]; std::strcpy(buf, s); return buf[0]; }
__attribute__((noinline)) int overflow_here(volatile int x) { return x + 1; }
int main(int argc, char **argv) {
    if (argc > 1 && argv[1][0] == 'a') std::printf("%d\n", known_third_party_function("toolong"));
    if (argc > 1 && argv[1][0] == 'u') std::printf("%d\n", overflow_here(INT_MAX));
    std::puts("end");
}
```

- `interceptor_via_fun:known_third_party_function`를 넣자 `./supp a`의 `stack-buffer-overflow` 보고가 사라지고 `116`과 `end`가 출력됐습니다. 이 규칙은 *ASan 인터셉터*(`strcpy`)가 그 함수 안에서 불렸을 때만 끕니다.
- 같은 형식으로 `interceptor_via_fun:main`을 주고 `bounds.cpp`(아래)의 직접 배열 쓰기를 돌리자 `heap-buffer-overflow`가 그대로 보고됐습니다. 계측된 코드의 직접 접근은 인터셉터를 거치지 않기 때문입니다. [ASan 문서](https://clang.llvm.org/docs/AddressSanitizer.html#suppressing-reports-in-external-libraries)도 이 메커니즘이 "does not work on code recompiled with AddressSanitizer"라고 적습니다.
- UBSan의 `signed-integer-overflow:supp.cpp`는 `./supp u`의 보고를 지우고 `-2147483648`을 출력하게 했습니다. [UBSan 문서](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html#runtime-suppressions)는 복구 가능한 검사만 끌 수 있고, `undefined` 같은 그룹 이름은 쓸 수 없으며, 파일·함수 이름을 맞추려면 디버그 정보나 심볼 테이블이 필요하다고 적습니다.

suppression 한 줄마다 원인과 고칠 수 없는 이유, 다시 볼 조건을 주석으로 남겨 둡니다. 3장에서 보듯 파일 이름 패턴 하나가 그 파일의 *모든* 보고를 지우기도 합니다.


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

ASan은 `check_initialization_order=1`로 이 문제를 검사합니다. 위 구조를 실행 가능한 두 파일로 만들었습니다. `siof_a.cpp`의 `A`가 생성자에서 `siof_b.cpp`의 `b_value`(동적 초기화, 41)를 읽어 1을 더합니다.

```cpp title="siof_a.cpp"
#include <cstdio>
extern int b_value;
struct A { int v; A() : v(b_value + 1) {} };
A a;
int main() { std::printf("a.v=%d\n", a.v); }
```

```cpp title="siof_b.cpp"
int compute_b() { return 41; }
int b_value = compute_b();
```

Debian 13에서 옵션 없이 실행하면 clang 19 빌드는 `a.v=42`, GCC 14 빌드는 `a.v=1`을 찍었습니다. 링크 순서와 컴파일러에 따라 `b_value`가 0인 채로 읽힐 수도, 이미 초기화된 뒤 읽힐 수도 있다는 뜻입니다. `ASAN_OPTIONS=check_initialization_order=1`을 주자 두 컴파일러, 두 링크 순서 모두 다음과 같이 멈췄습니다. `a.v=42`가 나온 clang 빌드에서도 잡혔다는 점이 중요합니다.

```text
==824==ERROR: AddressSanitizer: initialization-order-fiasco on address 0xaaaacfb52ba0 at pc 0xaaaacfa14aa4 bp 0xffffed9866e0 sp 0xffffed9866d8
SUMMARY: AddressSanitizer: initialization-order-fiasco /root/t/siof_a.cpp:3:27 in A::A()
```

[ASan 문서](https://clang.llvm.org/docs/AddressSanitizer.html#initialization-order-checking)는 "this option is not supported on macOS"라고 적지만, Apple clang 21로 macOS에서 같은 파일을 돌리자 `initialization-order-fiasco … siof_a.cpp:3 in A::A()`가 보고됐습니다. 문서와 실제 런타임이 어긋나는 자리이므로, macOS에서 이 검사에 기대려면 직접 재현해 본 뒤 씁니다. 고치는 방법은 *Construct On First Use* 관용입니다.

```cpp
B& get_b() {
    static B instance;   // 첫 호출 시 초기화 — 순서 보장
    return instance;
}
```

### 2. STL 컨테이너 overflow 검사

ASan이 아는 경계는 `malloc`이 준 블록의 경계입니다. `vector`의 size와 capacity 사이는 할당된 메모리이므로, 라이브러리가 따로 알려 주지 않으면 그 안의 접근은 정상으로 보입니다.

```cpp title="vec.cpp"
#include <cstdio>
#include <cstdlib>
#include <vector>
int main(int argc, char **argv) {
    std::vector<int> v(10);
    v.reserve(32);
    int i = std::atoi(argv[1]);
    int x = v.data()[i];
    std::printf("v[%d]=%d\n", i, x);
}
```

| 표준 라이브러리 | `i=15` (size 밖, capacity 안) | `i=40` (capacity 밖) |
|------|------|------|
| libc++ (Apple clang 21, Homebrew LLVM 23) | `container-overflow` | `heap-buffer-overflow` |
| libstdc++ (Debian GCC 14, clang 19) | 보고 없음, `v[15]=-1094795586` | — |
| libstdc++ + `-D_GLIBCXX_SANITIZE_VECTOR` (GCC 14) | `container-overflow` | — |

libstdc++에서 읽힌 `-1094795586`은 `0xbebebebe`로, ASan이 새 힙 블록을 채우는 바이트입니다. [libstdc++ 매크로 문서](https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_macros.html)는 `_GLIBCXX_SANITIZE_VECTOR`가 "Undefined by default"이며, vector를 만들고 바꾸는 모든 번역 단위에 같은 값으로 정의해야 한다고 적습니다. 문서의 표현은 "The annotations must be present on all vector operations or none"입니다.


### 3. 동적 로딩·비표준 스택·시그널

스택 오버플로 보고에는 매번 다음 두 줄이 붙었습니다.

```text
HINT: this may be a false positive if your program uses some custom stack unwind mechanism, swapcontext or vfork
      (longjmp and C++ exceptions *are* supported)
```

런타임 스스로 C++ 예외와 `longjmp`는 지원하고, `swapcontext`·`vfork`·직접 만든 스택 되감기는 오탐 원인이 될 수 있다고 알려 줍니다. coroutine이나 fiber 라이브러리가 스택을 직접 바꾼다면 이 줄이 가리키는 경우에 해당합니다.

계측하지 않은 플러그인(`dlopen`으로 연 `.so`)은 반대 방향의 문제를 만듭니다. 그 안의 직접 메모리 접근은 검사 코드가 없으니 보고되지 않습니다. 플러그인 안의 `memcpy`·`strcpy` 같은 libc 호출만 ASan 인터셉터를 거쳐 검사됩니다.

시그널 핸들러 안의 `malloc` 호출은 ASan이 아니라 TSan이 `report_signal_unsafe`(기본 `true`)로 보는 항목입니다(4장).


---

## *어디까지 켜야 하나* — 결정 가이드

Sanitizer를 *모든 빌드에 항상* 켤 수는 없습니다. 오버헤드도 있고 일부 환경에서 동작 안 합니다. 다음 가이드로 결정합니다.

### 켤 자리

- **로컬 개발 빌드**: 기본 켜기. `ENABLE_SANITIZERS=ON`을 디폴트.
- **단위 테스트**: 항상 켜기. 정렬 위주 작업(4장의 `work.cpp`, 스레드 4개가 각자 800만 개 정렬)을 Apple clang 21 `-O1`로 돌렸을 때 실행 시간은 0.21~0.30초에서 0.23~0.26초로 거의 그대로였고, 최대 RSS만 129.8MB에서 160.8MB로 늘었습니다. 문서의 "typical slowdown 2x"보다 작은 값이지만 작업이 정렬 하나뿐이라는 한계가 있습니다.
- **CI의 PR 빌드**: 켜기. PR마다 ASan+UBSan 빌드를 한 번 더 돌림.
- **통합 테스트의 일부**: 시간 예산 안에 들어오는 시나리오만 골라 sanitizer 빌드로 돌립니다.

### 끌 자리

- **일반 배포 빌드**: ASan 런타임은 끕니다. [UBSan 문서](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html#security-considerations)는 런타임이 "meant for testing purposes"라며, 보안이 중요한 배포에는 minimal runtime이나 trap 모드를 권합니다. trap 모드는 1장에서 본 대로 dylib 없이 `brk` 명령만 남깁니다.
- **벤치마크**: 끄기. 위 측정에서 실행 시간은 거의 같았어도 최대 RSS가 24% 늘었고, 4장의 TSan 빌드는 시간까지 1.6~1.7배가 됐습니다.
- **임베디드/모바일**: ASan은 프로그램 메모리 8바이트마다 shadow 1바이트를 쓰고(보고서의 "one shadow byte represents 8 application bytes") 할당마다 redzone을 붙입니다. 메모리가 빠듯한 디바이스에서는 이 몫을 먼저 계산합니다.

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

Debian 13의 GCC 14로 빌드해 실행한 전체 로그입니다. shadow byte 덤프와 범례는 생략했습니다.

```text
$ gcc -fsanitize=address,undefined -fno-omit-frame-pointer -g -O1 main.c -o test
$ ./test
=================================================================
==745==ERROR: AddressSanitizer: stack-buffer-overflow on address 0xffff88b00028 at pc 0xffff8b978390 bp 0xffffc309b100 sp 0xffffc309b140
WRITE of size 14 at 0xffff88b00028 thread T0
    #0 0xffff8b97838c in memcpy ../../../../src/libsanitizer/sanitizer_common/sanitizer_common_interceptors_memintrinsics.inc:115
    #1 0xaaaabd960ba0 in main /root/t/ch02_main.c:4
    #2 0xffff8b092258  (/lib/aarch64-linux-gnu/libc.so.6+0x22258) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #3 0xffff8b092338 in __libc_start_main (/lib/aarch64-linux-gnu/libc.so.6+0x22338) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #4 0xaaaabd960a2c in _start (/root/t/test1+0xa2c) (BuildId: b025407b3a63f2c4d9317156ded724862b1ce367)

Address 0xffff88b00028 is located in stack of thread T0 at offset 40 in frame
    #0 0xaaaabd960b34 in main /root/t/ch02_main.c:2

  This frame has 1 object(s):
    [32, 40) 'buf' (line 3) <== Memory access at offset 40 overflows this variable
HINT: this may be a false positive if your program uses some custom stack unwind mechanism, swapcontext or vfork
      (longjmp and C++ exceptions *are* supported)
SUMMARY: AddressSanitizer: stack-buffer-overflow ../../../../src/libsanitizer/sanitizer_common/sanitizer_common_interceptors_memintrinsics.inc:115 in memcpy
...
==745==ABORTING
$ echo $?
1
```

GCC는 상수 `strcpy`를 `memcpy`로 바꿔 두었기 때문에 #0 프레임이 `strcpy`가 아니라 `memcpy` 인터셉터입니다. 같은 파일을 macOS의 Apple clang 21 `-O0`으로 돌리면 #0이 `strcpy+0x458 (libclang_rt.asan_osx_dynamic.dylib…)`, SUMMARY가 `stack-buffer-overflow main.c:4 in main`이었고 종료 코드는 134였습니다(`-O1`에서는 1장처럼 접혀 보고가 없었습니다).

이 보고서가 *말하는 것*을 분해하면:

1. **에러 종류**: `stack-buffer-overflow` — 스택 변수의 경계 침범
2. **접근 종류**: `WRITE of size 14` — 14바이트를 쓰려 함
3. **스택 트레이스**: #1의 `ch02_main.c:4`가 우리 코드의 `strcpy` 줄입니다. #0은 검사를 수행한 인터셉터입니다.
4. **할당 정보**: `[32, 40)` — `buf`라는 변수가 차지하는 영역 (8바이트)
5. **위반 위치**: `offset 40` — 변수 끝(40) 자리에 접근 → 1바이트만 넘어도 보고
6. **요약 한 줄**: 버그 종류와 위치 한 줄

CI 로그를 `grep SUMMARY`로 훑으면 버그 종류는 바로 보입니다. 다만 위치는 맨 위 프레임을 따르므로, GCC 로그처럼 인터셉터 파일(`sanitizer_common_interceptors_memintrinsics.inc:115 in memcpy`)이 찍히면 스택 트레이스에서 첫 번째 우리 코드 프레임을 다시 찾아야 합니다.

---

## 직접 확인 — 탐지·복구·종료를 나눠 실행

다음 두 파일은 정상 입력, ASan 경계 위반, UBSan 복구·중단을 분리하기 위한 작은 예제입니다.

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

Debian 13의 clang 19에서 나온 결과입니다(macOS Apple clang 21도 출력은 같고 비정상 종료 코드만 134였습니다).

```text
$ ./bounds
value=42
$ ./bounds bad
==800==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x502000000014 at pc 0xaaaabfc68e80 bp 0xffffe125eb50 sp 0xffffe125eb48
...
SUMMARY: AddressSanitizer: heap-buffer-overflow /root/t/bounds.cpp:5:19 in main
$ echo $?
1
$ ./overflow
overflow.cpp:5:26: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior overflow.cpp:5:26 
continued
$ echo $?
0
$ UBSAN_OPTIONS=halt_on_error=1 ./overflow
overflow.cpp:5:26: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior overflow.cpp:5:26 
$ echo $?
1
```

`-fsanitize-trap=undefined`를 더해 빌드한 `overflow`는 메시지 없이 `Trace/breakpoint trap`으로 끝났고 종료 코드는 133이었습니다. 누수 검사는 3장에서 따로 봅니다.

## 정리

- ASan + UBSan은 *컴파일과 링크 둘 다*에 적용합니다. 컴파일만 하면 링크 실패, 링크만 하면 검사 없이 실행됩니다.
- 권장 옵션: `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`.
- `ASAN_OPTIONS=help=1`로 기본값을 읽습니다. macOS와 Linux는 `detect_leaks`·`abort_on_error`가 다릅니다. UBSan은 기본으로 계속 진행하므로 CI에서는 `halt_on_error=1`을 줍니다.
- 줄 번호는 `-g`와 심볼라이저가 만듭니다. macOS는 `atos`, Debian clang은 `llvm-symbolizer`, GCC는 내장 libbacktrace를 썼습니다.
- *Suppression*은 외부 라이브러리·알려진 false positive에만. 우리 코드 버그를 가리지 마라.
- 초기화 순서 검사는 Linux와 (문서와 달리) macOS에서도 동작했고, libstdc++ vector 검사는 `-D_GLIBCXX_SANITIZE_VECTOR`가 있어야 켜집니다.
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
