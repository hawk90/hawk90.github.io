---
title: "Linux Kernel Coding Style — 시리즈 개요"
date: 2025-05-14T00:00:00
description: "Linux Kernel Coding Style — Linus Torvalds의 취향이 담긴, 30년 검증된 C 코딩 규칙. 8-space tabs, K&R braces, 짧은 함수."
tags: [Linux, Kernel, C, Style-Guide, Standards, Series]
series: "Linux Kernel Coding Style"
seriesOrder: 0
draft: false
---

> "First off, I'd suggest printing out a copy of the GNU coding standards, and NOT read it. Burn them, it's a great symbolic gesture."
> — Linus Torvalds, Linux kernel coding style

## 위치와 성격

```
MISRA C       ── 안전중요 (자동차, 의료)
CERT C        ── 보안 (CVE 예방)
Google C++    ── 대규모 코드베이스 가독성

Linux Kernel  ── 시스템 프로그래밍, C 언어, 30년+ 역사
```

다른 표준이 — 산업 안전 / 보안 / 기업 일관성에 초점을 맞춘다면, Linux Kernel 스타일은 — **시스템 프로그래머의 실용주의**에 초점을 맞춘다.

## 핵심 원칙

### 1. 가독성 > 압축

```c
// Bad: 한 줄에 모든 것
if(x){y=z;return w;}

// Good: 명확하게 분리
if (x) {
        y = z;
        return w;
}
```

### 2. 8-space tabs는 의도적이다

```c
// 8칸 들여쓰기는 — 중첩이 깊어지면 불편하게 만든다
// 그것이 "코드를 리팩토링하라"는 신호다
void bad_function(void)
{
        if (condition1) {
                if (condition2) {
                        if (condition3) {
                                // 여기서 이미 24칸...
                                // 뭔가 잘못됐다
                        }
                }
        }
}
```

### 3. 함수는 짧게, 한 가지만

> "Functions should be short and sweet, and do just one thing."

- 함수 하나 = 한 화면 (24줄)
- 지역 변수 5~10개 이하
- 중첩 깊이 3단계 이하

## 시리즈 구성

| 장 | 제목 | 핵심 |
|:--:|------|------|
| 1 | Indentation & Braces | 8-space tabs, K&R 스타일 |
| 2 | Naming & Typedefs | 소문자_밑줄, typedef 절제 |
| 3 | Functions | 짧게, 한 가지만, exit 포인트 |
| 4 | Comments | What보다 Why |
| 5 | Macros & Inline | 대문자, 부작용 주의 |
| 6 | Memory & Returns | kmalloc, 에러 처리 |
| 7 | Data Structures | 레퍼런스 카운팅, 리스트 |
| 8 | Kconfig & Modules | 설정 시스템 |
| 9 | Tools & Docs | checkpatch, sparse |

## 원문 출처

- [Documentation/process/coding-style.rst](https://www.kernel.org/doc/html/latest/process/coding-style.html)
- 버전: Linux 6.x 기준
- 최초 작성: Linus Torvalds

## 적용 범위

이 스타일은 **Linux 커널 코드**에 적용된다:

- 커널 코어
- 드라이버
- 파일시스템
- 네트워킹 스택

유저스페이스 프로그램에는 — 다른 스타일을 사용해도 된다. 하지만 시스템 프로그래밍을 한다면 — 이 스타일을 알아두는 것이 좋다.

## 다른 스타일과 비교

| 항목 | Linux Kernel | Google C++ | GNU |
|------|--------------|------------|-----|
| 들여쓰기 | 8-space tabs | 2 spaces | 2 spaces |
| Brace | K&R | K&R | GNU (줄바꿈) |
| 줄 길이 | 80 (권장 100) | 80 | 79 |
| 명명 | snake_case | CamelCase | snake_case |
| 주석 | C (/* */) | C++ (//) | C |

## 왜 배워야 하는가

1. **역사**: 30년+ 검증된 규칙
2. **규모**: 3000만 줄 이상의 코드베이스
3. **기여**: 커널 패치 제출 시 필수
4. **실용**: 시스템 프로그래밍의 교과서

> "The answer to 'Why?' is 'Because Linus says so.'"
> — 때로는 그게 답이다

---

다음 장에서는 **Indentation & Braces**를 다룬다. 8-space tabs의 철학과 K&R 스타일 brace 배치를 살펴본다.
