---
title: "Valgrind Suppression과 실무 운용 — 노이즈 제거와 CI 통합"
slug: "tools/debugging/valgrind/chapter05-suppressions"
date: 2026-05-28T09:05:00
description: "Valgrind suppression 문법, 외부 라이브러리 우회, Sanitizer와의 분담, CI 통합 실전."
tags: [Valgrind, Suppression, CI, Debugging, C, cpp]
series: "Valgrind"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

## *Suppression이 필요한 이유*

[매뉴얼 2.1절](https://valgrind.org/docs/manual/manual-core.html#manual-core.whatdoes)이 말하듯 Valgrind는 프로그램과 함께 libc를 비롯한 *모든* 동적 라이브러리 코드를 검사합니다. 그래서 우리가 고칠 수 없는 코드 안에서 보고가 나올 수 있고, 그걸 숨기는 장치가 suppression입니다.

그런데 "라이브러리 안에서 나온 보고"가 곧 "라이브러리 문제"는 아닙니다. 실제 라이브러리로 확인해 봤습니다. 실행 환경은 [Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)과 같은 Valgrind 3.24.0, Debian 13 arm64, GCC 14.2.0이고, OpenSSL은 Debian 패키지의 3.5.7입니다.

```c title="ssl.c"
#include <openssl/ssl.h>
#include <openssl/evp.h>
#include <stdio.h>
int main(void) {
    OPENSSL_init_ssl(0, NULL);
    SSL_CTX* ctx = SSL_CTX_new(TLS_client_method());
    unsigned char md[32]; unsigned int n = 0;
    EVP_Digest("abc", 3, md, &n, EVP_sha256(), NULL);
    printf("ctx=%p n=%u %s\n", (void*)ctx, n, OpenSSL_version(OPENSSL_VERSION));
    SSL_CTX_free(ctx);
    return 0;
}
```

```text
$ gcc -g -O0 ssl.c -o ssl -lssl -lcrypto
$ valgrind --leak-check=full --show-leak-kinds=all ./ssl
ctx=0x5331dd0 n=32 OpenSSL 3.5.7 9 Jun 2026
==4506== HEAP SUMMARY:
==4506==     in use at exit: 0 bytes in 0 blocks
==4506==   total heap usage: 9,116 allocs, 9,116 frees, 578,459 bytes allocated
==4506== All heap blocks were freed -- no leaks are possible
==4506== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
```

초기화·컨텍스트 생성·SHA-256 계산까지 할당 9,116개가 모두 해제됐고 에러는 0개입니다. 이제 `SSL_CTX_free(ctx);` 한 줄만 주석 처리합니다.

```text
$ valgrind --leak-check=full ./ssl_nofree
==4529== 20,428 (1,784 direct, 18,644 indirect) bytes in 1 blocks are definitely lost in loss record 51 of 51
==4529==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==4529==    by 0x4C467F3: CRYPTO_malloc (in /usr/lib/aarch64-linux-gnu/libcrypto.so.3)
==4529==    by 0x4C469F7: CRYPTO_zalloc (in /usr/lib/aarch64-linux-gnu/libcrypto.so.3)
==4529==    by 0x490B923: SSL_CTX_new_ex (in /usr/lib/aarch64-linux-gnu/libssl.so.3)
==4529==    by 0x108A07: main (ssl_nofree.c:6)
```

스택의 세 프레임이 `libcrypto.so.3`·`libssl.so.3` 안이지만, 원인은 *우리가 `SSL_CTX_free`를 빠뜨린 것*입니다. 이걸 "OpenSSL 누수"로 보고 libcrypto 전체를 suppress하면 우리 버그가 사라집니다(아래 "너무 넓은 suppression" 절에서 실제로 확인합니다).

그래서 외부 라이브러리 보고는 먼저 *우리 쪽 호출*을 의심합니다. 라이브러리 업데이트, 잘못된 API 사용 수정, upstream 버그 리포트가 suppression보다 앞서는 선택지입니다.

**Suppression**은 매칭한 보고를 숨기는 기능입니다. 오탐만 골라 숨기는 것이 아니므로 실제 결함도 가릴 수 있습니다. 사유·대상 버전·재검토 조건을 남깁니다.

---

## Suppression 문법

```text
{
   <suppression name>
   <tool>:<error kind>
   <optional: extra info>
   fun:<function pattern>
   fun:<function pattern>
   ...
   obj:<object/library pattern>
}
```

[매뉴얼 2.5절](https://valgrind.org/docs/manual/manual-core.html#manual-core.suppress)의 규칙은 다음과 같습니다.

- 여는 `{`와 닫는 `}`는 각각 *자기 줄의 첫 글자*여야 합니다.
- 프레임 줄은 최대 24개이고, `fun:`(함수), `obj:`(공유 객체), `src:`(소스 `파일[:줄]`) 중 하나로 시작합니다.
- 이름에는 와일드카드 `*`와 `?`를 쓸 수 있습니다.
- C++ 함수 이름은 *mangled* 형태로 적어야 합니다. 2.5절은 손으로 쓸 때 `--demangle=no`로 mangled 이름을 확인하라고 권합니다.

각 줄의 의미를 차례로 봅니다.

### 첫 줄 — 이름

```text
{
   IgnoreOpenSSL_HandshakeUninit
   ...
}
```

자유 형식입니다. `-s`로 실행하면 이 이름이 `used_suppression` 목록에 그대로 나오므로(아래 "발견된 suppression 통계" 절), *무엇을 왜 숨기는지* 알아볼 수 있게 짓습니다.

### 두 번째 줄 — 에러 종류

Memcheck의 종류는 [4.4절](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.suppfiles)에 정의돼 있습니다.

| 키워드 | 무엇 |
|--------|------|
| `Memcheck:Cond` | 미초기화 조건 코드 사용 (옛 이름 `Value0`) |
| `Memcheck:Value1` / `2` / `4` / `8` / `16` | 1·2·4·8·16바이트 미초기화 값 사용 |
| `Memcheck:Addr1` / `2` / `4` / `8` / `16` | 1·2·4·8·16바이트 접근의 잘못된 주소 |
| `Memcheck:Jump` | 접근할 수 없는 주소로 점프 |
| `Memcheck:Param` | 시스템 호출 인자 (미초기화·접근 불가) |
| `Memcheck:Free` | 잘못된 free / 짝이 맞지 않는 해제 |
| `Memcheck:Overlap` | `memcpy` 계열의 src·dst 겹침 |
| `Memcheck:Leak` | 메모리 누수 |

다른 도구의 종류는 각 도구에 `--gen-suppressions=all`을 줘서 실제로 뽑아 봤습니다. [Ch 4](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)의 프로그램들입니다.

| 키워드 | 나온 프로그램 (Ch 4) |
|--------|------|
| `Helgrind:Race` | `race.c` 데이터 레이스 |
| `Helgrind:LockOrder` | `lockorder.cpp` 잠금 순서 역전 |
| `Helgrind:UnlockForeign` | `unlock_unowned.c` 다른 스레드가 쥔 락 해제 |
| `Helgrind:Misc` | `unlock_unowned.c` 락을 쥔 채 스레드 종료 |
| `Helgrind:PthAPIerror` | `detachjoin.c` 실패한 `pthread_join` |
| `drd:ConflictingAccess` | `race.c` 데이터 레이스 |
| `drd:CondRaceErr` | `signal_nolock.c` mutex 없이 signal |
| `drd:CondWaitErr` | `condvar.c` 한 cond에 다른 mutex |

DRD는 접두사가 소문자 `drd:`입니다. 2.5절은 도구가 자기에게 온 suppression 중 모르는 것이 있으면 시작할 때 불평하고, 다른 도구용 항목은 무시한다고 적습니다. 그래서 한 파일에 모든 도구의 항목을 섞어 둘 수 있습니다.

### 세 번째 줄 — 추가 정보 (선택)

추가 정보 줄의 필요 여부는 종류마다 다릅니다. 4.4절에 따르면 `Memcheck:Param`에는 문제가 된 syscall 매개변수 이름을 적는 줄이 *필수*이고, `Memcheck:Leak`에는 `match-leak-kinds:` 줄을 *선택*으로 둘 수 있습니다.

```text
Memcheck:Leak
match-leak-kinds: definite,indirect,possible,reachable
```

`match-leak-kinds:`로 *어떤 누수 종류*를 무시할지 한정합니다. 값의 문법은 `--show-leak-kinds`와 같습니다. `--gen-suppressions`가 만든 템플릿에는 그 보고의 종류 하나(예: `definite`)만 들어가므로, 넓힐 이유가 없으면 그대로 둡니다.

### 호출 트레이스

```text
fun:OpenSSL_init
fun:main
```

첫 프레임 줄은 에러 스택의 *가장 안쪽*(에러가 난 함수, 누수라면 `malloc`)과 맞춰지고, 다음 줄은 그 호출자, 그다음은 호출자의 호출자 순서로 맞춰집니다. 적은 프레임이 모두 맞으면 그 뒤에 남은 바깥쪽 프레임은 보지 않습니다. 아래 `fixture.supp`가 `fun:main` 없이 `fun:malloc`·`fun:known_site` 두 줄만으로 매칭되는 이유입니다.

### 와일드카드와 매칭

| 패턴 | 의미 |
|------|------|
| `fun:malloc` | 함수 이름이 정확히 `malloc` |
| `fun:OpenSSL_*` | 이름 패턴 (`*`는 0글자 이상) |
| `fun:my_?_function` | `?`는 정확히 한 글자. 정규식이 아니라 glob입니다. |
| `obj:/usr/lib/libcrypto*.so*` | 공유 객체 경로 패턴 |
| `...` | 0개 이상의 *프레임* (프레임 수준 와일드카드) |
| `fun:*` | 이름이 무엇이든 *한* 프레임 |

`...`은 *0개 이상의 프레임*, `fun:*`은 *정확히 한 프레임*입니다. 둘의 차이를 `suppression-case.c`(아래 "실행 입력" 절, 스택 `malloc → known_site|own_site → main`)로 확인했습니다.

| suppression의 프레임 | 결과 |
| --- | --- |
| `fun:malloc`, `fun:*`, `fun:main` | 두 누수 모두 숨김 (`suppressed: 48 bytes in 2 blocks`) |
| `fun:malloc`, `fun:*`, `fun:*`, `fun:main` | 하나도 못 숨김 (`definitely lost: 48 bytes in 2 blocks`) |

C++ 이름은 mangled여야 한다는 규칙도 돌려 봤습니다. `vendor::Codec::init()`이 `new int[16]`을 잃는 `cxxleak.cpp`입니다.

```text
$ valgrind --leak-check=full --gen-suppressions=all ./cxxleak
{
   <insert_a_suppression_name_here>
   Memcheck:Leak
   match-leak-kinds: definite
   fun:_Znam
   fun:_ZN6vendor5Codec4initEv
   fun:main
}
```

`--demangle=no` 없이도 템플릿은 mangled 이름으로 나왔습니다. 같은 두 프레임을 `fun:operator new[](unsigned long)`, `fun:vendor::Codec::init()`처럼 demangled 이름으로 적은 파일은 `suppressed: 0 bytes`였고, mangled 이름(`_Znam`, `_ZN6vendor5Codec4initEv`)으로 적은 파일은 `suppressed: 64 bytes in 1 blocks`였습니다. 보고서에 보이는 이름을 그대로 베끼면 매칭되지 않습니다.

---

## 실전 예시

### 예 1: 외부 라이브러리 누수 무시

```text
{
   OpenSSL Leak in libcrypto
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   ...
   obj:*libcrypto*.so*
}
```

가장 안쪽 프레임이 `malloc`이고, 그 바깥쪽 어딘가에 libcrypto 프레임이 하나라도 있으면 매칭됩니다. 짧고 편해 보이지만, 앞의 `ssl_nofree`처럼 *우리가 해제를 빠뜨린 OpenSSL 객체*도 전부 이 조건을 만족합니다. 이 항목의 실제 결과는 아래 "너무 넓은 suppression" 절에서 봅니다.

### 예 2: 특정 함수의 미초기화 무시

```text
{
   ThirdParty UninitValue
   Memcheck:Cond
   fun:third_party_function
}
```

가장 안쪽 프레임이 `third_party_function`인 미초기화 조건 분기 경고만 숨깁니다. `third_party_function`이 부른 *다른 함수 안*에서 난 경고는 가장 안쪽 프레임이 달라서 숨겨지지 않습니다. 그 함수 아래 전체를 숨기려면 첫 줄에 `...`을 둡니다.

### 예 3: 시스템 라이브러리

Valgrind는 빌드할 때 감지한 OS·라이브러리에 맞는 *기본 suppression*을 고르고 시작할 때 읽습니다(2.1절). Debian 13에서 `-v`로 확인하면 다음 파일 하나를 읽습니다.

```text
--4368-- Reading suppressions file: /usr/libexec/valgrind/default.supp
```

이 파일에는 항목 171개가 있고, 종류별로 세면 `drd:ConflictingAccess` 45개, `Helgrind:Race` 37개, `Memcheck:Param` 25개, `Memcheck:Cond` 24개, `Memcheck:Addr4` 22개 순입니다. 그래서 glibc 동적 로더나 libc 내부에서 나는 알려진 보고는 프로젝트 파일에 따로 적지 않아도 이미 숨겨집니다. 이 시리즈의 Memcheck 예제는 모두 `suppressed: 0 from 0`이라 이 파일이 숨긴 것이 없었지만, Ch 4의 `ERROR SUMMARY`에 찍힌 `suppressed: 10 from 10` 같은 숫자가 이 파일의 몫입니다. 기본 파일에 없는 시스템 라이브러리 보고가 나올 때만 프로젝트 파일에 추가합니다.

### 예 4: pthread 자체의 race

```text
{
   pthread internal race
   Helgrind:Race
   ...
   obj:/usr/lib/libpthread*.so*
}
```

이 패턴은 Debian 13(glibc 2.41)에서 *아무것도 매칭하지 않습니다*. `-pthread`로 빌드한 `race`의 `ldd` 출력에 `libpthread`가 없고 `libc.so.6`만 있으며, Ch 4의 Helgrind 보고에서도 스레드 프레임은 `start_thread (pthread_create.c:448)`처럼 libc 안에 있었습니다. 기본 suppression 파일의 `libpthread` 항목도 `obj:/*libpthread-2.4.so*` 같은 옛 버전 경로이거나 함수 이름(`fun:`)으로 매칭합니다. pthread 내부 보고를 숨겨야 한다면 `obj:`가 아니라 보고에 나온 `fun:` 이름으로 좁힙니다.

---

## Suppression 자동 생성

처음부터 손으로 쓰지 말고 `--gen-suppressions=all`로 *자동 생성*합니다.

```bash
valgrind --leak-check=full --gen-suppressions=all ./myapp 2>&1 | tee vg.out
```

각 보고 뒤에 *suppression 템플릿*이 같이 출력됩니다. [Ch 2](/blog/tools/debugging/valgrind/chapter02-memcheck)의 `third.c` 출력입니다.

```text
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

3.24.0의 템플릿에는 `==pid==` 접두사가 없어서 그대로 복사할 수 있습니다. 이걸 `valgrind.supp`에 붙이고 다음을 손봅니다.

1. *이름*을 의미 있게 바꿉니다.
2. *프레임을 좁히거나 넓힙니다*. 대개 `fun:main` 같은 바깥쪽 프레임은 지워도 되고, 그만큼 다른 호출 경로에도 매칭됩니다.
3. 필요할 때만 *와일드카드*로 일반화합니다.

```text
{
   IgnoreThirdPartyInit
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   fun:third_party_init
}
```

---

## *너무 넓은* suppression의 위험

```text
{
   IgnoreAllMallocFromMain
   Memcheck:Leak
   ...
   fun:main
}
```

이 suppression은 *main을 거친 모든 누수*를 무시합니다. 아래 `suppression-case.c`에 적용하면 우리 코드의 두 누수가 모두 사라지고 종료 코드도 0이 됩니다.

```text
$ valgrind --leak-check=full --error-exitcode=97 --suppressions=broad.supp ./suppression-case
==4263==         suppressed: 48 bytes in 2 blocks
==4263== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 2 from 2)
$ echo $?
0
```

앞의 예 1(`fun:malloc` … `obj:*libcrypto*.so*`)도 같은 문제를 냅니다. `SSL_CTX_free`를 빠뜨린 `ssl_nofree`에 적용한 결과입니다.

```text
$ valgrind --leak-check=full --error-exitcode=97 --suppressions=libcrypto.supp ./ssl_nofree
==4546==    definitely lost: 0 bytes in 0 blocks
==4546==    indirectly lost: 4,074 bytes in 3 blocks
==4546==         suppressed: 16,354 bytes in 262 blocks
==4546== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 1 from 1)
$ echo $?
0
```

우리 버그였던 definitely lost가 0이 되고, CI는 통과합니다. 남은 indirect 4,074바이트는 기본 `--errors-for-leak-kinds`에 들어 있지 않아 종료 코드에 영향을 주지 않았습니다. **재앙**입니다.

원칙은 세 가지입니다.

1. **가능한 한 좁게.** 특정 함수, 특정 라이브러리, 특정 호출 컨텍스트로 한정합니다.
2. **테스트로 검증.** suppression을 추가한 뒤 *우리 코드의 알려진 누수가 여전히 잡히는지* 확인합니다(아래 "실행 입력" 절).
3. **이름에 이유.** `Ignore_libcrypto_known_init_leak`처럼 *왜 무시하는지* 이름에 담습니다.

좁은 suppression의 모양은 다음과 같습니다.

```text
{
   libcrypto_OpenSSL_init_known_leak
   Memcheck:Leak
   match-leak-kinds: definite,indirect
   fun:malloc
   fun:CRYPTO_zalloc
   fun:OPENSSL_init_crypto
}
```

이 항목은 가장 안쪽 세 프레임이 정확히 `malloc → CRYPTO_zalloc → OPENSSL_init_crypto`일 때만 숨깁니다. 그런데 OpenSSL 3.5.7의 실제 스택은 `malloc → CRYPTO_malloc → CRYPTO_zalloc → ...`이었으므로, 이대로는 아무것도 매칭하지 않습니다. 좁은 suppression은 *실제로 받은 스택*에서 출발해야 하고, 라이브러리를 올린 뒤에는 `-s`로 여전히 쓰이는지 다시 확인합니다. 위의 `ssl.c`처럼 OpenSSL 3.5.7 초기화 자체는 누수가 0이었으니, 이 버전에서는 이런 항목이 애초에 필요 없습니다.

---

## *발견된 suppression 통계*

```bash
valgrind -s --leak-check=full \
         --suppressions=valgrind.supp \
         ./myapp
