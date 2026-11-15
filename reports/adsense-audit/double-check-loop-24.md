# 공개 글 독립 재검토 — 루프 24

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 평가. 기준은 10-18 공통 원문 스냅샷이다. 원문 전문 및 기존 근거를 읽고 재판정했다. 기존의 항목별 설명 중 직접 원문과 대조하여 동의한 문장은 재사용하고, 변경/철회한 것은 아래에 고쳤다. 기계적으로 점수에 동의한 기록이 아니다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter08-iot-standards.md` | 12 | 11 | 5 | 10 | 7 | 6 | 3 | 54 | 오류 확인 | 우선 조치 |
| `chapter09-firmware-analysis.md` | 15 | 13 | 8 | 13 | 8 | 7 | 2 | 66 | 미검증 | 보강 |
| `chapter10-sdlc.md` | 13 | 13 | 7 | 10 | 7 | 6 | 3 | 59 | 미검증 | 병합 검토 |
| `chapter11-pcie-cxl-ide.md` | 12 | 11 | 5 | 6 | 6 | 7 | 4 | 51 | 검증됨 | 병합 검토 |
| `chapter12-spdm-cma.md` | 14 | 12 | 6 | 12 | 7 | 7 | 4 | 62 | 미검증 | 보강 |
| `chapter13-cxl-tee.md` | 15 | 12 | 7 | 7 | 7 | 4 | 4 | 56 | 검증됨 | 병합 검토 |
| `chapter01-overview.md` | 11 | 12 | 7 | 11 | 5 | 4 | 2 | 52 | 미검증 | 보강 |
| `chapter02-riscv-core.md` | 12 | 12 | 6 | 11 | 7 | 4 | 2 | 54 | 미검증 | 병합 검토 |
| `chapter03-memory-flash.md` | 10 | 11 | 6 | 10 | 6 | 4 | 2 | 49 | 오류 확인 | 우선 조치 |
| `chapter04-gpio-ledc-pwm.md` | 11 | 8 | 5 | 11 | 4 | 4 | 1 | 44 | 오류 확인 | 우선 조치 |

기존 합계 541 → 새 합계 547; 평균 54.1 → 54.7. 오류 확인 4→3편. SPDM의 호스트 정책/프로토콜 보호 설명 차이는 직접 모순으로 확정하지 않았다. 기존 검증 2편은 커밋의 대조 범위로만 유지하며 신규 전면 검증으로 부르지 않는다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| chapter08-iot-standards.md | 52 | 54 | 2 | F4→6: 링크 없는 표준·시리즈 이름만으로 잘못된 target 확정한 감점 철회. CRA 동일 완전 시행 날짜 모순 유지. |
| chapter09-firmware-analysis.md | 65 | 66 | 1 | F6→7: 도구 단계·방어자 점검이라는 글 고유 읽기 경로 인정. |
| chapter10-sdlc.md | 57 | 59 | 2 | F4→6: 표준명만으로 target 오류 확정한 감점 철회; 시리즈 끝 안내 범위 문제 유지. |
| chapter11-pcie-cxl-ide.md | 51 | 51 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter12-spdm-cma.md | 61 | 62 | 1 | 오류 확인→미검증, B11→12: 호스트 정책/암호학적 방어를 양립 불가로 단정한 감점 철회. 전체 verified 복원은 보류. |
| chapter13-cxl-tee.md | 56 | 56 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter01-overview.md | 52 | 52 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter02-riscv-core.md | 54 | 54 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter03-memory-flash.md | 49 | 49 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter04-gpio-ledc-pwm.md | 44 | 44 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### chapter08-iot-standards.md

source_file: `src/content/blog/embedded/embedded-security/chapter08-iot-standards.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter08-iot-standards`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 163~165행 CRA의 default·important class I·important class II·critical 구조와 글의 I/II/III 3단 분류, class II 자기적합선언 가능 여부를 1차 자료로 확인하지 않았다. - 157행 '2.5% 또는 1500만 EUR' 벌금이 보고 의무 위반 상한인지 미확인. - 154행 24시간 보고 대상(ENISA·CSIRT early warning)과 적용 시작일(modern-recipes part12-12 20행은 2026-09-11) 미확인. - 15행 '2025년 8월 시행'이 CRA의 어느 조항 적용일인지 불명. 147행과 부분 시행으로 양립할 수 있어 오류 확인에서 뺐다. - 178행 R155·R156의 일본·한국 2022년 7월 적용 여부, 118행 'KTL이 IEC 62443 인증 기관', 204행 KCSP 명칭 미확인. - 85행 '13개 문서', 283행 '본문 24쪽', 36·215행 '80% 이상'은 근거가 없다. - 60행 UK PSTI가 5.1·5.2·5.3만 강제한다는 서술을 PSTI 규칙으로 확인하지 않았다. 306~311행 외부 링크 현재 유효성 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 것은 공통 요구 8개 매핑 표(215~228행), 한국 인증 체계 표(199~211행), 출시 8단계 흐름(232~257행), 자기적합선언 예(64~79행)다. 지형도 표(23~34행), ETSI 13개 provision 표(44~58행), IEC 62443 SL 표(109~114행)는 공개 요약을 다시 정리한 수준이다. 36행 '핵심 보안 항목은 80% 이상 겹칩니다'와 215행 '80% 이상 커버'는 근거가 없다. 6~12 구간 상단. |
| B | 11 | 지형도(21행) → 표준별 절(38·83·120·145·169·184·197행) → 공통 요구(213행) → 워크플로(230행) → 실수(259행) → 정리(285행) 흐름은 끝까지 간다. NIST IR 8259 절(122~139행)은 capability 6개를 굵은 한 줄씩만 나열하고, IR 8425(141행)·SP 800-213(143행)은 한 문장이다. CRA 시행 시점이 15·31·147행에서 다르고 CRA class 인증·벌금 조항 같은 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 5 | 검증 가능한 것은 자기적합선언 예(64~79행)와 8단계 워크플로(234~255행)뿐이고, 워크플로는 단계 이름만 있고 판정 기준·결과가 없다. 157행 '2.5% 또는 1500만 EUR', 283행 '본문 24쪽', 85행 '13개 문서', 36·215행 '80% 이상'은 본문 출처가 없는 수치다(C ≤ 8). 합격·실패 관찰이 없어 4~7 구간. |
| D | 10 | 이 글 263~279행 지원 종료·SBOM·CRA 보고와 ch10 300~309·335·378~396행을 양쪽 읽었다. 같은 운영 요구가 겹치지만 표준별 비교/8개 공통 요구 매핑과 SDLC 단계는 독립 질문이다. D10 유지. 비교하지 않은 Recipes 한 줄 언급은 점수 근거에서 제외. |
| E | 7 | 제목의 ETSI EN 303 645·IEC 62443·NIST 8259·EU CRA는 모두 절이 있다(38·83·120·145행). description의 자동차(169~182행)와 KISA·KICS(197~211행)도 다룬다. '비교'는 23~34행 표와 215행 매핑 표 수준이고 NIST 8259(122~139행)는 이름 나열뿐이라 부분 이행. |
| F | 6 | 다음 Ch9와 연결된 Ch2/6/10의 title·slug·order·공개 상태 및 SBOM 안내를 확인했다. 말미 MISRA C/AUTOSAR/DO-178C는 외부 표준·학습 분야 이름으로도 읽히고 특정 공개 글 링크를 약속하지 않아 draft/부재만으로 잘못된 링크 상한을 적용하지 않는다. 굵은 라벨·공백 반복과 추상적 학습 안내로 F6. 구체 링크 오표기 없는 것은 원문 직접 확인. |
| G | 3 | 306~311행에 1차 자료 링크(ETSI EN 303 645 V2.1.1 PDF, EC CRA 정책 페이지, legislation.gov.uk PSTI Act, NIST IR 8425)가 있고 67행에 ETSI 판이 있다. 그러나 끝 목록에만 있고 157행 벌금, 147행 날짜, 163~165행 class별 인증에 연결되지 않는다. CRA 규정 번호와 IEC 62443 판이 없고, 308행 라벨은 '8259 / 8425'인데 링크는 8425만, 311행 KISA는 홈페이지뿐. |

게이트 재판정: 오류 확인. 원문 내부 모순(루브릭 3-1). 31행 표는 EU CRA를 '2027 11월 완전 시행'으로 적고, 147행은 같은 사건을 '2027년 12월 11일 완전 시행'으로 적는다. 같은 '완전 시행'의 날짜가 둘이다. 15행 '2025년 8월 시행'과 147행 '2024년 12월 발효'의 쌍은 부분 시행으로 읽을 여지가 있어 근거에서 뺐다. git log(14cffad8 작성, c38cb67c outline 변환, 69e67197 표 변환, ac24bb76 제목 변경, fa55144d·8bf4703f 링크 수리, 0a9dd7bc slug 고정 등)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로 보면 후보는 같은 시리즈 `chapter10-sdlc.md`다(이 글 263~279행 ↔ ch10 300~309·335·378~396행). 표준 비교라는 독립 검색 의도가 있어 병합하지 않고 보강한다. 다음 조치: 15·31·147행 CRA 날짜를 Regulation (EU) 2024/2847로 통일, ch10과 겹치는 함정 절 정리, 303~305행 관련 항목 정리.  


### chapter09-firmware-analysis.md

source_file: `src/content/blog/embedded/embedded-security/chapter09-firmware-analysis.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter09-firmware-analysis`

score_status: 잠정 · score: 66 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 189행 CVE-2019-15054(D-Link DIR-859)·CVE-2021-32030(ASUS GT-AC2900), 292·315행 CVE-2021-20090(Buffalo/Arcadyan)의 제품·취약점 귀속을 NVD로 대조하지 않았다. 189행 '모두 Ghidra 디컴파일 한 화면이 시작'도 근거가 없다. - 108~109행 '읽기는 대부분의 칩에서 안 막힘', 'secure element 키 대부분 추출 불가'는 출처 없는 일반화다. - 166행 'Ghidra NSA 2019 공개'·'IDA 실질적 대체재', 359행 ST RDP·Nordic APPROTECT voltage glitch 우회 '다수 사례'를 대조하지 않았다. - 103~107·124~131·150~160행 출력 블록이 실제 캡처인지 예시인지 불명이다. - 317행 '분석은 주 단위, exploit은 일 단위'는 근거 없는 경험 추정이다.  

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 표준 도구 카탈로그(117행 binwalk, 164행 Ghidra, 191행 radare2, 206행 strings)는 입문서 수준이지만, '우리 펌웨어 자가 점검' CI 5줄(323~339행)과 방어자 관점 노출원 정리(345~367행: 디버그 빌드·printf 비밀·살아 있는 JTAG·RDP glitch 우회·FACT 크롤러)가 저자 고유 관점이다. 15행 '내가 먼저 까보지 않으면'으로 공격 도구를 출시 전 자가 점검으로 뒤집었다. 189행 CVE 귀속, 109행 'secure element 키 대부분 추출 불가'는 출처가 없다. 앵커 part7-05(9)보다 강하고 part12-10(18)에는 못 미친다. |
| B | 13 | 획득(48행) → 정적(115행) → 동적(217행) → 실제 CVE 흐름(290행) → 자가 점검(319행) → 흔한 실수(343행) → 정리(369행)로 완결 아크다. 예외도 다룬다(109행 secure element, 357행 read-protection 우회). 각 도구 절은 명령 한 줄과 한두 문장으로 얕고, CVE 사례(294~315행)는 8단계가 bold 라벨 문단으로만 나열된다. 10~15 구간. |
| C | 8 | 실제 명령이 많다(57행 screen, 83·88행 openocd/telnet, 99행 flashrom, 122·136행 binwalk, 196행 r2, 228행 chroot/qemu, 265행 afl-fuzz, 247~254행 gdb). 출력 블록(103~107 flashrom, 124~131 binwalk, 150~160 firmwalker)이 있으나 실행 환경·보드 명세가 없고 실측이 아니라 예시 출력이다. 절차만 있고 환경이 없어 상한 8. |
| D | 13 | 같은 시리즈 인접 `chapter08-iot-standards.md`(표준)·`chapter10-sdlc.md`(SDLC)는 주제가 달라 겹치지 않고, chapter10 177행은 이 글을 자가 점검 참조로 인용만 한다. 다른 시리즈 `modern-recipes/part10-02-jtag-swd.md` 99~121행 RDP와 이 글 JTAG dump 절(78~91행)이 겹치나 역할이 다르다(디버그 bringup vs flash 추출). `buildroot/chapter18-security-cve.md`는 CVE·SBOM이라 중복이 작다. grep상 binwalk·Ghidra·firmwalker를 실제로 쓰는 공개 글은 ch09·ch10뿐이다. 10~14 구간. |
| E | 8 | 제목 'Binwalk·Ghidra·radare2 활용'의 키워드를 모두 이행한다(117·164·191행). description(5행)의 JTAG(78행)·SPI flash dump(93~107행)·정적(115행)·동적(217행)도 모두 있다. radare2 절(191~204행)이 얇아 9 이상은 보류. |
| F | 7 | Ch10 다음편의 번호·대상·공개 상태와 Ch2/7/8/10 라벨 및 뒤 설명을 확인했다. 25~44행 획득→정적→동적 도구 묶음, 294~315행 분석→확인 흐름, 323~339행 출시 전 점검으로 독자 경로를 구체화하므로 공통 H2 템플릿 이상의 구조를 인정해 F7. ASCII와 굵은 문단 형식만으로 F6 상한을 두지 않는다. 모바일 육안 검사는 하지 않았다. |
| G | 2 | 말미에 도구 출처 링크(388행 Ghidra, 389행 binwalk, 390행 Firmadyne, 391행 FACT, 392행 AFL++, 393행 radare2 book)가 있으나 홈페이지일 뿐 버전·대조 날짜가 없고, 189행 CVE 귀속, 166행 'Ghidra NSA 2019 공개', 359행 RDP/APPROTECT glitch 우회에 연결된 1차 출처가 없다. |

게이트 재판정: 미검증. git log(0a9dd7bc URL 동결, bfd34a20 태그 정규화, be973200 topic 메타, ac24bb76 제목 변경, 그 외 outline·린터·최초 집필 커밋)에 CVE 번호·도구 동작을 NVD·벤더 advisory·도구 문서와 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### chapter10-sdlc.md

source_file: `src/content/blog/embedded/embedded-security/chapter10-sdlc.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter10-sdlc`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 57행 '연간 최소 4시간 갱신이 Microsoft SDL의 기준선', 43행 'SDL 12개 practice'를 SDL 문서로 확인하지 않았다. - 138행 '-fcf-protection=full (Intel CET / ARM BTI)': GCC에서 -fcf-protection은 x86 전용이고 AArch64 BTI는 -mbranch-protection이라고 기억하지만 GCC 문서로 확인하지 않았다. - 129행 `-D_FORTIFY_SOURCE=2`의 최적화 조건 누락, 137행 -ftrapv 분류 미확인. - 215행 `bitbake -c create_spdx core-image-minimal`의 Yocto 사용법, 217·220행 `syft packages` 서브커맨드의 현행 상태 미확인. - 255~260행 SLSA Level 4: SLSA v1.0은 Build L0~L3만 둔다고 기억하나 미확인. 230행 'CycloneDX 1.4부터 VEX' 미확인. - 302~313행 CRA 24시간 보고의 기산점과 T+72h·T+90d 단계가 CRA Art. 14와 맞는지 미확인. - 66~70행 SR의 ETSI 조항 매핑은 원문과 대조하지 않았다(chapter08 46~54행과는 일치). - 155·157행 sizeof(dst)는 dst가 배열일 때만 맞다. 선언이 없어 판단 보류. - 351행 'Embedded Security CTF'의 실체 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 ETSI·NIST·CRA 조항을 붙인 SR-01~10 표(63~76행), cipher suite와 pinning CA까지 적은 acceptance criteria 예(78행), STRIDE 표의 빈 칸을 보안 갭으로 보는 design review 기준(95행), T+0h~T+90d CRA 대응 타임라인(304~313행)이다. 정적 분석 도구 표(107~115행), 하드닝 플래그(123~142행), OWASP IoT Top 10(183~194행), SLSA 레벨(255~260행)은 선택 기준이 거의 없다. 99행 '자동화 도구가 도움 됩니다', 165행 '큰 도움이 됩니다'는 일반론이고 117행은 문장이 깨져 있다. 13~19 구간 하단. |
| B | 13 | 23~41행의 7단계를 Training(45~57행)부터 Response(274~335행)까지 모두 다루고 실수(372~396행)·정리(398~407행)까지 있다. Training 절은 표 하나와 출처 없는 '연간 4시간'(57행)뿐이고, 43행 'Microsoft SDL의 12개 practice'를 7단계로 묶었다면서 대응표가 없다. 정확성 불확실(129·138·215·259행)이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | bitbake·syft·make legal-info(213~224행), cosign sign-blob/verify-blob(264~270행), osv-scanner(329~331행), VEX JSON(232~247행), security.txt(291~298행)가 있다. 도구 버전, 실행 환경, 예상 출력은 없다. 하드닝 플래그(125~142행)는 툴체인과 타깃을 밝히지 않는다. 57행 '연간 최소 4시간', 179행 '1주·출시 2~3개월 전', 144행 '경고 1000개', 287행 '보통 90일'은 출처 없는 수치라 C ≤ 8. |
| D | 10 | 실제 양쪽 범위: 이 글 SBOM 198~232행 ↔ bsp/chapter20-production.md 323~345행, buildroot/chapter18-security-cve.md 116~140행. legal-info/create_spdx/syft가 겹치지만 이 글의 위협 모델·release/incident response 프로세스는 별도다. 동일 시리즈 ch08 표준 요구와 운영 실수도 일부 반복되어 D10 유지. |
| E | 7 | title·description(5행)의 키워드(SDL, threat modeling, SBOM, supply chain, 사고 대응)는 43·80·200·251·300행에서 다룬다. 19행이 약속한 '임베디드에 특화된' SDLC는 일부만 지킨다. 하드닝 플래그(133·142행)와 컨테이너 SBOM(220행)은 Linux·서버 기준이다. description의 '시리즈 마무리'도 ch11~13 공개로 맞지 않는다. |
| F | 6 | Ch1/8/9 및 RTOS TrustZone 실제 title·slug·order·공개 상태와 본문 학습표를 확인했다. MISRA/CERT/DO-178C를 표준 학습 분야로 적은 것만으로 틀린 공개 target이라고 확정하지 않아 상한 근거 철회. 시리즈 10편 마지막이라는 안내가 실제 공개 Ch11~13을 반영하지 못하며 표·공백 위주 단계 안내라 F6. |
| G | 3 | 420~427행에 Microsoft SDL·OWASP SAMM·OWASP IoT Top 10·CycloneDX·SPDX·SLSA·Sigstore·OSV.dev 링크가 있고, CycloneDX 1.5·SPDX 3.0(208~209행), OWASP IoT Top 10 2018(181행), ETSI 조항 번호(66~70행)를 적었다. 57행 '연간 4시간'의 SDL 위치, 302행 CRA 조문, 255~260행 SLSA 버전, EU CRA·ETSI 원문 링크와 도구 버전이 없다. |

게이트 재판정: 미검증. git log(14cffad8 시리즈 10편 작성, 400892d7·55e250f2 날짜 정리, c78aa440·77e2773b 공개·draft 전환, 49f2a443·c38cb67c text 블록 변환, 3a5602d3 린터, ac24bb76 제목 변경, fa55144d 링크 수리, be973200 topics, bfd34a20 태그, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋이 없다. 내부 모순 후보(302행 ↔ 308~309행, 278행 ↔ 335행, 155행 ↔ 157행)는 모두 둘 다 참일 수 있다.

병합 대상·다음 조치: 병합 대상 없음. 다른 글의 기술을 SDLC 단계에 배치하는 역할은 chapter01·chapter08·buildroot ch18·bsp ch20 어디에도 없고 '임베디드 secure SDLC'라는 독립 검색 의도가 있다. 다음 조치는 보강이다. (1) 5·17·339·409행의 '마지막 장·10개 장·시리즈 마무리'를 고치고 Ch 11로 가는 다음 편 안내를 넣는다. (2) 362~366·416~418행의 공개 글 없는 시리즈 항목을 지운다. (3) 86~93행 STRIDE 표는 chapter01 83~92행으로 링크하고 설계 리뷰 산출물 관점만 남긴다. (4) 57·144·179·287행 수치, 하드닝 플래그, SLSA 레벨, 215·217행 명령을 1차 자료로 확인해 출처와 버전을 달고, 확인하지 못하면 지운다.  


### chapter11-pcie-cxl-ide.md

source_file: `src/content/blog/embedded/embedded-security/chapter11-pcie-cxl-ide.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter11-pcie-cxl-ide`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 15·117행 'AES-GCM 256으로 TLP·CXL.mem flit 암호화', 35행 'IV counter로 재전송 차단'은 CXL.cachemem 기준으로만 출처가 붙었다. PCIe IDE(TLP) 쪽은 PCIe Base Spec으로 확인하지 않았다. - 43행 PCIe r7.0 §6.33 인용은 커널 소스 경유이고 drivers/pci/ide.c를 열지 않았다. - 96·99행 lspci IDE capability 출력의 pciutils 지원 버전 미확인. - 37행 'IDE는 MITM 자체를 막지 않는다'는 CXL Ch14 26~27행과 강조점이 다르다. 29행 위협 정리도 Ch14 26행보다 좁다. 다른 글과의 차이라 오류 확인 대상이 아니다. - factcheck는 커밋 7714a58a 본문 기록에 의존했다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 본문 대부분이 CXL 3.1 §11 요약이다. 56~61행 AES-GCM 표, 67~71행 CXL_IDE_KM 3단계, 81~84행 Containment/Skid 표는 spec 항목을 옮긴 것이고 같은 표가 CXL 4.0 Internals Ch 14 64~97행에도 있다. 작성자 해석은 19~23행(TrustZone·TEE 다음에 링크가 남는 이유), 37행(MITM 자체는 못 막지만 의미 있는 조작은 막음), 73행(SPDM session 키는 IDE 키가 아니라 통로), 103~113행 오해 세 개다. 88행 성능 비용은 TBD. 6~12 구간 상단. |
| B | 11 | 위협(27~39행) → stream 종류(41~50행) → 알고리즘(52~61행) → 키 관리(63~75행) → 모드(77~88행) → 확인 명령(90~99행) → 오해(101~113행) → 정리(115~121행) 흐름은 완성됐다. 제목의 PCIe 쪽은 45~48행 표 하나뿐이고 알고리즘·키 관리는 CXL.cachemem만 다룬다. 88행 성능 TBD, 96행 lspci 실제 출력 없음. 15·35행 PCIe 쪽 출처 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 재현 가능한 것은 96행 `lspci -vvv -s 5e:00.0 \| grep -A 12` 명령과 99행 출력 필드 설명뿐이다. 실제 출력, pciutils 버전, 커널·플랫폼 조건, 합격·실패 관찰 절차가 없다. 88행은 실측이 없다고 스스로 밝힌다. 4~7 구간. |
| D | 6 | 이 글 45~86·111~113행과 hardware/cxl/chapter14-security.md 48~97·160~162행을 양쪽 읽었다. Link/Selective, cachemem IDE, CXL_IDE_KM 세 단계와 session≠IDE key, Skid 설명이 거의 같고 CXL Ch14가 보호 제외 범위·aggregation 값까지 더 자세하다. 이 글 고유 PCIe 표/lspci 설명은 남으므로 D6 유지. |
| E | 6 | description(5행)의 sniff·MITM(27~37행), AES-GCM(52~61행), Selective vs Link(41~50행), CXL_IDE_KM(63~75행), Containment·Skid(77~86행)는 모두 있다. 제목 'PCIe·CXL IDE 분석'에서 PCIe IDE는 45~48행 표 하나뿐이라 키워드 하나를 부분 이행했다. |
| F | 7 | 123행 다음 편 'Ch 12: SPDM과 CMA 인증 흐름'은 seriesOrder 12와 맞다. 127~132행 관련 항목 6개(Ch4·Ch5·Ch12·Ch13, HBM Ch9, Perf Eng Ch 54)를 열어 라벨·번호·`draft: false`를 확인했다. 19행이 전제 Ch4·Ch5를, 70행이 Ch12를, 105행이 Ch13을 가리킨다. 같은 주제를 더 자세히 다루는 CXL 4.0 Internals Ch14로 가는 링크는 없다(Ch14 83·179행은 이 글을 링크함). |
| G | 4 | 주장마다 본문 출처가 붙어 있다: CXL 3.1 §11.2 Table 11-1(50행), §11.3·§11.3.1·§11.3.4(54~61행), §11.4(65행), §11.3.4(73·75행), §11.3.5(79·113행), §11.3(86·109행), NIST SP 800-38D(54행), PCIe r7.0 §6.33을 인용하는 커널 drivers/pci/ide.c(43행), pciutils ls-ecaps.c(99행). 링크·pciutils·커널 버전·대조 날짜가 없어 5점은 아니다. |

게이트 재판정: 검증됨. 커밋 7714a58a "fix(content): Embedded Security Ch 11 — fact-check PCIe/CXL IDE against CXL 3.1 §11" 본문에 출처(CXL 3.1 spec §11.1~11.4·§14.11.1, Linux master drivers/pci/ide.c, pciutils ls-ecaps.c cap_ide)를 적고 Link/Selective 표, IV 구조(32+64bit), IDE_KM 절차, key refresh, lspci 출력 형식, CMA 전개를 고쳤으며 출처 없는 성능 수치·디바이스 지원 표를 지웠다. 그 이전 23ed6256은 출처 없는 qualify·삭제 커밋이라 근거로 쓰지 않았다. 평가 중 CXL·PCIe spec 원문은 열지 않았다. 2026-10-19에는 해당 커밋 본문과 현재 전문을 직접 읽었다. 기존 출처 대조 기록 범위의 검증됨을 유지하며, PCIe 전반·실제 lspci 실행까지 독립 재검증했다는 뜻은 아니다.

병합 대상·다음 조치: 후보 `src/content/blog/embedded/hardware/cxl/chapter14-security.md`(CXL 4.0 Internals Ch 14). CXL.cachemem IDE 부분(54~61, 63~75, 77~86, 111~113행)이 Ch14 56~97·160~162행과 거의 같고 Ch14가 더 자세하다. 다음 조치는 보강이다. Ch12·Ch13이 이 글을 앞 글로 링크하고 'PCIe IDE 확인'이라는 독립 검색 의도가 있으므로, CXL.cachemem 세부는 Ch14 링크로 줄이고 PCIe 쪽(Link/Selective stream 설정, PCIe IDE_KM, lspci 실제 출력과 pciutils 버전)을 1차 자료로 채운다. 차별화가 안 되면 Ch14로 병합한다. Ch14 83행 '자세한 내용은 Ch11' 문구도 함께 정리한다.  


### chapter12-spdm-cma.md

source_file: `src/content/blog/embedded/embedded-security/chapter12-spdm-cma.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter12-spdm-cma`

score_status: 잠정 · score: 62 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 102~108행 DMTFSpecMeasurementValueType 표가 0x0~0x4만 적었다. DSP0274 최신 판에 0x5 이상이 있는지 확인하지 않았다(42423bce는 Table 61 0x0~0x4로 대조했다고 적음). - 139행 'SPDM은 세션 시작 전 한 번'이 69행(secure session이 이후 CXL_IDE_KM을 보호)·ch11 120행 key refresh와 어긋날 수 있다. 1차 자료로 확인하지 않았다. - 38행 '현 릴리스 1.4.1 (2026-06-26)'은 글 date(2026-06-17)보다 뒤 날짜로, stale해질 날짜 앵커다. - 80~81행 sysfs 예시 출력이 실제 장치 출력인지 표기가 없다. - cxl ch06 152행 'SPDM은 DMTF가 정의합니다'와 이 글 84행 Vendor 0001h(PCI-SIG) type 1 표기의 차이는 다른 글과의 표현 차이라 1차 자료로 정해야 한다.  

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 69행 'session 키가 곧 IDE 키는 아님'(CXL 3.1 §11.4), 84행 DOE feature 0001:01·0001:02를 sysfs doe_features와 연결하고 lspci는 출력하지 않는다는 지적, 141~143행 측정 기준값이 spec 범위 밖이라는 교정은 이 글만의 해석이다. 48~67행 18단계 메시지 표와 94~108행 Param2·MeasurementValueType 표는 DSP0274를 옮긴 수준이고, 126~133행 공격 표는 '정품만 통과'·'보장'처럼 일반론이며 27·143행의 호스트 정책 조건을 반복하지 않아 범위가 불명확하다. 실패 사례·선택 기준이 없어 part12-10 앵커(A 18)보다 낮다. |
| B | 12 | 필요성(21~27행) → 메시지 시퀀스(48~69행) → DOE(75~86행) → CMA 측정(90~110행) → DICE(114~122행) → 공격 표(126~133행) → 실수(137~143행) → 정리(147~151행) 흐름은 끝까지 간다. DICE 절이 SPDM 인증서 chain과 어떻게 이어지는지 없고, 18단계 표에 ERROR 응답·생략 가능 단계가 없으며, 'firmware integrity 검증'은 143행 '기준값은 따로 확보'로 끝난다. 정책 조건 생략을 직접 모순으로 확정하지 않으므로 기존 오류 가산 감점을 되돌려 12점이다. AP-C-24 상한 B ≤ 13 안이다. |
| C | 6 | 재현할 수 있는 것은 77·80~81행 lspci·sysfs 명령과 예시 출력(0001:01 0001:02 doe_discovery)뿐이고 커널 버전·디바이스·BDF 5e:00.0의 정체가 없다. libspdm·spdm-emu 같은 실행 도구, 관찰 결과, 합격·실패 절차가 없다. 수치는 spec 값이라 C ≤ 8 상한 사유는 아니지만 관찰 결과가 없어 4~7 구간. |
| D | 12 | 이 글 69행 session≠IDE key와 ch11 73행 및 hardware/cxl/chapter14-security.md 87~97행을 양쪽 읽었다. 일부 같은 설명이지만 이 글 48~67행 메시지 순서, 94~108행 측정값 요청 표, 114~122행 DICE 전개가 별도이며 CXL Ch14 44행은 시퀀스를 이 글로 위임한다. D12 유지; 열지 않은 다른 비교 글은 근거에서 제외. |
| E | 7 | title '디바이스 신원과 펌웨어 측정 검증'과 description의 SPDM 메시지 흐름·CMA·PCIe/CXL 신원 확인은 48~69·90~110행에서 다룬다. '펌웨어 측정 검증'은 측정값을 받는 법(92~110행)까지만 있고 검증 자체는 143행에서 spec 범위 밖이라며 넘긴다. |
| F | 7 | 153행 다음 편 'Ch 13: CXL TEE 확장 — TDISP, CXL TSP, Linux PCI TSM'은 seriesOrder 13 `chapter13-cxl-tee.md`(15·27~28행 TDISP·TSP, 61행 PCI TSM)와 맞다. 관련 링크 4개(157행 Ch 11, 158행 Ch 13, 159행 Ch 2, 160행 Ch 5)의 라벨이 대상 title과 맞다. 159행 'DICE와 같은 chain of trust'는 chapter02 330행이 Chain of Trust를 다루므로 틀린 링크로 보지 않았다. 17행이 Ch 11과의 연결을 안내한다. 전제 지식 안내가 없다. |
| G | 4 | 주장과 묶인 본문 출처: 27·143행 DSP0274 Scope, 69행 CXL 3.1 §11.4, 84행 Linux include/linux/pci-doe.h·Documentation/ABI/testing/sysfs-bus-pci, 90행 CXL 3.1 §14.11.1, 114행 Open Profile for DICE, 161행 DSP0274 링크. 버전은 37~38행 SPDM 1.0.0·1.4.1과 CXL 3.1. GET_MEASUREMENTS 표(94~108행)의 DSP0274 판·표 번호와 Linux 버전이 없고 링크된 출처는 161행 하나라 5점은 아니다. |

게이트 재판정: 기존 오류 확인 철회. 27·143행은 수락 정책이 호스트에 있음을 명시하고, 126~133행은 그 정책으로 인증서/정상 hash를 검증하는 공격 방어 예로도 읽힌다. 표의 “거부”를 SPDM 규격이 기준값을 자동 결정한다는 명제로 등치할 수 없고 본문 완곡 설명/단정 요약 차이만으로 확정하지 않는다. 다만 133행 “SPDM 자체…정품 보장”의 범위가 무조건적이어서 커밋 42423bce의 정책 교정으로 글 전체까지 검증됐다고 유지하지 않는다. 현재 잔여 표현을 DSP0274 및 실제 trust-anchor 정책에 대조하기 전 미검증이다. 커밋 본문을 직접 읽은 것은 기존 대조 이력 확인이며 새 전면 검증이 아니다.

병합 대상·다음 조치: 전체 병합 대상 없음. SPDM 메시지·CMA 측정이라는 독립 검색 의도가 있다. 133행 보장 범위에 호스트 trust-anchor/기준 hash 정책 조건을 명시하고 실제 검증 실패 흐름과 1차 자료를 보강한다.


### chapter13-cxl-tee.md

source_file: `src/content/blog/embedded/embedded-security/chapter13-cxl-tee.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter13-cxl-tee`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 61·85행 'Linux mainline(v7.3-rc6)'에서 `pci_tsm_ops` 구현이 SEV-TIO 하나뿐이라는 주장은 커밋 95e68b79 기준이다. upstream을 직접 열지 않았고 이후 TDX Connect·CCA 병합 여부도 확인하지 않았다. - 32행은 TSP의 SPDM 1.2 이상 요구를 §11.5.3.2로, CXL Ch14 46행은 §11.5.2로 적었다. 다른 글과의 모순이라 CXL 3.1 spec으로 확인해야 한다. - 45행 `tsm/bound` 반환값 설명을 sysfs-bus-pci ABI 문서와 대조하지 않았다. 72행 `cat tsm/connect` 출력 형식 미확인. - 113행 TSP side channel 범위의 근거로 §11.1을 든 것이 적절한지 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 27~32행이 PCI-SIG TDISP와 CXL TSP를 나누고 서로 의존하지 않는다고 적는다. 38~45행이 Linux ABI의 TDISP 4상태와 `tsm/bound`의 의미를 정리하고 49~55행 TSP target 상태와 구별한다. 113행은 TSP의 side channel 대응을 '관찰한 패킷'으로 좁힌다. 51~55행 상태 표와 91~99행 위협 표(Table 11-19)는 spec 표를 거의 그대로 옮겼고, 21행 '왜 필요한가'는 세 문장 일반론이다. 실제 Type 3 디바이스에서 TDISP와 TSP를 함께 쓰는 판단 기준은 없다. 13~19 구간 중간. |
| B | 12 | 동기(19~21행) → 구성 요소(25~32행) → TDISP 상태(36~45행) → TSP 상태·범위(49~57행) → Linux 흐름(61~85행) → 위협 모델(89~99행) → 실수(103~117행) → 정리(121~125행)로 기본 흐름은 끝까지 간다. 78행은 bind를 'VFIO/IOMMUFD가 시작합니다' 한 문장으로 넘기고, 82행 `guest_req`는 설명이 없으며, Type 3에서 TDISP(CXL.io)와 TSP(CXL.mem)가 어떻게 맞물리는지 없다. 정확성 불확실(v7.3-rc6 상태, §11.5.3.2 인용)이 열려 있어 B ≤ 13. |
| C | 7 | 63~76행에 실제 sysfs 경로(`/sys/class/tsm/`, `tsm/connect`, `tsm/bound`)를 쓴 명령이 있고 78행에 해제(`tsm/disconnect`)가 있다. 출력은 66행 `tsm0` 하나뿐이고 72·75행 `cat`은 예상 출력이 없다. 필요한 하드웨어·펌웨어(SEV-TIO 지원 EPYC, TDISP 지원 디바이스)와 커널 config가 없다. 4~7 구간 상단. |
| D | 7 | 이 글 53~55·83~85·103~109행과 hardware/cxl/chapter14-security.md 103~138·152~158행을 양쪽 읽었다. TSP 상태·범위·SEV-TIO 및 오해 교정이 겹친다. 이 글 38~45행 TDISP 상태, 63~78행 sysfs 절차, 91~99행 위협 표는 별도이며 실제 실행 출력/환경은 없다. D7 유지. |
| E | 7 | description(5행)의 TDISP·CXL TSP·Linux PCI TSM을 모두 다룬다(36~57행, 61~85행). 제목의 'Trusted Execution을 메모리 디바이스까지'는 TSP 절(49~57행)이 이행한다. 본문 절반이 PCIe TDISP와 Linux PCIe 프레임워크이고 85행은 CXL TSP 코드가 mainline에 없다고 밝혀 PCIe 쪽으로 치우친다. tags(8행)의 arm-cca는 85행 한 줄뿐. |
| F | 4 | seriesOrder 13은 시리즈 마지막 글이다. 17행이 Ch 5·11·12를 전제로 묶고 127~135행이 다음 단계를 안내한다. 그러나 134행 'Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석'의 대상 `part11-17-linux-cxl-driver.md`는 seriesOrder 152이고 151은 `part11-16-qemu-cxl-emulation.md`다. 143행 HBM Ch 12 링크 설명 '데이터센터에서의 TEE 통합 그림'은 대상 `chapter12-cxl-pooling-fabric.md`에 TEE 언급이 없다(154행 보안 링크 한 줄뿐). 틀린 링크가 있어 F ≤ 5. CXL 4.0 Internals Ch14 링크가 없고, 129행은 흐름을 'TEE → SPDM → IDE'로 적어 실제 장 순서(Ch 11 IDE → Ch 12 SPDM)와 다르다. |
| G | 4 | 주장마다 1차 출처 위치가 붙어 있다. CXL 3.1 §11.5(28행), 개정 이력과 §11.5.3.2(32행), §11.5.4.8(49행), §11.5.2(57·109행), §11.5.3.3 Table 11-19(89행), §11.1(113행), DMTF DSP0274(29행), Linux v7.3-rc6(61·85행)과 `Documentation/ABI/testing/sysfs-bus-pci`, `include/linux/pci-tsm.h`(36행), `drivers/crypto/ccp/sev-dev-tsm.c`(83행), `PCI_TSM_REQ_STATE_CHANGE` 주석(45행). 링크·대조 날짜가 본문에 없어 5점은 아니다. |

게이트 재판정: 검증됨. 커밋 95e68b79 "fix(content): Embedded Security Ch 13 — separate PCI-SIG TDISP from CXL TSP, use real Linux TSM ABI" 본문에 'Sources: CXL 3.1 spec §11.1, §11.5.1–11.5.4.8, Table 11-19, revision history; Linux v7.3-rc6 / master drivers/pci/tsm.c, include/linux/pci-tsm.h, drivers/crypto/ccp/sev-dev-tsm.c, Documentation/ABI/testing/sysfs-bus-pci'가 있고, 틀린 주장(TDISP 공동 정의, 지어낸 sysfs 경로 등)을 고치고 근거 없는 주장을 지운 기록이 있다. 앞선 23ed6256은 출처 없이 표현만 누그러뜨린 커밋이라 근거로 쓰지 않았다. 평가 중 1차 자료는 열지 않았고, 글 안의 모순은 찾지 못했다(15·45·68·117·122행 서로 맞음). 2026-10-19 해당 커밋 본문과 현재 원문 전문을 직접 읽어 범위를 확인했다. 기존 공식 사양·Linux ABI 대조 기록에 근거하며 새 upstream 전면 검증이나 target 실행을 뜻하지 않는다.

병합 대상·다음 조치: 후보 `src/content/blog/embedded/hardware/cxl/chapter14-security.md`(CXL 4.0 Internals Ch 14). 겹치는 부분은 TSP 상태 표(53~55 ↔ 123~125), TSP 범위(57·109 ↔ 105~115), 실수 두 개(103~109 ↔ 152~158), SEV-TIO 표(83~85 ↔ 136~138)다. 다음 조치는 보강(차별화)이다. Linux PCI TSM sysfs ABI, TDISP 상태, TSP 위협 모델이라는 독립 검색 의도가 있어 합치지 않는다. (1) TSP 상태·범위·실수 절은 줄이고 CXL Ch14로 링크한다. (2) 36~45·61~78행에 예상 출력과 실행 환경을 보강한다. (3) 134행 'Ch 151'을 'Ch 152'로 고치고 143행 HBM Ch 12 설명을 대상에 맞게 바꾸거나 CXL Ch14 링크로 바꾼다. 시리즈 마지막 글이라 허브 예외는 적용하지 않는다.  


### chapter01-overview.md

source_file: `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview.md`

url: `https://hawk90.github.io/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 55행 'CLIC 인터럽트 컨트롤러를 자체 구현'과 ch02 213행 'CLIC와 비슷하지만 호환되지 않는 자체 구현'의 표현 차이를 TRM으로 확인하지 않았다. - 30·124행 'Flash 4 MB on-package (대부분 모델/모듈)', 137행 WROOM-02의 flash 배치를 데이터시트로 확인하지 않았다. - 122행 'SRAM 400 KB 중 사용 가능 약 320 KB'의 근거 미확인. - 129행 'Active ~80 mA @ WiFi TX'가 데이터시트 TX 피크와 맞는지 미확인. 131행 140 µA와 ch12 27행 130 µA 차이는 다른 글과의 불일치라 오류 확인에 넣지 않았다. - 38행 'AES/SHA/RSA + ECC (HMAC)', 36행 Touch 미지원, 35행 ADC 6 ch, 99행 150 Mbps(HT40) 미대조. - 39행 모듈 가격대, 51행 '칩당 수십 센트', 17행 라이선스 비용 변동, 228행 '95% 이상 호환'은 출처 없는 주장이다. - 177행 chip_info.revision의 /100·%100 해석이 v4.3에서도 같은지 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 17행 Tensilica→Cadence 인수와 라이선스 비용으로 전환 배경을 푼 서술, 43행 'C3는 ESP8266 시장, ESP32 시장은 S3'라는 포지셔닝, 228행 포팅 때 다시 짜야 할 부분(어셈블리 ISR·듀얼 코어 동기화·Hall/Touch) 목록이다. 25~39행 비교표, 95~114행 WiFi·BLE 사양, 120~137행 메모리·전력·패키지는 데이터시트 요약 수준이다. 45~59행 세 이유는 일반론이고 51행 '수십 센트', 17행 '라이선스 비용이 흔들리기 시작'은 출처가 없다. 앵커 part1-04(A 10)보다 FAQ(220~236행)만큼 위. |
| B | 12 | 비교(21~43행) → 전환 이유(45~59행) → ISA·PMP(61~87행) → 무선(89~116행) → 메모리·전력(118~139행) → 개발 환경·hello_world(141~201행) → 로드맵(203~218행) → FAQ(220~236행) → 정리(238~246행)로 흐름은 끝까지 간다. 정확성 불확실(122·129행, 55행 CLIC)이 열려 있어 B ≤ 13. 41·244행은 DAC가 빠졌다고 하지만 25~39행 비교표에 DAC 행이 없다. 허브 로드맵 표(205~218행)가 실제 ch09·ch10·ch12 주제와 맞지 않는다. |
| C | 7 | 145~158행 설치·빌드 명령, 164~185행 hello_world 코드, 195~201행 예상 출력이 있다. 129~132행 전력값(~80 mA/15 mA/140 µA/5 µA), 39행 가격대, 122행 '사용 가능 약 320 KB', 112행 Coded PHY ~1 km는 출처·환경 없는 수치라 C ≤ 8. 177행 revision 해석이 143행 v4.3 이상과 147행 release/v5.1 중 어느 기준인지 밝히지 않았고, 196행 'I (xxx)'는 자리표시자이며 보드·포트가 없다. |
| D | 11 | 이 글 61~87행 RV32IMC/PMP 개관 ↔ chapter02 21~40·155~205행을 양쪽 읽었다. 개요가 상세 PMP를 Ch2로 위임하므로 예고/상세 역할이 구별된다. 전환 배경·사양 비교와 개발 환경 허브라는 검색 의도에 D11 유지. 읽지 않은 draft 비교 글은 근거로 사용하지 않았다. |
| E | 5 | 제목은 'ESP32-C3 분석 — Espressif가 Xtensa에서 RISC-V로 갈아탄 이유'다. 본문은 사양 비교(25~39행), 사양 나열(95~137행), 설치 절차(141~201행)가 대부분인 소개 수준이고, '이유'는 17행과 45~59행의 출처 없는 일반론 세 가지다. 루브릭의 '분석 약속 + 개념 소개 수준 = 3~5점'을 적용했다. description의 'WiFi 4 + BLE 5.0, 32-bit RV32IMC'는 이행하므로 구간 상단. |
| F | 4 | 250행 다음 편 'Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러'는 seriesOrder 2 `chapter02-riscv-core.md`와 맞고 255~257행 링크 라벨도 ch02·ch03·ch11과 맞다. 그러나 258행 'Modern Embedded Recipes Part 5.2: WiFi provisioning'의 실제 part5-02는 `part5-02-dc-motor.md`, 259행 'Practical RTOS Internals Part 1.1: 듀얼 코어 vs 싱글 코어'의 실제 part1-01은 `part1-01-why-rtos.md`라 라벨이 틀렸다(F ≤ 5). 허브 로드맵 표도 215행 Ch 9 'RTC·저전력'(실제 `chapter09-esp-idf-build.md`), 216행 Ch 10, 218행 Ch 12 '양산 워크플로'(실제 `chapter12-power-management.md`)가 틀리고 링크가 없다. 246행 진행 순서도 같다. |
| G | 2 | 260~261행 1차 자료 링크 두 개(ESP32-C3 Datasheet, ESP-IDF Programming Guide)는 글 끝에 모여 있어 39행 가격, 129~132행 전력, 122행 SRAM 같은 주장과 연결되지 않고 데이터시트 판 번호가 없다. 버전 표기는 147행 release/v5.1, 143행 v4.3 이상, 232행 Arduino-ESP32 2.0.x가 있다. |

