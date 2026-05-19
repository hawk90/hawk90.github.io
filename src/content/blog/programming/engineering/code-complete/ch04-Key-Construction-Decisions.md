---
title: "Chapter 4: Key Construction Decisions"
date: 2026-05-11T04:00:00
description: "construction 시작 전 결정 4가지 — 언어 선택, 컨벤션, 기술 파도 위치, 주요 관행 선택."
series: "Code Complete"
seriesOrder: 4
tags: [code-complete, decisions, McConnell]
draft: true
---

## 이 챕터의 메시지

> *"By relieving the brain of all unnecessary work, a good notation sets it free to concentrate on more advanced problems... Probably nothing in the modern world would have more astonished a Greek mathematician than to learn that... a huge proportion of the population of Western Europe could perform the operation of division for the largest numbers."* — Alfred North Whitehead

좋은 표기법(언어)이 — 뇌를 자유롭게 한다. Ch 3의 — upstream prereq 다음 단계 = construction 자체에 대한 — 4가지 결정.

## 핵심 내용

- §4.1 **언어 선택** — 친숙도가 30% 생산성 차이, 고수준 언어가 — 5-15배.
- §4.2 **컨벤션** — construction **전에** 정의. 사후 적용 거의 불가능.
- §4.3 **기술 파도의 위치** — late wave(성숙) vs early wave(초기). 둘 다 가능, 그러나 — 접근이 다르다.
- §4.4 **주요 관행 선택** — 페어 vs 솔로, 테스트 우선 vs 인스펙션 — 의식적 선택.

## §4.1 Choice of Programming Language

언어 선택이 — 생산성과 코드 품질에 — 여러 방식으로 영향.

### HARD DATA — 친숙도

> 3년+ 사용 언어 = 동등 경험의 새 언어보다 — **약 30% 더 생산성** (Cocomo II, Boehm et al 2000).
>
> IBM 연구 — 광범위 경험 = 최소 경험보다 **3배** 이상 생산성 (Walston & Felix 1977).

### HARD DATA — 고수준 언어

> C++, Java, Smalltalk, VB 같은 고수준 언어 = assembly, C 같은 저수준보다 **5~15배** 생산성·신뢰성·단순성·이해 가능성 (Brooks 1987, Jones 1998, Boehm 2000).

### Table 4-1 — C 대비 표현력 비율

각 언어의 한 줄이 — C의 몇 줄과 같은가:

| 언어 | C 대비 |
|---|---|
| C | 1:1 |
| C++ | 1:2.5 |
| Fortran 95 | 1:2 |
| Java | 1:2.5 |
| Perl | 1:6 |
| Smalltalk | 1:6 |
| **SQL** | **1:10** |
| Visual Basic | 1:4.5 |

(Jones 1998, Boehm 2000)

### 인터프리트 vs 컴파일

IBM 자료 — 인터프리트 언어 개발자 = 컴파일 언어보다 — 더 생산적 (Jones 1986a). VB처럼 둘 다 가능한 경우 — 인터프리트로 개발, 컴파일로 출시.

### Sapir-Whorf 가설

언어학자 Sapir와 Whorf — **언어의 표현력과 사고 능력 사이의 관계**. 단어가 없는 생각은 — 표현·형성이 어렵다 (Whorf 1956).

프로그래머도 — 언어가 사고를 형성. McConnell의 일화:

> C++ 새 시스템. 그러나 — 프로그래머 대부분이 Fortran 출신. C++에서 "disguised Fortran"을 — 짰다. goto와 전역 데이터 같은 Fortran의 나쁜 기능을 — 흉내 내고, C++의 풍부한 객체지향을 — 무시 (Hanson 1984, Yourdon 1986a).

### 언어 짧은 소개 (PDF Language Descriptions)

PDF는 14개 언어를 — 짧게 설명: **Ada / Assembly / C / C++ / C# / Cobol / Fortran / Java / JavaScript / Perl / PHP / Python / SQL / Visual Basic**.

### Table 4-2 — 프로그램 종류별 추천 (요약)

| 종류 | Best | Worst |
|---|---|---|
| Cross-platform | Java, Perl, Python | Assembler, C#, VB |
| DB 조작 | SQL, VB | Assembler, C |
| 직접 메모리 | Assembler, C, C++ | C#, Java, VB |
| 분산 | C#, Java | — |
| **빠른 실행** | Assembler, C, C++, VB | JavaScript, Perl, Python |
| **수학 계산** | Fortran | Assembler |
| 빠른·더러운 | Perl, PHP, Python, VB | Assembler |
| 실시간 | C, C++, Assembler | C#, Java, Python, Perl, VB |
| 보안 | C#, Java | C, C++ |
| **문자열** | Perl, Python | C |
| 웹 | C#, Java, JavaScript, PHP, VB | Assembler, C |

> 분류는 넓다. 특정 프로젝트의 — 자기 평가를 — 대체하지 마라.

## §4.2 Programming Conventions

고품질 소프트웨어 = **아키텍처의 개념적 통일성**과 — 저수준 구현 사이에 — 관계가 보인다.

> 큰 프로그램은 — 통합 구조가 필요. 그렇지 않으면 — 클래스의 — 어수선한 모음 + 스타일의 — 흐트러진 변형.

### 그림 비유 (PDF)

> 좋은 디자인의 그림이 있는데 — 한 부분은 고전파, 한 부분은 인상파, 한 부분은 입체파면? 큰 디자인을 — 아무리 잘 따랐어도 — 개념적 통일성 X. 콜라주처럼 보일 것.

프로그램도 — **저수준의 통일성**이 필요.

### KEY POINT

> construction 시작 **전에** — 사용할 프로그래밍 컨벤션을 정해라. 컨벤션은 — 너무 저수준이라 — 작성 후에 — **소급 적용이 거의 불가능**.

