---
title: "Ch 3: 변수와 자동 변수"
date: 2025-05-14T03:00:00
description: "Make 변수의 두 가지 확장 방식, 자동 변수, 우선순위 — 같은 코드가 미묘하게 다르게 도는 9할의 원인."
tags: [make, build, Makefile, variables]
series: "GNU Make"
seriesOrder: 3
draft: false
---

## 왜 변수가 필요한가

[Ch 1](/blog/tools/gnu-make/chapter01-intro)의 첫 Makefile을 다시 봅시다.

```makefile
hello: main.o hello.o
	gcc -o hello main.o hello.o

main.o: main.c hello.h
	gcc -c main.c

hello.o: hello.c hello.h
	gcc -c hello.c
```

`gcc`라는 단어가 세 번 나오고, `hello` 같은 파일 이름도 여러 자리에 흩어져 있습니다. 컴파일러를 `clang`으로 바꾸려면 세 곳, 경고 수준을 한 단계 올리려면 또 세 곳을 동시에 고쳐야 합니다. 한 군데라도 놓치면 빌드가 *대부분 정상으로 보이지만 한 파일만 다른 컴파일러로* 빌드되는 미묘한 사고가 납니다.

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

`CC = clang` 한 줄만 바꾸면 세 자리가 동시에 바뀝니다. 변수를 도입하는 순간 Makefile은 *동작하는 코드*에서 *유지보수 가능한 코드*로 성격이 바뀝니다.

---

## 변수 기초

### 정의와 참조

```makefile
MY_VAR = hello world

test:
	@echo $(MY_VAR)
	@echo ${MY_VAR}    # 중괄호도 동일
```

변수는 `$(이름)` 또는 `${이름}`으로 참조합니다. 한 글자 변수에 한해 `$X`처럼 괄호 없이도 쓸 수 있지만, 가독성과 *오타로 인한 사고 방지*를 위해 항상 괄호를 쓰는 것이 안전합니다. `$BUILD`라고 적고 한참 헤매면 그게 사실 `$B`(빈 값) + `UILD`(리터럴)였다는 걸 뒤늦게 깨닫게 됩니다.

### 이름 규칙

- *대소문자 구분*: `CC`와 `cc`는 서로 다른 변수입니다.
- *관용*: 사용자 정의 변수는 대문자, Make 내부에서만 쓰는 변수는 소문자.
- *허용 문자*: 알파벳·숫자·밑줄. 점(`.`)도 가능하지만, `.PHONY` 같은 특수 타겟과 헷갈리기 쉬워 거의 안 씁니다.

---

## 변수 확장의 두 모델 — Make의 가장 중요한 한 가지

Make의 모든 미묘한 버그의 80%는 *변수가 언제 확장되는가*에서 옵니다. 이 절을 제대로 잡으면 이후 Makefile을 보는 눈이 달라집니다.

### `=` — 재귀적 확장(recursively expanded)

```makefile
B = world
A = hello $(B)

test:
	@echo $(A)    # hello world
```

`A = hello $(B)`라고 적었을 때, Make는 `$(B)`를 *바로 그 자리에서* 풀지 않습니다. `A`의 값으로 *문자열 그대로* `hello $(B)`를 기억해 둡니다. 나중에 누군가 `$(A)`를 부르면 그때서야 `$(B)`를 풀어서 `world`로 바꿉니다.

이 *지연 평가*가 어떤 결과를 부르는지 봅시다.

```makefile
B = world
A = hello $(B)
B = universe

test:
	@echo $(A)    # hello universe!
```

`A`는 손대지 않았는데 출력이 바뀌었습니다. `B`가 *나중에* 재정의되어 다음번 `$(A)` 평가 때 새 `B`를 들고 오기 때문입니다.

장점: *늦게 정의되는 변수를 미리 참조*할 수 있습니다. 다음 패턴이 가능한 이유가 바로 이것입니다.

```makefile
# OBJS는 아직 정의 안 됨, 그래도 OK
all: $(OBJS)
	$(CC) -o app $^

# 한참 아래에서 OBJS 정의
OBJS = main.o utils.o
```

단점: *자기 자신을 참조하면 무한 재귀*가 됩니다.

```makefile
CFLAGS = $(CFLAGS) -Wall    # 오류
```

```
*** Recursive variable 'CFLAGS' references itself (eventually). Stop.
```

Make는 이를 감지해 명시적으로 거부합니다.

### `:=` — 단순 확장(simply expanded)