게이트 재판정: 미검증. git log(575ac7e8 stub, 7b2b5e69 시리즈 작성, ce78221e text 블록 정리, 03ec1f08, ac24bb76 제목 변경, fa55144d 링크 해결, be973200·0a9dd7bc·3232b1be 메타데이터·태그, 6cab6d72 39행 `\$` 이스케이프)에 ESP32-C3 datasheet·ESP-IDF 문서와 대조한 커밋이 없다. 15행 'Xtensa LX7을 버리고'와 27행 'ESP32 = LX6'은 S2/S3가 LX7이라 모순으로 보지 않았다.

병합 대상·다음 조치: 시리즈 허브라 병합 검토 대신 보강이다. 다음 조치: 258·259행 관련 항목을 지우거나 실제 글로 바꾸고, 205~218·246행 로드맵을 실제 ch09·ch10·ch12와 맞추고, 129~132·122·39행 수치에 데이터시트 판과 출처를 단다.  


### chapter02-riscv-core.md

source_file: `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core.md`

url: `https://hawk90.github.io/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 57행 `c.sw a0, 0(sp)`의 인코딩 0xc02a는 비트로 풀면 c.swsp 형태다. c.sw는 rs1이 x8~x15여야 해 sp 기준은 c.swsp다. RISC-V Unprivileged Spec으로 확인하지 않았다. - 207·279·289행: M-mode(64행)에서 L 비트 없는 PMP 엔트리(200행 cfg 0x19)가 M-mode 접근을 막는지 Privileged Spec 미확인. - 150행 mcause 0x8000001F(원인 코드 31)를 External interrupt로 적었는데 217행은 CPU INT 0~30이라 한다. C3 TRM 미확인이라 오류 확인으로 올리지 않았다. - 38·64행 U-mode 미구현, 217·308행 '31개 외부 source'의 의미, 246~254행 우선순위 1~7·Level 6 예약·Level 7 NMI 체계를 C3 TRM으로 확인하지 않았다. - 213행 '표준 RISC-V는 PLIC을 정의'와 15행 'CLINT/PLIC 대신 변형 CLIC'의 관계 미확인. 293행 light-sleep 후 mcycle 재설정 여부 미확인. - 27·29행 수치는 출처가 없다. 60행과 285행 Zicsr 문구의 GCC 버전 경계 미확인. - 225·233행 `driver/timer.h`·`ETS_TG0_T0_LEVEL_INTR_SOURCE`가 ESP-IDF 5.x에서 유효한지 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 64 KB 영역 NAPOT 인코딩 계산(180~190행)과 그 값을 쓰는 인라인 어셈블리(196~205행), C3 Interrupt Matrix와 esp_intr_alloc 예(213~242행), '자주 하는 실수' 다섯 개(283~301행)다. RV32IMC 확장 표(25~40행), 특권 단계(64~71행), CSR 주소 표(99~114행), csrrw/csrrs/csrrc(90~95행)는 RISC-V 입문 자료 수준이다. 293행 '재설정될 수 있습니다'는 완곡 표현이라 일반론으로 보고, 299~301행 C++ exception 항목은 장 주제와 관계가 약하다. 6~12 구간 상단. |
| B | 12 | ISA(21~60행) → 특권 모델(62~84행) → CSR(86~153행) → PMP(155~209행) → 인터럽트(211~254행) → 부트(256~279행) → 실수(281~301행) → 정리(303~311행)로 흐름은 완성됐다. 정확성 불확실(57행 c.sw 인코딩, 207·279행 M-mode에서 L 비트 없는 PMP 적용, 246~254행 우선순위 체계, 150행 vs 217행)이 열려 있어 B ≤ 13. 우선순위 절(246~254행)은 표 한 개와 두 문장이고 254·297행이 말하는 Level 4+ 어셈블리 핸들러 예가 없다. |
| C | 6 | 코드(120~134행, 196~205행, 223~240행)는 있지만 ESP-IDF·GCC 버전, 보드, 실행 결과, 관찰 방법(PMP 위반 시 panic 출력 등)이 없다. 207행 'load/store access fault가 발생'은 확인 절차 없이 결과만 적었다. 27행 '약 40개', 29행 '약 30개'·'코드 크기 ~25% 감소'는 출처 없는 수치라 C ≤ 8. |
| D | 11 | 같은 시리즈 chapter01 61~87행과 이 글 21~40·155~205행을 양쪽 읽었다. ISA/PMP 개관은 겹치지만 허브가 Ch2 상세를 명시적으로 위임하며 NAPOT 계산과 CSR 코드·인터럽트 절은 이 글의 깊이다. D11 유지. 외부 시리즈 전체 중복 부재는 검증하지 않았다. |
| E | 7 | 제목 키워드 RV32IMC(21~60행)·PMP(155~209행)·인터럽트 컨트롤러(211~254행)를 모두 다루고, description의 'M-mode only, PMP 16 entries'도 64·161행에서 이행한다. 인터럽트 컨트롤러 절은 개념과 API 호출 한 개 수준이고, 19행이 밝힌 독자 수준에 맞는 Level 4+ 핸들러·부트로더 PMP 코드가 없어 9 이상은 아니다. |
| F | 4 | 315행 다음 편 안내(Ch 3 메모리 맵·플래시·SPIFFS/LittleFS)는 seriesOrder 3 `chapter03-memory-flash.md`와 맞다. 그러나 322행 'Ch 11 — PMP Lock 비트 활용'의 대상 `chapter11-security.md`에는 PMP가 0회 나온다. 323행 'Practical RTOS Internals Part 2.3: 인터럽트 모델'은 링크가 없고 실제 part2-03은 scheduler-algorithm(RISC-V는 part2-07)이다. 324행 'Modern Embedded Recipes Part 3.5: 인라인 어셈블리'도 링크가 없고 part3-05는 linker-script-advanced다. 틀린 관련 링크로 F ≤ 5. |
| G | 2 | 325~326행에 RISC-V Privileged Spec 목록 페이지와 ESP32-C3 TRM PDF 링크가 있으나 판·버전이 없고, 99~114행 CSR 주소, 167~172행 A field, 247~251행 우선순위, 260행 ROM 주소와 절·표 번호로 연결되지 않는다. 153행 panic_handler.c, 219행 esp_intr_alloc도 ESP-IDF 버전이 없다. |

게이트 재판정: 미검증. git log(575ac7e8 스텁, 7b2b5e69 시리즈 12편 집필, 20c1b507·c38cb67c·03ec1f08·a080ac90·a4d1b21e ASCII→TikZ/표 변환, ac24bb76 제목 변경, fa55144d 링크 수리, be973200·0a9dd7bc·3232b1be 메타데이터)에 ESP32-C3 TRM·RISC-V Privileged Spec과 대조한 커밋이 없다. 원문 안 산술은 서로 맞는다: 183~185행 (0x40000000>>2)|(0xFFFF>>3)=0x10001FFF가 199행 코드 값과 같고, 187~189행 NAPOT+R → 0x19가 200행과 같다. 52~57행 addi 0x00150513, sw 0x00a12023, c.addi 0x0505도 맞는다. 150행 vs 217행은 C3 mcause 매핑 지식이 필요해 uncertainties로 두었다.

병합 대상·다음 조치: 병합 대상 없음. chapter01 87행이 PMP 상세를 이 글로 넘기도록 역할을 나눴고, `part2-07-riscv-context.md`는 RTOS context switch 관점이라 C3 고유 내용(NAPOT 예, Interrupt Matrix, 부트로더 PMP)을 받을 자리가 없다. 다음 조치는 보강이다. 독립 검색 의도(ESP32-C3 코어·PMP·인터럽트)가 분명하고, 감점 원인이 1차 자료 대조 부재, 틀린 관련 항목 셋(322~324행), 실행 환경·관찰 결과 부재로 고칠 수 있는 결함이다.  


### chapter03-memory-flash.md

source_file: `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash.md`

url: `https://hawk90.github.io/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 28~29행 주소 범위 0x4200_0000~0x4280_0000, 0x3C00_0000~0x3C80_0000은 8 MB 창인데 크기 칸은 4 MB다. MMU 창 크기와 플래시 크기를 섞은 것인지 TRM으로 확인하지 않았다. - 15·341행 'SRAM 400 KB' vs 25행 DRAM 384 KB(16 KB cache 포함 여부) 미확인. - 40행 'IRAM은 32-bit aligned read/write만', 86행 MALLOC_CAP_32BIT|EXEC가 ESP32(Xtensa) 제약을 옮긴 것인지 미확인. 50행 0x3FF44004도 ESP32 GPIO 레지스터 주소로 보이나 미확인. - 89·342행 MALLOC_CAP_RTCRAM의 C3·ESP-IDF 5.x 지원, 216행 subtype 'littlefs'와 222행 esp_littlefs.h(외부 컴포넌트 여부) 미확인. - 263·300행 롤백 조건과 CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE 관계 미확인. 188~189행 NVS 한도, 201~202행 출시 연도·라이선스 미확인. - 343행 '7개가 표준'이 ESP-IDF 기본 OTA 테이블과 다를 수 있다. - 274행 server_cert_pem_start 선언 누락은 빌드 설정을 알아야 판단되므로 오류 확인에 넣지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 메모리 영역 표(23~30행), heap caps 예(76~90행), 파티션 CSV(108~117행), NVS(154~191행), SPIFFS vs LittleFS 표(199~207행), OTA(250~311행)는 ESP-IDF 공식 가이드 주제를 한 장에 모은 구성이다. 이 글만의 판단은 heap 단편화 진단(100·319~321행), SPIFFS 마운트 실패 대응(335~337행), IRAM_ATTR 남용 경고(315~317행) 정도다. 199~207행 '메모리 사용 큼/작음', '마운트 깨짐 보고 다수'는 출처가 없고 300행 '처음 부트 후 N초 안에'는 빈 변수다. 6~12 구간. |
| B | 11 | 메모리 맵(21~70행) → heap(72~100행) → 파티션(102~148행) → NVS(150~193행) → FS(195~248행) → OTA(250~311행) → 실수(313~337행) → 정리(339~347행) 흐름은 끝까지 간다. 핵심 예제인 파티션 CSV(108~117행)가 104·131행이 말한 4 MB에 들어가지 않고, 274행 `server_cert_pem_start`의 extern·EMBED_TXTFILES 통합 조건이 생략되어 독립 빌드는 미확인이다. 10~15 구간 하단. |
| C | 6 | 코드(158~183, 221~246, 267~308행)와 idf.py 명령(135~148행)은 있지만 ESP-IDF 버전·보드·예상 출력이 없다. 188~189행 NVS 한도(15 chars, 4000 bytes), 321행 '총 free 100 KB'는 출처 없는 수치라 C ≤ 8. 파티션 CSV는 4 MB 모듈에서 그대로 쓸 수 없고, 50행 ISR 예의 0x3FF44004는 23~30행 주소 표 어느 영역에도 없다. |
| D | 10 | 이 글 102~140행 파티션 CSV/menuconfig ↔ chapter09 213~240행, 54~70행 RTC_DATA_ATTR ↔ chapter12 143~169행을 양쪽 읽었다. 파티션/부트 카운터가 겹치지만 heap caps·NVS·FS 선택은 별도 역할이다. D10 유지. 다른 비교 글의 기술 정확성은 이 비교만으로 검증하지 않는다. |
| E | 6 | 제목 '메모리 맵과 플래시 — SPIFFS·LittleFS 파일시스템 선택'과 21~248행 방향은 같다. description(5행)의 'MMU'는 28~29행 표 칸 'MMU mapped'뿐이고 설명이 없다. '선택'은 199~207행 표와 209행 'LittleFS 권장' 한 문장이라 용량·마모·파일 수 같은 기준이 없다. |
| F | 4 | 351행 다음 편 'Ch 4: GPIO·LEDC·MCPWM'은 seriesOrder 4 `chapter04-gpio-ledc-pwm.md`와 맞다. 그러나 358행 '[Ch 9: RTC·저전력] — RTC SRAM 활용 패턴'은 `chapter09-esp-idf-build.md`('ESP-IDF 빌드 시스템 분석')로 간다. RTC SRAM 내용은 `chapter12-power-management.md` 143행에 있다. 360~361행 'Modern Embedded Recipes Part 6.3', 'Practical RTOS Internals Part 3.2'는 링크 없는 관련 항목이다. F ≤ 5. 356·357·359행 라벨은 맞다. |
| G | 2 | 본문 출처는 362행 ESP-IDF Partition Tables(esp32c3, latest)와 363행 LittleFS DESIGN.md(master) 두 개뿐이고 어느 주장과도 연결되지 않는다. ESP-IDF 버전은 15·207행 '5.x'뿐이고 23~30행 메모리 맵·188~189행 NVS 한도의 TRM·데이터시트 판이 없다. |

