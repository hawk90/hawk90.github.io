---
title: "Ch 2: Memcheck 실전 사용"
date: 2026-05-15T02:00:00
description: "Memcheck의 모든 핵심 옵션 — leak-check, track-origins, error-limit, 그리고 비용 vs 정확도 트레이드오프."
tags: [Valgrind, Memcheck, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 2
draft: false
---

## Memcheck가 잡는 것

Memcheck는 *여섯 종류*의 메모리 버그를 추적합니다.

1. **Illegal read/write** — 해제된 메모리·경계 밖 접근.
2. **Uninitialized value 사용** — `malloc()`으로 받은 메모리를 초기화 없이 사용.
3. **Memory leak** — alloc 후 free 안 함.
4. **Mismatched alloc/free** — `malloc + delete`, `new + free` 등.
5. **Overlapping memcpy** — `memcpy`의 src와 dst가 겹침.
6. **잘못된 시스템 호출 인자** — `read()` 같은 시스템 호출에 미초기화 버퍼를 넘김.

이 중 *2번 uninitialized value*가 Memcheck의 *유일한 강점*입니다. ASan은 *경계와 해제*를 보고, MSan(Clang only)은 *초기화*를 봅니다. Memcheck는 *둘 다*. 그것도 *재컴파일 없이*.

---

## 기본 호출

```bash
valgrind ./myapp
```

옵션을 안 주면 *Memcheck*가 기본 도구로 동작합니다. 정상 종료 시 *요약*만 출력. 옵션을 더하면 *상세 보고*가 나옵니다.

```bash
valgrind --leak-check=full ./myapp
```

위 줄이 *실무에서 가장 자주 보는* Valgrind 호출입니다.

---

## 옵션 상세

### `--leak-check` — 누수 분석 수준

```bash
valgrind --leak-check=no       # 기본. 종료 시 요약만
valgrind --leak-check=summary  # 누수 개수만
valgrind --leak-check=yes      # = summary
valgrind --leak-check=full     # 각 누수의 스택 트레이스 포함
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

```
Conditional jump or move depends on uninitialised value(s)
   at 0x40115E: main (test.c:5)
 Uninitialised value was created by a stack allocation
   at 0x401149: main (test.c:3)
```

`Uninitialised value was created by ...`이 추가됩니다. 정확히 *어느 변수 선언*이 초기화를 빠뜨렸는지 알려 줌.

**비용**: *2~3× 더 느려집니다*. 일반적으로 *기본 실행에서 미초기화 경고가 나왔을 때만* 켭니다.

### `--errors-for-leak-kinds` — 누수를 *에러로 취급*

Memcheck는 기본적으로 *누수를 경고로*만 봅니다. 종료 코드는 0(성공). CI에서 *누수가 있으면 빌드 실패*로 만들고 싶으면:

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

```
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
valgrind --vgdb=yes --vgdb-error=0 ./myapp

# 다른 터미널
gdb ./myapp
(gdb) target remote | vgdb
```

*첫 에러에서 멈춰* 변수를 조사할 수 있습니다. [GDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)와 조합.

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

옵션 없이 — 메모리 오류의 *대략적 존재*만 확인. 빌드가 깨졌는지 안 깨졌는지 30초 안에 답 받음.

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

`-g`가 *필수*입니다. 없으면 보고서가 *주소만* 나옵니다.

```
==12345== at 0x4012a3: ??? (in /path/to/myapp)
```

`???`이 보이면 거의 `-g` 빠뜨린 것.

`-O0` 또는 `-O1`이 좋습니다. `-O2`/`-O3`은 *인라인이 많아져* 줄 번호가 부정확해집니다.

---

## 자주 보는 에러와 해결

### "still reachable: X bytes in Y blocks"

```
LEAK SUMMARY:
   definitely lost: 0 bytes in 0 blocks
   indirectly lost: 0 bytes in 0 blocks
     possibly lost: 0 bytes in 0 blocks
   still reachable: 280 bytes in 5 blocks
```

`still reachable`은 *살아 있는 포인터가 가리키는* 할당입니다. 종료 시점에 해제 안 됐지만, *누군가 들고 있어* 잃어버린 건 아닙니다.

원인:
- 전역 변수가 가리키는 메모리 (의도된 캐시).
- 정적 변수.
- `atexit()` 핸들러가 사용 중인 메모리.

해결: 거의 *문제 아닙니다*. CI에서는 무시. 정말 정리하고 싶다면 `atexit()`에서 해제, 또는 `--errors-for-leak-kinds`에 reachable 포함 안 함.

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

### "Invalid read of size N"

```c
char* p = malloc(10);
p[10] = 'x';   // ❌ off-by-one
free(p);
```

```
==12345== Invalid write of size 1
==12345==    at 0x10918A: main (main.c:5)
==12345==  Address 0x4a0c04a is 0 bytes after a block of size 10 alloc'd
```

`0 bytes after a block`이 *경계 침범*의 단서. 다른 변종:
- `N bytes after` — N 바이트 만큼 오버런.
- `N bytes inside` — 블록 안쪽이지만 *해제된 메모리*.

### "Mismatched free / delete / delete[]"

```cpp
int* p = new int[10];
delete p;              // ❌ delete[] 가 맞음
```

C++에서 *alloc 방식과 free 방식이 안 맞는* 경우. Sanitizer도 잡지만, Valgrind가 *더 정확*하게 짝을 추적합니다.

해결: `new[]` ↔ `delete[]`, `new` ↔ `delete`, `malloc` ↔ `free`. C++에서는 `std::unique_ptr`로 자동 해결.

---

## 성능 — *왜 이렇게 느린가*

Valgrind의 *10~50× 오버헤드*는 단순한 계측 비용이 아닙니다. 동작 방식 자체가 그렇습니다.

1. **모든 명령어 디스어셈블** — 바이너리를 VEX IR로 번역.
2. **계측 코드 삽입** — 메모리 접근마다 *섀도우 메모리* 갱신.
3. **섀도우 메모리 관리** — 모든 바이트마다 *9비트의 메타데이터*(8 + 1).
4. **VEX IR → x86 컴파일** — JIT으로 실제 실행.

이 모든 단계가 *런타임에 일어납니다*. 그래서 `for` 루프 한 번 도는데 *50배의 시간*이 걸릴 수 있습니다.

### 빠르게 만드는 팁

- **`--leak-check=summary`**: full보다 빠름. 누수 *개수만* 보고 싶을 때.
- **`--track-origins=no`**: 기본값. 미초기화 경고가 *어디서 왔는지* 추적 안 함. 2~3배 빠름.
- **작은 입력**: 큰 데이터셋에서 Valgrind를 돌릴 필요 없음. *재현 케이스 최소화*.
- **분리된 단위 테스트**: 한 번에 모든 테스트가 아니라, *문제 있는 테스트만* 격리해 Valgrind로.

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

## 정리

- Memcheck는 *6종 메모리 버그* — illegal R/W, uninit, leak, mismatch, overlap, syscall.
- *Uninitialized value 추적*은 Memcheck만의 강점 (Sanitizer로 MSan Clang only).
- 황금 옵션: `--leak-check=full --show-leak-kinds=all --track-origins=yes`.
- CI 옵션: `--error-exitcode=1 --errors-for-leak-kinds=definite,indirect`.
- `-g` 컴파일 *필수*, `-O0` 또는 `-O1`이 디버깅에 좋음.
- 한계: 스택 오버플로·heap-after-stack은 *Sanitizer가 더 잘 잡음*.

## 다음 장 예고

[Ch 3: Leak Report 읽기](/blog/tools/debugging/valgrind/chapter03-leak-report)에서는 *네 가지 누수 종류*(definite / indirect / possible / reachable)를 정확히 구분하고, 보고서의 *우선순위*를 결정하는 법을 다룹니다.

## 참고 자료

- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html)
- [Valgrind Core Options](https://valgrind.org/docs/manual/manual-core.html)
- [Memcheck Command-line Options](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options)