```

`-s`(= `--show-error-list=yes`)를 주면 끝에 규칙별 사용 횟수가 나옵니다. 아래 `fixture.supp`를 적용한 결과입니다.

```text
--4277-- used_suppression:      1 fixture_known_site_only fixture.supp:2 suppressed: 16 bytes in 1 blocks
==4277==
==4277== ERROR SUMMARY: 1 errors from 1 contexts (suppressed: 1 from 1)
```

`ERROR SUMMARY`의 `suppressed: 1 from 1`은 *숨겨진 에러 수*와 *에러 컨텍스트 수*이고, 규칙 수가 아닙니다. 규칙별 내역은 `used_suppression` 줄에서 봅니다. 이름, 파일과 줄(`fixture.supp:2`), 사용 횟수, 누수라면 숨긴 바이트가 나옵니다. 숨긴 양이 예상보다 크면 *우리 코드의 진짜 문제까지 가린 게 아닌지* 점검합니다.

숨겨진 에러의 *내용*까지 보려면 `--show-error-list=all`을 씁니다([2.7.3절](https://valgrind.org/docs/manual/manual-core.html#manual-core.erropts)). `offby1`의 invalid write를 `Memcheck:Addr1` 항목으로 숨긴 뒤 돌리면 숨겨진 보고 전체가 나옵니다.

```text
==4325== 1 errors (suppressed by offby1_write) in context 1 of 1:
==4325== Invalid write of size 1
==4325==    at 0x108808: main (offby1.c:4)
==4325==  Address 0x4a7f04a is 0 bytes after a block of size 10 alloc'd
...
--4325-- used_suppression:      1 offby1_write addr1.supp:2
```

다만 3.24.0에서 *누수* 보고를 숨긴 경우에는 `--show-error-list=all`이 숨겨진 누수 레코드를 다시 보여 주지 않았고, `used_suppression` 줄과 `LEAK SUMMARY`의 `suppressed:` 바이트만 나왔습니다. 숨긴 누수의 스택을 다시 보려면 `--suppressions` 없이 한 번 더 돌려 비교합니다.

---

## *Valgrind 기본 suppression*

앞의 예 3에서 본 기본 파일은 배포판 패키지가 설치한 파일이라, *직접 수정하지 마세요*. 패키지 업데이트로 덮어쓰입니다. 매뉴얼은 경로를 `$PREFIX/lib/valgrind/default.supp`로 적지만(2.7.3절 `--suppressions`), Debian 13 패키지에서는 `/usr/libexec/valgrind/default.supp`였습니다. 대신 *프로젝트 suppression 파일*을 만들고 `--suppressions=`로 추가합니다.

```bash
valgrind --suppressions=tests/project.supp ./myapp
```

여러 파일도 됩니다. 2.7.3절은 추가 파일을 최대 100개까지 허용합니다.

```bash
valgrind --suppressions=tests/project.supp \
         --suppressions=tests/openssl.supp \
         --suppressions=tests/glibc.supp \
         ./myapp
