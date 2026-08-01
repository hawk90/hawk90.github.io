---
title: "Content strategy and structure (60 anti-patterns)"
category: content
item_count: 60
---
# Content strategy and structure
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-C-16 — Fix-Only Debugging Note
- Category: Content strategy and structure
- Original IDs: C-16
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 해결책만 있고 진단 과정이 없음

### 증상

- 최종 원인만 제시
- 중간 가설이 없음
- 왜 다른 원인을 제외했는지 모름
- 로그가 단순 첨부됨

### 좋은 구조

```text
증상
정상 기대값
가능한 원인
수집한 증거
제외한 가설
확정 원인
해결
재발 방지
```

---
## AP-C-16-2 — 실험 글의 baseline과 반복 보완
- Category: Content strategy and structure
- Original IDs: C-16
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
성능 결과를 단일 숫자로 제시하지 않는다.

## 최소 항목

```text
Baseline
변경점
입력 크기
warm-up
반복 횟수
대표값
변동 범위
환경
```

## 결과 표 예시

| 조건 | Median | Min | Max | 반복 |
|---|---:|---:|---:|---:|
| Pageable | 12.8 ms | 12.4 | 13.5 | 50 |
| Pinned | 7.1 ms | 6.9 | 7.5 | 50 |

## 결론 예시

```text
이 환경과 전송 크기에서는 pinned memory가 약 44% 빠르다.
다만 작은 전송에서는 할당 비용 때문에 같은 이점이 나타나지 않을 수 있다.
```

---
## AP-C-17 — Log Dump Without Interpretation
- Category: Content strategy and structure
- Original IDs: C-17
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 로그 붙여넣기

긴 커널 로그나 빌드 로그를 그대로 붙인다.

### 문제

독자가 중요한 줄을 직접 찾아야 한다.

### 개선 방향

```text
전체 로그는 접거나 외부 파일로 제공
핵심 줄만 본문에 인용
각 줄의 의미 설명
정상 로그와 비교
```

---
## AP-C-17-2 — 대표 글의 범위와 한계 추가
- Category: Content strategy and structure
- Original IDs: C-17
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
모든 대표 글에 장문의 `Limitations` 섹션이 필요하지는 않다.

다만 최소한 다음은 명확해야 한다.

```text
어떤 버전인가
어떤 환경인가
무엇을 확인하지 않았는가
어디까지 일반화할 수 있는가
```

## 짧은 형태

```text
범위: Linux 6.12의 x86 PCI 초기화 흐름을 기준으로 한다.
ARM host와 firmware-first 구성은 별도로 확인하지 않았다.
```

---
## AP-C-18 — Screenshot as Evidence
- Category: Content strategy and structure
- Original IDs: C-18
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 스크린샷만으로 결과 증명

터미널 화면이나 그래프 이미지가 있지만 원본 값이 없다.

### 문제

- 검색 불가
- 복사 불가
- 해상도가 낮으면 읽기 어려움
- 접근성 부족
- 결과 재분석 불가

### 개선 방향

스크린샷은 보조로 사용하고 텍스트·표·CSV·명령 출력을 함께 제공한다.

---
## AP-C-18-2 — 대표 글 결론 재작성
- Category: Content strategy and structure
- Original IDs: C-18
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
좋은 결론은 본문 소제목을 반복하지 않는다.

다음 세 질문에 답한다.

```text
무엇이 핵심인가
실무에서는 무엇부터 확인해야 하는가
어떤 조건에서는 결론이 달라지는가
```

## 예시

```text
BAR 문제를 볼 때는 드라이버 코드보다 먼저 장치가 보고한 BAR 크기,
firmware의 주소 할당, 운영체제 resource 등록을 순서대로 확인해야 한다.

장치가 정상적으로 열거됐더라도 내부 메모리 컨트롤러 초기화가 끝나지 않았다면
BAR 접근 결과는 여전히 유효하지 않을 수 있다.
```

---
## AP-C-19 — Evidence Blending
- Category: Content strategy and structure
- Original IDs: C-19
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 사실·관찰·추론이 섞임

```text
이 문제는 DDR 컨트롤러가 초기화되지 않았기 때문이다.
```

이 문장이 규격 근거인지, 실제 관찰인지, 추측인지 불명확하다.

### 개선 방향

```text
Specification
Observation
Interpretation
Hypothesis
Conclusion
```

을 구분한다.

---
## AP-C-19-2 — 대표 글의 하단 관계 추가
- Category: Content strategy and structure
- Original IDs: C-19
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
대표 글 20개에만 우선 적용한다.

