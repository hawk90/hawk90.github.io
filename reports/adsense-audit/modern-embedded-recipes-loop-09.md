# Modern Embedded Recipes — 루프 09 (seriesOrder 80~89)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,571자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 2편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 2 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 8 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 2 |
| 실전 신호 약함 | 0 |

## 검사 포인트

- 캐릭터 드라이버와 Platform 드라이버는 코드 비중이 높으므로, API 나열이 아니라 probe·remove·오류 처리·DT 바인딩의 원인과 결과를 설명하는지 확인한다.
- 커널 모듈·캐릭터 드라이버·Platform 드라이버가 동일한 Linux 드라이버 학습 경로에서 중복되는지, 각 글의 독립적인 독자 문제와 결론이 있는지 비교한다.
- mmap·epoll·UIO/VFIO·sysfs/configfs 글은 사용자 공간과 커널 공간의 경계, 권한·보안·수명 관리 조건이 설명되는지 확인한다.
- IRQ affinity와 Buildroot 글은 특정 커널 버전·보드·배포판에 의존하는 명령을 일반 규칙처럼 제시하지 않는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 Linux 문서·커널 소스·프로젝트 공식 자료가 인용 또는 명시되는지 확인한다.
- 성능·결정성·격리·보안 관련 주장은 측정 조건, 커널 설정, 하드웨어 범위와 함께 근거 태그를 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part7-06-kernel-module.md | 커널 모듈 기초 — init/exit·Parameter·KBuild·DKMS | 3,314 | 2,731 | 0 | 12 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part7-07-char-driver.md | 캐릭터 드라이버 작성 — file_operations·cdev·register_chrdev | 3,119 | 3,963 | 0 | 13 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part7-08-platform-driver.md | Platform 드라이버 작성 — probe·remove·of_match·DT 바인딩 | 2,983 | 3,922 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part7-09-mmap.md | mmap 4가지 모드 — Anonymous·File·Shared·Huge Page | 4,043 | 2,632 | 0 | 23 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part7-10-epoll.md | epoll 실전 — LT·ET·ONESHOT·EXCLUSIVE 비교 | 3,652 | 2,770 | 0 | 14 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part7-11-uio-vfio.md | UIO·VFIO 분석 — User-Space Driver와 IOMMU 격리 | 3,564 | 3,482 | 0 | 14 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part7-12-sysfs.md | sysfs·configfs 활용 — kobject 기반 User 인터페이스 | 3,578 | 3,059 | 0 | 8 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part7-13-irq-affinity.md | IRQ Affinity 튜닝 — smp_affinity·isolcpus·irqbalance | 3,532 | 1,988 | 0 | 11 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part7-14-rootfs-buildroot.md | 루트 파일시스템 구축 — Buildroot 기초·Package·Toolchain | 3,836 | 2,341 | 0 | 20 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part8-01-dynamic-memory.md | 임베디드 동적 메모리 — malloc 위험·결정성·대안 분석 | 3,833 | 2,942 | 0 | 12 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·툴체인·커널 버전 범위와 재현 가능한 절차
2. 측정값 또는 관찰 결과와 조건
3. 공식 문서·커널 소스·프로젝트 자료 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

## 정성 평가 업데이트

