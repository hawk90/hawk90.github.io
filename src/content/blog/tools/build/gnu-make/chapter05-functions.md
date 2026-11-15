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

새 파일이 생길 때마다 두 줄을 동시에 고쳐야 하고, 어딘가에서 한 줄을 놓치면 미묘한 빌드 사고가 납니다. 사람이 같은 정보를 두 번 적는 일은 거의 항상 *에러의 씨앗*입니다.

해결은 *디스크에 있는 파일을 직접 묻는 것*과 *파일 이름을 자동 변환하는 것*입니다. 둘 다 함수의 일입니다.

```makefile
SRCS := $(wildcard src/*.c)
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
```

`wildcard`는 *파일 시스템에 실재하는 파일*을 찾고, `patsubst`는 *문자열 변환 규칙*을 적용합니다. 이제 디렉터리에 `.c` 파일을 새로 추가하면 Makefile은 *수정하지 않아도* 즉시 그 파일을 빌드 대상에 포함합니다.

이 장은 Make가 가진 *내장 함수 카탈로그*입니다. 문자열·파일 이름·조건·셸·반복·동적 규칙 생성까지 — 처음 다 외울 필요는 없고, 이 자리에 어떤 도구가 있는지만 알아 두면 됩니다.

---

## 함수 호출 문법

```makefile
$(함수명 인자1,인자2,...)
${함수명 인자1,인자2,...}
```

괄호와 중괄호는 서로 바꿔 써도 됩니다. 함수명 *뒤에 한 칸*의 공백, 그 다음 첫 인자가 시작됩니다.

### 공백이 인자에 포함된다

이 한 줄이 거의 모든 Make 함수 함정의 근원입니다.

```makefile
# 인자 사이 공백이 인자 일부로 흡수됨
$(subst a, b, text)
#         ^^   ^^  
#       두 공백이 각각 두 번째·세 번째 인자의 머리에 붙음
```

위 식은 "a를 ' b'로 치환"이 됩니다. 출력에서 `b`가 *공백 한 칸씩 옮겨진* 모양이 됩니다.

```makefile
# 의도한 동작
$(subst a,b,text)
```

습관적으로 함수 호출에 공백을 넣지 마세요. 보기에는 답답해도, *공백이 의미를 바꾸는 언어*에서는 이게 정답입니다. 다른 언어의 함수 호출 관행과 다르다는 점을 한 번 의식하면 그 뒤로는 안 헷갈립니다.

---

## 문자열 함수

### `subst` — 단순 치환

```makefile
$(subst from,to,text)
```

`text`의 *모든* `from`을 `to`로 바꿉니다. 와일드카드는 없습니다. 글자 그대로 비교.

```makefile
FILES := foo.c bar.c baz.c
OBJS := $(subst .c,.o,$(FILES))
# OBJS = foo.o bar.o baz.o
```

`subst`의 한계는 *경계 인식이 없다*는 것입니다. `subst .c,.o,foo.cmd`는 `foo.omd`가 됩니다. 단순한 치환에는 빠르고 명료하지만, 단어 경계가 중요하면 `patsubst`를 씁니다.

### `patsubst` — 패턴 치환

```makefile
$(patsubst pattern,replacement,text)
```

`%` 와일드카드를 쓰는 점이 `subst`와 다릅니다. *단어 단위로 매칭*해 정밀합니다.

```makefile
SRCS := src/foo.c src/bar.c
OBJS := $(patsubst src/%.c,build/%.o,$(SRCS))
# OBJS = build/foo.o build/bar.o
```

**단축 문법**: 변수 참조 안에 *직접* 적을 수 있습니다.

```makefile
OBJS := $(SRCS:src/%.c=build/%.o)
```

이게 거의 같은 의미라서 실제 Makefile에서는 단축 문법을 더 자주 봅니다.

| 함수 | 매칭 | 예 |
|------|------|------|
| `subst` | 글자 그대로 *모든 발생* | `$(subst .c,.o,main.c.bak)` → `main.o.bak` |
| `patsubst` | `%` 패턴, *단어 단위* | `$(patsubst %.c,%.o,main.c)` → `main.o` |