```yaml
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msix
related:
  - linux-pci-enumeration
```

## 노출 우선순위

```text
상위 Topic
필수 선행 1~2개
다음 단계 1개
실전 사례 1개
```

너무 많은 링크를 넣지 않는다.

## 완료 조건

- 대표 글에 dead end가 없음
- 같은 글이 여러 슬롯에 반복되지 않음
- `superseded` 글이 추천되지 않음
- 링크 이유가 UI에 표시됨

---
## AP-C-20 — Unmarked Hypothesis
- Category: Content strategy and structure
- Original IDs: C-20
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 가설을 사실처럼 표현

### 문제

기술 글의 신뢰성을 크게 떨어뜨린다.

### 개선 방향

표현을 명확히 한다.

```text
확인됨:
LTSSM이 Recovery에서 반복됨

추정:
RefClk 안정화 이전에 PERST#가 해제됐을 가능성

미확인:
보드 측 전원 시퀀스
```

---
## AP-C-20-2 — 대표 글 보완 순서
- Category: Content strategy and structure
- Original IDs: C-20
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
20개를 동시에 작업하지 않는다.

## 1차: 바로 Featured 가능한 글 5개

```text
상태가 current
내용이 비교적 완성됨
중복이 적음
보완량이 낮음
```

작업:

- metadata
- 제목·description
- 신뢰 블록
- Topic 연결
- 다음 글

## 2차: 강하지만 검증이 필요한 글 5개

작업:

- 버전·환경 재확인
- 출처 정리
- 결론 강도 조정
- 상태 current 전환

## 3차: 중복·구판과 엮인 글 5개

작업:

- 통합 여부 판단
- canonical role 결정
- redirect 또는 superseded 처리

## 4차: 실험·디버깅 대표 글 5개

작업:

- raw evidence
- 실패 가설
- baseline
- 한계 보강

---
## AP-C-21 — Citation Dump
- Category: Content strategy and structure
- Original IDs: C-21
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 참고문헌을 끝에 몰아넣음

링크는 많지만 어느 문장을 뒷받침하는지 알 수 없다.

### 개선 방향

핵심 주장 근처에 근거를 배치하고, 마지막에는 전체 참고자료를 분류한다.

```text
Specification
Official Documentation
Source Code
Further Reading
```

---
## AP-C-21-2 — 대표 글 리뷰 체크리스트
- Category: Content strategy and structure
- Original IDs: C-21
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
## 공통

```text
[ ] 제목이 한 가지 질문을 약속한다
[ ] description이 제목을 반복하지 않는다
[ ] type, topic, status가 지정됐다
[ ] updated와 lastVerified가 구분됐다
[ ] 핵심 주장의 근거가 있다
[ ] 사실과 가설이 구분된다
[ ] 적용 범위와 한계가 있다
[ ] 다음 학습 경로가 있다
```

## Source Walkthrough 추가

```text
[ ] 저장소 버전·commit이 있다
[ ] file과 symbol이 있다
[ ] 호출 흐름이 명확하다
```

## Debug Note 추가

```text
[ ] 증상과 정상 기대값이 있다
[ ] 제외한 가설이 있다
[ ] 해결 후 검증이 있다
```

## Experiment 추가

```text
[ ] baseline이 있다
[ ] 반복 횟수가 있다
[ ] raw result 또는 표가 있다
[ ] 결과 일반화 한계가 있다
```

---
## AP-C-22 — Specification Paraphrase
- Category: Content strategy and structure
- Original IDs: C-22
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 규격 재서술이 콘텐츠의 대부분

### 증상

- 사양 문서 순서와 글 순서가 거의 같음
- 작성자의 해석이 적음
- 실제 예제나 로그가 없음
- 외부 문서를 짧게 번역한 수준

### 왜 문제인가

독창성과 실무 가치가 낮아 보일 수 있다.

### 개선 방향

규격 자체보다 다음을 추가한다.

```text
실제 구현에서 어떻게 보이는가
어떤 부분이 자주 오해되는가
로그나 레지스터에서 어떻게 확인하는가
다른 규격과 어떻게 연결되는가
```

---
## AP-C-22-2 — 자동 검사와 사람 검토의 경계
- Category: Content strategy and structure
- Original IDs: C-22
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
## 자동화할 것

```text
필수 metadata 존재
enum 유효성
날짜 형식
Topic ID 존재
relation 대상 존재
상태 불변조건
대표 글의 description 존재
lastVerified가 미래 날짜인지
```

## 자동화하지 않을 것

