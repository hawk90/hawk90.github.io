---
title: "Ch 29: 테스트 벡터 검증"
date: 2025-10-02T06:00:00
description: "AV1 디코더 검증 — AOMedia CTC 테스트 벡터, 바이트 단위 비교, 디버깅 전략, 최종 마일스톤."
tags: [AV1, Video, Codec, Test, Conformance, Verification]
series: "AV1"
seriesOrder: 29
draft: true
---

AV1 디코더 구현이 완료되었다면, 이제 **검증** 단계가 필요하다. 디코더가 스펙을 올바르게 구현했는지 확인하는 가장 확실한 방법은 **공식 테스트 벡터**를 사용하는 것이다. AOMedia가 제공하는 테스트 벡터와 참조 디코더(dav1d)의 출력을 비교하여 구현의 정확성을 검증한다.

---

## 29.1 테스트 벡터란?

### 개념

테스트 벡터는 **미리 정의된 입출력 쌍**이다.

```
테스트 벡터의 구조:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  테스트 벡터 = 입력 비트스트림 + 예상 출력         │
│                                                     │
│  입력: ┌────────────────────┐                       │
│        │ AV1 비트스트림     │ (.ivf, .obu, .webm)  │
│        │ (인코딩된 데이터)  │                       │
│        └────────────────────┘                       │
│                 │                                   │
│                 ▼                                   │
│        ┌────────────────────┐                       │
│        │    AV1 디코더      │ (테스트 대상)        │
│        └────────────────────┘                       │
│                 │                                   │
│                 ▼                                   │
│  출력: ┌────────────────────┐                       │
│        │ 디코딩된 프레임    │ (.y4m, .yuv)         │
│        │ (픽셀 데이터)      │                       │
│        └────────────────────┘                       │
│                 │                                   │
│                 ▼                                   │
│        ┌────────────────────┐                       │
│        │ 예상 출력과 비교   │ (바이트 단위)        │
│        └────────────────────┘                       │
│                 │                                   │
│                 ▼                                   │
│        일치하면 PASS, 불일치하면 FAIL               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 왜 테스트 벡터가 필요한가?

```
검증 방법 비교:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. 육안 검사:                                      │
│     "화면이 깨지지 않는다" → 불충분                 │
│     - 미세한 오류 놓침                              │
│     - 재현 불가능                                   │
│                                                     │
│  2. PSNR/SSIM 비교:                                 │
│     "품질 지표가 높다" → 불충분                     │
│     - 어느 정도 오차를 허용해야 하는지 불명확       │
│     - 스펙 준수 여부 판단 불가                      │
│                                                     │
│  3. 테스트 벡터 검증:                               │
│     "바이트 단위로 일치한다" → 정확                 │
│     - 재현 가능                                     │
│     - 스펙 준수 증명                                │
│     - 자동화 가능                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### AV1 스펙과 Conformance

AV1 스펙 **Section 8 (Conformance)**에서 정의:

```
스펙 요구사항:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  "A conforming AV1 decoder shall produce          │
│   output that is bit-exact with the specified      │
│   reference output for all applicable test         │
│   vectors."                                         │
│                                                     │
│  번역:                                              │
│  "적합한 AV1 디코더는 해당되는 모든 테스트        │
│   벡터에 대해 지정된 참조 출력과 비트 단위로       │
│   일치하는 출력을 생성해야 한다."                   │
│                                                     │
│  의미:                                              │
│    - "대충 비슷하다"가 아니라 "정확히 일치"        │
│    - 한 픽셀이라도 다르면 부적합                    │
│    - Profile/Level에 따른 지원 범위 차이 허용       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 29.2 AOMedia CTC 테스트 벡터

### AOMedia Common Test Conditions (CTC)

AOMedia는 코덱 개발과 검증을 위한 **Common Test Conditions**를 정의한다.

```
AOMedia CTC 구조:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  AOMedia CTC (Common Test Conditions)               │
│  │                                                  │
│  ├── Test Sequences:                                │
│  │   - 표준 입력 영상 (Objective-1-a 등)           │
│  │   - 다양한 해상도, 프레임레이트                  │
│  │                                                  │
│  ├── Encoding Configurations:                       │
│  │   - 인코딩 파라미터 세트                         │
│  │   - 압축 효율 측정용                             │
│  │                                                  │
│  └── Test Vectors:                                  │
│      - 디코더 적합성 검증용                         │
│      - 스펙의 모든 기능 커버                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 테스트 벡터 소스

공식 테스트 벡터는 여러 저장소에서 제공된다.

```
테스트 벡터 획득처:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. AOM-TEST-VECTORS (공식):                        │
│     URL: aomedia.org/test-vectors/                  │
│     내용: 공식 적합성 테스트 벡터                   │
│     형식: .ivf + MD5 체크섬                         │
│                                                     │
│  2. libaom 저장소:                                  │
│     URL: aomedia.googlesource.com/aom/              │
│     경로: test/data/                                │
│     내용: 개발/테스트용 벡터                        │
│     특징: 다양한 기능별 테스트                      │
│                                                     │
│  3. dav1d 저장소:                                   │
│     URL: code.videolan.org/videolan/dav1d-test-data │
│     내용: dav1d 검증용 벡터                         │
│     특징: 참조 출력(.md5) 포함                      │
│                                                     │
│  4. av1-spec 저장소:                                │
│     URL: github.com/AOMMediaCodec/av1-spec          │
│     내용: 스펙 문서 + 예제 비트스트림               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 테스트 벡터 다운로드

```bash
# libaom 테스트 데이터 다운로드
git clone https://aomedia.googlesource.com/aom/
cd aom/test/data/

