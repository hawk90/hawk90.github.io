# 공개 글 독립 재검토 — 루프 34

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter18-register-maps.md` | 7 | 10 | 5 | 11 | 7 | 4 | 2 | 46 | 오류 확인 | 우선 조치 |
| `chapter19-advanced-features.md` | 11 | 9 | 6 | 11 | 7 | 5 | 3 | 52 | 미검증 | 병합 검토 |
| `chapter01-core-generation.md` | 12 | 11 | 7 | 6 | 6 | 6 | 2 | 50 | 오류 확인 | 우선 조치 |
| `chapter02-elf-core-format.md` | 11 | 12 | 6 | 9 | 7 | 5 | 2 | 52 | 오류 확인 | 우선 조치 |
| `chapter03-gdb-core-analysis.md` | 13 | 12 | 7 | 10 | 7 | 4 | 2 | 55 | 오류 확인 | 우선 조치 |
| `chapter04-debuginfod-minidump-automation.md` | 9 | 9 | 6 | 6 | 7 | 4 | 2 | 43 | 오류 확인 | 우선 조치 |
| `chapter05-cxl-device-postmortem.md` | 16 | 12 | 8 | 11 | 8 | 7 | 3 | 65 | 검증됨 | 보강 |
| `chapter06-cxl-fabric-postmortem.md` | 10 | 9 | 4 | 12 | 6 | 7 | 1 | 49 | 미검증 | 병합 검토 |
| `00-preface.md` | 12 | 13 | 3 | 12 | 8 | 6 | 2 | 56 | 미검증 | 보강 |
| `part1-01-why-rtos.md` | 10 | 9 | 4 | 10 | 6 | 7 | 1 | 47 | 오류 확인 | 우선 조치 |

기존 합계 501 → 재검토 515. 2026-10-19 독립 최종 재검토. Register18·GDB core3·automation4에서 새 오류를 확인했다. dumpable의 기존 단순 내부 모순은 철회하고 공식 API 허용값 근거로 교체했다. 오류 일부 확인을 전체 검증으로 확대하지 않았다.

### chapter18-register-maps.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter18-register-maps.md`
url: `/blog/embedded/hardware/pcie/chapter18-register-maps`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 공식 헤더로 ACS ID를 확인했지만 다른 모든 비트·상수·명령을 검증한 것은 아니다. 실행 없음.

| 항목 | 근거 |
| --- | --- |
| A7 | Type0/Type1·PCIe·AER·MSI·SR-IOV의 필드 사전이다. 독자 실측·사례 분석 없이 표를 모은 기여여서 A7 유지. |
| B10 | 찾아보기 범위는 넓지만 ACS 절의 Extended ID 0x000F는 공식 v6.12 pci_regs.h의 ACS 0x0D와 다르다(0x0F는 ATS). 새 오류 확인. B10 유지. |
| C5 | offset/bit 표와 명령은 있지만 디바이스·도구 버전·원출력에 대응하는 완전한 디코딩 사례가 없다. 수치의 출처 연결 부족으로 C5 유지. |
| D11 | PCIe Ch3의 ECAM/Capability 목록과 이 글의 표를 직접 비교했다. 개념 학습과 일괄 레퍼런스라는 역할 차이가 있어 D10→11; ACS 소개는 Ch11/12/19와 반복. |
| E7 | Register Maps 제목에 맞는 비트 지도가 본문 중심이다. 포괄적인 요약이라도 분석을 약속하지 않아 E7 유지. |
| F4 | 연결된 Ch1/3·CXL1·HBM9·성능 CXL 글의 공개 slug/title/order를 확인했다. 공개 Ch19가 있는데 18편으로 끝맺는 안내여서 F4 유지. |
| G2 | PCIe spec·Linux 헤더가 끝에 있지만 표별 버전·절 번호 연결이 없어 G2 유지. 검토자가 연 공식 자료를 본문의 출처 가점으로 환산하지 않는다. |

