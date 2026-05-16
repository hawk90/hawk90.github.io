---
title: "Ch 10: POS & CON — POSIX와 동시성, race condition"
date: 2025-09-10T11:00:00
description: "POSIX 특정 함정(POS), 동시성 race(CON), atomic·mutex, TSan으로 검출. 실전 CVE로 마무리."
tags: [cert-c, posix, concurrency, race, mutex, atomic, tsan]
series: "CERT C"
seriesOrder: 10
draft: false
---

이 마지막 장은 *POSIX 특정* 함정과 *동시성*을 다룬다. RTOS·Linux 기반 임베디드, IPC·threading 코드에 직접 적용된다.

## POS30-C — `readlink`의 결과는 *null 종결되지 않음*

```c
// 위반
char buf[PATH_MAX];
readlink("/proc/self/exe", buf, sizeof(buf));
printf("%s\n", buf);            // null 없을 수 있음 → OOB read

// Good
char buf[PATH_MAX];
ssize_t n = readlink("/proc/self/exe", buf, sizeof(buf) - 1);
if (n < 0) return -errno;
buf[n] = '\0';                   // 명시적 null 종결
```

`readlink`는 *반환값*에 *실제 쓴 바이트 수*. *해당 위치에 null을 직접 박아야* 한다.

## POS33-C — `vfork()` 사용 금지

`vfork`는 fork보다 *효율적이지만* 부모의 메모리 공간을 *공유*한다. 동작이 *너무 미묘*해 거의 모든 사용이 race condition.

```c
// 위반
pid_t pid = vfork();
if (pid == 0) {
    execve(...);              // 자식이 execve 또는 _exit만 호출 가능
    // 그 사이 어떤 코드도 부모 메모리 손상
}
```

대안: *posix_spawn* (표준화된 안전 fork+exec) 또는 *일반 fork*.

## POS34-C — `putenv`로 *자동 변수 등록 금지*

```c
// 위반
void Foo(void) {
    char env[] = "MY_VAR=value";
    putenv(env);              // env는 함수 반환 후 invalid
}                             // → 환경 변수가 dangling pointer
```

`putenv`는 *포인터를 환경 테이블에 그대로 저장*. 그 메모리가 *해제되면* 환경 변수가 깨진다.

```c
// Good — 정적 또는 strdup
char *e = strdup("MY_VAR=value");
putenv(e);                   // 또는 setenv 사용 (복사함)

// 또는
setenv("MY_VAR", "value", 1);
```

## POS35-C — 심볼릭 링크 *race* 회피

`stat` → `open` 사이 race(FIO30 변종).

```c
// 위반
struct stat st;
if (stat(path, &st) == 0 && S_ISREG(st.st_mode)) {
    int fd = open(path, O_RDONLY);   // race window
    /* ... */
}

// Good
int fd = open(path, O_RDONLY | O_NOFOLLOW);
if (fd < 0) return -1;
struct stat st;
if (fstat(fd, &st) < 0 || !S_ISREG(st.st_mode)) {
    close(fd);
    return -1;
}
```

## POS47-C — `pthread_cancel` 사용 회피

스레드 취소는 *cleanup handler*와 *cancel point*가 얽혀 매우 복잡. 대안: *명시적 종료 플래그*.

```c
// 회피
pthread_cancel(thread);

// Good — 자발적 종료
atomic_bool g_shutdown = false;

void *worker(void *arg) {
    while (!atomic_load(&g_shutdown)) {
        do_work();
    }
    return NULL;
}

// 종료 시
atomic_store(&g_shutdown, true);
pthread_join(thread, NULL);
```

## POS54-C — Errno-setting 함수 *반환값 검사*

```c
errno = 0;
if (sigprocmask(...) < 0) {
    // errno 사용
}
```

POSIX 함수는 *반환값으로 성공/실패* 알린다. *errno만 검사*하는 건 위반.

## CON30-C — 정리 핸들러 등록·해제 *짝맞춤*

```c
// 위반
pthread_cleanup_push(cleanup, arg);
do_work();
return;                  // cleanup_pop 없이 반환 → 정의되지 않음

// Good
pthread_cleanup_push(cleanup, arg);
do_work();
pthread_cleanup_pop(1);   // 1: 실행, 0: 등록 해제만
```

`pthread_cleanup_push`/`pop`은 *반드시 같은 스코프에서 짝*.

## CON31-C — Mutex 잠금 *언락 짝맞춤*

```c
// 위반
pthread_mutex_lock(&m);
if (cond) return -1;       // 위반 — unlock 누락 → deadlock
do_work();
pthread_mutex_unlock(&m);

// Good
pthread_mutex_lock(&m);
int rc = -1;
if (!cond) {
    do_work();
    rc = 0;
}
pthread_mutex_unlock(&m);
return rc;
```

C++의 RAII(`std::lock_guard`)가 가장 안전. C는 *수동 관리* 또는 *cleanup handler*.

## CON32-C — 비-atomic 객체에 *동시 접근 금지*

```c
// 위반 — race condition
int counter = 0;

void *Thread1(void *_) { counter++; return NULL; }
void *Thread2(void *_) { counter--; return NULL; }
```

*int* 같은 plain 타입은 *thread-safe 아니다*. 동시 접근 시 *데이터 손상*.

```c
// Good — _Atomic
#include <stdatomic.h>
atomic_int counter = 0;

atomic_fetch_add(&counter, 1);
atomic_fetch_sub(&counter, 1);

// 또는 mutex
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_lock(&m);
counter++;
pthread_mutex_unlock(&m);
```