```makefile
B = world
A := hello $(B)
B = universe

test:
	@echo $(A)    # hello world
```

`:=`는 정반대입니다. 우변을 *그 자리에서 즉시 평가*해 결과 문자열을 `A`에 저장합니다. 그래서 이후 `B`가 바뀌어도 `A`는 그대로입니다.

자기 참조도 안전합니다.

```makefile
CFLAGS := -g
CFLAGS := $(CFLAGS) -Wall    # OK → "-g -Wall"
```

오른쪽의 `$(CFLAGS)`는 *현재 값 `-g`*를 즉시 풀어서 합치므로 재귀가 일어나지 않습니다.

### 둘 중 어느 것을 쓸까

GNU Make 매뉴얼과 실무 관행이 모두 같은 답을 줍니다.

> 명시적인 이유가 없으면 **`:=`**를 쓴다.

이유는 셋입니다.

1. *디버깅이 쉽다*. 값이 확정된 시점이 명확해 `$(info $(VAR))`로 찍어 보면 그게 끝입니다.
2. *부작용이 적다*. 어딘가에서 의존 변수가 바뀌어도 영향을 안 받습니다.
3. *성능 차이는 미미하지만 누적*. 큰 Makefile에서 `=` 변수가 수십 번 풀리면 같은 계산을 반복합니다.

`=`를 쓸 자리는 거의 두 가지입니다.

- *나중에 정의되는 변수를 미리 참조*해야 할 때 (위의 `OBJS` 예).
- *자동 변수가 들어가야* 하는 자리. `$@`처럼 *규칙마다 다르게 풀리는* 값을 변수 안에 가두려면 `=`로 정의해 늦게 풀려야 합니다.

### `?=` — "없으면 채우기"

변수가 *아직 정의되지 않았을 때만* 할당합니다.

```makefile
CC ?= gcc
```

이미 누가 `CC`를 정해 놓았으면(환경 변수, 명령줄, 위쪽 줄에서 모두 포함) 그 값을 존중합니다. 라이브러리·도구 Makefile에서 자주 봅니다. "기본은 gcc인데, 사용자가 다른 걸 쓰고 싶으면 그대로 두겠다"는 약속입니다.

```bash
# 사용자가 컴파일러 지정
CC=clang make    # CC=clang으로 빌드

# 기본값 사용
make             # CC=gcc로 빌드
```

### `+=` — "이어 붙이기"

기존 값에 *공백 한 칸을 두고* 덧붙입니다.

```makefile
CFLAGS := -g
CFLAGS += -Wall
CFLAGS += -O2
# CFLAGS = -g -Wall -O2
```

`+=`은 *왼쪽 변수의 종류를 그대로 보존*합니다. 원본이 `=`(재귀적)였으면 결과도 `=`. `:=`였으면 결과도 `:=`. 두 가지를 무심코 섞으면 미묘한 버그가 생길 수 있어, 한 변수에 대해서는 일관된 연산자만 쓰는 게 안전합니다.

### `!=` — 셸 명령 결과

GNU Make 4.0부터 추가된 연산자입니다. 셸 명령을 실행하고 그 출력을 변수에 저장합니다.

```makefile
GIT_HASH != git rev-parse --short HEAD
DATE != date '+%Y-%m-%d'
```

`:=` + `$(shell ...)` 조합과 결과는 같지만 더 짧습니다. 단, *Makefile이 파싱되는 매 순간 실행*되므로, 비싼 명령은 피해야 합니다. `make` 한 번에 Makefile은 보통 한 번만 파싱되지만, `MAKEFLAGS`에 따라 여러 번 파싱될 수도 있습니다.

---

## 자동 변수 — 규칙마다 자동으로 채워지는 손잡이

*자동 변수*는 Make가 *각 규칙이 실행될 때마다* 그 규칙의 타겟·의존성으로 자동 설정하는 특수 변수입니다. 레시피 안에서만 의미가 있습니다(타겟·의존성 줄에서는 동작하지 않습니다).

| 변수 | 의미 | `hello: main.o utils.o`의 예 |
|------|------|------------------------------|
| `$@` | 타겟 이름 | `hello` |
| `$<` | 첫 번째 의존성 | `main.o` |
| `$^` | 모든 의존성 (중복 제거) | `main.o utils.o` |
| `$+` | 모든 의존성 (중복 포함) | `main.o utils.o` |
| `$?` | 타겟보다 새것인 의존성만 | (변경된 파일들) |
| `$*` | 패턴의 *stem* | (Ch 4) |

