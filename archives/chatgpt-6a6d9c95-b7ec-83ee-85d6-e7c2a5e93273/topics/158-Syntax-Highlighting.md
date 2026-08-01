---
title: "Syntax Highlighting"
source_message: 29
source_role: assistant
---

# Syntax Highlighting

## P-11. Highlight Everything

### 모든 `<pre>`를 syntax highlighting

로그, 출력, 디렉터리 구조, 레지스터 덤프까지 Shiki로 처리한다.

### 문제

불필요한 토큰화와 HTML 증가가 발생한다.

### 개선

```text
source code
shell command
plain output
log
dump
```

역할을 구분한다.

---

## P-12. Load Every Language Grammar

### 사용하지 않는 언어까지 모두 로드

### 문제

초기화 시간과 메모리 사용량이 증가한다.

### 개선

실제 사용하는 언어만 allowlist로 관리한다.

새 언어가 필요할 때 명시적으로 추가한다.

---

## P-13. Grammar Alias Duplication

### 같은 언어가 여러 alias로 중복 로드

```text
cpp
c++
cxx
cplusplus
```

### 개선

canonical language id를 정하고 alias는 입력 정규화로 처리한다.

---

## P-14. Unknown Language Fallback to Heavy Parser

### 미등록 언어를 무거운 자동 감지로 처리

### 문제

오타 하나가 예측하지 못한 parser 비용을 만든다.

### 개선

알 수 없는 언어는 `text`로 fallback하고 감사에서 경고한다.

---

## P-15. Dual-Theme HTML Duplication

### 다크·라이트 테마 토큰을 모두 HTML에 포함

### 문제

코드 블록이 많으면 출력 HTML이 크게 증가한다.

### 개선

현재 방식의 실제 출력 크기를 측정하고, 필요하면 CSS variable 기반 또는 단일 기본 테마를 검토한다.

---

## P-16. Runtime Highlighting

### 브라우저에서 코드 하이라이팅

### 문제

- 긴 글에서 main thread 점유
- 첫 렌더 후 layout 변화
- 모바일 성능 저하
- JavaScript 의존

### 개선

기술 블로그는 기본적으로 빌드 타임 highlighting이 적합하다.

---

## P-17. Line-Level Feature Everywhere

### 모든 코드 블록에 line number·copy·wrap·mark 기능 적용

### 문제

작은 코드 블록에도 DOM과 CSS가 과도해진다.

### 개선

기능을 코드 블록 길이와 metadata에 따라 선택한다.

---

## P-18. Full Source in Article

### 긴 전체 소스를 본문에 포함

### 성능 문제

- 하이라이팅 시간 증가
- HTML 용량 증가
- DOM 노드 증가
- 검색 인덱스 오염

### 개선

본문은 핵심 부분만, 전체 코드는 별도 파일로 제공한다.

---
