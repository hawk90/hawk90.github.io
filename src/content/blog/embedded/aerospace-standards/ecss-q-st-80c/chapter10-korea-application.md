---
title: "Ch 10: 한국 우주 산업 적용 사례 종합 — 시리즈 마무리"
date: 2025-10-05T11:00:00
description: "KARI/한화/누리호/신생 우주 회사의 ECSS 적용 — 1990년대~2024 진화, 2030+ 전망, 시리즈 마무리."
tags: [ecss, korea, kari, hanwha, kompsat, nuri, perigee, innospace, contec]
series: "ECSS-Q-ST-80C"
seriesOrder: 10
draft: false
---

ECSS 시리즈 마지막. 한국 우주 산업의 *ECSS 도입과 진화*를 본다. *1990년대 ESA 의존*에서 *2024 자체 capability*까지, *2030+ 비전*까지. 이 장은 *KARI·한화·정부 R&D·신생 우주 스타트업*의 적용 사례 종합 + *시리즈 마무리*.

## 한국 우주 산업 — Timeline

```
1989: 한국항공우주연구원 (KARI) 설립

1990s — 초창기 (해외 의존)
  1992: KITSAT-1 (소형 실험위성, 영국 SSTL 협력)
  1996: 다목적실용위성 사업 시작
  1999: KOMPSAT-1 발사 (미국 TRW 협력)

2000s — 협력·학습기
  2006: KOMPSAT-2 (Astrium Germany 협력)
  2008: 첫 한국 우주인 (소유즈 탑승)
  2009: 나로호 1차 발사 (실패)
  2010: 천리안-1 발사 (Astrium)

2010s — 자체 capability 구축
  2012: KOMPSAT-3 (자체 광학 위성)
  2013: 나로호 3차 발사 성공
  2015: KOMPSAT-3A
  2018: 천리안-2A
  2020: 천리안-2B

2020s — 자체 발사·운영
  2021: 누리호 1차 발사 (성능 미달)
  2022: 누리호 2차 발사 성공!
  2023: KOMPSAT-6 발사
  2024: 누리호 3차 발사, 4차 예정

2030+ vision
  - 달 탐사 (Artemis 협력)
  - 자체 행성 탐사
  - 우주 인터넷 (한국형 Starlink)
  - 우주 정거장 모듈 (Lunar Gateway 참여)
```

35년 진화. *후발주자에서 중견 우주국*까지.

## KARI — 핵심 기관

### KARI의 역할

```
KARI (Korea Aerospace Research Institute):
  - 1989 설립
  - 정부 출연 연구원 (과기부)
  - 한국 우주 산업의 중심
  
주요 사업:
  - KOMPSAT 다목적실용위성 시리즈
  - 천리안 GEO-KOMPSAT (정지궤도)
  - 누리호 KSLV-II 발사체
  - 차세대 중형위성
  - 항공우주 연구
  
직원 수: ~1,000 명
예산: ~6,000 억원/년 (2024)
```

### KARI ECSS 적용 진화

```
1990s: 표준 적용 미흡
  - KOMPSAT-1: 자체 표준 (TRW 영향)
  - SW process 비공식
  - Documentation 부족

2000s: ESA 학습기
  - KOMPSAT-2/3: Astrium 협력
  - ECSS 첫 노출
  - 자체 표준에 ECSS 일부 반영
  - "ECSS-lite" 적용

2010s: 점진적 ECSS 채택
  - KOMPSAT-3A: ECSS-E-ST-40C 본격
  - 천리안-2: Airbus 협력으로 full ECSS
  - 내부 process 표준화

2020s: 자체 capability
  - KOMPSAT-6: 자체 ECSS process
  - 누리호: ECSS 참고 + 자체 발사체 표준
  - KARI 자체 ISVV team 형성
  
2030+ vision:
  - ECSS Level 4 maturity (organization-wide)
  - 한국 우주 산업 표준 leadership
  - ESA mission ISVV 수출
```

## KOMPSAT — 다목적실용위성 시리즈

