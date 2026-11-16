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

메모리 버그가 까다로운 이유는 *틀린 줄*과 *죽는 줄*이 다르기 때문입니다. 10바이트 버퍼의 11번째 바이트를 덮어써도 프로그램은 대개 멀쩡히 돌다가, 한참 뒤 전혀 상관없는 `free()`에서 죽습니다. Memcheck는 모든 접근을 그 자리에서 검사해서 *틀린 줄*을 보여 줍니다.

[Memcheck 매뉴얼 4.2절](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.errormsgs)은 보고 종류를 다음처럼 나눕니다. 오른쪽 칸은 이 글에서 실제로 받은 메시지입니다. 실행 환경은 [Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)과 같은 Valgrind 3.24.0, Debian 13 arm64, GCC 14.2.0입니다.

| 4.2절 | 종류 | 이 글에서 받은 첫 줄 |
| --- | --- | --- |
| 4.2.1 | Illegal read / write | `Invalid write of size 1`, `Invalid read of size 1` |
| 4.2.2 | 미초기화 값 사용 | `Conditional jump or move depends on uninitialised value(s)` |
| 4.2.3 | 시스템 호출의 미초기화·주소 불가 인자 | `Syscall param write(buf) points to uninitialised byte(s)` |
| 4.2.4 | 잘못된 free | (이 글에서는 돌리지 않음) |
| 4.2.5 | 할당·해제 함수 짝 불일치 | `Mismatched free() / delete / delete []` |
| 4.2.6 | src·dst 겹침 | `Source and destination overlap in memcpy(...)` |
| 4.2.7~4.2.9 | 수상한 크기, `realloc` 크기 0, 정렬값 오류 | (이 글에서는 돌리지 않음) |
| 4.2.10 | 메모리 누수 | `40 bytes in 1 blocks are definitely lost ...` |

미초기화 값과 접근 가능성을 *한 번에* 본다는 점이 Memcheck를 고르는 이유입니다. ASan은 *경계와 해제*를 보고, MSan은 *초기화*를 봅니다. 그런데 MSan은 Clang 전용이라 GCC 14.2.0은 `-fsanitize=memory`를 거부합니다. Memcheck는 *둘 다*를, *재컴파일 없이* 봅니다.

---

## 기본 호출

```bash
valgrind ./myapp
```

옵션을 안 주면 *Memcheck*가 기본 도구로 동작합니다. 접근 오류는 기본 실행에서도 바로 상세하게 보고합니다. 누수 쪽은 다릅니다. `--leak-check`의 기본값은 `summary`라서 누수 *총량*만 보여 주고, 누수를 에러로 세지도 않습니다.

```bash
valgrind --leak-check=full ./myapp
```

그래서 누수를 볼 때는 거의 언제나 위 줄을 씁니다. 다음 절에서 이유를 실제 출력으로 봅니다.

---

## 옵션 상세

### `--leak-check` — 누수 분석 수준

```bash
valgrind --leak-check=no ./myapp       # 종료 누수 검색을 하지 않음
valgrind --leak-check=summary ./myapp  # 기본값, 누수 요약
valgrind --leak-check=yes ./myapp      # full과 같음
valgrind --leak-check=full ./myapp     # 개별 누수의 할당 스택
```

[Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)의 `leak.c`(40바이트 누수 하나)를 세 수준으로 돌리면 차이가 분명합니다. 빈 `==pid==` 줄은 지웠습니다.

```text
$ valgrind --leak-check=no ./leak
==3530== HEAP SUMMARY:
==3530==     in use at exit: 40 bytes in 1 blocks
==3530==   total heap usage: 1 allocs, 0 frees, 40 bytes allocated
==3530== For a detailed leak analysis, rerun with: --leak-check=full
==3530== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
$ valgrind --leak-check=summary ./leak
...
==3533== LEAK SUMMARY:
==3533==    definitely lost: 40 bytes in 1 blocks
...
==3533== Rerun with --leak-check=full to see details of leaked memory
==3533== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
$ valgrind --leak-check=full ./leak
...
==3536== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==3536==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3536==    by 0x1087FF: main (leak.c:7)
...
==3536== ERROR SUMMARY: 1 errors from 1 contexts (suppressed: 0 from 0)
```

`summary`도 `definitely lost: 40 bytes`를 보여 주지만 `ERROR SUMMARY`는 `0 errors`입니다. [4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.leak-check)의 설명대로 누수가 *에러로 세어지는* 것은 `full`(또는 `yes`)일 때뿐입니다. 이 차이는 CI에서 결정적입니다. `--error-exitcode=1`을 줘도 `summary`에서는 누수가 있는 `leak`의 종료 코드가 0이었고, `full`에서는 1이었습니다.

