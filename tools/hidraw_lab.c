/* Raw hidraw feature-report lab for the AULA F75 vendor interface.
 * Usage:
 *   hidraw_lab dev <node>              select device (e.g. /dev/hidraw1)
 *   hidraw_lab featget <rid> <len>     GET_FEATURE rid, dump hex
 *   hidraw_lab featset <rid> <hex..>   SET_FEATURE rid with payload bytes
 *   hidraw_lab read a0 a1 a2 a3 len    cmd 0x84 read, prints len data bytes
 *   hidraw_lab colors                  cmd 0x8a read of the 512-byte table
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/ioctl.h>

#define BUF 520

static int fd = -1;

static int gfeature(int rid, unsigned char *buf, int len) {
    memset(buf, 0, BUF);
    buf[0] = (unsigned char)rid;
    long req = 0xC0000000L | (((long)(len & 0x7fff)) << 16) | ('H' << 8) | 0x07;
    return ioctl(fd, req, buf);
}
static int sfeature(unsigned char *buf, int len) {
    long req = 0xC0000000L | (((long)(len & 0x7fff)) << 16) | ('H' << 8) | 0x06;
    return ioctl(fd, req, buf);
}
static void hexdump(const unsigned char *b, int n) {
    for (int i = 0; i < n; i++) printf("%02x", b[i]);
    printf("\n");
}
static int hexbyte(const char *s) {
    int v; sscanf(s, "%2x", &v); return v & 0xff;
}

int main(int argc, char **argv) {
    if (argc < 3 || strcmp(argv[1], "dev") != 0) {
        fprintf(stderr, "first arg must be: dev <hidraw node>\n");
        return 2;
    }
    fd = open(argv[2], O_RDWR);
    if (fd < 0) { perror("open"); return 1; }

    unsigned char buf[BUF];

    if (!strcmp(argv[2 + 1], "featget") && argc >= 5) {
        int rid = hexbyte(argv[4]), len = atoi(argv[5]);
        if (len > BUF) len = BUF;
        int r = gfeature(rid, buf, len);
        if (r < 0) { fprintf(stderr, "GET err %s\n", strerror(errno)); return 1; }
        hexdump(buf, len);
        return 0;
    }
    if (!strcmp(argv[2 + 1], "featset") && argc >= 4) {
        memset(buf, 0, BUF);
        buf[0] = (unsigned char)hexbyte(argv[4]);
        for (int i = 5; i < argc && (i - 4) < BUF - 1; i++)
            buf[i - 4] = (unsigned char)hexbyte(argv[i]);
        int r = sfeature(buf, BUF);
        if (r < 0) { fprintf(stderr, "SET err %s\n", strerror(errno)); return 1; }
        printf("ok\n");
        return 0;
    }
    /* exact-length SET: featsetn <rid> <total_len> <hex..> */
    if (!strcmp(argv[2 + 1], "featsetn") && argc >= 5) {
        memset(buf, 0, BUF);
        buf[0] = (unsigned char)hexbyte(argv[4]);
        int total = atoi(argv[5]);
        if (total > BUF) total = BUF;
        for (int i = 6; i < argc && (i - 5) < BUF - 1; i++)
            buf[i - 5] = (unsigned char)hexbyte(argv[i]);
        int r = sfeature(buf, total);
        if (r < 0) { fprintf(stderr, "SETn err %s\n", strerror(errno)); return 1; }
        printf("ok\n");
        return 0;
    }
    if ((!strcmp(argv[2 + 1], "read") && argc >= 9) || !strcmp(argv[2 + 1], "colors")) {
        int a0=0,a1=0,a2=1,a3=0,len=128,cmd=0x84;
        if (!strcmp(argv[2 + 1], "read")) {
            a0=hexbyte(argv[4]); a1=hexbyte(argv[5]); a2=hexbyte(argv[6]); a3=hexbyte(argv[7]); len=atoi(argv[8]);
            cmd = 0x84;
        } else {
            cmd = 0x8a; len = 0x200;
        }
        if (len > 504) len = 504;
        memset(buf, 0, BUF);
        buf[0]=0x06; buf[1]=(unsigned char)cmd;
        buf[2]=(unsigned char)a0; buf[3]=(unsigned char)a1;
        buf[4]=(unsigned char)a2; buf[5]=(unsigned char)a3;
        buf[6]=(unsigned char)(len & 0xff); buf[7]=(unsigned char)(len >> 8);
        if (sfeature(buf, BUF) < 0) { fprintf(stderr, "SET err %s\n", strerror(errno)); return 1; }
        usleep(5000);
        if (gfeature(0x06, buf, BUF) < 0) { fprintf(stderr, "GET err %s\n", strerror(errno)); return 1; }
        hexdump(buf + 8, len);
        return 0;
    }
    fprintf(stderr, "unknown mode\n");
    close(fd);
    return 2;
}
