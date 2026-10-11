---
title: "Edge 추론 Pipeline 측정 — Stage Latency·Mailbox 정책·Buffer 수"
slug: "embedded/modern-recipes/part12-01b-edge-pipeline-measurement"
date: 2026-04-21T09:00:30
description: "Edge 추론을 preprocess·inference·postprocess 세 stage로 나눠 stage별·end-to-end latency를 재고, thread·크기 1 mailbox·buffer pool로 만든 pipeline의 처리량과 지연을 backpressure·latest-wins 정책별로 셈하고 필요한 buffer 수를 정합니다."
series: "Modern Embedded Recipes"
seriesOrder: 138
tags: [recipes, edge-ai, inference, pipeline, latency]
topics: ["embedded"]
draft: false
---

## 한 줄 요약

> **"Pipeline은 결과 간격을 가장 느린 stage에 맞추지만 지연은 줄이지 않습니다."** 이 글은 고른 edge 경로가 frame 예산을 맞추는지 stage별·end-to-end로 재는 코드와, mailbox 정책·buffer 수를 구조로 셈하는 법을 다룹니다.

## 어떤 상황에서 쓰나

추론을 device에서 하기로 정한 다음 단계입니다. 어디서 추론할지는 [12-01 Edge Inference 분석](/blog/embedded/modern-recipes/part12-01-edge-inference)이 frame 간격·데이터 크기·privacy·오프라인 네 질문으로 정했고, 30 fps의 처리량 예산 33.3 ms와 지연 예산의 정의도 그 글에 있습니다. 이 글은 그 예산을 고른 edge 경로가 실제로 맞추는지를 묻습니다. 예는 12-01과 같은 1080p 출입 카운터입니다.

글의 순서는 이렇습니다. 추론 한 번을 세 stage로 나누고, stage별·end-to-end latency를 재는 코드로 직렬 구성의 시간을 봅니다. 그다음 세 stage를 thread로 나눈 pipeline을 만들고, mailbox 정책별 처리량과 지연, 필요한 buffer 수를 코드 구조에서 셈합니다. 코드 절은 독자가 두 가지를 안다고 보고 씁니다.