```

Debian은 `/usr/lib/valgrind/debian.supp`라는 배포판 전용 파일도 설치하지만, 위 `-v` 출력처럼 *기본으로 읽지는 않습니다*. 그 안의 항목(예: glib 타입 레지스트리, libgomp 초기화)이 필요하면 `--suppressions=/usr/lib/valgrind/debian.supp`로 직접 넘깁니다.

---

## *Sanitizer와의 분담* — 운영 전략

[Sanitizer](/blog/tools/debugging/sanitizers/chapter01-intro)가 더 빠른데도 Valgrind를 *함께* 운영하는 이유는, 둘의 *닿는 자리가 다르기* 때문입니다. 시리즈에서 측정한 배율(단일 스레드 Memcheck 12.6~13.1×, 4스레드 Helgrind 62.8~72.7× 대 TSan 7.4~7.5×)이 배치를 정하는 근거입니다.

### 일상 (every PR)

**Sanitizer** — 빠르고, 스택·전역 배열 오버플로까지 잡습니다(Ch 2에서 ASan만 잡은 `stackovf.c`). 모든 PR에 ASan + UBSan 빌드를 둡니다.

### 주간/야간

**Valgrind Memcheck** — Sanitizer가 닿지 않는 자리를 확인합니다.

특히 다음이 Valgrind 쪽입니다.

- 다시 빌드할 수 없는 외부 라이브러리 내부
- 시스템 호출 인자의 미초기화 (Ch 2의 `Syscall param write(buf)`)
- GCC로만 빌드되는 코드의 미초기화 값 (GCC에는 MSan이 없음)

### 릴리스 전

**Valgrind 전체 매트릭스** — Memcheck + Helgrind/DRD를 모두 돌립니다.

### 분담의 *구체적인 자리*

| 자리 | 도구 |
|------|------|
| 일상 메모리 오류 | Sanitizer (ASan) |
| 스택·전역 배열 경계 | Sanitizer (ASan). Memcheck는 검사하지 않음 (FAQ, 3.24.0 기준 4.6) |
| 미초기화 값 (GCC) | Valgrind (Memcheck). MSan은 Clang 전용 |
| 깊은 누수 분석 (loss record) | Valgrind (Memcheck) |
| 시스템 호출 인자 버퍼의 주소·정의 상태 | Valgrind (Memcheck) |
| 외부 .so 내부 | Valgrind (재컴파일 불필요) |
| 빠른 race 검사 | Sanitizer (TSan) |
| 락 오용 (deadlock potential) | Valgrind (Helgrind) |

---

## CI 통합 — 실전 패턴

### GitHub Actions 야간 작업

```yaml
name: Valgrind Nightly