### `strip` — 공백 정리

앞뒤 공백 제거, 단어 사이 연속 공백을 한 칸으로 줄입니다.

```makefile
VAR :=    hello     world   
CLEAN := $(strip $(VAR))
# CLEAN = "hello world"
```

가장 흔한 용도는 *비어 있음 검사*입니다. 변수에 공백만 들어가도 `ifeq ($(VAR),)`은 `false`이지만, `$(strip)`을 거치면 빈 문자열이 됩니다.

```makefile
ifeq ($(strip $(EXTRA_FLAGS)),)
$(info No extra flags set)
endif
```

### `findstring` — 부분 문자열 검색

```makefile
$(findstring find,text)
```

찾으면 `find` 그대로, 못 찾으면 빈 문자열을 돌려줍니다. 조건 검사에 그대로 쓸 수 있게 *결과를 진리값처럼* 만든 설계입니다.

```makefile
ifneq ($(findstring debug,$(CFLAGS)),)
# CFLAGS에 "debug"라는 부분 문자열이 어디든 들어 있음
endif
```

`findstring`은 단어 경계를 무시합니다. `findstring debug,prodebug-mode`도 `debug`를 반환합니다. 정확한 단어 매칭은 `filter`를 씁니다.

### `filter` / `filter-out` — 패턴으로 솎기

```makefile
$(filter pattern...,text)
$(filter-out pattern...,text)
```

여러 패턴을 한 호출에 줄 수 있고, *단어 단위로* 매칭합니다.

```makefile
FILES := main.c main.h utils.c utils.h config.mk
SRCS := $(filter %.c,$(FILES))           # main.c utils.c
HEADERS := $(filter %.h,$(FILES))        # main.h utils.h
CODE := $(filter %.c %.h,$(FILES))       # main.c main.h utils.c utils.h
```

`filter-out`은 정반대로, *매칭되는 것을 제거*합니다.

```makefile
SRCS := main.c test_main.c utils.c test_utils.c
PROD := $(filter-out test_%,$(SRCS))    # main.c utils.c
TEST := $(filter test_%,$(SRCS))        # test_main.c test_utils.c
```

테스트 코드 분리, 외부 라이브러리 제외 등 *목록 정제*가 필요한 모든 곳에서 등장합니다.

### `sort` — 정렬 + 중복 제거

```makefile
$(sort list)
```

알파벳 오름차순으로 정렬하면서 *중복도 제거*합니다.

```makefile
FILES := z.c a.c m.c a.c
SORTED := $(sort $(FILES))    # a.c m.c z.c
```

자주 보는 활용은 *디렉터리 목록 정리*입니다.

```makefile
OBJS := build/a/x.o build/a/y.o build/b/z.o
DIRS := $(sort $(dir $(OBJS)))
# DIRS = build/a/ build/b/  ← 중복 제거됨
```

`mkdir`을 부를 디렉터리 목록을 뽑을 때 거의 매번 `sort`가 따라옵니다.

> ⚠️ 순서가 *중요한* 라이브러리 링크 순서나 의존성 순서에는 `sort`를 쓰면 안 됩니다. 의도와 다른 순서가 됩니다.

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

인덱스는 1부터 시작합니다. 매뉴얼의 원문에 없는 이유를 인용하지 않고 입력과 결과로 확인합니다. `$(word 1,$(LIST))`이 `$(firstword $(LIST))`와 같다는 사실을 기억해 두세요.

---

## 파일 이름 함수

### `dir`, `notdir` — 경로 쪼개기

```makefile
FILES := src/main.c include/header.h
$(dir $(FILES))      # "src/ include/"  ← 슬래시 포함
$(notdir $(FILES))   # "main.c header.h"
```

`dir`이 *슬래시를 포함해서* 돌려준다는 점이 흥미롭습니다. 그래서 `$(dir foo.c)`은 디렉터리 없는 `foo.c`에도 동작해 `"./"`을 반환합니다. *경로 합치기*가 쉬워지는 설계입니다.

