---
title: "Epic D. 검색·내부 링크·콘텐츠 관계"
source_message: 46
source_role: assistant
---

# Epic D. 검색·내부 링크·콘텐츠 관계

## D-01. 현재 검색 구조 측정

개선 전에 현재 검색 인덱스와 결과 품질을 먼저 측정한다.

## 확인 항목

```text
검색 인덱스 파일 크기
문서 레코드 수
본문 전체 포함 여부
코드·로그 포함 여부
브라우저 초기 로드 여부
검색 소요 시간
```

추가로 대표 검색어 20개를 직접 확인한다.

예:

```text
PCIe BAR
CXL HDM Decoder
CUDA pinned memory
U-Boot driver model
MSI-X interrupt
Linux PCI enumeration
```

## 기록할 결과

| 검색어 | 기대 1순위 | 실제 1순위 | 기대 문서 Top 3 포함 | 문제 |
|---|---|---|---|---|
| PCIe BAR | BAR 대표 Concept | 짧은 과거 글 | 아니오 | 중복·빈도 편향 |
| CXL HDM Decoder | 대표 Guide | 관련 없는 CXL 글 | 예 | 순위 낮음 |

## 완료 조건

- 인덱스 크기와 초기 로드 방식이 확인됨
- 대표 검색어 20개의 baseline이 있음
- 검색 결과 문제를 최소 세 유형으로 분류함

## 우선순위

```text
P0
```

---
