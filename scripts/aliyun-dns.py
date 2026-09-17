#!/usr/bin/env python3
"""aliyun-dns.py — 阿里云 DNS 记录查询/添加（用 acme.sh 同一套 RAM 凭据）

用法:
  Ali_Key=xxx Ali_Secret=yyy python3 aliyun-dns.py list  <domain>
  Ali_Key=xxx Ali_Secret=yyy python3 aliyun-dns.py add   <domain> <RR> <type> <value>
    # 例: add kernelplayer.cn @ A 118.31.67.240
"""
import os, sys, hmac, hashlib, base64, json, urllib.parse, urllib.request
from datetime import datetime

KEY = os.environ.get("Ali_Key") or os.environ.get("ALI_KEY")
SECRET = os.environ.get("Ali_Secret") or os.environ.get("ALI_SECRET")
ENDPOINT = "https://alidns.aliyuncs.com/"


def _enc(s):
    # RFC3986: 除 A-Za-z0-9-_.~ 外全部百分号编码
    return urllib.parse.quote(str(s), safe="-_.~")


def call(params: dict) -> dict:
    common = {
        "Format": "JSON",
        "AccessKeyId": KEY,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureVersion": "1.0",
        "SignatureNonce": base64.b16encode(os.urandom(16)).decode(),
        "Timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "Version": "2015-01-09",
    }
    common.update(params)
    canon = "&".join(f"{_enc(k)}={_enc(common[k])}" for k in sorted(common))
    s2s = "GET&%2F&" + _enc(canon)
    sig = base64.b64encode(
        hmac.new((SECRET + "&").encode(), s2s.encode(), hashlib.sha1).digest()
    ).decode()
    url = ENDPOINT + "?" + canon + "&Signature=" + _enc(sig)
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.loads(r.read().decode())


def main():
    if not KEY or not SECRET:
        print("✗ 需要 Ali_Key / Ali_Secret 环境变量"); sys.exit(1)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"

    if cmd == "list":
        d = sys.argv[2]
        res = call({"Action": "DescribeDomainRecords", "DomainName": d, "PageSize": 100})
        for r in res.get("DomainRecords", {}).get("Record", []):
            print(f"  {r['RR']:12s} {r['Type']:6s} {r['Value']:30s} {r.get('Status','')}")
        print(f"  共 {len(res.get('DomainRecords', {}).get('Record', []))} 条")

    elif cmd == "add":
        d, rr, typ, val = sys.argv[2:6]
        res = call({"Action": "AddDomainRecord", "DomainName": d,
                    "RR": rr, "Type": typ, "Value": val})
        print(json.dumps(res, ensure_ascii=False))
    else:
        print(__doc__); sys.exit(1)


if __name__ == "__main__":
    main()
