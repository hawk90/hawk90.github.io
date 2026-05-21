---
title: "Ch 10: 한국 우주 산업 — 시리즈 마무리"
date: 2026-05-18T11:00:00
description: "한국 우주 산업의 공개된 사실 정리, ECSS 시리즈 마무리."
tags: [ecss, korea, kari, kompsat, nuri]
series: "ECSS-Q-ST-80C"
seriesOrder: 10
draft: false
---

ECSS 시리즈 마지막. 한국 우주 산업의 *공개된 사실*과 시리즈 정리. *기업·기관 내부 정보·확인되지 않은 수치는 제시하지 않는다*.

## 한국 우주 산업 — 공개 timeline

```
1989  KARI (한국항공우주연구원) 설립
1999  KOMPSAT-1 발사
2006  KOMPSAT-2 발사
2010  천리안-1 발사
2012  KOMPSAT-3 발사
2013  나로호 (KSLV-I) 3차 발사 성공
      KOMPSAT-5 발사
2015  KOMPSAT-3A 발사
2018  천리안-2A 발사
2020  천리안-2B 발사
2021  누리호 (KSLV-II) 1차 발사 (위성 분리 실패)
2022  누리호 2차 발사 성공
2023  누리호 3차 발사
2024  KASA (Korean Space Agency / 우주항공청) 출범
```

각 mission의 *상세 schedule, 후속 계획*은 *KARI / KASA 공식 발표*를 직접 참조.

## 주요 기관·기업 — 공개 정보