### `basename`, `suffix` — 확장자 분리

```makefile
FILES := main.c utils.cpp config.h
$(basename $(FILES))   # main utils config
$(suffix $(FILES))     # .c .cpp .h
```

`basename`이 *유닉스 `basename` 명령과 의미가 다르다*는 점에 주의하세요. 유닉스 `basename foo/bar.c`는 `bar.c`를 돌려주지만, Make의 `basename`은 `foo/bar`(확장자 제거)를 돌려줍니다. 같은 단어가 의미를 달리하는 흔한 함정입니다.

### `addprefix`, `addsuffix` — 접두/접미사 붙이기

```makefile
MODULES := main utils config

SRCS := $(addsuffix .c,$(MODULES))
# main.c utils.c config.c

OBJS := $(addprefix build/,$(addsuffix .o,$(MODULES)))
# build/main.o build/utils.o build/config.o
```

함수를 *중첩*해 복잡한 변환을 만들 수 있습니다. 가독성이 떨어지면 단계를 변수에 풀어 적습니다.

### `wildcard` — 파일 시스템 조회

```makefile
$(wildcard pattern)
```

다른 함수들이 *문자열만* 다루는 반면, `wildcard`는 *디스크에 있는 실제 파일*을 검색합니다. 실제 파일 목록을 찾는 함수입니다. realpath도 파일의 존재 여부와 심볼릭 링크를 확인하므로 유일한 존재 검사 함수라는 뜻은 아닙니다.

```makefile
SRCS := $(wildcard src/*.c)
HEADERS := $(wildcard include/*.h)
```

다중 패턴도 됩니다.

```makefile
ALL := $(wildcard *.c *.cpp *.cxx)
```

GNU Make의 wildcard는 셸 globstar 기능에 위임하지 않습니다. src/**/*.c를 임의 깊이의 재귀 검색으로 해석해서는 안 됩니다. 이 패턴은 여기서 src 바로 아래의 한 디렉터리 계층을 확인하는 비교 예로 사용합니다.

```makefile
# 임의 깊이 재귀 검색이 아님
ALL := $(wildcard src/**/*.c)

# 호환성 있는 대안: shell + find
ALL := $(shell find src -name '*.c')
```

위 := 문맥에서는 Makefile을 읽을 때 find를 실행합니다. 파일명에 공백이나 줄바꿈이 있으면 결과가 Make 단어 목록으로 안전하게 표현되지 않으므로 이 예제는 그런 경로를 지원하지 않습니다.

> 💡 *`wildcard`는 평가 시점에 즉시 디스크를 본다*는 사실을 잊지 마세요. 그래서 `:=`로 쓰면 *Makefile 파싱 때 한 번* 디스크 조회, `=`로 쓰면 *변수 사용 때마다* 매번 조회. 거의 항상 `:=`가 답입니다.

### `realpath`, `abspath` — 경로 정규화

```makefile
$(realpath path)   # 심볼릭 링크 해제한 절대 경로 (존재해야 함)
$(abspath path)    # 절대 경로 (존재 여부 무관)
```

`realpath`는 *대상이 실제 존재하지 않으면* 빈 문자열을 반환합니다. 그래서 "파일이 정말 거기 있는지" 검사용으로도 씁니다.

```makefile
ifeq ($(realpath /opt/cuda/bin/nvcc),)
$(error CUDA not installed)
endif
```

---

## 조건 함수

조건 *지시자*(`ifeq`, `ifdef`, [Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals))와 조건 *함수*(`$(if ...)`)는 다릅니다. 지시자는 *Makefile 파싱 시점*에 평가되고 한 번 결정되면 끝입니다. 함수는 *변수 평가 시점*에 매번 풀립니다.

### `$(if ...)`

```makefile
$(if condition,then-part)
$(if condition,then-part,else-part)
```

