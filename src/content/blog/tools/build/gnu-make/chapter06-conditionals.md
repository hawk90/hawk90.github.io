---
title: "Ch 6: 조건문과 include"
date: 2026-05-17T06:00:00
description: "파싱 시점 조건 분기, Makefile 분할, 그리고 -MMD -MP로 헤더 의존성을 자동 추적하는 표준 패턴."
tags: [make, build, Makefile, conditional]
series: "GNU Make"
seriesOrder: 6
draft: false
---

## 왜 조건문이 필요한가

같은 소스 코드를 *다른 모드로* 빌드해야 할 때가 있습니다.

- *디버그 vs 릴리스*: 개발 중 `-g -O0`, 배포 시 `-O2`.
- *플랫폼*: Linux는 `-lpthread -lrt`, macOS는 `-lpthread`만.
- *컴파일러*: GCC와 Clang의 경고 옵션이 다름.

조건문이 없으면 Makefile을 둘로 쪼개거나, 사용자가 매번 `CFLAGS`를 손으로 적어야 합니다. *조건 지시자*는 한 Makefile에서 모드를 분기하는 표준 방법입니다.

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

이 장은 조건 지시자, 그리고 *조건과 거의 항상 짝지어 등장하는 `include` 지시자*를 다룹니다. 그리고 마지막에 둘을 합쳐 *헤더 의존성 자동 추적*이라는 실무 표준 패턴을 완성합니다.

---

## 조건 지시자 — 파싱 시점의 분기

Make의 조건 지시자는 C 전처리기의 `#if`와 *같은 자리*에 있습니다. 모두 *Makefile이 파싱되는 시점*에 평가되고, 평가 결과에 따라 *그 블록이 Makefile에 포함되거나 빠집니다*. 평가는 한 번만 일어나고, 빌드 도중 다시 평가되지 않습니다.

이게 함수 `$(if ...)`(Ch 5)와의 가장 큰 차이입니다. `$(if)`는 변수가 풀릴 때마다 평가되어 *런타임 조건처럼* 동작하는 반면, `ifeq`는 *컴파일 타임 조건처럼* 동작합니다.

### `ifeq` / `ifneq` — 문자열 비교

```makefile
ifeq (a,b)
# a와 b가 같으면 이 블록이 Makefile에 포함됨
endif

ifneq (a,b)
# 다르면 포함
endif
```

따옴표 형식도 됩니다 — `ifeq "a" "b"`. 거의 안 쓰지만 알아 두면 좋습니다.

흔한 사용 예 셋을 들겠습니다.

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

`BUILDDIR`이 모드별로 갈라지므로 디버그·릴리스 산물이 *섞이지 않는* 점이 핵심입니다. `make DEBUG=1`과 `make`를 번갈아 호출해도 서로의 캐시를 망가뜨리지 않습니다.

**2. 플랫폼 분기**

```makefile
UNAME := $(shell uname -s)

ifeq ($(UNAME),Linux)
LDLIBS := -lpthread -lrt
endif

ifeq ($(UNAME),Darwin)
LDLIBS := -lpthread
endif

ifeq ($(OS),Windows_NT)
EXE := .exe
RM := del /Q
endif
```

`uname -s`이 *Linux* / *Darwin* / *FreeBSD* 같은 시스템 이름을 돌려줍니다. 윈도우는 `uname`이 없는 환경(cmd.exe)을 가정해 `OS` 환경 변수로 분기합니다.

**3. 컴파일러 분기**

```makefile
ifeq ($(CC),gcc)
CFLAGS += -Wextra -Wno-unused-parameter
else ifeq ($(CC),clang)
CFLAGS += -Weverything -Wno-padded -Wno-c++98-compat
endif
```

GCC와 Clang은 *대부분*의 경고를 공유하지만, 일부는 한쪽에만 있습니다(`-Weverything`은 Clang 전용). 위처럼 분기해 두면 두 컴파일러 모두에서 깔끔하게 빌드됩니다.

### `ifdef` / `ifndef` — 정의 여부

```makefile
ifdef VAR
# VAR이 정의되어 있으면 (빈 문자열도 정의된 것)
endif

ifndef VAR
# 정의되지 않았으면
endif
```

여기서 헷갈리기 쉬운 함정 하나. `ifdef`는 *값이 비어 있어도 정의된 것으로 간주*합니다.

