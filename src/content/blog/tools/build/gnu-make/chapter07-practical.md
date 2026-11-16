---
title: "실전 Makefile 예제 — C/C++ 프로젝트용 기본 골격"
slug: "tools/build/gnu-make/chapter07-practical"
date: 2026-06-03T09:07:00
description: "모드별 빌드와 자동 의존성, 크로스 도구 선택, 테스트·설치 규칙을 검증하는 Makefile 예제."
tags: [make, build, practical]
series: "GNU Make"
seriesOrder: 7
draft: false
topics: ["tools", "tools/build"]
---

## 이 장에서 다루는 것

[Ch 1](/blog/tools/build/gnu-make/chapter01-intro)부터 [Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals)까지의 도구를 한 자리에 모읍니다. 모든 예제는 GNU Make 4.4.1, macOS 27.2.1(Apple M2 Pro), Apple clang 21.0.0에서 실행했고, 출력은 그 실행에서 복사했습니다. 크로스 컴파일 절은 도구 이름이 제대로 골라지는지만 확인했습니다. 이 기계에는 ARM·RISC-V 크로스 컴파일러가 없어 실제 크로스 빌드와 타겟 보드 실행은 하지 않았습니다.

- 기본 C 프로젝트
- C++ + 정적 분석·sanitizer 통합
- 정적·동적 라이브러리 빌드
- 크로스 컴파일
- 테스트 자동화
- `install`, `help`, `verbose` 같은 운영 패턴

---

## 기본 C 프로젝트

디렉터리는 다음과 같이 잡습니다.

```text
myproject/
├── Makefile
├── include/
│   └── mylib.h
├── src/
│   ├── main.c
│   └── mylib.c
└── build/
```

`build/`는 Makefile이 만드는 디렉터리라 `.gitignore`에 넣습니다. `include/`에는 다른 코드가 쓸 헤더를, `src/`에는 구현을 둡니다.

```makefile title="Makefile"
# === 설정 ===
CC := gcc
CFLAGS := -Wall -Wextra -std=c11
CPPFLAGS := -Iinclude
LDFLAGS :=
LDLIBS :=

# 디버그/릴리스 분기
DEBUG ?= 0
ifeq ($(DEBUG),1)
    CFLAGS += -g -O0 -DDEBUG
    BUILDDIR := build/debug
else
    CFLAGS += -O2 -DNDEBUG
    BUILDDIR := build/release
endif

# === 파일 목록 ===
SRCDIR := src
SRCS := $(wildcard $(SRCDIR)/*.c)
ifeq ($(strip $(SRCS)),)
$(error No C sources found under $(SRCDIR))
endif
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)

TARGET := $(BUILDDIR)/myapp

# === 타겟 ===
.PHONY: all clean rebuild run

all: $(TARGET)

$(TARGET): $(OBJS)
	@echo "[LINK] $@"
	@$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	@echo "[CC] $<"
	@$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

$(BUILDDIR):
	@mkdir -p $@

clean:
	@echo "[CLEAN]"
	@$(RM) -r build

rebuild:
	$(MAKE) clean
	$(MAKE) all

run: $(TARGET)
	@./$(TARGET)

-include $(DEPS)
```

### 한눈에 짚어 볼 점

