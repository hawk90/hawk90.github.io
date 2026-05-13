---
title: "Ch 3: 변수와 자동 변수"
date: 2025-05-14T03:00:00
description: "Makefile 변수의 종류, 확장 방식, 그리고 강력한 자동 변수들."
tags: [make, build, Makefile, variables]
series: "GNU Make"
seriesOrder: 3
draft: false
---

## 왜 변수가 필요한가

Ch 1의 첫 Makefile을 다시 봅시다.

```makefile
hello: main.o hello.o
	gcc -o hello main.o hello.o

main.o: main.c hello.h
	gcc -c main.c

hello.o: hello.c hello.h
	gcc -c hello.c
```

`gcc`가 세 번 나옵니다. 나중에 `clang`으로 바꾸려면 세 군데를 모두 수정해야 합니다. 컴파일 옵션을 추가하려면? 역시 여러 군데를 고쳐야 합니다.

**변수**를 사용하면 이 반복을 없앨 수 있습니다.

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

이제 컴파일러를 바꾸려면 `CC = clang` 한 줄만 고치면 됩니다.

---

## 변수 기초

### 정의와 참조

```makefile
# 정의
MY_VAR = hello world

# 참조
test:
	echo $(MY_VAR)
	echo ${MY_VAR}    # 중괄호도 가능
```

변수는 `$(변수명)` 또는 `${변수명}`으로 참조합니다. 한 글자 변수는 `$X`로도 쓸 수 있지만, 명확성을 위해 항상 괄호를 쓰는 것이 좋습니다.

### 변수 이름 규칙

- 대소문자 구분: `CC`와 `cc`는 다른 변수
- 관례: 사용자 변수는 대문자, 내부용은 소문자
- 사용 가능 문자: 알파벳, 숫자, 밑줄

---

## 변수 할당 방식

Make는 네 가지 할당 연산자를 제공합니다. 동작 방식이 다르므로 상황에 맞게 골라 씁니다.

| 연산자 | 이름 | 동작 |
|--------|------|------|
| `=` | 재귀적 확장 | 사용할 때 확장 |
| `:=` | 단순 확장 | 할당할 때 확장 |
| `?=` | 조건부 할당 | 미정의일 때만 할당 |
| `+=` | 추가 | 기존 값에 덧붙임 |

### 재귀적 확장 (=)

```makefile
B = world
A = hello $(B)

test:
	@echo $(A)    # hello world
```

`A`를 참조할 때 `B`의 **현재 값**을 가져옵니다. 나중에 `B`가 바뀌면 `A`도 바뀝니다.

```makefile
B = world
A = hello $(B)
B = universe

test:
	@echo $(A)    # hello universe
```

**위험**: 자기 자신을 참조하면 무한 재귀가 됩니다.

```makefile
CFLAGS = $(CFLAGS) -Wall    # 오류! 무한 재귀
```

### 단순 확장 (:=)

```makefile
B = world
A := hello $(B)
B = universe

test:
	@echo $(A)    # hello world (할당 시점의 B 값)
```

`:=`는 할당하는 **그 순간에** 값이 결정됩니다. 이후 `B`가 바뀌어도 `A`는 변하지 않습니다.

자기 참조도 안전합니다.

```makefile
CFLAGS := -g
CFLAGS := $(CFLAGS) -Wall    # OK: CFLAGS = -g -Wall
```

**권장**: 대부분의 경우 `:=`를 사용하세요. 동작이 예측 가능하고 디버깅이 쉽습니다.

### 조건부 할당 (?=)

변수가 정의되지 않았을 때만 할당합니다.

```makefile
CC ?= gcc    # CC가 없으면 gcc로 설정
```

환경 변수나 명령줄에서 전달된 값을 기본값으로 덮어쓰지 않습니다.

```bash
CC=clang make    # CC는 clang
make             # CC는 gcc (기본값)
```

### 추가 (+=)

기존 값에 공백을 두고 덧붙입니다.

```makefile
CFLAGS := -g
CFLAGS += -Wall
CFLAGS += -O2
# CFLAGS = -g -Wall -O2
```

---

## 자동 변수

**자동 변수(automatic variables)**는 규칙마다 Make가 자동으로 설정하는 특수 변수입니다. 레시피 안에서만 사용할 수 있습니다.

| 변수 | 의미 | 예시 (`hello: main.o utils.o`) |
|------|------|--------------------------------|
| `$@` | 타겟 이름 | `hello` |
| `$<` | 첫 번째 의존성 | `main.o` |
| `$^` | 모든 의존성 (중복 제거) | `main.o utils.o` |
| `$+` | 모든 의존성 (중복 포함) | `main.o utils.o` |
| `$?` | 타겟보다 새로운 의존성들 | (변경된 파일만) |
| `$*` | 패턴의 stem | (Ch 4에서 설명) |

### $@ — 타겟

```makefile
hello: main.o hello.o
	gcc -o $@ main.o hello.o
# $@ = hello
```

### $< — 첫 번째 의존성

패턴 규칙에서 특히 유용합니다.

```makefile
main.o: main.c hello.h
	gcc -c $< -o $@
# $< = main.c, $@ = main.o
```

### $^ — 모든 의존성

```makefile
hello: main.o hello.o utils.o
	gcc -o $@ $^
# $^ = main.o hello.o utils.o
```