# 또는 개별 파일 다운로드
wget https://storage.googleapis.com/aom-test-data/av1-1-b8-00-quantizer-00.ivf
wget https://storage.googleapis.com/aom-test-data/av1-1-b8-00-quantizer-00.ivf.md5

# dav1d 테스트 데이터
git clone https://code.videolan.org/videolan/dav1d-test-data.git
```

### 벡터 카테고리

테스트 벡터는 **기능별로 분류**된다.

```
카테고리별 테스트 벡터:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. 기본 디코딩:                                    │
│     ├── Intra-only (키프레임만)                     │
│     │   - av1-1-b8-00-quantizer-*.ivf              │
│     │   - 양자화 파라미터 변화 테스트               │
│     │                                               │
│     └── Inter (예측 프레임 포함)                    │
│         - av1-1-b8-01-size-*.ivf                   │
│         - 다양한 해상도 테스트                      │
│                                                     │
│  2. 고급 기능:                                      │
│     ├── Film Grain:                                 │
│     │   - av1-1-b8-05-fg-*.ivf                     │
│     │   - Film Grain 합성 테스트                    │
│     │                                               │
│     ├── Tiles:                                      │
│     │   - av1-1-b8-06-tile-*.ivf                   │
│     │   - 타일 분할/병렬 디코딩                     │
│     │                                               │
│     ├── Loop Filters:                               │
│     │   - av1-1-b8-02-lf-*.ivf                     │
│     │   - Deblocking, CDEF, LR                      │
│     │                                               │
│     └── Segmentation:                               │
│         - av1-1-b8-04-seg-*.ivf                    │
│         - 세그먼트별 QP 변화                        │
│                                                     │
│  3. Profile/Level:                                  │
│     ├── Main Profile (8-bit):                       │
│     │   - av1-1-b8-*.ivf                           │
│     │                                               │
│     ├── High Profile (10-bit):                      │
│     │   - av1-1-b10-*.ivf                          │
│     │                                               │
│     └── 4:2:2, 4:4:4:                               │
│         - av1-1-b10-23-*.ivf                       │
│                                                     │
│  4. 엣지 케이스:                                    │
│     ├── 최소 해상도 (8×8)                           │
│     ├── 최대 해상도 (8192×4352)                     │
│     ├── 비정상 종횡비                               │
│     └── 오류 복구 테스트                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 벡터 명명 규칙

```
파일명 해석:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  예: av1-1-b8-02-lf-01.ivf                         │
│      │   │ │  │  │   │                              │
│      │   │ │  │  │   └── 시퀀스 번호               │
│      │   │ │  │  └────── 기능 코드 (lf=loop filter)│
│      │   │ │  └───────── 기능 카테고리 번호        │
│      │   │ └──────────── 비트 심도 (8=8-bit)       │
│      │   └────────────── 스펙 버전 (1=AV1)         │
│      └────────────────── 코덱 (av1)                │
│                                                     │
│  기능 코드:                                         │
│    quantizer → 양자화 테스트                        │
│    size      → 해상도 테스트                        │
│    lf        → Loop Filter 테스트                   │
│    ref       → 참조 프레임 테스트                   │
│    seg       → Segmentation 테스트                  │
│    fg        → Film Grain 테스트                    │
│    tile      → 타일 테스트                          │
│    cdef      → CDEF 테스트                          │
│    lr        → Loop Restoration 테스트              │
│    superres  → Superres 테스트                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 29.3 검증 방법

### 전체 검증 흐름

```
검증 파이프라인:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [테스트 벡터 획득]                                 │
│         │                                           │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ .ivf 비트스트림 │                                │
│  └────────┬────────┘                                │
│           │                                         │
│           ├────────────────┬───────────────┐        │
│           ▼                ▼               ▼        │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ 내 디코더   │  │ dav1d       │  │ 예상 출력  │  │
│  │ (테스트용)  │  │ (참조)      │  │ (.md5)     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │               │          │
│         ▼                ▼               │          │
│  ┌─────────────┐  ┌─────────────┐        │          │
│  │ 내 출력     │  │ 참조 출력   │        │          │
│  │ (.yuv)      │  │ (.yuv)      │        │          │
│  └──────┬──────┘  └──────┬──────┘        │          │
│         │                │               │          │
│         └────────┬───────┘               │          │
│                  │                       │          │
│                  ▼                       │          │
│         ┌─────────────────┐              │          │
│         │ 바이트 비교     │◀─────────────┘          │
│         └────────┬────────┘                         │
│                  │                                  │
│                  ▼                                  │
│         일치: PASS / 불일치: FAIL                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### dav1d로 참조 출력 생성

**dav1d**는 가장 빠르고 정확한 AV1 참조 디코더다.

```bash
# dav1d 빌드
git clone https://code.videolan.org/videolan/dav1d.git
cd dav1d
meson build --buildtype release
ninja -C build

# 참조 출력 생성
./build/tools/dav1d -i input.ivf -o reference.yuv

# 또는 y4m 형식으로
./build/tools/dav1d -i input.ivf -o reference.y4m

# MD5 체크섬 계산
./build/tools/dav1d -i input.ivf --muxer md5 -o reference.md5
```

