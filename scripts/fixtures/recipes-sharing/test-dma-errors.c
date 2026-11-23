#include <string.h>
#include "dma-coherent-lease.h"
#include "dma-tx-map.h"
#include "dma-sg-pages.h"
#include "frame-import.h"
int main(void){
 struct coherent_lease c={0};assert(coherent_lease_alloc(&device,0,&c)==-EINVAL);
 fail_alloc=1;assert(coherent_lease_alloc(&device,64,&c)==-ENOMEM&&!c.cpu);fail_alloc=0;
 assert(coherent_lease_alloc(&device,64,&c)==0&&c.cpu&&c.dma==0);
 unsigned before=allocations;assert(coherent_lease_alloc(&device,64,&c)==-EBUSY&&allocations==before);
 c.in_flight=true;assert(coherent_lease_free(&c)==-EBUSY&&frees==0);c.in_flight=false;
 assert(coherent_lease_free(&c)==0&&frees==1&&!c.cpu);assert(coherent_lease_free(&c)==0&&frees==1);
 struct tx_mapping tx={0};unsigned char bytes[32];
 assert(tx_mapping_prepare(&device,bytes,0,&tx)==-EINVAL);
 fail_map=1;before=unmaps;assert(tx_mapping_prepare(&device,bytes,32,&tx)==-EIO&&!tx.mapped&&unmaps==before);fail_map=0;
 assert(tx_mapping_prepare(&device,bytes,32,&tx)==0&&tx.dma==0&&tx.mapped);
 tx.in_flight=true;assert(tx_mapping_release(&tx)==-EBUSY&&unmaps==before);tx.in_flight=false;
 assert(tx_mapping_release(&tx)==0&&unmaps==before+1&&!tx.mapped);
 struct page pages[3]={{0},{1},{2}};struct page *ptrs[]={&pages[0],&pages[1],&pages[2]};struct sg_table table={0};
 assert(map_page_table(&device,ptrs,0,&table)==-EINVAL);fail_sg=1;before=table_frees;
 assert(map_page_table(&device,ptrs,3,&table)==-ENOMEM&&table_frees==before);fail_sg=0;fail_map=1;
 assert(map_page_table(&device,ptrs,3,&table)==-EIO&&!table.sgl&&table_frees==before+1);fail_map=0;
 assert(map_page_table(&device,ptrs,3,&table)==0&&table.orig_nents==3&&table.nents==2);
 event_count=0;release_page_table(&device,&table);assert(!table.sgl&&event_count==2&&memcmp(events,"UF",2)==0);
 struct frame_import frame={0};fail_get=1;before=puts;assert(frame_import_begin(7,&device,&frame)==-EBADF&&puts==before);fail_get=0;
 fail_attach=1;event_count=0;assert(frame_import_begin(7,&device,&frame)==-ENODEV&&event_count==1&&events[0]=='P');fail_attach=0;
 fail_map=1;event_count=0;assert(frame_import_begin(7,&device,&frame)==-EIO&&event_count==2&&memcmp(events,"DP",2)==0);fail_map=0;
 assert(frame_import_begin(7,&device,&frame)==0);before=gets;assert(frame_import_begin(7,&device,&frame)==-EBUSY&&gets==before);
 event_count=0;frame_import_end(&frame);assert(!frame.buffer&&event_count==3&&memcmp(events,"UDP",3)==0);frame_import_end(&frame);assert(event_count==3);
 return 0;
}