```makefile
VAR :=          # 빈 문자열로 정의

ifdef VAR
$(info VAR is defined)        # ← 출력됨
endif

ifeq ($(VAR),)
$(info VAR is empty)          # ← 이것도 출력됨
endif
```

즉 `ifdef`는 *"누가 이 변수에 손이라도 댔는가"*를 묻는 거고, `ifeq ($(VAR),)`은 *"값이 비어 있는가"*를 묻는 겁니다.

대부분의 실무 상황에서는 *값의 유무*가 의도이므로 `ifeq` 쪽을 씁니다.

```makefile
ifneq ($(EXTRA_LIBS),)
LDLIBS += $(EXTRA_LIBS)
endif
```

`ifdef`는 *"이 변수를 외부에서 명시적으로 줬는가"*를 알고 싶을 때만 쓰는 게 안전합니다.

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

`else if`는 *문법적으로 `else` + 새 `ifeq`*입니다. 한 줄로 적든 두 줄로 적든 동일합니다. 들여쓰기는 가독성을 위한 것일 뿐 의미는 없습니다.

---

## 조건 지시자와 레시피의 시점 차이

이 절은 함정이 모이는 자리입니다. 조건 지시자는 *Makefile 파싱*에서 일어나고, 레시피의 셸 명령은 *Make 실행*에서 일어납니다. 둘은 *다른 시점*입니다.

```makefile
# 의도와 다르게 동작할 수 있는 코드
test:
ifeq ($(DEBUG),1)
	echo "Debug mode"
endif
```

이 코드는 *파싱 시점에 `DEBUG`를 평가*하고, *그 결과에 따라 `echo` 줄이 Makefile에 포함되거나 빠지는* 동작을 합니다. 만약 `DEBUG`가 외부에서 매번 다르게 주어진다면 보일 듯 보이지 않는 버그가 됩니다.

레시피 내부에서 *실행 시점*에 분기하고 싶다면 *셸 조건문*을 씁니다.

```makefile
test:
	@if [ "$(DEBUG)" = "1" ]; then \
		echo "Debug mode"; \
	else \
		echo "Release mode"; \
	fi
```

또는 깔끔하게 *변수에 미리 분기 결과를 담아 둡니다*.

```makefile
ifeq ($(DEBUG),1)
BUILD_MSG := Debug mode
else
BUILD_MSG := Release mode
endif

test:
	@echo "$(BUILD_MSG)"
```

두 번째 방식이 거의 항상 더 깔끔합니다. 셸 조건문은 *셸이 다르면 동작이 달라지는* 위험도 있어 가능하면 피합니다.

---

## `include` — Makefile 합치기

```makefile
include filename...
```

다른 Makefile을 *그 자리에 인라인으로* 가져옵니다. 텍스트 치환에 가까워, 변수도 규칙도 모두 합쳐집니다.

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

설정과 규칙을 분리해 *프로젝트마다 다른 config.mk를 갈아 끼우는* 패턴이 자주 보입니다. 크로스 컴파일 시 `config.arm.mk`, `config.x86.mk`로 갈라 두는 식입니다.

### 여러 파일 / 와일드카드

```makefile
include config.mk rules.mk
include $(wildcard modules/*.mk)
```

`$(wildcard)`로 동적 패턴도 가능합니다.

### `-include` — 파일이 없어도 OK

```makefile
-include deps/*.d
```

`include`는 *대상 파일이 없으면 에러*를 냅니다. 빌드를 처음 돌릴 때 `.d`(자동 생성 의존성) 파일이 아직 없는 상황에서는 곤란합니다. `-include`는 *없으면 조용히 건너뜁니다*. `sinclude`는 같은 동작의 POSIX 호환 별명입니다.

이 한 글자 `-`가 *자동 의존성 추적 패턴*의 핵심입니다(아래에서 본격).

---

## 자동 의존성 생성 — 실무 표준 패턴

### 문제 — 헤더 의존성을 손으로 못 적는다

```makefile
main.o: main.c
	gcc -c main.c
```

만약 `main.c`가 `#include "header.h"`로 헤더를 포함한다고 합시다. 위 Makefile에는 *`header.h`가 의존성에 없으므로*, `header.h`를 수정해도 `main.o`는 그대로 옛 것을 씁니다. 결과는 *조용한 빌드 사고*입니다. 옛 헤더 정보를 가진 오브젝트가 새 헤더 호출자와 링크되어 런타임에 어긋납니다.