### KOMPSAT-1 (1999)

```
Launch: 1999-12-21
Mass: 470 kg
Mission: 광학 6.6m 해상도
Status: 운영 종료 (2008)

SW Process:
  - 미국 TRW (현 Northrop Grumman) 주도
  - 자체 표준 (DOD 영향)
  - ECSS 적용 없음
  
SW Stack:
  - OBC: 1750A processor
  - RTOS: pSOS (Wind River 전신)
  - Language: Ada (TRW 표준)

Heritage:
  - 한국 최초 자체 운영 위성
  - Lessons learned가 후속 mission 기반
```

### KOMPSAT-2 (2006)

```
Launch: 2006-07-28
Mass: 800 kg
Mission: 광학 1m + 4m 다중분광
Status: 운영 중 (2024)

SW Process:
  - Astrium Germany 주도
  - ECSS 첫 노출 (KARI)
  - 자체 표준 + ECSS 일부

SW Stack:
  - OBC: ERC32 (SPARC-based)
  - RTOS: VxWorks
  - Language: C

Outcome:
  - 18+ 년 운영 (예상 5년)
  - ECSS process의 가치 입증
  - KARI 자체 expertise 시작
```

### KOMPSAT-3 (2012)

```
Launch: 2012-05-18
Mass: 980 kg
Mission: 광학 0.7m 해상도
Status: 운영 중

SW Process:
  - KARI 주도 (Astrium support)
  - ECSS-E-ST-40C 본격 적용
  - Internal V&V 확대

SW Stack:
  - OBC: LEON-2 (SPARC-based, ESA design)
  - RTOS: RTEMS
  - Language: C with MISRA

Achievements:
  - 한국 첫 1m 미만 광학 위성
  - 자체 ECSS process 첫 적용
  - Independent V&V 일부 자체 수행
```

### KOMPSAT-3A (2015)

```
Launch: 2015-03-26
Mass: 1,100 kg
Mission: 광학 + 적외선 (열적외선)
Status: 운영 중

SW Process:
  - KARI 주도, less external dependency
  - Full ECSS adoption
  - ISVV: Astrium subcontract

SW Stack:
  - OBC: LEON-3 (SPARC-based, 향상)
  - RTOS: RTEMS 4.10
  - Language: C with MISRA C:2008

Notable:
  - 9년 운영 (continuing)
  - In-orbit changes: ~15회 (모두 성공)
  - Heritage가 KOMPSAT-6에 반영
```

### KOMPSAT-5 (2013)

```
Launch: 2013-08-22
Mass: 1,400 kg
Mission: X-band SAR (Synthetic Aperture Radar)
Status: 운영 중

SW Process:
  - KARI + Thales Alenia Space
  - Full ECSS
  - SAR signal processing 특수 challenge

SW Stack:
  - OBC: 자체 + Thales 제공
  - SAR processor: 자체 + Thales IP
  - Language: C + 일부 VHDL

Lesson: SAR 처리가 다른 미션 SW와 매우 다름
```

### KOMPSAT-6 (2025 예정)

```
Launch: 2025 예정
Mass: ~1,800 kg
Mission: SAR (X-band, 향상)
Status: 개발 중

SW Process:
  - KARI 자체 + Thales 협력
  - ECSS-Q-ST-80C + ECSS-E-ST-40C full
  - ISVV: 외부 (Thales 일부 + KARI internal)

SW Stack:
  - OBC: LEON-4 (advanced SPARC)
  - RTOS: RTEMS 6.1 (latest)
  - Language: C with MISRA C:2012 Amendment 4

Heritage (KOMPSAT-3A에서):
  - AOCS Core: 80% reuse
  - TT&C: 95% reuse
  - 새로 개발: SAR processor (Thales 협력)

Innovation:
  - Higher resolution SAR
  - Real-time onboard processing
  - Power management 향상
```

### KOMPSAT-7A (2027 예정)

