---
title: "Ch 5: 함수"
date: 2025-05-14T05:00:00
description: "Makefile의 내장 함수로 텍스트 처리, 파일 탐색, 조건 분기를 다룹니다."
tags: [make, build, Makefile, functions]
series: "GNU Make"
seriesOrder: 5
draft: false
---

## 왜 함수가 필요한가

Ch 4까지의 Makefile은 소스 파일을 일일이 나열했습니다.

```makefile
SRCS := main.c hello.c utils.c config.c network.c
OBJS := main.o hello.o utils.o config.o network.o
```

파일이 추가될 때마다 두 줄을 모두 수정해야 합니다. 실수하기 쉽고 번거롭습니다.

**함수**를 사용하면 자동화할 수 있습니다.

```makefile
SRCS := $(wildcard src/*.c)
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
```

`wildcard`는 파일 시스템에서 패턴에 맞는 파일을 찾고, `patsubst`는 파일명을 변환합니다. 새 파일을 추가해도 Makefile을 수정할 필요가 없습니다.

---

## 함수 호출 문법

Make 함수는 `$(함수명 인자들)` 형식으로 호출합니다.

```makefile
$(함수명 인자1,인자2,...)
```

중괄호도 사용할 수 있습니다.

```makefile
${함수명 인자1,인자2,...}
```

### 공백 주의

인자는 쉼표로 구분하며, **쉼표 앞뒤의 공백도 인자에 포함**됩니다.

```makefile
# 주의: 공백이 인자에 포함됨
$(subst a, b, text)  # " b"로 치환됨 (공백 포함)
$(subst a,b,text)    # "b"로 치환됨 (의도한 대로)
```

이 규칙을 기억하지 못하면 디버깅하기 어려운 버그가 생깁니다.

---

## 문자열 함수

### subst — 문자열 치환

```makefile
$(subst from,to,text)
```

`text`에서 `from`을 모두 `to`로 치환합니다.

```makefile
FILES := foo.c bar.c baz.c
OBJS := $(subst .c,.o,$(FILES))
# OBJS = foo.o bar.o baz.o
```

### patsubst — 패턴 치환

```makefile
$(patsubst pattern,replacement,text)
```

`%` 와일드카드를 사용합니다. `subst`보다 정밀합니다.

```makefile
SRCS := src/foo.c src/bar.c
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
# OBJS = build/foo.o build/bar.o
```

**단축 문법**: 변수에 직접 적용할 수 있습니다.

```makefile
OBJS := $(SRCS:src/%.c=build/%.o)
# 동일한 결과
```

`subst`와 `patsubst`의 차이를 정리합니다.

| 함수 | 매칭 방식 | 예시 |
|------|----------|------|
| `subst` | 정확히 일치하는 모든 부분 | `$(subst .c,.o,main.c)` → `main.o` |
| `patsubst` | `%` 패턴으로 단어 단위 매칭 | `$(patsubst %.c,%.o,main.c)` → `main.o` |

### strip — 공백 제거

```makefile
$(strip string)
```

앞뒤 공백과 연속 공백을 제거합니다.

```makefile
VAR :=   hello   world
CLEAN := $(strip $(VAR))
# CLEAN = hello world
```

조건문에서 비어 있는지 확인할 때 유용합니다.

```makefile
ifeq ($(strip $(VAR)),)
# VAR이 비어 있거나 공백만 있음
endif
```

### findstring — 문자열 검색

```makefile
$(findstring find,text)
```

찾으면 `find`를, 못 찾으면 빈 문자열을 반환합니다.

```makefile
# CFLAGS에 debug가 있는지 확인
ifneq ($(findstring debug,$(CFLAGS)),)
# debug 플래그가 있음
endif
```

### filter — 필터링

```makefile
$(filter pattern...,text)
```

패턴에 매칭되는 단어만 남깁니다. 여러 패턴을 지정할 수 있습니다.

