---
title: "Ch 4: 디지털 제어보드·신호처리 — PID·LQR·MPC·Kalman"
date: 2026-05-27T04:00:00
description: "발사체 TVC·자세 제어. PID·LQR·MPC. IMU bias·Kalman fusion. DSP·FPGA·ARM 역할 분담."
series: "Launch Vehicle Flight Software"
seriesOrder: 4
tags: [avionics, control-law, dsp, filter, pid, lqr, kalman]
draft: true
---

## 한 줄 요약

> **"LV control = PID·LQR·MPC + Kalman filter"** — DSP·FPGA·ARM 분담.

## TVC — Thrust Vector Control

```text
발사체 자세 제어:
  IMU → attitude estimate
  Reference trajectory
  Error → control law
  TVC angle command → actuator
  
Loop frequency:
  Inner loop (rate): 1 kHz
  Outer loop (attitude): 100-400 Hz
  Trajectory: 10 Hz
```

각 layer — *다른 frequency·deadline*.

## PID — Classical

```c
typedef struct {
    float kp, ki, kd;
    float integral;
    float prev_error;
    float i_max;   /* anti-windup */
} pid_t;

float pid_update(pid_t *p, float error, float dt) {
    p->integral += error * dt;
    if (p->integral > p->i_max) p->integral = p->i_max;
    if (p->integral < -p->i_max) p->integral = -p->i_max;
    
    float derivative = (error - p->prev_error) / dt;
    p->prev_error = error;
    
    return p->kp * error + p->ki * p->integral + p->kd * derivative;
}
```

가장 단순. *수동 tune*. 비선형 system엔 한계.

## LQR — Linear Quadratic Regulator

```text
Linear System:
  ẋ = Ax + Bu
  
Cost function:
  J = ∫(xᵀQx + uᵀRu) dt
  
LQR solution:
  u = -Kx
  K = R⁻¹BᵀP
  ARE (Algebraic Riccati Equation): AᵀP + PA - PBR⁻¹BᵀP + Q = 0
```

```c
/* Pre-computed K matrix (offline) */
const float K[3][6] = {
    {1.2, 0.5, ...},
    ...
};

/* Runtime — matrix-vector multiply */
float u[3];
for (int i = 0; i < 3; i++) {
    u[i] = 0;
    for (int j = 0; j < 6; j++) {
        u[i] -= K[i][j] * state[j];
    }
}
```

LV·우주에 *표준*. Matrix 작음 — NEON·DSP 가속.

## MPC — Model Predictive Control

```c
/* MPC — 미래 N step prediction + optimization */
float mpc_compute(float *state, float *reference, float *horizon) {
    /* Solve QP (Quadratic Program) */
    /* min uᵀHu + 2gᵀu */
    /* s.t. Au ≤ b */
    
    /* Each cycle — 10-100 µs on Cortex-A */
    qp_solver(H, g, A, b, u_optimal);
    return u_optimal[0];   /* apply first action */
}
```

Modern·flexible. *제약 처리 가능*. 그러나 *compute-intensive*.

자동차 자율주행·드론·LV 일부.

## Kalman Filter — Sensor Fusion

```c
/* IMU + GPS fusion */
typedef struct {
    float x[N_STATE];        /* state estimate */
    float P[N_STATE][N_STATE]; /* covariance */
    float F[N_STATE][N_STATE]; /* state transition */
    float Q[N_STATE][N_STATE]; /* process noise */
    float R[N_OBS][N_OBS];    /* measurement noise */
} kalman_t;

void kalman_predict(kalman_t *k, float dt) {
    /* x = F*x */
    matmul_vec(k->F, k->x, x_new, N_STATE);
    
    /* P = F*P*F^T + Q */
    matmul(k->F, k->P, tmp, ...);
    matmul_transpose(tmp, k->F, k->P, ...);
    matadd(k->P, k->Q, k->P, ...);
}

void kalman_update(kalman_t *k, float *measurement) {
    /* Kalman gain */
    /* K = P*H^T * (H*P*H^T + R)^-1 */
    
    /* Update */
    /* x = x + K*(z - H*x) */
    /* P = (I - K*H)*P */
}
```