on:
  schedule:
    - cron: '0 2 * * *'    # 매일 02:00 UTC
  workflow_dispatch:

jobs:
  memcheck:
    runs-on: ubuntu-22.04
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - name: Install
        run: sudo apt-get install -y valgrind cmake ninja-build

      - name: Build (Debug)
        run: |
          cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug
          cmake --build build

      - name: Run Memcheck
        run: |
          valgrind --tool=memcheck \
                   --leak-check=full \
                   --show-leak-kinds=definite,indirect \
                   --error-exitcode=1 \
                   --errors-for-leak-kinds=definite,indirect \
                   --suppressions=tests/valgrind.supp \
                   --gen-suppressions=all \
                   --num-callers=30 \
                   --xml=yes \
                   --xml-file=memcheck.xml \
                   ./build/test_runner

      - name: Upload artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: memcheck-results
          path: memcheck.xml

  helgrind:
    runs-on: ubuntu-22.04
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y valgrind cmake ninja-build
      - run: cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug && cmake --build build
      - run: |
          valgrind --tool=helgrind \
                   --error-exitcode=1 \
                   --suppressions=tests/helgrind.supp \
                   --history-level=full \
                   ./build/concurrent_test
```

핵심은 다음과 같습니다.

- **`schedule`** — PR마다가 아니라 *야간 cron*입니다. 측정한 배율이 10배 이상이기 때문입니다.
- **`timeout-minutes: 60`** — Valgrind 작업의 *상한*입니다. 안 끝나면 실패로 처리합니다.
- **`--leak-check=full`** — 이게 없으면 누수가 에러로 세지지 않아 `--error-exitcode`가 소용없습니다(Ch 2).
- **`--xml`** — 결과를 *기계 판독 가능*하게 남깁니다. 3.24.0의 XML은 `<protocolversion>4</protocolversion>`이고 에러마다 `<kind>`가 붙습니다(Ch 2).
- **`upload-artifact`** — 실패 시 *분석을 위해* XML을 저장합니다.

이 YAML은 이 시리즈에서 GitHub Actions로 돌려 보지는 않았습니다. 그 안의 `valgrind` 명령줄은 Debian 13 VM에서 같은 옵션으로 실행해 확인했습니다. 한 가지 차이는 버전입니다. `ubuntu-22.04`의 패키지는 `1:3.18.1-1ubuntu2`, `ubuntu-24.04`는 `1:3.22.0-0ubuntu3`입니다([packages.ubuntu.com](https://packages.ubuntu.com/jammy/valgrind)). 이 시리즈의 출력은 3.24.0이라 메시지가 다를 수 있습니다. 예를 들어 Ch 2의 `Mismatched new/delete size value` 검사는 3.22.0에서 들어왔습니다(Valgrind NEWS). 시리즈와 같은 버전으로 맞추려면 Debian 13 컨테이너 이미지를 씁니다.

### GitLab CI

```yaml
valgrind:nightly:
  stage: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
  image: ubuntu:22.04
  timeout: 60m
  before_script:
    - apt-get update
    - apt-get install -y valgrind cmake ninja-build
  script:
    - cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug
    - cmake --build build
    - |
      valgrind --tool=memcheck \
               --leak-check=full \
               --error-exitcode=1 \
               --suppressions=tests/valgrind.supp \
               ./build/test_runner