```
Launch: 2027 (planned)
Mission: Earth observation + 통신

SW Process:
  - KARI 자체 (full)
  - Possibly subcontract specific modules

Expected:
  - Heritage from KOMPSAT-6
  - Reuse rate ~60%
  - 자체 ISVV 비중 증가
```

### KOMPSAT 계열의 ECSS 진화 — Summary

```
KOMPSAT-1 (1999):   ECSS 미적용
KOMPSAT-2 (2006):   ECSS 부분 (Astrium 의존)
KOMPSAT-3 (2012):   ECSS-E-ST-40C 본격
KOMPSAT-3A (2015):  Full ECSS
KOMPSAT-5 (2013):   Full ECSS + SAR 특수
KOMPSAT-6 (2025):   자체 ECSS process
KOMPSAT-7A (2027):  Mature ECSS adoption
```

15+ 년에 걸친 *학습과 자립*. 한국 우주 SW 표준의 전형.

## 천리안 — GEO-KOMPSAT 시리즈

### 천리안-1 (2010)

```
Mission: 정지궤도 (GEO) 다목적
  - 기상 관측
  - 해양 관측
  - 통신
Mass: 2,460 kg
Operator: KMA (기상청), MOF (해양수산부)

SW Process:
  - Astrium 주도
  - 한국 첫 정지궤도 위성
  - ECSS full

Lesson: GEO mission 특수 challenge
  - 36,000 km 거리 (LEO보다 60배)
  - 통신 지연 (250ms one-way)
  - Long-life (15+ years)
  - Radiation harsh
```

### 천리안-2A / 2B (2018 / 2020)

```
천리안-2A: 기상 관측 (2018-12-04 launch)
천리안-2B: 해양·환경 관측 (2020-02-18 launch)
Mass: 3,500 kg

SW Process:
  - KARI 주도, Airbus DS support
  - Full ECSS-Q-ST-80C + E-ST-40C
  - 자체 ISVV 비중 증가

SW Heritage:
  - 일부 천리안-1에서 reuse
  - 일부 KOMPSAT 시리즈에서 reuse
  - 새 development: GK-2 specific instruments
```

### 천리안-3 (2030 예정)

```
Mission: 차세대 기상·해양·통신
SW: 완전 자체 (KARI + 한화 분담)
ECSS: Full
ISVV: 자체 + 일부 외부
```

## 누리호 — KSLV-II 발사체

발사체 SW는 *Criticality A의 극단*. 짧은 시간 (수분) 동안 *완벽 동작*.

### KSLV-I (나로호) — 협력 경험

```
2009 / 2010 / 2013 발사
- 1단: 러시아 RD-151 엔진 + KARI 기체
- 2단: KARI 자체 고체 모터
- SW: 러시아 + KARI 분담

Lesson:
  - 협력 mission의 SW 책임 분담 어려움
  - 자체 발사체 필요성 확인
```

### KSLV-II (누리호)

```
2021 1차 발사: 위성 분리 실패 (3단 엔진 조기 정지)
2022 2차 발사: 성공!
2023 3차 발사: 성공
2024 4차 발사: 예정

발사체 SW:
  - 100% KARI 자체
  - ECSS 일부 참고 + 자체 발사체 표준
  - Real-time critical (수분 mission)

SW Stack:
  - OBC: 자체 + COTS 일부
  - RTOS: Wind River VxWorks (qualified)
  - Language: C
  - 코딩 표준: MISRA C + 자체

Architecture:
  - Flight Computer (FC)
  - Navigation Computer (NC)
  - Guidance and Control SW
  - Engine Management SW
  - Telemetry SW
  - Fault Detection SW
```

### 누리호 SW Lessons Learned

```
2021 1차 발사 (실패):
  Anomaly: 3단 엔진 산화제 탱크 부력 측정 sensor 단선
  - Sensor fail-safe 작동
  - 그러나 design margin 부족
  - 3단 엔진 조기 정지 → mission fail

Root Cause:
  - Hardware bug + SW 대응 부족
  - SW가 fail-safe로 conservative 대응
  - 비행 envelope 분석 부족

Corrective Action:
  - Sensor redundancy 강화
  - SW에 새 algorithm (sensor 단선 식별)
  - 추가 test cases

2022 2차 발사 (성공):
  - 수정된 SW로 발사
  - 모든 단계 nominal

Lesson:
  - 발사체 SW는 *극단의 critical*
  - 한 sensor fail이 mission 좌우
  - ECSS process가 *완전한 안전 보장 아님*
```