### 바이트 단위 비교

```cpp
#include <fstream>
#include <vector>
#include <iostream>

// 두 YUV 파일의 바이트 단위 비교
struct ComparisonResult {
    bool match;
    size_t first_diff_offset;
    uint8_t expected_byte;
    uint8_t actual_byte;
    size_t total_bytes;
    size_t diff_count;
};

ComparisonResult compare_yuv_files(
    const std::string& reference_path,
    const std::string& test_path,
    bool verbose = false
) {
    ComparisonResult result = {};

    std::ifstream ref_file(reference_path, std::ios::binary);
    std::ifstream test_file(test_path, std::ios::binary);

    if (!ref_file || !test_file) {
        std::cerr << "파일 열기 실패\n";
        result.match = false;
        return result;
    }

    // 파일 크기 확인
    ref_file.seekg(0, std::ios::end);
    test_file.seekg(0, std::ios::end);
    size_t ref_size = ref_file.tellg();
    size_t test_size = test_file.tellg();
    ref_file.seekg(0);
    test_file.seekg(0);

    if (ref_size != test_size) {
        std::cerr << "파일 크기 불일치: ref=" << ref_size
                  << ", test=" << test_size << "\n";
        result.match = false;
        result.total_bytes = ref_size;
        return result;
    }

    result.total_bytes = ref_size;
    result.match = true;
    result.first_diff_offset = SIZE_MAX;

    // 청크 단위로 비교 (메모리 효율)
    const size_t chunk_size = 1024 * 1024;  // 1MB
    std::vector<uint8_t> ref_chunk(chunk_size);
    std::vector<uint8_t> test_chunk(chunk_size);

    size_t offset = 0;
    while (offset < ref_size) {
        size_t to_read = std::min(chunk_size, ref_size - offset);

        ref_file.read(reinterpret_cast<char*>(ref_chunk.data()), to_read);
        test_file.read(reinterpret_cast<char*>(test_chunk.data()), to_read);

        for (size_t i = 0; i < to_read; ++i) {
            if (ref_chunk[i] != test_chunk[i]) {
                if (result.first_diff_offset == SIZE_MAX) {
                    result.first_diff_offset = offset + i;
                    result.expected_byte = ref_chunk[i];
                    result.actual_byte = test_chunk[i];
                }
                result.diff_count++;
                result.match = false;

                if (verbose && result.diff_count <= 10) {
                    std::cerr << "차이 발견: offset=" << (offset + i)
                              << " expected=0x" << std::hex
                              << (int)ref_chunk[i]
                              << " actual=0x" << (int)test_chunk[i]
                              << std::dec << "\n";
                }
            }
        }

        offset += to_read;
    }

    return result;
}
```

### MD5 체크섬 비교

파일 전체를 비교하는 대신 MD5 해시만 비교할 수도 있다.

```cpp
#include <openssl/md5.h>
#include <fstream>
#include <iomanip>
#include <sstream>

std::string compute_md5(const std::string& filepath) {
    std::ifstream file(filepath, std::ios::binary);
    if (!file) return "";

    MD5_CTX ctx;
    MD5_Init(&ctx);

    char buffer[8192];
    while (file.read(buffer, sizeof(buffer))) {
        MD5_Update(&ctx, buffer, file.gcount());
    }
    if (file.gcount() > 0) {
        MD5_Update(&ctx, buffer, file.gcount());
    }

    unsigned char digest[MD5_DIGEST_LENGTH];
    MD5_Final(digest, &ctx);

    std::ostringstream oss;
    for (int i = 0; i < MD5_DIGEST_LENGTH; ++i) {
        oss << std::hex << std::setfill('0') << std::setw(2)
            << (int)digest[i];
    }
    return oss.str();
}

bool verify_against_md5(
    const std::string& output_path,
    const std::string& expected_md5
) {
    std::string actual_md5 = compute_md5(output_path);

    if (actual_md5.empty()) {
        std::cerr << "MD5 계산 실패: " << output_path << "\n";
        return false;
    }

    bool match = (actual_md5 == expected_md5);

    if (!match) {
        std::cerr << "MD5 불일치:\n";
        std::cerr << "  Expected: " << expected_md5 << "\n";
        std::cerr << "  Actual:   " << actual_md5 << "\n";
    }

    return match;
}
```

### 프레임별 비교

전체 파일 비교가 실패하면 **프레임별 비교**로 문제를 좁힌다.

