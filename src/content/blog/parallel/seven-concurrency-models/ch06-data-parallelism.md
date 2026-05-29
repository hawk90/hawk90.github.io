---
title: "Chapter 6: Data Parallelism"
date: 2026-05-06T06:00:00
description: "GPU / SIMD — 한 명령으로 수천 데이터. OpenCL, CUDA, kernel 사고."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 6
tags: [parallel, concurrency, book-review, data-parallel, gpu, opencl, cuda, simd]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 6 요약. 책의 6장 "Data Parallelism"은 GPU를 범용 계산 장치로 다루는 *GPGPU* 사고를 OpenCL로 풀어냅니다. Day 1에서 첫 kernel을 작성하고, Day 2에서 다차원 데이터로 넓힌 다음, Day 3에서 reduction과 profiling 같은 실전 패턴을 정리합니다.

## 데이터 병렬이란 무엇인가

지금까지 본 모델은 대부분 task parallelism이었습니다. 서로 다른 작업을 동시에 진행했습니다. Chapter 6은 시선을 바꿔서 *같은 작업*을 *다른 데이터*에 동시에 적용합니다.

| 모델 | 코어 분배 방식 |
|------|-----------------|
| Task parallel | Core 1은 작업 A, Core 2는 작업 B, Core 3은 작업 C |
| Data parallel | 모든 코어가 같은 작업, 입력 배열을 분할 |

극단으로 가면 수천 개의 데이터에 동일한 명령을 한 사이클에 흘려보내는 형태가 됩니다. 이것이 바로 GPU의 본질이고, 책은 이 사고를 OpenCL을 통해 손에 잡히도록 풀어냅니다.

책이 데이터 병렬을 task 병렬의 단순한 변종이 아니라 *별개의 사고 모델*로 다루는 이유가 여기에 있습니다. 한 머신 안에 코어가 수천 개 단위로 있고, 모두가 같은 명령을 따라 움직인다고 가정하면 알고리즘 설계와 메모리 배치 모두 달라집니다.

## 직관 — CPU는 박사, GPU는 고등학생 군단

용어가 본격적으로 쏟아지기 전에 한 가지 직관을 잡고 가면 이후가 한결 가벼워집니다. CPU와 GPU는 *같은 일을 더 빨리* 하기 위한 두 가지 다른 전략입니다.

CPU는 *몇 명의 박사*가 자리에 앉아 있는 모습입니다. 한 사람이 어려운 문제를 풀고, 가지치기를 하고, 분기마다 다른 결정을 내릴 수 있습니다. 코어는 적지만 한 사람이 처리할 수 있는 일의 종류가 매우 넓습니다. 분기와 의존성이 뒤엉킨 일에 강합니다.

GPU는 같은 공간에 *수천 명의 고등학생*을 앉혀 둔 모습입니다. 각자는 박사처럼 어려운 일을 하지는 못합니다. 다만 *모두에게 똑같은 한 가지 쉬운 문제*를 동시에 풀라고 시키면, 처리량은 박사 몇 명과 비교가 안 됩니다. 픽셀 한 점, 행렬 원소 한 칸, 입자 하나처럼 *조각이 균질하고 독립적인* 일이 정확히 이 모양과 맞습니다.

이 비유 한 줄을 잡고 가면 SIMD, SIMT, work-item 같은 단어가 등장할 때마다 *누가 무슨 일을 하는지*를 그림으로 떠올릴 수 있습니다.

## SIMD, MIMD, SIMT

책은 본격적인 OpenCL 코드로 들어가기 전에 데이터 병렬 하드웨어 모델의 분류를 짚습니다. Flynn의 분류에 기반한 세 가지 약어가 핵심입니다.

| 약어 | 풀어 쓰면 | 의미 | 대표 하드웨어 |
|------|-----------|------|----------------|
| SIMD | Single Instruction, Multiple Data | 하나의 명령이 여러 데이터에 동시에 적용 | CPU의 SSE / AVX / NEON |
| MIMD | Multiple Instruction, Multiple Data | 각 코어가 서로 다른 명령을 실행 | 멀티코어 CPU, 클러스터 |
| SIMT | Single Instruction, Multiple Threads | 같은 명령을 여러 스레드가 *각자의 데이터*로 실행 | GPU (NVIDIA, AMD) |

SIMD는 한 명령이 4개 또는 8개의 데이터를 묶어 한 사이클에 처리합니다. CPU 안에 좁고 빠른 벡터 유닛으로 구현됩니다. 데이터의 폭이 곧 명령의 폭이라 분기를 표현하기 어렵습니다.

MIMD는 멀티코어 CPU가 보여주는 일반적인 병렬 모델입니다. 각 코어가 자기 스레드를 자기 명령으로 돌립니다. 유연성이 가장 높지만 코어 수가 수십 단위로 제한됩니다.

SIMT는 GPU의 모델로, 표면적으로는 SIMD에 가까우나 *스레드 단위로 분기*가 가능합니다. 다만 같은 워프 안에서 분기가 갈리면 두 경로를 모두 실행한 뒤 마스크로 한쪽만 남깁니다. 이 성질이 GPU 프로그래밍의 가장 큰 함정 가운데 하나입니다. 책은 SIMT를 *SIMD의 유연한 형태*로 부르며, OpenCL의 work-item 모델이 정확히 SIMT 위에 얹혀 있다는 점을 강조합니다.

### 직관 — 지시자와 일꾼들

세 약어를 비유로 옮기면 다음과 같은 모습이 됩니다.

