---
title: "Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan"
slug: "tools/debugging/sanitizers/chapter01-intro"
date: 2026-05-29T09:01:00
description: "C/C++ 런타임 검사 도구 Sanitizer 계열의 역할, 종류별 선택, 실무 도입 순서."
tags: [Sanitizer, ASan, UBSan, TSan, LSan, MSan, Debugging, C, cpp]
series: "Sanitizers"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 Sanitizer인가

정적 분석과 런타임 검사는 서로 다른 증거를 제공합니다. 정적 분석으로 찾을 수 있는 메모리 오류도 있지만, 실제 입력과 스레드 실행 경로에서만 관찰되는 문제도 있습니다. 그렇다고 디버거로 한 줄 한 줄 추적하는 건 비효율적입니다 — 문제가 *어디서 시작됐는지* 모르기 때문입니다.

**Sanitizer**는 이 틈을 메웁니다. 컴파일러가 *런타임 검사 코드*를 자동 삽입해, 문제가 *발생하는 순간*에 즉시 보고합니다. 이 시리즈의 출력은 모두 직접 실행해서 얻었습니다. macOS 27.2.1(Apple M2 Pro)의 Apple clang 21.0.0과 Homebrew LLVM 23.1.5, 그리고 macOS에서 돌지 않는 검사(MSan, GCC 런타임, Linux 기본값)는 같은 Mac의 QEMU에 띄운 Debian 13 arm64 게스트에서 돌렸습니다.

크기 10의 버퍼에 NUL까지 12바이트를 복사하는 흔한 실수부터 봅니다.

```c title="main.c"
#include <string.h>
int main(void) {
    char buf[10];
    strcpy(buf, "hello world");
    return buf[0];
}
```

Apple clang 21에서 `-fsanitize=address -g -O0`으로 빌드해 실행하면 이렇게 멈춥니다(뒤쪽 shadow byte 덤프는 생략).

```text
=================================================================
==40532==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x00016fd8e10a at pc 0x0001008d2af4 bp 0x00016fd8e0d0 sp 0x00016fd8d880
WRITE of size 12 at 0x00016fd8e10a thread T0
    #0 0x0001008d2af0 in strcpy+0x458 (libclang_rt.asan_osx_dynamic.dylib:arm64e+0x3aaf0)
    #1 0x00010007092c in main main.c:4
    #2 0x0001895ccd78 in start+0x19f8 (dyld:arm64e+0x31d78)

Address 0x00016fd8e10a is located in stack of thread T0 at offset 42 in frame
    #0 0x000100070814 in main main.c:2

  This frame has 1 object(s):
    [32, 42) 'buf' (line 3) <== Memory access at offset 42 overflows this variable
...
SUMMARY: AddressSanitizer: stack-buffer-overflow main.c:4 in main
```

같은 파일을 `-O1`로 빌드하면 아무 보고 없이 종료 코드 104(`'h'`)로 끝났습니다. 생성된 어셈블리를 보면 `main` 전체가 `mov w0, #104` / `ret` 두 명령으로 접혀 있었습니다. 상수 문자열 복사를 컴파일러가 미리 계산해 버려서, 검사할 메모리 접근 자체가 남지 않았습니다. 입력을 `argv[1]`로 바꾸면 `-O1`에서도 같은 `stack-buffer-overflow`가 보고됐습니다. Sanitizer는 **실행된 명령**만 검사한다는 점을 첫 예제부터 보여 줍니다.

정적 분석이 *코드 패턴*을 보고, Valgrind가 *바이너리 실행*을 보는 동안, Sanitizer는 *컴파일러 계측*으로 그 둘 사이에 자리 잡습니다. 세 도구의 위치는 다음과 같습니다.

