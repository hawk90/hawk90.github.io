---
title: "Ch 6: 조건문과 include"
date: 2025-05-14T06:00:00
description: "조건부 처리와 Makefile 분할로 유연하고 모듈화된 빌드 시스템을 만듭니다."
tags: [make, build, Makefile, conditional]
series: "GNU Make"
seriesOrder: 6
draft: false
---

## 왜 조건문이 필요한가

같은 소스 코드를 다른 환경에서 빌드해야 할 때가 있습니다.

- **디버그/릴리스**: 개발 중에는 `-g -O0`, 배포 시에는 `-O2`
- **운영체제**: Linux에서는 `-lpthread`, macOS에서는 다른 플래그
- **컴파일러**: GCC와 Clang에서 경고 옵션이 다름

조건문 없이는 여러 Makefile을 유지해야 합니다. **조건 지시자**를 사용하면 하나의 Makefile로 모든 상황을 처리할 수 있습니다.

```makefile
DEBUG ?= 0

ifeq ($(DEBUG),1)
CFLAGS := -g -O0 -DDEBUG
else
CFLAGS := -O2 -DNDEBUG
endif
```

```bash
make           # 릴리스 빌드
make DEBUG=1   # 디버그 빌드
```

---

## 조건 지시자

Make의 조건 지시자는 Makefile의 일부를 조건부로 처리합니다. C의 `#if`처럼 **파싱 시점**에 평가됩니다. 이 점이 중요합니다.

### ifeq / ifneq — 문자열 비교

```makefile
ifeq (a,b)
# a와 b가 같으면 실행
endif

ifneq (a,b)
# a와 b가 다르면 실행
endif
```

괄호 대신 따옴표도 사용할 수 있습니다.

```makefile
ifeq "a" "b"
ifeq 'a' 'b'
```

### 예시: 디버그 빌드

```makefile
DEBUG ?= 0

ifeq ($(DEBUG),1)
CFLAGS := -g -O0 -DDEBUG
BUILDDIR := build/debug
else
CFLAGS := -O2 -DNDEBUG
BUILDDIR := build/release
endif
```

### 예시: 운영체제 분기

```makefile
UNAME := $(shell uname -s)

ifeq ($(UNAME),Linux)
LDLIBS := -lpthread -lrt
endif

ifeq ($(UNAME),Darwin)
LDLIBS := -lpthread
endif

# Windows는 uname이 없으므로 OS 환경 변수 확인
ifeq ($(OS),Windows_NT)
EXE := .exe
RM := del /Q
endif
```

### 예시: 컴파일러 분기

```makefile
ifeq ($(CC),gcc)
CFLAGS += -Wextra -Wno-unused-parameter
else ifeq ($(CC),clang)
CFLAGS += -Weverything -Wno-padded
endif
```

---

## ifdef / ifndef — 정의 여부 확인

```makefile
ifdef VAR
# VAR이 정의되어 있으면 (빈 문자열도 정의된 것으로 간주)
endif

ifndef VAR
# VAR이 정의되지 않았으면
endif
```

### ifeq와 ifdef의 차이

이 차이를 이해하는 것이 중요합니다.

```makefile
VAR :=          # 빈 문자열로 정의

ifdef VAR
# 실행됨 - VAR은 정의되어 있음 (값이 비어 있어도)
endif

ifeq ($(VAR),)
# 실행됨 - VAR의 값이 비어 있음
endif
```

`ifdef`는 변수의 **존재**를 확인하고, `ifeq ($(VAR),)`는 변수의 **값**이 비어 있는지 확인합니다.

**권장**: 값의 유무를 확인할 때는 `ifeq`를 사용하세요.

```makefile
# VAR이 비어 있지 않으면
ifneq ($(VAR),)
# ...
endif
```

---

## else와 else if

```makefile
ifeq ($(CC),gcc)
CFLAGS += -Wextra
else ifeq ($(CC),clang)
CFLAGS += -Weverything
else
CFLAGS += -Wall
endif
```

`else if`는 문법적으로 `else`와 `ifeq`의 조합입니다. 들여쓰기는 가독성을 위한 것이고 문법적 의미는 없습니다.

---

## 레시피 안에서의 조건

조건 지시자는 **Makefile 파싱 시점**에 평가됩니다. 레시피는 **실행 시점**에 셸에서 동작합니다. 두 시점이 다르므로 조건 지시자를 레시피 안에서 직접 사용할 수 없습니다.

```makefile
# 틀림 - Makefile 조건은 레시피 안에서 이렇게 쓸 수 없음
test:
ifeq ($(DEBUG),1)
	echo "Debug mode"
endif
```