### `--show-leak-kinds` — 누수 종류 필터

Memcheck는 누수를 *네 가지 종류*로 분류합니다(다음 [Ch 3](/blog/tools/debugging/valgrind/chapter03-leak-report)에서 상세).

- `definite` — 어떤 포인터도 가리키지 않는 블록입니다.
- `indirect` — definite 블록 안의 포인터만 가리키던 블록입니다.
- `possible` — 블록 *중간*을 가리키는 포인터(interior pointer)만 남은 블록입니다.
- `reachable` — 종료 시점에도 시작 주소를 가리키는 포인터가 남아 있는 블록입니다.

```bash
valgrind --leak-check=full --show-leak-kinds=all ./myapp   # 4종류 모두
valgrind --leak-check=full --show-leak-kinds=definite,possible ./myapp
```

기본값은 `definite,possible`입니다([4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.show-leak-kinds)). 여기서 놓치기 쉬운 점은 *indirect도 기본으로 숨겨진다*는 것입니다. 기본 출력에서는 definite 레코드의 `32 (16 direct, 16 indirect) bytes` 같은 괄호 숫자로만 드러나고, indirect 블록 자체의 레코드는 `all`을 켜야 보입니다(Ch 3).

### `--track-origins` — 미초기화 값의 *기원* 추적

```c title="test.c"
#include <stdio.h>
int main(void) {
    int x;
    if (x > 0) printf("positive\n");
    return 0;
}
```

기본 실행은 *어디서* 썼는지만 알려 줍니다.

```text
$ valgrind ./test
==3423== Conditional jump or move depends on uninitialised value(s)
==3423==    at 0x1087B8: main (test.c:4)
...
==3423== Use --track-origins=yes to see where uninitialised values come from
```

`--track-origins=yes`를 주면 *어디서 생겼는지*가 붙습니다.

```text
$ valgrind --track-origins=yes ./test
==3425== Conditional jump or move depends on uninitialised value(s)
==3425==    at 0x1087B8: main (test.c:4)
==3425==  Uninitialised value was created by a stack allocation
==3425==    at 0x1087A8: main (test.c:2)
```

기원 줄이 가리키는 곳은 `int x;`가 있는 3번 줄이 아니라 `int main(void) {`가 있는 2번 줄입니다. [4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.track-origins)이 설명하듯 스택에서 생긴 값은 "그 값을 할당한 *함수*까지만" 알려 주고, 위치는 보통 함수를 여는 중괄호입니다. 그래서 스택 기원이 나오면 그 함수의 지역 변수를 모두 확인합니다. 힙에서 생긴 값이면 해당 블록의 `malloc` 위치가 나옵니다(아래 `fwrite` 예).

**비용**: [Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)의 측정에서 같은 프로그램이 Memcheck 13.1×에서 `--track-origins=yes` 20.8×로 느려졌고, 최대 RSS는 약 101 MiB 늘었습니다. 매뉴얼도 "속도 절반, 메모리 최소 100MB 추가"라고 적습니다. 그래서 기본 실행에서 미초기화 경고가 나온 뒤에 켜는 편이 실용적입니다.

### `--errors-for-leak-kinds` — 누수를 *에러로 취급*

