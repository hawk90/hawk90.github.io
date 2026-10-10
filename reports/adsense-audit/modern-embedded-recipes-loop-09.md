# Modern Embedded Recipes — 루프 09 (seriesOrder 80~89)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