`condition`이 *비어 있지 않으면* then-part, 비어 있으면 else-part를 돌려줍니다. 다른 언어의 삼항 연산자와 같은 모양입니다.

```makefile
DEBUG ?=
CFLAGS := $(if $(DEBUG),-g -O0 -DDEBUG,-O2 -DNDEBUG)
```

위 식에서 `DEBUG=1 make`로 호출하면 첫 분기, 아니면 두 번째 분기가 들어옵니다.

### `$(or ...)`, `$(and ...)`

```makefile
$(or  expr1,expr2,...)   # 첫 번째 비어 있지 않은 값
$(and expr1,expr2,...)   # 모두 비어 있지 않으면 마지막, 아니면 빈 문자열
```

`or`은 *기본값 채우기*에 자주 씁니다.

```makefile
CC := $(or $(CC),gcc)    # 빈 CC면 gcc로 채움
```

이건 `?=`과 비슷하지만, 변수가 *명시적으로 빈 문자열*로 설정된 경우에도 동작합니다(`?=`은 *완전히 미정의*일 때만 동작).

---

## 셸·반복·동적 함수

### `$(shell ...)` — 외부 명령 결과

```makefile
$(shell command)
```

셸을 통해 명령을 실행하고 *표준 출력*을 가져옵니다. 줄바꿈은 공백으로 바뀝니다.

```makefile
DATE := $(shell date '+%Y-%m-%d')
GIT_HASH := $(shell git rev-parse --short HEAD)
NPROC := $(shell nproc)

CPPFLAGS += -DBUILD_DATE=\"$(DATE)\" -DGIT_HASH=\"$(GIT_HASH)\"
```

shell 함수는 자신이 참조되어 확장되는 시점에 실행됩니다. 최상위 :=는 읽을 때, 재귀 변수나 레시피의 참조는 그 참조를 확장할 때 실행합니다. 한 줄에 `$(shell)`이 10개 있으면 셸 10개를 띄웁니다. 비싼 명령(`find`, `cmake`, 네트워크 호출)이라면 결과를 변수에 저장해 한 번만 호출하도록 합니다.

```makefile
# 비쌈: ALL_SOURCES를 참조할 때마다 find가 돈다 (지연 평가)
ALL_SOURCES = $(shell find src -name '*.c')

# 한 번만 도는 형태
ALL_SOURCES := $(shell find src -name '*.c')
```

`:=`로 즉시 평가해 *Makefile 파싱 시 단 한 번* 도는 게 표준입니다.

### `$(foreach var,list,text)` — 반복

```makefile
DIRS := src lib test
CLEAN_DIRS := $(foreach d,$(DIRS),$(d)/build)
# CLEAN_DIRS = src/build lib/build test/build
```

목록을 돌면서 *각 단어를 변수에 담아* `text`를 평가합니다. 텍스트 안에서 그 변수(`$(d)`)를 참조할 수 있습니다.

복잡한 변환은 `foreach` + `call` 조합이 표준입니다. 예: 각 모듈마다 *src/X.c → build/X.o* 규칙을 일괄 생성.

### `$(call func,arg1,...)` — 사용자 정의 함수

```makefile
# 정의: $(1), $(2), ... 가 인자 자리
make-obj = $(patsubst %.c,$(1)/%.o,$(2))

# 호출
OBJS := $(call make-obj,build,main.c utils.c)
# OBJS = build/main.o build/utils.o
```

같은 변환을 *여러 자리에서 재사용*하고 싶을 때 씁니다. 인자가 위치 기반(`$(1)`, `$(2)`)이라 가독성이 떨어지므로, 너무 복잡한 함수는 차라리 셸 스크립트로 빼는 게 낫습니다.

### `define ... endef` — 여러 줄 변수

`$(eval)`을 다루기 전에 *여러 줄 텍스트를 변수에 담는 방법*부터 봅시다. 일반 `=` 대입은 *한 줄*만 받습니다. 줄바꿈을 포함한 큰 블록을 변수에 담으려면 `define`을 씁니다.

```makefile
define greeting
Hello, World!
Welcome to Make.
endef

test:
	$(info $(greeting))
```

