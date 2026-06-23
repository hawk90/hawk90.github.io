---
title: "Ch 7: Actuators — TVC·RCS·서보"
date: 2026-05-18T07:00:00
description: "추진·자세 제어 액추에이터 — TVC gimbal·RCS thruster·전기 서보."
series: "Digital Avionics Handbook"
seriesOrder: 7
tags: [avionics, actuator, tvc, rcs, servo]
draft: true
---

## 한 줄 요약

> **"Actuator = 명령 → 물리 변화"** — closed-loop + fault detect 핵심.

## Avionics Actuator 분류

**LV·로켓 (Launch Vehicle):**
- TVC (Thrust Vector Control) — 추력 방향
- RCS (Reaction Control System) — 가스 분사
- Engine valve (turbopump·hypergolic)
- Stage separation pyro

**항공기 (Aircraft):**
- Control surface — aileron·elevator·rudder·flap
- Engine — FADEC (Full Authority Digital Engine Control)
- Trim·tab
- Landing gear
- Door·hatch

**위성·우주선:**
- RCS thruster
- Reaction wheel·CMG (Control Moment Gyro)
- Magnetic torquer (LEO)
- Solar panel deploy
- Antenna gimbal

대부분 — *전기 → 기계 변환* + *피드백 closed-loop*.

각 actuator — *제어 정밀도·응답 시간·power*.

## TVC — Thrust Vector Control

**TVC 종류:**

**1. Gimbaled nozzle:**
- 엔진·노즐 전체 swiveling
- ±5~10° typical
- Hydraulic·electric actuator
- 사용 — 액체 추진 (RD-180, Merlin, KSLV-II)

**2. Jet vane:**
- 배기 노즐 안에 vane
- 고체 추진에 일반
- Erosion 문제
- 사용 — Sidewinder missile, 일부 LV

**3. Flex bearing / Flex nozzle:**
- 탄성체 nozzle
- 고체 추진 부분
- 사용 — Space Shuttle SRB

**4. LITVC (Liquid Injection TVC):**
- Liquid 분사로 flow deflection
- 사용 — Minuteman missile 일부

**5. Fluidic / Movable strap:** 덜 일반적.

대부분 LV — *Gimbaled nozzle* (대형) 또는 *jet vane* (소형 missile).

## Electric vs Hydraulic Actuator

**Hydraulic TVC:**
- 고압 hydraulic system (3000 psi)
- Hydraulic motor → gear → nozzle

장점:
- 높은 force
- Compact
- 수십 년 history

단점:
- Fluid leak risk
- Toxic fluid (older)
- Pump·reservoir 별도
- Heavy infrastructure

사용:
- Atlas V·Delta IV·Falcon 9 (legacy)
- Space Shuttle (APU 기반)
- Russian rockets

**Electric TVC (EMA):**
- Electric motor + ball screw
- BLDC + harmonic drive

장점:
- No hydraulic infrastructure
- Easier maintenance
- Power efficiency

단점:
- High peak current
- Heat
- Backdrivable (또는 not)

사용:
- Vega·Ariane 6
- Falcon 9 (modern)
- KSLV-II (likely electric on stages)
- Electron (Rocket Lab)

추세 — *Electric TVC*. 단순성·신뢰성.

## TVC Actuator — 제어 Loop

Closed-loop TVC:

![TVC closed-loop — controller, motor, mechanical, nozzle with position feedback](/images/blog/avionics/diagrams/ch07-tvc-loop.svg)

**Control:**
- PID 또는 LQR
- Frequency response — bandwidth 5~30 Hz
- Latency budget — 10~30 ms (command → 90% position)

**Position sensor:**
- LVDT (Linear Variable Differential Transformer)
- Resolver (rotary)
- Optical encoder
- Hall encoder

**Redundancy:**
- Dual sensor (primary·backup)
- Cross-check

**Fault detection:**
- Position error > threshold → fault
- Current limit → mechanical jam
- Timing — slow response → degraded

TVC = *fast, accurate, robust*. LV 핵심.

## RCS — Reaction Control System

**RCS thruster:**
- Small thrust (1 N ~ 1 kN)
- On-off (binary), pulsed
- Bipropellant 또는 mono·cold gas

**종류:**

**Cold gas (N2·He):**
- Low Isp ~ 60 sec
- CubeSat·small probes

**Monopropellant (hydrazine):**
- Isp 220 sec
- Catalytic decomposition
- 대부분 위성

**Bipropellant (NTO·MMH):**
- Isp 280~320 sec
- Larger spacecraft

**Electric (Hall·ion):**
- Isp 1500~5000 sec
- Long-duration (위성 stationkeeping)
- Low thrust

**LV stage:**
- 보통 cold gas 또는 hypergolic
- Mid-flight roll·pitch control

RCS — *attitude + small Δv*. Main engine 보조.

## RCS Valve·Driver

**Thruster valve:**
- Solenoid valve (on-off)
- Or pintle valve (throttleable)

