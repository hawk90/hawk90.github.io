# 공개 글 AdSense 평가 — 루프 06

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-06.md) · [재검토 기록](double-check-loop-06.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

재평가일 2026-10-19. 원문 기준 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2·AP-C-24 적용. BSP ch14~21와 Buildroot ch01~02 전문, 기존 평가, 아래 비교 원문을 대조했다. 전편 `score_status: 잠정`, `confidence: 중간`. 앵커는 수정 전 `10550ca1` 기준이다. 원문과 기존 보고서는 변경하지 않았다. 공통 정적 검사는 [2026-10-18 스냅샷 게이트](double-check-gates-2026-10-18.md)를 인용한다. 전체 사실 검증·하드웨어 실행을 완료했다는 뜻은 아니다. 본문 검토에서 P0 미발견.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `bsp/chapter14-thermal-watchdog.md` | 12 | 11 | 7 | 10 | 7 | 3 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter15-boot-time-optimization.md` | 14 | 13 | 7 | 11 | 6 | 5 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter16-rootfs.md` | 11 | 11 | 6 | 7 | 7 | 7 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter17-image-packaging.md` | 12 | 12 | 7 | 9 | 6 | 5 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter18-ota-recovery.md` | 11 | 11 | 6 | 6 | 7 | 4 | 1 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter19-stability-testing.md` | 14 | 12 | 8 | 10 | 6 | 4 | 1 | **55** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter20-production.md` | 11 | 11 | 6 | 9 | 7 | 5 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter21-maintenance.md` | 12 | 11 | 7 | 11 | 7 | 3 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter01-problem.md` | 14 | 13 | 7 | 10 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter02-directory-structure.md` | 10 | 11 | 6 | 9 | 7 | 7 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계 527→526, 평균 52.7→52.6. 오류 확인 6→8편. BSP16·20은 신규 오류 확인으로 판정이 바뀐다. BSP15는 기존의 강한 요약/완곡한 예시 비교와 fallback 조건 혼동을 오류 근거에서 철회하고 실제 파서 실행 결과로 교체한다. 점수는 구간 내 판단이며 승인 확률이 아니다.

## 정확성 게이트

- BSP14 L72·368의 critical shutdown과 L74의 무조건 `emergency_restart()` 설명을 [Linux v6.12 thermal_core.c](https://raw.githubusercontent.com/torvalds/linux/v6.12/drivers/thermal/thermal_core.c)의 기본 critical callback과 대조했다. 기본은 shutdown 경로이며 별도 reboot callback도 존재한다. 모든 플랫폼이 재시작할 수 없다는 일반화 없이, 기본 동작을 무조건 restart로 설명한 오류를 유지한다.
- BSP15 기존 근거 중 Falcon 실패 시 fallback과 벽돌 경고는 fallback 구성 유무라는 조건 차이가 있다. 요약의 한 자릿수 ms와 한 보드의 60ms 예시도 보편적 불가능성 근거로 쓰지 않는다. 범위 합계는 수치 설명의 약점으로 남긴다. 대신 L113~132 bash 블록을 그대로 추출하고, 같은 글의 시간 패딩이 있는 로그 행을 반환하는 `dmesg()`만 대체해 `/bin/bash`로 실행했다. `[    1.234567] systemd[1]: Detected architecture arm.`에서 `$1`은 `[`여서 출력은 `systemd reached: s`다. 기대한 1.234567초를 잃는다. 종료 코드는 0이므로 실행 성공과 출력의 정확성을 구분한다. 파일 `/private/tmp/adsense-loop06-boot-parser.sh`, 결과 `/private/tmp/adsense-loop06-boot-parser.log`. 실제 보드 부팅 시험이 아니다.
- BSP16 L375의 cache 미갱신 시 dynamic linker가 동작하지 않는다는 단정을 [glibc 2.40 dl-load.c](https://raw.githubusercontent.com/bminor/glibc/glibc-2.40/elf/dl-load.c)와 대조했다. cache 외에 환경·RUNPATH·기본 경로 탐색이 있어 cache 갱신은 모든 동적 링크의 필수 조건이 아니다. 신규 오류 확인. 특정 사용자 지정 라이브러리가 언제나 검색된다는 뜻은 아니다.
- BSP17 L129의 32KB부터 약 2MB인 flash.bin은 L130의 1MB GPT header 위치와 겹친다. 겹침을 피하라는 같은 예제의 내부 산술 오류를 유지한다. GPT·첫 partition을 혼용한 문장만으로 추가 오류를 확정하지 않는다.
- BSP20 L63의 GNU ld 기본 build-id가 uuid라는 설명과 L69~72의 none=명시적 0 설명은 [GNU ld Options](https://sourceware.org/binutils/docs/ld/Options.html)의 build-id 계약과 다르다. style 생략 시 sha1이고 none은 생성을 비활성화한다. 신규 오류 확인. 배포판 compiler driver가 넘기는 별도 옵션까지 조사했다고 하지 않는다.
- BSP21 L36의 EOL까지 2~3년 필요라는 선택 기준, L31~32의 2026-12 표, L40·311의 2026년 5월 신규 제품 권장은 글 안에서 약 7개월밖에 남지 않아 맞지 않는다. 현재 실제 지원 일정의 참/거짓은 별도 미검증이다.
- Buildroot01 L204의 110분/32분은 약 3.44배로 L211의 같은 표를 근거로 한 5배와 맞지 않는다. 기존 오류 유지.
- Buildroot02 L192의 clean이 target만 지우고 toolchain을 남긴다는 설명은 [Buildroot manual, Make tips](https://buildroot.org/downloads/manual/manual.html)의 host·staging·target·images·toolchain 삭제 범위와 다르다. 기존 오류를 재확인했다. ccache 보존과 toolchain 보존을 혼동하지 않는다.
- BSP18의 RAUC 자동 good 표시는 [공식 integration 문서](https://rauc.readthedocs.io/en/latest/integration.html)의 명시적 mark-good 서비스 통합과 비교했다. 배포 환경이 그런 서비스를 설치할 수도 있어 본문만으로 모든 통합 조건을 배제하지 않는다. uncertainties로 유지한다.

## 글별 근거

경로 축약은 `src/content/blog/embedded/` 기준이다. D는 실제 같은 설명/코드의 대조다. F는 라벨 전체와 뒤의 설명을 읽었으며, 시리즈 입문 글을 향한다는 사실만으로 오안내라고 단정하지 않았다.

### `bsp/chapter14-thermal-watchdog.md`

source_file: `src/content/blog/embedded/bsp/chapter14-thermal-watchdog.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: critical 기본 동작 설명 오류, 마지막 편 안내 오류.
- uncertainties: AEC-Q100 등급, system.conf의 Service 설정, tmp103 label/주소, watchdog 인계 조건은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L154~193 외부 센서·팬 DT, L310~326 외부 reset·부트 단계 watchdog 인계는 적용 관점. 등급·margin은 근거 없는 일반 설명이다. |
| B | 11 | DT→sysfs→governor→watchdog→시험 흐름은 완성. 핵심 critical 설명 오류와 L258 무한 루프 뒤 close의 도달 문제로 상단 불가. |
| C | 7 | L92~114 관찰 명령과 L328~364 시험 기준은 있으나 실제 보드·커널·출력 원자료가 없다. L80~87 수치로 C≤8. |
| D | 10 | L92~105↔Performance3-10 L52~67 sysfs, L67~72↔L69~75 trip 설명 반복. Recipes12-08 L64~76·139~146↔본글 L143·164~170 관찰/팬 예도 겹친다. DT와 Linux watchdog 통합 역할은 남는다. |
| E | 7 | trip·cooling·hardware reset을 다루지만 외부 reset은 L316·374의 짧은 설명이다. |
| F | 3 | L17·389 마지막 편 안내가 실제 ch15~21과 다르고 L393의 ch12 센서 통합은 EEPROM 사례다. Buildroot01의 systemd 설정 약속도 본문에 없다. 단순 허브 링크 여부와 무관한 구체 오안내로 F≤5. |
| G | 1 | 본문에 핵심 API·등급·수치의 1차 출처와 고정 버전이 없다. |

동의: 51점 유지. 병합 대상 없음. sysfs 반복을 줄이고 DT·watchdog 인계 및 실패 시험을 보강할 후보.

### `bsp/chapter15-boot-time-optimization.md`

source_file: `src/content/blog/embedded/bsp/chapter15-boot-time-optimization.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: 자체 예시 로그에서 시간 추출 실패 재현.
- uncertainties: CONFIG_BOOT_TRACER·Falcon 옵션·lzImage 지원, ST 사례의 원문/조건, 단계 범위 합계의 산정 방식은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | L58~68 bootstage 해석, L102~107 PCIe 없는 보드의 제거 판단, L185~192 DHCP/UART 시간 해석은 적용 관점. 실제 실험 원자료는 없다. |
| B | 13 | 측정→부트로더→커널→userspace→사례→함정으로 완결. 파서 오류와 옵션 불확실성으로 13 상한 유지. |
| C | 7 | 8→7. L113~132 측정 스크립트가 자체 로그의 시간 필드를 잃는다. 나머지 명령·출력과 UART 산술은 유용하나 보드/버전·수치 출처가 없다. |
| D | 11 | L141~156 Falcon 설명↔bootloader05 L76~115·140~170; L70~82·93~105 측정↔BSP10 L236~260·11 L120~129. 본글은 체인 전체 최적화 순서를 묶는 역할이 있다. |
| E | 6 | Bootchart/initcall은 다루지만 Parallel Init은 L84 한 문장, description의 deferred init은 구체 절이 없다. |
| F | 5 | 4→5. L306 Bootloader 입문은 실제 L148·177에서 Falcon을 설명하고 해당 글을 연결하므로 틀린 대상이라는 감점은 철회한다. L304의 ‘Ch14: 디버깅 도구’는 실제 thermal/watchdog여서 F≤5는 유지. 다음 ch16과 예고는 일치한다. |
| G | 1 | ST 사례의 문서명·링크, 도구 버전·보드 측정 근거가 없다. |

변경: C−1/F+1, 총점 57 유지. 오류 근거 교체. 병합 대상 없음; 전체 단계 예산·실제 부팅 로그 분석으로 차별화할 후보.

### `bsp/chapter16-rootfs.md`

source_file: `src/content/blog/embedded/bsp/chapter16-rootfs.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: L375의 동적 링커/cache 필수 조건 오류.
- uncertainties: systemd 선택·preset, Yocto recipe/provider, SRCREV 자리표시, 실제 산출물·보드 검증 부재.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L19 역할 구분과 L326~338 두 시스템 대응은 적용 관점이나 Buildroot20에도 같은 매핑이 있다. 코드 길이는 독창성 근거가 아니다. |
| B | 11 | 12→11. external→package→layer→image→hook 흐름은 완성됐지만 마지막 함정의 필수 조건이 틀리며 트리에 없는 파일·부품 선택 설명도 남는다. |
| C | 6 | 명령·설정은 있으나 실제 결과·Buildroot 버전이 없고 L278 SRCREV는 자리표시다. 시간/패키지 수로 C≤8. |
| D | 7 | L72~90↔Buildroot06 L43~85 external 구조, L119~146↔Buildroot07 L15~69 overlay/hook, L326~338·244~314↔Buildroot20 L59~74·212~252 대응/recipe가 반복된다. 통합의 독립 질문은 있으나 본체 중복이 크다. |
| E | 7 | 외부 트리·메타레이어 약속을 이행하지만 init/libc 등 rootfs 구성 선택은 부족하다. |
| F | 7 | L391 다음 이미지 패키징과 L365의 genimage 예고가 실제 다음 글과 맞는다. L19가 Buildroot 시리즈와 역할을 구분하며 대응 표가 고유 탐색 구조다. |
| G | 2 | 일부 버전은 코드에 있으나 1차 자료 연결과 보드/산출물 기록이 없다. |

변경: 52→51, 신규 오류로 우선 조치. 병합 후보 Buildroot06·07·20. 일반 예제를 줄이고 같은 BSP의 두 빌드 시스템 통합 결과를 보강할 후보.

### `bsp/chapter17-image-packaging.md`

source_file: `src/content/blog/embedded/bsp/chapter17-image-packaging.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: L129~130의 flash.bin/GPT 위치 겹침.
- uncertainties: SoC별 offset, uuu 계약, A/B 변수 모델 혼용, 실제 UFS/eMMC 쓰기 절차 부재.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | SoC 예약 영역·sparse·양산 도구를 묶는 관점은 있으나 실제 측정/결정 근거는 없다. |
| B | 12 | GPT→A/B→SoC header→genimage→MTD→양산 흐름은 완성. 배치 오류·변수 모델 불일치로 B≤13. |
| C | 7 | L55~66 GPT 출력, genimage·bmaptool 명령은 있으나 실제 도구 버전/시험 기록과 수치 근거가 없다. 잘못된 배치 예도 남는다. |
| D | 9 | L73~82·163~201·291~296↔bootloader28 L122~153·247~276·177~210 slot/genimage/UBI 반복. L96~108↔BSP18 L33~48·bootloader17 L70~88 env 반복. sparse와 SoC 부트 영역이라는 별도 역할이 있다. |
| E | 6 | GPT/partition 약속은 충족하지만 description의 UFS 절차와 eMMC workflow는 부족하다. |
| F | 5 | 다음 ch18과 관련 ch16/18은 일치. L372의 env partition은 bootloader01의 L61~63 정책 개요만으로 실제 partition 설명을 찾기 어렵고 L373 이미지 조립도 Buildroot01의 quick build와는 다르다. 구체 작업 목적지의 부족으로 상한 유지. |
| G | 1 | GPT·genimage·SoC 예약 영역의 1차 자료와 고정 버전 근거가 없다. |

동의: 52점 유지. 병합 후보 bootloader28, A/B env는 BSP18. 예약 영역·양산 image 생성/검증에 초점을 좁힐 후보.

### `bsp/chapter18-ota-recovery.md`

source_file: `src/content/blog/embedded/bsp/chapter18-ota-recovery.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정 오류·P0 미발견. 실제 rollback/recovery 시험 부재.
- uncertainties: RAUC 자동 mark-good의 통합 조건·manifest 경로, CA 발급 조건·만료 정책, fw_env/bootcount backend와 SWUpdate handler 버전은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | USB recovery 표·인증서 만료·agent/downgrade 함정은 관점. 대부분은 A/B와 OTA 도구 개요다. |
| B | 11 | 슬롯→도구→서명→delta→recovery 흐름은 완성. L59 함수·L352 partition은 자리표시이고 성공 판정 통합이 명시되지 않았다. |
| C | 6 | 설정/명령/출력은 있으나 실제 환경·합격/실패 시험이 없다. L310·336 등 숫자 출처가 없어 C≤8. |
| D | 6 | L33~84↔bootloader17 L77~110·142~162 bootcount/success 표시; L96~242↔bootloader20 L59~105·139~162·185~229 RAUC/SWUpdate 반복. Buildroot16 L60~126도 같은 설정을 다룬다. recovery 파티션/USB 복구는 별도 역할이다. |
| E | 7 | A/B·rollback·RAUC/SWUpdate·recovery는 있지만 통합 검증이 얕고 fastboot 절의 구체 명령은 없다. |
| F | 4 | 다음 ch19는 맞지만 L394가 예고한 EMC가 그 본문에 없다. L400 bootcount 목적지는 bootloader01로 구현이 없으며 해당 작업은17이다. 단순 시리즈 안내와 구별한 감점이다. |
| G | 1 | 본문 도구/서명 API의 1차 출처·고정 버전과 관측 자료가 없다. |

동의: 46점·미검증 유지. 병합 후보 bootloader17·20. recovery 파티션과 field 복구 시험에 집중할 후보.

### `bsp/chapter19-stability-testing.md`

source_file: `src/content/blog/embedded/bsp/chapter19-stability-testing.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: 확정 오류·P0 미발견. 실측/표준 조건·EMC 설명 부족.
- uncertainties: AEC-Q104 1000시간, stress-ng 수·stressapptest 옵션, fio 환경·thermal cycle 표준, kdump/curl 동작은 별도 미검증. AER만 확인한 과거 커밋을 전체 검증으로 승격하지 않는다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 세 축·AER watcher·power cycle·CI 시험 계층이 도구를 묶는 적용 관점. 표준 수치와 wear 해석은 원자료가 없다. |
| B | 12 | stress→soak→thermal→power→dump→CI 흐름은 완성. EMC 약속과 voltage/regression 예시가 빠지고 합격 기준이 일부에 한정된다. |
| C | 8 | L27~66·165~198·232~243·296~326 명령/출력은 풍부하다. 실제 soak/thermal 결과와 보드 조건·수치 근거가 없어 상한 8. |
| D | 10 | L27·192~198↔BSP14 L330~344 stress 반복, L46~66↔BSP05 L236~262 memory 검증 반복. 개별 도구와 달리 여러 시험을 양산 검증 체계로 묶는 역할을 유지한다. |
| E | 6 | Stress/Soak/Power Cycle은 이행하지만 description의 EMC 영향은 없다. |
| F | 4 | 다음 ch20과 대부분 관련 항목은 일치. L363 ‘Ch14: 디버깅 도구—kdump/crash’는 thermal/watchdog여서 구체 오안내다. Recipes의 시리즈 허브 연결 여부만으로 추가 오류를 확정하지 않는다. |
| G | 1 | 기준 조항·판·측정 환경의 본문 근거가 없다. 버전 문자열 출력만으로 실측/출처가 되지 않는다. |

동의: 55점 유지. 병합 대상 없음. 표준 시험 조건·보드 로그·합격 기준으로 체계의 근거를 보강할 후보.

### `bsp/chapter20-production.md`

source_file: `src/content/blog/embedded/bsp/chapter20-production.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: build-id 기본값/none 의미 오류.
- uncertainties: SOURCE_DATE_EPOCH의 적용 범위·HSM/CST/LAVA CLI·legal-info-source-archive·SBOM 생성법과 실제 두 번 빌드 비교는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L32~41 재현성·L193~197 키 등급·L313~319 station은 양산 관점이나 독자 측정/실패 분석은 없다. |
| B | 11 | 재현→CI→HSM→flash→SBOM까지 완성. build-id 오류와 L274~309 미정의 함수/pass, 본문 없는 FIT/dm-verity 요약으로 13 이하 유지. |
| C | 6 | 설정·명령은 있으나 실제 결과·hash 비교가 없다. digest 자리표시와 apt 버전 미고정, 숫자 출처 부재로 낮은 구간 유지. |
| D | 9 | L185~199·222↔bootloader30 L117~143·284~307 farm/키 분리; L323~341·21~59↔Buildroot18 L81~140·145~175 license/SBOM/reproducible 반복. CI는 Buildroot19 L60~100과도 같다. 양산 전환 질문은 구별된다. |
| E | 7 | CI·재현성·키 관리·서명은 다루지만 범위가 넓고 실제 서명 체인 검증이 약하다. |
| F | 5 | 다음 유지보수와 ch18/21은 일치. L386의 SBOM·라이선스 추적은 Buildroot01에 없고 실제18에 있다. Security01은 threat model/다음 secure boot로 안내하므로 이 링크 하나만으로 오안내라고 하지 않는다. |
| G | 1 | 핵심 도구·옵션과 수치의 1차 출처/고정 버전이 없다. |

변경: 50점 유지, 신규 오류 확인으로 우선 조치. 병합 대상 없음. 일반 도구 설명보다 동일 commit 재빌드 비교·실제 양산 station 결과로 보강할 후보.

### `bsp/chapter21-maintenance.md`

source_file: `src/content/blog/embedded/bsp/chapter21-maintenance.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: 글 자체의 LTS 선택 기준/날짜 불일치, 회고 목차 오안내.
- uncertainties: 현재 EOL·주소/담당자·show-info/cve-check 계약은 미검증. 출시일을 외워서 지원 기간을 확정하지 않는다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 패치 유지 비용·review 대응·upgrade·CVE 우선순위는 적용 관점. 일반 upstream 절차와 근거 없는 비용 수치 비중이 크다. |
| B | 11 | 제목 세 주제는 완결하지만 LTS 선택 결론이 자체 기준과 다르고 구체 upgrade 깨짐 예가 없다. |
| C | 7 | format-patch·bisect·cve-check 예시는 있으나 보드·실행 결과가 없고 L233은 가상 명령이다. 비용 수치로 C≤8. |
| D | 11 | L223~251↔Buildroot18 L261~284 CVE workflow 반복, L186~205↔bootloader30 L219~221 bisect 문제 정의가 같다. BSP 장기 유지/업스트림 역할은 독립적이다. |
| E | 7 | 업스트림·버전업·LTS 약속은 이행하지만 약70행 회고와 잘못된 LTS 권고로 상단 불가. |
| F | 3 | L257~288은 ch3 DT를 toolchain, ch4 pinmux를 첫 부팅 등 실제 장 제목 11개를 다르게 안내한다. 마지막 글인 사실은 맞지만 구체 회고 목차가 크게 틀렸다. |
| G | 2 | L336~337 공식 upstream/release 출처는 있으나 LTS 표 조회 시점과 개별 수치의 연결이 없다. |

동의: 53점 유지. 병합 대상 없음. 일정·선택 기준·실제 upgrade 회귀와 회고 목차를 보강할 후보.

### `buildroot/chapter01-problem.md`

source_file: `src/content/blog/embedded/buildroot/chapter01-problem.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: L204와 L211의 같은 측정표 배율 오류.
- uncertainties: 자동차/vendor 채택 사례·meta-buildroot 실재 범위·수치 조건·QEMU 실제 산출물은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 포기한 기능·5단계 선택 표·단계 시간 분포가 문제를 구체화한다. 채택 사례·수치의 독립 근거는 없다. |
| B | 13 | 문제→철학→비교→선택→실습→오해로 완결. 배율 오류와 채택/두 번째 빌드 조건이 남아 13 이하. |
| C | 7 | L35~41·185~195는 실제 첫 빌드 시작 절차다. 비교표에는 버전만 있고 호스트 조건/측정 원자료가 없으며 배율도 틀린다. |
| D | 10 | L203~206↔Buildroot20 L267~269가 같은 수치, L116~121·153~156↔L23~41 선택 기준이 같다. BSP16 L21~39의 개요와도 겹치지만 시리즈 입문 역할은 남는다. |
| E | 7 | 제목/description의 비교·선택 질문을 답한다. 분석 근거가 출처 없는 비교표에 머문다. |
| F | 7 | 다음 ch02의 6디렉터리와 실제 내용이 일치하고 L176~181 보드별 진행표가 있다. L170 별도 Yocto 시리즈 안내는 낡았으나 이를 현재 장의 특정 링크 오안내와 같게 보지 않는다. |
| G | 2 | Buildroot Manual 링크가 있지만 채택 사례·측정표의 직접 출처가 없다. |

동의: 60점·우선 조치 유지. 병합 대상 없음. 첫 글 역할을 유지하며 측정 조건과 선택 기준의 증거를 보강할 후보.

### `buildroot/chapter02-directory-structure.md`

source_file: `src/content/blog/embedded/buildroot/chapter02-directory-structure.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: clean 범위 오류.
- uncertainties: board/파일의 기준 버전·output/.config/Makefile의 in-tree/out-of-tree 조건·수정 소스가 자동 덮이는 시점은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 보드 파일과 옵션 짝표·전체 흐름은 적용 관점. 대부분은 디렉터리/API 목록이며 실패 사례·선택 근거가 없다. |
| B | 11 | 여섯 디렉터리→보조→흐름→실수로 완결. clean 핵심 절차가 틀리고 ls 기준 릴리스가 없다. |
| C | 6 | 명령/출력은 있으나 wc 출력350+는 실제 값이 아니며 결과 판정 시험이 없다. 패키지 수/크기 근거 부재로 C≤8. |
| D | 9 | L166~181↔Buildroot04 L202~221 output 표, L194~216↔L300~322 cache 설명·명령이 반복된다. L220~225↔Buildroot14 L79~87 mirror도 같다. 전체 트리 지도 역할은 구별된다. |
| E | 7 | 제목/description의 디렉터리가 실제 본절과 일치한다. 대상/버전 범위와 결과 검증은 부족하다. |
| F | 7 | L293 다음 ch03·L298~302 관련 제목과 실제 장이 일치. L245~265 데이터 흐름이 고유 구조다. ASCII/SVG 중복만으로 탐색 오류로 올리지 않는다. |
| G | 1 | 기준 Buildroot tag·공식 트리/매뉴얼 연결이 없고 파일명에 일부 버전만 있다. |

동의: 51점 유지. 병합 후보 Buildroot04의 output/cache 절. 전체 트리 지도는 유지하고 clean·빌드 모드·실제 파일 찾기를 보강할 후보.
