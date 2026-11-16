---
title: "Make 변수와 자동 변수 — $@·$<·$^·재귀 vs 단순 할당"
slug: "tools/build/gnu-make/chapter03-variables"
date: 2026-06-03T09:03:00
description: "GNU Make 변수의 확장 시점, 자동 변수와 명령줄·환경·내장 기본값의 우선순위를 실행 예제로 비교합니다."
tags: [make, build, variables]
series: "GNU Make"
seriesOrder: 3
draft: false
topics: ["tools", "tools/build"]
---

## 왜 변수가 필요한가

[Ch 1](/blog/tools/build/gnu-make/chapter01-intro)의 첫 Makefile을 다시 봅시다.

```makefile
hello: main.o hello.o
	gcc -o hello main.o hello.o

main.o: main.c hello.h
	gcc -c main.c

hello.o: hello.c hello.h
	gcc -c hello.c
```

`gcc`라는 단어가 세 번 나오고, `hello` 같은 파일 이름도 여러 자리에 흩어져 있습니다. 컴파일러를 `clang`으로 바꾸려면 세 곳, 경고 수준을 한 단계 올리려면 또 세 곳을 동시에 고쳐야 합니다. 한 군데라도 놓치면 한 파일만 다른 컴파일러나 다른 플래그로 빌드되는데, 빌드는 성공하므로 눈에 띄지 않습니다.

해결책은 익숙합니다. 한 자리에 이름을 두고 그 이름을 가리키게 합니다. 이게 *변수*입니다.

```makefile
CC = gcc
CFLAGS = -Wall -g

hello: main.o hello.o
	$(CC) $(CFLAGS) -o hello main.o hello.o

main.o: main.c hello.h
	$(CC) $(CFLAGS) -c main.c

hello.o: hello.c hello.h
	$(CC) $(CFLAGS) -c hello.c
```

`CC = clang` 한 줄만 바꾸면 세 자리가 동시에 바뀝니다. 이 장의 실행 결과는 Ch 1과 같은 GNU Make 4.4.1, macOS 27.2.1, Apple clang 21.0.0에서 얻었습니다.

---

## 변수 기초

### 정의와 참조

```makefile
MY_VAR = hello world

test:
	@echo $(MY_VAR)
	@echo ${MY_VAR}    # 중괄호도 동일
```