**Driver:**
- High-current MOSFET·IGBT
- Pulse width modulation (PWM)
- Minimum impulse bit (MIB) — 1~10 ms minimum on-time

**Pulse sequence:**
- Attitude error → pulse width·rate
- PWPF (Pulse-Width Pulse-Frequency)

**Fault:**
- Stuck-open (catastrophic)
- Stuck-closed (loss of authority)
- Solenoid fail (electrical)

**Detection:**
- Pressure sensor (downstream)
- Current sense (driver)
- Tank pressure trend

**Redundancy:**
- 보통 dual thruster per axis
- N+1 또는 N+2

RCS — *fault tolerance + 정밀 pulse*.

## Aircraft Control Surface — Servo

**Control surface:**
- Aileron (roll)
- Elevator (pitch)
- Rudder (yaw)
- Flap·slat (lift)
- Spoiler (drag·roll)

**Actuator type:**

**Hydraulic Servo (전통):**
- Hydraulic system (3000 psi)
- Multiple redundant (triplex·quadplex)
- Aircraft hydraulic system 의존

**EHA (Electrohydrostatic Actuator):**
- Self-contained — motor + pump + cylinder
- Less hydraulic infrastructure

**EMA (Electromechanical Actuator):**
- Motor + gear·ball screw + linkage
- Full electric
- More-Electric Aircraft (MEA) trend

**인증:**
- DO-178C + DO-254
- ARP-4754A system safety
- Triple·quad redundancy (commercial aircraft)

추세 — *MEA, EHA·EMA*. B787·A350·F-35.

## Fly-by-wire (FBW)

**Fly-by-wire:**
- Pilot control → electronic signal → actuator
- Mechanical linkage 제거

**Components (signal chain):**

Side stick·yoke·rudder pedal → Position sensor → FCC (Primary Flight Computer) → Servo command → Actuator → Control surface.

**Redundant FCC:**
- Triple·quad
- Voting·comparator
- Diverse (different vendor·language)

**FBW history:**
- Concorde (analog FBW, 1969)
- A320 (1988, first digital FBW commercial)
- B777 (1995, first US digital FBW commercial)
- F-16 (1974, first FBW fighter)
- Korean KF-21 (2022)

FBW — *modern aircraft 표준*. SW 의존도 높음.

## Engine Actuator — FADEC

**FADEC (Full Authority Digital Engine Control):** Engine 전 자동 제어.

**Inputs:**
- Pilot throttle command
- Air pressure·temperature
- Fuel pressure
- Engine RPM·temp
- Burner pressure

**Outputs:**
- Fuel valve position
- Variable geometry vanes
- Bleed valve
- Ignition

**Architecture:**
- Dual-channel (Channel A·B)
- Cross-monitoring
- Fail-operational

**SW:**
- DO-178C Level A
- Vendor — Honeywell·GE·Pratt·Rolls-Royce
- 자체 (한화·KAERO)

**사용:**
- All modern jet engines
- F-22·F-35·KF-21
- B787·A350·A380

FADEC = engine *SW 종속*. Reliability critical.

## Reaction Wheel·CMG

**Reaction Wheel:**
- Flywheel + motor
- Spin up → reaction torque → spacecraft rotate
- Issue: saturation → momentum dump (RCS·magnetic torquer)

Use:
- 위성 attitude control (pointing)
- KOMPSAT·Chollian 등

Vendors:
- Honeywell HR series
- Bradford
- Rockwell Collins
- KARI·자체

**CMG (Control Moment Gyro):**
- Gimbaled spinning rotor
- Higher torque than reaction wheel

Use:
- ISS, Hubble
- Large spacecraft

**Magnetic Torquer:**
- Coil in Earth magnetic field
- Low torque
- LEO 만 (magnetic field 필요)

Use:
- CubeSat
- Momentum unloading

위성 attitude — *RW + CMG + magnetic*.

## Actuator Driver — Electronics

**BLDC Motor Driver:**
- 3-phase inverter (6 MOSFET)
- Hall sensor 또는 encoder
- FOC (Field-Oriented Control)
- PWM 10~20 kHz

**Current sense:**
- Shunt resistor + amplifier
- Hall current sensor

**Position sense:**
- Encoder (incremental·absolute)
- Resolver
- Hall
- LVDT

**Control (cascaded loop):**
- Outer position
- Mid velocity
- Inner current/torque

**MCU:**
- STM32G4·G7 (motor control optimized)
- TI C2000
- Microchip dsPIC

**Aerospace:**
- Cortex-R safety MCU
- Triple voted driver
- Watchdog·current limit

Actuator driver = *power electronics + control*.

## Fault Detection

**Position fault:**
- Command vs sensed position error
- > threshold → fault
- Stuck (no movement)

**Current fault:**
- Overcurrent — mechanical jam
- No current — driver fail

**Timing fault:**
- Slow response — degraded
- No response — fail

