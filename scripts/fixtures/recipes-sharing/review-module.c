#include <linux/module.h>
#include "dma-coherent-lease.h"
#include "dma-tx-map.h"
#include "dma-sg-pages.h"
#include "frame-import.h"
/* Compiled and modposted, never loaded or attached to physical hardware. */
static int __used check_coherent(struct device*d,struct coherent_lease*l){int r=coherent_lease_alloc(d,64,l);return r?r:coherent_lease_free(l);}
static int __used check_tx(struct device*d,void*p,struct tx_mapping*m){int r=tx_mapping_prepare(d,p,32,m);return r?r:tx_mapping_release(m);}
static int __used check_sg(struct device*d,struct page**p,struct sg_table*t){int r=map_page_table(d,p,3,t);if(!r)release_page_table(d,t);return r;}
static int __used check_import(struct device*d,struct frame_import*f){int r=frame_import_begin(0,d,f);if(!r)frame_import_end(f);return r;}
static int __init review_init(void){return 0;}
static void __exit review_exit(void){}
module_init(review_init);module_exit(review_exit);
MODULE_LICENSE("GPL");MODULE_IMPORT_NS(DMA_BUF);