```makefile
FILES := main.c main.h utils.c utils.h config.mk
SRCS := $(filter %.c,$(FILES))
# SRCS = main.c utils.c

HEADERS := $(filter %.h,$(FILES))
# HEADERS = main.h utils.h

CODE := $(filter %.c %.h,$(FILES))
# CODE = main.c main.h utils.c utils.h
```

### filter-out — 제외

```makefile
$(filter-out pattern...,text)
```

패턴에 매칭되는 단어를 제거합니다.

```makefile
SRCS := main.c test_main.c utils.c test_utils.c
PROD_SRCS := $(filter-out test_%,$(SRCS))
# PROD_SRCS = main.c utils.c
```

테스트 코드와 프로덕션 코드를 분리할 때 유용합니다.

### sort — 정렬 및 중복 제거

```makefile
$(sort list)
```

알파벳순으로 정렬하고 중복을 제거합니다.

```makefile
FILES := z.c a.c m.c a.c
SORTED := $(sort $(FILES))
# SORTED = a.c m.c z.c
```

**부작용**: 중복 제거는 의도치 않은 결과를 낼 수 있습니다. 순서나 중복이 중요하면 `sort`를 사용하지 마세요.

### word, words, wordlist — 단어 접근

```makefile
$(word n,text)         # n번째 단어 (1부터 시작)
$(words text)          # 단어 개수
$(wordlist s,e,text)   # s~e번째 단어
$(firstword text)      # 첫 단어
$(lastword text)       # 마지막 단어
```

```makefile
LIST := one two three four five
$(word 3,$(LIST))           # three
$(words $(LIST))            # 5
$(wordlist 2,4,$(LIST))     # two three four
$(firstword $(LIST))        # one
$(lastword $(LIST))         # five
```

---

## 파일 이름 함수

### dir, notdir — 디렉터리/파일 분리

```makefile
$(dir names...)      # 디렉터리 부분 (슬래시 포함)
$(notdir names...)   # 파일 이름 부분
```

```makefile
FILES := src/main.c include/header.h
$(dir $(FILES))      # src/ include/
$(notdir $(FILES))   # main.c header.h
```

`dir`은 슬래시를 포함한다는 점에 주의하세요.

### basename, suffix — 확장자 처리

```makefile
$(basename names...)  # 확장자 제거
$(suffix names...)    # 확장자만
```

```makefile
FILES := main.c utils.cpp config.h
$(basename $(FILES))  # main utils config
$(suffix $(FILES))    # .c .cpp .h
```

### addsuffix, addprefix — 접두사/접미사 추가

```makefile
$(addprefix prefix,names...)
$(addsuffix suffix,names...)
```

```makefile
MODULES := main utils config
SRCS := $(addsuffix .c,$(MODULES))
# SRCS = main.c utils.c config.c

OBJS := $(addprefix build/,$(addsuffix .o,$(MODULES)))
# OBJS = build/main.o build/utils.o build/config.o
```

함수를 중첩해서 복잡한 변환도 가능합니다.

### wildcard — 파일 탐색

```makefile
$(wildcard pattern)
```

**실제 파일 시스템**에서 패턴에 매칭되는 파일을 찾습니다. 이 점이 중요합니다. 다른 함수들은 문자열만 처리하지만, `wildcard`는 파일 시스템을 조회합니다.

```makefile
SRCS := $(wildcard src/*.c)
# src/ 디렉터리의 모든 .c 파일

ALL_SRCS := $(wildcard src/*.c src/**/*.c)
# src/와 하위 디렉터리의 모든 .c 파일
```

**주의**: `**`는 GNU Make 4.0 이상에서만 동작합니다.

### realpath, abspath — 경로 정규화

```makefile
$(realpath names...)  # 심볼릭 링크 해제한 절대 경로
$(abspath names...)   # 절대 경로
```

```makefile
$(abspath ../project/src)  # /home/user/project/src
```

