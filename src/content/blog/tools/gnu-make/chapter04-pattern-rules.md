---
title: "Ch 4: 패턴 규칙과 암시적 규칙"
date: 2025-05-14T04:00:00
description: "반복을 줄이는 패턴 규칙과 Make의 내장 암시적 규칙."
tags: [make, build, Makefile, pattern]
series: "GNU Make"
seriesOrder: 4
draft: false
---

## 왜 패턴 규칙이 필요한가

Ch 3의 Makefile을 다시 봅시다. 오브젝트 파일마다 규칙이 반복됩니다.

```makefile
main.o: main.c hello.h
	gcc -c main.c -o main.o

hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o

utils.o: utils.c utils.h
	gcc -c utils.c -o utils.o
```

패턴이 보입니다. "`.c` 파일을 컴파일해서 `.o` 파일을 만든다." 파일이 10개, 100개가 되면 이 규칙을 일일이 쓸 수 없습니다.

**패턴 규칙(pattern rule)**은 이 반복을 한 줄로 줄입니다.

```makefile
%.o: %.c
	gcc -c $< -o $@
```

`%`는 **stem**이라 불리는 임의의 문자열에 매칭됩니다. `main.o`를 빌드할 때 `%`는 `main`이 되고, 의존성의 `%`도 같은 값으로 치환되어 `main.c`가 됩니다.

```
빌드 요청: main.o
    └── 패턴 규칙 %.o: %.c 적용
        └── % = "main"
        └── 타겟: main.o
        └── 의존성: main.c
        └── 레시피: gcc -c main.c -o main.o
```

---

## 패턴 규칙 문법

```makefile
%.타겟확장자: %.의존성확장자
	레시피
```

### 기본 예시

```makefile
# C 소스 → 오브젝트
%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# C++ 소스 → 오브젝트
%.o: %.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@

# 어셈블리 → 오브젝트
%.o: %.s
	$(AS) $(ASFLAGS) -o $@ $<
```

### 여러 의존성

패턴 규칙에도 여러 의존성을 지정할 수 있습니다.

```makefile
%.o: %.c %.h
	$(CC) -c $< -o $@
```

다만 이 방식은 각 `.c` 파일이 동일한 이름의 `.h`를 가질 때만 유효합니다. 실제로는 자동 의존성 생성을 사용합니다(Ch 6 참조).

### 디렉터리 포함

소스와 빌드 디렉터리를 분리하는 패턴입니다.

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@
```

`build/main.o`를 빌드하면 `src/main.c`를 컴파일합니다. `$(@D)`는 타겟의 디렉터리 부분(`build`)을 추출합니다.

---

## 자동 변수 복습

패턴 규칙에서 자주 쓰는 자동 변수를 정리합니다.

| 변수 | 의미 | `build/main.o: src/main.c` 예시 |
|------|------|--------------------------------|
| `$@` | 타겟 | `build/main.o` |
| `$<` | 첫 번째 의존성 | `src/main.c` |
| `$^` | 모든 의존성 | `src/main.c` |
| `$*` | stem (% 매칭 부분) | `main` |
| `$(@D)` | 타겟 디렉터리 | `build` |
| `$(@F)` | 타겟 파일명 | `main.o` |
| `$(<D)` | 첫 의존성 디렉터리 | `src` |
| `$(<F)` | 첫 의존성 파일명 | `main.c` |

### $* (stem) 주의사항

stem은 `%`에 매칭된 부분입니다. 디렉터리 구조에 따라 예상과 다를 수 있습니다.

```makefile
build/%.o: src/%.c
# build/sub/main.o 빌드 시
# % 매칭 = "sub/main"
# $* = sub/main
# $@ = build/sub/main.o
# $< = src/sub/main.c
```

stem에 경로가 포함될 수 있다는 점을 기억하세요.

---

## 암시적 규칙

Make에는 미리 정의된 **암시적 규칙(implicit rules)**이 있습니다. 별도로 규칙을 정의하지 않아도 동작합니다.

### 주요 암시적 규칙

| 타겟 | 의존성 | 명령 |
|------|--------|------|
| `%.o` | `%.c` | `$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@` |
| `%.o` | `%.cpp` | `$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@` |
| `%` | `%.o` | `$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@` |
| `%.o` | `%.s` | `$(AS) $(ASFLAGS) -o $@ $<` |

### 암시적 규칙 활용

암시적 규칙 덕분에 Makefile이 매우 간단해질 수 있습니다.

```makefile
CC := gcc
CFLAGS := -Wall -g

hello: main.o hello.o utils.o
```

이것만으로 동작합니다. `main.o`, `hello.o`, `utils.o`의 빌드 규칙은 Make가 암시적 규칙으로 처리합니다.

실행 결과:

```bash
$ make
cc -Wall -g -c -o main.o main.c
cc -Wall -g -c -o hello.o hello.c
cc -Wall -g -c -o utils.o utils.c
cc   main.o hello.o utils.o   -o hello
```

### 암시적 규칙 확인

Make의 내장 규칙 데이터베이스를 확인할 수 있습니다.

```bash
make -p | grep -A2 '%.o'
```

### 암시적 규칙 비활성화

특정 패턴의 암시적 규칙을 끄려면 빈 규칙을 정의합니다.

```makefile
%.o: %.c
# 빈 레시피 - C 파일의 암시적 규칙 비활성화
```

모든 암시적 규칙을 끄려면 다음 방법을 사용합니다.

```makefile
# 방법 1: SUFFIXES 비우기
.SUFFIXES:

# 방법 2: 명령줄 옵션
MAKEFLAGS += --no-builtin-rules
```

대규모 프로젝트에서는 암시적 규칙을 끄고 명시적으로 정의하는 것이 디버깅에 유리합니다.

---

## 정적 패턴 규칙

**정적 패턴 규칙(static pattern rule)**은 특정 타겟 목록에만 패턴을 적용합니다.

```makefile
타겟들: 타겟패턴: 의존성패턴
	레시피
```

### 예시

```makefile
OBJS := main.o hello.o utils.o

$(OBJS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

`$(OBJS)`에 나열된 파일에만 이 규칙이 적용됩니다. 다른 `.o` 파일(예: 테스트용 `test_main.o`)은 영향받지 않습니다.

### 일반 패턴 규칙과의 차이

```makefile
# 일반 패턴 규칙: 모든 .o 파일에 적용
%.o: %.c
	$(CC) -c $< -o $@

# 정적 패턴 규칙: OBJS에 있는 파일만
$(OBJS): %.o: %.c
	$(CC) -c $< -o $@
```

정적 패턴 규칙은 적용 범위를 명확히 제한할 때 유용합니다. 예를 들어 프로덕션 코드와 테스트 코드에 다른 컴파일 옵션을 적용할 수 있습니다.

```makefile
PROD_OBJS := main.o utils.o config.o
TEST_OBJS := test_main.o test_utils.o

$(PROD_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -O2 -c $< -o $@

$(TEST_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -g -O0 -c $< -o $@
```

---

## 패턴 규칙 검색 순서

Make가 타겟을 빌드할 때 규칙을 찾는 순서입니다.

1. **명시적 규칙**: 타겟과 정확히 일치하는 규칙
2. **정적 패턴 규칙**: 타겟 목록에 포함된 패턴 규칙
3. **일반 패턴 규칙**: `%`로 정의된 패턴 규칙
4. **암시적 규칙**: Make 내장 규칙

더 구체적인 규칙이 우선합니다.

```makefile
# 일반 패턴 규칙
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# 특정 파일에 대한 명시적 규칙 (우선)
config.o: config.c config.h defaults.h
	$(CC) $(CFLAGS) -DVERSION="1.0" -c $< -o $@
```

`config.o`는 명시적 규칙으로 빌드되고, 나머지 `.o` 파일은 패턴 규칙으로 빌드됩니다.

---

## 실전 예시

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -std=c11
CPPFLAGS := -Iinclude

SRCDIR := src
BUILDDIR := build

SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))

TARGET := myapp

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

# 정적 패턴 규칙: OBJS에만 적용
$(OBJS): $(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR) $(TARGET)
```

`$(OBJS): $(BUILDDIR)/%.o: $(SRCDIR)/%.c`는 정적 패턴 규칙입니다. `$(OBJS)` 목록에 있는 파일만 이 규칙을 따릅니다.

---

## 흔한 실수

### %가 여러 번 등장

```makefile
# 틀림: %가 타겟과 의존성에서 다른 값으로 매칭되지 않음
%.o: %_src.c
	gcc -c $< -o $@
```

`%`는 타겟과 의존성에서 **같은 값**으로 치환됩니다. 위 규칙은 `main.o: main_src.c`를 의미합니다.

### 디렉터리와 stem 혼동

```makefile
build/%.o: src/%.c

# build/sub/main.o 빌드 시
# $* = sub/main (main이 아님!)
```

중첩 디렉터리가 있으면 stem에 경로가 포함됩니다.

**해결**: `$(@F)`나 `$(notdir $*)`를 사용하세요.

### 패턴 규칙이 적용되지 않음

```makefile
%.o: %.c
	gcc -c $< -o $@

main.o: main.c header.h   # 레시피 없음
```

`main.o`에 명시적 규칙(레시피 없음)이 있으면 패턴 규칙이 적용되지 않습니다. 이 경우 의존성만 추가하고 싶다면 레시피를 비워 두지 말고 아예 생략하세요.

```makefile
%.o: %.c
	gcc -c $< -o $@

# 의존성만 추가 (규칙 없이)
main.o: header.h
```

이렇게 하면 패턴 규칙이 적용되면서 추가 의존성(`header.h`)도 인식됩니다.

### 암시적 규칙과 충돌

```makefile
CC := clang
# CFLAGS 설정 안 함

hello: main.o
# main.o는 암시적 규칙으로 빌드됨
# 하지만 CFLAGS가 비어 있어서 경고 없이 컴파일됨
```

암시적 규칙을 사용할 때는 관련 변수(`CC`, `CFLAGS`, `LDFLAGS` 등)를 설정했는지 확인하세요.

---

## 정리

- **패턴 규칙**은 `%` 와일드카드로 여러 파일에 같은 규칙을 적용합니다.
- `%`에 매칭된 부분을 **stem**이라 하고, `$*`로 참조합니다.
- Make에는 `.c` → `.o` 같은 **암시적 규칙**이 내장되어 있습니다.
- **정적 패턴 규칙**은 특정 타겟 목록에만 패턴을 적용합니다.
- 명시적 규칙 > 정적 패턴 > 일반 패턴 > 암시적 규칙 순으로 우선합니다.

## 다음 장 예고

Ch 5에서는 Make의 내장 함수를 다룹니다. `wildcard`, `patsubst`, `filter` 등 텍스트 처리 함수를 활용하여 더 유연한 Makefile을 작성합니다.

## 참고 자료

- [GNU Make Manual - Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Pattern-Rules.html)
- [GNU Make Manual - Implicit Rules](https://www.gnu.org/software/make/manual/html_node/Implicit-Rules.html)