기계 triage 대상 10편을 원문으로 읽고 잠정 점수를 추가했다. P0 정책 차단은 확인되지 않았다. 공식 Linux 문서·커널 버전·실행 결과 대조 전의 `잠정` 값이다.

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part7-06-kernel-module.md` | **75/100** | 보강 | module/KBuild/DKMS 흐름은 완결되지만 kernel release와 실제 build 결과가 없음 |
| `part7-07-char-driver.md` | **77/100** | 보강 | char driver API와 blocking/poll이 풍부하지만 표준 subsystem과의 선택 근거가 약함 |
| `part7-08-platform-driver.md` | **78/100** | 보강 | probe/resource/DT/PM 오류 경로가 좋지만 실제 kernel version 검증이 없음 |
| `part7-09-mmap.md` | **78/100** | 보강 | mmap 모드와 huge page/UIO 사례가 넓지만 성능값은 모두 측정 필요 상태임 |
| `part7-10-epoll.md` | **78/100** | 보강 | LT/ET/ONESHOT/EXCLUSIVE 비교가 실용적이나 workload별 결과와 kernel 조건이 없음 |
| `part7-11-uio-vfio.md` | **76/100** | 보강 | UIO/VFIO/IOMMU/DMA 경계가 유용하지만 보안·권한·device binding 검증이 필요함 |
| `part7-12-sysfs.md` | **75/100** | 보강 | sysfs/configfs 구현과 ABI 주의가 있으나 subsystem별 표준 경계와 실제 출력이 부족함 |
| `part7-13-irq-affinity.md` | **77/100** | 보강 | affinity/isolcpus/RSS/RT 측정 경로는 좋지만 kernel·NIC·워크로드 종속성이 큼 |
| `part7-14-rootfs-buildroot.md` | **79/100** | 보강 | Buildroot 설정·package·reproducible build 흐름이 강하지만 실제 image 결과와 버전 고정이 없음 |
| `part8-01-dynamic-memory.md` | **78/100** | 보강 | pool/arena/TLSF와 OOM 진단을 연결하지만 allocator 구현별 WCET 근거가 없음 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part7-06-kernel-module.md` | 16 | 17 | 10 | 11 | 9 | 9 | 3 | **75** |
| `part7-07-char-driver.md` | 17 | 17 | 11 | 11 | 9 | 9 | 3 | **77** |
| `part7-08-platform-driver.md` | 17 | 18 | 11 | 11 | 9 | 9 | 3 | **78** |
| `part7-09-mmap.md` | 17 | 17 | 11 | 11 | 9 | 9 | 4 | **78** |
| `part7-10-epoll.md` | 17 | 17 | 11 | 11 | 9 | 9 | 4 | **78** |
| `part7-11-uio-vfio.md` | 17 | 16 | 10 | 11 | 9 | 9 | 4 | **76** |
| `part7-12-sysfs.md` | 16 | 17 | 10 | 11 | 9 | 9 | 3 | **75** |
| `part7-13-irq-affinity.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part7-14-rootfs-buildroot.md` | 17 | 18 | 11 | 12 | 9 | 9 | 3 | **79** |
| `part8-01-dynamic-memory.md` | 17 | 17 | 11 | 11 | 9 | 9 | 4 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `핵심 개념`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: Linux API와 실제 명령·코드·실패 조건을 연결하며, 단순 용어 나열을 넘어 선택 기준을 제시한다.
- 공통 감점: 성능 비교가 대부분 `측정 필요` 상태이고 kernel release, device, distribution, compiler 조건이 고정되어 있지 않다.
- 중복 위험: Kernel module/char/platform driver/sysfs 글은 Linux driver 학습 경로가 겹치므로 각 글의 subsystem 경계를 선명하게 해야 한다.
- 다음 확인: Linux kernel 공식 문서와 해당 release 소스, Buildroot/U-Boot/DPDK/SPDK 공식 문서, 실제 build·trace·benchmark 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편을 원문 전체로 다시 읽고 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다.

- 공통 필드: 10편 모두 `score_status: 잠정`. P0 없음(확인 범위: 원문 본문과 내부 링크 대상 파일 존재 여부. 렌더링·광고 배치는 보지 않았다).
- factcheck: git 이력상 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 기본값은 `미검증`이다. 외부 자료는 가져오지 않았다. 원문만으로 성립하는 불일치가 있는 2편(7-08, 7-13)만 루브릭 3-1절에 따라 `오류 확인`으로 두었다.
- 내비게이션 확인: 다음 편 안내는 seriesOrder+1 파일과, 관련 항목은 링크 대상 파일의 존재와 라벨 번호를 대조했다. 링크 대상 파일은 모두 존재한다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part7-06-kernel-module.md` | 9 | 10 | 7 | 10 | 4 | 3 | 1 | 44 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-07-char-driver.md` | 10 | 11 | 6 | 11 | 7 | 5 | 1 | 51 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-08-platform-driver.md` | 11 | 12 | 6 | 11 | 7 | 3 | 1 | 51 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part7-09-mmap.md` | 11 | 11 | 5 | 11 | 5 | 5 | 1 | 49 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-10-epoll.md` | 12 | 12 | 6 | 12 | 6 | 4 | 1 | 53 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-11-uio-vfio.md` | 13 | 12 | 7 | 12 | 7 | 5 | 1 | 57 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-12-sysfs.md` | 11 | 12 | 8 | 11 | 6 | 4 | 1 | 53 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-13-irq-affinity.md` | 12 | 12 | 7 | 12 | 6 | 3 | 1 | 53 | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md` |
| `part7-14-rootfs-buildroot.md` | 11 | 12 | 7 | 12 | 7 | 6 | 1 | 56 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-01-dynamic-memory.md` | 11 | 11 | 6 | 6 | 7 | 6 | 1 | 48 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |

v1.1 점수(75~79점, 전부 `보강`)보다 20~30점 낮다. 차이의 대부분은 E·F·G다. v1.1은 E 9·F 9·G 3~4를 일괄로 줬지만, 측정 약속을 지키지 않은 description(E), 틀린 다음 편·라벨 번호(F), 본문 출처·버전 부재(G)를 반영하면 앵커 `part7-05-kernel-build.md`(50점)·`part6-09-isr-api.md`(40점)와 같은 구간에 놓인다. 60점 이상(`보강`)으로 올릴 근거를 찾은 글은 없다.

### part7-06-kernel-module.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 네 요소 정리(24~31행)와 Hello 모듈(37~57행)은 커널 입문 자료의 기본 예제와 같다. 고유한 부분은 `modules-load.d`와 `modprobe.d`의 역할 구분(161행) 정도다. 측정 절(165~172행)은 칸 전체가 "측정 필요"라 정보가 없다. |
| B | 10 | 빌드 → 파라미터 → 로드 → printk → 자동 로드 → 함정 흐름은 끝까지 간다. 제목과 description이 내건 DKMS는 20·192·229행에 이름만 나오고 `dkms.conf`나 add·build·install 절차가 없다. |
| C | 7 | Makefile(64~80행), 파라미터 sysfs 확인 명령(105~111행), 헤더 경로 오류 출력(217행)이 있어 따라 할 수 있다. 86행은 Makefile에 없는 `modules` 타깃을 부르고, dmesg 실행 결과는 없다. |
| D | 10 | out-of-tree 빌드(64~87행)가 7-05 `kernel-build` 111~132행과 거의 같다. `__exit` cleanup 함정(204~212행)은 7-12 226~234행의 duplicate filename 사례와 같다. |
| E | 4 | 제목의 DKMS와 description의 "DKMS 배포까지 한 번에 정리"를 본문이 이행하지 않는다. 앵커 7-05의 zImage 미이행(4점)과 같은 수준이다. |
| F | 3 | 232행 "다음 편은 mmap"인데 seriesOrder 81은 `part7-07-char-driver`다. 236~238행 라벨 "1-04"·"4-02"·"4-05"가 가리키는 파일은 7-03·7-09·7-12라 번호가 모두 틀렸다. |
| G | 1 | 출처 링크와 커널 버전이 없다. 217행 오류 예시의 `5.15.0`이 유일한 버전 흔적이다. |

uncertainties:
- 184행: `MODULE_LICENSE` 누락 시 "Module verification failed: signature and/or required key missing"가 찍힌다는 설명. 서명 검증 메시지로 보이며 라이선스 누락과의 관계를 커널 소스로 확인하지 않았다.
- 113행 "mode가 0이면 sysfs에 노출되지 않습니다", 142행 `echo 8 > /proc/sys/kernel/printk`의 효과 미확인.

병합 대상: 병합 대상 없음. 7-05와 out-of-tree 빌드가 겹치지만 "커널 모듈 기초"는 독립 검색 의도가 있다. 다음 조치: `보강` — DKMS 절차를 추가하거나 제목·description에서 DKMS를 빼고, 다음 편·라벨을 고치고, 빈 측정 표는 실측하거나 삭제한다.