발사체가 *위성보다 더 critical*. *수년 개발 → 수분 운영*.

## 차세대 중형위성

```
사업: 차세대 중형위성 (Compact Advanced Satellite)
   - 500 kg 급
   - 1m 해상도 광학
   - 한국 자체 표준 위성 버스
   - Mass production 가능

Mission Series:
  CAS-1 (2023 발사)
  CAS-2 (2024 예정)
  CAS-3 (2025+)
  ...

SW Process:
  - KARI 자체
  - 표준화된 process (mass production)
  - Heritage reuse 극대화
  - Each mission cycle: 18 months
```

차세대 중형위성이 *한국 우주 SW process의 mature stage*. *반복 가능 효율*.

## 한화 우주 — 산업계 강자

```
한화 에어로스페이스 우주 사업:
  - 발사체 (누리호 후속)
  - 위성 (자체 + KARI 협력)
  - OneWeb 위성 (영국 협력)
  - 우주 인터넷 한국형
  
ECSS 적용:
  - OneWeb 협력으로 ECSS 본격 도입
  - 자체 ISVV team
  - 약 15 명 우주 SW QA

전망 (2030+):
  - 한국 발사체 사업 주도
  - 자체 위성 생산 라인
  - Constellation 위성 ~수백 대
```

## 한화시스템 — 군 + 우주

```
한화시스템:
  - 군 통신 위성
  - 정찰 위성 (425 사업)
  - 우주 통신 IT
  
ECSS + 군 표준:
  - ECSS + DoD 표준 (425 사업)
  - 자체 표준
  
한국 우주 산업의 *군-우주 융합*.
```

## 신생 우주 스타트업

```
페리지 에어로스페이스 (Perigee Aerospace):
  - 2018 설립
  - 발사체 (Blue Whale 시리즈)
  - 2024 첫 발사 (suborbital)
  - 2025+ orbital
  
SW Process:
  - Lean (ECSS lite)
  - DO-178C 일부 참고
  - 자체 표준
  - Team size: 작음

이노스페이스 (Innospace):
  - 2017 설립
  - 하이브리드 엔진 발사체
  - 2023 첫 발사
  
컨텍 (Contec):
  - 지상국 + 통신
  - ECSS-E-ST-70C (Ground Segment) 참고
  
나라스페이스:
  - 위성 (마이크로위성)
  - ECSS lite + custom

루미르 (Lumir):
  - 우주 정찰 위성
  - 자체 표준 + ECSS 부분
  
이외 ~10+ 스타트업
```

신생 회사 = *fast + lean*. 정통 ECSS는 *너무 무거움*. *변형 표준* 또는 *자체 표준*.

## 한국 ECSS 인프라 — 현황

```
한국 우주 SW 산업 인프라 (2024 추정):

Tool Vendors:
  - 자체 우주 SW tool 회사: 거의 없음
  - 해외 tool 재판매 + support: 일부
  - 한국 ECSS tool catalog: 부재

Consulting:
  - 한국항공우주연구원 컨설팅
  - 일부 인디 컨설턴트
  - ECSS 전문 컨설팅 회사: 부재

Training:
  - KARI internal training
  - 학교 (KAIST, KAU, 부경대 등)
  - 산업협회 (KASA) workshop
  - 정식 ECSS certification 프로그램 부재

ISVV:
  - KARI internal QA: ~30
  - 한화 ISVV: ~15
  - 외주: ~30
  - Total: ~75

비교 — 유럽:
  - ESA-approved ISVV 회사 다수
  - 1000+ engineer
  - 30+ 년 mission heritage
```

한국 ECSS 인프라가 *유럽 대비 1/10 수준*. *우주 산업 성장의 큰 도전*.