```cpp
struct FrameComparisonResult {
    int frame_number;
    bool y_match;
    bool u_match;
    bool v_match;
    double y_psnr;
    double u_psnr;
    double v_psnr;
    size_t y_diff_count;
    size_t u_diff_count;
    size_t v_diff_count;
};

class FrameByFrameComparator {
private:
    int width_;
    int height_;
    size_t y_size_;
    size_t uv_size_;
    size_t frame_size_;

public:
    FrameByFrameComparator(int width, int height)
        : width_(width), height_(height) {
        y_size_ = width * height;
        uv_size_ = (width / 2) * (height / 2);  // 4:2:0
        frame_size_ = y_size_ + 2 * uv_size_;
    }

    std::vector<FrameComparisonResult> compare(
        const std::string& ref_path,
        const std::string& test_path
    ) {
        std::vector<FrameComparisonResult> results;

        std::ifstream ref_file(ref_path, std::ios::binary);
        std::ifstream test_file(test_path, std::ios::binary);

        if (!ref_file || !test_file) {
            std::cerr << "파일 열기 실패\n";
            return results;
        }

        std::vector<uint8_t> ref_frame(frame_size_);
        std::vector<uint8_t> test_frame(frame_size_);

        int frame_num = 0;
        while (ref_file.read(reinterpret_cast<char*>(ref_frame.data()),
                            frame_size_) &&
               test_file.read(reinterpret_cast<char*>(test_frame.data()),
                             frame_size_)) {

            FrameComparisonResult fr = {};
            fr.frame_number = frame_num;

            // Y 평면 비교
            auto [y_match, y_diff, y_psnr] = compare_plane(
                ref_frame.data(), test_frame.data(), y_size_
            );
            fr.y_match = y_match;
            fr.y_diff_count = y_diff;
            fr.y_psnr = y_psnr;

            // U 평면 비교
            auto [u_match, u_diff, u_psnr] = compare_plane(
                ref_frame.data() + y_size_,
                test_frame.data() + y_size_,
                uv_size_
            );
            fr.u_match = u_match;
            fr.u_diff_count = u_diff;
            fr.u_psnr = u_psnr;

            // V 평면 비교
            auto [v_match, v_diff, v_psnr] = compare_plane(
                ref_frame.data() + y_size_ + uv_size_,
                test_frame.data() + y_size_ + uv_size_,
                uv_size_
            );
            fr.v_match = v_match;
            fr.v_diff_count = v_diff;
            fr.v_psnr = v_psnr;

            results.push_back(fr);

            if (!y_match || !u_match || !v_match) {
                std::cerr << "Frame " << frame_num << " 불일치: "
                          << "Y_diff=" << y_diff
                          << " U_diff=" << u_diff
                          << " V_diff=" << v_diff << "\n";
            }

            frame_num++;
        }

        return results;
    }

private:
    std::tuple<bool, size_t, double> compare_plane(
        const uint8_t* ref,
        const uint8_t* test,
        size_t size
    ) {
        size_t diff_count = 0;
        uint64_t sse = 0;

        for (size_t i = 0; i < size; ++i) {
            if (ref[i] != test[i]) {
                diff_count++;
                int diff = static_cast<int>(ref[i]) -
                          static_cast<int>(test[i]);
                sse += diff * diff;
            }
        }

        double mse = (diff_count > 0) ?
                     static_cast<double>(sse) / diff_count : 0.0;
        double psnr = (mse > 0) ?
                      10.0 * log10(255.0 * 255.0 / mse) : INFINITY;

        return {diff_count == 0, diff_count, psnr};
    }
};
```

---

## 29.4 디버깅 전략

### 문제 격리 접근법

테스트가 실패하면 **체계적으로 문제를 좁혀간다**.

```
문제 격리 단계:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Level 1: 어떤 테스트 벡터가 실패하는가?           │
│           │                                         │
│           ▼                                         │
│  Level 2: 어떤 프레임이 실패하는가?                │
│           │                                         │
│           ▼                                         │
│  Level 3: 어떤 평면(Y/U/V)이 실패하는가?           │
│           │                                         │
│           ▼                                         │
│  Level 4: 어떤 슈퍼블록이 실패하는가?              │
│           │                                         │
│           ▼                                         │
│  Level 5: 어떤 블록이 실패하는가?                  │
│           │                                         │
│           ▼                                         │
│  Level 6: 어떤 처리 단계가 실패하는가?             │
│           - 예측? 변환? 양자화? 필터?               │
│           │                                         │
│           ▼                                         │
│  Level 7: 정확한 버그 위치 특정                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 단계별 비교

디코딩의 각 단계에서 중간 출력을 비교한다.

```cpp
// 디버그용 중간 데이터 덤프
class DecoderDebugger {
private:
    std::string output_dir_;
    int frame_number_ = 0;

public:
    DecoderDebugger(const std::string& output_dir)
        : output_dir_(output_dir) {
        std::filesystem::create_directories(output_dir);
    }

    // 예측 결과 덤프
    void dump_prediction(
        int sb_row, int sb_col,
        const Block& block,
        const std::vector<int16_t>& prediction
    ) {
        std::string filename = output_dir_ + "/frame_" +
            std::to_string(frame_number_) + "_sb_" +
            std::to_string(sb_row) + "_" + std::to_string(sb_col) +
            "_pred.bin";

        std::ofstream file(filename, std::ios::binary);
        file.write(reinterpret_cast<const char*>(prediction.data()),
                   prediction.size() * sizeof(int16_t));
    }

    // 잔차 덤프
    void dump_residual(
        int sb_row, int sb_col,
        const Block& block,
        const std::vector<int16_t>& residual
    ) {
        std::string filename = output_dir_ + "/frame_" +
            std::to_string(frame_number_) + "_sb_" +
            std::to_string(sb_row) + "_" + std::to_string(sb_col) +
            "_residual.bin";

        std::ofstream file(filename, std::ios::binary);
        file.write(reinterpret_cast<const char*>(residual.data()),
                   residual.size() * sizeof(int16_t));
    }

    // 필터 전 프레임 덤프
    void dump_pre_filter(const Frame& frame) {
        std::string filename = output_dir_ + "/frame_" +
            std::to_string(frame_number_) + "_pre_filter.yuv";
        dump_frame(filename, frame);
    }

