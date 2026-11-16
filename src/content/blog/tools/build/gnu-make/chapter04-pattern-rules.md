---
title: "Make 패턴 규칙과 암시적 규칙 — % 매칭 동작"
slug: "tools/build/gnu-make/chapter04-pattern-rules"
date: 2026-06-03T09:04:00
description: "% 한 글자로 100개의 규칙을 줄이는 패턴 규칙, Make 내장 암시적 규칙, 그리고 둘의 충돌·우선순위."
tags: [make, build, pattern]
series: "GNU Make"
seriesOrder: 4
draft: false
topics: ["tools", "tools/build"]
---

## 왜 패턴 규칙이 필요한가

[Ch 3](/blog/tools/build/gnu-make/chapter03-variables)에서 변수로 중복을 한 번 줄였습니다. 하지만 *오브젝트 파일마다 규칙을 한 번씩 적어야* 한다는 한계는 그대로입니다.

```makefile
main.o: main.c hello.h
	gcc -c main.c -o main.o

hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o

utils.o: utils.c utils.h
	gcc -c utils.c -o utils.o
```

여기에는 한눈에 보이는 *패턴*이 있습니다. "**`.c` 파일 하나로 같은 이름의 `.o` 파일 하나를 만든다.**" 사람은 파일이 100개여도 이 패턴을 바로 일반화하지만, 명시적 규칙으로 적으려면 규칙을 100개 써야 합니다.

**패턴 규칙**(pattern rule)은 이 일반화를 *Makefile의 언어로* 표현하는 도구입니다.

```makefile
%.o: %.c
	gcc -c $< -o $@
```

