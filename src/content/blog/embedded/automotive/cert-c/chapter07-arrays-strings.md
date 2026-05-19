---
title: "Ch 7: ARR & STR — 배열 경계와 문자열 안전성"
date: 2026-05-18T08:00:00
description: "Buffer overflow 차단 — 배열 경계(ARR30), 충분한 버퍼(STR31), null 종결(STR32), 안전 wrapper."
tags: [cert-c, array, string, buffer-overflow, null-termination, cwe-119]
series: "CERT C"
seriesOrder: 7
draft: false
---

배열과 문자열은 *CVE 통계 1위*다. CWE-119(buffer overflow), CWE-787(out-of-bounds write), CWE-125(out-of-bounds read) — 메모리 안전 문제의 *대부분*이 여기서 나온다.

## ARR30-C — 포인터 산술이 *배열 경계 내*

MISRA R18.1과 같다.

```c
// 위반
int arr[10];
for (int i = 0; i <= 10; i++) {     // i == 10에서 위반
    arr[i] = 0;
}

// 더 미묘
int *p = arr + 11;                  // 위반 — one-past-end 넘음
int x = arr[-1];                    // 위반 — 음수 인덱스
```

복합 조건의 *off-by-one*이 가장 흔하다.

```c
// 위반 — strlen은 null 제외, 인덱스는 0부터
for (size_t i = 0; i <= strlen(s); i++) {
    s[i] = toupper(s[i]);
}

// Good
size_t n = strlen(s);
for (size_t i = 0; i < n; i++) {
    s[i] = toupper(s[i]);
}
```

## ARR32-C — Variable Length Array 크기 검증

VLA를 *완전 금지*하는 MISRA와 달리 CERT는 *크기 검증 후 허용*.

```c
// 위반 — 사용자 입력이 그대로 VLA 크기
size_t n = read_size_from_user();
int arr[n];                         // n이 거대값이면 스택 폭주

// Good — 상한 검사
if (n > MAX_LOCAL_ARRAY || n == 0) return -EINVAL;
int arr[n];
```

권장은 *고정 크기 배열*. 동적 크기가 필요하면 heap(`malloc`) + 검사.

## ARR36-C — *같은 배열에서 온 포인터끼리만* 비교

```c
int a[10], b[10];
if (&a[0] < &b[0]) { /* 위반 — 서로 다른 배열 */ }
```

표준이 *같은 배열 안에서만* 결과를 정의.

## ARR37-C — 비배열 포인터에 산술 적용 금지

```c
int x = 5;
int *p = &x;
p[1] = 10;          // 위반 — x는 *단일 객체*, 배열 아님
*(p + 1) = 10;      // 위반 — 같은 의미
```

`&x`는 *길이 1의 배열*과 같지만 표준상 *one-past-end까지만* 합법.

## ARR38-C — 포인터 *유효 범위 충분*히

라이브러리 함수에 포인터 전달 시 *함수가 요구하는 크기*만큼 유효해야.

```c
char short_buf[5];
fgets(short_buf, 100, stdin);   // 위반 — buf는 5바이트, 100 요구
```

`fgets(buf, sizeof(buf), stdin)`이 표준 관용구.

## ARR39-C — 다른 객체 *타입*과 포인터 산술 금지

```c
struct S { int a; int b; };
struct S s;
int *p = (int *)&s;
p[2] = 5;           // 위반 — struct는 2개 int지만 padding 등 모름
```

## STR30-C — 문자열 리터럴 *수정 금지*

```c
char *s = "hello";
s[0] = 'H';         // 위반 — UB (read-only 메모리)
```

문자열 리터럴은 *read-only 섹션*에 둘 수 있다. 수정 시 SIGSEGV 또는 silent corruption.

```c
// Good — 배열 복사
char s[] = "hello";
s[0] = 'H';         // OK — 자기 자신의 배열
```

## STR31-C — 문자열 *저장 공간 충분히*

`strcpy`, `strcat`, `sprintf`는 *길이 제한 없음* — 호출자가 보장.

```c
// 위반
char buf[10];
strcpy(buf, "this is a long string");      // overflow

// 위반 - sprintf 폭주
char buf[10];
sprintf(buf, "value=%d", 1234567890);

// Good 1 — 사이즈 명시 함수
char buf[10];
strncpy(buf, src, sizeof(buf) - 1);
buf[sizeof(buf) - 1] = '\0';

// Good 2 — snprintf
snprintf(buf, sizeof(buf), "value=%d", n);
```

**주의: `strncpy`는 *null 종결 보장 X*.** 원본이 destination보다 길면 null이 안 들어간다.

## STR32-C — null 종결 *보장*

```c
char buf[10];
strncpy(buf, "0123456789abc", sizeof(buf));     // 위반 — null 종결 X
strlen(buf);    // 위반 — 길이 끝 모름 → 임의 메모리 읽음 → 정보 누설
```

대응:

```c
strncpy(buf, src, sizeof(buf) - 1);
buf[sizeof(buf) - 1] = '\0';

// 더 깔끔
size_t safe_strcpy(char *dst, size_t dst_sz, const char *src) {
    if (dst_sz == 0) return 0;
    size_t i = 0;
    while (i + 1 < dst_sz && src[i] != '\0') {
        dst[i] = src[i];
        i++;
    }
    dst[i] = '\0';
    return i;
}
```

## STR37-C — `ctype` 인자는 `int`로

EXP37과 같다. `isspace(c)`는 `c`가 `int(unsigned char)` 또는 EOF여야.