```

`rules`의 `CI_PIPELINE_SOURCE` 비교로 예약 파이프라인에서만 실행합니다. [GitLab CI 문서](https://docs.gitlab.com/ci/yaml/#stages)에 따르면 `stages`를 따로 선언하지 않았을 때의 기본 stage는 `.pre`, `build`, `test`, `deploy`, `.post`이므로 `stage: test`는 `stages` 선언 없이 쓸 수 있습니다.

### CTest MemCheck

CMake 프로젝트라면 CTest가 테스트마다 Valgrind를 감싸 줍니다. `suppression-case.c`를 테스트 두 개로 등록했습니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.20)
project(vgdemo C)
find_program(MEMORYCHECK_COMMAND valgrind)
set(MEMORYCHECK_COMMAND_OPTIONS "--leak-check=full --error-exitcode=97")
set(MEMORYCHECK_SUPPRESSIONS_FILE "${CMAKE_SOURCE_DIR}/fixture.supp" CACHE FILEPATH "")
include(CTest)
add_executable(suppression-case suppression-case.c)
add_test(NAME leak_case COMMAND suppression-case)
add_test(NAME clean_case COMMAND suppression-case clean)
```

CMake 3.31.6에서 평범한 `ctest`는 누수가 있어도 `leak_case`를 `Passed`로 통과시켰습니다. 프로그램 자체는 0으로 끝나기 때문입니다. `ctest -T memcheck`로 돌려야 Valgrind가 붙습니다.

