---
title: "Ch 9: FIO / ENV / SIG / ERR — 파일, 환경, 시그널, errno"
date: 2026-05-18T10:00:00
description: "TOCTOU(FIO30), 입력 검증(FIO34), getenv 함정(ENV01), async-signal-safe(SIG30), errno 처리(ERR30)."
tags: [cert-c, file-io, signal, environment, errno, toctou, race]
series: "CERT C"
seriesOrder: 9
draft: true
---

이 장은 시스템과의 *경계*에서 일어나는 함정을 다룬다. 파일 I/O, 환경 변수, 시그널 — 셋 다 *비동기·동시성·외부 입력*이 끼어들어 *race condition과 권한 우회*의 단골 무대다.

## FIO30-C — TOCTOU race 회피

**Time-Of-Check to Time-Of-Use** 패턴.

```c
// 위반 — 클래식 TOCTOU
if (access(path, W_OK) == 0) {
    // ← 이 사이에 공격자가 path를 심볼릭 링크로 교체
    FILE *fp = fopen(path, "w");
    fwrite(secret, 1, n, fp);
}
```

`access`는 *지금 권한 있는지* 확인. `fopen`은 *나중에 실제 열기*. 그 사이가 *race window*. setuid 프로그램에서 권한 상승으로 이어진다.

대응: *open 후 검사*.

```c
// Good — 파일을 먼저 열고 fstat
int fd = open(path, O_WRONLY | O_NOFOLLOW);
if (fd < 0) return -1;

struct stat st;
if (fstat(fd, &st) < 0 || st.st_uid != real_uid) {
    close(fd);
    return -EACCES;
}
write(fd, secret, n);
close(fd);
```

`O_NOFOLLOW`는 *심볼릭 링크 따라가지 마라*. `fstat`은 *fd에 대해* — race 없음.

## FIO34-C — 문자 입력은 정수로 받아 EOF와 구분

```c
// 위반
char c;
while ((c = getchar()) != EOF) {     // EOF가 -1, char는 0~255 (또는 -128~127)
    /* ... */
}
// char가 unsigned면 EOF 비교 never true → 무한 루프
// char가 signed면 0xFF (255) 입력이 EOF로 오인 (-1)
```

```c
// Good
int c;
while ((c = getchar()) != EOF) { /* ... */ }
```

## FIO37-C — `gets`, `fgets` 길이 검사

```c
// 위반 — gets 자체 사용 금지 (C11에서 제거)
char buf[100];
gets(buf);

// 위반 — fgets 결과 무시
fgets(buf, sizeof(buf), stdin);    // null 입력 시 buf 변경 없음

// Good
if (fgets(buf, sizeof(buf), stdin) == NULL) {
    return -EIO;
}
size_t n = strlen(buf);
if (n > 0 && buf[n - 1] == '\n') {
    buf[n - 1] = '\0';     // newline 제거
} else {
    // 줄이 잘림 - 추가 처리
}
```

## FIO39-C — 입출력 *방향 전환*에 fseek 또는 fflush

```c
FILE *fp = fopen("data", "r+");
fread(buf, 1, n, fp);
fwrite(buf, 1, n, fp);     // 위반 — read 후 write, fseek 없음
```

stdio는 *방향 전환 시 fseek/fflush*가 필요하다. 안 하면 *위치가 어디인지 불명*.

## FIO40-C — 실패한 입력 후 변수 *unspecified*

```c
int n;
if (fscanf(fp, "%d", &n) != 1) {
    // n은 unspecified — 사용 금지
}
```

스캔 실패 시 *읽기 시도된 변수는 값이 정의되지 않는다*.

## FIO42-C — 모든 열린 파일은 *닫는다*

MEM31과 비슷한 *자원 lifetime* 문제.

```c
// 위반
FILE *fp = fopen(path, "r");
if (do_work(fp) < 0) return -1;      // fclose 누락
fclose(fp);

// Good
FILE *fp = fopen(path, "r");
if (fp == NULL) return -1;
int rc = do_work(fp);
fclose(fp);
return rc;
```

## ENV01-C — `getenv` 결과는 *수정 금지*

```c
// 위반
char *path = getenv("PATH");
path[0] = '/';        // UB — getenv는 implementation-defined storage

// Good — 복사 후 수정
char *env = getenv("PATH");
if (env == NULL) return -1;
char path[256];
strncpy(path, env, sizeof(path) - 1);
path[sizeof(path) - 1] = '\0';
path[0] = '/';
```

`getenv` 반환값은 *컴파일러가 관리하는 메모리* 가리키므로 수정·free 모두 UB.

## ENV02-C — *비결정적 환경*에 의존하지 마라

```c
// 위반
char *home = getenv("HOME");
chdir(home);          // home이 공격자 제어 가능 (setuid 프로그램에서)
```

setuid 프로그램은 *환경 변수 전체*를 *부분 신뢰만*. 보안 critical 경로는 *환경 변수 사용 회피*.

## ENV33-C — `system()` 호출 회피

```c
// 위반 — shell 주입 위험
char cmd[256];
snprintf(cmd, sizeof(cmd), "rm %s", user_input);
system(cmd);          // user_input에 "; cat /etc/passwd" 들어가면 RCE
```