- `BUILDDIR`이 *모드별로 갈라져* 디버그와 릴리스 산물이 섞이지 않습니다.
- order-only `| $(BUILDDIR)`로 디렉터리를 보장합니다([Ch 2](/blog/tools/build/gnu-make/chapter02-rules#order-only-의존성--있기만-하면-ok)).
- `-MMD -MP`로 헤더 의존성을 자동 추적합니다([Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals#자동-의존성-생성--실무-표준-패턴)).
- 소스가 하나도 없으면 `$(error)`로 바로 멈춥니다(아래 "흔한 실수 1").
- 레시피에 `@` 접두사와 `[LINK]`/`[CC]` 라벨을 써서 명령 대신 짧은 진행 표시만 보입니다.

### 사용법

위 Makefile을 다음 세 소스 파일과 함께 저장하면 그대로 실행됩니다. 헤더를 두 C 파일이 모두 포함하므로 헤더를 바꾸면 두 오브젝트가 다시 컴파일됩니다.

```c title="include/mylib.h"
#define ANSWER 42
int answer(void);
```

라이브러리 구현은 매크로를 읽어 값을 반환합니다.

```c title="src/mylib.c"
#include "mylib.h"
int answer(void) { return ANSWER; }
```

실행 파일에서 결과를 출력합니다.

```c title="src/main.c"
#include "mylib.h"
#include <stdio.h>
int main(void) { printf("answer=%d\n", answer()); }
```

```text
$ make
[CC] src/main.c
[CC] src/mylib.c
[LINK] build/release/myapp
$ make DEBUG=1
[CC] src/main.c
[CC] src/mylib.c
[LINK] build/debug/myapp
$ make run
answer=42
$ make DEBUG=1 run
answer=42
```

`include/mylib.h`의 `ANSWER`를 43으로 바꾸고 `make run`을 실행하면 `[CC]` 두 줄과 `[LINK]` 뒤에 `answer=43`이 나왔습니다. `make rebuild`는 `make clean`과 `make all`을 하위 Make로 차례로 실행하고, `make rebuild DEBUG=1`처럼 준 변수는 `MAKEFLAGS`를 통해 두 하위 Make에 전달됐습니다.

`rebuild`를 하위 Make 두 번으로 적은 이유를 확인해 봤습니다. 같은 Makefile에 `rebuild2: clean all`을 추가하고 `make -j4 rebuild2`를 다섯 번 실행했더니 다섯 번 모두 실패했습니다.

```text
$ make -j4 rebuild2
[CLEAN]
[CC] src/main.c
[CC] src/mylib.c
error: unable to open output file 'build/release/main.o': 'No such file or directory'
1 error generated.
error: unable to open output file 'build/release/mylib.o': 'No such file or directory'
1 error generated.
make: *** [Makefile:40: build/release/mylib.o] Error 1
make: *** Waiting for unfinished jobs....
make: *** [Makefile:40: build/release/main.o] Error 1
```

`build/release`가 이미 있어서 order-only 의존성은 만족된 상태였고, `clean`과 컴파일이 병렬로 시작된 사이 `clean`이 그 디렉터리를 지웠습니다. `clean`과 `all` 사이에 의존 관계가 없으니 `-j`에서는 순서가 보장되지 않습니다.

---

## C++ 프로젝트 — 정적 분석·sanitizer 통합

C++ 프로젝트에 붙일 보조 도구 두 가지를 넣었습니다.

1. **AddressSanitizer / UBSan**: 디버그 빌드에서 메모리 오류와 미정의 동작을 잡습니다.
2. **clang-tidy / clang-format**: 정적 분석과 자동 포맷입니다.

```makefile
# === 컴파일러 설정 ===
CXX := g++
CXXFLAGS := -Wall -Wextra -std=c++17
CPPFLAGS := -Iinclude
LDFLAGS :=
LDLIBS := -lpthread

# === 빌드 타입 ===
BUILD_TYPE ?= release
ifeq ($(BUILD_TYPE),debug)
    CXXFLAGS += -g -O0 -DDEBUG -fsanitize=address,undefined
    LDFLAGS += -fsanitize=address,undefined
else ifeq ($(BUILD_TYPE),release)
    CXXFLAGS += -O3 -DNDEBUG -march=native
else
    $(error Unknown BUILD_TYPE: $(BUILD_TYPE). Use 'debug' or 'release'.)
endif

BUILDDIR := build/$(BUILD_TYPE)

# === 소스 자동 감지 (서브디렉터리 포함) ===
SRCDIR := src
SRCS := $(shell find $(SRCDIR) -name '*.cpp')
OBJS := $(patsubst $(SRCDIR)/%.cpp,$(BUILDDIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)
OBJDIRS := $(sort $(dir $(OBJS)))

TARGET := $(BUILDDIR)/myapp

# === 빌드 ===
.PHONY: all clean rebuild run lint format

all: $(TARGET)
	@echo "Build complete: $(TARGET)"

$(TARGET): $(OBJS)
	@echo "[LINK] $@"
	@$(CXX) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.cpp | $(OBJDIRS)
	@echo "[CXX] $<"
	@$(CXX) $(CPPFLAGS) $(CXXFLAGS) -MMD -MP -c $< -o $@

$(OBJDIRS):
	@mkdir -p $@

clean:
	@$(RM) -r build
	@echo "[CLEAN]"

rebuild:
	$(MAKE) clean
	$(MAKE) all

run: $(TARGET)
	@./$(TARGET)

# === 정적 분석 ===
lint:
	@clang-tidy -checks='clang-analyzer-*,bugprone-*' $(SRCS) -- $(CPPFLAGS) $(CXXFLAGS)

format:
	@clang-format -i $(SRCS) $(shell find include -name '*.hpp')

-include $(DEPS)
```

처음 적은 버전에는 `CPPFLAGS`에 `-Ilib`, `LDFLAGS`에 `-Llib`이 있었는데, `lib/`가 없는 프로젝트에서 링크할 때마다 `ld: warning: search path 'lib' not found`가 나와 뺐습니다. `lint`의 `-checks`도 실행해 보고 넣었습니다. Homebrew LLVM 23.1.5의 `clang-tidy`는 설정 파일 없이 부르면 기본 검사가 `clang-diagnostic-*`뿐이라 이 예제에서 `Error: no checks enabled.`로 실패했습니다. 위처럼 `-checks`를 주자 `main.cpp`의 `std::atoi`에 `bugprone-unchecked-string-to-number-conversion` 경고가 나왔습니다. 프로젝트에 `.clang-tidy` 파일을 두면 `-checks` 없이 그 설정을 씁니다.

### `BUILD_TYPE`에 잘못된 값이 오면 `$(error ...)`로 즉시 중단

`$(error ...)`는 Makefile을 읽는 단계에서 확장되므로, 잘못된 값으로 부르면 *컴파일을 시작하기 전에* 멈춥니다.

```text
$ make BUILD_TYPE=fast
Makefile:16: *** Unknown BUILD_TYPE: fast. Use 'debug' or 'release'..  Stop.
```

메시지 끝의 마침표 두 개는 `$(error)`가 메시지 뒤에 `.`를 하나 더 붙이기 때문입니다.

### Sanitizer를 디버그에서만 켜는 이유

`src/main.cpp`가 `std::vector<int>` 8칸을 만들고, 인자를 주면 그만큼 넘어서 읽도록 버그를 심었습니다(`src/sub/sum.cpp`의 `sum()`이 읽음). 릴리스 빌드는 `./myapp 1`에서 아무 경고 없이 `sum=33`을 출력했습니다. 디버그 빌드는 같은 입력에서 멈췄습니다.

```text
$ ./build/debug/myapp 1
=================================================================
==97244==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x603000000f90 ...
READ of size 4 at 0x603000000f90 thread T0
    #0 0x000100150a68 in sum(int const*, int) sum.cpp:5
    #1 0x000100150f34 in main main.cpp:13
...
0x603000000f90 is located 0 bytes after 32-byte region [0x603000000f70,0x603000000f90)
```

비용도 쟀습니다. 1M개 `int` 벡터를 200번 훑는 프로그램을 `-O0 -g`로, sanitizer 없이와 `-fsanitize=address,undefined`로 각각 빌드했습니다.

| 빌드 | 실행 시간 (`time -p`, 3회) | 최대 RSS (`time -l`) |
|------|-------------------|------------|
| `-O0 -g` | 0.77 s · 0.48 s · 0.47 s | 6.0 MB |
| `-O0 -g -fsanitize=address,undefined` | 2.04 s · 1.79 s · 1.81 s | 21.8 MB |

이 프로그램에서는 실행 시간이 약 3.8배, 메모리가 약 3.6배로 늘었습니다. [Clang AddressSanitizer 문서](https://clang.llvm.org/docs/AddressSanitizer.html)는 ASan만의 전형적인 감속을 2배로 적고, 메모리 오버헤드는 할당 크기에 따라 달라진다고 설명합니다. 위 측정은 UBSan까지 켠 결과이고 루프 하나뿐인 프로그램이라 문서의 값과 그대로 비교할 수는 없습니다. 이 비용 때문에 sanitizer는 디버그 구성에만 넣었습니다.

---

## 정적·동적 라이브러리

### 정적 라이브러리 (.a)

```makefile
LIBNAME := mylib
LIBSRCS := $(wildcard lib/*.c)
LIBOBJS := $(LIBSRCS:.c=.o)

lib$(LIBNAME).a: $(LIBOBJS)
	$(AR) rcs $@ $^

# 사용
app_static: main.o lib$(LIBNAME).a
	$(CC) -o $@ main.o -L. -l$(LIBNAME)
```

`lib/add.c`·`lib/mul.c`로 실행하면 `ar rcs libmylib.a lib/add.o lib/mul.o`가 돌고, `ar t libmylib.a`는 `__.SYMDEF SORTED`, `add.o`, `mul.o`를 보여 줬습니다. 첫 항목이 `s`가 만든 심볼 인덱스입니다. 세 글자의 뜻은 macOS `ar(1)` 매뉴얼 기준으로 다음과 같습니다.

| 옵션 | 동작 |
|------|------|
| `r` | 파일을 아카이브에 넣거나 교체. 아카이브가 없으면 새로 만듦 |
| `c` | 아카이브를 새로 만들 때 표준 에러에 알림 메시지를 내지 않음 |
| `s` | 오브젝트 인덱스(심볼 테이블)를 쓰거나 갱신 |

GNU binutils `ar`에는 오브젝트를 복사하지 않고 경로만 기록하는 *thin archive*(`T` 수정자)가 있습니다. 같은 글자가 macOS `ar`에서는 전혀 다른 뜻입니다. macOS 매뉴얼의 `-T`는 멤버 이름을 앞 15자로만 다루는 옵션이고, 실제로 `ar Trcs libT.a lib/add.o lib/mul.o`는 에러 없이 1344바이트짜리 *일반* 아카이브를 만들었습니다. thin archive를 쓰려면 GNU `ar`인지 먼저 확인해야 합니다.

### 동적 라이브러리 (`.so` / `.dylib`)

운영체제마다 확장자와 옵션이 다릅니다.

```makefile
UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
    LIBEXT := dylib
    LIBFLAGS := -dynamiclib -install_name @rpath/lib$(LIBNAME).1.dylib
else
    LIBEXT := so
    LIBFLAGS := -shared -fPIC -Wl,-soname,lib$(LIBNAME).so.1
endif

LIBNAME := mylib
LIBSRCS := $(wildcard lib/*.c)
LIBOBJS := $(LIBSRCS:.c=.o)

lib$(LIBNAME).$(LIBEXT): $(LIBOBJS)
	$(CC) $(LIBFLAGS) -o $@ $^

# 공유 라이브러리용 오브젝트는 위치 독립 코드로
lib/%.o: lib/%.c
	$(CC) -fPIC $(CFLAGS) -c $< -o $@
```

`-fPIC`가 정말 필요한지는 타겟에 따라 다릅니다. 이 macOS(arm64)의 Apple clang은 `-fPIC` 없이도 `clang -###` 출력에 `-mrelocation-model pic -pic-level 2`가 들어 있어 이미 위치 독립 코드를 만들었습니다. Linux 쪽 분기(`-shared -fPIC -Wl,-soname`)는 이 글에서 실행하지 않았습니다.

> 💡 **라이브러리 이름 체인**: 실행 파일이 런타임에 찾는 이름은 라이브러리 파일 이름이 아니라 그 안에 기록된 이름입니다. Linux는 `-Wl,-soname`, macOS는 `-install_name`으로 기록합니다. 위 macOS 분기로 만든 `libmylib.dylib`에 `otool -D`를 실행하면 `@rpath/libmylib.1.dylib`가 나왔고, 이 라이브러리에 링크한 실행 파일은 바로 실행하자 `dyld: Library not loaded: @rpath/libmylib.1.dylib`로 실패했습니다. `ln -sf libmylib.dylib libmylib.1.dylib`로 그 이름의 링크를 만들자 정상 실행됐습니다. 버전 번호가 붙은 심볼릭 링크 체인을 설치 규칙에서 함께 만들어야 하는 이유입니다.

---

## 크로스 컴파일

### `CROSS_COMPILE` 접두사 관용

한 변수가 모든 도구 이름의 *접두사*가 되는 방식입니다. U-Boot v2024.04 최상위 Makefile은 `CROSS_COMPILE ?=`로 기본값을 비워 두고(273행) `AS = $(CROSS_COMPILE)as`처럼 도구 이름을 조립합니다(394행).

```makefile
CROSS_COMPILE ?=
ARCH ?= native

ifeq ($(ARCH),arm)
    CROSS_COMPILE := arm-linux-gnueabihf-
    CFLAGS += -march=armv7-a -mfpu=neon
else ifeq ($(ARCH),aarch64)
    CROSS_COMPILE := aarch64-linux-gnu-
    CFLAGS += -march=armv8-a
else ifeq ($(ARCH),riscv64)
    CROSS_COMPILE := riscv64-linux-gnu-
    CFLAGS += -march=rv64gc
endif

# 접두사 결정 뒤 도구 이름을 즉시 확장
CC := $(CROSS_COMPILE)gcc
CXX := $(CROSS_COMPILE)g++
AR := $(CROSS_COMPILE)ar
STRIP := $(CROSS_COMPILE)strip
OBJCOPY := $(CROSS_COMPILE)objcopy

# 릴리스 빌드에서 심볼 제거
ifneq ($(DEBUG),1)
    POST_BUILD = $(STRIP) $(TARGET)
else
    POST_BUILD =
endif

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)
	$(POST_BUILD)
```

```bash
make ARCH=arm        # 32-bit ARM (armhf)
make ARCH=aarch64    # 64-bit ARM
make ARCH=riscv64    # 64-bit RISC-V
make                 # 네이티브
```

`-march`·`-mfpu` 값과 툴체인 접두사는 각 툴체인 배포판이 정합니다. 위 값들은 Debian 계열 크로스 패키지의 접두사를 가정한 예이고, 이 글에서는 컴파일해 보지 않았습니다.

### 도구 이름 선택 확인

도구가 없어도 *접두사가 제대로 조립되는지*는 확인할 수 있습니다.

```makefile title="cross-check.mk"
ARCH ?= native
CROSS_COMPILE ?=
ifeq ($(ARCH),arm)
CROSS_COMPILE := arm-linux-gnueabihf-
else ifeq ($(ARCH),aarch64)
CROSS_COMPILE := aarch64-linux-gnu-
else ifeq ($(ARCH),riscv64)
CROSS_COMPILE := riscv64-linux-gnu-
else ifneq ($(ARCH),native)
$(error Unsupported ARCH: $(ARCH))
endif
CC := $(CROSS_COMPILE)gcc
.PHONY: show
show:
	@printf 'CC=%s\n' '$(CC)'
```

```text
$ make -s -f cross-check.mk ARCH=native
CC=gcc
$ make -s -f cross-check.mk ARCH=arm
CC=arm-linux-gnueabihf-gcc
$ make -s -f cross-check.mk ARCH=aarch64
CC=aarch64-linux-gnu-gcc
$ make -s -f cross-check.mk ARCH=riscv64
CC=riscv64-linux-gnu-gcc
$ make -s -f cross-check.mk ARCH=mips
cross-check.mk:10: *** Unsupported ARCH: mips.  Stop.
$ make -f cross-check.mk ARCH=arm CROSS_COMPILE=foo-
CC=foo-gcc
```

마지막 줄은 Ch 3의 우선순위 그대로입니다. 명령줄의 `CROSS_COMPILE=foo-`가 Makefile의 `:=` 대입을 이겨서, `ARCH=arm`이어도 사용자가 준 접두사가 쓰였습니다. 다른 경로에 설치한 툴체인을 쓸 때 이 동작이 그대로 탈출구가 됩니다.

### 빌드 환경 격리

크로스 컴파일러가 호스트의 `/usr/include`나 `/usr/lib`을 보지 않게 하려면 `--sysroot`로 헤더·라이브러리 검색의 루트를 타겟 쪽 디렉터리로 바꿉니다. 아래 경로는 예시입니다.

```makefile
ifeq ($(ARCH),arm)
    SYSROOT := /opt/arm-linux-gnueabihf/sysroot
    CFLAGS += --sysroot=$(SYSROOT)
    LDFLAGS += --sysroot=$(SYSROOT)
endif
```

---

## 테스트 통합

`tests/` 디렉터리의 *각 테스트가 별도 실행 파일*인 구조입니다. 테스트가 실패하면 Make도 실패해야 CI가 결과를 압니다.

```text
project/
├── src/
│   ├── main.c
│   └── utils.c
├── tests/
│   ├── test_utils.c
│   └── test_config.c
└── Makefile
```

```makefile title="test-rules.mk"
TESTSRCDIR := tests
TESTSRCS := $(wildcard $(TESTSRCDIR)/*.c)
TESTOBJS := $(patsubst $(TESTSRCDIR)/%.c,$(BUILDDIR)/tests/%.o,$(TESTSRCS))
TESTS := $(patsubst $(TESTSRCDIR)/%.c,$(BUILDDIR)/tests/%,$(TESTSRCS))

# 라이브러리 오브젝트 (main.o 제외 — 테스트는 별도 main을 가짐)
LIBOBJS := $(filter-out $(BUILDDIR)/main.o,$(OBJS))

.PHONY: test test-verbose

test: $(TESTS)
	@echo "Running tests..."
	@failed=0; \
	for t in $(TESTS); do \
		printf "  %-30s" "$$(basename $$t):"; \
		if $$t > /dev/null 2>&1; then \
			echo "PASS"; \
		else \
			echo "FAIL"; \
			failed=1; \
		fi; \
	done; \
	if [ $$failed -eq 0 ]; then \
		echo "All tests passed!"; \
	else \
		echo "Some tests failed."; \
		exit 1; \
	fi

test-verbose: $(TESTS)
	@failed=0; for t in $(TESTS); do \
		echo "=== $$(basename $$t) ==="; \
		$$t || failed=1; \
		echo ""; \
	done; exit $$failed

$(BUILDDIR)/tests/%: $(BUILDDIR)/tests/%.o $(LIBOBJS) | $(BUILDDIR)/tests
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/tests/%.o: $(TESTSRCDIR)/%.c | $(BUILDDIR)/tests
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/tests:
	@mkdir -p $@
```

앞 절의 기본 Makefile 끝에 `include test-rules.mk`를 넣고, `test_config.c`가 일부러 실패하게 만들어 실행했습니다(빌드 명령 줄은 생략).

```text
$ make test
...
Running tests...
  test_config:                  FAIL
  test_utils:                   PASS
Some tests failed.
make: *** [test-rules.mk:13: test] Error 1
rm build/release/tests/test_utils.o build/release/tests/test_config.o
$ echo $?
2
```

실패가 Make의 종료 코드 2로 전달됐습니다. `test-verbose`도 각 테스트의 출력을 보여 준 뒤 `exit $$failed`로 같은 방식으로 실패했습니다. 출력을 보여 주려고 `$$t || true`처럼 실패를 버리면 CI는 이 빌드를 성공으로 기록합니다.

마지막 `rm` 줄은 Ch 4의 중간 파일 삭제입니다. 테스트 `.o`는 패턴 규칙 사슬 중간에서만 생기므로 Make가 빌드 뒤에 지웠습니다. 테스트 실행 파일이 최신이면 다음 `make test`도 `.o`를 다시 만들지 않으므로 동작에는 문제가 없지만, `.o`를 남기려면 `.SECONDARY: $(TESTOBJS)`를 추가합니다.

---

## 운영 패턴

### 버전 정보 삽입

```makefile
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo unknown)
BUILD_DATE := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)

CPPFLAGS += -DVERSION=\"$(VERSION)\"
CPPFLAGS += -DBUILD_DATE=\"$(BUILD_DATE)\"
CPPFLAGS += -DGIT_HASH=\"$(GIT_HASH)\"
```

C 코드 안에서는 매크로를 그대로 씁니다.

```c
printf("MyApp %s (built %s, %s)\n", VERSION, BUILD_DATE, GIT_HASH);
```

`v1.0` 태그를 단 임시 저장소에서 세 상태로 빌드했습니다.

```text
MyApp v1.0 (built 2026-11-16T03:19:04Z, 72b1689)
MyApp v1.0-dirty (built 2026-11-16T03:19:04Z, 72b1689)
MyApp v1.0-1-g0009cf6 (built 2026-11-16T03:19:04Z, 0009cf6)
```

첫 줄은 태그 직후, 둘째 줄은 추적 중인 파일을 커밋하지 않고 고친 상태, 셋째 줄은 그 변경을 커밋한 뒤입니다. `--dirty`는 미커밋 변경이 있을 때 `-dirty`를 붙이고, 태그 이후 커밋이 있으면 `태그-커밋수-g해시` 형식이 됩니다. 실행 파일만 보고 어느 소스에서 빌드됐는지 알 수 있습니다. 처음에는 빌드 산물 `app`까지 커밋해 버려서, 그 파일을 지운 것만으로 깨끗한 트리가 `-dirty`로 찍혔습니다. 빌드 산물을 `.gitignore`에 넣어야 `--dirty`가 의미를 가집니다.

### 병렬 빌드 자동 설정

```makefile
NPROCS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
MAKEFLAGS += -j$(NPROCS)
```

Linux는 `nproc`, `nproc`이 없는 macOS는 `sysctl -n hw.ncpu`, 둘 다 실패하면 4를 씁니다. 1초씩 자는 타겟 네 개로 확인하니 4.4.1에서 1.02초에 끝났습니다. Makefile 안에서 `MAKEFLAGS`에 `-j`를 넣으면 병렬 모드가 켜진다는 동작은 4.3 NEWS에 적혀 있습니다. macOS의 `/usr/bin/make`(3.81)도 같은 파일에서 1.08초로 병렬 실행됐습니다.

이 설정은 이 Makefile이 *하위 Make로 불릴 때* 상위의 병렬도를 무시합니다. `make -j2`로 부른 상위 Makefile이 `MAKEFLAGS += -j4`를 가진 하위 디렉터리를 `$(MAKE) -C sub`로 호출하자 하위 Make가 경고를 냈습니다.

```text
make[1]: warning: -j4 forced in makefile: resetting jobserver mode.
```

하위 Make가 상위의 jobserver를 버리고 자기 `-j4`를 쓰므로, 전체 동시 작업 수가 사용자가 준 `-j2`를 넘을 수 있습니다. 다른 Makefile에서 불릴 수 있는 Makefile에는 이 두 줄을 넣지 않고, 사용자가 직접 부르는 최상위 Makefile에만 둡니다.

### `install` 표준 타겟

```makefile
PREFIX ?= /usr/local
BINDIR := $(PREFIX)/bin
LIBDIR := $(PREFIX)/lib
INCLUDEDIR := $(PREFIX)/include

.PHONY: install uninstall

install: $(TARGET)
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 $(TARGET) $(DESTDIR)$(BINDIR)/

uninstall:
	$(RM) $(DESTDIR)$(BINDIR)/$(notdir $(TARGET))
```

```bash
make install                    # /usr/local에 설치
make install PREFIX=/opt/myapp  # 다른 위치
sudo make install               # 시스템 전역
make DESTDIR=/tmp/pkg install   # 패키징용 — 모든 경로 앞에 /tmp/pkg 추가
```

`PREFIX`와 `DESTDIR`의 차이가 중요합니다.

- **`PREFIX`**: *최종 설치 위치*의 접두사입니다. 예: `/usr/local/bin/myapp`.
- **`DESTDIR`**: *임시 stage* 영역입니다. 설치되는 모든 경로 앞에 붙습니다.

스크래치 디렉터리 `<STAGE>`를 `DESTDIR`로 주고 실행한 결과입니다.

```text
$ make DESTDIR=<STAGE> install
cc -o build/myapp m.c
install -d <STAGE>/usr/local/bin
install -m 755 build/myapp <STAGE>/usr/local/bin/
$ make DESTDIR=<STAGE> PREFIX=/opt/myapp install
install -d <STAGE>/opt/myapp/bin
install -m 755 build/myapp <STAGE>/opt/myapp/bin/
$ make DESTDIR=<STAGE> uninstall
rm -f <STAGE>/usr/local/bin/myapp
```

`uninstall`은 기본 `PREFIX`의 파일만 지웠고, `PREFIX=/opt/myapp`으로 설치한 파일은 남았습니다. 설치할 때 준 `PREFIX`를 제거할 때도 똑같이 줘야 합니다. [매뉴얼 16.4절](https://www.gnu.org/software/make/manual/html_node/DESTDIR.html)(GNU 코딩 표준의 Makefile 규약)은 `DESTDIR`을 사용자가 명령줄에서 절대 경로로 주는 변수로 정하고, Makefile 안에서 값을 정하지 말며 `install*`·`uninstall*` 타겟에서만 쓰라고 적습니다.

### `help` 타겟

```makefile
.PHONY: help

help:
	@echo "Usage: make [target] [options]"
	@echo ""
	@echo "Targets:"
	@echo "  all        Build (default)"
	@echo "  clean      Remove build artifacts"
	@echo "  rebuild    Clean and build"
	@echo "  run        Build and run"
	@echo "  test       Run tests"
	@echo "  install    Install to PREFIX"
	@echo "  uninstall  Remove installed files"
	@echo "  lint       Run static analysis"
	@echo "  format     Format source"
	@echo ""
	@echo "Options:"
	@echo "  DEBUG=1         Debug build"
	@echo "  BUILD_TYPE=X    debug | release"
	@echo "  ARCH=X          native | arm | aarch64 | riscv64"
	@echo "  PREFIX=X        Install prefix (default: /usr/local)"
	@echo "  V=1             Verbose output"
```

`make help`가 타겟과 옵션 목록을 보여 주므로, 처음 저장소를 받은 사람이 Makefile을 읽지 않고도 빌드 방법을 알 수 있습니다. 목록은 손으로 관리하므로 타겟을 추가할 때 함께 고칩니다.

### Verbose 모드 — `V=1`

U-Boot v2024.04 최상위 Makefile의 주석은 "Use 'make V=1' to see the full commands"(91행)이고, 그 아래에서 `V`가 1이면 `Q`를 비우고 아니면 `Q = @`로 둡니다. [Buildroot 매뉴얼](https://buildroot.org/downloads/manual/manual.html)도 `make V=1 <target>`으로 전체 명령을 보라고 안내합니다. 같은 구조를 작은 Makefile로 옮겼습니다.

```makefile
V ?= 0
ifeq ($(V),1)
    Q :=
else
    Q := @
endif

$(TARGET): $(OBJS)
	$(Q)echo "[LINK] $@"
	$(Q)$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)
```

```text
$ make
[LINK] myapp
$ make V=1
echo "[LINK] myapp"
[LINK] myapp
cc  -o myapp main.o 
```

`V=1`에서는 Make가 실행하는 명령 줄이 모두 보입니다. 빌드가 실패했을 때 어떤 플래그로 컴파일했는지 확인하려면 이 모드로 다시 실행합니다.

---

## 흔한 실수

### 1. `wildcard`가 빈 결과를 반환

```makefile
SRCS := $(wildcard srcs/*.c)   # 오타 (src가 의도)
OBJS := $(SRCS:.c=.o)
myapp: $(OBJS)
	$(CC) -o $@ $^
```

```text
$ make -f empty.mk
cc -o myapp 
clang: error: no input files
make: *** [empty.mk:4: myapp] Error 1
```

`wildcard`가 빈 값을 돌려주자 의존성이 없는 링크 규칙이 입력 없이 실행됐습니다. 오타가 컴파일러 에러로 바뀌어 원인을 찾기 어려워집니다.

**해결**: 앞 절의 기본 Makefile처럼 `ifeq ($(strip $(SRCS)),)` + `$(error ...)`로 읽는 단계에서 멈추거나, `$(info SRCS = [$(SRCS)])`로 값을 찍어 봅니다.

### 2. 병렬 빌드에서 디렉터리 누락

```makefile
all: $(BUILDDIR) $(OBJS)

$(BUILDDIR):
	sleep 1; mkdir -p $@

$(BUILDDIR)/%.o: src/%.c
	$(CC) -c $< -o $@
```

디렉터리를 `all`의 첫 의존성으로 두면 직렬 실행에서는 왼쪽부터 처리되어 성공합니다(Ch 1의 순서 실험). 소스 8개로 `make -j8`을 돌리자, 디렉터리를 만드는 1초 동안 컴파일이 먼저 시작되어 8개 중 7개가 `unable to open output file 'build/f2.o': 'No such file or directory'` 같은 에러로 실패했습니다.

**해결**: 오브젝트가 디렉터리에 order-only로 의존하게 합니다.

```makefile
$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@
```

### 3. `clean`이 너무 광범위

```makefile
clean:
	rm -rf *    # 사고
```

*Makefile이 있는 디렉터리*의 모든 것, 소스와 Makefile 자신까지 지웁니다. 이 예제는 실행하지 않았습니다.

**해결**: 빌드 디렉터리만 명시합니다.

```makefile
clean:
	$(RM) -r $(BUILDDIR)
```

### 4. 의존성 경로 불일치

```makefile
BUILDDIR := build
OBJS := $(BUILDDIR)/main.o
DEPS := main.d   # 잘못된 경로
```

`-MMD`는 `-o build/main.o`를 보고 `build/main.d`를 만듭니다. `DEPS`가 다른 경로를 가리키니 `-include`가 아무것도 읽지 못했고, 헤더를 바꾼 뒤에도 `make: 'app' is up to date.`가 나왔습니다.

**해결**: `DEPS := $(OBJS:.o=.d)`처럼 *OBJS에서 파생*합니다.

### 5. 셸 변수 안의 `$`

테스트 러너 셸 스크립트에서 `$t`와 `$$t`가 헷갈립니다.

```makefile
test:
	for t in $(TESTS); do \
		echo $$t; \
	done
```

Make 변수는 `$(...)`, 셸 변수는 `$$...`입니다. `$t`로 적으면 Ch 3의 `Hello, ame`처럼 Make가 한 글자 변수 `t`로 풀어 빈 값이 됩니다.

---

## 정리

이 장의 골격에서 쓴 패턴을 모으면 다음과 같습니다.

- **디렉터리 분리**: `src/`, `include/`, `build/`.
- **모드 분기**: `DEBUG=1` 또는 `BUILD_TYPE=debug|release`로 `BUILDDIR`을 나눕니다.
- **자동 의존성**: `-MMD -MP` + `-include $(DEPS)`.
- **order-only 디렉터리**: `| $(BUILDDIR)`로 반복 재빌드와 `-j`의 디렉터리 경쟁을 막습니다.
- **`rebuild`**: `clean`과 `all`을 하위 Make로 차례로 부릅니다. 의존성으로 나열하면 `-j`에서 실패했습니다.
- **라이브러리**: `ar rcs`로 정적, `-dynamiclib`/`-shared`로 동적. `ar`의 옵션 글자와 라이브러리 내부 이름은 플랫폼마다 다릅니다.
- **크로스 컴파일**: `CROSS_COMPILE` 접두사로 도구 이름을 조립하고, 명령줄 값이 Makefile 값을 이깁니다.
- **테스트**: 각 테스트를 별도 실행 파일로 두고, 실패를 Make의 종료 코드로 전달합니다.
- **운영 타겟**: `install` / `uninstall`(`DESTDIR`·`PREFIX`), `help`, `V=1`.

## 시리즈 마무리

이 시리즈는 GNU Make 4.4.1의 동작을 규칙·변수·패턴·함수·조건·실전 골격 순서로 실제 실행 결과와 함께 확인했습니다. mtime 비교, 의존성 그래프, 레시피 확장 시점이라는 세 가지가 모든 장의 결과를 설명했습니다.

프로젝트가 여러 플랫폼과 IDE, 외부 라이브러리 탐색을 요구하게 되면 다른 도구를 만납니다. CMake와 Meson은 빌드 파일을 *생성*하는 도구이고(CMake는 Makefile이나 Ninja 파일을, Meson은 Ninja 파일을 만듭니다), Ninja는 생성된 파일을 *실행*하는 도구, Bazel은 자체 빌드 모델을 가진 도구입니다. CMake가 Makefile을 생성하면 그 빌드는 이 시리즈의 GNU Make가 실행합니다.

다음 단계로 [CMake 시리즈](/blog/tools/build/cmake/chapter01-intro)를 권합니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) — 4.4.1판.
- [GNU Make Manual — Makefile Conventions](https://www.gnu.org/software/make/manual/html_node/Makefile-Conventions.html) — 16장. `DESTDIR`(16.4)·설치 디렉터리 변수(16.5)·표준 타겟(16.6).
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html) — 감속·메모리 오버헤드 설명.
- [The Buildroot user manual](https://buildroot.org/downloads/manual/manual.html) — `make V=1 <target>`.
- [Managing Projects with GNU Make, 3rd ed.](https://www.oreilly.com/library/view/managing-projects-with/0596006101/) — Robert Mecklenburg, O'Reilly, 2004.
- [Makefile Tutorial by Example](https://makefiletutorial.com/)
- [Recursive Make Considered Harmful](https://aegis.sourceforge.net/auug97.pdf) — Peter Miller, AUUGN 19(1), 1998, pp. 14–25.

## 관련 항목

- [Ch 6: 조건문과 include](/blog/tools/build/gnu-make/chapter06-conditionals) — 이 장의 골격을 떠받치는 모드 분기와 자동 의존성 패턴.
- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 소스 목록을 만드는 `wildcard`·`shell`·`filter-out`의 상세.
- [CMake Ch 7: 설치와 패키징](/blog/tools/build/cmake/chapter07-install) — 여기서 손으로 적은 `install`·`DESTDIR`을 CMake는 어떻게 자동화하는지.
- [Buildroot Ch 11: Toolchain 선택](/blog/embedded/buildroot/chapter11-toolchain) — `CROSS_COMPILE` 접두사 뒤에 있는 크로스 툴체인 자체의 선택 기준.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 공식 매뉴얼.