### part7-07-char-driver.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | `file_operations`·cdev·copy_to_user·ioctl·wait queue·misc는 드라이버 입문서의 표준 목록이다. 20행 "char로 검증한 뒤 IIO·input으로 옮긴다"가 이 글의 관점이지만 옮길 기준은 없다. 213~219행 표는 "x86_64" 머리글 아래 칸이 모두 "측정"이다. |
| B | 11 | 최소 driver → ioctl → blocking → poll → misc → multiple minor 흐름은 완성됐다. 78~84행 init은 반환값을 하나도 검사하지 않아 249행 함정("error path에서 unwind")과 어긋나고, user space에서 `/dev/mychar`를 읽어 보는 확인 절차가 없다. |
| C | 6 | 코드는 있으나 빌드·로드·읽기 결과가 없다. 225~227행 RAM 사용량(~64 B, ~96 B)은 출처와 환경이 없다. |
| D | 11 | 7-06 모듈 골격과 일부 겹치지만 char device 고유 API에 집중해 역할이 구별된다. |
| E | 7 | 제목·description 키워드를 대부분 다룬다. `register_chrdev`는 273행 함정 한 줄뿐이다. |
| F | 5 | 288행 다음 편(Platform 드라이버)은 seriesOrder 82와 맞다. 294·295행 "4-02: mmap"·"4-05: sysfs" 라벨 번호가 실제 7-09·7-12와 다르다. |
| G | 1 | 커널 버전과 문서 출처가 없다. 83행 `class_create("mychar")` 1인자 형태가 어느 커널 기준인지 알 수 없다. |

uncertainties:
- 83행 `class_create` 1인자 시그니처가 적용되는 커널 버전 미확인.
- 150~158행: `data_ready`를 lock 없이 ISR과 read가 함께 쓰는 경쟁 조건을 설명하지 않는다.
- 286행 "대용량 데이터에는 mmap이 더 적합"은 221행 "데이터 수명과 API 요구사항으로 결정"과 어긋나는 근거 없는 단정이다.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — user space 확인 절차와 init error path를 넣고, 커널 버전을 밝히고, 라벨을 고친다.

### part7-08-platform-driver.md

`factcheck: 오류 확인` — 239행 주석은 `"vendor,fooo"`를 "'s' 누락"이라고 설명한다. 37·63행의 올바른 문자열 `vendor,foo-v1`과 비교하면 o가 하나 더 붙고 `-v1`이 빠진 형태라 주석과 예제가 맞지 않는다. 원문만으로 성립하는 불일치라 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | variant별 `.data`와 `of_device_get_match_data`(107~125행), `-EPROBE_DEFER`를 `-EIO`로 덮어쓰는 함정(255~262행)은 실무 관점이다. 157행은 "의존성에 따라 달라집니다"로 순서 기준을 비우고, 287행은 "reset → regulator → pinctrl → clock → IRQ가 표준"이라고 단정한다. 76~90행 probe 코드의 순서도 이와 다르다. |
| B | 12 | DT 노드 → probe → variant → property → reset·regulator → PM → defer → load 흐름이 완성됐다. Runtime PM 절(161~186행)에 `pm_runtime_enable`이 없는데 289행은 "두 호출만 끼우면"이라고 단순화한다. |
| C | 6 | 코드와 load 명령(205~213행)은 있으나 dmesg·sysfs 결과 예시가 없다. 측정 표(219~224행)와 RAM 블록(228~232행)이 모두 "측정"이다. |
| D | 11 | 7-06·7-07과 모듈 골격이 겹치지만 DT match와 devm 중심이라 역할이 구별된다. |
| E | 7 | probe·remove·of_match·DT 노드는 다룬다. 제목의 "DT 바인딩"은 노드 예시(60~68행)뿐이고 binding 문서는 다루지 않는다. |
| F | 3 | 291행 "다음 편부터 7-09~7-13은 별도로 다루고 Buildroot 기초로 넘어갑니다"인데 seriesOrder 83은 `part7-09-mmap`이다. 298행 "4-05: sysfs" 라벨도 틀렸다. |
| G | 1 | 출처와 커널 버전이 없다. |

uncertainties:
- 97행 `static int my_remove`: remove 콜백 반환형이 커널 버전에 따라 바뀌었는지 미확인(본문에 버전 표기 없음).
- 146행 `devm_reset_control_get_optional`의 이름과 사용 형태 미확인.
- 226행 `PROBE_PREFER_ASYNCHRONOUS`를 어디에 설정하는지(`.driver.probe_type`) 본문에 없다.

다음 조치: 239행 주석 수정, 157행과 287행 중 하나로 정리, 다음 편 안내와 라벨 수정 후 재채점. 점수 구간은 `병합 검토`이지만 병합 대상은 없다(platform driver는 독립 검색 의도가 있다).

