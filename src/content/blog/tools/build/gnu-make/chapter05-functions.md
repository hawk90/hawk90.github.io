---
title: "Make 함수 분석 — wildcard·patsubst·foreach·shell"
slug: "tools/build/gnu-make/chapter05-functions"
date: 2026-06-03T09:05:00
description: "내장 함수로 텍스트·파일·조건을 다루기 — wildcard / patsubst / filter / shell / foreach / call / eval."
tags: [make, build, functions]
series: "GNU Make"
seriesOrder: 5
draft: false
topics: ["tools", "tools/build"]
---

## 왜 함수가 필요한가

[Ch 4](/blog/tools/build/gnu-make/chapter04-pattern-rules)까지 우리는 *파일 이름을 직접 나열*했습니다.

```makefile
SRCS := main.c hello.c utils.c config.c network.c
OBJS := main.o hello.o utils.o config.o network.o
```

새 파일이 생길 때마다 두 줄을 동시에 고쳐야 하고, 한 줄을 놓치면 그 파일이 링크에서 빠집니다. 같은 정보를 두 번 적는 구조가 문제입니다.

해결은 *디스크에 있는 파일을 직접 묻는 것*과 *파일 이름을 자동 변환하는 것*입니다. 둘 다 함수의 일입니다.

```makefile
SRCS := $(wildcard src/*.c)
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
```

`wildcard`는 *파일 시스템에 실재하는 파일*을 찾고, `patsubst`는 *문자열 변환 규칙*을 적용합니다. 이제 `src/`에 `.c` 파일을 새로 추가하면 Makefile을 *수정하지 않아도* 그 파일이 빌드 대상에 들어갑니다.

이 장은 Make 내장 함수의 카탈로그입니다. 모든 예제의 결과는 GNU Make 4.4.1에서 `$(info ...)`로 찍은 값이고, 대괄호는 값의 앞뒤 공백을 보이게 하려고 붙였습니다.

---

## 함수 호출 문법

```makefile
$(함수명 인자1,인자2,...)
${함수명 인자1,인자2,...}
```

