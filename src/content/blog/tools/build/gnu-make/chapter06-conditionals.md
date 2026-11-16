---
title: "Make 조건문과 include — ifeq·ifdef·include·-include"
slug: "tools/build/gnu-make/chapter06-conditionals"
date: 2026-06-03T09:06:00
description: "파싱 시점 조건 분기, Makefile 분할, 그리고 -MMD -MP로 헤더 의존성을 자동 추적하는 표준 패턴."
tags: [make, build, conditional]
series: "GNU Make"
seriesOrder: 6
draft: false
topics: ["tools", "tools/build"]
---

## 왜 조건문이 필요한가

같은 소스 코드를 *다른 모드로* 빌드해야 할 때가 있습니다.

- *디버그 vs 릴리스*: 개발 중 `-g -O0`, 배포 시 `-O2`.
- *플랫폼*: Linux와 macOS의 링크 옵션이 다릅니다.
- *컴파일러*: `-Weverything`처럼 Clang에만 있는 경고 옵션이 있습니다.

조건문이 없으면 Makefile을 둘로 쪼개거나, 사용자가 매번 `CFLAGS`를 손으로 적어야 합니다. *조건 지시자*는 한 Makefile 안에서 모드를 나눕니다.

```makefile
DEBUG ?= 0

ifeq ($(DEBUG),1)
CFLAGS := -g -O0 -DDEBUG
else
CFLAGS := -O2 -DNDEBUG
endif
```

```bash
make           # 릴리스
make DEBUG=1   # 디버그
```

이 장은 조건 지시자와 `include` 지시자를 다루고, 마지막에 둘을 합쳐 *헤더 의존성 자동 추적*을 완성합니다. 실행 환경은 앞 장들과 같은 GNU Make 4.4.1, macOS 27.2.1, Apple clang 21.0.0입니다.

---

## 조건 지시자 — 파싱 시점의 분기