셸의 조건문을 사용해야 합니다.

```makefile
# 맞음 - 셸 조건문 사용
test:
	@if [ "$(DEBUG)" = "1" ]; then \
		echo "Debug mode"; \
	else \
		echo "Release mode"; \
	fi
```

더 깔끔한 방법은 변수에 조건부 값을 미리 설정하는 것입니다.

```makefile
ifeq ($(DEBUG),1)
BUILD_MSG := Debug mode
else
BUILD_MSG := Release mode
endif

test:
	@echo "$(BUILD_MSG)"
```

---

## include — 다른 Makefile 포함

```makefile
include filename...
```

다른 Makefile을 현재 위치에 삽입합니다. 설정을 분리하거나 공통 규칙을 재사용할 때 유용합니다.

### 기본 사용법

```makefile
# config.mk
CC := gcc
CFLAGS := -Wall -g

# Makefile
include config.mk

hello: main.o
	$(CC) $(CFLAGS) -o $@ $^
```

### 여러 파일 포함

```makefile
include config.mk rules.mk
include $(wildcard deps/*.d)
```

### -include — 오류 무시

```makefile
-include deps/*.d
```

파일이 없어도 오류가 나지 않습니다. 자동 생성되는 의존성 파일을 포함할 때 유용합니다. 첫 빌드 시에는 `.d` 파일이 없기 때문입니다.

`sinclude`도 같은 동작을 합니다(POSIX 호환).

---

## 자동 의존성 생성

헤더 파일 의존성을 자동으로 추적하는 패턴입니다. 실제 프로젝트에서 필수적인 기법입니다.

### 문제 상황

```makefile
main.o: main.c
	gcc -c main.c
```

`main.c`가 `header.h`를 포함하는데, Makefile에 이 의존성이 없으면 `header.h`를 수정해도 `main.o`가 다시 빌드되지 않습니다.

```c
// main.c
#include "header.h"  // 이 의존성이 Makefile에 없음!
```

모든 헤더 의존성을 수동으로 관리하는 것은 현실적이지 않습니다.

### 해결책: 컴파일러가 의존성을 생성

GCC/Clang은 `-MM` 옵션으로 의존성을 출력합니다.

```bash
$ gcc -MM main.c
main.o: main.c header.h utils.h
```

이 출력을 파일로 저장하고 `include`합니다.

### 기본 패턴

```makefile
SRCS := main.c utils.c
OBJS := $(SRCS:.c=.o)
DEPS := $(SRCS:.c=.d)

# 의존성 파일 포함 (없으면 무시)
-include $(DEPS)

# 의존성 파일 생성 규칙
%.d: %.c
	$(CC) -MM -MT '$(@:.d=.o)' $< -MF $@

# 오브젝트 파일 규칙
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

### GCC 옵션 설명

| 옵션 | 의미 |
|------|------|
| `-MM` | 시스템 헤더 제외한 의존성 출력 |
| `-M` | 시스템 헤더 포함한 의존성 출력 |
| `-MT target` | 출력의 타겟 이름 지정 |
| `-MF file` | 출력 파일 지정 |
| `-MD` | 컴파일하면서 `.d` 파일도 생성 |
| `-MMD` | `-MD` + 시스템 헤더 제외 |
| `-MP` | 헤더에 대한 phony 타겟 추가 |

### 더 간단한 방법: -MMD -MP

```makefile
CFLAGS += -MMD -MP

SRCS := main.c utils.c
OBJS := $(SRCS:.c=.o)
DEPS := $(OBJS:.o=.d)

