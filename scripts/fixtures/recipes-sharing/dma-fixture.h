#ifndef REVIEW_DMA_FIXTURE
#define REVIEW_DMA_FIXTURE
/* Synthetic operations for control flow only; real kernel headers are built separately. */
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <errno.h>
typedef uintptr_t dma_addr_t;
struct device { int id; }; struct page { int id; };
struct scatterlist { struct page *page; unsigned int length; struct scatterlist *next; };
struct sg_table { struct scatterlist *sgl; unsigned int nents, orig_nents; };
struct dma_buf { int id; }; struct dma_buf_attachment { int id; };
enum { GFP_KERNEL=0, DMA_TO_DEVICE=1, PAGE_SIZE=4096 };
static struct device device;
static unsigned allocations, frees, maps, unmaps, gets, puts, attaches, detaches, table_frees;
static int fail_alloc, fail_map, fail_sg, fail_get, fail_attach;
static char events[128]; static unsigned event_count;
static void event(char c){assert(event_count<sizeof(events));events[event_count++]=c;}
static void *dma_alloc_coherent(struct device*d,size_t n,dma_addr_t*a,int f){(void)f;assert(d==&device);++allocations;if(fail_alloc)return NULL;*a=0;return malloc(n);}
static void dma_free_coherent(struct device*d,size_t n,void*p,dma_addr_t a){assert(d==&device&&n==64&&a==0);++frees;free(p);}
static dma_addr_t dma_map_single(struct device*d,void*p,size_t n,int dir){assert(d==&device&&p&&n==32&&dir==DMA_TO_DEVICE);++maps;return 0;}
static int dma_mapping_error(struct device*d,dma_addr_t a){assert(d==&device&&a==0);return fail_map;}
static void dma_unmap_single(struct device*d,dma_addr_t a,size_t n,int dir){assert(d==&device&&a==0&&n==32&&dir==DMA_TO_DEVICE);++unmaps;}
static int sg_alloc_table(struct sg_table*t,unsigned n,int f){(void)f;if(fail_sg)return -ENOMEM;struct scatterlist **next=&t->sgl;for(unsigned i=0;i<n;++i){*next=calloc(1,sizeof(**next));assert(*next);next=&(*next)->next;}t->nents=t->orig_nents=n;return 0;}
#define for_each_sg(first,sg,n,i) for((sg)=(first),(i)=0;(i)<(n);++(i),(sg)=(sg)->next)
static void sg_set_page(struct scatterlist*s,struct page*p,unsigned n,unsigned off){assert(off==0);s->page=p;s->length=n;}
static int dma_map_sgtable(struct device*d,struct sg_table*t,int dir,unsigned long attr){assert(d==&device&&dir==DMA_TO_DEVICE&&attr==0);for(struct scatterlist*s=t->sgl;s;s=s->next)assert(s->page&&s->length==PAGE_SIZE);++maps;if(fail_map)return -EIO;t->nents=2;return 0;}
static void dma_unmap_sgtable(struct device*d,struct sg_table*t,int dir,unsigned long attr){assert(d==&device&&t->orig_nents==3&&t->nents==2&&dir==DMA_TO_DEVICE&&attr==0);++unmaps;event('U');}
static void sg_free_table(struct sg_table*t){while(t->sgl){struct scatterlist*n=t->sgl->next;free(t->sgl);t->sgl=n;}++table_frees;event('F');}
#define IS_ERR(p) ((uintptr_t)(p)>=(uintptr_t)-4095)
#define PTR_ERR(p) ((int)(intptr_t)(p))
static struct dma_buf dma_buffer;
static struct dma_buf_attachment dma_attachment;
static struct sg_table imported_table;
static struct dma_buf *dma_buf_get(int fd){assert(fd==7);++gets;return fail_get?(void*)(intptr_t)-EBADF:&dma_buffer;}
static struct dma_buf_attachment *dma_buf_attach(struct dma_buf*b,struct device*d){assert(b==&dma_buffer&&d==&device);++attaches;return fail_attach?(void*)(intptr_t)-ENODEV:&dma_attachment;}
static struct sg_table *dma_buf_map_attachment_unlocked(struct dma_buf_attachment*a,int dir){assert(a==&dma_attachment&&dir==DMA_TO_DEVICE);++maps;return fail_map?(void*)(intptr_t)-EIO:&imported_table;}
static void dma_buf_unmap_attachment_unlocked(struct dma_buf_attachment*a,struct sg_table*t,int dir){assert(a==&dma_attachment&&t==&imported_table&&dir==DMA_TO_DEVICE);++unmaps;event('U');}
static void dma_buf_detach(struct dma_buf*b,struct dma_buf_attachment*a){assert(b==&dma_buffer&&a==&dma_attachment);++detaches;event('D');}
static void dma_buf_put(struct dma_buf*b){assert(b==&dma_buffer);++puts;event('P');}
#endif
