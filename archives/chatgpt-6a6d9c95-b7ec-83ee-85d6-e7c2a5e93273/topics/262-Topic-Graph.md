---
title: "Topic Graph"
source_message: 39
source_role: assistant
---

# Topic Graph

## K-38. Topic Equals Tag

### Topic Graph를 태그 공통도로 생성

### 문제

태그는 횡단 속성이라 지식 계층을 표현하지 못한다.

### 개선

Topic과 Tag를 분리한다.

---

## K-39. Topic Hierarchy as a Tree Only

### 모든 주제가 하나의 부모만 가짐

### 문제

시스템 분야는 다중 관계가 많다.

예:

```text
DMA
→ PCIe
→ Memory
→ Driver
→ IOMMU
```

### 개선

탐색용 계층과 의미 그래프를 분리한다.

---

## K-40. Graph Without Canonical Nodes

### `C++`, `cpp`, `cplusplus`가 별도 노드

### 문제

그래프가 분열된다.

### 개선

canonical ID와 alias를 사용한다.

---

## K-41. Node for Every Tag

### 1회성 태그까지 그래프 노드

### 문제

노드가 너무 많고 의미가 약해진다.

### 개선

핵심 Topic과 주요 Concept만 노드화한다.

---

## K-42. Article as Every Node

### 모든 글을 같은 크기의 노드로 표시

### 문제

대표 Guide와 작은 Note의 차이가 사라진다.

### 개선

노드 유형과 중요도를 구분한다.

---

## K-43. Graph Density as Quality

### 연결이 많을수록 좋다고 판단

### 문제

의미 없는 링크가 많아질 수 있다.

### 개선

적은 수의 정확한 관계를 우선한다.

---

## K-44. Disconnected Node Panic

### 고립 노드가 있으면 무조건 연결

### 문제

독립적인 Reference나 역사 기록은 고립되어도 괜찮을 수 있다.

### 개선

고립이 문제인지 문서 역할에 따라 판단한다.

---

## K-45. Centrality as Editorial Importance

### 그래프 중심성이 높은 글을 대표 문서로 선정

### 문제

일반 개념 글이 구조상 중심이지만, 네 전문성을 대표하지 않을 수 있다.

### 개선

구조적 중요도와 편집자 중요도를 분리한다.

---

## K-46. Graph Generated Once

### 지식 그래프를 만든 뒤 갱신하지 않음

### 문제

새 글과 통합 결과가 반영되지 않는다.

### 개선

manifest에서 재생성 가능하게 한다.

---

## K-47. Graph Without State

### 폐기·구판·검토 필요 문서도 동일하게 표시

### 개선

노드 상태를 반영한다.

---

## K-48. Graph Without Edge Provenance

### 연결 근거를 알 수 없음

### 개선

수동, 본문 링크, 시리즈, 자동 유사도 등 provenance를 기록한다.

---