```c
char c = '\xFF';
isspace(c);                     // 위반 (c가 signed면)
isspace((unsigned char)c);      // Good
```

## STR38-C — Narrow와 Wide 문자열 혼용 금지

```c
char narrow[10];
wchar_t wide[10];
strcpy((char *)wide, "hello");      // 위반 — wchar 버퍼에 narrow 복사
wcscpy(narrow, L"hello");           // 위반 — narrow 버퍼에 wide 복사
```

`wchar_t`와 `char`는 *완전히 다른 인코딩·크기*. wcs* 함수와 str* 함수는 *섞이지 않는다*.

## C11 Annex K — `_s` suffix 함수

C11이 추가한 *bounds-checked* 함수.

```c
errno_t strncpy_s(char *dest, rsize_t destsz, const char *src, rsize_t count);
errno_t strcat_s(char *dest, rsize_t destsz, const char *src);
errno_t sprintf_s(char *buffer, rsize_t bufsz, const char *format, ...);
```

장점: 표준화된 안전 API.

단점:

- **구현이 들쭉날쭉** — Microsoft는 지원, glibc는 *거부*, BSD는 부분.
- **MISRA가 권장하지 않음** — 일관된 구현 부재.
- **인터페이스가 어색** — `rsize_t`, `errno_t` 등 추가 타입.

대안: *프로젝트 자체 wrapper*.

```c
// 표준화된 안전 wrapper
typedef struct {
    const char *data;
    size_t len;
} string_view_t;

bool string_eq(string_view_t a, string_view_t b) {
    return a.len == b.len && memcmp(a.data, b.data, a.len) == 0;
}

bool string_copy(char *dst, size_t dst_sz, string_view_t src) {
    if (src.len + 1 > dst_sz) return false;
    memcpy(dst, src.data, src.len);
    dst[src.len] = '\0';
    return true;
}
```

## strlcpy / strlcat — BSD 함수

OpenBSD가 만든 *실용적 안전 함수*. C 표준은 아니지만 *Linux glibc*는 2.38부터 지원.

```c
size_t strlcpy(char *dst, const char *src, size_t dstsize);
// 반환값: src 길이 (잘렸으면 dstsize 이상)
// 항상 null 종결

size_t strlcat(char *dst, const char *src, size_t dstsize);
// 반환값: 결과 의도 길이
```

```c
char buf[10];
if (strlcpy(buf, src, sizeof(buf)) >= sizeof(buf)) {
    // 잘림 — 에러 처리
}
```

*MISRA Annex K보다 strlcpy 선호*가 일반적이다.

## 인덱싱 vs 포인터 산술 — 어느 쪽?

```c
// 1. 인덱싱
for (size_t i = 0; i < n; i++) {
    arr[i] = 0;
}

// 2. 포인터 산술
for (int *p = arr; p < arr + n; p++) {
    *p = 0;
}
```

CERT는 *어느 쪽도 강하게 권장*하지 않지만 *인덱싱*이 *경계 분석이 쉽다*. 정적 분석기·sanitizer 모두 인덱싱 패턴을 더 잘 잡는다.

## 자주 마주치는 취약점

| 규칙 | CVE 패턴 |
|------|---------|
| STR31 (충분한 버퍼) | strcpy/sprintf/gets → stack/heap overflow |
| STR32 (null 종결) | strncpy 후 strlen → OOB read → ASLR 우회 |
| ARR30 (배열 경계) | off-by-one → 인접 변수 손상 |
| ARR32 (VLA 크기) | 사용자 제어 크기 → stack overflow |

## 권장 패턴 — 종합

```c
// 1. 모든 문자열 함수에 *크기*
strncpy(dst, src, sizeof(dst) - 1);
dst[sizeof(dst) - 1] = '\0';

// 2. snprintf 우선
snprintf(buf, sizeof(buf), "%s = %d", name, value);

// 3. 길이 제한 함수 우선
fgets(buf, sizeof(buf), fp);    // gets 절대 금지

// 4. 배열 크기 매크로
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))
for (size_t i = 0; i < ARRAY_SIZE(arr); i++) { /* ... */ }

// 5. 컴파일러 보호
#define _FORTIFY_SOURCE 2       // glibc: 컴파일 시 size 검사
gcc -fstack-protector-strong    // canary
gcc -D_FORTIFY_SOURCE=2 -O2     // 활성화
```

## 정리

- *모든* 문자열·배열 연산에 *크기*가 따라다녀야 한다.
- `strcpy`, `strcat`, `sprintf`, `gets`는 *함수 자체를 쓰지 마라*.
- `strncpy`는 null 종결 보장 안 함 — 사용 후 수동 종결.
- 문자열 리터럴 수정 금지 — read-only 메모리.
- `_s` suffix 함수는 *구현 들쭉날쭉* — `strlcpy`/`strlcat` 선호.
- 컴파일러 보호(`_FORTIFY_SOURCE`, stack protector, ASLR)도 함께.

## 다음 장 예고

8장은 MEM — 메모리 관리. malloc/free, double free, use-after-free, 누수. heap exploitation의 기본.

## 관련 항목

- [Ch 6 — Floating Point](/blog/embedded/automotive/cert-c/chapter06-floating-point)
- [Ch 8 — Memory Management](/blog/embedded/automotive/cert-c/chapter08-memory)
- [CWE-119 Buffer Overflow](https://cwe.mitre.org/data/definitions/119.html)