## 한국 우주 SW Standard — 진화

```
1990s: 자체 표준 (mission별)
  - KOMPSAT-1: TRW influence
  - 비표준화

2000s: ECSS 학습
  - Astrium 협력에서 ECSS 노출
  - 자체 표준 + ECSS 일부

2010s: KARI Standard 통합
  - KARI Quality Manual 작성
  - ECSS-based 자체 표준
  - 모든 KARI mission 통일

2020s: Korean Aerospace Standard
  - 한국항공우주산업표준 (KAS) 개발
  - ECSS + DO-178C 통합 시도
  - 정부 지원 (R&D)

2030+ vision:
  - 한국 우주 표준 ISO 등록
  - 국제 mission에 한국 표준 적용
  - Korean Space Agency (KASA) 출범 (2024 예정)
```

KASA (Korean Space Agency)가 *2024 출범*. 한국 표준 *국제화* 추진.

## ECSS 적용 어려움 — 한국적 특수성

```
도전:
1. 짧은 우주 산업 역사 (35년)
   - 유럽 60+ 년 vs 한국 35년
   - 인력 양성 시간 부족

2. 인프라 부족
   - ECSS tool vendor 부재
   - ISVV 회사 적음
   - Certification 인프라 미성숙

3. Schedule pressure
   - 정부 발주 mission 일정 tight
   - Documentation 부담 vs schedule

4. 인력 부족
   - 우주 SW engineer 수
   - Mid-career mentor 부족

5. Cost
   - ECSS full adoption 비쌈
   - 작은 mission에 부담

6. Customer 인식
   - 정부 customer가 ECSS familiarity 낮음
   - Documentation 가치 평가 부족
```

해결 방향:
- 대학 우주 SW 교육 강화
- 정부 R&D ECSS 인프라 투자
- 해외 협력 mission 참여
- 신생 우주 회사에 lite 표준
- ISVV 회사 양성

## ESA Mission 협력 — 한국 학습 경로

```
KARI의 ESA 협력 history:
  - Astrium협력 (1990s-2010s)
  - Airbus DS 협력 (천리안-2)
  - Thales 협력 (KOMPSAT-5/6)
  - ESA Open Calls 참여

학습 효과:
  - ECSS process 직접 경험
  - 유럽 expert와 협업
  - 자체 expertise 축적

미래 협력:
  - ESA Lunar Gateway 참여 검토
  - 한국 모듈 contribution
  - Mars exploration 협력 가능성
```

## 2030+ 한국 우주 비전

```
정부 vision (2024):
  - 우주 7대 강국
  - 자체 발사체 + 위성 + 운영
  - 우주 산업 매출 6조원 (2032)
  - 우주 일자리 60,000명

KARI 역할:
  - R&D 주도
  - 표준 개발
  - 인력 양성

KASA 역할 (2024 출범):
  - 정책 + 규제
  - 국제 협력
  - 산업 진흥

산업 역할:
  - 한화 (발사체 + 위성)
  - LIG Nex1 (군 + 위성)
  - 신생 회사 (innovation)
```

## 한국형 우주 SW Standard 미래

```
가능한 진화:

Option A: 한국 자체 표준
  - K-ECSS or K-DO-178C
  - 한국 우주 산업 특수성 반영
  - 국제 인정은 별도 노력 필요

Option B: ECSS + DO-178C 통합 적용
  - 두 표준의 장점 결합
  - 국제 호환성 유지
  - 가장 현실적

Option C: ISO 26262 like 표준
  - 자동차 표준 → 우주 적용
  - 한국 자동차 산업 leverage
  - 새로운 가능성

현재 trend: Option B (실용적)
```

## 시리즈 마무리 — ECSS-Q-ST-80C를 마치며

이 시리즈가 *국내 우주 SW 엔지니어와 학생*에게 도움이 됐기를 바랍니다. ECSS는 *유럽 우주 표준*이지만, 한국 우주 산업이 *국제 협력과 자체 mission*에 모두 활용. *KARI, 한화, 신생 회사*가 각자의 적용 단계에서 진화 중.