```text
기술 결론이 옳은가
가설이 충분히 조심스럽게 표현됐는가
대표 글로 적합한가
중복 글을 합쳐야 하는가
출처가 실제 주장을 충분히 뒷받침하는가
```

---
## AP-C-23 — Documentation Summary Article
- Category: Content strategy and structure
- Original IDs: C-23
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 공식 문서 요약만 있는 글

### 문제

원문보다 짧지만 더 정확하거나 더 유용하지 않으면 가치가 약하다.

### 개선 방향

요약에 최소 하나의 고유 가치를 추가한다.

- 실행 가능한 예제
- 비교표
- 실패 사례
- 버전 차이
- 실제 장비 결과
- 구조도
- 의사결정 기준

---
## AP-C-23-2 — `needs-review` 큐 운영
- Category: Content strategy and structure
- Original IDs: C-23
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
상태만 붙이고 방치하면 안 된다.

## 우선순위 계산

```text
대표 글 여부
검색 유입
기술 변화 가능성
오류 위험
상위 Hub 의존도
```

## 처리 상태

```text
queued
reviewing
verified
historical
superseded
```

별도 시스템이 아니라 간단한 Markdown 표나 GitHub Issue로 충분하다.

## 완료 조건

- `needs-review` 문서에 다음 행동이 있음
- 대표 문서는 기한 없이 방치하지 않음
- 검토 후 반드시 다른 상태로 전환됨

---
## AP-C-24 — Code-as-Explanation
- Category: Content strategy and structure
- Original IDs: C-24
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 코드가 설명을 대신함

긴 코드 블록 뒤에:

```text
위와 같이 구현하면 된다.
```

로 끝난다.

### 문제

독자가 핵심 설계 판단을 직접 찾아야 한다.

### 개선 방향

코드보다 다음을 설명한다.

```text
왜 이 구조인가
불변조건은 무엇인가
오류 경로는 무엇인가
대안은 무엇인가
성능 비용은 어디에 있는가
```

---
## AP-C-24-2 — 구판 문서 처리
- Category: Content strategy and structure
- Original IDs: C-24
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
구판을 무조건 삭제하지 않는다.

## Historical로 둘 조건

- 과거 버전 유지 사용자에게 유용
- 기술 변화 기록 가치가 있음
- 다른 자료에서 참조함
- 당시 장애 해결 과정이 고유함

## Superseded로 둘 조건

- 같은 검색 의도의 신판이 있음
- 기존 글보다 명확하고 완전한 문서가 있음
- 두 글을 동시에 유지하면 혼동됨

## Redirect를 고려할 조건

- 기존 글의 고유 가치가 거의 없음
- 신판이 내용을 완전히 포함
- 외부 링크가 새 글로 가도 문맥이 자연스러움

---
## AP-C-25 — Full Source Embedding
- Category: Content strategy and structure
- Original IDs: C-25
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 전체 소스코드를 본문에 넣음

### 문제

- 글이 너무 길어짐
- 핵심 코드가 묻힘
- 수정 시 본문과 저장소가 불일치
- 빌드·하이라이팅 비용 증가

### 개선 방향

본문에는 핵심 부분만 넣고, 전체 코드는 별도 저장소나 파일 링크로 제공한다.

---
## AP-C-25-2 — 대표 글 보완과 AdSense 연결
- Category: Content strategy and structure
- Original IDs: C-25
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
AdSense 승인을 위한 형식적 작업으로 접근하면 안 된다.

대표 글 보완이 실질적으로 강화하는 것은 다음이다.

```text
작성자 경험
검증 가능한 환경
독창적인 분석
문서의 현재 상태
명확한 근거
관련 지식 구조
```

이는 단순히 글자 수를 늘리는 것보다 훨씬 직접적으로 콘텐츠 가치를 보여준다.

## 피해야 할 작업

```text
모든 글에 장문의 서론 추가
일반적인 장점·단점 문단 생성
불필요한 FAQ 대량 추가
문장만 AI로 길게 재작성
검증하지 않고 수정일만 갱신
```

---
## AP-C-26 — Example Without Production Boundary
- Category: Content strategy and structure
- Original IDs: C-26
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 예제 코드와 실사용 코드의 경계가 없음

간단한 예제를 보여주면서 예외 처리·동시성·자원 해제·보안 고려가 빠져 있다.

### 문제

독자가 예제를 그대로 production에 적용할 수 있다.

### 개선 방향

```text
예제를 위해 생략한 것
실제 적용 시 필요한 것
적용하면 안 되는 조건
```

을 명시한다.