중복된 의존성은 한 번만 포함됩니다.

### $? — 새로운 의존성

타겟보다 수정 시간이 새로운 의존성만 포함합니다. 아카이브 갱신에 유용합니다.

```makefile
libfoo.a: foo.o bar.o baz.o
	ar rcs $@ $?
# $?는 libfoo.a보다 새로운 .o 파일들만
```

### 디렉터리/파일 분리

자동 변수에 `D`나 `F`를 붙이면 디렉터리 부분이나 파일 이름만 추출합니다.

| 변수 | 값 (`$@ = build/sub/main.o` 일 때) |
|------|-----------------------------------|
| `$(@D)` | `build/sub` |
| `$(@F)` | `main.o` |
| `$(<D)` | (첫 의존성의 디렉터리) |
| `$(<F)` | (첫 의존성의 파일 이름) |

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)           # 디렉터리 생성
	gcc -c $< -o $@
```

---

## 암시적 변수

Make에는 미리 정의된 변수들이 있습니다. 이 변수들을 활용하면 Make의 암시적 규칙과 잘 맞물립니다.

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `CC` | `cc` | C 컴파일러 |
| `CXX` | `g++` | C++ 컴파일러 |
| `CFLAGS` | (없음) | C 컴파일 플래그 |
| `CXXFLAGS` | (없음) | C++ 컴파일 플래그 |
| `CPPFLAGS` | (없음) | 전처리기 플래그 (-I, -D) |
| `LDFLAGS` | (없음) | 링커 플래그 |
| `LDLIBS` | (없음) | 링크할 라이브러리 |
| `AR` | `ar` | 아카이버 |
| `RM` | `rm -f` | 삭제 명령 |

```makefile
CC := gcc
CFLAGS := -Wall -g
LDLIBS := -lm

hello: main.o hello.o
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@
```

---

## 변수 우선순위

같은 변수가 여러 곳에서 정의되면 우선순위가 적용됩니다.

1. **명령줄** (`make CC=clang`) — 최우선
2. **Makefile**에서 정의
3. **환경 변수**

### 명령줄 변수

```bash
make CFLAGS="-O2 -DNDEBUG"
```

명령줄에서 전달한 변수는 Makefile의 할당보다 우선합니다. Makefile의 값을 강제하려면 `override`를 씁니다.

```makefile
override CFLAGS += -Wall    # 명령줄 CFLAGS에도 -Wall 추가
```

### 환경 변수

```bash
export DEBUG=1
make
```

```makefile
ifdef DEBUG
CFLAGS += -g -DDEBUG
endif
```

환경 변수는 Makefile 변수로 자동 가져와집니다. 단, Makefile에서 같은 변수를 정의하면 Makefile 값이 우선합니다.

---

## 실전 예시

이제까지 배운 것을 종합한 Makefile입니다.

```makefile
# === 설정 ===
CC := gcc
CFLAGS := -Wall -Wextra -std=c11
CPPFLAGS := -Iinclude
LDFLAGS :=
LDLIBS :=

# 디렉터리
SRCDIR := src
BUILDDIR := build

# 소스와 오브젝트
SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(SRCS:$(SRCDIR)/%.c=$(BUILDDIR)/%.o)

# 타겟
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

`wildcard`와 `$(SRCS:...=...)`는 Ch 5에서 자세히 다룹니다.

---

## 흔한 실수

### = vs := 혼동

```makefile
FILES = $(wildcard *.c)    # OK, 하지만...
FILES = $(FILES) extra.c   # 무한 재귀!
```

**해결**: `:=` 사용

```makefile
FILES := $(wildcard *.c)
FILES := $(FILES) extra.c  # OK
```

### 셸 변수와 Make 변수 혼동

```makefile
test:
	name=world; echo "Hello, $name"    # 빈 문자열
```

Make가 `$n`을 Make 변수로 해석합니다(정의 안 됨 → 빈 문자열).

**해결**: `$$`로 이스케이프

```makefile
test:
	name=world; echo "Hello, $$name"   # Hello, world
```

### 자동 변수를 의존성에서 사용

```makefile
# 동작하지 않음!
$@: main.c
	gcc -c main.c -o $@
```

자동 변수는 **레시피 안에서만** 유효합니다. 타겟이나 의존성에는 쓸 수 없습니다.

---

## 정리

- `=`는 사용 시점에, `:=`는 할당 시점에 값이 결정됩니다.
- `?=`는 미정의일 때만, `+=`는 기존 값에 추가합니다.
- **자동 변수**: `$@`(타겟), `$<`(첫 의존성), `$^`(모든 의존성), `$?`(새 의존성).
- `$(@D)`, `$(@F)`로 디렉터리와 파일 이름을 분리합니다.
- **암시적 변수**(`CC`, `CFLAGS` 등)를 사용하면 표준 규칙과 호환됩니다.
- 명령줄 변수가 Makefile 변수보다 우선합니다.

## 다음 장 예고

Ch 4에서는 패턴 규칙과 암시적 규칙을 다룹니다. `%.o: %.c` 같은 패턴으로 수십 개의 규칙을 한 줄로 대체하는 방법을 살펴봅니다.

## 참고 자료

- [GNU Make Manual - Using Variables](https://www.gnu.org/software/make/manual/html_node/Using-Variables.html)
- [GNU Make Manual - Automatic Variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html)