### part7-09-mmap.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | anonymous·file × private·shared 2×2 표(26~31행), fork 뒤 COW 폭주(205~214행), `vm.max_map_count` 누적(223행)은 정리가 좋다. madvise·hugepage·mlock 절은 man page 수준이다. 238행 "Huge page는 수 배 단위 개선"은 바로 위 표(176~181행)가 비어 있어 근거가 없다. |
| B | 11 | 네 모드 → madvise → huge page → mlock → UIO → 함정 흐름은 완결된다. 각 모드를 쓰지 말아야 할 조건은 거의 없다. |
| C | 5 | description이 "코드와 측정값으로"를 약속하지만 두 측정 표(167~181행)가 모두 "측정 필요"다. 192행 인덱스 식은 의도와 다르게 계산된다(uncertainties). |
| D | 11 | UIO mmap 절(149~161행)이 7-11과, file-backed shared 설명이 8-05 mmap 절(142~151행)과 겹친다. |
| E | 5 | 제목의 네 모드는 다 다루지만 description의 "측정값"이 없다. |
| F | 5 | 243행 다음 편(epoll)은 seriesOrder 84와 맞다. 247~249행 라벨 "3-03"·"4-01"·"4-04"가 실제 파일(12-09·7-06·7-11) 번호와 다르다. |
| G | 1 | 출처와 커널 버전이 없다. |

uncertainties:
- 192행 `((char*)p)[1 << 20 - 1]`은 C 연산자 우선순위상 `1 << 19`가 되어 의도한 마지막 바이트가 아니다. 예제 의도 확인 필요.
- 134행 ARM page size 목록의 "32 KB" 항목 미확인.
- 18행 "page cache를 두 번 거치면 RAM 대역폭이 절반" 출처 없음.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 측정 약속을 지키거나 description에서 빼고, 192행 예제와 라벨을 고친다.

### part7-10-epoll.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | timerfd·eventfd·signalfd를 한 epoll에 묶는 daemon 골격(129~152행), dup된 fd는 close해도 epoll set에서 빠지지 않는 함정(190~197행), ONESHOT 재무장 코드(88~106행)가 실무 관점이다. 168행 "LT 22%, ET 13%"는 유일한 수치인데 측정 방법이 없다. |
| B | 12 | LT → ET → ONESHOT → EXCLUSIVE → fd 통합 → io_uring 비교 → 함정으로 완결된다. EXCLUSIVE와 `SO_REUSEPORT`의 차이는 127행에서 "별도 검증"으로 끝난다. |
| C | 6 | 코드는 바로 쓸 수 있는 형태지만 160행 "가상 워크로드를 돌렸습니다" 아래 표(162~166행)가 전부 "workload별 측정"이다. |
| D | 12 | 7-09·8-05와 io_uring 언급이 겹치는 정도라 역할이 분명하다. |
| E | 6 | description의 "코드와 성능으로 비교"에서 성능 비교가 이행되지 않는다. |
| F | 4 | 225행 다음 편(UIO·VFIO)은 맞다. 156행 "자세한 비교는 3-03 Zero-Copy에서 다뤘습니다"의 대상 `part12-09-zero-copy-camera`에는 io_uring·epoll 비교가 없다. 229·230행 라벨 번호도 틀렸다. |
| G | 1 | 출처와 커널 버전이 없다(EPOLLEXCLUSIVE 도입 버전 등). |

uncertainties:
- 168행 Cortex-A72 5000 connection의 CPU 22%/13% 수치 출처·조건 미확인.
- 14행 "준비된 fd 수에만 비례"와 217행 "실제 비용은 … 비교합니다"가 섞여 있다.
- 194행 주석 "자동 제거 — 이건 사실"과 197행 dup 예외의 조건 미확인.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 160·168행 측정 주장을 실측으로 채우거나 삭제하고 156행 교차 링크를 실제로 io_uring을 다루는 글(8-05)로 바꾼다.

