---
title: "Scripts and Tooling"
source_message: 33
source_role: assistant
---

# Scripts and Tooling

## M-19. One Script per Symptom

### 문제마다 새로운 스크립트 작성

```text
audit-links.py
fix-links.py
check-tags.py
check-series.py
check-dates.py
```

### 문제

공통 로직과 규칙이 분산된다.

### 개선

공통 parser·manifest·diagnostic framework 위에 rule을 추가한다.

---

## M-20. Every Script Parses Markdown Differently

### Node와 Python 도구가 서로 다른 parser 사용

### 문제

한 도구에서는 유효하고 다른 도구에서는 오류가 된다.

### 개선

공통 중간 manifest를 생성해 모든 도구가 소비하게 한다.

---

## M-21. Script as Undocumented Tribal Knowledge

### 작성자만 실행 방법을 앎

### 증상

- 옵션 설명 없음
- 입력·출력 불명확
- 실패 코드 없음
- README에 이름만 존재

### 개선

각 명령에 `--help`, 목적, 예제, 실패 조건을 제공한다.

---

## M-22. Hidden Script Side Effects

### audit 명령인데 파일도 수정

### 문제

검사와 수정의 경계가 불명확하다.

### 개선

```text
audit:links
fix:links
```

처럼 읽기와 쓰기 명령을 분리한다.

---

## M-23. Auto-Fix Without Confidence

### 불확실한 링크나 태그를 자동 수정

### 문제

기술적으로 유효하지만 의미상 틀린 연결이 생긴다.

### 개선

confidence threshold를 두고 애매한 경우 report만 생성한다.

---

## M-24. No Fixture Tests for Content Tools

### 실제 전체 블로그로만 스크립트 검증

### 문제

작은 edge case를 재현하기 어렵다.

### 개선

테스트용 Markdown fixture를 둔다.

- 잘못된 front matter
- 코드 블록 안 링크
- 한글 slug
- 중복 시리즈 순서
- redirect alias

---

## M-25. Full Repository Scan for Every Command

### 작은 검사도 모든 파일 탐색

### 문제

도구 사용이 느려지고 자주 실행하지 않게 된다.

### 개선

변경 파일 모드와 전체 모드를 분리한다.

---

## M-26. Tool Output as Unstructured Text

### 결과가 터미널 문자열뿐

### 문제

CI annotation, dashboard, 자동 수정에 재사용하기 어렵다.

### 개선

사람용 출력과 JSON/SARIF 출력 옵션을 함께 제공한다.

---

## M-27. No Severity Model

### 모든 문제를 동일하게 출력

### 개선

```text
error
warning
info
suggestion
```

으로 나누고 배포 차단 여부를 분리한다.

---

## M-28. Rule Without Rationale

### “description이 없습니다”만 출력

### 문제

왜 필요한지, 어떻게 고쳐야 하는지 알기 어렵다.

### 개선

진단 결과에 이유와 수정 예를 포함한다.

---

## M-29. Rule Explosion

### 품질 규칙이 계속 늘어남

### 문제

글을 쓰기보다 lint를 만족시키는 작업이 된다.

### 개선

규칙마다 다음을 기록한다.

- 해결하는 실제 문제
- 오탐률
- 자동 수정 가능성
- 차단 여부
- 폐기 조건

---

## M-30. Linter as Editorial Authority

### 기계 규칙이 글의 문체와 판단까지 지배

### 문제

모든 글이 같은 구조와 문장 리듬을 갖게 된다.

### 개선

정확성·일관성 규칙은 자동화하고, 설명 방식은 작성자의 판단을 남긴다.

---
