---
title: "Epic E. 빌드 성능과 콘텐츠 파이프라인"
source_message: 47
source_role: assistant
---

# Epic E. 빌드 성능과 콘텐츠 파이프라인

## E-01. 빌드 단계별 기준선 측정

현재는 전체 빌드가 느리거나 heap을 많이 사용하더라도 어느 단계가 원인인지 분명하지 않을 수 있다.

전체 시간만 기록해서는 다음을 구분할 수 없다.

```text
Markdown 파싱
Shiki 하이라이팅
검색 인덱스
OG 이미지
SVG·다이어그램
링크 검사
Astro 페이지 생성
```

## 작업

각 주요 단계의 시작·종료 시간과 처리량을 기록한다.

```text
단계 이름
처리 문서 수
처리 코드 블록 수
소요 시간
메모리 변화
생성 파일 크기
```

## 예시 출력

```text
[content] 532 documents parsed in 4.2s
[highlight] 8,412 code blocks processed in 31.8s
[search] 532 records generated in 2.1s
[og] 12 assets regenerated in 6.3s
[astro] 711 pages rendered in 18.4s
```

## 메모리 측정

최소한 다음을 기록한다.

```text
시작 RSS
단계 종료 RSS
Peak RSS
Node heap used
```

정밀 profiler를 처음부터 만들 필요는 없다. `process.memoryUsage()`와 CI 시간 기록만으로도 1차 병목을 찾을 수 있다.

## 완료 조건

- 전체 빌드 시간이 단계별로 나뉨
- 가장 느린 상위 3개 단계가 확인됨
- Peak memory가 어느 단계에서 증가하는지 확인됨
- 문서 수와 코드 블록 수가 함께 기록됨

## 우선순위

```text
P0
```

---