수동으로 적자면:

```makefile
main.o: main.c header.h utils.h common.h ...
```

소스 100개 × 헤더 평균 10개 = 1000개의 의존성 줄. *유지가 불가능*합니다.

### 해결 — 컴파일러가 의존성을 뽑아 주기

GCC와 Clang은 `-MM` 류의 옵션으로 *그 파일이 포함하는 헤더 목록*을 Makefile 문법으로 출력합니다.

```bash
$ gcc -MM main.c
main.o: main.c header.h utils.h
```

이 출력을 파일로 저장해 두면, 다음 빌드에서 Make가 `include`로 흡수해 *정확한 헤더 의존성*을 알게 됩니다.

| 옵션 | 의미 |
|------|------|
| `-M` | 시스템 헤더 포함한 의존성 출력 |
| `-MM` | 시스템 헤더 제외 (보통 이쪽) |
| `-MT target` | 출력의 타겟 이름 변경 |
| `-MF file` | 출력을 파일로 |
| `-MD` | *컴파일하면서* `.d` 파일도 같이 생성 |
| `-MMD` | `-MD` + 시스템 헤더 제외 (실무 표준) |
| `-MP` | 헤더에 빈 phony 타겟 추가 (헤더 삭제 보호) |

### 표준 패턴 — `-MMD -MP` + `-include`

```makefile
CFLAGS += -MMD -MP

SRCS := $(wildcard src/*.c)
OBJS := $(SRCS:.c=.o)
DEPS := $(OBJS:.o=.d)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

-include $(DEPS)
```

세 가지가 동시에 동작합니다.

1. **`-MMD`**: `*.c` 컴파일이 끝나면 같은 자리에 `*.d`도 떨어집니다. 그 안에는 `main.o: main.c header.h ...` 같은 의존성 줄이 들어 있습니다.
2. **`-MP`**: `*.d`에 *각 헤더에 대한 빈 규칙*을 추가합니다. 누군가 `header.h`를 삭제해도 Make가 "타겟 없음" 에러를 내지 않고 그냥 재빌드합니다.
3. **`-include $(DEPS)`**: 모든 `.d`를 Makefile에 합칩니다. *없으면 무시*(`-` 덕분에) 합니다.

첫 빌드:
- `.d` 파일이 없음 → `-include`가 조용히 무시 → `*.o`만 만듦 → 그 과정에서 `.d`가 함께 생성

두 번째 빌드 이후:
- `.d`에 정확한 의존성이 들어 있어 헤더 수정도 정상 감지

이 한 패턴이 *대부분의 C/C++ Makefile 프로젝트*가 따르는 표준입니다. 이걸 모르고 손으로 의존성을 적던 시절은 1990년대 후반에 끝났습니다.

### `-MP`의 정확한 효과

`-MP` 없이 생성된 `.d`:
```makefile
main.o: main.c header.h
```

`-MP` 포함:
```makefile
main.o: main.c header.h
header.h:           ← 빈 규칙
```

이 빈 규칙은 *`header.h`가 없는 상태에서 Make가 폭발하지 않게* 만듭니다. 헤더를 일부러 지운 경우(예: refactoring 후 헤더 통합)에 Make는 `header.h:`을 만나 "이거 만드는 법 있음 — 빈 규칙"으로 받아들이고, 그 의존성을 가진 `.o`는 *다시 컴파일이 필요하다*고 판단합니다. 컴파일러는 새 `main.c`를 다시 읽어 새 의존성 트리를 만들고 `.d`를 갱신합니다. 한 사이클이면 정상화됩니다.

`-MP` 없이는 같은 상황에서 `Makefile:N: header.h: No such file or directory. Stop.`이 납니다.

---

## Makefile 분할 패턴

### 설정과 규칙 분리

```text
project/
├── Makefile
├── config.mk          # 변수 설정
├── rules.mk           # 공통 규칙
└── src/
    ├── module1/
    │   └── module.mk  # 모듈별 변수·소스 목록
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

각 `module.mk`는 *그 모듈의 소스 목록*만 추가합니다.

```makefile
# src/module1/module.mk
module1_SRCS := $(wildcard $(dir $(lastword $(MAKEFILE_LIST)))*.c)
SRCS += $(module1_SRCS)
```

`$(MAKEFILE_LIST)`는 *현재까지 포함된 Makefile 목록*을 담은 특수 변수입니다. `$(lastword ...)`로 *방금 include된 파일 경로*를 얻고, `$(dir ...)`로 그 디렉터리를 추출합니다. 이 트릭은 "각 module.mk가 자기 디렉터리를 자동으로 알도록" 만드는 표준 관용구입니다.

### 재귀적 Make vs 비재귀적 Make

**재귀적 Make** — 각 디렉터리에서 별도 `make` 호출:

```makefile
SUBDIRS := lib app