```text
$ ctest -T memcheck
...
1/2 MemCheck: #1: leak_case ........................   Defects: 1
MemCheck log files can be found here: (<#> corresponds to test number)
/root/ct/b3/Testing/Temporary/MemoryChecker.<#>.log
Memory checking results:
Memory Leak - 1
$ echo $?
16
```

`LastDynamicAnalysis_*.log`에 남은 실제 명령은 `"/usr/bin/valgrind" "--log-file=.../MemoryChecker.1.log" "--leak-check=full" "--error-exitcode=97" "--suppressions=/root/ct/p3/fixture.supp" ".../suppression-case"`였습니다. `Defects: 1`은 suppression이 16바이트 누수를 숨기고 32바이트 누수만 남았다는 뜻입니다.

한 가지 함정이 있었습니다. `MEMORYCHECK_SUPPRESSIONS_FILE`을 `CACHE FILEPATH ""` 없이 일반 `set()`으로 두면 생성된 `DartConfiguration.tcl`의 `MemoryCheckSuppressionFile:`이 비어 있었고, `--suppressions` 없이 실행돼 `Defects: 2`가 나왔습니다. CMake 3.31의 `Modules/CTest.cmake` 181번 줄이 같은 이름을 `set(... CACHE FILEPATH ...)`로 정의하는데, `cmake_minimum_required(VERSION 3.20)`에서는 정책 CMP0126이 OLD라서 이 `set(CACHE)`가 같은 이름의 일반 변수를 지웁니다(`cmake --help-policy CMP0126`). `VERSION 3.21`로 올리면 일반 `set()`도 `MemoryCheckSuppressionFile: /root/ct/p2/fixture.supp`로 전달됐습니다.