게이트 재판정: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 104행 '플래시 4 MB는 파티션 테이블로 영역이 정해집니다'·131행 '총합이 flash 크기를 넘으면 안 됩니다. 위 예는 약 4 MB에 맞춰져 있습니다' ↔ 108~117행 CSV: 115행 ota_1이 0x2A0000+0x180000=0x420000(4.125 MB)에서 끝나 이미 4 MB(0x400000)를 넘고, 116행 spiffs는 0x420000+0x1E0000=0x600000(6 MB)까지 간다. 121~129행 표 합계(약 5.9 MB)도 4 MB를 넘고, 216행 LittleFS 예(storage 0x420000, 0x1E0000)도 같다. git log(0a9dd7bc slug 고정, be973200 topic 메타, e85d7684 코드 블록 산문 이동, fa55144d 링크 수정, ac24bb76 제목 변경)에 1차 자료 대조 커밋은 없다.

병합 대상·다음 조치: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준으로는 병합 대상 없음이다. heap caps·NVS·SPIFFS/LittleFS 비교는 시리즈 안에서 이 글에만 있다. 다음 조치는 보강이다. 파티션 CSV(108~117행)와 216행을 ESP-IDF partition-tables 문서 기준으로 0x400000 안에 다시 잡고, 358행 라벨을 chapter12로 고치거나 바꾸고, ch09 213~240행과 겹치는 파티션 설명을 한쪽으로 모은다.  


