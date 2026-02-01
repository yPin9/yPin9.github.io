---
title: Understanding complex C declarations
date: 2026-02-01
tags: CS
---

## 為什麼會有這篇文

自己對於 C 語言複雜宣告的掌握度還是偏低，所以撰文一邊練習一邊紀錄應該要如何閱讀 c 語言的宣告


[很有用的網站](https://cdecl.org/)


## 先來講一下基礎規則

The "right-left" rule is a completely regular rule for deciphering C declarations. It can also be useful in creating them.

在解讀 C 語言的宣告時順序是從右到左

### symbols 讀法介紹

| Symbol | Pronounce               |  Position                 |
|  ---   |-------------------------|----------------------------|
|   *    | as "pointer to"         |  always on the left side  |
|  [ ]   | as "array of"           |  always on the right side | 
|  ( )   | as "function returning" |  always on the right side |


1.
* 找到 ***identifier***。然後說：「***identifier*** is...」。




1.
* 從 ***identifier*** 的右邊開始，如果找到 ***( )***，那就可以知道這是一個 *function* 的宣告，如果是 ***[]***，就可以知道這是一個 *array* 的宣告，接著一直往右邊讀，直到讀完整個 *symbol* 或是讀到右括弧 `)`
> (如果遇到左括號，則代表他是 ***( )*** 這個符號的開始下面的第二個練習可以看到如何操作)



2.
* 看 ***identifier*** 左邊的 ***symbol***，如果它不是前面提到的那些符號之一（e.g. *int* ），就直接把它唸出來。如果是那些 ***symbol*** 之一，就依照上面的表格把它翻成英文敘述。持續往左邊讀，直到符號結束，或是遇到一個左括號 `(` 為止。

### 小試身手

#### int *p[]

找到 ***identifier***，這邊是 ***p***，開始宣告 ***p*** is... 

```C
int *p[]
     ^
```


繼續往右邊看，看到 ***[***

```C
int *p[]
      ^
```

往右邊看，看到]，這個 symbol 結束，我們可以得到 ***p*** is array of...

```C
int *p[]
       ^
```

從 ***identifier*** 往左邊看，看到 ***\****，我們可以得到 ***p*** is array of pointer to...

```C
int *p[]
    ^
```

繼續往左邊看，看到 ***int***，我們可以得到 ***p*** is array pointer to int

```C
int *p[]
 ^
```

#### int *(*func())()


找到 ***identifier***，這邊是 ***func*** ，開始宣告， ***func*** is...

```C
int *(*func())()
```
往右看到 ***(***，所以 ***func*** is function returning...

```C
int *(*func())()
           ^
```

繼續往右看遇到 ***)***，閉合起來了，所以回到 ***identifier*** 往左邊看
```C
int *(*func())()
            ^
```

往左看到 ***\****，所以 ***func*** is function returning pointer to...


```C
int *(*func())()
      ^
```

再往左看到 ***(***，被閉合起來了，回到剛剛右邊


```C
int *(*func())()
     ^
```

回到剛剛右邊，看到右括號，繼續往右


```C
int *(*func())()
              ^
```

繼續往右看到左括號，閉合起來，現在 ***func*** is function returning pointer to function returning...，右邊沒符號了，接下來回到左邊繼續分析


```C
int *(*func())()
               ^
```

回到左邊看到 ***\****，所以現在 ***func*** is function returning pointer to function returning pointer to...


```C
int *(*func())()
    ^
```

繼續往左看到 int，所以 ***func*** is function returning pointer to function returning pointer to int


```C
int *(*func())()
    ^
```

分析完畢，最後得到 ***func*** is function returning pointer to function returning pointer to int

#### int *var[10];


```c
int *var[10]; 
```
* var is array 10 of pointer to int

#### *var(char,int); 

```c
int *var(char,int); 
```
* var is function(char,int) returning pointer to int

#### int (*var)[10]; 

```c
int (*var)[10]; 
```
* var is pointer to array 10 of int

#### int (*var)(char, int); 

```c
int (*var)(char, int); 
```
* var is pointer to function(char,int) returning int

#### int (*var[10])(char, int); 

```c
int (*var[10])(char, int); 
```
* var is array 10 of pointer to function(char,int) returning int

#### int (*var(char, int))[10]; 

```c
int (*var(char, int))[10]; 
```
* var is function(char,int) returning pointer to array 10 of int


#### int (*var(char, int))(int); 

```c
int (*var(char, int))(int); 
```
* var is function(char,int) returning pointer to function(int) returning int

#### char (*var[10])(char *,int (*)[10]); 

```c
char (*var[10])(char *,int (*)[10]); 
```
* var is array 10 of pointer to function(pointer to char,pointer to array 10 of int) returning char

#### int *(*var(char *, int (*)[10]))[12] 

```c
int *(*var(char *, int (*)[10]))[12] 
```
* var is function(pointer to char, pointer to array 10 of int) returning pointer to array 12 of pointer to int

#### int **(*var(char *, int (*)[12]))(unsigned int); 

```c
int **(*var(char *, int (*)[12]))(unsigned int); 
```
* var is function(pointer to char,pointer to array 12 of int) returning pointer to function(unsigned int) returning pointer to pointer to int


#### char (*var[10])(); 

```c
char (*var[10])(); 
```
* var is array 10 of pointer to function returning char

#### int *(*var())[10]; 

```c
int *(*var())[10]; 
```

* var is function returning pointer to array 10 of pointer to int


#### int **(*var())(); 

```c
int **(*var())(); 
```
* var is function returning pointer to function returning pointer to pointer int


#### double *(* var(unsigned long long (*)[74]))[12]

```c
double *(* var(unsigned long long (*)[74]))[12]
``` 
* var is function(pointer to array 74 of unsigned long long) returning pointer to array 12 of pointer to double




## Reference
https://gist.github.com/muxuezi/05b634728b93b710f217

https://magicjackting.pixnet.net/blog/posts/12060889356

https://www.youtube.com/watch?v=D-mCU1qKJcc