- **SIMD**: 체조 선수 8명이 한 줄에 섰습니다. 코치가 *한 번* "팔을 들어"라고 외치면, 여덟 명이 *동시에 같은 동작*을 합니다. 코치의 외침 한 번이 곧 명령 한 번이고, 여덟 사람이 곧 여덟 데이터입니다.
- **MIMD**: 사무실의 박사 네 명을 떠올리면 됩니다. 각자가 *다른 일*을 하고 있고, 누군가는 회의 중이고 누군가는 코드를 짭니다. 유연하지만 사람 수가 적습니다.
- **SIMT**: 운동장에 학생 1024명을 줄지어 세우고, 32명씩 *분단*으로 나눕니다. 코치는 분단 단위로 다른 지시를 내릴 수 있습니다. 한 분단 안에서는 *모두 같은 동작*을 합니다. 한 분단 안에서 누가 "나는 왼팔"이라고 우기면, 그 분단 전체가 *왼팔 동작과 오른팔 동작을 차례로* 두 번 해야 합니다. SIMT의 *분기 비용*이 정확히 이 모양입니다.

GPU의 work-item을 *한 명의 일꾼*으로, work-group을 *한 팀*으로, NDRange를 *공장 전체*로 보면 위계가 한눈에 들어옵니다. 한 일꾼은 자기 자리의 데이터 한 조각을 맡습니다. 같은 팀의 일꾼끼리는 같은 작업대(local memory)와 같은 종을 공유합니다. 공장 전체는 수많은 팀이 같은 일을 병렬로 진행하는 풍경입니다.

| OpenCL 용어 | 비유 |
|-------------|------|
| Work-item | 한 명의 일꾼 |
| Work-group | 한 팀, 공용 작업대를 함께 씀 |
| NDRange | 공장 전체, 여러 팀이 동시에 가동 |
| Local memory | 팀 내 공용 화이트보드, 가까이 있어서 빠름 |
| Global memory | 회사 전체 공용 자료실, 멀리 떨어져 있어 오래 걸림 |


## Day 1 — 첫 OpenCL kernel

Day 1의 목표는 첫 OpenCL kernel을 손으로 실행해 보는 것입니다. 책은 GPU의 그래픽 출신 역사를 짧게 언급한 뒤, 범용 계산을 위한 GPGPU 모델로 사고를 옮깁니다. *General-Purpose computing on Graphics Processing Units*라는 풀이를 굳이 쓰는 이유는, GPU가 픽셀이 아닌 *임의의 부동소수점 배열*을 처리한다는 발상의 전환을 강조하기 위해서입니다.

책이 OpenCL을 택한 이유도 분명합니다. CUDA가 NVIDIA에 묶이는 반면 OpenCL은 표준이라 CPU, GPU, FPGA 같은 *모든 device*에서 같은 코드가 돕니다. 책의 모든 예제는 NVIDIA GPU가 없어도 CPU만으로도 실행해 결과를 확인할 수 있습니다.

GPU가 그래픽 파이프라인에서 출발해 범용 계산으로 넘어온 과정도 책은 짧게 짚습니다. 한때는 쉐이더 언어에 *부동소수점 배열을 텍스처로 위장해* 계산을 시키는 트릭이 흔했습니다. OpenCL과 CUDA가 등장하면서 이 위장이 더는 필요 없게 되었습니다. 데이터가 *그래픽 자원*이 아니라 *일반 배열*로 표현되고, kernel이 *셰이더*가 아니라 *함수*가 되었습니다. 이 단순한 명칭의 변화가 GPGPU의 출발점입니다.

## OpenCL의 네 가지 핵심 객체

OpenCL을 배우면 가장 먼저 만나는 네 개의 객체가 있습니다. 책은 이 네 가지를 순서대로 소개합니다.

| 객체 | 역할 |
|------|------|
| Platform | OpenCL 구현체 (Intel, NVIDIA, AMD, Apple 등) |
| Device | 실제 계산 장치 (CPU, GPU, FPGA) |
| Context | Device들을 묶는 실행 환경, 메모리 객체와 kernel을 공유하는 단위 |
| Command queue | 호스트가 device에게 일을 시키는 통로 |

호스트 코드는 platform을 골라 device를 잡고, 그 device로 context를 만든 뒤 context 위에 command queue를 올립니다. 모든 kernel 실행과 메모리 전송이 이 queue를 통해 들어갑니다.

이 네 객체의 위계는 호스트 코드의 도입부 모양을 결정합니다. 책의 예제마다 처음 30~40줄은 거의 같은 모양으로 반복됩니다. 한 번 외워두면 이후 예제에서는 kernel 본문에 집중할 수 있습니다.

![OpenCL의 네 객체 위계 — Platform → Device → Context → Command Queue](/images/blog/seven-concurrency-models/diagrams/ch06-opencl-stack.svg)

## 책의 첫 kernel — 벡터 덧셈

책의 Day 1 마지막 예제는 8KB짜리 float 배열 두 개를 더하는 *vector addition*입니다. 가장 단순한 데이터 병렬 문제이지만 OpenCL의 거의 모든 개념을 한 번에 보여줍니다.

이 kernel이 하는 일을 한 문장으로 옮기면 다음과 같습니다. 길이 N짜리 배열 두 개 `a`와 `b`를 받아, 같은 인덱스끼리 더해 `c`에 쓰는 일입니다. CPU 코드라면 `for (i = 0; i < N; i++) c[i] = a[i] + b[i];`로 적었을 한 줄짜리 루프를, GPU에서는 *루프 자체를 NDRange로 펼쳐* N명의 일꾼이 자기 인덱스 한 칸씩만 처리하도록 만듭니다. 따라서 아래 kernel 본문에는 루프가 등장하지 않습니다. *한 명의 일꾼이 무엇을 하는지*만 적혀 있습니다.

```c
// vector_add.cl — GPU에서 실행되는 kernel
__kernel void vector_add(__global const float* a,
                         __global const float* b,
                         __global float* c)
{
    int i = get_global_id(0);  // 내가 몇 번째 work-item인지
    c[i] = a[i] + b[i];
}
```

`__kernel`은 호스트가 호출할 수 있는 진입점임을 표시합니다. `__global`은 메모리가 device 전체에서 접근 가능한 global memory에 있음을 뜻합니다. `get_global_id(0)`은 자신이 NDRange의 몇 번째 위치에 있는지 알려줍니다. kernel 본문에는 루프가 없습니다. 루프는 OpenCL 런타임이 *수천 개의 work-item*을 동시에 실행하는 형태로 펼쳐줍니다.