---

## 조건 함수

### if

```makefile
$(if condition,then-part)
$(if condition,then-part,else-part)
```

`condition`이 비어 있지 않으면 `then-part`, 비어 있으면 `else-part`를 반환합니다.

```makefile
DEBUG ?=
CFLAGS := $(if $(DEBUG),-g -O0,-O2)
# DEBUG가 설정되면 -g -O0, 아니면 -O2
```

조건 지시자(`ifeq`)는 Makefile 파싱 시점에 평가되지만, `$(if)`는 변수 확장 시점에 평가됩니다. 용도가 다릅니다.

### or, and

```makefile
$(or cond1,cond2,...)   # 첫 번째 비어 있지 않은 값
$(and cond1,cond2,...)  # 모두 비어 있지 않으면 마지막 값, 아니면 빈 문자열
```

```makefile
# CC가 비어 있으면 gcc
CC := $(or $(CC),gcc)

# DEBUG와 VERBOSE가 모두 설정되어 있으면 true
BOTH := $(and $(DEBUG),$(VERBOSE))
```

---

## 기타 유용한 함수

### shell — 셸 명령 실행

```makefile
$(shell command)
```

셸 명령을 실행하고 결과를 반환합니다. 매우 강력하지만 남용하면 빌드 속도가 느려집니다.

```makefile
DATE := $(shell date +%Y-%m-%d)
GIT_HASH := $(shell git rev-parse --short HEAD)
UNAME := $(shell uname -s)

CFLAGS += -DBUILD_DATE=\"$(DATE)\" -DGIT_HASH=\"$(GIT_HASH)\"
```

### foreach — 반복

```makefile
$(foreach var,list,text)
```

`list`의 각 단어에 대해 `text`를 평가합니다.

```makefile
DIRS := src lib test
CLEAN_DIRS := $(foreach d,$(DIRS),$(d)/build)
# CLEAN_DIRS = src/build lib/build test/build
```

### call — 사용자 정의 함수 호출

```makefile
$(call func,arg1,arg2,...)
```

먼저 함수를 변수로 정의합니다. `$(1)`, `$(2)`로 인자를 참조합니다.

```makefile
# 함수 정의
make-obj = $(patsubst %.c,$(1)/%.o,$(2))

# 호출
OBJS := $(call make-obj,build,main.c utils.c)
# OBJS = build/main.o build/utils.o
```

복잡한 변환을 재사용할 때 유용합니다.

### eval — 동적 Makefile 생성

```makefile
$(eval text)
```

`text`를 Makefile 코드로 해석하고 실행합니다. 가장 강력하지만 가장 복잡한 함수입니다.

```makefile
define make-target
$(1): $(2)
	$(CC) -o $$@ $$^
endef

$(eval $(call make-target,hello,main.o utils.o))
# 아래 규칙이 생성됨:
# hello: main.o utils.o
#     $(CC) -o $@ $^
```

**주의**: `eval` 안에서 `$`를 리터럴로 쓰려면 `$$`로 이스케이프합니다. `eval`은 두 번 확장되기 때문입니다.

### error, warning, info — 메시지 출력

```makefile
$(error text)    # 오류 메시지 출력 후 종료
$(warning text)  # 경고 메시지 출력
$(info text)     # 정보 메시지 출력
```

```makefile
ifndef CC
$(error CC is not defined. Please set CC to your compiler.)
endif

$(info Building with CC=$(CC))

ifeq ($(DEBUG),1)
$(warning Debug build - not for production!)
endif
```

디버깅할 때 `$(info)`로 변수 값을 확인할 수 있습니다.

```makefile
$(info SRCS = $(SRCS))
$(info OBJS = $(OBJS))
```

---

## 실전 예시