괄호와 중괄호는 서로 바꿔 써도 됩니다. 함수명 *뒤에 공백*이 오고, 그 다음 첫 인자가 시작됩니다([매뉴얼 8.1절](https://www.gnu.org/software/make/manual/html_node/Syntax-of-Functions.html)).

### 공백이 인자에 포함된다

함수 인자를 구분하는 것은 쉼표뿐이고, 쉼표 뒤의 공백은 그대로 다음 인자의 일부가 됩니다.

```makefile
$(info [$(subst a, b, banana)])
$(info [$(subst a,b,banana)])
```

```text
[ b bn bn b]
[bbnbnb]
```

첫 줄은 "`a`를 ` b`(공백 + b)로 바꾸고, 대상 텍스트는 ` banana`(공백 + banana)"가 됐습니다. 그래서 `a`가 있던 세 자리에 공백이 끼었고 맨 앞에도 공백이 붙었습니다. 다른 언어처럼 쉼표 뒤에 공백을 넣으면 Make에서는 의미가 바뀝니다.

---

## 문자열 함수

[매뉴얼 8.2절](https://www.gnu.org/software/make/manual/html_node/Text-Functions.html)의 함수들입니다.

### `subst` — 단순 치환

```makefile
$(subst from,to,text)
```

`text`의 *모든* `from`을 `to`로 바꿉니다. 와일드카드 없이 글자 그대로 비교합니다.

```makefile
FILES := foo.c bar.c baz.c
OBJS := $(subst .c,.o,$(FILES))
# OBJS = foo.o bar.o baz.o
```

`subst`는 *단어 경계를 모릅니다*. `$(subst .c,.o,foo.cmd)`는 `foo.omd`가 됩니다. 단어 경계가 중요하면 `patsubst`를 씁니다.

### `patsubst` — 패턴 치환

```makefile
$(patsubst pattern,replacement,text)
```

`%` 와일드카드를 쓰고 *단어 단위로* 매칭한다는 점이 `subst`와 다릅니다.

```makefile
SRCS := src/foo.c src/bar.c
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
# OBJS = build/foo.o build/bar.o
```

**단축 문법**: 변수 참조 안에 *직접* 적을 수 있습니다. [매뉴얼 6.3.1절](https://www.gnu.org/software/make/manual/html_node/Substitution-Refs.html)은 이 *치환 참조*를 `patsubst`와 같은 것으로 정의하고, 위 예에 적용하면 같은 `build/foo.o build/bar.o`가 나왔습니다.

```makefile
OBJS := $(SRCS:src/%.c=build/%.o)
```

두 함수의 차이를 같은 입력으로 비교했습니다.

| 함수 | 매칭 | 예 → 결과 |
|------|------|------|
| `subst` | 글자 그대로 *모든 발생* | `$(subst .c,.o,main.c.bak)` → `main.o.bak` |
| `patsubst` | `%` 패턴, *단어 전체* | `$(patsubst %.c,%.o,main.c.bak main.c)` → `main.c.bak main.o` |

### `strip` — 공백 정리

앞뒤 공백을 지우고, 단어 사이의 연속 공백을 한 칸으로 줄입니다.

```makefile
VAR :=    hello     world
CLEAN := $(strip $(VAR))
```

`$(VAR)`은 `[hello     world]`, `$(CLEAN)`은 `[hello world]`였습니다. 대입 연산자 뒤의 앞쪽 공백은 대입할 때 이미 사라지고, 단어 사이 공백은 `strip`이 줄였습니다.

`strip`이 실제로 필요한 곳은 *비어 있음 검사*입니다. 빈 변수 둘을 공백으로 이어 붙이면 값이 공백 한 칸이 됩니다.

```makefile
A :=
B :=
EXTRA_FLAGS := $(A) $(B)

ifeq ($(EXTRA_FLAGS),)          # 거짓: 값이 " "
endif
ifeq ($(strip $(EXTRA_FLAGS)),) # 참
$(info No extra flags set)
endif
```

`$(EXTRA_FLAGS)`는 `[ ]`였고, 첫 `ifeq`는 거짓, `strip`을 거친 두 번째 `ifeq`는 참이었습니다.

### `findstring` — 부분 문자열 검색

```makefile
$(findstring find,text)
```

찾으면 `find` 그대로, 못 찾으면 빈 문자열을 돌려줍니다. Make의 조건은 "비어 있음/아님"으로 판단하므로 결과를 그대로 조건에 씁니다.

```makefile
ifneq ($(findstring debug,$(CFLAGS)),)
# CFLAGS에 "debug"라는 부분 문자열이 어디든 들어 있음
endif
```

`findstring`은 단어 경계를 무시해서 `$(findstring debug,prodebug-mode)`도 `debug`를 반환합니다. 정확한 단어 매칭은 `filter`를 씁니다.

### `filter` / `filter-out` — 패턴으로 솎기

```makefile
$(filter pattern...,text)
$(filter-out pattern...,text)
```

여러 패턴을 한 호출에 줄 수 있고, *단어 단위로* 매칭합니다.

```makefile
FILES := main.c main.h utils.c utils.h config.mk
SRCS := $(filter %.c,$(FILES))           # main.c utils.c
CODE := $(filter %.c %.h,$(FILES))       # main.c main.h utils.c utils.h
```

`filter-out`은 정반대로 *매칭되는 것을 제거*합니다.

```makefile
SRCS := main.c test_main.c utils.c test_utils.c
PROD := $(filter-out test_%,$(SRCS))    # main.c utils.c
TEST := $(filter test_%,$(SRCS))        # test_main.c test_utils.c
```

### `sort` — 정렬 + 중복 제거

```makefile
$(sort list)
```

사전 순으로 정렬하면서 *중복도 제거*합니다.

```makefile
FILES := z.c a.c m.c a.c
SORTED := $(sort $(FILES))    # a.c m.c z.c
```

중복 제거 기능은 오브젝트 목록에서 디렉터리 목록을 뽑을 때 씁니다.

```makefile
OBJS := build/a/x.o build/a/y.o build/b/z.o
DIRS := $(sort $(dir $(OBJS)))
# DIRS = build/a/ build/b/
```

> ⚠️ 정적 라이브러리 링크 순서처럼 순서가 의미를 갖는 목록에는 `sort`를 쓰지 않습니다. 순서가 사전 순으로 바뀝니다.

### 단어 접근 — `word`, `words`, `wordlist`, `firstword`, `lastword`

목록을 *위치 기반*으로 조작합니다.

```makefile
LIST := one two three four five

$(word 3,$(LIST))         # three
$(words $(LIST))          # 5
$(wordlist 2,4,$(LIST))   # two three four
$(firstword $(LIST))      # one
$(lastword $(LIST))       # five
```

8.2절에 따르면 인덱스는 1부터 시작하고, 단어 수보다 큰 인덱스는 빈 값을 돌려줍니다. `$(word 9,$(LIST))`는 실제로 `[]`였습니다. `$(lastword)`는 3.81에서 추가됐습니다(NEWS).

---

## 파일 이름 함수

[매뉴얼 8.3절](https://www.gnu.org/software/make/manual/html_node/File-Name-Functions.html)의 함수들입니다.

### `dir`, `notdir` — 경로 쪼개기

```makefile
FILES := src/main.c include/header.h foo.c
$(dir $(FILES))      # src/ include/ ./
$(notdir $(FILES))   # main.c header.h foo.c
```

`dir`은 *마지막 슬래시까지 포함해서* 돌려주고, 슬래시가 없는 `foo.c`에는 `./`를 돌려줍니다. 그래서 `$(dir X)파일명`처럼 바로 이어 붙여도 경로가 됩니다.

### `basename`, `suffix` — 확장자 분리

```makefile
FILES := main.c utils.cpp config.h foo/bar.c
$(basename $(FILES))   # main utils config foo/bar
$(suffix $(FILES))     # .c .cpp .h .c
```

Make의 `basename`은 *유닉스 `basename` 명령과 의미가 다릅니다*. 셸의 `basename foo/bar.c`는 디렉터리를 떼어 `bar.c`를 돌려주지만, Make의 `basename`은 확장자를 떼어 `foo/bar`를 돌려줍니다. 셸 명령의 역할에 해당하는 Make 함수는 `notdir`입니다.

### `addprefix`, `addsuffix` — 접두/접미사 붙이기

```makefile
MODULES := main utils config

SRCS := $(addsuffix .c,$(MODULES))
# main.c utils.c config.c

OBJS := $(addprefix build/,$(addsuffix .o,$(MODULES)))
# build/main.o build/utils.o build/config.o
```

함수를 *중첩*해 변환을 조합할 수 있습니다. 중첩이 깊어지면 단계를 변수로 나눠 적습니다.

### `wildcard` — 파일 시스템 조회

```makefile
$(wildcard pattern)
```

다른 문자열 함수와 달리 `wildcard`는 *디스크에 있는 실제 파일*을 검색해 패턴에 맞는 파일 이름 목록을 돌려줍니다([매뉴얼 4.4.3절](https://www.gnu.org/software/make/manual/html_node/Wildcard-Function.html)). 4.3부터는 결과를 정렬해서 돌려줍니다(NEWS).

```makefile
SRCS := $(wildcard src/*.c)
HEADERS := $(wildcard include/*.h)
ALL := $(wildcard *.c *.cpp *.cxx)    # 여러 패턴도 가능
```

`**`는 임의 깊이의 재귀 검색이 아닙니다. `src/**/*.c`는 `*` 두 개가 붙은 것으로 읽혀 `src/` 바로 아래 *한 단계* 디렉터리의 `.c`만 찾습니다. 아래 "직접 확인" 절에서 세 단계짜리 트리로 확인합니다. 재귀 검색이 필요하면 `find`를 씁니다.

```makefile
# 임의 깊이 재귀 검색이 아님: src/X/*.c만
ALL := $(wildcard src/**/*.c)

# 재귀 검색: shell + find
ALL := $(shell find src -name '*.c')
```

`:=` 문맥이라 Makefile을 읽을 때 `find`가 한 번 실행됩니다. `find`의 출력은 정렬되지 않으므로 순서가 필요하면 `$(sort ...)`로 감쌉니다.

> 💡 `wildcard`도 *평가되는 순간* 디스크를 봅니다. `:=`로 정의하면 Makefile을 읽을 때 한 번, `=`로 정의하면 참조할 때마다 다시 조회합니다(Ch 3의 `$(shell)` 호출 횟수 실험과 같은 원리).

### `realpath`, `abspath` — 경로 정규화

```makefile
$(realpath path)   # 심볼릭 링크를 풀어 정규화한 절대 경로. 존재해야 함
$(abspath path)    # . 과 .. 를 정리한 절대 경로. 존재 여부 무관
```

없는 경로로 비교하면 차이가 분명합니다. `$(realpath /no/such/file)`은 `[]`, `$(abspath /no/such/../file)`은 `[/no/file]`이었습니다. 이 성질 때문에 `realpath`를 존재 검사에 씁니다.

```makefile
ifeq ($(realpath /opt/cuda/bin/nvcc),)
$(error CUDA not installed)
endif
```

---

## 조건 함수

조건 *지시자*(`ifeq`, `ifdef`, [Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals))와 조건 *함수*(`$(if ...)`)는 평가 시점이 다릅니다. 지시자는 *Makefile을 읽을 때* 한 번 평가되고, 함수는 *그 함수가 확장될 때* 평가됩니다([매뉴얼 8.4절](https://www.gnu.org/software/make/manual/html_node/Conditional-Functions.html)).

### `$(if ...)`

```makefile
$(if condition,then-part)
$(if condition,then-part,else-part)
```

`condition`이 *비어 있지 않으면* then-part, 비어 있으면 else-part를 돌려줍니다.

```makefile
DEBUG ?=
CFLAGS := $(if $(DEBUG),-g -O0 -DDEBUG,-O2 -DNDEBUG)
```

```text
$ make
DEBUG=[] CFLAGS=[-O2 -DNDEBUG]
$ DEBUG=1 make
DEBUG=[1] CFLAGS=[-g -O0 -DDEBUG]
$ make DEBUG=1
DEBUG=[1] CFLAGS=[-g -O0 -DDEBUG]
```

환경 변수로 준 `DEBUG=1`도 `?=`보다 먼저 정의된 값이라 그대로 남았습니다.

### `$(or ...)`, `$(and ...)`

```makefile
$(or  expr1,expr2,...)   # 첫 번째 비어 있지 않은 값
$(and expr1,expr2,...)   # 모두 비어 있지 않으면 마지막 값, 아니면 빈 문자열
```

`or`은 *기본값 채우기*에 씁니다.

```makefile
CC := $(or $(CC),gcc)    # CC가 비어 있으면 gcc
```

`?=`와 다른 점은 *빈 값으로 정의된* 변수도 채운다는 것입니다. 다만 `CC`에는 내장 기본값 `cc`가 있어서, 그냥 `make`를 부르면 결과는 `cc`(origin `default`)였습니다. `make CC=`처럼 명령줄에서 비웠을 때만 `gcc`가 들어갔습니다. `$(or)`는 3.81에서 추가됐습니다(NEWS).

---

## 셸·반복·동적 함수

### `$(shell ...)` — 외부 명령 결과

```makefile
$(shell command)
```

셸로 명령을 실행하고 *표준 출력*을 가져옵니다. [매뉴얼 8.14절](https://www.gnu.org/software/make/manual/html_node/Shell-Function.html)에 따르면 출력 끝의 줄바꿈은 지우고, 나머지 줄바꿈은 공백으로 바꿉니다.

```makefile
DATE := $(shell date '+%Y-%m-%d')
GIT_HASH := $(shell git rev-parse --short HEAD)
NPROC := $(shell getconf _NPROCESSORS_ONLN)

CPPFLAGS += -DBUILD_DATE=\"$(DATE)\" -DGIT_HASH=\"$(GIT_HASH)\"
```

CPU 수를 셀 때 Linux에서 흔히 쓰는 `nproc`은 GNU coreutils 명령입니다. 이 글을 쓴 macOS에는 `/usr/bin/nproc`이 없었고(`nproc`이 있던 것은 Homebrew coreutils의 `/opt/homebrew/bin/nproc`), 그래서 위 예제는 `getconf _NPROCESSORS_ONLN`으로 적었습니다. 이 기계에서는 `12`를 돌려줬습니다.

`shell` 함수는 *확장되는 시점마다* 실행됩니다. 최상위의 `:=`는 Makefile을 읽을 때 한 번, 재귀 변수는 참조할 때마다 실행됩니다. Ch 3에서 `=` 변수를 세 번 참조하자 셸이 세 번 뜨는 것을 확인했습니다.

```makefile
# 참조할 때마다 find가 돈다 (재귀 변수)
ALL_SOURCES = $(shell find src -name '*.c')

# 한 번만 도는 형태
ALL_SOURCES := $(shell find src -name '*.c')
```

### `$(foreach var,list,text)` — 반복

```makefile
DIRS := src lib test
CLEAN_DIRS := $(foreach d,$(DIRS),$(d)/build)
# CLEAN_DIRS = src/build lib/build test/build
```

목록을 돌면서 *각 단어를 변수에 담아* `text`를 평가합니다([매뉴얼 8.6절](https://www.gnu.org/software/make/manual/html_node/Foreach-Function.html)). `text` 안에서 그 변수(`$(d)`)를 참조합니다. 모듈마다 규칙을 만드는 일은 아래 `$(call)` + `$(eval)` 조합으로 합니다.

### `$(call func,arg1,...)` — 사용자 정의 함수

```makefile
# 정의: $(1), $(2), ... 가 인자 자리
make-obj = $(patsubst %.c,$(1)/%.o,$(2))

# 호출
OBJS := $(call make-obj,build,main.c utils.c)
# OBJS = build/main.o build/utils.o
```

같은 변환을 *여러 자리에서 재사용*할 때 씁니다([매뉴얼 8.8절](https://www.gnu.org/software/make/manual/html_node/Call-Function.html)). 인자가 이름 없이 위치(`$(1)`, `$(2)`)로만 구분되므로, 정의 바로 위에 각 인자의 의미를 주석으로 적어 둡니다.

### `define ... endef` — 여러 줄 변수

`$(eval)`을 다루기 전에 *여러 줄 텍스트를 변수에 담는 방법*부터 봅니다. 일반 대입은 *한 줄*만 받으므로, 줄바꿈을 포함한 블록은 `define`으로 담습니다([매뉴얼 6.8절](https://www.gnu.org/software/make/manual/html_node/Multi_002dLine.html)).

```makefile
define greeting
Hello, World!
Welcome to Make.
endef

test:
	$(info $(greeting))

bad:
	echo "$(greeting)"
```

`make test`는 두 줄을 그대로 출력하고, 레시피가 확장 뒤 비어서 `make: 'test' is up to date.`를 덧붙입니다. `make bad`는 실패합니다. 줄바꿈이 든 값이 레시피에 들어가 두 개의 레시피 줄로 갈라지고, 첫 줄에 닫히지 않은 따옴표가 남기 때문입니다.

```text
$ make bad
echo "Hello, World!
/bin/sh: -c: line 0: unexpected EOF while looking for matching `"'
/bin/sh: -c: line 1: syntax error: unexpected end of file
make: *** [Makefile:10: bad] Error 2
```

연산자를 생략한 `define`은 재귀 변수입니다. `define version :=`처럼 연산자를 붙이는 형식은 3.82에서 도입됐고(NEWS), 이렇게 정의한 `version`의 `$(flavor)`는 `simple`, 앞의 `greeting`은 `recursive`였습니다.

```makefile
define version :=
1.0.0
endef
```

`define`이 가장 많이 쓰이는 곳은 *템플릿*입니다. 매개변수가 들어가는 여러 줄 텍스트를 정의하고, `$(call)`로 실체화해 `$(eval)`에 넣으면 *규칙을 생성*할 수 있습니다.

### `$(eval text)` — 동적 Makefile 생성

```makefile
$(eval text)
```

문자열을 *Makefile 코드로 해석*해 그 자리에 *새 규칙·변수를 추가*합니다([매뉴얼 8.10절](https://www.gnu.org/software/make/manual/html_node/Eval-Function.html)). 3.80에서 추가됐습니다(NEWS).

```makefile
BUILDDIR := build

# 템플릿 정의
define module-template
$(1)_OBJS := $$(patsubst %.c,$$(BUILDDIR)/%.o,$$($(1)_SRCS))
$(1): $$($(1)_OBJS)
	$$(CC) -o $$@ $$^
endef

# 각 모듈마다 eval로 펼치기
foo_SRCS := foo1.c foo2.c
bar_SRCS := bar1.c

$(eval $(call module-template,foo))
$(eval $(call module-template,bar))

$(BUILDDIR)/%.o: %.c
	@mkdir -p $(@D)
	$(CC) -c $< -o $@
```

`$$`가 많은 이유는 *두 번 확장*되기 때문입니다. 한 번은 `call`에서, 한 번은 `eval`이 결과를 Makefile로 읽을 때입니다. `call` 단계에서 풀려야 하는 `$(1)`은 `$` 하나로, `eval` 단계까지 살아남아야 하는 참조는 `$$`로 적습니다.

`call`만 적용한 결과를 `$(info $(call module-template,foo))`로 찍으면 `eval`에 넘어가는 텍스트가 보입니다.

```makefile
foo_OBJS := $(patsubst %.c,$(BUILDDIR)/%.o,$(foo_SRCS))
foo: $(foo_OBJS)
	$(CC) -o $@ $^
```

`$(1)`은 `foo`로 바뀌었고 `$$`는 `$`로 한 번 줄었습니다. `eval`이 이 텍스트를 직접 적은 Makefile처럼 읽어 규칙을 추가하므로, `make foo bar`는 다음을 실행했습니다(`CC`는 내장 기본값 `cc`).

```text
$ make foo bar
cc -c foo1.c -o build/foo1.o
cc -c foo2.c -o build/foo2.o
cc -o foo build/foo1.o build/foo2.o
cc -c bar1.c -o build/bar1.o
cc -o bar build/bar1.o
```

실제 사례로 Buildroot가 있습니다. [Buildroot 매뉴얼](https://buildroot.org/downloads/manual/manual.html)의 패키지 `.mk` 예제는 `$(eval $(generic-package))`나 `$(eval $(autotools-package))` 한 줄로 끝나고, 패키지마다 변수만 정의하면 이 `eval`이 다운로드·빌드·설치 규칙을 만들어 냅니다.

### `MAKEFILE_LIST` — "지금 어떤 Makefile에 있지?"

이 특수 변수는 *지금까지 Make가 읽은 Makefile의 경로 목록*입니다(3.80+, NEWS). `include`로 읽힌 하위 Makefile이 *자기 위치를 알아내는* 데 씁니다.

```makefile
# mods/foo/module.mk
THIS_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
SRCS += $(THIS_DIR)foo.c
```

최상위 Makefile이 `mods/foo/module.mk`와 `mods/bar/module.mk`(같은 모양, `bar.c`)를 차례로 `include`하고 값을 찍었습니다.

```text
MAKEFILE_LIST=[Makefile mods/foo/module.mk mods/bar/module.mk]
SRCS=[mods/foo/foo.c mods/bar/bar.c]
```

`include`가 실행되는 순간 `MAKEFILE_LIST`의 마지막 단어가 방금 읽기 시작한 파일이므로, `$(lastword ...)`가 그 파일 경로를, `$(dir ...)`이 디렉터리를 줍니다. 각 모듈 파일이 자기 디렉터리를 알게 되어 비재귀 Make에서 모듈별 경로를 따로 적지 않아도 됩니다([Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals#makefile-분할-패턴)).

`THIS_DIR`은 *반드시 `:=`*로 정의합니다. `mods/foo/module.mk`에 같은 식을 `=`로 정의한 변수를 하나 더 두고 레시피에서 찍었더니 `mods/foo/`가 아니라 `mods/bar/`가 나왔습니다. 참조 시점의 마지막 파일이 이미 `bar`였기 때문입니다.

### `$(error ...)` / `$(warning ...)` / `$(info ...)` — 메시지

```makefile
$(error msg)     # 파일:줄과 함께 출력하고 종료 코드 2로 중단
$(warning msg)   # 파일:줄과 함께 출력하고 계속
$(info msg)      # 메시지만 출력
```

출력 형식은 Ch 3의 "디버깅" 절에서 실행해 봤습니다. `$(info)`는 변수 값 확인에 씁니다.

```makefile
$(info SRCS = $(SRCS))
$(info OBJS = $(OBJS))
```

`$(error)`는 환경 검증에 씁니다. 이때 내장 기본값을 고려해야 합니다.

```makefile
ifndef CC
$(error CC must be set)
endif
```

이 검사는 그냥 `make`로는 절대 걸리지 않습니다. `CC`에 내장 기본값 `cc`가 있기 때문입니다(실행 결과 `CC=[cc] origin=default`). `make CC=`처럼 빈 값을 줄 때만 `Makefile:2: *** CC must be set.  Stop.`으로 멈췄습니다. "사용자가 직접 정했는가"를 검사하려면 Ch 3의 `$(origin CC)`를 씁니다.

---

## 직접 확인 — 재귀 검색과 여러 줄 값

다음 Makefile로 `wildcard`의 `**`와 `find`를 비교하고, `define`의 여러 줄 값을 셸 인용 오류 없이 출력합니다.

```makefile title="Makefile"
.PHONY: all
DIRECT := $(wildcard src/**/*.c)
RECURSIVE := $(sort $(shell find src -name '*.c'))
define greeting
Hello, World!
Welcome to Make.
endef
all:
	@printf 'wildcard=[%s]\n' '$(DIRECT)'
	@printf 'find=[%s]\n' '$(RECURSIVE)'
	$(info $(greeting))
```

빈 입력 파일 세 개를 만들고 실행합니다.

```bash
mkdir -p src/one/two
touch src/root.c src/one/child.c src/one/two/deep.c
make
```

```text
Hello, World!
Welcome to Make.
wildcard=[src/one/child.c]
find=[src/one/child.c src/one/two/deep.c src/root.c]
```

`wildcard`는 `src/one/child.c` 하나만 찾았습니다. 바로 아래 `src/root.c`도, 두 단계 아래 `src/one/two/deep.c`도 빠졌습니다. `find`는 세 개를 모두 찾았습니다. 인사 두 줄이 맨 앞에 나온 것은 Make가 레시피 *전체*를 먼저 확장한 뒤 셸 명령을 실행하기 때문입니다. 마지막 줄의 `$(info)`는 확장 단계에서 바로 출력되고, 앞의 두 `printf`는 그 뒤에 실행됐습니다.

## 실전 예시

함수를 조합한 Makefile입니다.

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -std=c11 -O2
CPPFLAGS := -Iinclude

SRCDIR := src
BUILDDIR := build

# 1. find로 하위 디렉터리까지 소스 수집
SRCS := $(shell find $(SRCDIR) -name '*.c')

# 2. .c → .o (디렉터리 구조 보존)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))

# 3. 필요한 빌드 디렉터리 목록 — 중복 제거
OBJDIRS := $(sort $(dir $(OBJS)))

TARGET := $(BUILDDIR)/myapp

.PHONY: all clean info

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

# 정적 패턴 + order-only로 디렉터리 보장
$(OBJS): $(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIRS)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# 디렉터리 일괄 생성
$(OBJDIRS):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR)

# 디버깅용 — make info로 변수 확인
info:
	$(info SRCS    = $(SRCS))
	$(info OBJS    = $(OBJS))
	$(info OBJDIRS = $(OBJDIRS))
	$(info CFLAGS  = $(CFLAGS))
	@true
```

Ch 3의 `src/main.c`·`src/hello.c`에 `src/net/socket.c`를 더해 실행했습니다.

```text
$ make
mkdir -p build/
mkdir -p build/net/
gcc -Iinclude -Wall -Wextra -g -std=c11 -O2 -c src/hello.c -o build/hello.o
gcc -Iinclude -Wall -Wextra -g -std=c11 -O2 -c src/net/socket.c -o build/net/socket.o
gcc -Iinclude -Wall -Wextra -g -std=c11 -O2 -c src/main.c -o build/main.o
gcc  -o build/myapp build/hello.o build/net/socket.o build/main.o 
$ make info
SRCS    = src/hello.c src/net/socket.c src/main.c
OBJS    = build/hello.o build/net/socket.o build/main.o
OBJDIRS = build/ build/net/
CFLAGS  = -Wall -Wextra -g -std=c11 -O2
```

핵심 패턴은 다음과 같습니다.

- `$(shell find ...)`로 하위 디렉터리까지 소스를 찾습니다. `find`가 돌려준 순서(`hello`, `net/socket`, `main`)가 그대로 컴파일·링크 순서가 됐습니다. 순서를 고정하려면 `$(sort ...)`로 감쌉니다.
- `patsubst`로 `src/` 경로를 `build/` 경로로 바꿉니다.
- `sort` + `dir`로 중복 없는 디렉터리 목록(`build/ build/net/`)을 만듭니다.
- `info` 타겟은 `$(info ...)`로 변수를 덤프합니다. 마지막 `@true`를 빼면 레시피가 확장 뒤 비어 Make가 `make: Nothing to be done for 'info'.`를 덧붙입니다. 에러는 아니지만 출력이 깔끔하지 않아 넣었습니다.

---

## 흔한 실수

### 1. 쉼표 앞뒤에 공백

```makefile
# 안 됨: 공백이 인자에 흡수됨
$(patsubst %.c, %.o, $(SRCS))

# 됨
$(patsubst %.c,%.o,$(SRCS))
```

`SRCS := main.c util.c`로 첫 줄을 찍으면 `[ main.o  util.o]`가 나왔습니다. 치환 문자열이 ` %.o`(공백 + `%.o`)라서 단어마다 앞에 공백이 붙었습니다. `$(words)`는 여전히 `2`라 목록으로 쓸 때는 드러나지 않지만, 이 값을 문자열 비교나 `subst`에 넘기면 결과가 달라집니다.

### 2. `wildcard`가 빈 결과를 줌

```makefile
SRCS := $(wildcard srcs/*.c)    # 'srcs/' 오타 ('src/' 가 의도)
# SRCS는 빈 문자열, 빌드가 "할 일 없음"으로 끝남
```

`wildcard`는 매칭이 없을 때 에러 없이 빈 값을 돌려줍니다. `$(info)`로 대괄호를 쳐서 찍으면 바로 보입니다.

```makefile
SRCS := $(wildcard src/*.c)
$(info SRCS = [$(SRCS)])
```

### 3. 파일 이름의 공백

```makefile
FILES := $(shell find . -name '*.c')
```

`my file.c`와 `ok.c` 두 파일이 있는 디렉터리에서 `$(words $(FILES))`는 `3`이었습니다. `wildcard *.c`도 마찬가지로 `3`을 돌려줬습니다. Make의 목록은 공백으로 단어를 나누므로 `my`와 `file.c`가 두 단어가 됐습니다. 함수로는 이 문제를 우회할 방법이 없으니, Make로 빌드하는 소스 트리에는 공백 없는 파일 이름을 씁니다.

### 4. `eval`의 이중 확장

```makefile
define rule-template
$(1): $(2)
	echo $@
	echo $$@
endef

$(eval $(call rule-template,out.txt,in.txt))
```

```text
$ make out.txt
echo 

echo out.txt
out.txt
```

`$@`은 `call` 단계에서 이미 빈 값으로 풀려 `echo `만 남았고, `$$@`만 `eval` 뒤 레시피에서 `out.txt`로 풀렸습니다. `eval`로 넘길 템플릿에서는 *레시피 실행 때 풀려야 하는 모든 `$`를 `$$`로* 적습니다.

### 5. `filter`와 `findstring` 혼동

```makefile
$(filter debug,debug release)        # debug
$(filter debug,debug-mode)           # (빈 값 — 단어가 정확히 일치하지 않음)
$(findstring debug,debug-mode)       # debug (부분 문자열 매칭)
```

*단어 경계가 중요하면 `filter`, 부분 검색이면 `findstring`*입니다.

### 6. `realpath`와 `abspath` 혼동

```makefile
ifeq ($(realpath build/output.bin),)
$(error build/output.bin not built yet)
endif
```

`realpath`는 존재하지 않는 경로에 빈 값을 돌려주므로 존재 검사로 쓸 수 있습니다. 같은 자리에 `abspath`를 쓰면 경로가 없어도 `[/no/file]`처럼 값이 나와 검사가 항상 통과합니다.

---

## 정리

- 함수 호출은 **`$(함수명 인자,...)`**이고, *쉼표 뒤 공백도 인자의 일부*입니다.
- **문자열**: `subst`(글자 그대로), `patsubst`(`%` 패턴), `filter`(단어 매칭), `filter-out`(제외), `sort`(정렬+중복 제거), `strip`(공백 정리).
- **파일 이름**: `wildcard`(디스크 조회, `**`는 재귀 아님), `dir`/`notdir`, `basename`/`suffix`, `addprefix`/`addsuffix`, `realpath`/`abspath`.
- **조건 함수**: `$(if)`, `$(or)`, `$(and)`는 확장될 때 평가됩니다. `CC`처럼 내장 기본값이 있는 변수는 비어 있지 않습니다.
- **셸**: `$(shell ...)`은 확장될 때마다 실행되므로 `:=`로 한 번만 풉니다.
- **반복·재사용**: `$(foreach)`, `$(call)`, 그리고 *규칙 생성*은 `$(eval)`입니다. `eval` 템플릿 안의 `$`는 `$$`로 적습니다.
- **메시지**: `$(info)`, `$(warning)`, `$(error)`로 값을 확인하고 환경을 검증합니다.

## 다음 장 예고

[Ch 6: 조건문과 include](/blog/tools/build/gnu-make/chapter06-conditionals)에서는 *Makefile 파싱 시점*에 동작하는 조건 지시자(`ifeq`, `ifdef`, `else`, `endif`)와 외부 Makefile을 합치는 `include` / `-include`를 다룹니다. 자동 의존성 생성(`-MMD -MP` + include)도 여기서 마무리됩니다.

## 참고 자료

- [GNU Make Manual — Functions](https://www.gnu.org/software/make/manual/html_node/Functions.html) — 8장. 이 글의 8.1~8.14절 인용 출처.
- [GNU Make Manual — Text Functions](https://www.gnu.org/software/make/manual/html_node/Text-Functions.html)
- [GNU Make Manual — Foreach Function](https://www.gnu.org/software/make/manual/html_node/Foreach-Function.html)
- [The Buildroot user manual](https://buildroot.org/downloads/manual/manual.html) — `$(eval $(generic-package))` 패키지 인프라.

## 관련 항목

- [Ch 4: 패턴 규칙](/blog/tools/build/gnu-make/chapter04-pattern-rules) — `patsubst`로 만든 오브젝트 목록을 받아 실제로 컴파일하는 규칙.
- [Ch 6: 조건문과 include](/blog/tools/build/gnu-make/chapter06-conditionals) — 파싱 시점 지시자 `ifeq`와 이 장의 `$(if ...)` 함수의 시점 차이.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — `$(shell ...)`·`wildcard`를 `:=`로 묶어야 하는 이유인 확장 시점 이야기.
- [CMake Ch 2: 언어](/blog/tools/build/cmake/chapter02-language) — 같은 목적의 문자열·리스트 조작을 CMake는 어떤 명령으로 푸는지.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 내장 함수 전체 목록의 원문.