전문 읽기: 1~381행. SHA-256: `6f4cf1b6e0f020102c22553cba829c623ad63c1b597f500181c2bba1f50def20`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter19-advanced-features.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter19-advanced-features.md`
url: `/blog/embedded/hardware/pcie/chapter19-advanced-features`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: pcilmr 옵션, L0p 의무 조건, pcie_acs_override의 적용 커널은 미확인. 기술 오류로 확정하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A11 | Lane Margining·10-bit Tag·TPH·ACS·L0p를 운영 관점으로 묶는다. 개별 항목 설명은 짧고 경험 증거가 없어 A11 유지. |
| B9 | 기능별 필요성/확인 명령은 있으나 768 Tag·L0p 조건의 규격 범위와 실행 환경이 빠져 B9 유지. |
| C6 | lspci/pcilmr/IOMMU group 예시가 있으나 원출력·전후 비교·환경이 없어 C6 유지. 무출처 수치 상한 적용. |
| D11 | Ch9 PHY·Ch11 DMA·Ch17 성능의 해당 범위를 직접 비교했다. Ch9에 Lane Margining, Ch11에 TPH의 상세가 없어 단순 재탕으로 보지 않고 D10→11. |
| E7 | 고급 다섯 기능을 각각 실제로 설명하므로 E6→7. 타이틀의 모든 기능이 본문에 있다. |
| F5 | 공개 링크와 메타데이터 확인. Ch17의 bandwidth-delay product 논의를 가리키지만 실제 성능 글에 그 논의가 없고 관련 TPH 안내도 상세 범위와 어긋나 F5 상한 유지. |
| G3 | pcilmr 매뉴얼·Linux TPH·L0p 자료가 기능에 연결되어 G3 유지. 다른 규격 숫자의 출처까지 충족하지는 못한다. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~107행. SHA-256: `6c6437a723cef0bf01024665cf3fd318a38cfcb9c563c8651e447ab04ce961bf`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter01-core-generation.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter01-core-generation.md`
url: `/blog/tools/debugging/postmortem/chapter01-core-generation`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 기존 dumpable=1과 suid_dumpable=2의 단순 내부 모순 근거는 철회. 현대 PR_SET_DUMPABLE 값 2 오류는 공식 문서로 확인. 나머지 경로 전체 검증 아님.

| 항목 | 근거 |
| --- | --- |
| A12 | signal→core_pattern→systemd→filter→테스트를 한 흐름으로 정리한다. 고유 kernel dump 경로 추적은 적어 A12 유지. |
| B11 | PR_SET_DUMPABLE 예제에 2를 suidsafe 설정값으로 적지만 공식 man-pages는 0/1만 허용하고 2는 Linux2.6.17 이후 제거되었다고 명시한다. B11 유지, 오류 근거 교체. |
| C7 | ulimit/core_pattern/coredump_filter/gcore 명령과 quick test가 있으나 버전·실제 생성 파일 검증이 없다. C7 유지. |
| D6 | GDB/LLDB Ch7의 24–100·164–202·385–392행과 직접 비교했다. 조건·패턴·systemd·ASan 중복은 크지만 생성 설정에 집중한 독립 역할을 인정해 D5→6. |
| E6 | 생성 조건과 설정은 충실하나 제목의 kernel dump path 분석은 함수 경로보다 설정 중심이다. 그래도 동작 이유 설명이 있어 E5→6. |
| F6 | Ch2 다음 안내와 공개 target/order/title, ASan 링크 및 뒤 설명을 확인했다. 생성 실패 조건의 독자 흐름은 있으나 시리즈 허브 안내가 약해 F5→6. |
| G2 | man core·signal·systemd 공식 링크는 말미 목록이며 세부 조건에 연결되지 않아 G2 유지. |

