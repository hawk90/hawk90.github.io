---
title: "Ch 6: Sensors — IMU·GPS·Star tracker·Pressure"
date: 2026-05-18T06:00:00
description: "Avionics 센서 — 관성·항법·환경 측정의 원리와 인터페이스."
series: "Digital Avionics Handbook"
seriesOrder: 6
tags: [avionics, sensor, imu, gps, star-tracker]
draft: true
---

## 한 줄 요약

> **"Sensor = raw measurement → engineering unit"** — bias·drift·noise·fusion이 본질.

## Avionics Sensor 분류

**관성 (Inertial):**
- Accelerometer (linear acceleration)
- Gyroscope (angular rate)
- Magnetometer (Earth magnetic field)
- IMU (Inertial Measurement Unit) — 통합 package

**항법 (Navigation):**
- GPS·GNSS receiver (position)
- Star tracker (orientation)
- Earth horizon sensor
- Sun sensor (rough orientation)
- Radio altimeter

**대기·환경 (Air data):**
- Static pressure (altitude)
- Dynamic pressure (airspeed)
- Temperature
- Angle of attack (AOA)
- Sideslip angle (β)

**기타:**
- Engine sensors (RPM·temperature·pressure)
- Fuel level·flow
- Strain gauge
- Vibration·shock
- Radiation·dose

각 sensor — *physical phenomenon → digital*.

## IMU 구성

**6-DOF IMU (Inertial Measurement Unit):**

3-axis accelerometer:
- Measure: linear acceleration (m/s²)
- Earth gravity 포함

3-axis gyroscope:
- Measure: angular rate (rad/s 또는 deg/s)

**9-DOF IMU:** + 3-axis magnetometer
- Measure: Earth magnetic field (Gauss)

**Output rate:**
- 1~10 kHz typical
- Avionics — 100~1000 Hz

**Grade:**
- Tactical (low-cost)
- Industrial
- Tactical+
- Strategic
- Navigation grade

LV·항공기 — *Navigation 또는 Strategic grade*. 정확도 1~3 NM/hr.

## Accelerometer — 원리

**원리:**
- Proof mass + spring·capacitor
- Acceleration → force → displacement
- Capacitance change → voltage

**Types:**
- MEMS — 작고 저렴, 정확도 mid (Bosch BMI088, Analog Devices ADXL355)
- Pendulous force-rebalance — high-end (Honeywell QA series)
- Quartz vibrating beam — strategic (Honeywell QFLEX)

**Specs:**
- Bias stability — μg
- Scale factor stability — ppm
- Noise — μg/√Hz
- Temperature compensation

**Output:**
- Analog → ADC → digital
- Or digital SPI/I2C

Accelerometer = *3축 force* 측정. Bias = 정지 시 출력.

## Gyroscope — 원리

**Types:**

**MEMS:**
- Vibrating mass (Coriolis effect)
- Low cost, 1~100°/hr drift
- Bosch, Analog Devices, STMicro

**FOG (Fiber-Optic Gyro):**
- Light propagation in coil
- Sagnac effect
- Bias < 0.01°/hr (navigation grade)
- Northrop Grumman, KVH

**RLG (Ring Laser Gyro):**
- Laser in cavity
- Sagnac
- Bias < 0.001°/hr (strategic)
- Honeywell GG1320

**HRG (Hemispherical Resonator Gyro):**
- Vibrating quartz hemisphere
- Bias < 0.001°/hr, very stable
- Northrop Grumman SCALAR

**LV·우주 trend:**
- FOG·HRG (예: KSLV-II)
- RLG (legacy aircraft)
- MEMS (UAV, small sat, augment)

각 gyro — *grade·cost·application*.

## IMU Error Model

**Measurement model:**

$$\omega_{\text{meas}} = \omega_{\text{true}} + \text{bias} + (\text{scale factor}) \cdot \omega + \text{noise} + \cdots$$

**주요 error:**

**Bias (drift):**
- Static — stable offset
- Dynamic — slow change over time·temp
- Random walk — sqrt(time) drift