.PHONY: all $(SUBDIRS)

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@
```

단순해 보이지만 *치명적 단점*들이 있습니다.

- 병렬 빌드 효율이 *극단적으로 떨어집니다*. 각 서브 Make는 자기 디렉터리만 봐서 *전역 의존성*을 못 잡아내고, 결과적으로 잡 슬롯을 잘 못 활용합니다.
- 디렉터리 *경계를 가로지르는 의존성*이 깨집니다. lib의 헤더 변경이 app에 반영되지 않을 수 있습니다.
- 같은 파일이 *여러 번 컴파일*될 수 있습니다.

이 문제들은 1997년 Peter Miller의 "Recursive Make Considered Harmful" 논문에서 정리됐고, 그 이후 *비재귀적 Make*가 표준으로 자리잡았습니다.

**비재귀적 Make** — 모든 모듈을 한 Make에:

```makefile
include lib/module.mk
include app/module.mk

all: $(ALL_TARGETS)
```

한 Make 프로세스가 *전체 그래프*를 가지므로 병렬 빌드가 정확하고, 의존성도 빠지지 않습니다. 단점은 *초기 셋업이 좀 더 복잡*하다는 것뿐입니다.

큰 오픈소스 프로젝트의 Makefile(Linux 커널의 Kbuild, U-Boot)이 모두 비재귀적입니다. 새 프로젝트라면 이쪽을 권합니다.

---

## 타겟별 변수 — *타겟마다 다른 값*

지금까지 본 변수는 *Makefile 전역*입니다. `CFLAGS`가 한 번 정해지면 모든 컴파일에 같이 들어갑니다. 하지만 *특정 타겟에서만 다른 값*을 쓰고 싶을 때가 있습니다.

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

이 변수는 *그 타겟과 모든 의존 타겟의 레시피*에서만 새 값을 갖습니다. 다른 자리는 전역 값을 그대로 봅니다.

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

`critical.o` 빌드 시점에 `CFLAGS`는 `-O2 -Wall -O3 -g3 -march=native`로 펼쳐집니다. 다른 `.o`는 원래 `-O2 -Wall`만 받습니다.

### 패턴별 변수 — `%` 와일드카드 사용

```makefile
# tests 디렉터리의 모든 .o 파일은 sanitize 켜기
tests/%.o: CFLAGS += -fsanitize=address -O0
```

특정 *모듈 그룹*에 동일 옵션을 일괄 적용할 때 편합니다.

### 의존 타겟까지 *전파*된다는 점이 중요

```makefile
myapp: CFLAGS += -DAPP_BUILD
myapp: main.o utils.o
	$(CC) -o $@ $^
```

`myapp` 빌드 시 *직접 의존성*인 `main.o`, `utils.o`까지 새 `CFLAGS` 값을 받습니다. 즉 `main.c`와 `utils.c`가 컴파일될 때 *`-DAPP_BUILD`*가 들어갑니다.

이 *전파 규칙* 때문에 타겟별 변수는 *위에서 아래로* 영향을 줍니다. 같은 `.o`가 다른 실행 파일의 의존성이라면 *그 실행 파일의 타겟별 변수*에 따라 다르게 컴파일됩니다. 매우 강력하지만 *디버깅이 어려워질 수 있어* 신중히 씁니다.

### 적용 시점 — *레시피 실행 시*

타겟별 변수는 *Makefile 파싱 시점*에 적용되지 않습니다. *레시피가 실행되기 직전*에 해당 타겟의 컨텍스트에서 평가됩니다. 그래서 `$(info $(CFLAGS))` 같은 *파싱 시점 디버깅*에서는 *전역 값만* 보입니다. 실행 시점 값을 보려면 레시피 안에 `@echo $(CFLAGS)`를 넣어야 합니다.

```makefile
critical.o: CFLAGS += -O3

$(info Global CFLAGS = $(CFLAGS))    # 전역 값만 보임