`full` 검색에서 에러로 세는 누수 종류의 기본값은 `definite,possible`입니다. 여기에 `--error-exitcode`의 기본값이 0이라는 점이 겹칩니다([2.7.3절](https://valgrind.org/docs/manual/manual-core.html#opt.error-exitcode)). 이 값을 바꾸지 않으면 Valgrind가 에러를 찾아도 프로그램 원래의 종료 코드를 그대로 돌려줍니다. CI에서 *누수가 있으면 빌드 실패*로 만들고 싶으면 다음처럼 씁니다.

```bash
valgrind --leak-check=full --error-exitcode=1 \
         --errors-for-leak-kinds=definite,indirect ./myapp
```

- `--error-exitcode=1` — 에러가 있으면 *비-0 종료*. CI 실패 트리거.
- `--errors-for-leak-kinds=...` — 어떤 누수 종류를 *에러로 간주*할지.

종료 코드가 실제로 어떻게 갈리는지 돌려 봤습니다. `cleanup`은 전역 포인터가 1024바이트를 잡고 있는, 곧 still reachable만 남는 프로그램입니다(Ch 3).

| 명령 | 종료 코드 |
| --- | ---: |
| `valgrind -q --leak-check=full --error-exitcode=1 ./leak` (definite 40 B) | 1 |
| `valgrind -q --leak-check=full --error-exitcode=1 ./cleanup` (reachable만) | 0 |
| `valgrind -q --leak-check=full --error-exitcode=1 --errors-for-leak-kinds=all ./cleanup` | 1 |
| `valgrind -q --leak-check=summary --error-exitcode=1 ./leak` | 0 |

### `--num-callers` — 스택 깊이

기본은 12 프레임입니다([2.7.3절](https://valgrind.org/docs/manual/manual-core.html#opt.num-callers)). `f15()`가 `f14()`를 부르고 … `f0()`이 `malloc(8)`을 부르는 `deep.c`로 확인했습니다.

```text
$ valgrind --leak-check=full ./deep
==3509== 8 bytes in 1 blocks are definitely lost in loss record 1 of 1
==3509==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3509==    by 0x1087B7: f0 (deep.c:3)
==3509==    by 0x1087CB: f1 (deep.c:4)
...
==3509==    by 0x1088C7: f10 (deep.c:4)
```

`malloc`을 포함해 정확히 12줄에서 잘려서, 누수를 만든 진입점 `main`이 보이지 않습니다. `--num-callers=20`을 주면 `f15`와 `main (deep.c:5)`까지 나옵니다.

```bash
valgrind --num-callers=20 ./myapp
```

2.7.3절은 같은 에러를 묶을 때(commoning up) 위쪽 네 프레임만 쓴다고 덧붙입니다. 깊이를 늘려도 에러가 묶이는 방식은 그대로이고 출력만 길어집니다. 누수 레코드를 묶는 기준은 이와 별도인 `--leak-resolution`입니다(Ch 3).

### `--suppressions` — 외부 라이브러리 우회

우리가 고칠 수 없는 라이브러리 안쪽의 보고를 숨깁니다.

```bash
valgrind --suppressions=valgrind.supp ./myapp
```

자세한 suppression 작성은 [Ch 5](/blog/tools/debugging/valgrind/chapter05-suppressions)에서 다룹니다.

### `--gen-suppressions` — Suppression 자동 생성

처음 suppression을 만들 때 도움이 됩니다.

```bash
valgrind --gen-suppressions=all ./myapp
```

`third_party_init()`이 `malloc(64)`를 돌려주고 아무도 해제하지 않는 `third.c`로 돌리면, 보고마다 *suppression 템플릿*이 함께 나옵니다.

```text
$ valgrind --leak-check=full --gen-suppressions=all ./third
==3514== 64 bytes in 1 blocks are definitely lost in loss record 1 of 1
==3514==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3514==    by 0x1087B7: third_party_init (third.c:2)
==3514==    by 0x1087CB: main (third.c:3)
==3514==
{
   <insert_a_suppression_name_here>
   Memcheck:Leak
   match-leak-kinds: definite
   fun:malloc
   fun:third_party_init
   fun:main
}
```

3.24.0에서 템플릿 줄에는 `==pid==` 접두사가 붙지 않으므로 그대로 복사할 수 있습니다. 이걸 `valgrind.supp`에 붙여 넣고, 이름을 정한 뒤 필요한 프레임만 남깁니다.

### `--xml` — 기계 판독 가능 출력

CI 시스템에서 *결과를 파싱*하고 싶을 때 씁니다.

```bash
valgrind --xml=yes --xml-file=valgrind.xml ./myapp
```

`offby1.c`(10바이트 블록의 `p[10]`에 쓰기)로 만든 파일의 주요 줄입니다. 사람용 텍스트 출력은 터미널에 나오지 않았습니다.

```text
$ grep -n -E "<protocolversion>|<tool>|<kind>|<what>|<fn>|<line>" vg.xml
5:<protocolversion>4</protocolversion>
...
17:<tool>memcheck</tool>
38:  <kind>InvalidWrite</kind>
39:  <what>Invalid write of size 1</what>
44:      <fn>main</fn>
47:      <line>4</line>
```

`<kind>`가 Ch 5의 suppression 종류와 비슷한 고정 이름이라, 스크립트에서 에러 종류별로 세기 쉽습니다.

### `--vgdb` — GDB 연동

Valgrind 분석 중에 *GDB로 끼어들기*입니다. 3.24.0에서 `--vgdb`의 기본값은 이미 `yes`이고, `--vgdb-error`의 기본값은 999999999라서 사실상 멈추지 않습니다([2.7.2절](https://valgrind.org/docs/manual/manual-core.html#manual-core.basicopts)). 첫 에러에서 멈추게 하려면 `--vgdb-error=1`만 주면 됩니다.

```bash
# 한 터미널
valgrind --vgdb=yes --vgdb-error=1 ./myapp

# 다른 터미널
gdb ./myapp
(gdb) target remote | vgdb
```

`offby1`로 돌렸을 때 Valgrind 쪽은 연결 방법을 안내하고, 에러를 보고한 뒤 멈춥니다.

```text
==3627== TO DEBUG THIS PROCESS USING GDB: start GDB like this
==3627==   /path/to/gdb ./offby1
==3627== and then give GDB the following command
==3627==   target remote | /usr/bin/vgdb --pid=3627
...
==3627== Invalid write of size 1
==3627==    at 0x108808: main (offby1.c:4)
...
==3627== (action on error) vgdb me ...
```

GDB 16.3에서 붙으면 에러를 낸 바로 그 명령에 서 있고, `monitor` 명령으로 Memcheck에 직접 질문할 수 있습니다. 아래는 같은 명령들을 `-batch`로 넘겨 돌린 출력입니다.

```text
$ gdb -q -batch -ex "target remote | vgdb" -ex "bt" -ex "info locals" -ex "print p" \
      -ex "monitor who_points_at 0x4a7f040" -ex "kill" ./offby1
...
0x0000000000108808 in main () at offby1.c:4
4	    p[10] = 'x';   // off-by-one
#0  0x0000000000108808 in main () at offby1.c:4
p = 0x4a7f040 ""
$1 = 0x4a7f040 ""
==3627== Searching for pointers to 0x4a7f040
==3627== *0x1fff0009e8 points at 0x4a7f040
 Address 0x1fff0009e8 is on thread 1's stack
 in frame #0, created by main (offby1.c:2)
```

`--vgdb-error=0`은 프로그램 시작 전부터 멈춥니다. 디버거 쪽은 [GDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)와 조합합니다.

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

가장 *풍부한 정보*를 출력합니다. 대신 Ch 1의 측정에서 이 조합의 핵심 비용인 `--track-origins=yes`만으로 Memcheck 대비 1.6배 느려졌습니다.

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

옵션이 없으면 접근 오류와 미초기화 값은 다 보고하지만, 누수는 요약만 나오고 에러로 세지 않습니다. 종료 코드도 프로그램 자신의 것입니다. 위 표처럼 `leak`은 누수가 있어도 0으로 끝납니다.

---

## 컴파일 옵션과의 관계

Valgrind는 *바이너리 위에서* 동작하므로 어떤 컴파일러 플래그로 빌드했든 실행됩니다. 하지만 *보고서의 품질*은 디버깅 정보와 최적화 수준에 달려 있습니다. 같은 `offby1.c`를 세 가지로 빌드해 보고서의 첫 프레임을 비교했습니다.

```bash
gcc -g -O0 offby1.c -o offby1          # 디버그 정보 있음
gcc -O0 offby1.c -o offby1_nog         # 디버그 정보 없음
strip -o offby1_strip offby1_nog       # 심볼까지 제거
```

| 빌드 | 첫 프레임 |
| --- | --- |
| `-g -O0` | `at 0x108808: main (offby1.c:4)` |
| `-O0` (`-g` 없음) | `at 0x108808: main (in /root/src/offby1_nog)` |
| `strip` | `at 0x108808: ??? (in /root/src/offby1_strip)` 다음 줄 `(below main) (libc_start_call_main.h:58)` |

`-g`가 없어도 심볼 테이블이 남아 있으면 함수 이름까지는 나오고, 줄 번호만 빠집니다. `???`는 심볼까지 지운 바이너리에서 나옵니다. 그래도 오류 종류와 주소, `malloc` 위치의 블록 크기는 그대로 보고됩니다.

최적화는 줄 번호보다 큰 문제를 만듭니다. 아래 `pick()`은 양수가 하나도 없으면 초기화하지 않은 `x`를 돌려줍니다.

```c title="optdead.c"
#include <stdio.h>
#include <stdlib.h>
__attribute__((noinline)) int pick(int* v, int n) {
    int x;                       // 초기화 없음
    for (int i = 0; i < n; i++) if (v[i] > 0) x = v[i];
    return x;
}
int main(int argc, char** argv) {
    int* v = calloc(4, sizeof *v);
    int r = pick(v, 4);
    if (argc > 1 && r > 0) puts("pos");
    free(v);
    return 0;
}
```

`-O0` 빌드는 `Conditional jump or move depends on uninitialised value(s)`를 `main (optdead.c:11)`에서 보고합니다. 같은 소스를 `-O2`로 빌드하면 `ERROR SUMMARY: 0 errors`입니다. 디스어셈블해 보면 GCC가 `pick()`의 결과 레지스터를 `mov w0, #0x0`으로 0부터 시작하게 만들어서, *바이너리에는 더 이상 미초기화 값이 없습니다*. Memcheck는 실행되는 기계어를 검사하므로 소스의 버그를 찾을 수 없습니다. 그래서 Memcheck용 빌드는 `-g -O0`(또는 `-O1`)으로 따로 만듭니다.

---

## 자주 보는 에러와 해결

### "still reachable: X bytes in Y blocks"

```text
==3736== LEAK SUMMARY:
==3736==    definitely lost: 0 bytes in 0 blocks
==3736==    indirectly lost: 0 bytes in 0 blocks
==3736==      possibly lost: 0 bytes in 0 blocks
==3736==    still reachable: 1,024 bytes in 1 blocks
```

`still reachable`은 종료 시점에도 *시작 주소를 가리키는 포인터가 남아 있는* 할당입니다. 위 출력은 전역 `g_config`가 `malloc(1024)` 결과를 잡고 있는 `cleanup.c`입니다. 해제하지 않았지만 누군가 들고 있어서 잃어버린 것은 아닙니다.

원인은 대개 다음 중 하나입니다.

- 전역 변수가 가리키는 메모리 (의도된 캐시)
- 정적 변수
- 라이브러리가 종료 때 정리하지 않는 내부 상태

판단 기준은 *개수가 늘어나는가*입니다. 종료 시 한 번 남는 캐시는 위험이 낮지만, 요청마다 도달 가능한 캐시가 커지면 서버에서는 누수와 같습니다. 정리하고 싶다면 `atexit()`에서 해제합니다. 같은 `cleanup.c`에 인자를 줘서 `atexit(cleanup_config)`를 등록하면 `All heap blocks were freed`가 나옵니다(Ch 3). CI에서는 앞 절의 표처럼 `--errors-for-leak-kinds`에 `reachable`을 넣지 않으면 실패로 세지 않습니다.

### "Conditional jump or move depends on uninitialised value(s)"

```c
int x;          // 초기화 없음
if (x > 0) {    // ❌ Memcheck 경고
    do_work();
}
```

앞 절의 `test.c`가 정확히 이 경우였습니다. `--track-origins=yes`로 *기원*을 추적하면 스택 변수는 함수 단위로, 힙 블록은 `malloc` 위치로 나옵니다.

```c
int x = 0;      // 또는
int x;
x = compute();  // 사용 전에 반드시 대입
```

### "Syscall param write(buf) points to uninitialised byte(s)"

미초기화 데이터가 커널로 나가는 경우입니다. 100바이트 스택 배열 중 첫 바이트만 채우고 파일에 씁니다.

```c title="uninit_write.c"
#include <stdio.h>
int main(void) {
    char buf[100];
    buf[0] = 'A';
    FILE* fp = fopen("/tmp/out.bin", "wb");
    if (!fp) return 1;
    fwrite(buf, 1, 100, fp);
    fclose(fp);
    return 0;
}
```

```text
$ valgrind --track-origins=yes ./uninit_write
==3439== Syscall param write(buf) points to uninitialised byte(s)
==3439==    at 0x49428DC: __internal_syscall_cancel (cancellation.c:64)
...
==3439==    by 0x492F1A7: fclose@@GLIBC_2.17 (iofclose.c:53)
==3439==    by 0x10887F: main (uninit_write.c:8)
==3439==  Address 0x4a7f261 is 1 bytes inside a block of size 4,096 alloc'd
==3439==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3439==    by 0x492EF27: _IO_file_doallocate (filedoalloc.c:101)
...
==3439==    by 0x493093B: fwrite (iofwrite.c:39)
==3439==    by 0x108877: main (uninit_write.c:7)
==3439==  Uninitialised value was created by a stack allocation
==3439==    at 0x108828: main (uninit_write.c:2)
```

읽을 거리가 세 가지입니다. 첫째, 보고 위치는 `fwrite`의 7번 줄이 아니라 `fclose`의 8번 줄입니다. stdio가 데이터를 4,096바이트 버퍼에 모았다가 `fclose`에서 `write(2)`를 부를 때 비로소 커널로 나가기 때문입니다. 둘째, `1 bytes inside`는 버퍼의 0번 바이트(`'A'`)는 정의돼 있고 1번부터 미정의라는 뜻입니다. 셋째, 기원은 `buf`를 가진 `main`입니다. 이런 바이트가 파일·소켓으로 나가면 스택에 남아 있던 다른 데이터가 함께 새어 나갈 수 있습니다.

해결: 사용 전 `memset(buf, 0, sizeof(buf))` 또는 `= {0}` 초기화, 아니면 실제로 채운 길이만 씁니다.

### "Invalid write of size N"

```c title="offby1.c"
#include <stdlib.h>
int main(void) {
    char* p = malloc(10);
    p[10] = 'x';   // off-by-one
    free(p);
    return 0;
}
```

```text
==3443== Invalid write of size 1
==3443==    at 0x108808: main (offby1.c:4)
==3443==  Address 0x4a7f04a is 0 bytes after a block of size 10 alloc'd
==3443==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3443==    by 0x1087F7: main (offby1.c:3)
```

`0 bytes after a block of size 10`이 *경계 침범*의 단서입니다. 접근 주소가 블록 끝에서 0바이트 떨어져 있다는 뜻이니, 정확히 한 칸 넘어선 것입니다. 해제된 블록에 접근하면 문구가 달라집니다. `free(p)` 뒤에 `p[4]`를 읽는 `uaf.c`의 보고입니다.

```text
==3447== Invalid read of size 1
==3447==    at 0x10880C: main (uaf.c:5)
==3447==  Address 0x4a7f044 is 4 bytes inside a block of size 10 free'd
==3447==    at 0x48884F8: free (vg_replace_malloc.c:989)
==3447==    by 0x108803: main (uaf.c:4)
==3447==  Block was alloc'd at
==3447==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3447==    by 0x1087F7: main (uaf.c:3)
```

`inside a block ... free'd`는 해제된 블록 안쪽이라는 뜻이고, 해제한 위치와 할당한 위치를 둘 다 보여 줍니다.

### "Mismatched free / delete / delete[]"

```cpp title="mismatch.cpp"
int main() {
    int* p = new int[10];
    delete p;   // delete[]가 맞음
    return 0;
}
```

C++에서 *할당 방식과 해제 방식이 맞지 않는* 경우입니다. 3.24.0은 이 한 줄에서 에러 두 개를 냈습니다.

```text
==3451== Mismatched new/delete size value: 4
==3451==    at 0x4889420: operator delete(void*, unsigned long) (vg_replace_malloc.c:1181)
==3451==    by 0x10888F: main (mismatch.cpp:3)
==3451==  Address 0x4de3080 is 0 bytes inside a block of size 40 alloc'd
==3451==    at 0x488722C: operator new[](unsigned long) (vg_replace_malloc.c:729)
==3451==    by 0x108877: main (mismatch.cpp:2)
==3451== Mismatched free() / delete / delete []
...
==3451== ERROR SUMMARY: 2 errors from 2 contexts (suppressed: 0 from 0)
```

첫 번째는 GCC가 `delete p`를 크기 인자가 있는 `operator delete(void*, unsigned long)`로 컴파일하면서 `sizeof(int)`인 4를 넘겼는데, 블록은 40바이트라는 지적입니다. 4.1절이 "크기·정렬 인자를 받는 할당·해제 함수의 값이 맞지 않을 때도 보고한다"고 적은 항목입니다. 두 번째가 고전적인 `new[]`/`delete` 짝 불일치입니다.

해결: `new[]` ↔ `delete[]`, `new` ↔ `delete`, `malloc` ↔ `free`. C++에서는 `std::unique_ptr<int[]>`나 `std::vector`로 짝 맞추기를 컴파일러에 맡깁니다.

### "Source and destination overlap in memcpy"

```c
char s[32] = "abcdefghijklmnop";
memcpy(s + 2, s, 10);   // 겹치는 영역
```

```text
==3455== Source and destination overlap in memcpy(0x1fff0009d2, 0x1fff0009d0, 10)
==3455==    at 0x4890950: __GI_memcpy (vg_replace_strmem.c:1151)
==3455==    by 0x108837: main (overlap.c:5)
ababcdefghijmnop
```

이 실행에서는 결과 문자열이 우연히 `memmove`와 같게 나왔지만, 겹치는 `memcpy`는 C 표준에서 정의되지 않은 동작입니다. 겹칠 수 있으면 `memmove`를 씁니다.

---

## 성능 — *왜 이렇게 느린가*

Memcheck는 실행되는 모든 명령에 검사 코드를 붙입니다. [4.5절](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.machine)에 따르면 메모리의 각 바이트에는 값이 정의됐는지를 나타내는 V 비트 8개와 접근해도 되는지를 나타내는 A 비트 1개가 따라다니고, CPU 레지스터에도 V 비트가 있습니다. 값을 옮길 때마다 V 비트도 함께 옮기고, 주소를 쓸 때마다 A 비트를 확인합니다. 4.5.3절은 "압축을 많이 써서 메모리 오버헤드가 보통 25% 안팎"이라고 적습니다.

비유하자면 모든 상자에 "내용물 확인됨" 스티커(V 비트)와 "열어도 됨" 스티커(A 비트)를 붙여 두고, 상자를 옮길 때마다 스티커도 같이 옮겨 붙이는 창고입니다. 상자 하나 옮기는 일에 스티커 작업이 몇 배로 붙습니다.

[Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)의 측정에서 Memcheck는 계측 없는 Nulgrind(3.7×)보다 약 3.5배 더 느린 13.1×였고, `--track-origins=yes`는 20.8×였습니다. 느릴 때는 먼저 재현 입력을 줄이고, 줄인 입력에서도 같은 오류가 나는지 확인합니다.

---

## *닿지 않는 자리* — Valgrind의 한계

Memcheck도 *모든 메모리 버그*를 잡지는 못합니다. 아래 세 경우를 실제로 돌려 봤습니다.

### 스택 버퍼 오버플로

```c title="stackovf.c"
#include <stdio.h>
#include <string.h>
__attribute__((noinline)) void copy(const char* src) {
    char guard[16] = "guard";
    char buf[10];
    strcpy(buf, src);   // 12바이트를 10바이트 배열에
    printf("%s %s\n", buf, guard);
}
int main(void) { copy("hello world"); return 0; }
```

```text
$ valgrind ./stackovf
hello world guard
==3459== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
$ gcc -g -O0 -fsanitize=address stackovf.c -o stackovf_asan && ./stackovf_asan
==3495==ERROR: AddressSanitizer: stack-buffer-overflow on address 0xffffb340002a ...
WRITE of size 12 at 0xffffb340002a thread T0
    #0 0xffffb5815f68 in strcpy ../../../../src/libsanitizer/asan/asan_interceptors.cpp:563
    #1 0xaaaabdd00cbc in copy /root/src/stackovf.c:6
```

Memcheck는 0 errors, ASan은 `stack-buffer-overflow`입니다. 넘친 바이트가 같은 프레임의 다른 변수 자리에 떨어지면 그 주소는 여전히 "접근 가능"이기 때문입니다. [FAQ 4.6](https://valgrind.org/docs/manual/faq.html#faq.overruns)은 "Memcheck는 전역·스택 배열의 경계를 검사하지 않는다"고 명시합니다. 스택·전역 배열 오버플로는 ASan으로 잡습니다.

### 사라진 스택 프레임 가리키기

```c title="dangling.c"
#include <stdio.h>
__attribute__((noinline)) char* stack_allocated(void) {
    char local[16] = "abc";
    char* volatile p = local;
    return p;          // 스택 주소 반환
}
__attribute__((noinline)) void other(void) { volatile char pad[64]; pad[0] = 1; (void)pad; }
int main(void) {
    char* p = stack_allocated();
    other();
    p[0] = 'x';        // 이미 사라진 스택 프레임
    printf("%c\n", p[0]);
    return 0;
}
```

이 경우는 Memcheck가 *잡았습니다*.

```text
==3463== Invalid write of size 1
==3463==    at 0x108804: main (dangling.c:11)
==3463==  Address 0x1fff0009c0 is on thread 1's stack
==3463==  16 bytes below stack pointer
```

접근 시점에 그 주소가 스택 포인터 *아래*, 곧 아직 아무 프레임도 쓰지 않는 영역이었기 때문입니다. 반대로 접근이 다른 함수 *안에서* 일어나 그 함수의 프레임이 옛 `local` 자리를 덮고 있으면 결과가 다릅니다. `p`를 인자로 받아 자기 지역 배열 `frame[64]`를 만든 뒤 `p[0] = 'x'`를 쓰는 `dangling2.c`는 `ERROR SUMMARY: 0 errors`였습니다. 그 주소는 이제 살아 있는 프레임의 일부라 "접근 가능"하기 때문입니다. 결국 스택 포인터와의 위치 관계에 따라 갈립니다. GCC는 지역 변수 주소를 직접 `return`하면 `-Wreturn-local-addr` 경고를 내므로, 이 예제는 `volatile` 포인터로 경고를 피했습니다.

### 컴파일러 최적화로 사라진 코드

앞의 `optdead.c`가 이 경우입니다. `-O2`에서 GCC가 미초기화 경로를 0으로 바꿔 버리면 Memcheck가 볼 버그 자체가 바이너리에 없습니다. 그래서 *디버그 빌드*(`-O0`)를 따로 만들어 돌립니다.

---

## 실행 입력 — 정상 쓰기와 경계 밖 쓰기

마지막으로 같은 바이너리를 두 입력으로 돌려 `--error-exitcode`가 어떻게 동작하는지 봅니다. 인자가 있으면 `index`가 10이 되어 10바이트 블록 밖에 씁니다.

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

```text
$ cc -g -O0 bounds.c -o bounds
$ valgrind -q --error-exitcode=97 ./bounds; echo "exit=$?"
value=42
exit=0
$ valgrind -q --error-exitcode=97 ./bounds bad; echo "exit=$?"
==3517== Invalid write of size 1
==3517==    at 0x108884: main (bounds.c:8)
==3517==  Address 0x4a7f04a is 0 bytes after a block of size 10 alloc'd
==3517==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3517==    by 0x10883F: main (bounds.c:5)
==3517==
exit=97
$ valgrind -q ./bounds bad 2>/dev/null; echo "exit=$?"
exit=0
```

`-q`는 에러가 없으면 아무것도 출력하지 않게 합니다. 97은 프로그램 자신이 쓰지 않는 값으로 골라서, 종료 코드만 보고도 "Valgrind가 에러를 찾았다"와 "프로그램이 실패했다"를 구분할 수 있게 했습니다. `--error-exitcode`를 빼면 같은 경계 침범이 있어도 종료 코드는 0입니다.

## 정리

- Memcheck의 보고 종류는 매뉴얼 4.2절의 열 가지이고, 실무에서 가장 자주 보는 것은 invalid read/write, 미초기화 값, syscall 인자, 짝 불일치, 누수입니다.
- 기본 `--leak-check=summary`는 누수를 *에러로 세지 않습니다*. 누수를 CI에서 잡으려면 `--leak-check=full`이 필요합니다.
- `--track-origins=yes`의 스택 기원은 변수가 아니라 *함수*를 가리킵니다. 측정한 비용은 Memcheck 대비 1.6배 느림, RSS 약 +101 MiB였습니다.
- 황금 옵션: `--leak-check=full --show-leak-kinds=all --track-origins=yes`.
- CI 옵션: `--error-exitcode=1 --errors-for-leak-kinds=definite,indirect`. `--error-exitcode`의 기본값은 0입니다.
- `--num-callers` 기본 12는 깊은 호출에서 `main`까지 닿지 않을 수 있으니 늘립니다.
- Memcheck용 빌드는 `-g -O0`. `-O2`는 미초기화 버그를 바이너리에서 지워 버린 사례가 있었습니다.
- 한계: 스택·전역 배열 오버플로는 ASan으로. 사라진 스택 프레임 접근은 스택 포인터와의 위치에 따라 잡히기도, 놓치기도 합니다.

## 다음 장 예고

[Ch 3: Leak Report 읽기](/blog/tools/debugging/valgrind/chapter03-leak-report)에서는 *네 가지 누수 종류*(definite / indirect / possible / reachable)를 실제 출력으로 구분하고, 보고서의 *우선순위*를 결정하는 법을 다룹니다.

## 참고 자료

- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html) — 4.2 에러 메시지, 4.3 옵션, 4.5 V·A 비트
- [Valgrind Core Options](https://valgrind.org/docs/manual/manual-core.html#manual-core.options) — 2.7절
- [Memcheck Command-line Options](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options)
- [Valgrind FAQ 4.6](https://valgrind.org/docs/manual/faq.html#faq.overruns) — 스택·전역 배열 경계

## 관련 항목

- [Ch 1: Valgrind 도구 개요](/blog/tools/debugging/valgrind/chapter01-intro) — 이전 글. Memcheck·Helgrind·DRD의 역할 분담과 도구별 비용 측정
- [Ch 3: Valgrind Leak Report 분석](/blog/tools/debugging/valgrind/chapter03-leak-report) — 다음 글. `--leak-check=full`이 뱉은 네 가지 누수 분류 읽기
- [ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — Memcheck가 못 잡은 스택 오버플로를 잡는 쪽. 컴파일 옵션 비교에 좋습니다
- [GDB vs LLDB 분석](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — `--vgdb`로 붙일 디버거 쪽 준비
- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html) — 옵션의 정확한 의미와 기본값