C11의 `_Atomic`은 *컴파일러가 atomic 명령어로 변환*. CAS, fence, ordering까지 지원.

## CON33-C — 라이브러리 함수의 *thread-safety* 확인

```
함수 종류            thread-safe?
─────────────       ─────────────
strtok              X — strtok_r 사용
asctime, ctime      X — _r 변종 사용
gmtime, localtime   X — _r 변종 사용
rand                X — rand_r 또는 random()
errno               OK (POSIX는 thread-local)
malloc/free         OK (glibc 등 lock-protected)
```

POSIX 매뉴얼의 *MT-Safe* 표시 확인.

## CON34-C — 공유 변수에 *seq_cst* atomic만으로는 부족할 수 있음

```c
// 약한 메모리 모델 예 (ARM)
atomic_int a = 0, b = 0;

// Thread 1
a = 1;
b = 2;

// Thread 2
if (b == 2) {
    assert(a == 1);      // 약한 ordering이면 실패 가능
}
```

기본은 `memory_order_seq_cst`. 명시적으로 *relaxed/acquire/release*를 쓰려면 깊이 이해 필요.

```c
atomic_store_explicit(&a, 1, memory_order_release);
// Thread 2
if (atomic_load_explicit(&b, memory_order_acquire) == 2) {
    // a 값 보장됨
}
```

## CON37-C — Signal handler에서 *thread function 금지*

```c
void handler(int sig) {
    pthread_mutex_lock(&m);      // 위반 — pthread는 async-signal-safe 아님
}
```

POSIX는 signal handler에서 *async-signal-safe* 함수만 허용. pthread 함수는 거의 모두 *허용되지 않음*.

## CON40-C — *Racy 복사* 금지

```c
char *src = shared_buf;
char dst[100];
memcpy(dst, src, 100);    // 위반 — src를 다른 thread가 수정 중
```

*공유 메모리 영역의 복사*는 *unsynchronized*. mutex 또는 atomic snapshot 필요.

## TSan으로 race 검출

```bash
gcc -fsanitize=thread -g source.c -o app
./app
# Data race 발견 시 두 thread의 stack trace 출력
```

TSan(ThreadSanitizer)은 *런타임에 happens-before 관계 추적*해 race 검출. ASan과 함께 *테스트 단계 필수*.

대체: Valgrind의 **Helgrind**, Intel **Inspector**.

## 임베디드 RTOS 동시성

POSIX 패턴은 *FreeRTOS, Zephyr, ThreadX* 등 RTOS에도 비슷하게 적용.

```c
// FreeRTOS
SemaphoreHandle_t m = xSemaphoreCreateMutex();
xSemaphoreTake(m, portMAX_DELAY);
shared_var = 5;
xSemaphoreGive(m);

// 또는 critical section (인터럽트 disable)
taskENTER_CRITICAL();
shared_var = 5;
taskEXIT_CRITICAL();
```

ISR과 task 간 공유는 *queue* 또는 *atomic + barrier*가 권장. mutex는 *ISR에서 사용 금지*.

## 실전 CVE — 동시성 패턴

```
2017 — Dirty COW (CVE-2016-5195)
       Linux kernel COW race — TOCTOU + race
       무권한 사용자가 read-only 메모리 수정 → 권한 상승

2019 — checkm8 (BootROM)
       USB DFU mode race
       부팅 시 메모리 접근 race → permanent jailbreak

2021 — io_uring race (CVE-2021-41073)
       리눅스 신규 IO API의 워커 스레드 race → LPE
```

동시성 race는 *재현이 어렵고 패치도 어렵다*. *처음부터 안전 패턴*이 핵심.

## 시리즈 마무리 — CERT C 적용 권장

1. **clang-tidy `cert-*`로 시작** — 무료, CI에 즉시 통합.
2. **ASan + TSan 테스트** — UAF, race 검출.
3. **MISRA와 병행** — 안전(MISRA) + 보안(CERT).
4. **Priority L1부터** — 시간이 한정되면 L1 규칙 위주.
5. **CWE 매핑 활용** — CVE 데이터베이스 검색으로 위반 패턴 학습.

## 권장 다음 시리즈

- **AUTOSAR C++14** — C++ 임베디드 표준. 자율주행에서 채택 가속.
- **MISRA C++** — 다음 C++ 표준이 나오면 본격 사용.
- **OWASP Mobile/IoT** — 보안 가이드 더 깊게.
- **The Art of Software Security Assessment** — 침투 테스트 관점.

## 정리

- POSIX 특정 함정: TOCTOU, vfork 금지, readlink null 종결.
- 동시성: atomic 또는 mutex. plain int에 동시 접근 금지.
- Signal handler는 *async-signal-safe + sig_atomic_t*.
- TSan으로 *race 런타임 검출*.
- 임베디드 RTOS도 *같은 원칙* — mutex, atomic, ISR-safe API.
- CVE 데이터베이스가 *위반 패턴*의 가장 좋은 교육 자료.

## 관련 항목

- [Ch 9 — I/O, ENV, Signals](/blog/embedded/automotive/cert-c/chapter09-io-env-signals)
- [MISRA C Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [AUTOSAR C++ Ch 1](/blog/embedded/automotive/autosar-cpp/chapter01-intro)
- [CWE Top 25](https://cwe.mitre.org/top25/)