critical.o: %.o: %.c
	@echo "Building $@ with CFLAGS=$(CFLAGS)"   # 타겟별 값 보임
	gcc $(CFLAGS) -c $< -o $@
```

---

## 실전 예시 — 모드 분기 + 자동 의존성

```makefile
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

```makefile
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

```bash
make                 # 릴리스
make DEBUG=1         # 디버그 (별도 디렉터리)
make clean           # 모든 모드 정리
```

이 Makefile이 만족하는 것들:

- *모드 분기*: 디버그·릴리스가 *별도 디렉터리*에 빌드되어 서로 안 망친다.
- *자동 의존성*: 헤더 수정 자동 감지.
- *order-only 디렉터리*: 디렉터리 mtime 갱신으로 인한 무한 재빌드 방지.
- *include 분리*: config.mk만 갈아 끼우면 빌드 모드 변경.

---

## 흔한 실수

### 1. `ifeq` 비교 안에 공백

```makefile
ifeq ($(DEBUG), 1)   # " 1"과 비교 → 거의 항상 false
```

함수 호출과 마찬가지로 *쉼표 뒤 공백이 인자에 흡수*됩니다.

**해결**: `ifeq ($(DEBUG),1)`.

### 2. `ifdef`로 빈 값 검사

```makefile
EXTRA_LIBS :=

ifdef EXTRA_LIBS
LDLIBS += $(EXTRA_LIBS)   # 의도와 다르게 실행됨
endif
```

빈 문자열로 정의된 변수도 `ifdef`에는 *정의됨*으로 잡힙니다.

**해결**: `ifneq ($(EXTRA_LIBS),)`.

### 3. 레시피 안에 조건 지시자

```makefile
test:
ifeq ($(DEBUG),1)
	echo "debug"
endif
```

파싱 시점에 조건이 풀려서 *Makefile 자체가 변경*됩니다. 실행 시점 분기가 아닙니다.

**해결**: 변수에 분기 결과 미리 담거나 셸 조건문 사용.

### 4. `-include` 순서

```makefile
-include $(DEPS)      # DEPS가 아직 정의 안 됨 → 빈 목록

SRCS := main.c
DEPS := $(SRCS:.c=.d)
```

`include` 류는 *그 자리에서 즉시* 평가됩니다. 변수가 아직 정의되지 않으면 빈 목록만 흡수됩니다.

**해결**: 변수 정의를 먼저, `include`를 뒤로.

### 5. `-MMD`만 쓰고 `-MP` 안 씀

```makefile
CFLAGS += -MMD
```

헤더 파일을 삭제하는 순간 다음 빌드가 멈춥니다.

**해결**: 항상 `-MMD -MP` 짝지어 사용.

---

## 정리

- **조건 지시자**: `ifeq` / `ifneq` / `ifdef` / `ifndef` — 모두 *파싱 시점*.
- `ifdef`는 *정의 여부*만, 값이 빈 검사는 `ifeq ($(VAR),)`.
- 레시피 안 조건은 *셸 조건문*이나 *분기 결과 변수*로 풀자.
- **`include`**: Makefile 인라인. **`-include`**: 없어도 무시.
- 표준 자동 의존성 패턴: `CFLAGS += -MMD -MP` + `-include $(DEPS)`.
- `-MP`가 *헤더 삭제 보호*를 제공한다. 빼면 안 된다.
- 큰 프로젝트는 *비재귀적 Make*. "Recursive Make Considered Harmful" 참고.

## 다음 장 예고

[Ch 7: 실전 Makefile](/blog/tools/build/gnu-make/chapter07-practical)에서는 지금까지 본 도구들을 합쳐 *진짜 프로젝트에 들어갈 만한 Makefile*을 만듭니다. 다중 타겟, 정적 라이브러리·동적 라이브러리, install/uninstall, 크로스 컴파일, 그리고 흔히 쓰는 helper 타겟(format / lint / test)까지.

## 참고 자료

- [GNU Make Manual — Conditionals](https://www.gnu.org/software/make/manual/html_node/Conditionals.html)
- [GNU Make Manual — Include](https://www.gnu.org/software/make/manual/html_node/Include.html)
- [Auto-Dependency Generation](http://make.mad-scientist.net/papers/advanced-auto-dependency-generation/) — Paul D. Smith의 고전 글
- [Recursive Make Considered Harmful](http://aegis.sourceforge.net/auug97.pdf) — Peter Miller, 1997