    // 필터 후 프레임 덤프
    void dump_post_filter(const Frame& frame) {
        std::string filename = output_dir_ + "/frame_" +
            std::to_string(frame_number_) + "_post_filter.yuv";
        dump_frame(filename, frame);
    }

    void next_frame() {
        frame_number_++;
    }

private:
    void dump_frame(const std::string& filename, const Frame& frame) {
        std::ofstream file(filename, std::ios::binary);
        // Y
        for (int y = 0; y < frame.height; ++y) {
            file.write(reinterpret_cast<const char*>(
                frame.y_plane.data() + y * frame.y_stride),
                frame.width);
        }
        // U
        for (int y = 0; y < frame.height / 2; ++y) {
            file.write(reinterpret_cast<const char*>(
                frame.u_plane.data() + y * frame.uv_stride),
                frame.width / 2);
        }
        // V
        for (int y = 0; y < frame.height / 2; ++y) {
            file.write(reinterpret_cast<const char*>(
                frame.v_plane.data() + y * frame.uv_stride),
                frame.width / 2);
        }
    }
};
```

### dav1d 디버그 빌드

dav1d를 디버그 모드로 빌드하여 상세 로그를 출력한다.

```bash
# dav1d 디버그 빌드
cd dav1d
meson setup build_debug --buildtype debug -Dlogging=true
ninja -C build_debug

# 상세 로그 활성화
./build_debug/tools/dav1d -i test.ivf -o output.yuv \
    --framedelay 1 \
    2>debug.log

# 프레임별 정보 확인
./build_debug/tools/dav1d -i test.ivf -o output.yuv \
    --outputformat yuv \
    --limit 1 \
    2>&1 | head -100
```

### 블록 단위 덤프

문제가 특정 블록에서 발생한다면, 블록 단위로 덤프한다.

```cpp
// 블록 단위 디버그 출력
struct BlockDumper {
    int target_frame;
    int target_sb_row;
    int target_sb_col;
    bool enabled = false;

    void set_target(int frame, int row, int col) {
        target_frame = frame;
        target_sb_row = row;
        target_sb_col = col;
        enabled = true;
    }

    bool should_dump(int frame, int row, int col) const {
        if (!enabled) return false;
        return frame == target_frame &&
               row == target_sb_row &&
               col == target_sb_col;
    }

    void dump_block_info(const Block& block) {
        std::cerr << "=== Block Debug Info ===\n";
        std::cerr << "Position: (" << block.x << ", " << block.y << ")\n";
        std::cerr << "Size: " << block.width << "x" << block.height << "\n";
        std::cerr << "Mode: " << (block.is_inter ? "Inter" : "Intra") << "\n";

        if (block.is_inter) {
            std::cerr << "Ref frames: ";
            for (int ref : block.ref_frames) {
                std::cerr << ref << " ";
            }
            std::cerr << "\n";
            std::cerr << "MV: (" << block.mv[0].x << ", "
                      << block.mv[0].y << ")\n";
        } else {
            std::cerr << "Intra mode: " << block.intra_mode << "\n";
        }

        std::cerr << "TX size: " << block.tx_size << "\n";
        std::cerr << "TX type: " << block.tx_type << "\n";
        std::cerr << "Skip: " << block.skip << "\n";
        std::cerr << "========================\n";
    }

    void dump_coefficients(const std::vector<int16_t>& coeffs) {
        std::cerr << "=== Coefficients ===\n";
        for (size_t i = 0; i < std::min(coeffs.size(), size_t(64)); ++i) {
            std::cerr << coeffs[i] << " ";
            if ((i + 1) % 8 == 0) std::cerr << "\n";
        }
        if (coeffs.size() > 64) {
            std::cerr << "... (" << coeffs.size() << " total)\n";
        }
        std::cerr << "====================\n";
    }

    void dump_prediction(
        const std::vector<uint8_t>& pred,
        int width, int height
    ) {
        std::cerr << "=== Prediction ===\n";
        for (int y = 0; y < std::min(height, 8); ++y) {
            for (int x = 0; x < std::min(width, 8); ++x) {
                std::cerr << std::setw(4)
                          << static_cast<int>(pred[y * width + x]);
            }
            std::cerr << "\n";
        }
        if (width > 8 || height > 8) {
            std::cerr << "... (showing 8x8 corner)\n";
        }
        std::cerr << "==================\n";
    }
};
```

### 흔한 버그 패턴

```
자주 발생하는 버그와 해결책:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. 오프-바이-원 에러 (Off-by-one):                 │
│     증상: 프레임 가장자리에서 차이 발생             │
│     원인: 경계 조건 처리 오류                       │
│     해결: width-1, height-1 확인                    │
│                                                     │
│  2. 부호 처리 오류:                                 │
│     증상: 특정 값에서만 차이 발생                   │
│     원인: int vs uint 혼용, 오버플로               │
│     해결: 데이터 타입 일관성 확인                   │
│                                                     │
│  3. 반올림 오류:                                    │
│     증상: 1-2 픽셀 차이가 산발적 발생              │
│     원인: 나눗셈 반올림 방식 차이                   │
│     해결: ROUND_POWER_OF_TWO 매크로 사용           │
│                                                     │
│  4. 클리핑 누락:                                    │
│     증상: 극단적인 값 차이 (0 vs 255 등)           │
│     원인: 중간 결과 클리핑 누락                     │
│     해결: 각 단계 후 클리핑 추가                    │
│                                                     │
│  5. 초기화 누락:                                    │
│     증상: 첫 프레임 또는 특정 조건에서 실패        │
│     원인: 버퍼 초기화 누락                          │
│     해결: memset 또는 명시적 초기화                 │
│                                                     │
│  6. 엔디언 문제:                                    │
│     증상: 바이트 순서가 뒤집힌 것처럼 보임         │
│     원인: 멀티바이트 읽기 시 엔디언 처리 오류      │
│     해결: 명시적 바이트 순서 처리                   │
│                                                     │
│  7. 참조 프레임 인덱싱:                             │
│     증상: Inter 프레임에서만 실패                   │
│     원인: 참조 프레임 버퍼 인덱스 오류              │
│     해결: ref_frame_idx 매핑 확인                   │
│                                                     │
│  8. 스케일링 오류:                                  │
│     증상: 특정 해상도에서만 실패                    │
│     원인: 스케일 팩터 계산 오류                     │
│     해결: SCALE_SUBPEL_BITS 확인                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 이진 탐색 디버깅

