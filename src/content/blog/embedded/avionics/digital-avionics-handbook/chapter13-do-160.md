---
title: "Ch 13: Environmental Qualification (DO-160 개관)"
date: 2026-05-18T13:00:00
description: "RTCA DO-160G — 진동·충격·EMI·고도·온도 시험 표준의 한 장 정리."
series: "Digital Avionics Handbook"
seriesOrder: 13
tags: [avionics, do-160, environmental, qualification]
draft: true
---

## 한 줄 요약

> **"DO-160 = 환경 인증 표준"** — *진동·온도·EMI·고도·습도* 26 영역 시험.

## DO-160 위치

```text
표준명:
  RTCA DO-160G
  Environmental Conditions and Test Procedures 
  for Airborne Equipment
  
EUROCAE 동등:
  ED-14G
  
역사:
  DO-160 (1975)
  DO-160G (current, 2010)
  
대상:
  Airborne equipment — LRU·module
  Aircraft (FAA·EASA 인증)
  
관계:
  DO-178C — SW
  DO-254 — HW airworthiness
  DO-160G — 환경 시험
  
즉 — *DO-178C·DO-254 인증한 LRU가 DO-160 환경 시험* 통과 필요
```

DO-160G — *26개 section의 시험 표준*.

## DO-160G 26 Section

```text
Section 1·2: General·Definitions

3: Temperature·Altitude
4: Temperature Variation
5: Humidity
6: Operational Shocks·Crash Safety
7: Vibration
8: Explosion Atmosphere
9: Waterproofness
10: Fluids Susceptibility
11: Sand·Dust
12: Fungus Resistance
13: Salt Spray·Salt Fog
14: Magnetic Effect
15: Power Input
16: Voltage Spike
17: Audio Frequency Conducted Susceptibility
18: Induced Signal Susceptibility
19: Radio Frequency Susceptibility
20: Radio Frequency Emission
21: Lightning Induced Transient Susceptibility
22: Lightning Direct Effects
23: Icing
24: ESD (Electrostatic Discharge)
25: Fire·Flammability
26: Tin Whisker
```

각 — *category 등급 (A, B, ..., X)*.

## Category 시스템

```text
DO-160 category:
  A — most severe (typically external)
  B — less severe
  ...
  X — not applicable·waived
  
각 section별 별도 category
  
Equipment label 예:
  Operating temperature: Cat. A2 → -55 ~ +85°C
  Altitude: Cat. F1 → up to 70,000 ft
  Vibration: Cat. R → severe (engine mount)
  RF: Cat. R → 80 MHz to 1 GHz at 100 V/m
  
Combined label:
  "DO-160G section 4 Cat A2, section 7 Cat R"
  Equipment qualification document에 명시
```

각 LRU — *operating environment*에 맞는 category.

## Section 4·5 — Temperature·Altitude·Humidity

```text
Temperature·Altitude (section 3·4):
  Operating temp:
    Cat A1: -15 ~ +55°C (cabin)
    Cat A2: -55 ~ +85°C (avionics bay)
    Cat A3: -55 ~ +125°C (engine compartment)
    Cat F: 더 극한
  
  Storage temp:
    -55 ~ +85°C typical
  
  Altitude (operating):
    Cat F1: up to 70,000 ft
    Cat F2: 35,000 ft
    Cat F3: 25,000 ft
  
  Decompression: altitude rapid change
  
Humidity (section 5):
  Cat A — 95% RH, 48 hour cycle
  Cat B — 95% RH, 240 hour cycle
  Cat C — 95% RH, more extreme

시험:
  Climate chamber
  Multiple cycle (cold·hot·humid)
  Power on·off cycle
```

LRU 위치 (cabin·avionics bay·engine bay) — *category 결정*.

## Section 7·8 — Vibration·Shock

```text
Vibration (section 7):
  Cat S — standard fixed-wing
  Cat R — engine vibration (severe)
  Cat U — random·sine combined
  Cat T — turboprop
  
  Profile:
    Frequency 5 ~ 2000 Hz
    Amplitude g (peak·RMS)
    Duration hours
    
  Test:
    Shaker table
    Random + sine sweep
    
Operational Shock (section 6):
  Cat A — pulse 6 g, 11 ms
  Cat B — pulse 11 g, 11 ms
  Cat S — landing shock
  
  Crash Safety:
    20 g (passenger·crew safety)
    Test shock 50 g
  
Explosion Atmosphere (section 8):
  Equipment in flammable atmosphere
  Spark·ignition source 회피
  Engine compartment·fuel tank
```

LV — 더 극한 (50~200 g random vibration). 별도 표준.

## Section 15·16 — Power Input·Spike

```text
Power Input (section 15):
  DC power:
    Cat A — 28 VDC (aircraft)
    Cat B — abnormal (over·under voltage)
    Cat C — emergency power
  
  AC power:
    400 Hz, 115 VAC (aircraft)
    Cat A — normal
  
Voltage Spike (section 16):
  Source — switching, lightning, inductive
  Test pulse — ±600 V transient
  Damping factor
  
Voltage variation:
  ±5% normal
  Surge·sag transient
  Brown-out test
  
Test:
  Programmable power supply
  Real load conditions
```

