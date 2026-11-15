---
title: "Valgrind Memcheck 실전 — 메모리 오류 탐지 워크플로"
slug: "tools/debugging/valgrind/chapter02-memcheck"
date: 2026-05-28T09:02:00
description: "Memcheck의 모든 핵심 옵션 — leak-check, track-origins, error-limit, 그리고 비용 vs 정확도 트레이드오프."
tags: [Valgrind, Memcheck, Debugging, C, cpp]
series: "Valgrind"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

## Memcheck가 잡는 것

Memcheck는 *여섯 종류*의 메모리 버그를 추적합니다.

1. **Illegal read/write** — 해제된 메모리·경계 밖 접근.
2. **Uninitialized value 사용** — `malloc()`으로 받은 메모리를 초기화 없이 사용.
3. **Memory leak** — alloc 후 free 안 함.
4. **Mismatched alloc/free** — `malloc + delete`, `new + free` 등.
5. **Overlapping memcpy** — `memcpy`의 src와 dst가 겹침.
6. **잘못된 시스템 호출 인자** — write()에 미초기화 데이터를 넘기거나 read()에 쓰기 불가능한 버퍼를 넘기는 등의 오류입니다. 읽기용 출력 버퍼는 read 이전에 초기화될 필요가 없습니다.

미초기화 값과 접근 가능성 검사를 함께 제공한다는 점이 선택 이유가 될 수 있습니다. ASan은 *경계와 해제*를 보고, MSan(Clang only)은 *초기화*를 봅니다. Memcheck는 *둘 다*. 그것도 *재컴파일 없이*.

---

## 기본 호출

```bash
valgrind ./myapp
```

옵션을 안 주면 *Memcheck*가 기본 도구로 동작합니다. 기본 실행에서도 발견한 접근 오류는 상세하게 보고합니다. 종료 누수 검사의 기본값이 summary이며 full로 개별 누수의 할당 스택을 확인합니다.

```bash
valgrind --leak-check=full ./myapp
```

위 줄이 *실무에서 가장 자주 보는* Valgrind 호출입니다.

---

## 옵션 상세

### `--leak-check` — 누수 분석 수준

```bash
valgrind --leak-check=no ./myapp       # 종료 누수 검색을 하지 않음
valgrind --leak-check=summary ./myapp  # 기본값, 누수 요약
valgrind --leak-check=yes ./myapp      # full과 같음
valgrind --leak-check=full ./myapp     # 개별 누수의 할당 스택
```

**`--leak-check=full`**이 거의 항상 정답입니다. 누수가 *어디서 발생했는지* 모르면 디버깅이 안 됩니다.

### `--show-leak-kinds` — 누수 종류 필터

Memcheck는 누수를 *네 가지 종류*로 분류합니다 (다음 [Ch 3](/blog/tools/debugging/valgrind/chapter03-leak-report)에서 상세).

- `definite` — 진짜 잃어버린 메모리. 가장 심각.
- `indirect` — definite가 가리키던 자식 할당.
- `possible` — *포인터 산술* 등으로 가리키는 자리가 애매한 할당.
- `reachable` — 종료 시점에 *살아 있는 포인터가 가리키는* 할당. 정적 캐시 같은 의도된 자리.

```bash
valgrind --leak-check=full --show-leak-kinds=all ./myapp   # 4종류 모두
valgrind --leak-check=full --show-leak-kinds=definite,possible ./myapp
```

기본은 `definite,possible`. `all`을 켜면 *reachable까지* — 정적 캐시·전역 객체로 인한 *합법 누수*까지 모두 보입니다.

### `--track-origins` — 미초기화 값의 *기원* 추적

```c
int x;
if (x > 0) { /* ... */ }   // Memcheck: Conditional jump depends on uninitialized value
```

이 보고서를 받았을 때 *어디서* `x`가 초기화 안 됐는지 알고 싶습니다. `--track-origins=yes`가 답입니다.

```bash
valgrind --track-origins=yes ./myapp
```

```text
Conditional jump or move depends on uninitialised value(s)
   at 0x40115E: main (test.c:5)
 Uninitialised value was created by a stack allocation
   at 0x401149: main (test.c:3)
```

`Uninitialised value was created by ...`이 추가됩니다. 정확히 *어느 변수 선언*이 초기화를 빠뜨렸는지 알려 줌.

**비용**: 실행 시간과 메모리 비용이 추가됩니다. 해당 입력에서 측정합니다. 일반적으로 *기본 실행에서 미초기화 경고가 나왔을 때만* 켭니다.