```makefile
CC := gcc
CFLAGS := -Wall -Wextra

SRCDIR := src
BUILDDIR := build

# 모든 .c 파일 찾기
SRCS := $(wildcard $(SRCDIR)/*.c $(SRCDIR)/**/*.c)

# .c → .o 변환 (디렉터리 구조 유지)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))

# 필요한 디렉터리 목록 (중복 제거)
OBJDIRS := $(sort $(dir $(OBJS)))

TARGET := $(BUILDDIR)/myapp

.PHONY: all clean info

all: $(TARGET)

$(TARGET): $(OBJS) | $(BUILDDIR)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIRS)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(OBJDIRS):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR)

# 디버깅용: 변수 값 출력
info:
	$(info SRCS = $(SRCS))
	$(info OBJS = $(OBJS))
	$(info OBJDIRS = $(OBJDIRS))
```

---

## 흔한 실수

### 쉼표 앞뒤 공백

```makefile
# 틀림: 공백이 인자에 포함됨
$(patsubst %.c, %.o, $(SRCS))
#          ^^^^^ " %.o"가 됨

# 맞음
$(patsubst %.c,%.o,$(SRCS))
```

함수 인자에서 쉼표 뒤의 공백은 의미가 있습니다. 습관적으로 공백을 넣지 마세요.

### wildcard 결과가 빈 문자열

```makefile
SRCS := $(wildcard srcs/*.c)   # 오타: src가 아니라 srcs
# SRCS가 비어 있음 - 파일이 없으니까
```

`wildcard`는 실제 파일을 찾습니다. 경로가 틀리면 빈 문자열을 반환합니다. `$(info)`로 확인하세요.

```makefile
SRCS := $(wildcard src/*.c)
$(info SRCS = $(SRCS))   # 비어 있으면 경로 확인
```

### shell 함수의 줄바꿈

```makefile
FILES := $(shell find src -name '*.c')
# 줄바꿈이 공백으로 치환됨
```

`$(shell)`은 줄바꿈을 공백으로 바꿉니다. 대부분의 경우 문제없지만, 파일명에 공백이 있으면 문제가 됩니다.

### eval의 이중 확장

```makefile
define make-rule
$(1): $(2)
	echo $@      # 틀림: 빈 문자열
	echo $$@     # 맞음: $@
endef
```

`eval`은 텍스트를 두 번 확장합니다. 첫 번째 확장에서 `$@`가 빈 문자열이 됩니다. `$$@`로 써야 두 번째 확장에서 `$@`가 됩니다.

### filter vs findstring 혼동

```makefile
# filter: 단어 단위로 매칭
$(filter debug,debug release)      # debug

# findstring: 부분 문자열 검색
$(findstring debug,debug-mode)     # debug
$(filter debug,debug-mode)         # (빈 문자열 - 정확히 일치하지 않음)
```

`filter`는 단어 전체가 매칭되어야 하고, `findstring`은 부분 문자열을 찾습니다.

---

## 정리

- 함수는 `$(함수명 인자,인자,...)`로 호출합니다. **쉼표 앞뒤 공백 주의**.
- **문자열 함수**: `subst`, `patsubst`, `filter`, `filter-out`, `sort`, `strip`.
- **파일 함수**: `wildcard`, `dir`, `notdir`, `basename`, `suffix`, `addprefix`, `addsuffix`.
- **조건 함수**: `if`, `or`, `and`.
- **셸 함수**: `shell`로 외부 명령 결과를 변수에 저장합니다.
- **고급 함수**: `foreach`, `call`, `eval`로 동적 규칙을 생성합니다.

## 다음 장 예고

Ch 6에서는 조건문과 include를 다룹니다. `ifeq`, `ifdef` 같은 조건 지시자와 다른 Makefile을 포함하는 방법을 살펴봅니다.

## 참고 자료

- [GNU Make Manual - Functions](https://www.gnu.org/software/make/manual/html_node/Functions.html)
- [GNU Make Manual - Text Functions](https://www.gnu.org/software/make/manual/html_node/Text-Functions.html)