세부 — 책 전체에 산재.

## §4.3 Your Location on the Technology Wave

McConnell의 관찰 — 기술의 — 파도(wave) 위치.

- PC가 떠오르고 메인프레임 — 진다.
- GUI가 — 캐릭터 기반을 — 대체.
- 웹이 떠오르고 Windows — 진다.
- 책을 읽는 때 — 이미 새 기술이 등장 (2004 기준).

### Late-Wave 환경 (성숙)

웹 프로그래밍 (2000년대 중반) 같은 — 성숙한 환경.

- **풍부한 인프라**.
- 언어 선택 — 많음.
- 컴파일러 — 거의 버그 없음.
- 도구 통합 — UI·DB·보고서·비즈니스 로직을 — 한 환경에서.
- 문서·FAQ·컨설턴트·훈련 — 풍부.

### Early-Wave 환경 (초기)

웹 프로그래밍 (1990년대 중반) 같은 — 초기.

- 언어 선택 — 적고 — 버그 많음.
- "이 언어가 — 어떻게 동작하는지" 파악에 — 많은 시간.
- 라이브러리·OS의 버그 — 우회.
- 디버거가 — 없거나 — 원시적.
- 컴파일러 버전 변경이 — 코드를 — 깨뜨림.
- 도구가 — 통합 안 됨.
- 컴파일러·라이브러리 출시에 — 기존 기능 유지에만 — 노력.

### Early-Wave 추천 아님? — 그렇지 않다

> Turbo Pascal, Lotus 123, Microsoft Word, Mosaic 브라우저 — **early-wave에서 — 가장 혁신적인 응용**이 — 자주 나옴.

요점 = **자기 위치를 — 인식**. 처음이면 — 새 기능 작성보다 — 도구 분투에 — 큰 비중. Late면 — 새 기능에 집중 가능.

> 원시적 환경에 있다면 — 이 책의 관행이 — 성숙한 환경보다 — **더 도움**된다. 도구가 부족하면 — 사고로 — 보완.

### Programming IN vs INTO a Language (David Gries 1981)

McConnell이 — Gries의 구분을 — 인용.

- **Programming IN a language** = 언어가 직접 지원하는 — 구조만 — 사용. 도구가 원시적이면 — 사고도 원시적.
- **Programming INTO a language** = 표현하고 싶은 사고를 — 먼저 결정 → 언어의 도구로 — 어떻게 표현할지.

### McConnell의 VB 일화

VB 초기 — 비즈니스 로직·UI·DB를 — 분리하고 싶었다. 그러나 VB에 — 내장 방식 X. 두면 — `.frm` 파일에 모든 게 — 섞임.

해법 = 컨벤션 도입.

```
.frm 파일 = DB에서 데이터 가져오기/저장만 — 허용.
다른 부분과의 데이터 통신 — 금지.
각 폼에 IsFormCompleted() — 호출자가 — 완료 여부를 확인.
비즈니스 로직 + 검증 — 동반 .bas 파일.
```

VB가 — 이를 직접 지원하지 X. 그러나 — 단순한 컨벤션이 — VB의 구조 부족을 — 보완.

> **이 책의 가장 중요한 원리 = 특정 언어에 의존하지 X, 언어를 — 사용하는 방식에 의존**. 언어가 부족하면 — 보완. 자기 코딩 컨벤션, 표준, 클래스 라이브러리, 기타 보강을 — 발명.

## §4.4 Selection of Major Construction Practices

좋은 관행 중 — 어느 것을 강조할지 결정. 페어 프로그래밍 + 테스트 우선, 솔로 + 공식 인스펙션 — 둘 다 — 상황에 따라 잘 동작.

### Checklist (요약)

**Coding**
- 명명·주석·포맷팅 컨벤션 정의?
- 아키텍처가 함의하는 코딩 관행(에러 처리·보안) 정의?
- 기술 파도 위치 인식과 접근 조정? 언어 위에서(INTO) 짜기?

**Teamwork**
- 통합 절차 정의?
- 페어 vs 솔로?

**Quality Assurance**
- 테스트 우선?
- 단위 테스트?
- 디버거에서 — 체크인 전 검토?
- 통합 테스트?
- 동료 리뷰·인스펙션?

**Tools**
- 버전 관리 도구?
- 언어와 버전?
- 비표준 언어 기능 허용?
- 기타 도구 — 에디터, 리팩토링, 디버거, 테스트 프레임, 구문 검사?

## Key Points (§)

McConnell 원문 4가지:

1. 모든 언어는 — **장단점**이 있다. 사용하는 언어의 강·약점을 — 인식.
2. **construction 전에 컨벤션 정립**. 사후 — 거의 불가능.
3. construction 관행은 — 어떤 프로젝트에 쓸 수 있는 것보다 — 많다. 의식적으로 선택.
4. **기술 파도 위치**가 — 효과적인 접근을 결정. 자기 위치를 식별하고 — 계획·기대를 — 조정.

## 정리

- 언어 선택 = 친숙도와 표현력. 30% (친숙) + 5-15배 (고수준).
- 컨벤션 = construction 전에. 그림의 통일성처럼.
- 기술 파도 = late(성숙) vs early(초기). 둘 다 가능, 접근 다름.
- IN vs INTO — 언어가 부족하면 — 컨벤션으로 보완.
- 주요 관행 — 체크리스트로 — 의식적 선택.

## 관련 항목

- [Ch 3: Upstream Prerequisites](/blog/programming/engineering/code-complete/ch03--Upstream-Prerequisites)
- [Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
- [Ch 30: Programming Tools](/blog/programming/engineering/code-complete/ch30-Programming-Tools)
