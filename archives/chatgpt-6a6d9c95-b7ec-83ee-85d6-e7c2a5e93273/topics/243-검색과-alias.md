---
title: "검색과 alias"
source_message: 38
source_role: assistant
---

# 검색과 alias

## L-11. No Search Alias

### 표기가 다르면 검색되지 않음

```text
MSI-X
MSIX
MSI X
```

### 개선

검색 alias를 관리한다.

```yaml
canonical: msi-x
aliases:
  - msix
  - msi x
```

---

## L-12. Korean–English Search Split

### 한글과 영문 검색이 별개

```text
주소 변환
address translation
```

### 개선

Topic metadata에 양쪽 표현을 함께 둔다.

---

## L-13. Transliteration Search Failure

### 음역어와 원어가 연결되지 않음

```text
코히어런시
coherency
coherence
```

### 개선

검색 정규화에서 동의어를 연결한다.

---

## L-14. Symbol Search Failure

### 특수문자 때문에 검색 실패

```text
C++
C#
MSI-X
x86-64
```

### 문제

검색 tokenizer가 `+`, `#`, `-`를 제거할 수 있다.

### 개선

기술 토큰을 위한 별도 정규화 규칙을 둔다.

---

## L-15. Case-Sensitive Technical Search

### 대소문자가 다르면 검색되지 않음

```text
CUDA
cuda
Cuda
```

### 개선

검색은 대소문자를 정규화하되 화면 표기는 canonical form을 유지한다.

---

## L-16. Version Search Ambiguity

### 버전 검색이 일반 숫자와 섞임

```text
C++20
CUDA 12.4
Linux 6.12
```

### 개선

버전 정보를 별도 metadata로 색인한다.

---

## L-17. Alias Explosion

### 모든 표기 변형을 수동 등록

### 문제

alias registry가 과도하게 커지고 중복된다.

### 개선

다음을 분리한다.

```text
규칙 기반 정규화
명시적 기술 동의어
오타 보정
```

---

## L-18. Search Alias Changes Display Text

### 검색 정규화를 위해 원문까지 변환

### 문제

표준 표기와 코드 identifier가 훼손된다.

### 개선

검색용 normalized field와 화면 표시값을 분리한다.

---
