# 최종 보고서 독립 표본 점검

2026-10-19. 주 검토자가 작성한 루프06·07·38의 판단 다섯 묶음을 다른 Sol 최종 검토자가 원문·1차 자료로 다시 대조했다. 기계 집계 성공을 사실 검증 근거로 삼지 않았다. 이 표본은406편 전체의 추가 독립 검증을 뜻하지 않는다. 원문·기존 평가 수정 없음.

| 표본 | 독립 확인 결과 | 적용 범위 |
| --- | --- | --- |
| loop07 overlay mode | L59의 보존/chmod+x와 L142·335의 권한 표현 불가가 상충하는 근거 유지 가능 | 복사되는 파일의 실행 mode에 한정. 소유권/삭제까지 가능하다는 일반화는 하지 않음. 공식 Makefile은 순서 확인에 사용하며 mode 계약 전체를 검증했다고 하지 않음. |
| loop38 stream trigger | V11.2.0 생성 크기 조건·내부 +1·누적 byte≥trigger 통지 분기 재확인 | `create(64,32)` 후 대기 receiver에64byte 단일 송신이라는 반례로 명료화. 커널 실행이 아닌 소스 흐름 판정. |
| loop38 Zephyr SMP | v4.2.0 sched.c의 PIN_ONLY 분기·일반 공유 ready_q, kernel.h의 clear/enable·runnable 상태 조건 재확인 | Zephyr 버전/설정에 한정. 새 B12/C6·역할 차이를 반영한 D11 유지. |
| loop06 boot parser | 원문에서 추출한 bash를 독립 재실행하여 exit0·`systemd reached: s` 확인 | 자체 로그의 systemd timestamp 추출 실패만 입증. fixture에 Freeing unused 행이 없으므로 Kernel boot 공백은 별도 오류 증거로 쓰지 않음. 실제 보드 부팅 시험 아님. |
| loop06 glibc/ld | glibc2.40 cache 외 경로, GNU ld style 기본 sha1·none 비활성화 재확인 | cache 없으면 linker 전체가 동작 불가라는 단정과 ld 옵션 설명만 반증. 모든 library 검색/배포판 driver 기본으로 확대하지 않음. |

검토자는 이 표본에서 오류 상태 철회나 B/C/F 상한 변경이 필요한 근거를 찾지 못했다. stream 반례의 표현 개선은 주 검토자가 루프38에 반영했다. D는 stream의 명령 예제와1-09/3-07 API 입문, SMP 설계와 Performance4-10 관측 질문의 실제 차이를 재확인했다. F는 존재하지 않는3-12와 실제 다음 order33=4-01을 대조했다.

1차 자료는 각 루프에 직접 연결되어 있다: [loop06](double-check-loop-06.md), [loop07](double-check-loop-07.md), [loop38](double-check-loop-38.md). 실행 증거는 `/private/tmp/adsense-loop06-boot-parser.sh`·동명 `.log`, canary 단일 byte 시험은 `/private/tmp/adsense-loop38-canary.c`·동명 `.log`다. 임시 파일은 장기 보관을 보장하지 않으므로 재현 입력·관찰 결과·버전과 한계를 보고서에도 기록했다.
