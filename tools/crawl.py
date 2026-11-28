import sys,re,os,subprocess,hashlib,urllib.parse
cand,base,pat=sys.argv[1],sys.argv[2],sys.argv[3]
src=sys.argv[4]
out=f"corpus/{cand}"; os.makedirs(out,exist_ok=True)
html=open(src,encoding='utf-8',errors='replace').read()
links=set()
for h in re.findall(r'href="([^"#]+)"',html):
    u=urllib.parse.urljoin(base,h.replace('&amp;','&'))
    if re.search(pat,u): links.add(u)
links.add(base)
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
def fetch(u):
    k=hashlib.md5(u.encode()).hexdigest()[:10]
    raw=f"{out}/{k}.raw"
    if not os.path.exists(raw):
        subprocess.run(["curl","-sSL","-m","60","-A",UA,"-o",raw,u],capture_output=True)
    if not os.path.exists(raw): return
    head=open(raw,'rb').read(5)
    txt=f"{out}/{k}.txt"
    if head.startswith(b'%PDF'):
        t=subprocess.run(["pdftotext","-layout",raw,"-"],capture_output=True).stdout.decode('utf-8','replace')
    else:
        t=subprocess.run([sys.executable,"-I",os.path.join(os.path.dirname(os.path.abspath(__file__)),"txt.py"),raw],capture_output=True).stdout.decode('utf-8','replace')
    open(txt,'w').write("URL: "+u+"\n"+t)
    return len(t)
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(8) as ex:
    r=list(ex.map(fetch,sorted(links)))
print(cand,len(links),"pages",sum(x or 0 for x in r),"chars")