-include $(DEPS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

`-MMD`는 컴파일하면서 동시에 `.d` 파일을 생성합니다. 별도의 규칙이 필요 없습니다.

`-MP`는 헤더 파일에 대한 phony 타겟을 추가합니다.

```makefile
# -MP 없이 생성된 .d 파일
main.o: main.c header.h

# -MP 포함 시
main.o: main.c header.h
header.h:
```

`header.h`가 삭제되면 `-MP` 없이는 Make가 오류를 냅니다. `-MP`가 있으면 빈 규칙이 있어서 오류 없이 다시 빌드됩니다.

---

## Makefile 분할 패턴

대규모 프로젝트에서는 Makefile을 분할합니다.

### 설정 분리

```
project/
├── Makefile
├── config.mk        # 변수 설정
├── rules.mk         # 공통 규칙
└── src/
    ├── module1/
    │   └── module.mk
    └── module2/
        └── module.mk
```

```makefile
# Makefile
include config.mk

MODULES := src/module1 src/module2

include $(addsuffix /module.mk,$(MODULES))
include rules.mk
```

### 재귀적 Make vs 비재귀적 Make

**재귀적 Make**: 각 디렉터리에서 `make` 호출

```makefile
SUBDIRS := lib app

.PHONY: all $(SUBDIRS)

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@
```

단점이 있습니다.

- 병렬 빌드 효율 저하
- 디렉터리 간 의존성 추적 어려움
- 각 서브 Make가 독립적이라 중복 컴파일 가능

**비재귀적 Make**: 하나의 Makefile에서 전체 관리

```makefile
include lib/module.mk
include app/module.mk

all: $(ALL_TARGETS)
```

현대적인 대규모 프로젝트에서 권장하는 방식입니다. 의존성을 정확히 추적하고 병렬 빌드가 효율적입니다.

---

## 실전 예시

```makefile
# config.mk
CC := gcc
CXX := g++
CFLAGS := -Wall -Wextra
CXXFLAGS := $(CFLAGS) -std=c++17

DEBUG ?= 0
ifeq ($(DEBUG),1)
CFLAGS += -g -O0 -DDEBUG
CXXFLAGS += -g -O0 -DDEBUG
BUILDDIR := build/debug
else
CFLAGS += -O2 -DNDEBUG
CXXFLAGS += -O2 -DNDEBUG
BUILDDIR := build/release
endif
```

```makefile
# Makefile
include config.mk

SRCDIR := src
SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)

TARGET := $(BUILDDIR)/myapp

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS) | $(BUILDDIR)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -MMD -MP -c $< -o $@

$(BUILDDIR):
	mkdir -p $@

clean:
	$(RM) -r build

-include $(DEPS)
```

사용법:

```bash
make                 # 릴리스 빌드
make DEBUG=1         # 디버그 빌드
make clean           # 정리
make DEBUG=1 clean   # 디버그 빌드 정리
```

---

## 흔한 실수

### ifeq에서 공백

```makefile
# 틀림: 공백이 비교에 포함됨
ifeq ($(DEBUG), 1)   # " 1"과 비교
endif

# 맞음
ifeq ($(DEBUG),1)
endif
```

### ifdef로 빈 문자열 확인

```makefile
VAR :=

ifdef VAR
# 실행됨! VAR이 정의되어 있으므로 (비어 있어도)
endif
```

**해결**: `ifeq ($(VAR),)`로 빈 문자열을 확인하세요.

### 조건문을 레시피 안에서 사용

```makefile
# 틀림
test:
ifeq ($(DEBUG),1)
	echo "debug"
endif
```

이 코드는 문법적으로는 동작할 수 있지만, 조건 지시자가 파싱 시점에 평가되므로 예상대로 동작하지 않을 수 있습니다.

**해결**: 셸 조건문을 사용하거나, 조건부 변수를 미리 설정하세요.

### -include 순서

```makefile
# 틀림: 변수가 아직 정의되지 않음
-include $(DEPS)

SRCS := main.c
DEPS := $(SRCS:.c=.d)
```

`-include`가 변수 정의보다 먼저 오면 `$(DEPS)`가 비어 있습니다.

**해결**: 변수를 먼저 정의하세요.

### 자동 의존성에서 -MP 누락

```makefile
# header.h를 삭제하면 오류
CFLAGS += -MMD   # -MP 없음
```

헤더 파일이 삭제되면 `.d` 파일이 존재하지 않는 파일을 의존성으로 가지게 되어 오류가 납니다.

**해결**: 항상 `-MMD -MP`를 함께 사용하세요.

---

## 정리

- **조건 지시자**: `ifeq`, `ifneq`, `ifdef`, `ifndef`로 조건부 처리합니다.
- 조건은 **Makefile 파싱 시점**에 평가됩니다. 레시피 안에서는 셸 조건문을 사용하세요.
- `include`로 다른 Makefile을 포함하고, `-include`는 오류를 무시합니다.
- `-MMD -MP` 옵션으로 헤더 의존성을 자동 추적합니다.
- 대규모 프로젝트는 **비재귀적 Make** 방식으로 Makefile을 분할합니다.

## 다음 장 예고

Ch 7에서는 실전 Makefile 예제를 다룹니다. C/C++ 프로젝트의 완전한 Makefile, 크로스 컴파일 설정, 그리고 자주 쓰는 패턴을 정리합니다.

## 참고 자료

- [GNU Make Manual - Conditionals](https://www.gnu.org/software/make/manual/html_node/Conditionals.html)
- [GNU Make Manual - Include](https://www.gnu.org/software/make/manual/html_node/Include.html)
- [Auto-Dependency Generation](http://make.mad-scientist.net/papers/advanced-auto-dependency-generation/)