### chapter04-gpio-ledc-pwm.md

source_file: `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm.md`

url: `https://hawk90.github.io/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1); 비교는 해당 역사 앵커의 40~50점 대역과 항목별 관찰 기준

blockers: 하드웨어 target에 없는 MCPWM 사용과 LEDC 14-bit 상한 위반을 먼저 고쳐야 한다. 정책/P0 분류 자체는 미확정.

uncertainties: - 135행 내부 풀업 '약 45 kΩ'은 C3 데이터시트로 확인하지 않았다. - 83·90·395행 'Matrix 경로 1 코어 클럭 지연, 최대 40 MHz, 80 MHz는 IO MUX 직결에서만'은 TRM·SPI 문서로 확인하지 않았다(ch05 386~388행도 같은 주장). - 87행 SPI2 IO MUX 핀(CLK=GPIO6, MOSI=GPIO7, MISO=GPIO2, CS0=GPIO10) 미확인. - 29·34·383행 'GPIO12~17은 내부 flash 연결'은 패키지·모듈에 따라 다를 수 있다. 17행 'GPIO0부터 GPIO21까지 어디든'과는 서술 범위 차이라 모순이 아니다. 34·403행 '자유 GPIO 약 12~14개'는 32행 표의 자유 핀 5개와 셈 기준이 다르다. - 41~44행 strapping 조합, 51행 'GPIO2 외부 영향이 작다', 55·405행 Matrix '256-input × 256-output', 133·138행 drive capability 대응 미확인. - 234행 'fade 하드웨어가 duty를 1 ms마다 갱신', 397~399행 fade 최소 시간, 387행 'fade 중 ledc_set_duty 호출 시 fade 중단' 미확인. - 74·301행 GPIO8 사용은 36~50행 경고와 충돌하는 예제 선택이다. 실제 부팅 실패 여부는 회로에 따라 달라 오류 확인에 넣지 않았다. 이번에는 MCPWM 문서 URL의 redirect/HTTP 상태를 실행 확인하지 않아 종전 상태를 현재 사실로 단정하지 않는다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 17행은 STM32 AF table과 GPIO Matrix를 비교하고, 25~32행은 핀별 용도와 부팅 시 주의를 표로 정리하며, 209~214행은 207행 식(freq × 2^res ≤ src_clk)으로 해상도별 최대 주파수를 구했다(8~13-bit 행 산술은 맞음). 377~399행은 증상별 실수를 모았다. GPIO·ISR·LEDC·fade 코드(96~118, 143~161, 171~204, 218~231행)는 ESP-IDF 예제 수준이다. 글의 약 1/3인 279~373행은 C3에 없는 MCPWM을 설명해 독자를 오도한다. 399행 '최소 100 ms 이상을 권장', 50행 '충돌 주의'는 근거 없는 일반론이다. |
| B | 8 | GPIO(21~163행) → Matrix(53~90행) → LEDC(165~277행) → MCPWM(279~373행) → 실수(375~399행) → 정리(401~409행)로 흐름은 이어진다. 그러나 제목의 세 모드 중 MCPWM은 C3에 없고, 214행 16-bit 행도 14-bit 한계를 넘는다. 83·395행 Matrix 40 MHz, 135행 45 kΩ 같은 정확성 의심도 남아 있다. 핵심 1/3이 틀려 5~9 구간. |
| C | 5 | 실제 ESP-IDF API 코드가 있다(61~77, 96~118, 143~161, 171~204, 238~275행). ESP-IDF 버전, 보드, 예상 출력, 관찰 결과가 없다. 135행 '약 45 kΩ', 83·395행 '1 코어 클럭 지연·최대 40 MHz', 133·138행 '5/10/20/40 mA'는 출처 없는 수치라 C ≤ 8. 298~370행 MCPWM 코드는 C3에서 쓸 수 없다. 74·301행은 GPIO8을 UART RX와 서보 출력으로 쓰는데 36~50행은 GPIO8을 strapping 핀으로 주의하라고 한다. |
| D | 11 | 이 글 236~277행 RGB·361~373행 dead-time과 현재 Recipes part5-01-pwm-output.md 106~173행, part1-09-pwm-signal.md 67~88행을 양쪽 읽었다. RGB/상보 PWM 주제는 겹치지만 Recipes는 STM32 TIM 레지스터/DTG 계산이고 이 글은 ESP-IDF LEDC/핀 라우팅이므로 D11 유지. 현재 Recipes 점수는 역사 앵커로 연결하지 않는다. |
| E | 4 | 제목(2행) 'GPIO·LEDC·MCPWM 세 모드 비교'와 description(5행) 'LEDC PWM, MCPWM (모터 제어)'는 MCPWM을 C3의 출력 모드로 약속하고 본문도 그렇게 다루지만, 대상 페리퍼럴이 C3에 없다. 283~290행 비교 표는 C3에서 성립하지 않는다. GPIO·LEDC 부분은 맞다. 독자가 얻는 결과가 일부 틀려 3~5 구간. |
| F | 4 | 413행 다음 편 'Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S'는 seriesOrder 5 `chapter05-uart-spi-i2c-i2s.md`와 맞고, 418~420행 라벨도 ch03·ch05·ch06과 맞다. 그러나 421행 'Modern Embedded Recipes Part 4.4: PWM 정확도'의 실제 part4-04는 `part4-04-clock-setup.md`('임베디드 클럭 설정 분석'), 422행 'Practical RTOS Internals Part 2.4: GPIO ISR latency'의 실제 part2-04는 `part2-04-context-switch.md`('Context Switch 원리 분석')다. 틀린 관련 항목이라 F ≤ 5. 424행 MCPWM 링크의 현재 HTTP/redirect는 미검증이다. 전제 지식 안내가 없다. |
| G | 1 | 본문 출처는 423~424행 ESP-IDF 문서 링크 두 개뿐이고 둘 다 버전 없는 `latest`이며 424행 target 지원 불일치가 있고 현재 HTTP 상태는 미검증이다. ESP-IDF 버전, TRM, 데이터시트 인용이 없어 135·207·395행 수치 주장과 출처가 연결되지 않는다. |

게이트 재판정: 오류 확인 유지. 2026-10-19 공식 [ESP-IDF esp32c3 soc_caps.h](https://github.com/espressif/esp-idf/blob/master/components/soc/esp32c3/include/soc/soc_caps.h)를 직접 열고 LEDC timer 4/channel 6/bit width14 및 MCPWM 검색 부재를 확인했다. 본문 214행 16-bit 설정과 292행 C3 MCPWM 존재·298~370행 사용 예는 target capability와 맞지 않는다. 일부 capability만 대조했으며 GPIO Matrix/전기 특성/나머지 코드까지 전체 검증한 것은 아니다. 기존 Page Not Found 판정은 이번 HTTP 실행으로 재확인하지 않았다.

병합 대상·다음 조치: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준으로는 병합 대상 없음이다. LEDC·GPIO Matrix를 다루는 글이 이 시리즈 밖에 없다. 다음 조치는 보강이다. MCPWM 절(279~373행)과 제목·description·15·19·408~409행의 MCPWM을 지우거나 'C3에는 없음'으로 고치고, 214행 16-bit 행을 지우고, 421~422·424행 링크를 정리한다.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| chapter08-iot-standards.md | 1~311행 | 622a9a9cc638f2f98924904728d8d0e880fbd8dcae4feb65e00c8f6dbb5631b6 |
| chapter09-firmware-analysis.md | 1~393행 | 3f3d83dfd2fb1d04684da694f215be27c5995163879a49b4923d878e5564fd8c |
| chapter10-sdlc.md | 1~427행 | e1dd8a617e53455df51f468d1a57ed0984e93907ead84348ffd51a1e5a542150 |
| chapter11-pcie-cxl-ide.md | 1~132행 | 49b4764e522c688d9f38bd7fc022ba165060b414ea6aead72f19eae2805f162e |
| chapter12-spdm-cma.md | 1~161행 | 5af6e56b3171089f717f4dae3154a985859b76231bdbc91875f1a0596e26ee94 |
| chapter13-cxl-tee.md | 1~144행 | 6cc8edf7a85a95c5596651d2001fbe64008d98ba22d5a32ae4775c5a6c4f3349 |
| chapter01-overview.md | 1~261행 | a1fe2df663313f0031a945d01b40b8d684ae3d9be12977cd528213219315cc0c |
| chapter02-riscv-core.md | 1~326행 | 9abb1abc845748072fb3593c7136ed4a57fd2b2a226b0524f7902ff8b6a0d24e |
| chapter03-memory-flash.md | 1~363행 | 06abb9a251fc2cf1be3cdede3947aeebb75e6acb2b1d1f39ec45c5beaba4187b |
| chapter04-gpio-ledc-pwm.md | 1~424행 | a45d7d73a82997cd9bc8dd28b970a3a3c67ea0e94b6b5f100aed7474f3766cf9 |
