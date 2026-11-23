#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <linux/dma-buf.h>
#include "v4l2-export.c"
int main(void){
 int fd=open("/dev/video0",O_RDWR|O_CLOEXEC);assert(fd>=0);
 struct v4l2_format fmt={.type=V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE};
 fmt.fmt.pix_mp.width=320;fmt.fmt.pix_mp.height=240;
 fmt.fmt.pix_mp.pixelformat=V4L2_PIX_FMT_NV12M;fmt.fmt.pix_mp.field=V4L2_FIELD_NONE;
 assert(camera_ioctl(fd,VIDIOC_S_FMT,&fmt)==0&&fmt.fmt.pix_mp.pixelformat==V4L2_PIX_FMT_NV12M&&fmt.fmt.pix_mp.num_planes==2);
 unsigned count=0;assert(request_mmap_capture_buffers(fd,4,&count)==0&&count>0&&count<32);
 for(unsigned i=0;i<count;++i){
  struct v4l2_plane planes[VIDEO_MAX_PLANES]={0};
  struct v4l2_buffer b={.type=V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,.memory=V4L2_MEMORY_MMAP,.index=i,.length=VIDEO_MAX_PLANES,.m.planes=planes};
  assert(camera_ioctl(fd,VIDIOC_QUERYBUF,&b)==0);assert(camera_ioctl(fd,VIDIOC_QBUF,&b)==0);
 }
 enum v4l2_buf_type type=V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE;
 assert(camera_ioctl(fd,VIDIOC_STREAMON,&type)==0);
 struct v4l2_plane planes[VIDEO_MAX_PLANES]={0};
 struct v4l2_buffer b={.type=type,.memory=V4L2_MEMORY_MMAP,.length=VIDEO_MAX_PLANES,.m.planes=planes};
 assert(camera_ioctl(fd,VIDIOC_DQBUF,&b)==0&&b.length==fmt.fmt.pix_mp.num_planes);
 int invalid=-1;assert(export_capture_plane(fd,b.index,VIDEO_MAX_PLANES,&invalid)==-EINVAL&&invalid==-1);
 for(unsigned plane=0;plane<b.length;++plane){
  int exported=-1;assert(export_capture_plane(fd,b.index,plane,&exported)==0&&exported>=0);
  assert(fcntl(exported,F_GETFD)&FD_CLOEXEC);
  void*p=mmap(NULL,planes[plane].length,PROT_READ|PROT_WRITE,MAP_SHARED,exported,0);
  assert(p!=MAP_FAILED&&planes[plane].bytesused>0&&planes[plane].bytesused<=planes[plane].length);
  struct dma_buf_sync sync={.flags=DMA_BUF_SYNC_START|DMA_BUF_SYNC_READ};
  assert(ioctl(exported,DMA_BUF_IOCTL_SYNC,&sync)==0);
  volatile unsigned char sample=((unsigned char*)p)[planes[plane].data_offset];(void)sample;
  sync.flags=DMA_BUF_SYNC_END|DMA_BUF_SYNC_READ;assert(ioctl(exported,DMA_BUF_IOCTL_SYNC,&sync)==0);
  assert(munmap(p,planes[plane].length)==0);close(exported);
 }
 assert(camera_ioctl(fd,VIDIOC_STREAMOFF,&type)==0);
 struct v4l2_requestbuffers req={.type=type,.memory=V4L2_MEMORY_MMAP};
 assert(camera_ioctl(fd,VIDIOC_REQBUFS,&req)==0);
 req.count=2;req.memory=V4L2_MEMORY_DMABUF;
 assert(camera_ioctl(fd,VIDIOC_REQBUFS,&req)==0);
 invalid=-1;assert(export_capture_plane(fd,0,0,&invalid)==-EINVAL&&invalid==-1);
 req.count=0;assert(camera_ioctl(fd,VIDIOC_REQBUFS,&req)==0);
 close(fd);return 0;
}