Apollo·SLS·Falcon 9·KSLV-II — 모두 Kalman 변형. Extended·Unscented·UKF.

## Complementary Filter — Simpler

```c
/* Gyro + Accel complementary */
float angle = 0.98 * (angle + gyro_rate * dt) + 0.02 * accel_angle;
```

Computationally cheap. 짧은 mission·소형 LV에 적합.

## IMU Bias Estimation

```c
/* Bias offline calibration */
float bias_gyro_x, bias_gyro_y, bias_gyro_z;

/* Pre-launch — 10 sec stationary */
calibrate_imu_bias(&bias_x, &bias_y, &bias_z);

/* Online — gyro reading */
gyro_corrected = gyro_raw - bias_estimated;

/* In-flight — Kalman estimates bias too */
kalman_state[5] = gyro_bias_x;
kalman_state[6] = gyro_bias_y;
kalman_state[7] = gyro_bias_z;
```

발사 *직전*에 bias 추정. *비행 중*에도 Kalman으로 갱신.

## DSP·FPGA·ARM 분담

```text
FPGA (highest speed):
  IMU sampling (>10 kHz)
  Encoder pulse counting
  Reed-Solomon CRC
  PWM·timer
  
DSP (signal processing):
  FIR·IIR filter (vibration removal)
  FFT (motor analysis)
  Notch filter (resonance)
  100-400 Hz
  
ARM Cortex-R/M (control law):
  PID·LQR·MPC compute
  100-1000 Hz
  
ARM Cortex-A (mission):
  Kalman filter (high-level)
  Trajectory planning
  Telemetry
  10 Hz
```

각 layer — *최적 hardware*.

## FIR Filter Implementation

```c
/* Direct form FIR — N tap */
float fir_update(float *delay, const float *coeff, int N, float input) {
    /* Shift delay line */
    for (int i = N - 1; i > 0; i--) {
        delay[i] = delay[i - 1];
    }
    delay[0] = input;
    
    /* Convolution */
    float output = 0;
    for (int i = 0; i < N; i++) {
        output += coeff[i] * delay[i];
    }
    return output;
}
```

CMSIS-DSP `arm_fir_f32` — NEON·MVE 최적화. 16-tap FIR ~ 50 cycle.

## Notch Filter — Resonance Removal

```text
Vibration mode at 50 Hz·100 Hz (rocket structural):
  → IMU에 noise
  → Control law 영향
  
Notch filter:
  Reject narrow band around resonance freq
  IIR biquad implementation
```

```c
float notch_update(notch_t *n, float input) {
    float output = n->b0 * input + n->b1 * n->x1 + n->b2 * n->x2
                 - n->a1 * n->y1 - n->a2 * n->y2;
    n->x2 = n->x1; n->x1 = input;
    n->y2 = n->y1; n->y1 = output;
    return output;
}
```

LV — *vibration이 제어 안정성 결정*. Notch filter는 *필수*.

## Slosh — 액체 추진제 출렁임

```text
Liquid rocket — 추진제 탱크 출렁임:
  Mass shift → CG (center of gravity) 이동
  → 자세 disturbance
  → Control law가 보상

Modeling:
  Pendulum model
  Spring-mass-damper
  Slosh frequency 0.5-3 Hz

Control compensation:
  Notch filter at slosh frequency
  Adaptive control
  Anti-slosh baffle (hardware)
```

Apollo·Saturn V — *slosh 보상 SW* 핵심.

## Discrete-Time Implementation