전문 읽기: 1~419행. SHA-256: `476bfdb39b34a00962768b0e60e349d705aa0e9465c35c882efa94a27bf121f2`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter02-elf-core-format.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter02-elf-core-format.md`
url: `/blog/tools/debugging/postmortem/chapter02-elf-core-format`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: siginfo 값 일부만 공식 대조했다. ELF notes 구조·아키텍처별 배치와 예시 출력을 전체 검증하지 않았다.

| 항목 | 근거 |
| --- | --- |
| A11 | NT_PRSTATUS/PRPSINFO/FILE/AUXV와 레지스터 구조를 한 파일로 따라간다. 새 실험 데이터가 없어 A11 유지. |
| B12 | SIGSEGV BNDERR/PKUERR=6/7 및 SIGILL PRVOPC/PRVREG=7/8은 공식 v6.12 siginfo.h의 3/4 및5/6과 다르다. 기존 오류 확인 유지. |
| C6 | readelf·구조체·메모리 예시는 많아도 생성한 실제 core와 연결되지 않고 ABI 버전이 없다. C6 유지. |
| D9 | GDB Ch7 102–160·261–266행과 ELF/notes 범위를 직접 비교했다. 이 글은 notes 구조별로 더 깊게 나눠 D8→9; 일반 ELF 소개 글과 용도가 다르다. |
| E7 | 제목에 명시한 세 NT_* 구조를 실제로 풀어 E7 유지. 일부 오류를 이유로 설명 범위 자체를 부정하지 않는다. |
| F5 | 공개 Ch1/3·DWARF1 라벨/slug/order 일치. Build-ID 상세를 다음 장으로 넘기지만 실제 상세는 Ch4여서 F5 상한 유지. |
| G2 | ELF/man 자료가 말미 목록에만 있어 G2 유지. 시그널 값에 공식 헤더 근거가 본문에 없다. |

전문 읽기: 1~462행. SHA-256: `d7f781f51e9555a781a903486b440d5293a8ae71070173578fe0831c277b9e45`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter03-gdb-core-analysis.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis.md`
url: `/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: Ch3도 SEGV_BNDERR=6·PKUERR=7을 명시한다. 이는 공식 헤더와 대조한 새 오류이며 다른 GDB/Python 코드 전체 검증은 아니다.

| 항목 | 근거 |
| --- | --- |
| A13 | NULL/vtable/stack/deadlock/abort/재귀/heap 등 패턴과 CoreInfo 명령을 결합한다. 자체 사건의 검증 결과는 없어 A13 유지. |
| B12 | $_siginfo 설명의 BNDERR6/PKUERR7은 v6.12 공식 헤더의3/4와 불일치. 미검증→오류 확인, B13→12. 다른 예시 시나리오의 주소 차이만으로 오류를 추가하지 않는다. |
| C7 | 명령·예시 출력·Python 명령이 있으나 GDB 버전과 재현 core가 없어 C7 유지. |
| D10 | GDB Ch7 164–168·217–266행의 명령/시그널과 직접 비교했다. 앞부분은 겹치지만 8패턴과 Python 종합 도구가 독립이라 D9→10. |
| E7 | bt/info threads/Python을 모두 다루고 증상별 해석도 있어 E7 유지. |
| F4 | Ch4를 마지막이라고 하지만5/6이 공개됨. Sanitizers Ch1 라벨은 실제 order2 ASan 글이다. 후행 heap 검출 설명은 맞아도 라벨 오류가 남아 F4 유지. |
| G2 | GDB core 공식 문서만으로 다양한 Python API·ABI 주장이 연결되지 않아 G2 유지. |

전문 읽기: 1~492행. SHA-256: `d7b794e6a38ec9ecffd96eb6daa87c06ac2a3e857f76d26105a6a29d8f9acd7c`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter04-debuginfod-minidump-automation.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation.md`
url: `/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: CI 조건과 Python 그룹화 실패만 추가 확인. debuginfod 기본값·Build-ID 길이·Breakpad 버전은 미검증.

| 항목 | 근거 |
| --- | --- |
| A9 | build-id→debuginfod→minidump→CI/production을 연결하지만 여러 도구 개요를 쌓은 형태여서 A9 유지. |
| B9 | Run tests에서 || true로 성공시킨 뒤 Analyze cores를 if:failure()로 실행해 테스트 실패 분석 약속이 성립하지 않는다(공식 GitHub failure 정의 대조). Python join은 list 원소로 TypeError를 재현. B10→9, 새 오류 확인. |
| C6 | CI/systemd/Python 스크립트가 있어도 성공 실행과 산출물이 없고 그룹화 코드가 실패한다. C6 유지. |
| D6 | DWARF-ELF Ch6 124–204행의 build-id/debuginfod와 GDB Ch7 364–393행의 minidump/ASan을 직접 비교. CI/production 독립 주제가 있어 D5→6. |
| E7 | 자동화 파이프라인이 본문 절반에 걸쳐 실제로 제시되므로 E6→7. 실행 성공 여부는 B/C에서 감점. |
| F4 | 4장을 마지막이라 하지만5/6 공개. Embedded Debugging 연결이 RSP 프로토콜 글이며 이어 읽을 이유 설명이 없어 F4 유지. GDB Python target 자체는 일치. |
| G2 | elfutils/Breakpad/Crashpad 공식 링크가 있으나 명령과 버전별 연결이 없어 G2 유지. |

전문 읽기: 1~479행. SHA-256: `0f4e6b8fec6c9d0b049c2e285cafafaa963491a1593df6a80cc8673d090e1e4d`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter05-cxl-device-postmortem.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem.md`
url: `/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem`