Power qualification — *robust electrical design*.

## Section 19·20 — RF·EMI

```text
Conducted Susceptibility (section 18):
  Power line이 다른 신호 receive
  
Radio Frequency Susceptibility (section 19):
  External RF field (transmitter·radar)
  
  Cat R: 100 V/m, 80 MHz ~ 1 GHz (severe)
  Cat T: lower exposure
  
  Test:
    Anechoic chamber
    Antenna + amplifier
    Modulated CW
  
Radio Frequency Emission (section 20):
  Equipment 자체가 *방사 노이즈*
  
  Limit — frequency 별 dBμV/m
  
  Test:
    EMI receiver
    Antenna calibrated
    Open area test site

HIRF (High Intensity Radiated Fields):
  Most severe RF
  300 V/m typical
  Section 19 + DO-160G specific
  
Aircraft proximity to radar·radio tower.
```

EMI — *컴플라이언스의 큰 어려움*. Shield·filter·layout 필수.

## Section 22 — Lightning

```text
Lightning Direct Effects:
  Aircraft 직접 lightning strike
  External equipment 영향
  
Lightning Induced Transient (section 21):
  Cable 통한 induced 전류
  
  Levels:
    Level 1 — moderate
    Level 4 — severe
  
  Test waveform:
    Single stroke
    Multiple stroke
    Multiple burst
    
  Test pulse:
    voltage 6 kV
    current 3 kA
    Damped sinusoid
    
  Equipment — survive·function continue

Composite aircraft (B787·A350):
  Aluminum shielding ↓
  Lightning protection — *embedded mesh*
  Equipment 부담 ↑
```

Lightning — *합성 항공기에 더 중요*.

## Section 23·24 — Icing·ESD

```text
Icing (section 23):
  External equipment (antenna·pitot)
  Ice formation·shedding
  Heater test
  
  Sensors:
    Heated pitot
    Heated AOA
  
ESD (section 24):
  Static discharge
  Human handling·equipment installation
  
  Test:
    8 kV contact
    15 kV air
    Multiple discharge

각 — *protection circuit + mechanical*.
```

## LV·우주 환경 — DO-160 부족

```text
DO-160 — aircraft 표준
LV·우주 — 더 극한 환경:
  
LV environment:
  Vibration (random + sine) — 20~30 g RMS
  Acoustic — 140~160 dB (engine·rocket)
  Pyroshock — 1000~10,000 g
  Pressure — full vacuum
  Aerodynamic heating — Max-Q
  G-load — 4~6 g

위성·우주선:
  Thermal cycle (vacuum)
  Solar radiation
  Atomic oxygen (LEO)
  Micrometeoroid·debris
  Cosmic ray (SEE)
  
표준:
  MIL-STD-810 (US military environmental)
  NASA-STD-7001 (acoustic·shock·etc.)
  GEVS-SE (Goddard Env Verification Spec)
  ECSS-E-ST-10-03C (ESA testing)
  GSFC-STD-7000 (NASA Goddard)
```

LV — DO-160 *기준 부족*. 자체 표준.

## MIL-STD-810 — 군용 표준

```text
MIL-STD-810H (2019):
  Military environmental test
  
유사 DO-160 + 추가:
  -  Method 514 — vibration
  -  Method 516 — shock
  -  Method 519 — gunfire shock
  -  Method 520 — temp+humidity+vibration
  -  Method 521 — icing
  -  Method 528 — mechanical vibration
  -  ... 30+ method
  
LV·missile:
  MIL-STD-810 + 자체 supplement
  Korean 방사청 시험 — MIL-STD-810 채택
  
Aircraft military:
  DO-160 + MIL-STD-810
  Combined test campaign
```

군 — *MIL-STD-810 + 자체*. 자체 supplement.

## NASA·ESA 환경 표준

```text
NASA-STD-7001:
  Payload vibroacoustic
  Random·sine·shock
  
NASA-STD-7002:
  Payload qualification
  
NASA-STD-5001:
  Strength·life
  
GEVS-SE (Goddard):
  Spacecraft environmental verification
  
NASA-STD-6016:
  Tin whisker mitigation
  
ECSS series (ESA):
  ECSS-E-ST-10-03C — Testing
  ECSS-E-ST-32 — Structural
  ECSS-Q-ST-70-08 — Manual soldering
  ECSS-Q-ST-30 — Dependability
  
KARI 적용:
  KOMPSAT — ECSS 일부
  KPLO 다누리 — NASA + ECSS
  KSLV-II — 자체 + MIL-STD
```

우주 — *NASA + ESA + 자체*.

## Qualification Campaign

```text
일반 qualification flow:

1. Pre-test:
   Equipment baseline test (function·perf)
   Test plan·procedure
   Fixture·instrumentation
   
2. Sequential test:
   각 environment 별 sequence
   Re-test baseline (degradation check)
   
3. Combined test:
   Temp+vibration combined
   Worst-case stack
   
4. Burn-in:
   Long duration (수백 hr)
   Reliability assess

5. Post-test:
   Final baseline
   Disassembly·inspection
   
Duration:
  LRU full qualification — 6~12개월
  Cost — $500K~$5M per LRU
```