define과 endef 사이의 줄바꿈은 값에 보존됩니다. 위 info는 그 값을 출력합니다. 이를 `echo "$(greeting)"`로 넣으면 여러 레시피 줄과 닫히지 않은 셸 인용부호가 되어 실패할 수 있으므로 구분합니다.

연산자를 생략한 define은 재귀 변수입니다. 즉시 평가하는 := 등의 연산자 형식은 GNU Make 3.82에 도입됐습니다. 이 글은 GNU Make 4.4.1에서 실행 확인했습니다.

```makefile
define version :=
1.0.0
endef
```

`define`이 진가를 발휘하는 자리는 *템플릿*입니다. 매개변수가 들어가는 *여러 줄짜리 텍스트*를 정의하고, 그걸 `$(call)`로 실체화해 `$(eval)`에 넣어 *동적 규칙*을 만듭니다.

### `$(eval text)` — 동적 Makefile 생성

```makefile
$(eval text)
```

가장 강력하면서 *가장 위험한* 함수입니다. 문자열을 *Makefile 코드로 해석*해 그 자리에 *새 규칙·변수를 추가*합니다.

```makefile
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
```

`$$`이 잔뜩 등장하는 이유는 *eval 안에서 두 번 확장*되기 때문입니다. 한 번은 `call`에서, 한 번은 `eval`에서. 두 번 모두 살리고 싶은 `$`은 `$$`로 이스케이프해야 합니다. 한 번만 풀고 싶은 `$`(예: `$(1)`)은 한 번만 적습니다.

위 코드를 단계별로 풀어 보면:

1. `$(call module-template,foo)` — `define` 안의 `$(1)`을 `foo`로 치환. `$$`은 `$`로 한 번 줄어듦.
2. 결과 문자열:
   ```makefile
   foo_OBJS := $(patsubst %.c,$(BUILDDIR)/%.o,$(foo_SRCS))
   foo: $(foo_OBJS)
   	$(CC) -o $@ $^
   ```
3. `$(eval ...)`이 이 텍스트를 *Makefile 코드로 해석*. 위 세 줄이 마치 사용자가 직접 적은 것처럼 *규칙으로 추가*됩니다.

`eval`은 *플러그인식 빌드 시스템*(buildroot, Yocto, OE-core, Kbuild의 일부)에서 활발하게 쓰입니다. 일반 프로젝트에서는 등장할 일이 드물지만, 메가 Makefile을 해독하려면 이 메커니즘을 알아야 합니다.

### `MAKEFILE_LIST` — "지금 어떤 Makefile에 있지?"

이 특수 변수는 *현재까지 Make가 읽은 모든 Makefile의 경로 목록*입니다. `include`로 합쳐진 서브 Makefile에서 *자신의 위치를 알아내는* 표준 관용구의 핵심입니다.

```makefile
# 모듈에서 자기 디렉터리 찾기 — 비재귀적 Make의 표준 패턴
THIS_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

# 이제 THIS_DIR을 기준으로 소스 경로를 만들 수 있음
SRCS += $(THIS_DIR)foo.c $(THIS_DIR)bar.c
```

여기서 마법은 `$(lastword $(MAKEFILE_LIST))`입니다.

- `$(MAKEFILE_LIST)`는 `Makefile mods/foo/module.mk mods/bar/module.mk` 같이 *순서대로* 모든 파일을 담고 있습니다.
- `$(lastword ...)`은 *마지막 단어*를 뽑습니다 — 즉 *방금 include된 그 Makefile의 경로*.
- `$(dir ...)`은 그 경로에서 디렉터리 부분만 추출.