루프가 사라진 자리에 *한 인덱스의 정의*만 남는다는 점이 데이터 병렬 사고의 핵심입니다. CPU 코드를 GPU로 옮길 때는 가장 안쪽 루프 한 겹을 NDRange로 빼는 작업이 첫 단계가 됩니다.

## Java JOCL로 본 호스트 코드

책은 호스트 언어로 Java를 골랐고, JOCL이라는 OpenCL Java 바인딩을 사용합니다. 다음은 책의 vector addition 호스트 코드의 골격을 옮긴 모습입니다.

```java
import org.jocl.*;
import static org.jocl.CL.*;

public class VectorAddHost {
    public static void main(String[] args) {
        final int N = 2048;  // 8KB ÷ 4 bytes = 2048 floats
        float[] a = new float[N], b = new float[N], c = new float[N];
        for (int i = 0; i < N; i++) { a[i] = i; b[i] = 2 * i; }

        // 1. Platform / device / context / queue 만들기
        cl_platform_id[] platforms = new cl_platform_id[1];
        clGetPlatformIDs(1, platforms, null);
        cl_device_id[] devices = new cl_device_id[1];
        clGetDeviceIDs(platforms[0], CL_DEVICE_TYPE_GPU, 1, devices, null);
        cl_context context = clCreateContext(null, 1, devices, null, null, null);
        cl_command_queue queue = clCreateCommandQueue(context, devices[0], 0, null);

        // 2. Device memory 할당과 입력 전송
        cl_mem dA = clCreateBuffer(context, CL_MEM_READ_ONLY,  N * 4, null, null);
        cl_mem dB = clCreateBuffer(context, CL_MEM_READ_ONLY,  N * 4, null, null);
        cl_mem dC = clCreateBuffer(context, CL_MEM_WRITE_ONLY, N * 4, null, null);
        clEnqueueWriteBuffer(queue, dA, true, 0, N * 4, Pointer.to(a), 0, null, null);
        clEnqueueWriteBuffer(queue, dB, true, 0, N * 4, Pointer.to(b), 0, null, null);

        // 3. Program 빌드와 kernel 객체 만들기
        cl_program program = clCreateProgramWithSource(context, 1,
            new String[] { KERNEL_SOURCE }, null, null);
        clBuildProgram(program, 0, null, null, null, null);
        cl_kernel kernel = clCreateKernel(program, "vector_add", null);
        clSetKernelArg(kernel, 0, Sizeof.cl_mem, Pointer.to(dA));
        clSetKernelArg(kernel, 1, Sizeof.cl_mem, Pointer.to(dB));
        clSetKernelArg(kernel, 2, Sizeof.cl_mem, Pointer.to(dC));

        // 4. NDRange 실행
        long[] global = { N };
        clEnqueueNDRangeKernel(queue, kernel, 1, null, global, null, 0, null, null);

        // 5. 결과 회수
        clEnqueueReadBuffer(queue, dC, true, 0, N * 4, Pointer.to(c), 0, null, null);
    }
}
```

이 골격은 책의 거의 모든 예제가 그대로 따릅니다. 1단계부터 5단계까지의 흐름을 외워두면 이후 예제에서는 kernel 자체에만 집중할 수 있습니다.

호스트 코드에서 *kernel은 문자열*이라는 점도 처음 보면 어색한 부분입니다. OpenCL은 런타임에 kernel 소스를 받아 device에 맞게 컴파일합니다. 같은 코드가 CPU에서도 GPU에서도 돈다는 표준의 강점이 이 구조에서 나옵니다.

## Work-item, work-group, NDRange

OpenCL은 데이터 병렬을 *N차원 인덱스 공간*으로 표현합니다. 책은 이 세 단어의 위계를 강조합니다.

| 용어 | 의미 |
|------|------|
| Work-item | 가장 작은 실행 단위, kernel을 한 번 실행하는 인덱스 하나 |
| Work-group | work-item들의 묶음, local memory와 barrier로 협력 가능 |
| NDRange | 전체 work-item이 만드는 1D / 2D / 3D 인덱스 공간 |

vector addition에서는 1차원 NDRange를 썼습니다. 다음 절의 이미지 처리에서는 2차원 NDRange로 자연스럽게 확장됩니다.

Work-group 안의 work-item은 같은 local memory를 보고 `barrier(CLK_LOCAL_MEM_FENCE)`로 서로를 기다릴 수 있습니다. 반대로 *다른 work-group 사이에는 보장된 통신 수단이 없습니다*. 이 비대칭이 OpenCL 알고리즘 설계의 출발점입니다. 협력이 필요한 일은 한 work-group 안에 가두고, 그렇지 않은 부분은 work-group을 자유롭게 늘려 성능을 받습니다.


## Day 2 — 다차원 데이터

Day 2의 메시지는 분명합니다. 이미지와 행렬처럼 *2D / 3D 구조*를 가진 데이터에 OpenCL이 잘 맞는다는 것입니다. NDRange를 다차원으로 잡으면 kernel 본문이 훨씬 자연스러워집니다.

1차원 NDRange에서는 한 인덱스로 한 원소를 가리켰습니다. 2차원으로 넘어가면 한 쌍의 인덱스가 *한 픽셀*이나 *한 행렬 원소*를 직접 가리킵니다. CPU 코드의 이중 루프가 NDRange 차원으로 펼쳐지면서, kernel 본문이 한 원소의 정의만 남는 패턴이 자연스럽게 확장됩니다.

## 2D NDRange와 이미지 처리

이미지 한 픽셀에 한 work-item을 매핑하면 다음과 같은 형태가 됩니다.

```c
__kernel void invert(__global const uchar4* in,
                     __global uchar4* out,
                     int width)
{
    int x = get_global_id(0);
    int y = get_global_id(1);
    int idx = y * width + x;
    uchar4 p = in[idx];
    out[idx] = (uchar4)(255 - p.x, 255 - p.y, 255 - p.z, p.w);
}
```

