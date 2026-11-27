import sys,re,subprocess,hashlib,os
cand,url=sys.argv[1],sys.argv[2]
os.makedirs(f'corpus/{cand}',exist_ok=True)
k='press_'+hashlib.md5(url.encode()).hexdigest()[:8]
raw=f'corpus/{cand}/{k}.raw'
r=subprocess.run(['curl','-sSL','-m','40','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36','-o',raw,'-w','%{http_code}',url],capture_output=True,text=True)
code=r.stdout
t=subprocess.run([sys.executable,'-I','bin/txt.py',raw],capture_output=True).stdout.decode('utf-8','replace')
open(f'corpus/{cand}/{k}.txt','w').write('URL: '+url+'\n'+t)
b=re.sub(r'\s+',' ',t)
qs=re.findall(r'«\s?([^»]{25,400})\s?»',b)
print(f'[{code}] {len(b)} car. {len(qs)} citations  {url}')
for q in qs[:int(sys.argv[3]) if len(sys.argv)>3 else 25]: print('   «',q.strip(),'»')