### `$@` — 타겟

규칙의 "결과" 자리를 가리킵니다.

```makefile
hello: main.o hello.o
	gcc -o $@ main.o hello.o
```

`$@`는 `hello`로 풀리고 명령은 `gcc -o hello main.o hello.o`가 됩니다. 같은 규칙을 *다른 타겟에 재사용*하기 좋게 만들어 줍니다.

### `$<` — 첫 번째 의존성

```makefile
main.o: main.c hello.h
	gcc -c $< -o $@
```

`$<`는 `main.c`, `$@`는 `main.o`. *패턴 규칙*과 결합하면 어마어마한 위력을 발휘합니다(Ch 4).

`$<`가 *첫 번째*만 가져오는 이유는, 보통 첫 의존성이 "주 소스 파일"이고 나머지는 "헤더"이기 때문입니다. C 컴파일에서 `gcc -c $< -o $@`은 "주 소스 한 개로 한 오브젝트 만든다"는 표준 패턴입니다.

### `$^` — 모든 의존성

```makefile
hello: main.o hello.o utils.o
	gcc -o $@ $^
```

`$^`는 `main.o hello.o utils.o`로 풀려, 링크 명령의 입력 파일 목록 자리에 딱 맞습니다. 중복 의존성(`a.o a.o b.o`)이 있어도 `$^`는 *한 번만* 포함시킵니다. 중복까지 그대로 보존하려면 `$+`를 쓰는데, 이건 라이브러리 링크 순서가 중요한 드문 경우에만 등장합니다.

### `$?` — 변경된 의존성만

```makefile
libfoo.a: foo.o bar.o baz.o
	ar rcs $@ $?
```

`ar rcs`는 *기존 라이브러리에 추가/갱신*하는 모드입니다. 이미 들어 있는 오브젝트는 손대지 않고, 새 것만 갱신합니다. `$^`을 쓰면 매번 세 오브젝트 모두를 다시 묶고, `$?`을 쓰면 "이번에 새것이 된" 오브젝트만 갱신합니다. 거대 라이브러리에서는 후자가 훨씬 빠릅니다.

### 디렉터리·파일 이름 분리 — `(D)`, `(F)`

자동 변수에 `D`·`F`를 붙이면 경로를 쪼갭니다.