호스트 측에서는 `clEnqueueNDRangeKernel`을 부를 때 `global` 배열을 `{ width, height }`로 잡습니다. 각 work-item은 `get_global_id(0)`과 `(1)`로 자신이 맡은 픽셀의 좌표를 받습니다. 루프 두 겹이 통째로 NDRange로 빠져나가면서 kernel 본문이 *한 픽셀의 정의*만 남습니다.

블러나 엣지 검출 같은 컨볼루션 필터도 같은 패턴입니다. 한 work-item이 자기 픽셀을 중심으로 주변 9개 또는 25개를 읽어 가중합을 만듭니다. 이 단계에서 이웃 픽셀을 *몇 번이고* 다시 읽는 비효율이 생기기 때문에, 책은 곧바로 local memory 활용으로 이어 갑니다.

## 책의 행렬 곱셈 사례

책은 데이터 병렬의 고전 예로 행렬 곱셈을 다룹니다. C = A × B를 2D NDRange로 자연스럽게 풀 수 있습니다.

```c
__kernel void matmul(__global const float* A,
                     __global const float* B,
                     __global float* C,
                     int N)
{
    int row = get_global_id(0);
    int col = get_global_id(1);
    float sum = 0.0f;
    for (int k = 0; k < N; k++) {
        sum += A[row * N + k] * B[k * N + col];
    }
    C[row * N + col] = sum;
}
```

각 work-item이 결과 행렬의 한 원소를 계산합니다. NDRange는 `{ N, N }`이고, 모든 원소가 동시에 계산됩니다. 다만 이 단순한 버전은 global memory를 너무 자주 읽기 때문에 빠르지 않습니다. 책은 다음 단계로 *local memory를 활용한 타일링*을 보여줍니다.

타일링의 발상은 다음과 같습니다. 한 work-group이 결과 행렬의 *작은 타일*을 맡습니다. 그 타일을 계산하는 데 필요한 A의 행 조각과 B의 열 조각을 *한 번만* local memory에 올려두고, work-group 안의 모든 work-item이 그 조각을 반복해서 읽습니다. global memory 접근 횟수가 N에서 N/타일 크기 수준으로 줄어듭니다.

## 메모리 계층

OpenCL의 메모리 모델은 네 단계이고, 단계마다 속도와 범위가 크게 다릅니다.

| 메모리 | 크기 | 속도 | 범위 |
|--------|------|------|------|
| Global | GB 단위 | 가장 느림 (수백 cycle) | 모든 work-item 공유 |
| Constant | 작음 | 캐시됨 | 읽기 전용, 모든 work-item |
| Local | KB 단위 | 매우 빠름 | 같은 work-group 안에서 공유 |
| Private | 수십 bytes | 가장 빠름 | work-item 전용 |

행렬 곱셈을 빠르게 만들려면 한 work-group이 입력의 일부 *타일*을 local memory에 한 번 올린 뒤 그 안에서 반복적으로 읽습니다. global memory 접근 횟수가 N에서 N/타일 크기 수준으로 줄어듭니다.

OpenCL 표준이 이 네 단계 계층을 *명시적으로* 노출한다는 점도 중요합니다. 일반적인 CPU 코드에서는 L1, L2, L3 캐시가 하드웨어가 알아서 관리하지만, OpenCL은 어떤 데이터가 어느 메모리에 있는지를 프로그래머가 직접 결정합니다. 성능 책임이 프로그래머에게 옮겨오는 대신, 데이터 흐름을 명시할 수 있는 표현력을 얻습니다.

![OpenCL 메모리 계층 — 위로 갈수록 빠르고 작음, 아래로 갈수록 크고 느림](/images/blog/seven-concurrency-models/diagrams/ch06-memory-hierarchy.svg)

## Coalesced 메모리 접근

GPU의 global memory는 하나의 work-item을 위해서가 아니라 *연속된 work-item 묶음*을 위해 한 번에 큰 줄을 읽어옵니다. 그래서 연속한 work-item들이 *연속한 주소*를 읽으면 메모리 트랜잭션 한 번으로 모두 해결됩니다. 이것을 *coalesced access*라고 부릅니다.

| 패턴 | 예 | 결과 |
|------|-----|------|
| Coalesced | work-item i가 `data[i]` | 한 번의 메모리 트랜잭션 |
| Strided | work-item i가 `data[i * stride]` | 여러 트랜잭션, 대역폭 낭비 |
| Random | work-item i가 `data[hash(i)]` | 매우 느림 |

행렬 곱셈에서 행 방향과 열 방향의 접근 패턴이 다른 이유, 그리고 transpose 트릭이 성능을 크게 바꾸는 이유가 여기에 있습니다. row-major 저장이라면 *행을 따라가는* 접근이 자연스럽게 coalesced가 됩니다. 열을 따라가는 접근은 stride가 N이라 한 트랜잭션이 한 원소만 가져오게 됩니다.

### 직관 — 도서관 사서와 책 배달

조금 더 구체적인 비유로 옮겨 보겠습니다. work-item 32명이 한 줄에 *나란히 앉아 있다고* 상상합니다. 사서가 책을 한 번에 가져올 때, *연속한 책장 한 칸*을 통째로 들고 와서 32명에게 한 권씩 나눠줄 수 있습니다. 자리 순서와 책 순서가 일치하면, *왕복 한 번*에 32명이 모두 책을 받습니다. 이것이 coalesced access입니다.

반대로 학생들이 "나는 1번 책장", "나는 3번 책장", "나는 5번 책장"처럼 *두 칸씩 건너뛴* 위치의 책을 원하면, 사서는 매번 책장 사이를 왕복해야 합니다. 같은 32명에게 책 한 권씩 주는데 왕복이 16번 필요해집니다. 이것이 strided access이고, 대역폭이 그대로 16분의 1로 줄어듭니다. 학생마다 *무작위 위치*의 책을 요청하면 더 나빠집니다.