Qual — *큰 비용 + 시간*. Project schedule 결정.

## Test 실시 — Equipment 사례

```text
Test Equipment:

Environmental chamber:
  Thermotron (Espec·CSZ·Thermal Product)
  -70°C ~ +180°C
  Humidity ramp
  Altitude

Vibration shaker:
  Unholtz-Dickie (UD)
  MB Dynamics
  Brüel & Kjær
  Dynamic Test Solutions

EMI test chamber:
  Anechoic chamber
  TEM·GTEM cell
  Reverberation chamber
  Open area test site (OATS)

Lightning test:
  Pulse generator (수 MV)
  Capacitor bank
  
Cost:
  Shaker bench — $5M+
  EMI chamber — $5M+
  Combined facility — $50M+

한국 시설:
  KARI Naro·Daejeon
  KAI Sacheon
  ETRI EMC center
  국방기술품질원 (DTAQ)
```

Qual facility — *국가급 시설*. 한국 능력 확대.

## Korean Aerospace Qual

```text
KARI:
  EMC chamber (KSLV·KOMPSAT)
  Vibration·shock facility
  Vacuum thermal chamber
  
KAI:
  KF-21·FA-50 환경 시험
  Sacheon facility
  
DTAQ (방산):
  무기체계 환경 시험
  MIL-STD-810 + 방사청 표준
  
한화·LIG:
  자체 facility 일부
  외부 위탁
  
중소·중견:
  외부 위탁 위주

자격:
  KOLAS (한국인정기구) 인증 시험소
  KS·ISO·IEC 표준
```

한국 — *국방·우주·민간 qual capability* 확보 진행.

## SW 환경 영향

```text
DO-160 — HW + 환경
하지만 SW에 *간접 영향*:

Temperature:
  Cache·memory timing
  Clock drift
  Watchdog calibration
  Real-time guarantee
  
Vibration:
  Connector·flash memory
  Bit flip
  Mechanical actuator
  
EMI:
  Bus errors (1553·CAN·Ethernet)
  Sensor noise
  
Radiation:
  SEU·SEFI
  ECC·CRC·voter
  
SW 대응:
  Robustness test (extended temp·voltage)
  Filter·debounce
  Self-test (BIT)
  Health monitor
```

SW — *환경 변화에 robust*. BIT·HM 중요.

## DO-160 vs DO-178C·DO-254 분업

```text
LRU certification flow:

HW design → DO-254 (airworthiness)
            → DO-160 (environmental)
            
SW design → DO-178C (airworthiness)

System integration → ARP-4754A·4761

각 trace:
  Requirement → design → implementation → test → 인증

각 standard — *separate evidence stream*.
각 deliverable — FAA·EASA 제출.

Equipment manufacturer 책임:
  - HW airworthiness (DO-254)
  - 환경 qualification (DO-160)
  - SW airworthiness (DO-178C)
  
Aircraft integrator:
  - System safety (ARP-4754A·4761)
  - Aircraft-level cert
```

각 표준 — *명확 분업*.

## 자주 하는 실수

> ⚠️ Category 잘못 선택

```text
"Cat A1 (cabin) 선택" → 실제 avionics bay 설치
→ Temperature·EMI 부족
→ In-service fail
```

→ 정확 installation 위치 → category.

> ⚠️ Sequential test order 무시

```text
Test order — DO-160 권고
→ "편한 순서" 임의 선택
→ Cumulative damage 누락
```

→ Standard sequence 준수.

> ⚠️ LV·우주에 DO-160만 적용

```text
"DO-160 통과 = 우주 OK"
→ Vacuum·acoustic·pyroshock 부재
```

→ NASA·ESA·MIL 표준 추가.

> ⚠️ Re-qualification 무시

```text
Component change → re-qual 불요 가정
→ Lot variation·new failure mode
```

→ Delta analysis + selective re-qual.

## 정리

- **DO-160G** — 항공기 환경 시험 표준 (26 sections).
- **Category** 시스템 — 각 LRU operating environment 매핑.
- **Temperature·vibration·EMI·lightning** — 주요 영역.
- **LV·우주** — DO-160 부족, *MIL-STD-810·NASA·ECSS* 추가.
- **DO-178C/254/160** 분업 — SW·HW·환경.
- 한국 — *KARI·KAI·DTAQ qual capability* 확대.
- SW — 환경 변화에 *robust + BIT*.

다음 편은 **Future Trends — open architecture·SDR·AI**.

## 관련 항목

- [Ch 12: V&V](/blog/embedded/avionics/digital-avionics-handbook/chapter12-vv)
- [Ch 14: Future Trends](/blog/embedded/avionics/digital-avionics-handbook/chapter14-future-trends)
- [Developing Safety-Critical SW Ch 14: Certification Artifacts](/blog/embedded/avionics/developing-safety-critical/chapter14-certification-artifacts)