```c
/* Continuous PID → discrete (Tustin·bilinear) */
/* dt = 1 ms control loop */

void control_loop(float dt) {
    /* Sample IMU */
    float gyro[3], accel[3];
    imu_read(gyro, accel);
    
    /* Bias correction */
    gyro[0] -= bias[0];
    /* ... */
    
    /* Filter */
    gyro[0] = notch_update(&notch_x, gyro[0]);
    
    /* Kalman propagate (predict step) */
    kalman_predict(&kf, dt);
    
    /* Compute attitude error */
    float error = reference - attitude_estimate;
    
    /* PID */
    float u = pid_update(&pid, error, dt);
    
    /* Saturate */
    u = saturate(u, -MAX_GIMBAL, MAX_GIMBAL);
    
    /* Command actuator */
    tvc_set_angle(u);
}
```

매 cycle — *deterministic ms*. ISR·DMA로 *jitter 최소*.

## Anti-Windup

```c
/* I-term anti-windup */
if (output_saturated) {
    /* Don't accumulate */
} else {
    integral += error * dt;
}

/* Or back-calculation */
integral += error * dt + (saturated_output - unsaturated_output) / kp;
```

Actuator saturate 시 — *integral이 폭주* (windup). 명시 처리.

## Gain Scheduling

```c
/* Different gain at different flight phase */
if (mach < 1.0) {
    K = K_subsonic;
} else if (mach < 3.0) {
    K = K_transonic;
} else {
    K = K_supersonic;
}
```

LV — *비행 phase별로 dynamics 변화*. Gain·model 변경.

## Adaptive Control

```text
Adaptive control:
  Online parameter estimation
  Gain adjustment based on flight data
  
LV 적용:
  Adaptive notch (vibration frequency drift)
  MRAC (Model Reference Adaptive Control)
  L1 Adaptive Control (Univ. Illinois)
```

미래 — *AI·learning 기반 control*도 시작.

## CMSIS-DSP — ARM Standard

```c
#include "arm_math.h"

arm_fir_instance_f32 fir;
arm_fir_init_f32(&fir, NUM_TAPS, coeff, state, BLOCK_SIZE);
arm_fir_f32(&fir, input, output, BLOCK_SIZE);

arm_pid_instance_f32 pid = { .Kp = 1.0, .Ki = 0.1, .Kd = 0.01 };
arm_pid_init_f32(&pid, 1);
float u = arm_pid_f32(&pid, error);

arm_rfft_fast_instance_f32 fft;
arm_rfft_fast_init_f32(&fft, FFT_SIZE);
arm_rfft_fast_f32(&fft, input, output, 0);
```

ARM 공식 DSP — *NEON·MVE 자동*. Cortex-M·A 모두.

## 자주 하는 실수

> ⚠️ Continuous control law 그대로

```c
/* MATLAB Simulink continuous → 직접 C → discretize 안 함 */
u = Kp * error;   /* continuous */
```

→ discrete-time formulation (Tustin·zoh).

> ⚠️ Anti-windup 무시

```c
integral += error * dt;
/* Actuator 포화 → integral 폭주 */
```

→ saturation·back-calc.

> ⚠️ Vibration filter 없음

```c
gyro = imu_read();
control_law(gyro);   /* high-freq noise → unstable */
```

→ LPF·notch filter.

> ⚠️ Sample rate jitter

```c
vTaskDelay(pdMS_TO_TICKS(1));   /* tick jitter */
```

→ Hardware timer + IRQ + sem.

## 정리

- LV control = **PID·LQR·MPC** + **Kalman·complementary**.
- DSP·FPGA·ARM *layer별 분담*.
- **CMSIS-DSP** = ARM 표준 라이브러리.
- **Notch filter·slosh 보상** — LV 필수.
- **Anti-windup·gain scheduling** — robust control.
- Sample rate *jitter < 1%* deadline.

다음 편은 **FPGA-SW Interface**.

## 관련 항목

- [Ch 3: Multiprocessor](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter03-multiprocessor)
- [Ch 5: FPGA-SW Interface](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter05-fpga-sw-interface)