local memory와 global memory의 차이도 같은 비유로 정리됩니다. global memory는 *건물 지하의 큰 자료실*이고, local memory는 *팀 자리에 있는 작은 화이트보드*입니다. 자료실까지 다녀오면 수백 사이클이 사라지지만, 화이트보드는 손만 뻗으면 닿습니다. 한 팀이 같은 정보를 여러 번 봐야 한다면 화이트보드에 한 번 옮겨 적은 뒤 그 안에서 돌려 보는 편이 압도적으로 빠릅니다. 행렬 곱셈의 타일링이 정확히 이 그림입니다.

책은 이 점을 두고, 같은 알고리즘이라도 *데이터 레이아웃을 어떻게 잡느냐*가 성능을 결정한다고 강조합니다. CPU 코드에서는 보통 의식하지 않던 메모리 접근 순서가, GPU에서는 알고리즘 선택과 같은 수준의 결정 사항이 됩니다.


## 책의 시각적 예 — Life와 Mandelbrot

책은 2D NDRange의 강점을 살리는 두 가지 시각적 사례를 제시합니다.

Conway의 Game of Life는 셀 하나의 다음 상태가 주변 여덟 셀에만 의존합니다. 한 work-item이 한 셀을 맡으면 자연스럽게 병렬화됩니다. 이전 세대를 한 버퍼에 두고 다음 세대를 다른 버퍼에 쓰는 *ping-pong* 패턴이 등장합니다. 한 NDRange 실행이 한 세대를 만들고, 호스트가 두 버퍼 포인터를 바꿔서 다시 enqueue합니다.

```c
__kernel void life_step(__global const uchar* in,
                        __global uchar* out,
                        int width, int height)
{
    int x = get_global_id(0);
    int y = get_global_id(1);
    int n = 0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            int xx = (x + dx + width) % width;
            int yy = (y + dy + height) % height;
            n += in[yy * width + xx];
        }
    }
    uchar self = in[y * width + x];
    out[y * width + x] = (n == 3) || (self && n == 2);
}
```

Mandelbrot 집합은 각 픽셀이 독립적인 반복 계산입니다. 정확히 *embarrassingly parallel*에 해당하고, GPU의 강점이 가장 잘 드러나는 문제입니다. 다만 픽셀마다 수렴 속도가 달라 분기 비용이 생기는 점은 주의해야 합니다. 한 워프 안의 픽셀 중 절반이 빨리 발산하고 절반이 끝까지 반복하면, 빨리 끝난 work-item은 마스크 상태로 대기하면서 *느린 동료*를 기다립니다.

## Day 3 — OpenCL Cookbook

Day 3은 실전 패턴 모음입니다. 단순한 element-wise 연산을 넘어, *데이터를 가로지르는* 계산을 GPU에서 어떻게 표현하는지를 다룹니다. 책은 이 장을 의도적으로 *cookbook*이라 부릅니다. reduction, scan, profiling 같은 재료를 한 번씩 손에 익히면 대부분의 데이터 병렬 알고리즘을 조합으로 만들 수 있습니다.

Day 1과 Day 2가 *각 work-item이 독립적인 문제*에 집중했다면, Day 3은 *work-item 사이에 의존이 있는* 문제로 한 걸음 옮겨갑니다. 합계나 누적합처럼 결과가 하나로 모이거나 앞 원소에 의존하는 계산이 그 예입니다. local memory와 barrier가 본격적으로 쓰이는 곳도 여기부터입니다.

## Tree-based reduction

큰 배열의 합을 구하는 문제는 의외로 까다롭습니다. 인접한 두 원소를 더해 절반으로 줄이는 단계를 log N번 반복합니다. 책의 cookbook 첫 항목입니다.

```c
__kernel void reduce_sum(__global const float* input,
                         __global float* partial,
                         __local float* scratch)
{
    int gid = get_global_id(0);
    int lid = get_local_id(0);
    int group = get_group_id(0);

    scratch[lid] = input[gid];
    barrier(CLK_LOCAL_MEM_FENCE);

    for (int stride = get_local_size(0) / 2; stride > 0; stride >>= 1) {
        if (lid < stride) {
            scratch[lid] += scratch[lid + stride];
        }
        barrier(CLK_LOCAL_MEM_FENCE);
    }

    if (lid == 0) {
        partial[group] = scratch[0];
    }
}
```

한 work-group은 자기 영역의 부분합을 local memory에서 계산해 첫 번째 work-item이 결과를 씁니다. 호스트는 work-group 수만큼 작아진 `partial` 배열을 받고, 같은 kernel을 한 번 더 호출하거나 CPU에서 마무리합니다. 책은 *재귀적 단계*가 데이터 병렬의 표준 패턴임을 강조합니다.

`barrier` 호출이 매 단계마다 필요한 점도 중요합니다. work-group 안의 work-item들이 동시에 진행한다고 단정할 수 없기 때문에, 다음 단계로 넘어가기 전에 모두가 자기 쓰기를 끝냈음을 보장해야 합니다. barrier가 빠지면 race condition으로 결과가 망가집니다.

### 직관 — 토너먼트 결승

reduction을 *토너먼트*로 보면 그림이 쉬워집니다. 128명의 선수가 1라운드에서 옆 사람과 한 번씩 붙어 64명이 됩니다. 2라운드에서 다시 둘씩 붙어 32명이 됩니다. 단계마다 인원이 정확히 절반으로 줄고, 7라운드(`log₂ 128`)가 지나면 우승자 한 명이 남습니다. 합계를 구하는 reduction의 모양이 이 토너먼트와 정확히 같습니다. "이긴다" 대신 "더한다"가 들어갈 뿐입니다.

barrier가 매 라운드 사이에 들어가야 하는 이유도 이 비유로 정리됩니다. 1라운드 결과가 다 나오기 전에 2라운드를 시작하면, 아직 경기 중인 선수가 다음 라운드에 끌려 나가 결과가 엉킵니다. 모든 단계의 *경기가 끝났음*을 확인한 뒤에 다음 라운드를 여는 것이 곧 `barrier(CLK_LOCAL_MEM_FENCE)`입니다.