---

## *최소화된 재현* — Valgrind를 빠르게

Ch 1에서 Memcheck가 12.6~13.1×, Callgrind가 32.3~36.8×였으니, 네이티브로 1분 걸리는 시나리오는 Valgrind 아래에서 10분을 넘깁니다. 다음 전략으로 *재현 시간을 줄입니다*.

### 1. 단위 테스트 격리

```bash
# 100개 테스트 중 하나만
ctest -R "FailingTestName" -T memcheck --output-on-failure
```

`-R`만 붙인 평범한 `ctest`는 Valgrind 없이 실행된다는 점을 위에서 봤습니다. `-T memcheck`를 함께 줘야 그 테스트 하나만 Valgrind로 감쌉니다.

### 2. 가짜 데이터 작게

```c
// 큰 데이터셋 사용 안 함
load_data("small_test_input.csv");   // 10MB 대신 100KB
```

성능 테스트가 아니라 *버그 재현*이 목적이므로 데이터 크기를 줄입니다. Ch 3의 `server.c`처럼 같은 경로를 1000번 도는 것으로 충분히 `in 1,000 blocks`가 드러납니다.

### 3. Valgrind 아래에서만 빨리 끝내기

```c
#include <valgrind/valgrind.h>

if (RUNNING_ON_VALGRIND)
    process_only_n_requests(10);   // Valgrind에서는 10개만
else
    process_all_requests();
```

`valgrind.h`의 `RUNNING_ON_VALGRIND`는 별도 빌드 없이 *같은 바이너리*가 Valgrind 아래인지 런타임에 알려 주는 client request입니다. `-DVALGRIND` 같은 사용자 매크로로 따로 빌드하는 것보다 이쪽이 낫습니다. 다만 Valgrind에서 경로가 달라지면 그 경로의 버그는 검사하지 못하므로, 요청 수만 줄이고 처리 로직은 같게 둡니다.

### 4. `--track-origins=no` (기본값)

`--track-origins`의 기본값은 이미 `no`입니다. Ch 1의 측정에서 `yes`는 Memcheck를 1.6~2.4배 느리게 하고 RSS를 약 101 MiB 늘렸으니, 미초기화 경고를 추적할 때만 켭니다. 꺼도 미초기화 값 *검사*는 그대로입니다. Ch 2의 `test.c`는 `--track-origins` 없이도 `Conditional jump or move depends on uninitialised value(s)`를 보고했고, 빠진 것은 기원 줄뿐이었습니다.

---

## 실행 입력 — 좁은 suppression의 부정 대조군

`known_site()`의 16바이트와 `own_site()`의 32바이트 누수를 분리합니다. 아래 `fixture.supp`는 첫 할당만 숨기는 진단용 입력이며 실제 프로젝트에 적용할 권고가 아닙니다. 두 번째 누수가 계속 보고돼야 범위가 좁다는 근거가 됩니다.

```c title="suppression-case.c"
#include <stdlib.h>
char* volatile retained;
__attribute__((noinline)) void known_site(int clean) {
    retained = malloc(16);
    if (!retained) abort();
    if (clean) free(retained);
    retained = NULL;
}
__attribute__((noinline)) void own_site(int clean) {
    retained = malloc(32);
    if (!retained) abort();
    if (clean) free(retained);
    retained = NULL;
}
int main(int argc, char** argv) {
    (void)argv;
    known_site(argc > 1);
    own_site(argc > 1);
    return 0;
}
```

```text title="fixture.supp"
{
   fixture_known_site_only
   Memcheck:Leak
   match-leak-kinds: definite
   fun:malloc
   fun:known_site
}
```

```bash
cc -g -O0 suppression-case.c -o suppression-case
valgrind --leak-check=full --error-exitcode=97 ./suppression-case
valgrind --leak-check=full --error-exitcode=97 --suppressions=fixture.supp ./suppression-case
valgrind --leak-check=full --error-exitcode=97 ./suppression-case clean
```