각 서브 Makefile이 *자기 디렉터리를 자동으로 알게 되어*, 비재귀적 Make에서 *모듈 단위 격리*가 가능해집니다. ([Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals#makefile-분할-패턴)에서 다룰 multi-module 패턴이 이 트릭 위에 서 있습니다.)

주의: `THIS_DIR`을 *그 자리에서* 즉시 평가하려면 *반드시 `:=`*을 써야 합니다. `=`로 적으면 `$(lastword $(MAKEFILE_LIST))`가 *나중에 평가*되어 그때의 마지막 파일을 가져오게 되는데, 그건 *이미 다른 파일*이 될 수 있습니다.

### `$(error ...)` / `$(warning ...)` / `$(info ...)` — 메시지

```makefile
$(error msg)     # 메시지 출력 + 즉시 중단
$(warning msg)   # 메시지만 출력, 계속 진행
$(info msg)      # 단순 정보 메시지
```

가장 자주 쓰는 건 `$(info)`로, *변수 값 확인*에 거의 매번 등장합니다.

```makefile
$(info SRCS = $(SRCS))
$(info OBJS = $(OBJS))
$(info CFLAGS = $(CFLAGS))
```

`$(error)`은 *환경 검증*에 좋습니다.

```makefile
ifndef CC
$(error CC must be set)
endif

ifeq ($(realpath /opt/cuda/bin/nvcc),)
$(error CUDA not installed at /opt/cuda)
endif
```

---

## 직접 확인 — 재귀 검색과 여러 줄 값

다음 Makefile은 GNU Make 4.4.1에서 wildcard와 POSIX find를 비교하고, define의 여러 줄 값을 셸 인용 오류 없이 출력합니다. 아래 명령에서 만드는 세 파일 외에는 src 아래에 다른 파일이 없는 상태를 기준으로 합니다.

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

POSIX 셸에서 빈 입력 파일을 만듭니다. 이 절은 C 소스의 컴파일이 아니라 파일 목록을 검사합니다.

```bash
mkdir -p src/one/two
touch src/root.c src/one/child.c src/one/two/deep.c
make
```

wildcard 결과에는 `src/one/child.c`만 있고, find 결과에는 세 경로가 모두 있습니다. Make는 셸 명령을 실행하기 전에 레시피를 확장하므로 info의 두 인사 줄이 printf 결과보다 먼저 보일 수 있습니다. 여러 줄 값을 인용된 echo 한 줄로 바꾼 경우에는 셸 오류가 발생하는지도 함께 비교합니다.

## 실전 예시

함수를 본격 활용한 Makefile입니다.

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -std=c11 -O2
CPPFLAGS := -Iinclude

SRCDIR := src
BUILDDIR := build

# 1. POSIX find로 하위 디렉터리까지 소스 수집
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

핵심 패턴:

- `$(shell find ...)`로 *재귀적 소스 감지* (`wildcard`보다 호환성 좋음).
- `patsubst`로 *경로 변환*.
- `sort` + `dir`로 *유일한 디렉터리 목록* 추출.
- `$(info ...)` + `info` 타겟으로 *디버깅용 변수 덤프* (@true는 선택적인 no-op이며, 레시피가 Make 확장 후 비어 있어도 그 자체로 오류는 아닙니다).

---

## 흔한 실수

### 1. 쉼표 앞뒤에 공백

```makefile
# 안 됨: 공백이 인자에 흡수됨
$(patsubst %.c, %.o, $(SRCS))

# 됨
$(patsubst %.c,%.o,$(SRCS))
```

### 2. `wildcard`가 빈 결과를 줌

```makefile
SRCS := $(wildcard srcs/*.c)    # 'srcs/' 오타 ('src/' 가 의도)
# SRCS는 빈 문자열, 빌드가 "할 일 없음"으로 끝남
```

`$(info)`로 즉시 확인하는 습관이 좋습니다.

```makefile
SRCS := $(wildcard src/*.c)
$(info SRCS = [$(SRCS)])
```

빈 결과면 *대괄호 사이가 비어*서 한눈에 보입니다.

### 3. `shell`이 줄바꿈을 공백으로 바꿈

```makefile
FILES := $(shell find src -name '*.c')
# 파일 이름에 공백이 있으면 단어 경계가 깨짐
```

POSIX 파일 시스템에서는 거의 문제 안 되지만, 윈도우·macOS의 일부 경로에서는 사고가 납니다. 안전한 우회는 `find -print0`이지만 `shell`이 NULL 문자를 처리 못 하므로, 결국 *공백 없는 경로 관행*을 유지하는 게 답입니다.

### 4. `eval`의 이중 확장

```makefile
define rule-template
$(1): $(2)
	echo $@          # 빈 문자열 (첫 확장에서 $@가 비어버림)
	echo $$@         # 정상: $@
endef
```

`eval`이 들어가는 자리에서는 *유지하고 싶은 모든 `$`을 `$$`로 적는다*는 규칙만 기억하세요.

### 5. `filter`와 `findstring` 혼동

```makefile
$(filter debug,debug release)        # debug
$(filter debug,debug-mode)           # (빈 — 정확히 일치 안 함)
$(findstring debug,debug-mode)       # debug (부분 문자열 매칭)
```

*단어 경계가 중요하면 `filter`, 부분 검색이면 `findstring`*.

### 6. `realpath`를 *존재 확인용*으로 안 쓰고 변환용으로만 씀

```makefile
ifeq ($(realpath build/output.bin),)
$(error build/output.bin not built yet)
endif
```

realpath는 존재하지 않거나 해석할 수 없는 경로를 결과에서 제외합니다. abspath와 구분해 사용하고 셸 검사와의 성능 차이는 측정 없이 단정하지 않습니다.

---

## 정리

- 함수 호출: **`$(함수명 인자,...)`**. *쉼표 앞뒤 공백 금지*.
- **문자열**: `subst`(글자 그대로), `patsubst`(`%` 패턴), `filter`(단어 매칭), `filter-out`(제외), `sort`(정렬+중복 제거), `strip`(공백 정리).
- **파일 이름**: `wildcard`(디스크 조회), `dir`/`notdir`, `basename`/`suffix`, `addprefix`/`addsuffix`, `realpath`/`abspath`.
- **조건 함수**: `$(if)`, `$(or)`, `$(and)` — 변수 확장 시점.
- **셸**: `$(shell ...)` — `:=`로 한 번만 풀리게.
- **반복·재사용**: `$(foreach)`, `$(call)`, 그리고 *동적 규칙*은 `$(eval)`.
- **디버깅**: `$(info)`, `$(warning)`, `$(error)` 셋 다 외워 두면 큰 Makefile 추적이 빨라진다.

## 다음 장 예고

[Ch 6: 조건문과 include](/blog/tools/build/gnu-make/chapter06-conditionals)에서는 *Makefile 파싱 시점*에 동작하는 조건 지시자(`ifeq`, `ifdef`, `else`, `endif`)와 외부 Makefile을 합치는 `include` / `-include`를 다룹니다. 자동 의존성 생성(`-MMD -MP` + include)도 여기서 마무리됩니다.

## 참고 자료

- [GNU Make Manual — Functions](https://www.gnu.org/software/make/manual/html_node/Functions.html)
- [GNU Make Manual — Text Functions](https://www.gnu.org/software/make/manual/html_node/Text-Functions.html)
- [GNU Make Manual — Foreach Function](https://www.gnu.org/software/make/manual/html_node/Foreach-Function.html)

## 관련 항목

- [Ch 4: 패턴 규칙](/blog/tools/build/gnu-make/chapter04-pattern-rules) — `patsubst`로 만든 오브젝트 목록을 받아 실제로 컴파일하는 규칙.
- [Ch 6: 조건문과 include](/blog/tools/build/gnu-make/chapter06-conditionals) — 파싱 시점 지시자 `ifeq`와 이 장의 `$(if ...)` 함수의 시점 차이.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — `$(shell ...)`·`wildcard`를 `:=`로 묶어야 하는 이유인 확장 시점 이야기.
- [CMake Ch 2: 언어](/blog/tools/build/cmake/chapter02-language) — 같은 목적의 문자열·리스트 조작을 CMake는 어떤 명령으로 푸는지.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 내장 함수 전체 목록의 원문.