## Prefix scan

prefix sum 또는 *scan*은 reduction의 자매 문제입니다. 입력 `[a, b, c, d]`로부터 `[a, a+b, a+b+c, a+b+c+d]`를 만드는 연산입니다. 한 work-item이 자기 원소까지의 누적합을 알아야 하므로 순수한 element-wise 병렬로는 풀 수 없습니다. 책은 Hillis-Steele 또는 Blelloch 스타일의 두 패스 알고리즘을 소개하면서, scan이 정렬과 압축처럼 여러 GPU 알고리즘의 기본 블록임을 짚습니다.

scan을 GPU에서 표현하면 다음과 같은 모양이 됩니다. 단계마다 stride를 두 배로 키우면서 자기 위치에서 *stride 앞의 값*을 더합니다.

```c
__kernel void scan_inclusive(__local float* a, int n) {
    int lid = get_local_id(0);
    for (int offset = 1; offset < n; offset <<= 1) {
        float t = (lid >= offset) ? a[lid - offset] : 0.0f;
        barrier(CLK_LOCAL_MEM_FENCE);
        a[lid] += t;
        barrier(CLK_LOCAL_MEM_FENCE);
    }
}
```

log N 단계가 끝나면 모든 work-item이 자기 위치의 누적합을 가집니다. reduction과 같은 *tree 구조*가 형태만 다르게 등장합니다.


## Profiling — CL_QUEUE_PROFILING_ENABLE

성능 측정 없이 최적화하는 것은 의미가 없습니다. OpenCL은 command queue에 프로파일링 옵션을 켜면 각 명령의 정밀한 타이밍을 알려줍니다.

```java
cl_command_queue queue = clCreateCommandQueue(
    context, device, CL_QUEUE_PROFILING_ENABLE, null);

cl_event event = new cl_event();
clEnqueueNDRangeKernel(queue, kernel, 1, null, global, null, 0, null, event);
clWaitForEvents(1, new cl_event[] { event });

long[] start = new long[1], end = new long[1];
clGetEventProfilingInfo(event, CL_PROFILING_COMMAND_START,
    Sizeof.cl_ulong, Pointer.to(start), null);
clGetEventProfilingInfo(event, CL_PROFILING_COMMAND_END,
    Sizeof.cl_ulong, Pointer.to(end), null);

System.out.printf("Kernel time: %.3f ms%n", (end[0] - start[0]) / 1e6);
```

이 타이밍을 host-device 전송 시간과 분리해 측정하면 어느 단계가 병목인지 분명하게 보입니다. 실측 결과는 다음 형태로 나타납니다.

```text
H→D transfer:  1.42 ms
Kernel:        0.31 ms
D→H transfer:  1.38 ms
Total:         3.11 ms
```

작은 입력일수록 전송 시간이 지배합니다. 이 비대칭이 GPGPU 사고의 출발점입니다. 책은 같은 표를 여러 입력 크기로 만들어 보길 권합니다. 어느 크기에서부터 GPU가 *손익분기*를 넘는지 직접 확인하면, 데이터 병렬을 적용할지 말지에 대한 직관이 생깁니다.

## 큰 데이터셋 처리

책은 메모리에 한 번에 올라가지 않는 큰 입력을 *chunk*로 나누어 GPU에 흘려보내는 패턴도 소개합니다. command queue에 비동기 전송과 kernel 호출을 번갈아 넣으면 한 chunk의 kernel이 도는 동안 다음 chunk가 device로 올라갑니다. 이 *overlap*이 잘 맞을 때 전송 비용을 부분적으로 숨길 수 있습니다.


세 단계가 *시간축으로 겹쳐* 흐르도록 만드는 것이 핵심입니다. 한 chunk를 처리하는 동안 다음 chunk가 device로 올라가고 이전 chunk가 host로 내려옵니다. 동기 모드에서 차곡차곡 진행하던 흐름이 비동기 enqueue 한 번으로 파이프라인 형태가 됩니다.

## Java 8 streams와의 짧은 비교

Day 3 끝에서 책은 같은 데이터 병렬 사고가 GPU 없이도 가능하다는 점을 짚으며 Java 8 stream의 `parallelStream()`을 짧게 소개합니다. 같은 element-wise 연산을 한 줄로 표현할 수 있고, 런타임이 fork/join으로 CPU 코어에 펼쳐줍니다.

```java
double sum = Arrays.stream(values)
    .parallel()
    .map(x -> x * x)
    .sum();
```

CPU 코어 수가 4~16 수준이라면 stream의 속도 향상은 같은 수준에 머무릅니다. GPU의 수천 work-item과는 한 단계 다른 규모입니다. 다만 host-device 전송 비용이 큰 작은 입력에서는 stream이 더 빠를 수 있습니다. 책은 *문제의 크기와 모양*이 도구 선택을 결정한다고 결론짓습니다.

같은 발상이 도구의 표면을 바꿔가며 반복된다는 점도 책의 메시지 중 하나입니다. SIMD intrinsic, GPU kernel, parallel stream은 표현 방식이 다르지만 *원소별 독립*이라는 공통의 모양을 공유합니다. 데이터 병렬을 한 번 익혀두면, 새 도구를 만났을 때도 같은 사고로 바로 옮길 수 있습니다.

## Day별 정리

세 Day의 메시지를 한 표로 모으면 다음과 같습니다.

| Day | 주제 | 핵심 개념 | 책의 대표 예제 |
|-----|------|-----------|----------------|
| Day 1 | GPGPU Programming | platform, device, context, queue, work-item, NDRange | 8KB 벡터 덧셈 |
| Day 2 | Multi-Dimensional Data | 2D NDRange, local memory, coalesced access | 행렬 곱셈, Game of Life, Mandelbrot |
| Day 3 | OpenCL Cookbook | reduction, scan, profiling, chunking | tree-based sum, scan, 큰 입력 파이프라인 |

