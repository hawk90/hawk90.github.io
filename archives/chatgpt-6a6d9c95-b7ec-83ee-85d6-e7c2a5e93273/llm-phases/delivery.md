---
title: "Phase 5 — URL migration and operations"
item_count: 52
---

# Phase 5 — URL migration and operations

> Execute these tasks in order within this phase. Do not mark a task complete without linking evidence or a verification command.

## PH-F-01 — 현재 공개 URL 유형 전수 조사

- Original task: F-01
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 문제

일반 글이 많더라도 다음 페이지가 함께 공개되고 색인된다면 사이트 전체 인상이 약해질 수 있다.

```text
빈 태그 페이지
글이 1개뿐인 카테고리
검색 결과 페이지
페이지네이션
Draft나 Placeholder
관리 기능
구판·중복 문서
단순 날짜 아카이브
```

### 작업

최종 배포 결과의 모든 URL을 유형별로 집계한다.

| 페이지 유형 | URL 수 | 색인 대상 | Sitemap | 광고 대상 |
|---|---:|---|---|---|
| Article |  | 예 | 예 | 조건부 |
| Topic Hub |  | 예 | 예 | 조건부 |
| Series Hub |  | 선별 | 선별 | 조건부 |
| Tag |  | 선별 | 선별 | 대체로 제외 |
| Archive |  | 선별 | 선별 | 제외 권장 |
| Search |  | 아니오 | 아니오 | 제외 |
| Admin |  | 아니오 | 아니오 | 제외 |
| Draft |  | 공개 제외 | 아니오 | 제외 |
| Superseded |  | 상황별 | 상황별 | 제외 권장 |
| 404 | 1 | 아니오 | 아니오 | 제외 |

### 구현 방법

공통 Content Manifest 외에 최종 생성 페이지 manifest를 만든다.

```ts
interface GeneratedPage {
  url: string;
  pageType:
    | "article"
    | "topic"
    | "series"
    | "tag"
    | "archive"
    | "search"
    | "admin"
    | "error";
  indexable: boolean;
  canonical: string;
  includeInSitemap: boolean;
  adsEligible: boolean;
}
```

### 완료 조건

- 최종 배포 URL 총수가 확인됨
- 페이지 유형별 색인 정책이 존재함
- 검색·관리·빈 결과 페이지가 Sitemap에 포함되지 않음
- 광고 가능 여부가 페이지 유형에 따라 결정됨

### 우선순위

```text
P0
```

---

## PH-F-02 — Indexability Matrix 확정

- Original task: F-02
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

각 페이지가 단순히 공개되었다는 이유로 자동 색인되면 안 된다.

## 권장 정책

| 유형 | Index | Follow | Sitemap |
|---|---|---|---|
| Current Article | 예 | 예 | 포함 |
| Needs Review Article | 예 | 예 | 포함 |
| Historical Article | 선별 | 예 | 선별 |
| Superseded Article | 대체로 아니오 또는 신판 우선 | 예 | 대체로 제외 |
| Topic Hub | 예 | 예 | 포함 |
| 강한 Series Hub | 예 | 예 | 포함 |
| 얕은 Tag | 아니오 | 예 | 제외 |
| 내부 검색 결과 | 아니오 | 예 | 제외 |
| 관리자 페이지 | 아니오 | 아니오 | 제외 |
| Draft | 출력 제외 | 해당 없음 | 제외 |
| 404 | 아니오 | 상황별 | 제외 |

## 중요한 구분

```text
중복 페이지 통합
→ canonical 또는 redirect

검색 결과에서 제외
→ noindex

외부 접근 자체 차단
→ 인증 또는 빌드 제외
```

Canonical과 `noindex`를 같은 의미로 사용해서는 안 된다. Google은 canonical을 중복 URL 중 대표 URL을 제안하는 방법으로 설명하며, Sitemap에는 선호하는 canonical URL을 포함하도록 안내한다. 다만 최종 canonical 선택은 Google이 할 수 있다. citeturn733970search35turn733970search41turn733970search27

### 완료 조건

- 모든 page type에 index 정책이 정의됨
- `noindex` URL이 Sitemap에 없음
- canonical이 실제로 동등하지 않은 다른 문서를 가리키지 않음
- 공개 제외 페이지는 robots 설정이 아니라 빌드에서 제외됨

### 우선순위

```text
P0
```

---

## PH-F-03 — Sitemap을 공개 가치 목록으로 정리

- Original task: F-03
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 문제

Sitemap을 모든 생성 URL의 덤프로 사용하면 사이트가 중요하게 여기는 URL을 구분하기 어렵다.

### 작업

Sitemap에는 다음을 중심으로 넣는다.

```text
Current Article
선별된 Historical Article
Topic Hub
강한 Series Hub
About
Editorial Policy
Privacy Policy
```

다음은 제외한다.

```text
Draft
Search
Admin
404
임의 Filter
얕은 Tag
Redirect URL
Superseded 구주소
```