---
## AP-C-27 — Benchmark Without Baseline
- Category: Content strategy and structure
- Original IDs: C-27
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 비교 기준 없는 성능 수치

```text
8.4 GB/s
12 ms
```

### 왜 문제인가

좋은 결과인지 판단할 수 없다.

### 개선 방향

```text
Baseline
변경 사항
동일 조건
반복 횟수
분산
하드웨어 한계
```

를 제공한다.

---
## AP-C-28 — Benchmark Without Workload
- Category: Content strategy and structure
- Original IDs: C-28
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 측정 대상이 불명확함

“CUDA 최적화 후 30% 향상”이라고 하지만 입력 크기와 연산 특성이 없다.

### 개선 방향

- 데이터 크기
- 메모리 패턴
- 연산량
- warm-up
- 반복 횟수
- GPU·드라이버·CUDA 버전

을 명시한다.

---
## AP-C-29 — Single-Run Benchmark
- Category: Content strategy and structure
- Original IDs: C-29
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 한 번 측정한 값 사용

### 문제

초기화 비용, 캐시, 시스템 노이즈에 크게 영향을 받는다.

### 개선 방향

여러 번 반복하고 대표값과 변동을 함께 제시한다.

```text
median
min/max
표준편차 또는 percentile
```

---
## AP-C-30 — Benchmark Graph Without Raw Data
- Category: Content strategy and structure
- Original IDs: C-30
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 그래프만 있고 수치가 없음

### 문제

정확한 비교와 재분석이 어렵다.

### 개선 방향

그래프와 함께 표 또는 원본 데이터를 제공한다.

---
## AP-C-31 — Experiment Without Hypothesis
- Category: Content strategy and structure
- Original IDs: C-31
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 측정은 했지만 질문이 없음

여러 조건을 테스트했지만 무엇을 확인하려는지 불명확하다.

### 개선 방향

```text
질문
가설
변수
고정 조건
측정 방법
결과
해석
```

순서로 작성한다.

---
## AP-C-32 — Correlation as Causation
- Category: Content strategy and structure
- Original IDs: C-32
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 동시에 변한 것을 원인으로 단정

예:

```text
컴파일 옵션을 바꾸니 빨라졌으므로 vectorization 때문이다.
```

실제로 다른 최적화가 영향을 줬을 수 있다.

### 개선 방향

가능하면 단일 변수만 바꾸고, assembly·profiler·counter로 원인을 확인한다.

---
## AP-C-33 — Success-Path-Only Tutorial
- Category: Content strategy and structure
- Original IDs: C-33
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 정상 경로만 설명

### 증상

- 실패했을 때 확인 방법 없음
- 권한·버전·경로 차이를 다루지 않음
- 독자는 조금만 다르면 막힘

### 개선 방향

최소한 자주 발생하는 실패 3개와 진단법을 포함한다.

---
## AP-C-34 — Environment Omission
- Category: Content strategy and structure
- Original IDs: C-34
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 실행 환경 없음

### 문제

동작 여부를 재현할 수 없다.

### 필요한 최소 정보

```text
OS
Kernel
Compiler
Library/SDK
Hardware
Major configuration
```

모든 글에 전부 필요하지는 않지만 튜토리얼·실험·디버깅 글에는 중요하다.

---
## AP-C-35 — Versionless Technical Article
- Category: Content strategy and structure
- Original IDs: C-35
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 버전 정보 없음

```text
CUDA에서 이렇게 한다
Linux에서 지원한다
Rust에서는 불가능하다
```

### 왜 문제인가

기술은 계속 바뀐다.

### 개선 방향

```text
CUDA 11.8 기준
Linux 6.12에서 확인
Rust 1.8x 이후
```

처럼 범위를 밝힌다.

---
## AP-C-36 — Timeless Article Illusion
- Category: Content strategy and structure
- Original IDs: C-36
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 오래된 글이 현재 자료처럼 보임

### 증상

- 작성일만 있음
- 수정 여부 없음
- 현재도 유효한지 알 수 없음
- 대체 글이 있어도 연결되지 않음

### 개선 방향

```text
Current
Needs Review
Historical
Superseded
```

상태를 표시한다.

---
## AP-C-37 — Silent Update
- Category: Content strategy and structure
- Original IDs: C-37
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 내용을 크게 바꿨지만 수정 이력이 없음

### 문제

예전에 읽은 독자가 무엇이 달라졌는지 모른다.

### 개선 방향

핵심 문서에는 간단한 변경 기록을 둔다.