score_status: 잠정 · score: 65 · confidence: 중간 · factcheck: 검증됨
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 검증됨은 06018beb의 upstream 대조 이력을 계승한다. master/main 기준이므로 고정 커널·drgn 버전과 실행 결과는 추가 필요.

| 항목 | 근거 |
| --- | --- |
| A16 | vmcore에 없는 device poison/event와 남는 커널 객체·로그를 구분하고 실제 CXL 객체 walker를 제시해 A16 유지. |
| B12 | 06018beb의 실제 커밋 본문을 읽어 가짜 cmd_log/state/helper 제거 및 원소스 경로를 확인했다. decoder 복원 자체는 짧아 B12 유지. |
| C8 | bus_for_each_dev/container_of·NUMA pages·실제 로그 문자열이 연결되지만 실행 출력과 버전이 없어 C8 유지. |
| D11 | Kernel CXL8의 walker/오류표와 Memory CXL6의 health/NUMA 범위를 직접 비교했다. 공통 순회는 반복되나 사후 vmcore 한계라는 질문이 달라 D10→11. |
| E8 | 제목의 device state·kernel log·NUMA를 각각 코드/표로 설명하므로 E7→8. |
| F7 | 다음Ch6과 관련 crash/drgn·kernel8·memory6의 실제 공개 target/order/title 및 뒤 설명이 일치한다. vmcore 경계와 체크리스트 고유 구조가 있어 F7 유지. |
| G3 | 본문에 drivers/cxl 및 mmzone 경로를 주장 가까이 적어 G3 유지. 고정 tag의 직접 링크는 없다. |

전문 읽기: 1~114행. SHA-256: `dc6125affae1664d4ba9d19182c5d24bbbdc986d0dfd99556bac03a34b393f8f`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter06-cxl-fabric-postmortem.md

source_file: `src/content/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem.md`
url: `/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem`

score_status: 잠정 · score: 49 · confidence: 낮음~중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: ptime/PROC TIME, vmcore의 BISnp count, cxl_mem read/write tracepoint 및 LWP 실재는 미확인. 개념 예시 API나 서로 다른 helper 문구만으로 오류 확정하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A10 | single-host에서 FM/LD/switch/다중 vmcore로 넓히는 네 사건 시나리오는 고유하지만 실제 장비 사례가 없어 A10 유지. |
| B9 | 필요 자료→정렬→상관 분석 흐름은 있으나 얻을 수 있는 로그/API의 구체 근거가 부족해 B9 유지. |
| C4 | 시간 정확도 수치는 환경/출처가 없고 가상의 walker와 출력이다. 실제로 수집한 자료가 없어 C4 유지. |
| D12 | 직접 연 Ch5의 단일 vmcore와 HBM12의 용량/조달·토폴로지 설명과 비교하면 이 글은 분산 장애 상관 분석이다. 템플릿 반복만으로 병합 필요성을 확정하지 않아 D12 유지. |
| E6 | 분산 디바이스·multi-host 장애 추적이라는 제목을 네 시나리오로 답하므로 E5→6. |
| F7 | Ch5/4·kernel6/9·HBM12의 공개 slug/order/title과 설명이 맞는다. 시간 정렬→가설 검증이라는 글 고유 구조를 인정해 F6→7. |
| G1 | 근거 자료·버전·FM 문서 연결이 없어 G1 유지. 외부 도구 이름 나열은 출처로 세지 않는다. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~220행. SHA-256: `55b0c34418afa82529941bc7b52a381c79bd04efa938f8aa3bed45e327f3af92`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### 00-preface.md

source_file: `src/content/blog/embedded/rtos/practical-internals/00-preface.md`
url: `/blog/embedded/rtos/practical-internals/00-preface`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: Zephyr4.0 LTS·ThreadX 기증일·FreeRTOS 버전 및 stream buffer lock-free는 확인 대기. 지난 EOL 날짜의 미래형은 시의성 문제로만 기록.