Google은 Sitemap을 검색엔진에 URL을 알리고 처리 상태를 확인하는 수단으로 안내하며, Sitemap에 포함된 URL은 선호 canonical 후보로 활용될 수 있다고 설명한다. citeturn733970search34turn733970search41

### 추가 작업

Sitemap의 `lastmod`는 실제 의미 있는 콘텐츠 변경일을 사용한다.

```text
빌드한 날짜
≠
콘텐츠를 수정한 날짜
```

모든 URL의 `lastmod`가 배포 때마다 현재 날짜로 변경되는 구조는 피한다.

### 완료 조건

- Sitemap URL과 indexable page 집합이 일치
- redirect URL이 없음
- Draft와 검색 페이지가 없음
- `lastmod`가 실제 콘텐츠 수정에 대응
- Search Console에서 처리 오류를 확인할 수 있음

### 우선순위

```text
P0
```

---

## PH-F-04 — Canonical URL 전수 검증

- Original task: F-04
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 검사할 문제

```text
모든 글이 홈 canonical을 가리킴
preview domain이 canonical
http와 https 혼재
trailing slash 정책 불일치
태그와 Topic Hub가 서로 canonical
구판이 무관한 대표 글 canonical
```

## 권장 원칙

일반적으로 독립적인 문서는 자기 URL을 canonical로 사용한다.

```html
<link
  rel="canonical"
  href="https://hawk90.github.io/topics/pcie-cxl/"
/>
```

실제 중복 콘텐츠만 대표 URL로 통합한다.

### 자동 검사

```text
canonical 존재
absolute HTTPS URL
production origin
자기 URL 또는 허용된 중복 대상
canonical target가 indexable
redirect chain 없음
```

### 완료 조건

- 모든 indexable 페이지에 canonical 존재
- canonical target가 200 응답
- preview 주소가 운영 canonical로 노출되지 않음
- Sitemap URL과 canonical URL이 일치

### 우선순위

```text
P0
```

---

## PH-F-05 — 얕은 태그 페이지 정리

- Original task: F-05
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 문제

태그가 많으면 다음과 같은 페이지가 대량 생성된다.

```text
제목
글 1개
짧은 카드
```

이 페이지는 사용자에게 별도 탐색 가치를 거의 제공하지 못한다.

### 작업 분류

#### 핵심 태그

다음 조건을 만족하면 Topic Hub나 강한 보조 허브로 승격한다.

```text
글이 충분히 있음
사이트 핵심 전문 분야임
고유한 설명과 큐레이션이 가능함
```

#### 일반 태그

글 목록 탐색 기능으로 유지하되 색인 필요성을 검토한다.

#### 1회성 태그

통합·alias·삭제 후보로 처리한다.

### 1차 기준 예시

```text
1~2개 글
→ 기본 noindex 후보

3~5개 글
→ 실제 탐색 가치 수동 확인

6개 이상
→ 설명·대표 글을 추가하거나 Topic 승격 검토
```

이는 Google의 공식 숫자 기준이 아니라 사이트 운영을 위한 내부 검토 기준이다.

### 완료 조건

- 1회성 태그 수가 집계됨
- 동의어 태그가 통합됨
- 핵심 태그와 단순 필터 태그가 구분됨
- 얕은 태그 페이지가 Sitemap에서 제거됨
- 중요한 주제는 Topic Hub로 연결됨

### 우선순위

```text
P0
```

---

## PH-F-06 — 얕은 Series 페이지 강화

- Original task: F-06
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 문제

시리즈 페이지가 다음처럼 되어 있다면 일반 목록과 차이가 없다.

```text
시리즈 제목
Part 1
Part 2
Part 3
```

### 보완 요소

```text
시리즈 목표
대상 독자
선행 지식
전체 진행 순서
각 편의 역할
완독 후 다음 단계
```

### 색인 기준

다음이 있는 시리즈만 독립적인 indexable page로 유지한다.

```text
명확한 학습 목표
3편 이상 또는 충분한 독립 구조
고유한 설명
순서가 실제 의미를 가짐
```

단순히 같은 태그의 글을 묶은 페이지라면 태그나 Topic과 역할이 중복될 수 있다.

### 완료 조건

- 모든 indexable Series Hub에 고유한 소개가 있음
- 각 편이 무엇을 설명하는지 표시됨
- 미완성·빈 시리즈는 색인되지 않음
- Series와 Topic의 역할이 중복되지 않음

### 우선순위

```text
P1
```

---

## PH-F-07 — 빈 페이지와 Placeholder 제거

- Original task: F-07
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

Google Publisher Policies는 게시자 콘텐츠가 없거나 낮은 가치의 화면, 공사 중인 화면 등에 Google 광고를 게재하지 못하도록 한다. citeturn733970search18

### 검사 대상