### part7-11-uio-vfio.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | UIO와 VFIO를 DMA 관점으로 나눈 표(26~29행), iova를 user가 정하고 IOMMU가 변환한다는 설명(154행), IOMMU group 통째 바인딩 함정(212~219행), UIO IRQ 재활성 write(94~96·237행)가 실무 관점이다. |
| B | 12 | kernel side → user side → VFIO 준비 → ioctl 골격 → DPDK·SPDK → vfio-platform → 함정으로 완결된다. no-IOMMU 모드(31행)는 한 문장이고, `/dev/vfio` 권한이나 memlock 한도는 없다. |
| C | 7 | 바인딩 명령(103~113행)과 VFIO ioctl 골격(119~152행)은 재현 가능한 형태다. 186~198행 IOPS·Mpps 표는 "같은 하드웨어"라고만 하고 NVMe·NIC·CPU 모델이 없어 확인할 수 없다. |
| D | 12 | 7-09 UIO mmap 절, 8-04 IOMMU 절과 일부 겹치지만 user-space driver라는 역할이 분명하다. |
| E | 7 | 제목·description을 다룬다. DPDK·SPDK는 명령 한두 줄(158~172행)이다. |
| F | 5 | 258행 다음 편(sysfs)은 맞다. 262·263행 "4-01"·"4-02" 라벨 번호가 틀렸다. |
| G | 1 | 출처, 커널·DPDK·SPDK 버전이 없다. |

uncertainties:
- 48행 주석 "ack 후 0 반환 = handled"와 50행 `return IRQ_HANDLED`의 값 일치 여부 미확인.
- 237행 "UIO는 ISR 안에서 IRQ를 자동 disable": 직접 작성한 `sample_isr`(46~51행)에 irqcontrol이 없는데 96행 write로 재활성이 되는지 미확인.
- 190~198행 IOPS·latency·Mpps 수치 출처 미확인.
- 18행 "Crash가 나도 kernel은 안전"과 210행 "UIO DMA 오용 시 memory corruption"의 범위 차이를 본문이 설명하지 않는다.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 186~198행 표의 측정 환경을 밝히거나 삭제하고, 권한·no-IOMMU 한계를 보충하고, 라벨을 고친다.

### part7-12-sysfs.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | "한 attribute = 한 값" 규약과 그 이유(32·197행), store에서 긴 작업을 하지 않는 이유(199~208행), configfs USB gadget 명령(151~163행)이 구체적이다. 나머지는 커널 문서 요약 수준이다. |
| B | 12 | attribute → group → 결과 → udev → binary → configfs → notify → 함정으로 완결된다. 87~92행 probe가 `sysfs_create_group`과 `devm_device_add_group`을 같은 group으로 연달아 호출하는데 설명이 없다. |
| C | 8 | 결과 모양(100~110행)으로 기대 출력을 보여 주고 configfs 명령이 재현 가능하다. 측정 표(180~185행)는 비어 있다. |
| D | 11 | 7-06의 파라미터 sysfs 노출, duplicate filename 함정(7-06 204~212행)과 겹치지만 역할은 구별된다. |
| E | 6 | 제목의 "kobject 기반"은 26~30행 표뿐이고 kobject 생성·release는 다루지 않는다. |
| F | 4 | 246행 다음 편(IRQ Affinity)은 맞다. 250~252행 라벨 "1-04"·"4-01"·"4-06" 번호가 틀렸다. 26행 표는 데이터 행이 머리글 자리에 들어가 깨져 보인다. |
| G | 1 | 출처와 커널 버전이 없고 `Documentation/ABI` 언급도 없다. |

uncertainties:
- 87~92행: 같은 group을 두 번 등록하면 234행이 말하는 duplicate filename 오류가 날 수 있다. 둘 중 하나를 고르라는 의도인지 확인 필요.
- 216행 "32비트 이상 값에서 tearing"과 43행 `unsigned int` 예시의 관계 미확인.
- 162행 UDC 이름 `musb-hdrc.0`은 보드 의존인데 대상 보드 표기가 없다.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 87~92행 코드 정리, kobject 절 보충 또는 제목 축소, 라벨·표 수정.

### part7-13-irq-affinity.md