### 시리즈 10장 정리

```
Ch 1   : ECSS 표준 체계 + KARI 적용
Ch 2   : SW Process Assurance (SPA)
Ch 3   : SW Product Properties (metrics)
Ch 4   : Configuration Management
Ch 5   : Non-Conformance Control + RCA
Ch 6   : Procurement (COTS/OSS/Heritage)
Ch 7   : ISVV — Independent V&V
Ch 8   : ECSS-E-ST-40C — Engineering V-model
Ch 9   : Tool Qualification (Annex Q)
Ch 10  : 한국 적용 사례 + 마무리
```

### Key Takeaways

```
1. ECSS는 *유럽 우주 SW 표준* — 무료, 광범위
2. ECSS-Q-ST-80C + ECSS-E-ST-40C 함께 사용 (Q + E)
3. *Tailoring 가능* — 작은 mission도 적용
4. *Heritage reuse* 강조 — ESA SAVOIR catalog
5. *ISVV* (외부 V&V)가 차별점
6. DO-178C와 *상호 보완* (자동차 ISO 26262와도)
7. 한국 적용: KARI 30+년, 자체 capability 성숙
8. *작은 회사*는 ECSS lite 또는 자체 표준
```

### 다음 시리즈 추천

```
1. DO-178C (12 챕터) — 항공 SW 인증
2. JSF C++ (12 챕터) — F-35 코딩 표준
3. JPL Power of 10 (1 챕터) — NASA mission critical
4. MISRA C/C++ — 자동차 + 항공 공통
5. NASA NPR 7150.2 — NASA SW Engineering Requirements
6. CCSDS — Consultative Committee for Space Data Systems
```

### 자료 — 참고문헌

```
1. ECSS-Q-ST-80C Rev.1 (2014)
   https://ecss.nl/ — free download

2. ECSS-E-ST-40C (2009)

3. ECSS 전체 catalog
   https://ecss.nl/standards/active-standards/

4. ESA SAVOIR
   https://savoir.estec.esa.int/

5. KARI 공식
   https://www.kari.re.kr/

6. KASA (Korean Space Agency)
   https://www.kasa.go.kr/

7. 한국 우주 산업 백서
   - 과기부 발간
   - 매년 업데이트

8. ESA Educational
   https://esero.org/
```

질문·피드백은 *블로그 댓글* 또는 *GitHub issue*로.

## 정리

- 한국 우주 산업 35년 진화 — 협력에서 자립으로.
- KARI가 *KOMPSAT 시리즈*로 ECSS 적용 성숙.
- *KOMPSAT-1 (1999) → 7A (2027)*: ECSS 도입 진화.
- 천리안 GEO 시리즈도 ECSS 본격 적용.
- 누리호 발사체는 *Criticality A의 극단* — 자체 표준 + ECSS 참고.
- 한화 + 신생 우주 회사가 *산업 다양성* 형성.
- *한국 ECSS 인프라*는 유럽 대비 1/10 — 큰 도전.
- 2030+ 비전: 7대 우주 강국, 자체 표준 국제화.

## ECSS 시리즈를 마치며

ECSS는 *유럽 우주의 정수*이지만 *한국 우주 산업에도 필수*. 이 시리즈가 *현장 적용*과 *학습*에 도움이 됐기를. 한국 우주가 *2030+ 7대 강국*에 도달하려면 *표준 인프라가 함께 성숙*해야 합니다.

다음 시리즈는 **JSF C++ (F-35 코딩 표준)**. 비슷한 *aerospace coding standard*의 *항공 변종*입니다.

## 관련 항목

- [Ch 9 — Tool Qualification](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter09-tool-qualification)
- [DO-178C Ch 1 — 항공 SW 인증](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [KARI 공식](https://www.kari.re.kr/)
- [KASA — Korean Space Agency](https://www.kasa.go.kr/)
- [한국항공우주산업진흥회 (KAIA)](https://www.aerospace.or.kr/)