```text
내용 준비 중
Coming Soon
검색 결과 없음
빈 Topic
빈 Tag
빈 Series
빈 통계 페이지
관리자 로그인
로딩 전용 화면
```

### 권장 처리

| 상태 | 처리 |
|---|---|
| 작성 중 문서 | Production build 제외 |
| 미래 Topic | 실제 콘텐츠 준비 후 공개 |
| 검색 결과 없음 | noindex + 광고 제외 |
| 빈 태그 | 생성하지 않음 |
| 관리자 페이지 | Production에서 제거 또는 인증 |
| 삭제된 문서 | 적절한 404·410·redirect |

### 완료 조건

- `dist`에서 Placeholder 문구 검색 결과 0건
- 빈 목록 페이지 생성 없음
- 검색 결과 없음 화면에 광고 코드 없음
- 관리자 화면이 일반 사이트 탐색에 노출되지 않음

### 우선순위

```text
P0
```

---

## PH-F-08 — 콘텐츠 중복·Cannibalization 1차 정리

- Original task: F-08
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 대상

우선 유사 제목과 같은 검색 의도를 가진 상위 20개 묶음만 분석한다.

예:

```text
PCIe BAR란
PCIe BAR 설명
BAR 크기 구하기
PCIe BAR 주소 할당
```

### 판단 결과

```text
통합
역할 구분
버전 분리
Historical
Superseded
유지
```

### 통합 기준

다음을 대부분 만족하면 통합 가능성이 높다.

```text
같은 검색 질문
동일 설명 반복
별도 실험 없음
버전 차이 없음
각 글이 독립적으로 완결되지 않음
```

### 역할 구분 예

```text
Guide:
PCIe 장치 초기화 전체 흐름

Concept:
BAR 크기 탐색과 주소 할당

Debug Note:
BAR가 0으로 보이는 원인

Reference:
BAR 레지스터 비트 구조
```

### 완료 조건

- 중복 후보 20개 묶음 분석
- 최소 5개 묶음에 통합 또는 역할 지정
- 구판에 대체 문서 링크 추가
- 내부 링크가 최종 대표 문서를 가리킴
- redirect chain 없이 최종 URL로 연결

### 우선순위

```text
P0
```

---

## PH-F-09 — 대표 문서 10개 완성

- Original task: F-09
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

기존 Epic C의 대표 문서 20개 중 최소 10개를 재신청 전에 `current` 상태로 완성한다.

## 각 문서 필수 항목

```text
명확한 제목과 description
콘텐츠 타입
Primary Topic
현재 상태
수정일
필요한 경우 검증일
환경·버전
근거와 출처
작성자의 분석
적용 범위와 한계
다음 학습 경로
```

## 콘텐츠 가치 강화 항목

다음 중 최소 하나가 분명히 보여야 한다.

```text
직접 구현
직접 측정
실제 장애 분석
공식 사양과 코드 연결
잘못된 가설을 제외한 과정
버전별 차이
의사결정 기준
```

Google Search의 사람 중심 콘텐츠 가이드는 콘텐츠가 기존 또는 의도한 독자에게 유용한지, 직접적인 경험과 깊이를 보여주는지, 독자가 목표 달성에 충분한 도움을 받는지 평가하도록 권장한다. citeturn733970search15

### 완료 조건

- 대표 문서 10개가 `current`
- `needs-review` 문서가 Featured에 없음
- 문서마다 독창적인 경험·분석 요소가 있음
- 단순 공식 문서 번역에 머물지 않음
- 모바일에서 코드·표·다이어그램이 정상

### 우선순위

```text
P0
```

---

## PH-F-10 — 일반적인 AI 문장 제거

- Original task: F-10
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 검사 대상

```text
이번 글에서는 자세히 알아보겠습니다
다양한 장점이 있습니다
매우 중요한 기술입니다
앞으로 더욱 중요해질 것입니다
결론적으로 효율적인 방법입니다
```

이런 표현이 무조건 잘못된 것은 아니지만, 구체적인 정보 없이 반복되면 문서 밀도를 낮춘다.

### 치환 원칙

```text
추상적인 중요성
→ 실제 영향을 설명

일반적인 장점
→ 측정된 결과나 사용 조건

포괄적 결론
→ 확인된 범위와 한계
```

### 예시

#### 이전

```text
Pinned memory는 성능 향상에 매우 중요한 기술입니다.
```

#### 개선

```text
이 테스트에서는 pageable memory보다 pinned memory의
1GB H2D 전송 시간이 중앙값 기준 약 44% 짧았다.
다만 작은 전송에서는 할당 비용이 이득을 상쇄할 수 있다.
```

### 완료 조건

- 대표 문서의 일반적 서론과 결론 재검토
- 핵심 주장에 환경·원인·결과 중 하나 이상 포함
- AI 문장 탐지 점수 같은 불확실한 지표를 품질 기준으로 사용하지 않음
- 글자 수를 늘리기 위한 보충 문단 없음