| 변수 | `$@ = build/sub/main.o`일 때 |
|------|------------------------------|
| `$(@D)` | `build/sub` |
| `$(@F)` | `main.o` |

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	gcc -c $< -o $@
```

`$(@D)`로 출력 디렉터리를 동적으로 추출해 `mkdir`이 항상 올바른 자리를 만듭니다. order-only 의존성을 못 쓰거나 디렉터리가 깊게 중첩될 때 자주 보는 패턴입니다.

---

## 미리 정의된 변수 — 컴파일러 빌드의 표준 어휘

Make는 *암시적 규칙*(implicit rules) 위에 컴파일러용 변수들을 미리 마련해 두었습니다. 이 어휘를 따르면 손으로 직접 규칙을 안 적어도 Make가 알아서 컴파일하는 단계가 가능합니다.

| 변수 | 기본값 | 의미 |
|------|--------|------|
| `CC` | `cc` | C 컴파일러 |
| `CXX` | `g++` | C++ 컴파일러 |
| `CFLAGS` | (없음) | C 컴파일 플래그 |
| `CXXFLAGS` | (없음) | C++ 컴파일 플래그 |
| `CPPFLAGS` | (없음) | 전처리기 플래그 (`-I`, `-D`) |
| `LDFLAGS` | (없음) | 링커 플래그 (`-L`, `-Wl,...`) |
| `LDLIBS` | (없음) | 링크할 라이브러리 (`-lpthread`) |
| `AR` | `ar` | 정적 라이브러리 도구 |
| `RM` | `rm -f` | 삭제 명령 |

세 가지 플래그(`CPPFLAGS`·`CFLAGS`·`LDFLAGS`)의 *경계*를 정확히 잡아 두면 좋습니다.

- **`CPPFLAGS`**: *전처리기*가 보는 옵션. `-I`(include 경로), `-D`(매크로 정의), `-U`(매크로 해제).
- **`CFLAGS`**: *컴파일러*가 보는 옵션. `-Wall`, `-O2`, `-std=c11`, `-g`.
- **`LDFLAGS`**: *링커*가 보는 옵션. `-L`(라이브러리 경로), `-Wl,...`.
- **`LDLIBS`**: 링크 *대상* 라이브러리. `-lm`, `-lpthread`.

자주 헷갈리는 점은 *`-I`는 CFLAGS에 넣어도 동작*한다는 것입니다. 전처리기와 컴파일이 한 명령(`gcc`)으로 묶여 있어서 양쪽 다 통하기 때문입니다. 그래도 관용을 따라 `CPPFLAGS`에 두면, 외부 빌드 시스템(autoconf, distutils)이 같은 변수를 *프로젝트 표준*으로 읽어 들일 수 있어 호환성이 좋습니다.

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

이 다섯 줄의 *순서*는 Linux/GNU 관행입니다. 컴파일 줄에서 `$(CPPFLAGS)`→`$(CFLAGS)`, 링크 줄에서 `$(LDFLAGS)` 옵션→`$(LDLIBS)` 라이브러리 — 거의 모든 오픈소스 Makefile이 이 순서를 따릅니다.

---

## 변수의 출처와 우선순위

같은 변수가 *여러 자리에서* 정의되면 Make는 우선순위 표대로 한 값을 고릅니다.

```
1. 명령줄   (make CC=clang)         ← 가장 강함
2. Makefile (CC := gcc)
3. 환경 변수 (export CC=clang)       ← 가장 약함
```

(`override` 지시자는 이 표를 뒤집을 수 있는 별도 카드입니다 — 아래에서 다룹니다.)

### 명령줄로 덮어쓰기

```bash
make CFLAGS="-O2 -DNDEBUG"
```

이렇게 호출하면 Makefile에서 `CFLAGS := -Wall`이라고 적어 두었더라도 명령줄의 `-O2 -DNDEBUG`가 *완전히 덮어씁니다*. 명령줄 값은 가장 강해서, Makefile에서 어떻게 적어 두든 무시됩니다.

이 동작이 마음에 안 들 때가 있습니다. 예컨대 "사용자가 무엇을 줘도 `-Wall`은 반드시 켜고 싶다"가 그렇습니다. 이때 등장하는 게 `override`입니다.

```makefile
override CFLAGS += -Wall
```

`override`가 붙은 줄은 *명령줄 값을 이긴* 다음, 그 값에 `-Wall`을 덧붙입니다. 결과적으로 사용자가 어떻게 `CFLAGS`를 정해 와도 `-Wall`은 항상 포함됩니다.

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

환경 변수는 *Makefile에서 정의되지 않았을 때*만 자동으로 흡수됩니다. Makefile에서 같은 이름의 변수를 정의하면 환경 변수는 무시됩니다. 정확히는 `make -e` 옵션이 이 우선순위를 바꿔서 환경 변수를 더 위로 올릴 수 있지만, 거의 안 씁니다.

---

## 디버깅 — "내 변수에 도대체 뭐가 들었지?"

큰 Makefile에서 변수가 의도와 다르게 풀리는 일이 자주 일어납니다. 다음 도구들을 외워 두면 디버깅이 빨라집니다.

### `$(info ...)`·`$(warning ...)`·`$(error ...)`

세 함수는 *Makefile 파싱 중에* 메시지를 띄웁니다.

```makefile
$(info CFLAGS = [$(CFLAGS)])
$(warning Using deprecated rule)
$(error CC must be set)    # error는 즉시 중단
```

`$(info ...)`이 가장 자주 쓰입니다. 변수가 *언제, 어떤 값으로 풀리는지* 보고 싶을 때 그 자리에 넣으면 됩니다.

### `make -p` — 데이터베이스 덤프

```bash
make -p -n 2>&1 | less
```

`-p`는 Make가 들고 있는 *모든 변수·규칙·암시적 규칙*을 출력합니다. `-n`을 함께 주면 실제 빌드는 안 합니다. 거대 Makefile에서 "이 변수가 어디서 왔지?" 알고 싶을 때 가장 빠른 방법입니다. 출력에는 `# default`, `# environment`, `# makefile (from 'Makefile', line N)` 같이 *값의 출처*가 함께 적혀 있어 추적이 쉽습니다.

### `make --debug=v`

```bash
make --debug=basic   # 어떤 규칙이 왜 돌았는지
make --debug=verbose # 더 자세히
make --debug=jobs    # 병렬 빌드 상세
```

타임스탬프 비교 결과가 보여서 "왜 이게 재빌드되지?" 같은 의문을 풀 때 좋습니다.

---

## 실전 예시 — 변수로 다시 쓴 작은 빌드