Make의 조건 지시자는 C 전처리기의 `#if`와 비슷한 자리에 있습니다. *Makefile을 읽는 시점*에 평가되고, 결과에 따라 *그 블록이 Makefile에 포함되거나 빠집니다*([매뉴얼 7장](https://www.gnu.org/software/make/manual/html_node/Conditionals.html)). 평가는 한 번이고, 빌드 도중 다시 평가되지 않습니다.

이 점이 함수 `$(if ...)`(Ch 5)와 다릅니다. `$(if)`는 그 함수가 확장될 때마다 평가되지만, `ifeq`는 Makefile을 읽을 때 한 번 정해집니다.

### `ifeq` / `ifneq` — 문자열 비교

```makefile
ifeq (a,b)
# a와 b가 같으면 이 블록이 Makefile에 포함됨
endif

ifneq (a,b)
# 다르면 포함
endif
```

[매뉴얼 7.2절](https://www.gnu.org/software/make/manual/html_node/Conditional-Syntax.html)은 괄호 형식 외에 `ifeq "a" "b"`, `ifeq 'a' 'b'` 같은 따옴표 형식도 허용합니다. 사용 예 셋을 보겠습니다.

**1. 디버그/릴리스 분기**

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

`BUILDDIR`이 모드별로 갈라지므로 디버그·릴리스 오브젝트가 *섞이지 않습니다*. 모드를 바꿔 빌드해도 다른 모드의 오브젝트를 덮어쓰지 않는다는 것을 아래 "실전 예시"에서 확인합니다.

**2. 플랫폼 분기**

```makefile
UNAME := $(shell uname -s)

ifeq ($(UNAME),Linux)
LDLIBS := -lpthread -lrt
endif

ifeq ($(UNAME),Darwin)
LDLIBS := -lpthread
endif
```

`uname -s`는 커널 이름을 돌려줍니다. 이 macOS에서는 `Darwin`이 나와 `LDLIBS=-lpthread`가 됐고, `gcc m.c -lpthread`도 링크에 성공했습니다. Linux 분기는 이 글에서 실행하지 않았습니다.

**3. 컴파일러 분기**

```makefile
ifeq ($(CC),gcc)
CFLAGS += -Wextra -Wno-unused-parameter
else ifeq ($(CC),clang)
CFLAGS += -Weverything -Wno-padded
endif
```

이 분기는 생각보다 자주 빗나갑니다. `$(CC)`의 *문자열*을 비교하기 때문입니다. 이 macOS에서 그냥 `make`를 부르면 `CC`는 내장 기본값 `cc`라 두 분기 모두 건너뛰었고, `make CC=gcc`는 gcc 분기로 갔지만 실제 컴파일러는 Apple clang이었습니다. 컴파일러 *종류*를 보려면 버전 문자열을 검사합니다.

```makefile
CC_VERSION := $(shell $(CC) --version 2>/dev/null)
ifneq ($(findstring clang,$(CC_VERSION)),)
CFLAGS += -Weverything -Wno-padded
endif
```

이 검사는 `CC`가 `cc`, `gcc`, `clang` 중 무엇이든 이 기계에서 모두 clang으로 판정했습니다.

### `ifdef` / `ifndef` — 값이 있는가

```makefile
ifdef VAR
# VAR에 값이 있으면
endif

ifndef VAR
# VAR가 미정의이거나 빈 값이면
endif
```

7.2절은 "`ifdef`는 변수에 값이 있는지만 검사하고, 값이 비어 있지 않은지 보려고 *확장하지는 않는다*"고 적습니다. 그래서 두 경우가 갈립니다.

```makefile
VAR :=                   # 빈 문자열로 정의
EXTRA_LIBS = $(NOTHING)  # 빈 변수를 참조하는 재귀 변수
```

| 검사 | `VAR` | `EXTRA_LIBS` |
|------|-------|--------------|
| `ifdef` | 거짓 | **참** (저장된 값 `$(NOTHING)`이 비어 있지 않음) |
| `ifeq ($(X),)` | 참 (빈 값) | 참 (확장하면 빈 값) |
| `$(origin X)` | `file` | `file` |

표는 실제로 `$(info)`를 찍어 얻은 결과입니다. 정의되지 않은 변수의 `$(origin)`은 `undefined`였습니다. *값이 비었는지*가 궁금하면 `ifeq`/`ifneq`를, *정의됐는지*가 궁금하면 `$(origin)`을 씁니다. `ifdef`는 둘 중 어느 쪽도 정확히 답하지 않습니다.

```makefile
ifneq ($(EXTRA_LIBS),)
LDLIBS += $(EXTRA_LIBS)
endif
```

### `else if`

```makefile
ifeq ($(CC),gcc)
CFLAGS += -Wextra
else ifeq ($(CC),clang)
CFLAGS += -Weverything
else
CFLAGS += -Wall   # 기본값
endif
```

`else ifeq`처럼 한 줄에 이어 쓴 체인은 마지막 `endif` 하나로 닫습니다(7.2절). `else`와 새 `ifeq`를 서로 다른 줄에 적으면 안쪽 조건이 *중첩*된 것이라 `endif`가 하나 더 필요합니다.

---

## 조건 지시자와 레시피의 시점 차이

조건 지시자는 *Makefile을 읽을 때*, 레시피의 변수는 *레시피를 실행하기 직전에* 확장됩니다. 이 차이가 드러나는 대표적인 경우가 *타겟별 변수*(아래 절)와 섞일 때입니다.

```makefile
test: DEBUG = 1
test:
ifeq ($(DEBUG),1)
	@echo "directive saw DEBUG=1"
else
	@echo "directive saw DEBUG=[$(DEBUG)] (recipe expands DEBUG=$(DEBUG))"
endif
	@if [ "$(DEBUG)" = "1" ]; then echo "shell saw 1"; fi
```

```text
$ make test
directive saw DEBUG=[1] (recipe expands DEBUG=1)
shell saw 1
```

`ifeq`는 파일을 읽는 시점의 전역 `DEBUG`(빈 값)를 보고 `else` 줄을 골랐습니다. 그런데 그 줄 안의 `$(DEBUG)`는 레시피 실행 직전에 타겟별 값 `1`로 확장됐습니다. 같은 `$(DEBUG)`가 한 화면에서 서로 다른 값으로 쓰인 셈입니다.

레시피 안에서 *실행 시점*에 분기하려면 위 마지막 줄처럼 *셸 조건문*을 씁니다.

```makefile
test:
	@if [ "$(DEBUG)" = "1" ]; then \
		echo "Debug mode"; \
	else \
		echo "Release mode"; \
	fi
```

조건이 Makefile 전체에 하나로 정해지는 값이라면 *변수에 분기 결과를 담아* 두는 방법도 있습니다.

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

## `include` — Makefile 합치기

```makefile
include filename...
```

다른 Makefile을 *그 자리에* 읽어 들입니다([매뉴얼 3.3절](https://www.gnu.org/software/make/manual/html_node/Include.html)). 변수도 규칙도 모두 합쳐집니다.

### 설정 분리

```makefile
# config.mk
CC := gcc
CFLAGS := -Wall -g
```

```makefile
# Makefile
include config.mk

hello: main.o
	$(CC) $(CFLAGS) -o $@ $^
```

설정과 규칙을 나누면 설정 파일만 바꿔 끼울 수 있습니다. 크로스 컴파일 시 `config.arm.mk`, `config.x86.mk`로 갈라 두는 식입니다.

### 여러 파일 / 와일드카드

```makefile
include config.mk rules.mk
include $(wildcard modules/*.mk)
```

`include` 줄도 읽는 즉시 확장되므로 `$(wildcard)` 같은 함수를 쓸 수 있습니다.

### `-include` — 파일이 없어도 OK

```makefile
-include deps/*.d
```

`include`는 *대상 파일이 없고 만들 규칙도 없으면 에러*를 냅니다.

```text
$ make -f a.mk          # a.mk 첫 줄: include nothere.mk
a.mk:1: nothere.mk: No such file or directory
make: *** No rule to make target 'nothere.mk'.  Stop.
```

같은 줄을 `-include nothere.mk`로 바꾸면 메시지 없이 다음으로 넘어갑니다. 첫 빌드처럼 `.d`(자동 생성 의존성) 파일이 아직 없는 상황에 필요한 동작입니다. 3.3절은 `sinclude`를 다른 `make` 구현과의 호환을 위한 `-include`의 다른 이름으로 소개합니다.

---

## 자동 의존성 생성 — 실무 표준 패턴

### 문제 — 헤더 의존성을 손으로 못 적는다

```makefile
main.o: main.c
	gcc -c main.c
```

`main.c`가 `#include "header.h"`로 헤더를 포함하는데 위 규칙에는 `header.h`가 없습니다. Ch 1에서 재현했듯 `header.h`를 수정해도 `main.o`는 다시 컴파일되지 않습니다. 헤더에서 구조체 정의나 매크로 값을 바꿨다면 옛 정의로 컴파일된 오브젝트가 남습니다.

손으로 적으면 이렇게 됩니다.

```makefile
main.o: main.c header.h utils.h common.h
```

헤더가 다른 헤더를 포함하면 그 목록까지 따라가야 하고, `#include` 한 줄을 추가할 때마다 Makefile도 고쳐야 합니다.

### 해결 — 컴파일러가 의존성을 뽑아 주기

GCC와 Clang은 `-M` 계열 옵션으로 *그 파일이 포함하는 헤더 목록*을 Makefile 문법으로 출력합니다. Apple clang 21.0.0에서 `header.h`와 `utils.h`, `<stdio.h>`를 포함하는 `src/main.c`로 실행했습니다.

```text
$ gcc -MM src/main.c
main.o: \
  /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/SDKSettings.json \
  src/main.c src/header.h src/utils.h
```

`-MM`은 `<stdio.h>` 같은 시스템 헤더를 뺍니다. 같은 파일에 `-M`을 쓰면 시스템 헤더까지 들어가 출력이 42줄이었습니다. Apple clang은 `-MM`에서도 SDK의 `SDKSettings.json`을 넣는다는 점은 Ch 2에서 봤습니다. 타겟 이름이 디렉터리 없는 `main.o`로 나온 것도 눈여겨봅니다. 오브젝트를 `build/`에 둔다면 `-MT build/main.o`로 타겟 이름을 지정해야 하고, 그렇게 하면 첫 줄이 `build/main.o: \`로 바뀌었습니다.

| 옵션 | 의미 |
|------|------|
| `-M` | 시스템 헤더 포함한 의존성 출력 |
| `-MM` | 시스템 헤더 제외 |
| `-MT target` | 출력의 타겟 이름 변경 |
| `-MF file` | 출력을 파일로 |
| `-MD` | *컴파일하면서* `.d` 파일도 같이 생성 |
| `-MMD` | `-MD`와 같되 시스템 헤더 제외 |
| `-MP` | 각 헤더에 빈 규칙 추가 (헤더 삭제 대비) |

`-MD`/`-MMD`는 `-o`로 준 출력 경로의 확장자를 `.d`로 바꾼 파일을 쓰고, 타겟 이름도 그 `-o` 경로를 씁니다. 그래서 컴파일 규칙에 붙여 쓰면 `-MT`를 따로 줄 필요가 없습니다(아래 출력의 `src/main.o:`).

### 표준 패턴 — `-MMD -MP` + `-include`

```makefile
CFLAGS += -MMD -MP

SRCS := $(wildcard src/*.c)
OBJS := $(SRCS:.c=.o)
DEPS := $(OBJS:.o=.d)

app: $(OBJS)
	$(CC) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

-include $(DEPS)
```

`src/main.c`(`#include "header.h"`)와 `src/header.h`(`#define VALUE 7`)로 실행했습니다.

```text
$ make
cc -MMD -MP -c src/main.c -o src/main.o
cc -o app src/main.o
$ cat src/main.d
src/main.o: \
  /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/SDKSettings.json \
  src/main.c src/header.h
/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/SDKSettings.json:
src/header.h:
$ make
make: 'app' is up to date.
$ printf '#define VALUE 8\n' > src/header.h
$ make
cc -MMD -MP -c src/main.c -o src/main.o
cc -o app src/main.o
$ ./app
value=8
```

세 장치가 함께 동작했습니다.

1. **`-MMD`**: 컴파일하면서 `src/main.d`를 만들었고, 그 안에 `src/main.o: ... src/header.h`가 들어 있습니다.
2. **`-MP`**: `.d` 끝에 헤더마다 빈 규칙(`src/header.h:`)을 붙였습니다.
3. **`-include $(DEPS)`**: 첫 실행에서는 `.d`가 없어 조용히 건너뛰었고, 두 번째부터는 `.d`를 읽어 헤더 수정을 감지했습니다.

첫 빌드에 `.d`가 없어도 문제가 없는 이유는 `.o`가 없으니 어차피 컴파일되고, 그 컴파일이 `.d`를 만들기 때문입니다.

### `-MP`의 정확한 효과

`-MP`가 없는 `.d`에는 첫 규칙만 있습니다. 차이는 *헤더를 지울 때* 드러납니다. 두 변형(`-MMD -MP`, `-MMD`)으로 각각 빌드한 뒤, `header.h`를 지우고 그 내용을 `main.c`로 옮겨 `#include` 줄도 없앴습니다.

```text
$ make          # -MMD -MP
cc -MMD -MP -c src/main.c -o src/main.o
cc -o app src/main.o
$ make          # -MMD만
make: *** No rule to make target 'src/header.h', needed by 'src/main.o'.  Stop.
```

`-MP`가 없으면 옛 `.d`가 아직 `src/header.h`를 의존성으로 요구하는데, 그 파일도 만들 규칙도 없어 Make 단계에서 멈췄습니다. 소스는 이미 헤더를 쓰지 않는데도 `.d`를 지우기 전까지 빌드가 되지 않습니다. `-MP`가 만든 빈 규칙 `src/header.h:`는 "규칙은 있지만 아무것도 안 한다"로 처리되어, `main.o`가 다시 컴파일되고 새 `.d`가 만들어졌습니다.

반대로 소스가 지운 헤더를 *여전히* `#include`하고 있다면 `-MP`가 있어도 컴파일러 단계에서 실패합니다. `-MP`는 Make의 의존성 정보가 낡았을 때만 도와줍니다.

---

## Makefile 분할 패턴

### 설정과 규칙 분리

```text
project/
├── Makefile
├── config.mk
├── rules.mk
└── src/
    ├── module1/
    │   └── module.mk
    └── module2/
        └── module.mk
```

| 파일 | 역할 |
|------|------|
| `Makefile` | 진입점 |
| `config.mk` | 변수 설정 |
| `rules.mk` | 공통 규칙 |
| `src/*/module.mk` | 모듈별 변수·소스 목록 |

```makefile
# Makefile
include config.mk

MODULES := src/module1 src/module2
include $(addsuffix /module.mk,$(MODULES))

include rules.mk
```

각 `module.mk`는 *그 모듈의 소스 목록*만 추가합니다.

```makefile
# src/module1/module.mk
module1_SRCS := $(wildcard $(dir $(lastword $(MAKEFILE_LIST)))*.c)
SRCS += $(module1_SRCS)
```

`$(lastword $(MAKEFILE_LIST))`가 *방금 include된 파일 경로*를 준다는 것은 Ch 5에서 확인했습니다. `src/module1/`에 `a.c`·`b.c`, `src/module2/`에 `c.c`를 두고, `rules.mk`에 `$(SRCS)`의 오브젝트를 만드는 규칙을 넣어 실행했습니다.

```text
$ make
gcc    -c -o src/module1/a.o src/module1/a.c
gcc    -c -o src/module1/b.o src/module1/b.c
gcc    -c -o src/module2/c.o src/module2/c.c
SRCS=[src/module1/a.c src/module1/b.c src/module2/c.c]
```

### 재귀적 Make vs 비재귀적 Make

**재귀적 Make**는 디렉터리마다 별도의 `make`를 호출합니다.

```makefile
SUBDIRS := app lib

.PHONY: all $(SUBDIRS)

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@
```

`app/Makefile`은 `../lib/libfoo.a`를 링크하고, `lib/Makefile`이 그 라이브러리를 만듭니다. 위 최상위 Makefile을 그대로 실행하면 실패합니다.

```text
$ make --no-print-directory
make -C app
cc    -c -o main.o main.c
make[1]: *** No rule to make target '../lib/libfoo.a', needed by 'app'.  Stop.
make: *** [Makefile:8: app] Error 2
```

하위 `make`는 자기 디렉터리의 Makefile만 읽으므로, `app` 쪽에서는 `libfoo.a`를 만드는 규칙이 보이지 않습니다. 최상위에 `app: lib`를 추가해 디렉터리 사이의 순서를 손으로 적어 주자 `make -C lib`가 먼저 돌고 빌드가 성공했습니다. 이 순서 정보는 파일 단위 의존성(`app` → `libfoo.a` → `foo.o` → `foo.c`)이 아니라 디렉터리 단위라서, `lib`의 무엇이 바뀌었는지와 관계없이 매번 하위 `make`를 모두 실행해 확인합니다.

Peter Miller의 [Recursive Make Considered Harmful](https://aegis.sourceforge.net/auug97.pdf)(AUUGN 19(1), 1998)은 이런 증상, 즉 할 일이 없다는 것을 알아내는 데 오래 걸리고, 너무 많이 또는 너무 적게 빌드하는 문제의 공통 원인을 빌드를 별개의 Make 세션으로 쪼갠 데서 찾습니다. 논문의 결론은 "하나의 Makefile"이 아니라 "전체 프로젝트를 하나의 Make 세션으로" 빌드하라는 것입니다.

**비재귀적 Make**는 모든 모듈의 규칙을 한 Make에 읽어 들입니다.

```makefile
include lib/module.mk
include app/module.mk

all: $(ALL_TARGETS)
```

한 Make 프로세스가 *파일 단위 그래프 전체*를 가지므로, `app`이 `lib/libfoo.a`를 의존성으로 적기만 하면 순서와 재빌드 범위가 그 그래프에서 정해집니다. 대신 위 "분할 패턴"처럼 각 모듈 파일이 자기 경로를 알아내도록 짜야 하고, 모든 경로를 최상위 기준으로 적어야 합니다.

---

## 타겟별 변수 — *타겟마다 다른 값*

지금까지 본 변수는 *Makefile 전역*입니다. 특정 타겟에서만 다른 값을 쓰려면 타겟별 변수를 씁니다([매뉴얼 6.11절](https://www.gnu.org/software/make/manual/html_node/Target_002dspecific.html)).

### 문법

```makefile
target: VARIABLE = value
```

또는

```makefile
target: VARIABLE := value
target: VARIABLE += value
target: VARIABLE ?= value
```

이 값은 *그 타겟의 레시피와, 그 타겟 때문에 만들어지는 의존 타겟의 레시피*에서만 쓰입니다. 다른 자리는 전역 값을 봅니다.

### 예시 — 특정 모듈만 다른 최적화

```makefile
# 전역 기본값
CFLAGS = -O2 -Wall

# critical.o만 더 강한 최적화 + 더 많은 디버그 정보
critical.o: CFLAGS += -O3 -g3 -march=native

# debug_helper.o는 디버그용으로 최적화 끄기
debug_helper.o: CFLAGS = -O0 -g

%.o: %.c
	gcc $(CFLAGS) -c $< -o $@
```

```text
$ make critical.o debug_helper.o plain.o
gcc -O2 -Wall -O3 -g3 -march=native -c critical.c -o critical.o
gcc -O0 -g -c debug_helper.c -o debug_helper.o
gcc -O2 -Wall -c plain.c -o plain.o
```

`critical.o`는 전역 값 뒤에 덧붙인 값을, `debug_helper.o`는 대체한 값을, `plain.o`는 전역 값을 받았습니다.

### 패턴별 변수 — `%` 와일드카드 사용

```makefile
# tests 디렉터리의 모든 .o 파일은 sanitize 켜기
tests/%.o: CFLAGS += -fsanitize=address -O0
```

특정 *모듈 그룹*에 같은 옵션을 일괄 적용할 때 씁니다([매뉴얼 6.12절](https://www.gnu.org/software/make/manual/html_node/Pattern_002dspecific.html)).

### 의존 타겟까지 *전파*된다는 점이 중요

```makefile
myapp: CFLAGS += -DAPP_BUILD
myapp: main.o utils.o
	$(CC) -o $@ $^

other: CFLAGS += -DOTHER_BUILD
other: utils.o
	@echo other done
```

`myapp`을 빌드하면 의존성인 `main.o`, `utils.o`의 컴파일에도 `-DAPP_BUILD`가 들어갑니다. 문제는 `utils.o`처럼 두 상위 타겟이 공유하는 오브젝트입니다. 요청 순서만 바꿔 두 번 실행했습니다.

```text
$ make myapp other
cc -DAPP_BUILD   -c -o main.o main.c
cc -DAPP_BUILD   -c -o utils.o utils.c
cc -o myapp main.o utils.o
other done
$ rm -f *.o myapp
$ make other myapp
cc -DOTHER_BUILD   -c -o utils.o utils.c
other done
cc -DAPP_BUILD   -c -o main.o main.c
cc -o myapp main.o utils.o
```

`utils.o`는 먼저 요청된 타겟의 값으로 *한 번* 만들어졌고, 두 번째 상위 타겟은 이미 최신인 `utils.o`를 그대로 썼습니다. 두 번째 실행의 `myapp`에는 `-DOTHER_BUILD`로 컴파일된 `utils.o`가 링크됐습니다. 타겟마다 다른 옵션의 오브젝트가 필요하면 `build/app/utils.o`, `build/other/utils.o`처럼 파일 경로를 나눠야 합니다.

### 적용 시점 — *레시피 실행 시*

타겟별 변수는 *레시피를 확장할 때* 해당 타겟의 문맥에서 적용됩니다. 그래서 Makefile 최상위의 `$(info $(CFLAGS))`에는 *전역 값만* 보입니다. 위 `critical.o` 예제의 최상위에 `$(info Global CFLAGS = $(CFLAGS))`를 넣었더니 `Global CFLAGS = -O2 -Wall`이 찍혔고, 같은 실행에서 `critical.o` 레시피는 `-O3 -g3 -march=native`까지 받았습니다. 타겟별 값을 보려면 레시피 안에서 출력합니다.

```makefile
critical.o: CFLAGS += -O3

critical.o: %.o: %.c
	@echo "Building $@ with CFLAGS=$(CFLAGS)"   # 타겟별 값 보임
	gcc $(CFLAGS) -c $< -o $@
```

---

## 직접 확인 — 빈 값과 조건식 공백

다음 파일을 `conditions.mk`로 저장하고 `make -f conditions.mk DEBUG=1`로 실행합니다.

```makefile title="conditions.mk"
EMPTY :=
REFERENCE = $(EMPTY)
ifdef EMPTY
$(error EMPTY must be false)
endif
ifdef REFERENCE
$(info stored-reference=true)
endif
ifeq ($(REFERENCE),)
$(info expanded-reference=empty)
endif
ifeq ($(DEBUG), 1)
$(info debug-match=true)
endif
.PHONY: all
all:
	@printf 'conditions checked\n'
```

```text
$ make -f conditions.mk DEBUG=1
stored-reference=true
expanded-reference=empty
debug-match=true
conditions checked
```

`EMPTY`는 `ifdef`에서 거짓이지만, `REFERENCE`에는 확장 전의 참조 문자열 `$(EMPTY)`가 저장되어 있어 `ifdef`에서 참입니다. 확장해서 비교하는 `ifeq`는 `REFERENCE`를 빈 값으로 봤습니다. 쉼표 뒤에 공백을 둔 `ifeq ($(DEBUG), 1)`도 일치했습니다.

## 실전 예시 — 모드 분기 + 자동 의존성

이 절의 두 Makefile과 두 소스 파일을 저장하면 모드 분리와 헤더 변경 감지를 함께 확인할 수 있습니다.

```makefile title="config.mk"
# === config.mk ===
CC := gcc
CXX := g++
CFLAGS := -Wall -Wextra -std=c11
CXXFLAGS := -Wall -Wextra -std=c++17

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

```makefile title="Makefile"
# === Makefile ===
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

소스는 `src` 디렉터리에 둡니다.

```c title="src/header.h"
#define VALUE 7
```

실행 파일은 헤더의 값을 출력합니다.

```c title="src/main.c"
#include "header.h"
#include <stdio.h>
int main(void) { printf("value=%d\n", VALUE); }
```

```text
$ make
mkdir -p build/release
gcc  -Wall -Wextra -std=c11 -O2 -DNDEBUG -MMD -MP -c src/main.c -o build/release/main.o
gcc  -o build/release/myapp build/release/main.o 
$ ./build/release/myapp
value=7
$ make DEBUG=1
mkdir -p build/debug
gcc  -Wall -Wextra -std=c11 -g -O0 -DDEBUG -MMD -MP -c src/main.c -o build/debug/main.o
gcc  -o build/debug/myapp build/debug/main.o 
$ make
make: Nothing to be done for 'all'.
$ printf '#define VALUE 8\n' > src/header.h
$ make
gcc  -Wall -Wextra -std=c11 -O2 -DNDEBUG -MMD -MP -c src/main.c -o build/release/main.o
gcc  -o build/release/myapp build/release/main.o 
$ ./build/release/myapp
value=8
$ make clean
rm -f -r build
```

`make DEBUG=1` 뒤에 다시 `make`를 부르자 릴리스 쪽은 아무것도 다시 만들지 않았습니다. 디버그 빌드가 릴리스 오브젝트를 건드리지 않았다는 뜻입니다. 헤더 값을 8로 바꾸자 릴리스 오브젝트가 다시 컴파일됐습니다. `-MMD`가 `-o build/release/main.o`를 보고 `build/release/main.d`를 만들었기 때문에 `DEPS`의 경로와 맞아떨어졌습니다.

이 Makefile이 만족하는 것들입니다.

- *모드 분기*: 디버그·릴리스가 *별도 디렉터리*에 빌드되어 서로의 오브젝트를 덮어쓰지 않습니다.
- *자동 의존성*: 헤더 수정을 감지합니다.
- *order-only 디렉터리*: Ch 2에서 본 디렉터리 mtime 때문의 반복 재빌드가 없습니다.
- *include 분리*: `config.mk`만 바꿔 끼우면 빌드 설정이 바뀝니다.

---

## 흔한 실수

### 1. `ifeq` 비교 안의 공백

```makefile
ifeq ($(DEBUG), 1)    # DEBUG=1이면 일치
ifeq ($(DEBUG) ,1)    # DEBUG=1이면 일치
ifeq ( $(DEBUG),1)    # DEBUG=1이어도 불일치
```

`make DEBUG=1`로 세 줄을 각각 시험한 결과입니다. 4.4.1에서는 쉼표 앞뒤 공백은 무시됐지만, 여는 괄호 바로 뒤의 공백은 첫 인자의 일부로 남아 비교가 실패했습니다. Ch 5에서 본 함수 인자의 공백 규칙(쉼표 뒤 공백도 인자)과 다르므로, 두 문법 모두에서 공백을 넣지 않는 습관이 안전합니다. 변수 값 *자체*에 공백이 들어갈 수 있으면 7.2절의 안내대로 `$(strip ...)`로 감쌉니다.

**해결**: `ifeq ($(DEBUG),1)`.

### 2. `ifdef`로 빈 값 검사

```makefile
EXTRA_LIBS = $(NOTHING)

ifdef EXTRA_LIBS
LDLIBS += $(EXTRA_LIBS)   # 확장하면 빈 값인데도 실행됨
endif
```

위 "`ifdef`" 절의 표처럼, 다른 변수를 참조하는 재귀 변수는 확장 결과가 비어 있어도 `ifdef`에서 참입니다.

**해결**: `ifneq ($(EXTRA_LIBS),)`.

### 3. 레시피 안에 조건 지시자

```makefile
test:
ifeq ($(DEBUG),1)
	echo "debug"
endif
```

조건은 Makefile을 읽을 때 풀려 *레시피 줄 자체가 넣어지거나 빠집니다*. 실행 시점 분기가 아니라서, 위 "시점 차이" 절처럼 타겟별 변수와 함께 쓰면 엇갈린 결과가 나옵니다.

**해결**: 변수에 분기 결과를 미리 담거나 셸 조건문을 씁니다.

### 4. `-include` 순서

```makefile
-include $(DEPS)      # DEPS가 아직 정의 안 됨 → 빈 목록

SRCS := main.c
DEPS := $(SRCS:.c=.d)
```

`include` 줄은 *그 자리에서 즉시* 확장됩니다. `main.o: extra.h`를 담은 `main.d`를 두고 두 순서로 `make -p`를 비교했습니다. 위 순서에서는 `main.o: main.c`만 있었고 `MAKEFILE_LIST`에도 `main.d`가 없었습니다. 변수 정의 뒤로 옮기자 `main.o: main.c extra.h`가 됐습니다.

**해결**: 변수 정의를 먼저, `include`를 뒤에 둡니다.

### 5. `-MMD`만 쓰고 `-MP` 안 씀

```makefile
CFLAGS += -MMD
```

위 "`-MP`의 정확한 효과" 절에서 본 것처럼, 헤더를 지우고 소스의 `#include`도 없앴는데 `No rule to make target 'src/header.h'`로 멈춥니다.

**해결**: `-MMD -MP`를 함께 씁니다.

---

## 정리

- **조건 지시자** `ifeq` / `ifneq` / `ifdef` / `ifndef`는 모두 *Makefile을 읽을 때* 평가됩니다.
- `ifdef`는 값을 확장하지 않고 "값이 있는가"만 봅니다. 빈 값 검사는 `ifeq`, 정의 여부는 `$(origin)`으로 합니다.
- `$(CC)` 문자열 비교는 내장 기본값 `cc`와 macOS의 `gcc`=clang 때문에 빗나갑니다. 컴파일러 종류는 `--version` 출력으로 검사합니다.
- 레시피 안의 조건은 *셸 조건문*이나 *분기 결과 변수*로 풉니다. 타겟별 변수와 조건 지시자는 시점이 다릅니다.
- **`include`**는 파일을 그 자리에 읽고, **`-include`**는 없어도 넘어갑니다.
- 자동 의존성 패턴은 `-MMD -MP` + `-include $(DEPS)`이고, `-MP`가 헤더 삭제 뒤의 `No rule to make target`을 막습니다.
- 재귀 Make는 하위 `make`가 서로의 규칙을 보지 못해 디렉터리 순서를 손으로 적어야 했습니다. Miller의 논문은 한 Make 세션으로 전체를 빌드하라고 권합니다.

## 다음 장 예고

[Ch 7: 실전 Makefile](/blog/tools/build/gnu-make/chapter07-practical)에서는 지금까지 본 도구들을 합쳐 *실제 프로젝트에 넣을 수 있는 Makefile*을 만듭니다. 정적·동적 라이브러리, install, 크로스 컴파일, 테스트 통합, 그리고 help·verbose 같은 운영용 타겟까지 다룹니다.

## 참고 자료

- [GNU Make Manual — Conditionals](https://www.gnu.org/software/make/manual/html_node/Conditionals.html) — 7장.
- [GNU Make Manual — Include](https://www.gnu.org/software/make/manual/html_node/Include.html) — 3.3절.
- [GNU Make Manual — Target-specific Variable Values](https://www.gnu.org/software/make/manual/html_node/Target_002dspecific.html) — 6.11절.
- [Auto-Dependency Generation](https://make.mad-scientist.net/papers/advanced-auto-dependency-generation/) — Paul D. Smith의 글. 4.4.1 소스의 `AUTHORS`는 그를 3.76부터의 GNU Make 개발자로 적고 있습니다.
- [Recursive Make Considered Harmful](https://aegis.sourceforge.net/auug97.pdf) — Peter Miller, AUUGN 19(1), 1998, pp. 14–25.

## 관련 항목

- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 이 장의 `ifeq`와 대비되는 `$(if ...)` 함수, 그리고 `$(MAKEFILE_LIST)` 관용구.
- [Ch 7: 실전 Makefile](/blog/tools/build/gnu-make/chapter07-practical) — 모드 분기와 `-MMD -MP` 패턴을 실제 프로젝트 골격에 넣은 모습.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 타겟별 변수가 뒤집는 전역 변수의 우선순위 규칙.
- [CMake Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — `DEBUG=1` 같은 모드 분기를 CMake는 캐시 변수로 다룹니다.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 조건 지시자와 `include`의 원문.