**Scale Factor:**
- Output/input ratio 오차
- Temperature dependence

**Misalignment:** Sensor axes vs body axes 각도 오차.

**Noise:**
- ARW (Angle Random Walk) — gyro noise
- VRW (Velocity Random Walk) — accel noise
- Bias instability — flicker

**Cross-axis sensitivity:** X gyro가 Y rotation에 반응.

각 error — *calibration + filter*.

IMU = *imperfect*. Sensor fusion으로 완화.

## GPS·GNSS Receiver

**GNSS 시스템:**

| 시스템 | 국가 | 위성 수 |
|--------|------|---------|
| GPS | US | 31 |
| GLONASS | Russia | 24 |
| Galileo | EU | 26 |
| BeiDou | China | 35+ |
| QZSS | Japan | regional |
| NavIC | India | regional |

**Bands:**
- L1 — 1575.42 MHz (civil C/A code)
- L2 — 1227.60 MHz (P(Y) code, dual freq)
- L5 — 1176.45 MHz (modern, safety)

**Output:**
- Position (lat·lon·alt)
- Velocity (3D)
- Time (UTC + offset)
- Number of satellites
- HDOP·VDOP·PDOP (accuracy)
- Fix status (3D·2D·DGPS·RTK)

**Update rate:** 1·5·10·20 Hz typical.

**Accuracy:**
- Standalone C/A — 5~10 m
- WAAS·EGNOS — 1~3 m
- DGPS — sub-meter
- RTK — cm
- PPP — cm (long convergence)

GPS = position + velocity + *exact time*.

## GPS Receiver — Avionics

**TSO·인증 GPS:**
- TSO-C129 — non-precision approach
- TSO-C145·146 — WAAS

**Aerospace receiver:**
- Garmin GTN·GNS
- Honeywell KGS·KLN
- Rockwell Collins
- Trimble (military)

**LV·우주:**
- NovAtel OEM7·OEM6
- Septentrio AsteRx
- Spirent (simulator)
- CSAC + GPS (high accuracy time)

**Output protocol:**
- NMEA-0183 (standard, ASCII)
- RTCM (correction)
- UBX (u-blox, binary)
- RXM (raw measurements)

**Anti-jamming·spoofing:**
- Military M-code
- CRPA (Controlled Reception Pattern Antenna)
- Inertial integration (resist jamming)

GPS — *모든 LV·aircraft 표준*. 단 jamming 취약.

## Pressure·Air Data

**Pitot-static system:**
- Pitot tube — dynamic pressure (airspeed)
- Static port — static pressure (altitude)
- Difference → IAS (Indicated Airspeed)

**Static pressure → altitude:**
- Barometric formula
- Sea level reference (QNH) 또는 standard (29.92 inHg)

**Pressure sensor:**
- MEMS — 일반 항공기
- Vibrating cylinder — high-end
- Differential pressure transducer

**LV·우주:**
- Cabin pressure (위성 cargo, crew capsule)
- Tank pressure (LOX·LH2·hypergolic)
- Engine combustion chamber pressure

**Aircraft:**
- Air Data Computer (ADC)
- Multiple redundant pitot
- Heated pitot (icing 방지)

**Famous accident:** AF447 (2009) — pitot icing → loss of airspeed. 후속 — heated pitot 강화.

Air data — *항공기 핵심*. LV는 일부만.

## Star Tracker — 위성·우주선

**Star Tracker:**
- CCD·CMOS imager
- Hot pixel·shutter
- Star pattern recognition
- Star catalog comparison
- Inertial attitude (quaternion)

**Sensitivity:**
- Magnitude 5~7 (보통)
- Field of view 10~30°

**Accuracy:** 1~10 arc-second (1σ).

**Update rate:** 1~10 Hz (slow).

**Combined with:**
- Gyro (high rate, drift)
- Tight integration
- Star tracker가 *bias correct*

**Use case:**
- Satellite attitude
- Spacecraft (Lunar·Mars)
- Deep space probe
- Not for aircraft (cloud·daytime sky)

