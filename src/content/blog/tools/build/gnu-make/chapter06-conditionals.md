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

### `ifdef` / `ifndef` — 저장된 값의 유무

```makefile
ifdef VAR
# VAR의 저장된 값이 비어 있지 않으면
endif

ifndef VAR
# 저장된 값이 비어 있거나 미정의이면
endif
```

ifdef는 변수가 존재하는지만 검사하지 않습니다. 빈 값으로 정의한 변수도 거짓입니다. 또 변수 값 내부를 재귀 확장해 최종 결과를 검사하는 것은 아닙니다.

```makefile
VAR :=          # 빈 문자열로 정의

ifdef VAR
$(info VAR has a nonempty value)  # 출력되지 않음
endif

ifeq ($(VAR),)
$(info VAR is empty)              # 출력됨
endif
```

정의 여부 자체는 $(origin VAR)가 undefined인지로 구분합니다. ifeq는 인자를 확장해서 비교하므로, 다른 빈 변수를 참조하는 재귀 변수도 최종 빈 값으로 비교합니다. [조건 지시자 문법](https://www.gnu.org/software/make/manual/html_node/Conditional-Syntax.html)의 ifdef 예제와 구분합니다.

대부분의 실무 상황에서는 *값의 유무*가 의도이므로 `ifeq` 쪽을 씁니다.

```makefile
ifneq ($(EXTRA_LIBS),)
LDLIBS += $(EXTRA_LIBS)
endif
```

외부의 명령줄 입력 여부가 필요하면 $(origin VAR)가 command line인지 확인합니다. ifdef만으로 변수의 출처를 알 수는 없습니다.

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

else ifeq처럼 한 줄에 이어 쓴 조건 체인은 마지막 endif 하나로 닫습니다. else와 새 ifeq를 별도 줄에 적어 중첩하면 안쪽 조건을 닫는 endif도 필요하므로 줄바꿈만 자유롭게 바꿔도 같은 문법이라는 뜻은 아닙니다.

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

`include`는 *대상 파일이 없으면 에러*를 냅니다. 빌드를 처음 돌릴 때 `.d`(자동 생성 의존성) 파일이 아직 없는 상황에서는 곤란합니다. `-include`는 *없으면 조용히 건너뜁니다*. sinclude는 -include와 같은 동작을 하는 호환용 별명이지만 POSIX 표준 구문이라고 일반화하지 않습니다.

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

이 패턴은 컴파일러가 제공한 의존성을 Make에 반영하는 방법입니다. .d를 만들었다는 사실만으로 충분하지 않고 실제로 include되는지도 확인합니다.

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

-MP 없이 옛 .d가 삭제된 헤더를 계속 요구하면 Make 단계에서 No rule to make target 오류가 납니다. -MP가 있어도 소스가 삭제된 헤더를 계속 include하면 컴파일러 단계에서 실패합니다. 소스의 include 제거와 의존성 재생성을 함께 확인합니다.

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

디렉터리별 호출로 나누면 다음 문제를 검토해야 합니다.

- 디렉터리 경계의 의존성을 상위 Make에서 충분히 표현하지 않으면 준비되지 않은 라이브러리를 먼저 링크하거나 빌드를 불필요하게 직렬화할 수 있습니다.
- 디렉터리 *경계를 가로지르는 의존성*이 깨집니다. lib의 헤더 변경이 app에 반영되지 않을 수 있습니다.
- 같은 파일이 *여러 번 컴파일*될 수 있습니다.

이런 그래프 분할 문제는 Peter Miller의 Recursive Make Considered Harmful에서 다룹니다. 모든 재귀 Make가 잘못됐거나 비재귀 방식이 유일한 표준이라는 결론으로 일반화하지 않습니다.

**비재귀적 Make** — 모든 모듈을 한 Make에:

```makefile
include lib/module.mk
include app/module.mk

all: $(ALL_TARGETS)
```

한 Make 프로세스가 *전체 그래프*를 가지므로 병렬 빌드가 정확하고, 의존성도 빠지지 않습니다. 단점은 *초기 셋업이 좀 더 복잡*하다는 것뿐입니다.

재귀 호출 여부와 올바른 의존성 추적은 별개의 설계 문제입니다. include로 합쳤다고 파일 의존성이 자동 완성되지 않으며 재귀 Make도 명시적 그래프와 jobserver를 활용합니다. 개별 프로젝트의 소스를 확인하지 않고 모두 비재귀적이라고 분류하지 않습니다.

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

이 *전파 규칙* 때문에 타겟별 변수는 *위에서 아래로* 영향을 줍니다. 같은 오브젝트를 두 상위 타겟이 공유하면 먼저 빌드하는 타겟의 값으로 한 번 만들어집니다. 타겟마다 다른 옵션의 오브젝트가 필요하면 파일 경로도 분리해야 합니다. 타겟별 변수를 지정하는 것만으로 두 벌이 생성되지는 않습니다.

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

## 직접 확인 — 빈 값과 조건식 공백

다음 조건 비교는 GNU Make 4.4.1에서 확인했습니다. conditions.mk로 저장하고 `make -f conditions.mk DEBUG=1`로 실행합니다.

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

출력에는 stored-reference=true, expanded-reference=empty, debug-match=true가 있습니다. EMPTY 자체는 ifdef에서 거짓이지만 REFERENCE에는 확장 전의 참조 문자열이 저장되어 있어 ifdef에서 참입니다.

## 실전 예시 — 모드 분기 + 자동 의존성

이 절의 두 Makefile과 다음 두 소스 파일을 저장하면 실제 헤더 변경을 확인할 수 있습니다. 실행 환경은 GNU Make 4.4.1·macOS·AppleClang 21의 gcc 드라이버입니다.

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

```bash
make                 # 릴리스
make DEBUG=1         # 디버그 (별도 디렉터리)
make clean           # 모든 모드 정리
```

소스는 같은 src 디렉터리에 둡니다.

```c title="src/header.h"
#define VALUE 7
```

실행 파일은 헤더의 값을 출력합니다.

```c title="src/main.c"
#include "header.h"
#include <stdio.h>
int main(void) { printf("value=%d\n", VALUE); }
```

첫 `make` 뒤 build/release/myapp은 value=7을 출력합니다. header.h의 값을 8로 바꾸고 make를 실행하면 오브젝트를 다시 컴파일해 value=8을 출력합니다. 헤더를 삭제할 때는 main.c의 include도 제거하거나 대체해야 합니다. -MP는 소스의 누락된 include를 해결하지 않습니다.

이 Makefile이 만족하는 것들:

- *모드 분기*: 디버그·릴리스가 *별도 디렉터리*에 빌드되어 서로 안 망친다.
- *자동 의존성*: 헤더 수정 자동 감지.
- *order-only 디렉터리*: 디렉터리 mtime 갱신으로 인한 무한 재빌드 방지.
- *include 분리*: config.mk만 갈아 끼우면 빌드 모드 변경.

---

## 흔한 실수

### 1. `ifeq` 비교 안에 공백

```makefile
ifeq ($(DEBUG), 1)   # DEBUG=1이면 참: 쉼표 다음의 구문 공백은 무시
```

ifeq 지시자의 구문 공백과 함수 인자의 공백을 혼동하면 안 됩니다. 반면 변수 값 자체에 저장된 공백은 비교에 영향을 주므로 필요한 경우 $(strip $(DEBUG))로 정규화합니다.

**해결**: `ifeq ($(DEBUG),1)`.

### 2. `ifdef`로 빈 값 검사

```makefile
EXTRA_LIBS :=

ifdef EXTRA_LIBS
LDLIBS += $(EXTRA_LIBS)   # 의도와 다르게 실행됨
endif
```

위 EXTRA_LIBS는 빈 값이므로 블록에 들어가지 않습니다. 다른 변수를 참조하는 재귀 변수의 최종 확장 결과를 검사하려면 ifneq ($(strip $(EXTRA_LIBS)),)처럼 명시합니다.

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
- ifdef는 저장된 값의 유무를 검사하며 빈 값은 거짓입니다. 재귀 확장 후의 값은 ifeq로 비교합니다.
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

## 관련 항목

- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 이 장의 `ifeq`와 대비되는 `$(if ...)` 함수, 그리고 `$(MAKEFILE_LIST)` 관용구.
- [Ch 7: 실전 Makefile](/blog/tools/build/gnu-make/chapter07-practical) — 모드 분기와 `-MMD -MP` 패턴을 실제 프로젝트 골격에 넣은 모습.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 타겟별 변수가 뒤집는 전역 변수의 우선순위 규칙.
- [CMake Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — `DEBUG=1` 같은 모드 분기를 CMake는 캐시 변수로 다룹니다.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 조건 지시자와 `include`의 원문.