### `--errors-for-leak-kinds` — 누수를 *에러로 취급*

full 검색에서 기본적으로 definite,possible 누수를 에러로 셉니다. 다만 error-exitcode의 기본값이 0이라, 이 설정을 바꾸지 않으면 도구가 에러를 발견해도 원래 프로그램의 종료 코드를 유지합니다. CI에서 *누수가 있으면 빌드 실패*로 만들고 싶으면:

```bash
valgrind --leak-check=full --error-exitcode=1 \
         --errors-for-leak-kinds=definite,indirect ./myapp
```

- `--error-exitcode=1` — 에러가 있으면 *비-0 종료*. CI 실패 트리거.
- `--errors-for-leak-kinds=...` — 어떤 누수 종류를 *에러로 간주*할지.

이 조합이 *CI 통합의 표준*입니다.

### `--num-callers` — 스택 깊이

기본은 12 프레임. 깊은 호출 체인에서는 부족할 수 있습니다.

```bash
valgrind --num-callers=50 ./myapp
```

너무 크게 하면 출력이 길어집니다. 보통 20~30이 적절.

### `--suppressions` — 외부 라이브러리 우회

`OpenSSL`, `glibc`, `Qt` 같은 라이브러리에서 *우리가 못 고치는 자리*를 무시합니다.

```bash
valgrind --suppressions=valgrind.supp ./myapp
```

자세한 suppression 작성은 [Ch 5](/blog/tools/debugging/valgrind/chapter05-suppressions)에서.

### `--gen-suppressions` — Suppression 자동 생성

처음 suppression을 만들 때 도움됩니다.

```bash
valgrind --gen-suppressions=all ./myapp
```

각 보고서마다 *suppression 템플릿*을 함께 출력합니다.

```text
{
   <insert_a_suppression_name_here>
   Memcheck:Leak
   match-leak-kinds: definite
   fun:malloc
   fun:third_party_init
   fun:main
}
```

이걸 *복사해* `valgrind.supp`에 붙여 넣고, 이름을 정한 뒤 적절히 좁힙니다.

### `--xml` — 기계 판독 가능 출력

CI 시스템에서 *결과를 파싱*하고 싶을 때.

```bash
valgrind --xml=yes --xml-file=valgrind.xml ./myapp
```

XML로 떨어져 *Jenkins / GitLab CI* 등이 파싱해 *대시보드에 표시*. 대규모 프로젝트에서 유용.

### `--vgdb=yes` — GDB 연동

Valgrind 분석 중에 *GDB로 끼어들기*. 에러 발생 시 *디버거에서 stop*.

```bash
# 한 터미널
valgrind --vgdb=yes --vgdb-error=1 ./myapp

# 다른 터미널
gdb ./myapp
(gdb) target remote | vgdb
```

위 설정은 첫 에러에서 기다립니다. --vgdb-error=0은 프로그램 시작 전에도 기다리는 별도 선택입니다. [GDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)와 조합.

---

## 추천 옵션 묶음

### 일상 사용

```bash
valgrind \
  --leak-check=full \
  --show-leak-kinds=all \
  --track-origins=yes \
  --num-callers=20 \
  ./myapp
```

가장 *풍부한 정보*를 출력. 느리지만 디버깅 효율 최고.

### CI 통합

```bash
valgrind \
  --leak-check=full \
  --show-leak-kinds=definite,indirect,possible \
  --error-exitcode=1 \
  --errors-for-leak-kinds=definite,indirect \
  --suppressions=tests/valgrind.supp \
  ./myapp
```

- 비-0 종료로 CI 실패 트리거.
- Suppression으로 *알려진 누수* 무시.
- Possible/reachable은 *보고만* 하고 빌드 실패 안 시킴.

### 빠른 한 번 보기

```bash
valgrind ./myapp
```

옵션 없이 — 메모리 오류의 *대략적 존재*만 확인. 실행 시간은 입력과 프로그램에 따라 달라집니다. 기본 호출이 CI 실패 종료 코드까지 설정하는 것은 아닙니다.

---

## 컴파일 옵션과의 관계

Valgrind는 *바이너리 위에서* 동작하므로 *컴파일 옵션과 직접적으로 무관*합니다. 하지만 *디버깅 정보*에는 의존합니다.

```bash
# 좋은 컴파일 — Valgrind에 필요한 정보 포함
gcc -g -O0 main.c -o myapp     # 권장: 디버그 정보 + 최적화 없음

# 나쁜 컴파일 — 디버깅이 어려워짐
gcc main.c -o myapp            # 디버그 정보 없음 → 줄 번호 안 보임
gcc -O2 main.c -o myapp        # 최적화 → 줄 번호가 부정확
```

