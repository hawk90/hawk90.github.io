# 공개 글 독립 재평가 — 루프 01

평가일: 2026-10-18. 기준: `docs/adsense-audit/rubric.md` v1.2 및 `antipatterns.md` AP-C-24. 대상: `src/content/blog/embedded/bootloader/` chapter01~10, 공개 10편. 원문 전체를 읽고 기존 `published-loop-01.md`의 점수·오류 근거를 재검토했다. 원문·기존 보고서는 수정하지 않았다. 아래 줄 번호는 HEAD `d55f8d66`의 현재 원문 기준이다. 기술 정확성 전체를 보증하는 검증 완료 보고서가 아니다.

앵커는 `anchors.md`를 만든 커밋 `10550ca1`의 네 원문을 기준으로 읽었다. 현재 UART 원문은 이미 전면 보강되었고 옛 LLM 경로는 없어졌다. 현재 UART를 옛 49점 원문으로 취급하지 않는다. 아래 UART·커널·LLM 앵커 표기는 모두 이 역사적 버전이다. 하단 앵커의 일반 설명·실행 환경 부족, 상단 LLM 앵커의 계산·선택 기준을 항목별 대조했고 앵커 점수를 그대로 복사하지 않았다.

P0: 원문에서 확인된 정책 차단 사유 없음. 반복 구조는 있지만 각 편의 기술 질문·예제가 있어 대량 생성 남용으로 단정하지 않았다. 렌더링·모바일·광고 배치·빌드·정책 명령은 이 작업자가 실행하지 않았다. 부모 작업에서 공통 검사하며 본 보고서의 완료 범위는 원문·링크·점수 검토와 산술 검증까지다. 전편 `score_status: 잠정`, `confidence: 중간`이다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter01-boot-problem.md` | 12 | 12 | 7 | 9 | 5 | 7 | 2 | 54 | 미검증 | 보강 |
| `chapter02-u-boot-position.md` | 12 | 12 | 7 | 9 | 8 | 5 | 2 | 55 | 미검증 | 병합 검토 |
| `chapter03-build-system.md` | 12 | 12 | 7 | 11 | 5 | 5 | 2 | 54 | 미검증 | 병합 검토 |
| `chapter04-boot-stages.md` | 14 | 12 | 7 | 9 | 5 | 5 | 2 | 54 | 오류 확인 | 우선 조치 |
| `chapter05-falcon-mode.md` | 14 | 12 | 7 | 14 | 8 | 5 | 2 | 62 | 오류 확인 | 우선 조치 |
| `chapter06-device-tree.md` | 14 | 12 | 7 | 12 | 7 | 7 | 2 | 61 | 오류 확인 | 우선 조치 |
| `chapter07-driver-model.md` | 15 | 13 | 8 | 12 | 8 | 7 | 2 | 65 | 미검증 | 보강 |
| `chapter08-board-init.md` | 14 | 12 | 7 | 12 | 8 | 5 | 2 | 60 | 오류 확인 | 우선 조치 |
| `chapter09-dram-init.md` | 13 | 10 | 6 | 9 | 8 | 4 | 2 | 52 | 오류 확인 | 우선 조치 |
| `chapter10-storage-boot.md` | 15 | 12 | 8 | 11 | 8 | 5 | 1 | 60 | 오류 확인 | 우선 조치 |

| 파일 | 이전 총점 | 새 총점 | 차이 | 이전 판정 | 새 판정 |
| --- | ---: | ---: | ---: | --- | --- |
| `chapter01-boot-problem.md` | 52 | 54 | +2 | 보강 | 보강 |
| `chapter02-u-boot-position.md` | 52 | 55 | +3 | 병합 검토 | 병합 검토 |
| `chapter03-build-system.md` | 49 | 54 | +5 | 우선 조치 | 병합 검토 |
| `chapter04-boot-stages.md` | 52 | 54 | +2 | 우선 조치 | 우선 조치 |
| `chapter05-falcon-mode.md` | 58 | 62 | +4 | 우선 조치 | 우선 조치 |
| `chapter06-device-tree.md` | 61 | 61 | 0 | 보강 | 우선 조치 |
| `chapter07-driver-model.md` | 63 | 65 | +2 | 보강 | 보강 |
| `chapter08-board-init.md` | 57 | 60 | +3 | 우선 조치 | 우선 조치 |
| `chapter09-dram-init.md` | 48 | 52 | +4 | 우선 조치 | 우선 조치 |
| `chapter10-storage-boot.md` | 58 | 60 | +2 | 우선 조치 | 우선 조치 |

합계 577점, 평균57.7점, 범위52~65점. 기존 합계 550 대비 +27. 우선 조치 6편, 보강 2편, 병합 검토 2편이다. 80점 이상·검증됨·확정은 없다. ch01은 첫 글의 보드·학습 경로 안내를 시리즈 도입 역할로 인정하여 허브 예외를 유지했다. 그 외 기본 분류에는 점수 구간을 적용하고 오류 확인을 우선했다.

## 기존 판정에서 바로잡은 부분

| 대상 | 기존 근거에 대한 판단 | 재검토 결과 |
| --- | --- | --- |
| ch03 L430↔432 | 실수 소제목과 편집 권고의 충돌은 명확하지만 구체 기술 동작·산술의 동시 불가능을 입증하지 않음 | 오류 확인 철회. `uncertainties` 및 B에 반영. 미검증·병합 검토 |
| ch04 L290↔310 | x0가 진입점이라는 예와 모든 단계에서 DTB라는 보편 명제가 동시 성립 불가 | 오류 확인 동의. 실제 올바른 ABI는 별도 검증 필요 |
| ch05 L341 | GNU dd의 16진 seek 문제는 재현됨. BSD dd는 동작하므로 모든 dd가 틀렸다는 일반화는 금지 | GNU 환경 한정 오류 확인 동의. 아래 실행 기록 참조 |
| ch05 L151 | 첫 주소가 커널 주소 자리라는 공식 v2024.04 문서와 충돌 | 오류 확인 동의. `fdt_addr`만 넘긴 명령의 인자 설명이 틀림 |
| ch05 L157~158 | 출력 주소가 예측 불가라는 문서는 입력 주소와 우연히 같을 수 없다는 뜻이 아님 | 같은 주소가 나왔다는 예 하나만으로 오류 확정한 부분 철회 |
| ch05 L46↔97·165·185 | 같은 레이아웃을 설명하며 args 위치가 약800KB와128KB로 갈림 | 오류 확인 동의. 서로 다른 보드 예라는 구분이 없음 |
| ch05 L350 | 오류 문자열 또는 hang과 무출력을 한 문장에 섞었지만 raw 경로 한정이라는 독해 가능 | 별도 오류 건수로 확정하지 않고 불확실로 보관. 다른 확인 오류로 우선 조치는 유지 |
| ch06 L255 | 기존에는 u32 셀 범위를 미확인으로 남겼음 | 공식 DTSpec과 대조하여 오류 확인으로 승격. 아래 출처 참조 |
| ch08 L413~435↔15~17 | 본문이 스스로 정의한 reloc off로 역산하면 원래 주소가 DRAM인데 도입은 SRAM 출발로 일반화 | 오류 확인 동의. 0xbfe00000−0x7fc00000=0x40200000, DRAM 범위 L407~408·424 안 |
| ch08 L193~194↔220~222 | 기존 보고서의 ‘ram_top−relocaddr는 4KB 미만’이라는 해석이 잘못됨 | 오류 근거 철회. 해당 차이는 mon_len+정렬 여백이며 mon_len=2MiB면 그림 주소와 양립함. 배치 그림의 혼동은 uncertainties |
| ch08 L465 | 크기 대입 함수 예와 training 해석의 긴장은 존재하나 함수 예·로그가 동일 빌드라는 전제가 없음 | 독립 오류로는 미확정. 내부 주소 모순으로 우선 조치 유지 |
| ch09 L114~120·139~160·184~189↔269 | 명시된 식의 결과·비트 수·동일 MSTR 해석 충돌이 실제 존재 | 오류 확인 동의. MR0 계산=0x0b44, 표기=0x0a50; [29:27]은3비트; 0xa3080020의 bit4=0, rank[25:24]=11 |
| ch10 L130↔149~150, L158~162↔367 | 같은 필드 정의·명령에 다른 해석을 붙임 | 오류 확인 동의. bootbus는 공식 v2024.04 문서로 SDR임도 확인 |
| ch10 L106↔107 | 같은 EXT_CSD[269]를 같은 덤프에서 서로 다른 값으로 적음 | 내부 오류 확인 동의. 올바른 A/B 인덱스까지 검증한 것은 아님 |
| ch10 L222~235↔250 | 출력 예와 ‘default’ 표의 OOB 차이는 다른 장치/설정일 가능성이 있음 | SoC 명세 없이 독립 오류로 확정하지 않음. uncertainties로 이동 |

재실행 기록(OBS): macOS `/bin/dd`와 GNU `/opt/homebrew/bin/gdd`, 임시 일반 파일에 1바이트만 쓰는 실험. `bs=512 seek=0x900 count=1`에서 BSD는 파일 크기1179649, GNU는 ‘0x’ zero multiplier 경고와 파일 크기1이다. 원문 장치 명령을 실행하지 않았다. 따라서 GNU에서 기대 오프셋1179648에 쓰지 않는 것은 확인되지만 BSD 동작까지 부정하지 않는다.

1차 자료(2026-10-18 열람): [U-Boot v2024.04 Falcon Mode, Using spl command](https://docs.u-boot.org/en/v2024.04/develop/falcon.html#using-spl-command)은 인자 순서와 생성 결과 주소 기록 방법을 설명한다. 첫 주소를 커널 주소로 정의하므로 ch05 L151의 인자 용도와 맞지 않는다. [DTSpec §2.2.4.2·§2.3.5](https://devicetree-specification.readthedocs.io/en/stable/devicetree-basics.html)는 셀을32비트 정수로 정의하고 주소·크기를 셀 개수로 표현한다. ch06 L255의 단일 셀0x100000000은 범위를 넘고, 2셀 크기4GiB는 `<1 0>`이어야 한다. [U-Boot v2024.04 mmc, boot_mode](https://docs.u-boot.org/en/v2024.04/usage/cmd/mmc.html#description)는 boot_mode=0을 SDR backward-compatible로 정의하여 ch10 L367의 DDR 주석을 반증한다. 이는 필요한 몇 주장만의 검증이며 글 전체를 검증됨으로 올리지 않는다.

## 글별 근거와 필수 필드

모든 글의 `evidence`는 아래 A~G 행과 위 오류 검증 표이다. D의 축약 경로 `bsp/`·`bootloader/`는 `src/content/blog/embedded/` 기준, `modern-recipes/`도 같은 기준이다. 비교 범위는 적힌 대응 구간이며 외부 웹 복제·사이트 전체 중복률을 조사했다는 뜻은 아니다. 항목별 점수 차이는 평가자의 해석(INF), 원문 내용·줄·존재 여부는 OBS다.

### chapter01-boot-problem.md

source_file: `src/content/blog/embedded/bootloader/chapter01-boot-problem.md`

- score_status: 잠정; score: 54; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: P0 없음. L47·56~57 진입 ABI, L136·140~146 시간 기준의 1차 자료 검증 필요.
- uncertainties: L114 ARMv7 권한 모드, L21·121 EL3 시작의 적용 범위, L92 글 날짜보다 뒤의 빌드 날짜. 외부 링크 L190~191의 현재 HTTP 상태는 재확인 못함.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 12 | L33~63 네 책임을 실제 부트 정책까지 연결하고 L150~166 오해를 해소. UART 앵커의 단순 항목 나열보다 질문 구조가 분명하여 기존11→12. 고유 관측 자료 부족으로13 미만 |
| B | 12 | L19~71 문제·체인→L73~106 학습 환경→L168~177 정리. init 설명은 L146 한 칸뿐. 기존 동의, 정확성 의심이 열려 B≤13 |
| C | 7 | L85~103 QEMU 명령·출력은 있으나 전체 빌드·도구 판이 없음. L136·140~146 출처 없는 수치로 C≤8. 기존 동의 |
| D | 9 | 본문 L65~71·112~130↔`bsp/chapter01-what-is-bsp.md` L62~100(체인·아키텍처), L112~123↔`bootloader/chapter02-u-boot-position.md` L72~94(EL·BL). 반복은 상당하나 L33~63 ‘왜 필요한가’와 QEMU 시작 역할은 남아8→9 |
| E | 5 | L2·5 ‘init까지·분석’ 대비 L146 단편·개관 중심. 분석 약속 미이행에 대한 기존 감점 동의 |
| F | 7 | L181 다음 편=`chapter02-u-boot-position.md`, order2·공개·생태계 내용 확인. L185~189 관련5개 모두 slug·제목·공개 상태 대조, L39·132·148 본문 연결과 L73~81 보드 표가 고유 안내. 기존 동의 |
| G | 2 | L190~191 공식 출처 목록·L92 U-Boot2024.04. 주장을 출처와 연결하지 않음. 기존 동의 |

판정: 보강. 첫 편이 시리즈 실험 보드·학습 시작점을 안내하여 허브 예외 적용. 병합 후보는 `bsp/chapter01-what-is-bsp.md` 체인 절이나 도입 역할을 남길 필요가 있다.

### chapter02-u-boot-position.md

source_file: `src/content/blog/embedded/bootloader/chapter02-u-boot-position.md`

- score_status: 잠정; score: 55; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: P0 없음. L113 PSCI·SMP 단정, L132·137·139 UEFI 지원·필수성 검증 필요.
- uncertainties: L98~108 TF-A 발췌 API·버전, L214 다른 .config 설명, L267 날짜, L17 일반화와 L315 i.MX 예의 범위. 완곡/단정·다른 예시만으로 내부 오류 확정하지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 12 | L180~203 flash.bin 조립·L218~226 모델 대조·L273~287 선택 규칙. 결론 근거는 얇으나 단순 컴포넌트 나열보다 추가 가치가 있어11→12 |
| B | 12 | L23~28 분업→L36~174 컴포넌트→L176~271 결합·RISC-V→L311~320 정리. L115 빈 안내·L277 TODO와 검증 의심으로 B≤13, 기존 동의 |
| C | 7 | L194~201·239~251 명령·L254~271 출력. 보드별 U-Boot defconfig 부족, L133·154·157·305 출처 없는 수치 C≤8. 기존 동의 |
| D | 9 | L72~94↔`bootloader/chapter04-boot-stages.md` L95~102, L218~226↔그 글 L69~76; L180~201↔`bsp/chapter07-tfa-trustzone.md` L49~61(결합 흐름). EDK II·LinuxBoot 비교 L117~174는 별도 질문이어서8→9 |
| E | 8 | L2·5의 세 컴포넌트 비교를 L36·68·117 절과 L130~144 표가 답함. 사실 불확실과 선택 규칙의 얇음은 A/B·게이트 문제이고 제목 미이행 자체는 약해7→8 |
| F | 5 | L324 다음 편=`chapter03-build-system.md`, order3·공개·defconfig 내용 일치. L328~333 관련6개 slug·제목 대조. L115 링크/내용 없는 관련 안내가 남아 F≤5. 기존 동의 |
| G | 2 | L334~337 공식 프로젝트 출처가 있으나 주장·소스 판에 안 붙음. 기존 동의 |

판정: 병합 검토. 후보 `chapter04-boot-stages.md`의 SPL/BL2 절 및 `chapter25-tfa-optee.md`의 BL 책임 절. 비교 검색 의도가 있어 전편 병합보다 중복 절 축소 후 보강을 권한다.

### chapter03-build-system.md

source_file: `src/content/blog/embedded/bootloader/chapter03-build-system.md`

- score_status: 잠정; score: 54; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: P0 없음. 기존 ‘오류 확인’ 근거가 3-1 기술 오류 게이트 요건을 충족하지 않음.
- uncertainties: L430~432 권고 충돌, L294·452 선택적 TPL 개수, L415 ARCH 누락 시 x86 산출 주장, L141~160 Kconfig 및 L272~276 Makefile 발췌의 기준 태그. L470 외부 README 현 상태 미확인.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 12 | L281~294 단계별 설정 접두사·L345~369 로그 해석·L417~428 경로 함정이 커널 빌드 앵커보다 구체적이라10→12. 기초 절이 커서13 미만 |
| B | 12 | L27~41 소스·도구→L134~294 config·Kbuild→L296~399 산출물→L447~456 정리. L430 권고 혼동은 감점하되 사실 오류 확정으로 과도 감점한 부분을 거둬10→12. 미해결 API 의심으로 B≤13 |
| C | 7 | L249~262·300~305 실제 명령·L345~365 로그가 있으나 태그·도구 버전 없음. L383~395 수치 환경 없음 C≤8. 기존 동의 |
| D | 11 | L56~130↔`bsp/chapter06-u-boot-porting.md` L46~105 디렉터리 트리, L27~41↔`modern-recipes/part7-05-kernel-build.md` L56~75 빌드 흐름. 인접 `chapter02-u-boot-position.md` L209~214는 산출물 개관일 뿐. SPL_TPL_·빌드 진단의 독립 역할을 인정10→11 |
| E | 5 | L2 ‘동작 추적’에 비해 .config 확장 설명은 L243 한 문장, 대다수 사용법 개관. 기존 동의 |
| F | 5 | L460 다음 편=`chapter04-boot-stages.md`, order4·공개·단계 설명 일치. L464~468 대조. L469 ‘Buildroot Ch4 패키지와 옵션’ 실제 대상=`buildroot/chapter04-first-build.md` L2 첫 빌드, 잘못된 라벨 F≤5. 기존 동의 |
| G | 2 | L139·210·271 소스 경로에 판 없음, L470~471 공식 링크 목록만 있음. 기존 동의 |

판정: 병합 검토. 후보 `bsp/chapter06-u-boot-porting.md`의 디렉터리 절. 전체 빌드 질문은 독립적이어서 다음 조치는 중복 설명 축소와 보강이다.

### chapter04-boot-stages.md

source_file: `src/content/blog/embedded/bootloader/chapter04-boot-stages.md`

- score_status: 잠정; score: 54; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L290↔310 구체 x0 의미 모순. 총점보다 우선.
- uncertainties: L212~226 spl_atf 발췌, L125·145~151 주소, L366 SPL/booti 주체. L98 예외와 L377 단정적인 정리의 차이는 별도 오류로 세지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L69~76 두 모델·L110~141 실행 상태·L314~348 prefix로 실패 단계 나누기가 입문 표 이상의 해석을 제공13→14 |
| B | 12 | L19~37 분할 이유에서 L372~381 결론까지 완결. L55 빈 안내·L272 TODO·x0 모순으로 B≤13, 기존 동의 |
| C | 7 | L316~346 보드·버전 로그는 있으나 L47~53·143~152 수치 출처 부족 C≤8. 재현 명령이 일부 간략화됨, 기존 동의 |
| D | 9 | L95~102·143~152↔`bootloader/chapter25-tfa-optee.md` L47~63·69~80, L69~74↔`chapter02-u-boot-position.md` L218~226, L17·95~102↔`bsp/chapter07-tfa-trustzone.md` L29~43. 반복이 크지만 두 모델 분리·로그 분석이 남아8→9 |
| E | 5 | L2 네 단계 제목, L17·39 다섯 단계 본문, L73~74 체인에서 제목의 네 이름이 한 체인을 이루지 못함. 기존 동의 |
| F | 5 | L385 다음 편=`chapter05-falcon-mode.md`, order5·공개·직접 부팅 내용 일치. L389~396 관련8개 slug·제목 대조. L55 빈 관련 안내로 F≤5. 기존 동의 |
| G | 2 | L397 TF-A 공식 문서 링크·L317~329 소프트웨어 판은 있으나 각 ABI·주소에 근거 없음. 기존 동의 |

판정: 우선 조치. 부분 병합 후보 `chapter25-tfa-optee.md`의 BL·EL 표. 우선 x0 인계 ABI 대조 후 보강한다.

### chapter05-falcon-mode.md

source_file: `src/content/blog/embedded/bootloader/chapter05-falcon-mode.md`

- score_status: 잠정; score: 62; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L151 공식 인자 용도 오류, L46↔97·165·185 args 위치 모순, L341 GNU dd 환경의 잘못된 offset.
- uncertainties: L34 도입자, L83·91 설정명/뜻, L259 BeagleBoneBlack 1GB 측정 환경, L54~71 의사 코드, L350 실패 경로 범위. L392 404는 기존 보고서의 당시 기록이며 이번 웹 열기는 도구 접근 실패로 HTTP 상태를 확정하지 못했다. 정상 링크로 가산하지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L103~135·195~236 개발/양산/복구 분기와 L275~295 한계를 같은 절차에 연결. 단순 설명보다 선택 기준이 충분해12→14. 측정·API 오류로 LLM 앵커18보다는 낮음 |
| B | 12 | L76~193 설정→args 생성→굽기의 흐름과 L275~295 한계는 완결. 핵심 절차 오류 및 L28·30 중복으로 감점, 기존 동의·B≤13 |
| C | 7 | L141~188 명령과 L242~251 출력이 있으나 보드가 i.MX와 BeagleBone으로 섞이고 L259~269 실측 주장에 방법·로그 없음 C≤8. 기존 동의 |
| D | 14 | L76~92·137~169·195~197↔`bsp/chapter15-boot-time-optimization.md` L141~156은 짧은 개요·명령만, 인접 `chapter04-boot-stages.md` L385·391과 `chapter06-device-tree.md` L480은 안내만. args 굽기·모드 공존이라는 상세 역할이 명확하여13→14 |
| E | 8 | L2·5 ‘SPL이 직접 커널 부팅’ 약속을 L19~30·36~74·238~255가 직접 답함. 시간 수치 신뢰는 C/G 문제이며 제목 미이행은 적어7→8 |
| F | 5 | L382 다음 편=`chapter06-device-tree.md`, order6·공개·control/OS DTB·fixup 내용 일치. L386~391 관련6개 대조. L392 구식 doc/README.falcon 경로 문제는 기존 기록을 보류 유지, 정상 확인 전 F를 올리지 않음 |
| G | 2 | L243·251 판 표기는 있으나 L392 출처 위치는 오래된 경로이고 본문 주장과 연결 안 됨. 기존 동의 |

판정: 우선 조치. 병합 대상 없음. BSP 글은 요약이라 상세 절차를 이 글에 남기는 편이 합리적이다. 명령·오프셋·환경을 먼저 바로잡는 보강 대상이다.

### chapter06-device-tree.md

source_file: `src/content/blog/embedded/bootloader/chapter06-device-tree.md`

- score_status: 잠정; score: 61; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L255 4GB reg 값의 단일32비트 셀 범위 초과를 DTSpec으로 확인.
- uncertainties: L17 Linux 발명·U-Boot2.0 역사, L90 시그니처, L229~232 API 인자, L72 concat 산출물 이름, L438 호출 시점은 태그 고정 upstream 대조 전 미확정. L48↔333 위치는 .data가 끝일 가능성 있어 내부 오류로 올리지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L19~36 두 DTB·L38~98 공급 방식별 선택·L412~447 대상·시점 함정을 연결하여13→14 |
| B | 12 | L100~135 읽는 시점→L137~205 조작→L207~322 fixup→L363~390 overlay는 완성됐지만 핵심 메모리 예 오류가 실제 확인되어13→12, B≤13 |
| C | 7 | L161~191 명령·관찰, L367~385 적용 절차가 있음. L255 재현 불가 표기와 L51·54·71 환경 없는 수치 C≤8로8→7 |
| D | 12 | L363~390↔`bsp/chapter03-device-tree-design.md` L311~349(overlay), L109↔`chapter08-board-init.md` L57, L266~286↔그 글 L383~388. 겹치는 것은 부속 절이며 두 DTB/OS fixup이라는 핵심 질문은 남아11→12 |
| E | 7 | L2 로딩 시점·fixup 추적을 L100~135·207~322 간략 소스로 답함. ‘추적’에 비해 실행 흐름 관측 부족. 기존 동의 |
| F | 7 | L475 다음 편=`chapter07-driver-model.md`, order7·공개·uclass/binding 내용 일치. L479~485 관련7개 대조, L328 고유 그림·L392~460 증상별 안내. 기존 동의 |
| G | 2 | L486~487 공식 명세·control 문서가 끝에 있으나 L105·120·222 소스에 판 없음. 기존 동의 |

판정: 우선 조치. 병합 대상 없음. overlay 중복은 링크로 축소할 수 있으나 두 DTB 처리는 독립 질문이다. 기존과 총점은 같아도 세부 점수와 게이트가 달라졌다.

### chapter07-driver-model.md

source_file: `src/content/blog/embedded/bootloader/chapter07-driver-model.md`

- score_status: 잠정; score: 65; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part12-10-on-device-llm.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: P0 없음. 최소 센서 driver와 runtime flags의 공식 API 검증 필요.
- uncertainties: L151~152 priv_auto/platdata_auto, L265~275 driver/runtime 플래그 혼합, L411·427·431 I2C bus/child API, L398·445·531 sensor 심볼. 언어·API 의미를 알아야 하므로 기억만으로 오류 확정하지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 15 | L23~68 legacy/DT 대조, L163~187 두 인스턴스, L228~261 bind/probe, L388~472 가상 센서로 추상 구조를 풀어14→15. 실측·정확한 환경 부족으로18점 앵커 미달 |
| B | 13 | L72~287 구조/라이프사이클→L289~386 진단·SPL→L388~472 예→L474~544 함정/정리. API 의심이 열려 B≤13, 기존 동의 |
| C | 8 | L293~325 상태·실패 출력·L362~384 dtoc·L466~470 등록 결과가 있어8. L386 수KB 감소에 환경·측정 없음 C≤8. 기존 동의 |
| D | 12 | L316~327↔`bsp/chapter06-u-boot-porting.md` L352~364 MMC 진단, L277·487~495↔`chapter08-board-init.md` L104·571~573 PRE_RELOC. 인접 ch06은 DT 조작 역할, uclass·인스턴스 모델은 이 글 중심이라11→12 |
| E | 8 | L2·5 추상화·binding 약속을 L72~224·228~261이 답함. 특정 독자·실패 질문은 약해9 미만, 기존 동의 |
| F | 7 | L548 다음 편=`chapter08-board-init.md`, order8·공개·relocation/배열/hook 내용 일치. L552~557 관련6개 대조, L193~197 단계·L474~533 증상 안내가 고유. 기존 동의 |
| G | 2 | L558~559 공식 문서는 있으나 latest와 L81·106·124·200·248 무태그 소스. 기존 동의 |

판정: 보강. 병합 대상 없음. 개요·진단 중복은 일부 있으나 driver model이라는 독립 질문이 명확하다.

### chapter08-board-init.md

source_file: `src/content/blog/embedded/bootloader/chapter08-board-init.md`

- score_status: 잠정; score: 60; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L15~17 SRAM 출발 일반화와 L407~435 자기 출력의 주소 역산 충돌.
- uncertainties: L193~222 그림은 mon_len 미상이라2MB 차이만으로 정렬 오류를 확정할 수 없음. L119~124와 L465 training 해석도 같은 실행 환경인지 미상. L54~86·258~283 순서, L561 weak 기본 구현, L390 API를 공식 소스 대조하지 않음. L621 링크의404는 기존 기록이며 현재 웹 도구 접근 실패만 재관측.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L315~397 pre/post/kernel hook 지도와 L579~577 함수명 구분·L399~465 관측 해석은 실무 독자의 위치 찾기를 도움13→14 |
| B | 12 | L19~37 이유→L47~313 흐름→L315~397 hook→L399~465 관측→L597~606 정리. 핵심 SRAM 일반화가 자기 출력과 충돌하므로 높은 완결성 불가. 기존 동의·B≤13 |
| C | 7 | L403~433 bdinfo·L441~463 시간 출력은 있으나 정확한 보드/defconfig·판 없음 C≤8. 기존 동의 |
| D | 12 | L104·571~573↔`chapter07-driver-model.md` L277·487~495 PRE_RELOC, L490~507↔`bsp/chapter06-u-boot-porting.md` L234~264 초기화 hook/SPL 일부. 배열·gd·relocation 전체 질문은 구별되어11→12 |
| E | 8 | L2·5 두 함수 분리 질문을 L19~37·47~313이 직접 다룸. 설명이 틀린 점은 게이트로 처리하되 제목과 본문의 주제 일치는 높아7→8 |
| F | 5 | L610 다음 편=`chapter09-dram-init.md`, order9·공개·ZQ/training 내용 일치. L614~620 관련7개 대조. L621 구식 board_init.html 문제는 기존 기록 보류 유지, 정상 확인 전 F 올리지 않음 |
| G | 2 | L621~622 공식 문서 목록, L52·145·171·187·228·256에 소스 판 없음. 기존 동의 |

판정: 우선 조치. 병합 대상 없음. 주소 전제·source 버전 대조 뒤 보강한다. 기존 보고서의 정렬 계산을 수정 근거로 사용하면 안 된다.

### chapter09-dram-init.md

source_file: `src/content/blog/embedded/bootloader/chapter09-dram-init.md`

- score_status: 잠정; score: 52; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L114~120 MR0 산술, L139~160 주소 비트 설명, L184~189↔269 MSTR 비트 해석 모순.
- uncertainties: L213·405 MRS 순서의 DDR4 적용, L301 training register, L292·416 STM32MP1 blob, L403 DCD 일반화, L404 X-ray 저항 값 측정, L369 partial retraining 보편 주장. 다른 글과의 차이는 오류 확정 대신 별도 검증 대상으로 둠.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L61~190 register group/MR 디코딩/주소 분해라는 독립 접근은 표준 개념 나열보다 구체적. 예의 오류는 인정하되 질문 구조 자체를 인정12→13 |
| B | 10 | L21~37 큰 그림부터 L411~419 정리까지 있으나 L194~222 단계 제목만 남은 절·핵심 계산 오류로 완결성 낮음. 기존 동의 |
| C | 6 | L340~365 테스트 명령·출력은 있지만 보드·U-Boot 판·실패 관측 없음. L165 ±20%·L198~210 timing 출처 없음 C≤8, 실제 계산 예 오류까지 있어6. 기존 동의 |
| D | 9 | L284~311↔`chapter26-ddr-training.md` L43~83, L262·321~332↔`bsp/chapter05-ddr-params.md` L96~132, L336~365↔그 글 L232~260. 겹치는 구간은 크지만 L61~190 register/MR/address는 ch26·BSP 글에서 독립적으로 다루지 않아7→9 |
| E | 8 | L2·5 프로그래밍/training/parameter 위치 약속은 L61~249·280~334에서 실제 다룸. ‘가장 어려운’은 주관적이나 제목 주제 누락이 적어7→8 |
| F | 4 | L423 다음 글 설명은 `chapter10-storage-boot.md` order10·공개·미디어 주제와 맞고 L428 링크도 실제 존재. L431은 `chapter28-flash-layout.md`에 DDR blob 저장 설명을 약속하지만 대상 L13·31은 XIP 맥락뿐. L192가 가리킨 ch08에는 ddr_ecc_scrub 없음. 틀린 안내 F≤5와 빈 단계 절로4, 기존 동의 |
| G | 2 | L111 JESD79-4 절·L433 JEDEC 링크는 있으나 코드·SoC 수치에 태그/RM 판 없음. 기존 동의 |

판정: 우선 조치. 부분 병합 후보 `chapter26-ddr-training.md` training 개요·`bsp/chapter05-ddr-params.md` tool/stress 절. 레지스터 디코딩 고유 질문을 남기고 오류부터 고쳐야 한다.

### chapter10-storage-boot.md

source_file: `src/content/blog/embedded/bootloader/chapter10-storage-boot.md`

- score_status: 잠정; score: 60; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: L130↔149~150 ACK 비트, L101↔133 boot partition 해석, L106~107 같은 인덱스 다른 값, L158~162↔367 SDR/DDR 충돌. 공식 mmc 문서로 DDR 주석 반증.
- uncertainties: L222~250 OOB는 조건 차이 가능하여 독립 오류 확정 철회. L335~346 측정 환경·수치 진위, L344 quad100MHz에서64MB/s의 SDR/DDR 조건, L364~371 fuse 주소, L436 ACK timeout 동작은 SoC 명세·데이터시트 대조 필요. 물리 대역폭 추론을 1차 자료 확인 오류로 세지 않음.

| 항목 | 점수 | evidence 및 기존 대비 |
| --- | ---: | --- |
| A | 15 | L85~163 레지스터/명령 대응·L220~268 ROM/MTD 가정·L352~374 미디어 전환 등 여러 설명을 결합. 오류가 있어도 독립 분석 틀은 존재. 기존 동의 |
| B | 12 | L21~36 선택→미디어별 설명→L333~350 비교→L378~419 스크립트/GPT→정리. L292 SPI NAND는 짧고 핵심 비트/명령 충돌이 열려 B≤13, 기존 동의 |
| C | 8 | L44~80·142~162·274~279 명령, L382~419 제작 절차. L335 환경 표기는 있지만 표의 판·원시 로그·측정 절차 없어 출처 없는 수치 C≤8. 기존 동의 |
| D | 11 | L128~153↔`chapter28-flash-layout.md` L216~243(partconf), L187~218↔그 글 L154~214(UBI), 인접 `chapter09-dram-init.md`는 DRAM 절차라 별도. 다른 시리즈 `bsp/chapter06-u-boot-porting.md` L366~390은 환경/네트워크 설정으로 이 글 L378~394 boot script와 용도만 일부 겹침. 미디어 명령·ROM 기대 형식의 비교 역할이 남아10→11 |
| E | 8 | L2·5 MMC/SCSI/NAND/SPI 비교를 L38·167·187·270·333 절이 이행. SPI NAND가 두 문장인 부분 미이행으로8, 기존7보다1 높음 |
| F | 5 | L451 다음 글 설명은 `chapter11-network-boot.md` order11·공개·L19 DHCP/TFTP/PXE/distroboot와 맞고 L456 링크 존재. L455~462 전부 slug·제목·공개 상태 확인. L110 ch13 헬스체크·L268·460 ch28 redundant SPL 약속은 대상에서 찾지 못함(대상은 L113~118 redundant env). F≤5, 기존 동의 |
| G | 1 | L1~462 본문에 1차 출처 링크·U-Boot 판 없음. 원문에서 스스로 든 데이터시트 이름만으로는 출처 연결 불충분. 기존 동의 |

판정: 우선 조치. 부분 병합 후보 `chapter28-flash-layout.md` partconf/UBI 절. 미디어별 명령·ROM 질문은 독립적이므로 다음 조치는 보강이다.

## 공통 후속 조치

1. 전편의 출처/환경 없는 수치 때문에 C는8 이하, 열린 정확성 의심 때문에 B는13 이하를 적용했다. ‘코드가 있다’는 이유로 검증됨이나 상위 점수를 주지 않았다.
2. ch02·04의 빈 관련 안내, ch03·09·10의 설명 불일치 링크, ch05·08의 구식 공식 경로는 공통 링크 정리 대상으로 묶는다. 이번 내부 링크 slug 해석에서는 대상 없는 링크나 draft 대상은 없었다. ‘대상 존재’와 ‘안내 내용이 맞음’을 구분했다.
3. ch01·02·04·05 등 날짜가 글 날짜보다 뒤인 로그는 진위를 확인할 자료가 없다. 실제 측정·경험이라고 확정하거나 허위라고 단정하지 않는다.
4. 오류 게이트는 근거 자체도 검증해야 한다. ch03 조언 모순, ch08 mon_len을 빠뜨린 정렬 해석, ch05 예측 불가를 동일 주소 불가로 읽은 해석을 후속 수정 근거로 재사용하지 않는다.

기계 검증: 위 요약표의10개 A~G 합계·기존 점수와의 차이·합계577·평균57.7 및 B/C 상한을 별도 Python 산술로 확인했다. 모바일/렌더/build 통과를 이 검증으로 대신하지 않는다.

공통 검사 결과는 부모 작업의 `double-check-gates-2026-10-18.md`에 별도 기록한다. 본 작업자가 실행한 검사와 혼동하지 않는다.
