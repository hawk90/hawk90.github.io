# CXL Linux driver source and mailbox boundary repair

No re-score. Evaluation ledger preserved. Scope: Full original/loop10 entry and actual Linuxv6.12Makefile,probe,HDMcommit,region,mailbox,struct,PCIerrorandDAXpathreview. Actual unchanged mailbox function/commandstruct/returncodetable extracted with explicit host shims and mock transport ASan/UBSan.

## Checks and limits

No kernel build/run, real kernel ABI/locking/MMIO/mailbox,decodercommit/reset,regioncreation/unbinding,DAX/SystemRAMchange,PCIerrorinjectionorType2/4.0supportclaim. Hostmockusesvalidinitializedpointersanddefineddevicereturncodes,notunknown-codeboundary. Generic clone gate skipped,notpassed. Frozen scores unchanged.

Gate: [cxl-driver-2026-10-24.gate.log](cxl-driver-2026-10-24.gate.log).
Execution: [cxl-driver-2026-10-24.verify.log](cxl-driver-2026-10-24.verify.log).
Execution: [cxl-driver-2026-10-24.math.log](cxl-driver-2026-10-24.math.log).

## Per-article evidence

### `chapter11-linux-driver.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md
2. **problemSignalAndCounterevidence:** Loop10flagsinheritedunverifiedv7.3-rc6sourceandduplication/recipesnumber. Actualv6.12differsinprobeorder,names,HDMsetup/reset,locks,errorfile/structlocationsandregistration;originalfuturecodecannotberepresentedasverifiedv6.12.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Readoriginal294linesandfullfrozenentry. Actualv6.12 adc2186 Makefile/struct/probe/cxld_await_commit/cxl_decoder_commit/commit_store/cxl_internal_send_cmd/cxl_error_detected andDAXselectedpathscompared. HostharnessextractsunchangedkernelCwithactualcommandstructandrcmappingtable/helpers,articlematchesaftercomment/whitespaceremoval;oversizeblocksdispatch,transporttimeout/EIOremap,success/background/definederrorcodesandshortoutputASan/UBSan.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Rewritefocusedmanagement/failure-boundarychapteragainstactualv6.12. Separateprobe/memdev/commit/DAXRAM,correctrealprobecallsandcore/pci.cRAS,source-qualifiedcommitresetandtimeoutsemantics,removelatestType2claims/internaltrackingmetadataandblanketrollbackpromise. Includeonlyrealmailboxfunctionwithtokencomparison;manuallynarrowdescription.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Hostverifier,gate,mathandscopeddiffpass. Nohardware/kernelrunorlocked/active-memoryrollbacktested. Doesnotcertifynewerkernelor4.0support. No kernel build/run, real kernel ABI/locking/MMIO/mailbox,decodercommit/reset,regioncreation/unbinding,DAX/SystemRAMchange,PCIerrorinjectionorType2/4.0supportclaim. Hostmockusesvalidinitializedpointersanddefineddevicereturncodes,notunknown-codeboundary. Generic clone gate skipped,notpassed. Frozen scores unchanged.

Before SHA-256: `a1745a0f72079d0b0f6b166dbf5a89107ede8e874d13d1aefc893d992302411b`. After SHA-256: `d196eb110a146ff0a0f1fd8266ba8d6517a5c503021027847090f1effd8d99f3`.

Next action: manual-review. Foranactualkernel/firmware/topology,whichprobe/region/mailboxstateandfailuretracesdemonstrateusablemappingandsaferecoverywithoutlosingactive-memorydata?

## Primary sources

- [https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/hdm.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/hdm.c)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/mbox.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/mbox.c)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/cxl/mailbox.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/cxl/mailbox.h)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