`factcheck: 오류 확인` — 27·59·62행은 `smp_affinity`를 16진 bitmask로 쓴다(`2` = CPU1, `c` = CPU2·3). 112행은 `echo $((1 << i))`로 10진수를 쓰므로 i=4부터 `16`·`32`·`64`·`128`이 0x16·0x32·0x64·0x128로 해석된다. 109행 주석 "코어 0~7에 분배"와 맞지 않는 산술 오류다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | `/proc/interrupts` 출력 해석(40~53행), isolcpus만 두고 `irqaffinity=`를 빼먹는 함정(176~182행), hotplug 뒤 affinity 손실(201~209행), `IRQ_NO_BALANCING` 원인(68행)이 실무 관점이다. 161행 "p99가 10배 이상"은 근거가 없다. |
| B | 12 | 확인 → 수동 설정 → irqbalance → isolcpus → RSS → threaded IRQ → hint → 함정으로 완결된다. 33행 PREEMPT_RT 설명은 "확인합니다"로 끝나고 133행은 "거의 모든 IRQ를 thread로 변환"이라고 단정한다. |
| C | 7 | 명령과 기대 출력(40~50·122~124·167~171행)이 있다. 146행 "Cortex-A72 quad-core 보드"라 해 놓고 표(148~159행)는 비어 있고, RSS 스크립트는 위 산술 오류가 있다. |
| D | 12 | PE·RTOS 시리즈의 interrupt latency 글과 이어지지만 Linux affinity 운영에 집중한다. |
| E | 6 | description의 "측정과 함께"가 이행되지 않는다. |
| F | 3 | 221행 "Modern Embedded Recipes Part 4는 여기까지"는 part7 글이고 다음 글(7-14)도 안내하지 않는다. 225행 "4-05: sysfs" 라벨도 틀렸다. |
| G | 1 | 출처와 커널·irqbalance 버전이 없다. |

uncertainties:
- 184~191행 hyperthread sibling 함정은 146행 측정 보드(Cortex-A72)에는 해당하지 않을 수 있다. 대상 환경 명시 필요.
- 81행 `IRQBALANCE_BANNED_CPUS` 변수가 현재 irqbalance에서도 같은 이름인지 미확인.
- 139행 `irq_set_affinity_hint`가 현재 커널에서 권장 API인지 미확인.

다음 조치: 112행 스크립트를 16진 출력(`printf '%x'`) 또는 `smp_affinity_list`로 고치고, 221행 안내와 라벨을 수정한 뒤 재채점. 병합 대상 없음.

### part7-14-rootfs-buildroot.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | custom package `.mk`(150~184행), overlay와 post-build hook(123~148행), toolchain 변경 시 `make clean`(239~245행)은 Buildroot 매뉴얼 내용이다. 고유한 부분은 규모로 Yocto와 고르는 기준(20행)인데 비교 표(47~54·212~218행)가 대부분 "측정"이다. |
| B | 12 | 시작 → package → defconfig → toolchain → overlay → custom package → init → reproducible → 함정으로 완결된다. description의 Yocto trade-off는 표 두 개뿐이다. |
| C | 7 | RPi4 defconfig 명령과 산출물 목록(60~75행)은 재현 가능하다. 부팅 시간 표(220~225행)는 "i.MX8M Mini"를 내걸고 칸이 비어 있다. |
| D | 12 | 7-01·7-05와 영역이 다르다. |
| E | 7 | 제목·description 키워드를 다룬다. |
| F | 6 | 277행 다음 편(8-01 동적 메모리)이 seriesOrder 89와 맞고, 281~284행 관련 항목 라벨이 대상 파일과 모두 맞는다. 그 밖의 글 고유 탐색 구조는 없다. |
| G | 1 | Buildroot release 버전과 매뉴얼 링크가 없다. |

uncertainties:
- 130·131행 주석 "post-build.sh = build 직전 hook", "post-image.sh = image 생성 직전 hook"이 실제 실행 시점과 맞는지 매뉴얼로 확인하지 않았다.
- 257행 "overlay 파일은 git에서 mode가 보존되지 않습니다" 미확인(실행 비트).
- 29·218행 "~3000"·"~10000"과 52행 "release에 따라 확인"이 섞여 있다.
- 227행 "BusyBox init이 결정적으로 유리"는 바로 위 표가 비어 있어 근거가 없다.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — Buildroot 버전 명시, 빈 측정 표 정리, 130·131행 hook 시점 확인.