특정 프레임에서 실패할 때 이진 탐색으로 원인을 좁힌다.

```cpp
// 문제 프레임 찾기
int find_first_failing_frame(
    AV1Decoder& decoder,
    const std::string& reference_path,
    int total_frames
) {
    int low = 0;
    int high = total_frames - 1;
    int first_fail = -1;

    while (low <= high) {
        int mid = (low + high) / 2;

        // mid 프레임까지만 디코딩
        decoder.reset();
        for (int i = 0; i <= mid; ++i) {
            decoder.decode_frame(i);
        }

        // 비교
        if (compare_frame(decoder.get_output(), reference_path, mid)) {
            // 이 프레임까지는 OK → 이후에서 찾기
            low = mid + 1;
        } else {
            // 이 프레임에서 실패 → 기록하고 이전에서도 찾아봄
            first_fail = mid;
            high = mid - 1;
        }
    }

    return first_fail;
}
```

---

## 29.5 성능 비교

### 성능 측정의 의미

적합성 검증이 끝나면, **성능**도 측정해볼 수 있다. 단, 성능은 적합성과 별개다.

```
성능 측정의 위치:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  우선순위:                                          │
│  1. 정확성 (Correctness) ← 테스트 벡터로 검증     │
│  2. 성능 (Performance)   ← 측정만, 필수 아님      │
│  3. 메모리 (Memory)      ← 측정만, 필수 아님      │
│                                                     │
│  성능 비교 대상:                                    │
│    - dav1d: 가장 빠른 소프트웨어 디코더            │
│    - libaom: 참조 디코더 (느림)                    │
│    - 내 구현: 학습/연구 목적                        │
│                                                     │
│  현실적 기대:                                       │
│    - 교육용 구현이 dav1d보다 빠를 가능성: 0%       │
│    - 10배 느려도 정상                               │
│    - 100배 느려도 학습 목적 달성                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 성능 측정 방법

```cpp
#include <chrono>
#include <vector>
#include <numeric>

struct PerformanceResult {
    double total_time_ms;
    double avg_frame_time_ms;
    double fps;
    int frame_count;
    size_t total_bytes;
    double mbps;
};

PerformanceResult measure_decoder_performance(
    AV1Decoder& decoder,
    const std::string& input_path,
    int iterations = 3
) {
    PerformanceResult result = {};

    std::vector<double> times;
    times.reserve(iterations);

    for (int iter = 0; iter < iterations; ++iter) {
        decoder.reset();

        auto start = std::chrono::high_resolution_clock::now();

        int frames = 0;
        while (decoder.decode_next_frame()) {
            frames++;
        }

        auto end = std::chrono::high_resolution_clock::now();
        double elapsed = std::chrono::duration<double, std::milli>(
            end - start).count();

        times.push_back(elapsed);
        result.frame_count = frames;
    }

    // 중간값 사용 (이상치 제거)
    std::sort(times.begin(), times.end());
    result.total_time_ms = times[iterations / 2];

    result.avg_frame_time_ms = result.total_time_ms / result.frame_count;
    result.fps = result.frame_count / (result.total_time_ms / 1000.0);

    // 비트레이트 계산
    std::ifstream file(input_path, std::ios::binary | std::ios::ate);
    result.total_bytes = file.tellg();
    result.mbps = (result.total_bytes * 8.0) /
                  (result.total_time_ms / 1000.0) / 1000000.0;

    return result;
}