대안: *직접 fork + execve*.

```c
pid_t pid = fork();
if (pid == 0) {
    char *argv[] = { "/bin/rm", "--", user_input, NULL };
    execve(argv[0], argv, environ);
    _exit(127);
}
waitpid(pid, NULL, 0);
```

`execve`는 *shell 해석 없이* 인자를 그대로. 주입 불가능.

## SIG30-C — signal handler는 *async-signal-safe 함수만* 호출

POSIX의 async-signal-safe 함수 목록은 *매우 작다*.

**허용 (일부):**

- _exit, abort, accept, alarm, bind, ..., write
- sig_atomic_t 변수 접근

**금지:**

- malloc, free          ← heap 손상 가능
- printf, fprintf       ← stdio lock
- signal, raise         ← 자기 자신 호출
- 거의 모든 라이브러리 함수

```c
// 위반
void handler(int sig) {
    printf("got signal %d\n", sig);     // 위반 — stdio
    free(g_buffer);                      // 위반 — malloc lock
}

// Good — flag만 설정
volatile sig_atomic_t g_signaled = 0;
void handler(int sig) {
    g_signaled = 1;
}

// 메인 루프
while (running) {
    if (g_signaled) {
        printf("got signal\n");
        g_signaled = 0;
    }
}
```

## SIG31-C — signal handler에서 *공유 객체* 접근은 `volatile sig_atomic_t`만

```c
volatile sig_atomic_t flag = 0;     // OK
volatile int counter = 0;            // 위반 — sig_atomic_t 아님

void handler(int sig) {
    flag = 1;                        // OK
    counter++;                       // 위반 — atomic 아님
}
```

C11의 `_Atomic`도 가능하지만 *signal context에서의 atomic*은 *lock-free 보장*이 있어야.

## SIG34-C — handler 안에서 *handler 재등록* 금지

```c
void handler(int sig) {
    signal(sig, handler);      // 위반 — handler 안에서 signal()
    /* ... */
}
```

`signal` 자체가 *async-signal-safe하지 않다*. `sigaction`이 더 안전하고 *재등록이 필요 없는* 의미론을 가진다.

```c
// Good — sigaction
struct sigaction sa = {0};
sa.sa_handler = handler;
sa.sa_flags = 0;                  // 또는 SA_RESTART
sigaction(SIGTERM, &sa, NULL);
```

## ERR30-C — `errno` 사용 전 0으로 reset

```c
// 위반
char *end;
long v = strtol(s, &end, 10);
if (errno == ERANGE) {       // strtol 호출 전에 errno가 무엇이었는지 모름
    /* ... */
}

// Good
char *end;
errno = 0;
long v = strtol(s, &end, 10);
if (errno == ERANGE || end == s) {
    /* ... */
}
```

많은 함수는 *성공 시 errno를 건드리지 않는다*. *이전 호출의 errno가 남아 있다*.

## ERR32-C — errno *원자성* 검사

errno는 thread-local이지만 *signal handler*에서 변경 가능. Critical section 안 또는 즉시 검사.

```c
errno = 0;
ssize_t n = read(fd, buf, sizeof(buf));
if (n < 0) {
    int err = errno;     // 즉시 저장 — 이후 다른 함수가 errno 덮어쓸 수 있음
    log_error("read failed: %s", strerror(err));
    return err;
}
```

## ERR33-C — 라이브러리 함수 *반환값 검사*

MISRA 17.7과 같은 메시지.

```c
// 위반
fopen("config", "r");           // 반환값 무시
strncpy(dst, src, n);            // 일부 함수는 반환값에 정보

// Good
FILE *fp = fopen("config", "r");
if (fp == NULL) {
    return -ENOENT;
}
```

`__attribute__((warn_unused_result))` 또는 C23 `[[nodiscard]]`로 *반환값 사용 강제*.

## 자주 마주치는 취약점

| 규칙 | CVE 패턴 |
|------|---------|
| FIO30 (TOCTOU) | setuid 권한 상승 |
| FIO37 (gets) | classic stack overflow |
| ENV33 (system) | 명령어 주입 |
| SIG30 (signal handler) | reentrancy via malloc → heap 손상 |
| ERR30 (errno) | 잘못된 에러 처리 → 보안 결정 우회 |

## 정리

- TOCTOU 회피 — *open 후 fstat*. `O_NOFOLLOW`.
- `gets` 금지, `fgets`도 결과 검사 + newline 처리.
- `getenv` 결과는 *읽기 전용 + 비신뢰*.
- `system` 대신 *직접 fork + execve*.
- Signal handler에서 *async-signal-safe 함수만, volatile sig_atomic_t만*.
- `errno`는 사용 *직전에 0으로 reset*, 사용 *직후에 저장*.

## 다음 장 예고

10장은 POS, CON — POSIX와 동시성. 스레드 안전성, mutex, atomic, race condition.

## 관련 항목

- [Ch 8 — Memory Management](/blog/embedded/automotive/cert-c/chapter08-memory)
- [Ch 10 — POSIX & Concurrency](/blog/embedded/automotive/cert-c/chapter10-posix-concurrency)