### part8-01-dynamic-memory.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | "알 수 있는 패턴 → allocator" 표(39~44행)가 이 글의 선택 기준이다. pool·arena·slab·TLSF 코드는 표준 예제다. 181행은 "검증해야 합니다"로 끝나는데 167·267행은 TLSF를 "O(1) worst-case … 표준 선택"이라고 단정한다. |
| B | 11 | 문제 → 대안 → 코드 → heap_x → 모니터링 → 함정으로 완결된다. 189~195행 `tracked_malloc`은 free 경로가 없어 `used`가 줄지 않으므로 198행이 말하는 peak 측정이 성립하지 않는다. |
| C | 6 | 코드는 있으나 실행·검증 절차가 없고 측정 표(202~208행)가 대부분 "측정"이다. 214~216행 블록당 overhead는 출처가 없다. |
| D | 6 | 관련 항목에 직접 건 PRTOS 4-01~4-05(실시간 메모리·FreeRTOS heap·TLSF·static·memory pool)가 이 글의 절을 하나씩 따로 다룬다. ECPP 3-01도 같은 주제다. |
| E | 7 | 제목·description 키워드를 다룬다. |
| F | 6 | 272행 다음 편(8-02)이 맞고 276~282행 라벨이 대상과 맞는다. 120행 heap 표는 heap_1 행이 머리글 자리에 들어가 깨진다. |
| G | 1 | FreeRTOS 버전과 TLSF 구현 출처가 없다. |

uncertainties:
- 56·60행 `portMUX_TYPE`·`portENTER_CRITICAL(&lock)`은 특정 port의 형태로 보이며 48행 "FreeRTOS style" 일반 예제로 쓸 수 있는지 미확인.
- 216행 "pool overhead 0"은 54~55행 예제의 `pool_used[]`(블록당 1바이트)와 맞지 않는다. 216행이 어느 구현을 가리키는지 확인 필요.
- 244행 "malloc은 critical section을 잡으므로 ISR에서 deadlock" 일반화 미확인.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part4-01-realtime-memory.md`(공개). 39~44행 선택 표와 pool·arena 예제를 넘기는 안을 검토한다. 시리즈 순서상 남긴다면 PRTOS 4-01~4-05로 위임하는 짧은 차별화 보강이 필요하다.

### 시리즈 공통 문제

- 측정 표가 전부 "측정 필요"·"환경별 측정" 같은 문구라 내용이 없다(루브릭 3-1절에 따라 C 채점에서 빈 표로 봤다): `part7-06`(167~172행), `part7-07`(213~219행), `part7-08`(219~224행), `part7-09`(167~181행), `part7-10`(162~166행), `part7-12`(180~185행), `part7-13`(148~159행), `part7-14`(212~225행), `part8-01`(202~208행). 9편.
- 본문은 "측정해야 합니다"·"달라집니다"로 완곡하게 쓰고, 요약·정리 절은 같은 주제를 근거 없이 단정한다. `Qualify …` 커밋이 앞쪽만 고친 흔적으로 보인다: `part7-07`(221 vs 286행), `part7-08`(157 vs 287행), `part7-09`(183 vs 238행), `part7-10`(18 vs 168행), `part7-13`(33 vs 133행, 18 vs 161행), `part7-14`(198 vs 227행), `part8-01`(181 vs 267행).
- "측정했다"·"돌렸다"라고 쓰고 값이 없거나, 측정 환경 없는 수치만 있다: `part7-10`(160·168행), `part7-11`(186~198행), `part7-13`(146행), `part7-14`(220행).
- 관련 항목 라벨 번호가 실제 파일 번호와 다르다("4-02: mmap" → 7-09 등): `part7-06`, `part7-07`, `part7-08`, `part7-09`, `part7-10`, `part7-11`, `part7-12`, `part7-13`. 시리즈 재편 전 번호가 남은 것으로 보인다(추론).
- 다음 편 안내가 실제 seriesOrder+1과 다르다: `part7-06`(232행), `part7-08`(291행), `part7-13`(221행).
- 10편 모두 본문 출처 링크와 커널·도구 버전이 없다(G 1점). 커널 API 시점이 걸린 코드(`part7-07` 83행, `part7-08` 97행)도 버전을 밝히지 않는다.
- 10편 모두 같은 H2 뼈대(한 줄 요약 / 어떤 상황에서 쓰나 / 핵심 개념 / 코드 / 측정 / 함정 / 정리 / 관련 항목)를 쓴다. 글마다 고유 예제가 있어 글 단위 P0로 보지는 않았지만, 루브릭 9절 사이트 게이트의 "같은 H2 뼈대를 쓰는 글 수" 항목에 반영해야 한다.

개별 수정 전에 시리즈 단위로 라벨·다음 편 안내 일괄 점검, 빈 측정 표 처리 원칙(실측 또는 삭제), 정리 절 단정문 점검을 먼저 정한다.