### 우선순위

```text
P1
```

---

## PH-F-11 — 홈과 Topic Hub 완성

- Original task: F-11
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

AdSense 재신청 전에 최소한 다음 구조가 실제로 배포돼 있어야 한다.

```text
홈
├── 사이트 목적
├── Core Topics
├── Featured Guides
└── Latest Posts

Topic Hub
├── 주제 설명
├── Start Here
├── Core Concepts
├── Featured Guides
└── Debug & Experiments
```

### 최소 완료 범위

```text
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 글 8개 이상 연결
```

### 완료 조건

- 홈이 최신 글 목록으로만 구성되지 않음
- 핵심 주제와 대표 문서가 첫 방문에서 확인됨
- Hub가 단순 카드 자동 목록이 아님
- 모든 Featured 문서가 `current`

### 우선순위

```text
P0
```

---

## PH-F-12 — About 페이지 개편

- Original task: F-12
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### About 페이지가 답해야 할 질문

```text
누가 운영하는가
어떤 주제를 다루는가
어떤 경험을 바탕으로 쓰는가
어떻게 검증하는가
어떻게 오류를 제보하는가
```

### 권장 구성

```text
짧은 소개
전문 분야
실무·연구 경험의 범위
작성 원칙
오류 제보·연락 경로
```

### 피해야 할 것

```text
과도한 자기 홍보
입증할 수 없는 전문가 표현
회사 내부 정보 노출
이력서 전체 복사
SEO 키워드 나열
```

### 권장 핵심 문장 방향

```text
CUDA·FPGA 기반 영상 처리, 임베디드 펌웨어,
PCIe 장치와 시스템 소프트웨어 개발 경험을 바탕으로
코드·사양·실험 결과를 연결해 설명합니다.
```

### 완료 조건

- 운영자 이름 또는 일관된 작성자 정체성 표시
- 실제 경험 범위가 구체적이고 과장되지 않음
- GitHub 또는 오류 제보 경로 존재
- 홈과 글의 작성자 정보가 About으로 연결

### 우선순위

```text
P0
```

---

## PH-F-13 — Editorial Policy 페이지 작성

- Original task: F-13
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 목적

“SEO를 위한 정책 페이지”가 아니라 실제 문서 품질 관리 방식을 공개한다.

### 포함할 내용

```text
출처 우선순위
사실·관찰·가설 구분
수정일과 검증일 차이
버전이 오래된 문서 처리
AI 사용 범위
오류 수정 방법
```

### 간단한 원칙 예시

```text
직접 확인한 결과를 우선합니다.
확인하지 못한 내용은 가설로 표시합니다.
버전 영향을 받는 글에는 환경과 검증 시점을 기록합니다.
중대한 오류는 수정 기록과 함께 바로잡습니다.
AI는 구조와 문장 개선에 활용하지만 핵심 기술 주장은
사양·소스코드·실험 결과로 확인합니다.
```

### 완료 조건

- 실제 운영 방식과 일치
- 형식적인 선언에 머물지 않음
- 대표 문서의 상태 모델을 설명
- 오류 제보 링크 제공

### 우선순위

```text
P1
```

---

## PH-F-14 — Contact와 오류 제보 경로 정비

- Original task: F-14
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 가능한 경로

```text
GitHub Issue
이메일
Giscus 댓글
문서별 Edit 링크
```

모두 제공할 필요는 없다.

권장 최소 조합:

```text
일반 연락: 이메일 또는 GitHub 프로필
문서 오류: GitHub Issue
```

### 글 하단 UI

```text
이 문서에서 오류를 발견했나요?
GitHub에서 수정 제안 또는 오류를 제보할 수 있습니다.
```

### 완료 조건

- 연락 경로가 실제로 작동
- 이메일 주소를 이미지나 난해한 방식으로 숨기지 않음
- 오류 제보 시 문서 URL이나 ID가 자동 포함
- 중요한 댓글 정정은 본문으로 반영

### 우선순위

```text
P1
```

---

## PH-F-15 — Privacy Policy 작성·현행화

- Original task: F-15
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

AdSense의 필수 콘텐츠 안내는 개인정보 처리방침에 Google을 포함한 제3자 광고 제공자의 쿠키 사용과 맞춤형 광고 거부 방법 등에 관한 정보를 포함하도록 안내한다. 실제 사용 중인 광고·분석·댓글 서비스에 맞춰 작성해야 한다. citeturn733970search4

## 실제 데이터 흐름 먼저 조사

```text
AdSense
Analytics
Giscus
Local Storage
검색어 수집
외부 폰트
Newsletter
```

## Privacy Policy에 포함할 후보

```text
운영자와 연락 방법
수집하는 정보
수집 목적
쿠키·로컬 스토리지
Google 광고와 제3자 제공자
Analytics
Giscus와 GitHub Discussions
외부 링크
보존과 삭제
정책 변경일
```