| 항목 | 근거 |
| --- | --- |
| A12 | 핵심 질문과 API→자료구조→critical section→scheduler→assembly 분석 순서가 고유하지만 실례 추적은 없어 A12 유지. |
| B13 | 독자·52편 구성·학습 경로·환경·사전 지식이 있다. 버전/지원 상태가 미검증이라 B13 상한 유지. |
| C3 | 도입 API 한 줄과 분석 절차 외 실제 결과가 없다. 버전 표는 출처 없는 값이므로 C3 유지. |
| D12 | 이 루프의 why-RTOS 전문 및 다른 C++/성능 허브 목차 구조를 직접 비교했다. 공통 뼈대는 같지만 RTOS 내부 읽기라는 허브 역할은 독립이어서 D12 유지. 55점이어도 시리즈 소개 허브 예외로 판정은 보강이다. |
| E8 | 시리즈 소개라는 제목에 대상/구성/분석 방법/선행 지식을 실제 제공하므로 E7→8. |
| F6 | 다음 글 actual order1/title/slug 일치. 학습 경로와 선수 지식은 있으나52편 목차에 링크가 없고 허브 탐색성이 약해 F6 유지. |
| G2 | 공식 repository와 문서가 목록으로 있고 버전 표 주장에 연결되지 않아 G2 유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~231행. SHA-256: `def6e0aa4480826aa2b4237d94bb0afa6dbec90ace2837848340090bcb287ae3`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part1-01-why-rtos.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-01-why-rtos.md`
url: `/blog/embedded/rtos/practical-internals/part1-01-why-rtos`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 서로 같은 PID 작업 흐름으로 제시한 시간 합과 정확 주기 약속이 모순. RTOS별 우선순위·Linux MMU·라이선스 등 나머지 주장은 미검증.

| 항목 | 근거 |
| --- | --- |
| A10 | 동일 super-loop를 비동기/ISR/RTOS로 바꾸는 구조와6.8ms 계산이 중심이다. 입문 비교표는 통상적이어서 A10 유지. |
| B9 | 센서1+PID0.5+출력0.3=1.8ms인 동일 연속 작업을 RTOS 예제에서 정확1ms마다 수행한다고 한다. 이 산술 불일치는 스케줄러만으로 해결되지 않아 오류 확인/B9 유지. |
| C4 | target MCU/tick/우선순위 생성/측정 trace가 없고 footprint/latency 숫자의 출처가 없다. C4 유지. |
| D10 | 현재 Recipes6-01의 blocking/state-machine 예제와 이 글의 시간 합 예제를 직접 비교했다. 예제가 달라 기존 과도한 코드 중복 표현을 철회해 D9→10. RTOS1-10·5-05·5-07과 표 주제는 반복. |
| E6 | 일반OS 차이보다 super-loop 대비가 더 길고 정확 주기 주장은 틀렸다. 그래도 도입 판단 질문을 다뤄 E6 유지. |
| F7 | 다음 task/thread의 TCB·상태 머신 설명 및 실제order2, 관련 realtime order10 라벨/내용 일치. 같은 예제 대안 구조가 있어 F7 유지. |
| G1 | 출처 연결 없이 운영체제 비교·정량 기준을 제시하므로 G1 유지. |

전문 읽기: 1~179행. SHA-256: `1208325e93a0a13b4e749c6ccaae439663b99e9d69a2d3923db3370d7a0a20c2`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 원출처 대조 및 실행

- [Linux v6.12 pci_regs.h](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/pci_regs.h): ACS=0x0D, ATS=0x0F. Register18의 ACS0x000F와 대조.
- [Linux v6.12 siginfo.h](https://github.com/torvalds/linux/blob/v6.12/include/uapi/asm-generic/siginfo.h): SEGV_BNDERR3/PKUERR4, ILL_PRVOPC5/PRVREG6. ELF core2와 GDB core3의 명시 값에만 적용.
- [공식 Linux man-pages PR_SET_DUMPABLE](https://man7.org/linux/man-pages/man2/PR_SET_DUMPABLE.2const.html): 현재 API는0/1만 허용,2는2.6.13–2.6.17의 제거된 기능. sysctl의2와 혼동하지 않는다.
- [GitHub Actions failure()](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#failure): 앞 단계 실패일 때만 true. 글의 명시적 성공 처리 뒤 분석 단계 조건이 의도와 어긋난다.
- 로컬 Python으로 자동화 글의 join 표현식에 비어 있지 않은 bt 한 줄을 넣어 `TypeError: sequence item 0: expected str instance, list found`를 재현했다. gdb/Slack를 실행하거나 메시지를 보내지 않았다. 전체 CI·하드웨어·core 재현 검증은 하지 않았다.
