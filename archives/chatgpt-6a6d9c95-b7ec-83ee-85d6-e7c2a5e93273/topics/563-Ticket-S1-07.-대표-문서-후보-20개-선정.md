---
title: "Ticket S1-07. 대표 문서 후보 20개 선정"
source_message: 53
source_role: assistant
---

# Ticket S1-07. 대표 문서 후보 20개 선정

## 목적

전체 사이트에서 우선 보완하고 연결할 핵심 문서를 정한다.

## 권장 배분

| Topic | 후보 수 |
|---|---:|
| PCIe & CXL | 5 |
| Firmware & Bootloader | 4 |
| C++ | 4 |
| GPU & CUDA | 4 |
| Linux & Systems | 3 |

정확히 맞출 필요는 없다.

## 선정 기준

각 후보는 다음 중 최소 세 가지를 만족해야 한다.

```text
직접 경험이나 실험이 있음
다른 글의 선행 개념임
현재도 검색 가치가 있음
사이트 전문성을 잘 보여줌
다른 자료에서 보기 어려운 분석이 있음
향후 Topic Hub의 진입점이 될 수 있음
```

## 제외 후보

```text
최근에 썼다는 이유만으로 선정
일반 공식 문서 요약
검증 상태를 판단하기 어려움
동일 검색 의도의 더 강한 글이 있음
지나치게 개인적인 메모
```

## 결과 파일 예

```yaml
representativeArticles:
  - id: pcie-bar-sizing
    topic: pcie-cxl
    expectedType: concept
    currentStatus: needs-review
    reason: 여러 PCIe 글의 선행 개념
    remediation: 환경·소스 버전 보완

  - id: cuda-pinned-memory
    topic: gpu-cuda
    expectedType: experiment
    currentStatus: current
    reason: 직접 실험과 측정 포함
    remediation: baseline 표 보완
```

## 완료 조건

```text
[ ] 후보 20개
[ ] 각 문서의 선정 이유
[ ] 예상 type/topic
[ ] 현재 상태
[ ] 필요한 보완 작업
```

## 예상 작업량

```text
2~4시간
```

---
