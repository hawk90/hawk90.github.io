---
title: "Ch 7: 실전 Makefile 예제"
date: 2025-05-14T07:00:00
description: "C/C++ 프로젝트의 완전한 Makefile, 크로스 컴파일, 그리고 자주 쓰는 패턴."
tags: [make, build, Makefile, practical]
series: "GNU Make"
seriesOrder: 7
draft: false
---

## 이 장에서 다루는 것

Ch 1~6에서 배운 내용을 종합하여 실제 프로젝트에서 바로 사용할 수 있는 Makefile을 작성합니다.

- 기본 C 프로젝트 Makefile
- C++ 프로젝트 (라이브러리 포함)
- 정적/동적 라이브러리 빌드
- 크로스 컴파일
- 테스트 통합
- 자주 쓰는 유틸리티 패턴

---

## 기본 C 프로젝트

### 프로젝트 구조

```
myproject/
├── Makefile
├── include/
│   └── mylib.h
├── src/
│   ├── main.c
│   └── mylib.c
└── build/           # 빌드 결과물 (자동 생성)
```

### 완전한 Makefile

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
	@echo "Linking $@"
	@$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	@echo "Compiling $<"
	@$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

$(BUILDDIR):
	@mkdir -p $@

clean:
	@echo "Cleaning..."
	@$(RM) -r build

rebuild: clean all

run: $(TARGET)
	@./$(TARGET)

# 의존성 파일 포함
-include $(DEPS)
```

### 사용법

```bash
make              # 릴리스 빌드
make DEBUG=1      # 디버그 빌드
make run          # 빌드 후 실행
make clean        # 정리
make rebuild      # clean + 빌드
```

---

## C++ 프로젝트 (라이브러리 포함)

### 프로젝트 구조

```
cppproject/
├── Makefile
├── include/
│   └── mylib/
│       └── mylib.hpp
├── src/
│   ├── main.cpp
│   └── mylib/
│       └── mylib.cpp
├── lib/             # 외부 라이브러리
└── build/
```

### Makefile

```makefile
# === 컴파일러 설정 ===
CXX := g++
CXXFLAGS := -Wall -Wextra -std=c++17
CPPFLAGS := -Iinclude -Ilib
LDFLAGS := -Llib
LDLIBS := -lpthread

# 빌드 타입
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