- **KARI** (한국항공우주연구원) — 1989 설립, 정부 출연 연구원. KOMPSAT, 천리안, 누리호 등 주도. [kari.re.kr](https://www.kari.re.kr/)
- **KASA** (우주항공청) — 2024 출범. 정책·규제·국제 협력 담당. [kasa.go.kr](https://www.kasa.go.kr/)
- **KAI** (한국항공우주산업) — F-35 *Asia-Pacific Final Assembly and Check Out (FACO)* 시설 운영 (사천). Lockheed Martin과 협력. [koreaaero.com](https://www.koreaaero.com/)
- **한화 에어로스페이스** — 엔진, 발사체 사업
- **LIG Nex1** — 군 위성, 항공·통신 시스템

각 기관·기업의 *내부 SW 표준, 사용 도구, 코딩 standard, 인력 규모*는 *비공개*. 이 시리즈는 *내부 정보 추정 제시 안 함*.

## KOMPSAT — 공개 mission 정보

다목적실용위성 시리즈. 발사 일자 등 *공개 정보*:

```
KOMPSAT-1  : 1999-12-21 발사
KOMPSAT-2  : 2006-07-28 발사
KOMPSAT-3  : 2012-05-18 발사
KOMPSAT-5  : 2013-08-22 발사 (SAR)
KOMPSAT-3A : 2015-03-26 발사
KOMPSAT-6  : 후속 mission
KOMPSAT-7  : 후속 mission
```

각 mission의 *질량, 해상도, 운영 상태*는 KARI 공식 페이지 참조. *내부 SW process / 코딩 표준 / 사용 RTOS*는 *공식 발표가 없는 한 추정하지 않는다*.

## 천리안 — GEO 시리즈

```
천리안-1   : 2010-06-26 발사
천리안-2A  : 2018-12-04 발사 (기상)
천리안-2B  : 2020-02-18 발사 (해양·환경)
```

정지궤도 (GEO) mission. 운영 기관: 기상청, 해양수산부 등.

## 누리호 (KSLV-II) — 공개 사실

```
2021  1차 발사 — 3단 엔진 조기 정지, 위성 분리 실패
2022  2차 발사 성공
2023  3차 발사 성공
```

1차 발사 *technical anomaly*에 대한 *공식 조사 결과*는 KARI 공식 발표 참조. 본 글은 *원인 분석·재발 방지 조치*를 *추측하지 않는다*.

## ECSS와 한국 우주의 일반 관계

ECSS는 *유럽 우주 표준*이고, 한국 mission이 *유럽 협력 (Astrium, Airbus DS, Thales 등)*을 거치는 과정에서 *ECSS process에 노출*되어 왔다는 *일반적인 산업 관찰*이 있다. 단:

- 각 mission의 *공식 SW 표준이 ECSS인지 자체 표준인지*는 *KARI/관련 기관의 공식 발표가 없는 한 단정하지 않는다*.
- 한국 *자체 우주 SW 표준* 존재·내용은 *기관 내부 자료*.

## 신생 우주 회사 — 공개 사실만

한국에 *신생 우주 회사가 다수 존재*. 발사체, 위성, 지상국, 통신 등 분야. 각 회사의 *기술 stack / 표준 / 인력*은 *회사 공식 발표가 없는 한 추정 안 함*.

대표적 공개 사실:

- Perigee Aerospace — 발사체
- Innospace — 하이브리드 엔진 발사체, 2023 첫 발사
- Contec — 지상국 / 통신

각 회사 *공식 페이지* 참조.

## ECSS 적용 — 일반 도전

ECSS full adoption의 *일반적인 도전*은 산업 통념으로 자주 언급되는 항목:

- Documentation 부담 (full process)
- 인력 / 도구 / 인프라
- Schedule pressure vs process

이를 어떻게 해결하는가는 *각 조직 / mission*마다 다르다. 정확한 한국 산업 *통계나 평가*는 *제공된 공식 자료*를 직접 참조.

## 시리즈 마무리

### 시리즈 10장 정리

```
Ch 1   : ECSS 표준 체계
Ch 2   : SW Process Assurance (SPA)
Ch 3   : SW Product Properties
Ch 4   : Configuration Management
Ch 5   : Non-Conformance Control
Ch 6   : Procurement
Ch 7   : ISVV — Independent V&V
Ch 8   : ECSS-E-ST-40C — Engineering V-model
Ch 9   : Tool Qualification (Annex Q)
Ch 10  : 한국 적용 + 시리즈 마무리
```

### Key Takeaways

**1. ECSS는 *유럽 우주 SW 표준* — 무료, 광범위.**


**2. ECSS-Q-ST-80C (QA) + ECSS-E-ST-40C (Engineering)이 핵심 페어.**


**3. *Tailoring 가능* — mission 규모에 맞게.**


**4. *Heritage reuse* — ESA SAVOIR catalog.**


**5. *ISVV* (외부 V&V)가 차별점.**


**6. DO-178C / ISO 26262와 *상호 보완*.**


**7. 정확한 정책·문서·rule wording은 *ecss.nl* 원문.**

### 다음 시리즈 추천

- [DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview) — 항공 SW 인증
- [JSF C++ 시리즈](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction) — F-35 코딩 표준
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [MISRA C 시리즈](/blog/embedded/automotive/misra-c/chapter01-introduction) — 자동차 + 항공 공통
- [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro)

### 자료

- [ECSS 공식](https://ecss.nl/) — 표준 무료 다운로드
- [ESA SAVOIR](https://savoir.estec.esa.int/) — heritage / building blocks
- [KARI](https://www.kari.re.kr/)
- [KASA — Korean Space Agency](https://www.kasa.go.kr/)
- [한국항공우주산업진흥회 (KAIA)](https://www.aerospace.or.kr/)

## 정리

- 한국 우주 산업의 *공개된 milestone*: KARI 1989 설립, KOMPSAT 시리즈, 천리안 GEO, 누리호 성공, KASA 2024 출범.
- *내부 SW 표준, 코딩 standard, 도구 stack, 인력 수치*는 *비공개*이므로 *추정하지 않는다*.
- ECSS와의 관계도 *공식 자료가 명시한 것만* 기록.
- 자세한 적용은 *각 기관 공식 발표* 또는 *ECSS 원문* 직접 참조.

## ECSS 시리즈를 마치며

이 시리즈가 *현장 적용*과 *학습*에 일부라도 도움이 됐기를 바랍니다. 실제 적용은 *ecss.nl 원문*과 *해당 mission / 기관의 공식 가이드*를 직접 참조해 진행해야 합니다.

다음 시리즈로는 **JSF C++ (F-35 코딩 표준)**, **DO-178C (항공 SW 인증)**, **NASA JPL Power of 10**을 추천합니다.

## 관련 항목

- [Ch 9 — Tool Qualification](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter09-tool-qualification)
- [DO-178C Ch 1](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [JSF C++ Ch 1](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [KARI](https://www.kari.re.kr/)
- [KASA](https://www.kasa.go.kr/)