```text
2026-07: Linux 6.12 동작 기준 추가
2026-05: CXL decoder 설명 수정
```

---
## AP-C-38 — Unsupported Universal Claim
- Category: Content strategy and structure
- Original IDs: C-38
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 제한된 경험을 일반 법칙처럼 표현

```text
U250에서는 인터럽트를 사용할 수 없다.
C++는 펌웨어에 적합하지 않다.
```

### 개선 방향

관찰 범위를 명확히 한다.

```text
XRT 2.13.466과 해당 U250 플랫폼에서는
사용자 공간 ISR callback 경로를 확인하지 못했다.
```

---
## AP-C-39 — Missing Limitation Section
- Category: Content strategy and structure
- Original IDs: C-39
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 글의 적용 한계가 없음

### 문제

독자가 다른 상황에도 결론을 일반화한다.

### 개선 방향

```text
이 결과는 x86 host와 PCIe Gen3 환경에 한정된다.
IOMMU disabled 환경은 측정하지 않았다.
```

---
## AP-C-40 — Missing Counterexample
- Category: Content strategy and structure
- Original IDs: C-40
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 결론을 반박할 사례를 다루지 않음

### 왜 문제인가

기술적 판단이 너무 단순해진다.

### 개선 방향

```text
일반적으로 A가 유리하지만,
작은 입력에서는 초기화 비용 때문에 B가 더 빠를 수 있다.
```

---
## AP-C-41 — Trade-off Omission
- Category: Content strategy and structure
- Original IDs: C-41
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 장점만 설명

예:

```text
Pinned memory는 빠르다.
```

하지만:

- 할당 비용
- OS 메모리 압박
- 사용량 제한
- 작은 전송에서 이득 부족

이 빠져 있다.

### 개선 방향

모든 설계 선택에 다음을 포함한다.

```text
장점
비용
적용 조건
비적용 조건
```

---
## AP-C-42 — One Correct Architecture
- Category: Content strategy and structure
- Original IDs: C-42
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 하나의 설계를 정답처럼 제시

### 문제

시스템 설계는 제약에 따라 답이 달라진다.

### 개선 방향

```text
낮은 지연 우선
처리량 우선
메모리 제한
펌웨어 제약
유지보수 우선
```

별로 선택지를 비교한다.

---
## AP-C-43 — No Decision Criteria
- Category: Content strategy and structure
- Original IDs: C-43
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 선택지는 나열하지만 선택 기준이 없음

```text
A도 가능하고 B도 가능하다.
```

### 개선 방향

```text
A를 선택할 조건
B를 선택할 조건
경계 조건
```

을 명시한다.

---
## AP-C-44 — Diagram Without Purpose
- Category: Content strategy and structure
- Original IDs: C-44
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 보기 좋은 그림만 있음

### 증상

- 상자와 화살표는 많음
- 무엇을 설명하는지 불명확
- 본문과 연결되지 않음
- 모든 화살표 의미가 같음

### 개선 방향

다이어그램마다 하나의 질문을 답하게 한다.

```text
데이터가 어디로 이동하는가
제어권이 언제 바뀌는가
주소가 어떻게 변환되는가
장애가 어디서 전파되는가
```

---
## AP-C-45 — Unlabeled Arrow Diagram
- Category: Content strategy and structure
- Original IDs: C-45
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 화살표 의미가 없음

화살표가 호출, 데이터, 의존성, 소유권 중 무엇인지 알 수 없다.

### 개선 방향

범례나 라벨을 사용한다.

```text
call
data
interrupt
ownership
configuration
```

---
## AP-C-46 — Screenshot-Heavy Explanation
- Category: Content strategy and structure
- Original IDs: C-46
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 도구 화면 캡처가 설명 대부분

### 문제

- 버전 변경에 약함
- 검색할 수 없음
- 접근성 부족
- 핵심 개념보다 UI 위치에 종속됨

### 개선 방향

스크린샷은 위치 확인에만 쓰고, 원리와 명령을 텍스트로 설명한다.

---
## AP-C-47 — Uncaptioned Figure
- Category: Content strategy and structure
- Original IDs: C-47
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 그림 설명이 없음

### 문제

그림만 따로 보았을 때 의미를 알 수 없다.

### 개선 방향

캡션에서 그림이 보여주는 결론을 설명한다.

```text
Figure 3. HDM Decoder가 HPA 범위를 장치 DPA로 매핑하는 과정.
```

---
## AP-C-48 — Abrupt Ending
- Category: Content strategy and structure
- Original IDs: C-48
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 설명이나 코드 직후 글이 끝남