지금까지의 도구로 [Ch 1](/blog/tools/gnu-make/chapter01-intro)의 첫 Makefile을 다시 써 봅니다.

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

[Ch 1](/blog/tools/gnu-make/chapter01-intro)의 Makefile과 비교해 *얼마나 짧고 일관되어진* 모양을 보세요. 컴파일러 변경은 첫 줄 한 자리, 새 소스 추가는 *별도 수정이 필요 없습니다* (wildcard가 자동 감지). 변수와 패턴 규칙의 조합이 Make를 실용 도구로 만드는 핵심입니다.

`wildcard`와 `$(SRCS:...=...)` 패턴 치환은 [Ch 5: 함수](/blog/tools/gnu-make/chapter05-functions)에서 자세히 다룹니다.

---

## 흔한 실수

### 1. `=` vs `:=` 혼동

```makefile
FILES = $(wildcard *.c)
FILES = $(FILES) extra.c    # 무한 재귀
```

`=`은 사용 시점 평가라 `$(FILES)` 안에서 또 `$(FILES)`를 보게 되어 무한히 도립니다.

**해결**: `:=` 사용
```makefile
FILES := $(wildcard *.c)
FILES := $(FILES) extra.c   # OK
```

### 2. 셸 변수와 Make 변수 혼동 (반복)

```makefile
test:
	name=world; echo "Hello, $name"   # 빈 출력
```

`$n`을 Make가 변수로 해석합니다.

**해결**: `$$`로 이스케이프
```makefile
test:
	name=world; echo "Hello, $$name"
```

### 3. 자동 변수를 의존성 자리에 사용

```makefile
$@: main.c       # 동작 안 함
	gcc -c main.c -o $@
```

자동 변수는 *레시피 안*에서만 풀립니다. 타겟·의존성 줄에서는 빈 문자열이라 위 코드는 빈 타겟이 됩니다.

**해결**: *Secondary expansion*(`.SECONDEXPANSION`)을 쓰면 의존성 줄에서도 자동 변수를 쓸 수 있지만, 진입 장벽이 높습니다. 보통은 *명시적 변수*로 풀어 둡니다.

```makefile
TARGET := main.o
$(TARGET): main.c
	gcc -c main.c -o $@
```

### 4. `+=`로 종류가 섞임

```makefile
SOURCES = $(wildcard *.c)
SOURCES += $(wildcard *.cpp)  # 여전히 `=` (재귀적)
```

위 코드는 *재귀적 변수*로 남아, 매번 `wildcard`를 다시 호출합니다. 디렉터리가 크면 성능 손해입니다.

**해결**: 처음부터 `:=`로 시작
```makefile
SOURCES := $(wildcard *.c)
SOURCES += $(wildcard *.cpp)  # 이제 `:=`
```

---

## 정리

- 변수 정의는 두 가지 모델: **`=`**(지연 확장)와 **`:=`**(즉시 확장). *명시적 이유가 없으면 `:=`*.
- **`?=`**: 미정의일 때만 채움. **`+=`**: 기존 값에 공백 두고 덧붙임. **`!=`**: 셸 명령 결과(4.0+).
- **자동 변수**: `$@`(타겟), `$<`(첫 의존성), `$^`(모든 의존성), `$?`(새것만), `$*`(stem, Ch 4).
- `$(@D)`·`$(@F)`로 경로를 디렉터리/파일 이름으로 쪼갠다.
- **표준 컴파일 변수**: `CC`/`CFLAGS`/`CPPFLAGS`/`LDFLAGS`/`LDLIBS` — 관용 순서를 따른다.
- **우선순위**: 명령줄 > Makefile > 환경 변수. `override`로 명령줄을 이길 수 있다.
- **디버깅**: `$(info ...)`, `make -p`, `make --debug=basic`.

## 다음 장 예고

[Ch 4: 패턴 규칙](/blog/tools/gnu-make/chapter04-pattern-rules)에서는 `%.o: %.c` 같은 한 줄로 *수십 개의 컴파일 규칙*을 대체합니다. 정적 패턴 규칙, 암시적 규칙의 검색 순서, 그리고 4.3에 도입된 grouped target(`&:`)까지 다룹니다.

## 참고 자료

- [GNU Make Manual — Using Variables](https://www.gnu.org/software/make/manual/html_node/Using-Variables.html)
- [GNU Make Manual — Automatic Variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html)
- [GNU Make Manual — Special Variables](https://www.gnu.org/software/make/manual/html_node/Special-Variables.html)