**Vendors:**
- Sodern (Airbus)
- Jena-Optronik (Germany)
- Ball Aerospace
- Terma
- Sinclair Interplanetary
- KARI 자체 (KOMPSAT 등)

Star tracker — *우주 attitude의 표준*. Aircraft 미사용.

## Sun Sensor

**Sun Sensor:**
- Photodiode array
- Coarse (cosine sensor) — wide angle, 정확도 ~1°
- Fine (slit-based) — narrow angle, 0.01°

**용도 (정밀도):**
- Coarse — initial attitude·safe mode
- Fine — augment star tracker

**용도 (대상):**
- 위성·우주선
- Aircraft 미사용 (sun이 visible 가정 어려움)

저렴·신뢰성 — *safe-mode 표준*.

## Magnetometer

**Magnetometer:** Earth magnetic field 측정.

**Types:**
- Fluxgate — 정확, 큰
- Hall effect — small, less accurate
- MEMS — IMU 통합

**Use:**
- Heading reference (compass)
- Earth orientation (위성·LEO)
- Aircraft — backup

**Issue:**
- Hard-iron / soft-iron — 자기물질 영향
- Calibration 필수

LEO 위성 — magnetic field 약, 사용 가능. GEO·deep space — 너무 약 (안 씀).

지구 자기 — *LEO 위성*에 유용. Aircraft 보조.

## Sensor Fusion — Kalman Filter

**Kalman Filter:**
- IMU + GPS + magnetometer + star tracker fusion
- Optimal under Gaussian noise

**Algorithm:**
- Predict — IMU integrate (high rate)
- Update — GPS·magnetic·star (low rate)
- Covariance propagation

**Variants:**
- EKF (Extended) — nonlinear
- UKF (Unscented) — nonlinear 고차
- Particle filter — non-Gaussian

**Output:**
- Position·velocity·attitude·biases
- Covariance (uncertainty)

**Typical structure:**
- IMU at 200·400 Hz → predict
- GPS at 10 Hz → update
- Star at 1 Hz → update

**효과:**
- Long-term — GPS·star 정확도
- Short-term — IMU smooth·high-rate
- Bias estimation — drift 보정

Kalman = *avionics 표준*. 모든 GNC.

## Sensor Interface

**Common interfaces:**

| Interface | 용도 | Bandwidth |
|-----------|------|-----------|
| SPI | IMU, magnetometer, pressure | 10~100 Mbps |
| I2C | Slow sensors (temp·humidity) | 100~400 kbps |
| UART | GPS (NMEA·UBX), Star tracker (some) | Up to 1 Mbps |
| CAN·CANaerospace | Engine sensors | Up to 1 Mbps |
| 1553·SpaceWire·AFDX | Subsystem-level (LRU), sensor module ↔ FCC | — |
| Analog | Some pressure·temperature (ADC required) | — |
| Discrete | Switch·status (binary) | — |

**Time sync:**
- PPS (Pulse Per Second) — GPS·external
- PTP (IEEE 1588) — AFDX/Ethernet
- Highly precise

Sensor interface — *bandwidth + sync* 결정.

## Sensor Calibration

**Calibration procedure:**

1. **Bench calibration (factory):**
   - Controlled environment
   - Reference (rate table, gravity, magnetic shield)
   - Coefficient store (NVRAM)

2. **Vehicle-level alignment:**
   - IMU vs body frame
   - Misalignment matrix

3. **In-flight calibration:**
   - Kalman filter estimate bias
   - Adaptive coefficient

4. **Periodic recalibration:**
   - Lifetime drift
   - Service maintenance

**Example coefficients:**
- Gyro bias (3) + scale factor (3) + misalign (6)
- Accel bias (3) + scale (3) + misalign (6)
- Mag hard-iron (3) + soft-iron (6)
- 33 coefficients per IMU

각 IMU — *unique calibration*. Production·shipping data.

## Sensor Data Format

**Engineering unit conversion:**

ADC → physical:

