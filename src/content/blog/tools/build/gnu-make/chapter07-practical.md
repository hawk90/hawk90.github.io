---
title: "Ch 7: 실전 Makefile 예제"
date: 2025-05-14T07:00:00
description: "기본 C/C++부터 라이브러리, 크로스 컴파일, 테스트 통합까지 — 실제 프로젝트에 그대로 쓰는 Makefile 패턴."
tags: [make, build, Makefile, practical]
series: "GNU Make"
seriesOrder: 7
draft: false
---

## 이 장에서 다루는 것

[Ch 1](/blog/tools/build/gnu-make/chapter01-intro)부터 [Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals)까지의 도구를 한 자리에 모읍니다. 가공의 예제가 아니라 *실제 프로젝트에 그대로 옮겨 쓸 수 있는* Makefile입니다.

- 기본 C 프로젝트
- C++ + 정적 분석 통합
- 정적·동적 라이브러리 빌드
- 크로스 컴파일
- 테스트 자동화
- `install`, `help`, `verbose` 같은 운영 패턴

---

## 기본 C 프로젝트

가장 흔한 시작점. 디렉터리는 다음과 같이 잡습니다.

```text
myproject/
├── Makefile
├── include/
│   └── mylib.h
├── src/
│   ├── main.c
│   └── mylib.c
└── build/        ← 자동 생성, .gitignore 대상
```

`src/`와 `include/`를 분리해 *공개 헤더*와 *구현*을 명확히 갈라 두는 게 표준입니다.

```makefile
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

rebuild: clean all

run: $(TARGET)
	@./$(TARGET)

-include $(DEPS)
```

### 한눈에 짚어 볼 점