**Sensor fault:**
- Out-of-range
- Stuck value
- Cross-comparison (dual sensor)

**Driver fault:**
- Internal self-test
- Voltage rail
- Temperature

**Action:**
- Trip 또는 isolate
- Use redundant actuator
- Re-route control

**Logging:**
- Telemetry (fault ID + timestamp)
- Maintenance record

Fault detection = *closed-loop integrity*. Critical for safety.

## Korean Actuator 사례

- **KSLV-II 누리 TVC:** Electric (likely). Gimbaled nozzle. 자체 + 일부 commercial.
- **KAI KF-21:** EHA·EMA — Control surface. Hydraulic backup. FADEC — F414 engine.
- **KARI KOMPSAT·KPLO:** Reaction wheel — 일부 자체. Magnetic torquer. RCS — commercial + 자체.
- **한화 미사일:** Jet vane·gimbal. 자체 motor·driver.
- **LIG넥스원:** Missile actuator. 자체 + 외산.

한국 — *자체화 진행*. 핵심 actuator 국산화.

## Driver SW 예 — TVC Position Loop

```c
typedef struct {
    float cmd_deg;          /* commanded angle */
    float meas_deg;         /* measured angle (LVDT) */
    float error;
    float integral;
    float pwm_out;          /* -1.0 ~ 1.0 */
    
    float kp, ki, kd;
    float prev_error;
    
    bool fault;
} tvc_axis_t;

void tvc_position_loop(tvc_axis_t *axis, float dt) {
    /* PID controller */
    axis->error = axis->cmd_deg - axis->meas_deg;
    axis->integral += axis->error * dt;
    
    /* Anti-windup */
    if (axis->integral > 10.0f) axis->integral = 10.0f;
    if (axis->integral < -10.0f) axis->integral = -10.0f;
    
    float derivative = (axis->error - axis->prev_error) / dt;
    axis->prev_error = axis->error;
    
    axis->pwm_out = axis->kp * axis->error
                  + axis->ki * axis->integral
                  + axis->kd * derivative;
    
    /* Saturation */
    if (axis->pwm_out > 1.0f) axis->pwm_out = 1.0f;
    if (axis->pwm_out < -1.0f) axis->pwm_out = -1.0f;
    
    /* Fault check */
    if (fabsf(axis->error) > 5.0f &&
        fabsf(axis->meas_deg - axis->prev_meas) < 0.01f) {
        /* Stuck */
        axis->fault = true;
    }
    
    /* Output */
    motor_set_pwm(axis->pwm_out);
}
```

각 axis별 PID — *200~1000 Hz loop rate*.

## 인증·환경

**Actuator 인증:**
- DO-178C + DO-254 (FCC·driver)
- ARP-4754A·4761 (system safety)
- DO-160 — environmental

**LV qualification:**
- Hot fire test
- Vibration·shock·acoustic
- Vacuum
- Thermal cycle

**Aircraft:**
- Iron bird test (mockup)
- Flight test
- Service trial

**신뢰성:**
- MTBF > 10,000 hour 일반
- Million-cycle endurance test

Actuator = *physical critical*. 시험 광범위.

## 자주 하는 실수

> ⚠️ Position feedback single sensor

1 LVDT → sensor fail = position unknown. Open-loop fall-back 불가.

→ Dual sensor + cross-check.

> ⚠️ Driver overcurrent protection 부족

"Software current limit"만 두면 HW current spike에서 driver burn이 발생한다.

→ Hardware-level current limit.

> ⚠️ Stuck detection 누락

Command 5° → position 0°인데도 "still tracking" 플래그가 안 뜨면 mission이 compromised된다.

→ Error + rate detection.

> ⚠️ Backdrivability 무시

Aerodynamic load → actuator backdrive로 무지령 상태에서 position deviation이 생길 수 있다.

→ Brake 또는 high gear ratio.

## 정리

- TVC — gimbal·jet vane·LITVC, *electric 추세*.
- RCS — cold gas·monoprop·biprop·electric.
- Aircraft — hydraulic → EHA·EMA *(MEA)*.
- FADEC — engine *SW critical*, DO-178C Level A.
- Reaction wheel·CMG·magnetic torquer — 위성 attitude.
- Driver — BLDC + FOC + redundant control.
- Fault detection — *position·current·timing*.
- 한국 — *자체화 진행*, 핵심 actuator 국산화.

다음 편은 **Flight Management Systems**.

## 관련 항목

- [Ch 6: Sensors](/blog/embedded/avionics/digital-avionics-handbook/chapter06-sensors)
- [Ch 8: FMS](/blog/embedded/avionics/digital-avionics-handbook/chapter08-fms)
- [Ch 9: Fault Tolerance](/blog/embedded/avionics/digital-avionics-handbook/chapter09-fault-tolerance)
- [Launch Vehicle Flight SW Ch 4: Control Signal](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter04-control-and-signal)