### 문제

독자가 무엇을 기억해야 하는지 모른다.

### 개선 방향

마지막에 다음을 정리한다.

```text
핵심 결론
적용 조건
한계
다음 글
```

---
## AP-C-49 — Summary Repetition
- Category: Content strategy and structure
- Original IDs: C-49
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 결론이 본문 복사

본문 소제목을 다시 나열할 뿐 새로운 판단이 없다.

### 개선 방향

결론에서는 다음 질문에 답한다.

```text
그래서 무엇이 중요한가
무엇을 먼저 확인해야 하는가
어떤 선택을 해야 하는가
```

---
## AP-C-50 — No Next Action
- Category: Content strategy and structure
- Original IDs: C-50
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
### 읽은 뒤 무엇을 해야 하는지 없음

### 개선 방향

글 유형에 따라 다음 행동을 제안한다.

```text
다음 개념 읽기
명령 실행
측정 재현
대표 Guide로 돌아가기
관련 장애 사례 확인
```

---
## AP-G-01 — Topic Impulse Publishing
- Category: Content strategy and structure
- Original IDs: G-01
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 떠오른 주제를 바로 새 글로 작성

### 증상

- 콘텐츠 지도 확인 없이 새 파일 생성
- 기존 글과 중복 여부를 확인하지 않음
- 아이디어가 생긴 순서대로 게시
- 사이트의 핵심 분야와 무관한 글이 늘어남

### 문제

개별 글은 괜찮아도 전체 사이트의 방향이 흐려진다.

### 개선

새 글을 쓰기 전에 다음 네 가지를 확인한다.

```text
기존 글 보완인가
독립적인 검색 의도가 있는가
핵심 Topic에 속하는가
직접 경험이나 고유 분석이 있는가
```

---
## AP-G-01-2 — 공개 사이트와 관리자 기능 경계 확정
- Category: Content strategy and structure
- Original IDs: G-01
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 문제

블로그 저장소 안에 관리자 편집기, GitHub OAuth, 저장소 쓰기 기능까지 함께 들어가면 정적 사이트의 단순한 신뢰 경계가 무너진다.

### 권장 구조

```text
Public site
- 정적 HTML·CSS·JS
- 공개 콘텐츠 읽기
- 검색
- 댓글·광고는 선택적 외부 기능

Admin tool
- 인증
- 콘텐츠 편집
- GitHub API 쓰기
- 별도 배포 또는 로컬 전용
```

### 우선 선택안

개인 블로그라면 관리자 편집기의 기본 경로는 다음이 가장 안전하다.

```text
로컬 Git 편집
→ commit
→ pull request 또는 main push
→ CI 검증
→ 정적 배포
```

브라우저 기반 관리 기능이 반드시 필요하지 않다면 제거하거나 별도 프로젝트로 분리한다.

### 완료 조건

- 운영 정적 번들에 OAuth secret이 없음
- 공개 사이트가 저장소 쓰기 권한을 요구하지 않음
- `/admin` 주소를 숨기는 방식에 의존하지 않음
- 관리자 기능의 유지 또는 제거 이유가 문서화됨

### 우선순위

```text
P0
```

---
## AP-G-02 — Backlog as a Graveyard
- Category: Content strategy and structure
- Original IDs: G-02
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 아이디어를 계속 쌓지만 우선순위가 없음

### 증상

- 초안 제목 수백 개
- 오래된 아이디어가 계속 남음
- 무엇부터 쓸지 결정하는 데 시간이 걸림
- 비슷한 아이디어가 중복 등록됨

### 개선

아이디어를 최소 네 상태로 분류한다.

```text
Next
Research
Merge into existing
Drop
```

---
## AP-G-02-2 — Production 빌드에서 관리자 코드 제거
- Category: Content strategy and structure
- Original IDs: G-02
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 문제

메뉴에서 링크만 숨겨도 route, JavaScript, API 설정이 최종 `dist`에 남을 수 있다.

### 작업

Production artifact에서 다음을 검사한다.

```text
/admin
OAuth client 설정
GitHub write API 호출
편집기 컴포넌트
저장소 선택 UI
token 저장 코드
```

### 구현 원칙

나쁜 방식:

```ts
if (isAdmin) {
  showAdminMenu();
}
```

운영 번들에는 관리자 코드가 그대로 포함된다.

더 나은 방식:

```text
별도 앱
또는
production build에서 route·module 자체 제외
```

### 자동 검사

```bash
grep -R "/admin" dist/
grep -R "client_secret" dist/
grep -R "localStorage.*token" dist/
```