이 위계가 그대로 OpenCL 학습 곡선입니다. Day 1에서 호스트 코드의 의식을 익히고, Day 2에서 메모리 모델을 들여다보며, Day 3에서 *교차 의존이 있는* 알고리즘 패턴을 만나는 순서가 자연스럽습니다.

## GPU가 잘 맞지 않는 문제

GPU의 강점은 "모두에게 같은 지시"라는 전제 위에 있습니다. 이 전제가 깨지는 순간 처리량이 빠르게 무너집니다. 책의 약점 절을 좀 더 직관적으로 풀어 보면 다음과 같은 모양이 보입니다.

**팀 안에서 지시가 갈리는 작업** — 같은 work-group(같은 warp)의 일꾼들이 "나는 if 쪽", "나는 else 쪽"으로 갈리면, GPU는 if를 모두 실행한 뒤 else를 다시 모두 실행합니다. 학생 32명에게 *왼팔 동작과 오른팔 동작을 차례로 시켜야* 했던 상황과 같습니다. 일이 절반으로 줄어드는 게 아니라 *두 배로 늘어납니다*. 이 현상을 *warp divergence*라고 부르고, GPU 코드에서 가장 흔한 성능 함정입니다.

**원소가 앞 원소에 의존하는 작업** — 피보나치처럼 결과가 이전 값에 묶이면 동시 진행이 불가능합니다. 1024명이 같이 출발해도 1번 일꾼이 끝나야 2번이 시작할 수 있다면, 1024명이 *직렬로 줄을 서서* 일하는 셈입니다.

**조각이 작거나 자주 왕복하는 작업** — host와 device 사이의 전송 비용이 계산 시간을 넘는 입력은 GPU에 올릴수록 손해입니다. 자료실까지 책 두 권을 가지러 왕복하는 데 5분이 걸리는데, 책 두 권을 *읽는* 데는 30초뿐이라면 자리에서 그냥 읽는 편이 빠른 것과 같습니다.

**불규칙한 데이터 구조** — 트리 순회, 그래프 탐색처럼 *각 일꾼이 따라가는 경로가 다른* 작업은 GPU의 균질성 가정과 충돌합니다. 코어 수가 적어도 분기 자유도가 높은 CPU가 더 잘합니다.

| 잘 맞는 문제의 모양 | 잘 맞지 않는 문제의 모양 |
|---------------------|--------------------------|
| 모든 일꾼이 같은 코드를 같은 순서로 | 일꾼마다 다른 분기를 타야 함 |
| 원소가 서로 독립 | 결과가 앞 원소에 의존 |
| 데이터가 크고 한 번 올려 오래 굴림 | 데이터가 작거나 자주 왕복 |
| 격자 / 행렬 / 픽셀처럼 균질 | 트리 / 그래프처럼 불규칙 |

이 표 한 장이 GPGPU를 적용할지 말지를 *문제 단계에서* 가늠해 보는 기준이 됩니다.

## 시스템 사례 — 산업 현장의 데이터 병렬

데이터 병렬이 책 안의 이야기로만 머무르지 않는다는 점도 짚어 두면 좋습니다. 같은 사고가 산업 현장에서 어떻게 작동하고 있는지를 몇 가지 굵직한 사례로 살펴봅니다.

**딥러닝 학습** — NVIDIA의 CUDA가 사실상 표준이 된 분야입니다. 신경망 학습의 핵심 연산은 거대한 행렬 곱셈이고, 정확히 GPU의 모양과 일치합니다. 책의 행렬 곱셈 kernel을 수천 배 키운 것이 cuBLAS와 cuDNN의 본질입니다. 한 모델을 학습하는 데 GPU 한 대로 며칠, 클러스터로 몇 시간이 걸리는 규모가 가능한 것은 데이터 병렬 모델이 *모델 학습 한 단계가 곧 한 NDRange*라는 모양에 잘 맞기 때문입니다.

**Bitcoin / 암호화폐 채굴** — SHA-256 해시를 *수십억 번* 시도해 조건을 만족하는 nonce를 찾는 작업입니다. 각 시도는 다른 시도와 완전히 독립이고, 분기도 거의 없습니다. 정확히 embarrassingly parallel의 교과서적 예이고, GPU가 CPU보다 수십~수백 배 빠른 이유가 책의 모델로 그대로 설명됩니다. 나중에 ASIC이 GPU를 대체한 것도 같은 논리의 연장입니다. 같은 일만 반복할 거라면 *전용 회로*가 더 효율적입니다.

**Adobe Premiere / DaVinci Resolve** — 영상 편집의 색 보정, 노이즈 제거, 효과 합성은 한 프레임의 모든 픽셀에 같은 연산을 적용하는 일입니다. 4K 한 프레임이 800만 픽셀이라는 점을 생각하면, 한 work-item이 한 픽셀을 맡는 NDRange가 자연스러운 해법이 됩니다. 실시간 미리보기가 가능한 이유의 절반은 GPU 가속이 차지합니다.

**Pixar / Disney 렌더링** — 광선 추적(ray tracing) 한 장면이 수억 개의 광선을 각자 다른 경로로 추적합니다. 각 광선은 다른 광선과 독립이라 데이터 병렬과 잘 맞지만, 광선마다 만나는 표면이 달라 *분기가 갈리는* 단점도 함께 있습니다. 그래서 영화 렌더팜은 CPU와 GPU를 함께 사용하고, NVIDIA OptiX 같은 라이브러리는 *광선을 모양별로 묶어* 같은 분기를 한 warp에 모으는 정렬 단계를 거칩니다. 책의 SIMT 분기 비용을 산업이 어떻게 우회하는지 보여주는 좋은 예입니다.

**과학 시뮬레이션** — 유체 역학, 기상 예보, 입자 시뮬레이션 모두 격자나 입자 배열 위에서 같은 방정식을 풀어 갑니다. 한 격자 셀이 한 work-item이 되는 자연스러운 사상이 가능합니다. 슈퍼컴퓨터의 최상위가 점점 더 GPU 비중을 키워가는 흐름도 이 모양에서 옵니다.