# === 소스 파일 ===
SRCDIR := src
SRCS := $(shell find $(SRCDIR) -name '*.cpp')
OBJS := $(patsubst $(SRCDIR)/%.cpp,$(BUILDDIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)
OBJDIRS := $(sort $(dir $(OBJS)))

TARGET := $(BUILDDIR)/myapp

# === 빌드 규칙 ===
.PHONY: all clean rebuild run

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
	@echo "Cleaned."

rebuild: clean all

run: $(TARGET)
	@./$(TARGET)

# === 정적 분석 ===
.PHONY: lint format

lint:
	@clang-tidy $(SRCS) -- $(CPPFLAGS) $(CXXFLAGS)

format:
	@clang-format -i $(SRCS) $(shell find include -name '*.hpp')

# === 의존성 ===
-include $(DEPS)
```

---

## 정적/동적 라이브러리 빌드

### 정적 라이브러리 (.a)

정적 라이브러리는 `ar` 명령으로 오브젝트 파일을 아카이브합니다.

```makefile
LIBNAME := mylib
LIBDIR := lib
LIBSRCS := $(wildcard $(LIBDIR)/*.c)
LIBOBJS := $(LIBSRCS:.c=.o)

lib$(LIBNAME).a: $(LIBOBJS)
	$(AR) rcs $@ $^

# 사용
app: main.o lib$(LIBNAME).a
	$(CC) -o $@ main.o -L. -l$(LIBNAME)
```

`ar rcs` 옵션:
- `r`: 아카이브에 파일 삽입 (이미 있으면 교체)
- `c`: 아카이브가 없으면 생성
- `s`: 인덱스 생성 (ranlib 대체)

### 동적 라이브러리 (.so / .dylib)

운영체제마다 동적 라이브러리 확장자와 옵션이 다릅니다.

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

`-fPIC`(Position Independent Code)은 동적 라이브러리에 필수입니다.

---

## 크로스 컴파일

### ARM 타겟 예시

크로스 컴파일러는 `CROSS_COMPILE` 접두사로 지정하는 것이 관례입니다.

```makefile
# 크로스 컴파일러 설정
CROSS_COMPILE ?=
CC := $(CROSS_COMPILE)gcc
CXX := $(CROSS_COMPILE)g++
AR := $(CROSS_COMPILE)ar
STRIP := $(CROSS_COMPILE)strip

# 타겟 아키텍처
ARCH ?= native

ifeq ($(ARCH),arm)
    CROSS_COMPILE := arm-linux-gnueabihf-
    CFLAGS += -march=armv7-a -mfpu=neon
else ifeq ($(ARCH),aarch64)
    CROSS_COMPILE := aarch64-linux-gnu-
    CFLAGS += -march=armv8-a
endif

# 릴리스 빌드에서 strip
ifneq ($(DEBUG),1)
    POST_BUILD = $(STRIP) $(TARGET)
else
    POST_BUILD =
endif

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)
	$(POST_BUILD)
```

사용법:

```bash
make ARCH=arm          # ARM 32비트 크로스 컴파일
make ARCH=aarch64      # ARM 64비트 크로스 컴파일
make                   # 네이티브 컴파일
```

---

## 테스트 통합

### 테스트 디렉터리 구조

```
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

### 테스트 규칙

```makefile
TESTSRCDIR := tests
TESTSRCS := $(wildcard $(TESTSRCDIR)/*.c)
TESTOBJS := $(patsubst $(TESTSRCDIR)/%.c,$(BUILDDIR)/tests/%.o,$(TESTSRCS))
TESTS := $(patsubst $(TESTSRCDIR)/%.c,$(BUILDDIR)/tests/%,$(TESTSRCS))

# 라이브러리 오브젝트 (main.o 제외)
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

사용법:

```bash
make test           # 테스트 실행 (요약)
make test-verbose   # 테스트 실행 (상세 출력)
```

---

## 유용한 패턴들

### 버전 정보 삽입

Git 태그와 빌드 시간을 바이너리에 삽입합니다.

```makefile
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

CPPFLAGS += -DVERSION=\"$(VERSION)\"
CPPFLAGS += -DBUILD_DATE=\"$(BUILD_DATE)\"
CPPFLAGS += -DGIT_HASH=\"$(GIT_HASH)\"
```

C 코드에서:

```c
printf("Version: %s (built %s)\n", VERSION, BUILD_DATE);
```

### 병렬 빌드 기본값

CPU 코어 수에 맞게 병렬 빌드를 자동 설정합니다.

```makefile
NPROCS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
MAKEFLAGS += -j$(NPROCS)
```

### 컬러 출력

터미널이 색상을 지원하면 빌드 메시지에 색을 입힙니다.

```makefile
# 터미널 색상 지원 확인
ifneq ($(TERM),)
    RED := \033[31m
    GREEN := \033[32m
    YELLOW := \033[33m
    BLUE := \033[34m
    RESET := \033[0m
else
    RED :=
    GREEN :=
    YELLOW :=
    BLUE :=
    RESET :=
endif

$(TARGET): $(OBJS)
	@printf "$(GREEN)[LINK]$(RESET) $@\n"
	@$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	@printf "$(BLUE)[CC]$(RESET) $<\n"
	@$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@
```

### 설치 타겟

표준 디렉터리에 설치하는 규칙입니다.

```makefile
PREFIX ?= /usr/local
BINDIR := $(PREFIX)/bin
LIBDIR := $(PREFIX)/lib
INCLUDEDIR := $(PREFIX)/include

.PHONY: install uninstall

install: $(TARGET)
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 $(TARGET) $(DESTDIR)$(BINDIR)/
ifdef BUILD_LIB
	install -d $(DESTDIR)$(LIBDIR)
	install -m 644 lib$(LIBNAME).a $(DESTDIR)$(LIBDIR)/
	install -d $(DESTDIR)$(INCLUDEDIR)/$(LIBNAME)
	install -m 644 include/$(LIBNAME)/*.h $(DESTDIR)$(INCLUDEDIR)/$(LIBNAME)/
endif

uninstall:
	$(RM) $(DESTDIR)$(BINDIR)/$(notdir $(TARGET))
ifdef BUILD_LIB
	$(RM) $(DESTDIR)$(LIBDIR)/lib$(LIBNAME).a
	$(RM) -r $(DESTDIR)$(INCLUDEDIR)/$(LIBNAME)
endif
```

사용법:

```bash
make install                    # /usr/local에 설치
make install PREFIX=/opt/myapp  # 다른 위치에 설치
sudo make install               # 시스템 전역 설치
make DESTDIR=/tmp/pkg install   # 패키징용
```

### 도움말 타겟

사용 가능한 타겟과 옵션을 출력합니다.

```makefile
.PHONY: help

help:
	@echo "Usage: make [target] [options]"
	@echo ""
	@echo "Targets:"
	@echo "  all        Build the project (default)"
	@echo "  clean      Remove build artifacts"
	@echo "  rebuild    Clean and build"
	@echo "  run        Build and run"
	@echo "  test       Run tests"
	@echo "  install    Install to PREFIX"
	@echo "  uninstall  Remove installed files"
	@echo "  lint       Run static analysis"
	@echo "  format     Format source code"
	@echo "  help       Show this message"
	@echo ""
	@echo "Options:"
	@echo "  DEBUG=1         Enable debug build"
	@echo "  BUILD_TYPE=X    Build type: debug, release (default: release)"
	@echo "  ARCH=X          Target arch: native, arm, aarch64"
	@echo "  PREFIX=X        Install prefix (default: /usr/local)"
	@echo "  V=1             Verbose output"
```

### Verbose 모드

기본적으로 명령을 숨기고, `V=1`로 표시합니다.

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
make         # 조용한 빌드
make V=1     # 명령 표시
```

---

## 흔한 실수

### wildcard가 빈 문자열 반환

```makefile
SRCS := $(wildcard srcs/*.c)   # 오타: src가 아니라 srcs
```

디렉터리 이름이 틀리면 `wildcard`가 빈 문자열을 반환합니다.

**해결**: `$(info SRCS = $(SRCS))`로 확인하세요.

### 병렬 빌드에서 순서 문제

```makefile
# 디렉터리가 만들어지기 전에 오브젝트 빌드 시도
$(BUILDDIR)/%.o: $(SRCDIR)/%.c
	$(CC) -c $< -o $@
```

**해결**: order-only 의존성으로 디렉터리 생성을 보장하세요.

```makefile
$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@
```

### 의존성 파일 경로 불일치

```makefile
BUILDDIR := build
OBJS := $(BUILDDIR)/main.o
DEPS := main.d   # 틀림: 경로가 다름
```

**해결**: 일관된 경로를 사용하세요.

```makefile
DEPS := $(OBJS:.o=.d)
```

### clean에서 중요한 파일 삭제

```makefile
clean:
	rm -rf *   # 위험!
```

**해결**: 정확한 경로만 삭제하세요.

```makefile
clean:
	$(RM) -r $(BUILDDIR)
```

---

## 정리

이 장에서 다룬 실전 패턴들입니다.

- **디렉터리 분리**: `src/`, `include/`, `build/` 구조
- **디버그/릴리스 분기**: `DEBUG` 또는 `BUILD_TYPE` 변수
- **자동 의존성**: `-MMD -MP` 옵션
- **정적/동적 라이브러리**: `ar`, `-shared -fPIC`
- **크로스 컴파일**: `CROSS_COMPILE` 접두사
- **테스트 통합**: `tests/` 디렉터리, `test` 타겟
- **설치**: `install` 명령, `PREFIX` 변수
- **도움말**: `help` 타겟

## 시리즈 마무리

GNU Make 시리즈를 마칩니다. Make는 1976년에 만들어진 오래된 도구이지만, C/C++ 프로젝트에서 여전히 널리 쓰입니다. 리눅스 커널, Git, Python 인터프리터 등 수많은 오픈소스 프로젝트가 Make로 빌드됩니다.

이 시리즈에서 다룬 내용으로 대부분의 프로젝트를 빌드할 수 있습니다. 더 복잡한 요구사항(크로스 플랫폼, IDE 통합, 패키지 관리 등)이 있다면 **CMake**를 고려해 보세요. CMake는 Makefile(또는 Ninja, Visual Studio 프로젝트 등)을 생성하는 메타 빌드 시스템입니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html)
- [Makefile Tutorial by Example](https://makefiletutorial.com/)
- [Managing Projects with GNU Make (O'Reilly)](https://www.oreilly.com/library/view/managing-projects-with/0596006101/)
- [Recursive Make Considered Harmful](http://aegis.sourceforge.net/auug97.pdf)