| 실행 | 보고된 누수 | `suppressed:` | ERROR SUMMARY | 종료 코드 |
| --- | --- | --- | --- | ---: |
| suppression 없음 | 16 B (`known_site`) + 32 B (`own_site`) | 0 bytes | 2 errors | 97 |
| `fixture.supp` | 32 B (`own_site`)만 | 16 bytes in 1 blocks | 1 errors (suppressed: 1 from 1) | 97 |
| `clean` | 없음 (`All heap blocks were freed`) | — | 0 errors | 0 |
| `broad.supp` (`...` + `fun:main`) | 없음 | 48 bytes in 2 blocks | 0 errors (suppressed: 2 from 2) | 0 |

`fixture.supp`는 의도대로 16바이트만 숨기고 32바이트는 계속 에러로 남겨 종료 코드 97을 유지했습니다. 마지막 줄의 넓은 suppression은 같은 바이너리에서 종료 코드를 0으로 만들었습니다. suppression 파일을 고칠 때마다 이 표의 첫 두 줄 같은 *부정 대조군*을 함께 돌리면, 숨기지 말아야 할 것까지 숨겼는지 바로 드러납니다.

## 시리즈 마무리

Valgrind 시리즈 다섯 챕터를 마칩니다.

| 장 | 주제 |
|----|------|
| Ch 1 | 개요 — Sanitizer와의 보완 관계, 도구별 비용 측정 |
| Ch 2 | Memcheck 실전 사용 |
| Ch 3 | Leak Report 읽기 |
| Ch 4 | Helgrind와 DRD |
| Ch 5 | Suppression과 실무 운용 |

핵심 사고를 정리합니다.

1. **Valgrind는 *재컴파일 없이* 동작합니다.** 시작 전부터 제어권을 잡고 libc까지 검사합니다. 공식 지원 목록에 Apple Silicon macOS는 없어 Linux VM에서 돌립니다.
2. **느린 대신 다른 자리를 봅니다.** 측정한 배율은 Memcheck 12.6~13.1×, Callgrind 32.3~36.8×였습니다. 일상은 Sanitizer, *깊은 점검*은 Valgrind입니다.
3. **Memcheck = 메모리 + 미초기화**입니다. 누수 보고는 *4종으로 분류*해 우선순위를 정하고, `--leak-check=full`이어야 누수가 에러로 셉니다.
4. **Helgrind와 DRD는 둘 다 happens-before**이고, Helgrind는 잠금 순서·API 오용을, DRD는 락 경합을 더 봅니다. 따로 돌려 비교합니다.
5. **Suppression은 *최소한으로 좁게* 작성합니다.** 넓은 항목은 우리 버그와 CI 실패를 함께 지웠습니다. 부정 대조군으로 검증합니다.
6. **CI에서는 *야간 작업*으로** 돌리고, PR마다는 Sanitizer를 돌립니다.

도입 순서를 권합니다.

- **즉시**: `valgrind --leak-check=full ./test_runner`를 한 번 돌려 봅니다.
- **이번 주**: `--gen-suppressions=all` 출력에서 출발해 suppression 파일을 처음 만들고, 부정 대조군 테스트를 같이 넣습니다.
- **이번 달**: CI 야간 작업이나 `ctest -T memcheck`로 통합합니다.

[Sanitizer 시리즈](/blog/tools/debugging/sanitizers/chapter01-intro)와 함께 보면 *디버그 도구의 큰 그림*이 완성됩니다. *어디서 무엇을 쓸지* 명확해집니다.

## 참고 자료

- [Valgrind Suppression Format (2.5)](https://valgrind.org/docs/manual/manual-core.html#manual-core.suppress)
- [Memcheck Suppression Types (4.4)](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.suppfiles)
- [Error-related Options (2.7.3)](https://valgrind.org/docs/manual/manual-core.html#manual-core.erropts) — `--show-error-list`, `--suppressions`
- [Default Suppressions 원본 `glibc-2.X.supp.in`](https://sourceware.org/git/?p=valgrind.git;a=blob;f=glibc-2.X.supp.in;hb=VALGRIND_3_24_0)
- [CMake CTest — MemCheck Step](https://cmake.org/cmake/help/latest/manual/ctest.1.html#ctest-memcheck-step)
- [GitLab CI `stages`](https://docs.gitlab.com/ci/yaml/#stages)

## 관련 항목

- [Ch 4: Valgrind Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — 이전 글. `Helgrind:Race` suppression이 필요해지는 자리
- [Ch 1: Valgrind 도구 개요](/blog/tools/debugging/valgrind/chapter01-intro) — 시리즈 첫 글. 전체 그림을 다시 볼 때
- [Sanitizer를 CMake와 CI에 통합](/blog/tools/debugging/sanitizers/chapter05-cmake-ci) — PR 빌드 쪽 CI 구성. 야간 Valgrind 작업과 짝을 이룹니다
- [heaptrack 분석 — 가벼운 heap profiler 활용](/blog/tools/debugging/memory/chapter02-heaptrack) — Valgrind가 너무 느린 시나리오의 대안
- [Valgrind Suppression Format](https://valgrind.org/docs/manual/manual-core.html#manual-core.suppress) — suppression 문법 공식 정의
- [GDB / LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — suppression으로 걸러 낸 뒤 남은 진짜 버그를 붙잡을 때