`%`는 *비어 있지 않은 임의의 문자열*에 매칭됩니다([매뉴얼 10.5.1절](https://www.gnu.org/software/make/manual/html_node/Pattern-Intro.html)). Make는 이 매칭을 다음과 같이 풉니다.

1. Make가 `main.o`를 만들 필요가 생깁니다.
2. 패턴 규칙 `%.o: %.c`를 시도합니다.
3. 타겟의 `%`는 `main`에 매칭됩니다. 이 부분을 stem이라 부릅니다.
4. 의존성의 `%`도 같은 `main`으로 치환해 `main.c`를 얻습니다.
5. 레시피의 `$<`, `$@`가 `main.c`, `main.o`로 풀립니다.
6. 최종 실행 명령은 `gcc -c main.c -o main.o`입니다.

stem은 자동 변수 `$*`로 가져올 수 있는데, 잠시 후 보겠습니다. 이 한 규칙이 *디렉터리 안의 모든 `.c → .o` 쌍*을 처리합니다.

---

## 패턴 규칙 문법

```makefile
%.타겟확장자: %.의존성확장자
	레시피
```

`%` 양쪽에 *같은 값*이 들어간다는 것이 핵심입니다. `%.o: %.c`는 "이름 X에 대해 X.c → X.o"라는 *함수 모양 정의*에 가깝습니다.

### 기본 예시 — 흔히 보는 변환들

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

# Protocol Buffers → C++ 코드 (보조 도구 호출)
%.pb.cc %.pb.h: %.proto
	$(PROTOC) --cpp_out=. $<
```

타겟이 여러 개인 *패턴* 규칙은 [Ch 2](/blog/tools/build/gnu-make/chapter02-rules)의 명시적 다중 타겟 규칙과 다르게 동작합니다. 10.5.1절에 따르면 패턴 규칙의 타겟이 여러 개면 Make는 레시피 한 번이 그 타겟을 모두 만든다고 봅니다. 그래서 위 `.proto` 규칙으로 `foo.pb.cc`와 `foo.pb.h`를 모두 요청해도 `protoc`은 한 번만 돌고, 레시피는 선언한 출력을 모두 갱신해야 합니다. 아래 "직접 확인" 절에서 실행 횟수를 셉니다.

### 디렉터리를 포함한 패턴

빌드 산물을 별도 디렉터리(`build/`)에 모을 때는 패턴에 경로를 그대로 적습니다.

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@
```

`build/main.o`를 만들 차례가 되면 Make는 `src/main.c`를 찾아 컴파일합니다. `$(@D)`는 [Ch 3](/blog/tools/build/gnu-make/chapter03-variables#디렉터리파일-이름-분리--d-f)에서 본 *자동 변수의 디렉터리 부분*입니다.

### 패턴 안의 `%`는 *하나*만 특별하다

```makefile
%.o: %.c            # OK: 타겟·의존성 한 자리씩
%-%.o: %-%.c        # 의도대로 동작하지 않음
```

두 번째 규칙은 에러가 나지 않습니다. 대신 첫 `%`만 와일드카드이고 두 번째 `%`는 글자 그대로의 `%`로 취급됐습니다. `a-b.c`가 있는 디렉터리에서 `make a-b.o`를 실행하면 이 규칙은 매칭되지 않아 내장 규칙(`cc -c -o a-b.o a-b.c`)이 대신 돌았고, 이름에 `%`가 들어간 `q-%.c`를 만들고 `make 'q-%.o'`를 실행하자 이 규칙이 `stem=[q]`로 매칭됐습니다. 두 자리 이상을 따로 매칭하려면 *정적 패턴 규칙*이나 함수로 타겟 목록을 만들어 씁니다.

---

## 자동 변수 — stem(`$*`) 포함

[Ch 3](/blog/tools/build/gnu-make/chapter03-variables#자동-변수--규칙마다-자동으로-채워지는-손잡이)에서 본 자동 변수에 패턴 규칙에서 특히 쓰는 `$*`(stem)이 더해집니다.

| 변수 | 의미 | `build/main.o: src/main.c` 예 |
|------|------|--------------------------------|
| `$@` | 타겟 | `build/main.o` |
| `$<` | 첫 의존성 | `src/main.c` |
| `$^` | 모든 의존성 | `src/main.c` |
| `$*` | stem (% 매칭 부분) | `main` |
| `$(@D)` | 타겟 디렉터리 | `build` |
| `$(@F)` | 타겟 파일명 | `main.o` |

### `$*`의 함정 — 중첩 디렉터리

`$*`은 "확장자를 뗀 파일 이름"이 *아닙니다*. *`%`가 실제로 매칭한 문자열*입니다. 디렉터리가 중첩되면 차이가 드러납니다.

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	@echo "stem = $*  notdir = $(notdir $*)  dir = $(dir $*)"
	gcc -c $< -o $@
```

```text
$ make build/sub/main.o
stem = sub/main  notdir = main  dir = sub/
gcc -c src/sub/main.c -o build/sub/main.o
```

패턴 `build/%.o`가 `build/sub/main.o`에 매칭되면 `%`는 `sub/main` 전체를 덮습니다. `$*`을 파일 이름으로 가정하고 다른 곳에 쓰면 슬래시가 끼어듭니다. 파일 이름만 필요하면 `$(notdir $*)`, 디렉터리만 필요하면 `$(dir $*)`을 씁니다.

---

## 암시적 규칙 — Make가 미리 알고 있는 변환

Make에는 *기본 규칙*이 내장돼 있고, 이를 *암시적 규칙*(implicit rules)이라 부릅니다. 사용자가 적지 않아도 `.c → .o`, `.cpp → .o`, `.o → 실행 파일` 같은 변환을 Make가 알고 있습니다. Ch 2에서 `make -p`로 센 것처럼 4.4.1의 내장 암시적 규칙은 92개였습니다.

### 주요 암시적 규칙

아래는 `make -p -f /dev/null`로 출력한 4.4.1 내장 정의를 펼친 것입니다. 이 규칙들은 `%.o: %.c` 모양의 패턴이 아니라 `.c.o:` 같은 *접미사 규칙*으로 들어 있습니다.

| 결과 | 입력 | 내장 레시피 | 레시피에 쓰인 변수의 정의 |
|------|------|------------|-----------------|
| `%.o` | `%.c` | `$(COMPILE.c) $(OUTPUT_OPTION) $<` | `COMPILE.c = $(CC) $(CFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c` |
| `%.o` | `%.cpp` | `$(COMPILE.cpp) $(OUTPUT_OPTION) $<` | `COMPILE.cpp = $(COMPILE.cc)`, `COMPILE.cc = $(CXX) $(CXXFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c` |
| `%.o` | `%.s` | `$(COMPILE.s) -o $@ $<` | `COMPILE.s = $(AS) $(ASFLAGS) $(TARGET_MACH)` |
| `%` (실행 파일) | `%.o` | `$(LINK.o) $^ $(LOADLIBES) $(LDLIBS) -o $@` | `LINK.o = $(CC) $(LDFLAGS) $(TARGET_ARCH)` |

`OUTPUT_OPTION`은 `-o $@`입니다. 이 표 덕분에 레시피가 하나도 없는 Makefile도 동작합니다.

```makefile
CC := gcc
CFLAGS := -Wall -g

hello: main.o hello.o utils.o
```

`main.c`·`hello.c`·`utils.c`가 있는 디렉터리에서 실행한 결과입니다.

```text
$ make
gcc -Wall -g   -c -o hello.o hello.c
gcc -Wall -g   -c -o main.o main.c
gcc -Wall -g   -c -o utils.o utils.c
gcc   hello.o main.o utils.o   -o hello
```

빈 `CPPFLAGS`, `TARGET_ARCH` 자리가 공백으로 남았습니다. 눈여겨볼 곳은 순서입니다. 규칙에는 `main.o hello.o utils.o` 순으로 적었는데 `hello.o`가 먼저 컴파일됐고 링크 줄에서도 맨 앞에 왔습니다. `hello`에 레시피가 없으니 Make가 `% : %.o` 모양의 내장 규칙을 찾았고, 그 규칙이 stem `hello`로 `hello.o`를 *첫 의존성*으로 추가한 뒤 명시한 의존성을 이어 붙였기 때문입니다. 10.5.3절이 "`$<`는 암시적 규칙이 추가한 첫 의존성"이라고 적은 동작이 여기서 드러납니다.

### 암시적 규칙이 보고 있는 변수

위 표의 레시피는 `$(CC)`, `$(CFLAGS)` 같은 표준 변수로 이뤄져 있습니다. `CC`에는 `cc`라는 내장 기본값이 있지만 `CFLAGS`·`CPPFLAGS`는 정의돼 있지 않습니다(Ch 3). 그래서 변수를 정하지 않고 내장 규칙에 맡기면 `cc -c -o main.o main.c`가 돌고, 경고·디버그 정보·최적화 옵션이 하나도 붙지 않습니다. 내장 규칙에 기대는 Makefile일수록 변수는 직접 정합니다.

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -O2
CPPFLAGS := -Iinclude
LDLIBS := -lm

hello: main.o hello.o utils.o
```

### 암시적 규칙 데이터베이스 보기

Make가 가진 규칙 전부를 보려면 `-p`(print database)를 씁니다.

```bash
make -p -f /dev/null 2>/dev/null | less
```

`-f /dev/null`은 현재 디렉터리의 Makefile 대신 빈 파일을 읽게 해서 내장 규칙과 변수만 남깁니다. C 컴파일 규칙은 접미사 규칙이므로 `%.o`가 아니라 `.c.o:`로 검색해야 찾을 수 있습니다.

### 암시적 규칙 끄기

내장 규칙은 의도하지 않은 매칭도 만듭니다. 바로 위의 `%-%.o` 실험에서 사용자 규칙이 매칭되지 않자 내장 `cc` 규칙이 조용히 대신 돌았습니다. 에러가 났다면 규칙이 틀렸다는 것을 바로 알았을 겁니다.

전체를 끄는 방법은 두 가지입니다.

```makefile
# 방법 1: 접미사 목록 비우기 (C·C++ 컴파일 규칙 등 접미사 규칙 차단)
.SUFFIXES:

# 방법 2: 명령줄 옵션을 MAKEFLAGS에 추가
MAKEFLAGS += --no-builtin-rules --no-builtin-variables
```

`.SUFFIXES:`만 쓰면 Ch 2에서 본 것처럼 9개의 패턴 규칙이 남습니다. `MAKEFLAGS += --no-builtin-rules`를 Makefile 안에 적은 경우에도 효과가 있어서, `main.c`만 있는 디렉터리에서 `make main.o`가 `No rule to make target 'main.o'`로 멈췄습니다. `--no-builtin-variables`(`-R`)는 `CC=cc` 같은 기본 변수까지 없앱니다. 이걸 넣은 Makefile에서 `$(CC)`는 빈 값, `$(origin CC)`는 `undefined`였습니다. NEWS(3.78)에 따르면 `-R`은 `-r`도 함께 켭니다. 두 옵션을 켜면 필요한 규칙과 도구 변수를 전부 직접 적어야 합니다.

특정 내장 규칙 하나만 끄려면 같은 타겟·의존성을 가진 *레시피 없는* 패턴 규칙을 적습니다([매뉴얼 10.5.6절](https://www.gnu.org/software/make/manual/html_node/Canceling-Rules.html)).

```makefile
%.o: %.c    # 레시피 없음 → 내장 .c → .o 규칙 취소
```

이 한 줄만 있는 Makefile에서 `make main.o`는 `No rule to make target 'main.o'`로 멈췄습니다. 접미사 규칙으로 정의된 내장 규칙도 같은 모양의 패턴 규칙으로 취소됩니다. 10.5.6절은 레시피를 *다르게* 주면 내장 규칙을 대체한다고도 적습니다.

---

## 정적 패턴 규칙 — 적용 범위를 한정하는 패턴

정적 패턴 규칙(*static pattern rule*)은 *특정 타겟 목록*에만 패턴을 적용합니다([매뉴얼 4.12절](https://www.gnu.org/software/make/manual/html_node/Static-Pattern.html)). 일반 패턴 규칙이 *매칭되는 모든 타겟*에 후보로 쓰이는 반면, 정적 패턴은 *명시한 타겟*에만 적용됩니다.

```makefile
타겟들: 타겟패턴: 의존성패턴
	레시피
```

### 예시 — 특정 오브젝트만 다른 옵션으로

```makefile
PROD_OBJS := main.o utils.o config.o
TEST_OBJS := test_main.o test_utils.o

# 프로덕션: 최적화
$(PROD_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -O2 -DNDEBUG -c $< -o $@

# 테스트: 디버그 + 커버리지
$(TEST_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -g -O0 --coverage -c $< -o $@
```

같은 일을 일반 패턴 규칙 두 개로 하려 하면 둘을 구분할 수 없습니다. `%.o: %.c` 규칙을 레시피만 다르게 두 번 적고 `make main.o`를 실행하면 두 번째 레시피(`second rule`)만 돌았습니다. 10.5.6절의 "같은 타겟과 의존성으로 새 패턴 규칙을 정의하면 이전 규칙을 대체한다"는 동작입니다. 정적 패턴은 *적용 범위를 명시*해 이 문제를 없앱니다.

### 일반 패턴 규칙과의 차이

| 측면 | 일반 패턴 `%.o: %.c` | 정적 패턴 `$(OBJS): %.o: %.c` |
|------|---------------------|-------------------------------|
| 적용 범위 | 매칭되는 *모든* `.o` 타겟의 후보 | `$(OBJS)`에 포함된 타겟만 |
| 적용 조건 | 타겟에 다른 레시피가 없고 의존성을 찾을 수 있을 때만 | 지정한 타겟에는 항상 적용 |
| 의존성 `a.c`가 없을 때 `make a.o` | 규칙을 건너뛰어 `No rule to make target 'a.o'` | `No rule to make target 'a.c', needed by 'a.o'` |

마지막 행은 두 규칙을 각각 `a.c` 없는 디렉터리에서 실행한 결과입니다. 정적 패턴은 "`a.o`는 `a.c`로 만든다"를 약속하므로 무엇이 빠졌는지 정확히 알려 줍니다. [매뉴얼 4.12.2절](https://www.gnu.org/software/make/manual/html_node/Static-versus-Implicit.html)은 정적 패턴의 장점으로, 이름 모양으로는 묶을 수 없는 파일 몇 개에만 다른 규칙을 줄 수 있다는 점과, 디렉터리에 어떤 파일이 있느냐에 따라 엉뚱한 암시적 규칙이 골라질 걱정이 없다는 점을 듭니다.

---

## 규칙 검색 순서 — 우선순위표

"왜 내 규칙이 안 먹히지?"라는 질문의 답은 Make가 *어떤 규칙을 먼저 고르는지*에 있습니다. [매뉴얼 10.8절](https://www.gnu.org/software/make/manual/html_node/Implicit-Rule-Search.html)의 알고리즘을 줄이면 이렇습니다.

1. 명시적 규칙이나 정적 패턴 규칙에 레시피가 있으면 그것을 씁니다.
2. 명시적 규칙에 레시피가 없으면(의존성만 있으면) 암시적 규칙을 검색합니다.
3. 패턴 규칙 후보 중 의존성이 존재하거나 만들 수 있는 것을 고릅니다. 사용자 규칙이 내장 규칙보다 앞서고, 여러 개가 남으면 *stem이 가장 짧은* 규칙, 그것도 같으면 먼저 정의된 규칙을 고릅니다(10.5.4절).
4. 만들 방법도 기존 파일도 없으면 `No rule to make target` 오류가 납니다.

stem 길이 규칙을 직접 확인했습니다. `%.o: %.c`와 `lib%.o: lib%.c`를 이 순서로 정의하고 `make libfoo.o`를 실행했습니다.

```text
$ make libfoo.o          # GNU Make 4.4.1
lib%.o stem=foo
$ /usr/bin/make libfoo.o # GNU Make 3.81
generic %.o stem=libfoo
```

4.4.1은 stem이 짧은 `lib%.o`(stem `foo`)를 골랐고, 3.81은 먼저 정의된 `%.o`(stem `libfoo`)를 골랐습니다. NEWS에 따르면 "가장 짧은 stem 우선"은 3.82에서 도입된 하위 호환 깨짐이고, 그 전에는 정의 순서를 따랐습니다. macOS 기본 `make`로 빌드하면 같은 Makefile이 다른 레시피를 실행할 수 있다는 뜻입니다.

명시적 레시피는 패턴보다 앞섭니다.

```makefile
# 일반 패턴
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# config.o만 다른 옵션
config.o: config.c config.h defaults.h
	$(CC) $(CFLAGS) -DVERSION="1.0" -c $< -o $@
```

```text
$ make main.o config.o
cc  -c main.c -o main.o
cc  -DVERSION="1.0" -c config.c -o config.o
```

`config.o`는 명시적 레시피를, `main.o`는 패턴 규칙을 썼습니다(`CC`·`CFLAGS`를 정하지 않아 `cc`와 빈 플래그로 풀렸습니다).

---

## `VPATH` / `vpath` — 소스 검색 경로

지금까지는 *소스가 Makefile과 같은 디렉터리에 있다고 가정*했습니다. 소스가 `src/`, `lib/`로 흩어져 있을 때 `%.c`를 *어디서 찾을지* 알려 주는 장치가 `VPATH`와 `vpath`입니다([매뉴얼 4.5절](https://www.gnu.org/software/make/manual/html_node/Directory-Search.html)).

### `VPATH` — 전역 검색 경로

```makefile
VPATH = src:lib

%.o: %.c
	gcc -c $< -o $@
```

`VPATH`는 *콜론*(또는 공백)으로 구분된 디렉터리 목록입니다. Make는 의존성 파일이 현재 디렉터리에 없으면 `VPATH`의 디렉터리를 순서대로 찾습니다. `src/main.c`와 `lib/utils.c`만 있는 디렉터리에서 실행했습니다.

```text
$ make main.o utils.o
gcc -c src/main.c -o main.o
gcc -c lib/utils.c -o utils.o
$ ls *.o
main.o  utils.o
```

`$<`이 *발견된 경로*(`src/main.c`)로 풀려서 컴파일러가 정확한 경로를 받습니다.

### `vpath` — 패턴별 검색 경로 (소문자)

대문자 `VPATH`가 *모든 파일*에 적용되는 반면, 소문자 `vpath`는 *패턴별*로 지정합니다.

```makefile
vpath %.c src
vpath %.h include
vpath %.cpp src:third_party/src
```

`%.c`는 `src/`에서만, `%.h`는 `include/`에서만 찾으므로, 다른 디렉터리에 같은 이름의 파일이 있어도 잘못 매칭되지 않습니다. `vpath`는 함수가 아니라 *지시자*(directive)라서 Makefile 최상위에 적습니다.

### 흔한 함정 — `$@`는 *발견 경로가 아니라 원래 타겟*

위 실행에서 `.o`가 `src/`나 `lib/`가 아니라 현재 디렉터리에 생긴 것을 봤습니다. `$<`은 검색된 경로지만 `$@`은 *요청한* `main.o` 그대로이기 때문입니다. 출력도 별도 디렉터리에 두고 싶다면 `VPATH`로는 부족하고 패턴에 경로를 적어야 합니다.

```makefile
# build/ 안에 출력하려면 패턴을 직접 적어야 함
build/%.o: src/%.c
	@mkdir -p build
	gcc -c $< -o $@
```

`VPATH`가 의존성을 *어디서 찾을지*만 바꾼다는 점을 기억하면, 같은 이름의 소스가 두 디렉터리에 있을 때 앞 디렉터리의 파일이 쓰인다는 것도 예측할 수 있습니다.

---

## Grouped Target — 한 명령이 여러 파일을 만들 때 (4.3+)

GNU Make 4.3(2020년 1월 19일 릴리스, NEWS)에 추가된 `&:` 문법입니다.

```makefile
# 다중 출력 패턴 규칙: 이 형태도 그룹으로 취급
%.pb.cc %.pb.h: %.proto
	$(PROTOC) --cpp_out=. $<

# 4.3+: 그룹임을 &:로 명시
%.pb.cc %.pb.h &: %.proto
	$(PROTOC) --cpp_out=. $<
```

`&:`로 묶인 출력은 *한 레시피 호출로 함께 만들어진다*는 선언입니다. 패턴 규칙은 콜론 종류와 관계없이 이미 그룹으로 취급되므로, `&:`가 실제로 동작을 바꾸는 곳은 *명시적* 규칙입니다. 4.3 이전에는 명시적 규칙에서 이를 표현할 방법이 없어 Ch 2에서 본 것처럼 레시피가 타겟마다 돌았습니다.

## 직접 확인 — 독립 출력과 그룹 출력

아래 Makefile은 이름이 고정된 명시적 grouped target입니다. 빈 디렉터리에서 시작합니다.

```makefile title="Makefile"
.DEFAULT_GOAL := all
.PHONY: all
all: left.txt right.txt
left.txt right.txt &: input.txt
	@printf 'RUN\n' >> calls.log
	cp input.txt left.txt
	cp input.txt right.txt
```

패턴 출력도 두 파일을 함께 갱신합니다. 이 파일은 `pattern.mk`로 저장합니다.

```makefile title="pattern.mk"
%.a %.b: %.in
	@printf 'PATTERN\n' >> pattern.log
	cp $< $*.a
	cp $< $*.b
```

입력은 같은 디렉터리에 저장합니다.

```text title="input.txt"
grouped input
```

실행 결과입니다.

```text
$ make -j2
cp input.txt left.txt
cp input.txt right.txt
$ cat calls.log
RUN
$ rm right.txt
$ make -j2
cp input.txt left.txt
cp input.txt right.txt
$ cat calls.log
RUN
RUN
$ cp input.txt x.in
$ make -f pattern.mk x.a x.b
cp x.in x.a
cp x.in x.b
make: Nothing to be done for 'x.b'.
$ cat pattern.log
PATTERN
```

`-j2`로 두 타겟을 병렬로 요청했는데도 레시피는 한 번 돌았고, `right.txt` 하나만 지웠을 때도 레시피 전체가 다시 돌아 `left.txt`까지 다시 복사했습니다. 패턴 규칙은 일반 콜론으로 적었는데도 `PATTERN`이 한 줄뿐이고, `x.b`는 `x.a`를 만들 때 이미 만들어졌다는 메시지가 나왔습니다.

비교를 위해 일반 콜론의 명시적 규칙 `l2.txt r2.txt: input.txt`로 같은 레시피를 `make -j2 -f indep.mk l2.txt r2.txt`로 돌리면 `cp` 네 줄이 출력되고 로그에는 `INDEP`가 두 줄 남았습니다. 레시피가 타겟마다 한 번씩, 병렬로 두 번 돌았습니다. 두 레시피가 같은 파일을 동시에 쓰는 이 상황이 `&:`가 없을 때 생기는 문제입니다.

## 실전 예시

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -std=c11 -O2
CPPFLAGS := -Iinclude

SRCDIR := src
BUILDDIR := build

SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))

TARGET := $(BUILDDIR)/myapp

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

# 정적 패턴 규칙: $(OBJS)에만 적용
$(OBJS): $(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR)
```

Ch 3과 같은 `src/main.c`·`src/hello.c`·`include/hello.h`로 실행했습니다.

```text
$ make
mkdir -p build
gcc -Iinclude -Wall -Wextra -g -std=c11 -O2 -c src/hello.c -o build/hello.o
gcc -Iinclude -Wall -Wextra -g -std=c11 -O2 -c src/main.c -o build/main.o
gcc  -o build/myapp build/hello.o build/main.o 
$ ./build/myapp
Hello, World!
```

이 Makefile은 다음을 만족합니다.

- `src/*.c` 파일을 `wildcard`로 모두 찾습니다.
- 출력은 `build/`에 모입니다.
- 정적 패턴이라 `$(OBJS)`에 든 오브젝트만 이 규칙을 받고, 다른 `.o`에는 영향을 주지 않습니다.
- 디렉터리 생성은 order-only라 두 번째 `make`가 재컴파일하지 않습니다.

`wildcard`, `patsubst`는 [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions)에서 상세히 다룹니다.

---

## 흔한 실수

### 1. `%`가 여러 번 등장

```makefile
%-%.o: %-%.c    # 두 번째 %는 글자 그대로
```

위 "패턴 안의 `%`" 절에서 본 것처럼 에러 없이 다른 것에 매칭되거나 아무것에도 매칭되지 않습니다. 두 자리를 따로 매칭하려면 정적 패턴이나 함수로 풀어야 합니다.

### 2. stem에 경로가 끼어들음

```makefile
build/%.o: src/%.c
# build/sub/main.o의 stem = "sub/main"
```

`src/$*.c`처럼 같은 구조의 경로를 다시 만드는 데는 문제가 없습니다. 하지만 `$*`을 *파일 이름*으로 쓰면 `sub/main`이 들어갑니다.

**해결**: 파일 이름이 필요하면 `$(notdir $*)`, 디렉터리는 `$(dir $*)`를 씁니다.

### 3. 레시피 없는 규칙과 명시적 빈 레시피 혼동

```makefile
%.o: %.c
	gcc -c $< -o $@

main.o: main.c header.h   # 레시피 없음
```

`main.o` 규칙은 레시피가 없으므로 의존성만 더하고, 레시피는 패턴 규칙에서 가져옵니다. 실행하면 `gcc -c main.c -o main.o`가 돕니다. 마지막 줄을 `main.o: main.c header.h ;`로 바꿔 *빈 레시피*를 주면 결과가 전혀 다릅니다. `main.o`가 없는데도 `make: 'main.o' is up to date.`가 출력되고 파일은 만들어지지 않았습니다. 빈 레시피는 "이 타겟은 아무것도 안 해도 된다"는 뜻이라 암시적 규칙 검색이 일어나지 않습니다([매뉴얼 5.9절](https://www.gnu.org/software/make/manual/html_node/Empty-Recipes.html)).

패턴 규칙은 그대로 쓰고 의존성만 추가하려면 레시피 없이 의존성만 적습니다.

```makefile
%.o: %.c
	gcc -c $< -o $@

# 의존성만 추가 (콜론 + 의존성, 레시피 없음)
main.o: header.h
```

같은 타겟의 의존성 줄이 *합쳐진다*는 Ch 2의 규칙을 그대로 쓴 것입니다.

### 4. 암시적 규칙에 의존하면서 변수를 잊음

```makefile
hello: main.o
# CC, CFLAGS 등 미설정
```

Make는 내장 규칙으로 빌드해 주지만, 위 "암시적 규칙이 보고 있는 변수" 절처럼 `cc`가 플래그 없이 돌아 경고도 디버그 정보도 붙지 않습니다.

**해결**: 최소한 `CC`, `CFLAGS`, `CPPFLAGS`, `LDLIBS`를 정합니다.

### 5. 4.3 이전에서 grouped target 가정

`&:`를 macOS의 `/usr/bin/make`(3.81)로 읽히면 두 가지 결과가 나왔습니다. 패턴 규칙 `%.a %.b &: %.in`은 `Makefile:1: *** mixed implicit and normal rules.  Stop.`으로 멈췄습니다. 더 위험한 쪽은 명시적 규칙 `left.txt right.txt &: input.txt`입니다. 3.81은 에러 없이 `&`를 세 번째 *타겟 이름*으로 읽어 `left.txt`, `right.txt`, `&`를 독립 타겟으로 만들었고, `make -p`에 `&: input.txt`가 나타났습니다. 이 경우 빌드는 성공하는 것처럼 보이지만 그룹 의미가 사라집니다. `&:`를 쓰는 Makefile은 `make --version`을 먼저 확인하거나, NEWS가 안내하는 대로 `.FEATURES`에 `grouped-target`이 있는지 검사합니다. 아래 검사는 4.4.1에서 통과하고, 3.81에서는 `Makefile:2: *** this Makefile needs GNU Make 4.3+ for grouped targets.  Stop.`으로 멈췄습니다.

```makefile
ifeq ($(filter grouped-target,$(.FEATURES)),)
$(error this Makefile needs GNU Make 4.3+ for grouped targets)
endif
```

---

## 정리

- **패턴 규칙** `%.o: %.c`은 같은 모양의 변환을 한 줄로 일반화합니다. 패턴에서 특별한 `%`는 첫 번째 하나뿐입니다.
- **stem** `$*`은 `%`가 매칭한 *실제 문자열*이고, 중첩 디렉터리에서는 경로가 포함됩니다.
- **암시적 규칙**은 Make가 내장한 변환 표입니다. C 컴파일 규칙은 접미사 규칙으로 들어 있고, `CC`/`CFLAGS` 같은 표준 변수를 읽습니다.
- **정적 패턴** `$(OBJS): %.o: %.c`은 지정한 타겟에만, 그리고 항상 적용됩니다.
- **검색 순서**는 명시적 레시피 → 패턴 규칙(stem이 짧은 쪽, 3.82+) → 내장 규칙입니다. 3.81은 정의 순서를 따랐습니다.
- **Grouped target** `&:` (4.3+)은 *한 명령이 여러 출력*을 만드는 명시적 규칙에 씁니다. 3.81은 이를 에러 없이 잘못 읽을 수 있습니다.
- 내장 규칙을 끄려면 `.SUFFIXES:`, `-r`, `-R`, 또는 레시피 없는 같은 모양의 패턴 규칙을 씁니다.

## 다음 장 예고

[Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions)에서는 `wildcard`, `patsubst`, `filter`, `foreach`, `shell` 같은 Make의 내장 함수들을 다룹니다. 파일 목록과 플래그를 텍스트 처리로 만들어 내는 도구들입니다.

## 참고 자료

- [GNU Make Manual — Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Pattern-Rules.html) — 10.5절.
- [GNU Make Manual — Static Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Static-Pattern.html) — 4.12절.
- [GNU Make Manual — Implicit Rules](https://www.gnu.org/software/make/manual/html_node/Implicit-Rules.html) — 10장. 10.8절 검색 알고리즘 포함.
- [GNU Make 4.3 Release Notes](https://lists.gnu.org/archive/html/info-gnu/2020-01/msg00004.html) — grouped target 포함

## 관련 항목

- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 패턴 규칙 레시피를 떠받치는 `$@`·`$<`와 `CC`/`CFLAGS` 표준 어휘.
- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 실전 예시의 `wildcard`·`patsubst`로 타겟 목록 자체를 만드는 방법.
- [Ch 2: 규칙](/blog/tools/build/gnu-make/chapter02-rules) — 다중 타겟이 독립 규칙으로 펼쳐지는 이유와 grouped target `&:`의 배경.
- [CMake Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 파일별 규칙 대신 타겟에 소스를 등록하고 컴파일 규칙은 생성기에 맡기는 방식.
- [Makefile Tutorial by Example](https://makefiletutorial.com/) — 패턴 규칙·자동 변수 예제가 많은 입문서.