Google의 Privacy & messaging 기능은 GDPR이나 미국 주별 개인정보 규정 등에 대응하는 동의·거부 메시지를 구성할 수 있도록 제공된다. 실제 적용 의무는 방문 지역과 데이터 처리 방식에 따라 달라지므로 단순 배너 복사보다는 사용 중인 서비스와 지역을 기준으로 설정해야 한다. citeturn733970search11turn733970search22

### 피해야 할 것

- 다른 블로그 정책 복사
- 사용하지 않는 서비스 나열
- 사용하는 서비스 누락
- 광고 도입 전후 정책 불일치
- 실제 동의 제어 없이 버튼만 있는 배너

### 완료 조건

- 현재 네트워크 요청과 정책 내용이 일치
- Privacy 링크가 푸터에 항상 존재
- 광고·분석 서비스 변경 시 정책 검토 절차 존재
- 마지막 변경일 표시

### 우선순위

```text
P0
```

---

## PH-F-16 — Terms·Disclaimer의 과잉 생성 방지

- Original task: F-16
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

About, Contact, Privacy는 실제 역할이 명확하다.

반면 다음 페이지는 필요성 없이 형식적으로 만들지 않는다.

```text
Terms of Service
Medical Disclaimer
Financial Disclaimer
Affiliate Disclaimer
Cookie Policy 별도 페이지
```

사이트가 해당 서비스를 제공하거나 관련 내용을 다루지 않는다면 빈 법률 템플릿은 오히려 실제 운영과 불일치할 수 있다.

### 원칙

```text
실제 처리와 책임 관계가 있을 때 작성
단순히 승인에 도움이 될 것 같아서 만들지 않음
```

제휴 링크나 협찬이 생긴다면 해당 관계를 글과 정책에서 명확히 공개한다.

---

## PH-F-17 — 구조화 데이터 최소 구현

- Original task: F-17
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

구조화 데이터는 콘텐츠 품질의 대체 수단이 아니다. Google은 구조화 데이터가 페이지에 실제로 표시되는 콘텐츠를 정확히 표현해야 하며, 기술적으로 유효하더라도 품질 가이드라인을 충족하지 않으면 검색 기능에 표시되지 않을 수 있다고 안내한다. citeturn733970search21turn733970search2

## 권장 최소 구성

### 홈

```text
WebSite
Person 또는 Organization는 실제 운영 형태에 맞게 선별
```

### 글

```text
BlogPosting 또는 Article
BreadcrumbList
```

Article 구조화 데이터는 Google이 제목·이미지·날짜·작성자 등 페이지 정보를 이해하는 데 도움을 줄 수 있다. citeturn733970search14

## 실제 값과 연결

```text
headline ← 문서 title
description ← 문서 description
datePublished ← published
dateModified ← updated
author ← 실제 작성자
mainEntityOfPage ← canonical
```

`lastVerified`를 `dateModified`로 자동 대체하지 않는다.

### 완료 조건

- 화면에 없는 평가·리뷰·전문가 정보를 넣지 않음
- canonical·날짜·작성자가 실제 페이지와 일치
- Rich Results Test로 대표 페이지 검사
- schema 실패가 일반 본문 렌더를 막지 않음

### 우선순위

```text
P1
```

---

## PH-F-18 — 제목과 Description 감사

- Original task: F-18
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 검사 대상

```text
제목 중복
설명 중복
너무 일반적인 제목
키워드 나열형 제목
자동 생성 첫 문장 description
빈 description
```

## 대표 문서 제목 원칙

```text
한 글에 하나의 핵심 질문
주요 기술 고유명 포함
불필요한 ‘완벽 정리’ 표현 자제
```

### 예시

#### 이전

```text
PCIe 완벽 정리 총정리 개념 원리 BAR MMIO
```

#### 개선

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

## Description 원칙

```text
무엇을 설명하는가
어떤 범위인가
독자가 무엇을 얻는가
```

### 완료 조건

- 대표 20개 제목·description 수동 검토
- 전체 사이트 중복 title 없음
- description 완전 동일 중복 없음
- 페이지 언어와 description 언어 일치

### 우선순위

```text
P0
```

---

## PH-F-19 — 검색 색인 품질 검사

- Original task: F-19
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### Search Console에서 확인할 대상

```text
대표 글 10개
Topic Hub 2개
홈
About
Privacy
Editorial Policy
```

### 확인 항목

```text
Google이 선택한 canonical
색인 여부
마지막 크롤링
모바일 렌더링
차단된 자원
중복 판단
```

### 주의

모든 페이지에 수동 색인 요청을 반복하는 방식은 구조적 해결책이 아니다.

먼저 다음을 고친다.

```text
내부 링크
Sitemap
canonical
콘텐츠 중복
페이지 품질
```

### 완료 조건

- 핵심 페이지가 내부 링크로 발견 가능
- Sitemap 제출 및 처리 확인
- 대표 페이지의 Google-selected canonical 확인
- 예상치 못한 중복 canonical 문제 없음