변수는 `$(이름)` 또는 `${이름}`으로 참조합니다. [매뉴얼 6.1절](https://www.gnu.org/software/make/manual/html_node/Reference.html)에 따르면 `$` 뒤에 괄호가 아닌 문자가 오면 그 *한 글자*가 변수 이름이 됩니다. 그래서 괄호를 빠뜨리면 이런 일이 생깁니다.

```makefile
BUILD := out
B := bee
all:
	@echo "[$BUILD]"
	@echo "[$(BUILD)]"
```

```text
$ make
[beeUILD]
[out]
```

`$BUILD`는 변수 `B`의 값 `bee`와 문자열 `UILD`로 풀렸습니다. 매뉴얼도 같은 이유로 한 글자 변수에도 괄호를 쓰라고 권합니다.

### 이름 규칙

[매뉴얼 6장 도입부](https://www.gnu.org/software/make/manual/html_node/Using-Variables.html)가 정한 규칙은 다음과 같습니다.

- *허용 문자*: `:`, `#`, `=`, 공백을 제외한 모든 문자열이 변수 이름이 될 수 있습니다. 다만 글자·숫자·밑줄 이외의 문자가 든 이름은 일부 셸에서 환경 변수로 하위 Make에 전달되지 않습니다. `.`과 대문자로 시작하는 이름은 앞으로 Make가 특별한 의미를 줄 수 있도록 예약돼 있습니다.
- *대소문자 구분*: `foo`, `FOO`, `Foo`는 서로 다른 변수입니다.
- *관용*: 내장 규칙이 읽는 변수나 사용자가 명령줄로 덮어쓸 변수는 대문자, Makefile 안에서만 쓰는 변수는 소문자를 권합니다.

---

## 변수 확장의 두 모델

변수의 값이 *언제* 풀리느냐에 따라 같은 Makefile이 다른 명령을 만들어 냅니다. [매뉴얼 6.2절](https://www.gnu.org/software/make/manual/html_node/Flavors.html)은 이를 변수의 두 *종류*(flavor)로 나눕니다.

### `=` — 재귀적 확장(recursively expanded)

```makefile
B = world
A = hello $(B)

test:
	@echo $(A)    # hello world
```

`A = hello $(B)`라고 적었을 때, Make는 `$(B)`를 *그 자리에서* 풀지 않습니다. `A`의 값으로 *문자열 그대로* `hello $(B)`를 기억해 둡니다. 나중에 누군가 `$(A)`를 부르면 그때 `$(B)`를 풀어서 `world`로 바꿉니다.

이 *지연 평가*가 어떤 결과를 부르는지 봅시다.

```makefile
B = world
A = hello $(B)
B = universe
$(info A=$(A))
```

```text
A=hello universe
```

`A`는 손대지 않았는데 출력이 바뀌었습니다. `B`가 *나중에* 재정의되어 `$(A)`를 평가할 때 새 `B`를 들고 오기 때문입니다.

장점은 *늦게 정의되는 변수를 미리 참조*할 수 있다는 것입니다.

```makefile
# LINK는 나중에 정의할 OBJS를 참조하는 재귀 변수
LINK = $(CC) -o app $(OBJS)
OBJS = main.o utils.o

# 규칙의 의존성은 읽는 즉시 확장하므로 OBJS 정의 뒤에 배치
all: $(OBJS)
	$(LINK)
```

단점은 *자기 자신을 참조하면 무한 재귀*가 된다는 것입니다.

```makefile
CFLAGS = $(CFLAGS) -Wall    # 오류
```

```text
$ make
Makefile:1: *** Recursive variable 'CFLAGS' references itself (eventually).  Stop.
```

Make는 이를 감지해 명시적으로 거부합니다.

### `:=` — 단순 확장(simply expanded)

```makefile
B = world
A := hello $(B)
B = universe
$(info A=$(A))
```

```text
A=hello world
```

`:=`는 정반대입니다. 우변을 *그 자리에서 즉시 평가*해 결과 문자열을 `A`에 저장합니다. 그래서 이후 `B`가 바뀌어도 `A`는 그대로입니다. 자기 참조도 안전해서, `CFLAGS := -g` 다음 줄에 `CFLAGS := $(CFLAGS) -Wall`을 두면 `$(info)`로 `-g -Wall`이 찍힙니다.

### 둘 중 어느 것을 쓸까

이 시리즈는 다음 기준을 씁니다. 매뉴얼의 권고가 아니라 이 글의 선택입니다.

> 값을 정의 시점에 고정해도 되면 **`:=`**, 참조 시점의 값이 필요하면 **`=`**.

`:=`를 기본으로 두는 이유는 두 가지입니다.

1. *값이 확정되는 시점이 하나입니다*. `$(info $(VAR))`로 찍은 값이 이후에도 그대로라 디버깅할 때 추적할 곳이 줄어듭니다.
2. *우변의 함수가 한 번만 실행됩니다*. `=` 변수는 참조할 때마다 우변을 다시 평가합니다.

두 번째 차이를 직접 셌습니다. `$(shell ...)`이 호출될 때마다 로그 파일에 한 줄을 남기게 하고, 레시피에서 각 변수를 세 번 참조했습니다.

```makefile
NOW = $(shell date +%s%N >> calls.log; echo x)
NOW_S := $(shell date +%s%N >> calls_s.log; echo x)
all:
	@echo $(NOW) $(NOW) $(NOW)
	@echo $(NOW_S) $(NOW_S) $(NOW_S)
```

실행 뒤 `calls.log`는 3줄, `calls_s.log`는 1줄이었습니다. `=` 쪽은 셸을 세 번 띄웠고 `:=` 쪽은 한 번 띄웠습니다. `$(shell)`이나 `$(wildcard)`를 담은 변수를 여러 규칙에서 참조하면 이 차이가 참조 횟수만큼 커집니다.

`=`를 쓸 자리는 두 가지입니다.

- 변수 정의의 우변에서 나중에 정의할 변수를 참조할 때. 규칙의 타겟·의존성 자체는 읽을 때 확장된다는 점은 별개입니다(아래 "직접 확인" 절).
- *자동 변수가 들어가야* 하는 자리. `$@`처럼 *규칙마다 다르게 풀리는* 값을 변수 안에 넣으려면 `=`로 정의해 레시피에서 풀리게 해야 합니다.

### `?=` — "없으면 채우기"

변수가 *아직 정의되지 않았을 때만* 할당합니다([매뉴얼 6.2.4절](https://www.gnu.org/software/make/manual/html_node/Conditional-Assignment.html)).

```makefile
CC ?= gcc
all:
	@echo "CC=$(CC) origin=$(origin CC)"
```

여기서 "정의"에는 환경·명령줄·앞선 Makefile 줄뿐 아니라 *내장 기본값*도 들어갑니다. GNU Make는 `CC`에 `cc`라는 내장 기본값을 두므로 위 `?=`는 아무것도 바꾸지 않습니다.

```text
$ make
CC=cc origin=default
$ CC=clang make
CC=clang origin=environment
$ make CC=clang
CC=clang origin=command line
```

`gcc`를 기본으로 쓰고 싶다면 `?=` 대신 `ifeq ($(origin CC),default)`로 내장 기본값일 때만 바꿉니다.

### `+=` — "이어 붙이기"

기존 값에 *공백 한 칸을 두고* 덧붙입니다.

```makefile
CFLAGS := -g
CFLAGS += -Wall
CFLAGS += -O2
# CFLAGS = -g -Wall -O2
```

[매뉴얼 6.6절](https://www.gnu.org/software/make/manual/html_node/Appending.html)에 따르면 `+=`는 *왼쪽 변수의 종류를 그대로 보존*합니다. 원본이 `:=`면 덧붙일 텍스트를 즉시 확장해 붙이고, 원본이 `=`면 확장하지 않은 텍스트를 붙여 재귀 변수로 남깁니다. 아직 정의되지 않은 변수에 `+=`를 쓰면 `=`처럼 재귀 변수가 됩니다. 아래 "흔한 실수 4"에서 `$(flavor)`로 확인합니다.

### `!=` — 셸 명령 결과

GNU Make 4.0부터 추가된 연산자입니다(NEWS). 셸 명령을 실행하고 그 출력을 변수에 저장합니다.

```makefile
GIT_HASH != git rev-parse --short HEAD
DATE != date '+%Y-%m-%d'
```

[매뉴얼 6.5절](https://www.gnu.org/software/make/manual/html_node/Setting.html)에 따르면 `!=`는 대입하는 순간 셸을 실행하고, 출력 끝의 줄바꿈 하나를 지우고 나머지 줄바꿈은 공백으로 바꿔 *재귀 확장 변수*에 넣습니다. 그래서 출력에 `$`가 있으면 나중에 참조할 때 Make 변수 참조로 다시 해석됩니다. 같은 절은 이를 피하려면 `$`를 `$$`로 바꾸거나, `VAR := $(shell ...)`로 단순 확장 변수에 넣으라고 안내합니다.

---

## 자동 변수 — 규칙마다 자동으로 채워지는 손잡이

*자동 변수*는 Make가 *각 규칙이 실행될 때마다* 그 규칙의 타겟·의존성으로 설정하는 특수 변수입니다. [매뉴얼 10.5.3절](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html)에 따르면 레시피 안에서만 값을 가집니다.

| 변수 | 의미 |
|------|------|
| `$@` | 타겟 이름 |
| `$<` | 첫 번째 의존성 |
| `$^` | 모든 의존성 (중복 제거) |
| `$+` | 모든 의존성 (중복과 순서 유지) |
| `$?` | 타겟보다 새것인 의존성만 |
| `$*` | 패턴의 *stem* (Ch 4) |

의존성을 `main.o utils.o main.o`처럼 중복해서 적은 규칙으로 다섯 변수를 한 번에 찍어 봤습니다. 첫 줄은 처음 빌드할 때, 둘째 줄은 `hello`를 만든 뒤 `utils.o`만 갱신했을 때입니다.

```makefile
hello: main.o utils.o main.o
	@echo '$$@=$@ $$<=$< $$^=$^ $$+=$+ $$?=$?'
```

```text
$@=hello $<=main.o $^=main.o utils.o $+=main.o utils.o main.o $?=main.o utils.o
$@=hello $<=main.o $^=main.o utils.o $+=main.o utils.o main.o $?=utils.o
```

### `$@` — 타겟

규칙의 "결과" 자리를 가리킵니다.

```makefile
hello: main.o hello.o
	gcc -o $@ main.o hello.o
```

`$@`는 `hello`로 풀리고 명령은 `gcc -o hello main.o hello.o`가 됩니다. 같은 레시피를 *다른 타겟에 재사용*하기 좋게 만들어 줍니다.

### `$<` — 첫 번째 의존성

```makefile
main.o: main.c hello.h
	gcc -c $< -o $@
```

`$<`는 `main.c`, `$@`는 `main.o`입니다. 의존성을 적을 때 주 소스 파일을 맨 앞에, 헤더를 그 뒤에 두면 `gcc -c $< -o $@` 한 줄이 "소스 한 개로 오브젝트 한 개"를 만듭니다. 10.5.3절에 따르면 암시적 규칙에서 레시피를 얻은 타겟이라면 `$<`는 그 암시적 규칙이 추가한 첫 의존성입니다. *패턴 규칙*과의 결합은 Ch 4에서 다룹니다.

### `$^`·`$+` — 모든 의존성

```makefile
hello: main.o hello.o utils.o
	gcc -o $@ $^
```

`$^`는 `main.o hello.o utils.o`로 풀려 링크 명령의 입력 목록 자리에 들어갑니다. 위 실행처럼 중복 의존성은 `$^`에서 한 번만 나옵니다. `$+`는 중복과 순서를 그대로 유지하는데, 10.5.3절은 그 용도를 "라이브러리 파일 이름을 특정 순서로 반복해야 의미가 있는 링크 명령"이라고 적습니다. 정적 라이브러리끼리 서로 참조해 `-la -lb -la`처럼 적어야 하는 경우가 그렇습니다.

### `$?` — 변경된 의존성만

```makefile
libfoo.a: foo.o bar.o baz.o
	ar rcs $@ $?
```

`ar r`은 아카이브 안의 같은 이름 멤버를 교체하고, 없는 멤버는 추가합니다. 그래서 `$?`로 새것만 넘겨도 아카이브가 최신이 됩니다. 실제로 돌려 본 결과입니다(오브젝트는 내장 규칙이 `cc -c`로 만들었습니다).

```text
$ make
cc    -c -o foo.o foo.c
cc    -c -o bar.o bar.c
cc    -c -o baz.o baz.c
ar rcs libfoo.a foo.o bar.o baz.o
$ touch bar.c
$ make
cc    -c -o bar.o bar.c
ar rcs libfoo.a bar.o
$ ar t libfoo.a
__.SYMDEF SORTED
foo.o
bar.o
baz.o
```

두 번째 실행의 `ar`에는 `bar.o` 하나만 넘어갔고, 아카이브에는 세 오브젝트가 모두 남아 있습니다. 매뉴얼 10.5.3절의 `$?` 예제도 같은 `ar r lib $?` 형태입니다.

### 디렉터리·파일 이름 분리 — `(D)`, `(F)`

자동 변수에 `D`·`F`를 붙이면 경로를 쪼갭니다.

| 변수 | `$@ = build/sub/main.o`일 때 |
|------|------------------------------|
| `$(@D)` | `build/sub` |
| `$(@F)` | `main.o` |

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	@echo "@D=$(@D) @F=$(@F)"
	gcc -c $< -o $@
```

```text
$ make build/sub/main.o
@D=build/sub @F=main.o
gcc -c src/sub/main.c -o build/sub/main.o
```

`$(@D)`로 출력 디렉터리를 꺼내 `mkdir -p`에 넘기므로, 소스 트리가 몇 단계로 중첩돼도 출력 디렉터리 규칙을 따로 적지 않아도 됩니다. Ch 2의 order-only 방식은 디렉터리마다 규칙이 하나씩 필요하다는 점과 비교됩니다.

---

## 미리 정의된 변수 — 컴파일러 빌드의 표준 어휘

Make는 *암시적 규칙*(implicit rules)이 읽는 컴파일러용 변수들을 미리 정의해 둡니다. 이 이름을 따르면 규칙을 직접 적지 않아도 Make가 컴파일합니다. 아래 기본값은 이 환경의 4.4.1에서 `make -p -f /dev/null`로 출력한 값입니다.

| 변수 | 4.4.1 기본값 (이 환경) | 의미 |
|------|--------|------|
| `CC` | `cc` | C 컴파일러 |
| `CXX` | `clang++` | C++ 컴파일러 |
| `CFLAGS` | (정의 안 됨) | C 컴파일 플래그 |
| `CXXFLAGS` | (정의 안 됨) | C++ 컴파일 플래그 |
| `CPPFLAGS` | (정의 안 됨) | 전처리기 플래그 (`-I`, `-D`) |
| `LDFLAGS` | (정의 안 됨) | 링커 플래그 (`-L`, `-Wl,...`) |
| `LDLIBS` | (정의 안 됨) | 링크할 라이브러리 (`-lpthread`) |
| `AR` | `ar` | 정적 라이브러리 도구 |
| `RM` | `rm -f` | 삭제 명령 |

`CXX`는 [매뉴얼 10.3절](https://www.gnu.org/software/make/manual/html_node/Implicit-Variables.html)에 기본값 `g++`로 적혀 있지만, 이 macOS용 Homebrew 빌드는 `clang++`, macOS의 `/usr/bin/make`(3.81)는 `c++`을 출력했습니다. 기본값을 문서에서 읽지 말고 `make -p`로 확인해야 하는 이유입니다.

네 가지 플래그의 *경계*는 다음과 같습니다.

- **`CPPFLAGS`**: *전처리기*가 보는 옵션. `-I`(include 경로), `-D`(매크로 정의), `-U`(매크로 해제).
- **`CFLAGS`**: *컴파일러*가 보는 옵션. `-Wall`, `-O2`, `-std=c11`, `-g`.
- **`LDFLAGS`**: *링커*가 보는 옵션. `-L`(라이브러리 경로), `-Wl,...`.
- **`LDLIBS`**: 링크 *대상* 라이브러리. `-lm`, `-lpthread`.

`-I`는 `CFLAGS`에 넣어도 동작합니다. `gcc` 한 명령이 전처리와 컴파일을 함께 하기 때문입니다. 그래도 `CPPFLAGS`에 두는 이유는 내장 규칙이 이 변수들을 따로 읽기 때문입니다. `make -p`에 나온 4.4.1의 내장 정의는 다음과 같습니다.

```makefile
COMPILE.c = $(CC) $(CFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c
LINK.o = $(CC) $(LDFLAGS) $(TARGET_ARCH)
OUTPUT_OPTION = -o $@

.c.o:
	$(COMPILE.c) $(OUTPUT_OPTION) $<
.o:
	$(LINK.o) $^ $(LOADLIBES) $(LDLIBS) -o $@
```

내장 링크 규칙은 `$(LDFLAGS)`를 오브젝트 앞에, `$(LDLIBS)`를 오브젝트 뒤에 둡니다. 직접 규칙을 적을 때도 이 배치를 따르면 내장 규칙과 같은 순서의 명령이 나옵니다.

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -std=c11 -O2
CPPFLAGS := -Iinclude
LDFLAGS := -Llib
LDLIBS := -lm

hello: main.o hello.o
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@
```

컴파일 줄의 `$(CPPFLAGS)`와 `$(CFLAGS)`는 내장 `COMPILE.c`와 순서가 반대입니다. 두 변수가 서로 겹치는 옵션을 담지 않는 한 결과는 같습니다.

---

## 변수의 출처와 우선순위

같은 변수가 *여러 자리에서* 정의되면 Make는 한 값을 고릅니다. `CFLAGS := -Wall`을 적은 Makefile과, `CFLAGS`를 정의하지 않은 Makefile을 같은 방식으로 호출해 `$(CFLAGS)`와 `$(origin CFLAGS)`를 찍었습니다.

| 호출 | `CFLAGS := -Wall`이 있는 Makefile | `CFLAGS`가 없는 Makefile |
|------|------------------|------------------|
| `make` | `-Wall` (file) | 빈 값 (undefined) |
| `CFLAGS=-O1 make` | `-Wall` (file) | `-O1` (environment) |
| `CFLAGS=-O1 make -e` | `-O1` (environment override) | — |
| `make CFLAGS="-O2 -DNDEBUG"` | `-O2 -DNDEBUG` (command line) | — |

정리하면 **명령줄 > Makefile > 환경 변수 > 내장 기본값** 순입니다. 환경 변수는 Makefile이 같은 이름을 정의하지 않았을 때만 흡수되고, `make -e`를 주면 환경 변수가 Makefile보다 위로 올라갑니다([매뉴얼 6.10절](https://www.gnu.org/software/make/manual/html_node/Environment.html)). `override` 지시자는 이 순서를 뒤집는 별도 장치입니다(아래).

### 명령줄로 덮어쓰기

```bash
make CFLAGS="-O2 -DNDEBUG"
```

위 표처럼 Makefile에 `CFLAGS := -Wall`이 있어도 명령줄 값이 *완전히 덮어씁니다*. `+=`로 적어도 마찬가지라, `CFLAGS += -Wall`만 있는 Makefile을 `make CFLAGS=-O3`로 부르면 `-O3`만 남습니다.

### 환경 변수로 영향 주기

```bash
export DEBUG=1
make
```

```makefile
ifdef DEBUG
CFLAGS += -g -DDEBUG
endif
```

`DEBUG`를 Makefile에서 정의하지 않았으므로 환경 값 `1`이 흡수되고, `ifdef`가 참이 됩니다.

### `$(origin VAR)` — *이 값은 어디서 왔지?*

위 표의 괄호 안 값은 `$(origin)` 함수의 결과입니다. [매뉴얼 8.11절](https://www.gnu.org/software/make/manual/html_node/Origin-Function.html)이 정한 값은 여덟 가지입니다.

| 결과 | 의미 |
|------|------|
| `undefined` | 정의된 적 없음 |
| `default` | Make 내장 기본값 (`CC = cc` 같은) |
| `environment` | 환경 변수로 들어옴 |
| `environment override` | 환경 변수 + `make -e` |
| `file` | Makefile에서 정의됨 |
| `command line` | `make X=Y` 명령줄로 |
| `override` | `override` 지시자로 |
| `automatic` | 자동 변수 (`$@` 등) |

명령줄로 받지 않았을 때 경고하는 검사는 이렇게 적습니다.

```makefile
# 명령줄 이외의 출처면 경고
ifneq ($(origin CFLAGS),command line)
$(warning CFLAGS should come from CLI)
endif
```

`make`로 부르면 `Makefile:3: CFLAGS should come from CLI`가 출력되고, `make CFLAGS=-O2`로 부르면 아무것도 출력되지 않습니다.

### `$(value VAR)` — *원본 텍스트를 그대로*

```makefile
A = $(B)
B = hello

$(info $(A))         # → hello
$(info $(value A))   # → $(B)
```

실행하면 `hello`와 `$(B)` 두 줄이 출력됩니다. `$(value)`는 재귀 변수를 *확장하지 않은 정의 원본*을 돌려줍니다([매뉴얼 8.9절](https://www.gnu.org/software/make/manual/html_node/Value-Function.html)). `$(call)`이나 `$(eval)`에 넘길 템플릿 변수를 디버깅할 때, 풀리기 전에 그 자리에 어떤 텍스트가 들어 있는지 확인하는 데 씁니다.

### `override` 지시자 — *명령줄을 이긴다*

명령줄이 가장 강하다고 했지만, "사용자가 어떻게 호출해도 이 옵션만은 켜고 싶다"는 경우가 있습니다([매뉴얼 6.7절](https://www.gnu.org/software/make/manual/html_node/Override-Directive.html)).

```makefile
# 평범한 += — 명령줄이 덮어씀
CFLAGS += -Wall

# override — 명령줄 값에 덧붙임
override CFLAGS += -Wall
```

```text
$ make -f plain.mk CFLAGS=-O3
[-O3]
$ make -f override.mk CFLAGS=-O3
[-O3 -Wall] override
$ make -f override.mk
[-Wall] override
```

`override`는 `=`, `:=`, `+=` 같은 대입 앞에 붙일 수 있습니다. 대신 사용자가 명령줄로 그 변수를 비우거나 바꿀 방법이 사라지므로, 빠지면 빌드가 틀려지는 옵션에만 씁니다.

---

## 디버깅 — "내 변수에 도대체 뭐가 들었지?"

변수가 의도와 다르게 풀릴 때 쓰는 도구는 세 가지입니다.

### `$(info ...)`·`$(warning ...)`·`$(error ...)`

이 함수들은 자신이 확장되는 시점에 동작합니다([매뉴얼 8.13절](https://www.gnu.org/software/make/manual/html_node/Make-Control-Functions.html)). Makefile 최상위에 두면 읽는 동안, 레시피 안에 두면 그 레시피를 확장할 때 실행됩니다.

```makefile
$(info CFLAGS = [$(CFLAGS)])
$(warning Using deprecated rule)
$(error stop here)
```

```text
$ make
CFLAGS = []
Makefile:2: Using deprecated rule
Makefile:3: *** stop here.  Stop.
```

`$(info)`는 메시지만, `$(warning)`은 파일 이름과 줄 번호를 붙여서 출력합니다. `$(error)`는 같은 형식으로 출력한 뒤 종료 코드 2로 멈춥니다.

### `make -p` — 데이터베이스 덤프

```bash
make -p -n 2>&1 | less
```

`-p`는 Make가 들고 있는 *모든 변수·규칙·암시적 규칙*을 출력합니다. `-n`을 함께 주면 레시피는 실행하지 않습니다. 변수마다 바로 윗줄에 출처가 붙습니다. `FOO=bar make -p -n`으로 `CFLAGS := -Wall` 한 줄짜리 Makefile을 읽힌 출력에서 세 변수를 골랐습니다.

```text
# environment
FOO = bar
...
# makefile (from 'Makefile', line 1)
CFLAGS := -Wall
...
# default
CC = cc
```

### `make --debug`

```bash
make --debug=basic   # 어떤 타겟이 왜 다시 만들어졌는지
make --debug=verbose # 다시 만들 필요가 없었던 의존성까지
make --debug=jobs    # 하위 명령 실행 상세
```

[매뉴얼 9.8절](https://www.gnu.org/software/make/manual/html_node/Options-Summary.html)에 따르면 옵션 이름은 첫 글자만 봅니다(`--debug=b`와 같음). Ch 1의 `hello` 프로젝트에서 `touch hello.c` 뒤 `make --debug=basic`을 실행하면 재빌드 이유가 그대로 찍힙니다(버전 머리말은 생략).

```text
Reading makefiles...
Updating makefiles....
Updating goal targets....
  Prerequisite 'hello.c' is newer than target 'hello.o'.
 Must remake target 'hello.o'.
gcc -c hello.c
 Successfully remade target file 'hello.o'.
 Prerequisite 'hello.o' is newer than target 'hello'.
Must remake target 'hello'.
gcc -o hello main.o hello.o
Successfully remade target file 'hello'.
```

---

## 직접 확인 — 변수와 의존성의 확장 시점

다음 파일로 두 종류의 변수와 규칙의 즉시 확장을 구분합니다. `all`의 의존성 줄을 읽을 때 `OBJECTS`는 아직 정의되지 않았으므로, 나중에 정의해도 `all`의 의존성은 소급해서 채워지지 않습니다. [매뉴얼 3.7절](https://www.gnu.org/software/make/manual/html_node/Reading-Makefiles.html)은 규칙의 타겟과 의존성을 읽는 즉시 확장하는 "immediate" 문맥으로 분류합니다.

```makefile title="Makefile"
.PHONY: all late shell
BASE = before
RECURSIVE = $(BASE)
SIMPLE := $(BASE)
BASE = after
CC ?= gcc

all: $(OBJECTS)
	@printf 'recursive=%s simple=%s prerequisites=[%s]\n' '$(RECURSIVE)' '$(SIMPLE)' '$^'
	@printf 'cc=%s origin=%s\n' '$(CC)' '$(origin CC)'

OBJECTS = generated.txt
late: $(OBJECTS)
	@printf 'late prerequisites=[%s]\n' '$^'
generated.txt:
	@printf 'generated\n' > $@
shell:
	@name=world; printf 'Hello, %s\n' "$$name"
```

환경 변수 `CC`를 설정하지 않은 셸에서 실행한 결과입니다.

```text
$ make
recursive=after simple=before prerequisites=[]
cc=cc origin=default
$ make late
late prerequisites=[generated.txt]
$ make CC=clang
recursive=after simple=before prerequisites=[]
cc=clang origin=command line
$ make shell
Hello, world
```

`all`의 `$^`는 비어 있고, `OBJECTS` 정의 뒤에 쓴 `late`에서는 `generated.txt`가 들어갔습니다. `make late`는 `generated.txt`도 만들었습니다. 레시피 안의 `$(RECURSIVE)`는 레시피를 실행할 때 풀려서 마지막 값 `after`가 됐습니다. 재귀 변수의 지연 평가가 규칙의 의존성 줄까지 늦춰 주지는 않는다는 것을 이 차이가 보여 줍니다.

## 실전 예시 — 변수로 다시 쓴 작은 빌드

지금까지의 도구로 [Ch 1](/blog/tools/build/gnu-make/chapter01-intro)의 첫 Makefile을 다시 써 봅니다. 소스는 `src/main.c`·`src/hello.c`, 헤더는 `include/hello.h`로 옮겼습니다.

```makefile
# === 설정 ===
CC := gcc
CFLAGS := -Wall -Wextra -std=c11 -O2 -g
CPPFLAGS := -Iinclude
LDFLAGS :=
LDLIBS :=

# 디렉터리
SRCDIR := src
BUILDDIR := build

# 소스와 오브젝트 (Ch 5의 wildcard, 패턴 치환 미리보기)
SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(SRCS:$(SRCDIR)/%.c=$(BUILDDIR)/%.o)

# 최종 산물
TARGET := $(BUILDDIR)/hello

# === 규칙 ===
.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS) | $(BUILDDIR)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR)
```

```text
$ make
mkdir -p build
gcc -Iinclude -Wall -Wextra -std=c11 -O2 -g -c src/hello.c -o build/hello.o
gcc -Iinclude -Wall -Wextra -std=c11 -O2 -g -c src/main.c -o build/main.o
gcc  -o build/hello build/hello.o build/main.o 
$ ./build/hello
Hello, World!
$ make clean
rm -f -r build
```

빈 `LDFLAGS`와 `LDLIBS` 자리는 공백으로 남습니다. `hello.o`가 `main.o`보다 먼저 컴파일된 것은 `$(wildcard)`가 정렬된 결과를 돌려주기 때문입니다(4.3부터의 동작, NEWS. Ch 5에서 다룹니다). `clean`의 `$(RM)`은 내장 기본값 `rm -f`로 풀렸습니다. 컴파일러 변경은 첫 줄 한 자리에서 끝나고, `src/`에 새 `.c`를 넣으면 Makefile을 고치지 않아도 `wildcard`가 찾아냅니다.

`wildcard`와 `$(SRCS:...=...)` 패턴 치환은 [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions)에서 자세히 다룹니다.

---

## 흔한 실수

### 1. `=` vs `:=` 혼동

```makefile
FILES = $(wildcard *.c)
FILES = $(FILES) extra.c    # 무한 재귀
```

```text
Makefile:2: *** Recursive variable 'FILES' references itself (eventually).  Stop.
```

`=`은 사용 시점 평가라 `$(FILES)` 안에서 또 `$(FILES)`를 보게 됩니다.

**해결**: `:=` 사용

```makefile
FILES := $(wildcard *.c)
FILES := $(FILES) extra.c   # main.c만 있는 디렉터리에서 "main.c extra.c"
```

### 2. 셸 변수와 Make 변수 혼동 (반복)

```makefile
test:
	name=world; echo "Hello, $name"
```

```text
$ make
name=world; echo "Hello, ame"
Hello, ame
```

Make가 `$n`을 한 글자 변수 `n`으로 해석해 빈 값으로 바꿨습니다. 셸에 넘어간 명령에 이미 `$`가 없습니다.

**해결**: `$$`로 이스케이프

```makefile
test:
	name=world; echo "Hello, $$name"
```

### 3. 자동 변수를 타겟·의존성 자리에 사용

```makefile
$@: main.c       # 동작 안 함
	gcc -c main.c -o $@
```

```text
$ make
make: *** No targets.  Stop.
```

자동 변수는 *레시피 안*에서만 값을 가집니다. 타겟 줄의 `$@`는 빈 문자열로 풀려 이 Makefile에는 타겟이 하나도 남지 않았습니다.

**해결**: 대부분은 *명시적 변수*로 풀어 둡니다.

```makefile
TARGET := main.o
$(TARGET): main.c
	gcc -c main.c -o $@
```

의존성 줄에서 꼭 타겟 이름을 써야 한다면 `.SECONDEXPANSION`을 켜고 `$$`로 확장을 한 단계 미룹니다([매뉴얼 3.9절](https://www.gnu.org/software/make/manual/html_node/Secondary-Expansion.html)).

```makefile
.SECONDEXPANSION:
main.o: $$(patsubst %.o,%.c,$$@)
	@echo "build $@ from $<"
```

이 파일은 `build main.o from main.c`를 출력합니다. 처음에 `$$(@:.o=.c)`로 적었더니 `target pattern contains no '%'`로 멈췄습니다. 의존성 줄의 `:`를 Make가 정적 패턴 규칙의 구분자로 읽었기 때문입니다.

### 4. `+=`로 종류가 섞임

```makefile
SOURCES = $(wildcard *.c)
SOURCES += $(wildcard *.cpp)  # 여전히 `=` (재귀적)
```

`$(flavor SOURCES)`를 찍으면 `recursive`가 나옵니다. 앞 절의 `$(shell)` 카운트 실험처럼, 재귀 변수는 참조할 때마다 두 `wildcard`를 다시 실행합니다.

**해결**: 처음부터 `:=`로 시작

```makefile
SOURCES := $(wildcard *.c)
SOURCES += $(wildcard *.cpp)  # $(flavor SOURCES) = simple
```

---

## 정리

- 변수에는 두 종류가 있습니다. **`=`**(재귀 확장)는 참조할 때마다, **`:=`**(단순 확장)는 정의할 때 한 번 풉니다. 이 시리즈는 이유가 없으면 `:=`를 씁니다.
- **`?=`**는 미정의일 때만 채우고, 내장 기본값이 있는 `CC`에는 효과가 없습니다. **`+=`**는 원래 종류를 유지하고, **`!=`**(4.0+)는 셸 출력을 재귀 변수에 넣습니다.
- **자동 변수**: `$@`(타겟), `$<`(첫 의존성), `$^`(중복 없는 전체), `$+`(중복 유지), `$?`(새것만), `$*`(stem, Ch 4).
- `$(@D)`·`$(@F)`로 경로를 디렉터리와 파일 이름으로 쪼갭니다.
- **표준 컴파일 변수** `CC`/`CFLAGS`/`CPPFLAGS`/`LDFLAGS`/`LDLIBS`는 내장 규칙이 읽는 이름이고, 기본값은 `make -p`로 확인합니다.
- **우선순위**는 명령줄 > Makefile > 환경 변수 > 내장 기본값이고, `override`로 명령줄 값에 덧붙일 수 있습니다.
- **디버깅**에는 `$(info ...)`, `$(origin)`, `make -p`, `make --debug=basic`을 씁니다.

## 다음 장 예고

[Ch 4: 패턴 규칙](/blog/tools/build/gnu-make/chapter04-pattern-rules)에서는 `%.o: %.c` 같은 한 줄로 *수십 개의 컴파일 규칙*을 대체합니다. 정적 패턴 규칙, 암시적 규칙의 검색 순서, 그리고 4.3에 도입된 grouped target(`&:`)까지 다룹니다.

## 참고 자료

- [GNU Make Manual — Using Variables](https://www.gnu.org/software/make/manual/html_node/Using-Variables.html) — 6장. 이 글의 6.1·6.2·6.5·6.6·6.7·6.10절 인용 출처.
- [GNU Make Manual — Automatic Variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html) — 10.5.3절.
- [GNU Make Manual — Variables Used by Implicit Rules](https://www.gnu.org/software/make/manual/html_node/Implicit-Variables.html) — 10.3절. 문서상의 기본값 목록.

## 관련 항목

- [Ch 2: 규칙](/blog/tools/build/gnu-make/chapter02-rules) — 변수가 들어갈 자리인 타겟·의존성·레시피의 구조.
- [Ch 4: 패턴 규칙](/blog/tools/build/gnu-make/chapter04-pattern-rules) — 여기서 미룬 stem `$*`과 자동 변수가 패턴과 만나는 자리.
- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 실전 예시에 미리 등장한 `wildcard`와 `$(SRCS:%.c=%.o)` 치환의 상세.
- [CMake Ch 2: 언어](/blog/tools/build/cmake/chapter02-language) — CMake의 `set`·리스트·캐시가 Make의 `=`/`:=`와 어떻게 다른지.
- [CMake Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — `make CC=clang` 같은 명령줄 덮어쓰기에 대응하는 CMake 쪽 장치.
- [GNU Make Manual](https://www.gnu.org/software/make/manual/) — 변수 확장 규칙의 원문.