$$V = \frac{\text{ADC}}{\text{ADC}_{\text{max}}} \cdot V_{\text{ref}}$$

**Accelerometer:**

$$a = \frac{(V - V_{\text{offset}}) \cdot \text{scale factor}}{\text{sensitivity}}$$

Unit: m/s².

**Gyro:**

$$\omega = (V - V_{\text{offset}}) \cdot \text{scale factor}$$

Unit: rad/s 또는 deg/s.

**Pressure:** $P \rightarrow$ altitude (barometric).

**Body-frame:** Sensor → body misalignment matrix.

$$\vec{v}_{\text{body}} = R_{\text{sensor} \to \text{body}} \cdot \vec{v}_{\text{sensor}}$$

**Time tagging:**
- Sample timestamp (sync to system clock)
- Latency compensation

Engineering unit — *body frame + 시간*. GNC input.

## 인증·HW 요구

**DO-160 environmental qualification:**
- Temperature, altitude, humidity
- Vibration, shock
- Power input
- EMI/EMC
- Lightning
- Icing
- Salt spray, sand·dust

**DO-254 (HW airworthiness):** Sensor electronics — DO-254 dependent.

**LV qualification:**
- Vibration profile (typical 20 g sine·random)
- Shock (1000+ g)
- Thermal cycle (-40 ~ +85°C)
- Acoustic noise (140+ dB)
- Pyroshock
- Vacuum (위성, 100% relative)

Sensor — *극한 환경 통과*. Aerospace 핵심.

## 한국 Sensor 산업

**국산 IMU·gyro:**
- ADD (국방과학연구소) — FOG·RLG 자체
- Hanwha Aerospace — IMU 자체 + 일부 외산
- LIG넥스원 — IMU 미사일용
- KARI — KSLV-II IMU 자체

**국산 GPS receiver:**
- KARI·ETRI — 위성용 자체
- Defense 위주

**국산 star tracker:**
- KARI — KOMPSAT·KPLO 자체

**민간:**
- Nara MicroSystems
- 자율주행·드론 — MEMS IMU

**수입:**
- Honeywell FOG·RLG (high-end)
- Sodern star tracker
- Northrop Grumman LN-200·LN-100

한국 — *국산 + 수입* 혼합. Defense·우주 자체화 진행.

## 자주 하는 실수

> ⚠️ Sensor 1개 — single fail point

1 IMU + 1 GPS → 한 sensor fail = mission fail.

→ Redundant (보통 dual·triple).

> ⚠️ Calibration overlook

"Datasheet spec만 보고 사용"하면 real bias가 커서 navigation drift가 폭증한다.

→ Bench calibration + alignment.

> ⚠️ Time sync 누락

IMU + GPS가 다른 clock을 쓰면 fusion error가 생긴다.

→ PPS·PTP 동기.

> ⚠️ Vibration profile 무시

Lab test pass → flight vibration에서 sensor noise·bias가 변할 수 있다.

→ Real vibration profile 시험.

## 정리

- IMU = *accel + gyro + (mag)*, bias·drift·noise 모델.
- GPS·GNSS — 위치·속도·*정확 시간*.
- Pressure·air data — aircraft 핵심.
- Star tracker — 위성 attitude 표준.
- Sensor fusion — *Kalman filter*.
- Interface — SPI·I2C·UART·CAN·1553·SpaceWire·AFDX.
- DO-160 + LV qualification — 극한 환경.
- 한국 — *국산 + 수입* 혼합, 자체화 진행.

다음 편은 **Actuators — TVC·RCS·서보**.

## 관련 항목

- [Ch 5: Buses](/blog/embedded/avionics/digital-avionics-handbook/chapter05-buses)
- [Ch 7: Actuators](/blog/embedded/avionics/digital-avionics-handbook/chapter07-actuators)
- [Ch 8: FMS](/blog/embedded/avionics/digital-avionics-handbook/chapter08-fms)
- [Launch Vehicle Flight SW Ch 4: Control Signal](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter04-control-and-signal)