### 우선순위

```text
P0
```

---

## PH-F-20 — 404와 삭제 URL 정비

- Original task: F-20
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 좋은 404 페이지

```text
페이지를 찾을 수 없다는 명확한 안내
검색
Core Topics
홈
대표 Guide
```

### 피해야 할 것

```text
200 상태로 “페이지 없음” 표시
광고 삽입
수십 개 추천 카드
자동으로 홈 redirect
```

### 삭제 글 처리

```text
대체 문서 있음
→ 가장 가까운 문서로 redirect

대체 문서 없음
→ 정상적인 404 또는 적절한 제거 응답

외부 참조가 많은 중요 문서
→ 짧은 대체 안내 페이지 검토
```

### 완료 조건

- 존재하지 않는 URL이 200으로 응답하지 않음
- 404에 광고 없음
- 삭제 URL을 무조건 홈으로 redirect하지 않음
- redirect chain 없음

### 우선순위

```text
P1
```

---

## PH-F-21 — 모바일 콘텐츠 경험 감사

- Original task: F-21
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

재신청 전 실제 모바일 화면을 대표 페이지 기준으로 검사한다.

## 페이지

```text
홈
Topic Hub
일반 Guide
코드가 많은 글
표가 많은 글
검색
About
Privacy
404
```

## 검사

```text
본문 글자 크기
코드 가로 스크롤
표 overflow
광고 슬롯 예정 위치
고정 헤더
목차
다이어그램 확대
링크·버튼 터치 영역
CLS
```

### 완료 조건

- 본문을 가리는 고정 요소 없음
- 코드 복사 버튼이 코드를 덮지 않음
- 표와 코드가 viewport를 확장하지 않음
- Topic Hub 탐색이 한 열에서도 이해 가능
- 핵심 콘텐츠가 Hero 아래 너무 늦게 시작하지 않음

### 우선순위

```text
P0
```

---

## PH-F-22 — 광고 없는 상태에서 사이트 감사

- Original task: F-22
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

승인 준비 중에는 광고 배치 최적화보다 콘텐츠와 페이지 품질을 먼저 확인한다.

### 검사할 것

```text
광고 코드 없이 레이아웃 정상
빈 광고 슬롯 없음
Auto Ads 관련 이전 설정 없음
실험용 광고 placeholder 없음
```

### 이유

광고가 없는 상태에서도 페이지가 완결돼야 한다.

AdSense는 게시자 콘텐츠가 없는 화면에 광고를 허용하지 않으며, 광고 배치 모범 사례에서도 사용자가 원하는 콘텐츠를 쉽게 찾을 수 있는 경험을 강조한다. citeturn733970search18turn733970search23

### 완료 조건

- 모든 페이지가 광고 없이 자연스럽게 읽힘
- 광고 공간을 전제로 한 큰 빈 영역 없음
- 검색·404·관리 페이지에 광고 코드 없음

### 우선순위

```text
P0
```

---

## PH-F-23 — 광고 가능 페이지 정책 작성

- Original task: F-23
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

승인 이후를 대비하되 실제 광고는 승인 후 적용한다.

## 광고 가능 후보

```text
Current Article
충분한 설명이 있는 Topic Hub
완성된 Guide
```

## 광고 제외

```text
홈 Hero 근처
Search
404
Admin
Draft
빈 Tag
얕은 Archive
Superseded
Archived
개인정보·연락 페이지
```

## 조건부 제외

```text
매우 짧은 Reference
Historical
Needs Review
도구 전용 페이지
```

### 코드 예

```ts
function isAdsEligible(page: GeneratedPage): boolean {
  if (!page.indexable) return false;

  return (
    page.pageType === "article" &&
    page.status === "current" &&
    page.hasSubstantialPublisherContent
  );
}
```

`hasSubstantialPublisherContent`를 글자 수 하나로 자동 판정하지 않는다.

### 완료 조건

- 광고 코드가 전체 Layout에 무조건 삽입되지 않음
- 페이지 유형과 상태 기반 조건 존재
- 404·검색·관리 페이지 광고 차단 테스트 존재

### 우선순위

```text
P1
```

---

## PH-F-24 — 광고 제외 영역 설계

- Original task: F-24
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

Google의 광고 배치 정책은 광고를 콘텐츠나 내비게이션으로 오인하게 만들거나, 우발적인 클릭을 유도하거나, 광고에 부자연스러운 주의를 끄는 배치를 제한한다. citeturn733970search5

## 기술 문서 보호 영역

```text
제목과 첫 문단
코드와 해당 코드 설명 사이
표와 표 해석 사이
다이어그램과 캡션 사이
단계별 절차 중간
경고·주의 블록 주변
결론 직전
```

## 상대적으로 안전한 후보

```text
큰 장이 끝난 뒤
본문 종료 뒤
관련 글 이전
긴 문서의 독립된 섹션 경계
```

