#include <assert.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/sendfile.h>
static unsigned calls,scenario,stage,closed;
static ssize_t fake_sendfile(int out,int in,off_t*off,size_t n){
 (void)out;(void)in;++calls;
 if(scenario==1){return 0;}
 if(scenario==2){errno=EBADF;return -1;}
 if(calls==1){errno=EINTR;return -1;}if(calls==2){*off+=3;return 3;}
 if(calls==3){errno=EAGAIN;return -1;}*off+=(off_t)n;return (ssize_t)n;
}
#define sendfile fake_sendfile
#include "sendfile-transfer.c"
#undef sendfile
static int fake_pipe2(int fd[2],int flags){assert(flags==O_CLOEXEC);fd[0]=100;fd[1]=101;return 0;}
static int fake_close(int fd){assert(fd==100||fd==101);++closed;return 0;}
static ssize_t fake_splice(int in,off_t *off,int out,off_t*other,size_t n,unsigned flags){
 (void)out;(void)other;assert(flags==0);
 if(in==55){assert(off&&n>=4);*off+=4;return 4;}
 assert(in==100&&!off);if(stage++==0)return 2;errno=EAGAIN;return -1;
}
#define pipe2 fake_pipe2
#define close fake_close
#define splice fake_splice
#include "splice-transfer.c"
#undef pipe2
#undef close
#undef splice
int main(void){
 struct file_transfer t={0,10};
 assert(sendfile_progress(1,2,&t)==1&&t.offset==3&&t.left==7);
 assert(sendfile_progress(1,2,&t)==0&&t.offset==10&&!t.left);
 scenario=1;t=(struct file_transfer){5,8};
 assert(sendfile_progress(1,2,&t)==-ENODATA&&t.offset==5&&t.left==8);
 scenario=2;assert(sendfile_progress(1,2,&t)==-EBADF&&t.offset==5);
 t=(struct file_transfer){0,10};
 assert(splice_progress(56,55,&t)==-EAGAIN&&t.offset==2&&t.left==8&&closed==2);
 return 0;
}
