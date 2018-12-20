#include "netUtils.h"

// 设置最大值
#define MAX_PACKET_LEN  65535
#define MAX_PENDING     10
#define PACKET_TIMEOUT  5

namespace __nan_net_utils__ {

using v8::Function;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Array;
using v8::Value;
using v8::String;
using v8::Number;

// 扫描局域网所有主机
NAN_METHOD(ScanAllHost)
{
  struct hostent *host;
  struct in_addr *prt;

  WSADATA wsaData;
}

// 全连接扫描
NAN_METHOD(FullConnectPortScan)
{
  if(info.Length() < 3)
  {
    return Nan::ThrowError("Wrong argument");
  }

  Isolate* isolate = info.GetIsolate();

  Local<Array> result = Nan::New<Array>();

  String::Utf8Value _hostname(info[0]);
  std::string hostname(*_hostname);
  unsigned short start_port = info[1]->NumberValue();
  unsigned short end_port = info[2]->NumberValue();

  int err, i, sock;
  struct hostent *host;
  struct sockaddr_in sa;

  strncpy((char*)&sa, "", sizeof sa);
  sa.sin_family = AF_INET;

  char c_hostname[20];
  strcpy(c_hostname, hostname.c_str());

  if (isdigit(hostname[0]))
  {
    sa.sin_addr.s_addr = inet_addr(c_hostname);
  }
  else if ((host = gethostbyname(c_hostname)) != 0)
  {
    strncpy((char*)&sa.sin_addr, (char*)host->h_addr, sizeof sa.sin_addr);
  }
  else
  {
    return Nan::ThrowError("hostname wrong");
  }

  for (i = start_port; i <= end_port; i++)
  {
    sa.sin_port = htons(i);
    sock = socket(AF_INET, SOCK_STREAM, 0);

    if (sock < 0)
    {
      return Nan::ThrowError("socket wrong");
    }

    err = connect(sock, (struct sockaddr*)&sa, sizeof sa);

    if (err >= 0)
    {
      Local<Number> port = Number::New(isolate, i);
      Nan::Set(result, result->Length(), port);
    }

    close(sock);
  }

  info.GetReturnValue().Set(result);
}

// 半开扫描
NAN_METHOD(HalfOpenPortScan)
{
  if(info.Length() < 4)
  {
    return Nan::ThrowError("Wrong argument");
  }

  Isolate* isolate = info.GetIsolate();

  String::Utf8Value _dstAddress(info[0]);
  std::string dstAddress(*_dstAddress);
  String::Utf8Value _srcAddress(info[1]);
  std::string srcAddress(*_srcAddress);
  unsigned short dstPort = info[2]->NumberValue();
  unsigned short srcPort = info[3]->NumberValue();

  // todo
}

NAN_MODULE_INIT(Init)
{
  Nan::Export(target, "scanAllHost", ScanAllHost);
  Nan::Export(target, "fullConnectPortScan", FullConnectPortScan);
  Nan::Export(target, "halfOpenPortScan", HalfOpenPortScan);
}

NODE_MODULE(netUtils, Init)

}