이 사례들이 공유하는 패턴은 단순합니다. *큰 균질 격자*에 *같은 연산*을 *한 번에 오래* 굴리는 모양이라면 GPU가 압도적입니다. 책의 6장이 가르치는 것이 바로 그 모양을 알아보고 OpenCL의 어휘로 옮기는 능력입니다.

## Wrap-Up — 강점

대용량 데이터에 대한 throughput은 압도적입니다. 같은 연산을 수천 개 work-item에 펼치면 CPU와는 단위가 다른 처리량이 나옵니다. 행렬 연산, 이미지 필터, 시뮬레이션, 신경망 추론처럼 *구조가 잘 정의된* 문제에서 특히 강합니다.

throughput당 전력 효율도 CPU보다 우월하기 때문에 데이터센터에서도 점점 비중이 커집니다. 책은 데이터 병렬을 *embarrassingly parallel* 문제의 가장 자연스러운 해법으로 위치시킵니다. 픽셀, 셀, 입자, 행렬 원소처럼 *균질한 원소가 큰 격자에 깔린* 도메인이 정확히 GPU의 모양과 맞습니다.

## Wrap-Up — 약점

GPU는 *embarrassingly parallel*에 가까운 문제에만 잘 맞습니다. 의존성이 강한 알고리즘이나 분기가 많은 알고리즘에서는 성능이 폭락합니다. host와 device 사이의 메모리 전송 비용은 항상 무시할 수 없는 오버헤드이고, 작은 입력에서는 이 비용이 계산 시간을 넘기는 경우가 흔합니다.

디버깅과 정확성 검증도 까다롭습니다. 부동소수점 연산 순서가 CPU와 달라 결과가 *비트 단위로는* 같지 않을 수 있습니다. 하드웨어 종속도 무시할 수 없습니다. OpenCL이 표준이라고는 해도, 실제 성능은 device 벤더와 드라이버 구현에 크게 좌우됩니다.

| 항목 | 잘 맞는 경우 | 잘 맞지 않는 경우 |
|------|---------------|---------------------|
| 데이터 모양 | 균질한 큰 배열 / 격자 | 불규칙한 그래프, 트리 |
| 의존성 | 원소별 독립 | 직렬 의존, Fibonacci식 |
| 분기 | 없음 또는 균일 | work-item마다 분기 |
| 데이터 크기 | 큼, 한 번 올려 오래 굴림 | 작음, 자주 왕복 |

## Lambda Architecture로 가는 다리

Chapter 6은 한 머신 안의 데이터 병렬을 다룹니다. 다음 chapter는 시선을 다시 넓혀 *여러 머신에 걸친* 데이터 병렬을 다룹니다. GPU에서 work-item이 동시에 굴러가던 것과 같은 발상이, 클러스터에서는 노드들이 배치 또는 스트림 단위로 데이터를 흘려보내는 형태로 옮겨갑니다.

한 머신의 NDRange는 클러스터의 partition으로, work-group의 local memory는 노드 안 캐시로 자연스럽게 사상됩니다. embarrassingly parallel이라는 문제의 모양은 그대로 가져가되, 단위가 *수천 work-item*에서 *수십 노드*로 한 자릿수 넘게 커진다는 점만 다릅니다.

## 정리

- **데이터 병렬**은 같은 작업을 여러 데이터에 동시에 적용하는 모델입니다.
- **SIMD / MIMD / SIMT**는 하드웨어 차원의 데이터 병렬 분류이고, GPU는 SIMT에 해당합니다.
- **OpenCL의 네 객체**인 platform, device, context, command queue가 호스트 코드의 골격을 결정합니다.
- **Work-item / work-group / NDRange**의 위계가 인덱스 공간과 메모리 공유 범위를 함께 정의합니다.
- **메모리 계층**은 global / constant / local / private의 네 단계이고, local memory 활용이 성능의 핵심입니다.
- **Coalesced access**가 보장되어야 global memory 대역폭이 살아납니다.
- **Reduction과 scan**은 데이터 병렬의 두 기둥 패턴입니다.
- **Profiling**으로 host-device 전송과 kernel 시간을 분리해 보아야 병목이 보입니다.
- **작은 입력**에서는 GPU가 CPU보다 느릴 수 있고, *문제의 모양*이 도구 선택을 결정합니다.

## 자기 점검

- [ ] SIMD, MIMD, SIMT의 차이를 한 문장씩 설명할 수 있습니까?
- [ ] OpenCL의 platform, device, context, command queue의 관계를 그릴 수 있습니까?
- [ ] vector addition kernel을 외워서 작성할 수 있습니까?
- [ ] work-item, work-group, NDRange의 위계가 왜 필요한지 설명할 수 있습니까?
- [ ] 행렬 곱셈을 local memory 타일링으로 빠르게 만드는 직관을 가지고 있습니까?
- [ ] tree-based reduction에서 barrier가 왜 단계마다 필요한지 말할 수 있습니까?
- [ ] `CL_QUEUE_PROFILING_ENABLE`을 켜서 kernel 시간만 따로 잴 수 있습니까?
- [ ] embarrassingly parallel이 아닌 문제에 GPU를 무리하게 적용하면 어떻게 되는지 말할 수 있습니까?

## 다음 장 예고

마지막 장은 **Lambda Architecture**입니다. 한 머신의 데이터 병렬을 *여러 머신*에 걸친 배치와 스트리밍 처리로 확장합니다. GPU에서 work-item이 굴러가던 발상이 클러스터의 partition으로 옮겨가는 모습을 봅니다.

## 관련 항목

- [Ch 5: CSP](/blog/parallel/seven-concurrency-models/ch05-csp)
- [Ch 7: Lambda Architecture](/blog/parallel/seven-concurrency-models/ch07-lambda-architecture)
- [AMP Ch 12: Counting Networks](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination) — 정렬 네트워크 (SIMD)
- [C++ Concurrency in Action Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