void print_performance_comparison(
    const PerformanceResult& my_decoder,
    const PerformanceResult& dav1d
) {
    std::cout << "\n=== 성능 비교 ===\n";
    std::cout << std::fixed << std::setprecision(2);

    std::cout << "               | 내 디코더  | dav1d     | 비율\n";
    std::cout << "---------------|------------|-----------|-------\n";
    std::cout << "FPS            | " << std::setw(10) << my_decoder.fps
              << " | " << std::setw(9) << dav1d.fps
              << " | " << std::setw(5) << (dav1d.fps / my_decoder.fps)
              << "x\n";
    std::cout << "프레임당 시간   | " << std::setw(8) << my_decoder.avg_frame_time_ms
              << "ms | " << std::setw(7) << dav1d.avg_frame_time_ms
              << "ms | " << std::setw(5)
              << (my_decoder.avg_frame_time_ms / dav1d.avg_frame_time_ms)
              << "x\n";
    std::cout << "==================\n";
}
```

### dav1d가 빠른 이유

```
dav1d 최적화 기법:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. SIMD 최적화:                                    │
│     - x86: SSE2, AVX2, AVX-512                     │
│     - ARM: NEON, SVE                               │
│     - 핵심 연산(변환, 필터)을 벡터화               │
│     - 수동 어셈블리 최적화                          │
│                                                     │
│  2. 멀티스레딩:                                     │
│     - 프레임 단위 병렬화                            │
│     - 타일 단위 병렬화                              │
│     - 슬라이스 단위 병렬화                          │
│                                                     │
│  3. 메모리 최적화:                                  │
│     - 캐시 친화적 데이터 레이아웃                   │
│     - 메모리 풀 재사용                              │
│     - 정렬된 메모리 할당                            │
│                                                     │
│  4. 알고리즘 최적화:                                │
│     - 불필요한 연산 건너뛰기                        │
│     - 조기 종료 (early termination)                │
│     - 룩업 테이블 활용                              │
│                                                     │
│  결과:                                              │
│    - 4K@60fps 실시간 디코딩 가능                   │
│    - 8K@30fps도 고사양 CPU에서 가능                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 29.6 최종 마일스톤 체크리스트

### 디코더 구현 완료 체크리스트

```
=== AV1 디코더 구현 체크리스트 ===

[ ] 1. 비트스트림 파싱
    [ ] OBU 헤더 파싱
    [ ] Sequence Header 파싱
    [ ] Frame Header 파싱
    [ ] Tile Group 파싱
    [ ] Metadata OBU 파싱

[ ] 2. 엔트로피 디코딩
    [ ] MSAC (Multi-Symbol Arithmetic Coding)
    [ ] CDF 테이블 관리
    [ ] CDF 업데이트

[ ] 3. 파티셔닝
    [ ] 슈퍼블록 파싱 (128×128, 64×64)
    [ ] 10가지 파티션 모드
    [ ] 재귀적 분할

[ ] 4. Intra 예측
    [ ] 13가지 각도 모드
    [ ] DC, SMOOTH 모드
    [ ] Paeth 예측
    [ ] 필터 적용

[ ] 5. Inter 예측
    [ ] 모션 벡터 예측
    [ ] 참조 프레임 관리
    [ ] 서브픽셀 보간
    [ ] 컴파운드 예측
    [ ] OBMC

[ ] 6. 변환 및 양자화
    [ ] DCT, ADST, Identity 변환
    [ ] 역양자화
    [ ] 16가지 변환 타입

[ ] 7. 루프 필터
    [ ] Deblocking Filter
    [ ] CDEF (Constrained Directional Enhancement Filter)
    [ ] Loop Restoration (Wiener, SGR)

[ ] 8. Film Grain
    [ ] 그레인 템플릿 생성
    [ ] 블록별 스케일링
    [ ] 그레인 합성

[ ] 9. 고급 기능
    [ ] Superres
    [ ] 타일 디코딩
    [ ] 세그멘테이션

[ ] 10. 테스트 및 검증
    [ ] Intra-only 테스트 벡터 통과
    [ ] Inter 테스트 벡터 통과
    [ ] Film Grain 테스트 벡터 통과
    [ ] 타일 테스트 벡터 통과
    [ ] 8-bit Main Profile 전체 통과
```

### 테스트 벡터 통과 현황 추적

```cpp
struct TestVectorStatus {
    std::string name;
    std::string category;
    bool passed;
    std::string error_message;
    double runtime_ms;
};

class TestRunner {
private:
    std::vector<TestVectorStatus> results_;

public:
    void run_test(
        const std::string& name,
        const std::string& category,
        const std::string& input_path,
        const std::string& reference_path
    ) {
        TestVectorStatus status;
        status.name = name;
        status.category = category;

        auto start = std::chrono::high_resolution_clock::now();

        try {
            AV1Decoder decoder;
            decoder.decode_file(input_path);

            auto result = compare_yuv_files(
                reference_path,
                decoder.get_output_path()
            );

            status.passed = result.match;
            if (!result.match) {
                status.error_message = "Mismatch at byte " +
                    std::to_string(result.first_diff_offset);
            }
        } catch (const std::exception& e) {
            status.passed = false;
            status.error_message = e.what();
        }

        auto end = std::chrono::high_resolution_clock::now();
        status.runtime_ms = std::chrono::duration<double, std::milli>(
            end - start).count();

        results_.push_back(status);
    }

    void print_summary() {
        int total = results_.size();
        int passed = std::count_if(results_.begin(), results_.end(),
            [](const auto& s) { return s.passed; });

        std::cout << "\n=== 테스트 결과 요약 ===\n";
        std::cout << "통과: " << passed << " / " << total << "\n";
        std::cout << "통과율: " << (100.0 * passed / total) << "%\n\n";

        // 카테고리별 통계
        std::map<std::string, std::pair<int, int>> by_category;
        for (const auto& r : results_) {
            by_category[r.category].first += r.passed ? 1 : 0;
            by_category[r.category].second++;
        }

        std::cout << "카테고리별 통과율:\n";
        for (const auto& [cat, counts] : by_category) {
            std::cout << "  " << std::setw(15) << cat << ": "
                      << counts.first << "/" << counts.second << "\n";
        }

        // 실패 목록
        if (passed < total) {
            std::cout << "\n실패한 테스트:\n";
            for (const auto& r : results_) {
                if (!r.passed) {
                    std::cout << "  - " << r.name << ": "
                              << r.error_message << "\n";
                }
            }
        }
    }
};

// 사용 예
int main() {
    TestRunner runner;

    // Intra-only 테스트
    runner.run_test(
        "av1-1-b8-00-quantizer-00",
        "Intra-only",
        "test_data/av1-1-b8-00-quantizer-00.ivf",
        "test_data/av1-1-b8-00-quantizer-00.yuv"
    );

    // Inter 테스트
    runner.run_test(
        "av1-1-b8-01-size-16x16",
        "Inter",
        "test_data/av1-1-b8-01-size-16x16.ivf",
        "test_data/av1-1-b8-01-size-16x16.yuv"
    );

    // ... 더 많은 테스트

    runner.print_summary();
    return 0;
}
```