| 도구 | 검사 방식 | 확인 범위 |
| --- | --- | --- |
| 정적 분석 | 실행 없이 소스·경로 분석 | 실행하지 않은 경로까지 봅니다. 위 `strcpy`는 Apple clang이 컴파일 단계에서 `-Wfortify-source` 경고로 먼저 잡았습니다. |
| Sanitizer | 컴파일 계측과 런타임 검사 | 계측된 코드 중 실제로 실행된 접근만 봅니다. 위 `-O1` 빌드처럼 최적화로 사라진 접근은 검사하지 않습니다. |
| Valgrind Memcheck | 실행 파일의 동적 분석 | 재컴파일 없이 돌지만 [지원 플랫폼](https://valgrind.org/info/platforms.html)에 ARM64/macOS는 없습니다(Darwin은 X86·AMD64만). |

비용은 공식 문서가 밝힌 "typical" 값으로 비교할 수 있습니다. Clang 문서는 ASan 2x, TSan 5x~15x(메모리 5x~10x), MSan 3x를 적고, LSan은 단독 모드에서 "almost no performance overhead"라고 적습니다. [Valgrind Quick Start](https://valgrind.org/docs/manual/quick-start.html)는 Memcheck에서 프로그램이 "20 to 30 times" 느려진다고 적습니다. 이 값들은 각 문서의 일반론이고, 4장에서 정렬 작업 하나로 직접 잰 값은 이보다 작았습니다.

---

## Sanitizer 다섯 종류

대표적인 다섯 검사 계열입니다. 오른쪽 세 칸은 `int main(){return 0;}`을 각 옵션으로 빌드해 본 결과입니다.

| Sanitizer | 옵션 | 주요 검사 | Apple clang 21 (macOS) | Homebrew LLVM 23 (macOS) | Debian 13 clang 19·GCC 14 |
| --- | --- | --- | --- | --- | --- |
| ASan | `-fsanitize=address` | 힙·스택·전역 경계, use-after-free, double-free | 됨 | 됨 | 둘 다 됨 |
| UBSan | `-fsanitize=undefined` | 정수 오버플로, 널·정렬, 시프트 등 개별 검사 묶음 | 됨 | 됨 | 둘 다 됨 |
| LSan | `-fsanitize=leak` | 종료 시점에 도달 불가능한 힙 블록 | `unsupported option` | 됨 | 둘 다 됨 |
| TSan | `-fsanitize=thread` | 동기화 없이 겹친 접근(데이터 레이스) | 됨 | 됨 | 둘 다 됨 |
| MSan | `-fsanitize=memory` | 초기화되지 않은 값의 사용 | `unsupported option` | `unsupported option` | clang 됨, gcc `unrecognized argument` |

[LSan 문서](https://clang.llvm.org/docs/LeakSanitizer.html#supported-platforms)는 지원 플랫폼에 macOS를 적지만, Apple이 배포한 clang 21은 arm64 macOS에서 `-fsanitize=leak`을 `unsupported option for target 'arm64-apple-darwin27.2.0'`로 거부했습니다. 같은 Mac에서 Homebrew LLVM은 받아들였습니다. 같은 "clang"이라도 어느 배포판의 compiler-rt를 쓰는지가 결과를 가릅니다. MSan은 [문서](https://clang.llvm.org/docs/MemorySanitizer.html#supported-platforms)부터 Linux·NetBSD·FreeBSD만 적습니다.

### 호환성 — 한 빌드에 같이 쓸 수 있는가

| | ASan | UBSan | LSan | TSan | MSan |
|---|---|---|---|---|---|
| ASan | — | ✓ | ✓ (포함) | ✗ | ✗ |
| UBSan | ✓ | — | ✓ | ✓ | ✓ |
| TSan | ✗ | ✓ | ✗ | — | ✗ |
| MSan | ✗ | ✓ | ✗ | ✗ | — |

표의 ✗는 컴파일러가 드라이버 단계에서 거부한 조합입니다. 예를 들어 `-fsanitize=address,thread`는 Apple clang과 Homebrew LLVM 모두 `invalid argument '-fsanitize=address' not allowed with '-fsanitize=thread'`로 멈췄고, `-fsanitize=thread,leak`도 Homebrew LLVM에서 같은 형식의 오류를 냈습니다. Debian 13에서도 GCC 14는 `‘-fsanitize=thread’ is incompatible with ‘-fsanitize=address’`로 멈췄고, clang 19는 `address,memory`·`thread,memory`·`memory,leak`을 모두 같은 `not allowed with` 오류로 거부했습니다.

핵심 규칙 셋만 기억하면 됩니다.

1. **UBSan은 다른 검사 계열과 조합할 수 있습니다.** `undefined,address`와 `undefined,thread`는 위 세 환경에서 모두 빌드됐습니다.
2. **ASan + TSan + MSan은 서로 배타적**입니다. 위에서 본 대로 세 환경의 드라이버가 이 셋 중 둘을 함께 주는 조합을 모두 거부했습니다.
3. **LSan은 ASan 런타임에 들어 있습니다.** [LSan 문서](https://clang.llvm.org/docs/LeakSanitizer.html)는 ASan이 "enables it by default on supported platforms"라고 적습니다. 실제 기본값은 런타임마다 달랐습니다. macOS에서는 `ASAN_OPTIONS=help=1`이 `detect_leaks`의 현재 값을 `false`로 보여 줬고, Apple clang 런타임은 `detect_leaks=1`을 주면 `detect_leaks is not supported on this platform.`을 찍고 abort했습니다. 반대로 Debian 13의 clang 19·GCC 14 런타임은 `detect_leaks`가 `true`여서 `-fsanitize=address`만으로 종료 시 누수 보고가 나왔습니다(3장).

결과적으로 *실무에서 만나는 빌드는 세 가지*입니다.

- **ASAN/UBSAN 빌드**: `-fsanitize=address,undefined` — 가장 자주 사용
- **TSAN 빌드**: `-fsanitize=thread` (UBSan과 같이 켜기 가능) — 멀티스레드용
- **MSAN 빌드**: `-fsanitize=memory` (Clang) — 드물지만 깊은 초기화 추적용

---

## 어떤 순서로 도입하나

기존 프로젝트에 Sanitizer를 처음 도입할 때 권장 순서입니다.

### 1단계 — `-fsanitize=address,undefined`

ASan과 UBSan을 함께 시험하는 시작 설정입니다. 두 검사는 한 빌드에 들어가고, 1장 첫 예제처럼 런타임 입력을 받는 경로라면 `-O1`에서도 잡힙니다.

```bash
CFLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1"
```

각 옵션의 역할:

- `-fsanitize=address,undefined` — ASan + UBSan 켜기
- `-fno-omit-frame-pointer` — frame pointer를 유지해 스택 해석을 돕습니다. [ASan 문서](https://clang.llvm.org/docs/AddressSanitizer.html#usage)는 "perfect stack traces"가 필요하면 인라인을 줄이고(`-O1`) `-fno-optimize-sibling-calls`로 tail call 제거도 끄라고 적습니다.
- `-g` — 디버그 정보. 없으면 보고서가 `process_data+0x48 (nog:arm64+0x1000005d8)`처럼 함수 이름과 오프셋만 보여 주고, 있으면 `process_data pipe.c:2`처럼 파일·줄을 보여 줍니다(2장에서 실행).
- `-O1` — ASan 문서의 표현으로 "To get a reasonable performance add -O1 or higher"입니다. 대신 앞의 `strcpy` 예처럼 최적화가 버그 있는 접근을 통째로 지울 수 있습니다.

경고가 없다는 결과는 "이 빌드가 실행한 명령에 걸린 검사가 없었다"는 뜻입니다. 앞의 `-O1` 빌드는 오버플로를 그대로 둔 채 경고 없이 종료했습니다.

### 2단계 — 멀티스레드면 `-fsanitize=thread`

데이터 레이스는 결과가 맞게 나와도 숨어 있을 수 있습니다. 두 스레드가 전역 `int`를 하나씩 올리는 프로그램을 Apple clang 21의 TSan으로 돌리면, 출력은 기대값 `2`였는데도 TSan이 `WARNING: ThreadSanitizer: data race`를 보고했습니다. 보고서는 먼저 끝난 스레드를 `Thread T1 (tid=…, finished)`로 표시했습니다. 두 증가가 실제로 겹치지 않은 실행에서도, 둘 사이에 동기화가 없다는 사실만으로 레이스를 찾아냈습니다(4장).

```bash
# 별도 빌드 — ASan과 같은 빌드에 넣으면 드라이버가 거부합니다
CFLAGS_TSAN="-fsanitize=thread -fno-omit-frame-pointer -g -O1"
```

### 3단계 — 깊은 분석이 필요하면 MSan/LSan/UBSan trap 모드

- **MSan**: *초기화 안 된 값*을 추적합니다. Clang 전용이고 Linux 등에서만 지원됩니다. [MSan 문서](https://clang.llvm.org/docs/MemorySanitizer.html#handling-external-code)는 프로그램의 모든 코드, 표준 라이브러리까지 MSan으로 빌드하라고 요구합니다. 문서는 이를 지키지 않으면 "false reports"가 날 수 있다고 적고, 대신 런타임에 흔한 libc 함수용 인터셉터 70여 개를 넣어 두었다고 설명합니다. Debian 13에서 계측하지 않은 libstdc++로 `std::string`에 문자열 리터럴을 이어 붙이는 작은 예제를 MSan으로 돌렸을 때는 보고 없이 `11`이 나왔습니다.
- **LSan 단독**: `-fsanitize=leak`은 ASan의 경계 검사 없이 누수 검사만 넣습니다. Homebrew LLVM 23이나 Linux에서 씁니다(3장).
- **UBSan trap 모드**: `-fsanitize=undefined -fsanitize-trap=undefined`는 진단 런타임 없이 UB 자리에 트랩 명령을 넣습니다. Apple clang 21에서 signed overflow 예제를 이렇게 빌드하면 바이너리에 UBSan dylib이 링크되지 않았고, 어셈블리에 `brk #0x5500`이 들어갔으며, 실행은 메시지 없이 종료 코드 133(SIGTRAP)으로 끝났습니다.

---

## 도구별 *언제 어떤 버그를 잡는가*

### ASan이 잡는 것

인자로 고른 버그 하나만 실행하는 작은 프로그램입니다. 처음에는 포인터를 평범한 지역 변수로 썼는데, `-O1`에서 use-after-free·double-free 두 경우가 보고 없이 지나갔습니다. 해제 뒤 쓰기는 UB라서 컴파일러가 그 쓰기와 짝이 되는 `malloc`/`free`를 지워 버렸습니다. 그래서 포인터를 `volatile`로 만들어 접근이 남게 했습니다.

```c title="asan_cat.c"
#include <stdlib.h>
int g[4];
int main(int argc, char **argv) {
    int which = argc > 1 ? atoi(argv[1]) : 0;
    if (which == 1) { int *volatile p = malloc(40); free(p); p[0] = 1; }
    if (which == 2) { int *volatile q = malloc(40); free(q); free(q); }
    if (which == 3) { int x; int *volatile p = &x; free(p); }
    if (which == 4) { volatile int i = 4; g[i] = 1; }
    return 0;
}
```

Apple clang 21, `-fsanitize=address -g -O1`로 빌드해 각 인자로 실행한 `SUMMARY` 줄입니다.

```text
$ ./ac 1
SUMMARY: AddressSanitizer: heap-use-after-free asan_cat.c:5 in main
$ ./ac 2
SUMMARY: AddressSanitizer: double-free asan_cat.c:6 in main
$ ./ac 3
SUMMARY: AddressSanitizer: bad-free asan_cat.c:7 in main
$ ./ac 4
```

`./ac 4`의 전역 배열 오버플로는 Apple clang에서 아무것도 보고되지 않았습니다. 어셈블리를 보면 `int g[4];`가 `.comm _g,16,2`, 즉 common 심볼로 나갔고 ASan은 common 심볼에 redzone을 두지 않습니다. `-fno-common`을 주거나 `int g[4] = {1};`처럼 초기값을 주면 `global-buffer-overflow asan_cat.c:8`이 보고됐고, Homebrew LLVM 23은 옵션 없이도 보고했습니다. Debian 13의 GCC 14와 clang 19는 네 경우를 모두 보고했고, `./ac 4`도 `global-buffer-overflow asan_cat.c:8`이었습니다.

STL 컨테이너는 라이브러리가 ASan에 "여기부터는 아직 원소가 아니다"를 알려 줘야 잡힙니다. macOS의 libc++에서는 `std::vector<int> v(10); v.reserve(32);` 뒤 `v.data()[15]`를 읽으면 `container-overflow`가, capacity 밖의 `v.data()[40]`은 `heap-buffer-overflow`가 보고됐습니다. Debian 13의 libstdc++에서는 같은 `v.data()[15]`가 보고 없이 `v[15]=-1094795586`을 읽었습니다. 이 값은 ASan이 새 힙 블록을 채우는 바이트 `0xbe`가 네 번 반복된 것입니다. [libstdc++ 매크로 문서](https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_macros.html)가 설명하는 `-D_GLIBCXX_SANITIZE_VECTOR`를 주자 `container-overflow`가 보고됐습니다. 문서는 이 매크로를 vector를 만들고 바꾸는 모든 번역 단위에 같은 값으로 정의하라고 적습니다.

### UBSan이 잡는 것

ASan 예제와 같은 방식으로, 인자로 고른 UB 하나를 실행합니다.

```cpp title="ub_cat.cpp"
#include <climits>
#include <cstdlib>
#include <cstdio>
struct Base { virtual ~Base() {} };
struct D1 : Base {};
struct D2 : Base { int v = 0; };
int main(int argc, char **argv) {
    int which = argc > 1 ? std::atoi(argv[1]) : 0;
    if (which == 1) { volatile int x = INT_MAX; x = x + 1; }
    if (which == 2) { int *volatile p = nullptr; std::printf("%d\n", *p); }
    if (which == 3) { char buf[8] = {}; int *volatile p = (int *)(buf + 1); std::printf("%d\n", *p); }
    if (which == 4) { Base *volatile b = new D1(); D2 *d2 = static_cast<D2 *>(b); std::printf("%d\n", d2->v); }
    std::puts("end");
    return 0;
}
```

Apple clang 21, `-fsanitize=undefined -g -O1`에서 나온 첫 줄입니다.

```text
$ ./uc 1
ub_cat.cpp:9:55: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
$ ./uc 2
ub_cat.cpp:10:70: runtime error: load of null pointer of type 'int'
$ ./uc 3
ub_cat.cpp:11:97: runtime error: load of misaligned address 0x00016d98e191 for type 'int', which requires 4 byte alignment
$ ./uc 4
0
end
```

`./uc 1`은 보고 뒤 `end`까지 실행을 이어 갔고, `./uc 2`는 보고 뒤 실제 널 접근으로 `SEGV`가 났습니다. UBSan은 기본으로 보고만 하고 계속 진행하기 때문입니다(2장).

`./uc 4`의 잘못된 다운캐스트는 그냥 지나갔습니다. [UBSan 문서](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html#available-checks)는 `-fsanitize=vptr`에 대해 "The check is not a part of the undefined group"이라고 적습니다. `-fsanitize=undefined,vptr`로 다시 빌드하자 `runtime error: downcast of address 0x000103dd53b0 which does not point to an object of type 'D2'`와 `note: object is of type 'D1'`이 나왔습니다. Debian 13의 clang 19는 `-fsanitize=undefined`만으로 이 다운캐스트를 보고했고, `-###`로 본 검사 목록 끝에 `vptr`이 들어 있었습니다. GCC 14도 같은 보고를 냈습니다. 같은 옵션이라도 clang 19에는 vptr이 들어 있고 Apple clang 21과 LLVM 23에는 빠져 있습니다.

`-fsanitize=undefined`가 실제로 켜는 검사는 `clang++ -fsanitize=undefined -###`로 볼 수 있습니다. Apple clang 21은 `alignment, array-bounds, bool, builtin, enum, float-cast-overflow, integer-divide-by-zero, nonnull-attribute, null, pointer-overflow, return, returns-nonnull-attribute, shift-base, shift-exponent, signed-integer-overflow, unreachable, vla-bound` 17개를, Homebrew LLVM 23은 여기에 `function`을 더한 18개를 펼쳤습니다. 필요한 것만 `-fsanitize=signed-integer-overflow,null,bounds`처럼 개별로 켤 수도 있습니다.

### TSan이 잡는 것

```cpp
std::atomic<bool> ready{false};
int data = 0;

std::thread t1([&] {
    data = 42;        // ready의 store 이전 쓰기
    ready = true;
});

std::thread t2([&] {
    if (ready) {
        std::cout << data;   // ready의 true를 읽었다면 안전
    }
});
```

위 코드는 레이스 예제가 아닙니다. `ready`의 기본 store/load는 `seq_cst`이며, `true`를 읽은 쪽에는 이전 `data` 쓰기가 전달됩니다([C++ atomic 순서 규칙](https://eel.is/c++draft/atomics.order)). 이 장 끝의 완전한 프로그램은 다섯 번 실행 모두 `data=42`와 종료 코드 0으로 끝났고 TSan 경고는 없었습니다. 두 연산을 `relaxed`로 바꾸면 `data`의 동기화가 사라지고, 4장에서 같은 TSan이 `data race`를 보고합니다.

### LSan이 잡는 것

```c
void* p = malloc(40);
return;                          // ❌ 누수 — p 해제 안 됨
```

LSan은 해제하지 않은 할당을 모두 나열하지 않습니다. 종료 시점에 전역·스택·레지스터에서 가리키는 포인터가 하나라도 남아 있으면 "도달 가능"으로 보고 넘어갑니다. 이 판정은 보수적이라, Homebrew LLVM 23의 `-fsanitize=leak`으로 40바이트를 할당하고 버리는 함수 하나를 호출한 뒤 바로 종료했을 때는 보고가 없었습니다. LSan은 스택을 포인터 후보로 훑기 때문에, 덮어쓰이지 않고 남은 옛 포인터 값이 블록을 도달 가능하게 만듭니다. 할당을 별도 함수에서 100번 하고, 다른 함수로 스택을 덮어쓴 뒤 종료하자 `Direct leak of 4000 byte(s) in 100 object(s)`가 나왔습니다(3장).

### MSan이 잡는 것

```c
int x;                           // 초기화 없음
if (x > 0) {                    // ❌ uninitialized value
    do_something();
}
```

Debian 13의 clang 19에서 이 패턴을 `-fsanitize=memory -g`(`-O0`)로 빌드하면 `if` 줄에서 `WARNING: MemorySanitizer: use-of-uninitialized-value`가 나오고 종료 코드 1로 멈췄습니다. 같은 코드를 `-O1`로 빌드하면 보고 없이 `end`까지 실행됐습니다. 초기화되지 않은 지역 변수의 값은 컴파일러가 마음대로 정해도 되므로, 최적화가 비교 자체를 없앴습니다. `malloc`한 배열을 읽는 경우는 `-O1`에서도 보고됐고, `-fsanitize-memory-track-origins=2`를 더하면 보고 아래에 `Uninitialized value was created by a heap allocation`과 그 `malloc` 줄이 붙었습니다.

MSan은 초기화되지 않은 값을 *복사*할 때가 아니라 그 값으로 분기하거나 바깥에 넘길 때 보고합니다. 두 문장이 같은 8번 줄에 있는 예제에서, 보고 위치 `msan.c:8:93`의 열 93은 `int y = p[1];` 복사가 아니라 그 뒤 `if (y)`를 가리켰습니다.

ASan은 *경계 위반*을, MSan은 *내용 초기화*를 봅니다. 둘은 서로 다른 종류의 버그를 잡고, 앞의 호환성 표대로 한 빌드에 같이 넣을 수도 없습니다.

---

## 자주 묻는 한 가지 — *왜 Valgrind 안 쓰고?*

Valgrind Memcheck는 ASan과 *비슷한 버그*를 잡지만, 동작 방식이 다릅니다.

| | Sanitizer | Valgrind Memcheck |
| --- | --- | --- |
| 준비 | 검사할 코드를 `-fsanitize=`로 다시 빌드합니다. | 이미 있는 실행 파일을 `valgrind ./app`으로 돌립니다. |
| 외부 라이브러리 | 계측하지 않은 라이브러리 안의 접근은 검사하지 않습니다. MSan 문서는 비계측 코드가 오탐을 낼 수 있다고 적습니다. | 재빌드 없이 라이브러리 안까지 봅니다. |
| 초기화 상태 | MSan을 별도 빌드로 켭니다. | 기본 도구가 초기화되지 않은 값의 사용을 추적합니다. |
| 속도(문서 값) | ASan 2x, MSan 3x | 20~30배 |
| 이 Mac(arm64 macOS) | ASan·UBSan·TSan 동작 | 지원 플랫폼 목록에 없음 |

소스를 다시 빌드할 수 있고 속도가 중요하면 Sanitizer를, 빌드할 수 없는 바이너리나 라이브러리 안쪽까지 봐야 하면 Valgrind를 고릅니다.

자세한 비교는 별도 시리즈 [Valgrind](/blog/tools/debugging/valgrind/chapter01-intro)에서 다룹니다.

---

## 시리즈 로드맵

이 시리즈는 다음 다섯 챕터로 구성됩니다.

1. **Ch 1: Sanitizers 개요** (이 글)
2. **Ch 2: ASan + UBSan 실전 설정** — 컴파일 옵션, 환경 변수, 흔한 오탐, 빠른 우회
3. **Ch 3: LSan과 누수 분석** — 누수 출력 해석, suppression, 일회성 분석
4. **Ch 4: TSan과 데이터 레이스 디버깅** — happens-before 모델, false positive 줄이기
5. **Ch 5: CMake / CI 통합** — 빌드 분기, sanitizer-friendly 라이브러리, GitHub Actions 예시

각 챕터는 *실제로 돌아가는 설정*을 목표로 합니다. 이론보다 *실무 적용*에 무게.

---

## 직접 확인 — atomic으로 데이터 전달

아래는 앞선 seq_cst 설명을 완전한 프로그램으로 만든 예제입니다. 소비자가 true를 읽을 때까지 기다리므로 출력은 data=42입니다. relaxed 레이스 사례와 수정 비교는 4장에서 다룹니다.

```cpp title="publication.cpp"
#include <atomic>
#include <iostream>
#include <thread>

int main() {
    std::atomic<bool> ready{false};
    int data = 0;
    std::thread producer([&] {
        data = 42;
        ready = true;
    });
    std::thread consumer([&] {
        while (!ready) std::this_thread::yield();
        std::cout << "data=" << data << '\n';
    });
    producer.join();
    consumer.join();
}
```

Apple clang 21에서 빌드해 다섯 번 실행했고, Debian 13의 clang 19에서도 한 번 실행했습니다.

```text
$ clang++ -std=c++17 -O1 -g -fsanitize=thread publication.cpp -o publication
$ ./publication
data=42
$ echo $?
0
```

여섯 번 모두 출력은 `data=42`, 종료 코드는 0이었고 TSan 경고는 없었습니다. TSan이 레이스를 찾으면 Linux에서는 종료 코드가 66으로 바뀌므로(4장) 0은 "이 실행에서 보고된 레이스가 없다"는 뜻입니다.

## 정리

- *Sanitizer*는 컴파일러가 넣은 검사 코드로 실행 중에 버그를 잡습니다. 실행되지 않은 경로와 최적화로 사라진 접근은 보지 못합니다(`-O1`의 `strcpy` 예).
- 다섯 가지: **ASan / UBSan / LSan / TSan / MSan**. UBSan은 나머지와 함께 빌드되고, ASan·TSan·MSan끼리는 드라이버가 거부합니다.
- 시작 설정은 `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`입니다. Apple clang에는 LSan·MSan이 없고, MSan은 이번 세 환경 중 Debian의 clang에서만 빌드됐습니다.
- 멀티스레드면 *별도 빌드*로 `-fsanitize=thread`.
- Valgrind는 *재컴파일 불가능한 바이너리*에 보완으로.

## 다음 장 예고

[Ch 2: ASan + UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)에서는 황금 조합을 *실제로 켜고 운영*하는 자세한 방법을 다룹니다. 환경 변수(`ASAN_OPTIONS`, `UBSAN_OPTIONS`), suppression 파일, 흔한 오탐 패턴, 그리고 *어디까지 켜고 어디는 꺼야 하는지* 결정 가이드.

## 참고 자료

- [Google Sanitizers (GitHub)](https://github.com/google/sanitizers) — 공식 위키
- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html)
- [GCC Sanitizer Options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [ThreadSanitizer 설계 논문 (Google, 2009)](https://research.google/pubs/pub35604/)

## 관련 항목

- [Ch 2: ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — 황금 조합을 실제 프로젝트에서 운영하는 방법
- [Valgrind Ch 1: 도구 개요](/blog/tools/debugging/valgrind/chapter01-intro) — Memcheck·Helgrind·DRD와의 역할 대응
- [GDB·LLDB Ch 1: 두 디버거의 차이와 선택](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — sanitizer가 잡은 자리를 이어서 추적할 때
- [Google Sanitizers Wiki](https://github.com/google/sanitizers/wiki) — 다섯 sanitizer의 공식 문서 모음