- `BUILDDIR`이 *모드별로 갈라져* 디버그와 릴리스 산물이 섞이지 않습니다.
- order-only `| $(BUILDDIR)`로 디렉터리 보장 ([Ch 2](/blog/tools/build/gnu-make/chapter02-rules#order-only-의존성--있기만-하면-ok)).
- `-MMD -MP`로 헤더 의존성 자동 추적 ([Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals#자동-의존성-생성--실무-표준-패턴)).
- 레시피에 `@` 접두사 + `[LINK]`/`[CC]` 라벨로 *출력이 깔끔*해집니다.

### 사용법

```bash
make              # 릴리스
make DEBUG=1      # 디버그
make run          # 빌드 후 실행
make clean        # 정리
make rebuild      # clean + 빌드
```

---

## C++ 프로젝트 — 정적 분석·sanitizer 통합

C++ 프로젝트는 보통 보조 도구 두 가지를 추가합니다.

1. **AddressSanitizer / UBSan** — 디버그 빌드에서 메모리 오류와 미정의 동작을 잡습니다.
2. **clang-tidy / clang-format** — 정적 분석과 자동 포맷.

```makefile
# === 컴파일러 설정 ===
CXX := g++
CXXFLAGS := -Wall -Wextra -std=c++17
CPPFLAGS := -Iinclude -Ilib
LDFLAGS := -Llib
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

rebuild: clean all

run: $(TARGET)
	@./$(TARGET)

# === 정적 분석 ===
lint:
	@clang-tidy $(SRCS) -- $(CPPFLAGS) $(CXXFLAGS)

format:
	@clang-format -i $(SRCS) $(shell find include -name '*.hpp')

-include $(DEPS)
```

### `BUILD_TYPE`에 잘못된 값이 오면 `$(error ...)`로 즉시 중단

`$(error ...)`은 Makefile 파싱 시점에 동작하므로, 잘못된 호출은 *빌드를 시작하기 전에* 죽습니다. 운영자에게 명확한 에러 메시지를 주는 표준 관용입니다.

### Sanitizer가 디버그에서만 켜지는 이유

AddressSanitizer는 *런타임 비용*이 매우 큽니다(보통 2~3배 느림, 메모리 사용 3배). 릴리스에서는 끄고, 디버그에서만 켜는 것이 표준입니다. `-fsanitize=address,undefined`는 한 번에 둘을 켭니다.

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
app: main.o lib$(LIBNAME).a
	$(CC) -o $@ main.o -L. -l$(LIBNAME)
```

`ar rcs`의 세 글자가 각각 다른 동작입니다.

| 옵션 | 동작 |
|------|------|
| `r` | 아카이브에 파일 삽입(이미 있으면 교체) |
| `c` | 아카이브가 없을 때 새로 생성 |
| `s` | 인덱스 생성 (옛 `ranlib`을 통합) |

큰 정적 라이브러리에서 `ar`이 느려진다면, 한 번에 모든 오브젝트를 묶는 *Thin Archive* (`ar Trcs`)도 검토할 만합니다. 빌드 시간이 줄어드는 대신 *모든 `.o`가 그대로 디스크에 살아 있어야 하는* 의존성이 생깁니다.

### 동적 라이브러리 (`.so` / `.dylib`)

운영체제마다 확장자와 옵션이 다릅니다.

```makefile
UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
    LIBEXT := dylib
    LIBFLAGS := -dynamiclib
else
    LIBEXT := so
    LIBFLAGS := -shared -fPIC
endif

LIBNAME := mylib
LIBSRCS := $(wildcard lib/*.c)
LIBOBJS := $(LIBSRCS:.c=.o)

lib$(LIBNAME).$(LIBEXT): $(LIBOBJS)
	$(CC) $(LIBFLAGS) -o $@ $^

# 동적 라이브러리용 오브젝트는 -fPIC 필요
lib/%.o: lib/%.c
	$(CC) -fPIC $(CFLAGS) -c $< -o $@
```

`-fPIC`(Position Independent Code)는 *동적 라이브러리에서 절대 빼면 안 되는* 옵션입니다. 라이브러리가 실행 시점에 임의 주소로 로드되므로, 코드가 그 주소에 의존하지 않게 만들어 두어야 합니다. 정적 라이브러리는 굳이 `-fPIC`이 필요 없지만, 켜 두는 게 결과의 *재사용성*을 높입니다.

> 💡 *SONAME 관리*: 실무 동적 라이브러리는 `lib.so.1`, `lib.so.1.2.3` 같은 *심볼릭 링크 체인*을 사용합니다. 이는 ABI 호환성 표현 방식이고, Makefile 한 줄로 처리하기 까다로워 보통은 GNU libtool이나 CMake에 위임합니다.

---

## 크로스 컴파일

### `CROSS_COMPILE` 접두사 관용

리눅스 커널 빌드 시스템이 정착시킨 *표준 관용*입니다. 한 변수가 모든 도구 이름의 *접두사*가 됩니다.

```makefile
CROSS_COMPILE ?=
CC := $(CROSS_COMPILE)gcc
CXX := $(CROSS_COMPILE)g++
AR := $(CROSS_COMPILE)ar
STRIP := $(CROSS_COMPILE)strip
OBJCOPY := $(CROSS_COMPILE)objcopy

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

### 빌드 환경 격리

크로스 컴파일 환경에서는 *호스트 라이브러리가 끼어드는* 사고가 흔합니다. 격리를 위해 `--sysroot`를 명시하는 게 안전합니다.

```makefile
ifeq ($(ARCH),arm)
    SYSROOT := /opt/arm-linux-gnueabihf/sysroot
    CFLAGS += --sysroot=$(SYSROOT)
    LDFLAGS += --sysroot=$(SYSROOT)
endif
```

---

## 테스트 통합

`tests/` 디렉터리에 *각 테스트가 별도 실행 파일*인 구조가 가장 단순합니다.

```text
project/
├── src/
│   ├── main.c
│   ├── utils.c
│   └── config.c
├── tests/
│   ├── test_utils.c
│   └── test_config.c
└── Makefile
```

```makefile
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
	@for t in $(TESTS); do \
		echo "=== $$(basename $$t) ==="; \
		$$t || true; \
		echo ""; \
	done

$(BUILDDIR)/tests/%: $(BUILDDIR)/tests/%.o $(LIBOBJS) | $(BUILDDIR)/tests
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/tests/%.o: $(TESTSRCDIR)/%.c | $(BUILDDIR)/tests
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/tests:
	@mkdir -p $@
```

```bash
make test          # 요약 출력 — PASS/FAIL 한 줄씩
make test-verbose  # 상세 출력 — 각 테스트의 stdout 전부
```

테스트 실행기는 셸 스크립트로 줄줄이 적었지만, 같은 일을 *Catch2 / GoogleTest / criterion*의 자체 러너에 맡기는 편이 큰 프로젝트에서는 더 깔끔합니다. 위 패턴은 *프레임워크 없이* 작은 테스트만 돌릴 때의 표준 모양입니다.

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

C 코드 안에서:

```c
printf("MyApp %s (built %s, %s)\n", VERSION, BUILD_DATE, GIT_HASH);
```

`git describe --dirty`는 *작업 트리에 미커밋 변경*이 있으면 `dirty` 표식을 붙여 줍니다. 빌드 결과로 "어디서 빌드된 바이너리인지" 추적이 됩니다.

### 병렬 빌드 자동 설정

```makefile
NPROCS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
MAKEFLAGS += -j$(NPROCS)
```

리눅스(`nproc`), macOS(`sysctl`), 둘 다 실패 시 기본 4. 사용자가 매번 `-j` 옵션을 안 줘도 자동 병렬화됩니다. 다만 `MAKEFLAGS`에 박아 두면 *부모 Make에서 호출되는 환경*에서 의도 외 영향이 있을 수 있어, 라이브러리 Makefile에서는 권장하지 않습니다. 최종 사용자가 직접 호출하는 Makefile에서만 씁니다.

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

- **`PREFIX`**: *최종 설치 위치*의 prefix. 예: `/usr/local/bin/myapp`.
- **`DESTDIR`**: *임시 stage* 영역. 패키지 빌드 시 모든 경로 앞에 붙입니다. `DESTDIR=/tmp/stage PREFIX=/usr/local` → 파일은 `/tmp/stage/usr/local/bin/myapp`. 이후 *패키저가 /tmp/stage를 tar로 묶어* 배포합니다.

이 둘은 GNU Coding Standards가 정의한 *표준*이라, 모든 패키지 매니저(rpm, deb, pkgsrc, Homebrew)가 이 관용을 따릅니다.

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

`make help`을 처음 만나는 사람에게 거의 *문서 역할*을 합니다. README보다 가깝습니다.

### Verbose 모드 — `V=1`

리눅스 커널·Buildroot·U-Boot 모두가 따르는 관용입니다.

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

```bash
make         # 조용한 빌드 (라벨만)
make V=1     # 모든 명령 노출
```

CI에서는 보통 `V=1`로 돌려 *전체 명령 로그*를 확보하고, 개발자 일상 빌드는 `V=0`(기본) 상태로 빠르게 진행합니다.

---

## 흔한 실수

### 1. `wildcard`가 빈 결과를 반환

```makefile
SRCS := $(wildcard srcs/*.c)   # 오타 (src가 의도)
```

빈 결과 → 빌드가 "할 일 없음"으로 끝납니다. 디버깅이 까다로워 보입니다.

**해결**: `$(info SRCS = [$(SRCS)])`로 즉시 확인.

### 2. 병렬 빌드에서 디렉터리 누락

```makefile
$(BUILDDIR)/%.o: $(SRCDIR)/%.c
	$(CC) -c $< -o $@
```

`-j8`로 돌리면 *디렉터리가 만들어지기 전에* 컴파일이 시작될 수 있습니다.

**해결**: order-only로 의존.

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

*Makefile이 위치한 디렉터리*의 모든 것을 지웁니다. 빌드 산물만이 아니라 소스도 같이 날아갑니다.

**해결**: 빌드 디렉터리만 명시.

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

DEPS가 OBJS 위치와 다르면 자동 의존성이 안 동작합니다.

**해결**: `DEPS := $(OBJS:.o=.d)`처럼 *OBJS에서 파생*.

### 5. 셸 변수 안의 `$`

테스트 러너 셸 스크립트에서 `$t`, `$$t`가 헷갈리기 쉽습니다.

```makefile
test:
	for t in $(TESTS); do \
		echo $$t; \
	done
```

Make 변수는 `$(...)`, 셸 변수는 `$$...`. *한 번에 두 가지를 다루는* 자리에서 가장 자주 실수가 납니다.

---

## 정리

이 시리즈에서 본 도구로 *대부분의 C/C++ 프로젝트*를 깔끔히 빌드할 수 있습니다. 다시 한 번 핵심 패턴을 모으면:

- **디렉터리 분리**: `src/`, `include/`, `build/`.
- **모드 분기**: `DEBUG=1` 또는 `BUILD_TYPE=debug|release` → `BUILDDIR` 분리.
- **자동 의존성**: `-MMD -MP` + `-include $(DEPS)`.
- **order-only 디렉터리**: `| $(BUILDDIR)`로 무한 재빌드 방지.
- **라이브러리**: `ar rcs`로 정적, `-shared -fPIC`로 동적. 플랫폼별 확장자 분기.
- **크로스 컴파일**: `CROSS_COMPILE` 접두사 관용.
- **테스트**: 각 테스트 = 별도 실행 파일, 셸 루프로 일괄 실행.
- **운영 타겟**: `install` / `uninstall` / `help` / `V=1` — GNU Coding Standards 따름.

## 시리즈 마무리

GNU Make는 1976년 Stuart Feldman이 만든 도구입니다. 50년 가까이 지난 지금도 거의 모든 C/C++ 프로젝트가 직접 혹은 간접적으로 Make를 거쳐 빌드됩니다. *이렇게 오래 살아남은 도구는 드뭅니다.* 단순한 mtime 비교 + 의존성 그래프 + 셸 호출이라는 *작고 일관된 원리* 덕분입니다.

이 시리즈가 다룬 내용은 *실무에 들어갈 만한 모든 패턴*입니다. 더 큰 프로젝트가 되면 자연스럽게 CMake·Bazel·Meson·Ninja 같은 메타 빌드 도구를 만나게 됩니다. 흥미로운 점은, 그 도구들도 *결국 Make나 Ninja 파일을 생성*해 그 위에서 빌드한다는 사실입니다. 즉 이 시리즈에서 본 mtime·의존성·incremental build의 원리는 *그 위 계층에서도 계속 동작*합니다.

다음 단계로 [CMake 시리즈](/blog/tools/build/cmake/chapter01-intro)를 권합니다. CMake는 *Make/Ninja를 자동 생성*하는 메타 빌드 시스템으로, 크로스 플랫폼·IDE 통합·외부 라이브러리 탐색을 단번에 해결합니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html)
- [Managing Projects with GNU Make](https://www.oreilly.com/library/view/managing-projects-with/0596006101/) — Robert Mecklenburg, O'Reilly. Make 책의 정전.
- [Makefile Tutorial by Example](https://makefiletutorial.com/)
- [Recursive Make Considered Harmful](http://aegis.sourceforge.net/auug97.pdf) — Peter Miller, 1997
- [GNU Coding Standards — Makefile Conventions](https://www.gnu.org/prep/standards/html_node/Makefile-Conventions.html) — install / DESTDIR / 표준 타겟
