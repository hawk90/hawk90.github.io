---
title: "Ch 10: Comments / Formatting / Closing"
date: 2025-05-13T10:00:00
description: "주석 (파일/클래스/함수/변수/구현/TODO/Deprecation), 형식 (줄 길이 / 공백 / 중괄호 / 조건문 / 루프 / 포인터 / 리턴 / 초기화), Exceptions to Rules, Inclusive Language, Parting Words."
tags: [Google, C++, Style-Guide, Comments, Formatting]
series: "Google C++ Style"
seriesOrder: 10
draft: true
---

## 작성 예정

### Comments
- Comment Style — `//` 선호 (`/* */`는 특정 경우)
- File Comments — 라이선스 / 저자 / 목적
- Class Comments — 사용법 / 동시성 가정
- Function Comments — 입력 / 출력 / 부작용
- Variable Comments — 의미 명확하면 생략
- Implementation Comments — 어려운 부분만
- Function Argument Comments — `/* opt= */ true` 패턴
- Punctuation / Spelling / Grammar — 완전한 문장
- TODO Comments — `TODO(username): ...`
- Deprecation Comments — `ABSL_DEPRECATED("...")`

### Formatting
- Line Length — 80자
- Non-ASCII Characters — UTF-8, `u8` literal
- Spaces vs. Tabs — 2 spaces, 탭 금지
- Function Declarations / Definitions — 반환 타입 같은 줄
- Function Calls — 가능하면 한 줄
- Braced Initializer List Format — 일관성
- Conditionals — `if (cond) { ... }` — 공백 / 중괄호
- Loops and switch — `default:` 처리
- Pointer and Reference Expressions — `T* p` / `T& r` (왼쪽 결합)
- Boolean Expressions — 한 줄 권장
- Return Values — 불필요한 괄호 회피
- Variable and Array Initialization — `=`, `()`, `{}` 선택
- Preprocessor Directives — 들여쓰기 없이
- Class Format — public → protected → private
- Constructor Initializer Lists — 정의 순서
- Namespace Formatting — 들여쓰기 없이

### 마무리
- Exceptions to the Rules — 기존 코드 일관성 우선
- Inclusive Language — 차별적 용어 회피 (blacklist/master 등)
- Parting Words — 일관성 > 개인 선호