문자열 검색만으로 충분하지 않으므로 route manifest와 JavaScript bundle도 함께 확인한다.

### 완료 조건

- Production route에 관리자 페이지 없음
- 관리자 전용 module이 client bundle에 없음
- 관리자 환경변수가 공개 JavaScript에 포함되지 않음
- 관리자 기능 없이 일반 사이트 build가 가능

### 우선순위

```text
P0
```

---
## AP-G-03 — SEO Query Becomes Editorial Strategy
- Category: Content strategy and structure
- Original IDs: G-03
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 검색어가 보이면 바로 콘텐츠 계획에 추가

### 문제

사이트 정체성과 무관한 주제가 늘어나고, 비슷한 검색어별 글이 분열된다.

### 개선

검색어는 글 후보가 아니라 다음 중 하나의 신호로 해석한다.

```text
기존 글 제목 문제
기존 글 설명 부족
alias 부족
FAQ 필요
실제 콘텐츠 공백
```

---
## AP-G-03-2 — Workflow별 권한 전수 조사
- Category: Content strategy and structure
- Original IDs: G-03
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 문제

`GITHUB_TOKEN` 기본 권한이나 기존 workflow 설정에 의존하면 실제 필요보다 넓은 권한이 부여될 수 있다.

### 감사표

| Workflow | 목적 | 필요 권한 | 현재 권한 | 수정 |
|---|---|---|---|---|
| validate | schema·link 검사 | contents: read |  |  |
| build | 정적 artifact 생성 | contents: read |  |  |
| deploy | Pages 배포 | pages/id-token write |  |  |
| audit | 외부 링크·dependency | contents: read |  |  |

### 기본 권장

```yaml
permissions:
  contents: read
```

배포 job만 필요한 권한을 명시적으로 추가한다.

### 피해야 할 것

```yaml
permissions: write-all
```

또는 workflow 최상위에 광범위한 write 권한을 주고 모든 job이 공유하는 구조.

### 완료 조건

- 모든 workflow에 `permissions` 명시
- validation·build는 읽기 권한만 사용
- deploy job만 배포 권한 보유
- 사용하지 않는 `issues`, `pull-requests`, `packages` 쓰기 권한 없음

### 우선순위

```text
P0
```

---
## AP-G-04 — Trend Chasing
- Category: Content strategy and structure
- Original IDs: G-04
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 유행 기술을 빠르게 다루는 것이 우선

### 증상

- 최신 프레임워크 뉴스
- 발표 요약
- 릴리스 노트 재정리
- 일시적인 검색 유입 위주

### 문제

네 블로그의 강점인 저수준 시스템·실무 경험과 차별성이 약해질 수 있다.

### 개선

유행 주제라도 다음과 연결될 때 작성한다.

```text
기존 전문 분야
직접 실험
장기 참고 가치
고유한 해석
```

---
## AP-G-04-2 — Build와 Deploy 권한 분리
- Category: Content strategy and structure
- Original IDs: G-04
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 목표 구조

```text
Unprivileged build job
→ immutable artifact
→ privileged deploy job
```

### Build job

```yaml
permissions:
  contents: read
```

여기에서 수행:

```text
dependency install
content validation
Astro build
검색·RSS·Sitemap 생성
smoke test
```

### Deploy job

필요한 artifact만 다운로드한 뒤 Pages에 올린다.

여기에서는 다음을 하지 않는다.

```text
npm install
postinstall 실행
Markdown generator 실행
외부 PR 코드 실행
```

### 이유

빌드 dependency나 콘텐츠 generator가 침해되어도 배포 write 권한과 직접 결합되지 않게 한다.

### 완료 조건

- 테스트한 artifact와 배포 artifact가 동일
- deploy job가 저장소 코드를 다시 빌드하지 않음
- build job에 write token 없음
- artifact 출처 commit을 추적 가능

### 우선순위

```text
P0
```

---
## AP-G-05 — Coverage Anxiety
- Category: Content strategy and structure
- Original IDs: G-05
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 모든 주제를 다뤄야 한다는 압박

### 문제

- 얕은 입문 글 증가
- 전문 분야의 깊이 약화
- 유지해야 할 문서 범위 폭증

### 개선

다루지 않을 영역도 명시적으로 정한다.

```text
핵심적으로 다룸
필요할 때만 다룸
다루지 않음
```

---
## AP-G-05-2 — Action 참조 고정
- Category: Content strategy and structure
- Original IDs: G-05
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 문제

다음과 같은 major tag는 관리에는 편리하지만 변경 가능한 참조다.