소스 파일·줄 번호가 필요하면 -g 등 디버그 정보를 준비합니다. 디버그 정보 없이도 검사는 실행되며, 남아 있는 심볼에 따라 함수명이 보일 수 있습니다.

```text
==12345== at 0x4012a3: ??? (in /path/to/myapp)
```

???는 누락·제거된 심볼, 미지원 디버그 형식, 스택 해석 실패 등의 원인을 나눠 조사합니다.

`-O0` 또는 `-O1`이 좋습니다. `-O2`/`-O3`은 *인라인이 많아져* 줄 번호가 부정확해집니다.

---

## 자주 보는 에러와 해결

### "still reachable: X bytes in Y blocks"

**LEAK SUMMARY:**

- definitely lost: 0 bytes in 0 blocks
- indirectly lost: 0 bytes in 0 blocks
- possibly lost: 0 bytes in 0 blocks
- still reachable: 280 bytes in 5 blocks

`still reachable`은 *살아 있는 포인터가 가리키는* 할당입니다. 종료 시점에 해제 안 됐지만, *누군가 들고 있어* 잃어버린 건 아닙니다.

원인:
- 전역 변수가 가리키는 메모리 (의도된 캐시).
- 정적 변수.
- `atexit()` 핸들러가 사용 중인 메모리.

판단: reachable만으로 무해하다고 결론 내리지 않습니다. 반복 요청마다 도달 가능한 캐시가 계속 커지는지, 종료 시에만 보존하는지 확인해 CI 정책을 정합니다. 정말 정리하고 싶다면 `atexit()`에서 해제, 또는 `--errors-for-leak-kinds`에 reachable 포함 안 함.

### "Conditional jump or move depends on uninitialised value(s)"

```c
int x;          // 초기화 없음
if (x > 0) {    // ❌ Memcheck 경고
    do_work();
}
```

`--track-origins=yes`로 정확한 *기원* 추적. 대부분은 *변수 선언 시 초기화 빠뜨림*.

```c
int x = 0;      // 또는
int x;
x = compute();  // 사용 전에 반드시 대입
```

### "Use of uninitialised value of size N"

```c
char buf[100];          // 초기화 없음
fwrite(buf, 1, 100, fp);  // ❌ 미초기화 메모리를 파일에 씀
```

위와 비슷하지만 *직접 사용*이 아니라 *시스템 호출 인자*로 전달. 보안 사고로도 이어집니다 (메모리에 다른 곳의 비밀 정보가 남아 있을 수 있어).

해결: 사용 전 `memset(buf, 0, sizeof(buf))` 또는 `= {0}` 초기화.

### "Invalid write of size N"

```c
char* p = malloc(10);
p[10] = 'x';   // ❌ off-by-one
free(p);
```

```text
==12345== Invalid write of size 1
==12345==    at 0x10918A: main (main.c:5)
==12345==  Address 0x4a0c04a is 0 bytes after a block of size 10 alloc'd
```

`0 bytes after a block`이 *경계 침범*의 단서. 다른 변종:
- `N bytes after` — 접근 시작 주소와 할당 끝 사이의 거리입니다. 실제 접근 폭도 함께 확인합니다.
- `N bytes inside` — 블록 안쪽이지만 *해제된 메모리*.

### "Mismatched free / delete / delete[]"

```cpp
int* p = new int[10];
delete p;              // ❌ delete[] 가 맞음
```

C++에서 *alloc 방식과 free 방식이 안 맞는* 경우. Sanitizer도 잡지만, 도구별 지원과 해당 실행의 보고를 확인합니다. 정확도의 일괄 우열을 가정하지 않습니다.

해결: `new[]` ↔ `delete[]`, `new` ↔ `delete`, `malloc` ↔ `free`. C++에서는 `std::unique_ptr`로 자동 해결.

---

## 성능 — *왜 이렇게 느린가*

Memcheck는 바이너리 명령을 VEX IR로 변환하고 메모리의 접근 가능성과 값의 정의 상태를 추적합니다. 다시 실행할 호스트 코드를 생성하며, 호스트가 언제나 x86인 것은 아닙니다. 메타데이터는 구현상 압축·최적화되므로 논리적 A/V 비트 수를 실제 메모리 비용과 동일시하지 않습니다.