### 점진적 구현 전략

```
권장 구현 순서:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Phase 1: 최소 디코더                               │
│  ────────────────────                               │
│  - OBU 파싱                                         │
│  - Sequence/Frame Header                           │
│  - Intra 예측 (DC 모드만)                          │
│  - 변환/역양자화 (4×4 DCT만)                       │
│  - 검증: 단일 Intra 프레임 디코딩                  │
│                                                     │
│  Phase 2: Intra 완성                                │
│  ────────────────────                               │
│  - 모든 Intra 모드                                  │
│  - 모든 변환 크기/타입                              │
│  - 검증: Intra-only 테스트 벡터                    │
│                                                     │
│  Phase 3: Inter 기초                                │
│  ────────────────────                               │
│  - 참조 프레임 관리                                 │
│  - 모션 벡터 예측                                   │
│  - 서브픽셀 보간                                    │
│  - 검증: 단순 Inter 시퀀스                         │
│                                                     │
│  Phase 4: Inter 완성                                │
│  ────────────────────                               │
│  - 컴파운드 예측                                    │
│  - OBMC, 워프 모션                                  │
│  - MFMV                                             │
│  - 검증: Inter 테스트 벡터                         │
│                                                     │
│  Phase 5: 루프 필터                                 │
│  ────────────────────                               │
│  - Deblocking                                       │
│  - CDEF                                             │
│  - Loop Restoration                                 │
│  - 검증: 필터 테스트 벡터                          │
│                                                     │
│  Phase 6: 고급 기능                                 │
│  ────────────────────                               │
│  - Film Grain                                       │
│  - Superres                                         │
│  - 타일                                             │
│  - 검증: 전체 테스트 벡터                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 29.7 정리

```
핵심 요약:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  테스트 벡터 = 입력 비트스트림 + 예상 출력         │
│  적합성 = 바이트 단위 일치                          │
│                                                     │
│  벡터 소스:                                         │
│    - AOMedia CTC (공식)                             │
│    - libaom test/data/                             │
│    - dav1d test-data                                │
│                                                     │
│  검증 방법:                                         │
│    1. dav1d로 참조 출력 생성                        │
│    2. 내 디코더 출력과 바이트 비교                  │
│    3. 불일치 시 프레임→블록→단계별로 좁히기        │
│                                                     │
│  디버깅 전략:                                       │
│    - 단계별 중간 출력 비교                          │
│    - 블록 단위 덤프                                 │
│    - dav1d 디버그 빌드 활용                         │
│    - 이진 탐색으로 문제 프레임 찾기                 │
│                                                     │
│  마일스톤:                                          │
│    - Phase 1~6 점진적 구현                          │
│    - 각 Phase마다 해당 테스트 벡터 통과             │
│    - Main Profile 8-bit 전체 통과가 최종 목표      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

이 시리즈에서는 AV1 코덱의 전체 구조를 살펴보았다.

- **Ch 0-1**: 디지털 비디오 기초, 코덱 역사와 도구
- **Ch 2-6**: 비트스트림, OBU, 파티셔닝, 블록 구조
- **Ch 7**: 엔트로피 코딩 (MSAC)
- **Ch 8-10**: Intra 예측, 변환/양자화, 프레임 조립
- **Ch 11-15**: Inter 예측, 컴파운드, 모션
- **Ch 16-19**: 루프 필터, Film Grain
- **Ch 20-24**: 타일, Superres, 메타데이터, 디코더 모델, 오류 복원
- **Ch 25-28**: 컨테이너, 레이트 컨트롤, GOP, Temporal Filtering
- **Ch 29**: 테스트 벡터 검증

AV1 디코더 구현은 쉽지 않은 여정이지만, 체계적인 테스트 벡터 검증을 통해 각 단계의 정확성을 확인하며 진행할 수 있다.

---

## 관련 항목

- [Ch 28: Temporal Filtering과 Adaptive QP](/blog/media/av1/part8-encoder/chapter28-temporal-filter-aq)
- [Ch 0: 디지털 비디오 기초](/blog/media/av1/part1-basics/chapter00-digital-video)
- [Ch 1: 코덱 역사와 도구](/blog/media/av1/part1-basics/chapter01-history-tools)
- [AOMedia Test Vectors](https://aomedia.org/av1/specification/test-vectors/)
- [dav1d - VideoLAN](https://code.videolan.org/videolan/dav1d)
- [AV1 Specification](https://aomedia.org/av1-bitstream-and-decoding-process-specification/)