### 완료 조건

- 코드·표·절차를 하나의 보호 단위로 취급
- 광고 주변에 버튼·복사·다음 글 링크가 밀착되지 않음
- 광고 제목처럼 보이는 heading 없음
- 자동 광고 적용 시 실제 삽입 위치 검토

### 우선순위

```text
P1
```

---

## PH-F-25 — 광고 슬롯 CLS 방지

- Original task: F-25
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

### 작업

광고 슬롯을 적용할 경우 예상 크기를 확보한다.

```css
.ad-slot {
  min-height: var(--reserved-ad-height);
}
```

다만 실제 광고가 없는 상태에서 지나치게 큰 빈 공간이 남지 않도록 로드 상태와 실패 상태를 구분한다.

### 검사

```text
모바일 CLS
광고 로드 실패
광고 차단기 사용
느린 네트워크
화면 회전
```

### 완료 조건

- 광고 로드 시 본문 위치가 크게 이동하지 않음
- 실패 시 불필요한 큰 빈 공간 제거
- 코드·표 위치가 이동하지 않음

---

## PH-F-26 — AdSense 재신청 전 최종 체크리스트

- Original task: F-26
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

## 콘텐츠

```text
[ ] 대표 문서 10개 이상 current
[ ] 실제 경험·분석·실험이 명확함
[ ] 중복 후보 20개 검토
[ ] 구판과 신판 관계 정리
[ ] Placeholder와 빈 페이지 없음
[ ] Topic Hub 2개 이상 완성
```

## 색인

```text
[ ] Sitemap에 canonical URL만 포함
[ ] Search·Admin·404·Draft 제외
[ ] 얕은 Tag 정책 적용
[ ] canonical 전수 검증
[ ] 대표 페이지의 Google-selected canonical 확인
```

## 신뢰

```text
[ ] About
[ ] Contact
[ ] Privacy Policy
[ ] Editorial Policy
[ ] 작성자 정보
[ ] 오류 제보 경로
```

## UX

```text
[ ] 모바일 대표 페이지 확인
[ ] 내부 검색 정상
[ ] 깨진 내부 링크 없음
[ ] 코드·표·다이어그램 정상
[ ] 광고 없는 상태에서 레이아웃 완성
```

## 기술

```text
[ ] HTTPS
[ ] robots와 noindex 충돌 없음
[ ] Sitemap 처리 확인
[ ] 404가 올바른 상태
[ ] 구조화 데이터 대표 페이지 검사
[ ] 배포 결과 smoke test
```

---

## PH-F-27 — 재신청 판단 기준

- Original task: F-27
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

다음 조건이 충족되기 전에 날짜만 기다렸다가 다시 신청하지 않는다.

```text
이전 신청 이후 실질적 변경이 있음
대표 콘텐츠의 가치가 강화됨
색인 페이지 집합이 정리됨
사이트 목적과 전문 분야가 명확해짐
신뢰·개인정보 페이지가 실제 운영과 일치함
```

## 실질적 변경 예

```text
홈 정보 구조 개편
Topic Hub 2개 공개
대표 글 10개 재검증
얕은 태그 noindex 또는 통합
중복 문서 통합
About·Privacy·Editorial Policy 개편
```

## 실질적이지 않은 변경

```text
문장 일부 교정
글 2~3개 추가
테마 색상 변경
메뉴명 변경
날짜만 최신화
광고 코드 재삽입
```

### 중요한 점

재신청 기준을 충족해도 승인 결과를 보장할 수는 없다.

목표는 심사 시스템을 속이는 것이 아니라:

```text
독자가 사이트의 전문성을 이해하고
대표 문서를 찾으며
각 문서의 근거와 현재 상태를 판단할 수 있게 만드는 것
```

이다.

---

## PH-F-28 — 재신청 후 변경 동결 범위

- Original task: F-28
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

재신청 직후 사이트 전체 구조를 다시 크게 변경하면 상태 관찰이 어려워진다.

## 동결 권장 영역

```text
canonical
URL
index 정책
홈 주요 구조
대표 문서 목록
광고 코드
```

## 계속 가능한 작업

```text
오탈자 수정
깨진 링크 수정
사실 오류 수정
작은 모바일 버그 수정
```

### 완료 조건

- 재신청 시점의 commit SHA 기록
- 변경 내용 요약 보존
- 구조적 변경은 결과 확인 전 제한
- 긴급 오류는 즉시 수정 가능

---

## PH-F-29 — Search Console 변경 로그

- Original task: F-29
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

간단한 Markdown 파일이면 충분하다.

```markdown
## 2026-08-01

- 홈을 Topic-first 구조로 변경
- PCIe & CXL Hub 추가
- 얕은 태그 43개 noindex
- 대표 글 10개 검증
- Sitemap에서 검색·아카이브 URL 제거
```

## 이후 관찰할 것