track-origins는 미초기화 값의 기원 정보를 추가하며 실행·메모리 비용이 듭니다. 우선 재현 입력을 줄이고, 같은 오류가 유지되는지 확인합니다. 누수 summary/full과 origins 유무의 비용은 실제 입력으로 비교합니다.

---

## *닿지 않는 자리* — Valgrind의 한계

Memcheck도 *모든 메모리 버그*를 잡지는 못합니다.

### 스택 버퍼 오버플로

```c
char buf[10];
strcpy(buf, "hello world");   // 스택 오버플로
```

Valgrind는 *스택을 잘 추적하지 않습니다*. ASan은 잡고, Valgrind는 *못 잡는 경우가 많습니다*. 스택 오버플로는 Sanitizer로.

### Heap-after-stack 시나리오

```c
char* p = stack_allocated();   // 스택 메모리 반환
p[0] = 'x';                     // 이미 사라진 스택
```

`p`가 가리키던 스택 프레임이 *이미 해제*된 상태. 컴파일러가 이런 코드를 자주 잡지만, *런타임에 발견되면* Memcheck는 우연히 다른 데이터를 덮어쓰는 거라 *잘 잡지 못합니다*.

### 컴파일러 최적화로 사라진 코드

```c
int x = uninitialized_func();   // -O2가 사용처 없으면 호출도 제거
```

`-O2`로 컴파일러가 *코드를 변형*하면 Valgrind가 *원본 의도*를 못 봅니다. 그래서 *디버그 빌드* (`-O0`)가 권장.

---

## 실행 입력 — 정상 쓰기와 경계 밖 쓰기

다음 파일은 bad 인자 유무로 두 경로를 분리합니다. 현재 macOS 환경에서는 컴파일과 정상 경로만 실행했습니다. bad 분기의 Memcheck 보고·종료 코드는 지원되는 Linux에서 확인할 항목이며, 이 글의 형식 예시를 실측 로그로 바꾸지 않습니다.

```c title="bounds.c"
#include <stdio.h>
#include <stdlib.h>
int main(int argc, char** argv) {
    (void)argv;
    volatile unsigned char* bytes = malloc(10);
    if (!bytes) return 1;
    int index = argc > 1 ? 10 : 0;
    bytes[index] = 42;
    if (index == 0) printf("value=%u\n", (unsigned)bytes[0]);
    free((void*)bytes);
    return 0;
}
```

```bash
cc -g -O0 bounds.c -o bounds
valgrind --error-exitcode=97 ./bounds
valgrind --error-exitcode=97 ./bounds bad
```

정상 입력은 value=42, bad는 Invalid write of size 1을 기대합니다. 97은 이 예제에서 정한 도구 오류용 코드입니다. 프로그램 자신의 실패 코드와 함께 해석합니다.

## 정리

- Memcheck는 *6종 메모리 버그* — illegal R/W, uninit, leak, mismatch, overlap, syscall.
- *Uninitialized value 추적*은 Memcheck만의 강점 (Sanitizer로 MSan Clang only).
- 황금 옵션: `--leak-check=full --show-leak-kinds=all --track-origins=yes`.
- CI 옵션: `--error-exitcode=1 --errors-for-leak-kinds=definite,indirect`.
- 소스 위치를 읽으려면 디버그 정보를 준비하고 최적화 수준도 기록합니다.
- 한계: 스택 오버플로·heap-after-stack은 *Sanitizer가 더 잘 잡음*.

## 다음 장 예고

[Ch 3: Leak Report 읽기](/blog/tools/debugging/valgrind/chapter03-leak-report)에서는 *네 가지 누수 종류*(definite / indirect / possible / reachable)를 정확히 구분하고, 보고서의 *우선순위*를 결정하는 법을 다룹니다.

## 참고 자료

- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html)
- [Valgrind Core Options](https://valgrind.org/docs/manual/manual-core.html)
- [Memcheck Command-line Options](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options)

## 관련 항목

- [Ch 1: Valgrind 도구 개요](/blog/tools/debugging/valgrind/chapter01-intro) — 이전 글. Memcheck·Helgrind·DRD의 역할 분담
- [Ch 3: Valgrind Leak Report 분석](/blog/tools/debugging/valgrind/chapter03-leak-report) — 다음 글. `--leak-check=full`이 뱉은 네 가지 누수 분류 읽기
- [ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — Memcheck와 같은 오류를 재컴파일 방식으로 잡는 쪽. 컴파일 옵션 비교에 좋습니다
- [GDB vs LLDB 분석](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — `--vgdb=yes`로 붙일 디버거 쪽 준비
- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html) — 옵션의 정확한 의미와 기본값
