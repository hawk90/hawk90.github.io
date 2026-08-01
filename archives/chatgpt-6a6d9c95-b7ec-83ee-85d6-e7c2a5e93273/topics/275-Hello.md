---
title: "Hello"
source_message: 40
source_role: assistant
---

# Hello

Test
```

### 문제

실제 100개 코드 블록, 수식, 표, 한글·영문 혼합 글의 문제를 잡지 못한다.

### 개선

대표적인 복잡도 fixture를 별도로 둔다.

---

## T-11. Fixture Copy of Production Article

### 실제 글 전체를 테스트 fixture로 복사

### 문제

원본과 fixture가 따로 관리되어 불일치한다.

### 개선

특정 동작을 재현하는 최소 사례를 만든다.

---

## T-12. Unit Test Internal Implementation

### 내부 함수 호출 순서까지 검증

### 문제

리팩토링할 때 기능은 같아도 테스트가 깨진다.

### 개선

입력과 출력 계약을 검증한다.

---

## T-13. Generated HTML String Equality

### 전체 HTML 문자열을 정확히 비교

### 문제

attribute 순서나 공백 변경에도 실패한다.

### 개선

DOM 구조와 중요한 요소를 선택적으로 검사한다.

---

## T-14. Locale-Dependent Test

### 개발 환경 언어에 따라 날짜·정렬 결과가 달라짐

### 개선

테스트 locale과 timezone을 고정한다.

---

## T-15. Time-Dependent Test

### 현재 날짜에 따라 오래된 글 판정이 달라짐

### 개선

clock을 주입하거나 기준일을 명시한다.

---