```text
핵심 페이지 색인
canonical 변경
노출 검색어
대표 Hub 유입
중복 페이지 상태
```

검색 지표는 변경 직후가 아니라 충분한 관찰 기간 후 해석한다.

---

## PH-F-30 — Epic F 완료 조건

- Original task: F-30
- Source message: 9c9ac6e5-49da-4ba2-8a90-ceb5f5e65e27
- Status: pending

### Task details

## 사이트 구조

```text
홈이 사이트 목적과 핵심 Topic을 설명
Topic Hub 최소 2개
Featured Guide 최소 8개
Latest Posts가 보조 역할
```

## 콘텐츠

```text
대표 글 20개 선정
최소 10개 current
중복·구판 후보 20개 검토
빈·Placeholder 페이지 없음
```

## 색인

```text
페이지 유형별 index 정책
Sitemap과 canonical 일치
얕은 Tag 정리
Search·Admin·404 제외
```

## 신뢰

```text
About
Contact
Privacy
Editorial Policy
작성자·오류 제보 연결
```

## 광고 준비

```text
광고 없는 완성된 레이아웃
광고 가능 페이지 정책
광고 제외 영역
CLS 방지 계획
```

## 검증

```text
production dist smoke test
모바일 대표 페이지 검사
내부 링크·anchor 검사
Search Console 핵심 페이지 확인
```

---

## PH-OPS-01 — Build Once, Deploy Same Artifact

- Original task: OPS-01
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Build와 Deploy를 분리하고 Artifact를 전달한다.

## PH-OPS-02 — Workflow 권한 최소화

- Original task: OPS-02
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Build와 Deploy Job별 권한을 명시한다.

## PH-OPS-03 — Concurrency 적용

- Original task: OPS-03
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

오래된 배포가 최신 배포를 덮어쓰지 못하게 한다.

## PH-OPS-04 — Dist Validation

- Original task: OPS-04
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

```text
Draft
Admin
Secret
Canonical
Sitemap
필수 파일
```

검사.

## PH-OPS-05 — Production Metadata

- Original task: OPS-05
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Commit SHA·Build Version을 기록한다.

## PH-OPS-06 — Base Path·URL 검사

- Original task: OPS-06
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Production Origin과 대표 자산 URL을 검증한다.

## PH-OPS-07 — Production Artifact Browser Smoke

- Original task: OPS-07
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

개발 서버가 아니라 `dist`를 테스트한다.

## PH-OPS-08 — Post-deploy Smoke

- Original task: OPS-08
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

실제 운영 Domain의 핵심 URL을 확인한다.

## PH-OPS-09 — Hashed Generated Assets

- Original task: OPS-09
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Search Index와 변경 자산의 Cache 불일치를 방지한다.

## PH-OPS-10 — Redirect Validation

- Original task: OPS-10
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

Chain·Cycle·Canonical 불일치를 검사한다.

## PH-OPS-11 — External Integration 격리

- Original task: OPS-11
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

댓글·광고·Analytics 실패가 본문에 영향을 주지 않게 한다.

## PH-OPS-12 — Rollback Runbook

- Original task: OPS-12
- Source message: 5fc6d1c4-d9c0-463f-b440-991a1a4e7ac2
- Status: pending

### Task details

직전 정상 Commit으로 복구하는 절차를 문서화한다.

---

## PH-PRN-01 — 기능 Inventory

- Original task: PRN-01
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

```text
Core
Supporting
Editorial
Questionable
```

으로 분류한다.

## PH-PRN-02 — Dependency Inventory

- Original task: PRN-02
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

사용 위치와 Bundle·Build 영향을 기록한다.

## PH-PRN-03 — Admin Surface 제거 또는 격리

- Original task: PRN-03
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

Production Route와 번들에서 제외한다.

## PH-PRN-04 — Client Island Audit

- Original task: PRN-04
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

불필요한 `client:*`를 제거한다.

## PH-PRN-05 — External Script Lazy Loading

- Original task: PRN-05
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

댓글·광고·Analytics 실패를 격리한다.

## PH-PRN-06 — Markdown Pipeline Audit

- Original task: PRN-06
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

중복 Parser와 불필요한 Plugin을 찾는다.

## PH-PRN-07 — Feature Flag Cleanup

- Original task: PRN-07
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

전환 완료 Flag와 구 구현을 함께 삭제한다.

## PH-PRN-08 — Build Command 통합

- Original task: PRN-08
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

로컬과 CI가 같은 명령을 사용한다.

## PH-PRN-09 — Dead Code·CSS 후보 Report

- Original task: PRN-09
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

자동 삭제 없이 검토 목록 생성.

## PH-PRN-10 — 전후 Metrics 비교

- Original task: PRN-10
- Source message: 98e290f4-ee57-4ace-aade-592c15bb7457
- Status: pending

### Task details

```text
Build time
Peak RSS
JavaScript
HTML
Dependency count
```

---