- C에서 `pthread_mutex_t`와 [`pthread_cond_wait`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_cond_wait.html)로 기다리고 깨우는 법
- V4L2 capture buffer를 dequeue하는 흐름 — [12-09 Zero-Copy Camera Pipeline](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)과 커널의 [V4L2 buffer 문서](https://docs.kernel.org/userspace-api/media/v4l/buffer.html)

## 3-stage pipeline

Edge 추론 한 번은 세 stage로 나뉩니다.

| Stage | 하는 일 | 주로 도는 곳 |
|---|---|---|
| Preprocess | resize, 색 공간 변환, 정규화 | CPU SIMD, ISP, 2D 엔진 |
| Inference | 모델 실행 | NPU, GPU, DLA |
| Postprocess | NMS, threshold, 좌표 복원, 동작 결정 | CPU |

Preprocess와 postprocess를 CPU에 두는 구성에서는 inference만 빨라져도 처리량이 그만큼 오르지 않습니다. 아래 "구조로 셈한 처리량과 지연"처럼 처리량은 가장 느린 stage가 정하므로, 세 stage를 따로 재야 어디를 고칠지 보입니다.

## 코드 / 실제 사용 예

이 절의 프로그램에서 stage는 `nanosleep`으로 10·30·5 ms를 쉬는 대역(stand-in)입니다. 실제 모델과 카메라로 바꿔 끼울 자리를 보여 주는 측정 틀이고, 글에는 실행 출력을 싣지 않습니다. 숫자가 필요한 곳은 코드의 설계값(10·30·5 ms)으로 셈합니다. [POSIX `nanosleep`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/nanosleep.html)은 sleep 해상도로 올림하거나 다른 작업의 scheduling 때문에 요청보다 길게 쉴 수 있지만, signal로 깨는 경우가 아니면 요청보다 짧게 쉬지 않는다고 정합니다. 그래서 실행에서 찍히는 stage 시간은 설계값 이상이고, 프로그램이 같은 실행 안에서 stage 시간을 따로 재는 이유가 여기에 있습니다.

### Stage별·end-to-end latency 측정

```c
#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <time.h>

static uint64_t now_ns(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000u + (uint64_t)ts.tv_nsec;
}

static void sleep_ms(int ms) {
    struct timespec d = { ms / 1000, (long)(ms % 1000) * 1000000L };
    nanosleep(&d, NULL);
}

/* stand-ins: replace with the real stages */
static void capture(void)     { }
static void preprocess(void)  { sleep_ms(10); }
static void inference(void)   { sleep_ms(30); }
static void postprocess(void) { sleep_ms(5); }
static void act(void)         { }

enum { CAP, PRE, INF, POST, ACT, N_STAGE };
static const char *name[N_STAGE] = { "capture", "pre", "infer", "post", "action" };

enum { WARMUP = 10, FRAMES = 200 };

int main(void) {
    void (*stage[N_STAGE])(void) = { capture, preprocess, inference, postprocess, act };
    uint64_t sum[N_STAGE] = {0}, e2e_sum = 0, e2e_worst = 0;

    for (int f = 0; f < WARMUP + FRAMES; f++) {
        uint64_t t_start = now_ns(), t = t_start;
        uint64_t d[N_STAGE];
        for (int s = 0; s < N_STAGE; s++) {
            stage[s]();
            uint64_t t_next = now_ns();
            d[s] = t_next - t;
            t = t_next;
        }
        if (f < WARMUP) continue;          /* drop warm-up frames */
        for (int s = 0; s < N_STAGE; s++) sum[s] += d[s];
        e2e_sum += t - t_start;
        if (t - t_start > e2e_worst) e2e_worst = t - t_start;
    }
    for (int s = 0; s < N_STAGE; s++)
        printf("%-8s avg %8.3f ms\n", name[s], sum[s] / 1e6 / FRAMES);
    printf("e2e      avg %8.3f ms, worst %8.3f ms (%d frames, %d warm-up dropped)\n",
           e2e_sum / 1e6 / FRAMES, e2e_worst / 1e6, FRAMES, WARMUP);
    return 0;
}
```

이 프로그램이 내는 것은 stage별 평균, end-to-end 평균과 최악값입니다. 읽는 순서는 두 가지입니다.

- 가장 긴 stage의 평균을 frame 간격과 비교합니다. 직렬 구조에서는 stage 합이 곧 결과 간격이라, 설계값으로는 10 + 30 + 5 = 45 ms입니다. 30 fps 간격 33.3 ms를 넘으므로 이 구성은 직렬로는 30 fps 처리량 예산에 실패합니다.
- 제어 시스템의 예산과 비교할 값은 평균이 아니라 최악값입니다. 최악값은 한 번의 실행으로 정하지 않고, 같은 보드에서 여러 번 돌린 최댓값을 남깁니다. 앞 10 frame(`WARMUP`)은 시작 직후의 값이 평균과 최악값에 섞이지 않도록 버립니다.

시계는 `CLOCK_MONOTONIC`을 씁니다. [POSIX `clock_gettime`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/clock_gettime.html)은 이 시계의 값을 `clock_settime()`으로 설정할 수 없다고 정하므로, 누가 벽시계(`CLOCK_REALTIME`)를 다시 맞춰도 그 설정이 구간 측정에 끼어들지 않습니다.

### `t_start`를 V4L2 timestamp로 바꾸기

위 코드는 `capture()`가 시작된 시점부터 잽니다. Linux V4L2 카메라라면 dequeue한 [`struct v4l2_buffer`의 `timestamp`](https://docs.kernel.org/userspace-api/media/v4l/buffer.html)(docs.kernel.org, 7.3.0-rc6 판)를 시작점으로 씁니다. `V4L2_BUF_FLAG_TIMESTAMP_MONOTONIC` flag가 있으면 같은 `CLOCK_MONOTONIC` 기준입니다. 이 값을 `t_start`로 쓰면 driver 대기열에 있던 시간까지 end-to-end에 들어갑니다. 그 시각이 정확히 frame의 어느 순간인지는 아래 `*soe` 설명에 있습니다.

```c
#include <stdint.h>
#include <sys/time.h>
#include <linux/videodev2.h>

/* v4l2_buffer.timestamp -> ns on the CLOCK_MONOTONIC scale; -1 if another clock */
static int v4l2_ts_ns(const struct v4l2_buffer *b, uint64_t *ns, int *soe) {
    if ((b->flags & V4L2_BUF_FLAG_TIMESTAMP_MASK) != V4L2_BUF_FLAG_TIMESTAMP_MONOTONIC)
        return -1;
    *ns = (uint64_t)b->timestamp.tv_sec * 1000000000u
        + (uint64_t)b->timestamp.tv_usec * 1000u;
    *soe = (b->flags & V4L2_BUF_FLAG_TSTAMP_SRC_MASK) == V4L2_BUF_FLAG_TSTAMP_SRC_SOE;
    return 0;
}
```

`VIDIOC_DQBUF`로 받은 buffer를 이 함수에 넘기고, 반환값이 0이면 `*ns`를 `t_start`로 씁니다.

`*soe`는 측정 기록에 함께 남깁니다. 커널 문서의 `timestamp` 필드 설명은 capture stream에서 첫 data byte를 받은 시각이라고 일반적으로 적고, 같은 문서의 `V4L2_BUF_FLAG_TSTAMP_SRC_*` flag가 driver가 실제로 시각을 찍은 지점을 알려 줍니다. `V4L2_BUF_FLAG_TSTAMP_SRC_SOE`(값 `0x00010000`)는 노출이 시작된 시각, `V4L2_BUF_FLAG_TSTAMP_SRC_EOF`(값 `0x00000000`)는 frame의 마지막 픽셀을 받은 시각입니다. 그래서 시작점은 필드 설명이 아니라 이 flag로 판단합니다. EOF timestamp에서 시작한 e2e에는 노출과 sensor readout 시간이 들어 있지 않습니다. Camera 경로 전체의 측정 항목은 12-09가 다루므로, 여기서는 이 시작점 하나만 맞춥니다.

### 3-stage pipeline — thread, 크기 1 mailbox, buffer pool

세 stage를 thread 셋으로 나누고, stage 사이를 크기 1짜리 mailbox로 잇습니다. 코드에는 네 가지가 들어 있습니다.

1. frame buffer pool: free list에서 빌리고, postprocess가 끝나면 돌려줍니다.
2. mailbox 두 정책: 기본은 slot이 차 있으면 `mb_put`이 기다리는 *backpressure*, `-DLATEST`로 빌드하면 오래된 frame을 버리고 새 frame으로 덮어쓰는 *latest-wins*입니다.
3. 종료 경로: 앞 stage가 끝나면 mailbox를 닫고, 뒤 stage는 빈 mailbox가 닫힌 것을 보고 빠져나옵니다. `main`은 세 thread를 모두 join합니다.
4. stage 시간: 각 thread가 자기 stage에 쓴 시간을 같은 실행 안에서 따로 재서, 결과 간격을 *그 실행의* stage 시간과 비교할 수 있게 합니다.

```c
#define _POSIX_C_SOURCE 200809L
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <time.h>

#ifndef POOL
#define POOL 5                     /* frame buffers; see the state count below */
#endif
enum { WARMUP = 10, FRAMES = 200, PRE_MS = 10, INF_MS = 30, POST_MS = 5 };

typedef struct { int id; uint64_t t_cap; } frame_t;
enum { S_PRE, S_INF, S_POST, N_ST };
static uint64_t busy_sum[N_ST];        /* per-stage busy time, warm-up excluded */
static int      busy_n[N_ST];

static uint64_t now_ns(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000u + (uint64_t)ts.tv_nsec;
}
static void sleep_ms(int ms) {
    struct timespec d = { 0, (long)ms * 1000000L };
    nanosleep(&d, NULL);
}

static void busy_add(int s, int id, uint64_t t0) {
    if (id < WARMUP) return;           /* each counter has one writer thread */
    busy_sum[s] += now_ns() - t0;
    busy_n[s]++;
}

/* ---- buffer pool: a free list guarded by one mutex ---- */
static frame_t buf[POOL];
static frame_t *free_list[POOL];
static int n_free = POOL, in_use_max = 0, pool_waits = 0;
static pthread_mutex_t pool_mu = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  pool_cv = PTHREAD_COND_INITIALIZER;

static frame_t *pool_get(void) {
    pthread_mutex_lock(&pool_mu);
    if (n_free == 0) pool_waits++;
    while (n_free == 0) pthread_cond_wait(&pool_cv, &pool_mu);
    frame_t *f = free_list[--n_free];
    if (POOL - n_free > in_use_max) in_use_max = POOL - n_free;
    pthread_mutex_unlock(&pool_mu);
    return f;
}
static void pool_put(frame_t *f) {
    pthread_mutex_lock(&pool_mu);
    free_list[n_free++] = f;
    pthread_cond_signal(&pool_cv);
    pthread_mutex_unlock(&pool_mu);
}

/* ---- size-1 mailbox; LATEST overwrites, otherwise put blocks ---- */
typedef struct {
    pthread_mutex_t mu;
    pthread_cond_t  cv;
    frame_t        *slot;
    bool            closed;
    bool            latest;
    int             dropped;
} mailbox_t;

static void mb_put(mailbox_t *m, frame_t *f) {
    frame_t *old = NULL;
    pthread_mutex_lock(&m->mu);
    if (m->latest) {
        old = m->slot;                 /* stale frame goes back to the pool */
        if (old) m->dropped++;
    } else {
        while (m->slot != NULL) pthread_cond_wait(&m->cv, &m->mu);
    }
    m->slot = f;
    pthread_cond_broadcast(&m->cv);
    pthread_mutex_unlock(&m->mu);
    if (old) pool_put(old);
}
static frame_t *mb_get(mailbox_t *m) {      /* NULL = closed and empty */
    pthread_mutex_lock(&m->mu);
    while (m->slot == NULL && !m->closed) pthread_cond_wait(&m->cv, &m->mu);
    frame_t *f = m->slot;
    m->slot = NULL;
    pthread_cond_broadcast(&m->cv);
    pthread_mutex_unlock(&m->mu);
    return f;
}
static void mb_close(mailbox_t *m) {
    pthread_mutex_lock(&m->mu);
    m->closed = true;
    pthread_cond_broadcast(&m->cv);
    pthread_mutex_unlock(&m->mu);
}

#ifdef LATEST
#define FIRST_LATEST true
#else
#define FIRST_LATEST false
#endif
static mailbox_t pre_to_inf  = { PTHREAD_MUTEX_INITIALIZER, PTHREAD_COND_INITIALIZER,
                                 NULL, false, FIRST_LATEST, 0 };
static mailbox_t inf_to_post = { PTHREAD_MUTEX_INITIALIZER, PTHREAD_COND_INITIALIZER,
                                 NULL, false, false, 0 };

static void *pre_thread(void *arg) {
    (void)arg;
    for (int id = 0; id < WARMUP + FRAMES; id++) {
        frame_t *f = pool_get();
        f->id = id;
        f->t_cap = now_ns();           /* stand-in for the V4L2 timestamp */
        sleep_ms(PRE_MS);
        busy_add(S_PRE, id, f->t_cap);
        mb_put(&pre_to_inf, f);
    }
    mb_close(&pre_to_inf);
    return NULL;
}
static void *inf_thread(void *arg) {
    (void)arg;
    frame_t *f;
    while ((f = mb_get(&pre_to_inf)) != NULL) {
        uint64_t t0 = now_ns();
        sleep_ms(INF_MS);
        busy_add(S_INF, f->id, t0);
        mb_put(&inf_to_post, f);
    }
    mb_close(&inf_to_post);
    return NULL;
}
static void *post_thread(void *arg) {
    (void)arg;
    frame_t *f;
    int done = 0;
    uint64_t lat_sum = 0, lat_max = 0, t_first = 0, t_last = 0;
    while ((f = mb_get(&inf_to_post)) != NULL) {
        uint64_t t0 = now_ns();
        sleep_ms(POST_MS);
        busy_add(S_POST, f->id, t0);
        uint64_t t = now_ns(), lat = t - f->t_cap;
        if (f->id >= WARMUP) {         /* drop warm-up frames */
            if (done == 0) t_first = t;
            t_last = t;
            lat_sum += lat;
            if (lat > lat_max) lat_max = lat;
            done++;
        }
        pool_put(f);
    }
    printf("captured %d, results %d (warm-up excluded), dropped %d\n",
           WARMUP + FRAMES, done, pre_to_inf.dropped);
    printf("interval avg %.1f ms\n", (t_last - t_first) / 1e6 / (done - 1));
    printf("latency  avg %.1f ms, worst %.1f ms\n", lat_sum / 1e6 / done, lat_max / 1e6);
    printf("buffers  max in use %d of %d, pool waits %d\n", in_use_max, POOL, pool_waits);
    return NULL;
}

int main(void) {
    for (int i = 0; i < POOL; i++) free_list[i] = &buf[i];
    pthread_t t[3];
    pthread_create(&t[0], NULL, pre_thread, NULL);
    pthread_create(&t[1], NULL, inf_thread, NULL);
    pthread_create(&t[2], NULL, post_thread, NULL);
    for (int i = 0; i < 3; i++) pthread_join(t[i], NULL);
    printf("stage    pre %.1f / infer %.1f / post %.1f ms (busy avg, this run)\n",
           busy_sum[S_PRE] / 1e6 / busy_n[S_PRE], busy_sum[S_INF] / 1e6 / busy_n[S_INF],
           busy_sum[S_POST] / 1e6 / busy_n[S_POST]);
    return 0;
}
```

두 정책으로 빌드합니다.

```bash
clang -std=c11 -O2 -Wall -Wextra -Wpedantic -pthread pipe.c -o pipe_bp
clang -std=c11 -O2 -Wall -Wextra -Wpedantic -pthread -DLATEST pipe.c -o pipe_latest
```

### 구조로 셈한 처리량과 지연

Stage 시간을 preprocess P, inference I, postprocess Q로 두면, 세 구성의 결과 간격과 지연은 코드 구조에서 셈이 나옵니다. 오른쪽 두 열은 설계값(P = 10, I = 30, Q = 5 ms)을 넣은 값입니다.

| 구성 | 결과 간격 | 지연 | 설계값 간격 | 설계값 지연 |
|---|---|---|---|---|
| 직렬 | P + I + Q | P + I + Q | 45 ms | 45 ms |
| backpressure | I | 3I + Q | 30 ms | 95 ms |
| latest-wins | I | P + (0~P 대기) + I + Q | 30 ms | 45~55 ms |

**처리량은 가장 느린 stage가 정합니다.** 두 pipeline 모두 inference thread가 쉬지 않고 돌므로 결과 간격은 I입니다. 설계값으로 30 ms라 30 fps 간격 33.3 ms 안에 들어와 처리량 예산을 통과하고, 같은 stage를 직렬로 돌린 45 ms는 실패합니다.

**Backpressure는 지연을 늘립니다.** 대역 stage에서는 capture가 즉시 끝나므로 pre thread가 쉬지 않고 frame을 만듭니다. Pre thread의 `mb_put(k-1)`은 inference thread가 frame k-2를 mailbox에서 꺼내는 순간 풀리고, pre thread는 바로 frame k를 만들기 시작합니다. Frame k는 inference가 k-2와 k-1을 끝낼 때까지 기다린 뒤 처리되므로, 지연은 inference 세 번과 postprocess 한 번, 3I + Q입니다. 설계값으로 95 ms라 직렬 45 ms의 두 배를 넘습니다. 크기 1 mailbox는 대기열이 끝없이 자라는 것은 막지만, 오래된 frame을 버려 주지는 않습니다.

**Latest-wins는 처리량을 그대로 두고 지연을 직렬 수준으로 되돌립니다.** Inference thread가 꺼내는 frame은 pre thread가 가장 최근에 넣은 것이고, 다음 frame이 P 뒤에 덮어쓰므로 slot에서 기다린 시간은 P보다 짧습니다. 대가는 버리는 frame입니다. Pre thread는 P마다 하나, inference는 I마다 하나를 처리하므로, 설계값이면 frame 세 개 중 두 개를 버립니다. 출입 카운터처럼 매 frame이 필요한 추론에는 이 정책이 맞지 않고, 장애물 회피처럼 최신 frame만 의미 있는 추론에 맞습니다. 정책은 [12-01](/blog/embedded/modern-recipes/part12-01-edge-inference) 결정 표의 첫 질문에 대한 답으로 고릅니다.

실행에서 찍히는 stage 시간은 설계값보다 길 수 있으므로(앞의 `nanosleep` 설명), 프로그램이 마지막 줄에 찍는 *그 실행의* stage 평균을 위 식에 넣어 같은 실행의 `interval`·`latency` 줄과 비교합니다. 식과 출력이 맞으면 pipeline 구조가 의도대로 동작하는 것이고, 어긋나면 stage 사이에 이 셈에 없는 대기가 있다는 뜻입니다. 최악값은 이 식이 주지 않으므로, 보드에서 예산을 정할 때는 그 보드에서 오래 돌린 최댓값을 씁니다.

### Buffer는 몇 개면 되나 — 상태 나열

Frame buffer 하나가 있을 수 있는 자리는 다섯입니다.

| 자리 | 최대 개수 |
|---|---|
| pre thread가 쓰는 중이거나, 다 쓴 frame을 들고 `mb_put`에서 기다림 | 1 |
| `pre_to_inf` slot | 1 |
| inference thread가 처리 중이거나, 처리한 frame을 들고 `mb_put`에서 기다림 | 1 |
| `inf_to_post` slot | 1 |
| post thread가 처리 중 | 1 |

Pre thread가 `pool_get`을 부르는 순간에는 직전 frame을 이미 `mb_put`으로 넘긴 뒤라 첫 줄이 비어 있습니다. 그때 다른 자리에 있는 buffer는 많아야 4개이므로, pool이 5개면 `pool_get`은 기다리지 않습니다. Latest-wins에서 덮어쓴 frame은 `mb_put` 안에서 곧바로 pool로 돌아가므로 이 셈이 바뀌지 않습니다. 프로그램의 `buffers` 줄이 이 셈을 확인하는 자리이고, `pool waits`가 0이 아니면 이 셈에 없는 자리가 있다는 뜻입니다.

## 자주 보는 함정

> Inference 구간만 재고 끝냄

```c
uint64_t t0 = now_ns();
inference();
uint64_t t1 = now_ns();   /* only one part of the latency budget */
```

카메라 driver 대기열, preprocess, 결과 전달, 화면·actuator 출력은 이 구간 밖에 있습니다. 위 backpressure pipeline을 설계값으로 셈하면 inference 구간은 30 ms지만 frame 하나의 지연은 95 ms이고, 나머지 65 ms는 이 구간 밖에서 쓰입니다.

> Preprocess는 CPU, inference는 가속기인데 순서대로 실행

```c
resize_scalar();   /* accelerator idles while the CPU works */
inference_npu();   /* CPU idles while the accelerator works */
```

두 장치가 번갈아 쉬게 됩니다. 설계값으로 셈하면 같은 stage를 직렬로 돌릴 때 결과 간격은 45 ms, thread로 나누면 30 ms입니다. Stage를 thread로 나누거나 resize를 ISP·2D 엔진으로 옮겨 CPU를 비웁니다. 버퍼 복사 없이 카메라 frame을 가속기로 넘기는 방법은 [12-09 Zero-Copy Camera Pipeline](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)에 있습니다.

> 크기 1 mailbox면 늘 최신 frame을 처리한다고 생각함

위 backpressure 구성이 반례입니다. 크기 1 mailbox는 대기열 길이를 묶을 뿐이고, 막힌 `mb_put`이 오래된 frame을 들고 있어 지연이 3I + Q가 됩니다. 최신 frame이 필요하면 덮어쓰기 정책을 명시적으로 고릅니다.

## 정리

- 추론 한 번은 preprocess·inference·postprocess 세 stage이고, 처리량은 가장 느린 stage가 정하므로 세 stage와 end-to-end를 따로 잽니다. 설계값(10·30·5 ms)의 backpressure pipeline에서 inference 구간은 30 ms지만 frame 하나의 지연은 95 ms입니다.
- Pipeline은 결과 간격을 가장 느린 stage 시간 I에 맞추지만 지연은 줄이지 않습니다. 설계값(10·30·5 ms)으로 직렬은 간격·지연 45 ms, backpressure는 간격 30 ms·지연 95 ms(3I + Q), latest-wins는 간격 30 ms·지연 45~55 ms이고 frame 세 개 중 두 개를 버립니다. 30 fps 처리량 예산은 두 pipeline이 통과하고 직렬은 실패합니다.
- 측정은 `CLOCK_MONOTONIC`과 V4L2 timestamp로 잽니다. Timestamp가 SOE면 노출 시작부터, EOF면 frame 수신이 끝난 시점부터의 지연입니다.
- 크기 1 mailbox는 대기열 길이를 묶을 뿐 최신 frame을 보장하지 않습니다. 매 frame이 필요한 추론은 backpressure, 최신 frame만 의미 있는 추론은 latest-wins를 고릅니다.
- 세 stage pipeline의 buffer는 자리 다섯 개를 나열해 셉니다. Pool이 5개면 `pool_get`이 기다리지 않고, `pool waits`가 0이 아니면 셈에 없는 자리가 있다는 뜻입니다.

다음 편은 **[NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교](/blog/embedded/modern-recipes/part12-02-npu-architecture)**입니다.

## 관련 항목

- [12-01: Edge Inference 분석](/blog/embedded/modern-recipes/part12-01-edge-inference) — 추론을 cloud와 edge 중 어디서 할지 정하는 네 질문
- [12-02: NPU 아키텍처](/blog/embedded/modern-recipes/part12-02-npu-architecture)
- [12-06: ONNX Runtime](/blog/embedded/modern-recipes/part12-06-onnx-runtime) — EP 목록을 바꿀 때 stage 시간을 다시 재는 이유
- [12-09: Zero-Copy Camera Pipeline](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)
- [8-07: SIMD](/blog/embedded/modern-recipes/part8-07-simd) — preprocess 정규화·resize를 SIMD로 옮길 때
- [9-02: Wait-Free Signaling](/blog/embedded/modern-recipes/part9-02-wait-free) — 이 글의 latest-wins mailbox를 mutex 없이 만드는 latest-value(double buffer) 패턴
