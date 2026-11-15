# Embedded C++ 소개·비교·크기 분석 수정

재채점하지 않음. 본문 3편(소개, part1-01, part1-04)과 part1-01의 기존 TikZ/SVG를 수정했다. 전체 시리즈 실행 검증을 뜻하지 않는다.

1. **발생 맥락과 범위**: C/C++ 선택과 초기 용량 예산을 결정하는 공개 기술 글. 문서 경로와 수정 전후 SHA는 companion JSON에 기록한다. 제목·URL·날짜·공개 상태·전체 frontmatter는 수정 전 파일과 직접 비교하여 같음을 확인했다.
2. **문제 신호와 반증 조건**: RAII·constexpr·unique_ptr을 무조건 비용0으로 표시하고, GPIO를 RAII라고 설명하며, 재현 소스 없는 STM32/GCC 크기·분포를 실측으로 제시했다. `size dec`를 Flash 한도로 쓰면 BSS 증가를 오판한다. 실제 동일 조건의 ELF/map·소스가 있다면 해당 조건의 실측 주장은 수용 가능하나 기존 본문에는 없었다.
3. **원인 가설과 대안**: 언어 기능 이름과 특정 최적화 사례를 일반 시스템 비용으로 확장한 것이 원인이다. 언어를 금지하는 대신 명령·수명·저장 공간·초기화·실패 경로를 분리하고, 작은 직접 재현 예제와 최종 링크 검증의 경계를 표시했다.
4. **증거**: 본문의 named fence를 추출하는 두 verifier를 실행했다. Clang23.1.3 Cortex-M4 교차 컴파일에서 C/C++ 세 함수의 `.text` 바이트가 동일했고, 핀16은 정적 단언으로 거절됐다. Linux ELF object에서 data16, bss128→4096, 정적RAM144→4112를 관측했다. 동일한 Flash 근사치에도 RAM256 한도를 넘는 부정 사례를 검증했다. debug strip 전후 할당 합계는 같고 디스크 파일은 작아졌다. 1차 자료는 본문 GNU size/nm/objcopy, Itanium ABI, Clang 교차 컴파일, GCC C++ 옵션, C++ Core Guidelines 링크로 남겼다.
5. **표본 범위**: 2026-10-22 macOS의 Clang23.1.3/LLVM에서 위 두 object 실험만 실행했다. Cortex-M4 보드 실행·GCC13·펌웨어 링크·실제 라이브러리 KB 증가·Bloaty 비교·최악 사이클은 측정하지 않았다. 서문은 파일 수(40본문+소개1), 정책·플래그 전제와 개별 장의 검증 범위를 대조했다.
6. **결정**: remediated. 출처 없는 실측 표를 재현 예제로 교체하고 잘못된 산식·Thumb 길이·vtable 계산·nm 정렬·startup 일반화를 정정했다. 기존 그림의 무조건 비용 등급도 조건별 검토 지점으로 바꿨다. 비용의 대소를 보증하는 그림이 아님을 표시했다.
7. **가장 작은 안전한 변경**: 해당3편의 본문, 연관 그림 source/SVG, 독립 verifier 및 기록만 변경한다. 점수 원장과 다른 작성자의 편집을 건드리지 않는다. 되돌림 경계는 companion JSON의3경로와 그림2경로·신규 verifier2개다. 기존 글·URL 보존.
8. **검증과 잔여 위험**: `node scripts/verify-embedded-cpp-comparison-examples.mjs`, `node scripts/verify-embedded-cpp-size-examples.mjs`,3편 publish gate와 inline math 통과. 그림 단독 빌드1개 통과·missing glyph0. 로그는 아래 참조. gate의 upstream symbol SKIPPED는 확인 완료로 세지 않는다. 사이트 전체 build/anchor 검사는 병행 챕터 수정이 안정된 시점에 별도 수행한다. 실제 MCU와 런타임별 ABI·메모리·시점 비용은 해당 환경 도입 전 재검토한다.

- [C/C++ 실행 로그](embedded-cpp-comparison-2026-10-22-examples.log)
- [섹션 실행 로그](embedded-cpp-size-2026-10-22-examples.log)
- [그림 빌드](embedded-cpp-comparison-2026-10-22-diagram.log)
- [3편 gate](embedded-cpp-intro-size-2026-10-22-gate.log)