```yaml
uses: actions/checkout@v4
```

### 강화안

중요한 배포 workflow는 full commit SHA에 고정한다.

```yaml
uses: actions/checkout@<full-commit-sha> # v4.x
```

### 적용 우선순위

```text
공식 배포 action
artifact upload/download
외부 제3자 action
보안·secret 관련 action
```

### 운영 비용

SHA 고정은 업데이트가 자동으로 따라오지 않으므로 Dependabot이나 정기 점검이 필요하다.

따라서 단순 shell 명령으로 쉽게 대체할 수 있는 소규모 제3자 action은 제거하는 편이 나을 수 있다.

### 완료 조건

- 제3자 action은 모두 full SHA 고정
- 공식 핵심 action도 가능하면 SHA 고정
- SHA 옆에 이해 가능한 버전 주석 존재
- 업데이트 절차가 문서화됨

### 우선순위

```text
P0
```

---
## AP-G-06 — Publication Cadence Fetish
- Category: Content strategy and structure
- Original IDs: G-06
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 정해진 주기에 맞추기 위해 글을 발행

### 증상

- 주 3회 발행이 목표
- 미완성 글도 일정 때문에 공개
- 기존 글 업데이트는 실적으로 보지 않음

### 문제

발행 빈도가 품질보다 우선된다.

### 개선

콘텐츠 성과를 다음처럼 함께 본다.

```text
신규 글
대표 글 업데이트
중복 통합
허브 개선
오래된 글 검증
```

---
## AP-G-06-2 — 제3자 Action 최소화
- Category: Content strategy and structure
- Original IDs: G-06
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 감사 질문

각 action에 대해 다음을 확인한다.

```text
무슨 기능을 하는가
공식 action인가
shell 명령으로 대체 가능한가
저장소·token·artifact 중 무엇에 접근하는가
유지보수되고 있는가
```

### 제거 우선 후보

```text
간단한 파일 복사 action
단순 문자열 치환 action
작은 JSON 생성 action
관리되지 않는 link checker action
```

복잡한 action 하나를 설치하는 것보다 저장소 내부의 짧고 검토 가능한 script가 안전할 수 있다.

### 완료 조건

- 모든 제3자 action의 목적이 명확
- 대체 가능한 불필요 action 제거
- 유지보수 중단 action 없음
- action source 변경을 dependency 변경처럼 검토

### 우선순위

```text
P1
```

---
## AP-G-07 — Draft Too Early
- Category: Content strategy and structure
- Original IDs: G-07
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 조사 메모 단계에서 공개 Draft 생성

### 문제

공개 저장소에서는 `draft: true`여도 내용 자체가 보일 수 있다.

### 개선

민감하거나 미완성인 연구 노트는 공개 저장소 밖에서 관리하고, 게시 가능한 수준이 된 뒤 옮긴다.

---
## AP-G-07-2 — Secret Inventory 작성
- Category: Content strategy and structure
- Original IDs: G-07
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 목록 형식

| Secret | 용도 | 사용 Workflow | 권한 | 만료·회전 | 공개 가능 여부 |
|---|---|---|---|---|---|
| Pages token | 자동 제공 | deploy | 최소 | 자동 | 비공개 |
| OAuth secret | 관리자 기능 | 분리 대상 | 저장소 제한 | 회전 | 절대 비공개 |
| Analytics ID | 브라우저 설정 | site | 없음 | 해당 없음 | 공개 식별자 |

### 중요한 구분

브라우저에 포함되는 값은 비밀로 취급할 수 없다.

예:

```text
Google Analytics measurement ID
AdSense publisher ID
Giscus repository mapping
```

이들은 공개 식별자다.

반면 다음은 절대 client bundle에 들어가면 안 된다.

```text
OAuth client secret
Personal Access Token
GitHub App private key
배포용 장기 token
```

### 완료 조건

- 저장소에서 사용하는 모든 secret 목록 존재
- 각 secret의 최소 권한과 사용 step 확인
- 공개 식별자와 secret이 구분됨
- 사용되지 않는 secret 삭제

### 우선순위

```text
P0
```

---
## AP-G-08 — Draft Forever
- Category: Content strategy and structure
- Original IDs: G-08
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 초안이 계속 쌓임

### 문제

- 관리 부담
- 비슷한 새 글이 다시 생성
- 연구 상태와 폐기 상태가 구분되지 않음

### 개선

초안마다 만료 시점을 둔다.

```text
30일 내 진행
기존 글에 병합
아이디어로 환원
삭제
```

---
